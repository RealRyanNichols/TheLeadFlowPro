"""The places the directory covers: Longview first, then the towns around it, ring by ring.

Each place is one town: its own section of the site at ``/<slug>/businesses/``,
its own listings, and its own ZIP codes. A business belongs to exactly one
place, the town its postal address names; matching never joins records from
two places (``matching.py``).

Which places are ACTIVE is a setting (``LVA_PLACES``, comma-separated slugs,
default ``longview``), so the owner turns towns on one ring at a time, after the
data probe (``tools/probe_public_data.py``) has counted each ring. A place that
is not active is not queried, not published, and its pages are taken down.
Longview is always on: a list without it is refused (``parse_places``).

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
    # OpenStreetMap only (sources/osm.py): a point inside the town (its downtown), which
    # picks the town's own boundary, and a tight box (south, west, north, east) around its
    # limits that every element kept must fall in. None for a town with no boundary.
    center: Optional[Tuple[float, float]] = None
    bbox: Optional[Tuple[float, float, float, float]] = None

    def in_bbox(self, lat: Optional[float], lon: Optional[float]) -> bool:
        """True when (lat, lon) is inside the town's box; False without a box or a position."""
        if self.bbox is None or lat is None or lon is None:
            return False
        south, west, north, east = self.bbox
        return south <= float(lat) <= north and west <= float(lon) <= east

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


def _box(lat: float, lon: float, dlat: float, dlon: float) -> Dict[str, object]:
    """A town's OpenStreetMap point and its box: the point plus or minus (dlat, dlon) degrees.

    0.01 degree is about 1.1 km north-south and 0.95 km east-west here. Each box is
    drawn around the town's own limits, never reaching a neighbour's downtown."""
    return {"center": (lat, lon), "bbox": (round(lat - dlat, 4), round(lon - dlon, 4),
                                           round(lat + dlat, 4), round(lon + dlon, 4))}


# The seeded places. Longview's values are the ones the engine has always used.
# Where a ZIP was not certain it is left out (see the module docstring); the
# notes say which.
PLACES: Tuple[Place, ...] = (
    Place("longview", "Longview", ("LONGVIEW",), ("75601", "75602", "75603", "75604", "75605"),
          ("75606", "75607", "75608"), county="Gregg", center=(32.5007, -94.7405),
          bbox=(32.37, -94.845, 32.62, -94.61)),
    # First ring around Longview.
    Place("marshall", "Marshall", ("MARSHALL",), ("75670", "75672"), ("75671",), county="Harrison",
          **_box(32.5449, -94.3674, 0.07, 0.08)),
    Place("kilgore", "Kilgore", ("KILGORE",), ("75662",), ("75663",), county="Gregg",
          **_box(32.3863, -94.8758, 0.06, 0.07)),
    Place("white-oak", "White Oak", ("WHITE OAK",), ("75693",), county="Gregg",
          **_box(32.5343, -94.8616, 0.03, 0.035)),
    Place("hallsville", "Hallsville", ("HALLSVILLE",), ("75650",), county="Harrison",
          **_box(32.5043, -94.5741, 0.03, 0.035)),
    Place("diana", "Diana", ("DIANA",), ("75640",), incorporated=False, county="Upshur"),
    Place("harleton", "Harleton", ("HARLETON",), ("75651",), incorporated=False, county="Harrison"),
    Place("gladewater", "Gladewater", ("GLADEWATER",), ("75647",), county="Gregg",
          **_box(32.5365, -94.9427, 0.04, 0.03)),
    # Clarksville City's mail is mostly addressed to Gladewater or White Oak; its
    # own ZIP use is not certain, so it is matched by the name "Clarksville City" only.
    Place("clarksville-city", "Clarksville City", ("CLARKSVILLE CITY",), county="Gregg",
          **_box(32.5354, -94.9094, 0.025, 0.03)),
    Place("easton", "Easton", ("EASTON",), ("75641",), county="Gregg",
          **_box(32.3876, -94.5838, 0.025, 0.03)),
    Place("scottsville", "Scottsville", ("SCOTTSVILLE",), ("75688",), county="Harrison",
          **_box(32.5382, -94.2413, 0.025, 0.03)),
    Place("elysian-fields", "Elysian Fields", ("ELYSIAN FIELDS",), ("75642",), incorporated=False,
          county="Harrison"),
    Place("waskom", "Waskom", ("WASKOM",), ("75692",), county="Harrison",
          **_box(32.4771, -94.0616, 0.03, 0.035)),
    Place("ore-city", "Ore City", ("ORE CITY",), ("75683",), county="Upshur",
          **_box(32.8021, -94.7202, 0.03, 0.035)),
    # Gilmer: 75644 and 75645 are both Gilmer's.
    Place("gilmer", "Gilmer", ("GILMER",), ("75644", "75645"), county="Upshur",
          **_box(32.7287, -94.9424, 0.04, 0.045)),
    Place("karnack", "Karnack", ("KARNACK",), ("75661",), incorporated=False, county="Harrison"),
    Place("jefferson", "Jefferson", ("JEFFERSON",), ("75657",), county="Marion",
          **_box(32.7574, -94.3452, 0.03, 0.035)),
    Place("tatum", "Tatum", ("TATUM",), ("75691",), county="Rusk",
          **_box(32.3160, -94.5163, 0.025, 0.03)),
    # Henderson: street ZIPs 75652 and 75654, PO boxes 75653.
    Place("henderson", "Henderson", ("HENDERSON",), ("75652", "75654"), ("75653",), county="Rusk",
          **_box(32.1532, -94.7994, 0.05, 0.06)),
    Place("carthage", "Carthage", ("CARTHAGE",), ("75633",), county="Panola",
          **_box(32.1574, -94.3374, 0.04, 0.045)),
    # Second ring. Tyler: street ZIPs 75701-75709, PO boxes 75710-75713; its
    # university and firm-only ZIPs are left out until the probe shows them.
    Place("tyler", "Tyler", ("TYLER",), tuple(f"7570{d}" for d in range(1, 10)),
          ("75710", "75711", "75712", "75713"), county="Smith", **_box(32.3513, -95.3011, 0.11, 0.12)),
    Place("big-sandy", "Big Sandy", ("BIG SANDY",), ("75755",), county="Upshur",
          **_box(32.5835, -95.1088, 0.025, 0.03)),
    Place("hawkins", "Hawkins", ("HAWKINS",), ("75765",), county="Wood",
          **_box(32.5885, -95.2044, 0.025, 0.03)),
    Place("winona", "Winona", ("WINONA",), ("75792",), county="Smith",
          **_box(32.4904, -95.1705, 0.02, 0.025)),
    Place("arp", "Arp", ("ARP",), ("75750",), county="Smith",
          **_box(32.2268, -95.0535, 0.02, 0.025)),
    Place("overton", "Overton", ("OVERTON",), ("75684",), county="Rusk",
          **_box(32.2743, -94.9780, 0.025, 0.03)),
    Place("new-london", "New London", ("NEW LONDON",), ("75682",), county="Rusk",
          **_box(32.2338, -94.9277, 0.02, 0.025)),
    Place("beckville", "Beckville", ("BECKVILLE",), ("75631",), county="Panola",
          **_box(32.2435, -94.4555, 0.02, 0.025)),
    Place("pittsburg", "Pittsburg", ("PITTSBURG",), ("75686",), county="Camp",
          **_box(32.9954, -94.9658, 0.03, 0.035)),
    Place("daingerfield", "Daingerfield", ("DAINGERFIELD",), ("75638",), county="Morris",
          **_box(33.0318, -94.7219, 0.025, 0.03)),
    Place("lone-star", "Lone Star", ("LONE STAR",), ("75668",), county="Morris",
          **_box(32.9407, -94.7071, 0.025, 0.03)),
    Place("hughes-springs", "Hughes Springs", ("HUGHES SPRINGS",), ("75656",), county="Cass",
          **_box(32.9985, -94.6302, 0.02, 0.025)),
    Place("linden", "Linden", ("LINDEN",), ("75563",), county="Cass",
          **_box(33.0118, -94.3655, 0.02, 0.025)),
    # Third ring (Sept 30, 2026), from the data probe's survey: the ZIPs each town's sales-tax
    # outlets use, and the 2024 Census Gazetteer point and land area (the box is sized from it).
    Place("mount-pleasant", "Mount Pleasant", ("MOUNT PLEASANT",), ("75455",), ("75456",), county="Titus",
          **_box(33.1582, -94.9745, 0.068, 0.081)),
    Place("nacogdoches", "Nacogdoches", ("NACOGDOCHES",), ("75961", "75964", "75965"), ("75963",), county="Nacogdoches",
          **_box(31.6124, -94.6520, 0.077, 0.091)),
    Place("palestine", "Palestine", ("PALESTINE",), ("75801", "75803"), ("75802",), county="Anderson",
          **_box(31.7545, -95.6470, 0.066, 0.078)),
    Place("jacksonville", "Jacksonville", ("JACKSONVILLE",), ("75766",), county="Cherokee",
          **_box(31.9595, -95.2657, 0.06, 0.07)),
    Place("athens", "Athens", ("ATHENS",), ("75751", "75752"), county="Henderson",
          **_box(32.2026, -95.8308, 0.064, 0.076)),
    Place("mineola", "Mineola", ("MINEOLA",), ("75773",), county="Wood",
          **_box(32.6529, -95.4803, 0.051, 0.06)),
    Place("quitman", "Quitman", ("QUITMAN",), ("75783",), county="Wood",
          **_box(32.7940, -95.4455, 0.027, 0.032)),
    Place("winnsboro", "Winnsboro", ("WINNSBORO",), ("75494",), county="Wood",
          **_box(32.9559, -95.2903, 0.034, 0.04)),
    Place("mount-vernon", "Mount Vernon", ("MOUNT VERNON",), ("75457",), county="Franklin",
          **_box(33.1774, -95.2244, 0.036, 0.043)),
    Place("atlanta", "Atlanta", ("ATLANTA",), ("75551",), county="Cass",
          **_box(33.1132, -94.1676, 0.03, 0.045)),
    Place("queen-city", "Queen City", ("QUEEN CITY",), ("75572",), county="Cass",
          **_box(33.1502, -94.1532, 0.033, 0.04)),
    Place("naples", "Naples", ("NAPLES",), ("75568",), county="Morris",
          **_box(33.2019, -94.6790, 0.029, 0.035)),
    Place("omaha", "Omaha", ("OMAHA",), ("75571",), county="Morris",
          **_box(33.1827, -94.7385, 0.025, 0.03)),
    Place("avinger", "Avinger", ("AVINGER",), ("75630",), county="Cass",
          **_box(32.8969, -94.5527, 0.027, 0.032)),
    Place("lindale", "Lindale", ("LINDALE",), ("75771",), county="Smith",
          **_box(32.4941, -95.4073, 0.041, 0.049)),
    Place("whitehouse", "Whitehouse", ("WHITEHOUSE",), ("75791",), county="Smith",
          **_box(32.2217, -95.2207, 0.039, 0.047)),
    Place("bullard", "Bullard", ("BULLARD",), ("75757",), county="Smith",
          **_box(32.1442, -95.3175, 0.036, 0.042)),
    Place("troup", "Troup", ("TROUP",), ("75789",), county="Smith",
          **_box(32.1458, -95.1226, 0.029, 0.035)),
    Place("rusk", "Rusk", ("RUSK",), ("75785",), county="Cherokee",
          **_box(31.7978, -95.1488, 0.044, 0.052)),
    Place("mount-enterprise", "Mount Enterprise", ("MOUNT ENTERPRISE",), ("75681",), county="Rusk",
          **_box(31.9116, -94.6828, 0.025, 0.029)),
    Place("center", "Center", ("CENTER",), ("75935",), county="Shelby",
          **_box(31.7931, -94.1803, 0.046, 0.054)),
    Place("timpson", "Timpson", ("TIMPSON",), ("75975",), county="Shelby",
          **_box(31.9069, -94.3971, 0.029, 0.035)),
    Place("tenaha", "Tenaha", ("TENAHA",), ("75974",), county="Shelby",
          **_box(31.9437, -94.2457, 0.034, 0.04)),
    Place("chandler", "Chandler", ("CHANDLER",), ("75758",), county="Henderson",
          **_box(32.3069, -95.4737, 0.041, 0.049)),
    Place("brownsboro", "Brownsboro", ("BROWNSBORO",), ("75756",), county="Henderson",
          **_box(32.2984, -95.6130, 0.029, 0.034)),
    Place("van", "Van", ("VAN",), ("75790",), county="Van Zandt",
          **_box(32.5239, -95.6376, 0.031, 0.037)),
    Place("edgewood", "Edgewood", ("EDGEWOOD",), ("75117",), county="Van Zandt",
          **_box(32.6908, -95.8822, 0.024, 0.029)),
    Place("grand-saline", "Grand Saline", ("GRAND SALINE",), ("75140",), county="Van Zandt",
          **_box(32.6781, -95.7116, 0.028, 0.033)),
    Place("canton", "Canton", ("CANTON",), ("75103",), county="Van Zandt",
          **_box(32.5542, -95.8635, 0.041, 0.049)),
    Place("wills-point", "Wills Point", ("WILLS POINT",), ("75169",), county="Van Zandt",
          **_box(32.7095, -96.0050, 0.034, 0.04)),
    Place("frankston", "Frankston", ("FRANKSTON",), ("75763",), county="Anderson",
          **_box(32.0573, -95.5045, 0.029, 0.035)),
    Place("alba", "Alba", ("ALBA",), ("75410",), county="Wood",
          **_box(32.7867, -95.6325, 0.022, 0.027)),
    Place("yantis", "Yantis", ("YANTIS",), ("75497",), county="Wood",
          **_box(32.9285, -95.5774, 0.026, 0.031)),
    Place("leesburg", "Leesburg", ("LEESBURG",), ("75451",), incorporated=False, county="Camp"),
    Place("laneville", "Laneville", ("LANEVILLE",), ("75667",), incorporated=False, county="Rusk"),
    Place("cushing", "Cushing", ("CUSHING",), ("75760",), county="Nacogdoches",
          **_box(31.8119, -94.8417, 0.024, 0.028)),
    Place("garrison", "Garrison", ("GARRISON",), ("75946",), county="Nacogdoches",
          **_box(31.8260, -94.4938, 0.023, 0.027)),
    Place("chireno", "Chireno", ("CHIRENO",), ("75937",), county="Nacogdoches",
          **_box(31.4989, -94.3459, 0.027, 0.031)),
    Place("joaquin", "Joaquin", ("JOAQUIN",), ("75954",), county="Shelby",
          **_box(31.9656, -94.0484, 0.029, 0.034)),
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
        if p.incorporated != (p.bbox is not None) or (p.center is None) != (p.bbox is None):
            raise ValueError(f"place {p.slug}: a town with city limits needs its point and box (and only it)")
        if p.bbox is not None:
            south, west, north, east = p.bbox
            if not (-90 <= south < north <= 90 and -180 <= west < east <= 180) or not p.in_bbox(*p.center):
                raise ValueError(f"place {p.slug}: its box must be south < north, west < east, around its point")


_check_registry(PLACES)


def get(slug: str) -> Place:
    return BY_SLUG[slug]


def parse_places(raw: str) -> Tuple[str, ...]:
    """LVA_PLACES: slugs separated by commas or spaces, or ``all``. Registry order.

    Unknown slugs are refused, and so is a list without ``longview``."""
    wanted = [part for part in re.split(r"[\s,]+", (raw or "").strip().lower()) if part]
    if not wanted:
        return DEFAULT_PLACES
    if wanted == ["all"]:
        return tuple(p.slug for p in PLACES)
    unknown = sorted(set(wanted) - set(BY_SLUG))
    if unknown:
        raise ValueError(f"LVA_PLACES names unknown places: {', '.join(unknown)}"
                         f" (known: {', '.join(p.slug for p in PLACES)})")
    if LONGVIEW.slug not in wanted:
        # Longview is the directory's home (its root, its About page, the site's
        # /longview link): a list without it is a typo, never "Longview off".
        raise ValueError(f"LVA_PLACES must include {LONGVIEW.slug} (got: {', '.join(wanted)})")
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


# Caddy matches the directory's paths case-insensitively ((?i)), as its plain
# path matcher always did for Longview: /Longview/Businesses is the directory's
# path (a redirect or a 404 with the directory's headers), never the app's.
CASE_INSENSITIVE = "(?i)"
BARE_MATCHER = "lva_bare"   # the path_regexp name whose capture 1 is the town (placeholder re.lva_bare.1)
BARE_TOWN_VAR = "lva_town"  # the town, lower-cased by the Caddy map (caddy_town_map)


def _names(slugs: Optional[Iterable[str]]) -> str:
    return "|".join(slugs or (p.slug for p in PLACES))


def path_pattern(slugs: Optional[Iterable[str]] = None) -> str:
    """The regular expression Caddy matches the directory's paths with (every seeded place, and the hub).

    The slug list is fixed in the Caddy files; a place that is not active has no
    files, so its paths answer 404."""
    return rf"{CASE_INSENSITIVE}^/(?:(?:{_names(slugs)})/businesses|places)(?:/.*)?$"


def files_path_pattern(slugs: Optional[Iterable[str]] = None) -> str:
    """The paths below a section or the hub (/marshall/businesses/..., /places/...): served from disk."""
    return rf"{CASE_INSENSITIVE}^/(?:(?:{_names(slugs)})/businesses|places)/.*$"


def bare_path_pattern(slugs: Optional[Iterable[str]] = None) -> str:
    """A section's path without its trailing slash (/marshall/businesses): Caddy answers it with a 308.

    Capture 1 is the town. The redirect target is built from it (lower-cased by
    ``caddy_town_map``), never from the request's own path: Caddy matches the
    cleaned path, so //longview/businesses redirects to /longview/businesses/,
    not to the protocol-relative //longview/businesses/ (another host)."""
    return rf"{CASE_INSENSITIVE}^/({_names(slugs)})/businesses$"


def hub_bare_pattern() -> str:
    """The hub's path without its trailing slash (/places): a 308 to /places/."""
    return rf"{CASE_INSENSITIVE}^/places$"


def caddy_town_map(indent: str = "\t\t") -> str:
    """The Caddy ``map`` that turns the matched town (any case) into its slug, for the bare redirect.

    Every seeded town is listed, so the default (Longview's own section) is never
    used; it is there so the target can never be empty ("//businesses/")."""
    lines = [f"{indent}map {{re.{BARE_MATCHER}.1}} {{{BARE_TOWN_VAR}}} {{"]
    lines += [f"{indent}\t~{CASE_INSENSITIVE}^{p.slug}$ {p.slug}" for p in PLACES]
    lines += [f"{indent}\tdefault {LONGVIEW.slug}", f"{indent}}}"]
    return "\n".join(lines)


def caddy_bare_redirects(matcher: str, hub_matcher: str, indent: str = "\t") -> str:
    """The two Caddy handles for the bare paths: a town's section and the hub."""
    inner = indent + "\t"
    return "\n".join((
        f"{indent}@{matcher} path_regexp {BARE_MATCHER} {bare_path_pattern()}",
        f"{indent}handle @{matcher} {{",
        caddy_town_map(inner),
        f"{inner}redir * /{{{BARE_TOWN_VAR}}}/businesses/ 308",
        f"{indent}}}",
        f"{indent}@{hub_matcher} path_regexp {hub_bare_pattern()}",
        f"{indent}handle @{hub_matcher} {{",
        f"{inner}redir * /places/ 308",
        f"{indent}}}",
    ))


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
