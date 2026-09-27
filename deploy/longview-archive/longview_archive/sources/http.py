"""HTTP for the open-data APIs, and the record writer every adapter shares.

The Comptroller and TABC data (Socrata), OpenStreetMap (Overpass), and the NPI
registry are public services that ask callers for restraint, so every call
goes out with the archive's user agent, at most one request per
``api_min_interval_s`` per API host (shared across threads), and a short,
bounded retry on 429 and 5xx. Errors carry a status and a short reason, never
a response body. Tests replace the network with a transport callable and the
clock and sleep with the module-level hooks below.

The second half is the ``source_records`` writer. All four adapters store rows
the same way (fill the normalized projection, keep ``first_seen_at``, send a
record back to matching only when its projection changed, deactivate what
vanished, never on an empty pull), so that logic lives once, next to the
plumbing every adapter already imports.
"""

from __future__ import annotations

import http.client
import json
import logging
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Callable, Dict, Mapping, Optional, Tuple, Union
from urllib.parse import quote, urlencode, urlsplit

from .. import db, privacy

logger = logging.getLogger(__name__)

# (method, url, headers, body, timeout) -> (status, headers, body)
Transport = Callable[[str, str, Dict[str, str], Optional[bytes], float], Tuple[int, Mapping[str, str], bytes]]

MAX_RETRIES = 3                       # retries after the first attempt
RETRY_BACKOFF_S = (2.0, 6.0, 18.0)
MAX_RETRY_AFTER_S = 120.0             # waited in place; a longer Retry-After ends the sync (see get_json)
MAX_DEFER_S = 3600.0                  # the longest Retry-After we report back as the wanted wait
MAX_REDIRECTS = 3
MAX_BODY_BYTES = 200 * 1024 * 1024    # Overpass answers for one city are a few MB

# Test hooks: tests swap these for a fake clock and a recording sleep.
clock: Callable[[], float] = time.monotonic
sleep: Callable[[float], None] = time.sleep
wall_clock: Callable[[], float] = time.time  # for Retry-After given as an HTTP date

_slots_lock = threading.Lock()
_next_slot: Dict[str, float] = {}


class SourceError(Exception):
    """An expected sync failure whose message is safe to log and store."""


class ApiError(SourceError):
    def __init__(self, status: int, reason: str, host: str = "", retry_after_s: Optional[float] = None):
        self.status = int(status)
        self.reason = reason
        self.host = host
        # When the server asked us to come back later than we wait in place (capped).
        self.retry_after_s = retry_after_s
        super().__init__(f"{host or 'api'} {self.status}: {reason}")


class EmptyResult(SourceError):
    """A pull that returned nothing usable; never a reason to deactivate everything."""

    def __init__(self) -> None:
        super().__init__("empty_result")


def reset_rate_limits() -> None:
    with _slots_lock:
        _next_slot.clear()


def _throttle(host: str, interval: float) -> None:
    """Reserve the next slot for ``host`` under the lock, then sleep outside it."""
    if interval <= 0:
        return
    with _slots_lock:
        now = clock()
        start = max(now, _next_slot.get(host, now))
        _next_slot[host] = start + interval
    wait = start - now
    if wait > 0:
        sleep(wait)


def _read_capped(resp, host: str, deadline: Optional[float] = None) -> bytes:
    """The body, at most MAX_BODY_BYTES, read one receive at a time so a slow drip hits ``deadline``."""
    reader = getattr(resp, "read1", None) or resp.read
    parts = []
    total = 0
    while True:
        if deadline is not None and time.monotonic() > deadline:
            raise TimeoutError("api body read deadline")
        data = reader(min(1 << 20, MAX_BODY_BYTES + 1 - total))
        if not data:
            break
        parts.append(data)
        total += len(data)
        if total > MAX_BODY_BYTES:
            raise ApiError(getattr(resp, "status", 0) or 0, "response_too_large", host)
    return b"".join(parts)


def _port(parts) -> Optional[int]:
    try:
        return parts.port or {"https": 443, "http": 80}.get(parts.scheme.lower())
    except ValueError:
        return None


class SameHostRedirect(urllib.request.HTTPRedirectHandler):
    """Follow a redirect only to https on the same API host and port, at most 3 times.

    Anything else (another host, another port, a downgrade to http, ftp) comes
    back as the 3xx itself, which get_json reports as an ApiError. An API
    response can then never send our requests to the CRM or the cloud
    metadata service on the droplet.
    """

    max_redirections = MAX_REDIRECTS

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        old, new = urlsplit(req.full_url), urlsplit(newurl)
        same_host = (old.hostname or "").lower() == (new.hostname or "").lower()
        # https keeps its port; an http API may only move up to https on 443.
        same_port = _port(new) == (_port(old) if old.scheme.lower() == "https" else 443)
        if new.scheme.lower() != "https" or not same_host or not same_port or new.username or new.password:
            logger.warning("api redirect refused host=%s", (old.hostname or "").lower())
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(SameHostRedirect)


def default_transport(method: str, url: str, headers: Dict[str, str], body: Optional[bytes],
                      timeout: float) -> Tuple[int, Mapping[str, str], bytes]:
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    host = (urlsplit(url).hostname or "").lower()
    deadline = time.monotonic() + float(timeout) * 2
    try:
        with _opener.open(request, timeout=timeout) as resp:
            return resp.status, dict(resp.headers.items()), _read_capped(resp, host, deadline)
    except urllib.error.HTTPError as exc:
        try:
            payload = exc.read(65536) or b""
        except (OSError, http.client.HTTPException):
            payload = b""
        return exc.code, dict(exc.headers.items()) if exc.headers else {}, payload


def _retry_after(headers: Mapping[str, str]) -> Optional[float]:
    """Seconds the server asked us to wait (a number or an HTTP date), or None."""
    for key, value in (headers or {}).items():
        if str(key).lower() == "retry-after":
            text = str(value).strip()
            if re.fullmatch(r"\d+(?:\.\d+)?", text):
                return float(text)
            try:
                when = parsedate_to_datetime(text)
            except (TypeError, ValueError, IndexError):
                return None
            if when is None:
                return None
            if when.tzinfo is None:
                when = when.replace(tzinfo=timezone.utc)
            return max(0.0, when.timestamp() - wall_clock())
    return None


def get_json(
    url: str,
    settings,
    params: Optional[Union[Mapping[str, Any], list]] = None,
    data: Optional[Mapping[str, Any]] = None,
    transport: Optional[Transport] = None,
    method: Optional[str] = None,
    *,
    timeout: Optional[float] = None,
) -> Any:
    """GET (or POST form ``data``) and decode JSON, politely.

    Retries up to ``MAX_RETRIES`` times on 429, 5xx, and connection errors,
    waiting ``Retry-After`` (seconds or an HTTP date) when it is up to 120 s,
    else the backoff ladder. A longer ``Retry-After`` is honoured by not
    retrying at all: the ApiError (reason ``retry_after``) ends the sync, and
    the service holds a failed sync back for hours, longer than the wait the
    server asked for (reported, capped at an hour, as ``retry_after_s``).
    Other statuses fail at once.
    """
    if params:
        items = list(params.items()) if isinstance(params, Mapping) else list(params)
        url = url + ("&" if "?" in url else "?") + urlencode(items, doseq=True, safe="*", quote_via=quote)
    headers = {"User-Agent": settings.user_agent, "Accept": "application/json"}
    body: Optional[bytes] = None
    if data is not None:
        body = urlencode(list(data.items())).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    verb = (method or ("POST" if data is not None else "GET")).upper()
    host = (urlsplit(url).hostname or "").lower()
    send = transport or default_transport
    wait_s = settings.api_timeout_s if timeout is None else timeout

    attempt = 0
    while True:
        _throttle(host, settings.api_min_interval_s)
        try:
            status, resp_headers, payload = send(verb, url, dict(headers), body, wait_s)
            reason = f"http_{status}"
        except (OSError, http.client.HTTPException) as exc:
            status, resp_headers, payload = 0, {}, b""
            reason = f"network_{type(exc).__name__}"
        if 200 <= status < 300:
            try:
                return json.loads((payload or b"").decode("utf-8"))
            except (UnicodeDecodeError, ValueError):
                raise ApiError(status, "invalid_json", host) from None
        if not (status == 0 or status == 429 or 500 <= status <= 599):
            raise ApiError(status, reason, host)
        delay = _retry_after(resp_headers)
        if delay is not None and delay > MAX_RETRY_AFTER_S:
            logger.warning("api host=%s status=%s asked to wait %.0fs; sync deferred", host, status, delay)
            raise ApiError(status, "retry_after", host, retry_after_s=min(delay, MAX_DEFER_S))
        if attempt >= MAX_RETRIES:
            raise ApiError(status, reason, host)
        if delay is None:
            delay = RETRY_BACKOFF_S[min(attempt, len(RETRY_BACKOFF_S) - 1)]
        attempt += 1
        logger.warning("api retry host=%s status=%s attempt=%d wait=%.0fs", host, status, attempt, delay)
        sleep(delay)


# ---------------------------------------------------------------- record writer

PROJECTION_COLUMNS = (
    "name", "name_norm", "street", "street_norm", "suite", "city", "zip", "phone",
    "website", "website_domain", "naics", "lat", "lon", "permit_start",
    "is_individual", "personal_name", "scope", "tags_json",
)
BATCH_SIZE = 500


def as_now(now: Union[str, datetime, None]) -> str:
    if now is None:
        return db.now_iso()
    if isinstance(now, datetime):
        return db.now_iso(now)
    return str(now)


def bump(counts: Dict[str, Any], key: str, n: int = 1) -> None:
    counts[key] = counts.get(key, 0) + n


def error_text(exc: BaseException) -> str:
    """Our own error messages are safe to store; anything else is named by class only."""
    if isinstance(exc, SourceError):
        return str(exc)[:4000]   # room for a schema mismatch's full column list
    return type(exc).__name__


def update_source(conn: sqlite3.Connection, source_id: str, **fields: Any) -> None:
    allowed = {"dataset_id", "dataset_url", "columns_json", "license", "row_count",
               "last_synced_at", "last_status", "last_error"}
    unknown = set(fields) - allowed
    if unknown:
        raise ValueError(f"unknown sources columns: {sorted(unknown)}")
    if not fields:
        return
    assignments = ", ".join(f"{name}=?" for name in fields)
    conn.execute(f"UPDATE sources SET {assignments} WHERE id=?", (*fields.values(), source_id))


def finish_ok(conn: sqlite3.Connection, run_id: int, source_id: str, counts: Dict[str, Any],
              now: str, status: str = "ok", note: Optional[str] = None, **source_fields: Any) -> None:
    counts["status"] = status
    active = conn.execute(
        "SELECT COUNT(*) FROM source_records WHERE source_id=? AND active=1", (source_id,)
    ).fetchone()[0]
    with db.transaction(conn):
        db.finish_run(conn, run_id, status, counts, note, now)
        update_source(conn, source_id, row_count=int(active), last_synced_at=now,
                      last_status=status, last_error=note, **source_fields)
    logger.info("sync %s %s: %s", source_id, status,
                " ".join(f"{k}={v}" for k, v in sorted(counts.items()) if isinstance(v, int)))


def finish_failed(conn: sqlite3.Connection, run_id: int, source_id: str, counts: Dict[str, Any],
                  now: str, exc_or_reason: Union[BaseException, str], status: str = "error") -> str:
    message = exc_or_reason if isinstance(exc_or_reason, str) else error_text(exc_or_reason)
    counts["status"] = status
    with db.transaction(conn):
        db.finish_run(conn, run_id, status, counts, message, now)
        update_source(conn, source_id, last_status=status, last_error=message)
    logger.warning("sync %s %s: %s", source_id, status, message)
    return message


def record_suppressed(conn: sqlite3.Connection, record: Mapping[str, Any]) -> bool:
    """Removal requests are honored at ingest: by name + ZIP, phone, or website domain."""
    checks = [("name_zip", privacy.name_zip_key(record.get("name"), record.get("zip")))]
    if record.get("phone"):
        checks.append(("phone", record["phone"]))
    if record.get("website_domain"):
        checks.append(("domain", record["website_domain"]))
    for kind, value in checks:
        if value and conn.execute(
            "SELECT 1 FROM suppressions WHERE kind=? AND value=?", (kind, value)
        ).fetchone():
            return True
    return False


class RecordWriter:
    """Upserts one source's records for one sync, 500 per transaction.

    ``seen`` holds every key stored in this sync; ``deactivate_unseen`` retires
    the rest once the pull is known to be complete.
    """

    def __init__(self, conn: sqlite3.Connection, source_id: str, now: str, counts: Dict[str, Any]):
        self.conn = conn
        self.source_id = source_id
        self.now = now
        self.counts = counts
        self.seen: set = set()
        self._pending: list = []

    def add(self, source_key: str, record: Mapping[str, Any], raw: Any, license: str, source_url: str) -> bool:
        key = str(source_key)
        if key in self.seen:
            bump(self.counts, "duplicates")
            return False
        if record_suppressed(self.conn, record):
            bump(self.counts, "suppressed")
            return False
        self.seen.add(key)
        self._pending.append((key, dict(record), raw, license, source_url))
        if len(self._pending) >= BATCH_SIZE:
            self.flush()
        return True

    def flush(self) -> None:
        if not self._pending:
            return
        with db.transaction(self.conn):
            for item in self._pending:
                bump(self.counts, self._upsert(*item))
        self._pending = []

    def _upsert(self, key: str, record: Dict[str, Any], raw: Any, license: str, source_url: str) -> str:
        values = {col: record.get(col) for col in PROJECTION_COLUMNS}
        values["is_individual"] = 1 if values["is_individual"] else 0
        values["personal_name"] = 1 if values["personal_name"] else 0
        values["scope"] = values["scope"] or "city"
        raw_json = db.dumps(raw)
        existing = self.conn.execute(
            f"SELECT id, business_id, active, {', '.join(PROJECTION_COLUMNS)} FROM source_records"
            " WHERE source_id=? AND source_key=?",
            (self.source_id, key),
        ).fetchone()
        if existing is None:
            cols = ("source_id", "source_key", "license", "source_url", "fetched_at", "first_seen_at",
                    "last_seen_at", "active", "raw_json", "match_state") + PROJECTION_COLUMNS
            params = (self.source_id, key, license, source_url, self.now, self.now, self.now, 1,
                      raw_json, "new") + tuple(values[c] for c in PROJECTION_COLUMNS)
            self.conn.execute(
                f"INSERT INTO source_records({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                params,
            )
            return "inserted"
        changed = any(existing[c] != values[c] for c in PROJECTION_COLUMNS)
        was_inactive = not existing["active"]
        assignments = ", ".join(f"{c}=?" for c in PROJECTION_COLUMNS)
        self.conn.execute(
            f"UPDATE source_records SET license=?, source_url=?, fetched_at=?, last_seen_at=?, active=1,"
            f" raw_json=?, {assignments},"
            " match_state=CASE WHEN ? THEN 'new' ELSE match_state END WHERE id=?",
            (license, source_url, self.now, self.now, raw_json,
             *(values[c] for c in PROJECTION_COLUMNS), 1 if (changed or was_inactive) else 0, existing["id"]),
        )
        if was_inactive:
            if existing["business_id"]:
                # A business is inactive only while none of its records is active.
                self.conn.execute(
                    "UPDATE businesses SET active=1, updated_at=? WHERE id=? AND active=0",
                    (self.now, existing["business_id"]),
                )
            return "reactivated"
        return "updated" if changed else "unchanged"

    def deactivate_unseen(self) -> int:
        """Retire records of this source not seen in this (complete) sync."""
        self.flush()
        if not self.seen:
            raise EmptyResult()
        with db.transaction(self.conn):
            active = self.conn.execute(
                "SELECT id, source_key, business_id FROM source_records WHERE source_id=? AND active=1",
                (self.source_id,),
            ).fetchall()
            gone = [row for row in active if row["source_key"] not in self.seen]
            for row in gone:
                self.conn.execute("UPDATE source_records SET active=0 WHERE id=?", (row["id"],))
            businesses_off = 0
            for business_id in sorted({row["business_id"] for row in gone if row["business_id"]}):
                cur = self.conn.execute(
                    "UPDATE businesses SET active=0, updated_at=? WHERE id=? AND active=1 AND NOT EXISTS"
                    " (SELECT 1 FROM source_records WHERE business_id=? AND active=1)",
                    (self.now, business_id, business_id),
                )
                businesses_off += cur.rowcount
        bump(self.counts, "deactivated", len(gone))
        bump(self.counts, "businesses_deactivated", businesses_off)
        return len(gone)
