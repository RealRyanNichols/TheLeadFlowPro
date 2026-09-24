"""Publish decisions and the publish export (the contract with the website).

``evaluate`` decides, for every business, whether it may be published and why
not. ``build_export`` turns the ready ones into the JSON the directory renders
(SPEC "The publish contract", lib/longviewDirectory/types.ts): only public
fields, each with the source it came from and the local date it was checked.
The export reads only the normalized columns of source records, never
``raw_json``, so a taxpayer's name cannot reach it. The site re-checks every
rule and drops a record that breaks one, so every rule is applied here first.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sqlite3
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlsplit

from . import config, db, normalize, privacy
from .categories import CATEGORIES, CATEGORY_NAMES

log = logging.getLogger(__name__)

SCHEMA_VERSION = 1
STATES = ("ready", "review", "held", "suppressed", "pending")
PRIMARY_SOURCES = ("tx_sales_tax", "tx_tabc", "npi")
SOCRATA_SOURCES = ("tx_sales_tax", "tx_tabc")
FACT_FIELDS = (
    "name", "address", "category", "permitSince", "website", "phone", "email", "hours",
    "facebook", "instagram", "careers", "services",
)
HIRING_ROLES = ("front_desk", "office_manager", "medical_assistant", "dental_assistant", "receptionist")
DAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
SHOWN_WEBSITE_STATUSES = ("ok", "moved")

_E164 = re.compile(r"\+1[2-9]\d{2}[2-9]\d{6}")
_OPEN = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d")
_CLOSE = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d|24:00")
_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_UNSAFE_TEXT = re.compile("[\u0000-\u001f\u007f-\u009f​-‏ -‮⁠-⁩﻿]|<[a-zA-Z!/?]")


# ---------------------------------------------------------------- time

def as_datetime(value: Any) -> Optional[datetime]:
    """An aware UTC datetime from a datetime, an ISO string, or None."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    text = str(value).strip()
    try:
        return db.parse_iso(text)
    except ValueError:
        pass
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def resolve_now(value: Any = None) -> datetime:
    """``now`` as an aware UTC datetime; the real clock only when it is None."""
    return as_datetime(value) or datetime.now(timezone.utc)


_CHICAGO = None


def _chicago_tz():
    global _CHICAGO
    if _CHICAGO is None:
        try:
            from zoneinfo import ZoneInfo

            _CHICAGO = ZoneInfo(config.TIMEZONE)
        except Exception:  # no tz database on this machine: use the US rule below
            _CHICAGO = False
    return _CHICAGO or None


def to_local(value: Any) -> Optional[datetime]:
    """The moment in America/Chicago, for display and checked-at dates."""
    dt = as_datetime(value)
    if dt is None:
        return None
    tz = _chicago_tz()
    if tz is not None:
        return dt.astimezone(tz)
    # US daylight time since 2007: second Sunday of March 2:00 CST to first
    # Sunday of November 2:00 CDT.
    march = datetime(dt.year, 3, 1, 8, tzinfo=timezone.utc)
    start = march + timedelta(days=(6 - march.weekday()) % 7 + 7)
    november = datetime(dt.year, 11, 1, 7, tzinfo=timezone.utc)
    end = november + timedelta(days=(6 - november.weekday()) % 7)
    if start <= dt < end:
        return dt.astimezone(timezone(timedelta(hours=-5), "CDT"))
    return dt.astimezone(timezone(timedelta(hours=-6), "CST"))


def local_date(value: Any) -> Optional[str]:
    """YYYY-MM-DD in America/Chicago, or None when the time is missing or unreadable."""
    dt = to_local(value)
    return dt.strftime("%Y-%m-%d") if dt else None


def _valid_date(value: Any) -> Optional[str]:
    text = str(value or "").strip()[:10]
    if not _DATE.fullmatch(text):
        return None
    try:
        datetime.strptime(text, "%Y-%m-%d")
    except ValueError:
        return None
    return text


# ---------------------------------------------------------------- small checks

def http_url(value: Any) -> Optional[str]:
    """The URL unchanged when it is an absolute http(s) URL with a dotted host, else None."""
    if not isinstance(value, str) or not value or re.search(r"\s", value):
        return None
    try:
        parts = urlsplit(value)
        host = parts.hostname or ""
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or "." not in host or parts.username or parts.password:
        return None
    return value


def _on_host(url: Optional[str], host: str) -> Optional[str]:
    url = http_url(url)
    if not url:
        return None
    h = (urlsplit(url).hostname or "").lower()
    return url if h == host or h.endswith("." + host) else None


def _plain(text: Any, limit: int) -> Optional[str]:
    if not isinstance(text, str):
        return None
    text = text.strip()
    if not text or len(text) > limit or _UNSAFE_TEXT.search(text):
        return None
    return text


def _hours(value: Any) -> Optional[dict]:
    """Hours in contract form, days in week order; None when anything is off."""
    if not isinstance(value, dict):
        return None
    out = {}
    for day in DAY_KEYS:
        if day not in value:
            continue
        ranges = value[day]
        if not isinstance(ranges, list) or len(ranges) > 6:
            return None
        pairs = []
        for pair in ranges:
            if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                return None
            opens, closes = pair
            if not (isinstance(opens, str) and isinstance(closes, str)):
                return None
            if not _OPEN.fullmatch(opens) or not _CLOSE.fullmatch(closes) or opens == closes:
                return None
            pairs.append([opens, closes])
        out[day] = pairs
    if set(value) - set(DAY_KEYS):
        return None
    return out or None


def _services(value: Any) -> List[str]:
    if not isinstance(value, list):
        return []
    tags = sorted({t for t in (_plain(v, 60) for v in value) if t})
    return tags[:40]


def filter_roles(roles_json: Optional[str]) -> List[str]:
    """Hiring roles from ``roles_json``, limited to the contract's list, in its order."""
    try:
        roles = json.loads(roles_json or "[]")
    except ValueError:
        return []
    if not isinstance(roles, list):
        return []
    return [role for role in HIRING_ROLES if role in roles]


def _digits(value: Any) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


# ---------------------------------------------------------------- evaluate

def _linked_records(conn: sqlite3.Connection, business_id: int) -> list:
    # Never select raw_json: the taxpayer's name lives there.
    return list(conn.execute(
        "SELECT id, source_id, source_url, last_seen_at, active, name, name_norm, street_norm, naics,"
        " permit_start, personal_name FROM source_records WHERE business_id=? ORDER BY id",
        (business_id,),
    ).fetchall())


def _person_name_decision(conn, business, now: str) -> Optional[Tuple[str, str]]:
    """A name that may be a person's waits for a person; their answer sticks per name."""
    name_hash = db.value_hash(business["name"])
    item = conn.execute(
        "SELECT status FROM review_queue WHERE business_id=? AND kind='person_name_check'"
        " AND (proposed_hash=? OR proposed_hash='') ORDER BY id DESC LIMIT 1",
        (business["id"], name_hash),
    ).fetchone()
    if item is None:
        db.add_review(
            conn,
            kind="person_name_check",
            business_id=business["id"],
            proposed=business["name"],
            detail="The listed name may be a person's name. Accept to publish it as a business"
                   " name; reject to keep it held.",
            now=now,
        )
        return "review", "person_name_check"
    if item["status"] == "open":
        return "review", "person_name_check"
    if item["status"] == "rejected":
        return "held", "person_name_rejected"
    return None


def _decide(conn: sqlite3.Connection, settings, business, now: str) -> Tuple[str, Optional[str]]:
    bid = business["id"]
    if privacy.is_suppressed(conn, business):
        return "suppressed", "suppressed"
    if not business["active"]:
        return "held", "inactive"
    if business["scope"] not in settings.publish_scopes:
        return "held", "out_of_scope"
    records = _linked_records(conn, bid)
    if any(r["personal_name"] for r in records) and not privacy.has_public_presence(conn, bid):
        return "held", "personal_name_no_presence"
    if not any(r["source_id"] in PRIMARY_SOURCES and r["active"] for r in records):
        return "review", "osm_only_needs_primary_source"
    if privacy.looks_like_person_name(business["name"]):
        decision = _person_name_decision(conn, business, now)
        if decision:
            return decision
    if conn.execute(
        "SELECT 1 FROM review_queue WHERE business_id=? AND kind='merge_ambiguous' AND status='open' LIMIT 1",
        (bid,),
    ).fetchone():
        return "review", "open_merge_review"
    if not business["public_id"] or not business["slug"]:
        return "pending", "no_identity"
    return "ready", None


def evaluate(conn: sqlite3.Connection, settings, now: Any = None) -> Dict[str, int]:
    """Set publish_state and publish_reason for every business.

    Order: suppressed; held (inactive, out_of_scope, personal_name_no_presence);
    review (osm_only_needs_primary_source, person_name_check, open_merge_review);
    otherwise ready. A reason starting with ``manual:`` was set by a person and
    is never changed. Returns counts per state plus ``changed``.
    """
    counts = {state: 0 for state in STATES}
    counts["changed"] = 0
    now_s = db.now_iso(resolve_now(now))
    with db.transaction(conn):
        for business in conn.execute("SELECT * FROM businesses ORDER BY id").fetchall():
            if (business["publish_reason"] or "").startswith("manual:"):
                counts[business["publish_state"]] = counts.get(business["publish_state"], 0) + 1
                continue
            state, reason = _decide(conn, settings, business, now_s)
            if (state, reason) != (business["publish_state"], business["publish_reason"]):
                conn.execute(
                    "UPDATE businesses SET publish_state=?, publish_reason=? WHERE id=?",
                    (state, reason, business["id"]),
                )
                counts["changed"] += 1
            counts[state] += 1
    log.info("publish.evaluate: %s", counts)
    return counts


# ---------------------------------------------------------------- one profile

def load_sources(conn: sqlite3.Connection) -> Dict[str, sqlite3.Row]:
    return {row["id"]: row for row in conn.execute("SELECT * FROM sources").fetchall()}


def _record_url(record, sources: Dict[str, sqlite3.Row]) -> Optional[str]:
    if record["source_id"] in SOCRATA_SOURCES:
        src = sources.get(record["source_id"])
        return http_url(src["dataset_url"]) if src is not None else None
    return http_url(record["source_url"])


def _record_fact(field: str, record, sources) -> Optional[dict]:
    checked = local_date(record["last_seen_at"])
    if not checked:
        return None
    return {"field": field, "source": record["source_id"], "url": _record_url(record, sources), "checkedAt": checked}


def _site_fact(field: str, fact) -> Optional[dict]:
    checked = local_date(fact["checked_at"])
    if not checked:
        return None
    return {"field": field, "source": "website", "url": http_url(fact["source_url"]), "checkedAt": checked}


def _load_facts(conn: sqlite3.Connection, business_id: int) -> Dict[str, dict]:
    out = {}
    for row in conn.execute(
        "SELECT field, value_json, source_id, source_url, checked_at FROM facts WHERE business_id=?",
        (business_id,),
    ).fetchall():
        try:
            value = json.loads(row["value_json"])
        except ValueError:
            continue
        out[row["field"]] = {"value": value, "source_id": row["source_id"],
                             "source_url": row["source_url"], "checked_at": row["checked_at"]}
    return out


def _first(records: Iterable, test) -> Optional[Any]:
    for record in records:
        if test(record):
            return record
    return None


def _address_record(business, active: list, primaries: list):
    """The record a shown street is credited to: a TABC or NPI premises record
    at this street, else the primary record that carries the street."""
    street = business["street_norm"]
    for source in ("tx_tabc", "npi"):
        hit = _first(active, lambda r, s=source: r["source_id"] == s and r["street_norm"] == street)
        if hit is not None:
            return hit
    return _first(primaries, lambda r: r["street_norm"] == street) or (primaries[0] if primaries else None)


def _non_site_evidence(business, active: list) -> bool:
    """privacy.address_is_public without the website's own listing (used when
    the website is not shown, so a website-sourced fact cannot be cited)."""
    if any(r["source_id"] in ("tx_tabc", "npi", "osm") and r["street_norm"] == business["street_norm"]
           for r in active):
        return True
    code = _digits(business["naics"])
    return bool(not business["is_individual"] and code
                and any(code.startswith(p) for p in privacy.STOREFRONT_NAICS_PREFIXES))


def business_profile(conn: sqlite3.Connection, settings, business, sources=None) -> Optional[dict]:
    """One business in contract form, or None when it cannot be shown honestly.

    Contact, hours, social, careers, and services come only from facts found on
    the business's own website, and only while that website is shown. The
    private CSV exports call this too, so both apply identical rules.
    """
    sources = load_sources(conn) if sources is None else sources
    bid = business["id"]
    records = _linked_records(conn, bid)
    active = [r for r in records if r["active"]]
    primaries = sorted((r for r in active if r["source_id"] in PRIMARY_SOURCES),
                       key=lambda r: (PRIMARY_SOURCES.index(r["source_id"]), r["id"]))
    name = _plain(business["name"], 160)
    if not primaries or not name or not business["public_id"] or not business["slug"]:
        return None
    facts = _load_facts(conn, bid)
    entries: Dict[str, dict] = {}

    name_norm = normalize.norm_name(business["name"])
    name_rec = _first(primaries, lambda r: normalize.norm_name(r["name"]) == name_norm) or primaries[0]
    entries["name"] = _record_fact("name", name_rec, sources)
    naics = _digits(business["naics"])
    cat_rec = (_first(primaries, lambda r: naics and _digits(r["naics"]) == naics) or primaries[0])
    entries["category"] = _record_fact("category", cat_rec, sources)
    if entries["name"] is None or entries["category"] is None:
        log.warning("publish: %s has no readable record date; not exported", business["public_id"])
        return None
    category = business["category"] if business["category"] in CATEGORY_NAMES else "other"

    # The website, and with it everything read from the website.
    site = facts.get("website")
    website = None
    if (site and site["source_id"] == "website" and business["website_status"] in SHOWN_WEBSITE_STATUSES
            and http_url(site["value"])):
        entry = _site_fact("website", site)
        if entry:
            website = {"url": site["value"], "status": business["website_status"]}
            if not entry["url"]:
                entry["url"] = site["value"]
            entries["website"] = entry

    def site_value(field: str):
        fact = facts.get(field)
        if website is None or not fact or fact["source_id"] != "website":
            return None, None
        return fact["value"], fact

    # Address: street and ZIP only with positive storefront evidence.
    street = zip_code = None
    shown_street = _plain(business["street"], 120)
    shown_zip = normalize.zip5(business["zip"])
    public, evidence = privacy.address_is_public(conn, bid)
    if public and shown_street and shown_zip:
        entry = None
        listed, listed_fact = site_value("address_listed")
        if evidence == "listed_on_own_website" and listed is True:
            entry = _site_fact("address", listed_fact)
        elif evidence != "listed_on_own_website" or _non_site_evidence(business, active):
            rec = _address_record(business, active, primaries)
            entry = _record_fact("address", rec, sources) if rec is not None else None
        if entry:
            street, zip_code = shown_street, shown_zip
            entries["address"] = entry

    permit_since = None
    sales = [r for r in primaries if r["source_id"] == "tx_sales_tax" and _valid_date(r["permit_start"])]
    if sales:
        wanted = _valid_date(business["permit_start"])
        rec = _first(sales, lambda r: _valid_date(r["permit_start"]) == wanted) if wanted else None
        if rec is None:
            rec = min(sales, key=lambda r: (_valid_date(r["permit_start"]), r["id"]))
        entry = _record_fact("permitSince", rec, sources)
        if entry:
            permit_since = _valid_date(rec["permit_start"])
            entries["permitSince"] = entry

    phone = None
    value, fact = site_value("phone")
    if isinstance(value, str) and _E164.fullmatch(value):
        entry = _site_fact("phone", fact)
        if entry:
            phone = {"e164": value, "display": normalize.display_phone(value)}
            entries["phone"] = entry

    email = None
    value, fact = site_value("email")
    if isinstance(value, str) and privacy.generic_email_ok(value, normalize.registrable_domain(website["url"])):
        entry = _site_fact("email", fact)
        if entry:
            email = value.strip().lower()
            entries["email"] = entry

    hours = None
    value, fact = site_value("hours")
    if _hours(value):
        entry = _site_fact("hours", fact)
        if entry:
            hours = _hours(value)
            entries["hours"] = entry

    social = {"facebook": None, "instagram": None}
    for network, host in (("facebook", "facebook.com"), ("instagram", "instagram.com")):
        value, fact = site_value(network)
        if _on_host(value, host):
            entry = _site_fact(network, fact)
            if entry:
                social[network] = value
                entries[network] = entry

    careers_url = None
    value, fact = site_value("careers")
    if http_url(value):
        entry = _site_fact("careers", fact)
        if entry:
            careers_url = value
            entries["careers"] = entry

    services: List[str] = []
    value, fact = site_value("services")
    if _services(value):
        entry = _site_fact("services", fact)
        if entry:
            services = _services(value)
            entries["services"] = entry

    hiring_roles: List[str] = []
    if careers_url:
        row = conn.execute(
            "SELECT roles_json FROM hiring_signals WHERE business_id=? AND active=1", (bid,)
        ).fetchone()
        if row is not None:
            hiring_roles = filter_roles(row["roles_json"])

    fact_list = [entries[f] for f in FACT_FIELDS if entries.get(f)]
    return {
        "id": business["public_id"],
        "slug": business["slug"],
        "name": name,
        "category": category,
        "categoryLabel": _plain(business["category_label"], 120),
        "address": {"street": street, "city": "Longview", "state": "TX", "zip": zip_code},
        "permitSince": permit_since,
        "website": website,
        "phone": phone,
        "email": email,
        "hours": hours,
        "social": social,
        "careersUrl": careers_url,
        "hiringRoles": hiring_roles,
        "services": services,
        "facts": fact_list,
        "updatedAt": max(f["checkedAt"] for f in fact_list),
        "indexable": bool(settings.indexable) and any(f["source"] == "website" for f in fact_list),
    }


# ---------------------------------------------------------------- the export

def _count(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> int:
    return int(conn.execute(sql, params).fetchone()[0])


def build_export(conn: sqlite3.Connection, settings, now: Any = None) -> dict:
    """The publish export: ready businesses only, in the contract's key order.

    Deterministic: the same database and ``now`` give the same bytes.
    """
    generated = db.now_iso(resolve_now(now))
    sources = load_sources(conn)
    businesses = []
    for row in conn.execute(
        "SELECT * FROM businesses WHERE publish_state='ready' ORDER BY slug, id"
    ).fetchall():
        if privacy.is_suppressed(conn, row):  # a removal request since the last evaluate
            continue
        profile = business_profile(conn, settings, row, sources)
        if profile is not None:
            businesses.append(profile)
    businesses.sort(key=lambda b: (b["slug"], b["id"]))

    used = {f["source"] for b in businesses for f in b["facts"]}
    source_list = []
    for source_id in PRIMARY_SOURCES:  # datasets only; the website is not a dataset
        src = sources.get(source_id)
        if source_id not in used or src is None:
            continue
        source_list.append({
            "id": source_id,
            "name": src["name"],
            "publisher": src["publisher"],
            "license": src["license"],
            "url": http_url(src["dataset_url"]) or http_url(src["terms_url"]),
            "lastSyncedAt": local_date(src["last_synced_at"]),
        })

    per_category: Dict[str, int] = {}
    for b in businesses:
        per_category[b["category"]] = per_category.get(b["category"], 0) + 1
    category_list = [
        {"slug": slug, "name": name, "count": per_category[slug]}
        for slug, name in CATEGORIES if per_category.get(slug)
    ]

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": generated,
        "batchId": generated[:16] + "Z",
        "sample": False,
        "indexable": bool(settings.indexable),
        "scope": config.SCOPE_LABEL,
        "counts": {
            "published": len(businesses),
            "inArchive": _count(conn, "SELECT COUNT(*) FROM businesses WHERE active=1 AND scope='city'"),
            "heldForPrivacy": _count(
                conn, "SELECT COUNT(*) FROM businesses WHERE publish_state='held'"
                      " AND publish_reason='personal_name_no_presence'"),
            "needsReview": _count(conn, "SELECT COUNT(*) FROM businesses WHERE publish_state='review'"),
        },
        "sources": source_list,
        "categories": category_list,
        "businesses": businesses,
    }


def atomic_write(path: Path | str, data: bytes, mode: int) -> None:
    """Write ``data`` to ``path`` so readers see the old file or the new one, never half."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


def write_export(path: Path | str, data: dict) -> None:
    text = json.dumps(data, indent=2, sort_keys=False, ensure_ascii=False) + "\n"
    atomic_write(path, text.encode("utf-8"), 0o644)


def _comparable(business: dict) -> dict:
    out = {k: v for k, v in business.items() if k != "updatedAt"}
    out["facts"] = [{k: v for k, v in f.items() if k != "checkedAt"} for f in business.get("facts") or []]
    return out


def diff_exports(old: Optional[dict], new: Optional[dict]) -> Dict[str, List[str]]:
    """Businesses added, removed, and changed between two exports (by id).

    A re-check that only moves ``checkedAt``/``updatedAt`` is not a change.
    """
    before = {b["id"]: _comparable(b) for b in (old or {}).get("businesses") or []}
    after = {b["id"]: _comparable(b) for b in (new or {}).get("businesses") or []}
    return {
        "added": sorted(set(after) - set(before)),
        "removed": sorted(set(before) - set(after)),
        "changed": sorted(i for i in set(before) & set(after) if before[i] != after[i]),
    }


def run_publish(conn: sqlite3.Connection, settings, now: Any = None,
                out_path: Path | str | None = None) -> Dict[str, int]:
    """Evaluate, build, and write the export; record a ``publish`` run and
    ``meta.last_export_at``. Writes a local file only; nothing is sent."""
    now_dt = resolve_now(now)
    run_id = db.start_run(conn, "publish", db.now_iso(now_dt))
    path = Path(out_path) if out_path else settings.publish_export_path
    try:
        states = evaluate(conn, settings, now_dt)
        data = build_export(conn, settings, now_dt)
        old = None
        if path.exists():
            try:
                old = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                old = None
        write_export(path, data)
        diff = diff_exports(old, data)
        counts = dict(states)
        counts.update({"published": data["counts"]["published"], "added": len(diff["added"]),
                       "removed": len(diff["removed"]), "updated": len(diff["changed"])})
        db.set_meta(conn, "last_export_at", data["generatedAt"])
        db.finish_run(conn, run_id, "ok", counts, now=db.now_iso(now_dt))
    except Exception as exc:
        db.finish_run(conn, run_id, "error", error=type(exc).__name__, now=db.now_iso(now_dt))
        raise
    log.info("publish: %s", counts)
    return counts
