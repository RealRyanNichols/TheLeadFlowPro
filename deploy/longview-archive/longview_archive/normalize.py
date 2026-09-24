"""Normalization for matching and display: names, streets, phones, URLs.

Two records describe the same place only when their normalized keys agree, so
these functions decide what "the same" means. They are pure and deterministic.
"""

from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher
from typing import Optional, Set, Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

# ---------------------------------------------------------------- names

LEGAL_SUFFIXES = {
    "llc", "inc", "incorporated", "corp", "corporation", "ltd", "limited",
    "lp", "llp", "lllp", "pllc", "plc", "pc", "pa", "co", "company",
}

# Words too common in business names to tell two businesses apart.
NAME_STOP_WORDS = {
    "the", "and", "of", "at", "in", "on", "for", "a", "an", "by",
    "llc", "inc", "co", "corp", "company", "ltd", "lp", "llp", "pllc", "pc", "pa",
    "longview", "tx", "texas", "east", "etx",
}


def _ascii(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")


def norm_name(s: Optional[str]) -> str:
    """Comparable business name: 'The Example Tire & Lube, LLC' -> 'example tire and lube'."""
    if not s:
        return ""
    text = _ascii(s).casefold()
    text = re.sub(r"\bd\s*[./]?\s*b\s*[./]?\s*a\b\.?", " dba ", text)
    # "Legal Name DBA Trade Name" keeps the trade name.
    parts = re.split(r"\b(?:dba|doing business as)\b", text)
    if len(parts) > 1 and parts[-1].strip():
        text = parts[-1]
    text = text.replace("&", " and ").replace("+", " and ")
    text = re.sub(r"['’`]", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    # Collapse spaced initials: "l l c" -> "llc".
    text = re.sub(r"\b([a-z]) (?=[a-z]\b)", r"\1", text)
    tokens = text.split()
    while tokens and tokens[-1] in LEGAL_SUFFIXES:
        tokens.pop()
    if tokens and tokens[0] == "the" and len(tokens) > 1:
        tokens = tokens[1:]
    return " ".join(tokens)


def name_tokens(s: Optional[str]) -> Set[str]:
    """Distinctive tokens of a name (stop words and single letters removed)."""
    return {t for t in norm_name(s).split() if t not in NAME_STOP_WORDS and len(t) > 1}


def name_similarity(a: Optional[str], b: Optional[str]) -> float:
    na, nb = norm_name(a), norm_name(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    ta, tb = na.split(), nb.split()
    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    if len(min(ta, tb, key=len)) >= 2 and re.search(r"\b" + re.escape(shorter) + r"\b", longer):
        return 1.0
    sa, sb = name_tokens(a), name_tokens(b)
    jaccard = len(sa & sb) / len(sa | sb) if (sa or sb) else 0.0
    ratio = SequenceMatcher(None, na, nb).ratio()
    return round(max(jaccard, ratio), 4)


# ---------------------------------------------------------------- streets

STREET_SUFFIXES = {
    "street": "st", "str": "st", "st": "st",
    "avenue": "ave", "av": "ave", "ave": "ave",
    "road": "rd", "rd": "rd",
    "drive": "dr", "dr": "dr", "drv": "dr",
    "boulevard": "blvd", "blvd": "blvd", "boul": "blvd",
    "parkway": "pkwy", "pkwy": "pkwy", "pky": "pkwy",
    "lane": "ln", "ln": "ln",
    "circle": "cir", "cir": "cir",
    "court": "ct", "ct": "ct",
    "place": "pl", "pl": "pl",
    "trail": "trl", "trl": "trl",
    "freeway": "fwy", "fwy": "fwy",
    "expressway": "expy", "expy": "expy",
    "highway": "hwy", "hwy": "hwy", "hiway": "hwy",
    "terrace": "ter", "ter": "ter",
    "square": "sq", "sq": "sq",
    "plaza": "plz", "plz": "plz",
    "loop": "loop", "spur": "spur",
    "cove": "cv", "cv": "cv",
    "crossing": "xing", "xing": "xing",
    "point": "pt", "pt": "pt",
    "center": "ctr", "ctr": "ctr",
    "way": "way", "row": "row", "run": "run", "path": "path", "pass": "pass",
}

DIRECTIONALS = {
    "north": "n", "south": "s", "east": "e", "west": "w",
    "northeast": "ne", "northwest": "nw", "southeast": "se", "southwest": "sw",
    "n": "n", "s": "s", "e": "e", "w": "w", "ne": "ne", "nw": "nw", "se": "se", "sw": "sw",
}

UNIT_WORDS = {
    "suite", "ste", "unit", "apt", "apartment", "bldg", "building", "rm", "room",
    "space", "spc", "lot", "office", "ofc", "#",
}

# Route names that are written many ways: "US HIGHWAY 80", "U.S. Hwy 80",
# "State Highway 998", "SH 998", "Farm to Market Road 9997", "F.M. 9997".
_ROUTE_PATTERNS = [
    (re.compile(r"\b(?:u\s*s|united states)\s+(?:highway|hwy|hiway)\b"), " hwy "),
    (re.compile(r"\bus\s+(?=\d)"), " hwy "),
    (re.compile(r"\b(?:state\s+(?:highway|hwy)|st\s+hwy|sh)\s+(?=\d)"), " hwy "),
    (re.compile(r"\b(?:tx|texas)\s+(?:highway|hwy)\b"), " hwy "),
    (re.compile(r"\binterstate\s+(?=\d)|\bi\s*-?\s*(?=20\b)"), " i "),
    (re.compile(r"\bfarm\s*(?:to|-)?\s*market(?:\s+(?:road|rd))?\b"), " fm "),
    (re.compile(r"\bf\s+m\b"), " fm "),
    (re.compile(r"\bfm\s+(?:road|rd)\s+(?=\d)"), " fm "),
    (re.compile(r"\bcounty\s+(?:road|rd)\b"), " cr "),
    (re.compile(r"\bloop\s+(?:road|rd)\b"), " loop "),
]


def _clean_street_text(line: str) -> str:
    text = _ascii(line).casefold()
    text = text.replace("#", " # ")
    text = re.sub(r"[.,;:]", " ", text)
    text = re.sub(r"(?<=[a-z])-(?=\d)", " ", text)  # "us-80" -> "us 80"
    text = re.sub(r"\s+", " ", text).strip()
    for pattern, repl in _ROUTE_PATTERNS:
        text = pattern.sub(repl, text)
    return re.sub(r"\s+", " ", text).strip()


def parse_street(line: Optional[str]) -> Tuple[str, str]:
    """(street_norm, suite) with USPS-style abbreviations, lowercase.

    '1200 W. EXAMPLE AVE., SUITE 4' -> ('1200 w example ave', '4').
    """
    if not line:
        return "", ""
    tokens = _clean_street_text(line).split()
    street: list = []
    suite = ""
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok in UNIT_WORDS and street:
            rest = [t for t in tokens[i + 1:] if t not in UNIT_WORDS]
            suite = rest[0] if rest else ""
            break
        street.append(tok)
        i += 1
    out = []
    for idx, tok in enumerate(street):
        if tok in DIRECTIONALS and (idx == 1 or idx == len(street) - 1) and len(street) > 2:
            out.append(DIRECTIONALS[tok])
        elif idx > 0 and tok in STREET_SUFFIXES and not (
            idx + 1 < len(street) and street[idx + 1].isdigit() and tok not in ("hwy", "highway", "loop", "spur")
        ):
            out.append(STREET_SUFFIXES[tok])
        else:
            out.append(tok)
    # A trailing lone letter or number after the suffix is often a unit ("... Rd B").
    if (
        not suite
        and len(out) >= 4
        and re.fullmatch(r"[a-z]", out[-1])
        and out[-1] not in ("n", "s", "e", "w")
        and out[-2] in STREET_SUFFIXES.values()
    ):
        suite = out.pop()
    return " ".join(out), suite.strip("#- ")


_UPPER_TOKENS = {"n", "s", "e", "w", "ne", "nw", "se", "sw", "fm", "cr", "us", "i"}
_DISPLAY_SUFFIX = {v: v.capitalize() for v in STREET_SUFFIXES.values()}
_UNIT_DISPLAY = {
    "suite": "Ste", "ste": "Ste", "unit": "Unit", "apt": "Apt", "apartment": "Apt", "bldg": "Bldg",
    "building": "Bldg", "rm": "Rm", "room": "Rm", "space": "Spc", "spc": "Spc", "lot": "Lot",
    "office": "Ofc", "ofc": "Ofc", "#": "#",
}


def display_street(line: Optional[str]) -> str:
    """Tidy display form: '1200 W Example Ave Ste 4'."""
    street_norm, suite = parse_street(line)
    if not street_norm:
        return ""
    words = []
    for tok in street_norm.split():
        if tok in _UPPER_TOKENS:
            words.append(tok.upper())
        elif tok in _DISPLAY_SUFFIX:
            words.append(_DISPLAY_SUFFIX[tok])
        elif re.fullmatch(r"\d+(st|nd|rd|th)", tok):
            words.append(tok)
        elif tok == "hwy":
            words.append("Hwy")
        else:
            words.append(tok.capitalize())
    text = " ".join(words)
    text = re.sub(r"\bI (\d+)\b", r"I-\1", text)
    if suite:
        label = "Ste"
        for tok in _clean_street_text(line).split():
            if tok in _UNIT_DISPLAY:
                label = _UNIT_DISPLAY[tok]
                break
        unit = suite.upper() if len(suite) <= 3 else suite
        text += f" #{unit}" if label == "#" else f" {label} {unit}"
    return text


def zip5(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    m = re.match(r"\s*(\d{5})(?:-?\d{4})?\s*$", str(s))
    return m.group(1) if m else None


# ---------------------------------------------------------------- phones

_EXT_RE = re.compile(r"\s*(?:x|ext\.?|extension|#)\s*\d+\s*$", re.IGNORECASE)


def norm_phone(s: Optional[str], allow_fictional: bool = False) -> Optional[str]:
    """E.164 for a valid North American number, else None.

    555-0100 through 555-0199 are reserved for fiction; they are accepted only
    when ``allow_fictional`` is set (tests and sample data).
    """
    if not s:
        return None
    text = _EXT_RE.sub("", str(s))
    digits = re.sub(r"\D", "", text)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) != 10:
        return None
    area, exchange, line = digits[:3], digits[3:6], digits[6:]
    if area[0] in "01" or exchange[0] in "01":
        return None
    if area[1:] == "11" or exchange[1:] == "11":
        return None
    if area == "555":
        return None
    if exchange == "555" and not (allow_fictional and "0100" <= line <= "0199"):
        return None
    return "+1" + digits


def display_phone(e164: Optional[str]) -> str:
    if not e164 or not re.fullmatch(r"\+1\d{10}", e164):
        return ""
    d = e164[2:]
    return f"({d[:3]}) {d[3:6]}-{d[6:]}"


# ---------------------------------------------------------------- URLs and domains

_TRACKING_PARAMS = re.compile(r"^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|_ga|yclid)$", re.I)

TWO_LEVEL_SUFFIXES = {
    "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "ltd.uk", "plc.uk",
    "com.au", "net.au", "org.au", "com.mx", "com.br", "co.nz", "co.jp",
    "tx.us", "k12.tx.us", "state.tx.us", "ci.longview.tx.us",
}


def norm_url(u: Optional[str]) -> Optional[str]:
    """Canonical http(s) URL or None. Never invents a domain."""
    if not u:
        return None
    text = str(u).strip()
    if not text or re.search(r"\s", text):
        return None
    lowered = text.lower()
    if lowered.startswith(("mailto:", "tel:", "javascript:", "data:", "sms:", "ftp:", "file:")):
        return None
    if "://" not in text:
        if text.startswith("//"):
            text = "https:" + text
        elif re.match(r"^[a-z0-9-]+(\.[a-z0-9-]+)+(/.*)?$", lowered):
            text = "https://" + text
        else:
            return None
    try:
        parts = urlsplit(text)
    except ValueError:
        return None
    if parts.scheme.lower() not in ("http", "https"):
        return None
    host = (parts.hostname or "").rstrip(".").lower()
    if not host or "." not in host and host != "localhost":
        return None
    try:
        port = parts.port
    except ValueError:
        return None
    netloc = host if port in (None, 80, 443) else f"{host}:{port}"
    if parts.username or parts.password:
        return None
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not _TRACKING_PARAMS.match(k)])
    path = parts.path or "/"
    return urlunsplit((parts.scheme.lower(), netloc, path, query, ""))


def registrable_domain(host_or_url: Optional[str]) -> str:
    if not host_or_url:
        return ""
    text = str(host_or_url).strip().lower()
    if "://" in text:
        text = urlsplit(text).hostname or ""
    text = text.split("/")[0].split(":")[0].rstrip(".")
    if text.startswith("www."):
        text = text[4:]
    labels = [p for p in text.split(".") if p]
    if len(labels) <= 2:
        return ".".join(labels)
    for size in (4, 3, 2):
        if len(labels) > size and ".".join(labels[-size:]) in TWO_LEVEL_SUFFIXES:
            return ".".join(labels[-(size + 1):])
    return ".".join(labels[-2:])


# ---------------------------------------------------------------- slugs

def slugify(s: Optional[str]) -> str:
    if not s:
        return ""
    text = _ascii(str(s)).casefold().replace("&", " and ").replace("+", " and ")
    text = re.sub(r"['’`]", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    if len(text) > 80:
        text = text[:80].rstrip("-")
        if "-" in text:
            text = text[: text.rfind("-")] if len(text) - text.rfind("-") < 12 else text
    return text.strip("-")


def title_case_name(s: Optional[str]) -> str:
    """Display casing for names that arrive in ALL CAPS from public records.

    Mixed-case input is kept as the business wrote it.
    """
    if not s:
        return ""
    text = re.sub(r"\s+", " ", str(s)).strip()
    if any(c.islower() for c in text):
        return text
    keep_upper = {"BBQ", "LLC", "USA", "US", "TX", "ETX", "DDS", "MD", "DO", "PA", "PC", "PLLC", "CPA",
                  "RV", "AC", "HVAC", "II", "III", "IV", "ATM", "TV", "ER", "EZ", "JR", "SR", "DMD",
                  "LP", "LLP", "INC", "4X4", "ABC", "K9", "UPS", "CBD", "IT", "PT", "OB", "GYN"}
    small = {"and", "of", "the", "at", "in", "on", "for", "a", "an", "to", "by", "or"}
    words = []
    for idx, word in enumerate(text.split(" ")):
        bare = re.sub(r"[^A-Z0-9]", "", word)
        if bare in keep_upper or (len(bare) <= 3 and bare and not any(ch in "AEIOUY" for ch in bare) and bare.isalpha()):
            words.append(word)
        elif word.lower() in small and idx > 0:
            words.append(word.lower())
        elif re.fullmatch(r"MC[A-Z]{2,}(?:'S)?", word):
            words.append("Mc" + word[2:3] + word[3:].lower())
        else:
            words.append("-".join(
                "'".join(piece[:1].upper() + piece[1:].lower() if piece else piece for piece in sub.split("'"))
                for sub in word.split("-")
            ))
    out = " ".join(words)
    # "Joe'S" -> "Joe's"
    return re.sub(r"'S\b", "'s", out)
