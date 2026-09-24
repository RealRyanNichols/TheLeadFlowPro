"""The fixture internet and a driver that runs the whole engine against it.

Everything here is fictional: ``.example`` hosts, 903-555-01xx and 214-555-01xx
numbers, names like "Example Tire & Lube", and made-up streets ("Example St",
"Sample Ave", "Fixture Rd", "Placeholder Dr"). Nothing touches the network:

* ``FakeApi`` answers the open-data APIs (Socrata catalog, views, and rows;
  Overpass; NPI per ZIP) from ``api/*.json`` through ``sources/http.py``'s
  transport hook.
* ``FakeWeb`` answers the PoliteFetcher from ``sites/<host>/`` (``/`` is
  ``index.html``, ``/robots.txt`` is ``robots.txt``, ``/a`` is ``a.html``);
  ``_routes.json`` in a site adds redirects, challenges, and 429s. Its
  resolver hands every fixture host a public-looking address and fails any
  other name like DNS would.
* ``FakeClock`` is both the monotonic and the wall clock; its ``sleep``
  advances time at once, so the real 20-second spacing costs nothing.

``run_pipeline`` drives the modules the way the service does (syncs, matching,
due/visit/apply until nothing is due, publish, status) into a data directory.
The end-to-end test and ``tests/make_sample_directory.py`` both use it.
"""

from __future__ import annotations

import json
import re
import socket
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from unittest import mock
from urllib.parse import parse_qs, urlsplit

from longview_archive import categories, db, matching, privacy, publish, status, worker
from longview_archive.config import Settings
from longview_archive.fetcher import Headers, PoliteFetcher, RawResponse, TransportError
from longview_archive.sources import comptroller, http, npi, osm, tabc

HERE = Path(__file__).resolve().parent
API = HERE / "api"
SITES = HERE / "sites"

SOCRATA_HOST = "data.texas.example"
OVERPASS_HOST = "overpass.example"
NPI_HOST = "npiregistry.example"
PUBLIC_IP = "93.184.216.34"
START = datetime(2026, 9, 24, 13, 0, 0, tzinfo=timezone.utc)

# Private values planted in the fixture data. None may ever leave the engine.
TAXPAYER_NAMES = (
    "EXAMPLE FOOD HOLDINGS LLC", "EXAMPLE AUTO GROUP INC", "PUBLIC, JOHN Q", "DOE, JANE A",
    "EXAMPLE AGRI HOLDINGS LLC", "EXAMPLE STORAGE PARTNERS LP", "EXAMPLE GROOMING CO LLC",
    "EXAMPLE BAKING COMPANY LLC", "EXAMPLE GLASS WORKS INC", "EXAMPLE FLORAL DESIGNS LLC",
    "EXAMPLE PAWN HOLDINGS INC", "EXAMPLE RISK PARTNERS LLC", "EXAMPLE EAST HOLDINGS LLC",
)
TAXPAYER_NUMBERS = tuple(f"320000000{n:02d}" for n in (1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15))
PERSON_NAMES = ("John Q Public", "Public, John", "Jane A Doe", "Doe, Jane", "Richard Roe", "Roe, Richard")
NPI_OFFICIAL = ("RICHARD", "ROE")
PRIVATE_EMAILS = ("jsmith@exampletire.example",)

_SAFE_PATH = re.compile(r"^/(?:[a-z0-9][a-z0-9._\-]*/)*[a-z0-9][a-z0-9._\-]*$|^/$")


# ---------------------------------------------------------------- clocks

class FakeClock:
    """One timeline for monotonic time, wall time, and sleep (which returns at once)."""

    def __init__(self, start: datetime = START):
        self.base = start.timestamp()
        self.t = 0.0
        self.slept: List[float] = []

    def monotonic(self) -> float:
        return self.t

    def time(self) -> float:
        return self.base + self.t

    def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)
        self.t += max(0.0, float(seconds))

    def advance(self, seconds: float) -> None:
        self.t += float(seconds)

    def now(self) -> datetime:
        return datetime.fromtimestamp(self.time(), tz=timezone.utc)

    def iso(self) -> str:
        return db.now_iso(self.now())


# ---------------------------------------------------------------- the web

class FakeWeb:
    """Fixture websites for the PoliteFetcher: a transport plus a resolver."""

    def __init__(self, root: Path = SITES, clock: Optional[FakeClock] = None):
        self.root = Path(root)
        self.clock = clock
        self.requests: List[str] = []
        self.timeline: List[Tuple[float, str]] = []  # (monotonic time, url) when a clock is set
        self.overrides: Dict[tuple, tuple] = {}  # (host, path) -> (status, headers, body)

    def hosts(self) -> List[str]:
        return sorted(p.name for p in self.root.iterdir() if p.is_dir())

    def resolver(self, host, port, *args, **kwargs):
        if (self.root / str(host).lower()).is_dir():
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (PUBLIC_IP, port))]
        raise socket.gaierror(socket.EAI_NONAME, "Name or service not known")

    def override(self, url: str, status: int = 200, headers: Optional[dict] = None, body: bytes = b"") -> None:
        parts = urlsplit(url)
        self.overrides[((parts.hostname or "").lower(), parts.path or "/")] = (
            status, headers or {"Content-Type": "text/html; charset=utf-8"}, body)

    def page_requests(self, host: Optional[str] = None) -> List[str]:
        """Requested URLs other than robots.txt, optionally for one host."""
        return [u for u in self.requests if not u.endswith("/robots.txt")
                and (host is None or urlsplit(u).hostname == host)]

    def read(self, host: str, path: str) -> bytes:
        return self._file(self.root / host, path).read_bytes()

    @staticmethod
    def _file(site: Path, path: str) -> Path:
        if path == "/":
            return site / "index.html"
        rel = path.strip("/")
        if "." in rel.rsplit("/", 1)[-1]:
            return site / rel
        return site / f"{rel}.html"

    def __call__(self, url: str, headers, timeout: float, max_bytes: int) -> RawResponse:
        parts = urlsplit(url)
        host = (parts.hostname or "").lower()
        path = parts.path or "/"
        self.requests.append(url)
        if self.clock is not None:
            self.timeline.append((self.clock.monotonic(), url))
        if (host, path) in self.overrides:
            status_code, hdrs, body = self.overrides[(host, path)]
            return RawResponse(status_code, Headers(hdrs), body, False)
        site = self.root / host
        if not site.is_dir():
            raise TransportError("connect", "no such fixture host")
        routes_file = site / "_routes.json"
        routes = json.loads(routes_file.read_text(encoding="utf-8")) if routes_file.exists() else {}
        route = routes.get(path)
        if route is not None:
            body = (site / route["file"]).read_bytes() if route.get("file") else b""
            return RawResponse(int(route.get("status", 200)), Headers(route.get("headers") or {}), body, False)
        if not _SAFE_PATH.match(path):
            return RawResponse(404, Headers({"Content-Type": "text/html"}), b"<h1>Not found</h1>", False)
        target = self._file(site, path)
        if not target.is_file():
            return RawResponse(404, Headers({"Content-Type": "text/html"}), b"<h1>Not found</h1>", False)
        body = target.read_bytes()
        suffix = target.suffix.lower()
        ctype = {".html": "text/html; charset=utf-8", ".txt": "text/plain", ".pdf": "application/pdf",
                 ".jpg": "image/jpeg"}.get(suffix, "application/octet-stream")
        truncated = len(body) > max_bytes
        return RawResponse(200, Headers({"Content-Type": ctype}), body[: max_bytes + 1], truncated)


# ---------------------------------------------------------------- the open-data APIs

def load_api(name: str) -> Any:
    return json.loads((API / name).read_text(encoding="utf-8"))


class FakeApi:
    """Socrata, Overpass, and NPI answers for sources/http.py (method, url, headers, body, timeout)."""

    def __init__(self):
        self.calls: List[str] = []
        self.catalog = load_api("sales_tax_catalog.json")
        self.views = {"lvex-0001": load_api("sales_tax_view.json")}
        self.rows = {"lvex-0001": load_api("sales_tax_rows.json")}
        self.overpass = load_api("overpass.json")
        self.npi = {"75605": load_api("npi_75605.json")}
        self.npi_empty = load_api("npi_empty.json")

    @staticmethod
    def _json(value: Any):
        return 200, {"Content-Type": "application/json"}, json.dumps(value).encode("utf-8")

    def __call__(self, method: str, url: str, headers, body, timeout):
        self.calls.append(f"{method} {url}")
        parts = urlsplit(url)
        host = (parts.hostname or "").lower()
        query = {k: v[-1] for k, v in parse_qs(parts.query, keep_blank_values=True).items()}
        if host == SOCRATA_HOST and method == "GET":
            if parts.path == "/api/catalog/v1":
                return self._json(self.catalog)
            m = re.fullmatch(r"/api/views/([a-z0-9]{4}-[a-z0-9]{4})\.json", parts.path)
            if m and m.group(1) in self.views:
                return self._json(self.views[m.group(1)])
            m = re.fullmatch(r"/resource/([a-z0-9]{4}-[a-z0-9]{4})\.json", parts.path)
            if m and m.group(1) in self.rows:
                offset, limit = int(query.get("$offset", 0)), int(query.get("$limit", 1000))
                return self._json(self.rows[m.group(1)][offset:offset + limit])
        if host == OVERPASS_HOST and method == "POST" and parts.path == "/api/interpreter":
            return self._json(self.overpass)
        if host == NPI_HOST and method == "GET":
            return self._json(self.npi.get(query.get("postal_code", ""), self.npi_empty))
        return 404, {"Content-Type": "application/json"}, b'{"message": "no fixture route"}'


# ---------------------------------------------------------------- settings and the run

def make_settings(data_dir: Path, **overrides) -> Settings:
    values = dict(
        data_dir=Path(data_dir),
        socrata_base=f"https://{SOCRATA_HOST}",
        overpass_url=f"https://{OVERPASS_HOST}/api/interpreter",
        npi_url=f"https://{NPI_HOST}/api/",
        api_min_interval_s=0.0,
        allow_fictional_phones=True,
    )
    values.update(overrides)
    settings = Settings(**values)
    assert settings.min_host_delay_s == 20.0 and not settings.allow_private_hosts
    return settings


def make_fetcher(settings: Settings, web: FakeWeb, clock: FakeClock) -> PoliteFetcher:
    return PoliteFetcher(settings, transport=web, clock=clock.monotonic, wall_clock=clock.time,
                         sleep=clock.sleep, resolver=web.resolver)


def suppress(conn, kind: str, value: str, reason: str, now: str) -> None:
    """The row ``lva suppress`` writes (SPEC: honored at ingest, crawl, and export)."""
    with db.transaction(conn):
        conn.execute(
            "INSERT OR IGNORE INTO suppressions(kind, value, reason, created_at) VALUES (?,?,?,?)",
            (kind, value, reason, now),
        )


def business_id(conn, name: str, street_norm: Optional[str] = None) -> int:
    sql, params = "SELECT id FROM businesses WHERE name=?", [name]
    if street_norm:
        sql += " AND street_norm=?"
        params.append(street_norm)
    rows = conn.execute(sql + " ORDER BY id", params).fetchall()
    if len(rows) != 1:
        raise LookupError(f"expected one business named {name!r}, found {len(rows)}")
    return int(rows[0]["id"])


@dataclass
class PipelineRun:
    settings: Settings
    conn: Any
    clock: FakeClock
    web: FakeWeb
    api: FakeApi
    fetcher: PoliteFetcher
    sync_counts: Dict[str, dict] = field(default_factory=dict)
    match_counts: List[dict] = field(default_factory=list)
    outcomes: Dict[str, str] = field(default_factory=dict)  # public_id -> apply_visit outcome
    visits: int = 0
    publish_counts: Dict[str, int] = field(default_factory=dict)
    suppressed_id: Optional[str] = None

    @property
    def export_path(self) -> Path:
        return self.settings.publish_export_path

    def export(self) -> dict:
        return json.loads(self.export_path.read_text(encoding="utf-8"))

    def status_json(self) -> dict:
        return json.loads((self.settings.www_dir / "status.json").read_text(encoding="utf-8"))


def run_pipeline(data_dir: Path, start: datetime = START, max_batches: int = 200) -> PipelineRun:
    """Syncs -> matching -> crawl until nothing is due -> publish -> status, all offline."""
    settings = make_settings(data_dir)
    settings.ensure_dirs()
    conn = db.connect(settings.db_path)
    db.migrate(conn)
    with db.transaction(conn):
        categories.seed(conn)
    clock = FakeClock(start)
    web = FakeWeb(clock=clock)
    api = FakeApi()
    fetcher = make_fetcher(settings, web, clock)
    run = PipelineRun(settings, conn, clock, web, api, fetcher)

    with mock.patch.object(http, "sleep", clock.sleep), mock.patch.object(http, "clock", clock.monotonic):
        http.reset_rate_limits()
        # Primary sources first, then OpenStreetMap; matching after each, as the service does.
        run.sync_counts["tx_sales_tax"] = comptroller.sync_sales_tax(conn, settings, now=clock.iso(), transport=api)
        run.match_counts.append(matching.match_pending(conn, clock.iso()))
        run.sync_counts["tx_tabc"] = tabc.sync_tabc(conn, settings, now=clock.iso(), transport=api)
        run.match_counts.append(matching.match_pending(conn, clock.iso()))
        run.sync_counts["npi"] = npi.sync_npi(conn, settings, now=clock.iso(), transport=api)
        run.match_counts.append(matching.match_pending(conn, clock.iso()))
        run.sync_counts["osm"] = osm.sync_osm(conn, settings, now=clock.iso(), transport=api)
        run.match_counts.append(matching.match_pending(conn, clock.iso()))

    # A removal request arrives (``lva suppress --id lv-...``) before any crawling.
    bakery = conn.execute("SELECT public_id FROM businesses WHERE id=?",
                          (business_id(conn, "Example Bakery"),)).fetchone()["public_id"]
    suppress(conn, "public_id", bakery, "owner asked", clock.iso())
    run.suppressed_id = bakery

    worker.load_host_state(conn, fetcher)
    for _ in range(max_batches):
        clock.advance(1.0)
        due = worker.due_businesses(conn, settings, clock.iso(), settings.max_sites_concurrent)
        if not due:
            break
        for snap in due:
            result = worker.visit(snap, fetcher, settings)
            run.outcomes[snap.public_id] = worker.apply_visit(conn, snap, result, settings, clock.iso())
            run.visits += 1
        worker.persist_host_state(conn, fetcher)
    else:  # pragma: no cover - a loop that never drains is a bug
        raise AssertionError("the crawl never ran out of due businesses")

    run.publish_counts = publish.run_publish(conn, settings, clock.iso())
    with db.transaction(conn):
        db.set_meta(conn, "state", "running")
        db.set_meta(conn, "heartbeat_at", clock.iso())
        db.set_meta(conn, "disk_free_bytes", str(40 * 1024 ** 3))
    status.write_status(settings, status.collect(conn, settings, clock.iso()))
    return run


def suppressed_business(conn, public_id: str) -> bool:
    row = conn.execute("SELECT * FROM businesses WHERE public_id=?", (public_id,)).fetchone()
    return row is not None and privacy.is_suppressed(conn, row)
