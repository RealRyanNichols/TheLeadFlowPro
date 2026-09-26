"""The public Longview business directory as a static site, served by Caddy.

Input: a publish export (the contract in SPEC.md), normally the APPROVED batch
(``approval.py``). Output: every page under ``www/longview/businesses/``, so the
path on the droplet matches the future theleadflowpro.com/longview/businesses/.

The pages port the removed Next.js pages (profile, category, new, hiring,
about, and the A to Z index) and their copy. Rules every page follows:

* Every record is re-checked first (``validate.py``); a record that breaks a
  contract rule is dropped and only counts are logged.
* Every value is HTML-escaped; links are http/https only (plus the built
  ``tel:``, ``mailto:`` to the business's checked office inbox and to
  hello@theleadflowpro.com).
* Static HTML with one local stylesheet and, on the index only, one small
  local script (``search.js`` over ``search.json``). No inline styles or
  scripts, nothing from another host, and everything works without the script:
  the A to Z pages and the category pages are plain links.
* One ``h1`` per page, a skip link, labels, visible focus, AA contrast, and a
  layout built for a 390 px phone first.
* ``noindex,nofollow`` on every page while ``settings.indexable`` is off.

The site is written atomically: pages are built in a new folder under
``www/longview/.builds/``, and the ``businesses`` symbolic link is switched to
it in one rename. A build that fails leaves the previous site exactly as it was.
"""

from __future__ import annotations

import html
import json
import logging
import os
import re
import shutil
import tempfile
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple
from urllib.parse import quote, urlencode, urlsplit

from . import config
from .publish import local_date, resolve_now
from .validate import ValidationResult, empty_directory, http_url, shown_fields, validate_directory

log = logging.getLogger(__name__)

BASE = config.DIRECTORY_PATH + "/"            # /longview/businesses/
CANONICAL_BASE = config.SITE_URL              # https://www.theleadflowpro.com
LEADFLOW_LONGVIEW = config.SITE_URL + "/longview"
PAGE_SIZE = 50
NEW_WINDOW_DAYS = 180
SEARCH_MAX_RESULTS = 50
REL = "nofollow noopener noreferrer"
CSS_NAME = "directory.css"
JS_NAME = "search.js"
JSON_NAME = "search.json"

DISCLAIMER = "Not affiliated with the businesses listed. No rankings, no reviews, no endorsements."
SAMPLE_BANNER = "Sample data: fictional businesses for layout testing"
FOOTER_RESOURCE = "A free community resource from The LeadFlow Pro."
FOOTER_PITCH = "The LeadFlow Pro builds websites and follow-up systems for Longview businesses."
CATEGORY_LEAD = "Every one we could verify, listed A to Z. Not ranked."

SOURCE_LABELS = {
    "tx_sales_tax": "Texas Comptroller open data",
    "tx_tabc": "Texas Alcoholic Beverage Commission",
    "npi": "CMS NPI Registry",
    "website": "The business's own website",
}
FIELD_LABELS = {
    "name": "Business name", "address": "Address", "category": "Category",
    "permitSince": "Sales-tax permit date", "website": "Website", "phone": "Phone", "email": "Email",
    "hours": "Hours", "facebook": "Facebook", "instagram": "Instagram", "careers": "Careers page",
    "services": "Services",
}
ROLE_LABELS = {
    "front_desk": "Front desk", "office_manager": "Office manager", "medical_assistant": "Medical assistant",
    "dental_assistant": "Dental assistant", "receptionist": "Receptionist",
}
WEBSITE_NOTES = {
    "moved": "This address now forwards visitors to a different website.",
    "dead": "This website did not load when we last checked it.",
    "blocked": "This website does not allow automated checks, so we could not read it.",
}
DAY_NAMES = (("mon", "Monday"), ("tue", "Tuesday"), ("wed", "Wednesday"), ("thu", "Thursday"),
             ("fri", "Friday"), ("sat", "Saturday"), ("sun", "Sunday"))
SHORT_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
LONG_MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September",
               "October", "November", "December")
# Each colour carries white initials at better than 4.5:1 (defined in the CSS).
CATEGORY_CLASSES = ("restaurants", "auto", "health-dental", "beauty", "home-services", "retail",
                    "professional", "faith-community", "lodging-recreation", "education-childcare",
                    "industrial", "other")

ABOUT_SOURCES = (
    ("Texas Comptroller of Public Accounts",
     "Sales-tax permit holders, published as open data on the Texas Open Data Portal.",
     "The business or trade name, the location, the kind of business, and the date the permit started.",
     "https://data.texas.gov"),
    ("Texas Alcoholic Beverage Commission", "License records.",
     "Confirming a business name and a storefront address.", "https://www.tabc.texas.gov"),
    ("CMS NPI Registry",
     "Organization records for health care providers, from the Centers for Medicare & Medicaid Services.",
     "Practice names and practice-location addresses. Names of individual providers and officials are"
     " never used.", "https://npiregistry.cms.hhs.gov"),
    ("The business's own website", "Pages the business publishes itself.",
     "Website, phone, email, hours, social links, careers page, and service tags, only as the business"
     " lists them.", None),
)


# ---------------------------------------------------------------- small helpers

def e(value: Any) -> str:
    """HTML-escape any value for text or a quoted attribute."""
    return html.escape("" if value is None else str(value), quote=True)


def safe_url(value: Any) -> Optional[str]:
    """An http(s) URL, or None: never javascript:, data:, or anything else."""
    return http_url(value)


def path(*parts: str) -> str:
    """A site path with a trailing slash: path("category", "auto") -> /longview/businesses/category/auto/."""
    return BASE + "".join(f"{p}/" for p in parts if p)


def page_path(base_parts: Sequence[str], page: int) -> str:
    return path(*base_parts, f"page-{page}" if page > 1 else "")


def canonical(site_path: str) -> str:
    return CANONICAL_BASE + site_path


def format_day(ymd: str) -> str:
    y, m, d = (int(x) for x in ymd.split("-"))
    return f"{SHORT_MONTHS[m - 1]} {d}, {y}"


def format_month_year(ymd: str) -> str:
    y, m, _ = (int(x) for x in ymd.split("-"))
    return f"{LONG_MONTHS[m - 1]} {y}"


def _minutes(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def format_time(t: str) -> str:
    """"17:30" -> "5:30 PM"; "24:00" and "00:00" -> "12:00 AM"."""
    total = _minutes(t) % (24 * 60)
    h, m = divmod(total, 60)
    return f"{h % 12 or 12}:{m:02d} {'AM' if h < 12 else 'PM'}"


def format_hours(ranges: Sequence[Sequence[str]]) -> str:
    """One day's stated hours; "Closed" only when the business states it ([])."""
    if not ranges:
        return "Closed"
    return ", ".join("Open 24 hours" if (o, c) == ("00:00", "24:00") else f"{format_time(o)} – {format_time(c)}"
                     for o, c in ranges)


def hours_rows(hours: Mapping[str, list]) -> Tuple[List[Tuple[str, str]], bool]:
    """The stated days in week order, and whether any day was left unstated."""
    rows = [(label, format_hours(hours[key])) for key, label in DAY_NAMES if key in hours]
    return rows, len(rows) < len(DAY_NAMES)


def _fold(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))


def name_key(b: Mapping) -> tuple:
    """A to Z by name, numbers in number order, then slug. Never a judgement."""
    parts = re.split(r"(\d+)", _fold(b["name"]).casefold())
    return tuple((0, int(p)) if p.isdigit() else (1, p) for p in parts if p) + ((2, b["slug"]),)


def monogram_initials(name: str) -> str:
    skip = {"the", "and", "of", "a", "an", "at", "in", "on", "for", "llc", "inc", "co"}
    words = [w for w in re.split(r"[^A-Za-z0-9]+", _fold(name)) if w and w.lower() not in skip]
    return "".join(w[0].upper() for w in words[:2]) or "#"


def category_class(slug: str) -> str:
    return "cat-" + (slug if slug in CATEGORY_CLASSES else "other")


def address_line(b: Mapping) -> str:
    street, zip_code = b["address"]["street"], b["address"]["zip"]
    return f"{street}, Longview, TX {zip_code}" if street and zip_code else "Longview, TX"


def maps_url(b: Mapping) -> str:
    query = f"{b['name']}, {address_line(b)}" if b["address"]["street"] else f"{b['name']}, Longview, TX"
    return "https://www.google.com/maps/search/?" + urlencode({"api": "1", "query": query})


def website_host(url: str) -> str:
    host = (urlsplit(url).hostname or url).lower()
    return host[4:] if host.startswith("www.") else host


def mailto(subject: str, body: str) -> str:
    return (f"mailto:{config.CONTACT_EMAIL}?subject={quote(subject, safe='')}"
            f"&body={quote(body, safe='')}")


def claim_mailto(b: Mapping) -> str:
    return mailto(
        f"Longview directory: {b['name']} ({b['id']})",
        "\n".join([f"Listing: {canonical(path(b['slug']))}", "",
                   "I would like to claim, correct, or remove this listing.", "What should change:", ""]),
    )


def directory_mailto() -> str:
    return mailto("Longview directory: claim, correct, or remove a listing",
                  "Business name:\nListing link (if you have it):\nWhat should change:\n")


def plural(n: int, one: str, many: str) -> str:
    return f"{n:,} {one if n == 1 else many}"


def ext_link(url: str, text: str) -> str:
    """A link out to someone else's site: http(s) only, nofollow."""
    href = safe_url(url)
    return f'<a href="{e(href)}" rel="{REL}">{e(text)}</a>' if href else e(text)


def paginate(items: Sequence, page: int, size: int = PAGE_SIZE) -> Tuple[list, int]:
    pages = max(1, -(-len(items) // size))
    return list(items[(page - 1) * size: page * size]), pages


# ---------------------------------------------------------------- the directory in hand

class Directory:
    """The validated directory plus what every page needs to know about it."""

    def __init__(self, data: dict, settings):
        self.data = data
        self.settings = settings
        self.businesses: List[dict] = sorted(data["businesses"], key=name_key)
        self.categories: List[dict] = data["categories"]
        self.names = {c["slug"]: c["name"] for c in self.categories}
        self.sample = bool(data["sample"])
        # The owner's switch, never on for sample data or an empty batch.
        self.indexable = bool(settings.indexable) and not self.sample and bool(self.businesses)
        self.batch_date = local_date(data["generatedAt"]) if data.get("generatedAt") else None

    def category_name(self, slug: str) -> str:
        return self.names.get(slug, slug)

    def profile_indexable(self, b: Mapping) -> bool:
        """Indexed only with the switch on and at least one fact from the business's own website."""
        return self.indexable and any(f["source"] == "website" for f in b["facts"])

    def in_category(self, slug: str) -> List[dict]:
        return [b for b in self.businesses if b["category"] == slug]

    def new_in_longview(self) -> List[dict]:
        if not self.batch_date:
            return []
        end = self.batch_date
        start = (datetime.strptime(end, "%Y-%m-%d") - timedelta(days=NEW_WINDOW_DAYS)).strftime("%Y-%m-%d")
        found = [b for b in self.businesses if b["permitSince"] and start <= b["permitSince"] <= end]
        found.sort(key=name_key)
        found.sort(key=lambda b: b["permitSince"], reverse=True)  # stable: newest first, then A to Z
        return found

    def hiring(self) -> List[dict]:
        return [b for b in self.businesses if b["careersUrl"]]


# ---------------------------------------------------------------- page parts

def _robots(index: bool, paged: bool = False) -> str:
    if not index:
        return '<meta name="robots" content="noindex,nofollow">\n'
    if paged:
        return '<meta name="robots" content="noindex,follow">\n'
    return ""


def render_page(d: Directory, *, title: str, description: str, site_path: str, h1: str,
                eyebrow: str = "", lead: str = "", crumbs: Sequence[Tuple[str, Optional[str]]] = (),
                art: str = "", hero_extra: str = "", body: str = "", index: bool = False,
                paged: bool = False, script: bool = False, disclaimer_in_footer: bool = True,
                hero_class: str = "") -> str:
    """The frame every page shares. ``lead``, ``art``, ``hero_extra``, and ``body`` are HTML already escaped."""
    crumb_html = ""
    if crumbs:
        items = []
        for i, (label, href) in enumerate(crumbs):
            if href:
                items.append(f'<li><a href="{e(href)}">{e(label)}</a></li>')
            else:
                current = ' aria-current="page"' if i == len(crumbs) - 1 else ""
                items.append(f"<li><span{current}>{e(label)}</span></li>")
        crumb_html = f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{"".join(items)}</ol></nav>'
    sample = f'<p class="sample" role="note">{e(SAMPLE_BANNER)}</p>\n' if d.sample else ""
    script_tag = f'<script src="{BASE}{JS_NAME}" defer></script>\n' if script else ""
    foot_disclaimer = f'<p class="disclaimer">{e(DISCLAIMER)}</p>' if disclaimer_in_footer else ""
    hero_cls = "hero" + (f" {hero_class}" if hero_class else "")
    return (
        "<!doctype html>\n"
        '<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"{_robots(index, paged)}"
        '<meta name="referrer" content="no-referrer">\n'
        f"<title>{e(title)}</title>\n"
        f'<meta name="description" content="{e(description)}">\n'
        f'<link rel="canonical" href="{e(canonical(site_path))}">\n'
        '<link rel="icon" href="data:,">\n'
        f'<link rel="stylesheet" href="{BASE}{CSS_NAME}">\n'
        f"{script_tag}"
        "</head>\n<body>\n"
        '<a class="skip" href="#main">Skip to the content</a>\n'
        f"{sample}"
        f'<header class="brand"><div class="shell"><a href="{BASE}">Longview businesses</a>'
        '<span> · The LeadFlow Pro</span></div></header>\n'
        '<main id="main">\n'
        f'<section class="{hero_cls}"><div class="shell">{crumb_html}{art}'
        + (f'<p class="eyebrow">{e(eyebrow)}</p>' if eyebrow else "")
        + f"<h1>{e(h1)}</h1>"
        + (f'<p class="lead">{lead}</p>' if lead else "")
        + f"{hero_extra}</div></section>\n"
        f"{body}\n"
        "</main>\n"
        '<footer class="foot"><div class="shell">'
        f"{foot_disclaimer}"
        f"<p>{e(FOOTER_RESOURCE)}</p>"
        f'<p><a href="{e(LEADFLOW_LONGVIEW)}">{e(FOOTER_PITCH)}</a></p>'
        f'<p><a href="{path("about")}">About this directory</a></p>'
        "</div></footer>\n"
        "</body>\n</html>\n"
    )


def monogram(b: Mapping) -> str:
    return (f'<svg class="mono" viewBox="0 0 56 56" aria-hidden="true" focusable="false">'
            f'<rect class="{category_class(b["category"])}" width="56" height="56" rx="14"/>'
            f'<text class="mono-text" x="28" y="29" text-anchor="middle" dominant-baseline="central">'
            f"{e(monogram_initials(b['name']))}</text></svg>")


def cover(b: Mapping) -> str:
    return ('<svg class="cover" viewBox="0 0 960 300" preserveAspectRatio="xMinYMid slice" aria-hidden="true"'
            ' focusable="false"><defs><pattern id="cover-grid" width="40" height="40"'
            ' patternUnits="userSpaceOnUse"><path class="cover-line" d="M40 0H0V40"/></pattern></defs>'
            f'<rect class="{category_class(b["category"])}" width="960" height="300"/>'
            '<rect width="960" height="300" fill="url(#cover-grid)"/>'
            '<circle class="cover-dot" cx="840" cy="40" r="200"/><circle class="cover-dot" cx="840" cy="40" r="120"/>'
            f'<text class="cover-text" x="60" y="154" dominant-baseline="central">{e(monogram_initials(b["name"]))}'
            "</text></svg>")


def card(d: Directory, b: Mapping, extra: str = "") -> str:
    badges = []
    if b["website"] and b["website"]["status"] != "dead":
        badges.append('<li class="badge">Website</li>')
    if b["hours"]:
        badges.append('<li class="badge">Hours listed</li>')
    if b["careersUrl"]:
        badges.append('<li class="badge badge-hiring">Hiring</li>')
    badge_html = f'<ul class="badges" aria-label="Listed on this profile">{"".join(badges)}</ul>' if badges else ""
    return (f'<li class="card">{monogram(b)}<div>'
            f'<h3 class="card-name"><a href="{e(path(b["slug"]))}">{e(b["name"])}</a></h3>'
            f'<p class="card-meta">{e(b["categoryLabel"] or d.category_name(b["category"]))}</p>'
            f'<p class="card-addr">{e(address_line(b))}</p>{badge_html}{extra}</div></li>')


def pagination(page: int, pages: int, href: Callable[[int], str]) -> str:
    if pages <= 1:
        return ""
    prev = (f'<a href="{e(href(page - 1))}" rel="prev">Previous</a>' if page > 1
            else '<span class="pages-off"></span>')
    nxt = f'<a href="{e(href(page + 1))}" rel="next">Next</a>' if page < pages else '<span class="pages-off"></span>'
    return f'<nav class="pages" aria-label="Pages">{prev}<span>Page {page} of {pages}</span>{nxt}</nav>'


def category_chips(d: Directory, current: Optional[str] = None) -> str:
    items = []
    for c in d.categories:
        cur = ' aria-current="page"' if c["slug"] == current else ""
        items.append(f'<li><a href="{e(path("category", c["slug"]))}"{cur}>{e(c["name"])}'
                     f' <small>{c["count"]:,}</small></a></li>')
    return f'<ul class="chips">{"".join(items)}</ul>'


MORE_LINKS = (("all", "", "All businesses"), ("new", "new", "New in Longview"),
              ("hiring", "hiring", "Longview is hiring"), ("about", "about", "About this directory"))


def more_links(current: Optional[str] = None) -> str:
    items = [f'<li><a href="{e(path(p))}">{e(label)}</a></li>' for key, p, label in MORE_LINKS if key != current]
    return f'<ul class="links">{"".join(items)}</ul>'


def browse_band(d: Directory, current: Optional[str] = None, category: Optional[str] = None) -> str:
    chips = category_chips(d, category) if d.categories else ""
    return ('<section class="band" aria-labelledby="browse-title"><div class="shell">'
            + (f'<h2 id="browse-title">Browse by category</h2>{chips}'
               '<h2 class="subhead">More ways in</h2>' if chips else '<h2 id="browse-title">More ways in</h2>')
            + f"{more_links(current)}</div></section>")


def count_line(page: int, shown: int, total: int, pages: int) -> str:
    if pages <= 1:
        return ""
    start = (page - 1) * PAGE_SIZE + 1
    return f'<p class="count">Showing {start:,} to {start + shown - 1:,} of {total:,}.</p>'


def list_section(d: Directory, heading: str, items: List[dict], page: int, pages: int,
                 href: Callable[[int], str], total: int, extra: Callable[[dict], str] = lambda b: "",
                 note: str = "", empty: str = "", ident: str = "list") -> str:
    body = f'<h2 id="{ident}-title">{e(heading)}</h2>'
    if note:
        body += f'<p class="note">{e(note)}</p>'
    if not items:
        body += f'<div class="empty"><p>{e(empty)}</p></div>'
    else:
        body += count_line(page, len(items), total, pages)
        body += f'<ul class="cards">{"".join(card(d, b, extra(b)) for b in items)}</ul>'
        body += pagination(page, pages, href)
    return (f'<section class="band band-tint" id="{ident}" aria-labelledby="{ident}-title">'
            f'<div class="shell">{body}</div></section>')


# ---------------------------------------------------------------- the pages

def index_pages(d: Directory) -> Dict[str, str]:
    """The A to Z index, 50 per page: index.html, page-2/index.html, ..."""
    out: Dict[str, str] = {}
    count = len(d.businesses)
    title = "Longview businesses, A to Z | The LeadFlow Pro"
    description = ("Businesses in the City of Longview, Texas, listed A to Z with the source and check date"
                   " for every fact. Not ranked, no reviews.")
    if not count:
        body = ('<section class="band" aria-labelledby="first-title"><div class="shell prose">'
                '<h2 id="first-title">The first batch is being checked</h2>'
                "<p>Listings appear here once a person approves the first batch. Nothing is guessed in the"
                " meantime.</p>"
                f'<p><a href="{path("about")}">How the directory works</a></p></div></section>')
        out["index.html"] = render_page(
            d, title=title, description=description, site_path=BASE, h1="Longview businesses",
            eyebrow="Longview, Texas",
            lead=e("A free, sourced list of businesses in the City of Longview, Texas. The first batch is being"
                   " checked."),
            body=body, index=False)
        return out

    lead = e(f"{plural(count, 'business', 'businesses')} in the City of Longview, each listed with the source"
             " and check date for every fact. A to Z, not ranked.")
    all_pages = paginate(d.businesses, 1)[1]
    for page in range(1, all_pages + 1):
        items, pages = paginate(d.businesses, page)
        start = (page - 1) * PAGE_SIZE + 1
        parts = []
        if page == 1:
            parts.append(
                f'<section class="band" id="search" hidden aria-labelledby="search-title" data-base="{BASE}">'
                '<div class="shell"><h2 id="search-title">Find a business</h2>'
                '<form class="search" id="search-form" role="search">'
                '<div class="field field-q"><label for="search-q">Search businesses</label>'
                '<input id="search-q" name="q" type="search" maxlength="100" autocomplete="off"'
                ' placeholder="Name, service, or kind of business"></div>'
                '<div class="check"><input id="search-open" name="open" type="checkbox" value="1">'
                '<label for="search-open">Open now</label></div>'
                '<button type="submit" class="btn btn-primary">Search</button></form>'
                '<p class="note">Open now reads the hours each business lists on its own website, in Central'
                " time. Businesses without listed hours are left out of it.</p>"
                '<div id="search-results" hidden><p class="count" id="search-count" role="status"'
                ' aria-live="polite"></p><ul class="cards" id="search-list"></ul></div></div></section>')
            parts.append('<section class="band" aria-labelledby="browse-title"><div class="shell">'
                         f'<h2 id="browse-title">Browse by category</h2>{category_chips(d)}</div></section>')
        showing = f'<p class="count">Showing {start:,} to {start + len(items) - 1:,} of {count:,}.</p>'
        parts.append(
            f'<section class="band band-tint" id="az" aria-labelledby="az-title"><div class="shell">'
            f'<h2 id="az-title">All businesses, A to Z</h2>{showing}'
            f'<ul class="cards">{"".join(card(d, b) for b in items)}</ul>'
            f"{pagination(page, pages, lambda p: page_path((), p))}</div></section>")
        if page > 1:
            parts.append(browse_band(d, current=None))
        site_path = page_path((), page)
        out[("" if page == 1 else f"page-{page}/") + "index.html"] = render_page(
            d, title=title if page == 1 else f"Longview businesses, page {page} | The LeadFlow Pro",
            description=description, site_path=site_path, h1="Longview businesses", eyebrow="Longview, Texas",
            lead=lead, hero_extra=more_links("all"), body="\n".join(parts), index=d.indexable,
            paged=page > 1, script=page == 1)
    return out


def category_pages(d: Directory) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for c in d.categories:
        members = d.in_category(c["slug"])
        if not members:
            continue
        total_pages = paginate(members, 1)[1]
        for page in range(1, total_pages + 1):
            items, pages = paginate(members, page)
            body = (f'<section class="band band-tint" id="list" aria-labelledby="list-title"><div class="shell">'
                    f'<h2 id="list-title">{e(plural(len(members), "business", "businesses"))}</h2>'
                    f"{count_line(page, len(items), len(members), pages)}"
                    f'<ul class="cards">{"".join(card(d, b) for b in items)}</ul>'
                    f"{pagination(page, pages, lambda p, s=c['slug']: page_path(('category', s), p))}"
                    "</div></section>" + browse_band(d, category=c["slug"]))
            rel = f"category/{c['slug']}/" + ("" if page == 1 else f"page-{page}/") + "index.html"
            out[rel] = render_page(
                d, title=f"{c['name']} in Longview, TX | Longview businesses",
                description=f"{c['name']} in the City of Longview, Texas, listed A to Z with the source and check"
                            " date for every fact. Not ranked, no reviews.",
                site_path=page_path(("category", c["slug"]), page), h1=f"{c['name']} in Longview",
                eyebrow="Longview businesses", lead=e(CATEGORY_LEAD),
                crumbs=(("Longview businesses", BASE), (c["name"], None)), body=body, index=d.indexable,
                paged=page > 1)
    return out


def new_pages(d: Directory) -> Dict[str, str]:
    out: Dict[str, str] = {}
    found = d.new_in_longview()
    as_of = f" ({format_day(d.batch_date)})" if d.batch_date else ""
    total_pages = paginate(found, 1)[1]
    for page in range(1, total_pages + 1):
        items, pages = paginate(found, page)
        body = list_section(
            d, "New sales-tax permits", items, page, pages, lambda p: page_path(("new",), p),
            total=len(found),
            extra=lambda b: f'<p class="card-extra">Permit on file since {e(format_day(b["permitSince"]))}</p>',
            note="A new sales-tax permit can also mean a new owner, a move, or a new location, not only a"
                 " brand-new business.",
            empty="No new sales-tax permits in this window in the current batch.")
        out[("new/" if page == 1 else f"new/page-{page}/") + "index.html"] = render_page(
            d, title="New in Longview, TX | Longview businesses",
            description=f"Longview businesses whose Texas sales-tax permit started in the {NEW_WINDOW_DAYS} days"
                        " before the latest batch, newest first.",
            site_path=page_path(("new",), page), h1="New in Longview", eyebrow="Longview businesses",
            lead=e(f"Businesses whose Texas sales-tax permit started in the {NEW_WINDOW_DAYS} days before this"
                   f" batch{as_of}, newest first."),
            crumbs=(("Longview businesses", BASE), ("New in Longview", None)),
            body=body + browse_band(d, current="new"), index=d.indexable, paged=page > 1)
    return out


def _hiring_extra(b: Mapping) -> str:
    parts = [f'<p class="card-extra">{ext_link(b["careersUrl"], "Careers page on " + website_host(b["careersUrl"]))}'
             "</p>"]
    if b["hiringRoles"]:
        parts.append(f'<p class="card-extra">Roles mentioned: '
                     f'{e(", ".join(ROLE_LABELS[r] for r in b["hiringRoles"]))}</p>')
    checked = next((f["checkedAt"] for f in b["facts"] if f["field"] == "careers"), None)
    if checked:
        parts.append(f'<p class="card-extra">checked {e(format_day(checked))}</p>')
    return "".join(parts)


def hiring_pages(d: Directory) -> Dict[str, str]:
    out: Dict[str, str] = {}
    found = d.hiring()
    total_pages = paginate(found, 1)[1]
    for page in range(1, total_pages + 1):
        items, pages = paginate(found, page)
        body = list_section(d, "Careers pages", items, page, pages, lambda p: page_path(("hiring",), p),
                            total=len(found), extra=_hiring_extra,
                            empty="No careers pages found on business websites in the current batch.")
        out[("hiring/" if page == 1 else f"hiring/page-{page}/") + "index.html"] = render_page(
            d, title="Longview is hiring | Longview businesses",
            description="Longview businesses with a careers page on their own website, linked out, with the roles"
                        " mentioned there and the date each page was checked.",
            site_path=page_path(("hiring",), page), h1="Longview is hiring", eyebrow="Longview businesses",
            lead=e("Businesses with a careers page on their own website, A to Z. Apply on their site; we do not"
                   " take applications."),
            crumbs=(("Longview businesses", BASE), ("Longview is hiring", None)),
            body=body + browse_band(d, current="hiring"), index=d.indexable, paged=page > 1)
    return out


def _profile_description(b: Mapping, category_name: str) -> str:
    parts = [f"{b['name']} in Longview, TX. {b['categoryLabel'] or category_name}."]
    if b["address"]["street"]:
        parts.append(f"{address_line(b)}.")
    listed = [w for w, present in (("website", b["website"]), ("phone", b["phone"]), ("hours", b["hours"]),
                                   ("services", b["services"])) if present]
    if listed:
        text = ", ".join(listed[:-1]) + " and " + listed[-1] if len(listed) > 1 else listed[0]
        parts.append(f"{text[0].upper()}{text[1:]} from the business's own website.")
    parts.append("Every fact shows its source and the date it was checked.")
    return " ".join(parts)


def _dl_row(term: str, value: str) -> str:
    return f"<div><dt>{e(term)}</dt><dd>{value}</dd></div>"


def profile_page(d: Directory, b: Mapping) -> str:
    category_name = d.category_name(b["category"])
    rows = []
    if b["categoryLabel"]:
        rows.append(_dl_row("Kind of business", e(b["categoryLabel"])))
    if b["website"] and safe_url(b["website"]["url"]):
        note = WEBSITE_NOTES.get(b["website"]["status"])
        rows.append(_dl_row("Website", ext_link(b["website"]["url"], website_host(b["website"]["url"]))
                            + (f"<small>{e(note)}</small>" if note else "")))
    else:
        rows.append(_dl_row("Website", '<span class="fallback">No website found yet.</span>'))
    if b["phone"]:
        rows.append(_dl_row("Phone", f'<a href="tel:{e(b["phone"]["e164"])}">{e(b["phone"]["display"])}</a>'))
    else:
        rows.append(_dl_row("Phone", '<span class="fallback">No phone number listed on a website we could'
                                     " verify.</span>"))
    if b["email"]:
        rows.append(_dl_row("Email", f'<a href="mailto:{e(b["email"])}">{e(b["email"])}</a>'))
    socials = [(label, url) for label, url in (("Facebook", b["social"]["facebook"]),
                                               ("Instagram", b["social"]["instagram"])) if safe_url(url)]
    if socials:
        rows.append(_dl_row("Social", " · ".join(ext_link(url, label) for label, url in socials)))
    panels = [f'<div class="panel"><h2>Contact</h2><dl class="dl">{"".join(rows)}</dl></div>']

    if b["hours"]:
        table_rows, missing = hours_rows(b["hours"])
        hours_html = ('<table class="hours"><caption class="sr-only">Hours as the business lists them</caption>'
                      "<tbody>" + "".join(f'<tr><th scope="row">{e(day)}</th><td>{e(text)}</td></tr>'
                                          for day, text in table_rows) + "</tbody></table>")
        if missing:
            hours_html += '<p class="fallback">Hours not listed for other days.</p>'
        hours_html += '<p class="fallback">As listed on the business\'s own website. Times are Central.</p>'
    else:
        hours_html = '<p class="fallback">Hours not listed.</p>'
    panels.append(f'<div class="panel"><h2>Hours</h2>{hours_html}</div>')

    if b["careersUrl"] and safe_url(b["careersUrl"]):
        roles = (f'<p>Roles mentioned there: {e(", ".join(ROLE_LABELS[r] for r in b["hiringRoles"]))}.</p>'
                 if b["hiringRoles"] else "")
        panels.append('<div class="panel"><h2>Hiring</h2>'
                      f'<p>{ext_link(b["careersUrl"], "Careers page on " + website_host(b["careersUrl"]))}</p>'
                      f'{roles}<p class="fallback">Apply with the business directly. We do not take'
                      " applications.</p></div>")
    if b["services"]:
        panels.append('<div class="panel"><h2>Services</h2><p class="fallback">Matched to the headings and menus'
                      " on the business's own website.</p>"
                      f'<ul class="tags">{"".join(f"<li>{e(s)}</li>" for s in b["services"])}</ul></div>')
    if b["permitSince"]:
        panels.append('<div class="panel"><h2>Public record</h2>'
                      f"<p>Texas sales-tax permit on file since {e(format_month_year(b['permitSince']))}.</p></div>")

    shown = set(shown_fields(b))
    source_items = []
    for fact in b["facts"]:
        if fact["field"] not in shown:
            continue
        label = SOURCE_LABELS[fact["source"]]
        source = ext_link(fact["url"], label) if fact["url"] else e(label)
        source_items.append(f"<li><strong>{e(FIELD_LABELS[fact['field']])}</strong><span>{source}</span>"
                            f"<span>checked {e(format_day(fact['checkedAt']))}</span></li>")
    panels.append('<div class="panel grid-wide"><h2>Sources and checks</h2>'
                  f'<ul class="sources">{"".join(source_items)}</ul></div>')

    body = (f'<section class="band" aria-label="Listing details"><div class="shell grid">{"".join(panels)}</div>'
            "</section>"
            '<section class="band band-tint" aria-labelledby="claim-title"><div class="shell claim">'
            '<h2 id="claim-title">Something wrong or missing?</h2>'
            f'<p class="disclaimer">{e(DISCLAIMER)}</p>'
            '<p class="note">A business can ask us to correct a fact, add one from its own website, or remove the'
            " listing. The button opens an email to The LeadFlow Pro.</p>"
            f'<a class="btn btn-primary" href="{e(claim_mailto(b))}">Claim, correct, or remove this listing</a>'
            f'<p class="own">Own this business? <a href="{e(LEADFLOW_LONGVIEW)}">See what The LeadFlow Pro does for'
            " Longview businesses</a>.</p></div></section>")
    hero_extra = (f'<p class="where"><span>{e(address_line(b))}</span>'
                  f'<a href="{e(maps_url(b))}" rel="{REL}">Directions</a></p>')
    return render_page(
        d, title=f"{b['name']} in Longview, TX | Longview businesses",
        description=_profile_description(b, category_name), site_path=path(b["slug"]), h1=b["name"],
        eyebrow=category_name,
        crumbs=(("Longview businesses", BASE), (category_name, path("category", b["category"])), (b["name"], None)),
        art=cover(b), hero_extra=hero_extra, body=body, index=d.profile_indexable(b),
        disclaimer_in_footer=False, hero_class="hero-profile")


def about_page(d: Directory) -> str:
    s = d.settings
    published = len(d.businesses)
    counts = d.data["counts"]
    if d.batch_date and published:
        batch = (f"<p>Latest batch: {e(format_day(d.batch_date))}. "
                 f"{e(plural(published, 'business is', 'businesses are'))} listed. The archive holds"
                 f" {counts['inArchive']:,} records in all; {plural(counts['heldForPrivacy'], 'is', 'are')} held back"
                 f" for privacy and {plural(counts['needsReview'], 'is', 'are')} waiting for a person to review"
                 " them.</p>")
    else:
        batch = "<p>No batch has been published yet. The first batch is being checked; listings appear here once" \
                " a person approves it.</p>"
    sources = "".join(
        f"<li><strong>{ext_link(href, name) if href else e(name)}.</strong> {e(what)} Used for: {e(use)}</li>"
        for name, what, use, href in ABOUT_SOURCES)
    if d.data["sources"]:
        datasets = '<ul class="datasets" aria-label="Datasets in the latest batch">' + "".join(
            f"<li><strong>{ext_link(src['url'], src['name']) if src['url'] else e(src['name'])}</strong><dl>"
            f"<dt>Publisher</dt><dd>{e(src['publisher'])}</dd><dt>Licence</dt><dd>{e(src['license'])}</dd>"
            f"<dt>Last read</dt><dd>{e(format_day(src['lastSyncedAt']) if src['lastSyncedAt'] else 'Not yet')}"
            "</dd></dl></li>" for src in d.data["sources"]) + "</ul>"
    else:
        datasets = ("<p>Each dataset's licence is recorded from the publisher's dataset page at every sync, and is"
                    " listed here with the first published batch.</p>")
    token = config.USER_AGENT.split("/", 1)[0]
    megabytes = f"{s.max_page_bytes / 1_000_000:g}"
    robots_hours = f"{s.robots_ttl_s / 3600:g}"
    robots_when = "every day" if s.robots_ttl_s == 86_400 else f"every {robots_hours} hours"

    def section(ident: str, title: str, inner: str, tint: bool = False) -> str:
        return (f'<section class="band{" band-tint" if tint else ""}" aria-labelledby="{ident}">'
                f'<div class="shell prose"><h2 id="{ident}">{e(title)}</h2>{inner}</div></section>')

    body = "".join([
        section("what", "What it is",
                "<p>One listing per business location in the City of Longview, drawn from public records and each"
                " business's own website. Listings are A to Z. Nothing is ranked, scored, or promoted.</p>" + batch),
        section("sources", "Where the facts come from",
                f"<ul>{sources}</ul><p>Map data used for discovery: © "
                f"{ext_link('https://www.openstreetmap.org/copyright', 'OpenStreetMap contributors')}, ODbL."
                " OpenStreetMap helps find businesses and their websites. Names, addresses, and phone numbers from"
                f" OpenStreetMap are never shown.</p>{datasets}", tint=True),
        section("checks", "How facts are checked",
                "<ul><li>Only public records and each business's own website are used.</li>"
                "<li>Every fact on a listing shows its source and the date it was checked, with a link to the source"
                " whenever the source has one.</li>"
                "<li>A phone number, email, or opening hours appear only when the business publishes them on its own"
                " website. An email address appears only when it is a general office inbox on the business's own"
                " domain.</li>"
                "<li>A verified fact is never quietly overwritten. When sources disagree, or anything is uncertain,"
                " a person reviews it before it is shown.</li>"
                "<li>A missing fact stays missing. The page says so instead of guessing.</li>"
                "<li>A person approves each batch before it appears here.</li></ul>"),
        section("never", "What it never does",
                "<ul><li>No ratings, reviews, rankings, or endorsements.</li>"
                "<li>No photos and no text copied from a business's website. Service tags come from a fixed word"
                " list matched to the site's own headings and menus.</li>"
                "<li>No personal names. Only business and trade names are shown.</li>"
                "<li>No home addresses. A street address is shown only with public evidence of a storefront;"
                " otherwise the listing says Longview, TX.</li>"
                "<li>No contact details a business did not publish itself.</li>"
                "<li>It never contacts a listed business: no calls, texts, emails, or messages, and the crawler never"
                " fills in forms or logs in.</li></ul>", tint=True),
        section("crawler", "The crawler",
                "<p>The archive reads business websites with this user agent:</p>"
                f'<code class="code">{e(config.USER_AGENT)}</code>'
                f"<ul><li>At most {s.max_sites_concurrent:,} sites at a time.</li>"
                f"<li>At least {s.min_host_delay_s:g} seconds between requests to the same site.</li>"
                f"<li>At most {s.max_pages_per_visit:,} pages per visit.</li>"
                f"<li>At most {e(megabytes)} MB per page.</li>"
                f"<li>Obeys robots.txt and re-reads it {e(robots_when)}.</li>"
                "<li>No cookies, no JavaScript, no forms, no logins.</li></ul>"
                "<p>To keep it off your website, add these two lines to your robots.txt:</p>"
                f'<code class="code code-lines">User-agent: {e(token)}\nDisallow: /</code>'
                f"<p>It stops reading the site within {e('a day' if s.robots_ttl_s == 86_400 else robots_hours + ' hours')}"
                " of the change.</p>"),
        section("claim", "Claim, correct, or remove a listing",
                f'<p>Email <a href="mailto:{e(config.CONTACT_EMAIL)}">{e(config.CONTACT_EMAIL)}</a> with the business'
                " name and what should change. A business can ask us to correct a fact, add one from its own"
                " website, or remove its listing. A removal takes effect as soon as we act on it, without waiting"
                " for the next batch.</p>"
                f'<p><a class="btn btn-primary" href="{e(directory_mailto())}">Claim, correct, or remove a'
                " listing</a></p>", tint=True),
        section("affiliation", "Not affiliated",
                f'<p class="disclaimer">{e(DISCLAIMER)}</p>'
                "<p>The LeadFlow Pro is a marketing agency in Longview. The directory is a free community resource;"
                f' a listing is not an ad. <a href="{e(LEADFLOW_LONGVIEW)}">What The LeadFlow Pro does in'
                " Longview</a>.</p>"),
    ])
    if published:
        body += browse_band(d, current="about")
    return render_page(
        d, title="About the Longview business directory | The LeadFlow Pro",
        description="Where the directory's facts come from, how they are checked, what it never shows, how the"
                    " crawler behaves, and how to claim, correct, or remove a listing.",
        site_path=path("about"), h1="About this directory", eyebrow="Longview business directory",
        lead=e("A free, sourced list of businesses in the City of Longview, Texas, kept by The LeadFlow Pro. Every"
               " fact on a listing shows where it came from and the date it was checked."),
        crumbs=(("Longview businesses", BASE), ("About", None)), body=body, index=d.indexable,
        disclaimer_in_footer=False)


def search_json(d: Directory) -> str:
    rows = []
    for b in d.businesses:
        row = {"name": b["name"], "slug": b["slug"], "category": b["category"],
               "categoryLabel": b["categoryLabel"], "services": b["services"]}
        if b["address"]["street"] and b["address"]["zip"]:
            row["zip"] = b["address"]["zip"]
        row["hours"] = b["hours"]
        rows.append(row)
    return json.dumps({"schemaVersion": 1, "base": BASE, "categories": d.names, "businesses": rows},
                      ensure_ascii=False, separators=(",", ":")) + "\n"


def sitemap_xml(d: Directory) -> str:
    urls: List[Tuple[str, Optional[str]]] = [(BASE, None)]
    urls += [(path("category", c["slug"]), None) for c in d.categories]
    if d.new_in_longview():
        urls.append((path("new"), None))
    if d.hiring():
        urls.append((path("hiring"), None))
    urls.append((path("about"), None))
    urls += [(path(b["slug"]), b["updatedAt"]) for b in d.businesses if d.profile_indexable(b)]
    body = "".join(f"<url><loc>{e(canonical(p))}</loc>" + (f"<lastmod>{e(m)}</lastmod>" if m else "") + "</url>\n"
                   for p, m in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "</urlset>\n")


def render_site(data: dict, settings) -> Dict[str, str]:
    """Every file of the site, by path relative to the site folder."""
    d = Directory(data, settings)
    files: Dict[str, str] = {CSS_NAME: SITE_CSS}
    files.update(index_pages(d))
    files["about/index.html"] = about_page(d)
    if d.businesses:
        files[JS_NAME] = SEARCH_JS
        files[JSON_NAME] = search_json(d)
        files.update(category_pages(d))
        files.update(new_pages(d))
        files.update(hiring_pages(d))
        for b in d.businesses:
            files[f"{b['slug']}/index.html"] = profile_page(d, b)
        if d.indexable:
            files["sitemap.xml"] = sitemap_xml(d)
    return files


# ---------------------------------------------------------------- writing it

def site_root(settings) -> Path:
    return Path(settings.www_dir) / "longview"


def site_dir(settings) -> Path:
    """The served folder: a symbolic link to the live build."""
    return site_root(settings) / "businesses"


def site_exists(settings) -> bool:
    return (site_dir(settings) / "index.html").is_file()


def _write_file(folder: Path, rel: str, text: str) -> None:
    target = folder / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "wb") as fh:
        fh.write(text.encode("utf-8"))
    os.chmod(target, 0o644)


def _swap(root: Path, build: Path) -> None:
    """Point ``businesses`` at ``build`` in one rename (readers see the old site or the new one)."""
    link = root / "businesses"
    if link.exists() and not link.is_symlink():
        # A plain folder from an older layout: move it aside once, then use the link.
        os.replace(link, build.parent / f"legacy-{os.getpid()}")
    tmp = root / f".businesses-{os.getpid()}-{build.name}"
    if tmp.is_symlink() or tmp.exists():
        tmp.unlink()
    os.symlink(os.path.join(build.parent.name, build.name), tmp)
    os.replace(tmp, link)


def _prune(builds: Path, keep: Iterable[Path]) -> None:
    """Remove every build but the live one and the one before it (a reader may still be on it)."""
    keep_names = {p.name for p in keep}
    for entry in builds.iterdir():
        if entry.name not in keep_names and entry.is_dir() and not entry.is_symlink():
            shutil.rmtree(entry, ignore_errors=True)


def build_site(settings, export: Optional[dict], now: Any = None) -> Dict[str, Any]:
    """Validate ``export`` (None: nothing approved yet), render every page, and switch the site over.

    Returns counts: businesses shown, records dropped, pages written, and
    file-level issues. Nothing is logged but counts and reason codes.
    """
    result: ValidationResult = (validate_directory(export) if export is not None
                                else ValidationResult(empty_directory()))
    if result.dropped:
        reasons: Dict[str, int] = {}
        for _, reason in result.dropped:
            key = reason.split(":")[0]
            reasons[key] = reasons.get(key, 0) + 1
        log.warning("site: %d record(s) failed the contract check and were left out: %s",
                    len(result.dropped), ", ".join(f"{k} {v}" for k, v in sorted(reasons.items())))
    if result.issues:
        log.warning("site: %d file-level issue(s) in the batch", len(result.issues))
    files = render_site(result.directory, settings)

    root = site_root(settings)
    builds = root / ".builds"
    builds.mkdir(parents=True, exist_ok=True)
    for folder in (root, builds):
        try:
            os.chmod(folder, 0o755)
        except PermissionError:
            pass
    stamp = resolve_now(now).strftime("%Y%m%dT%H%M%S")
    build = Path(tempfile.mkdtemp(prefix=f"build-{stamp}-", dir=str(builds)))
    try:
        for rel, text in sorted(files.items()):
            _write_file(build, rel, text)
        for folder in [build, *(p for p in build.rglob("*") if p.is_dir())]:
            os.chmod(folder, 0o755)
        previous = site_dir(settings).resolve() if site_dir(settings).is_symlink() else None
        _swap(root, build)
    except BaseException:
        shutil.rmtree(build, ignore_errors=True)
        raise
    _prune(builds, [build] + ([previous] if previous is not None else []))
    pages = sum(1 for rel in files if rel.endswith(".html"))
    counts = {"businesses": len(result.directory["businesses"]), "dropped": len(result.dropped),
              "pages": pages, "issues": len(result.issues)}
    log.info("site built: %s", counts)
    return counts


# ---------------------------------------------------------------- the stylesheet and the script

SITE_CSS = """\
/* Longview business directory. LeadFlow tokens; phone first (390 px), then wider.
   No inline styles anywhere: the pages carry classes only. */
:root {
  --ink: #0A1220;
  --body: #39435A;
  --muted: #4E5866;
  --canvas: #F7F5F2;
  --panel: #FFFFFF;
  --tint: #EFECE6;
  --line: #DED8D0;
  --cobalt: #1240E8;
  --cobalt-deep: #0B2CA8;
  --mint: #146C34;
  --mint-soft: #E5EEE3;
  --warn: #92400E;
  --warn-soft: #FAE8C7;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--canvas);
  color: var(--ink);
  font-family: var(--font);
  font-size: 1rem;
  line-height: 1.5;
  overflow-wrap: break-word;
}
[hidden] { display: none !important; }
h1, h2, h3, p, ul, ol, dl, figure { margin: 0; }
a { color: var(--cobalt); text-decoration: underline; text-underline-offset: 3px; }
a:hover { color: var(--cobalt-deep); }
a:focus-visible, button:focus-visible, input:focus-visible, summary:focus-visible {
  outline: 3px solid var(--cobalt);
  outline-offset: 2px;
  border-radius: 4px;
}
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.skip {
  position: absolute; left: 8px; top: -60px; z-index: 10;
  padding: 10px 14px; border-radius: 8px;
  background: var(--ink); color: #FFFFFF; font-weight: 700;
}
.skip:focus { top: 8px; color: #FFFFFF; }
.shell { width: 100%; max-width: 72rem; margin: 0 auto; padding: 0 16px; }

.sample {
  padding: 10px 16px;
  background: var(--warn-soft);
  border-bottom: 1px solid #E9C98F;
  color: var(--warn);
  font-size: 15px;
  font-weight: 800;
  text-align: center;
}
.brand { background: var(--panel); border-bottom: 1px solid var(--line); font-size: 15px; }
.brand .shell { display: flex; flex-wrap: wrap; align-items: center; min-height: 48px; gap: 0 6px; }
.brand a { color: var(--ink); font-weight: 800; text-decoration: none; }
.brand a:hover { color: var(--cobalt); text-decoration: underline; }
.brand span { color: var(--muted); }

/* hero */
.hero {
  padding: 20px 0 28px;
  background: linear-gradient(120deg, #EDE6F3, var(--canvas) 52%, #F6E9DC);
  border-bottom: 1px solid var(--line);
}
.eyebrow {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
h1 {
  font-size: clamp(32px, 8vw, 60px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  max-width: 20ch;
}
.hero-profile h1 { font-size: clamp(30px, 7vw, 52px); max-width: 24ch; overflow-wrap: anywhere; }
.lead { margin-top: 14px; max-width: 60ch; font-size: 17px; color: var(--body); }
.crumbs ol {
  display: flex; flex-wrap: wrap; gap: 4px 8px;
  margin: 0 0 16px; padding: 0; list-style: none;
  font-size: 14px; color: var(--muted);
}
.crumbs li + li::before { content: "/"; margin-right: 8px; }
.crumbs a { color: var(--muted); }

/* bands */
.band { padding: 28px 0; }
.band-tint { background: var(--tint); }
.band + .band:not(.band-tint) { border-top: 1px solid var(--line); }
h2 { font-size: 23px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
h3 { font-size: 18px; font-weight: 800; line-height: 1.25; }
.subhead { margin-top: 28px; }
.note { margin-top: 12px; max-width: 70ch; font-size: 15px; line-height: 1.55; color: var(--muted); }
.count { margin-top: 8px; font-size: 15px; color: var(--muted); }

/* search (shown by search.js only) */
.search { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 16px; }
.field { display: grid; gap: 6px; min-width: 0; }
.field label, .check label { font-size: 15px; font-weight: 800; color: var(--ink); }
.field input {
  width: 100%; min-height: 48px; padding: 0 14px;
  border: 1.5px solid var(--muted); border-radius: 12px;
  background: var(--panel); color: var(--ink); font: inherit; font-size: 16px;
}
.check { display: flex; align-items: center; gap: 10px; min-height: 44px; }
.check input { width: 22px; height: 22px; margin: 0; accent-color: var(--cobalt); }

/* buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 48px; padding: 0 20px; border-radius: 12px; border: 0;
  font: inherit; font-size: 16px; font-weight: 800; text-align: center; line-height: 1.2;
  cursor: pointer; text-decoration: none;
}
.btn-primary { background: var(--cobalt); color: #FFFFFF; }
a.btn-primary { color: #FFFFFF; text-decoration: none; }
.btn-primary:hover, a.btn-primary:hover { background: var(--cobalt-deep); color: #FFFFFF; }

/* browse */
.chips, .links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; padding: 0; list-style: none; }
.chips a {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 44px; padding: 0 14px;
  border: 1px solid var(--line); border-radius: 999px;
  background: var(--panel); color: var(--ink);
  font-size: 15px; font-weight: 700; text-decoration: none;
}
.chips a:hover, .chips a[aria-current="page"] { border-color: var(--cobalt); color: var(--cobalt); }
.chips small { color: var(--muted); font-size: 13px; font-weight: 700; }
.links a { display: inline-flex; align-items: center; min-height: 44px; font-weight: 800; }
.hero .links { margin-top: 12px; gap: 4px 18px; }

/* cards */
.cards { display: grid; gap: 12px; margin-top: 16px; padding: 0; list-style: none; }
.card {
  display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 14px; align-items: start;
  padding: 16px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel);
}
.mono { display: block; width: 56px; height: 56px; }
.mono-text, .cover-text { fill: #FFFFFF; font-family: var(--font); font-weight: 800; letter-spacing: -0.02em; }
.mono-text { font-size: 22px; }
.cover-text { font-size: 150px; }
.card-name { font-size: 19px; line-height: 1.2; letter-spacing: -0.01em; }
.card-name a { color: var(--ink); text-decoration: none; }
.card-name a:hover { color: var(--cobalt); text-decoration: underline; }
.card-meta, .card-addr, .card-extra { margin-top: 4px; font-size: 15px; line-height: 1.45; color: var(--muted); }
.card-meta { color: var(--body); font-weight: 600; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding: 0; list-style: none; }
.badge {
  display: inline-flex; align-items: center; min-height: 26px; padding: 0 10px;
  border-radius: 999px; background: var(--tint); color: var(--ink); font-size: 13px; font-weight: 800;
}
.band-tint .badge { background: var(--canvas); }
.badge-hiring, .band-tint .badge-hiring { background: var(--mint-soft); color: var(--mint); }
.pages {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  margin-top: 22px; font-size: 15px; font-weight: 700; color: var(--muted);
}
.pages a {
  display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px;
  border: 1.5px solid var(--ink); border-radius: 12px; color: var(--ink); font-weight: 800; text-decoration: none;
}
.pages-off { min-width: 90px; }
.empty { margin-top: 16px; padding: 20px; border: 1px dashed #8C7F90; border-radius: 18px; background: var(--panel); }

/* category colours: white initials clear 4.5:1 on each */
.cat-restaurants { fill: #9A3412; }
.cat-auto { fill: #1240E8; }
.cat-health-dental { fill: #146C34; }
.cat-beauty { fill: #9D174D; }
.cat-home-services { fill: #92400E; }
.cat-retail { fill: #5135E5; }
.cat-professional { fill: #0A1220; }
.cat-faith-community { fill: #6B21A8; }
.cat-lodging-recreation { fill: #0F766E; }
.cat-education-childcare { fill: #3730A3; }
.cat-industrial { fill: #374151; }
.cat-other { fill: #4E5866; }
.cover-line { fill: none; stroke: #FFFFFF; stroke-opacity: 0.14; stroke-width: 1; }
.cover-dot { fill: #FFFFFF; fill-opacity: 0.07; }

/* footer */
.foot { padding: 28px 0 40px; border-top: 1px solid var(--line); font-size: 15px; color: var(--muted); }
.foot p { max-width: 70ch; }
.foot p + p { margin-top: 8px; }
.disclaimer { font-weight: 800; color: var(--ink); }

/* profile */
.cover { display: block; width: 100%; height: 120px; margin-bottom: 18px; border-radius: 20px; }
.where { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; margin-top: 12px; font-size: 17px; color: var(--body); }
.where a { display: inline-flex; align-items: center; min-height: 44px; font-weight: 800; }
.grid { display: grid; gap: 16px; }
.panel { padding: 20px 18px; border: 1px solid var(--line); border-radius: 20px; background: var(--panel); min-width: 0; }
.panel > * + * { margin-top: 12px; }
.dl { display: grid; gap: 12px; }
.dl div { display: grid; gap: 2px; }
.dl dt { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.dl dd { margin: 0; color: var(--ink); font-weight: 600; }
.dl dd a { display: inline-block; min-height: 24px; }
.dl dd small, .fallback { display: block; margin-top: 2px; font-size: 15px; font-weight: 500; color: var(--muted); }
.hours { width: 100%; border-collapse: collapse; font-size: 16px; }
.hours th, .hours td { padding: 8px 0; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
.hours th { width: 42%; font-weight: 700; color: var(--ink); }
.hours td { color: var(--body); }
.tags { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
.tags li {
  padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--canvas); color: var(--ink); font-size: 15px; font-weight: 600;
}
.sources { display: grid; padding: 0; list-style: none; }
.sources li {
  display: grid; gap: 2px; padding: 12px 0; border-bottom: 1px solid var(--line);
  font-size: 15px; line-height: 1.45; color: var(--body);
}
.sources li:last-child { border-bottom: 0; }
.sources strong { color: var(--ink); font-size: 16px; }
.claim { display: grid; gap: 14px; justify-items: start; }
.claim .btn { width: 100%; }
.own { color: var(--body); font-size: 15px; }

/* about */
.prose { max-width: 72ch; margin-left: auto; margin-right: auto; }
.prose > * + * { margin-top: 12px; }
.prose ul { padding-left: 22px; list-style: disc; }
.prose li + li { margin-top: 6px; }
.code {
  display: block; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px;
  background: var(--panel); color: var(--ink); font-family: var(--mono); font-size: 14px; line-height: 1.5;
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.code-lines { font-size: 13px; white-space: pre; overflow-wrap: normal; overflow-x: auto; }
.prose ul.datasets { display: grid; gap: 10px; padding: 0; list-style: none; }
.datasets li { margin: 0; padding: 14px 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); font-size: 15px; }
.datasets li + li { margin-top: 0; }
.datasets dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 12px; margin-top: 6px; }
.datasets dt { font-weight: 700; color: var(--ink); }
.datasets dd { margin: 0; }

@media (min-width: 640px) {
  .shell { padding: 0 24px; }
  .search { grid-template-columns: minmax(0, 1fr) auto auto; align-items: end; }
  .check { min-height: 48px; }
  .claim .btn { width: auto; }
  .cover { height: 180px; }
  h2 { font-size: 27px; }
}
@media (min-width: 760px) {
  .hero { padding: 32px 0 40px; }
  .band { padding: 44px 0; }
  .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .panel { padding: 26px; }
  .sources li { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto; align-items: baseline; gap: 16px; }
}
@media (min-width: 1080px) {
  .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .grid { grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); align-items: start; }
  .grid-wide { grid-column: 1 / -1; }
  .cover { height: 220px; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
"""

SEARCH_JS = """\
/* Longview business directory: search and "Open now" over search.json.
   Optional: without this script the A to Z pages and the category pages are
   plain links. Builds every node with createElement and textContent (never
   parsed markup) and asks only this site for search.json. */
(function () {
  "use strict";
  var root = document.getElementById("search");
  if (!root || !window.fetch || !window.Intl || !("hidden" in root)) { return; }
  var form = document.getElementById("search-form");
  var input = document.getElementById("search-q");
  var openBox = document.getElementById("search-open");
  var results = document.getElementById("search-results");
  var countLine = document.getElementById("search-count");
  var list = document.getElementById("search-list");
  var az = document.getElementById("az");
  var base = root.getAttribute("data-base") || "/longview/businesses/";
  var MAX = 50;
  var DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  var SVG = "http://www.w3.org/2000/svg";
  var data = null;
  var loading = null;

  function norm(text) {
    return String(text || "").normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase()
      .replace(/&/g, " and ").replace(/['\\u2019]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function minutes(t) { var p = t.split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function clock() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    var got = {};
    parts.forEach(function (p) { got[p.type] = p.value; });
    return {
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(got.weekday),
      at: (parseInt(got.hour, 10) % 24) * 60 + parseInt(got.minute, 10)
    };
  }
  /* true: a stated range covers now; false: today is stated and none does; null: cannot tell. */
  function openNow(hours, c) {
    if (!hours || c.day < 0) { return null; }
    var today = hours[DAYS[c.day]], before = hours[DAYS[(c.day + 6) % 7]] || [];
    var i, o, cl;
    for (i = 0; today && i < today.length; i++) {
      o = minutes(today[i][0]); cl = minutes(today[i][1]);
      if (cl > o ? (c.at >= o && c.at < cl) : c.at >= o) { return true; }
    }
    for (i = 0; i < before.length; i++) {
      o = minutes(before[i][0]); cl = minutes(before[i][1]);
      if (cl < o && c.at < cl) { return true; }
    }
    return today === undefined ? null : false;
  }
  function el(name, cls, text) {
    var node = document.createElement(name);
    if (cls) { node.className = cls; }
    if (text) { node.textContent = text; }
    return node;
  }
  function initials(name) {
    var skip = ["the", "and", "of", "a", "an", "at", "in", "on", "for", "llc", "inc", "co"];
    var words = String(name).normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").split(/[^A-Za-z0-9]+/)
      .filter(function (w) { return w && skip.indexOf(w.toLowerCase()) < 0; });
    return words.slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "#";
  }
  function monogram(b) {
    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "mono");
    svg.setAttribute("viewBox", "0 0 56 56");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var rect = document.createElementNS(SVG, "rect");
    rect.setAttribute("class", "cat-" + (/^[a-z-]+$/.test(b.category) ? b.category : "other"));
    rect.setAttribute("width", "56"); rect.setAttribute("height", "56"); rect.setAttribute("rx", "14");
    var text = document.createElementNS(SVG, "text");
    text.setAttribute("class", "mono-text");
    text.setAttribute("x", "28"); text.setAttribute("y", "29");
    text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "central");
    text.textContent = initials(b.name);
    svg.appendChild(rect); svg.appendChild(text);
    return svg;
  }
  function card(b, open) {
    var li = el("li", "card");
    var box = el("div");
    var h = el("h3", "card-name");
    var a = el("a", null, b.name);
    a.setAttribute("href", base + (/^[a-z0-9-]+$/.test(b.slug) ? b.slug : "") + "/");
    h.appendChild(a);
    box.appendChild(h);
    box.appendChild(el("p", "card-meta", b.categoryLabel || (data.categories[b.category] || "")));
    box.appendChild(el("p", "card-addr", b.zip ? "Longview, TX " + b.zip : "Longview, TX"));
    if (open) {
      var badges = el("ul", "badges");
      badges.appendChild(el("li", "badge badge-hiring", "Open now"));
      box.appendChild(badges);
    }
    li.appendChild(monogram(b));
    li.appendChild(box);
    return li;
  }
  function load() {
    if (!loading) {
      loading = fetch(base + "search.json", { credentials: "same-origin" })
        .then(function (r) { if (!r.ok) { throw new Error("status " + r.status); } return r.json(); })
        .then(function (json) {
          data = json;
          data.businesses.forEach(function (b) {
            b._text = " " + norm([b.name, b.categoryLabel || "", data.categories[b.category] || ""]
              .concat(b.services || []).join(" ")) + " ";
          });
          return data;
        });
    }
    return loading;
  }
  function run() {
    var tokens = norm(input.value.slice(0, 100)).split(" ").filter(Boolean).slice(0, 8);
    var onlyOpen = openBox.checked;
    if (!tokens.length && !onlyOpen) {
      results.hidden = true;
      if (az) { az.hidden = false; }
      return;
    }
    results.hidden = false;
    if (az) { az.hidden = true; }
    if (!data) { countLine.textContent = "Loading the list\\u2026"; }
    load().then(function () {
      var c = onlyOpen ? clock() : null;
      var found = data.businesses.filter(function (b) {
        if (c && openNow(b.hours, c) !== true) { return false; }
        return tokens.every(function (t) { return b._text.indexOf(t) >= 0; });
      });
      while (list.firstChild) { list.removeChild(list.firstChild); }
      found.slice(0, MAX).forEach(function (b) { list.appendChild(card(b, Boolean(c))); });
      if (!found.length) {
        countLine.textContent = "No businesses match that search. Try fewer words, or leave Open now unchecked.";
      } else if (found.length > MAX) {
        countLine.textContent = "Showing the first " + MAX + " of " + found.length.toLocaleString("en-US") +
          " matching businesses, A to Z. Add a word to narrow it.";
      } else {
        countLine.textContent = found.length.toLocaleString("en-US") +
          (found.length === 1 ? " matching business, A to Z." : " matching businesses, A to Z.");
      }
    }).catch(function () {
      countLine.textContent = "Search is not available right now. Browse the A to Z list or a category instead.";
      if (az) { az.hidden = false; }
    });
  }
  var timer = null;
  form.addEventListener("submit", function (event) { event.preventDefault(); run(); });
  input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, 150); });
  input.addEventListener("focus", function () { load().catch(function () {}); }, { once: true });
  openBox.addEventListener("change", run);
  root.hidden = false;
}());
"""
