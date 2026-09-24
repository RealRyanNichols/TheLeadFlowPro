"""Strict opening-hours parser.

The directory shows hours only as the business states them. This parser never
guesses: a time without am/pm (unless written on a 24-hour clock), a lunch
note, two different hours blocks, an appointment-only listing, or a day given
twice with different times returns ``hours=None`` with the issue, and the
worker sends the candidate to a person instead of publishing it. A day the
business does not mention is left out (not stated); only an explicit
"closed" becomes ``[]``.

Output: ``{"mon": [["08:00", "17:30"]], "sun": []}``; 24-hour clock, a close
of ``"24:00"`` is midnight, a close earlier than the open runs past midnight.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

DAYS: Tuple[str, ...] = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
ALL_DAY = ["00:00", "24:00"]

JSONLD_CONFIDENCE = 0.95
TEXT_CONFIDENCE = 0.85

ISSUES = (
    "ambiguous_ampm",      # a time without am/pm that is not 24-hour form
    "lunch_break",         # a lunch closure or lunch hours note
    "multiple_blocks",     # two different hours blocks (locations, seasons, departments)
    "by_appointment",      # hours given only by appointment
    "conflicting_days",    # one day given twice with different times
    "ambiguous_all_day",   # JSON-LD 00:00-00:00: "open 24 hours" or "closed" depending on convention
    "unparsed",            # a line that clearly states hours but not in a form we can read exactly
)

Hours = Dict[str, List[List[str]]]


@dataclass
class HoursResult:
    hours: Optional[Hours]
    issues: List[str] = field(default_factory=list)
    confidence: float = 0.0


# ---------------------------------------------------------------- tokens

_DAY_WORDS = {
    "monday": "mon", "mondays": "mon", "mon": "mon",
    "tuesday": "tue", "tuesdays": "tue", "tues": "tue", "tue": "tue",
    "wednesday": "wed", "wednesdays": "wed", "weds": "wed", "wed": "wed",
    "thursday": "thu", "thursdays": "thu", "thurs": "thu", "thur": "thu", "thu": "thu",
    "friday": "fri", "fridays": "fri", "fri": "fri",
    "saturday": "sat", "saturdays": "sat", "sat": "sat",
    "sunday": "sun", "sundays": "sun", "sun": "sun",
}
# Short codes are days only next to a range, list, colon, or time: "M-F", "Mo,We 10:00".
_SHORT_DAYS = {"mo": "mon", "tu": "tue", "we": "wed", "th": "thu", "fr": "fri", "sa": "sat", "su": "sun",
               "m": "mon", "w": "wed", "f": "fri"}

_FILLER = {
    "open", "opens", "opened", "hours", "hour", "hrs", "from", "are", "is", "our", "at", "on", "the",
    "of", "operation", "operations", "store", "office", "business", "regular", "normal", "for", "time",
    "times", "cst", "cdt", "ct", "central", "standard", "only", "all", "day", "we're", "were", "now",
    "every", "a", "an", "be", "will", "sharp", "except", "holidays", "holiday", "lobby", "we",
}

_TOKEN_RE = re.compile(
    r"""
    (?P<open24>(?:open\s+)?(?:24\s*(?:-\s*)?(?:hours|hrs|hr|h)(?:\s+a\s+day)?(?:\s*[,/]?\s*(?:7|seven)\s+days(?:\s+a\s+week)?)?
        |24\s*/\s*7|24\s*x\s*7|around\s+the\s+clock|all\s+day\s+and\s+night))
  | (?P<everyday>daily|every\s*day|everyday|(?:7|seven)\s+days(?:\s+a\s+week)?|all\s+week(?:\s+long)?)
  | (?P<weekdays>week\s*days?|weekdays)
  | (?P<weekends>week\s*ends?|weekends)
  | (?P<closed>closed)
  | (?P<appt>by\s+appointment(?:s)?(?:\s+only)?|appointments?\s+only|by\s+appt\.?(?:\s+only)?|appt\.?\s+only
        |call\s+(?:for|to\s+(?:make|schedule))\s+(?:an\s+)?appointment)
  | (?P<lunch>lunch)
  | (?P<noon>(?<![\d:])(?:12(?::00)?\s*)?noon)
  | (?P<midnight>(?<![\d:])(?:12(?::00)?\s*)?midnight)
  | (?P<t_ampm>(?<![\d:.])(?P<h1>\d{1,2})(?:[:.](?P<m1>\d{2}))?\s*(?P<s1>am|pm)(?![a-z]))
  | (?P<t_ap>(?<![\d:.])(?P<h2>\d{1,2})(?:[:.](?P<m2>\d{2}))?(?P<s2>a|p)(?![a-z]))
  | (?P<t_colon>(?<![\d:.])(?P<h3>\d{1,2}):(?P<m3>\d{2})(?![\d:]))
  | (?P<t_bare>(?<![\d:.])(?P<h4>\d{1,2})(?![\d:]))
  | (?P<dash>-+|\bto\b|\bthru\b|\bthrough\b|\btill\b|\btil\b|\buntil\b)
  | (?P<sep>[,&/;|+]|\band\b|\bor\b)
  | (?P<colon>:)
  | (?P<word>[a-z][a-z'.]*)
  | (?P<number>\d+)
  | (?P<other>[^\s])
    """,
    re.VERBOSE,
)

_DASHES = re.compile(r"[‐-―−﹘﹣－]")
_IGNORABLE = set("()[]{}.!*\"'")


@dataclass
class _Tok:
    kind: str
    value: Any = None
    raw: str = ""


@dataclass
class _Time:
    hour: int
    minute: int
    suffix: Optional[str]      # 'am', 'pm', or None
    colon: bool = False        # written as H:MM
    leading_zero: bool = False  # written as 0H:MM
    special: Optional[str] = None  # 'noon' or 'midnight'


def _normalize_line(line: str) -> str:
    text = _DASHES.sub("-", line or "")
    text = text.replace(" ", " ").lower()
    text = re.sub(r"\b([ap])\.\s?m\.?", r"\1m", text)
    return text


def _short_day_ok(text: str, end: int) -> bool:
    rest = text[end:]
    return bool(re.match(r"\s*(?:[-,/&:]|\d|\bthru\b|\bto\b|\band\b|noon|midnight|closed|open\s+24)", rest))


def _tokenize(line: str, jsonld: bool = False) -> List[_Tok]:
    text = _normalize_line(line)
    toks: List[_Tok] = []
    pos = 0
    while pos < len(text):
        if text[pos].isspace():
            pos += 1
            continue
        m = _TOKEN_RE.match(text, pos)
        if not m:  # pragma: no cover - the pattern ends with a catch-all
            pos += 1
            continue
        kind = m.lastgroup
        raw = m.group(0)
        pos = m.end()
        if kind in ("t_ampm", "t_ap", "t_colon", "t_bare"):
            h = m.group("h1") or m.group("h2") or m.group("h3") or m.group("h4")
            mm = m.group("m1") or m.group("m2") or m.group("m3")
            suffix = m.group("s1") or m.group("s2")
            if suffix in ("a", "p"):
                suffix += "m"
            toks.append(_Tok("time", _Time(int(h), int(mm or 0), suffix, colon=mm is not None,
                                            leading_zero=h.startswith("0") and len(h) == 2), raw))
        elif kind == "noon":
            toks.append(_Tok("time", _Time(12, 0, "pm", special="noon"), raw))
        elif kind == "midnight":
            toks.append(_Tok("time", _Time(12, 0, "am", special="midnight"), raw))
        elif kind == "word":
            word = raw.rstrip(".")
            if word in _DAY_WORDS:
                toks.append(_Tok("days", [_DAY_WORDS[word]], raw))
            elif word in _SHORT_DAYS and (jsonld or _short_day_ok(text, m.end())) and (len(word) == 2 or not jsonld):
                toks.append(_Tok("days", [_SHORT_DAYS[word]], raw))
            elif word in _FILLER:
                continue
            else:
                toks.append(_Tok("word", word, raw))
        elif kind == "everyday":
            toks.append(_Tok("days", list(DAYS), raw))
        elif kind == "weekdays":
            toks.append(_Tok("days", list(DAYS[:5]), raw))
        elif kind == "weekends":
            toks.append(_Tok("days", ["sat", "sun"], raw))
        elif kind == "colon":
            continue
        elif kind == "other":
            if raw in _IGNORABLE:
                continue
            toks.append(_Tok("word", raw, raw))
        elif kind == "number":
            toks.append(_Tok("word", raw, raw))
        else:
            toks.append(_Tok(kind, None, raw))
    return toks


# ---------------------------------------------------------------- time values

class _Ambiguous(Exception):
    pass


class _Invalid(Exception):
    pass


def _to_24(t: _Time) -> Tuple[int, int]:
    if not (0 <= t.minute <= 59):
        raise _Invalid()
    if t.suffix:
        if not (1 <= t.hour <= 12):
            if t.hour == 0 and t.suffix == "am":
                return 0, t.minute
            raise _Invalid()
        hour = t.hour % 12 + (12 if t.suffix == "pm" else 0)
        return hour, t.minute
    if not (0 <= t.hour <= 24):
        raise _Invalid()
    return t.hour, t.minute


def _is_24h_evidence(t: _Time) -> bool:
    """A time that can only be read on a 24-hour clock: H:MM with an hour of 13-23 or 00.

    A leading zero ("08:00") is not evidence: plenty of sites write "08:00-05:00"
    meaning 8 AM to 5 PM.
    """
    return t.suffix is None and not t.special and t.colon and (13 <= t.hour <= 23 or t.hour == 0)


def _is_24h_pair(a: _Time, b: _Time, line_24h: bool = False) -> bool:
    if a.suffix or b.suffix or a.special or b.special:
        return False
    if not (a.colon and b.colon):
        return False
    return line_24h or _is_24h_evidence(a) or _is_24h_evidence(b)


def _range(a: _Time, b: _Time, force_24h: bool = False, line_24h: bool = False) -> List[str]:
    """One ['HH:MM','HH:MM'] pair, or raise _Ambiguous / _Invalid.

    ``force_24h`` is the JSON-LD ``openingHours`` path (24-hour by definition);
    ``line_24h`` means the same text line carries an unmistakable 24-hour time.
    """
    if force_24h:
        for t in (a, b):
            if t.suffix is None and not t.colon and not t.special:
                raise _Ambiguous()
    elif not _is_24h_pair(a, b, line_24h):
        for t in (a, b):
            if t.suffix is None and not t.special:
                raise _Ambiguous()
    oh, om = _to_24(a)
    ch, cm = _to_24(b)
    if (a.suffix is None and b.suffix is None and not a.special and not b.special
            and 1 <= a.hour <= 12 and 1 <= b.hour <= 12 and (ch, cm) < (oh, om)):
        # "08:00-05:00" / "Mo-Fr 8:00-5:00": 8 AM-5 PM written on a 12-hour
        # clock, or an overnight 8 AM-5 AM? Never guess.
        raise _Ambiguous()
    if a.special == "midnight":
        oh, om = 0, 0
    if oh == 24:
        if om:
            raise _Invalid()
        oh = 0
    if ch == 24 and cm:
        raise _Invalid()
    open_s = f"{oh:02d}:{om:02d}"
    close_s = f"{ch:02d}:{cm:02d}"
    if close_s == "00:00":
        close_s = "24:00"
    if open_s == close_s:
        raise _Invalid()
    return [open_s, close_s]


# ---------------------------------------------------------------- one line

@dataclass
class _LineParse:
    assignments: List[Tuple[List[str], List[List[str]]]] = field(default_factory=list)
    issues: Set[str] = field(default_factory=set)
    days_only: Optional[List[str]] = None     # a line that is only a day spec ("Monday")
    values_only: Optional[List[List[str]]] = None  # a line that is only times/closed ("8:00 AM - 5:00 PM")
    appointment: bool = False
    lunch: bool = False
    stated: bool = False                      # the line carries hours information at all


def _expand(first: str, last: str) -> List[str]:
    i, j = DAYS.index(first), DAYS.index(last)
    if j >= i:
        return list(DAYS[i:j + 1])
    return list(DAYS[i:]) + list(DAYS[:j + 1])


def _read_days(toks: List[_Tok], i: int) -> Tuple[Optional[List[str]], int]:
    """A day spec starting at ``i``: 'mon', 'mon - fri', 'mon, wed & fri', 'tue-thu, sat'."""
    if i >= len(toks) or toks[i].kind != "days":
        return None, i
    days: List[str] = []
    while i < len(toks) and toks[i].kind == "days":
        group = list(toks[i].value)
        i += 1
        if (len(group) == 1 and i + 1 < len(toks) and toks[i].kind == "dash"
                and toks[i + 1].kind == "days" and len(toks[i + 1].value) == 1):
            group = _expand(group[0], toks[i + 1].value[0])
            i += 2
        for day in group:
            if day not in days:
                days.append(day)
        if i + 1 < len(toks) and toks[i].kind == "sep" and toks[i + 1].kind == "days":
            i += 1
            continue
        break
    return days, i


def _read_values(toks: List[_Tok], i: int, force_24h: bool, out: _LineParse, line_24h: bool = False):
    """Times, 'closed', or '24 hours' starting at ``i``. Returns (ranges|None, i)."""
    ranges: List[List[str]] = []
    got = False
    closed = False
    while i < len(toks):
        tok = toks[i]
        if tok.kind == "dash" and i + 1 < len(toks) and toks[i + 1].kind in ("time", "closed", "open24"):
            i += 1
            continue
        if tok.kind == "closed":
            closed = True
            got = True
            i += 1
        elif tok.kind == "open24":
            ranges.append(list(ALL_DAY))
            got = True
            i += 1
        elif tok.kind == "time":
            if i + 2 < len(toks) and toks[i + 1].kind == "dash" and toks[i + 2].kind == "time":
                try:
                    ranges.append(_range(tok.value, toks[i + 2].value, force_24h, line_24h))
                except _Ambiguous:
                    out.issues.add("ambiguous_ampm")
                except _Invalid:
                    out.issues.add("unparsed")
                got = True
                i += 3
            else:
                out.issues.add("unparsed")
                got = True
                i += 1
        elif tok.kind == "sep" and got and i + 1 < len(toks) and toks[i + 1].kind in ("time", "open24"):
            i += 1
        else:
            break
    if not got:
        return None, i
    if closed and ranges:
        # "Closed 12-1" is a lunch or partial closure, never a plain day off.
        out.issues.add("unparsed")
        return None, i
    if closed:
        return [], i
    return sorted(ranges), i


def _parse_line(line: str, force_24h: bool = False, jsonld: bool = False) -> _LineParse:
    out = _LineParse()
    toks = _tokenize(line, jsonld=jsonld)
    if any(t.kind == "lunch" for t in toks):
        out.lunch = True
        out.stated = True
        return out
    if any(t.kind == "appt" for t in toks):
        out.appointment = True
        out.stated = True
        toks = [t for t in toks if t.kind != "appt"]
    has_time = any(t.kind in ("time", "open24") for t in toks)
    has_days = any(t.kind == "days" for t in toks)
    # "Mon-Fri 08:00-12:00, 13:00-17:00": one unmistakable 24-hour time puts the
    # whole line on a 24-hour clock.
    line_24h = any(t.kind == "time" and _is_24h_evidence(t.value) for t in toks)

    if not has_time and not has_days:
        # A bare "Closed" (the second cell of a "Sunday | Closed" row) is a
        # value; any other line without days or times ("Closed on major
        # holidays", prose) says nothing about the regular week.
        if [t.kind for t in toks] == ["closed"]:
            out.values_only = []
            out.stated = True
        return out
    if out.appointment and all(t.kind in ("days", "sep", "dash") for t in toks):
        # "Saturday: by appointment" states no hours for Saturday.
        return out

    # "Open 24 hours" / "24/7" with no days: all seven days.
    if not has_days and toks and all(t.kind in ("open24", "sep", "dash") for t in toks) and any(
            t.kind == "open24" for t in toks):
        out.assignments.append((list(DAYS), [list(ALL_DAY)]))
        out.stated = True
        return out

    i = 0
    pending_value: Optional[List[List[str]]] = None
    while i < len(toks):
        tok = toks[i]
        if tok.kind in ("sep", "dash"):
            i += 1
            continue
        days, j = _read_days(toks, i)
        if days:
            value, k = _read_values(toks, j, force_24h, out, line_24h)
            if value is None:
                if pending_value is not None:
                    # "Closed Sunday", "11am-9pm daily": the value came first.
                    out.assignments.append((days, pending_value))
                    pending_value = None
                    i = j
                    continue
                if j >= len(toks) and not out.assignments and not out.appointment:
                    out.days_only = days
                    return out
                if out.appointment:
                    # "..., Sat by appointment": those days are not stated.
                    i = j
                    continue
                if not has_time and not any(t.kind == "closed" for t in toks):
                    # A line that names days but states no hours ("Open Mon-Sat").
                    return _LineParse()
                out.issues.add("unparsed")
                i = j + 1 if j == i else j
                continue
            out.assignments.append((days, value))
            i = k
            continue
        value, k = _read_values(toks, i, force_24h, out, line_24h)
        if value is not None:
            if pending_value is not None or out.assignments:
                out.issues.add("unparsed")
            pending_value = value
            i = k
            continue
        # An unknown word or number inside something that states hours.
        if has_time or has_days:
            out.issues.add("unparsed")
        i += 1
    if pending_value is not None:
        if out.assignments or has_days:
            out.issues.add("unparsed")
        else:
            out.values_only = pending_value
            out.stated = True
    if out.assignments or out.issues:
        out.stated = True
    return out


# ---------------------------------------------------------------- merging

def _assign(hours: Hours, days: Sequence[str], ranges: List[List[str]], issues: Set[str]) -> None:
    for day in days:
        if day in hours and hours[day] != ranges:
            issues.add("conflicting_days")
        hours[day] = [list(r) for r in ranges]


def _ordered(hours: Hours) -> Hours:
    return {day: hours[day] for day in DAYS if day in hours}


def _merge_blocks(blocks: List[Hours], issues: Set[str]) -> Hours:
    merged: Hours = {}
    distinct: List[Hours] = []
    for block in blocks:
        if block and block not in distinct:
            distinct.append(block)
    for block in distinct:
        for day, ranges in block.items():
            if day in merged and merged[day] != ranges:
                issues.add("multiple_blocks")
            merged.setdefault(day, ranges)
    return merged


def _result(hours: Hours, issues: Set[str], appointment_only: bool, confidence: float) -> HoursResult:
    if appointment_only and not hours:
        issues.add("by_appointment")
    if issues:
        return HoursResult(None, sorted(issues), 0.0)
    if not hours:
        return HoursResult(None, [], 0.0)
    return HoursResult(_ordered(hours), [], confidence)


# ---------------------------------------------------------------- text

_LABEL_RE = re.compile(r"\b(?:hours|hrs)\b", re.I)


def _label_split(line: str) -> Optional[Tuple[str, str]]:
    """('Store Hours', 'Mon-Fri 8am-5pm') for 'Store Hours: Mon-Fri 8am-5pm'; None when not a label."""
    low = _DASHES.sub("-", line)  # same length as ``line`` so match offsets slice it correctly
    for m in _LABEL_RE.finditer(low):
        # "Open 24 hours" is a value, not a label.
        before = low[: m.start()]
        if re.search(r"24\s*-?\s*$", before):
            continue
        if len(before.strip()) > 40:
            return None
        rest = line[m.end():]
        colon = rest.find(":")
        if 0 <= colon <= 40 and not re.search(r"\d", rest[:colon]):
            label = (line[: m.end()] + rest[:colon]).strip()
            return label, rest[colon + 1:].strip()
        return line[: m.end()].strip(), rest.strip(" -–—").strip()
    return None


def hours_from_lines(lines: Iterable[str]) -> HoursResult:
    """Hours stated in a page's visible lines (confidence 0.85)."""
    lines = [l for l in (lines or []) if l and l.strip()]
    issues: Set[str] = set()
    blocks: List[Hours] = []
    current: Optional[Hours] = None
    in_label_block = False
    pending_days: Optional[List[str]] = None
    appointment_seen = False

    def close_block() -> None:
        nonlocal current, pending_days
        if current is not None:
            blocks.append(current)
        current = None
        pending_days = None

    for raw in lines:
        if len(raw) > 200:
            close_block()
            in_label_block = False
            continue
        label = _label_split(raw)
        content = raw
        if label is not None:
            close_block()
            current = {}
            in_label_block = True
            content = label[1]
            if not content:
                continue
        parsed = _parse_line(content)
        if label is not None and not (parsed.stated or parsed.days_only):
            continue  # "Hours of operation", "Hours may vary": the block stays open
        toks = _tokenize(content)
        starts_with_day = bool(toks) and toks[0].kind in ("days", "open24")
        belongs = in_label_block or starts_with_day or (current is not None and parsed.stated)
        if not belongs or not (parsed.stated or parsed.days_only):
            if current is not None or in_label_block:
                close_block()
                in_label_block = False
            continue
        if current is None:
            current = {}
        if parsed.lunch:
            issues.add("lunch_break")
            continue
        if parsed.appointment:
            appointment_seen = True
        issues |= parsed.issues
        if parsed.days_only:
            if pending_days:
                issues.add("unparsed")
            pending_days = parsed.days_only
            continue
        if parsed.values_only is not None:
            value = parsed.values_only
            if pending_days:
                _assign(current, pending_days, value, issues)
            else:
                issues.add("unparsed")
            pending_days = None
            continue
        if pending_days:
            issues.add("unparsed")
            pending_days = None
        for days, ranges in parsed.assignments:
            _assign(current, days, ranges, issues)
    close_block()
    hours = _merge_blocks(blocks, issues)
    return _result(hours, issues, appointment_seen, TEXT_CONFIDENCE)


# ---------------------------------------------------------------- JSON-LD

_SCHEMA_DAYS = {
    "monday": "mon", "tuesday": "tue", "wednesday": "wed", "thursday": "thu", "friday": "fri",
    "saturday": "sat", "sunday": "sun",
}


def _as_list(value: Any) -> List[Any]:
    if value is None:
        return []
    return list(value) if isinstance(value, (list, tuple)) else [value]


def _spec_day(value: Any) -> Optional[str]:
    if isinstance(value, dict):
        value = value.get("@id") or value.get("name")
    if not isinstance(value, str):
        return None
    name = re.split(r"[/:#]", value.strip())[-1].strip().lower()
    return _SCHEMA_DAYS.get(name) or _DAY_WORDS.get(name) or (_SHORT_DAYS.get(name) if len(name) == 2 else None)


def _spec_time(value: Any) -> Optional[Tuple[int, int]]:
    if not isinstance(value, str):
        return None
    m = re.match(r"^\s*(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:z|[+-]\d{2}:?\d{2})?\s*$", value, re.I)
    if not m:
        return None
    hour, minute = int(m.group(1)), int(m.group(2))
    if hour > 24 or minute > 59 or (hour == 24 and minute):
        return None
    return hour, minute


def _from_specs(specs: List[Any], issues: Set[str]) -> Hours:
    hours: Hours = {}
    for spec in specs:
        if not isinstance(spec, dict):
            continue
        if spec.get("validFrom") or spec.get("validThrough"):
            continue  # a holiday or seasonal override, not the regular week
        days = [d for d in (_spec_day(v) for v in _as_list(spec.get("dayOfWeek"))) if d]
        if not days:
            continue
        opens, closes = _spec_time(spec.get("opens")), _spec_time(spec.get("closes"))
        if opens is None or closes is None:
            issues.add("unparsed")
            continue
        if opens == (0, 0) and closes == (23, 59):
            ranges = [list(ALL_DAY)]
        elif opens == (0, 0) and closes in ((0, 0), (24, 0)):
            # Some publishers use 00:00-00:00 for "open 24 hours" and others
            # for "closed"; a person decides.
            issues.add("ambiguous_all_day")
            continue
        else:
            open_s = f"{opens[0] % 24:02d}:{opens[1]:02d}"
            close_s = "24:00" if closes in ((0, 0), (24, 0)) else f"{closes[0]:02d}:{closes[1]:02d}"
            if open_s == close_s:
                issues.add("unparsed")
                continue
            if 1 <= opens[0] <= 12 and 1 <= closes[0] <= 12 and closes < opens:
                # opens 08:00 / closes 05:00 is almost always 8 AM-5 PM written on
                # a 12-hour clock, not an overnight shift. A late open with an
                # early close (16:00-02:00) stays a real overnight.
                issues.add("ambiguous_ampm")
                continue
            ranges = [[open_s, close_s]]
        for day in days:
            existing = hours.get(day)
            if existing is None:
                hours[day] = list(ranges)
            elif any(_overlaps(r, ranges[0]) for r in existing):
                # The same day listed twice with the same or overlapping times:
                # department hours (sales vs service) or a copy error. A person decides.
                issues.add("multiple_blocks")
            else:
                # Two non-overlapping specs for one day: a split day (e.g. 8-12 and 13-17).
                hours[day] = sorted(existing + ranges)
    return hours


def _minutes(value: str) -> int:
    hour, minute = value.split(":")
    return int(hour) * 60 + int(minute)


def _overlaps(a: List[str], b: List[str]) -> bool:
    """True when two same-day ranges share any time (identical ranges overlap)."""
    def span(r: List[str]) -> Tuple[int, int]:
        start, end = _minutes(r[0]), _minutes(r[1])
        if end <= start:
            end += 24 * 60  # past midnight
        return start, end
    (s1, e1), (s2, e2) = span(a), span(b)
    return s1 < e2 and s2 < e1


def _from_strings(values: List[Any], issues: Set[str]) -> Hours:
    hours: Hours = {}
    for value in values:
        if not isinstance(value, str) or not value.strip():
            continue
        for part in re.split(r"[;\n]", value):
            if not part.strip():
                continue
            parsed = _parse_line(part, force_24h=True, jsonld=True)
            if parsed.days_only:
                issues.add("unparsed")  # "Mo-Su" with no time
                continue
            issues |= parsed.issues
            if parsed.lunch or parsed.values_only is not None:
                issues.add("unparsed")
            for days, ranges in parsed.assignments:
                _assign(hours, days, ranges, issues)
    return hours


def hours_from_jsonld(items: Iterable[Any]) -> HoursResult:
    """Hours from schema.org ``openingHoursSpecification`` / ``openingHours`` (confidence 0.95)."""
    issues: Set[str] = set()
    blocks: List[Hours] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        spec_hours = _from_specs(_as_list(item.get("openingHoursSpecification")), issues)
        text_hours = _from_strings(_as_list(item.get("openingHours")), issues)
        if spec_hours and text_hours:
            for day in set(spec_hours) & set(text_hours):
                if spec_hours[day] != text_hours[day]:
                    issues.add("conflicting_days")
            combined = dict(text_hours)
            combined.update(spec_hours)
            blocks.append(combined)
        elif spec_hours or text_hours:
            blocks.append(spec_hours or text_hours)
    hours = _merge_blocks(blocks, issues)
    return _result(hours, issues, False, JSONLD_CONFIDENCE)
