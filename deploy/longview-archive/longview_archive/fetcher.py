"""The polite fetcher: the only way the archive reads a business website.

It runs on the same droplet as a CRM and next to a cloud metadata service, so
every request and every redirect hop passes an SSRF guard (http/https only,
ports 80/443, no internal names or IP literals, no host that resolves to a
non-public address). The default transport repeats the address check at
connect time and connects to the address it checked, so a DNS answer cannot
change between the check and the connection.

Politeness is enforced here, not by callers: robots.txt is obeyed, requests to
one host start at least ``min_host_delay_s`` apart (robots.txt fetches
count), 429/503 put the host on a 1/3/7/14-day backoff ladder, and firewall
challenges are reported and never worked around. No cookies, JavaScript,
forms, or logins. Host state is kept in memory (shared by the worker threads)
and handed to the main thread through ``export_host_state`` /
``import_host_state``; this module never touches SQLite.
"""

from __future__ import annotations

import codecs
import http.client
import ipaddress
import logging
import re
import socket
import ssl
import threading
import time
import urllib.error
import urllib.request
import zlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Dict, Iterable, Iterator, List, Mapping, Optional, Tuple
from urllib.parse import urljoin, urlsplit

from . import db, normalize
from .config import Settings

log = logging.getLogger(__name__)

ROBOTS_TOKEN = "LeadFlowPro-LongviewArchive"
ACCEPT = "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1"
HTML_TYPES = ("text/html", "application/xhtml+xml")
REDIRECT_CODES = (301, 302, 303, 307, 308)
MAX_ROBOTS_BYTES = 512_000
# A site that asks for more than this between requests is skipped (treated as
# a robots refusal) rather than holding a worker thread for hours.
MAX_CRAWL_DELAY_S = 300.0
ROBOTS_FAILED = -1  # robots_status stored when robots.txt could not be fetched

BLOCKED_HOST_SUFFIXES = (".local", ".localhost", ".internal", ".home.arpa", ".localdomain")
_EXTRA_UNSAFE_NETS = (
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("169.254.169.254/32"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("198.18.0.0/15"),
)
_NAT64 = ipaddress.ip_network("64:ff9b::/96")

TRANSPORT_ERRORS = ("dns", "connect", "timeout", "tls", "other")
# robots_status codes for a robots.txt that could not be reached, per transport error kind.
_ROBOTS_ERROR_CODES = {kind: -2 - i for i, kind in enumerate(TRANSPORT_ERRORS)}
_ROBOTS_ERROR_KINDS = {code: kind for kind, code in _ROBOTS_ERROR_CODES.items()}
# A firewall challenge closes the site (registrable domain) for this long, for every business.
CHALLENGE_DAYS = 14


# ---------------------------------------------------------------- data types

class Headers(Mapping[str, str]):
    """Case-insensitive, read-only header mapping."""

    def __init__(self, items: Optional[Iterable[Tuple[str, str]] | Mapping[str, str]] = None):
        self._data: Dict[str, Tuple[str, str]] = {}
        if items is None:
            return
        pairs = items.items() if isinstance(items, Mapping) else items
        for key, value in pairs:
            low = str(key).lower()
            if low in self._data:
                self._data[low] = (self._data[low][0], self._data[low][1] + ", " + str(value))
            else:
                self._data[low] = (str(key), str(value))

    def __getitem__(self, key: str) -> str:
        return self._data[key.lower()][1]

    def __iter__(self) -> Iterator[str]:
        return (original for original, _ in self._data.values())

    def __len__(self) -> int:
        return len(self._data)

    def __contains__(self, key: object) -> bool:
        return isinstance(key, str) and key.lower() in self._data

    def without(self, *names: str) -> "Headers":
        drop = {n.lower() for n in names}
        return Headers([(k, v) for k, v in self._data.values() if k.lower() not in drop])

    def __repr__(self) -> str:
        return f"Headers({dict(self._data.values())!r})"


@dataclass
class RawResponse:
    status: int
    headers: Headers
    body: bytes = b""
    truncated: bool = False


class TransportError(Exception):
    """A request that produced no HTTP response. ``kind`` is dns|connect|timeout|tls|other."""

    def __init__(self, kind: str, detail: str = ""):
        super().__init__(f"{kind}: {detail}" if detail else kind)
        self.kind = kind if kind in TRANSPORT_ERRORS + ("unsafe",) else "other"


class UnsafeHostError(TransportError):
    """Raised at connect time when the host resolves to a non-public address."""

    def __init__(self, detail: str = ""):
        super().__init__("unsafe", detail)


Transport = Callable[[str, Mapping[str, str], float, int], RawResponse]


@dataclass
class FetchResult:
    url: str
    final_url: str
    status: Optional[int] = None
    headers: Headers = field(default_factory=Headers)
    body: bytes = b""
    text: Optional[str] = None
    content_type: Optional[str] = None
    error: Optional[str] = None
    blocked: Optional[str] = None
    redirected_offsite: bool = False
    host: str = ""

    @property
    def ok(self) -> bool:
        return self.error is None and self.blocked is None and self.text is not None


# ---------------------------------------------------------------- SSRF guard

def address_is_unsafe(value: str) -> bool:
    """True for any address a public website cannot legitimately live at."""
    try:
        ip = ipaddress.ip_address(value.split("%", 1)[0])
    except ValueError:
        return True
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped is not None:
            return address_is_unsafe(str(ip.ipv4_mapped))
        if ip.sixtofour is not None:
            return address_is_unsafe(str(ip.sixtofour))
        if ip in _NAT64:
            return address_is_unsafe(str(ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)))
        if ip.is_site_local:
            return True
    if (ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast
            or ip.is_reserved or ip.is_unspecified or not ip.is_global):
        return True
    return any(ip in net for net in _EXTRA_UNSAFE_NETS if net.version == ip.version)


def host_name_is_unsafe(host: str) -> bool:
    """Internal names and IP literals (in any spelling) are refused before DNS."""
    host = (host or "").strip().lower().rstrip(".")
    if not host or host == "localhost" or host.endswith(BLOCKED_HOST_SUFFIXES):
        return True
    if "." not in host and ":" not in host:
        return True  # single-label intranet names
    try:
        ipaddress.ip_address(host.split("%", 1)[0])
        return True
    except ValueError:
        pass
    # Decimal, octal, or hex spellings of an address ("2130706433", "0x7f.1", "127.1").
    if re.fullmatch(r"[0-9.]+", host) or re.fullmatch(r"(?:0x[0-9a-f]+|[0-9]+)(?:\.(?:0x[0-9a-f]+|[0-9]+))*", host):
        return True
    return False


def resolve_checked(host: str, port: int, resolver: Callable = socket.getaddrinfo) -> List[Tuple]:
    """getaddrinfo results for ``host`` when every address is public.

    Raises UnsafeHostError when any address is not, TransportError('dns') when
    the name does not resolve.
    """
    try:
        infos = resolver(host, port, 0, socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError) as exc:
        raise TransportError("dns", type(exc).__name__)
    except OSError as exc:
        raise TransportError("dns", type(exc).__name__)
    if not infos:
        raise TransportError("dns", "no addresses")
    for info in infos:
        address = info[4][0]
        if address_is_unsafe(str(address)):
            raise UnsafeHostError("non-public address")
    return list(infos)


# ---------------------------------------------------------------- default transport

def request_budget(timeout: float) -> float:
    """Wall-clock seconds one whole request may take: connect, TLS, headers, and body.

    The socket timeout alone restarts on every byte received, so a server that
    drips one byte every few seconds could hold a worker for days; this is the
    hard ceiling (30 s at the production 20 s timeout).
    """
    return max(1.0, float(timeout) * 1.5)


def read_capped(stream, max_bytes: int, deadline: Optional[float] = None, chunk: int = 65536) -> Tuple[bytes, bool]:
    """Read at most ``max_bytes + 1`` bytes; (body, truncated).

    ``read1`` returns after a single receive, so the deadline is checked after
    every piece of data that arrives, not only after a full 64 KB chunk.
    """
    parts: List[bytes] = []
    total = 0
    reader = getattr(stream, "read1", None) or stream.read
    while total <= max_bytes:
        if deadline is not None and time.monotonic() > deadline:
            raise TransportError("timeout", "body read")
        data = reader(min(chunk, max_bytes + 1 - total))
        if not data:
            return b"".join(parts), False
        parts.append(data)
        total += len(data)
    body = b"".join(parts)
    return body[: max_bytes + 1], True


def gunzip_capped(data: bytes, max_bytes: int) -> Tuple[bytes, bool]:
    """Decompress gzip ``data`` to at most ``max_bytes + 1`` bytes; (body, truncated)."""
    decomp = zlib.decompressobj(16 + zlib.MAX_WBITS)
    out = bytearray()
    buf = data
    try:
        while buf and len(out) <= max_bytes:
            out += decomp.decompress(buf, max_bytes + 1 - len(out))
            buf = decomp.unconsumed_tail
            if decomp.eof:
                break
        if len(out) > max_bytes:
            return bytes(out[: max_bytes + 1]), True
        if not decomp.eof and not buf:
            out += decomp.flush()
    except zlib.error as exc:
        raise TransportError("other", "bad gzip") from exc
    if len(out) > max_bytes:
        return bytes(out[: max_bytes + 1]), True
    return bytes(out), False


def decode_content_encoding(headers: Headers, body: bytes, truncated: bool, max_bytes: int) -> RawResponse:
    """Undo gzip content-encoding with the size cap; drops the header afterwards."""
    encoding = (headers.get("Content-Encoding") or "").strip().lower()
    if encoding in ("", "identity"):
        return RawResponse(0, headers, body, truncated)
    if encoding in ("gzip", "x-gzip"):
        if truncated:
            return RawResponse(0, headers.without("Content-Encoding"), b"", True)
        decoded, too_big = gunzip_capped(body, max_bytes)
        return RawResponse(0, headers.without("Content-Encoding", "Content-Length"), decoded, too_big)
    raise TransportError("other", "unsupported content-encoding")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Hand 3xx responses back to the fetcher, which checks every hop itself."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D401
        return None


class Watchdog:
    """Cuts a request's sockets off at a wall-clock deadline.

    Every socket a request opens is registered (as a duplicate descriptor, so
    it stays valid after TLS wraps the original). When the timer fires, each
    one is shut down, which makes a receive blocked in any thread return at
    once: a dripped status line, dripped headers, a slow TLS handshake, or a
    slow body all end at the deadline.
    """

    _current = threading.local()

    def __init__(self, seconds: float):
        self._lock = threading.Lock()
        self._socks: List[socket.socket] = []
        self.deadline = time.monotonic() + max(0.0, seconds)
        self.fired = False
        self._done = False
        self._timer = threading.Timer(max(0.0, seconds), self._fire)
        self._timer.daemon = True

    def __enter__(self) -> "Watchdog":
        Watchdog._current.dog = self
        self._timer.start()
        return self

    def __exit__(self, *exc) -> None:
        self._timer.cancel()
        with self._lock:
            self._done = True
            socks, self._socks = self._socks, []
        for sock in socks:
            try:
                sock.close()
            except OSError:
                pass
        if getattr(Watchdog._current, "dog", None) is self:
            Watchdog._current.dog = None

    @classmethod
    def remaining(cls, default: Optional[float]) -> Optional[float]:
        """Seconds left for the request running on this thread (``default`` when none)."""
        dog = getattr(cls._current, "dog", None)
        if dog is None:
            return default
        left = dog.deadline - time.monotonic()
        if left <= 0:
            raise socket.timeout("request deadline")
        return left if default is None else min(default, left)

    @classmethod
    def track(cls, sock: socket.socket) -> None:
        """Register ``sock`` with the watchdog of the request running on this thread."""
        dog = getattr(cls._current, "dog", None)
        if dog is None:
            return
        try:
            dup = sock.dup()
        except OSError:
            return
        with dog._lock:
            if dog._done:
                dup.close()
                return
            dog._socks.append(dup)
            fired = dog.fired
        if fired:
            dog._cut(dup)

    @staticmethod
    def _cut(sock: socket.socket) -> None:
        try:
            sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass

    def _fire(self) -> None:
        with self._lock:
            if self._done:
                return
            self.fired = True
            socks = list(self._socks)
        for sock in socks:
            self._cut(sock)


def _guarded_connection_classes(resolver: Callable, allow_private: bool):
    def guarded_create_connection(address, timeout=socket._GLOBAL_DEFAULT_TIMEOUT, source_address=None, *args, **kwargs):
        host, port = address[0], address[1]
        if allow_private:
            limit = None if timeout is socket._GLOBAL_DEFAULT_TIMEOUT else timeout
            limit = Watchdog.remaining(limit)
            sock = socket.create_connection(address, socket._GLOBAL_DEFAULT_TIMEOUT if limit is None else limit,
                                            source_address)
            Watchdog.track(sock)
            return sock
        infos = resolve_checked(host, port, resolver)
        last: Optional[BaseException] = None
        for family, socktype, proto, _, sockaddr in infos:
            sock = socket.socket(family, socktype, proto)
            Watchdog.track(sock)
            try:
                # A connect cannot be shut down from outside, so it gets only the time left.
                limit = None if timeout is socket._GLOBAL_DEFAULT_TIMEOUT else timeout
                limit = Watchdog.remaining(limit)
                if limit is not None:
                    sock.settimeout(limit)
                if source_address:
                    sock.bind(source_address)
                sock.connect(sockaddr)
                return sock
            except OSError as exc:
                last = exc
                sock.close()
        raise last or OSError("connect failed")

    class GuardedHTTPConnection(http.client.HTTPConnection):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._create_connection = guarded_create_connection

    class GuardedHTTPSConnection(http.client.HTTPSConnection):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._create_connection = guarded_create_connection

    return GuardedHTTPConnection, GuardedHTTPSConnection


def _classify_os_error(exc: BaseException) -> TransportError:
    if isinstance(exc, TransportError):
        return exc
    if isinstance(exc, urllib.error.URLError) and not isinstance(exc, urllib.error.HTTPError):
        reason = exc.reason
        if isinstance(reason, BaseException):
            return _classify_os_error(reason)
        return TransportError("other", "url error")
    if isinstance(exc, socket.gaierror):
        return TransportError("dns", "gaierror")
    if isinstance(exc, (socket.timeout, TimeoutError)):
        return TransportError("timeout", type(exc).__name__)
    if isinstance(exc, (ssl.SSLError, ssl.CertificateError)):
        return TransportError("tls", type(exc).__name__)
    if isinstance(exc, (ConnectionError, OSError)):
        return TransportError("connect", type(exc).__name__)
    return TransportError("other", type(exc).__name__)


def make_urllib_transport(resolver: Callable = socket.getaddrinfo, allow_private: bool = False) -> Transport:
    """The production transport: urllib, no redirects, no cookies, no proxies, capped reads."""
    http_cls, https_cls = _guarded_connection_classes(resolver, allow_private)
    context = ssl.create_default_context()

    class _HTTP(urllib.request.HTTPHandler):
        def http_open(self, req):
            return self.do_open(http_cls, req)

    class _HTTPS(urllib.request.HTTPSHandler):
        def https_open(self, req):
            return self.do_open(https_cls, req, context=context)

    opener = urllib.request.OpenerDirector()
    for handler in (urllib.request.ProxyHandler({}), _HTTP(), _HTTPS(context=context), NoRedirect(),
                    urllib.request.HTTPDefaultErrorHandler(), urllib.request.HTTPErrorProcessor(),
                    urllib.request.UnknownHandler()):
        opener.add_handler(handler)

    def transport(url: str, headers: Mapping[str, str], timeout: float, max_bytes: int) -> RawResponse:
        request = urllib.request.Request(url, headers=dict(headers), method="GET")
        budget = request_budget(timeout)
        deadline = time.monotonic() + budget
        with Watchdog(budget) as dog:
            try:
                response = opener.open(request, timeout=timeout)
            except urllib.error.HTTPError as exc:  # 3xx/4xx/5xx still carry a response
                response = exc
            except Exception as exc:  # noqa: BLE001 - every failure becomes a classified error
                if dog.fired:
                    raise TransportError("timeout", "request deadline") from None
                raise _classify_os_error(exc)
            try:
                status = int(getattr(response, "status", None) or response.getcode())
                resp_headers = Headers(list(response.headers.items()))
                try:
                    body, truncated = read_capped(response, max_bytes, deadline)
                except TransportError:
                    raise
                except Exception as exc:  # noqa: BLE001
                    if dog.fired:
                        raise TransportError("timeout", "request deadline") from None
                    raise _classify_os_error(exc)
            finally:
                try:
                    response.close()
                except Exception:  # noqa: BLE001
                    pass
            if dog.fired:  # a cut-off body reads as a clean end; it is not one
                raise TransportError("timeout", "request deadline")
        decoded = decode_content_encoding(resp_headers, body, truncated, max_bytes)
        return RawResponse(status, decoded.headers, decoded.body, decoded.truncated)

    return transport


# ---------------------------------------------------------------- decoding and classification

def _content_type(headers: Headers) -> Tuple[Optional[str], Optional[str]]:
    raw = headers.get("Content-Type")
    if not raw:
        return None, None
    parts = [p.strip() for p in raw.split(";")]
    mime = parts[0].lower() or None
    charset = None
    for param in parts[1:]:
        if param.lower().startswith("charset="):
            charset = param.split("=", 1)[1].strip().strip("\"'").lower() or None
    return mime, charset


def _codec(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    name = name.strip().lower()
    # Browsers read these labels as windows-1252 (the WHATWG encoding standard).
    if name in ("iso-8859-1", "latin1", "latin-1", "us-ascii", "ascii", "iso8859-1", "l1"):
        name = "cp1252"
    try:
        return codecs.lookup(name).name
    except LookupError:
        return None


_META_CHARSET = re.compile(rb"<meta[^>]+charset\s*=\s*[\"']?\s*([a-zA-Z0-9_\-:.]+)", re.I)


def decode_html(body: bytes, header_charset: Optional[str]) -> str:
    """Charset from the header, then <meta charset>/http-equiv, then UTF-8 (errors replaced)."""
    if body.startswith(codecs.BOM_UTF8):
        return body[len(codecs.BOM_UTF8):].decode("utf-8", errors="replace")
    codec = _codec(header_charset)
    if codec is None:
        m = _META_CHARSET.search(body[:4096])
        if m:
            codec = _codec(m.group(1).decode("ascii", errors="ignore"))
    return body.decode(codec or "utf-8", errors="replace")


_CHALLENGE_ANY = (b"attention required! | cloudflare", b"incapsula incident", b"sucuri website firewall")
_CLOUDFLARE_BODY = (b"just a moment", b"cf-chl", b"/cdn-cgi/challenge-platform")


def is_challenge(status: int, headers: Headers, body: bytes) -> bool:
    if (headers.get("cf-mitigated") or "").strip().lower() == "challenge":
        return True
    sample = body[:65536].lower()
    server = (headers.get("Server") or "").lower()
    if "cloudflare" in server and status in (403, 503) and any(m in sample for m in _CLOUDFLARE_BODY):
        return True
    if any(m in sample for m in _CHALLENGE_ANY):
        return True
    if b"access denied" in sample and (b"akamai" in sample or b"edgesuite" in sample):
        return True
    return False


# ---------------------------------------------------------------- host state

@dataclass
class _Robots:
    text: Optional[str]
    status: int
    fetched_at: float  # wall clock
    parser: Optional["RobotsRules"] = None
    error: Optional[str] = None  # transport error kind when robots.txt could not be reached

    def rules(self) -> Tuple[Optional[bool], Optional["RobotsRules"]]:
        """(True allow-all | False disallow-all | None use parser, parser)."""
        if self.status == 200 and self.text is not None:
            return None, self.parser
        if self.status in (401, 403, 429):
            return False, None
        if 400 <= self.status < 500:
            return True, None
        return False, None


@dataclass
class _Host:
    lock: threading.Lock = field(default_factory=threading.Lock)
    robots_lock: threading.Lock = field(default_factory=threading.Lock)
    last_request_mono: Optional[float] = None
    last_request_wall: Optional[float] = None
    backoff_level: int = 0
    backoff_until: Optional[float] = None
    blocked_reason: Optional[str] = None
    robots: Optional[_Robots] = None


def _iso(epoch: Optional[float]) -> Optional[str]:
    if epoch is None:
        return None
    return db.now_iso(datetime.fromtimestamp(epoch, tz=timezone.utc))


def _epoch(value: Optional[str]) -> Optional[float]:
    try:
        dt = db.parse_iso(value)
    except (TypeError, ValueError):
        return None
    return dt.timestamp() if dt else None


def site_key(host: str) -> str:
    """The key requests are spaced and backed off by: the registrable domain.

    ``www.biz.example`` and ``biz.example`` (and ``shop.biz.example``) are one
    site answered by one server, so they share one 20-second clock and one
    backoff. IP literals (tests only) are their own key.
    """
    host = (host or "").strip().lower().rstrip(".")
    try:
        ipaddress.ip_address(host.strip("[]").split("%", 1)[0])
        return host
    except ValueError:
        pass
    return normalize.registrable_domain(host) or host


# ---------------------------------------------------------------- robots.txt (RFC 9309)

_UNRESERVED = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
_HEX = frozenset("0123456789abcdefABCDEF")


def _norm_robots_path(text: str) -> str:
    """Percent-encoding normalized the way RFC 9309 section 2.2.2 compares paths.

    An encoded unreserved character is decoded (``%7E`` -> ``~``), other
    escapes get upper-case hex (``%2f`` -> ``%2F``), and characters outside
    printable US-ASCII are UTF-8 percent-encoded, so a rule and a URL that
    spell the same path differently still match.
    """
    out: List[str] = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if ch == "%" and i + 2 < n and text[i + 1] in _HEX and text[i + 2] in _HEX:
            decoded = chr(int(text[i + 1:i + 3], 16))
            out.append(decoded if decoded in _UNRESERVED else "%" + text[i + 1:i + 3].upper())
            i += 3
            continue
        if ord(ch) > 126 or ord(ch) < 33:
            out.append("".join(f"%{b:02X}" for b in ch.encode("utf-8", errors="replace")))
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def _rule_matches(pattern: str, path: str) -> bool:
    """RFC 9309 matching: ``*`` is any run of characters, a final ``$`` anchors the end.

    Greedy left-most matching of the literal pieces is exact for patterns that
    only use ``*`` and runs in linear time, so a hostile robots.txt cannot make
    the check slow the way a backtracking regex could.
    """
    anchored = pattern.endswith("$")
    if anchored:
        pattern = pattern[:-1]
    pieces = pattern.split("*")
    first = pieces[0]
    if not path.startswith(first):
        return False
    if len(pieces) == 1:
        return path == first if anchored else True
    pos = len(first)
    for piece in pieces[1:-1]:
        if not piece:
            continue
        found = path.find(piece, pos)
        if found < 0:
            return False
        pos = found + len(piece)
    last = pieces[-1]
    if anchored:
        return len(path) - len(last) >= pos and path.endswith(last)
    return not last or path.find(last, pos) >= 0


def _product_token(value: str) -> str:
    """``LeadFlowPro-LongviewArchive/1.0 (+https://...)`` -> ``leadflowpro-longviewarchive``."""
    token = value.strip().split("/", 1)[0].strip()
    token = token.split()[0] if token.split() else ""
    return token.lower()


class RobotsRules:
    """A standard-library robots.txt matcher that follows RFC 9309.

    * Groups start at ``User-agent`` lines; consecutive agent lines share one
      group, and a group ends only at the next agent line after a rule (blank
      lines and unknown lines never end a group).
    * The groups naming our product token (case-insensitive, any ``/version``
      dropped) are merged and used; otherwise the ``*`` groups; otherwise
      everything is allowed.
    * The longest matching rule wins, ``Allow`` wins a tie, ``*`` and ``$``
      work as wildcards, and paths are compared after percent-encoding
      normalization.
    * ``Crawl-delay`` (not part of the RFC, widely used) is read as a number of
      seconds from the chosen groups, decimals included.
    """

    def __init__(self, text: str):
        self.groups: List[Tuple[List[str], List[Tuple[bool, str]], Optional[float]]] = []
        agents: List[str] = []
        rules: List[Tuple[bool, str]] = []
        delay: Optional[float] = None
        in_rules = False
        for raw in (text or "").lstrip("﻿").splitlines():
            line = raw.split("#", 1)[0].strip()
            if ":" not in line:
                continue
            key, _, value = line.partition(":")
            key, value = key.strip().lower(), value.strip()
            if key in ("user-agent", "useragent", "user agent"):
                if in_rules:
                    self.groups.append((agents, rules, delay))
                    agents, rules, delay, in_rules = [], [], None, False
                token = "*" if value.strip() == "*" else _product_token(value)
                if token:
                    agents.append(token)
            elif key in ("allow", "disallow"):
                if not agents:
                    continue  # rules before any User-agent line belong to no group
                in_rules = True
                if value:  # an empty Disallow allows everything; an empty Allow says nothing
                    rules.append((key == "allow", _norm_robots_path(value)))
            elif key in ("crawl-delay", "crawl_delay"):
                if not agents:
                    continue
                in_rules = True
                try:
                    seconds = float(value)
                except ValueError:
                    continue
                if seconds == seconds and 0 <= seconds < float("inf"):  # not NaN or infinite
                    delay = seconds if delay is None else max(delay, seconds)
        if agents:
            self.groups.append((agents, rules, delay))

    def _chosen(self, agent: str) -> Tuple[List[Tuple[bool, str]], Optional[float], bool]:
        token = _product_token(agent)
        for wanted in (token, "*"):
            rules: List[Tuple[bool, str]] = []
            delay: Optional[float] = None
            found = False
            for agents, group_rules, group_delay in self.groups:
                if wanted in agents:
                    found = True
                    rules.extend(group_rules)
                    if group_delay is not None:
                        delay = group_delay if delay is None else max(delay, group_delay)
            if found:
                return rules, delay, True
        return [], None, False

    def can_fetch(self, agent: str, url: str) -> bool:
        parts = urlsplit(url)
        path = parts.path or "/"
        if parts.query:
            path += "?" + parts.query
        path = _norm_robots_path(path)
        if path == "/robots.txt":
            return True  # RFC 9309 2.2.2: implicitly allowed
        rules, _, _ = self._chosen(agent)
        best_len, allowed = -1, True
        for allow, pattern in rules:
            if _rule_matches(pattern, path):
                size = len(pattern)
                if size > best_len or (size == best_len and allow and not allowed):
                    best_len, allowed = size, allow
        return allowed

    def crawl_delay(self, agent: str) -> Optional[float]:
        return self._chosen(agent)[1]


def _make_parser(text: str) -> RobotsRules:
    return RobotsRules(text)


# ---------------------------------------------------------------- the fetcher

class PoliteFetcher:
    def __init__(
        self,
        settings: Settings,
        transport: Optional[Transport] = None,
        clock: Callable[[], float] = time.monotonic,
        wall_clock: Callable[[], float] = time.time,
        sleep: Callable[[float], None] = time.sleep,
        resolver: Callable = socket.getaddrinfo,
        store=None,  # accepted for SPEC compatibility; host state goes through export/import_host_state
    ):
        self.settings = settings
        self.clock = clock
        self.wall_clock = wall_clock
        self.sleep = sleep
        self.resolver = resolver
        self.transport: Transport = transport or make_urllib_transport(resolver, settings.allow_private_hosts)
        self._lock = threading.Lock()
        self._hosts: Dict[str, _Host] = {}
        self.headers = {
            "User-Agent": settings.user_agent,
            "Accept": ACCEPT,
            "Accept-Language": "en-US",
            "Accept-Encoding": "gzip",
        }

    # ------------------------------------------------------------ state helpers
    def _host(self, host: str) -> _Host:
        with self._lock:
            state = self._hosts.get(host)
            if state is None:
                state = self._hosts[host] = _Host()
            return state

    def blocked_kind(self, host: str, wall_now: Optional[float] = None) -> Optional[str]:
        """'challenge' or 'backoff' while the host's site is closed to us, else None.

        Backoff and challenges are kept per site (registrable domain), so a
        429 or a firewall challenge on ``www.biz.example`` also closes
        ``biz.example``. A row keyed by the exact host (older databases) still
        counts.
        """
        host = (host or "").lower()
        now = self.wall_clock() if wall_now is None else wall_now
        kind: Optional[str] = None
        with self._lock:
            for key in {host, site_key(host)}:
                state = self._hosts.get(key)
                if state and state.backoff_until and now < state.backoff_until:
                    if state.blocked_reason == "challenge":
                        return "challenge"
                    kind = "backoff"
        return kind

    def host_in_backoff(self, host: str, wall_now: Optional[float] = None) -> bool:
        return self.blocked_kind(host, wall_now) is not None

    def _note_backoff(self, host: str) -> None:
        key = site_key(host)
        state = self._host(key)
        with self._lock:
            ladder = self.settings.backoff_days
            days = ladder[min(state.backoff_level, len(ladder) - 1)]
            until = self.wall_clock() + days * 86400
            state.backoff_until = max(until, state.backoff_until or 0.0)
            state.backoff_level += 1
            if state.blocked_reason != "challenge" or state.backoff_until == until:
                state.blocked_reason = "backoff"
            level = state.backoff_level
        log.info("backoff host=%s site=%s level=%d days=%d", host, key, level, days)

    def _note_success(self, host: str) -> None:
        state = self._host(site_key(host))
        with self._lock:
            if state.blocked_reason == "challenge" and state.backoff_until and \
                    self.wall_clock() < state.backoff_until:
                return  # a challenge is never cleared early by a page that slipped through
            state.backoff_level = 0
            state.backoff_until = None
            state.blocked_reason = None

    def _note_challenge(self, host: str) -> None:
        """A firewall challenge closes the whole site for CHALLENGE_DAYS: blocked, move on."""
        key = site_key(host)
        state = self._host(key)
        with self._lock:
            until = self.wall_clock() + CHALLENGE_DAYS * 86400
            state.backoff_until = max(until, state.backoff_until or 0.0)
            state.blocked_reason = "challenge"
        log.info("challenge host=%s site=%s days=%d", host, key, CHALLENGE_DAYS)

    # ------------------------------------------------------------ SSRF
    def check_url(self, url: str) -> Optional[str]:
        """None when the URL may be requested, else 'unsafe_host' or 'dns'."""
        try:
            parts = urlsplit(url)
            port = parts.port
        except ValueError:
            return "unsafe_host"
        if parts.scheme.lower() not in ("http", "https"):
            return "unsafe_host"
        if parts.username or parts.password:
            return "unsafe_host"
        host = (parts.hostname or "").lower().rstrip(".")
        if not host:
            return "unsafe_host"
        if self.settings.allow_private_hosts:
            return None
        if port not in (None, 80, 443):
            return "unsafe_host"
        if host_name_is_unsafe(host):
            return "unsafe_host"
        default_port = port or (443 if parts.scheme.lower() == "https" else 80)
        try:
            resolve_checked(host, default_port, self.resolver)
        except UnsafeHostError:
            return "unsafe_host"
        except TransportError:
            return "dns"
        return None

    # ------------------------------------------------------------ spacing and requests
    def _delay_for(self, host: str) -> float:
        state = self._host(host)
        delay = self.settings.min_host_delay_s
        robots = state.robots
        if robots is not None and robots.parser is not None:
            crawl_delay = robots.parser.crawl_delay(ROBOTS_TOKEN)
            if crawl_delay:
                delay = max(delay, float(crawl_delay))
        return delay

    def _request(self, host: str, url: str) -> RawResponse:
        """One GET, spaced from the previous request start to the same site.

        The clock and the lock belong to the site (registrable domain), so
        ``biz.example`` and ``www.biz.example`` never get back-to-back requests.
        """
        state = self._host(site_key(host))
        delay = self._delay_for(host)
        with state.lock:  # one request at a time per site; other sites never wait
            if state.last_request_mono is not None:
                wait = state.last_request_mono + delay - self.clock()
                while wait > 0:
                    self.sleep(wait)
                    wait = state.last_request_mono + delay - self.clock()
            state.last_request_mono = self.clock()
            state.last_request_wall = self.wall_clock()
            raw = self.transport(url, dict(self.headers), self.settings.request_timeout_s,
                                 self.settings.max_page_bytes)
        if not isinstance(raw.headers, Headers):
            raw = RawResponse(raw.status, Headers(raw.headers or {}), raw.body or b"", raw.truncated)
        if "content-encoding" in raw.headers:
            decoded = decode_content_encoding(raw.headers, raw.body, raw.truncated, self.settings.max_page_bytes)
            raw = RawResponse(raw.status, decoded.headers, decoded.body, decoded.truncated)
        return raw

    # ------------------------------------------------------------ robots
    def _robots(self, scheme: str, host: str) -> _Robots:
        state = self._host(host)
        with state.robots_lock:
            cached = state.robots
            if cached is not None and self.wall_clock() - cached.fetched_at < self.settings.robots_ttl_s:
                return cached
            entry = self._fetch_robots(scheme, host)
            state.robots = entry
            return entry

    def _fetch_robots(self, scheme: str, host: str) -> _Robots:
        url = f"{scheme}://{host}/robots.txt"
        now = self.wall_clock()
        for _ in range(self.settings.max_redirects + 1):
            if self.check_url(url) is not None:
                return _Robots(None, ROBOTS_FAILED, now)
            hop_host = (urlsplit(url).hostname or "").lower()
            if hop_host != host and self.host_in_backoff(hop_host):
                return _Robots(None, ROBOTS_FAILED, now)  # never request a site that asked us to wait
            try:
                raw = self._request(hop_host, url)
            except UnsafeHostError:
                return _Robots(None, ROBOTS_FAILED, now)
            except TransportError as exc:
                log.info("robots host=%s error=%s", host, exc.kind)
                return _Robots(None, ROBOTS_FAILED, now, error=exc.kind)
            if raw.status in REDIRECT_CODES and raw.headers.get("Location"):
                url = urljoin(url, raw.headers["Location"].strip())
                continue
            if raw.status in (429, 503):
                self._note_backoff(host)
            if raw.status == 200:
                if raw.truncated or len(raw.body) > MAX_ROBOTS_BYTES:
                    return _Robots(None, ROBOTS_FAILED, now)
                text = raw.body.decode("utf-8", errors="replace")
                return _Robots(text, 200, now, _make_parser(text))
            return _Robots(None, raw.status, now)
        return _Robots(None, ROBOTS_FAILED, now)

    def _robots_allows(self, url: str) -> Tuple[bool, Optional[str]]:
        """(allowed, transport error kind when robots.txt was unreachable)."""
        parts = urlsplit(url)
        host = (parts.hostname or "").lower()
        entry = self._robots(parts.scheme.lower(), host)
        verdict, parser = entry.rules()
        if verdict is not None:
            return verdict, entry.error
        if parser is None:
            return False, None
        crawl_delay = parser.crawl_delay(ROBOTS_TOKEN)
        if crawl_delay and float(crawl_delay) > MAX_CRAWL_DELAY_S:
            return False, None
        return parser.can_fetch(ROBOTS_TOKEN, url), None

    # ------------------------------------------------------------ fetch
    def fetch(self, url: str) -> FetchResult:
        start = normalize.norm_url(url) or (url or "").strip()
        first_host = (urlsplit(start).hostname or "").lower() if start else ""
        first_domain = normalize.registrable_domain(first_host)
        current = start

        def result(**kw) -> FetchResult:
            final_host = (urlsplit(current).hostname or "").lower()
            offsite = bool(first_domain) and normalize.registrable_domain(final_host) != first_domain
            out = FetchResult(url=url, final_url=current, host=final_host, redirected_offsite=offsite, **kw)
            log.info("fetch host=%s status=%s error=%s blocked=%s", final_host, out.status, out.error, out.blocked)
            return out

        raw: Optional[RawResponse] = None
        for hop in range(self.settings.max_redirects + 1):
            problem = self.check_url(current)
            if problem == "unsafe_host":
                return result(blocked="unsafe_host")
            if problem == "dns":
                return result(error="dns")
            host = (urlsplit(current).hostname or "").lower()
            closed = self.blocked_kind(host)
            if closed:
                return result(blocked=closed)  # backoff, or a challenge: never retried around
            allowed, robots_error = self._robots_allows(current)
            closed = self.blocked_kind(host)
            if closed:  # robots.txt itself may have answered 429/503
                return result(blocked=closed)
            if not allowed:
                if robots_error in TRANSPORT_ERRORS:
                    # The site could not be reached at all; say why.
                    return result(error=robots_error)
                return result(blocked="robots")
            try:
                raw = self._request(host, current)
            except UnsafeHostError:
                return result(blocked="unsafe_host")
            except TransportError as exc:
                return result(error=exc.kind if exc.kind in TRANSPORT_ERRORS else "other")
            if raw.status in REDIRECT_CODES and raw.headers.get("Location"):
                if hop >= self.settings.max_redirects:
                    return result(status=raw.status, headers=raw.headers, error="other")
                target = urljoin(current, raw.headers["Location"].strip())
                current = normalize.norm_url(target) or target
                continue
            break
        assert raw is not None
        host = (urlsplit(current).hostname or "").lower()
        status = raw.status
        mime, charset = _content_type(raw.headers)
        base = dict(status=status, headers=raw.headers, content_type=mime)

        if is_challenge(status, raw.headers, raw.body):
            self._note_challenge(host)
            return result(blocked="challenge", **base)
        if status in (429, 503):
            self._note_backoff(host)
            return result(blocked="backoff", **base)
        if 300 <= status < 400:
            return result(error="other", **base)
        if 400 <= status < 500:
            return result(error="http_4xx", **base)
        if status >= 500:
            return result(error="http_5xx", **base)
        if status < 200:
            return result(error="other", **base)
        if raw.truncated:
            return result(error="too_large", **base)
        if mime not in HTML_TYPES:
            return result(error="not_html", **base)
        self._note_success(host)
        return result(body=raw.body, text=decode_html(raw.body, charset), **base)

    # ------------------------------------------------------------ persistence hand-off
    def export_host_state(self) -> List[dict]:
        """Rows shaped like the ``host_state`` table (the main thread writes them)."""
        rows = []
        with self._lock:
            items = list(self._hosts.items())
        for host, state in sorted(items):
            with self._lock:
                robots = state.robots
                rows.append({
                    "host": host,
                    "robots_txt": robots.text if robots else None,
                    # An unreachable robots.txt keeps its error kind as a negative code, so a
                    # restart still reports "unreachable" and not "refused by robots".
                    "robots_status": (_ROBOTS_ERROR_CODES.get(robots.error or "", robots.status)
                                      if robots else None),
                    "robots_fetched_at": _iso(robots.fetched_at) if robots else None,
                    "last_request_at": _iso(state.last_request_wall),
                    "backoff_level": state.backoff_level,
                    "backoff_until": _iso(state.backoff_until),
                    "blocked_reason": state.blocked_reason,
                })
        return rows

    def import_host_state(self, rows: Iterable[Mapping]) -> int:
        """Load ``host_state`` rows (dicts or sqlite3.Row). Returns the number loaded."""
        count = 0
        now_wall = self.wall_clock()
        now_mono = self.clock()
        for row in rows or []:
            data = dict(row) if not isinstance(row, dict) else row
            host = (data.get("host") or "").lower()
            if not host:
                continue
            state = self._host(host)
            with self._lock:
                fetched = _epoch(data.get("robots_fetched_at"))
                status = data.get("robots_status")
                if fetched is not None and status is not None:
                    text = data.get("robots_txt")
                    code = int(status)
                    error = _ROBOTS_ERROR_KINDS.get(code)
                    parser = _make_parser(text) if (code == 200 and text is not None) else None
                    state.robots = _Robots(text, ROBOTS_FAILED if error else code, fetched, parser, error)
                last = _epoch(data.get("last_request_at"))
                if last is not None:
                    state.last_request_wall = last
                    state.last_request_mono = now_mono - max(0.0, now_wall - last)
                state.backoff_level = int(data.get("backoff_level") or 0)
                state.backoff_until = _epoch(data.get("backoff_until"))
                state.blocked_reason = data.get("blocked_reason")
            count += 1
        return count
