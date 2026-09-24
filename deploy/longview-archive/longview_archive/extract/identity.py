"""Is this website really the business's own site?

Facts are taken from a website only after the site identifies itself as the
business: its name in the title, site name, main heading, or structured data;
its domain named after the business; or the business's street address or
phone number listed on the site. ``address_listed`` is the storefront evidence
privacy.address_is_public relies on, so it needs the street number and the
street's core word together on one line.
"""

from __future__ import annotations

import math
import re
from typing import List, Optional, Sequence, Tuple, Union

from .. import normalize
from . import contacts
from .html import Page

_ROUTE_WORDS = {"hwy", "fm", "cr", "loop", "spur", "i", "us", "sh", "rr"}
_DIRECTIONS = {"n", "s", "e", "w", "ne", "nw", "se", "sw"}
_SUFFIXES = set(normalize.STREET_SUFFIXES.values())


def _name_hit(text: Optional[str], tokens: set) -> bool:
    if not text or not tokens:
        return False
    seen = set(normalize.norm_name(text).split())
    overlap = tokens & seen
    return len(overlap) >= math.ceil(len(tokens) / 2) and any(len(t) >= 4 for t in overlap)


def street_key(street: Optional[str]) -> Optional[Tuple[str, str]]:
    """('1200', 'marshall') for '1200 W Marshall Ave Ste 4'; None when there is no number."""
    street_norm, _ = normalize.parse_street(street)
    words = street_norm.split()
    if len(words) < 2 or not re.fullmatch(r"\d+[a-z]?", words[0]):
        return None
    rest = [w for w in words[1:] if w not in _DIRECTIONS]
    for idx, word in enumerate(rest):
        if word in _ROUTE_WORDS:
            if idx + 1 < len(rest):
                return words[0], rest[idx + 1]
            continue
        if word in _SUFFIXES and idx > 0:
            continue
        return words[0], word
    return None


def _line_lists_street(line: str, key: Tuple[str, str]) -> bool:
    number, core = key
    low = normalize._ascii(line).lower()
    return bool(re.search(r"(?<![\w-])" + re.escape(number) + r"(?![\w-])", low)
                and re.search(r"(?<![\w])" + re.escape(core) + r"(?![\w])", low))


def _jsonld_names(page: Page) -> List[str]:
    names = []
    for item in page.jsonld:
        name = item.get("name") if isinstance(item, dict) else None
        if isinstance(name, str):
            names.append(name)
        alt = item.get("alternateName") if isinstance(item, dict) else None
        if isinstance(alt, str):
            names.append(alt)
    return names


def site_matches_business(
    pages: Union[Page, Sequence[Page]],
    business_name: str,
    street: Optional[str] = None,
    phone: Optional[str] = None,
) -> Tuple[bool, str, bool]:
    """(matches, reason, address_listed) for one site's fetched pages."""
    if isinstance(pages, Page):
        pages = [pages]
    pages = [p for p in pages if p is not None]
    tokens = normalize.name_tokens(business_name)
    key = street_key(street) if street else None

    address_listed = bool(key) and any(
        _line_lists_street(line, key) for page in pages for line in page.lines
    )

    for page in pages:
        if _name_hit(page.title, tokens):
            return True, "name_in_title", address_listed
        if _name_hit(page.meta.get("og:site_name"), tokens):
            return True, "name_in_site_name", address_listed
        if any(level == 1 and _name_hit(text, tokens) for level, text in page.headings):
            return True, "name_in_h1", address_listed
        if any(_name_hit(name, tokens) for name in _jsonld_names(page)):
            return True, "name_in_jsonld", address_listed

    for page in pages:
        domain = normalize.registrable_domain(page.url)
        label = re.sub(r"[^a-z0-9]", "", domain.split(".")[0]) if domain else ""
        if label and any(len(t) >= 4 and t in label for t in tokens):
            return True, "domain_label", address_listed

    if address_listed:
        return True, "street_listed", address_listed

    if phone:
        wanted = normalize.norm_phone(phone, allow_fictional=True)
        if wanted:
            for page in pages:
                if any(e164 == wanted for e164, _, _ in contacts.phones(page, allow_fictional=True)):
                    return True, "phone_listed", address_listed

    return False, "no_match", address_listed
