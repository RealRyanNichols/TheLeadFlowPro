"""The website worker: read a business's own site politely and keep only what it says.

The service crawls on worker threads while the main thread owns the database,
so the work is split in three:

* ``due_businesses`` (database) picks the sites that are due and hands out
  frozen snapshots, at most one per host per batch.
* ``visit`` (network only) reads the home page and a few same-site pages
  through the PoliteFetcher, which enforces robots.txt, the per-host spacing,
  the size caps, and the SSRF guard, then runs the extractors. It never
  touches the database, so it is safe on a worker thread.
* ``apply_visit`` (database, one transaction) turns the result into the
  website status, the next crawl time, facts (always through
  ``facts.observe``, so the fill-only rules hold), hiring signals, and review
  items.

Nothing is taken from a site until it identifies itself as the business, and
nothing is read from another domain a site redirects to. Logs carry public
ids, hosts, and counts only: never names, phones, emails, or page text.
"""

from __future__ import annotations

import json
import logging
import re
import sqlite3
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Dict, List, NamedTuple, Optional, Sequence, Tuple
from urllib.parse import parse_qsl, urlsplit

from . import config, db, facts, normalize, privacy
from .extract import careers, contacts, hours as hours_mod, identity, services, social
from .extract.html import Page, parse_page
from .fetcher import site_key
from .publish import resolve_now

log = logging.getLogger(__name__)

ROBOTS_RETRY_DAYS = 30
CHALLENGE_RETRY_DAYS = 14
UNSAFE_RETRY_DAYS = 30
DEAD_ERRORS = ("dns", "connect", "timeout")
DEAD_STATUSES = (404, 410)
SOURCE_ID = "website"
IDENTITY_CONFIDENCE = 0.9
LINK_CONFIDENCE = 0.9
ADDRESS_CONFIDENCE = 0.85
SERVICES_CONFIDENCE = 0.85
MAX_SERVICE_TAGS = services.MAX_TAGS
HOST_STATE_COLUMNS = (
    "host", "robots_txt", "robots_status", "robots_fetched_at", "last_request_at",
    "backoff_level", "backoff_until", "blocked_reason",
)
_SOURCE_ORDER_SQL = (
    "CASE source_id WHEN 'tx_sales_tax' THEN 0 WHEN 'tx_tabc' THEN 1 WHEN 'npi' THEN 2"
    " WHEN 'osm' THEN 3 ELSE 4 END, id"
)

# Which extra pages are worth a request, best first. Each rank is matched
# against the link text and against the URL path.
PAGE_RANKS: Tuple[Tuple[str, "re.Pattern[str]", "re.Pattern[str]"], ...] = tuple(
    (name, re.compile(text, re.I), re.compile(path, re.I))
    for name, text, path in (
        ("contact", r"\bcontact\b|\bget\s+in\s+touch\b|\breach\s+us\b",
         r"(?:^|[/_\-.])contact"),
        ("hours", r"\bhours\b", r"(?:^|[/_\-.])hours(?:$|[/_\-.])"),
        ("location", r"\blocations?\b|\bdirections\b|\bfind\s+us\b|\bvisit\s+us\b",
         r"(?:^|[/_\-.])(?:locations?|directions|find[-_]?us|visit[-_]?us)(?:$|[/_\-.])"),
        ("about", r"\babout\b|\bour\s+story\b|\bwho\s+we\s+are\b",
         r"(?:^|[/_\-.])(?:about(?:[-_]?us)?|our[-_]?story|who[-_]?we[-_]?are)(?:$|[/_\-.])"),
        ("careers", r"\bcareers?\b|\bjobs?\b|\bemployment\b|\bjoin\s+our\s+team\b|\bnow\s+hiring\b"
                    r"|\bwe\s*(?:'|\u2019)?\s*re\s+hiring\b|\bwork\s+with\s+us\b|\bopenings\b",
         r"(?:^|[/_\-.])(?:careers?|jobs?|employment|join[-_]?our[-_]?team|now[-_]?hiring|hiring"
         r"|work[-_]?with[-_]?us|openings)(?:$|[/_\-.])"),
        ("services", r"\bservices?\b|\bmenus?\b|\bwhat\s+we\s+do\b|\btreatments?\b",
         r"(?:^|[/_\-.])(?:services?|menus?|what[-_]?we[-_]?do|treatments?)(?:$|[/_\-.])"),
    )
)
RANK_NAMES = tuple(name for name, _, _ in PAGE_RANKS)

SKIP_EXTENSIONS = (
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tif", ".tiff", ".heic",
    ".mp3", ".mp4", ".m4a", ".m4v", ".mov", ".avi", ".wmv", ".webm", ".wav", ".ogg", ".zip", ".rar",
    ".gz", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt", ".xml", ".json", ".css",
    ".js", ".ics", ".vcf", ".rss",
)
# Never log in, buy, or post: these paths are skipped even when a keyword matches.
_SKIP_PATH = re.compile(
    r"(?:^|/)(?:wp-admin|wp-login\.php|wp-json|xmlrpc\.php|login|log-in|signin|sign-in|logout|register"
    r"|account|my-account|cart|checkout|basket|feed|search)(?:/|$)",
    re.I,
)
_HOURS_WORD = re.compile(r"\b(?:hours|hrs)\b", re.I)


# ---------------------------------------------------------------- data types

@dataclass(frozen=True)
class BusinessSnapshot:
    """What a visit needs to know about one business, detached from the database."""

    id: int
    public_id: str
    name: str
    category: str
    street: Optional[str]
    street_norm: Optional[str]
    zip: Optional[str]
    website: str
    website_domain: str
    phone: Optional[str] = None  # E.164, only for the identity check

    @property
    def host(self) -> str:
        return (urlsplit(self.website).hostname or "").lower()


class Identity(NamedTuple):
    matches: bool
    reason: str
    address_listed: bool
    address_url: Optional[str] = None  # the page that lists the street


class Found(NamedTuple):
    """One value an extractor found, with the page it came from."""

    value: Any
    method: str
    confidence: float
    source_url: str


@dataclass
class VisitResult:
    """Everything one visit learned. Built by ``visit``; read by ``apply_visit``.

    ``status`` is the new website status, or None to keep the previous one
    (a 5xx, a backoff, or another failure that says nothing about the site).
    """

    host: str = ""
    status: Optional[str] = None
    final_url: Optional[str] = None
    pages_fetched: int = 0
    fetched_urls: List[str] = field(default_factory=list)
    identity: Optional[Identity] = None
    hours: Optional[hours_mod.HoursResult] = None
    hours_url: Optional[str] = None
    hours_method: str = "text"
    phones: List[Found] = field(default_factory=list)
    jsonld_phones: List[str] = field(default_factory=list)  # E.164 numbers in the site's JSON-LD
    emails: List[Found] = field(default_factory=list)
    socials: List[Tuple[social.SocialCandidate, str]] = field(default_factory=list)
    careers_url: Optional[str] = None
    careers_source_url: Optional[str] = None
    roles: Optional[List[str]] = None  # None when no careers page was read
    services: List[str] = field(default_factory=list)
    services_url: Optional[str] = None
    error: Optional[str] = None      # why the home page failed (dns, http_5xx, ...)
    blocked: Optional[str] = None    # robots | challenge | unsafe_host | backoff
    backoff: bool = False
    backoff_until: Optional[str] = None
    moved_to: Optional[str] = None
    complete: bool = False           # every chosen page was read (or refused by robots.txt)


# ---------------------------------------------------------------- helpers

def _stamp(now: Any) -> str:
    return db.now_iso(resolve_now(now))


def _plus_days(now_s: str, days: float) -> str:
    return db.now_iso(db.parse_iso(now_s) + timedelta(days=days))


def _host_of(url: Optional[str]) -> str:
    try:
        return (urlsplit(url or "").hostname or "").lower()
    except ValueError:
        return ""


def _area_code(e164: str) -> str:
    return e164[2:5] if e164 and e164.startswith("+1") and len(e164) == 12 else ""


# ---------------------------------------------------------------- choosing work

def _known_phone(conn: sqlite3.Connection, business_id: int) -> Optional[str]:
    row = facts.get_fact(conn, business_id, "phone")
    if row is not None:
        value = facts.canonical("phone", _json(row["value_json"]))
        if value:
            return value
    row = conn.execute(
        "SELECT phone FROM source_records WHERE business_id=? AND active=1 AND phone IS NOT NULL"
        f" AND phone != '' ORDER BY {_SOURCE_ORDER_SQL} LIMIT 1",
        (business_id,),
    ).fetchone()
    return row["phone"] if row else None


def _json(text: Optional[str]) -> Any:
    try:
        return json.loads(text) if text else None
    except ValueError:
        return None


def snapshot(conn: sqlite3.Connection, business: sqlite3.Row) -> Optional[BusinessSnapshot]:
    """A snapshot of one business row, or None when it has no usable website."""
    url = normalize.norm_url(business["website"])
    if not url:
        return None
    return BusinessSnapshot(
        id=int(business["id"]),
        public_id=business["public_id"] or f"#{business['id']}",
        name=business["name"],
        category=business["category"] or "other",
        street=business["street"],
        street_norm=business["street_norm"],
        zip=business["zip"],
        website=url,
        website_domain=normalize.registrable_domain(url),
        phone=_known_phone(conn, int(business["id"])),
    )


def due_businesses(conn: sqlite3.Connection, settings, now: Any, limit: int) -> List[BusinessSnapshot]:
    """Businesses whose website is due for a visit, oldest first, one per host.

    Due means: a website is known, the business is active, in the city or
    nearby, not suppressed, ``next_crawl_at`` is empty or past, and the site is
    not in backoff or blocked by a challenge (``host_state.backoff_until`` in
    the future for the host or its registrable domain). At most one business
    per site (registrable domain) is handed out, so ``biz.example`` and
    ``www.biz.example`` are never visited at the same time.
    """
    if limit <= 0:
        return []
    now_s = _stamp(now)
    rows = conn.execute(
        "SELECT * FROM businesses WHERE website IS NOT NULL AND website != '' AND active=1"
        " AND publish_state != 'suppressed' AND scope IN ('city','nearby')"
        " AND (next_crawl_at IS NULL OR next_crawl_at <= ?)"
        " ORDER BY next_crawl_at IS NOT NULL, next_crawl_at, id",
        (now_s,),
    ).fetchall()
    in_backoff = {r["host"] for r in conn.execute(
        "SELECT host FROM host_state WHERE backoff_until IS NOT NULL AND backoff_until > ?", (now_s,)
    )}
    closed_sites = {site_key(h) for h in in_backoff}  # a row keyed by any host of the site closes it
    out: List[BusinessSnapshot] = []
    sites = set()
    for row in rows:
        if len(out) >= limit:
            break
        snap = snapshot(conn, row)
        if snap is None or not snap.host:
            continue
        site = site_key(snap.host)
        if site in sites or snap.host in in_backoff or site in closed_sites:
            continue
        if privacy.is_suppressed(conn, row):
            continue
        sites.add(site)
        out.append(snap)
    return out


# ---------------------------------------------------------------- the visit (network only)

def _page_key(url: str) -> Tuple[str, str, str]:
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return host, (parts.path or "/").rstrip("/") or "/", parts.query


def link_rank(url: str, text: str) -> Optional[int]:
    """The rank of a same-site link (0 = contact ... 5 = services/menu), or None to skip it."""
    path = urlsplit(url).path or "/"
    for rank, (_, text_re, path_re) in enumerate(PAGE_RANKS):
        if (text and text_re.search(text)) or path_re.search(path):
            return rank
    return None


def _skippable(url: str) -> bool:
    parts = urlsplit(url)
    path = (parts.path or "/").lower()
    if path.endswith(SKIP_EXTENSIONS) or _SKIP_PATH.search(path):
        return True
    return len(parse_qsl(parts.query, keep_blank_values=True)) > 1


def choose_pages(home: Page, site_domain: str, fetched: Sequence[str], budget: int) -> List[Tuple[int, str]]:
    """Up to ``budget`` same-site pages worth reading, as (rank, url), best first."""
    if budget <= 0:
        return []
    seen = {_page_key(u) for u in fetched}
    best: Dict[Tuple[str, str, str], Tuple[int, int, str]] = {}
    for index, link in enumerate(home.links):
        url = link.url
        if normalize.registrable_domain(_host_of(url)) != site_domain or _skippable(url):
            continue
        key = _page_key(url)
        if key in seen:
            continue
        rank = link_rank(url, link.text)
        if rank is None:
            continue
        if key not in best or (rank, index) < best[key][:2]:
            best[key] = (rank, index, url)
    ordered = sorted(best.values())
    return [(rank, url) for rank, _, url in ordered[:budget]]


def _backoff_until(fetcher, host: str) -> Optional[str]:
    """The latest backoff end recorded for the host or its site (backoff is kept per site)."""
    keys = {host, site_key(host)}
    until = [row.get("backoff_until") for row in fetcher.export_host_state()
             if row.get("host") in keys and row.get("backoff_until")]
    return max(until) if until else None


def _classify_home(result: VisitResult, fetched, fetcher) -> bool:
    """Set status/error/blocked from the home page. True when the page can be read."""
    result.final_url = fetched.final_url
    if fetched.blocked == "unsafe_host":
        result.status, result.blocked = "blocked", "unsafe_host"
        return False
    if fetched.redirected_offsite:
        result.status = "moved"
        result.moved_to = normalize.norm_url(fetched.final_url) or fetched.final_url
        return False
    if fetched.blocked == "backoff":
        result.blocked, result.backoff = "backoff", True
        result.backoff_until = _backoff_until(fetcher, fetched.host or result.host)
        return False
    if fetched.blocked:
        result.status, result.blocked = "blocked", fetched.blocked
        return False
    if fetched.error in DEAD_ERRORS or fetched.status in DEAD_STATUSES:
        result.status, result.error = "dead", fetched.error or f"http_{fetched.status}"
        return False
    if fetched.error or fetched.text is None or fetched.status != 200:
        # A 5xx, TLS trouble, a non-HTML or oversized page: says nothing about the site.
        result.error = fetched.error or "not_html"
        return False
    result.status = "ok"
    return True


def _best_found(found: Dict[Any, Found], value: Any, method: str, confidence: float, url: str) -> None:
    current = found.get(value)
    if current is None or confidence > current.confidence:
        found[value] = Found(value, method, confidence, url)


def _extract(result: VisitResult, snap: BusinessSnapshot, pages: List[Tuple[Optional[int], Page]],
             settings) -> None:
    all_pages = [page for _, page in pages]
    site_domain = normalize.registrable_domain(result.final_url or snap.website)

    matches, reason, address_listed = identity.site_matches_business(
        all_pages, snap.name, snap.street, snap.phone)
    address_url = None
    if address_listed:
        address_url = next((p.url for p in all_pages
                            if identity.site_matches_business([p], snap.name, snap.street)[2]), None)
    result.identity = Identity(bool(matches), reason, bool(address_listed), address_url)

    # Hours: the business's structured data first, then the page that states hours.
    items = [item for page in all_pages for item in page.jsonld]
    from_jsonld = hours_mod.hours_from_jsonld(items)
    if from_jsonld.hours is not None or from_jsonld.issues:
        result.hours, result.hours_method = from_jsonld, "jsonld"
        result.hours_url = next(
            (p.url for p in all_pages if any(
                isinstance(i, dict) and (i.get("openingHoursSpecification") or i.get("openingHours"))
                for i in p.jsonld)),
            all_pages[0].url)
    else:
        preference = {RANK_NAMES.index("hours"): 0, RANK_NAMES.index("contact"): 1, None: 2,
                      RANK_NAMES.index("location"): 3}
        ordered = sorted(enumerate(pages), key=lambda item: (preference.get(item[1][0], 4), item[0]))
        for _, (_, page) in ordered:
            if not any(_HOURS_WORD.search(line) for line in page.lines):
                continue
            found = hours_mod.hours_from_lines(page.lines)
            if found.hours is not None or found.issues:
                result.hours, result.hours_url, result.hours_method = found, page.url, "text"
                break

    phones: Dict[str, Found] = {}
    emails: Dict[str, Found] = {}
    socials: Dict[str, Tuple[social.SocialCandidate, str]] = {}
    links: List[Tuple[str, str]] = []
    tags: Dict[str, str] = {}
    for _, page in pages:
        for e164, method, confidence in contacts.phones(page, allow_fictional=settings.allow_fictional_phones):
            _best_found(phones, e164, method, confidence, page.url)
        for raw in contacts._jsonld_values(page, "telephone"):
            e164 = normalize.norm_phone(raw, allow_fictional=settings.allow_fictional_phones)
            if e164 and e164 not in result.jsonld_phones:
                result.jsonld_phones.append(e164)
        for email, method, confidence in contacts.emails(page, site_domain):
            _best_found(emails, email, method, confidence, page.url)
        for cand in social.social_links(page, snap.name, site_domain):
            socials.setdefault(cand.url, (cand, page.url))
        for url in careers.careers_links(page):
            links.append((url, page.url))
        for tag in services.service_tags(page, snap.category):
            tags.setdefault(tag, page.url)
    # dicts keep insertion order: sort by confidence, first seen wins a tie.
    result.phones = sorted(phones.values(), key=lambda f: -f.confidence)
    result.emails = sorted(emails.values(), key=lambda f: -f.confidence)
    result.socials = list(socials.values())

    fetched_keys = {_page_key(p.url): p for p in all_pages}
    same_site = [(u, src) for u, src in links if normalize.registrable_domain(_host_of(u)) == site_domain]
    ats = [(u, src) for u, src in links if careers.is_ats_host(_host_of(u))]
    read = [(u, src) for u, src in same_site if _page_key(u) in fetched_keys]
    chosen = (read or same_site or ats or [(None, None)])[0]
    result.careers_url, result.careers_source_url = chosen
    if result.careers_url and _page_key(result.careers_url) in fetched_keys:
        result.roles = careers.roles_on_page(fetched_keys[_page_key(result.careers_url)])

    if tags:
        result.services = sorted(tags)[:MAX_SERVICE_TAGS]
        result.services_url = tags[result.services[0]]


def visit(snap: BusinessSnapshot, fetcher, settings) -> VisitResult:
    """Read one business's site through ``fetcher``. Network only; never touches the database."""
    result = VisitResult(host=snap.host)
    home = fetcher.fetch(snap.website)
    if not _classify_home(result, home, fetcher):
        log.info("visit %s host=%s status=%s blocked=%s error=%s", snap.public_id, result.host,
                 result.status, result.blocked, result.error)
        return result

    home_page = parse_page(home.text or "", home.final_url)
    pages: List[Tuple[Optional[int], Page]] = [(None, home_page)]
    result.fetched_urls.append(home.final_url)
    site_domain = normalize.registrable_domain(home.final_url)
    budget = max(0, int(settings.max_pages_per_visit) - 1)
    complete = True
    for rank, url in choose_pages(home_page, site_domain, [snap.website, home.final_url], budget):
        page = fetcher.fetch(url)
        if page.blocked in ("backoff", "challenge"):
            complete = False
            break  # the site asked us to slow down, or put up a bot check: stop, keep what we have
        if page.blocked or page.redirected_offsite:
            continue  # robots.txt says no, or the link leaves the site: simply skipped
        if page.error in DEAD_ERRORS or page.error == "http_5xx":
            complete = False
            continue
        if page.text is None or page.status != 200:
            continue
        if any(_page_key(page.final_url) == _page_key(done) for done in result.fetched_urls):
            continue  # redirected back to a page already read
        pages.append((rank, parse_page(page.text, page.final_url)))
        result.fetched_urls.append(page.final_url)
    result.pages_fetched = len(pages)
    result.complete = complete
    _extract(result, snap, pages, settings)
    log.info("visit %s host=%s status=ok pages=%d identity=%s", snap.public_id, result.host,
             result.pages_fetched, result.identity.reason if result.identity else "-")
    return result


# ---------------------------------------------------------------- applying a visit (database)

def _note(conn: sqlite3.Connection, business_id: int, field_name: str, found: Found, now_s: str) -> None:
    """Keep a value as an observation only (never proposed as the fact)."""
    value = facts.canonical(field_name, found.value)
    if value is None:
        return
    facts._upsert_observation(conn, business_id, field_name, value, SOURCE_ID, found.source_url,
                              found.method, found.confidence, now_s)


def _identity_accepted(conn: sqlite3.Connection, business_id: int, site_url: str) -> bool:
    """A person already confirmed this site belongs to the business (accepted website_identity)."""
    domain = normalize.registrable_domain(site_url)
    for row in conn.execute(
        "SELECT source_url FROM review_queue WHERE business_id=? AND kind='website_identity'"
        " AND status='accepted'",
        (business_id,),
    ):
        if domain and normalize.registrable_domain(row["source_url"] or "") == domain:
            return True
    return False


def choose_phone(phones: Sequence[Found], known: Optional[str],
                 structured: Sequence[str] = ()) -> Tuple[Found, Optional[str]]:
    """(the phone to propose, review flag or None) from the distinct numbers a site lists.

    A site can list other branches, a fax, or its web designer, so the first
    number is not assumed to be this location's:

    1. the number the business's own public record (or the accepted fact)
       already has, when the site lists it;
    2. else the one local number in the site's own structured data (JSON-LD);
    3. else the only local (903/430) number;
    4. several local numbers and no way to choose: the first goes to review as
       ``multiple_phones``; only out-of-area numbers: review ``phone_out_of_area``.
    """
    if known:
        for found in phones:
            if found.value == known:
                return found, None
    local = [p for p in phones if _area_code(p.value) in config.EAST_TEXAS_AREA_CODES]
    in_jsonld = [p for p in local if p.method == "jsonld" or p.value in structured]
    if len(in_jsonld) == 1:
        return in_jsonld[0], None
    if len(local) == 1:
        return local[0], None
    if local:
        return local[0], "multiple_phones"
    return phones[0], "phone_out_of_area"


def _write_facts(conn: sqlite3.Connection, snap: BusinessSnapshot, result: VisitResult, now_s: str) -> Dict[str, int]:
    bid = snap.id
    tally: Dict[str, int] = {}

    def observe(field_name: str, value: Any, source_url: Optional[str], method: str, confidence: float,
                flagged: Optional[str] = None) -> None:
        outcome = facts.observe(conn, bid, field_name, value, SOURCE_ID, source_url, method, confidence,
                                observed_at=now_s, flagged=flagged)
        tally[outcome] = tally.get(outcome, 0) + 1

    site = normalize.norm_url(result.final_url) or result.final_url
    observe("website", site, result.final_url, "identity", IDENTITY_CONFIDENCE)
    ident = result.identity
    if ident is not None and ident.address_listed:
        observe("address_listed", True, ident.address_url or result.final_url, "text", ADDRESS_CONFIDENCE)

    if result.phones:
        best, flag = choose_phone(result.phones, snap.phone, result.jsonld_phones)
        observe("phone", best.value, best.source_url, best.method, best.confidence, flag)
        for other in result.phones:
            if other is not best:
                _note(conn, bid, "phone", other, now_s)

    if result.emails:
        best = result.emails[0]
        observe("email", best.value, best.source_url, best.method, best.confidence)
        for other in result.emails[1:]:
            _note(conn, bid, "email", other, now_s)

    found_hours = result.hours
    if found_hours is not None:
        if found_hours.issues:
            # A flag without a value: a person reads the page; nothing is proposed.
            for issue in found_hours.issues:
                if db.add_review(conn, kind=issue, business_id=bid, field="hours", detail=issue,
                                 source_url=result.hours_url, now=now_s):
                    tally["review"] = tally.get("review", 0) + 1
        elif found_hours.hours is not None:
            observe("hours", found_hours.hours, result.hours_url, result.hours_method, found_hours.confidence)

    for network in ("facebook", "instagram"):
        candidates = [(c, src) for c, src in result.socials if c.network == network]
        match = next(((c, src) for c, src in candidates if c.matches), None)
        if match is not None:
            observe(network, match[0].url, match[1], "link", LINK_CONFIDENCE)
        elif candidates:
            cand, src = candidates[0]
            observe(network, cand.url, src, "link", LINK_CONFIDENCE, "social_mismatch")

    if result.careers_url:
        observe("careers", result.careers_url, result.careers_source_url, "link", LINK_CONFIDENCE)
    if result.services:
        observe("services", list(result.services), result.services_url, "text", SERVICES_CONFIDENCE)
    return tally


def _hiring(conn: sqlite3.Connection, bid: int, result: VisitResult, now_s: str) -> None:
    if result.careers_url:
        existing = conn.execute("SELECT roles_json FROM hiring_signals WHERE business_id=?", (bid,)).fetchone()
        if result.roles is not None:
            roles_json = db.dumps(sorted(set(result.roles)))
        else:
            roles_json = existing["roles_json"] if existing else "[]"
        conn.execute(
            "INSERT INTO hiring_signals(business_id, careers_url, roles_json, first_seen_at, last_seen_at, active)"
            " VALUES (?,?,?,?,?,1) ON CONFLICT(business_id) DO UPDATE SET careers_url=excluded.careers_url,"
            " roles_json=excluded.roles_json, last_seen_at=excluded.last_seen_at, active=1",
            (bid, result.careers_url, roles_json, now_s, now_s),
        )
    elif result.complete:
        conn.execute("UPDATE hiring_signals SET active=0 WHERE business_id=? AND active=1", (bid,))


def _schedule(result: VisitResult, failures: int, settings, now_s: str) -> Tuple[str, int, str]:
    """(outcome, crawl_failures, next_crawl_at) for a visit result."""
    ladder = tuple(settings.backoff_days) or (1,)

    def failed(outcome: str, until: Optional[str] = None) -> Tuple[str, int, str]:
        count = failures + 1
        days = ladder[min(count - 1, len(ladder) - 1)]
        return outcome, count, until or _plus_days(now_s, days)

    if result.backoff:
        until = result.backoff_until if result.backoff_until and result.backoff_until > now_s else None
        return failed("backoff", until)
    if result.status == "blocked":
        days = {"robots": ROBOTS_RETRY_DAYS, "challenge": CHALLENGE_RETRY_DAYS}.get(
            result.blocked or "", UNSAFE_RETRY_DAYS)
        return "blocked", failures + 1, _plus_days(now_s, days)
    if result.status == "moved":
        return "moved", 0, _plus_days(now_s, settings.reverify_days)
    if result.status == "ok":
        return "ok", 0, _plus_days(now_s, settings.reverify_days)
    return failed("dead" if result.status == "dead" else "failed")


def apply_visit(conn: sqlite3.Connection, snap: BusinessSnapshot, result: VisitResult, settings,
                now: Any) -> str:
    """Write one visit in a single transaction. Returns the outcome:

    ``ok`` (facts written), ``identity_mismatch`` (no facts; review), ``moved``
    (review), ``dead``, ``blocked``, ``backoff``, ``failed`` (status kept),
    ``suppressed`` (removal requested meanwhile; schedule only), ``missing``.
    """
    now_s = _stamp(now)
    tally: Dict[str, int] = {}
    with db.transaction(conn):
        biz = conn.execute("SELECT * FROM businesses WHERE id=?", (snap.id,)).fetchone()
        if biz is None:
            return "missing"
        outcome, failures, next_at = _schedule(result, int(biz["crawl_failures"] or 0), settings, now_s)
        status = result.status if result.status and not result.backoff else biz["website_status"]
        conn.execute(
            "UPDATE businesses SET website_status=?, last_crawled_at=?, next_crawl_at=?, crawl_failures=?"
            " WHERE id=?",
            (status, now_s, next_at, failures, snap.id),
        )
        if privacy.is_suppressed(conn, biz):
            outcome = "suppressed"
        elif result.status == "moved":
            if db.add_review(conn, kind="website_moved", business_id=snap.id, field="website",
                             proposed=result.moved_to, current=snap.website, source_url=snap.website,
                             detail="home page redirected to another domain", now=now_s):
                tally["review"] = 1
        elif result.status == "ok" and result.identity is not None:
            ident = result.identity
            if not ident.matches and _identity_accepted(conn, snap.id, result.final_url or snap.website):
                ident = result.identity = ident._replace(matches=True, reason="accepted_by_reviewer")
            if ident.matches:
                tally = _write_facts(conn, snap, result, now_s)
                _hiring(conn, snap.id, result, now_s)
            else:
                outcome = "identity_mismatch"
                # The site no longer says it is this business (a lapsed or resold domain):
                # stop showing it and everything read from it until a person decides. The
                # facts stay in the archive; a later matching visit or an accepted review
                # brings them back.
                status = "unknown"
                conn.execute("UPDATE businesses SET website_status=? WHERE id=?", (status, snap.id))
                if db.add_review(conn, kind="website_identity", business_id=snap.id, field="website",
                                 detail=ident.reason, source_url=result.final_url, now=now_s):
                    tally["review"] = 1
    log.info("apply %s host=%s outcome=%s status=%s pages=%d accepted=%d confirmed=%d review=%d",
             snap.public_id, result.host, outcome, status, result.pages_fetched, tally.get("accepted", 0),
             tally.get("confirmed", 0), tally.get("review", 0))
    return outcome


# ---------------------------------------------------------------- host state hand-off

def load_host_state(conn: sqlite3.Connection, fetcher) -> int:
    """Give the fetcher the robots cache, spacing, and backoff the database remembers."""
    rows = [dict(r) for r in conn.execute("SELECT * FROM host_state ORDER BY host")]
    return fetcher.import_host_state(rows)


def persist_host_state(conn: sqlite3.Connection, fetcher) -> int:
    """Upsert the fetcher's host state (main thread only). Returns rows written."""
    rows = fetcher.export_host_state()
    marks = ",".join("?" * len(HOST_STATE_COLUMNS))
    updates = ", ".join(f"{c}=excluded.{c}" for c in HOST_STATE_COLUMNS if c != "host")
    written = 0
    with db.transaction(conn):
        for row in rows:
            values = [row.get(c) for c in HOST_STATE_COLUMNS]
            if not values[0]:
                continue
            values[HOST_STATE_COLUMNS.index("backoff_level")] = int(row.get("backoff_level") or 0)
            conn.execute(
                f"INSERT INTO host_state({', '.join(HOST_STATE_COLUMNS)}) VALUES ({marks})"
                f" ON CONFLICT(host) DO UPDATE SET {updates}",
                values,
            )
            written += 1
    return written
