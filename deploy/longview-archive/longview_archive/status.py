"""The private status page: counts and job times, never a business.

Caddy serves ``www/`` with ``default-src 'none'; style-src 'self'``, so the
page is static HTML with one local stylesheet: no scripts, no inline styles,
no external URLs. It is noindex and unlinked. It carries counts and source or
dataset names only; error messages are scrubbed of links, emails, phone
numbers, and any business name or website host before they are shown.
"""

from __future__ import annotations

import html
import json
import logging
import re
import sqlite3
from datetime import timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

from . import approval, config, db, normalize
from .publish import as_datetime, atomic_write, local_date, resolve_now, to_local

log = logging.getLogger(__name__)

STATES = ("running", "paused", "disk_guard", "starting", "stopping")
STATE_LINES = {
    "running": "Running",
    "paused": "Paused: the PAUSE file is present",
    "disk_guard": "Crawling stopped: free disk space is low",
    "starting": "Starting",
    "stopping": "Stopping",
}
FACT_FIELDS = ("website", "phone", "email", "hours", "facebook", "instagram", "careers", "services")
SOURCE_ORDER = ("tx_sales_tax", "tx_tabc", "osm", "npi", "website")
SALES_TAX_RUN_KINDS = ("sync_tx_sales_tax", "sync_sales_tax")
ROBOTS_TXT = "User-agent: *\nDisallow: /\n"
STALE_HEARTBEAT_MIN = 15

_URL = re.compile(r"\b[a-z][a-z0-9+.-]*://\S+", re.I)
_EMAIL = re.compile(r"[\w.+'-]+@[\w-]+(?:\.[\w-]+)+")
_PHONE = re.compile(r"(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)")
_HOST = re.compile(r"\b(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]+\b", re.I)


# ---------------------------------------------------------------- collect

def _one(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> int:
    return int(conn.execute(sql, params).fetchone()[0] or 0)


def _private_terms(conn: sqlite3.Connection) -> Tuple[List[str], Set[str]]:
    """Business names (longest first) and website domains that must never show up."""
    names, domains = set(), set()
    for sql in ("SELECT name FROM businesses", "SELECT name FROM source_records"):
        for (value,) in conn.execute(sql):
            if value and len(str(value).strip()) >= 4:
                names.add(str(value).strip().lower())
    for sql in (
        "SELECT website_domain FROM businesses",
        "SELECT website_domain FROM source_records",
        "SELECT host FROM host_state",
    ):
        for (value,) in conn.execute(sql):
            if value:
                domains.add(normalize.registrable_domain(str(value)))
    domains.discard("")
    return sorted(names, key=lambda t: (-len(t), t)), domains


def scrub(message: Optional[str], names: List[str] = (), domains: Set[str] = frozenset(),
          limit: int = 200) -> str:
    """An error message with links, emails, phones, business hosts, and names removed."""
    text = re.sub(r"\s+", " ", str(message or "")).strip()
    text = _URL.sub("[link]", text)
    text = _EMAIL.sub("[email]", text)
    text = _PHONE.sub("[number]", text)
    if domains:
        text = _HOST.sub(
            lambda m: "[host]" if normalize.registrable_domain(m.group(0)) in domains else m.group(0), text
        )
    lowered = text.lower()
    for term in names:
        start = lowered.find(term)
        while start != -1:
            text = text[:start] + "[name]" + text[start + len(term):]
            lowered = text.lower()
            start = lowered.find(term, start + len("[name]"))
    return text[:limit]


def _other_zips(conn: sqlite3.Connection) -> Dict[str, int]:
    marks = ",".join("?" * len(SALES_TAX_RUN_KINDS))
    row = conn.execute(
        f"SELECT counts_json FROM runs WHERE kind IN ({marks}) AND counts_json IS NOT NULL"
        " AND status IN ('ok','partial') ORDER BY started_at DESC, id DESC LIMIT 1",
        SALES_TAX_RUN_KINDS,
    ).fetchone()
    if row is None:
        return {}
    try:
        counts = json.loads(row["counts_json"])
    except ValueError:
        return {}
    zips = counts.get("other_zips", counts.get("otherZips")) if isinstance(counts, dict) else None
    if not isinstance(zips, dict):
        return {}
    return {
        z: int(n) for z, n in sorted(zips.items())
        if re.fullmatch(r"\d{5}", str(z)) and z not in config.LONGVIEW_ZIPS
        and isinstance(n, int) and not isinstance(n, bool)
    }


def collect(conn: sqlite3.Connection, settings, now: Any = None) -> dict:
    """Counts for the status page. Never a name, address, phone, email, or URL."""
    now_dt = resolve_now(now)
    now_s = db.now_iso(now_dt)
    week_ago = db.now_iso(now_dt - timedelta(days=7))
    permits_since = local_date(now_dt - timedelta(days=90))

    state = db.get_meta(conn, "state") or "starting"
    free_raw = db.get_meta(conn, "disk_free_bytes")
    try:
        free = int(free_raw) if free_raw not in (None, "") else None
    except ValueError:
        free = None

    publish = {s: 0 for s in ("ready", "review", "held", "suppressed", "pending")}
    for row in conn.execute("SELECT publish_state, COUNT(*) AS n FROM businesses GROUP BY publish_state"):
        publish[row["publish_state"]] = int(row["n"])

    facts_verified = {f: 0 for f in FACT_FIELDS}
    for row in conn.execute("SELECT field, COUNT(*) AS n FROM facts GROUP BY field"):
        if row["field"] in facts_verified:
            facts_verified[row["field"]] = int(row["n"])

    review_open = {
        row["kind"]: int(row["n"])
        for row in conn.execute(
            "SELECT kind, COUNT(*) AS n FROM review_queue WHERE status='open' GROUP BY kind ORDER BY kind"
        )
    }

    crawl = {"due": _one(
        conn,
        "SELECT COUNT(*) FROM businesses WHERE active=1 AND IFNULL(website,'')<>''"
        " AND scope IN ('city','nearby') AND publish_state<>'suppressed'"
        " AND (next_crawl_at IS NULL OR next_crawl_at<=?)",
        (now_s,),
    )}
    for status in ("ok", "blocked", "dead", "moved"):
        crawl[status] = _one(
            conn, "SELECT COUNT(*) FROM businesses WHERE active=1 AND website_status=?", (status,)
        )
    crawl["hostsInBackoff"] = _one(conn, "SELECT COUNT(*) FROM host_state WHERE backoff_until>?", (now_s,))

    sources = []
    rows = {r["id"]: r for r in conn.execute("SELECT * FROM sources")}
    for source_id in list(SOURCE_ORDER) + sorted(set(rows) - set(SOURCE_ORDER)):
        r = rows.get(source_id)
        if r is None:
            continue
        sources.append({
            "id": source_id,
            "name": scrub(r["name"]),
            "lastSyncedAt": r["last_synced_at"],
            "status": scrub(r["last_status"], limit=40) or None,
            "rows": r["row_count"],
        })

    error_rows = conn.execute(
        "SELECT kind, started_at, finished_at, error FROM runs WHERE status='error'"
        " ORDER BY COALESCE(finished_at, started_at) DESC, id DESC LIMIT 20"
    ).fetchall()
    names, domains = _private_terms(conn) if error_rows else ([], set())
    errors = [
        {"kind": r["kind"], "at": r["finished_at"] or r["started_at"],
         "message": scrub(r["error"], names, domains)}
        for r in error_rows
    ]

    return {
        "generatedAt": now_s,
        "version": config.VERSION,
        "state": state,
        "heartbeatAt": db.get_meta(conn, "heartbeat_at"),
        "archive": {
            "businesses": _one(conn, "SELECT COUNT(*) FROM businesses WHERE active=1"),
            "inCity": _one(conn, "SELECT COUNT(*) FROM businesses WHERE active=1 AND scope='city'"),
            "nearby": _one(conn, "SELECT COUNT(*) FROM businesses WHERE active=1 AND scope='nearby'"),
            "withWebsite": _one(conn, "SELECT COUNT(*) FROM businesses WHERE active=1 AND IFNULL(website,'')<>''"),
            "readThisWeek": _one(
                conn, "SELECT COUNT(*) FROM businesses WHERE last_crawled_at>=? AND last_crawled_at<=?",
                (week_ago, now_s)),
        },
        "factsVerified": facts_verified,
        "publish": publish,
        "reviewOpen": review_open,
        "newThisWeek": _one(
            conn, "SELECT COUNT(*) FROM businesses WHERE scope='city' AND first_seen_at>=? AND first_seen_at<=?",
            (week_ago, now_s)),
        "newPermits90d": _one(
            conn, "SELECT COUNT(*) FROM businesses WHERE active=1 AND scope='city' AND permit_start>=?",
            (permits_since,)),
        "hiringSignals": _one(conn, "SELECT COUNT(*) FROM hiring_signals WHERE active=1"),
        "crawl": crawl,
        "sources": sources,
        "otherZips": _other_zips(conn),
        "errors": errors,
        "disk": {
            "freeGb": round(free / config.GIB, 1) if free is not None else None,
            "guard": free is not None and free < settings.disk_guard_bytes,
        },
        "lastExportAt": db.get_meta(conn, "last_export_at"),
        "directorySite": _site_info(conn, settings),
    }


def _site_info(conn: sqlite3.Connection, settings) -> dict:
    try:
        return approval.status_info(conn, settings)
    except Exception as exc:  # noqa: BLE001 - the page is informational; never fail it for this box
        log.warning("directory site status unreadable: %s", type(exc).__name__)
        return {}


# ---------------------------------------------------------------- render

def _when(value: Any) -> str:
    dt = to_local(value)
    if dt is None:
        return "Not yet"
    hour = dt.hour % 12 or 12
    return f"{dt:%b} {dt.day}, {dt.year}, {hour}:{dt:%M} {'AM' if dt.hour < 12 else 'PM'} {dt.tzname()}"


def _minutes(delta_seconds: float) -> str:
    minutes = int(max(delta_seconds, 0) // 60)
    if minutes < 1:
        return "less than a minute"
    return "1 minute" if minutes == 1 else f"{minutes:,} minutes"


def _n(value: Any) -> str:
    return f"{value:,}" if isinstance(value, int) and not isinstance(value, bool) else "–"


def _e(value: Any) -> str:
    return html.escape(str(value), quote=True)


def _label(kind: str) -> str:
    return _e(str(kind).replace("_", " ").capitalize())


REVIEW_LABELS = {
    "field_conflict": "A new value differs from a checked one",
    "low_confidence": "Found with low confidence",
    "ambiguous_ampm": "Hours without clear am/pm",
    "phone_out_of_area": "Phone outside 903/430",
    "social_mismatch": "Social link may not be theirs",
    "website_identity": "Website may not be theirs",
    "person_name_check": "Name may be a person's",
    "merge_ambiguous": "Records may be the same place",
}
PUBLISH_LABELS = (
    ("ready", "Ready to publish"),
    ("review", "Waiting for review"),
    ("held", "Held (privacy, scope, or inactive)"),
    ("suppressed", "Removed on request"),
    ("pending", "Not decided yet"),
)


def _dl(items) -> str:
    rows = "".join(f"<div><dt>{_e(k)}</dt><dd>{v}</dd></div>" for k, v in items)
    return f'<dl class="pairs">{rows}</dl>'


def _table(caption: str, headers, rows, empty: str) -> str:
    if not rows:
        return f'<p class="muted">{_e(empty)}</p>'
    head = "".join(f'<th scope="col">{_e(h)}</th>' for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>" for row in rows)
    return (f'<div class="table-wrap"><table><caption>{_e(caption)}</caption>'
            f"<thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>")


def _section(ident: str, title: str, body: str) -> str:
    return f'<section aria-labelledby="{ident}"><h2 id="{ident}">{_e(title)}</h2>{body}</section>'


def _directory_site(info: dict) -> str:
    """The approved batch, the last build, auto-approve, and what waits: ids, times, and counts only."""
    if not info:
        return '<p class="muted">Not known yet.</p>'
    batch = info.get("approvedBatchId")
    shown = info.get("shownBusinesses")
    items = [
        ("Approved batch", _e(f"{batch} ({_n(info.get('approvedBusinesses'))} businesses)") if batch
         else "None yet: the site says the first batch is being checked"),
        ("Businesses on the site", _n(shown if shown is not None else 0)),
        ("Last built", _e(_when(info.get("builtAt")))),
        ("Auto-approve", "On (holds a batch that removes more than 25%)" if info.get("autoApprove") else "Off"),
    ]
    if info.get("droppedByChecks"):
        items.append(("Left out by the site's checks", f'<span class="warn">{_n(info.get("droppedByChecks"))}</span>'))
    waiting = info.get("waiting")
    if waiting:
        items.append(("Waiting for approval", _e(
            f"{waiting.get('added', 0):,} new, {waiting.get('removed', 0):,} removed,"
            f" {waiting.get('changed', 0):,} changed (batch {waiting.get('batchId')},"
            f" {waiting.get('businesses', 0):,} businesses)")))
    else:
        items.append(("Waiting for approval", "Nothing"))
    held = info.get("heldForPerson")
    if held:
        items.append(("Needs a person", '<span class="warn">' + _e(
            f"Auto-approve is holding batch {held.get('batchId')}: it would remove {held.get('removed', 0):,} of"
            f" the {held.get('approved', 0):,} approved businesses. Check it, then run: lva approve") + "</span>"))
    items.append(("Search engines", "Allowed (indexable)" if info.get("indexable") else "Kept out (noindex)"))
    return _dl(items) + '<p><a href="/longview/businesses/">Open the directory</a></p>'


def render_html(data: dict) -> str:
    written = as_datetime(data.get("generatedAt"))
    state = data.get("state")
    state_line = STATE_LINES.get(state, "State unknown")
    state_class = "ok" if state == "running" else "warn"

    heartbeat = as_datetime(data.get("heartbeatAt"))
    if heartbeat is None or written is None:
        beat = "No heartbeat has been recorded yet."
        beat_class = "warn"
    else:
        age = (written - heartbeat).total_seconds()
        beat = f"Last heartbeat {_e(_when(heartbeat))}, {_minutes(age)} before this page was written."
        beat_class = "muted"
        if age > STALE_HEARTBEAT_MIN * 60:
            beat += " The engine may have stopped."
            beat_class = "warn"

    archive = data.get("archive", {})
    publish = data.get("publish", {})
    crawl = data.get("crawl", {})
    disk = data.get("disk", {})

    stats = [
        ("In the city", archive.get("inCity")),
        ("Ready to publish", publish.get("ready")),
        ("Waiting for review", publish.get("review")),
        ("Held", publish.get("held")),
        ("Websites read this week", archive.get("readThisWeek")),
        ("New this week", data.get("newThisWeek")),
        ("New permits, 90 days", data.get("newPermits90d")),
        ("Hiring signals", data.get("hiringSignals")),
    ]
    stat_html = "".join(f'<div class="stat"><dt>{_e(k)}</dt><dd>{_n(v)}</dd></div>' for k, v in stats)

    parts = [
        '<header class="top">',
        '<p class="eyebrow">The LeadFlow Pro · private status</p>',
        "<h1>Longview archive status</h1>",
        f'<p class="state state-{state_class}">{_e(state_line)}</p>',
        f'<p class="{beat_class}">{beat}</p>',
        "</header>",
        _section("glance", "At a glance", f'<dl class="stats">{stat_html}</dl>'),
        _section("archive", "Archive", _dl([
            ("Active businesses", _n(archive.get("businesses"))),
            ("In the city", _n(archive.get("inCity"))),
            ("Nearby (not published)", _n(archive.get("nearby"))),
            ("With a website", _n(archive.get("withWebsite"))),
            ("Websites read this week", _n(archive.get("readThisWeek"))),
        ])),
        _section("publishing", "Publishing", _dl(
            [(label, _n(publish.get(key))) for key, label in PUBLISH_LABELS]
            + [("Last publish file written", _e(_when(data.get("lastExportAt"))))]
        )),
        _section("directory-site", "Directory site", _directory_site(data.get("directorySite") or {})),
        _section("facts", "Facts checked on the businesses' own websites", _dl(
            [(field.capitalize(), _n(count)) for field, count in (data.get("factsVerified") or {}).items()]
        )),
        _section("review", "Review queue", _table(
            "Open review items by kind", ("Kind", "Open"),
            [(_e(REVIEW_LABELS.get(kind, "")) or _label(kind), _n(count))
             for kind, count in (data.get("reviewOpen") or {}).items()],
            "Nothing is waiting for review.",
        )),
        _section("crawl", "Website reading", _dl([
            ("Due now", _n(crawl.get("due"))),
            ("Read fine", _n(crawl.get("ok"))),
            ("Moved to a new address", _n(crawl.get("moved"))),
            ("Blocked (robots or firewall)", _n(crawl.get("blocked"))),
            ("Not reachable", _n(crawl.get("dead"))),
            ("Sites asking us to slow down", _n(crawl.get("hostsInBackoff"))),
        ])),
        _section("sources", "Open data sources", _table(
            "Sources and their last sync", ("Source", "Last synced", "Status", "Rows"),
            [(_e(s.get("name")), _e(_when(s.get("lastSyncedAt"))), _e(s.get("status") or "Not yet"),
              _n(s.get("rows"))) for s in data.get("sources") or [] if s.get("id") != "website"],
            "No sources recorded yet.",
        )),
        _section("zips", "Other ZIP codes seen with city Longview", _table(
            "Other ZIP codes from the latest sales-tax sync", ("ZIP", "Rows"),
            [(_e(z), _n(n)) for z, n in (data.get("otherZips") or {}).items()],
            "None seen in the latest sales-tax sync.",
        )),
        _section("disk", "Disk", _dl([
            ("Free space", _e(f"{disk['freeGb']:,} GB") if disk.get("freeGb") is not None else "Not measured yet"),
            ("Disk guard", "On: crawling and ingest are stopped" if disk.get("guard") else "Off"),
        ])),
        _section("errors", "Recent errors", _table(
            "The last 20 failed jobs", ("When", "Job", "Message"),
            [(_e(_when(e.get("at"))), _label(e.get("kind", "")), _e(e.get("message") or ""))
             for e in data.get("errors") or []],
            "No failed jobs.",
        )),
        '<footer class="foot">',
        f'<p class="muted">This page was written {_e(_when(written))} and refreshes about every 10 minutes.'
        f" Times are Central (America/Chicago). Version {_e(data.get('version', ''))}.</p>",
        '<p><a href="/status.json">The same numbers as JSON</a></p>',
        "</footer>",
    ]
    return _page("Longview archive status", "\n".join(parts))


def _page(title: str, body: str) -> str:
    return (
        "<!doctype html>\n"
        '<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="robots" content="noindex,nofollow">\n'
        '<meta name="referrer" content="no-referrer">\n'
        f"<title>{_e(title)}</title>\n"
        '<link rel="icon" href="data:,">\n'
        '<link rel="stylesheet" href="/status/status.css">\n'
        f"</head>\n<body>\n<main>\n{body}\n</main>\n</body>\n</html>\n"
    )


INDEX_HTML = _page(
    "Longview archive",
    '<h1>Longview archive</h1>\n<p><a href="/status/">Open the status page</a></p>',
)

STATUS_CSS = """\
/* Longview archive status page. LeadFlow tokens; phone first (390 px). */
:root {
  --ink: #0A1220;
  --canvas: #F7F5F2;
  --panel: #FFFFFF;
  --line: #DED8D0;
  --cobalt: #1240E8;
  --mint: #146C34;
  --warn: #92400E;
  --muted: #4A5263;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--canvas);
  color: var(--ink);
  font-family: var(--font);
  font-size: 1rem;
  line-height: 1.5;
}
main { max-width: 46rem; margin: 0 auto; padding: 1rem; }
h1 { font-size: 1.5rem; line-height: 1.2; margin: 0.25rem 0 0.5rem; }
h2 { font-size: 1.125rem; margin: 0 0 0.75rem; }
p { margin: 0 0 0.5rem; }
a { color: var(--cobalt); text-underline-offset: 0.15em; }
a:focus-visible { outline: 3px solid var(--cobalt); outline-offset: 2px; }
.eyebrow { font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.muted { color: var(--muted); }
.warn { color: var(--warn); font-weight: 600; }
.state { display: inline-block; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 999px; border: 2px solid currentColor; background: var(--panel); }
.state-ok { color: var(--mint); }
.state-warn { color: var(--warn); }
.top { margin-bottom: 1rem; }
section { background: var(--panel); border: 1px solid var(--line); border-radius: 0.75rem; padding: 1rem; margin: 0 0 1rem; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin: 0; }
.stat { border: 1px solid var(--line); border-radius: 0.5rem; padding: 0.75rem; background: var(--canvas); }
.stat dt { font-size: 0.875rem; color: var(--muted); }
.stat dd { margin: 0.25rem 0 0; font-size: 1.75rem; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
.pairs { margin: 0; }
.pairs div { display: flex; justify-content: space-between; gap: 1rem; padding: 0.5rem 0; border-top: 1px solid var(--line); }
.pairs div:first-child { border-top: 0; }
.pairs dt { color: var(--muted); }
.pairs dd { margin: 0; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
caption { text-align: left; color: var(--muted); font-size: 0.875rem; padding-bottom: 0.5rem; }
th, td { text-align: left; vertical-align: top; padding: 0.5rem 0.5rem 0.5rem 0; border-top: 1px solid var(--line); }
th { font-weight: 600; }
td { overflow-wrap: break-word; hyphens: auto; }
.foot { padding: 0 0 2rem; }
@media (min-width: 40rem) {
  main { padding: 2rem 1.5rem; }
  h1 { font-size: 2rem; }
  .stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
"""


def write_status(settings, data: dict) -> None:
    """Write status.json, the status page, its stylesheet, a tiny index, and robots.txt.

    www/index.html is a fallback only: Caddy sends / to the directory.
    """
    www = settings.www_dir
    (www / "status").mkdir(parents=True, exist_ok=True)
    files = (
        (www / "status.json", json.dumps(data, indent=2, ensure_ascii=False) + "\n"),
        (www / "status" / "status.css", STATUS_CSS),
        (www / "status" / "index.html", render_html(data)),
        (www / "index.html", INDEX_HTML),
        (www / "robots.txt", ROBOTS_TXT),
    )
    for path, text in files:
        atomic_write(path, text.encode("utf-8"), 0o644)
    log.info("status written: state %s", data.get("state"))
