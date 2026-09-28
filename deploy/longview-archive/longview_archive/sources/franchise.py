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
  may carry a person's name whatever its legal form (``carries_person_name``),
  the record is flagged ``personal_name`` with the ``owner_named`` tag.
  Publishing then holds it without a public presence and sends it to a person
  with one.
* Only Texas rows (``taxpayer_state`` TX, filtered on the server and checked
  again here) with a Longview postal ZIP can be listed; any other ZIP, or none,
  gives scope ``out`` and the row is never published.

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

from .. import db, normalize, places, privacy
from ..places import LONGVIEW, Place, PlaceIndex
from . import socrata
from .comptroller import bump_zip, count_place, parse_date, place_counts
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
    "state": ("taxpayer_state",),
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
# 'TR' and 'TRST' are how the list abbreviates a trust ('SMITH FAMILY TR').
_TRUST_WORDS = frozenset({"trust", "trustee", "trustees", "estate", "tr", "trst"})
_TRUST_NOUNS = frozenset({"trust", "tr", "trst"})
# A trust's serial after its name: 'QUILLFEATHER TRUST NO 2', 'SAMPLE TRUST 2019', 'SAMPLE TRUST II'.
_SERIAL_WORDS = frozenset({"no", "num", "number", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"})
# What may follow 'FAMILY' in a family's own holding vehicle ('SMITH FAMILY LP', 'THE SAMPLE FAMILY
# LIMITED PARTNERSHIP', 'SMITH FAMILY HOLDINGS LLC'): legal forms and holding words, never a trade.
_FAMILY_VEHICLE_WORDS = frozenset(normalize.LEGAL_SUFFIXES) | {
    "l", "p", "c", "partnership", "partners", "holdings", "holding", "investments", "investment", "interests",
    "properties", "property", "assets", "ventures", "enterprises", "trust", "tr", "trst",
} | _SERIAL_WORDS
_LEGAL_WORDS = frozenset(normalize.LEGAL_SUFFIXES) | {"l", "p", "c"}


def taxpayer_number(value: Any) -> str:
    """The taxpayer number as digits only: the key both Comptroller lists share."""
    return re.sub(r"\D", "", str(value or ""))


def outlet_taxpayer(outlet_key: Any) -> str:
    """The taxpayer part of a sales-tax outlet key ('taxpayer:outlet'), exactly as stored.

    It is compared with a franchise key (the taxpayer number, digits only) as it
    is, with no normalization, here and in ``has_sales_tax_outlet`` alike: a
    prefix that is not plain digits never equals a franchise key in either."""
    return str(outlet_key or "").split(":", 1)[0]


def sales_tax_taxpayers(conn: sqlite3.Connection, place: Optional[str] = None) -> Set[str]:
    """Taxpayer numbers with at least one ACTIVE sales-tax outlet (outlet keys are 'taxpayer:outlet').

    With ``place``, only outlets in that town."""
    numbers: Set[str] = set()
    sql = "SELECT source_key FROM source_records WHERE source_id=? AND active=1"
    params: tuple = (SALES_TAX_SOURCE,)
    if place is not None:
        sql += " AND place=?"
        params += (place,)
    for (key,) in conn.execute(sql, params):
        number = outlet_taxpayer(key)
        if number:
            numbers.add(number)
    return numbers


def sales_tax_taxpayer_places(conn: sqlite3.Connection) -> Set[Tuple[str, str]]:
    """(taxpayer number, place) for every ACTIVE sales-tax outlet."""
    pairs: Set[Tuple[str, str]] = set()
    for row in conn.execute(
        "SELECT source_key, place FROM source_records WHERE source_id=? AND active=1", (SALES_TAX_SOURCE,)
    ):
        number = outlet_taxpayer(row[0])
        if number:
            pairs.add((number, row[1] or LONGVIEW.slug))
    return pairs


def has_sales_tax_outlet(conn: sqlite3.Connection, number: str, place: Optional[str] = None) -> bool:
    """One taxpayer: any active sales-tax outlet whose key starts 'number:' (the same
    comparison as ``outlet_taxpayer``: an index range, no normalization).

    With ``place``, only an outlet in that town counts: a company is listed in a
    town by its outlet there, and turning on another town never takes a listing
    away from this one."""
    if not number:
        return False
    sql = "SELECT 1 FROM source_records WHERE source_id=? AND active=1 AND source_key>=? AND source_key<?"
    params: tuple = (SALES_TAX_SOURCE, f"{number}:", f"{number};")
    if place is not None:
        sql += " AND place=?"
        params += (place,)
    return conn.execute(sql + " LIMIT 1", params).fetchone() is not None


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


def scope_for(zip_code: Optional[str], place: Place = LONGVIEW) -> str:
    """'city' for a postal ZIP of the town (Longview: 75601-75608, PO boxes included); anything else is 'out'.

    A row says LONGVIEW but its ZIP is missing or not a Longview, Texas ZIP
    (Longview, Washington is 98632): nothing shows the company has a Longview,
    Texas address, so it is never published (held ``out_of_scope``, and the sync
    counts it under ``other_zips``). Every town follows the same rule
    (``places.Place.mailing_scope``)."""
    return place.mailing_scope(zip_code)


def family_vehicle(name: str) -> bool:
    """'SMITH FAMILY LP', 'THE SAMPLE FAMILY LIMITED PARTNERSHIP', 'SMITH FAMILY PARTNERSHIP LTD',
    'SMITH FAMILY HOLDINGS LLC', 'SMITH FAMILY LLC': usually an estate-planning vehicle that holds one
    household's assets, not a business open to the public, and its name is the family's.
    Not 'NGUYEN FAMILY DENTISTRY' or 'SAMPLE FAMILY RESTAURANT': a trade word follows 'FAMILY'."""
    words = [w for w in privacy._plain_words(normalize.split_dba(name)[0] or name) if not w.isdigit()]
    if "family" not in words:
        return False
    return all(w in _FAMILY_VEHICLE_WORDS for w in words[words.index("family") + 1:])


def is_trust_or_estate(name: str, org_code: str = "") -> bool:
    """A trust or an estate is often one family's or one person's, whatever its name says:
    the TR code, 'SAMPLE FAMILY TRUST', 'SAMPLE FAMILY TR', 'QUILLFEATHER TRUST NO 2',
    'JOHN SAMPLE TRUSTEE', 'ESTATE OF JOHN SAMPLE', and a family's own holding vehicle
    (``family_vehicle``). Not 'EXAMPLE REAL ESTATE LLC' or 'EXAMPLE BANK & TRUST'."""
    if org_code.upper() == TRUST_CODE or family_vehicle(name):
        return True
    words = privacy._plain_words(normalize.split_dba(name)[0] or name)
    # Drop the legal form, and a trust's serial ('TRUST NO 2', 'TRUST 2019', 'TRUST II').
    while words and (words[-1] in normalize.LEGAL_SUFFIXES
                     or ((words[-1].isdigit() or words[-1] in _SERIAL_WORDS)
                         and any(w in _TRUST_NOUNS for w in words[:-1]))):
        words.pop()
    if words[:2] == ["estate", "of"]:
        return True
    if not words or words[-1] not in _TRUST_WORDS:
        return False
    if words[-1] == "estate" and len(words) > 1 and words[-2] == "real":
        return False
    return not (words[-1] in _TRUST_NOUNS and "bank" in words)


# Words that sit around a person's name in a company name without being a
# trade word: 'Law Office of John Smith', 'The John Smith Company'.
_NAME_GLUE = frozenset({"the", "of", "and", "&", "at", "by", "for", "a", "an"})
# Trade words common in registered company names (oil and gas, land, building)
# that privacy.BUSINESS_WORDS does not carry. Here only: a name with one of them
# is not held for having two plain words ('Example Oil LLC'), though a given name
# next to a plain word still is ('John Smith Oil LLC').
_COMPANY_WORDS = frozenset({
    "real", "estate", "oil", "gas", "energy", "capital", "land", "resources", "operating", "royalty",
    "royalties", "mineral", "minerals", "petroleum", "exploration", "development", "developments", "homes",
    "home", "builders", "building", "leasing", "financial", "finance", "acquisitions", "investment",
    "production", "pipeline", "drilling", "wells", "consultants", "contractors", "contracting", "concrete",
    "freight", "hauling", "dirt", "timber", "cattle", "partners",
})


def _trade_word(token: str) -> bool:
    return token in _COMPANY_WORDS or privacy._has_business_word([token])


# Professional credentials and titles that stand next to a person's name in a
# company name ('WEI ZHANG CPA PLLC', 'DALIX QUILLFEATHER ATTORNEY AT LAW PC',
# 'LAW OFFICE OF ...', 'DR ...'). They are neither a trade nor a name word: they
# end a run of name words without counting in it.
_TITLE_WORDS = frozenset({
    "cpa", "cpas", "esq", "esquire", "attorney", "attorneys", "lawyer", "lawyers", "counselor", "dr", "doctor",
    "md", "do", "dds", "dmd", "od", "dvm", "phd", "jd", "rn", "np", "lpc", "lcsw", "pe", "ea", "cfp", "ria",
    "office", "offices", "associates", "law", "firm",
})
# Joiners inside a run of names: 'SMITH & JONES', 'JOHN AND MARY SMITH'.
_RUN_JOINERS = frozenset({"&", "and", "+"})


def name_word_run(shown: str) -> bool:
    """Two or more adjacent plain words, none a trade, legal, title, or glue word.

    On a franchise-tax name that is the only safe reading: the list gives no
    premises and often no website, so nothing but the name is published, and
    no list of given names covers every culture ('WEI ZHANG CPA PLLC', 'ANH
    NGUYEN CPA PC', 'LAW OFFICE OF DALIX QUILLFEATHER PLLC', 'DALIX
    QUILLFEATHER INSURANCE AGENCY INC', 'DALIX QUILLFEATHER CONSTRUCTION LLC').
    It also holds two-word trade names with no trade word ('PINEY WOODS SUPPLY
    LLC'): holding a company by mistake is the safe failure. A surname next to a
    trade word only ('SMITH PLUMBING LLC', 'SMITH & ASSOCIATES') is a single
    name word and is not held."""
    run = 0
    for token in privacy._tokens(shown):
        word = token.strip("-.")
        if word in _RUN_JOINERS:
            continue  # 'Smith & Jones': a joiner keeps the run going without counting
        plain = bool(re.fullmatch(r"[a-z][a-z'\-]*", word)) and not word.endswith("'s")
        if (plain and word not in _NAME_GLUE and word not in _LEGAL_WORDS and word not in _TITLE_WORDS
                and not _trade_word(word)):
            run += 1
            if run >= 2:
                return True
        else:
            run = 0
    return False


def carries_person_name(shown: str) -> bool:
    """The company name may carry a person's name, whatever its legal form says.

    On this list the shown name is the taxpayer's own registered name, and the
    GIVEN_NAMES list alone misses most Vietnamese, Chinese, South Asian and
    Arabic given names and any surname-first order. True when:

    * the name reads as a person's (``privacy.looks_like_person_name``), whole
      or without its legal form;
    * without its legal form it has two or more words and no trade word (the
      plain-words half of ``privacy.may_name_owner``, with the company trade
      words below added): 'Nguyen Hoa LLC', 'Patel Rajesh LLC', 'Dalix
      Quillfeather MD PA', and also 'Example Widgets LLC';
    * a given name stands next to another plain word that is not a trade word
      ('John Smith CPA PC', 'Law Office of John Smith PLLC', 'The John Smith
      Company', 'John Smith Holdings LP'). This replaces the given-name half of
      ``may_name_owner``, which would also hold a lone given name used as a
      trade name;
    * anywhere in the name, two or more adjacent plain words with no trade,
      legal, title, or glue word among them (``name_word_run``): a full name
      that is not on the GIVEN_NAMES list is caught even next to a trade word
      or a credential ('Wei Zhang CPA PLLC', 'Law Office of Dalix Quillfeather
      PLLC', 'Dalix Quillfeather Construction LLC').

    A surname with a trade word ('Smith Plumbing LLC'), a given name used next
    to a trade word only ('Grace Plumbing LLC'), and a single word ('Quillby
    LLC') are not flagged. In doubt the listing waits (held without a public
    presence, then a person checks it): holding a company back is the safe
    failure; publishing a person's name is not.
    """
    bare = bare_name(shown)
    if any(privacy.looks_like_person_name(text) for text in (shown, bare) if text):
        return True
    words = [w for w in privacy._tokens(bare) if w.strip("'-&") and w != "and"]
    if (len(words) >= 2 and all(re.fullmatch(r"[a-z][a-z'\-]*", w) for w in words)
            and not any(_trade_word(w) for w in words)):
        return True
    # A name that reads as an address ('4100 Example Ln LLC', 'PO Box 12 LLC') always goes to a
    # person (publish's name_contains_address review), so its street words are not read as names here.
    if name_word_run(shown) and not privacy.looks_like_address(shown):
        return True
    tokens = [w.strip("'-.") for w in privacy._tokens(shown)]
    for i, token in enumerate(tokens):
        if token not in privacy.GIVEN_NAMES:
            continue
        for j in (i - 1, i + 1):
            other = tokens[j] if 0 <= j < len(tokens) else ""
            if (re.fullmatch(r"[a-z][a-z'\-]+", other) and other not in _NAME_GLUE
                    and other not in _LEGAL_WORDS and not _trade_word(other)):
                return True
    return False


def plain_words_only(shown: str) -> bool:
    """Two or more words, none a trade word, and not an address ('Nguyen Hoa',
    'Piney Woods'): may be a person's name. An address-shaped name goes to its
    own review (name_contains_address) instead."""
    bare = bare_name(shown)
    words = [t for t in privacy._tokens(bare) if t.strip("'-&") and t != "and"]
    return len(words) >= 2 and not privacy._has_business_word(words) and not privacy.looks_like_address(bare)


def privacy_flags(name: str, org_code: str) -> Tuple[bool, bool, bool]:
    """(is_individual, personal_name, owner_named) for a taxpayer name that is also the shown name."""
    org_text = ENTITY_ORG_TYPES.get(org_code.upper()) or org_code
    shown = normalize.trade_name(name)
    if is_trust_or_estate(name, org_code) or not privacy.is_clearly_entity(name, org_text):
        # May be a person, and the shown name IS the taxpayer's own name: the
        # structural owner rule of the sales-tax list applies word for word.
        return True, True, True
    is_individual = privacy.is_individual_taxpayer(name, org_text, shown)
    # An entity code does not make the name a company's: a person's name with a
    # legal form ('Nguyen Hoa LLC', 'John Smith CPA PC') is held or checked too.
    # The shown name is the taxpayer's own registered name, so there is no
    # separate owner name to compare with: two or more plain words and no
    # trade word ('Nguyen Hoa LLC') may be a person's name and waits for a person.
    personal = is_individual or carries_person_name(shown) or plain_words_only(shown)
    return is_individual, personal, personal


def project_row(row: Mapping[str, Any], fields: Mapping[str, Optional[str]],
                index: Optional[PlaceIndex] = None) -> Tuple[Optional[str], Optional[Dict[str, Any]], str]:
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
    place = (index or PlaceIndex()).for_city(_get(row, fields, "city"))
    if place is None:
        return None, None, "skipped_city"
    # Longview, Washington is a real city, and the list carries out-of-state
    # mailing addresses: only a Texas row can be "Longview, TX".
    if fields.get("state") and _get(row, fields, "state").upper() != "TX":
        return None, None, "skipped_state"
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
        "city": place.name,
        "naics": None,
        "permit_start": None,
        "is_individual": is_individual,
        "personal_name": personal,
        "scope": scope_for(zip_code, place),
        "place": place.slug,
        "tags_json": db.dumps(tags),
    }
    return number, record, zip_code or ""


def _new_counts() -> Dict[str, Any]:
    return {
        "fetched": 0, "kept": 0, "inserted": 0, "updated": 0, "unchanged": 0, "reactivated": 0,
        "deactivated": 0, "businesses_deactivated": 0, "duplicates": 0, "suppressed": 0,
        "city": 0, "out": 0, "personal_name": 0, "with_sales_tax_outlet": 0, "other_zips": {},
    }


def sync_franchise(conn: sqlite3.Connection, settings, now=None, transport=None) -> Dict[str, Any]:
    """Pull the active places' franchise taxpayers in good standing. Never raises: skips or records the error."""
    now = as_now(now)
    run_id = db.start_run(conn, RUN_KIND, now)
    index = PlaceIndex.for_settings(settings)
    counts = place_counts(_new_counts(), index)
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
        where = index.where(fields["city"])
        if fields.get("state"):
            where += f" AND upper({fields['state']}) = 'TX'"
        with_outlet = sales_tax_taxpayer_places(conn)
        writer = RecordWriter(conn, SOURCE_ID, now, counts)
        for row in socrata.fetch_rows(settings, info.id, where, page_size=PAGE_SIZE, transport=transport,
                                      select=select):
            counts["fetched"] += 1
            # Keep only the requested columns, even if a server sent more (the mailing address above all).
            row = {column: row.get(column) for column in wanted if column in row}
            key, record, note = project_row(row, fields, index)
            if key is None:
                bump(counts, note)
                continue
            zip_code = note
            if not writer.add(key, record, row, info.license, info.url):
                continue
            counts["kept"] += 1
            bump(counts, record["scope"])
            place = places.get(record["place"])
            count_place(counts, place.slug, record["scope"])
            counts["personal_name"] += 1 if record["personal_name"] else 0
            counts["with_sales_tax_outlet"] += 1 if (key, place.slug) in with_outlet else 0
            if not zip_code or zip_code not in place.all_zips:
                bump_zip(counts, place.slug, zip_code or "missing")
        if counts["fetched"] == 0:
            raise EmptyResult()
        writer.deactivate_unseen(index.slugs)
        finish_ok(conn, run_id, SOURCE_ID, counts, now, license=info.license, dataset_id=info.id,
                  dataset_url=info.url, columns_json=db.dumps(list(info.columns)))
    except Exception as exc:
        counts["error"] = finish_failed(conn, run_id, SOURCE_ID, counts, now, exc)
    return counts
