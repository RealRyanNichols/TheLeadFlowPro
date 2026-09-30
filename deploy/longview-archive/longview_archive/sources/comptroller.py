"""Texas Comptroller "Active Sales Tax Permit Holders": the primary business list.

Every storefront, restaurant, and shop that collects sales tax in Longview has
an outlet row here, which makes it the backbone of the archive. The rows also
name the taxpayer, and for a sole proprietor that is a person, so the taxpayer
name is read only to set flags (``is_individual``, ``personal_name``, and the
``owner_named`` tag) and otherwise stays inside ``raw_json``. Scope follows the
Comptroller's own inside/outside-city-limits indicator first, then the ZIP.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from datetime import datetime
from typing import Any, Dict, Mapping, Optional, Tuple

from .. import db, normalize, places, privacy
from ..places import LONGVIEW, Place, PlaceIndex
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
    "outlet_state": ("outlet_state",),
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


def decide_scope(limits: str, zip_code: Optional[str], place: Place = LONGVIEW) -> str:
    """The indicator decides first; a street ZIP of the town is still required for 'city'.

    Outside the limits (or inside with a PO-box ZIP) is 'nearby' only with a
    postal ZIP of the town; a missing or other ZIP is 'out', never published:
    nothing shows it is that town's Texas address (``places.Place.scope``)."""
    return place.scope(zip_code, outside_city_limits=(limits == "outside"))


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


def project_row(row: Mapping[str, Any], fields: Mapping[str, Optional[str]],
                index: Optional[PlaceIndex] = None) -> Tuple[Optional[str], Optional[Dict[str, Any]], str]:
    """(source_key, record, note). A skipped row has key None and the skip reason as note.

    ``index`` holds the active places (Longview alone when None); the outlet's
    postal city decides which one the record belongs to."""
    taxpayer_number = _get(row, fields, "taxpayer_number")
    outlet_number = _get(row, fields, "outlet_number")
    if not taxpayer_number or not outlet_number:
        return None, None, "skipped_no_key"
    outlet_name = _get(row, fields, "outlet_name")
    if not outlet_name:
        return None, None, "skipped_no_name"
    city = _get(row, fields, "outlet_city")
    place = (index or PlaceIndex()).for_city(city)
    if place is None:
        return None, None, "skipped_city"
    # Longview, Washington is a real city: a row that names another state is never "Longview, TX".
    state = _get(row, fields, "outlet_state")
    if fields.get("outlet_state") and state and state.upper() != "TX":
        return None, None, "skipped_state"
    address = _get(row, fields, "outlet_address")
    street_norm, suite = normalize.parse_street(address)
    zip_code = normalize.zip5(_get(row, fields, "outlet_zip"))
    naics = re.sub(r"\D", "", _get(row, fields, "outlet_naics")) or None
    # The taxpayer name is private: it only decides the flags below.
    taxpayer_name = _get(row, fields, "taxpayer_name")
    org_type = _get(row, fields, "taxpayer_org_type") or None
    # Unless the taxpayer is clearly an entity, it may be a person (a surname
    # such as Barber, Glass or Temple reads like a trade word), so its street is
    # never shown on the NAICS code alone: it needs a premises record or the
    # business's own website.
    is_individual = (privacy.is_individual_taxpayer(taxpayer_name or None, org_type, outlet_name)
                     or not privacy.is_clearly_entity(taxpayer_name or None, org_type))
    personal =privacy.outlet_is_personal_name(outlet_name, taxpayer_name or None, is_individual)
    # "Owner Name DBA Trade Name" shows only the trade name, for every taxpayer.
    shown = normalize.trade_name(outlet_name)
    limits = city_limits(_get(row, fields, "inside_city_limits"))
    tags: Dict[str, Any] = {"city_limits": limits}
    # Structural rule: unless the taxpayer is clearly an entity, a shown name
    # that shares any word with the taxpayer's own name is named for the owner,
    # however the name is spelled. Held without a public presence, then a
    # person checks it; the street is not shown on the NAICS code alone.
    owner_named = privacy.owner_named_outlet(outlet_name, taxpayer_name or None, org_type)
    if owner_named:
        is_individual = personal = True
    if owner_named or (personal and privacy.carries_owner_name(shown, taxpayer_name or None)):
        # The shown name itself carries the owner's name ('Dalix Quillfeather
        # Lawn'), not only the legal part before a DBA: a person checks it
        # even once the listing has a public presence.
        tags["owner_named"] = True
    record = {
        "name": normalize.title_case_name(shown),
        "name_norm": normalize.norm_name(outlet_name),
        "street": normalize.display_street(address) or None,
        "street_norm": street_norm or None,
        "suite": suite or None,
        "city": place.name,
        "zip": zip_code,
        "naics": naics,
        "permit_start": parse_date(_get(row, fields, "permit_start")),
        "is_individual": is_individual,
        "personal_name": personal,
        "scope": decide_scope(limits, zip_code, place),
        "place": place.slug,
        "tags_json": db.dumps(tags),
    }
    return f"{taxpayer_number}:{outlet_number}", record, limits


def count_place(counts: Dict[str, Any], slug: str, scope: str) -> None:
    """Per-place counts, kept only once a town besides Longview is active (the probe prints them)."""
    per = counts.get("places")
    if per is None:
        return
    one = per.setdefault(slug, {"kept": 0, "city": 0, "nearby": 0, "out": 0})
    one["kept"] += 1
    one[scope] = one.get(scope, 0) + 1


def bump_zip(counts: Dict[str, Any], slug: str, zip_key: str) -> None:
    """``other_zips`` as before (every place's together), and per place once several are active."""
    other = counts["other_zips"]
    other[zip_key] = other.get(zip_key, 0) + 1
    per = counts.get("other_zips_by_place")
    if per is not None:
        place_zips = per.setdefault(slug, {})
        place_zips[zip_key] = place_zips.get(zip_key, 0) + 1


def place_counts(counts: Dict[str, Any], index: PlaceIndex) -> Dict[str, Any]:
    """Start the per-place counts when a town besides Longview is active (Longview alone keeps its old shape)."""
    if index.slugs != (LONGVIEW.slug,):
        counts["places"] = {slug: {"kept": 0, "city": 0, "nearby": 0, "out": 0} for slug in index.slugs}
        counts["other_zips_by_place"] = {}
    return counts


def _new_counts() -> Dict[str, Any]:
    return {
        "fetched": 0, "kept": 0, "inserted": 0, "updated": 0, "unchanged": 0, "reactivated": 0,
        "deactivated": 0, "businesses_deactivated": 0, "duplicates": 0, "suppressed": 0,
        "city": 0, "nearby": 0, "out": 0, "inside_other_zip": 0, "individual": 0, "personal_name": 0,
        "other_zips": {},
    }


def sync_sales_tax(conn: sqlite3.Connection, settings, now=None, transport=None) -> Dict[str, Any]:
    """Pull the active places' outlets, upsert them, retire vanished ones. Returns counts.

    Failures (no dataset, a schema mismatch, an API error, an empty pull) are
    recorded on the run and the ``sources`` row, then raised to the caller.
    """
    now = as_now(now)
    run_id = db.start_run(conn, RUN_KIND, now)
    counts = place_counts(_new_counts(), PlaceIndex.for_settings(settings))
    try:
        info = socrata.discover_dataset(
            settings, QUERY, NAME_PATTERN, [FIELD_CANDIDATES[f] for f in REQUIRED_FIELDS], transport=transport
        )
        counts["dataset_id"] = info.id
        fields = socrata.resolve_fields(info.columns, FIELD_CANDIDATES, REQUIRED_FIELDS)
        index = PlaceIndex.for_settings(settings)
        where = index.where(fields["outlet_city"])
        writer = RecordWriter(conn, SOURCE_ID, now, counts)
        for row in socrata.fetch_rows(settings, info.id, where, page_size=PAGE_SIZE, transport=transport):
            counts["fetched"] += 1
            key, record, note = project_row(row, fields, index)
            if key is None:
                bump(counts, note)
                continue
            if not writer.add(key, record, row, info.license, info.url):
                continue
            counts["kept"] += 1
            counts[record["scope"]] += 1
            place = places.get(record["place"])
            count_place(counts, place.slug, record["scope"])
            if place.other_zip(record["zip"]):
                bump_zip(counts, place.slug, record["zip"] or "missing")
                if note == "inside":
                    counts["inside_other_zip"] += 1
            counts["individual"] += 1 if record["is_individual"] else 0
            counts["personal_name"] += 1 if record["personal_name"] else 0
        if counts["fetched"] == 0:
            raise EmptyResult()
        writer.deactivate_unseen(index.slugs)
        # Dataset metadata is written only on success: the export cites it as
        # the source of the facts already in the archive.
        finish_ok(conn, run_id, SOURCE_ID, counts, now, license=info.license, dataset_id=info.id,
                  dataset_url=info.url, columns_json=db.dumps(list(info.columns)))
        return counts
    except Exception as exc:
        finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
        raise
