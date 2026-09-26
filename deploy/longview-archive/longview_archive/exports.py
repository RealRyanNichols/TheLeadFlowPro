"""Private CSV lists for the owner: website prospects and hiring partners.

Nothing here is sent anywhere, and nothing here contacts a business. The files
sit in ``exports/private/`` (directory 0700, files 0600) and stay unused until
the owner approves a use. Every column is taken from
``publish.business_profile``, so a list never shows more than the public
directory would: the same names, the same "Longview, TX" address fallback, and
phone or email only when the business's own website lists them.
"""

from __future__ import annotations

import csv
import io
import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, Sequence

from . import privacy, publish
from .categories import CATEGORY_NAMES

log = logging.getLogger(__name__)

PROSPECTS_FILE = "website-prospects.csv"
HIRING_FILE = "hiring-partners.csv"
PROSPECT_COLUMNS = ("id", "name", "category", "address", "permit_since", "website_status")
HIRING_COLUMNS = ("id", "name", "category", "careers_url", "roles", "phone", "email")


def display_address(profile: dict) -> str:
    """The address line exactly as a profile page would show it."""
    address = profile["address"]
    if address["street"] and address["zip"]:
        return f"{address['street']}, Longview, TX {address['zip']}"
    return "Longview, TX"


def _cell(value: Any) -> str:
    # A leading = + - @ would run as a formula when the file is opened in a
    # spreadsheet; a quote keeps it text.
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


def _write_csv(path: Path, header: Sequence[str], rows: Iterable[Sequence[Any]]) -> None:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(header)
    for row in rows:
        writer.writerow([_cell(value) for value in row])
    publish.atomic_write(path, buffer.getvalue().encode("utf-8"), 0o600)


def write_private_exports(conn: sqlite3.Connection, settings, now: Any = None) -> Dict[str, int]:
    """Write both private lists; returns row counts. Local files only."""
    sources = publish.load_sources(conn)
    prospects, partners = [], []
    for business in conn.execute("SELECT * FROM businesses WHERE publish_state='ready' ORDER BY id").fetchall():
        if privacy.is_suppressed(conn, business):
            continue
        profile = publish.business_profile(conn, settings, business, sources)
        if profile is None:
            continue
        category = CATEGORY_NAMES.get(profile["category"], profile["category"])
        has_site = bool((business["website"] or "").strip())
        if business["scope"] == "city" and (not has_site or business["website_status"] == "dead"):
            prospects.append((
                profile["id"], profile["name"], category, display_address(profile),
                profile["permitSince"] or "", business["website_status"] if has_site else "none",
            ))
        signal = conn.execute(
            "SELECT roles_json FROM hiring_signals WHERE business_id=? AND active=1", (business["id"],)
        ).fetchone()
        if signal is not None:
            partners.append((
                profile["id"], profile["name"], category, profile["careersUrl"] or "",
                "; ".join(publish.filter_roles(signal["roles_json"])),
                profile["phone"]["display"] if profile["phone"] else "", profile["email"] or "",
            ))

    out_dir = settings.private_export_dir
    out_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    by_name = lambda row: (str(row[1]).casefold(), row[0])  # noqa: E731
    _write_csv(out_dir / PROSPECTS_FILE, PROSPECT_COLUMNS, sorted(prospects, key=by_name))
    _write_csv(out_dir / HIRING_FILE, HIRING_COLUMNS, sorted(partners, key=by_name))
    counts = {"website_prospects": len(prospects), "hiring_partners": len(partners)}
    log.info("private exports written: %s", counts)
    return counts
