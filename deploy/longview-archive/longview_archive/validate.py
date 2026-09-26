"""The site generator's own check of the publish contract (defence in depth).

``publish.build_export`` already applies every rule, but the public site renders
an approved file from disk, and a hand edit, an old engine build, or a bad copy
could still put a record there that breaks one. So every rule in SPEC.md "The
publish contract" is checked again here, as the removed website's
``lib/longviewDirectory/validate.ts`` did. A record that breaks one is DROPPED
with a reason, never repaired and never raised on: one bad row must not take
the directory down, and nothing is guessed.

Pure: no files, no network, no clock. Logs carry counts and reasons only,
never a name or a value.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple
from urllib.parse import urlsplit

from . import normalize
from .categories import CATEGORIES
from .extract.careers import is_ats_host
from .privacy import GENERIC_EMAIL_LOCALS

SCHEMA_VERSION = 1
DAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
HIRING_ROLES = ("front_desk", "office_manager", "medical_assistant", "dental_assistant", "receptionist")
FACT_SOURCES = ("tx_sales_tax", "tx_tabc", "npi", "website")
FACT_FIELDS = ("name", "address", "category", "permitSince", "website", "phone", "email", "hours",
               "facebook", "instagram", "careers", "services")
WEBSITE_STATUSES = ("ok", "moved", "dead", "blocked")
WEBSITE_ONLY_FIELDS = frozenset({"website", "phone", "email", "hours", "facebook", "instagram", "careers",
                                 "services"})
# Slugs a business can never take because a directory path owns them. The
# A to Z pages are page-2/, page-3/, ..., so those are reserved as a pattern.
RESERVED_SLUGS = frozenset({"about", "new", "hiring", "category", "page", "search", "status"})
RESERVED_SLUG_RE = re.compile(r"page-\d+")
CATEGORY_ORDER: Tuple[Tuple[str, str], ...] = tuple(CATEGORIES)
DEFAULT_SCOPE = "City of Longview, Texas"

SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
ID_RE = re.compile(r"lv-[a-z0-9]{4,40}")
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
INSTANT_RE = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z")
OPEN_RE = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d")
CLOSE_RE = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d|24:00")
E164_RE = re.compile(r"\+1([2-9]\d{2})([2-9]\d{2})(\d{4})")
ZIP_RE = re.compile(r"\d{5}")
EMAIL_RE = re.compile(r"([a-z0-9._%+-]+)@([a-z0-9-]+(?:\.[a-z0-9-]+)+)", re.I)
# Control characters, bidi overrides, and anything that looks like markup.
CONTROL_RE = re.compile("[\u0000-\u001f\u007f-\u009f​-‏ -‮⁠-⁩﻿]")
MARKUP_RE = re.compile(r"<[a-z!/?]", re.I)


class ContractError(ValueError):
    """One rule broken; the message is the reason code."""


def _fail(reason: str):
    raise ContractError(reason)


@dataclass
class ValidationResult:
    directory: dict
    dropped: List[Tuple[str, str]] = field(default_factory=list)  # (id, reason)
    issues: List[str] = field(default_factory=list)


# ---------------------------------------------------------------- small checks

def _is_record(value: Any) -> bool:
    return isinstance(value, dict)


def _plain(value: Any, limit: int, reason: str) -> str:
    if not isinstance(value, str):
        _fail(reason)
    text = value.strip()
    if not text or len(text) > limit or CONTROL_RE.search(text) or MARKUP_RE.search(text):
        _fail(reason)
    return text


def _optional_text(value: Any, limit: int, reason: str) -> Optional[str]:
    return None if value is None else _plain(value, limit, reason)


def is_local_date(value: Any) -> bool:
    """A real calendar date written YYYY-MM-DD."""
    if not isinstance(value, str) or not DATE_RE.fullmatch(value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False
    return True


def _date(value: Any, reason: str) -> str:
    if not is_local_date(value):
        _fail(reason)
    return value


def http_url(value: Any) -> Optional[str]:
    """The URL when it is an absolute http(s) URL with a dotted host and no credentials, else None."""
    if not isinstance(value, str) or not value or re.search(r"\s", value):
        return None
    if CONTROL_RE.search(value):
        return None
    try:
        parts = urlsplit(value)
        host = parts.hostname or ""
        parts.port  # noqa: B018 - raises on a bad port
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or "." not in host or parts.username or parts.password:
        return None
    return value


def _url(value: Any, reason: str) -> str:
    if not http_url(value):
        _fail(reason)
    return value


def _optional_url(value: Any, reason: str) -> Optional[str]:
    return None if value is None else _url(value, reason)


def generic_email_ok(email: str, site: str) -> bool:
    """Mirrors privacy.generic_email_ok: a generic office inbox on the site's own registrable domain."""
    m = EMAIL_RE.fullmatch(email.strip())
    if not m or m.group(1).lower() not in GENERIC_EMAIL_LOCALS:
        return False
    domain = normalize.registrable_domain(site)
    return bool(domain) and normalize.registrable_domain(m.group(2)) == domain


def nanp_display(e164: str) -> Optional[str]:
    m = E164_RE.fullmatch(e164)
    return f"({m.group(1)}) {m.group(2)}-{m.group(3)}" if m else None


def is_reserved_slug(slug: str) -> bool:
    return slug in RESERVED_SLUGS or bool(RESERVED_SLUG_RE.fullmatch(slug))


# ---------------------------------------------------------------- one business

def _address(raw: Any) -> dict:
    if not _is_record(raw):
        _fail("bad_address")
    street = _optional_text(raw.get("street"), 120, "bad_address_street")
    zip_code = raw.get("zip")
    if (street is None) != (zip_code is None):
        _fail("address_street_and_zip_must_match")
    if zip_code is not None and (not isinstance(zip_code, str) or not ZIP_RE.fullmatch(zip_code)):
        _fail("bad_address_zip")
    city = _plain(raw.get("city"), 60, "bad_address_city")
    state = _plain(raw.get("state"), 2, "bad_address_state")
    # The directory covers the City of Longview only; anything else would make
    # the "Longview, TX" fallback untrue.
    if city.lower() != "longview" or state != "TX":
        _fail("address_outside_longview")
    return {"street": street, "city": "Longview", "state": "TX", "zip": zip_code}


def _website(raw: Any) -> Optional[dict]:
    if raw is None:
        return None
    if not _is_record(raw):
        _fail("bad_website")
    url = _url(raw.get("url"), "bad_website_url")
    if raw.get("status") not in WEBSITE_STATUSES:
        _fail("bad_website_status")
    return {"url": url, "status": raw["status"]}


def _phone(raw: Any) -> Optional[dict]:
    if raw is None:
        return None
    if not _is_record(raw) or not isinstance(raw.get("e164"), str) or not isinstance(raw.get("display"), str):
        _fail("bad_phone")
    display = nanp_display(raw["e164"])
    if not display:
        _fail("phone_not_nanp")
    if raw["display"] != display:
        _fail("phone_display_mismatch")
    return {"e164": raw["e164"], "display": display}


def _hours(raw: Any) -> Optional[dict]:
    if raw is None:
        return None
    if not _is_record(raw):
        _fail("bad_hours")
    hours: Dict[str, list] = {}
    for key, ranges in raw.items():
        if key not in DAY_KEYS:
            _fail("bad_hours_day")
        if not isinstance(ranges, list) or len(ranges) > 6:
            _fail("bad_hours_ranges")
        out = []
        for pair in ranges:
            if not isinstance(pair, list) or len(pair) != 2:
                _fail("bad_hours_range")
            opens, closes = pair
            if not isinstance(opens, str) or not OPEN_RE.fullmatch(opens):
                _fail("bad_hours_time")
            if not isinstance(closes, str) or not CLOSE_RE.fullmatch(closes):
                _fail("bad_hours_time")
            if opens == closes:
                _fail("bad_hours_range")
            out.append([opens, closes])
        hours[key] = out
    # An object that states no day says nothing: "Hours not listed".
    return {day: hours[day] for day in DAY_KEYS if day in hours} or None


def _social(raw: Any) -> dict:
    if raw is None:
        return {"facebook": None, "instagram": None}
    if not _is_record(raw):
        _fail("bad_social")

    def on_host(value: Any, host: str, reason: str) -> Optional[str]:
        if value is None:
            return None
        if not http_url(value):
            _fail(reason)
        h = (urlsplit(value).hostname or "").lower()
        if h != host and not h.endswith("." + host):
            _fail(reason)
        return value

    return {
        "facebook": on_host(raw.get("facebook"), "facebook.com", "facebook_not_on_facebook_com"),
        "instagram": on_host(raw.get("instagram"), "instagram.com", "instagram_not_on_instagram_com"),
    }


def _facts(raw: Any) -> List[dict]:
    if not isinstance(raw, list):
        _fail("bad_facts")
    out = []
    for fact in raw:
        if not _is_record(fact):
            _fail("bad_fact")
        if fact.get("field") not in FACT_FIELDS:
            _fail("bad_fact_field")
        if fact.get("source") not in FACT_SOURCES:
            _fail("bad_fact_source")
        out.append({
            "field": fact["field"],
            "source": fact["source"],
            "url": _optional_url(fact.get("url"), "bad_fact_url"),
            "checkedAt": _date(fact.get("checkedAt"), "bad_fact_checked_at"),
        })
    return out


def shown_fields(b: Mapping) -> List[str]:
    """The fields a profile shows for this record; each needs a fact."""
    fields = ["name", "category"]
    if b["address"]["street"]:
        fields.append("address")
    for key, name in (("permitSince", "permitSince"), ("website", "website"), ("phone", "phone"),
                      ("email", "email"), ("hours", "hours")):
        if b.get(key):
            fields.append(name)
    if b["social"]["facebook"]:
        fields.append("facebook")
    if b["social"]["instagram"]:
        fields.append("instagram")
    if b.get("careersUrl"):
        fields.append("careers")
    if b.get("services"):
        fields.append("services")
    return fields


def check_business(raw: Any, known_categories: Iterable[str]) -> dict:
    """One record in contract form, or ContractError with the reason."""
    if not _is_record(raw):
        _fail("not_an_object")
    ident = raw.get("id")
    if not isinstance(ident, str) or not ID_RE.fullmatch(ident):
        _fail("bad_id")
    slug = raw.get("slug")
    if not isinstance(slug, str) or len(slug) > 160 or not SLUG_RE.fullmatch(slug):
        _fail("bad_slug")
    if is_reserved_slug(slug):
        _fail("reserved_slug")
    name = _plain(raw.get("name"), 160, "bad_name")
    category = raw.get("category")
    if not isinstance(category, str) or not SLUG_RE.fullmatch(category):
        _fail("bad_category")
    if category not in set(known_categories):
        _fail("unknown_category")
    category_label = _optional_text(raw.get("categoryLabel"), 120, "bad_category_label")
    address = _address(raw.get("address"))
    permit = raw.get("permitSince")
    permit_since = None if permit is None else _date(permit, "bad_permit_since")
    website = _website(raw.get("website"))
    phone = _phone(raw.get("phone"))
    email = None
    if raw.get("email") is not None:
        value = raw["email"]
        if not isinstance(value, str) or not EMAIL_RE.fullmatch(value):
            _fail("bad_email")
        if not website:
            _fail("email_without_website")
        if value.split("@")[0].lower() not in GENERIC_EMAIL_LOCALS:
            _fail("email_not_generic")
        if not generic_email_ok(value, website["url"]):
            _fail("email_off_domain")
        email = value
    hours = _hours(raw.get("hours"))
    social = _social(raw.get("social"))
    careers_url = _optional_url(raw.get("careersUrl"), "bad_careers_url")
    roles = raw.get("hiringRoles")
    if not isinstance(roles, list):
        _fail("bad_hiring_roles")
    if any(role not in HIRING_ROLES for role in roles):
        _fail("bad_hiring_role")
    if len(set(roles)) != len(roles):
        _fail("bad_hiring_roles")
    if roles and not careers_url:
        _fail("hiring_roles_without_careers")
    services_raw = raw.get("services")
    if not isinstance(services_raw, list) or len(services_raw) > 40:
        _fail("bad_services")
    services = [_plain(s, 60, "bad_service") for s in services_raw]
    facts = _facts(raw.get("facts"))
    updated_at = _date(raw.get("updatedAt"), "bad_updated_at")
    if not isinstance(raw.get("indexable"), bool):
        _fail("bad_indexable")

    business = {
        "id": ident, "slug": slug, "name": name, "category": category, "categoryLabel": category_label,
        "address": address, "permitSince": permit_since, "website": website, "phone": phone, "email": email,
        "hours": hours, "social": social, "careersUrl": careers_url, "hiringRoles": list(roles),
        "services": services, "facts": facts, "updatedAt": updated_at, "indexable": raw["indexable"],
    }

    # Provenance: contact details only from the business's own site, the permit
    # date only from the Comptroller, and a source for every shown field.
    for fact in facts:
        if fact["field"] in WEBSITE_ONLY_FIELDS and fact["source"] != "website":
            _fail(f"fact_not_from_website:{fact['field']}")
        if fact["field"] == "permitSince" and fact["source"] != "tx_sales_tax":
            _fail("permit_fact_not_from_comptroller")
    if any(f["source"] == "website" for f in facts) and not website:
        _fail("website_fact_without_website")
    if website:
        # "From the website" must mean a page on that website (or a subdomain),
        # not a directory or review site that happens to list the business.
        site = normalize.registrable_domain(website["url"])
        for fact in facts:
            if fact["source"] != "website":
                continue
            if not fact["url"]:
                _fail(f"website_fact_without_url:{fact['field']}")
            if normalize.registrable_domain(fact["url"]) != site:
                _fail(f"website_fact_off_site:{fact['field']}")
        # The careers link itself may point at a job board, but only the ones the engine keeps.
        if careers_url and normalize.registrable_domain(careers_url) != site \
                and not is_ats_host(urlsplit(careers_url).hostname or ""):
            _fail("careers_url_off_site")
    for name_ in shown_fields(business):
        if not any(f["field"] == name_ for f in facts):
            _fail(f"missing_fact:{name_}")
    return business


# ---------------------------------------------------------------- the directory

def recount_categories(businesses: List[dict], names: Optional[Mapping[str, str]] = None) -> List[dict]:
    """Categories rebuilt from the businesses that survived, in the fixed order."""
    names = dict(names or {})
    counts: Dict[str, int] = {}
    for b in businesses:
        counts[b["category"]] = counts.get(b["category"], 0) + 1
    order = [slug for slug, _ in CATEGORY_ORDER]
    fixed = dict(CATEGORY_ORDER)
    extra = sorted(slug for slug in counts if slug not in order)
    return [
        {"slug": slug, "name": names.get(slug) or fixed.get(slug) or slug, "count": counts[slug]}
        for slug in order + extra if counts.get(slug)
    ]


def empty_directory() -> dict:
    return {
        "schemaVersion": SCHEMA_VERSION, "generatedAt": None, "batchId": None, "sample": False,
        "indexable": False, "scope": DEFAULT_SCOPE,
        "counts": {"published": 0, "inArchive": 0, "heldForPrivacy": 0, "needsReview": 0},
        "sources": [], "categories": [], "businesses": [],
    }


def _non_negative_int(value: Any) -> Optional[int]:
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


def _sources(raw: Any, issues: List[str]) -> List[dict]:
    if not isinstance(raw, list):
        issues.append("sources is not a list")
        return []
    out = []
    for source in raw:
        try:
            if not _is_record(source):
                _fail("bad_source")
            synced = source.get("lastSyncedAt")
            out.append({
                "id": _plain(source.get("id"), 40, "bad_source"),
                "name": _plain(source.get("name"), 200, "bad_source"),
                "publisher": _plain(source.get("publisher"), 200, "bad_source"),
                "license": _plain(source.get("license"), 120, "bad_source"),
                "url": _optional_url(source.get("url"), "bad_source"),
                "lastSyncedAt": None if synced is None else _date(synced, "bad_source"),
            })
        except ContractError as exc:
            issues.append(f"a source entry breaks the contract ({exc})")
    return out


def validate_directory(raw: Any) -> ValidationResult:
    """The directory as the site may render it, the records dropped, and file-level issues."""
    issues: List[str] = []
    dropped: List[Tuple[str, str]] = []
    if not _is_record(raw):
        return ValidationResult(empty_directory(), dropped, ["the file is not a JSON object"])
    if raw.get("schemaVersion") != SCHEMA_VERSION or isinstance(raw.get("schemaVersion"), bool):
        # An unknown shape is never half-read.
        return ValidationResult(empty_directory(), dropped, ["schemaVersion is not 1"])

    generated = raw.get("generatedAt")
    generated_at = None
    if generated is not None:
        if isinstance(generated, str) and INSTANT_RE.fullmatch(generated) and is_local_date(generated[:10]):
            generated_at = generated
        else:
            issues.append("generatedAt is not a UTC timestamp")
    batch = raw.get("batchId")
    batch_id = None
    if batch is not None:
        if isinstance(batch, str) and len(batch) <= 40 and not CONTROL_RE.search(batch) \
                and not MARKUP_RE.search(batch):
            batch_id = batch
        else:
            issues.append("batchId is not a short string")
    # Fail safe: anything but an explicit false is treated as fictional sample data.
    if not isinstance(raw.get("sample"), bool):
        issues.append("sample is not true or false")
    if not isinstance(raw.get("indexable"), bool):
        issues.append("indexable is not true or false")
    counts = raw.get("counts") if _is_record(raw.get("counts")) else {}
    count_values = {k: _non_negative_int(counts.get(k)) for k in ("published", "inArchive", "heldForPrivacy",
                                                                  "needsReview")}
    if any(v is None for v in count_values.values()):
        issues.append("counts are missing or not whole numbers")

    names: Dict[str, str] = {}
    if isinstance(raw.get("categories"), list):
        for c in raw["categories"]:
            if _is_record(c) and isinstance(c.get("slug"), str) and SLUG_RE.fullmatch(c["slug"]) \
                    and isinstance(c.get("name"), str):
                try:
                    names[c["slug"]] = _plain(c["name"], 80, "bad_category_name")
                except ContractError:
                    issues.append("a category has an unusable name")
            else:
                issues.append("a category entry is malformed")
    else:
        issues.append("categories is not a list")
    known = {slug for slug, _ in CATEGORY_ORDER} | set(names)

    businesses: List[dict] = []
    ids, slugs = set(), set()
    rows = raw.get("businesses")
    if not isinstance(rows, list):
        issues.append("businesses is not a list")
        rows = []
    for index, row in enumerate(rows):
        ident = row.get("id") if _is_record(row) and isinstance(row.get("id"), str) \
            and ID_RE.fullmatch(row["id"]) else f"#{index}"
        try:
            business = check_business(row, known)
            if business["id"] in ids:
                _fail("duplicate_id")
            if business["slug"] in slugs:
                _fail("duplicate_slug")
        except ContractError as exc:
            dropped.append((ident, str(exc)))
            continue
        ids.add(business["id"])
        slugs.add(business["slug"])
        businesses.append(business)

    scope = raw.get("scope")
    directory = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": generated_at,
        "batchId": batch_id,
        "sample": raw.get("sample") is not False,
        "indexable": raw.get("indexable") is True,
        "scope": scope.strip() if isinstance(scope, str) and scope.strip() and not MARKUP_RE.search(scope)
        else DEFAULT_SCOPE,
        "counts": {k: v or 0 for k, v in count_values.items()},
        "sources": _sources(raw.get("sources"), issues),
        "categories": recount_categories(businesses, names),
        "businesses": businesses,
    }
    directory["counts"]["published"] = len(businesses)
    return ValidationResult(directory, dropped, issues)
