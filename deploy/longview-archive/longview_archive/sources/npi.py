"""NPPES NPI Registry: health-care organizations practicing in Longview.

Clinics, dental offices, pharmacies, and home-health agencies are organizations
(NPI-2) with a registered practice LOCATION address, which makes a linked NPI
record storefront evidence and a primary source for matching. The public API
returns at most 1,200 results per query (200 per page, skip up to 1,000), so a
ZIP that reaches the ceiling is re-queried by organization-name prefix and the
results are de-duplicated by NPI. Authorized-official names stay in
``raw_json``; only the organization's own name or its doing-business-as name
is projected.
"""

from __future__ import annotations

import logging
import sqlite3
import string
from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple

from .. import db, normalize
from ..config import LONGVIEW_ZIPS
from .http import ApiError, EmptyResult, RecordWriter, as_now, bump, finish_failed, finish_ok, get_json

logger = logging.getLogger(__name__)

SOURCE_ID = "npi"
RUN_KIND = "sync_npi"
LICENSE = "U.S. government public data (CMS NPPES)"
DATASET_URL = "https://npiregistry.cms.hhs.gov/"
PAGE_SIZE = 200
MAX_SKIP = 1000                       # the API rejects skip beyond 1,000
PREFIX_CHARS = string.ascii_uppercase + string.digits
DBA_CODE = "3"


def _query(settings, transport, counts: Dict[str, Any], zip_code: str, prefix: Optional[str]) -> Tuple[List[dict], bool, bool]:
    """All pages of one query: (results, reached_cap, api_reported_errors)."""
    results: List[dict] = []
    for skip in range(0, MAX_SKIP + 1, PAGE_SIZE):
        params: Dict[str, Any] = {
            "version": "2.1", "enumeration_type": "NPI-2", "city": "LONGVIEW", "state": "TX",
            "postal_code": zip_code, "limit": PAGE_SIZE, "skip": skip,
        }
        if prefix:
            params["organization_name"] = prefix + "*"
        payload = get_json(settings.npi_url, settings, params=params, transport=transport)
        bump(counts, "requests")
        if not isinstance(payload, dict):
            raise ApiError(200, "unexpected_payload", "npi")
        if payload.get("Errors"):
            # The API explains rejected criteria here; the text may echo input, so it is not kept.
            return results, False, True
        page = [r for r in payload.get("results") or [] if isinstance(r, dict)]
        results.extend(page)
        if len(page) < PAGE_SIZE:
            return results, False, False
    return results, len(results) >= PAGE_SIZE + MAX_SKIP, False


def _collect(by_npi: Dict[str, dict], results: Iterable[dict], counts: Dict[str, Any]) -> None:
    for result in results:
        counts["fetched"] += 1
        number = str(result.get("number") or "").strip()
        if not number:
            bump(counts, "skipped_no_number")
            continue
        if number in by_npi:
            bump(counts, "duplicates")
            continue
        by_npi[number] = result


def fetch_zip(settings, transport, counts: Dict[str, Any], zip_code: str, by_npi: Dict[str, dict]) -> bool:
    """Collect every organization for one ZIP into ``by_npi``. False when coverage is incomplete."""
    results, capped, errored = _query(settings, transport, counts, zip_code, None)
    if errored:
        raise ApiError(200, "npi_errors", "npi")
    _collect(by_npi, results, counts)
    if not capped:
        return True
    bump(counts, "capped_queries")
    complete = True
    for first in PREFIX_CHARS:
        results, capped, errored = _query(settings, transport, counts, zip_code, first)
        _collect(by_npi, results, counts)
        if not (capped or errored):
            continue
        bump(counts, "capped_queries" if capped else "prefix_errors")
        for second in PREFIX_CHARS:
            results, capped2, errored2 = _query(settings, transport, counts, zip_code, first + second)
            _collect(by_npi, results, counts)
            if capped2 or errored2:
                bump(counts, "still_capped" if capped2 else "prefix_errors")
                complete = False
    return complete


def _location(result: Mapping[str, Any]) -> Optional[Mapping[str, Any]]:
    for address in result.get("addresses") or []:
        if isinstance(address, dict) and str(address.get("address_purpose") or "").upper() == "LOCATION":
            return address
    return None


def _display_name(result: Mapping[str, Any]) -> str:
    for other in result.get("other_names") or []:
        if not isinstance(other, dict):
            continue
        is_dba = str(other.get("code") or "").strip() == DBA_CODE or "doing business as" in str(other.get("type") or "").lower()
        if is_dba and str(other.get("organization_name") or "").strip():
            return str(other["organization_name"]).strip()
    return str((result.get("basic") or {}).get("organization_name") or "").strip()


def result_record(result: Mapping[str, Any], settings) -> Tuple[Optional[str], Optional[Dict[str, Any]], str]:
    """(npi, record, note) using the LOCATION address only; skipped results have key None."""
    number = str(result.get("number") or "").strip()
    if not number.isdigit():
        return None, None, "skipped_no_number"
    if str(result.get("enumeration_type") or "NPI-2").upper() != "NPI-2":
        return None, None, "skipped_not_organization"
    status = str((result.get("basic") or {}).get("status") or "A").upper()
    if status != "A":
        return None, None, "skipped_inactive"
    loc = _location(result)
    if loc is None:
        return None, None, "skipped_no_location"
    if str(loc.get("city") or "").strip().upper() != "LONGVIEW" or str(loc.get("state") or "").strip().upper() != "TX":
        return None, None, "skipped_location_elsewhere"
    name = _display_name(result)
    if not name:
        return None, None, "skipped_no_name"
    line = " ".join(p for p in (str(loc.get("address_1") or "").strip(), str(loc.get("address_2") or "").strip()) if p)
    street_norm, suite = normalize.parse_street(line)
    zip_code = normalize.zip5(loc.get("postal_code"))
    descs = [str(t.get("desc")).strip() for t in result.get("taxonomies") or [] if isinstance(t, dict) and t.get("desc")]
    primary = next(
        (str(t.get("desc")).strip() for t in result.get("taxonomies") or []
         if isinstance(t, dict) and t.get("primary") and t.get("desc")),
        descs[0] if descs else None,
    )
    record = {
        "name": normalize.title_case_name(name),
        "name_norm": normalize.norm_name(name),
        "street": normalize.display_street(line) or None,
        "street_norm": street_norm or None,
        "suite": suite or None,
        "city": "Longview",
        "zip": zip_code,
        "phone": normalize.norm_phone(loc.get("telephone_number"), allow_fictional=settings.allow_fictional_phones),
        "scope": "city" if zip_code in LONGVIEW_ZIPS else "nearby",
        "tags_json": db.dumps({"taxonomy": primary, "taxonomies": descs}),
    }
    return number, record, ""


def sync_npi(conn: sqlite3.Connection, settings, now=None, transport=None) -> Dict[str, Any]:
    """Pull every Longview NPI-2 organization. Failures are recorded, then raised.

    When a prefix split still hits the ceiling, the records found are stored
    but nothing is deactivated and the run is ``partial``.
    """
    now = as_now(now)
    run_id = db.start_run(conn, RUN_KIND, now)
    counts: Dict[str, Any] = {
        "requests": 0, "fetched": 0, "unique": 0, "kept": 0, "inserted": 0, "updated": 0,
        "unchanged": 0, "reactivated": 0, "deactivated": 0, "businesses_deactivated": 0,
        "duplicates": 0, "suppressed": 0, "capped_queries": 0, "still_capped": 0,
        "city": 0, "nearby": 0,
    }
    try:
        by_npi: Dict[str, dict] = {}
        complete = True
        for zip_code in LONGVIEW_ZIPS:
            complete = fetch_zip(settings, transport, counts, zip_code, by_npi) and complete
        counts["unique"] = len(by_npi)
        writer = RecordWriter(conn, SOURCE_ID, now, counts)
        for number in sorted(by_npi):
            result = by_npi[number]
            key, record, note = result_record(result, settings)
            if key is None:
                bump(counts, note)
                continue
            if not writer.add(key, record, result, LICENSE, f"https://npiregistry.cms.hhs.gov/provider-view/{key}"):
                continue
            counts["kept"] += 1
            counts[record["scope"]] += 1
        if counts["fetched"] == 0:
            raise EmptyResult()
        if complete:
            writer.deactivate_unseen()
            finish_ok(conn, run_id, SOURCE_ID, counts, now, license=LICENSE, dataset_url=DATASET_URL)
        else:
            writer.flush()
            finish_ok(conn, run_id, SOURCE_ID, counts, now, status="partial",
                      note="incomplete: a name-prefix query still reached the 1,200 ceiling",
                      license=LICENSE, dataset_url=DATASET_URL)
        return counts
    except Exception as exc:
        finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
        raise
