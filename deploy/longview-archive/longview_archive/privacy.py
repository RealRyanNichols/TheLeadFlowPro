"""Privacy rules: what the directory may show about a business, and what never leaves.

The Comptroller lists sole proprietors under their own names. Those names are
private here: the directory shows only an outlet or trade name, holds back a
listing whose only name is a person's name with no public business presence,
and shows a street address only when there is positive evidence it is a
storefront. When in doubt, the address becomes "Longview, TX".
"""

from __future__ import annotations

import json
import re
import sqlite3
from typing import Mapping, Optional, Tuple

from . import normalize

# Fields that never leave the engine: not in exports, logs, or status.
PRIVATE_FIELDS = frozenset({
    "taxpayer_name", "taxpayer_address", "raw_json", "authorized_official",
    "authorized_official_first_name", "authorized_official_last_name",
    "provider_first_name", "provider_last_name",
})

ORG_MARKERS = {
    "llc", "inc", "incorporated", "corp", "corporation", "co", "company", "ltd", "limited",
    "lp", "llp", "lllp", "pllc", "plc", "pc", "pa", "trust", "church", "association", "assn",
    "partnership", "partners", "group", "holdings", "enterprises", "enterprise", "ministries",
    "ministry", "foundation", "district", "university", "college", "school", "club", "society",
    "cooperative", "coop", "co-op", "services", "service", "systems", "industries", "international",
    "national", "america", "american", "texas", "longview", "bank", "hospital", "clinic", "center",
    "centre", "store", "stores", "shop", "restaurant", "restaurants", "management", "properties",
    "investments", "ventures", "solutions", "fund", "authority", "agency", "department", "council",
    "federation", "league", "union", "institute", "academy",
}

# Words that make a name a business name rather than a person's name.
BUSINESS_WORDS = ORG_MARKERS | {
    "shop", "store", "repair", "repairs", "auto", "automotive", "tire", "tires", "salon", "barber",
    "barbershop", "church", "dental", "dentistry", "family", "clinic", "market", "grill", "cafe",
    "coffee", "pizza", "bbq", "barbecue", "tacos", "taqueria", "kitchen", "bakery", "boutique",
    "studio", "fitness", "gym", "insurance", "realty", "law", "firm", "cpa", "pharmacy", "supply",
    "lawn", "plumbing", "electric", "electrical", "roofing", "construction", "motors", "cleaners",
    "cleaning", "nails", "spa", "beauty", "hair", "cuts", "donuts", "burgers", "wings", "express",
    "mart", "food", "foods", "diner", "cantina", "bar", "pub", "lounge", "liquor", "wine", "vapor",
    "vape", "smoke", "tobacco", "pawn", "jewelry", "jewelers", "florist", "flowers", "floral",
    "designs", "design", "photography", "media", "marketing", "consulting", "accounting", "tax",
    "taxes", "bookkeeping", "hvac", "air", "heating", "cooling", "pest", "landscaping", "landscape",
    "pools", "pool", "fence", "fencing", "welding", "trucking", "transport", "logistics", "towing",
    "wash", "detail", "detailing", "body", "glass", "paint", "painting", "flooring", "cabinets",
    "furniture", "appliance", "appliances", "rental", "rentals", "storage", "motel", "hotel", "inn",
    "suites", "lodge", "ranch", "farm", "farms", "feed", "garden", "nursery", "pets", "pet",
    "grooming", "veterinary", "vet", "animal", "daycare", "learning", "preschool", "tutoring",
    "music", "dance", "martial", "arts", "karate", "yoga", "pilates", "tattoo", "piercing",
    "boutiques", "outlet", "wholesale", "distributing", "distribution", "supplies", "equipment",
    "tools", "hardware", "lumber", "parts", "sales", "imports", "exports", "trading", "co-op",
    "the", "and", "of", "&", "enterprises", "creations", "crafts", "gifts", "treasures", "thrift",
    "resale", "consignment", "cellular", "wireless", "phones", "computers", "tech", "technology",
    "printing", "signs", "graphics", "embroidery", "screen", "apparel", "clothing", "shoes",
    "optical", "vision", "eye", "hearing", "medical", "health", "care", "wellness", "therapy",
    "rehab", "massage", "chiropractic", "orthodontics", "pediatric", "funeral", "chapel", "mortuary",
    "baptist", "methodist", "catholic", "fellowship", "tabernacle", "temple", "mosque", "assembly",
    "ministries", "outreach", "mission", "missions", "community", "center", "plaza", "place",
    "station", "stop", "depot", "warehouse", "works", "factory", "mill", "labs", "lab",
}

# Common U.S. given names, used only to recognize a name that is a person's.
GIVEN_NAMES = frozenset("""
aaron abigail adam adrian aiden alan albert alex alexander alexis alfred alice alicia allen allison
alma alvin amanda amber amy ana andre andrea andrew angel angela angelica angie anita ann anna anne
annette anthony antonio april arthur ashley audrey austin barbara barry beatrice becky ben benjamin
bernard beth betty beverly bill billy blake bobby bonnie brad bradley brandi brandon brandy brenda
brent brett brian brittany brooke bruce bryan byron calvin cameron carl carla carlos carmen carol
caroline carolyn carrie casey cassandra catherine cathy cecil chad charles charlene charlie charlotte
chase cheryl chris christian christina christine christopher christy cindy claire clarence claude
clayton clifford clint clinton cody colby cole colleen connie constance cory courtney craig crystal
curtis cynthia dale dallas dan dana daniel danielle danny darlene darrell darren daryl dave david
dawn dean deanna debbie deborah debra denise dennis derek derrick desiree devin diana diane dianne
dillon dolores don donald donna doris dorothy douglas duane dustin dwayne dylan earl eddie edgar
edith edna eduardo edward edwin eileen elaine eleanor elijah elizabeth ella ellen elmer emily emma
eric erica erik erin ernest esther ethan eugene eva evan evelyn faith felicia felix fernando floyd
frances francis francisco frank franklin fred freddie frederick gabriel gail gary gavin gene george
gerald geraldine gilbert gina glen glenda glenn gloria gordon grace grant greg gregory gwendolyn
hailey haley hannah harold harry harvey hazel heather hector heidi helen henry herbert herman holly
howard hunter ian irene isaac isabel isaiah ivan jack jackie jacob jacqueline jaime jake james jamie
jane janet janice jared jasmine jason javier jay jean jeanette jeff jeffery jeffrey jenna jennifer
jenny jeremiah jeremy jerome jerry jesse jessica jesus jill jim jimmy jo joan joann joanne joe joel
john johnny jon jonathan jordan jorge jose joseph josephine joshua joy joyce juan juanita judith judy
julia julian julie june justin kaitlyn karen kari karl kate katherine kathleen kathryn kathy katie
katrina kay kayla keith kelly kelsey ken kendra kenneth kenny kerry kevin kim kimberly kirk kristen
kristin kristina kristy kurt kyle lana lance larry latasha latoya laura lauren laurie lawrence leah
lee leo leon leonard leroy leslie lester lewis lillian linda lindsay lindsey lisa lloyd logan lois
lonnie lora loretta lori lorraine louis louise lucas lucille lucy luis luke lydia lynn mabel mack
madison malcolm mandy manuel marc marcia marcus margaret maria marian marie marilyn mario marion
marjorie mark marlene marsha marshall martha martin marvin mary mason matthew maureen max maxine
megan melanie melinda melissa melvin meredith micheal michael michele michelle miguel mike mildred
misty mitchell molly monica morgan nancy naomi natalie nathan nathaniel neil nelson nicholas nicole
nina noah norma norman olivia oscar pam pamela pat patricia patrick patsy paul paula pauline peggy
penny perry peter phillip philip phyllis preston priscilla rachel ralph ramon randall randy ray
raymond rebecca regina reginald renee rhonda ricardo richard ricky rita rob robert roberta roberto
robin rochelle rodney roger roland ron ronald ronnie rosa rosalie rose rosemary ross roy ruben ruby
russell ruth ryan sabrina sally sam samantha samuel sandra sandy sara sarah scott sean sergio seth
shane shannon sharon shawn sheila shelby shelly sherri sherry shirley sidney sonia sonya stacey
stacy stanley stephanie stephen steve steven sue summer susan suzanne sylvia tabitha tamara tami
tammy tanya tara taylor ted teresa terrance terri terry thelma theodore theresa thomas tiffany tim
timothy tina todd tom tommy toni tony tonya tracey traci tracy travis trevor tricia troy tyler tyrone
valerie vanessa velma vernon veronica vicki vickie victor victoria vincent virginia vivian wade
walter wanda warren wayne wendy wesley whitney willard william willie wilma yolanda yvonne zachary
""".split())

# Establishments that cannot reasonably be run from a home, so the NAICS code
# alone is storefront evidence. Kept short on purpose: salons, repair shops,
# take-out kitchens and the 2022 retail subsectors (which absorbed online and
# home-based sellers) all need another premises signal. So do car washes
# (811192 also covers mobile detailing) and bars (7224 also covers mobile
# bars); a real one shows its street through OSM, TABC, or its own website.
STOREFRONT_NAICS_PREFIXES = (
    "721110",                                   # hotels and motels
    "622",                                      # hospitals
    "447", "457110", "457120",                  # gas stations (2017, 2022)
    "445110",                                   # supermarkets
    "44512", "445131",                          # convenience stores (2017, 2022)
    "4521", "452210", "452311", "455110", "455211",  # department stores, warehouse clubs
    "4411",                                     # car dealers (Texas requires a place of business)
    "5221",                                     # banks and credit unions
    "512131",                                   # cinemas
    "71395",                                    # bowling centers
    "722511",                                   # full-service restaurants
)

# A unit on the street that marks a dwelling (an apartment, a lot, space, or
# trailer in a park, a mobile home, a bare unit number), so the NAICS code
# alone is not storefront evidence there. Matches the display street ("Apt 4",
# "Spc 12", "#4"), also run together or abbreviated ("Apt4", "Sp 12", "Mh 5").
_RESIDENTIAL_UNIT = re.compile(r"(?:^|\s)#|\b(?:apts?|apartment|unit|lot|spc?|space|trlr|trailer|mh)(?=\d|\b)",
                               re.IGNORECASE)

# OSM tags that describe a public-facing premises. craft=*, office=*,
# healthcare=* alone, childcare and the like are often mapped at a home.
OSM_STOREFRONT_AMENITIES = frozenset({
    "restaurant", "fast_food", "cafe", "bar", "pub", "biergarten", "ice_cream", "food_court", "bank",
    "pharmacy", "fuel", "car_wash", "car_rental", "cinema", "theatre", "nightclub", "hospital", "clinic",
    "dentist", "doctors", "veterinary",
})
OSM_STOREFRONT_TOURISM = frozenset({"hotel", "motel"})
OSM_STOREFRONT_LEISURE = frozenset({"fitness_centre", "sports_centre", "bowling_alley"})

GENERIC_EMAIL_LOCALS = frozenset({
    "info", "office", "contact", "hello", "frontdesk", "front.desk", "reception", "appointments",
    "appts", "scheduling", "service", "services", "sales", "support", "orders", "order", "bookings",
    "booking", "reservations", "care", "team", "mail", "inquiries", "inquiry", "help", "admin",
    "customerservice", "custserv", "events", "catering", "jobs", "careers", "hr", "billing", "parts",
})

_PERSON_COMMA = re.compile(r"^\s*[A-Za-z'\-]{2,}\s*,\s*[A-Za-z'\-]{2,}(?:\s+[A-Za-z]\.?)*\s*$")

# Comptroller "taxpayer organizational type": a description ("Sole Owner",
# "Texas Limited Liability Company") or its two-letter code. The code for an
# individual (IS, Individual - Sole Owner) decides like the words do; any other
# code, a blank value, or a missing column leaves it to the name.
INDIVIDUAL_ORG_CODES = frozenset({"is"})
ENTITY_ORG_WORDS = ("corporation", "limited", "partnership", "association", "trust", "llc", "company",
                    "government", "nonprofit", "non-profit", "church", "estate")

# Joins two owners' names: 'SMITH JOHN & MARY', 'John and Mary Smith'.
_JOINERS = re.compile(r"\s*(?:&|\+|\band\b)\s*", re.IGNORECASE)
# Surname particles: 'Maria Elena De La Cruz' is three name words.
_PARTICLES = frozenset({"de", "del", "la", "las", "los", "le", "da", "das", "dos", "di", "du", "van", "von",
                        "der", "den", "y"})
# Legal forms that rule out a person even when the name repeats as the outlet name.
_LEGAL_FORMS = frozenset(normalize.LEGAL_SUFFIXES) | {"trust", "estate", "partnership", "partners", "holdings"}
_GENERATIONAL = frozenset({"jr", "sr", "ii", "iii", "iv", "v"})


def _tokens(name: str) -> list:
    return [t for t in re.split(r"[^a-z0-9'&-]+", normalize._ascii(name).casefold()) if t]


def _has_business_word(tokens) -> bool:
    # A possessive ("joe's") is a business word; O'Shea and La'Shonda are not.
    return any(t.strip("'-") in BUSINESS_WORDS or t.endswith("'s") for t in tokens)


def has_given_name(name: Optional[str]) -> bool:
    return any(t in GIVEN_NAMES for t in _tokens(name or ""))


def _joint_parts(name: str) -> Optional[list]:
    """The word lists of each owner in 'SMITH JOHN & MARY' or 'John and Mary Smith';
    None unless the name is two or more plain name parts joined by '&' or 'and'."""
    pieces = [p for p in _JOINERS.split(name.replace(",", " ")) if p.strip()]
    if len(pieces) < 2:
        return None
    parts = []
    for piece in pieces:
        words = [t for t in _tokens(piece) if not re.fullmatch(r"[a-z]\.?", t) and t not in _GENERATIONAL]
        if not 1 <= len(words) <= 6 or _has_business_word(words):
            return None
        if any(not re.fullmatch(r"[a-z][a-z'\-]*", t) for t in words):
            return None
        parts.append(words)
    return parts


def looks_like_person_name(name: Optional[str]) -> bool:
    """'SMITH, JOHN A', 'John A Smith', 'Maria Elena De La Cruz', 'Smith John & Mary': True.
    'Smith Family Dentistry', 'Smith & Wesson': False."""
    if not name or not name.strip():
        return False
    if _PERSON_COMMA.match(name):
        return not _has_business_word(_tokens(name.replace(",", " ")))
    parts = _joint_parts(name)
    if parts is not None:
        return any(t in GIVEN_NAMES for words in parts for t in words)
    tokens = _tokens(name)
    # Drop middle initials, suffixes (jr, ii), and surname particles (de, la).
    words = [t for t in tokens if not re.fullmatch(r"[a-z]\.?", t) and t not in _GENERATIONAL
             and t not in _PARTICLES]
    if not 2 <= len(words) <= 4:
        return False
    if any(not re.fullmatch(r"[a-z][a-z'\-]*", t) for t in words):
        return False
    if _has_business_word(words):
        return False
    return any(t in GIVEN_NAMES for t in words)


def _org_kind(org_type: Optional[str]) -> Optional[bool]:
    """True for an individual, False for an entity, None when the org type does not say."""
    kind = (org_type or "").strip().casefold()
    if kind in INDIVIDUAL_ORG_CODES or "individual" in kind or "sole" in kind:
        return True
    if kind and any(word in kind for word in ENTITY_ORG_WORDS):
        return False
    return None


def _repeats_person_name(outlet_name: str, taxpayer_name: str) -> bool:
    """With no trade name the Comptroller repeats the taxpayer name as the outlet
    name. Repeated that way, two to six plain words are a person's name even
    when one of them (the surname: Temple, Glass, Church) is a business word:
    when another is a given name, or when that business word leads the
    taxpayer's 'LAST FIRST' name ('TEMPLE JAMAL': not every given name is in
    GIVEN_NAMES)."""
    outlet = set(_person_tokens(outlet_name))
    owner = _person_tokens(taxpayer_name)
    if not outlet or not outlet <= set(owner):
        return False
    if not 2 <= len(owner) <= 6 or any(not re.fullmatch(r"[a-z][a-z']*", t) for t in owner):
        return False
    if any(t in _LEGAL_FORMS for t in owner):
        return False
    # One business word, though a couple may repeat it ('JOHN TEMPLE & MARY TEMPLE').
    business = {t for t in owner if t in BUSINESS_WORDS or t.endswith("'s")}
    if len(business) > 1:
        return False
    if any(t in GIVEN_NAMES for t in owner):
        return True
    # A name, not '&', follows a surname ('TEMPLE JAMAL'; 'TIRE & WHEEL' is a trade name).
    words = _tokens(taxpayer_name.replace(",", " "))
    return owner[0] in business and len(words) > 1 and words[1] not in ("&", "and")


def _outlet_repeats(outlet_name: Optional[str], taxpayer_name: str) -> bool:
    """The outlet name, or its part before a DBA marker, repeats the taxpayer's own name."""
    if not outlet_name:
        return False
    return any(_repeats_person_name(part, taxpayer_name)
               for part in {outlet_name, normalize.split_dba(outlet_name)[0]} if part)


def is_individual_taxpayer(taxpayer_name: Optional[str], org_type: Optional[str] = None,
                           outlet_name: Optional[str] = None) -> bool:
    """The taxpayer is a person, or people (a couple's partnership). When in doubt, True:
    it only holds back an owner-named listing and a street shown by NAICS alone."""
    kind = _org_kind(org_type)
    if kind:
        return True
    # "SMITH JOHN DBA ACME ROOFING": the legal name before the marker decides.
    name = normalize.split_dba(taxpayer_name)[0] or (taxpayer_name or "")
    if not name.strip():
        return False
    parts = _joint_parts(name)
    if parts is not None and (any(len(words) >= 2 for words in parts)
                              or any(t in GIVEN_NAMES for words in parts for t in words)):
        return True  # joint owners, whatever the partnership form
    if kind is False:
        # A couple's partnership named after them, even when the surname is a
        # business word ('TEMPLE JOHN & MARY', 'JOHN & MARY BARBER').
        return bool(_JOINERS.search(name)) and _outlet_repeats(outlet_name, name)
    if _PERSON_COMMA.match(name) and not any(t.strip(".") in ORG_MARKERS for t in _tokens(name.split(",", 1)[1])):
        return True  # 'CHURCH, JOHN': the surname may be a business word
    tokens = _tokens(name.replace(",", " "))
    if not any(t.strip(".") in ORG_MARKERS for t in tokens):
        words = [t for t in tokens if not re.fullmatch(r"[a-z]\.?", t)]
        if (2 <= len(words) <= 6 and all(re.fullmatch(r"[a-z][a-z'\-]*", t) for t in words)
                and not _has_business_word(words)):
            return True
    return _outlet_repeats(outlet_name, name)


def _name_set(name: Optional[str]) -> set:
    return {t.strip("'-.") for t in _tokens((name or "").replace(",", " ")) if len(t.strip("'-.")) > 1}


def _person_tokens(name: Optional[str]) -> list:
    """Name tokens with hyphens split and suffixes (jr, ii), initials, 'and', and 'dba' dropped."""
    out = []
    for token in _tokens((name or "").replace(",", " ")):
        for part in token.split("-"):
            part = part.strip("'.")
            if len(part) > 1 and part not in _GENERATIONAL and part not in ("and", "dba"):
                out.append(part)
    return out


def _owner_tokens(taxpayer_name: Optional[str]) -> set:
    # 'SMITH JOHN DBA ACE LAWN': the owner's name is the part before the marker.
    return set(_person_tokens(normalize.split_dba(taxpayer_name)[0] or taxpayer_name))


def _named_for_owner(name: str, owner: set) -> bool:
    outlet = _person_tokens(name)
    if outlet and owner and set(outlet) <= owner:
        return True
    # Two of the owner's names hold it back even next to a business word.
    if len(set(outlet) & owner) >= 2:
        return True
    if (not _has_business_word(_tokens(name)) and 2 <= len(outlet) <= 6
            and all(re.fullmatch(r"[a-z]+", t) for t in outlet)):
        return True
    return looks_like_person_name(name)


def outlet_is_personal_name(outlet_name: Optional[str], taxpayer_name: Optional[str], is_individual: bool) -> bool:
    """The outlet is listed under the owner's own name (a sole proprietor).

    Deliberately conservative: for an individual taxpayer any plain two-to-six
    word name without a business word counts, so a trade name that merely
    looks like a person's is held back until it has a public presence. Holding
    back a real business is the safe failure; publishing an owner's name is not.
    'Owner Name DBA Trade Name' is judged whole, and by each side of the marker.
    """
    if not is_individual or not outlet_name:
        return False
    owner = _owner_tokens(taxpayer_name)
    names = {outlet_name, *(part for part in normalize.split_dba(outlet_name) if part)}
    return any(_named_for_owner(name, owner) for name in names)


def carries_owner_name(name: Optional[str], taxpayer_name: Optional[str]) -> bool:
    """The name carries two of the owner's own name words, not just a surname:
    'Dalix Quillfeather Lawn', 'Thanh & Hoa Nguyen'; not 'Quillfeather Lawn'."""
    return len(set(_person_tokens(name)) & _owner_tokens(taxpayer_name)) >= 2


def may_name_owner(name: Optional[str]) -> bool:
    """For an owner-named listing: the shown name may still be the owner's own,
    because it has a given name, or two or more words and no trade word ('Hoa
    Nguyen', 'Thanh & Hoa Nguyen'). 'Smith Lawn Service', "Maria's Bakery",
    and a bare surname do not."""
    words = [t for t in _tokens(name or "") if t.strip("'-&") and t != "and"]
    return has_given_name(name) or (len(words) >= 2 and not _has_business_word(words))


def _linked_sources(conn: sqlite3.Connection, business_id: int) -> list:
    return list(conn.execute(
        "SELECT source_id, street_norm, naics, tags_json FROM source_records WHERE business_id=? AND active=1",
        (business_id,),
    ).fetchall())


def _fact(conn: sqlite3.Connection, business_id: int, field: str):
    row = conn.execute(
        "SELECT value_json FROM facts WHERE business_id=? AND field=?", (business_id, field)
    ).fetchone()
    return json.loads(row["value_json"]) if row else None


def has_public_presence(conn: sqlite3.Connection, business_id: int) -> bool:
    if _fact(conn, business_id, "website"):
        return True
    return any(r["source_id"] in ("osm", "tx_tabc", "npi") for r in _linked_sources(conn, business_id))


def osm_is_storefront(tags) -> bool:
    """True when an OSM record's tags (a dict or its JSON) describe a public-facing premises."""
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except ValueError:
            return False
    if not isinstance(tags, dict):
        return False
    return bool(
        tags.get("shop")
        or tags.get("amenity") in OSM_STOREFRONT_AMENITIES
        or tags.get("tourism") in OSM_STOREFRONT_TOURISM
        or tags.get("leisure") in OSM_STOREFRONT_LEISURE
    )


def storefront_naics(naics: Optional[str]) -> bool:
    code = "".join(ch for ch in (naics or "") if ch.isdigit())
    return bool(code) and any(code.startswith(prefix) for prefix in STOREFRONT_NAICS_PREFIXES)


def residential_unit(street: Optional[str]) -> bool:
    return bool(street) and bool(_RESIDENTIAL_UNIT.search(street))


def naics_storefront(business: Mapping) -> bool:
    """The NAICS code alone is storefront evidence: a non-individual taxpayer, a
    storefront code, and no dwelling unit (Apt, Lot, Trlr, #) on the street."""
    return bool(not business["is_individual"] and storefront_naics(business["naics"])
                and not residential_unit(business["street"]))


def premises_record(rec: Mapping, street_norm: Optional[str]) -> bool:
    """A linked record that shows a public premises at this street: any TABC or
    NPI record there, or an OSM record whose tags describe a storefront."""
    if not street_norm or rec["street_norm"] != street_norm:
        return False
    if rec["source_id"] in ("tx_tabc", "npi"):
        return True
    return rec["source_id"] == "osm" and osm_is_storefront(rec["tags_json"])


def address_is_public(conn: sqlite3.Connection, business_id: int) -> Tuple[bool, str]:
    biz = conn.execute(
        "SELECT street, street_norm, zip, naics, is_individual FROM businesses WHERE id=?", (business_id,)
    ).fetchone()
    if not biz or not biz["street_norm"] or not biz["zip"]:
        return False, "no_street"
    if _fact(conn, business_id, "address_listed") is True:
        return True, "listed_on_own_website"
    for rec in _linked_sources(conn, business_id):
        if premises_record(rec, biz["street_norm"]):
            return True, f"{rec['source_id']}_premises"
    if naics_storefront(biz):
        return True, "storefront_naics"
    return False, "no_storefront_evidence"


_SUFFIX_FORMS = frozenset(normalize.STREET_SUFFIXES.values())


def _street_words(text: Optional[str]) -> list:
    """Words as streets compare them: 'Sample Court' -> ['sample', 'ct']; directions dropped."""
    text = re.sub(r"[^a-z0-9]+", " ", normalize._ascii(text or "").casefold())
    return [normalize.STREET_SUFFIXES.get(t, t) for t in normalize._clean_street_text(text).split()
            if t not in normalize.DIRECTIONALS]


def _has_run(words: list, run: list) -> bool:
    return any(words[i:i + len(run)] == run for i in range(len(words) - len(run) + 1))


def name_spells_street(name: Optional[str], street_norm: Optional[str]) -> bool:
    """True when a name (or slug) spells out this street, so it reads as an address.

    At 77 Sample Ct: '77 Sample Ct', 'Sample Court Candles' and 'Scentsy 77
    Sample' do; 'Sample Candles' does not (a street's name alone is not an address).
    """
    street = _street_words(street_norm)
    number = street[0] if street and any(ch.isdigit() for ch in street[0]) else None
    words = street[1:] if number else street
    if all(w in _SUFFIX_FORMS for w in words):  # nothing but a suffix ('100 N St') is too little to match
        return False
    tokens = _street_words(name)
    return _has_run(tokens, words) or bool(number and _has_run(tokens, [number, words[0]]))


def generic_email_ok(email: Optional[str], site_domain: Optional[str]) -> bool:
    if not email or not site_domain or email.count("@") != 1:
        return False
    local, domain = email.strip().lower().split("@")
    if local not in GENERIC_EMAIL_LOCALS:
        return False
    return normalize.registrable_domain(domain) == normalize.registrable_domain(site_domain)


def name_zip_key(name: Optional[str], zip_code: Optional[str]) -> str:
    return f"{normalize.norm_name(name)}|{zip_code or ''}"


def is_suppressed(conn: sqlite3.Connection, business: Mapping) -> bool:
    """True when a removal request covers this business (by id, domain, phone, or name + ZIP)."""
    checks = [("public_id", business["public_id"])] if business["public_id"] else []
    domain = business["website_domain"] if "website_domain" in business.keys() else None
    if domain:
        checks.append(("domain", normalize.registrable_domain(domain)))
    phone = _fact(conn, business["id"], "phone")
    if phone:
        checks.append(("phone", phone))
    checks.append(("name_zip", name_zip_key(business["name"], business["zip"])))
    for kind, value in checks:
        if value and conn.execute(
            "SELECT 1 FROM suppressions WHERE kind=? AND value=?", (kind, value)
        ).fetchone():
            return True
    return False
