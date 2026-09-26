"""Settings for the Longview Business Archive.

Defaults are the production values for the LeadFlow droplet. Every path and
network endpoint can be overridden with an ``LVA_*`` environment variable so
tests never touch real paths or the network. Nothing here is a secret, and the
engine talks to no code host or deploy service: the public directory is built
on the droplet and served by Caddy from ``www/``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping, Tuple

VERSION = "1.0.0"

TIMEZONE = "America/Chicago"
CONTACT_EMAIL = "hello@theleadflowpro.com"
SITE_URL = "https://www.theleadflowpro.com"
DIRECTORY_PATH = "/longview/businesses"
DIRECTORY_URL = SITE_URL + DIRECTORY_PATH
ABOUT_URL = DIRECTORY_URL + "/about"
# The staging host Caddy serves on the droplet (status page and directory).
STAGING_HOST = "longview.165-227-248-110.sslip.io"

USER_AGENT = (
    "LeadFlowPro-LongviewArchive/1.0 "
    f"(+{ABOUT_URL}; {CONTACT_EMAIL})"
)

# City of Longview delivery ZIPs. Other ZIPs seen with city LONGVIEW are
# reported on the status page and kept in the hidden "nearby" bucket until a
# person verifies them against USPS and the data.
LONGVIEW_ZIPS: Tuple[str, ...] = ("75601", "75602", "75603", "75604", "75605")

EAST_TEXAS_AREA_CODES: Tuple[str, ...] = ("903", "430")

SCOPE_LABEL = "City of Longview, Texas"

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


@dataclass(frozen=True)
class Settings:
    data_dir: Path = Path("/var/lib/longview-archive")
    user_agent: str = USER_AGENT

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


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    env = os.environ if env is None else env
    kwargs = {}
    if env.get("LVA_DATA_DIR"):
        kwargs["data_dir"] = Path(env["LVA_DATA_DIR"])
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
