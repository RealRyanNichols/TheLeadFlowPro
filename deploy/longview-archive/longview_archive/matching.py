"""Matching: decide which physical business each source record describes.

Open data lists the same shop several times (a sales-tax outlet, a TABC
license, an NPI organization, an OpenStreetMap node), each spelled its own way.
This module joins records only on evidence a person would accept: the same
phone at the same street, the same address with a similar name, or the same
website at the same address. Anything less certain goes to the review queue
instead of creating a duplicate, and a chain's locations or a building's
tenants never collapse into one listing. Every join writes a ``merges`` row with
a plain sentence saying why, so the source trail can be checked by hand.

Joining fills empty business columns only; it never overwrites a value, and it
never touches a suppressed business beyond linking the record. Only primary
public records (sales tax, TABC, NPI) create publishable businesses. A place
known only from OpenStreetMap is kept for review until a primary record joins
it and gives it that record's name.

A batch is processed by source priority and then by source key, so the same
records produce the same businesses, public ids, and slugs whatever order they
were inserted in. Logs carry counts and row ids only.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, NamedTuple, Optional, Sequence, Tuple, Union

from . import categories, db, normalize, privacy

logger = logging.getLogger(__name__)

PRIMARY_SOURCES: Tuple[str, ...] = ("tx_sales_tax", "tx_tabc", "npi")
SOURCE_PRIORITY: Dict[str, int] = {"tx_sales_tax": 0, "tx_tabc": 1, "npi": 2, "osm": 3}
SOURCE_LABELS: Dict[str, str] = {
    "tx_sales_tax": "sales tax",
    "tx_tabc": "TABC",
    "npi": "NPI",
    "osm": "OpenStreetMap",
}
# Where a website candidate came from (businesses.website_source).
WEBSITE_SOURCES: Dict[str, str] = {"osm": "osm", "npi": "npi", "tx_tabc": "tx_tabc"}

RESERVED_SLUGS = frozenset({"about", "new", "hiring", "category", "page", "search", "status"})

MERGE_SIMILARITY = 0.6
REVIEW_SIMILARITY = 0.4
SHARED_LINE_STREETS = 3
BATCH_SIZE = 500
MAX_PASSES = 3  # a newly found shared line re-queues its held records once

OSM_ONLY_REASON = "osm_only_needs_primary_source"
MATCHER = "matching"

# Rule names written to merges.rule and MatchResult.rule.
RULE_EXISTING = "existing_link"
RULE_REVIEWED = "reviewed_merge"
RULE_PHONE = "same_phone"
RULE_ADDRESS_NAME = "same_address_similar_name"
RULE_DOMAIN_ADDRESS = "same_domain_same_address"
RULE_NEW = "new_business"
RULE_OSM_ONLY = OSM_ONLY_REASON
REVIEW_PHONE_STREET = "same_phone_different_street"
REVIEW_PHONE_MANY = "same_phone_several_businesses"
REVIEW_ADDRESS_MANY = "same_address_several_businesses"
REVIEW_ADDRESS_PARTIAL = "same_address_partial_name"

_ORDER_SQL = (
    "CASE source_id WHEN 'tx_sales_tax' THEN 0 WHEN 'tx_tabc' THEN 1"
    " WHEN 'npi' THEN 2 WHEN 'osm' THEN 3 ELSE 4 END, source_key, id"
)
_PRIMARY_SQL = "('tx_sales_tax','tx_tabc','npi')"

Now = Union[str, datetime, None]


class MatchResult(NamedTuple):
    action: str  # matched | created | review | ignored
    business_id: Optional[int]  # the linked business; None while held for review
    rule: str
    explanation: str  # may name a phone or street: store it, never log it


@dataclass(frozen=True)
class _Rec:
    """The normalized projection of one source record, with safe fallbacks."""

    id: int
    source_id: str
    source_key: str
    business_id: Optional[int]
    source_url: str
    active: bool
    name: str
    name_norm: str
    street_line: str
    street_norm: str
    suite: str
    city: str
    zip: str
    phone: str
    website: str
    website_domain: str
    naics: str
    lat: Optional[float]
    lon: Optional[float]
    permit_start: str
    is_individual: int
    scope: str
    tags: dict

    @property
    def is_primary(self) -> bool:
        return self.source_id in PRIMARY_SOURCES

    @property
    def label(self) -> str:
        return SOURCE_LABELS.get(self.source_id, self.source_id)

    def street_display(self) -> str:
        line = self.street_line or (
            self.street_norm + (f" ste {self.suite}" if self.suite else "") if self.street_norm else ""
        )
        return normalize.display_street(line) if line else ""


def _stamp(now: Now) -> str:
    if now is None:
        return db.now_iso()
    if isinstance(now, datetime):
        return db.now_iso(now)
    return str(now)


def _load(row: sqlite3.Row) -> _Rec:
    street_line = (row["street"] or "").strip()
    street_norm = (row["street_norm"] or "").strip()
    suite = (row["suite"] or "").strip()
    if street_line and not street_norm:
        street_norm, parsed_suite = normalize.parse_street(street_line)
        suite = suite or parsed_suite
    name = (row["name"] or "").strip()
    website = normalize.norm_url(row["website"]) if row["website"] else None
    domain = (row["website_domain"] or "").strip().lower()
    if website and not domain:
        domain = normalize.registrable_domain(website)
    if not website:
        domain = ""
    tags: dict = {}
    if row["tags_json"]:
        try:
            decoded = json.loads(row["tags_json"])
            tags = decoded if isinstance(decoded, dict) else {}
        except ValueError:
            tags = {}
    return _Rec(
        id=int(row["id"]),
        source_id=row["source_id"],
        source_key=row["source_key"],
        business_id=row["business_id"],
        source_url=row["source_url"],
        active=bool(row["active"]),
        name=name,
        name_norm=(row["name_norm"] or "").strip() or normalize.norm_name(name),
        street_line=street_line,
        street_norm=street_norm,
        suite=suite,
        city=(row["city"] or "").strip(),
        zip=normalize.zip5(row["zip"]) or "",
        phone=(row["phone"] or "").strip(),
        website=website or "",
        website_domain=domain,
        naics=(row["naics"] or "").strip(),
        lat=row["lat"],
        lon=row["lon"],
        permit_start=(row["permit_start"] or "").strip(),
        is_individual=1 if row["is_individual"] else 0,
        scope=row["scope"] or "city",
        tags=tags,
    )


# ---------------------------------------------------------------- comparisons

def _compatible(a: Optional[str], b: Optional[str]) -> bool:
    """Equal, or one side unknown (an OSM node often has no postcode or suite)."""
    return not a or not b or a == b


def _same_address(rec: _Rec, biz: sqlite3.Row) -> bool:
    return (
        bool(rec.street_norm)
        and rec.street_norm == (biz["street_norm"] or "")
        and _compatible(rec.zip, biz["zip"])
        and _compatible(rec.suite, biz["suite"])
    )


def _phone_addresses_agree(rec: _Rec, biz: sqlite3.Row) -> bool:
    if not rec.street_norm or not biz["street_norm"]:
        return True
    return rec.street_norm == biz["street_norm"] and _compatible(rec.zip, biz["zip"])


def _names(conn: sqlite3.Connection, biz: sqlite3.Row) -> List[str]:
    names = [biz["name"]]
    names += [r["name"] for r in conn.execute(
        "SELECT name FROM source_records WHERE business_id=? AND name IS NOT NULL AND name != ''",
        (biz["id"],),
    )]
    return names


def _similarity(conn: sqlite3.Connection, rec: _Rec, biz: sqlite3.Row) -> float:
    if not rec.name:
        return 0.0
    return max(normalize.name_similarity(rec.name, other) for other in _names(conn, biz))


def _domains(conn: sqlite3.Connection, biz: sqlite3.Row) -> set:
    domains = {r["website_domain"] for r in conn.execute(
        "SELECT website_domain FROM source_records WHERE business_id=? AND website_domain IS NOT NULL"
        " AND website_domain != ''",
        (biz["id"],),
    )}
    if biz["website_domain"]:
        domains.add(biz["website_domain"])
    return {d.lower() for d in domains}


def _business(conn: sqlite3.Connection, business_id: int) -> Optional[sqlite3.Row]:
    return conn.execute("SELECT * FROM businesses WHERE id=?", (business_id,)).fetchone()


def _is_suppressed(conn: sqlite3.Connection, biz: sqlite3.Row) -> bool:
    return biz["publish_state"] == "suppressed" or privacy.is_suppressed(conn, biz)


def _ref(biz: sqlite3.Row) -> str:
    return biz["public_id"] or f"#{biz['id']}"


# ---------------------------------------------------------------- review helpers

def _decisions(conn: sqlite3.Connection, rec: _Rec) -> Tuple[List[int], set]:
    """Human answers to earlier merge questions about this record."""
    accepted, rejected = [], set()
    for row in conn.execute(
        "SELECT business_id, status FROM review_queue WHERE source_record_id=? AND kind='merge_ambiguous'"
        " AND status IN ('accepted','rejected') AND business_id IS NOT NULL ORDER BY business_id",
        (rec.id,),
    ):
        (accepted.append if row["status"] == "accepted" else rejected.add)(row["business_id"])
    return accepted, rejected


def _resolve_merge_reviews(conn: sqlite3.Connection, rec_id: int, stamp: str, keep: Sequence[int] = ()) -> None:
    """Close this record's open merge questions that no longer apply."""
    keep_list = list(keep)
    marks = ",".join("?" * len(keep_list))
    extra = f" AND business_id NOT IN ({marks})" if keep_list else ""
    conn.execute(
        "UPDATE review_queue SET status='resolved', resolved_at=?, resolved_by=?"
        " WHERE source_record_id=? AND kind='merge_ambiguous' AND status='open'" + extra,
        (stamp, MATCHER, rec_id, *keep_list),
    )


def _open_merge_review(conn: sqlite3.Connection, rec: _Rec, business_id: int, detail: str, stamp: str) -> None:
    added = db.add_review(
        conn, kind="merge_ambiguous", business_id=business_id, source_record_id=rec.id,
        source_url=rec.source_url, detail=detail, now=stamp,
    )
    if added is None:
        # Same question asked before and closed by matching: ask it again.
        conn.execute(
            "UPDATE review_queue SET status='open', detail=?, resolved_at=NULL, resolved_by=NULL"
            " WHERE business_id=? AND source_record_id=? AND kind='merge_ambiguous' AND field=''"
            " AND proposed_hash='' AND status='resolved'",
            (detail, business_id, rec.id),
        )


def _shared_line(conn: sqlite3.Connection, phone: str, stamp: str) -> bool:
    """A phone listed at three or more streets is a shared or central line."""
    streets = conn.execute(
        "SELECT COUNT(DISTINCT street_norm) FROM source_records WHERE phone=? AND active=1"
        " AND street_norm IS NOT NULL AND street_norm != ''",
        (phone,),
    ).fetchone()[0]
    if streets < SHARED_LINE_STREETS:
        return False
    proposed_hash = db.value_hash(phone)
    prior = conn.execute(
        "SELECT status FROM review_queue WHERE kind='shared_phone' AND field='phone' AND proposed_hash=?"
        " AND business_id IS NULL AND source_record_id IS NULL",
        (proposed_hash,),
    ).fetchone()
    if prior is not None and prior["status"] == "rejected":
        return False  # a person said this line identifies one business
    if prior is None:
        review_id = db.add_review(
            conn, kind="shared_phone", field="phone", proposed=phone, now=stamp,
            detail=(
                f"This phone is listed by active records at {streets} different streets, so it is"
                " treated as a shared line and never used to join records."
            ),
        )
        if review_id is not None:
            # Records held earlier because of this phone get another look.
            requeued = conn.execute(
                "UPDATE source_records SET match_state='new' WHERE phone=? AND match_state='review'"
                " AND active=1",
                (phone,),
            ).rowcount
            logger.info("shared phone line found at %d streets (review %d, %d records requeued)",
                        streets, review_id, requeued)
    return True


# ---------------------------------------------------------------- business updates

def _scope_for(conn: sqlite3.Connection, business_id: int, current: str) -> str:
    """'city' when any active linked primary record is in the city."""
    scopes = {r["scope"] for r in conn.execute(
        f"SELECT scope FROM source_records WHERE business_id=? AND active=1 AND source_id IN {_PRIMARY_SQL}",
        (business_id,),
    )}
    if not scopes:
        return current
    for scope in ("city", "nearby", "out"):
        if scope in scopes:
            return scope
    return current


def _update(conn: sqlite3.Connection, business_id: int, values: dict) -> None:
    if not values:
        return
    cols = ", ".join(f"{k}=?" for k in values)
    conn.execute(f"UPDATE businesses SET {cols} WHERE id=?", (*values.values(), business_id))


def _enrich(conn: sqlite3.Connection, business_id: int, rec: _Rec, stamp: str, *, confirm_osm: bool) -> List[str]:
    """Fill the business's empty columns from ``rec``. Returns notes for the explanation."""
    biz = _business(conn, business_id)
    if biz is None:
        return []
    if _is_suppressed(conn, biz):
        return ["The business is suppressed, so none of its details were changed."]
    notes: List[str] = []
    values: dict = {}

    if confirm_osm:
        renamed = bool(rec.name) and rec.name != biz["name"]
        if renamed:
            values["name"] = rec.name
            values["name_norm"] = rec.name_norm
        values["publish_state"] = "pending"
        values["publish_reason"] = None
        notes.append(
            "It was known only from OpenStreetMap, so it "
            + (f"now uses the {rec.label} record's name and " if renamed else "")
            + "is no longer held for a primary source."
        )

    if biz["lat"] is None and biz["lon"] is None and rec.lat is not None and rec.lon is not None:
        values["lat"], values["lon"] = rec.lat, rec.lon
    if not biz["street_norm"] and rec.street_norm:
        values["street"] = rec.street_display() or None
        values["street_norm"] = rec.street_norm
        values["suite"] = rec.suite or None
    if not biz["city"] and rec.city:
        values["city"] = rec.city
    if not biz["zip"] and rec.zip:
        values["zip"] = rec.zip
    if not biz["naics"]:
        if rec.naics:
            values["naics"] = rec.naics
            values["category"], values["category_label"] = categories.categorize(rec.naics, rec.tags)
        elif biz["category"] == categories.FALLBACK[0] and rec.tags:
            slug, label = categories.categorize(None, rec.tags)
            if slug != categories.FALLBACK[0]:
                values["category"], values["category_label"] = slug, label
    if rec.permit_start:
        current = biz["permit_start"]
        if not current or (rec.source_id == "tx_sales_tax" and rec.permit_start < current):
            values["permit_start"] = rec.permit_start
    if rec.is_primary and rec.is_individual and not biz["is_individual"]:
        values["is_individual"] = 1  # privacy-conservative: any individual taxpayer counts

    # The same registrable domain is the same site (http/https, www, a location page).
    if rec.website:
        existing_domain = (biz["website_domain"] or normalize.registrable_domain(biz["website"] or "")).lower()
        if not biz["website"]:
            values["website"] = rec.website
            values["website_domain"] = rec.website_domain
            values["website_source"] = WEBSITE_SOURCES.get(rec.source_id, rec.source_id)
        elif rec.website_domain and rec.website_domain != existing_domain:
            db.add_review(
                conn, kind="website_conflict", business_id=business_id, source_record_id=rec.id,
                field="website", proposed=rec.website, current=biz["website"], source_url=rec.source_url,
                now=stamp,
                detail=(
                    f"The {rec.label} record lists {rec.website_domain}, but the business already has"
                    f" {existing_domain or 'another website'}; the existing website was kept."
                ),
            )

    scope = _scope_for(conn, business_id, biz["scope"])
    if scope != biz["scope"]:
        values["scope"] = scope
    if values:
        values["updated_at"] = stamp
        _update(conn, business_id, values)
    return notes


def _has_primary(conn: sqlite3.Connection, business_id: int, exclude_id: int) -> bool:
    return conn.execute(
        f"SELECT 1 FROM source_records WHERE business_id=? AND id != ? AND source_id IN {_PRIMARY_SQL} LIMIT 1",
        (business_id, exclude_id),
    ).fetchone() is not None


def _join(conn: sqlite3.Connection, rec: _Rec, business_id: int, rule: str, evidence: dict,
          explanation: str, stamp: str) -> MatchResult:
    confirm_osm = rec.is_primary and not _has_primary(conn, business_id, rec.id)
    conn.execute(
        "UPDATE source_records SET business_id=?, match_state='matched' WHERE id=?", (business_id, rec.id)
    )
    notes = _enrich(conn, business_id, rec, stamp, confirm_osm=confirm_osm)
    explanation = " ".join([explanation, *notes])
    evidence = dict(evidence, source_id=rec.source_id, source_key=rec.source_key)
    conn.execute(
        "INSERT INTO merges(business_id, source_record_id, rule, evidence_json, explanation, created_at)"
        " VALUES (?,?,?,?,?,?)",
        (business_id, rec.id, rule, db.dumps(evidence), explanation, stamp),
    )
    _resolve_merge_reviews(conn, rec.id, stamp)
    return MatchResult("matched", business_id, rule, explanation)


def _create(conn: sqlite3.Connection, rec: _Rec, stamp: str) -> MatchResult:
    osm_only = rec.source_id == "osm"
    category, label = categories.categorize(rec.naics or None, rec.tags)
    values = {
        "name": rec.name,
        "name_norm": rec.name_norm,
        "street": rec.street_display() or None,
        "street_norm": rec.street_norm or None,
        "suite": rec.suite or None,
        "city": rec.city or None,
        "zip": rec.zip or None,
        "lat": rec.lat,
        "lon": rec.lon,
        "scope": rec.scope,
        "naics": rec.naics or None,
        "category": category,
        "category_label": label,
        "permit_start": rec.permit_start or None,
        "is_individual": rec.is_individual,
        "website": rec.website or None,
        "website_domain": rec.website_domain or None,
        "website_source": WEBSITE_SOURCES.get(rec.source_id, rec.source_id) if rec.website else None,
        "publish_state": "review" if osm_only else "pending",
        "publish_reason": OSM_ONLY_REASON if osm_only else None,
        "first_seen_at": stamp,
        "updated_at": stamp,
    }
    cols = ", ".join(values)
    cur = conn.execute(
        f"INSERT INTO businesses({cols}) VALUES ({','.join('?' * len(values))})", tuple(values.values())
    )
    business_id = int(cur.lastrowid)
    conn.execute(
        "UPDATE source_records SET business_id=?, match_state='created' WHERE id=?", (business_id, rec.id)
    )
    assign_identity(conn, business_id)
    _resolve_merge_reviews(conn, rec.id, stamp)
    if osm_only:
        return MatchResult(
            "created", business_id, RULE_OSM_ONLY,
            "Created a business held for review because only OpenStreetMap lists this place so far.",
        )
    return MatchResult(
        "created", business_id, RULE_NEW,
        f"Created a new business from the {rec.label} record because no existing business shares"
        " its phone, its address with a similar name, or its website at the same address.",
    )


def _review(conn: sqlite3.Connection, rec: _Rec, questions: List[Tuple[int, str]], rule: str,
            stamp: str) -> MatchResult:
    """Hold the record: one merge question per candidate business, no new business."""
    candidates = [bid for bid, _ in questions]
    _resolve_merge_reviews(conn, rec.id, stamp, keep=candidates)
    for business_id, detail in questions:
        _open_merge_review(conn, rec, business_id, detail, stamp)
    conn.execute("UPDATE source_records SET match_state='review' WHERE id=?", (rec.id,))
    return MatchResult("review", None, rule, questions[0][1])


def _ignore(conn: sqlite3.Connection, rec: _Rec, rule: str, explanation: str) -> MatchResult:
    conn.execute("UPDATE source_records SET match_state='ignored' WHERE id=?", (rec.id,))
    return MatchResult("ignored", None, rule, explanation)


# ---------------------------------------------------------------- the rules

def _match(conn: sqlite3.Connection, source_record_id: int, stamp: str) -> MatchResult:
    row = conn.execute("SELECT * FROM source_records WHERE id=?", (source_record_id,)).fetchone()
    if row is None:
        return MatchResult("ignored", None, "missing", "No source record has this id.")
    rec = _load(row)
    if not rec.active:
        # Left as it is; an inactive record neither joins nor creates anything.
        return MatchResult("ignored", rec.business_id, "inactive", "The record is no longer in its source.")

    # 1. Already linked: refresh the business in place.
    if rec.business_id is not None and _business(conn, rec.business_id) is not None:
        conn.execute("UPDATE source_records SET match_state='matched' WHERE id=?", (rec.id,))
        notes = _enrich(conn, rec.business_id, rec, stamp, confirm_osm=False)
        _resolve_merge_reviews(conn, rec.id, stamp)
        return MatchResult(
            "matched", rec.business_id, RULE_EXISTING,
            " ".join(["Kept the existing link from this record to its business.", *notes]),
        )

    accepted, rejected = _decisions(conn, rec)
    for business_id in accepted:
        if _business(conn, business_id) is not None:
            return _join(conn, rec, business_id, RULE_REVIEWED, {"review": "accepted"},
                         "Joined because a reviewer accepted this match.", stamp)

    # 2. Same phone, addresses agree.
    phone_conflicts: List[sqlite3.Row] = []
    if rec.phone and not _shared_line(conn, rec.phone, stamp):
        agree, conflict = [], []
        for r in conn.execute(
            "SELECT DISTINCT business_id FROM source_records WHERE phone=? AND id != ?"
            " AND business_id IS NOT NULL ORDER BY business_id",
            (rec.phone, rec.id),
        ):
            biz = _business(conn, r["business_id"])
            if biz is None or biz["id"] in rejected:
                continue
            (agree if _phone_addresses_agree(rec, biz) else conflict).append(biz)
        if len(agree) == 1:
            biz = agree[0]
            street = rec.street_norm or biz["street_norm"]
            if rec.street_norm and biz["street_norm"]:
                sentence = f"Joined because both records list {rec.phone} at {street}."
            else:
                sentence = (f"Joined because both records list {rec.phone} and one of them has no street,"
                            " so the addresses do not conflict.")
            evidence = {"phone": rec.phone, "street_norm": rec.street_norm or None,
                        "business_street_norm": biz["street_norm"], "zip": rec.zip or None,
                        "business_zip": biz["zip"]}
            return _join(conn, rec, biz["id"], RULE_PHONE, evidence, sentence, stamp)
        if len(agree) > 1:
            detail = (f"This {rec.label} record's phone is also listed by {len(agree)} businesses whose"
                      " addresses do not rule it out; choose one or keep it separate.")
            return _review(conn, rec, [(b["id"], detail) for b in agree], REVIEW_PHONE_MANY, stamp)
        phone_conflicts = conflict

    # 3-5. Same address.
    partial: List[Tuple[sqlite3.Row, float]] = []
    if rec.street_norm:
        scored = []
        for biz in conn.execute(
            "SELECT * FROM businesses WHERE street_norm=? ORDER BY id", (rec.street_norm,)
        ).fetchall():
            if biz["id"] in rejected or not _same_address(rec, biz):
                continue
            scored.append((biz, _similarity(conn, rec, biz)))
        address_evidence = {"street_norm": rec.street_norm, "zip": rec.zip or None, "suite": rec.suite or None}

        strong = [(b, s) for b, s in scored if s >= MERGE_SIMILARITY]
        if strong:
            best = max(s for _, s in strong)
            top = [(b, s) for b, s in strong if s == best]
            if len(top) == 1:
                biz, sim = top[0]
                sentence = (f"Joined because both records are at {rec.street_norm} and their names are"
                            f" similar ({sim:.2f}).")
                evidence = dict(address_evidence, business_zip=biz["zip"], business_suite=biz["suite"],
                                similarity=sim)
                return _join(conn, rec, biz["id"], RULE_ADDRESS_NAME, evidence, sentence, stamp)
            detail = (f"This {rec.label} record is at {rec.street_norm} with names equally similar to"
                      f" {len(top)} businesses; choose one or keep it separate.")
            return _review(conn, rec, [(b["id"], detail) for b, _ in top], REVIEW_ADDRESS_MANY, stamp)

        if rec.website_domain:
            by_domain = [b for b, _ in scored if rec.website_domain in _domains(conn, b)]
            if len(by_domain) == 1:
                biz = by_domain[0]
                sentence = (f"Joined because both records list the website {rec.website_domain}"
                            f" at {rec.street_norm}.")
                evidence = dict(address_evidence, website_domain=rec.website_domain,
                                business_zip=biz["zip"], business_suite=biz["suite"])
                return _join(conn, rec, biz["id"], RULE_DOMAIN_ADDRESS, evidence, sentence, stamp)
            if len(by_domain) > 1:
                detail = (f"This {rec.label} record's website {rec.website_domain} is listed by"
                          f" {len(by_domain)} businesses at {rec.street_norm}; choose one or keep it separate.")
                return _review(conn, rec, [(b["id"], detail) for b in by_domain], REVIEW_ADDRESS_MANY, stamp)

        partial = [(b, s) for b, s in scored if REVIEW_SIMILARITY <= s < MERGE_SIMILARITY]

    # 5 (and a phone seen at another street): hold for a person instead of guessing.
    questions: List[Tuple[int, str]] = []
    for biz, sim in partial:
        questions.append((biz["id"], (
            f"This {rec.label} record is at {rec.street_norm} like business {_ref(biz)}, but the names are"
            f" only partly similar ({sim:.2f}); join them or keep them separate."
        )))
    for biz in phone_conflicts:
        if biz["id"] in {bid for bid, _ in questions}:
            continue
        questions.append((biz["id"], (
            f"This {rec.label} record lists the same phone as business {_ref(biz)} but at"
            f" {rec.street_norm or 'another address'} instead of {biz['street_norm']}; it may be another"
            " location or a shared line."
        )))
    if questions:
        rule = REVIEW_ADDRESS_PARTIAL if partial else REVIEW_PHONE_STREET
        return _review(conn, rec, questions, rule, stamp)

    # 6. Nothing matched.
    if rec.source_id not in PRIMARY_SOURCES and rec.source_id != "osm":
        return _ignore(conn, rec, "not_a_primary_source",
                       f"Not joined, and a {rec.label} record cannot create a business on its own.")
    if not rec.name:
        return _ignore(conn, rec, "no_name", "Not joined, and a record without a name cannot create a business.")
    return _create(conn, rec, stamp)


# ---------------------------------------------------------------- public API

def match_record(conn: sqlite3.Connection, source_record_id: int, now: Now = None) -> MatchResult:
    """Match one source record (rules in SPEC order); atomic on its own."""
    stamp = _stamp(now)
    with db.transaction(conn):
        result = _match(conn, int(source_record_id), stamp)
    logger.debug("record %d: %s by %s (business %s)", source_record_id, result.action, result.rule,
                 result.business_id)
    return result


def match_pending(conn: sqlite3.Connection, now: Now = None) -> Dict[str, int]:
    """Match every active record in state 'new', 500 per transaction, then refresh activity."""
    stamp = _stamp(now)
    counts = {"matched": 0, "created": 0, "review": 0, "ignored": 0}
    for _ in range(MAX_PASSES):
        ids = [r["id"] for r in conn.execute(
            f"SELECT id FROM source_records WHERE match_state='new' AND active=1 ORDER BY {_ORDER_SQL}"
        )]
        if not ids:
            break
        for start in range(0, len(ids), BATCH_SIZE):
            with db.transaction(conn):
                for record_id in ids[start:start + BATCH_SIZE]:
                    counts[_match(conn, record_id, stamp).action] += 1
    changed = refresh_activity(conn, now=stamp)
    logger.info("matching: %d matched, %d created, %d review, %d ignored; %d businesses changed activity",
                counts["matched"], counts["created"], counts["review"], counts["ignored"], changed)
    return counts


def refresh_activity(conn: sqlite3.Connection, now: Now = None) -> int:
    """A business is active while any linked record is; its scope follows its active primary records.

    Businesses with no linked records are left alone. Returns how many changed.
    """
    stamp = _stamp(now)
    changed = 0
    with db.transaction(conn):
        rows = conn.execute(
            "SELECT b.id, b.active, b.scope, MAX(s.active) AS any_active FROM businesses b"
            " JOIN source_records s ON s.business_id = b.id GROUP BY b.id ORDER BY b.id"
        ).fetchall()
        for row in rows:
            values = {}
            active = 1 if row["any_active"] else 0
            if active != row["active"]:
                values["active"] = active
            scope = _scope_for(conn, row["id"], row["scope"])
            if scope != row["scope"]:
                values["scope"] = scope
            if values:
                values["updated_at"] = stamp
                _update(conn, row["id"], values)
                changed += 1
    return changed


def _public_id(seed: str) -> str:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    return "lv-" + base64.b32encode(digest).decode("ascii").rstrip("=").lower()[:10]


def _street_part(biz: sqlite3.Row) -> str:
    """The display street without its house number: '1200 W Example Ave' -> 'W Example Ave'."""
    words = normalize.display_street(biz["street_norm"] or biz["street"] or "").split()
    if words and any(ch.isdigit() for ch in words[0]):
        words = words[1:]
    return " ".join(words)


def _slug_taken(conn: sqlite3.Connection, slug: str, business_id: int) -> bool:
    return conn.execute(
        "SELECT 1 FROM businesses WHERE slug=? AND id != ?", (slug, business_id)
    ).fetchone() is not None


def _choose_slug(conn: sqlite3.Connection, biz: sqlite3.Row, public_id: str) -> str:
    base = normalize.slugify(biz["name"])
    street = _street_part(biz)
    candidates = []
    if base:
        candidates.append(base)
        if street:
            candidates.append(normalize.slugify(f"{biz['name']} {street}"))
        candidates.append(f"{base}-{public_id[-4:]}")
        candidates.append(f"{base}-{public_id[3:]}")
    else:
        candidates.append(public_id)
    for slug in candidates:
        if slug and slug not in RESERVED_SLUGS and not _slug_taken(conn, slug, biz["id"]):
            return slug
    n = 2
    while _slug_taken(conn, f"{candidates[-1]}-{n}", biz["id"]):
        n += 1
    return f"{candidates[-1]}-{n}"


def assign_identity(conn: sqlite3.Connection, business_id: int) -> Tuple[str, str]:
    """Give a business its public id and slug once; both stay fixed afterwards.

    ``public_id`` hashes the first linked record's ``source_id:source_key`` (the
    record that created the business), so it survives a rebuild of the archive.
    """
    biz = _business(conn, business_id)
    if biz is None:
        raise LookupError(f"no business {business_id}")
    public_id = biz["public_id"]
    if not public_id:
        first = conn.execute(
            "SELECT source_id, source_key FROM source_records WHERE business_id=?"
            f" ORDER BY match_state='created' DESC, {_ORDER_SQL} LIMIT 1",
            (business_id,),
        ).fetchone()
        seed = f"{first['source_id']}:{first['source_key']}" if first else f"business:{business_id}"
        public_id = _public_id(seed)
        n = 1
        while conn.execute(
            "SELECT 1 FROM businesses WHERE public_id=? AND id != ?", (public_id, business_id)
        ).fetchone():
            public_id = _public_id(f"{seed}#{n}")
            n += 1
    slug = biz["slug"] or _choose_slug(conn, biz, public_id)
    if public_id != biz["public_id"] or slug != biz["slug"]:
        conn.execute("UPDATE businesses SET public_id=?, slug=? WHERE id=?", (public_id, slug, business_id))
    return public_id, slug
