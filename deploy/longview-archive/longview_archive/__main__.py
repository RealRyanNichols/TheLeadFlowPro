"""Command line for the archive: ``python -m longview_archive <command>``.

systemd runs ``run``. Everything else is for the operator on the droplet (the
README's "Everyday commands"), run as the service user through the ``lva``
shell helper so files keep the right owner. Output carries counts, public ids,
and paths only, never a person's name, a source key, or a raw record, and a
failure prints one plain line and exits 1 instead of a traceback.
"""

from __future__ import annotations

import argparse
import fcntl
import json
import logging
import os
import re
import shutil
import signal
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from . import config, db, exports, facts, github_pr, matching, normalize, privacy, publish, status
from .service import SYNC_BY_NAME, SYNC_JOBS, ArchiveService, bootstrap, run_sync, take_backup, where

log = logging.getLogger("longview_archive")

LOG_FORMAT = "%(levelname)s %(name)s %(message)s"
LOCK_NAME = "archive.lock"
SERVICE_UNIT = "longview-archive.service"
CGROUP_ROOT = Path("/sys/fs/cgroup")
EXPECTED_TABLES = frozenset(re.findall(r"CREATE TABLE IF NOT EXISTS (\w+)", db.SCHEMA))

# Review items whose proposed value was read on the business's own website may
# show that value; items about matching or names never show theirs (they can
# hold a phone from a state record or a person's name).
SITE_FIELDS = ("website", "phone", "email", "hours", "facebook", "instagram", "careers", "services",
               "address_listed")
PRIVATE_KINDS = ("merge_ambiguous", "shared_phone", "person_name_check")
DEFAULT_ACTOR = "operator"


# ---------------------------------------------------------------- small helpers

def out(text: str = "") -> None:
    print(text, flush=True)


def err(text: str) -> None:
    print(text, file=sys.stderr, flush=True)


def clip(text: Any, limit: int) -> str:
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def describe_sync_error(error: Optional[str]) -> str:
    """A plain reading of the source modules' error text (API host and status, or a class name)."""
    text = str(error or "unknown error")
    m = re.fullmatch(r"(\S+) 0: network_(\w+)", text)
    if m:
        return f"could not reach {m.group(1)} ({m.group(2)})"
    m = re.fullmatch(r"(\S+) (\d{3}): (\w+)", text)
    if m:
        return f"{m.group(1)} answered HTTP {m.group(2)} ({m.group(3)})"
    return clip(text, 300)


def int_counts(counts: Optional[Dict[str, Any]]) -> str:
    items = [(k, v) for k, v in sorted((counts or {}).items()) if isinstance(v, int) and not isinstance(v, bool)]
    return " ".join(f"{k}={v}" for k, v in items) or "no counts"


def gb(n: Optional[int]) -> str:
    return "unknown" if n is None else f"{n / config.GIB:,.1f} GB"


def disk_free(settings) -> Optional[int]:
    path = Path(settings.data_dir)
    while not path.exists() and path != path.parent:
        path = path.parent
    try:
        return int(shutil.disk_usage(path).free)
    except OSError:
        return None


def below_guard(settings) -> bool:
    free = disk_free(settings)
    if free is not None and free < settings.disk_guard_bytes:
        err(f"Free disk space is {gb(free)}, under the {gb(settings.disk_guard_bytes)} guard;"
            " not pulling data, reading websites, or backing up. Free some space first.")
        return True
    return False


def acquire_lock(settings) -> Optional[int]:
    """An exclusive lock held by whoever reads websites (the service or crawl-once).

    Two processes would each keep their own per-host spacing, so only one may
    crawl at a time. Returns the descriptor, or None when another holds it.
    """
    path = settings.db_path.parent / LOCK_NAME
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(path), os.O_RDONLY | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(fd)
        return None
    return fd


def release_lock(fd: Optional[int]) -> None:
    if fd is not None:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


# ---------------------------------------------------------------- commands

def cmd_run(args, settings) -> int:
    service = ArchiveService(settings)

    def on_signal(signum, frame):  # only sets a flag; the loop logs and stops
        service.request_stop()

    signal.signal(signal.SIGTERM, on_signal)
    signal.signal(signal.SIGINT, on_signal)
    settings.ensure_dirs()
    lock = acquire_lock(settings)
    if lock is None:
        log.error("another archive process (the service or crawl-once) holds %s; not starting",
                  settings.db_path.parent / LOCK_NAME)
        return 1
    try:
        log.info("starting: version %s, data in %s", config.VERSION, settings.data_dir)
        service.run_forever()
    finally:
        release_lock(lock)
    log.info("stopped")
    return 0


def cmd_migrate(args, settings) -> int:
    conn = bootstrap(settings)
    try:
        version = db.get_meta(conn, "schema_version")
    finally:
        conn.close()
    out(f"Database ready: {settings.db_path} (schema version {version}).")
    return 0


def cmd_status(args, settings) -> int:
    conn = bootstrap(settings)
    try:
        data = status.collect(conn, settings)
        status.write_status(settings, data)
    finally:
        conn.close()
    out(f"Status page written to {settings.www_dir / 'status'}/ and {settings.www_dir / 'status.json'}"
        f" (state {data.get('state')}).")
    return 0


def cmd_sync(args, settings) -> int:
    jobs = SYNC_JOBS if args.source == "all" else (SYNC_BY_NAME[args.source],)
    if below_guard(settings):
        return 1
    conn = bootstrap(settings)
    failed = 0
    try:
        pulled = False
        for job in jobs:
            outcome = run_sync(conn, settings, job, db.now_iso())
            if outcome.ok:
                pulled = True
                out(f"sync {job.name}: {outcome.status} ({int_counts(outcome.counts)})")
            elif outcome.status == "skipped":
                out(f"sync {job.name}: skipped ({clip(outcome.error, 200)})")
            else:
                failed += 1
                err(f"sync {job.name} failed: {describe_sync_error(outcome.error)}."
                    " Recorded as an error run (see the status page).")
        if pulled:
            counts = matching.match_pending(conn)
            out(f"match: {int_counts(counts)}")
    finally:
        conn.close()
    return 1 if failed else 0


def cmd_match(args, settings) -> int:
    conn = bootstrap(settings)
    try:
        counts = matching.match_pending(conn)
    finally:
        conn.close()
    out(f"match: {int_counts(counts)}")
    return 0


def cmd_crawl_once(args, settings) -> int:
    if settings.pause_file.exists():
        err(f"The PAUSE file is present ({settings.pause_file}), so no website is read. Remove it first.")
        return 1
    if below_guard(settings):
        return 1
    settings.ensure_dirs()
    lock = acquire_lock(settings)
    if lock is None:
        err("The archive service is running and reads websites itself. To run crawl-once, stop it first:"
            " systemctl stop longview-archive")
        return 1
    service = ArchiveService(settings)

    def on_signal(signum, frame):
        service.request_stop()

    signal.signal(signal.SIGTERM, on_signal)
    signal.signal(signal.SIGINT, on_signal)
    try:
        service.open()
        limit = args.limit if args.limit is not None else settings.max_sites_concurrent
        report = service.crawl(limit=limit)
    finally:
        service.close()
        release_lock(lock)
    if not report["visits"]:
        out("No website is due for a visit.")
        return 0
    outcomes = ", ".join(f"{k} {v}" for k, v in sorted(report["applied"].items())) or "none written"
    out(f"Visited {report['visits']} website(s): {outcomes}; interrupted {report['interrupted']},"
        f" errors {report['visit_errors']}.")
    return 1 if report["visit_errors"] else 0


def cmd_publish(args, settings) -> int:
    conn = bootstrap(settings)
    try:
        counts = publish.run_publish(conn, settings, out_path=args.out)
    finally:
        conn.close()
    path = Path(args.out) if args.out else settings.publish_export_path
    out(f"Publish file written: {path} ({counts.get('published', 0)} businesses; since the previous file there:"
        f" {counts.get('added', 0)} added, {counts.get('removed', 0)} removed,"
        f" {counts.get('updated', 0)} changed). Nothing is sent anywhere.")
    return 0


PR_OUTCOMES = {
    "opened": "Opened the batch pull request. Open it on GitHub, check the Vercel preview, and merge to publish.",
    "updated": "Updated the open batch pull request with the new batch. Check the preview, then merge.",
    "not_due": "Not due yet: the batch pull request is updated at most once a day.",
    "busy": "Another batch pull request run is in progress (the service); try again in a minute.",
}
PR_SKIPS = {
    "no_export": "there is no publish file yet (run: lva publish)",
    "not_an_export": "the publish file is not a directory export",
    "sample": "the publish file is a sample",
    "empty": "the publish file has no businesses",
    "same_as_main": "the batch is the same as the file on main",
    "already_proposed": "the open pull request already has this batch",
    "large_removal": "it would remove more than 25% of the published businesses (held for a person)",
}


def _pr_counts(counts: Dict[str, Any]) -> str:
    return (f"{counts.get('published', 0)} published: {counts.get('added', 0)} added,"
            f" {counts.get('removed', 0)} removed, {counts.get('changed', 0)} changed;"
            f" {counts.get('held_for_privacy', 0)} held for privacy,"
            f" {counts.get('waiting_for_review', 0)} waiting for review")


def cmd_publish_pr(args, settings) -> int:
    conn = bootstrap(settings)
    try:
        if args.dry_run:
            result = github_pr.dry_run(conn, settings, base_path=args.base)
        else:
            if settings.pause_file.exists():
                err(f"The PAUSE file is present ({settings.pause_file}); nothing is sent to GitHub. Remove it first.")
                return 1
            if below_guard(settings):
                return 1
            result = github_pr.run_publish_pr(conn, settings, allow_large_removal=args.allow_large_removal)
    finally:
        conn.close()

    if args.dry_run:
        out("Dry run: nothing was sent anywhere and nothing was changed on GitHub.")
        out(f"Batch pull requests: {'on' if result['enabled'] else 'off'}"
            + (f" ({result['token_problem']})" if result.get("token_problem") else ""))
        out(f"Compared with: {result['base'] or 'nothing (no copy of the file on main yet; every business counts as added)'}")
        if result.get("counts"):
            out(f"Counts: {_pr_counts(result['counts'])}")
        verdict = {"propose": "A pull request would be opened or updated (when due).",
                   "skip": f"Skipped: {PR_SKIPS.get(result.get('reason'), result.get('reason'))}.",
                   "held": f"Held: {PR_SKIPS['large_removal']}."}[result["outcome"]]
        out(verdict)
        if result.get("title"):
            out("")
            out(f"Title: {result['title']}")
            out("")
            out(result["body"].rstrip("\n"))
        return 0

    status_name = result.get("status")
    if status_name == "off":
        out(f"Batch pull requests are off: there is no token file at {settings.github_token_file}."
            " See the README section 'Automatic batch pull requests (optional)'.")
        return 0
    if status_name == "refused":
        err(result.get("problem") or "The GitHub token file was refused.")
        return 1
    if status_name == "skipped":
        out(f"No pull request: {PR_SKIPS.get(result.get('reason'), result.get('reason'))}.")
        return 0
    if status_name == "held":
        err(result.get("problem") or "Large removal held for a person.")
        return 1
    if status_name == "error":
        err(f"The batch pull request failed: {result.get('error')}. Recorded as an error run; tried again"
            " in an hour.")
        return 1
    out(PR_OUTCOMES.get(status_name, str(status_name)))
    if status_name in ("opened", "updated"):
        out(f"Counts: {_pr_counts(result)}")
    return 0


def cmd_exports(args, settings) -> int:
    conn = bootstrap(settings)
    try:
        counts = exports.write_private_exports(conn, settings)
    finally:
        conn.close()
    out(f"Private lists written to {settings.private_export_dir}: {counts.get('website_prospects', 0)} website"
        f" prospects, {counts.get('hiring_partners', 0)} hiring partners. They are not sent anywhere.")
    return 0


def cmd_backup(args, settings) -> int:
    if below_guard(settings):
        return 1
    conn = bootstrap(settings)
    try:
        path = take_backup(conn, settings, None)
        day = publish.local_date(publish.resolve_now(None))
    finally:
        conn.close()
    if path is None:
        out(f"Today's backup already exists: {settings.backup_dir / f'archive-{day}.db'}")
    else:
        out(f"Backup written: {path} (the newest {settings.backup_keep} are kept).")
    return 0


def suppression_value(settings, args) -> Tuple[str, Optional[str], str]:
    """(kind, normalized value or None, what was given) compared the way privacy.is_suppressed compares."""
    if args.id is not None:
        value = args.id.strip().lower()
        return "public_id", value if re.fullmatch(r"lv-[a-z0-9]{4,40}", value) else None, "a public id (lv-...)"
    if args.domain is not None:
        value = normalize.registrable_domain(args.domain.strip())
        return "domain", value if value and "." in value else None, "a website domain"
    if args.phone is not None:
        value = normalize.norm_phone(args.phone, allow_fictional=settings.allow_fictional_phones)
        return "phone", value, "a US phone number"
    name, zip_code = args.name_zip
    zip5 = normalize.zip5(zip_code)
    if not normalize.norm_name(name) or not zip5:
        return "name_zip", None, "a business name and a 5-digit ZIP"
    return "name_zip", privacy.name_zip_key(name, zip5), "a business name and a 5-digit ZIP"


def cmd_suppress(args, settings) -> int:
    kind, value, wanted = suppression_value(settings, args)
    if value is None:
        err(f"That is not {wanted}; nothing was stored.")
        return 1
    reason = args.reason.strip()
    if not reason:
        err("--reason cannot be empty; nothing was stored.")
        return 1
    conn = bootstrap(settings)
    try:
        cur = conn.execute(
            "INSERT INTO suppressions(kind, value, reason, note, created_at) VALUES (?,?,?,?,?)"
            " ON CONFLICT(kind, value) DO NOTHING",
            (kind, value, reason, (args.note or "").strip() or None, db.now_iso()),
        )
        added = bool(cur.rowcount)
        known = True
        if kind == "public_id":
            known = conn.execute("SELECT 1 FROM businesses WHERE public_id=?", (value,)).fetchone() is not None
        # Re-decide every business and rewrite the publish file at once, so the
        # file on disk never still lists a business after its removal request.
        counts = publish.run_publish(conn, settings)
    finally:
        conn.close()
    label = {"public_id": f"public id {value}", "domain": f"domain {value}", "phone": "that phone number",
             "name_zip": "that name and ZIP"}[kind]
    out(f"{'Suppressed' if added else 'Already suppressed:'} {label}."
        f" {counts.get('suppressed', 0)} business(es) are suppressed in total; the publish file"
        f" ({settings.publish_export_path}) was rewritten.")
    if not known:
        out("No business in the archive has that id yet; the suppression is kept for when it appears.")
    out("Also add it to content/longview-directory/suppressions.json in the repo (see the README).")
    return 0


def _shown_value(conn, row) -> str:
    """The proposed value and page for items about the business's own website fields only."""
    if row["kind"] in PRIVATE_KINDS or row["field"] not in SITE_FIELDS:
        return ""
    parts = []
    if row["proposed_json"] is not None and row["business_id"] is not None:
        from_site = conn.execute(
            "SELECT 1 FROM observations WHERE business_id=? AND field=? AND value_hash=? AND source_id='website'"
            " LIMIT 1",
            (row["business_id"], row["field"], row["proposed_hash"]),
        ).fetchone()
        if from_site:
            parts.append(clip(row["proposed_json"], 80))
    url = publish.http_url(row["source_url"])
    if url:
        parts.append(clip(url, 100))
    return "  ".join(parts)


def cmd_review_list(args, settings) -> int:
    conn = bootstrap(settings)
    try:
        where_sql, params = "r.status='open'", []
        if args.kind:
            where_sql += " AND r.kind=?"
            params.append(args.kind)
        total = conn.execute(f"SELECT COUNT(*) FROM review_queue r WHERE {where_sql}", params).fetchone()[0]
        rows = conn.execute(
            "SELECT r.id, r.kind, r.field, r.business_id, r.proposed_json, r.proposed_hash, r.source_url,"
            f" r.created_at, b.public_id FROM review_queue r LEFT JOIN businesses b ON b.id=r.business_id"
            f" WHERE {where_sql} ORDER BY r.id LIMIT ?",
            (*params, args.limit),
        ).fetchall()
        lines = [(str(r["id"]), r["kind"], r["field"] or "-", r["public_id"] or "-",
                  publish.local_date(r["created_at"]) or "-", _shown_value(conn, r)) for r in rows]
    finally:
        conn.close()
    scope = f" of kind {args.kind}" if args.kind else ""
    if not lines:
        out(f"No open review items{scope}.")
        return 0
    out(f"{'ID':>6}  {'KIND':<22} {'FIELD':<14} {'BUSINESS':<14} {'CREATED':<10}  VALUE")
    for ident, kind, field_name, public_id, created, value in lines:
        out(f"{ident:>6}  {clip(kind, 22):<22} {clip(field_name, 14):<14} {public_id:<14} {created:<10}  {value}")
    more = f" (showing {len(lines)}; use --limit to see more)" if total > len(lines) else ""
    out(f"{total} open review item(s){scope}{more}.")
    out("Decide with: review accept <ID> --actor <name>  or  review reject <ID> --actor <name>")
    return 0


def accept_website_moved(conn, review_id: int, actor: str) -> dict:
    """A person confirms the business's site now lives at the address it redirected to.

    The facts read on the old site no longer describe the business's website,
    so they are cleared and the new address is read again on the next loop,
    with the usual identity check before any fact is written.
    """
    with db.transaction(conn):
        item = conn.execute(
            "SELECT * FROM review_queue WHERE id=? AND status='open' AND kind='website_moved'", (review_id,)
        ).fetchone()
        if item is None:
            raise ValueError(f"review item {review_id} is not an open website_moved item")
        try:
            proposed = json.loads(item["proposed_json"] or "null")
        except ValueError:
            proposed = None
        new_url = normalize.norm_url(proposed) if isinstance(proposed, str) else None
        if not new_url or not item["business_id"]:
            raise ValueError(f"review item {review_id} has no usable new website address")
        now = db.now_iso()
        conn.execute("DELETE FROM facts WHERE business_id=? AND source_id='website'", (item["business_id"],))
        conn.execute("UPDATE hiring_signals SET active=0 WHERE business_id=?", (item["business_id"],))
        conn.execute(
            "UPDATE businesses SET website=?, website_domain=?, website_source='review',"
            " website_status='unknown', next_crawl_at=NULL, crawl_failures=0, updated_at=? WHERE id=?",
            (new_url, normalize.registrable_domain(new_url), now, item["business_id"]),
        )
        conn.execute(
            "UPDATE review_queue SET status='accepted', resolved_at=?, resolved_by=? WHERE id=?",
            (now, actor, review_id),
        )
    return {"id": review_id, "kind": "website_moved", "field": "website", "fact_written": False}


def cmd_review_decide(args, settings, accept: bool) -> int:
    actor = (args.actor or DEFAULT_ACTOR).strip() or DEFAULT_ACTOR
    verb = "accept" if accept else "reject"
    conn = bootstrap(settings)
    try:
        item = conn.execute(
            "SELECT kind, business_id, source_record_id FROM review_queue WHERE id=?", (args.id,)
        ).fetchone()
        try:
            if accept and item is not None and item["kind"] == "website_moved":
                result = accept_website_moved(conn, args.id, actor)
            else:
                result = (facts.accept_review if accept else facts.reject_review)(conn, args.id, actor)
        except ValueError as exc:
            err(f"Could not {verb} review item {args.id}: {exc}.")
            return 1
        if result["kind"] == "merge_ambiguous" and item is not None and item["source_record_id"]:
            # Matching reads the answer when it looks at the record again.
            conn.execute("UPDATE source_records SET match_state='new' WHERE id=?", (item["source_record_id"],))
            matching.match_pending(conn)
        if accept and result["kind"] == "website_identity" and item["business_id"]:
            # The worker honours the accepted review on its next visit; make that visit soon.
            conn.execute("UPDATE businesses SET next_crawl_at=NULL WHERE id=?", (item["business_id"],))
        publish.evaluate(conn, settings)
    finally:
        conn.close()
    written = ", the value is now the fact" if result.get("fact_written") else ""
    out(f"Review item {args.id} {verb}ed by {actor} ({result['kind']}{written}).")
    return 0


# ---------------------------------------------------------------- check

def _writable(path: Path) -> bool:
    try:
        with tempfile.NamedTemporaryFile(dir=str(path), prefix=".check-") as fh:
            fh.write(b"ok")
            fh.flush()
        return True
    except OSError:
        return False


def _read(path: Path) -> Optional[str]:
    try:
        return path.read_text().strip() or None
    except OSError:
        return None


def format_memory_max(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if value == "max":
        return "no limit"
    return f"{int(value) / 1024 ** 2:,.0f} MB" if value.isdigit() else value


def format_cpu_max(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    quota, _, period = value.partition(" ")
    if quota == "max":
        return "no limit"
    if quota.isdigit() and period.isdigit() and int(period):
        return f"{100 * int(quota) / int(period):g}% of one CPU"
    return value


def service_cgroup_info(proc_cgroup: Path = Path("/proc/self/cgroup"), root: Path = CGROUP_ROOT) -> dict:
    """Whether this process runs in the service's cgroup, and the service's memory/CPU caps when readable."""
    paths: List[str] = []
    text = _read(proc_cgroup) or ""
    for line in text.splitlines():
        parts = line.split(":", 2)
        if len(parts) == 3:
            paths.append(parts[2])
    under = any(SERVICE_UNIT in p.split("/") for p in paths)
    candidates = [root / p.lstrip("/") for p in paths if SERVICE_UNIT in p.split("/")]
    candidates.append(root / "system.slice" / SERVICE_UNIT)
    for folder in candidates:
        memory = format_memory_max(_read(folder / "memory.max"))
        cpu = format_cpu_max(_read(folder / "cpu.max"))
        if memory or cpu:
            return {"under_service": under, "memory_max": memory, "cpu_max": cpu, "cgroup": str(folder)}
    return {"under_service": under, "memory_max": None, "cpu_max": None, "cgroup": None}


def cmd_check(args, settings) -> int:
    problems: List[str] = []
    out(f"Longview archive self-check (version {config.VERSION})")
    out(f"  Data folder: {settings.data_dir}")
    try:
        settings.ensure_dirs()
    except OSError as exc:
        problems.append(f"the data folders cannot be created ({type(exc).__name__})")
    folders = (settings.data_dir, settings.db_path.parent, settings.www_dir, settings.www_dir / "status",
               settings.backup_dir, settings.publish_export_path.parent, settings.private_export_dir)
    unwritable = [str(p) for p in folders if not _writable(p)]
    if unwritable:
        problems.append("not writable: " + ", ".join(unwritable))
    out(f"  Folders writable: {'no' if unwritable else 'yes'}")

    conn = None
    try:
        conn = bootstrap(settings)
        version = db.get_meta(conn, "schema_version")
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        missing = sorted(EXPECTED_TABLES - tables)
        out(f"  Database: {settings.db_path}, schema version {version} (expected {db.SCHEMA_VERSION})")
        if missing:
            problems.append("database tables missing: " + ", ".join(missing))
        if version != str(db.SCHEMA_VERSION):
            problems.append(f"schema version is {version}, expected {db.SCHEMA_VERSION}")
        out(f"  Engine state: {db.get_meta(conn, 'state') or 'never run'};"
            f" last heartbeat {db.get_meta(conn, 'heartbeat_at') or 'none yet'}")
    except Exception as exc:  # noqa: BLE001 - reported as a problem, not a traceback
        problems.append(f"the database cannot be opened or migrated ({type(exc).__name__})")
    finally:
        if conn is not None:
            conn.close()

    free = disk_free(settings)
    low = free is None or free < settings.disk_guard_bytes
    out(f"  Disk: {gb(free)} free; the guard stops sync and crawl under {gb(settings.disk_guard_bytes)}"
        f" ({'BELOW GUARD' if low else 'ok'})")
    if low:
        problems.append("free disk space is below the guard" if free is not None else "free disk space unknown")

    paused = settings.pause_file.exists()
    out(f"  PAUSE file: {'present, the engine stays idle' if paused else 'not present'} ({settings.pause_file})")
    out(f"  Crawl caps: {settings.max_sites_concurrent} sites at a time, {settings.min_host_delay_s:g} s between"
        f" requests to one host, {settings.max_pages_per_visit} pages per visit,"
        f" {settings.max_page_bytes / 1_000_000:g} MB per page, {settings.request_timeout_s:g} s timeout")
    if settings.allow_private_hosts:
        out("  WARNING: LVA_ALLOW_PRIVATE_HOSTS is set (tests only; never on the droplet)")
        if Path(settings.data_dir) == config.Settings().data_dir:
            problems.append("LVA_ALLOW_PRIVATE_HOSTS is set for the production data folder: the SSRF guard is off")
    info = service_cgroup_info()
    out(f"  Running under {SERVICE_UNIT}: {'yes' if info['under_service'] else 'no (normal for lva commands)'}")
    if info["cgroup"]:
        out(f"  Service caps: memory.max {info['memory_max'] or 'unreadable'},"
            f" cpu.max {info['cpu_max'] or 'unreadable'} ({info['cgroup']})")
    else:
        out("  Service caps: not readable here (the service may not be running)")

    if problems:
        out(f"Result: {len(problems)} problem(s)")
        for problem in problems:
            out(f"  - {problem}")
        return 1
    out("Result: OK")
    return 0


# ---------------------------------------------------------------- parser

def _positive_int(text: str) -> int:
    value = int(text)
    if value < 1:
        raise argparse.ArgumentTypeError("must be 1 or more")
    return value


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m longview_archive",
        description="The Longview Business Archive engine (The LeadFlow Pro). See README.md for the runbook.",
    )
    parser.add_argument("--version", action="version", version=f"longview_archive {config.VERSION}")
    sub = parser.add_subparsers(dest="command", metavar="<command>")
    sub.required = True

    def add(name: str, handler, help_text: str) -> argparse.ArgumentParser:
        p = sub.add_parser(name, help=help_text, description=help_text)
        p.set_defaults(handler=handler)
        return p

    add("run", cmd_run, "Run the service loop (systemd starts this)")
    add("migrate", cmd_migrate, "Create or update the database tables")
    add("check", cmd_check, "Self-test: settings, database, disk, pause, caps")
    add("status", cmd_status, "Write the status page now")
    p = add("sync", cmd_sync, "Pull open data now, then match new records")
    p.add_argument("source", nargs="?", default="all", choices=[*SYNC_BY_NAME, "all"],
                   help="which source (default: all)")
    add("match", cmd_match, "Match new records to businesses")
    p = add("crawl-once", cmd_crawl_once, "Visit due websites once (only while the service is stopped)")
    p.add_argument("--limit", type=_positive_int, default=None, metavar="N",
                   help="visit up to N websites (default: the concurrency cap)")
    p = add("publish", cmd_publish, "Write the publish file now")
    p.add_argument("--out", metavar="PATH", default=None,
                   help="where to write it (default: exports/publish/directory.json)")
    p = add("publish-pr", cmd_publish_pr,
            "Open or update the one batch pull request (off unless the GitHub token file exists)")
    p.add_argument("--dry-run", action="store_true",
                   help="print the pull request title, body, and counts; no network call")
    p.add_argument("--base", metavar="PATH", default=None,
                   help="dry run: compare with this directory file (default: the last copy of main's file)")
    p.add_argument("--allow-large-removal", action="store_true",
                   help="a person checked a held batch that removes more than 25%%; propose it anyway")
    add("exports", cmd_exports, "Write the private CSV lists (never sent anywhere)")
    add("backup", cmd_backup, "Take a database backup now")

    p = add("suppress", cmd_suppress, "Stop publishing a business (a removal request)")
    target = p.add_mutually_exclusive_group(required=True)
    target.add_argument("--id", metavar="PUBLIC_ID", help="the business id (starts with lv-)")
    target.add_argument("--domain", metavar="DOMAIN", help="a website domain or URL")
    target.add_argument("--phone", metavar="PHONE", help="a phone number")
    target.add_argument("--name-zip", nargs=2, metavar=("NAME", "ZIP"), help="a business name and its ZIP")
    p.add_argument("--reason", required=True, help="why (for example: owner asked)")
    p.add_argument("--note", default=None, help="an optional note")

    review = sub.add_parser("review", help="The review queue: list, accept, reject",
                            description="The review queue: list, accept, reject")
    rsub = review.add_subparsers(dest="review_command", metavar="<list|accept|reject>")
    rsub.required = True
    p = rsub.add_parser("list", help="List open review items")
    p.add_argument("--kind", default=None, help="only this kind (for example: field_conflict)")
    p.add_argument("--limit", type=_positive_int, default=50, metavar="N", help="show up to N (default 50)")
    p.set_defaults(handler=cmd_review_list)
    for name, accept in (("accept", True), ("reject", False)):
        p = rsub.add_parser(name, help=f"{name.capitalize()} a review item")
        p.add_argument("id", type=int, metavar="ID", help="the number review list shows")
        p.add_argument("--actor", default=None, metavar="NAME",
                       help=f"who decided (recorded; default: {DEFAULT_ACTOR})")
        p.set_defaults(handler=lambda a, s, accept=accept: cmd_review_decide(a, s, accept))
    return parser


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    level = logging.INFO if args.command == "run" else logging.WARNING
    logging.basicConfig(level=level, stream=sys.stderr, format=LOG_FORMAT)
    try:
        settings = config.load_settings()
    except ValueError as exc:
        err(f"Settings problem: {exc}")
        return 1
    label = args.command if args.command != "review" else f"review {args.review_command}"
    try:
        return int(args.handler(args, settings) or 0)
    except KeyboardInterrupt:
        err(f"{label}: interrupted.")
        return 130
    except Exception as exc:  # noqa: BLE001 - one plain line; messages can carry data, so the class only
        err(f"{label} failed: {type(exc).__name__} at {where(exc)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
