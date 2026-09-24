"""parse_page stays linear on malformed pages (unclosed links and headings).

A page far under the 2.5 MB cap with thousands of never-closed <a> or <h3>
tags used to give every open tag a copy of all the text after it: memory grew
with the square of the tag count and could get the service killed under its
700 MB limit. No network; fictional content only.
"""

import time
import tracemalloc
import unittest

from longview_archive.extract.html import parse_page


class UnclosedTagTests(unittest.TestCase):
    def _measure(self, html):
        tracemalloc.start()
        started = time.monotonic()
        try:
            page = parse_page(html, "https://www.example-cafe.example/")
            _, peak = tracemalloc.get_traced_memory()
        finally:
            tracemalloc.stop()
        return page, peak, time.monotonic() - started

    def test_unclosed_anchors_are_linear(self):
        html = "<html><body><div>" + "".join(
            f'<a href="/p{i}">Item {i} of the example menu' for i in range(4000)) + "</div></body></html>"
        page, peak, elapsed = self._measure(html)
        self.assertEqual(len(page.links), 4000)
        self.assertLessEqual(max(len(link.text) for link in page.links), 40)
        self.assertEqual(page.links[0].text, "Item 0 of the example menu")
        self.assertLess(peak, 40 * 1024 * 1024)
        self.assertLess(elapsed, 10)

    def test_unclosed_headings_are_linear(self):
        html = "<html><body>" + "".join(f"<h3>Example heading {i}" for i in range(4000)) + "</body></html>"
        page, peak, _ = self._measure(html)
        self.assertEqual(len(page.headings), 4000)
        self.assertLessEqual(max(len(text) for _, text in page.headings), 30)
        self.assertLess(peak, 40 * 1024 * 1024)

    def test_many_open_inline_tags_are_fast(self):
        html = "<html><body>" + "<font>x " * 40000 + "</body></html>"
        started = time.monotonic()
        page = parse_page(html, "https://www.example-cafe.example/")
        self.assertLess(time.monotonic() - started, 10)
        self.assertTrue(page.lines)

    def test_well_formed_nesting_is_unchanged(self):
        page = parse_page(
            "<html><head><title>Example Cafe</title></head><body>"
            "<h1>Example <a href='/menu'>Cafe <b>Menu</b></a></h1>"
            "<h2>Hours</h2><p>Mon 8:00 AM - 5:00 PM</p>"
            "<nav><a href='/contact'>Contact</a> <a href='/about'>About us</a></nav></body></html>",
            "https://www.example-cafe.example/")
        self.assertEqual(page.headings, [(1, "Example Cafe Menu"), (2, "Hours")])
        self.assertEqual([(l.url, l.text) for l in page.links], [
            ("https://www.example-cafe.example/menu", "Cafe Menu"),
            ("https://www.example-cafe.example/contact", "Contact"),
            ("https://www.example-cafe.example/about", "About us")])
        self.assertEqual(page.nav_texts, ["Contact", "About us"])


if __name__ == "__main__":
    unittest.main()
