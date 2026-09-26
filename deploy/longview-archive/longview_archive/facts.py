"""Fill-only fact rules: the one place a website value becomes a published fact.

A verified fact is never replaced by a different value on its own. The first
confident, unflagged value fills the field; the same value later only refreshes
``checked_at``; a different, uncertain, or flagged value waits in the review
queue. ``accept_review`` is the only path that replaces a fact, and it records
the person who did it. Every value seen is kept in ``observations`` so a
reviewer can see where it came from.
"""

from __future__ import annotations

import json
import logging
import re
import sqlite3
from datetime import datetime
from typing import Any, Optional

from . import db, normalize

log = logging.getLogger(__name__)

FIELDS = (
    "website", "phone", "email", "hours", "facebook", "instagram", "careers",
    "services", "address_listed", "name_on_site",
)
URL_FIELDS = frozenset({"website", "facebook", "instagram", "careers"})
DAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

CONFIDENCE_FLOOR = 0.8
# Default confidence per extraction method (SPEC "facts.py"). Callers pass the
# number; this table keeps the extractors and the floor in one place.
METHOD_CONFIDENCE = {"jsonld": 0.95, "tel_link": 0.95, "mailto": 0.9, "text": 0.8}

ACCEPTED, CONFIRMED, REVIEW, REJECTED = "accepted", "confirmed", "review", "rejected"

_E164 = re.compile(r"\+1[2-9]\d{2}[2-9]\d{6}")
_TIME = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d|24:00")


def _iso(value: Any) -> str:
    """UTC ISO string from None (now), a datetime, or an ISO string."""
    if value is None or isinstance(value, datetime):
        return db.now_iso(value)
    return str(value)


def _canonical_hours(value: Any) -> Optional[dict]:
    if not isinstance(value, dict) or not value:
        return None
    out = {}
    for day in sorted(value):
        if day not in DAY_KEYS:
            return None
        ranges = value[day]
        if not isinstance(ranges, (list, tuple)):
            return None
        pairs = []
        for pair in ranges:
            if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                return None
            opens, closes = str(pair[0]), str(pair[1])
            if not _TIME.fullmatch(opens) or not _TIME.fullmatch(closes):
                return None
            pairs.append([opens, closes])
        out[day] = sorted(pairs)
    return out


def canonical(field: str, value: Any) -> Any:
    """The comparable form of a value, or None when it is empty or unusable."""
    if value is None:
        return None
    if field == "phone":
        text = str(value).strip()
        # Extractors hand over E.164 already checked with the right fictional
        # setting; anything else is parsed strictly here.
        return text if _E164.fullmatch(text) else normalize.norm_phone(text)
    if field == "email":
        text = str(value).strip().lower()
        if text.startswith("mailto:"):
            text = text[7:]
        return text if text.count("@") == 1 and "." in text.split("@")[1] and " " not in text else None
    if field in URL_FIELDS:
        return normalize.norm_url(str(value))
    if field == "hours":
        return _canonical_hours(value)
    if field == "services":
        if isinstance(value, str) or not isinstance(value, (list, tuple, set, frozenset)):
            return None
        tags = sorted({str(tag).strip() for tag in value if str(tag).strip()})
        return tags or None
    if field == "address_listed":
        if isinstance(value, bool):
            return value
        if isinstance(value, int) and value in (0, 1):
            return bool(value)
        return None
    if field == "name_on_site":
        text = re.sub(r"\s+", " ", str(value)).strip()
        return text or None
    return None


def _upsert_observation(conn, business_id, field, value, source_id, source_url, method,
                        confidence, observed_at) -> None:
    conn.execute(
        "INSERT INTO observations(business_id, field, value_json, value_hash, source_id, source_url,"
        " method, confidence, first_observed_at, last_observed_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
        " ON CONFLICT(business_id, field, value_hash, source_url) DO UPDATE SET"
        "  last_observed_at=MAX(observations.last_observed_at, excluded.last_observed_at),"
        "  method=CASE WHEN excluded.confidence > observations.confidence"
        "              THEN excluded.method ELSE observations.method END,"
        "  source_id=CASE WHEN excluded.confidence > observations.confidence"
        "              THEN excluded.source_id ELSE observations.source_id END,"
        "  confidence=MAX(observations.confidence, excluded.confidence)",
        (business_id, field, db.dumps(value), db.value_hash(value), source_id, source_url or "",
         method, float(confidence), observed_at, observed_at),
    )


def get_fact(conn: sqlite3.Connection, business_id: int, field: str) -> Optional[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM facts WHERE business_id=? AND field=?", (business_id, field)
    ).fetchone()


def observe(
    conn: sqlite3.Connection,
    business_id: int,
    field: str,
    value: Any,
    source_id: str,
    source_url: Optional[str],
    method: str,
    confidence: float,
    observed_at: Any = None,
    flagged: Optional[str] = None,
) -> str:
    """Record one observed value and apply the fill-only rules.

    Returns ``accepted`` (new fact), ``confirmed`` (same value as the fact;
    ``checked_at`` bumped), ``review`` (a different value, confidence under
    the floor, or ``flagged`` by an extractor; the fact is unchanged), or
    ``rejected`` (None, empty, or unusable; nothing is stored). A flag without
    a value is the caller's to queue with ``db.add_review``.
    """
    if field not in FIELDS:
        log.warning("observe: unknown field %r for business %s", field, business_id)
        return REJECTED
    value = canonical(field, value)
    if value is None:
        return REJECTED
    observed_at = _iso(observed_at)
    confidence = float(confidence)
    with db.transaction(conn):
        _upsert_observation(conn, business_id, field, value, source_id, source_url, method,
                            confidence, observed_at)
        fact = get_fact(conn, business_id, field)
        if fact is not None and canonical(field, json.loads(fact["value_json"])) == value:
            better = confidence > float(fact["confidence"])
            conn.execute(
                "UPDATE facts SET checked_at=MAX(checked_at, ?),"
                " source_url=CASE WHEN ? THEN ? ELSE source_url END,"
                " method=CASE WHEN ? THEN ? ELSE method END,"
                " confidence=MAX(confidence, ?)"
                " WHERE business_id=? AND field=?",
                (observed_at, better, source_url, better, method, confidence, business_id, field),
            )
            return CONFIRMED
        if fact is None and not flagged and confidence >= CONFIDENCE_FLOOR:
            conn.execute(
                "INSERT INTO facts(business_id, field, value_json, source_id, source_url, method,"
                " confidence, first_observed_at, checked_at, accepted_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (business_id, field, db.dumps(value), source_id, source_url, method, confidence,
                 observed_at, observed_at, "rules"),
            )
            return ACCEPTED
        current = None if fact is None else json.loads(fact["value_json"])
        # Flag kinds come from extractors (ambiguous_ampm, phone_out_of_area,
        # social_mismatch, ...); an unflagged value that differs from the fact
        # is a conflict; a first value under the floor is low confidence.
        if flagged:
            kind = flagged
        elif fact is not None:
            kind = "field_conflict"
        else:
            kind = "low_confidence"
        db.add_review(
            conn,
            kind=kind,
            business_id=business_id,
            field=field,
            proposed=value,
            current=current,
            source_url=source_url,
            detail=f"{source_id} via {method}, confidence {confidence:.2f}",
            now=observed_at,
        )
        log.info("observe: business %s field %s -> review (%s)", business_id, field, kind)
        return REVIEW


def _open_item(conn: sqlite3.Connection, review_id: int) -> sqlite3.Row:
    item = conn.execute("SELECT * FROM review_queue WHERE id=?", (review_id,)).fetchone()
    if item is None:
        raise ValueError(f"review item {review_id} does not exist")
    if item["status"] != "open":
        raise ValueError(f"review item {review_id} is already {item['status']}")
    return item


def _resolve(conn, review_id: int, status: str, actor: str, now: str) -> None:
    conn.execute(
        "UPDATE review_queue SET status=?, resolved_at=?, resolved_by=? WHERE id=?",
        (status, now, actor, review_id),
    )


def accept_review(conn: sqlite3.Connection, review_id: int, actor: str, now: Any = None) -> dict:
    """A person accepts a review item. For a field value, it becomes the fact.

    This is the only path that replaces an existing fact. The fact keeps the
    provenance of the observation that proposed it (source, page, method) and
    records ``accepted_by=actor``. Items that are not a field value (a merge,
    a name check) are only marked accepted. Raises ValueError when the item is
    missing, already resolved, or its value has no recorded observation (no
    provenance is ever invented).
    """
    if not actor or not str(actor).strip():
        raise ValueError("accept_review needs the name of the person accepting")
    now = _iso(now)
    with db.transaction(conn):
        item = _open_item(conn, review_id)
        wrote = False
        if item["field"] in FIELDS and item["proposed_json"] is not None and item["business_id"]:
            obs = conn.execute(
                "SELECT * FROM observations WHERE business_id=? AND field=? AND value_hash=?"
                " ORDER BY (source_url = ?) DESC, confidence DESC, last_observed_at DESC, id LIMIT 1",
                (item["business_id"], item["field"], item["proposed_hash"], item["source_url"] or ""),
            ).fetchone()
            if obs is None:
                raise ValueError(
                    f"review item {review_id} has no recorded observation for its value; nothing written"
                )
            conn.execute(
                "INSERT INTO facts(business_id, field, value_json, source_id, source_url, method,"
                " confidence, first_observed_at, checked_at, accepted_by) VALUES (?,?,?,?,?,?,?,?,?,?)"
                " ON CONFLICT(business_id, field) DO UPDATE SET value_json=excluded.value_json,"
                "  source_id=excluded.source_id, source_url=excluded.source_url, method=excluded.method,"
                "  confidence=excluded.confidence, first_observed_at=excluded.first_observed_at,"
                "  checked_at=excluded.checked_at, accepted_by=excluded.accepted_by",
                (item["business_id"], item["field"], obs["value_json"], obs["source_id"],
                 obs["source_url"] or None, obs["method"], obs["confidence"], obs["first_observed_at"],
                 obs["last_observed_at"], str(actor).strip()),
            )
            wrote = True
        _resolve(conn, review_id, "accepted", str(actor).strip(), now)
    log.info("review %s accepted (kind %s, fact written: %s)", review_id, item["kind"], wrote)
    return {"id": review_id, "kind": item["kind"], "field": item["field"], "fact_written": wrote}


def reject_review(conn: sqlite3.Connection, review_id: int, actor: str, now: Any = None) -> dict:
    """A person rejects a review item. The fact, if any, stays as it was.

    The rejected item keeps its dedupe key, so the same proposed value is not
    queued again on the next visit.
    """
    if not actor or not str(actor).strip():
        raise ValueError("reject_review needs the name of the person rejecting")
    now = _iso(now)
    with db.transaction(conn):
        item = _open_item(conn, review_id)
        _resolve(conn, review_id, "rejected", str(actor).strip(), now)
    log.info("review %s rejected (kind %s)", review_id, item["kind"])
    return {"id": review_id, "kind": item["kind"], "field": item["field"], "fact_written": False}
