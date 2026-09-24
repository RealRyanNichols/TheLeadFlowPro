"""TABC licences: optional confirmation that a place is a public premises.

A Texas Alcoholic Beverage Commission licence is issued for a physical
premises, so a linked TABC record is storefront evidence (privacy.py reads
linked records) and a primary source for matching. The source is optional:
when the catalog has no matching dataset, or its columns do not fit, the run is
recorded as ``skipped`` with the reason and nothing is raised. Licensee
(owner) names stay in ``raw_json``.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from typing import Any, Dict, Mapping, Optional, Tuple

from .. import db, normalize
from ..config import LONGVIEW_ZIPS
from . import socrata
from .http import EmptyResult, RecordWriter, as_now, bump, finish_failed, finish_ok
from .socrata import DatasetNotFound, SchemaMismatch

logger = logging.getLogger(__name__)

SOURCE_ID = "tx_tabc"
RUN_KIND = "sync_tx_tabc"
QUERY = "TABC license"
NAME_PATTERN = r"tabc|alcoholic beverage|license"
PAGE_SIZE = 5000

FIELD_CANDIDATES: Dict[str, Tuple[str, ...]] = {
    "trade_name": ("trade_name", "dba_name", "business_name", "tradename", "trade_name_dba"),
    "address": ("address", "premise_address", "location_address", "address1", "street_address"),
    "city": ("city", "premise_city", "location_city"),
    "zip": ("zip", "zip_code", "premise_zip", "postal_code"),
    "license_id": ("license_id", "license_number", "permit_number", "license_no", "licensenumber"),
    "status": ("status", "license_status", "primary_status"),
    "phone": ("phone", "phone_number"),
    "county": ("county",),
}
REQUIRED_FIELDS = ("trade_name", "address", "city", "zip", "license_id")

_ACTIVE = re.compile(r"\b(active|current|issued)\b", re.IGNORECASE)
_NOT_ACTIVE = re.compile(r"\b(inactive|not active|expired|cancel\w*|surrender\w*|suspend\w*|revoked|void)\b",
                         re.IGNORECASE)


def status_is_active(value: Any) -> bool:
    text = str(value or "").strip()
    return bool(text) and not _NOT_ACTIVE.search(text) and bool(_ACTIVE.search(text))


def _get(row: Mapping[str, Any], fields: Mapping[str, Optional[str]], logical: str) -> str:
    column = fields.get(logical)
    value = row.get(column) if column else None
    return "" if value is None else str(value).strip()


def project_row(row: Mapping[str, Any], fields: Mapping[str, Optional[str]], settings) -> Tuple[Optional[str], Optional[Dict[str, Any]], str]:
    license_id = _get(row, fields, "license_id")
    if not license_id:
        return None, None, "skipped_no_key"
    if fields.get("status") and not status_is_active(_get(row, fields, "status")):
        return None, None, "skipped_status"
    name = _get(row, fields, "trade_name")
    if not name:
        return None, None, "skipped_no_name"
    city = _get(row, fields, "city")
    if city.upper() != "LONGVIEW":
        return None, None, "skipped_city"
    address = _get(row, fields, "address")
    street_norm, suite = normalize.parse_street(address)
    zip_code = normalize.zip5(_get(row, fields, "zip"))
    county = _get(row, fields, "county")
    record = {
        "name": normalize.title_case_name(name),
        "name_norm": normalize.norm_name(name),
        "street": normalize.display_street(address) or None,
        "street_norm": street_norm or None,
        "suite": suite or None,
        "city": normalize.title_case_name(city),
        "zip": zip_code,
        "phone": normalize.norm_phone(_get(row, fields, "phone"), allow_fictional=settings.allow_fictional_phones),
        "scope": "city" if zip_code in LONGVIEW_ZIPS else "nearby",
        "tags_json": db.dumps({"county": normalize.title_case_name(county)}) if county else None,
    }
    return license_id, record, ""


def sync_tabc(conn: sqlite3.Connection, settings, now=None, transport=None) -> Dict[str, Any]:
    """Pull active Longview licences. Never raises: skips or records the error and returns counts."""
    now = as_now(now)
    run_id = db.start_run(conn, RUN_KIND, now)
    counts: Dict[str, Any] = {
        "fetched": 0, "kept": 0, "inserted": 0, "updated": 0, "unchanged": 0, "reactivated": 0,
        "deactivated": 0, "businesses_deactivated": 0, "duplicates": 0, "suppressed": 0,
        "city": 0, "nearby": 0, "other_zips": {},
    }
    try:
        info = socrata.discover_dataset(
            settings, QUERY, NAME_PATTERN, [FIELD_CANDIDATES[f] for f in REQUIRED_FIELDS], transport=transport
        )
        counts["dataset_id"] = info.id
        fields = socrata.resolve_fields(info.columns, FIELD_CANDIDATES, REQUIRED_FIELDS)
    except (DatasetNotFound, SchemaMismatch) as exc:
        counts["skipped_reason"] = str(exc)
        finish_failed(conn, run_id, SOURCE_ID, counts, now, exc, status="skipped")
        return counts
    except Exception as exc:  # optional source: record and carry on
        counts["error"] = finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
        return counts
    try:
        where = f"upper({fields['city']}) = 'LONGVIEW'"
        writer = RecordWriter(conn, SOURCE_ID, now, counts)
        for row in socrata.fetch_rows(settings, info.id, where, page_size=PAGE_SIZE, transport=transport):
            counts["fetched"] += 1
            key, record, note = project_row(row, fields, settings)
            if key is None:
                bump(counts, note)
                continue
            if not writer.add(key, record, row, info.license, info.url):
                continue
            counts["kept"] += 1
            counts[record["scope"]] += 1
            if record["zip"] not in LONGVIEW_ZIPS:
                zip_key = record["zip"] or "missing"
                counts["other_zips"][zip_key] = counts["other_zips"].get(zip_key, 0) + 1
        if counts["fetched"] == 0:
            raise EmptyResult()
        writer.deactivate_unseen()
        finish_ok(conn, run_id, SOURCE_ID, counts, now, license=info.license, dataset_id=info.id,
                  dataset_url=info.url, columns_json=db.dumps(list(info.columns)))
    except Exception as exc:
        counts["error"] = finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
    return counts
