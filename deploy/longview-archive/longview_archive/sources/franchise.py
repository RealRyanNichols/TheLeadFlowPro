"""Texas Comptroller "Active Franchise Taxpayers": companies with a Longview address.

Many Longview companies (LLCs, corporations, partnerships, trusts) sell nothing
subject to sales tax, so they have no sales-tax outlet and the sales-tax list
never shows them. The franchise-tax list does. It is an official public
register of companies in good standing, so a record here is a primary source
for publishing, but it is thinner than an outlet:

* The address is the taxpayer's MAILING address: often a home, a PO box, or an
  accountant. It is never read into the projection (it is not even requested),
  never shown, and never used as storefront evidence or for matching. A
  franchise-only listing shows "Longview, TX".
* There is no NAICS code, so no kind of business is guessed: the listing uses
  ``categories.COMPANY_FALLBACK``.
* The taxpayer name IS the shown name, so it passes the same person-name holds
  as a sales-tax outlet named for its owner: unless the taxpayer is clearly an
  entity (by its org-type code or a legal form in its name), or when the name
  without its legal form looks like a person's, the record is flagged
  ``personal_name`` with the ``owner_named`` tag. Publishing then holds it
  without a public presence and sends it to a person with one.

Only rows in good standing are kept (``right_to_transact_business_code`` A,
when the column exists), and exempt organizations (a current exemption reason:
nonprofits) are skipped: the directory lists businesses. A taxpayer that also
has an active Longview sales-tax outlet is listed by that outlet; matching
de-duplicates on the taxpayer number whichever list synced first
(``matching.py``), so every row is stored here with the taxpayer number as its
key. The source is optional: no matching dataset, or columns that do not fit,
record the run as ``skipped`` with the reason. Logs carry counts only.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from typing import Any, Dict, Mapping, Optional, Set, Tuple

from .. import db, normalize, privacy
from ..config import LONGVIEW_POSTAL_ZIPS
from . import socrata
from .comptroller import parse_date
from .http import EmptyResult, RecordWriter, as_now, bump, finish_failed, finish_ok
from .socrata import DatasetNotFound, SchemaMismatch

logger = logging.getLogger(__name__)

SOURCE_ID = "tx_franchise"
RUN_KIND = "sync_tx_franchise"
QUERY = "active franchise taxpayers"
NAME_PATTERN = r"franchise"
PAGE_SIZE = 5000
SALES_TAX_SOURCE = "tx_sales_tax"

FIELD_CANDIDATES: Dict[str, Tuple[str, ...]] = {
    "taxpayer_number": ("taxpayer_number",),
    "taxpayer_name": ("taxpayer_name",),
    "city": ("taxpayer_city",),
    "zip": ("taxpayer_zip", "taxpayer_zip_code"),
    "org_type": ("taxpayer_organizational_type", "taxpayer_organization_type"),
    "right_to_transact": ("right_to_transact_business_code",),
    "exempt_reason": ("current_exempt_reason_code",),
    "registered_since": ("responsibility_beginning_date",),
}
REQUIRED_FIELDS = ("taxpayer_number", "taxpayer_name", "city", "zip")
GOOD_STANDING = "A"

# The Comptroller's taxpayer organizational type codes that name an entity
# (a corporation, LLC, limited partnership, or professional association),
# written out so privacy.org_is_entity reads them as it reads the sales-tax
# list's descriptions. Only codes whose meaning is certain are listed. Any
# other code (a trust, which may be a family's, a general partnership or joint
# venture, which may be a couple, an association, or a code not listed) is
# treated as possibly a person: the name alone then decides, and without a
# legal form in the name the listing is held like an owner-named outlet.
ENTITY_ORG_TYPES: Dict[str, str] = {
    "CT": "Texas profit corporation",
    "CF": "Foreign profit corporation",
    "CN": "Texas nonprofit corporation",
    "CP": "Texas professional corporation",
    "CL": "Texas limited liability company",
    "PL": "Texas limited partnership",
    "PF": "Foreign limited partnership",
    "AP": "Texas professional association",
    "AF": "Foreign professional association",
}

TRUST_CODE = "TR"
_TRUST_WORDS = frozenset({"trust", "trustee", "trustees", "estate"})
_LEGAL_WORDS = frozenset(normalize.LEGAL_SUFFIXES) | {"l", "p", "c"}


def taxpayer_number(value: Any) -> str:
    """The taxpayer number as digits only: the key both Comptroller lists share."""
    return re.sub(r"\D", "", str(value or ""))


def sales_tax_taxpayers(conn: sqlite3.Connection) -> Set[str]:
    """Taxpayer numbers with at least one ACTIVE sales-tax outlet (outlet keys are 'taxpayer:outlet')."""
    numbers: Set[str] = set()
    for (key,) in conn.execute(
        "SELECT source_key FROM source_records WHERE source_id=? AND active=1", (SALES_TAX_SOURCE,)
    ):
        number = taxpayer_number(str(key).split(":", 1)[0])
        if number:
            numbers.add(number)
    return numbers


def has_sales_tax_outlet(conn: sqlite3.Connection, number: str) -> bool:
    """One taxpayer: any active sales-tax outlet (an index range on 'number:...')."""
    if not number:
        return False
    return conn.execute(
        "SELECT 1 FROM source_records WHERE source_id=? AND active=1 AND source_key>=? AND source_key<? LIMIT 1",
        (SALES_TAX_SOURCE, f"{number}:", f"{number};"),
    ).fetchone() is not None


def _get(row: Mapping[str, Any], fields: Mapping[str, Optional[str]], logical: str) -> str:
    column = fields.get(logical)
    value = row.get(column) if column else None
    return "" if value is None else str(value).strip()


def bare_name(name: str) -> str:
    """The name without its legal form ('Jane Doe LLC' -> 'Jane Doe'), for the person-name check."""
    words = [w for w in re.split(r"\s+", name.replace(",", " ").strip()) if w]
    while words and re.sub(r"[^a-z]", "", words[-1].casefold()) in _LEGAL_WORDS:
        words.pop()
    return " ".join(words)


def scope_for(zip_code: Optional[str]) -> str:
    """'city' for a Longview postal ZIP (75601-75608, PO boxes included), else 'nearby'."""
    return "city" if zip_code in LONGVIEW_POSTAL_ZIPS else "nearby"


def is_trust_or_estate(name: str, org_code: str = "") -> bool:
    """A trust or an estate is often one family's or one person's, whatever its name says:
    the TR code, 'SAMPLE FAMILY TRUST', 'JOHN SAMPLE TRUSTEE', 'ESTATE OF JOHN SAMPLE'.
    Not 'EXAMPLE REAL ESTATE LLC' or 'EXAMPLE BANK & TRUST'."""
    if org_code.upper() == TRUST_CODE:
        return True
    words = privacy._plain_words(normalize.split_dba(name)[0] or name)
    while words and words[-1] in normalize.LEGAL_SUFFIXES:
        words.pop()
    if words[:2] == ["estate", "of"]:
        return True
    if not words or words[-1] not in _TRUST_WORDS:
        return False
    if words[-1] == "estate" and len(words) > 1 and words[-2] == "real":
        return False
    return not (words[-1] == "trust" and "bank" in words)


def privacy_flags(name: str, org_code: str) -> Tuple[bool, bool, bool]:
    """(is_individual, personal_name, owner_named) for a taxpayer name that is also the shown name."""
    org_text = ENTITY_ORG_TYPES.get(org_code.upper()) or org_code
    shown = normalize.trade_name(name)
    if is_trust_or_estate(name, org_code) or not privacy.is_clearly_entity(name, org_text):
        # May be a person, and the shown name IS the taxpayer's own name: the
        # structural owner rule of the sales-tax list applies word for word.
        return True, True, True
    is_individual = privacy.is_individual_taxpayer(name, org_text, shown)
    person_like = any(privacy.looks_like_person_name(text) for text in (shown, bare_name(shown)) if text)
    personal = is_individual or person_like
    return is_individual, personal, personal


def project_row(row: Mapping[str, Any], fields: Mapping[str, Optional[str]]) -> Tuple[Optional[str], Optional[Dict[str, Any]], str]:
    """(taxpayer number, record, note). A skipped row has key None and the reason as note."""
    number = taxpayer_number(_get(row, fields, "taxpayer_number"))
    if not number:
        return None, None, "skipped_no_key"
    if fields.get("right_to_transact") and _get(row, fields, "right_to_transact").upper() != GOOD_STANDING:
        return None, None, "skipped_not_in_good_standing"
    if fields.get("exempt_reason") and _get(row, fields, "exempt_reason"):
        return None, None, "skipped_exempt"
    name = _get(row, fields, "taxpayer_name")
    if not name:
        return None, None, "skipped_no_name"
    if _get(row, fields, "city").upper() != "LONGVIEW":
        return None, None, "skipped_city"
    zip_code = normalize.zip5(_get(row, fields, "zip"))
    org_code = _get(row, fields, "org_type").upper()
    is_individual, personal, owner_named = privacy_flags(name, org_code)
    tags: Dict[str, Any] = {}
    if org_code:
        tags["org_type"] = org_code
    since = parse_date(_get(row, fields, "registered_since"))
    if since:
        tags["franchise_since"] = since
    if owner_named:
        tags["owner_named"] = True
    record = {
        "name": normalize.title_case_name(normalize.trade_name(name)),
        "name_norm": normalize.norm_name(name),
        # The taxpayer address is a mailing address: never stored here, never shown,
        # never evidence of a storefront. The ZIP only decides the scope below.
        "street": None, "street_norm": None, "suite": None, "zip": None, "phone": None,
        "city": "Longview",
        "naics": None,
        "permit_start": None,
        "is_individual": is_individual,
        "personal_name": personal,
        "scope": scope_for(zip_code),
        "tags_json": db.dumps(tags),
    }
    return number, record, zip_code or ""


def _new_counts() -> Dict[str, Any]:
    return {
        "fetched": 0, "kept": 0, "inserted": 0, "updated": 0, "unchanged": 0, "reactivated": 0,
        "deactivated": 0, "businesses_deactivated": 0, "duplicates": 0, "suppressed": 0,
        "city": 0, "nearby": 0, "personal_name": 0, "with_sales_tax_outlet": 0, "other_zips": {},
    }


def sync_franchise(conn: sqlite3.Connection, settings, now=None, transport=None) -> Dict[str, Any]:
    """Pull Longview franchise taxpayers in good standing. Never raises: skips or records the error."""
    now = as_now(now)
    run_id = db.start_run(conn, RUN_KIND, now)
    counts = _new_counts()
    try:
        info = socrata.discover_dataset(
            settings, QUERY, NAME_PATTERN, [FIELD_CANDIDATES[f] for f in REQUIRED_FIELDS], transport=transport
        )
        counts["dataset_id"] = info.id
        fields = socrata.resolve_fields(info.columns, FIELD_CANDIDATES, REQUIRED_FIELDS)
    except (DatasetNotFound, SchemaMismatch) as exc:
        counts["skipped_reason"] = str(exc)
        finish_failed(conn, run_id, SOURCE_ID, counts, now, exc, status="skipped")
        return counts
    except Exception as exc:  # optional source: record and carry on
        counts["error"] = finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
        return counts
    try:
        # Only the columns used: the mailing address is never requested.
        wanted = sorted({column for column in fields.values() if column})
        select = ", ".join(wanted)
        where = f"upper({fields['city']}) = 'LONGVIEW'"
        with_outlet = sales_tax_taxpayers(conn)
        writer = RecordWriter(conn, SOURCE_ID, now, counts)
        for row in socrata.fetch_rows(settings, info.id, where, page_size=PAGE_SIZE, transport=transport,
                                      select=select):
            counts["fetched"] += 1
            # Keep only the requested columns, even if a server sent more (the mailing address above all).
            row = {column: row.get(column) for column in wanted if column in row}
            key, record, note = project_row(row, fields)
            if key is None:
                bump(counts, note)
                continue
            zip_code = note
            if not writer.add(key, record, row, info.license, info.url):
                continue
            counts["kept"] += 1
            counts[record["scope"]] += 1
            counts["personal_name"] += 1 if record["personal_name"] else 0
            counts["with_sales_tax_outlet"] += 1 if key in with_outlet else 0
            if zip_code not in LONGVIEW_POSTAL_ZIPS:
                zip_key = zip_code or "missing"
                counts["other_zips"][zip_key] = counts["other_zips"].get(zip_key, 0) + 1
        if counts["fetched"] == 0:
            raise EmptyResult()
        writer.deactivate_unseen()
        finish_ok(conn, run_id, SOURCE_ID, counts, now, license=info.license, dataset_id=info.id,
                  dataset_url=info.url, columns_json=db.dumps(list(info.columns)))
    except Exception as exc:
        counts["error"] = finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
    return counts
