"""Turn one HTML page into plain parts the extractors can read.

The extractors never see raw HTML: they get the page's visible lines,
headings, links, JSON-LD, meta tags, navigation link texts, and list items.
Script, style, and other hidden content is skipped so a fact can only come
from what a visitor would read (or from the business's own structured data).
"""

from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass, field
from functools import lru_cache
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote, urljoin

from .. import normalize

# Text inside these is never visible page text.
SKIP_TAGS = {"script", "style", "noscript", "template", "svg", "iframe", "head", "object", "select", "textarea"}

# Elements that start and end a visual line.
BLOCK_TAGS = {
    "address", "article", "aside", "blockquote", "body", "br", "caption", "center", "dd", "details",
    "dialog", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3",
    "h4", "h5", "h6", "header", "hr", "html", "legend", "li", "main", "menu", "nav", "ol", "p", "pre",
    "section", "summary", "table", "tbody", "tfoot", "thead", "tr", "ul", "title", "option",
}

# Table cells stay on their row's line, separated by a space.
CELL_TAGS = {"td", "th"}

VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source",
    "track", "wbr", "keygen",
}

NAV_TAGS = {"nav", "header", "footer"}
HEADING_TAGS = {"h1": 1, "h2": 2, "h3": 3, "h4": 4, "h5": 5, "h6": 6}

# An open tag of the key is closed implicitly when one of the values starts.
_IMPLIED_CLOSE = {
    "li": {"li"},
    "p": {"p", "div", "ul", "ol", "table", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article",
          "header", "footer", "nav", "form", "blockquote", "pre", "dl", "address", "hr", "main", "aside"},
    "tr": {"tr"},
    "td": {"td", "th", "tr"},
    "th": {"td", "th", "tr"},
    "dt": {"dt", "dd"},
    "dd": {"dt", "dd"},
    "option": {"option"},
    # A new link closes an open one, and a new heading closes an open heading, as browsers
    # do. Without this, thousands of unclosed tags would each collect all the text after
    # them, and memory would grow with the square of the page size.
    "a": {"a"},
    **{h: set(HEADING_TAGS) for h in HEADING_TAGS},
}
# ...but not across these container boundaries.
_SCOPE_LIMIT = {"li": {"ul", "ol", "menu"}, "tr": {"table"}, "td": {"table"}, "th": {"table"},
                "dt": {"dl"}, "dd": {"dl"}}

_HEAD_CONTENT = {"head", "title", "meta", "link", "script", "style", "base", "noscript", "template", "object"}

_INLINE_TAGS = {"span", "a", "b", "i", "em", "strong", "small", "font", "u", "label", "abbr", "time", "sup", "sub"}

# Implied closes that can stop short of the open tag: walking back through the open tags, the
# search ends at the open tag itself, at its scope limit, or (for <p>) at anything not inline.
_BOUNDED_CLOSE = ("p", *_SCOPE_LIMIT)


@lru_cache(maxsize=256)
def _searches_ended_by(tag: str) -> Tuple[str, ...]:
    """The _BOUNDED_CLOSE tags whose search stops at an open ``tag``."""
    return tuple(open_tag for open_tag in _BOUNDED_CLOSE if (
        tag not in _INLINE_TAGS if open_tag == "p" else tag == open_tag or tag in _SCOPE_LIMIT[open_tag]))


_WS = re.compile(r"\s+")


def _clean(text: str) -> str:
    return _WS.sub(" ", text.replace("​", "")).strip()


@dataclass(frozen=True)
class Link:
    url: str
    text: str
    rel: str = ""
    fragment: bool = False  # the href named a section ("/about#careers"); ``url`` drops it


@dataclass
class Page:
    url: str
    title: str = ""
    lines: List[str] = field(default_factory=list)
    headings: List[Tuple[int, str]] = field(default_factory=list)
    links: List[Link] = field(default_factory=list)
    jsonld: List[Dict[str, Any]] = field(default_factory=list)
    meta: Dict[str, str] = field(default_factory=dict)
    nav_texts: List[str] = field(default_factory=list)
    list_items: List[str] = field(default_factory=list)
    mailtos: List[str] = field(default_factory=list)
    tels: List[str] = field(default_factory=list)
    base_url: str = ""

    @property
    def text(self) -> str:
        return "\n".join(self.lines)

    @property
    def domain(self) -> str:
        return normalize.registrable_domain(self.url)


def _flatten_jsonld(value: Any, out: List[Dict[str, Any]], depth: int = 0) -> None:
    if depth > 6:
        return
    if isinstance(value, list):
        for item in value:
            _flatten_jsonld(item, out, depth + 1)
    elif isinstance(value, dict):
        graph = value.get("@graph")
        rest = {k: v for k, v in value.items() if k not in ("@graph", "@context")}
        if graph is not None:
            _flatten_jsonld(graph, out, depth + 1)
            if any(not k.startswith("@") for k in rest):
                out.append(rest)
        else:
            out.append(value)


def _load_jsonld(raw: str) -> Any:
    text = raw.strip()
    text = re.sub(r"^\s*(?:<!--|//\s*<!\[CDATA\[|<!\[CDATA\[)", "", text)
    text = re.sub(r"(?:-->|//\s*\]\]>|\]\]>)\s*$", "", text).strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except ValueError:
        pass
    # Common hand-written slips: trailing commas and raw newlines in strings.
    repaired = re.sub(r",\s*([}\]])", r"\1", text)
    repaired = repaired.replace("\r", " ").replace("\n", " ").replace("\t", " ")
    try:
        return json.loads(repaired)
    except ValueError:
        return None


class _Parser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        # Each open element: (tag, counts_as_nav).
        self.stack: List[Tuple[str, bool]] = []
        self.open_counts: Counter = Counter()  # how many of each tag are open, without scanning the stack
        # For each _BOUNDED_CLOSE tag, the open tags that end the search for it, innermost last,
        # so _implied_close need not rescan the stack: on a hostile page with thousands of open
        # tags under a nested list, that rescan on every <li> took time with the square of its size.
        self.search_ends: Dict[str, List[str]] = {tag: [] for tag in _BOUNDED_CLOSE}
        self.skip_depth = 0
        self.nav_depth = 0
        self.line_buf: List[str] = []
        self.lines: List[str] = []
        self.title_parts: List[str] = []
        self.title_done = False
        self.heading_stack: List[Tuple[int, List[str]]] = []
        self.headings: List[Tuple[int, str]] = []
        self.link_stack: List[Dict[str, Any]] = []
        self.raw_links: List[Tuple[str, str, str, bool]] = []
        self.li_stack: List[List[str]] = []
        self.list_items: List[str] = []
        self.meta: Dict[str, str] = {}
        self.base_href: Optional[str] = None
        self.jsonld_raw: List[str] = []
        self.script_buf: Optional[List[str]] = None

    # ------------------------------------------------------------ helpers
    def _is_open(self, tag: str) -> bool:
        return self.open_counts[tag] > 0

    def _flush_line(self) -> None:
        if self.line_buf:
            line = _clean("".join(self.line_buf))
            if line:
                self.lines.append(line)
            self.line_buf = []

    def _push(self, tag: str, is_nav: bool) -> None:
        self.stack.append((tag, is_nav))
        self.open_counts[tag] += 1
        for open_tag in _searches_ended_by(tag):
            self.search_ends[open_tag].append(tag)
        if tag in SKIP_TAGS:
            self.skip_depth += 1
        if is_nav:
            self.nav_depth += 1

    def _close_one(self) -> str:
        tag, is_nav = self.stack.pop()
        self.open_counts[tag] -= 1
        for open_tag in _searches_ended_by(tag):
            self.search_ends[open_tag].pop()
        if tag in SKIP_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            if tag == "script" and self.script_buf is not None:
                self.jsonld_raw.append("".join(self.script_buf))
                self.script_buf = None
        if is_nav:
            self.nav_depth = max(0, self.nav_depth - 1)
        if tag == "title" and self.title_parts:
            self.title_done = True
        if tag in HEADING_TAGS and self.heading_stack:
            level, parts = self.heading_stack.pop()
            text = _clean("".join(parts))
            if text:
                self.headings.append((level, text))
        elif tag == "a" and self.link_stack:
            info = self.link_stack.pop()
            text = _clean("".join(info["parts"])) or info["fallback"]
            self.raw_links.append((info["href"], text, info["rel"], info["nav"]))
        elif tag == "li" and self.li_stack:
            text = _clean("".join(self.li_stack.pop()))
            if text:
                self.list_items.append(text)
        if tag in BLOCK_TAGS:
            self._flush_line()
        elif tag in CELL_TAGS:
            self.line_buf.append(" ")
        return tag

    def _pop_to(self, tag: str) -> None:
        while self.stack:
            if self._close_one() == tag:
                return

    def _implied_close(self, tag: str) -> None:
        for open_tag, closers in _IMPLIED_CLOSE.items():
            if tag not in closers or not self._is_open(open_tag):
                continue
            # Links, headings and options have no boundary, so the open one is always reached;
            # the others only when nothing ends the search first. _pop_to closes every tag it
            # passes, so its cost is paid once per opened tag.
            ends = self.search_ends.get(open_tag)
            if ends is None or ends[-1] == open_tag:
                self._pop_to(open_tag)

    def _add_text(self, text: str) -> None:
        self.line_buf.append(text)
        for _, parts in self.heading_stack:
            parts.append(text)
        for info in self.link_stack:
            info["parts"].append(text)
        if self.li_stack:
            self.li_stack[-1].append(text)

    # ------------------------------------------------------------ callbacks
    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        attr = {k.lower(): (v or "") for k, v in attrs}
        if self._is_open("head") and (tag == "body" or tag not in _HEAD_CONTENT):
            self._pop_to("head")  # an unclosed <head> ends where body content starts
        if tag == "meta":
            key = (attr.get("property") or attr.get("name") or attr.get("itemprop") or "").strip().lower()
            if key and "content" in attr:
                self.meta.setdefault(key, _clean(attr["content"]))
            return
        if tag == "base":
            if attr.get("href") and self.base_href is None:
                self.base_href = attr["href"].strip()
            return
        if tag == "img":
            alt = _clean(attr.get("alt", ""))
            if alt:
                for info in self.link_stack:
                    if not info["fallback"]:
                        info["fallback"] = alt
            return
        if tag in VOID_TAGS:
            if tag in ("br", "hr"):
                self._flush_line()
            return
        self._implied_close(tag)
        if tag in BLOCK_TAGS:
            self._flush_line()
        elif tag in CELL_TAGS:
            self.line_buf.append(" ")
        is_nav = tag in NAV_TAGS or attr.get("role", "").lower() == "navigation"
        self._push(tag, is_nav)
        if tag == "script":
            if attr.get("type", "").strip().lower().startswith("application/ld+json"):
                self.script_buf = []
        elif tag in HEADING_TAGS:
            self.heading_stack.append((HEADING_TAGS[tag], []))
        elif tag == "a":
            self.link_stack.append({
                "href": attr.get("href", "").strip(),
                "rel": " ".join(attr.get("rel", "").lower().split()),
                "parts": [],
                "fallback": _clean(attr.get("aria-label", "") or attr.get("title", "")),
                "nav": self.nav_depth > 0 or attr.get("role", "").lower() == "menuitem",
            })
        elif tag == "li":
            self.li_stack.append([])

    def handle_startendtag(self, tag: str, attrs) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() not in VOID_TAGS and tag.lower() not in ("meta", "base", "img"):
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in VOID_TAGS:
            if tag == "br":
                self._flush_line()
            return
        if self._is_open(tag):
            self._pop_to(tag)

    def handle_data(self, data: str) -> None:
        top = self.stack[-1][0] if self.stack else ""
        if top == "script" and self.script_buf is not None:
            self.script_buf.append(data)
            return
        if top == "title":
            if not self.title_done and not self._is_open("svg"):
                self.title_parts.append(data)
            return
        if self.skip_depth:
            return
        self._add_text(data)

    def close(self) -> None:
        super().close()
        while self.stack:
            self._close_one()
        self._flush_line()


def _split_mailto(href: str) -> str:
    target = unquote(href.split(":", 1)[1]).split("?", 1)[0].strip()
    return target.split(",")[0].strip().lower()


def parse_page(html: str, base_url: str) -> Page:
    """Parse ``html`` fetched from ``base_url`` into a :class:`Page`."""
    parser = _Parser()
    try:
        parser.feed(html or "")
        parser.close()
    except Exception:  # html.parser is lenient; never let one page stop a visit.
        parser._flush_line()

    base = base_url
    if parser.base_href:
        joined = urljoin(base_url, parser.base_href)
        if normalize.norm_url(joined):
            base = joined

    links: List[Link] = []
    # dicts keep first-seen order and check "seen already?" in constant time; lists took time
    # with the square of the count on a page with tens of thousands of distinct links.
    nav_texts: Dict[str, None] = {}
    mailtos: Dict[str, None] = {}
    tels: Dict[str, None] = {}
    seen = set()
    for href, text, rel, in_nav in parser.raw_links:
        low = href.lower()
        if low.startswith("mailto:"):
            address = _split_mailto(href)
            if address:
                mailtos.setdefault(address)
            continue
        if low.startswith("tel:"):
            number = unquote(href.split(":", 1)[1]).strip()
            if number:
                tels.setdefault(number)
            continue
        if in_nav and text:
            nav_texts.setdefault(text)
        if not href or low.startswith(("javascript:", "#", "data:", "sms:")):
            continue
        url = normalize.norm_url(urljoin(base, href))
        if not url:
            continue
        fragment = bool(href.partition("#")[2].strip())
        key = (url, text, fragment)
        if key in seen:
            continue
        seen.add(key)
        links.append(Link(url=url, text=text, rel=rel, fragment=fragment))

    jsonld: List[Dict[str, Any]] = []
    for raw in parser.jsonld_raw:
        data = _load_jsonld(raw)
        if data is not None:
            _flatten_jsonld(data, jsonld)

    return Page(
        url=base_url,
        title=_clean("".join(parser.title_parts)),
        lines=parser.lines,
        headings=parser.headings,
        links=links,
        jsonld=jsonld,
        meta=parser.meta,
        nav_texts=list(nav_texts),
        list_items=parser.list_items,
        mailtos=list(mailtos),
        tels=list(tels),
        base_url=base,
    )
