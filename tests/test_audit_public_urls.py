"""Offline safety and parser tests for the optional public URL audit CLI."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('audit_public_urls', Path(__file__).parents[1] / 'scripts/audit-public-urls.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
ORIGIN = 'https://www.theleadflowpro.com'


class PublicAuditTests(unittest.TestCase):
    def test_query_values_are_never_requested_or_retained(self):
        result = audit.normalize('/tools/roi-calculator?email=private%40example.com#tool', ORIGIN, ORIGIN)
        self.assertEqual(result, {'url': ORIGIN + '/tools/roi-calculator', 'fragment': 'tool', 'hadQuery': True})
        self.assertNotIn('private', str(result))

    def test_protected_encoded_and_mutating_paths_are_excluded(self):
        for path in ('/api/leads', '/%61pi/leads', '/%2561pi/leads', '/r/REFCODE', '/community/open', '/request?product=old', '/checkout/old', '/admin', '/admin/leads/123', '/hq/leads', '/logout', '/unsubscribe?token=test', '/agency/pay', '/tools/pro/unlock', '/training/content-engine/credential', '/events/demo/confirmed', '/design-preview/service-areas', '/tools/og-gallery'):
            with self.subTest(path=path): self.assertIsNone(audit.normalize(path, ORIGIN, ORIGIN))
        self.assertIsNone(audit.normalize('https://example.com/page', ORIGIN, ORIGIN))
        self.assertIsNone(audit.normalize('javascript:alert(1)', ORIGIN, ORIGIN))
        self.assertIsNone(audit.normalize('/images/example.webp', ORIGIN, ORIGIN))

    def test_svg_titles_do_not_become_document_titles(self):
        document = audit.PublicHtml()
        document.feed('<html><head><title>ROI calculator</title><meta name="description" content="Your estimate"></head><body><h1>Calculate <span>ROI</span></h1><svg><title>Chart description</title><g><title>Data point</title></g></svg><a href="#tool">Run it</a><section id="tool"></section></body></html>')
        self.assertEqual(document.titles, ['ROI calculator'])
        self.assertEqual(document.descriptions, ['Your estimate'])
        self.assertEqual(document.h1, ['Calculate ROI'])
        self.assertEqual(document.ids, {'tool'})
        self.assertEqual(document.links, ['#tool'])

    def test_streamed_metadata_and_jsonld_are_read_without_executing_scripts(self):
        document = audit.PublicHtml()
        document.feed('<body><svg><title>Illustration</title></svg><title>Streamed title</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://www.theleadflowpro.com/tools/example"><meta property="og:image" content="https://www.theleadflowpro.com/image.jpg"><script type="application/ld+json">{"@type":"WebApplication","name":"Example"}</script><script>fetch("/api/mutation")</script></body>')
        self.assertEqual(document.titles, ['Streamed title'])
        self.assertEqual(document.robots, ['noindex,follow'])
        self.assertEqual(audit.schema_types(document.schema), ['WebApplication'])
        self.assertEqual(document.open_graph['og:image'], [ORIGIN + '/image.jpg'])
        self.assertEqual(document.links, [])

    def test_redirects_never_follow_protected_or_external_destinations(self):
        for target in ('/api/mutation', '/logout', 'https://example.com/other'):
            with self.subTest(target=target), patch.object(audit, 'read_response', return_value=(307, {'Location': target}, '')) as read:
                result = audit.crawl_page(ORIGIN + '/public-alias', ORIGIN)
                self.assertTrue(result['redirectExcluded'])
                self.assertEqual(read.call_count, 1)

    def test_rate_limit_does_not_retry(self):
        with patch.object(audit, 'read_response', return_value=(429, {'Retry-After': '60'}, '')) as read:
            result = audit.crawl_page(ORIGIN + '/tools', ORIGIN)
        self.assertTrue(result['rateLimited'])
        self.assertEqual(result['retryAfter'], '60')
        self.assertEqual(read.call_count, 1)

    def test_body_read_is_bounded_before_decoding(self):
        class OversizedResponse:
            status = 200
            headers = {'Content-Type': 'text/html'}
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit):
                self.limit = limit
                return b'a' * limit
        response = OversizedResponse()
        class Opener:
            def open(self, *args, **kwargs): return response
        with patch.object(audit.urllib.request, 'build_opener', return_value=Opener()):
            with self.assertRaisesRegex(ValueError, '3 MiB'): audit.read_response(ORIGIN + '/tools')
        self.assertEqual(response.limit, audit.MAX_BYTES + 1)


if __name__ == '__main__': unittest.main()
