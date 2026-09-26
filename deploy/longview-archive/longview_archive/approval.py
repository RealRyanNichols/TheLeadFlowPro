"""The approval gate between the engine's export and the public directory.

The service writes a publish export every 45 minutes (``exports/publish/
directory.json``), but the public site renders only the APPROVED batch
(``exports/publish/approved.json``). A person approves with one command
(``lva approve``); or, with auto-approve on (a setting kept in ``meta``, off by
default), each new export is approved by itself EXCEPT one that would remove
more than 25% of the approved businesses: that one waits for a person, and the
status page says so.

Removal requests do not wait: ``apply_suppressions`` takes a suppressed
business out of the approved batch at once and the site is rebuilt. Every
build also filters suppressions again, so an older approved file can never
bring a removed business back.

Nothing here touches the network. Logs and ``runs`` rows carry counts only.
"""

from __future__ import annotations

import fcntl
import json
import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

from . import db, normalize, privacy, publish, site

log = logging.getLogger(__name__)

AUTO_KEY = "auto_approve"
HELD_KEY = "approval_held_batch"
LARGE_REMOVAL_SHARE = 0.25
AUTO_ACTOR = "auto-approve"
LOCK_NAME = ".approval.lock"


class ApprovalError(Exception):
    """A batch that cannot be approved; ``reason`` is a short code, the message plain words."""

    def __init__(self, reason: str, message: str):
        super().__init__(message)
        self.reason = reason


# ---------------------------------------------------------------- files and settings

def read_json(path: Path) -> Optional[Any]:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (OSError, ValueError) as exc:
        log.warning("approval: %s is unreadable (%s)", Path(path).name, type(exc).__name__)
        return None


def is_export(data: Any) -> bool:
    return (isinstance(data, dict) and data.get("schemaVersion") == publish.SCHEMA_VERSION
            and isinstance(data.get("businesses"), list))


def auto_enabled(conn: sqlite3.Connection) -> bool:
    return db.get_meta(conn, AUTO_KEY) == "on"


def set_auto(conn: sqlite3.Connection, on: bool) -> None:
    db.set_meta(conn, AUTO_KEY, "on" if on else "off")
    if not on:
        conn.execute("DELETE FROM meta WHERE key=?", (HELD_KEY,))


@contextmanager
def _locked(settings) -> Iterator[None]:
    """One approval or site build at a time (the service and an operator's command)."""
    path = settings.publish_export_path.parent / LOCK_NAME
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a+b") as fh:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(fh.fileno(), fcntl.LOCK_UN)


# ---------------------------------------------------------------- suppressions

def _suppressed(conn: sqlite3.Connection, business: dict) -> bool:
    ident = business.get("id")
    row = conn.execute("SELECT * FROM businesses WHERE public_id=?", (ident,)).fetchone() if ident else None
    if row is not None and privacy.is_suppressed(conn, row):
        return True
    checks: List[Tuple[str, Any]] = [("public_id", ident)]
    website = business.get("website") or {}
    if isinstance(website, dict) and website.get("url"):
        checks.append(("domain", normalize.registrable_domain(str(website["url"]))))
    phone = business.get("phone") or {}
    if isinstance(phone, dict) and phone.get("e164"):
        checks.append(("phone", phone["e164"]))
    address = business.get("address") or {}
    if business.get("name") and isinstance(address, dict):
        checks.append(("name_zip", privacy.name_zip_key(business["name"], address.get("zip"))))
    return any(value and conn.execute("SELECT 1 FROM suppressions WHERE kind=? AND value=?",
                                      (kind, value)).fetchone() for kind, value in checks)


def filter_suppressed(conn: sqlite3.Connection, data: dict) -> Tuple[dict, List[str]]:
    """``data`` without any business a removal request covers, and the ids taken out."""
    keep, removed = [], []
    for business in data.get("businesses") or []:
        if isinstance(business, dict) and _suppressed(conn, business):
            removed.append(str(business.get("id")))
        else:
            keep.append(business)
    if not removed:
        return data, removed
    out = dict(data)
    out["businesses"] = keep
    counts = dict(out.get("counts") or {})
    counts["published"] = len(keep)
    out["counts"] = counts
    per: Dict[str, int] = {}
    for b in keep:
        if isinstance(b, dict):
            per[b.get("category")] = per.get(b.get("category"), 0) + 1
    out["categories"] = [dict(c, count=per[c.get("slug")]) for c in out.get("categories") or []
                         if isinstance(c, dict) and per.get(c.get("slug"))]
    return out, removed


# ---------------------------------------------------------------- the site

def rebuild_site(conn: sqlite3.Connection, settings, now: Any = None, _locked_already: bool = False) -> dict:
    """Build the public site from the approved batch (nothing approved: the "being checked" page)."""
    def build() -> dict:
        data = read_json(settings.approved_export_path)
        if data is not None and not is_export(data):
            log.warning("approval: approved.json is not a directory export; the site shows no businesses")
            data = None
        if data is not None:
            data, _ = filter_suppressed(conn, data)
        counts = site.build_site(settings, data, now)
        stamp = db.now_iso(publish.resolve_now(now))
        db.set_meta(conn, "site_built_at", stamp)
        db.set_meta(conn, "site_batch_id", str((data or {}).get("batchId") or ""))
        db.set_meta(conn, "site_businesses", str(counts["businesses"]))
        db.set_meta(conn, "site_dropped", str(counts["dropped"]))
        db.set_meta(conn, "site_indexable", "1" if settings.indexable else "0")
        return counts

    if _locked_already:
        return build()
    with _locked(settings):
        return build()


def site_needs_build(conn: sqlite3.Connection, settings) -> bool:
    """No site yet, or the indexing switch changed since the last build."""
    if not site.site_exists(settings):
        return True
    return db.get_meta(conn, "site_indexable") != ("1" if settings.indexable else "0")


# ---------------------------------------------------------------- approving

def _load_export(settings) -> dict:
    data = read_json(settings.publish_export_path)
    if data is None:
        raise ApprovalError("no_export", "There is no publish file yet (run: lva publish).")
    if not is_export(data):
        raise ApprovalError("not_an_export", "The publish file is not a directory export.")
    if data.get("sample") is not False:
        raise ApprovalError("sample", "The publish file is marked as sample data; only real batches are approved.")
    return data


def approve(conn: sqlite3.Connection, settings, actor: str = "operator", batch: Optional[str] = "latest",
            now: Any = None, auto: bool = False) -> dict:
    """Copy the current export to approved.json (atomically), record who, and rebuild the site.

    ``batch`` is "latest" or the exact batch id the person looked at; a
    different id is refused so a newer batch is never approved by mistake.
    """
    now_dt = publish.resolve_now(now)
    stamp = db.now_iso(now_dt)
    with _locked(settings):
        export = _load_export(settings)
        if batch not in (None, "", "latest") and batch != export.get("batchId"):
            raise ApprovalError(
                "batch_mismatch",
                f"The newest batch is {export.get('batchId')}, not {batch}. Check that one, then approve it"
                " with --batch latest.")
        data, suppressed = filter_suppressed(conn, export)
        previous = read_json(settings.approved_export_path)
        diff = publish.diff_exports(previous if is_export(previous) else None, data)
        run_id = db.start_run(conn, "approve", stamp)
        try:
            publish.write_export(settings.approved_export_path, data)
            counts = {"businesses": len(data["businesses"]), "added": len(diff["added"]),
                      "removed": len(diff["removed"]), "changed": len(diff["changed"]),
                      "suppressed_since_export": len(suppressed), "auto": 1 if auto else 0, "actor": actor}
            db.set_meta(conn, "approved_batch_id", str(data.get("batchId") or ""))
            db.set_meta(conn, "approved_at", stamp)
            db.set_meta(conn, "approved_by", actor)
            db.set_meta(conn, "approved_businesses", str(len(data["businesses"])))
            conn.execute("DELETE FROM meta WHERE key=?", (HELD_KEY,))
            built = rebuild_site(conn, settings, now_dt, _locked_already=True)
            counts["shown"] = built["businesses"]
            counts["dropped"] = built["dropped"]
            db.finish_run(conn, run_id, "ok", counts, now=stamp)
        except Exception as exc:
            db.finish_run(conn, run_id, "error", error=type(exc).__name__, now=stamp)
            raise
    log.info("approved batch %s (%s): %d businesses, %d added, %d removed, %d changed",
             data.get("batchId"), "auto" if auto else "by a person", counts["businesses"], counts["added"],
             counts["removed"], counts["changed"])
    return dict(counts, batchId=data.get("batchId"))


def removal_share(approved: Optional[dict], export: dict) -> Tuple[int, int]:
    """(businesses the export would remove, businesses approved now)."""
    before = {b.get("id") for b in (approved or {}).get("businesses") or [] if isinstance(b, dict)}
    after = {b.get("id") for b in export.get("businesses") or [] if isinstance(b, dict)}
    return len(before - after), len(before)


def auto_approve(conn: sqlite3.Connection, settings, now: Any = None) -> dict:
    """After an export: approve it when auto-approve is on, unless it removes more than 25%.

    Returns {"status": off | skipped | same | held | approved, ...}.
    """
    if not auto_enabled(conn):
        return {"status": "off"}
    try:
        export = _load_export(settings)
    except ApprovalError as exc:
        return {"status": "skipped", "reason": exc.reason}
    approved = read_json(settings.approved_export_path)
    approved = approved if is_export(approved) else None
    if approved is not None and approved.get("batchId") == export.get("batchId"):
        return {"status": "same"}
    removed, base = removal_share(approved, export)
    if base and removed > LARGE_REMOVAL_SHARE * base:
        batch_id = str(export.get("batchId") or "")
        if db.get_meta(conn, HELD_KEY) != batch_id:
            db.set_meta(conn, HELD_KEY, batch_id)
            stamp = db.now_iso(publish.resolve_now(now))
            run_id = db.start_run(conn, "approve", stamp)
            db.finish_run(conn, run_id, "skipped", {"removed": removed, "approved": base, "auto": 1}, now=stamp)
            log.warning("auto-approve held batch %s: it would remove %d of %d approved businesses",
                        batch_id, removed, base)
        return {"status": "held", "removed": removed, "approved": base}
    result = approve(conn, settings, actor=AUTO_ACTOR, batch="latest", now=now, auto=True)
    return dict(result, status="approved")


def apply_suppressions(conn: sqlite3.Connection, settings, now: Any = None) -> dict:
    """A removal request takes effect now: rewrite approved.json without it and rebuild the site."""
    with _locked(settings):
        data = read_json(settings.approved_export_path)
        removed: List[str] = []
        if is_export(data):
            data, removed = filter_suppressed(conn, data)
            if removed:
                publish.write_export(settings.approved_export_path, data)
                db.set_meta(conn, "approved_businesses", str(len(data["businesses"])))
        built = rebuild_site(conn, settings, now, _locked_already=True)
    if removed:
        log.info("removal request applied to the approved batch: %d business(es) taken off the site", len(removed))
    return {"removed": len(removed), "shown": built["businesses"]}


# ---------------------------------------------------------------- the status page

def _int(value: Optional[str]) -> Optional[int]:
    try:
        return int(value) if value not in (None, "") else None
    except ValueError:
        return None


def status_info(conn: sqlite3.Connection, settings) -> dict:
    """Counts and times only: the approved batch, the last build, auto-approve, and what waits."""
    approved = read_json(settings.approved_export_path)
    approved = approved if is_export(approved) else None
    export = read_json(settings.publish_export_path)
    export = export if is_export(export) and export.get("sample") is False else None
    waiting = None
    if export is not None and (approved is None or approved.get("batchId") != export.get("batchId")):
        diff = publish.diff_exports(approved, export)
        waiting = {"batchId": export.get("batchId"), "businesses": len(export["businesses"]),
                   "added": len(diff["added"]), "removed": len(diff["removed"]), "changed": len(diff["changed"])}
    held = db.get_meta(conn, HELD_KEY)
    held_info = None
    if held and export is not None and held == export.get("batchId"):
        removed, base = removal_share(approved, export)
        held_info = {"batchId": held, "removed": removed, "approved": base}
    return {
        "approvedBatchId": (approved or {}).get("batchId"),
        "approvedBusinesses": len(approved["businesses"]) if approved else 0,
        "approvedAt": db.get_meta(conn, "approved_at"),
        "builtAt": db.get_meta(conn, "site_built_at"),
        "shownBusinesses": _int(db.get_meta(conn, "site_businesses")),
        "droppedByChecks": _int(db.get_meta(conn, "site_dropped")),
        "autoApprove": auto_enabled(conn),
        "waiting": waiting,
        "heldForPerson": held_info,
        "indexable": bool(settings.indexable),
    }
