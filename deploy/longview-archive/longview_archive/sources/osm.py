"""OpenStreetMap businesses inside the City of Longview boundary (Overpass).

OSM is for discovery and cross-checking only: it can point to a business the
open-data lists miss, confirm a storefront at a street, and suggest a website
the crawler may verify. Its names, addresses, and phones are never published as
our own (ODbL, © OpenStreetMap contributors). The query uses the city's
administrative boundary, so every element here is inside city limits.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from typing import Any, Dict, Mapping, Optional, Tuple

from .. import db, normalize
from .http import ApiError, EmptyResult, RecordWriter, as_now, bump, finish_failed, finish_ok, get_json

logger = logging.getLogger(__name__)

SOURCE_ID = "osm"
RUN_KIND = "sync_osm"
LICENSE = "ODbL 1.0 (© OpenStreetMap contributors)"
DATASET_URL = "https://www.openstreetmap.org/"
QUERY_TIMEOUT_S = 180
# The server may hold the connection for the whole query timeout.
CLIENT_TIMEOUT_S = 200.0

BUSINESS_AMENITIES = (
    "restaurant", "fast_food", "cafe", "bar", "pub", "biergarten", "ice_cream", "food_court",
    "bank", "pharmacy", "dentist", "doctors", "clinic", "hospital", "veterinary", "fuel",
    "car_wash", "car_rental", "childcare", "kindergarten", "place_of_worship", "cinema",
    "theatre", "nightclub", "driving_school", "dojo",
)
TOURISM = ("hotel", "motel", "guest_house")
LEISURE = ("fitness_centre", "sports_centre", "bowling_alley")


def build_query() -> str:
    def one_of(values) -> str:
        return "^(" + "|".join(values) + ")$"

    return "\n".join((
        f"[out:json][timeout:{QUERY_TIMEOUT_S}];",
        'area["ISO3166-2"="US-TX"]["admin_level"="4"]->.tx;',
        'area["name"="Longview"]["boundary"="administrative"]["admin_level"="8"](area.tx)->.lv;',
        "(",
        '  nwr["shop"](area.lv);',
        '  nwr["office"](area.lv);',
        '  nwr["craft"](area.lv);',
        '  nwr["healthcare"](area.lv);',
        f'  nwr["amenity"~"{one_of(BUSINESS_AMENITIES)}"](area.lv);',
        f'  nwr["tourism"~"{one_of(TOURISM)}"](area.lv);',
        f'  nwr["leisure"~"{one_of(LEISURE)}"](area.lv);',
        ");",
        "out center tags;",
    ))


def _first_phone(tags: Mapping[str, str], allow_fictional: bool) -> Optional[str]:
    for key in ("phone", "contact:phone"):
        for part in re.split(r"[;,/]", str(tags.get(key) or "")):
            e164 = normalize.norm_phone(part.strip(), allow_fictional=allow_fictional)
            if e164:
                return e164
    return None


def _first_website(tags: Mapping[str, str]) -> Optional[str]:
    for key in ("website", "contact:website", "url"):
        for part in str(tags.get(key) or "").split(";"):
            url = normalize.norm_url(part.strip())
            if url:
                return url
    return None


def element_record(element: Mapping[str, Any], settings) -> Tuple[Optional[str], Optional[Dict[str, Any]], str]:
    """(source_key, record, note) for one Overpass element; skipped elements have key None."""
    kind = element.get("type")
    osm_id = element.get("id")
    if kind not in ("node", "way", "relation") or osm_id is None:
        return None, None, "skipped_malformed"
    tags = element.get("tags") or {}
    name = str(tags.get("name") or "").strip()
    if not name:
        return None, None, "skipped_no_name"
    center = element.get("center") or {}
    lat = element.get("lat", center.get("lat"))
    lon = element.get("lon", center.get("lon"))
    housenumber = str(tags.get("addr:housenumber") or "").strip()
    street_name = str(tags.get("addr:street") or "").strip()
    street = street_norm = suite = None
    if housenumber and street_name:
        line = f"{housenumber} {street_name}"
        unit = str(tags.get("addr:unit") or "").strip()
        if unit:
            line += f" Ste {unit}"
        street = normalize.display_street(line) or None
        norm, unit_norm = normalize.parse_street(line)
        street_norm, suite = norm or None, unit_norm or None
    website = _first_website(tags)
    record = {
        "name": name,
        "name_norm": normalize.norm_name(name),
        "street": street,
        "street_norm": street_norm,
        "suite": suite,
        "city": str(tags.get("addr:city") or "").strip() or "Longview",
        "zip": normalize.zip5(tags.get("addr:postcode")),
        "phone": _first_phone(tags, settings.allow_fictional_phones),
        "website": website,
        "website_domain": normalize.registrable_domain(website) if website else None,
        "lat": float(lat) if lat is not None else None,
        "lon": float(lon) if lon is not None else None,
        "scope": "city",
        "tags_json": db.dumps(tags),
    }
    return f"{kind}/{osm_id}", record, ""


def sync_osm(conn: sqlite3.Connection, settings, now=None, transport=None) -> Dict[str, Any]:
    """One Overpass pull for the city. Failures are recorded, then raised."""
    now = as_now(now)
    run_id = db.start_run(conn, RUN_KIND, now)
    counts: Dict[str, Any] = {
        "fetched": 0, "kept": 0, "inserted": 0, "updated": 0, "unchanged": 0, "reactivated": 0,
        "deactivated": 0, "businesses_deactivated": 0, "duplicates": 0, "suppressed": 0,
        "with_website": 0, "with_phone": 0, "with_street": 0,
    }
    try:
        payload = get_json(
            settings.overpass_url, settings, data={"data": build_query()}, transport=transport,
            timeout=max(settings.api_timeout_s, CLIENT_TIMEOUT_S),
        )
        if not isinstance(payload, dict):
            raise ApiError(200, "unexpected_payload", "overpass")
        if payload.get("remark"):
            # Overpass reports timeouts and memory limits here with a partial result.
            raise ApiError(200, "overpass_remark", "overpass")
        writer = RecordWriter(conn, SOURCE_ID, now, counts)
        for element in payload.get("elements") or []:
            if not isinstance(element, dict):
                continue
            counts["fetched"] += 1
            key, record, note = element_record(element, settings)
            if key is None:
                bump(counts, note)
                continue
            if not writer.add(key, record, element, LICENSE, f"https://www.openstreetmap.org/{key}"):
                continue
            counts["kept"] += 1
            counts["with_website"] += 1 if record["website"] else 0
            counts["with_phone"] += 1 if record["phone"] else 0
            counts["with_street"] += 1 if record["street_norm"] else 0
        if counts["fetched"] == 0:
            raise EmptyResult()
        writer.deactivate_unseen()
        finish_ok(conn, run_id, SOURCE_ID, counts, now, license=LICENSE, dataset_url=DATASET_URL)
        return counts
    except Exception as exc:
        finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
        raise
