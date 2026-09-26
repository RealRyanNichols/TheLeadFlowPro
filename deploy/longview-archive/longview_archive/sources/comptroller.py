"""Texas Comptroller "Active Sales Tax Permit Holders": the primary business list.

Every storefront, restaurant, and shop that collects sales tax in Longview has
an outlet row here, which makes it the backbone of the archive. The rows also
name the taxpayer, and for a sole proprietor that is a person, so the taxpayer
name is read only to set two flags (``is_individual``, ``personal_name``) and
otherwise stays inside ``raw_json``. Scope follows the Comptroller's own
inside/outside-city-limits indicator first, then the ZIP.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from datetime import datetime
from typing import Any, Dict, Mapping, Optional, Tuple

from .. import db, normalize, privacy
from ..config import LONGVIEW_ZIPS
from . import socrata
from .http import EmptyResult, RecordWriter, as_now, bump, finish_failed, finish_ok
from .socrata import DatasetNotFound, SchemaMismatch  # noqa: F401  (re-exported for callers)

logger = logging.getLogger(__name__)

SOURCE_ID = "tx_sales_tax"
RUN_KIND = "sync_tx_sales_tax"
QUERY = "active sales tax permit holders"
NAME_PATTERN = r"active sales tax permit"
PAGE_SIZE = 5000

# logical field -> candidate column names, first present wins (SPEC "sources/").
FIELD_CANDIDATES: Dict[str, Tuple[str, ...]] = {
    "outlet_name": ("outlet_name",),
    "outlet_address": ("outlet_address",),
    "outlet_city": ("outlet_city",),
    "outlet_zip": ("outlet_zip_code", "outlet_zip"),
    "outlet_naics": ("outlet_naics_code", "naics_code"),
    "permit_start": ("outlet_permit_issue_date", "outlet_first_sales_date", "permit_issue_date"),
    "taxpayer_number": ("taxpayer_number",),
    "outlet_number": ("outlet_number",),
    "taxpayer_name": ("taxpayer_name",),
    "taxpayer_org_type": ("taxpayer_organizational_type", "taxpayer_organization_type"),
    "inside_city_limits": (
        "outlet_inside_outside_city_limits_indicator",
        "outlet_inside_outside_city_limits",
    ),
}
REQUIRED_FIELDS = ("outlet_name", "outlet_address", "outlet_city", "outlet_zip", "taxpayer_number", "outlet_number")

INSIDE_VALUES = frozenset({"I", "IN", "INSIDE", "Y", "YES", "TRUE"})
OUTSIDE_VALUES = frozenset({"O", "OUT", "OUTSIDE", "N", "NO", "FALSE"})


def city_limits(value: Any) -> str:
    """'inside', 'outside', or 'unknown' from the Comptroller's indicator."""
    text = str(value or "").strip().upper()
    if text in INSIDE_VALUES:
        return "inside"
    if text in OUTSIDE_VALUES:
        return "outside"
    return "unknown"


def decide_scope(limits: str, zip_code: Optional[str]) -> str:
    """The indicator decides first; a Longview ZIP is still required for 'city'."""
    if limits == "outside":
        return "nearby"
    return "city" if zip_code in LONGVIEW_ZIPS else "nearby"


def parse_date(value: Any) -> Optional[str]:
    """YYYY-MM-DD from Socrata floating timestamps, ISO dates, MM/DD/YYYY, or YYYYMMDD."""
    text = str(value or "").strip()
    if not text:
        return None
    for pattern, fmt in (
        (r"(\d{4}-\d{2}-\d{2})(?:[T ].*)?", "%Y-%m-%d"),
        (r"(\d{1,2}/\d{1,2}/\d{4})", "%m/%d/%Y"),
        (r"(\d{8})", "%Y%m%d"),
    ):
        m = re.fullmatch(pattern, text)
        if m:
            try:
                return datetime.strptime(m.group(1), fmt).strftime("%Y-%m-%d")
            except ValueError:
                return None
    return None


def _get(row: Mapping[str, Any], fields: Mapping[str, Optional[str]], logical: str) -> str:
    column = fields.get(logical)
    value = row.get(column) if column else None
    return "" if value is None else str(value).strip()


def project_row(row: Mapping[str, Any], fields: Mapping[str, Optional[str]]) -> Tuple[Optional[str], Optional[Dict[str, Any]], str]:
    """(source_key, record, note). A skipped row has key None and the skip reason as note."""
    taxpayer_number = _get(row, fields, "taxpayer_number")
    outlet_number = _get(row, fields, "outlet_number")
    if not taxpayer_number or not outlet_number:
        return None, None, "skipped_no_key"
    outlet_name = _get(row, fields, "outlet_name")
    if not outlet_name:
        return None, None, "skipped_no_name"
    city = _get(row, fields, "outlet_city")
    if city.upper() != "LONGVIEW":
        return None, None, "skipped_city"
    address = _get(row, fields, "outlet_address")
    street_norm, suite = normalize.parse_street(address)
    zip_code = normalize.zip5(_get(row, fields, "outlet_zip"))
    naics = re.sub(r"\D", "", _get(row, fields, "outlet_naics")) or None
    # The taxpayer name is private: it only decides the two flags below.
    taxpayer_name = _get(row, fields, "taxpayer_name")
    is_individual = privacy.is_individual_taxpayer(taxpayer_name or None, _get(row, fields, "taxpayer_org_type") or None)
    personal = privacy.outlet_is_personal_name(outlet_name, taxpayer_name or None, is_individual)
    limits = city_limits(_get(row, fields, "inside_city_limits"))
    record = {
        "name": normalize.title_case_name(outlet_name),
        "name_norm": normalize.norm_name(outlet_name),
        "street": normalize.display_street(address) or None,
        "street_norm": street_norm or None,
        "suite": suite or None,
        "city": normalize.title_case_name(city),
        "zip": zip_code,
        "naics": naics,
        "permit_start": parse_date(_get(row, fields, "permit_start")),
        "is_individual": is_individual,
        "personal_name": personal,
        "scope": decide_scope(limits, zip_code),
        "tags_json": db.dumps({"city_limits": limits}),
    }
    return f"{taxpayer_number}:{outlet_number}", record, limits


def _new_counts() -> Dict[str, Any]:
    return {
        "fetched": 0, "kept": 0, "inserted": 0, "updated": 0, "unchanged": 0, "reactivated": 0,
        "deactivated": 0, "businesses_deactivated": 0, "duplicates": 0, "suppressed": 0,
        "city": 0, "nearby": 0, "inside_other_zip": 0, "individual": 0, "personal_name": 0,
        "other_zips": {},
    }


def sync_sales_tax(conn: sqlite3.Connection, settings, now=None, transport=None) -> Dict[str, Any]:
    """Pull Longview outlets, upsert them, retire vanished ones. Returns counts.

    Failures (no dataset, a schema mismatch, an API error, an empty pull) are
    recorded on the run and the ``sources`` row, then raised to the caller.
    """
    now = as_now(now)
    run_id = db.start_run(conn, RUN_KIND, now)
    counts = _new_counts()
    try:
        info = socrata.discover_dataset(
            settings, QUERY, NAME_PATTERN, [FIELD_CANDIDATES[f] for f in REQUIRED_FIELDS], transport=transport
        )
        counts["dataset_id"] = info.id
        fields = socrata.resolve_fields(info.columns, FIELD_CANDIDATES, REQUIRED_FIELDS)
        where = f"upper({fields['outlet_city']}) = 'LONGVIEW'"
        writer = RecordWriter(conn, SOURCE_ID, now, counts)
        for row in socrata.fetch_rows(settings, info.id, where, page_size=PAGE_SIZE, transport=transport):
            counts["fetched"] += 1
            key, record, note = project_row(row, fields)
            if key is None:
                bump(counts, note)
                continue
            if not writer.add(key, record, row, info.license, info.url):
                continue
            counts["kept"] += 1
            counts[record["scope"]] += 1
            if record["zip"] not in LONGVIEW_ZIPS:
                other = counts["other_zips"]
                zip_key = record["zip"] or "missing"
                other[zip_key] = other.get(zip_key, 0) + 1
                if note == "inside":
                    counts["inside_other_zip"] += 1
            counts["individual"] += 1 if record["is_individual"] else 0
            counts["personal_name"] += 1 if record["personal_name"] else 0
        if counts["fetched"] == 0:
            raise EmptyResult()
        writer.deactivate_unseen()
        # Dataset metadata is written only on success: the export cites it as
        # the source of the facts already in the archive.
        finish_ok(conn, run_id, SOURCE_ID, counts, now, license=info.license, dataset_id=info.id,
                  dataset_url=info.url, columns_json=db.dumps(list(info.columns)))
        return counts
    except Exception as exc:
        finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
        raise
