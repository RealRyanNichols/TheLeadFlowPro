"""Phone numbers and office emails a business publishes on its own website.

Phones come from ``tel:`` links, the site's JSON-LD, and visible text (fax
numbers are skipped). Emails are kept only when they are a generic office
address (info@, office@, ...) on the site's own registrable domain; every
other address is dropped here and never reaches storage or logs.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

from .. import normalize, privacy
from .html import Page

# (value, method, confidence): tel_link/jsonld 0.95, mailto 0.9, text 0.8.
Candidate = Tuple[str, str, float]

_PHONE_TEXT = re.compile(
    r"(?<![\d\w])(?:\+?1[\s.\-]?)?\(?\s*[2-9]\d{2}\s*\)?[\s.\-]?[2-9]\d{2}[\s.\-]?\d{4}(?![\d])"
)
_FAX_BEFORE = re.compile(r"\bfax\b[^\d]{0,12}$", re.I)
_EMAIL_TEXT = re.compile(r"(?<![\w.+-])[a-z0-9][a-z0-9._%+\-]{0,63}@[a-z0-9](?:[a-z0-9\-]{0,62}\.)+[a-z]{2,24}(?![\w-])", re.I)


def _best(found: Dict[str, Tuple[str, float, int]], key: str, method: str, confidence: float, order: int) -> None:
    current = found.get(key)
    if current is None or confidence > current[1]:
        found[key] = (method, confidence, current[2] if current else order)


def _ordered(found: Dict[str, Tuple[str, float, int]]) -> List[Candidate]:
    items = sorted(found.items(), key=lambda kv: (-kv[1][1], kv[1][2]))
    return [(key, method, confidence) for key, (method, confidence, _) in items]


def _jsonld_values(page: Page, key: str) -> List[str]:
    out: List[str] = []

    def walk(value: Any, depth: int) -> None:
        if depth > 4:
            return
        if isinstance(value, dict):
            for k, v in value.items():
                if k == key:
                    for item in (v if isinstance(v, list) else [v]):
                        if isinstance(item, str):
                            out.append(item)
                elif k in ("contactPoint", "location", "department", "address"):
                    walk(v, depth + 1)
        elif isinstance(value, list):
            for item in value:
                walk(item, depth + 1)

    for item in page.jsonld:
        walk(item, 0)
    return out


def phones(page: Page, allow_fictional: bool = False) -> List[Candidate]:
    """[(e164, method, confidence)], best method per number, strongest first."""
    found: Dict[str, Tuple[str, float, int]] = {}
    order = 0
    for raw in page.tels:
        e164 = normalize.norm_phone(raw, allow_fictional=allow_fictional)
        if e164:
            _best(found, e164, "tel_link", 0.95, order)
            order += 1
    for raw in _jsonld_values(page, "telephone"):
        e164 = normalize.norm_phone(raw, allow_fictional=allow_fictional)
        if e164:
            _best(found, e164, "jsonld", 0.95, order)
            order += 1
    for line in page.lines:
        for m in _PHONE_TEXT.finditer(line):
            if _FAX_BEFORE.search(line[: m.start()]):
                continue
            e164 = normalize.norm_phone(m.group(0), allow_fictional=allow_fictional)
            if e164:
                _best(found, e164, "text", 0.8, order)
                order += 1
    return _ordered(found)


_OBFUSCATED = [
    (re.compile(r"\s*[\[\(\{<]\s*at\s*[\]\)\}>]\s*", re.I), "@"),
    (re.compile(r"\s*[\[\(\{<]\s*dot\s*[\]\)\}>]\s*", re.I), "."),
]
_SPELLED = re.compile(
    r"\b([a-z0-9][a-z0-9._\-]*)\s+at\s+([a-z0-9\-]+(?:\s+dot\s+[a-z0-9\-]+)+)\b", re.I
)


def deobfuscate(text: str) -> str:
    """'info [at] example [dot] example' -> 'info@example.example'."""
    out = text or ""
    for pattern, repl in _OBFUSCATED:
        out = pattern.sub(repl, out)
    out = _SPELLED.sub(lambda m: m.group(1) + "@" + re.sub(r"\s+dot\s+", ".", m.group(2), flags=re.I), out)
    return out


def _clean_email(raw: str) -> Optional[str]:
    text = (raw or "").strip().strip("<>.,;:").lower()
    if text.startswith("mailto:"):
        text = text[7:].split("?", 1)[0]
    if _EMAIL_TEXT.fullmatch(text):
        return text
    return None


def emails(page: Page, site_domain: Optional[str]) -> List[Candidate]:
    """[(email, method, confidence)] for generic office addresses on the site's own domain."""
    found: Dict[str, Tuple[str, float, int]] = {}
    order = 0

    def consider(raw: str, method: str, confidence: float) -> None:
        nonlocal order
        email = _clean_email(raw)
        if email and privacy.generic_email_ok(email, site_domain):
            _best(found, email, method, confidence, order)
            order += 1

    for raw in _jsonld_values(page, "email"):
        consider(raw, "jsonld", 0.95)
    for raw in page.mailtos:
        consider(raw, "mailto", 0.9)
    for line in page.lines:
        for m in _EMAIL_TEXT.finditer(deobfuscate(line)):
            consider(m.group(0), "text", 0.8)
    return _ordered(found)


def all_pages_phones(pages: Iterable[Page], allow_fictional: bool = False) -> List[Candidate]:
    """``phones`` across several pages of one site, best method per number."""
    found: Dict[str, Tuple[str, float, int]] = {}
    order = 0
    for page in pages:
        for e164, method, confidence in phones(page, allow_fictional=allow_fictional):
            _best(found, e164, method, confidence, order)
            order += 1
    return _ordered(found)
