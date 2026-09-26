"""Nightly database backups: one file per America/Chicago date, newest 14 kept.

The service keeps writing while a backup runs, so the copy uses SQLite's
online backup API (a consistent snapshot, not a file copy of a live WAL
database). The copy is switched to a plain rollback journal so each backup is
one self-contained file, written under a temporary name and renamed into place
so a crash never leaves a half backup that looks complete. Retention deletes
only files named exactly ``archive-YYYY-MM-DD.db``; anything else an operator
puts in the folder is left alone.
"""

from __future__ import annotations

import logging
import os
import re
import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional, Union

log = logging.getLogger(__name__)

NAME_RE = re.compile(r"archive-(\d{4}-\d{2}-\d{2})\.db")
FILE_MODE = 0o600


def backup_name(day: str) -> str:
    return f"archive-{day}.db"


def _day(today: Union[str, date, datetime]) -> str:
    text = today.strftime("%Y-%m-%d") if isinstance(today, (date, datetime)) else str(today).strip()
    datetime.strptime(text, "%Y-%m-%d")  # ValueError on anything that is not a real date
    return text


def backup_files(folder: Path) -> List[Path]:
    """Backups in ``folder`` by the date in their name, newest first."""
    if not folder.is_dir():
        return []
    found = []
    for path in folder.iterdir():
        m = NAME_RE.fullmatch(path.name)
        if not m or not path.is_file() or path.is_symlink():
            continue
        try:
            _day(m.group(1))
        except ValueError:
            continue  # not a date we would have written: not ours to delete
        found.append((m.group(1), path))
    return [path for _, path in sorted(found, reverse=True)]


def prune(folder: Path, keep: int) -> List[Path]:
    """Delete all but the newest ``keep`` backups; returns what was deleted."""
    removed = []
    for path in backup_files(folder)[max(int(keep), 1):]:
        try:
            path.unlink()
            removed.append(path)
        except FileNotFoundError:
            pass
    return removed


def _remove_partial(partial: Path) -> None:
    for suffix in ("", "-journal", "-wal", "-shm"):
        try:
            Path(str(partial) + suffix).unlink()
        except FileNotFoundError:
            pass


def nightly_backup(conn: sqlite3.Connection, settings, today: Union[str, date, datetime]) -> Optional[Path]:
    """Back up the open database to ``backups/archive-<today>.db``.

    ``today`` is the local (America/Chicago) date. Returns the new file, or
    None when that date's backup already exists. Keeps the newest
    ``settings.backup_keep`` backups.
    """
    day = _day(today)
    folder = Path(settings.backup_dir)
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    target = folder / backup_name(day)
    if target.exists():
        return None
    partial = folder / f".{backup_name(day)}.partial"
    _remove_partial(partial)  # our own temporary files from an interrupted run
    fd = os.open(str(partial), os.O_WRONLY | os.O_CREAT | os.O_EXCL, FILE_MODE)
    os.close(fd)
    try:
        dest = sqlite3.connect(str(partial))
        try:
            conn.backup(dest)
            dest.execute("PRAGMA journal_mode=DELETE")
        finally:
            dest.close()
        os.chmod(partial, FILE_MODE)
        os.replace(partial, target)
    except BaseException:
        _remove_partial(partial)
        raise
    removed = prune(folder, settings.backup_keep)
    log.info("backup written for %s (%d bytes); %d old backups removed", day, target.stat().st_size, len(removed))
    return target
