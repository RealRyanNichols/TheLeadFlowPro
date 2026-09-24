"""PoliteFetcher tests: fake transport, fake resolver, fake clock. No network."""

import gzip
import io
import socket
import threading
import time
import unittest
from pathlib import Path

from longview_archive import fetcher as f
from longview_archive.config import Settings

# A public (global) address for fake DNS answers; nothing ever connects to it.
PUBLIC_IP = "93.184.215.14"
WALL_START = 1_790_000_000.0  # 2026-09-21


class FakeClock:
    """Monotonic and wall clocks that move together; sleep advances both."""

    def __init__(self):
        self.lock = threading.Lock()
        self.t = 1000.0
        self.wall_offset = WALL_START - self.t
        self.sleeps = []

    def now(self):
        with self.lock:
            return self.t

    def wall(self):
        with self.lock:
            return self.t + self.wall_offset

    def sleep(self, seconds):
        with self.lock:
            self.sleeps.append(round(seconds, 6))
            self.t += seconds

    def advance(self, seconds):
        with self.lock:
            self.t += seconds


class FakeResolver:
    def __init__(self, mapping=None):
        self.mapping = mapping or {}
        self.calls = []

    def __call__(self, host, port, family=0, type=0, proto=0, flags=0):
        self.calls.append(host)
        ips = self.mapping.get(host, [PUBLIC_IP])
        if ips is None:
            raise socket.gaierror("no such host")
        out = []
        for ip in ips:
            fam = socket.AF_INET6 if ":" in ip else socket.AF_INET
            out.append((fam, socket.SOCK_STREAM, 6, "", (ip, port)))
        return out


def html(body="<html><head><title>Example Tire &amp; Lube</title></head><body><h1>Hi</h1></body></html>",
         status=200, headers=None, truncated=False):
    hdrs = {"Content-Type": "text/html; charset=utf-8"}
    hdrs.update(headers or {})
    data = body.encode("utf-8") if isinstance(body, str) else body
    return f.RawResponse(status, f.Headers(hdrs), data, truncated)


def redirect(location, status=301):
    return f.RawResponse(status, f.Headers({"Location": location}), b"")


def robots(text, status=200):
    return f.RawResponse(status, f.Headers({"Content-Type": "text/plain"}), text.encode("utf-8"))


class FakeTransport:
    """Routes by URL. Values: RawResponse, Exception, callable, or a list served in order."""

    def __init__(self, clock, routes=None):
        self.clock = clock
        self.routes = dict(routes or {})
        self.calls = []
        self.lock = threading.Lock()

    def __call__(self, url, headers, timeout, max_bytes):
        with self.lock:
            self.calls.append((url, self.clock.now(), dict(headers)))
            route = self.routes.get(url)
            if isinstance(route, list):
                route = route.pop(0) if len(route) > 1 else route[0]
        if route is None:
            if url.endswith("/robots.txt"):
                return f.RawResponse(404, f.Headers({}), b"")
            return html()
        if callable(route) and not isinstance(route, f.RawResponse):
            route = route()
        if isinstance(route, Exception):
            raise route
        return route

    def urls(self):
        return [c[0] for c in self.calls]

    def times_for(self, host):
        return [t for (u, t, _) in self.calls if f"//{host}/" in u]


def make(routes=None, settings=None, resolver_map=None):
    clock = FakeClock()
    transport = FakeTransport(clock, routes)
    resolver = FakeResolver(resolver_map)
    fetcher = f.PoliteFetcher(
        settings or Settings(data_dir=Path("/nonexistent-test-dir")),
        transport=transport,
        clock=clock.now,
        wall_clock=clock.wall,
        sleep=clock.sleep,
        resolver=resolver,
    )
    return fetcher, transport, clock, resolver


class RequestBasicsTests(unittest.TestCase):
    def test_ok_page_and_default_headers(self):
        fetcher, transport, _, _ = make()
        result = fetcher.fetch("https://www.exampletire.example/")
        self.assertTrue(result.ok)
        self.assertEqual(result.status, 200)
        self.assertIn("Example Tire &amp; Lube", result.text)
        self.assertEqual(result.content_type, "text/html")
        self.assertEqual(result.host, "www.exampletire.example")
        headers = transport.calls[-1][2]
        self.assertEqual(headers["User-Agent"], Settings().user_agent)
        self.assertIn("LeadFlowPro-LongviewArchive", headers["User-Agent"])
        self.assertEqual(headers["Accept"], "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1")
        self.assertEqual(headers["Accept-Language"], "en-US")
        self.assertEqual(headers["Accept-Encoding"], "gzip")
        self.assertNotIn("Cookie", headers)

    def test_http_and_transport_errors(self):
        routes = {
            "https://a.example/missing": html(status=404),
            "https://a.example/broken": html(status=500),
            "https://a.example/refused": f.TransportError("connect"),
            "https://a.example/slow": f.TransportError("timeout"),
            "https://a.example/cert": f.TransportError("tls"),
        }
        fetcher, _, _, _ = make(routes)
        expected = {"missing": "http_4xx", "broken": "http_5xx", "refused": "connect", "slow": "timeout",
                    "cert": "tls"}
        for path, error in expected.items():
            with self.subTest(path=path):
                result = fetcher.fetch(f"https://a.example/{path}")
                self.assertEqual(result.error, error)
                self.assertIsNone(result.text)
                self.assertFalse(result.ok)

    def test_dns_failure(self):
        fetcher, transport, _, _ = make(resolver_map={"gone.example": None})
        result = fetcher.fetch("https://gone.example/")
        self.assertEqual(result.error, "dns")
        self.assertEqual(transport.calls, [])

    def test_size_cap_is_too_large(self):
        fetcher, _, _, _ = make({"https://a.example/": html("x" * 100, truncated=True)})
        result = fetcher.fetch("https://a.example/")
        self.assertEqual(result.error, "too_large")
        self.assertIsNone(result.text)

    def test_non_html_is_not_html(self):
        pdf = f.RawResponse(200, f.Headers({"Content-Type": "application/pdf"}), b"%PDF-1.7")
        fetcher, _, _, _ = make({"https://a.example/menu.pdf": pdf})
        result = fetcher.fetch("https://a.example/menu.pdf")
        self.assertEqual(result.error, "not_html")
        self.assertIsNone(result.text)

    def test_xhtml_is_html(self):
        page = html(headers={"Content-Type": "application/xhtml+xml"})
        fetcher, _, _, _ = make({"https://a.example/": page})
        self.assertTrue(fetcher.fetch("https://a.example/").ok)


class RobotsTests(unittest.TestCase):
    def test_robots_disallow_respected(self):
        rules = "User-agent: LeadFlowPro-LongviewArchive\nDisallow: /private\n"
        fetcher, transport, _, _ = make({"https://a.example/robots.txt": robots(rules)})
        blocked = fetcher.fetch("https://a.example/private/page")
        self.assertEqual(blocked.blocked, "robots")
        self.assertNotIn("https://a.example/private/page", transport.urls())
        self.assertTrue(fetcher.fetch("https://a.example/public").ok)
        # robots.txt was fetched once and cached.
        self.assertEqual(transport.urls().count("https://a.example/robots.txt"), 1)

    def test_robots_wildcard_disallow_all(self):
        fetcher, transport, _, _ = make({"https://a.example/robots.txt": robots("User-agent: *\nDisallow: /\n")})
        self.assertEqual(fetcher.fetch("https://a.example/").blocked, "robots")
        self.assertEqual(transport.urls(), ["https://a.example/robots.txt"])

    def test_robots_other_agent_rules_do_not_apply(self):
        rules = "User-agent: SomeOtherBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n"
        fetcher, _, _, _ = make({"https://a.example/robots.txt": robots(rules)})
        self.assertTrue(fetcher.fetch("https://a.example/").ok)

    def test_robots_5xx_disallows_until_ttl(self):
        routes = {"https://a.example/robots.txt": [robots("", status=502), robots("", status=404)]}
        fetcher, transport, clock, _ = make(routes)
        self.assertEqual(fetcher.fetch("https://a.example/").blocked, "robots")
        clock.advance(3600)
        self.assertEqual(fetcher.fetch("https://a.example/").blocked, "robots")
        self.assertEqual(transport.urls().count("https://a.example/robots.txt"), 1)
        clock.advance(86_400)
        self.assertTrue(fetcher.fetch("https://a.example/").ok)
        self.assertEqual(transport.urls().count("https://a.example/robots.txt"), 2)

    def test_robots_500_disallows(self):
        fetcher, _, _, _ = make({"https://a.example/robots.txt": robots("", status=500)})
        self.assertEqual(fetcher.fetch("https://a.example/").blocked, "robots")

    def test_robots_429_503_also_start_backoff(self):
        for status in (429, 503):
            with self.subTest(status=status):
                fetcher, transport, _, _ = make({"https://a.example/robots.txt": robots("", status=status)})
                self.assertEqual(fetcher.fetch("https://a.example/").blocked, "backoff")
                self.assertTrue(fetcher.host_in_backoff("a.example"))
                self.assertEqual(transport.urls(), ["https://a.example/robots.txt"])

    def test_robots_404_allows(self):
        fetcher, _, _, _ = make({"https://a.example/robots.txt": robots("", status=404)})
        self.assertTrue(fetcher.fetch("https://a.example/").ok)

    def test_robots_410_allows(self):
        fetcher, _, _, _ = make({"https://a.example/robots.txt": robots("", status=410)})
        self.assertTrue(fetcher.fetch("https://a.example/").ok)

    def test_robots_401_403_disallow(self):
        for status in (401, 403):
            with self.subTest(status=status):
                fetcher, _, _, _ = make({"https://a.example/robots.txt": robots("", status=status)})
                self.assertEqual(fetcher.fetch("https://a.example/").blocked, "robots")

    def test_robots_timeout_disallows_and_reports(self):
        fetcher, transport, _, _ = make({"https://a.example/robots.txt": f.TransportError("timeout")})
        self.assertEqual(fetcher.fetch("https://a.example/").error, "timeout")
        self.assertEqual(fetcher.fetch("https://a.example/other").error, "timeout")
        # Cached for the TTL: robots.txt is not retried and no page was requested.
        self.assertEqual(transport.urls(), ["https://a.example/robots.txt"])

    def test_robots_dns_failure_disallows(self):
        fetcher, transport, _, _ = make({"https://a.example/robots.txt": f.TransportError("dns")})
        self.assertEqual(fetcher.fetch("https://a.example/").error, "dns")
        self.assertEqual(transport.urls(), ["https://a.example/robots.txt"])

    def test_crawl_delay_honoured(self):
        rules = "User-agent: *\nCrawl-delay: 45\n"
        fetcher, transport, clock, _ = make({"https://a.example/robots.txt": robots(rules)})
        fetcher.fetch("https://a.example/")
        fetcher.fetch("https://a.example/about")
        times = transport.times_for("a.example")
        self.assertEqual(len(times), 3)
        self.assertEqual(times[1] - times[0], 45)
        self.assertEqual(times[2] - times[1], 45)

    def test_small_crawl_delay_keeps_floor(self):
        fetcher, transport, _, _ = make({"https://a.example/robots.txt": robots("User-agent: *\nCrawl-delay: 5\n")})
        fetcher.fetch("https://a.example/")
        times = transport.times_for("a.example")
        self.assertEqual(times[1] - times[0], 20)

    def test_huge_crawl_delay_skips_site(self):
        fetcher, transport, _, _ = make({"https://a.example/robots.txt": robots("User-agent: *\nCrawl-delay: 3600\n")})
        self.assertEqual(fetcher.fetch("https://a.example/").blocked, "robots")
        self.assertEqual(transport.urls(), ["https://a.example/robots.txt"])


class SpacingTests(unittest.TestCase):
    def test_at_least_20_seconds_per_host_with_two_threads(self):
        fetcher, transport, clock, _ = make()
        errors = []

        def worker(paths):
            try:
                for path in paths:
                    self.assertTrue(fetcher.fetch(f"https://a.example/{path}").ok)
            except Exception as exc:  # pragma: no cover - surfaced below
                errors.append(exc)

        threads = [threading.Thread(target=worker, args=(["a1", "a2", "a3"],)),
                   threading.Thread(target=worker, args=(["b1", "b2", "b3"],))]
        for t in threads:
            t.start()
        for t in threads:
            t.join(10)
        self.assertEqual(errors, [])
        times = sorted(transport.times_for("a.example"))
        self.assertEqual(len(times), 7)  # robots.txt + 6 pages
        gaps = [b - a for a, b in zip(times, times[1:])]
        self.assertTrue(all(g >= 20 for g in gaps), gaps)
        self.assertEqual(transport.urls().count("https://a.example/robots.txt"), 1)

    def test_different_hosts_do_not_wait_for_each_other(self):
        fetcher, transport, clock, _ = make()
        start = WALL_START
        fetcher.import_host_state([
            {"host": "a.example", "robots_txt": None, "robots_status": 404,
             "robots_fetched_at": f.db.now_iso(f.datetime.fromtimestamp(start, tz=f.timezone.utc))},
            {"host": "b.example", "robots_txt": None, "robots_status": 404,
             "robots_fetched_at": f.db.now_iso(f.datetime.fromtimestamp(start, tz=f.timezone.utc))},
        ])
        t0 = clock.now()
        for url in ("https://a.example/1", "https://b.example/1", "https://a.example/2", "https://b.example/2"):
            self.assertTrue(fetcher.fetch(url).ok)
        self.assertEqual([t - t0 for (_, t, _) in transport.calls], [0, 0, 20, 20])
        self.assertEqual(clock.sleeps, [20])

    def test_robots_fetch_counts_toward_spacing(self):
        fetcher, transport, _, _ = make()
        fetcher.fetch("https://a.example/")
        times = transport.times_for("a.example")
        self.assertEqual(transport.urls(), ["https://a.example/robots.txt", "https://a.example/"])
        self.assertEqual(times[1] - times[0], 20)


class RedirectAndSsrfTests(unittest.TestCase):
    UNSAFE_TARGETS = [
        "http://127.0.0.1/",
        "http://10.0.0.5/admin",
        "http://[::1]/",
        "http://169.254.169.254/latest/meta-data/",
        "http://sneaky.example/",  # resolves to 192.168.1.1
    ]

    def test_redirect_to_unsafe_target_refused(self):
        for target in self.UNSAFE_TARGETS:
            with self.subTest(target=target):
                fetcher, transport, _, _ = make(
                    {"https://a.example/": redirect(target, 302)},
                    resolver_map={"sneaky.example": ["192.168.1.1"]},
                )
                result = fetcher.fetch("https://a.example/")
                self.assertEqual(result.blocked, "unsafe_host")
                self.assertIsNone(result.text)
                self.assertFalse(any(u.startswith(target.rstrip("/")) for u in transport.urls()), transport.urls())

    def test_direct_unsafe_urls_refused_without_request(self):
        urls = [
            "http://localhost/", "http://printer.local/", "http://db.internal/", "http://nas.home.arpa/",
            "http://app.localhost/", "http://intranet/", "ftp://files.example/", "file:///etc/passwd",
            "http://a.example:8080/", "http://2130706433/", "http://0x7f.1/", "http://127.1/",
            "http://user:secret@a.example/", "http://[::1]/", "http://[::ffff:127.0.0.1]/",
            "http://[fe80::1]/", "http://100.64.1.1/", "http://0.0.0.0/",
        ]
        for url in urls:
            with self.subTest(url=url):
                fetcher, transport, _, _ = make()
                self.assertEqual(fetcher.fetch(url).blocked, "unsafe_host")
                self.assertEqual(transport.calls, [])

    def test_hosts_resolving_to_unsafe_addresses_refused(self):
        answers = {
            "loop6.example": ["::1"],
            "mapped.example": ["::ffff:127.0.0.1"],
            "cgnat.example": ["100.64.1.1"],
            "linklocal6.example": ["fe80::1"],
            "sixtofour.example": ["2002:7f00:1::1"],
            "metadata.example": ["169.254.169.254"],
            "mixed.example": [PUBLIC_IP, "10.1.2.3"],
            "multicast.example": ["224.0.0.1"],
            "docs.example": ["203.0.113.9"],
            "nat64.example": ["64:ff9b::a00:1"],
        }
        for host in answers:
            with self.subTest(host=host):
                fetcher, transport, _, _ = make(resolver_map=answers)
                self.assertEqual(fetcher.fetch(f"https://{host}/").blocked, "unsafe_host")
                self.assertEqual(transport.calls, [])

    def test_ipv6_loopback_refused(self):
        fetcher, transport, _, _ = make(resolver_map={"v6.example": ["::1"]})
        self.assertEqual(fetcher.fetch("http://[::1]/").blocked, "unsafe_host")
        self.assertEqual(fetcher.fetch("https://v6.example/").blocked, "unsafe_host")
        self.assertEqual(transport.calls, [])

    def test_public_ipv6_allowed(self):
        fetcher, _, _, _ = make(resolver_map={"v6ok.example": ["2606:4700:4700::1111"]})
        self.assertTrue(fetcher.fetch("https://v6ok.example/").ok)

    def test_redirect_chain_followed_with_checks_each_hop(self):
        routes = {
            "http://a.example/": redirect("/step2", 301),
            "http://a.example/step2": redirect("https://www.a.example/final", 302),
            "https://www.a.example/final": html(),
        }
        fetcher, transport, _, resolver = make(routes)
        result = fetcher.fetch("http://a.example/")
        self.assertTrue(result.ok)
        self.assertEqual(result.final_url, "https://www.a.example/final")
        self.assertEqual(result.url, "http://a.example/")
        self.assertFalse(result.redirected_offsite)
        self.assertIn("https://www.a.example/robots.txt", transport.urls())
        self.assertIn("www.a.example", resolver.calls)

    def test_robots_checked_on_redirect_hop(self):
        routes = {
            "https://a.example/": redirect("https://b.example/secret", 301),
            "https://b.example/robots.txt": robots("User-agent: *\nDisallow: /secret\n"),
        }
        fetcher, transport, _, _ = make(routes)
        result = fetcher.fetch("https://a.example/")
        self.assertEqual(result.blocked, "robots")
        self.assertNotIn("https://b.example/secret", transport.urls())

    def test_offsite_redirect_flagged(self):
        fetcher, _, _, _ = make({"https://a.example/": redirect("https://b.example/", 301)})
        result = fetcher.fetch("https://a.example/")
        self.assertTrue(result.ok)
        self.assertTrue(result.redirected_offsite)
        self.assertEqual(result.final_url, "https://b.example/")

    def test_too_many_redirects(self):
        routes = {f"https://a.example/r{i}": redirect(f"/r{i + 1}") for i in range(10)}
        fetcher, _, _, _ = make(routes)
        result = fetcher.fetch("https://a.example/r0")
        self.assertEqual(result.error, "other")
        self.assertEqual(result.final_url, "https://a.example/r5")

    def test_allow_private_hosts_bypass_only_when_set(self):
        fetcher, transport, _, _ = make()
        self.assertEqual(fetcher.fetch("http://127.0.0.1/").blocked, "unsafe_host")
        self.assertEqual(transport.calls, [])
        settings = Settings(data_dir=Path("/nonexistent-test-dir"), allow_private_hosts=True)
        fetcher, transport, _, _ = make(settings=settings)
        result = fetcher.fetch("http://127.0.0.1/")
        self.assertTrue(result.ok)
        self.assertIn("http://127.0.0.1/", transport.urls())
        # The scheme rule still applies.
        self.assertEqual(fetcher.fetch("ftp://127.0.0.1/").blocked, "unsafe_host")


class ClassificationTests(unittest.TestCase):
    def test_backoff_ladder_then_reset(self):
        routes = {"https://a.example/": f.RawResponse(429, f.Headers({}), b"")}
        fetcher, transport, clock, _ = make(routes)
        day = 86_400
        for expected_days in (1, 3, 7, 14, 14):
            with self.subTest(days=expected_days):
                result = fetcher.fetch("https://a.example/")
                self.assertEqual(result.blocked, "backoff")
                self.assertTrue(fetcher.host_in_backoff("a.example"))
                row = [r for r in fetcher.export_host_state() if r["host"] == "a.example"][0]
                until = f._epoch(row["backoff_until"])
                self.assertAlmostEqual(until - clock.wall(), expected_days * day, delta=1)
                # While in backoff nothing is requested.
                before = len(transport.calls)
                self.assertEqual(fetcher.fetch("https://a.example/other").blocked, "backoff")
                self.assertEqual(len(transport.calls), before)
                clock.advance(expected_days * day + 1)
                self.assertFalse(fetcher.host_in_backoff("a.example"))
        transport.routes["https://a.example/"] = html()
        self.assertTrue(fetcher.fetch("https://a.example/").ok)
        row = [r for r in fetcher.export_host_state() if r["host"] == "a.example"][0]
        self.assertEqual(row["backoff_level"], 0)
        self.assertIsNone(row["backoff_until"])
        self.assertIsNone(row["blocked_reason"])

    def test_503_is_backoff(self):
        fetcher, _, _, _ = make({"https://a.example/": html("busy", status=503)})
        self.assertEqual(fetcher.fetch("https://a.example/").blocked, "backoff")
        self.assertTrue(fetcher.host_in_backoff("a.example"))

    def test_challenges(self):
        cases = {
            "cloudflare_503": f.RawResponse(503, f.Headers({"Server": "cloudflare", "Content-Type": "text/html"}),
                                            b"<title>Just a moment...</title>"),
            "cf_mitigated": f.RawResponse(403, f.Headers({"cf-mitigated": "challenge"}), b""),
            "cf_platform": f.RawResponse(403, f.Headers({"server": "cloudflare"}),
                                         b"<script src='/cdn-cgi/challenge-platform/x.js'></script>"),
            "attention": f.RawResponse(403, f.Headers({}), b"<title>Attention Required! | Cloudflare</title>"),
            "incapsula": f.RawResponse(200, f.Headers({"Content-Type": "text/html"}),
                                       b"<html>Request unsuccessful. Incapsula incident ID: 0</html>"),
            "sucuri": f.RawResponse(403, f.Headers({}), b"<h1>Sucuri WebSite Firewall - Access Denied</h1>"),
            "akamai": f.RawResponse(403, f.Headers({}),
                                    b"<H1>Access Denied</H1> Reference #18.x http://errors.edgesuite.net/"),
        }
        for name, response in cases.items():
            with self.subTest(name=name):
                fetcher, transport, clock, _ = make({"https://a.example/": response})
                result = fetcher.fetch("https://a.example/")
                self.assertEqual(result.blocked, "challenge")
                self.assertIsNone(result.text)
                # A challenge closes the site for 14 days: blocked, move on, never retried around.
                self.assertEqual(fetcher.blocked_kind("a.example"), "challenge")
                row = [r for r in fetcher.export_host_state() if r["host"] == "a.example"][0]
                self.assertEqual(row["blocked_reason"], "challenge")
                self.assertAlmostEqual(f._epoch(row["backoff_until"]) - clock.wall(), 14 * 86_400, delta=1)
                before = len(transport.calls)
                self.assertEqual(fetcher.fetch("https://a.example/contact").blocked, "challenge")
                self.assertEqual(fetcher.fetch("https://www.a.example/").blocked, "challenge")
                self.assertEqual(len(transport.calls), before)

    def test_gzip_body_decoded(self):
        body = gzip.compress("<html><title>Sample Street Tacos</title></html>".encode("utf-8"))
        response = f.RawResponse(200, f.Headers({"Content-Type": "text/html", "Content-Encoding": "gzip"}), body)
        fetcher, _, _, _ = make({"https://a.example/": response})
        result = fetcher.fetch("https://a.example/")
        self.assertTrue(result.ok)
        self.assertIn("Sample Street Tacos", result.text)

    def test_gzip_bomb_capped(self):
        body = gzip.compress(b"<html>" + b" " * 3_000_000)
        self.assertLess(len(body), 100_000)
        response = f.RawResponse(200, f.Headers({"Content-Type": "text/html", "Content-Encoding": "gzip"}), body)
        fetcher, _, _, _ = make({"https://a.example/": response})
        result = fetcher.fetch("https://a.example/")
        self.assertEqual(result.error, "too_large")
        self.assertIsNone(result.text)

    def test_gunzip_capped_helper(self):
        data = gzip.compress(b"a" * 5000)
        out, truncated = f.gunzip_capped(data, 1000)
        self.assertTrue(truncated)
        self.assertEqual(len(out), 1001)
        out, truncated = f.gunzip_capped(data, 5000)
        self.assertFalse(truncated)
        self.assertEqual(out, b"a" * 5000)
        with self.assertRaises(f.TransportError):
            f.gunzip_capped(b"not gzip at all", 1000)

    def test_read_capped_helper(self):
        self.assertEqual(f.read_capped(io.BytesIO(b"0123456789"), 5), (b"012345", True))
        self.assertEqual(f.read_capped(io.BytesIO(b"0123456789"), 10), (b"0123456789", False))
        self.assertEqual(f.read_capped(io.BytesIO(b""), 10), (b"", False))

    def test_charset_from_meta(self):
        body = '<html><head><meta charset="windows-1252"><title>Café Example</title></head></html>'.encode("cp1252")
        response = f.RawResponse(200, f.Headers({"Content-Type": "text/html"}), body)
        fetcher, _, _, _ = make({"https://a.example/": response})
        self.assertIn("Café Example", fetcher.fetch("https://a.example/").text)

    def test_charset_from_http_equiv_and_header_precedence(self):
        body = ('<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">'
                '<p>Jalapeño</p>').encode("latin-1")
        self.assertIn("Jalapeño", f.decode_html(body, None))
        utf8 = '<meta charset="windows-1252"><p>Jalapeño</p>'.encode("utf-8")
        self.assertIn("Jalapeño", f.decode_html(utf8, "utf-8"))
        self.assertIn("�", f.decode_html(b"<p>\xff\xfe bad</p>", None))

    def test_unsupported_content_encoding(self):
        response = f.RawResponse(200, f.Headers({"Content-Type": "text/html", "Content-Encoding": "br"}), b"...")
        fetcher, _, _, _ = make({"https://a.example/": response})
        self.assertEqual(fetcher.fetch("https://a.example/").error, "other")


class HostStateTests(unittest.TestCase):
    def test_export_import_round_trip(self):
        routes = {
            "https://a.example/robots.txt": robots("User-agent: *\nDisallow: /private\n"),
            "https://b.example/": f.RawResponse(429, f.Headers({}), b""),
        }
        fetcher, transport, clock, _ = make(routes)
        fetcher.fetch("https://b.example/")
        fetcher.fetch("https://a.example/")
        exported = fetcher.export_host_state()
        hosts = {r["host"]: r for r in exported}
        self.assertEqual(set(hosts), {"a.example", "b.example"})
        self.assertEqual(hosts["a.example"]["robots_status"], 200)
        self.assertIn("Disallow: /private", hosts["a.example"]["robots_txt"])
        self.assertTrue(hosts["a.example"]["last_request_at"].endswith("Z"))
        self.assertEqual(hosts["b.example"]["backoff_level"], 1)
        self.assertEqual(set(hosts["a.example"]), {
            "host", "robots_txt", "robots_status", "robots_fetched_at", "last_request_at",
            "backoff_level", "backoff_until", "blocked_reason"})

        clone = f.PoliteFetcher(Settings(data_dir=Path("/nonexistent-test-dir")), transport=transport,
                                clock=clock.now, wall_clock=clock.wall, sleep=clock.sleep,
                                resolver=FakeResolver())
        self.assertEqual(clone.import_host_state(exported), 2)
        self.assertEqual(clone.export_host_state(), exported)
        self.assertTrue(clone.host_in_backoff("b.example"))
        before = len(transport.calls)
        self.assertEqual(clone.fetch("https://a.example/private").blocked, "robots")
        self.assertEqual(len(transport.calls), before)  # robots came from the import
        # Spacing continues from the imported last request time: the clone waits.
        sleeps_before = len(clock.sleeps)
        self.assertTrue(clone.fetch("https://a.example/next").ok)
        self.assertEqual(clock.sleeps[sleeps_before:], [20])
        gap = transport.calls[-1][1] - transport.times_for("a.example")[-2]
        self.assertEqual(gap, 20)

    def test_import_accepts_sqlite_rows(self):
        import sqlite3
        from longview_archive import db
        conn = db.connect(":memory:")
        db.migrate(conn)
        conn.execute("INSERT INTO host_state(host, backoff_level, backoff_until) VALUES (?,?,?)",
                     ("c.example", 2, "2026-12-01T00:00:00Z"))
        fetcher, _, _, _ = make()
        self.assertEqual(fetcher.import_host_state(conn.execute("SELECT * FROM host_state")), 1)
        self.assertTrue(fetcher.host_in_backoff("c.example"))
        self.assertIsInstance(conn, sqlite3.Connection)


class DefaultTransportTests(unittest.TestCase):
    """The urllib transport, exercised only up to the point where it would open a socket."""

    def test_no_redirect_handler_returns_none(self):
        self.assertIsNone(f.NoRedirect().redirect_request(None, None, 302, "Found", {}, "http://x.example/"))

    def test_guarded_connection_refuses_private_resolution(self):
        resolver = FakeResolver({"sneaky.example": ["10.0.0.7"]})
        http_cls, https_cls = f._guarded_connection_classes(resolver, allow_private=False)
        for cls in (http_cls, https_cls):
            conn = cls("sneaky.example", 443, timeout=1)
            with self.assertRaises(f.UnsafeHostError):
                conn.connect()
        self.assertEqual(resolver.calls, ["sneaky.example", "sneaky.example"])

    def test_urllib_transport_refuses_at_connect_time(self):
        # A name that passed the fetcher's check but now resolves privately (DNS rebinding).
        resolver = FakeResolver({"rebind.example": ["127.0.0.1"]})
        transport = f.make_urllib_transport(resolver, allow_private=False)
        with self.assertRaises(f.UnsafeHostError):
            transport("http://rebind.example/", {"User-Agent": "test"}, 1.0, 1000)

    def test_urllib_transport_dns_failure(self):
        transport = f.make_urllib_transport(FakeResolver({"gone.example": None}), allow_private=False)
        with self.assertRaises(f.TransportError) as ctx:
            transport("http://gone.example/", {"User-Agent": "test"}, 1.0, 1000)
        self.assertEqual(ctx.exception.kind, "dns")

    def test_decode_content_encoding(self):
        headers = f.Headers({"Content-Encoding": "gzip", "Content-Type": "text/html"})
        out = f.decode_content_encoding(headers, gzip.compress(b"hello"), False, 100)
        self.assertEqual(out.body, b"hello")
        self.assertNotIn("Content-Encoding", out.headers)
        self.assertIn("content-type", out.headers)

    def test_headers_case_insensitive(self):
        headers = f.Headers([("Content-Type", "text/html"), ("X-A", "1"), ("x-a", "2")])
        self.assertEqual(headers["content-type"], "text/html")
        self.assertEqual(headers.get("CONTENT-TYPE"), "text/html")
        self.assertEqual(headers["X-A"], "1, 2")
        self.assertIsNone(headers.get("missing"))


class AddressTests(unittest.TestCase):
    def test_address_is_unsafe(self):
        unsafe = ["127.0.0.1", "10.0.0.5", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1",
                  "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "::", "fe80::1", "fc00::1", "fec0::1",
                  "::ffff:10.0.0.1", "2002:c0a8:0101::1", "64:ff9b::7f00:1", "not-an-ip"]
        for value in unsafe:
            with self.subTest(value=value):
                self.assertTrue(f.address_is_unsafe(value))
        for value in [PUBLIC_IP, "8.8.8.8", "2606:4700:4700::1111"]:
            with self.subTest(value=value):
                self.assertFalse(f.address_is_unsafe(value))

    def test_host_name_is_unsafe(self):
        for host in ["localhost", "x.local", "x.localhost", "x.internal", "x.home.arpa", "intranet",
                     "127.0.0.1", "::1", "2130706433", "0x7f.0.0.1", "127.1", ""]:
            with self.subTest(host=host):
                self.assertTrue(f.host_name_is_unsafe(host))
        for host in ["www.exampletire.example", "123.example", "cafe.example"]:
            with self.subTest(host=host):
                self.assertFalse(f.host_name_is_unsafe(host))


class Rfc9309RobotsTests(unittest.TestCase):
    """robots.txt read the way RFC 9309 says, not the way urllib.robotparser does."""

    def blocked(self, rules, path):
        fetcher, transport, _, _ = make({"https://a.example/robots.txt": robots(rules)})
        url = f"https://a.example{path}"
        result = fetcher.fetch(url)
        requested = any(u != "https://a.example/robots.txt" for u in transport.urls())
        self.assertEqual(result.blocked == "robots", not requested)
        return result.blocked == "robots"

    def test_star_wildcard_disallows_everything(self):
        self.assertTrue(self.blocked("User-agent: *\nDisallow: /*\n", "/contact"))

    def test_star_before_query_mark(self):
        rules = "User-agent: *\nDisallow: /*?\n"
        self.assertTrue(self.blocked(rules, "/contact?lang=en"))
        self.assertFalse(self.blocked(rules, "/contact"))

    def test_dollar_anchors_the_end(self):
        rules = "User-agent: *\nDisallow: /*.php$\n"
        self.assertTrue(self.blocked(rules, "/contact.php"))
        self.assertFalse(self.blocked(rules, "/contact.php/more"))
        self.assertFalse(self.blocked(rules, "/contact"))

    def test_longest_match_wins_not_first_match(self):
        rules = "User-agent: *\nAllow: /\nDisallow: /contact\n"
        self.assertTrue(self.blocked(rules, "/contact"))
        self.assertFalse(self.blocked(rules, "/about"))
        rules = "User-agent: *\nDisallow: /private\nAllow: /private/open\n"
        self.assertFalse(self.blocked(rules, "/private/open/hours"))
        self.assertTrue(self.blocked(rules, "/private/hours"))

    def test_allow_wins_a_tie(self):
        self.assertFalse(self.blocked("User-agent: *\nDisallow: /page\nAllow: /page\n", "/page"))

    def test_blank_line_does_not_end_a_group(self):
        self.assertTrue(self.blocked("User-agent: *\n\nDisallow: /\n", "/"))
        self.assertTrue(self.blocked("User-agent: *\n# comment\n\n\nDisallow: /hours\n", "/hours"))

    def test_our_token_with_version_and_any_case(self):
        for agent in ("LeadFlowPro-LongviewArchive/1.0", "leadflowpro-longviewarchive",
                      "LEADFLOWPRO-LONGVIEWARCHIVE/2 (+https://example.example)"):
            with self.subTest(agent=agent):
                rules = f"User-agent: *\nAllow: /\n\nUser-agent: {agent}\nDisallow: /\n"
                self.assertTrue(self.blocked(rules, "/"))

    def test_consecutive_agents_share_a_group_and_our_groups_merge(self):
        rules = ("User-agent: OtherBot\nUser-agent: LeadFlowPro-LongviewArchive\nDisallow: /a\n"
                 "User-agent: *\nDisallow: /\n"
                 "User-agent: LeadFlowPro-LongviewArchive\nDisallow: /b\n")
        self.assertTrue(self.blocked(rules, "/a"))
        self.assertTrue(self.blocked(rules, "/b"))
        self.assertFalse(self.blocked(rules, "/c"))  # our own groups replace the * group

    def test_percent_encoding_is_normalized(self):
        self.assertTrue(self.blocked("User-agent: *\nDisallow: /%7Ejoe\n", "/~joe/page"))
        self.assertTrue(self.blocked("User-agent: *\nDisallow: /~joe\n", "/%7ejoe/page"))
        self.assertTrue(self.blocked("User-agent: *\nDisallow: /café\n", "/caf%C3%A9"))

    def test_decimal_crawl_delay_is_honoured(self):
        fetcher, transport, _, _ = make({"https://a.example/robots.txt": robots("User-agent: *\nCrawl-delay: 60.0\n")})
        fetcher.fetch("https://a.example/")
        fetcher.fetch("https://a.example/about")
        times = transport.times_for("a.example")
        self.assertEqual([b - a for a, b in zip(times, times[1:])], [60, 60])

    def test_hostile_wildcards_stay_fast(self):
        rules = f.RobotsRules("User-agent: *\nDisallow: /" + "*a" * 200 + "*b$\n")
        started = time.monotonic()
        self.assertTrue(rules.can_fetch(f.ROBOTS_TOKEN, "https://a.example/" + "a" * 5000))
        self.assertLess(time.monotonic() - started, 1.0)

    def test_matcher_unit(self):
        self.assertTrue(f._rule_matches("/fish", "/fish.html"))
        self.assertFalse(f._rule_matches("/fish", "/Fish.asp"))
        self.assertTrue(f._rule_matches("/fish*.php", "/fishheads/catfish.php?parameters"))
        self.assertTrue(f._rule_matches("/*.php$", "/folder/filename.php"))
        self.assertFalse(f._rule_matches("/*.php$", "/filename.php5"))
        self.assertTrue(f._rule_matches("/$", "/"))
        self.assertFalse(f._rule_matches("/$", "/x"))


class SiteSpacingTests(unittest.TestCase):
    """The 20-second gap, backoff, and challenge belong to the site, not the exact host name."""

    def test_apex_and_www_are_spaced_as_one_site(self):
        routes = {"https://biz.example/": redirect("https://www.biz.example/", 301)}
        fetcher, transport, _, _ = make(routes)
        self.assertTrue(fetcher.fetch("https://biz.example/").ok)
        times = [t for (_, t, _) in transport.calls]
        self.assertEqual(transport.urls(), ["https://biz.example/robots.txt", "https://biz.example/",
                                            "https://www.biz.example/robots.txt", "https://www.biz.example/"])
        self.assertTrue(all(b - a >= 20 for a, b in zip(times, times[1:])), times)

    def test_two_threads_on_apex_and_www_never_overlap(self):
        fetcher, transport, _, _ = make()
        threads = [threading.Thread(target=lambda h=h: [fetcher.fetch(f"https://{h}/p{i}") for i in range(3)])
                   for h in ("biz.example", "www.biz.example")]
        for t in threads:
            t.start()
        for t in threads:
            t.join(10)
        times = sorted(t for (_, t, _) in transport.calls)
        self.assertEqual(len(times), 8)  # two robots.txt + six pages
        self.assertTrue(all(b - a >= 20 for a, b in zip(times, times[1:])), times)

    def test_backoff_on_www_closes_the_apex(self):
        fetcher, transport, _, _ = make({"https://www.biz.example/": f.RawResponse(429, f.Headers({}), b"")})
        self.assertEqual(fetcher.fetch("https://www.biz.example/").blocked, "backoff")
        before = len(transport.calls)
        self.assertEqual(fetcher.fetch("https://biz.example/").blocked, "backoff")
        self.assertEqual(fetcher.fetch("https://shop.biz.example/").blocked, "backoff")
        self.assertEqual(len(transport.calls), before)

    def test_challenge_is_not_cleared_by_a_later_success(self):
        routes = {"https://a.example/contact": f.RawResponse(403, f.Headers({"cf-mitigated": "challenge"}), b"")}
        fetcher, transport, clock, _ = make(routes)
        self.assertEqual(fetcher.fetch("https://a.example/contact").blocked, "challenge")
        fetcher._note_success("a.example")
        self.assertEqual(fetcher.blocked_kind("a.example"), "challenge")
        clock.advance(14 * 86_400 + 1)
        self.assertTrue(fetcher.fetch("https://a.example/").ok)
        self.assertIsNone(fetcher.blocked_kind("a.example"))

    def test_challenge_survives_a_restart(self):
        routes = {"https://a.example/": f.RawResponse(403, f.Headers({"cf-mitigated": "challenge"}), b"")}
        fetcher, transport, clock, _ = make(routes)
        fetcher.fetch("https://a.example/")
        clone = f.PoliteFetcher(Settings(data_dir=Path("/nonexistent-test-dir")), transport=transport,
                                clock=clock.now, wall_clock=clock.wall, sleep=clock.sleep, resolver=FakeResolver())
        clone.import_host_state(fetcher.export_host_state())
        before = len(transport.calls)
        self.assertEqual(clone.fetch("https://www.a.example/").blocked, "challenge")
        self.assertEqual(len(transport.calls), before)


class RobotsFailureRestartTests(unittest.TestCase):
    def test_unreachable_robots_is_still_unreachable_after_a_restart(self):
        fetcher, transport, clock, _ = make({"https://a.example/robots.txt": f.TransportError("timeout")})
        self.assertEqual(fetcher.fetch("https://a.example/").error, "timeout")
        rows = fetcher.export_host_state()
        clone = f.PoliteFetcher(Settings(data_dir=Path("/nonexistent-test-dir")), transport=transport,
                                clock=clock.now, wall_clock=clock.wall, sleep=clock.sleep, resolver=FakeResolver())
        clone.import_host_state(rows)
        clock.advance(3600)
        result = clone.fetch("https://a.example/")
        self.assertEqual((result.error, result.blocked), ("timeout", None))  # not "blocked by robots"
        self.assertEqual(transport.urls(), ["https://a.example/robots.txt"])  # still cached for the day
        self.assertEqual(clone.export_host_state(), rows)


class _DripStream:
    """A response body that trickles one byte every ``gap`` seconds.

    ``read(n)`` behaves like a buffered reader: it keeps receiving until it has
    ``n`` bytes (capped at ``give_up`` seconds so a broken test cannot hang).
    """

    def __init__(self, gap=0.05, give_up=3.0):
        self.gap = gap
        self.give_up = give_up

    def read1(self, n):
        time.sleep(self.gap)
        return b"x"

    def read(self, n):
        out, end = b"", time.monotonic() + self.give_up
        while len(out) < n and time.monotonic() < end:
            out += self.read1(1)
        return out


class DeadlineTests(unittest.TestCase):
    """A slow-drip or tarpit server is cut off at the request budget, not after days."""

    def test_budget_at_production_timeout(self):
        self.assertEqual(f.request_budget(20.0), 30.0)

    def test_read_capped_checks_the_deadline_after_every_receive(self):
        started = time.monotonic()
        with self.assertRaises(f.TransportError) as ctx:
            f.read_capped(_DripStream(), 2_500_000, deadline=time.monotonic() + 0.3)
        self.assertEqual(ctx.exception.kind, "timeout")
        self.assertLess(time.monotonic() - started, 1.5)

    def _serve(self, script):
        """A loopback-only server (never the network) that runs ``script(conn)`` once."""
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        stop = threading.Event()

        def run():
            try:
                conn, _ = server.accept()
            except OSError:
                return
            with conn:
                try:
                    conn.recv(65536)
                    script(conn, stop)
                except OSError:
                    pass

        thread = threading.Thread(target=run, daemon=True)
        thread.start()

        def cleanup():
            stop.set()
            server.close()
            thread.join(5)

        self.addCleanup(cleanup)
        return server.getsockname()[1]

    def _drip(self, head):
        def script(conn, stop):
            conn.sendall(head)
            end = time.monotonic() + 6  # bounded, so a regression fails instead of hanging
            while not stop.is_set() and time.monotonic() < end:
                conn.sendall(b"x")
                time.sleep(0.1)
        return script

    def _timed(self, port):
        transport = f.make_urllib_transport(allow_private=True)
        started = time.monotonic()
        with self.assertRaises(f.TransportError) as ctx:
            transport(f"http://127.0.0.1:{port}/", {"User-Agent": "test"}, 0.5, 2_500_000)
        return ctx.exception.kind, time.monotonic() - started

    def test_dripped_headers_end_at_the_deadline(self):
        port = self._serve(self._drip(b"HTTP/1.1 200 OK\r\nX-Slow: "))
        kind, elapsed = self._timed(port)
        self.assertEqual(kind, "timeout")
        self.assertLess(elapsed, 3.0)

    def test_dripped_body_ends_at_the_deadline(self):
        port = self._serve(self._drip(b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n"
                                      b"Content-Length: 2000000\r\n\r\n"))
        kind, elapsed = self._timed(port)
        self.assertEqual(kind, "timeout")
        self.assertLess(elapsed, 3.0)

    def test_dripped_chunked_body_ends_at_the_deadline(self):
        def script(conn, stop):
            conn.sendall(b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nTransfer-Encoding: chunked\r\n\r\n")
            end = time.monotonic() + 6
            while not stop.is_set() and time.monotonic() < end:
                conn.sendall(b"1\r\nx\r\n")
                time.sleep(0.1)
        kind, elapsed = self._timed(self._serve(script))
        self.assertEqual(kind, "timeout")
        self.assertLess(elapsed, 3.0)

    def test_a_quick_page_still_reads_normally(self):
        def script(conn, stop):
            conn.sendall(b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 5\r\n"
                         b"Connection: close\r\n\r\nhello")
        port = self._serve(script)
        raw = f.make_urllib_transport(allow_private=True)(f"http://127.0.0.1:{port}/", {"User-Agent": "t"}, 5.0, 1000)
        self.assertEqual((raw.status, raw.body, raw.truncated), (200, b"hello", False))


if __name__ == "__main__":
    unittest.main()
