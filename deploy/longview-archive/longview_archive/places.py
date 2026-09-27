"""The places the directory covers: Longview first, then the towns around it, ring by ring.

Each place is one town: its own section of the site at ``/<slug>/businesses/``,
its own listings, and its own ZIP codes. A business belongs to exactly one
place, the town its postal address names; matching never joins records from
two places (``matching.py``).

Which places are ACTIVE is a setting (``LVA_PLACES``, comma-separated slugs,
default ``longview``), so the owner turns towns on one ring at a time, after the
data probe (``tools/probe_public_data.py``) has counted each ring. A place that
is not active is not queried, not published, and its pages are taken down.

ZIP codes are listed only where they are certain. A place with no ZIP codes
listed is matched by its postal city alone (``Place.scope``): any ZIP is
accepted with that town's name, and the sync reports every ZIP it saw
(``other_zips``) so a person can pin them down later. Nothing is guessed: a
ZIP not listed for a place that has a list gives scope ``out`` (never
published), exactly as a non-Longview ZIP always has for Longview.

Scope, per place, the same rules Longview has always had:

* ``city``: a street-delivery ZIP of the town, not marked outside the city
  limits by the dataset. An unincorporated community has no city limits, so
  nothing there is ever ``city``.
* ``nearby``: any other postal ZIP of the town (outside the limits, a PO box):
  the business has a <Town>, Texas address.
* ``out``: a missing ZIP, or a ZIP the town's list does not have.

Adding a place: add it to ``PLACES`` below, add its slug to the path pattern in
``caddy/website.routes``, ``caddy/website.errors``, ``caddy/longview-archive.caddy``
and ``caddy/public-host.caddy.in`` (``tests/test_places.py`` checks they agree),
and make sure the website app has no ``app/<slug>/businesses`` route.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Iterable, Mapping, Optional, Sequence, Tuple

DEFAULT_PLACES: Tuple[str, ...] = ("longview",)
SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
POSTAL_CITY_RE = re.compile(r"[A-Z][A-Z .-]*[A-Z]")
ZIP_RE = re.compile(r"\d{5}")
# Top-level paths a place slug may never take: the hub, the status pages, and
# the files Caddy serves at the root of www/.
RESERVED_SLUGS = frozenset({"places", "status", "status.json", "robots.txt", "index.html", "businesses"})
HUB_PATH = "/places/"


@dataclass(frozen=True)
class Place:
    slug: str
    name: str
    postal_cities: Tuple[str, ...]
    zips: Tuple[str, ...] = ()            # street-delivery ZIPs
    po_box_zips: Tuple[str, ...] = ()     # PO-box ZIPs: a <Town> address, never "inside the city"
    state: str = "TX"
    incorporated: bool = True             # has city limits (and an OpenStreetMap city boundary)
    county: str = ""

    @property
    def all_zips(self) -> Tuple[str, ...]:
        return self.zips + self.po_box_zips

    @property
    def zips_known(self) -> bool:
        return bool(self.zips)

    @property
    def base(self) -> str:
        """The section's path, with its trailing slash: /longview/businesses/."""
        return f"/{self.slug}/businesses/"

    @property
    def directory_path(self) -> str:
        return f"/{self.slug}/businesses"

    def scope(self, zip_code: Optional[str], outside_city_limits: bool = False) -> str:
        """'city', 'nearby' or 'out' for a record whose postal city is this place (module docstring)."""
        if not zip_code:
            return "out"
        if self.zips_known:
            if zip_code in self.zips and not outside_city_limits and self.incorporated:
                return "city"
            return "nearby" if zip_code in self.all_zips else "out"
        # No ZIP list: the postal city alone places it.
        return "city" if self.incorporated and not outside_city_limits else "nearby"

    def mailing_scope(self, zip_code: Optional[str]) -> str:
        """A franchise-tax company (a mailing address): 'city' with any of the town's postal ZIPs.

        The rule Longview has always used for that list. An unincorporated town has
        no city, so there it is 'nearby'."""
        if not zip_code:
            return "out"
        if self.zips_known and zip_code not in self.all_zips:
            return "out"
        return "city" if self.incorporated else "nearby"

    def other_zip(self, zip_code: Optional[str]) -> bool:
        """A ZIP worth reporting: missing, or not one of the town's street ZIPs."""
        return not zip_code or zip_code not in self.zips


# The seeded places. Longview's values are the ones the engine has always used.
# Where a ZIP was not certain it is left out (see the module docstring); the
# notes say which.
PLACES: Tuple[Place, ...] = (
    Place("longview", "Longview", ("LONGVIEW",), ("75601", "75602", "75603", "75604", "75605"),
          ("75606", "75607", "75608"), county="Gregg"),
    # First ring around Longview.
    Place("marshall", "Marshall", ("MARSHALL",), ("75670", "75672"), ("75671",), county="Harrison"),
    Place("kilgore", "Kilgore", ("KILGORE",), ("75662",), ("75663",), county="Gregg"),
    Place("white-oak", "White Oak", ("WHITE OAK",), ("75693",), county="Gregg"),
    Place("hallsville", "Hallsville", ("HALLSVILLE",), ("75650",), county="Harrison"),
    Place("diana", "Diana", ("DIANA",), ("75640",), incorporated=False, county="Upshur"),
    Place("harleton", "Harleton", ("HARLETON",), ("75651",), incorporated=False, county="Harrison"),
    Place("gladewater", "Gladewater", ("GLADEWATER",), ("75647",), county="Gregg"),
    # Clarksville City's mail is mostly addressed to Gladewater or White Oak; its
    # own ZIP use is not certain, so it is matched by the name "Clarksville City" only.
    Place("clarksville-city", "Clarksville City", ("CLARKSVILLE CITY",), county="Gregg"),
    Place("easton", "Easton", ("EASTON",), ("75641",), county="Gregg"),
    Place("scottsville", "Scottsville", ("SCOTTSVILLE",), ("75688",), county="Harrison"),
    Place("elysian-fields", "Elysian Fields", ("ELYSIAN FIELDS",), ("75642",), incorporated=False,
          county="Harrison"),
    Place("waskom", "Waskom", ("WASKOM",), ("75692",), county="Harrison"),
    Place("ore-city", "Ore City", ("ORE CITY",), ("75683",), county="Upshur"),
    # Gilmer's PO-box ZIP is not listed (not certain): a record with it is 'out' and reported.
    Place("gilmer", "Gilmer", ("GILMER",), ("75644",), county="Upshur"),
    Place("karnack", "Karnack", ("KARNACK",), ("75661",), incorporated=False, county="Harrison"),
    Place("jefferson", "Jefferson", ("JEFFERSON",), ("75657",), county="Marion"),
    Place("tatum", "Tatum", ("TATUM",), ("75691",), county="Rusk"),
    # Henderson's PO-box ZIP is not listed (not certain): a record with it is 'out' and reported.
    Place("henderson", "Henderson", ("HENDERSON",), ("75652", "75654"), county="Rusk"),
    Place("carthage", "Carthage", ("CARTHAGE",), ("75633",), county="Panola"),
)
BY_SLUG: Dict[str, Place] = {p.slug: p for p in PLACES}
LONGVIEW = BY_SLUG["longview"]


def _check_registry(places: Sequence[Place]) -> None:
    """The registry is data a person edits: refuse anything that could route or match wrongly."""
    seen_slugs, seen_cities, seen_zips = set(), {}, {}
    for p in places:
        if not SLUG_RE.fullmatch(p.slug) or p.slug in RESERVED_SLUGS or p.slug in seen_slugs:
            raise ValueError(f"bad or repeated place slug: {p.slug!r}")
        seen_slugs.add(p.slug)
        if not p.name or p.state != "TX":
            raise ValueError(f"place {p.slug}: a name and state TX are required")
        for city in p.postal_cities:
            if not POSTAL_CITY_RE.fullmatch(city) or city in seen_cities:
                raise ValueError(f"place {p.slug}: bad or repeated postal city {city!r}")
            seen_cities[city] = p.slug
        for z in p.all_zips:
            if not ZIP_RE.fullmatch(z) or z in seen_zips:
                raise ValueError(f"place {p.slug}: bad or repeated ZIP {z!r}")
            seen_zips[z] = p.slug
        if p.po_box_zips and not p.zips:
            raise ValueError(f"place {p.slug}: PO-box ZIPs need street ZIPs too")


_check_registry(PLACES)


def get(slug: str) -> Place:
    return BY_SLUG[slug]


def parse_places(raw: str) -> Tuple[str, ...]:
    """LVA_PLACES: slugs separated by commas or spaces, or ``all``. Registry order; unknown ones refused."""
    wanted = [part for part in re.split(r"[\s,]+", (raw or "").strip().lower()) if part]
    if not wanted:
        return DEFAULT_PLACES
    if wanted == ["all"]:
        return tuple(p.slug for p in PLACES)
    unknown = sorted(set(wanted) - set(BY_SLUG))
    if unknown:
        raise ValueError(f"LVA_PLACES names unknown places: {', '.join(unknown)}"
                         f" (known: {', '.join(p.slug for p in PLACES)})")
    return tuple(p.slug for p in PLACES if p.slug in wanted)


def resolve(slugs: Optional[Iterable[str]]) -> Tuple[Place, ...]:
    """Place objects for slugs (registry order); None or empty: Longview alone."""
    wanted = set(slugs or DEFAULT_PLACES)
    return tuple(p for p in PLACES if p.slug in wanted) or (LONGVIEW,)


def active(settings) -> Tuple[Place, ...]:
    return resolve(getattr(settings, "places", None))


class PlaceIndex:
    """The active places, looked up by postal city (upper case)."""

    def __init__(self, places: Optional[Sequence[Place]] = None):
        self.places: Tuple[Place, ...] = tuple(places or (LONGVIEW,))
        self.by_city: Dict[str, Place] = {c: p for p in self.places for c in p.postal_cities}

    @classmethod
    def for_settings(cls, settings) -> "PlaceIndex":
        return cls(active(settings))

    @property
    def slugs(self) -> Tuple[str, ...]:
        return tuple(p.slug for p in self.places)

    def for_city(self, city: str) -> Optional[Place]:
        return self.by_city.get(re.sub(r"\s+", " ", str(city or "")).strip().upper())

    def where(self, column: str) -> str:
        """The SoQL filter on a city column: ``= 'LONGVIEW'`` for one city, ``IN (...)`` for several.

        Postal city names are checked against POSTAL_CITY_RE (letters, spaces, dots,
        hyphens), so they never carry a quote."""
        cities = [c for p in self.places for c in p.postal_cities]
        if len(cities) == 1:
            return f"upper({column}) = '{cities[0]}'"
        return f"upper({column}) IN ({', '.join(repr(c) for c in cities)})"


def path_pattern(slugs: Optional[Iterable[str]] = None) -> str:
    """The regular expression Caddy matches the directory's paths with (every seeded place, and the hub).

    The slug list is fixed in the Caddy files; a place that is not active has no
    files, so its paths answer 404."""
    names = "|".join(slugs or (p.slug for p in PLACES))
    return rf"^/(?:(?:{names})/businesses|places)(?:/.*)?$"


def files_path_pattern(slugs: Optional[Iterable[str]] = None) -> str:
    """The paths below a section or the hub (/marshall/businesses/..., /places/...): served from disk."""
    names = "|".join(slugs or (p.slug for p in PLACES))
    return rf"^/(?:(?:{names})/businesses|places)/.*$"


def bare_path_pattern(slugs: Optional[Iterable[str]] = None) -> str:
    """The same paths without their trailing slash (/marshall/businesses): Caddy answers them with a 308."""
    names = "|".join(slugs or (p.slug for p in PLACES))
    return rf"^/(?:(?:{names})/businesses|places)$"


def slug_of(row) -> str:
    """The place slug of a business or record row (an older row without one is Longview's)."""
    try:
        slug = row["place"]
    except (KeyError, IndexError, TypeError):
        slug = None
    return slug or LONGVIEW.slug


def of(row) -> Optional[Place]:
    """The Place of a business or record row; None for a slug the registry no longer has
    (never guessed into another town)."""
    return BY_SLUG.get(slug_of(row))


def counts_by_place(rows: Iterable[Mapping]) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for row in rows:
        slug = row.get("place") if isinstance(row, Mapping) else None
        slug = slug or LONGVIEW.slug
        out[slug] = out.get(slug, 0) + 1
    return out
