"""Settings for the Longview Business Archive.

Defaults are the production values for the LeadFlow droplet. Every path and
network endpoint can be overridden with an ``LVA_*`` environment variable so
tests never touch real paths or the network. Nothing here is a secret, and the
engine talks to no code host or deploy service: the public directory is built
on the droplet and served by Caddy from ``www/``.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping, Tuple

VERSION = "1.0.0"

TIMEZONE = "America/Chicago"
CONTACT_EMAIL = "hello@theleadflowpro.com"
# The LeadFlow Pro's own site (its /longview page); the directory is not served there yet.
SITE_URL = "https://www.theleadflowpro.com"
DIRECTORY_PATH = "/longview/businesses"
# The staging host Caddy serves on the droplet (status page and directory).
STAGING_HOST = "longview.165-227-248-110.sslip.io"
# Where the directory is actually served. Every absolute link to it (canonical
# tags, the claim email's listing link) and the crawler's user agent are built
# from this one value, ``Settings.public_base_url``. When the directory moves to
# theleadflowpro.com, set LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com
# in /etc/longview-archive/env (ENV_FILE, below).
PUBLIC_BASE_URL = f"https://{STAGING_HOST}"
BASE_URL_RE = re.compile(r"https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?")


def user_agent_for(base_url: str) -> str:
    """The crawler's name, the About page that explains it (where it is served), and the contact email."""
    return f"LeadFlowPro-LongviewArchive/1.0 (+{base_url}{DIRECTORY_PATH}/about/; {CONTACT_EMAIL})"


USER_AGENT = user_agent_for(PUBLIC_BASE_URL)

# City of Longview delivery ZIPs. Other ZIPs seen with city LONGVIEW are
# reported on the status page and kept in the hidden "nearby" bucket until a
# person verifies them against USPS and the data.
LONGVIEW_ZIPS: Tuple[str, ...] = ("75601", "75602", "75603", "75604", "75605")

EAST_TEXAS_AREA_CODES: Tuple[str, ...] = ("903", "430")

SCOPE_LABEL = "City of Longview, Texas"

# Sites that are never a business's own website: the listings the brief
# forbids reading (Google Maps, Yelp, Facebook, the BBB, chambers of commerce,
# YellowPages, Nextdoor, Indeed) and directories, maps, social networks, and
# job boards of the same kind. A URL on one of them is never taken as a
# website candidate from any source and never requested (robots.txt and
# redirect hops included), so nothing is read from it or published as the
# business's website. A Facebook or Instagram link on the business's own site
# is still kept as that social fact; it is never fetched. Each entry is
# matched against the host (in the IDNA form DNS and TLS use, so "www.yelp。com"
# is www.yelp.com) and each of its parent domains, with "*" as a wildcard:
# "facebook.com" also covers m.facebook.com, "google.*" is google.com and
# google.co.uk, "*chamber.*" is any town's <town>chamber.com or .org.
# ``fetcher.forbidden_site`` is the one place it is applied.
FORBIDDEN_SITES: Tuple[str, ...] = (
    # Google Maps, Search, and Business Profile pages, and their short links
    # (share.google and the rest of Google's own .google names included).
    "google.*", "*.google", "share.google", "posts.gle", "goo.gl", "g.page", "g.co", "business.site",
    # Other maps.
    "maps.apple.com", "maps.apple", "mapquest.com", "waze.com", "bing.com",
    # Yelp.
    "yelp.*",
    # Facebook, Messenger, Instagram, and other social networks.
    "facebook.com", "fb.com", "fb.me", "fb.watch", "m.me", "messenger.com", "instagram.com", "instagr.am",
    "ig.me", "twitter.com", "x.com", "tiktok.com", "youtube.com", "youtu.be", "pinterest.com", "threads.net",
    # The BBB, chambers of commerce, and the member-directory services chambers use. The
    # named chambers and platforms are certain; "*chamber.*" and "chamberof*" can also be a
    # business's own name (see FORBIDDEN_SITES_IN_DOUBT), so a match only on those goes to review.
    "bbb.org", "longviewchamber.com", "*chamber.*", "chamberof*", "*chamberofcommerce*",
    "*chamber-of-commerce*", "chamberofcommerce.com", "chambermaster.com", "growthzoneapp.com",
    "growthzonesites.com", "growthzonecms.com", "micronetonline.com", "chamberorganizer.com",
    "chambernation.com", "memberclicks.net",
    # YellowPages and its sister directories.
    "yellowpages.com", "yp.com", "superpages.com", "dexknows.com",
    # Nextdoor.
    "nextdoor.com",
    # Indeed and other job boards.
    "indeed.com", "glassdoor.com", "ziprecruiter.com", "linkedin.com", "careerbuilder.com", "monster.com",
    "simplyhired.com", "snagajob.com",
    # Other business directories, reviews, and ordering or booking listings.
    "manta.com", "bizapedia.com", "buzzfile.com", "opencorporates.com", "hotfrog.com", "citysearch.com",
    "local.com", "merchantcircle.com", "cylex.us.com", "loc8nearme.com", "foursquare.com", "tripadvisor.com",
    "whitepages.com", "dnb.com", "yellowbook.com", "birdeye.com", "alignable.com", "brownbook.net",
    "ezlocal.com", "showmelocal.com", "cybo.com", "nicelocal.com",
    "angi.com", "angieslist.com", "homeadvisor.com", "thumbtack.com", "houzz.com", "porch.com",
    "healthgrades.com", "vitals.com", "zocdoc.com", "webmd.com", "npino.com", "npidb.org", "npiprofile.com",
    "sharecare.com", "doximity.com", "ratemds.com",
    # Restaurant and menu aggregators.
    "restaurantguru.com", "restaurantji.com", "allmenus.com", "menupix.com", "zmenu.com", "sirved.com",
    "singleplatform.com",
    "doordash.com", "grubhub.com", "ubereats.com", "opentable.com",
)
# Entries of FORBIDDEN_SITES that a business's own name can match too (a bar
# called The Chamber, a hyperbaric or salt chamber, a "Chamber of Horrors"). A
# site matched only by these is still never read, but an OpenStreetMap website
# value dropped for it goes to review (kind "website_in_doubt") instead of
# vanishing. A person who finds it is the business's own site adds its host to
# FORBIDDEN_SITE_EXCEPTIONS; the next sync then takes it as the website.
FORBIDDEN_SITES_IN_DOUBT: Tuple[str, ...] = ("*chamber.*", "chamberof*")
# Google Sites is a site builder: a business can publish its own website there.
# Hosts a person confirmed as a business's own site go here too.
FORBIDDEN_SITE_EXCEPTIONS: Tuple[str, ...] = ("sites.google.*",)

GIB = 1024 ** 3


def _env_float(env: Mapping[str, str], key: str, default: float) -> float:
    raw = env.get(key)
    if raw is None or raw == "":
        return default
    return float(raw)


def _env_int(env: Mapping[str, str], key: str, default: int) -> int:
    raw = env.get(key)
    if raw is None or raw == "":
        return default
    return int(raw)


def _env_flag(env: Mapping[str, str], key: str) -> bool:
    return env.get(key, "").strip().lower() in ("1", "true", "yes", "on")


def _base_url(raw: str) -> str:
    """``https://host`` (a port is allowed; no path, query, or login): the directory path is added to it."""
    text = raw.strip().rstrip("/")
    if not BASE_URL_RE.fullmatch(text):
        raise ValueError("LVA_PUBLIC_BASE_URL must be https:// and a host name, with no path")
    return text


@dataclass(frozen=True)
class Settings:
    data_dir: Path = Path("/var/lib/longview-archive")
    public_base_url: str = PUBLIC_BASE_URL
    user_agent: str = ""  # empty: built from public_base_url (user_agent_for)

    # Crawl politeness (the rules in the brief; do not loosen).
    max_sites_concurrent: int = 2
    min_host_delay_s: float = 20.0
    max_pages_per_visit: int = 6
    max_page_bytes: int = 2_500_000
    request_timeout_s: float = 20.0
    max_redirects: int = 5
    backoff_days: Tuple[int, ...] = (1, 3, 7, 14)
    reverify_days: int = 30
    robots_ttl_s: int = 86_400

    # Cadence.
    open_data_sync_days: int = 7
    osm_sync_days: int = 7
    npi_sync_days: int = 7
    status_every_s: int = 600
    publish_every_s: int = 2_700
    loop_idle_s: float = 5.0
    pause_poll_s: float = 30.0

    # Safety.
    disk_guard_bytes: int = 5 * GIB
    backup_keep: int = 14
    backup_local_time: str = "03:30"

    # Open data endpoints.
    socrata_base: str = "https://data.texas.gov"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    npi_url: str = "https://npiregistry.cms.hhs.gov/api/"
    api_min_interval_s: float = 1.0
    api_timeout_s: float = 60.0

    # Test-only escape hatch for the SSRF guard. Never set in production.
    allow_private_hosts: bool = False
    allow_fictional_phones: bool = False

    # Publishing.
    publish_scopes: Tuple[str, ...] = ("city",)
    indexable: bool = False

    extra: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "public_base_url", str(self.public_base_url).rstrip("/"))
        # The user agent names the About page where the directory is served, so it follows the base URL.
        if not self.user_agent:
            object.__setattr__(self, "user_agent", user_agent_for(self.public_base_url))

    @property
    def db_path(self) -> Path:
        return self.data_dir / "db" / "archive.db"

    @property
    def www_dir(self) -> Path:
        return self.data_dir / "www"

    @property
    def backup_dir(self) -> Path:
        return self.data_dir / "backups"

    @property
    def export_dir(self) -> Path:
        return self.data_dir / "exports"

    @property
    def publish_export_path(self) -> Path:
        return self.export_dir / "publish" / "directory.json"

    @property
    def approved_export_path(self) -> Path:
        """The batch a person (or auto-approve) approved: the only file the public site renders."""
        return self.export_dir / "publish" / "approved.json"

    @property
    def site_dir(self) -> Path:
        """The public directory Caddy serves at /longview/businesses/ (a link to the live build)."""
        return self.www_dir / "longview" / "businesses"

    @property
    def private_export_dir(self) -> Path:
        return self.export_dir / "private"

    @property
    def pause_file(self) -> Path:
        return self.data_dir / "PAUSE"

    def ensure_dirs(self) -> None:
        """Create the data layout with the permissions the installer uses.

        The top directory is traverse-only so Caddy can reach ``www`` while the
        database, backups, and exports stay private to the service user.
        """
        self.data_dir.mkdir(parents=True, exist_ok=True)
        for path, mode in (
            (self.db_path.parent, 0o700),
            (self.backup_dir, 0o700),
            (self.export_dir, 0o700),
            (self.publish_export_path.parent, 0o700),
            (self.private_export_dir, 0o700),
            (self.www_dir, 0o755),
            (self.www_dir / "status", 0o755),
            (self.www_dir / "longview", 0o755),
        ):
            path.mkdir(parents=True, exist_ok=True)
            try:
                os.chmod(path, mode)
            except PermissionError:
                pass


# One optional settings file shared by the service and the ``lva`` command line,
# so both build the same links. Root owns it; the service only reads it
# (ProtectSystem=strict leaves /etc readable). install.sh writes it when a
# public host is chosen; nothing else is required to exist.
ENV_FILE = Path("/etc/longview-archive/env")
ENV_LINE_RE = re.compile(r"(LVA_[A-Z0-9_]+)=(.*)")
# The only keys the file may set: where the directory is served. Crawl limits,
# the indexing switch, the user agent, endpoints, paths, and the test-only
# escape hatches (LVA_ALLOW_PRIVATE_HOSTS) are never read from it; a line
# naming one is a settings problem, so it cannot slip in unnoticed.
ENV_FILE_KEYS = frozenset({"LVA_PUBLIC_BASE_URL", "LVA_PUBLIC_HOST"})


def _env_file_value(raw: str) -> str:
    """One value: a quoted value is what is inside its quotes; an unquoted one
    ends at an inline `` #`` comment. Surrounding spaces never count."""
    value = raw.strip()
    if value[:1] in ("'", '"'):
        end = value.find(value[0], 1)
        if end < 0:
            raise ValueError("unclosed quote")
        rest = value[end + 1:].strip()
        if rest and not rest.startswith("#"):
            raise ValueError("text after the closing quote")
        return value[1:end]
    match = re.search(r"\s#", value)
    if match:
        value = value[:match.start()]
    return value.strip()


def read_env_file(path: Path | None = None) -> dict:
    """``KEY=VALUE`` lines from ``path`` (default ``ENV_FILE``).

    Only the keys in ``ENV_FILE_KEYS`` are read. ``#`` comment lines, blank
    lines, and lines that are not ``LVA_*`` assignments are skipped. A value
    may be quoted; an unquoted value ends at an inline `` #`` comment. Any
    other ``LVA_*`` key, or a value that cannot be read, raises ValueError
    (the engine reports it as a settings problem). A missing file is an empty
    result. install.sh reads the file through this same function."""
    path = ENV_FILE if path is None else path
    try:
        text = Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        return {}
    except OSError as exc:
        raise ValueError(f"cannot read {path} ({type(exc).__name__})") from exc
    values = {}
    for number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        m = ENV_LINE_RE.fullmatch(line)
        if not m:
            continue
        key = m.group(1)
        if key not in ENV_FILE_KEYS:
            allowed = ", ".join(sorted(ENV_FILE_KEYS))
            raise ValueError(f"{path} line {number}: {key} cannot be set there (only {allowed})")
        try:
            values[key] = _env_file_value(m.group(2))
        except ValueError as exc:
            raise ValueError(f"{path} line {number}: {key}: {exc}") from None
    return values


def environment(env: Mapping[str, str] | None = None, path: Path | None = None) -> dict:
    """The settings file under the real environment: a variable that is set wins."""
    env = os.environ if env is None else env
    merged = read_env_file(path)
    merged.update(env)
    return merged


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    env = os.environ if env is None else env
    kwargs = {}
    if env.get("LVA_DATA_DIR"):
        kwargs["data_dir"] = Path(env["LVA_DATA_DIR"])
    if env.get("LVA_PUBLIC_BASE_URL"):
        kwargs["public_base_url"] = _base_url(env["LVA_PUBLIC_BASE_URL"])
    if env.get("LVA_USER_AGENT"):
        kwargs["user_agent"] = env["LVA_USER_AGENT"]
    kwargs["max_sites_concurrent"] = _env_int(env, "LVA_MAX_SITES", 2)
    kwargs["min_host_delay_s"] = _env_float(env, "LVA_MIN_HOST_DELAY", 20.0)
    kwargs["max_pages_per_visit"] = _env_int(env, "LVA_MAX_PAGES", 6)
    kwargs["max_page_bytes"] = _env_int(env, "LVA_MAX_PAGE_BYTES", 2_500_000)
    kwargs["request_timeout_s"] = _env_float(env, "LVA_TIMEOUT", 20.0)
    kwargs["disk_guard_bytes"] = _env_int(env, "LVA_DISK_GUARD_BYTES", 5 * GIB)
    kwargs["status_every_s"] = _env_int(env, "LVA_STATUS_EVERY", 600)
    kwargs["publish_every_s"] = _env_int(env, "LVA_PUBLISH_EVERY", 2_700)
    kwargs["loop_idle_s"] = _env_float(env, "LVA_LOOP_IDLE", 5.0)
    kwargs["pause_poll_s"] = _env_float(env, "LVA_PAUSE_POLL", 30.0)
    kwargs["api_min_interval_s"] = _env_float(env, "LVA_API_MIN_INTERVAL", 1.0)
    if env.get("LVA_SOCRATA_BASE"):
        kwargs["socrata_base"] = env["LVA_SOCRATA_BASE"].rstrip("/")
    if env.get("LVA_OVERPASS_URL"):
        kwargs["overpass_url"] = env["LVA_OVERPASS_URL"]
    if env.get("LVA_NPI_URL"):
        kwargs["npi_url"] = env["LVA_NPI_URL"]
    kwargs["allow_private_hosts"] = _env_flag(env, "LVA_ALLOW_PRIVATE_HOSTS")
    kwargs["allow_fictional_phones"] = _env_flag(env, "LVA_ALLOW_FICTIONAL_PHONES")
    kwargs["indexable"] = _env_flag(env, "LVA_INDEXABLE")
    settings = Settings(**kwargs)
    # The politeness floor is not configurable downward in production. Tests
    # lower it only together with the private-host escape hatch.
    if not settings.allow_private_hosts:
        if settings.min_host_delay_s < 20.0 or settings.max_sites_concurrent > 2:
            raise ValueError(
                "Crawl politeness limits cannot be loosened outside tests"
            )
        if settings.max_pages_per_visit > 6 or settings.max_page_bytes > 2_500_000:
            raise ValueError("Crawl size limits cannot be raised outside tests")
    return settings
