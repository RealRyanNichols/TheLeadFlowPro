"""One hostile page must not stall the crawl: extraction stays linear in the page size.

The email deobfuscator, the fax check before each phone number, the parser's
implied-close scan, and the mailto/tel/nav de-duplication each took time with
the square of the input on a crafted page far under the 2.5 MB cap (about 10
CPU-hours for one page of 'a-a-a-...'). Each test times a hostile input
against an ordinary input of about the same size on the same machine, so a
slow CI box slows both: the old code was 12 to 1000 times slower on the
hostile input, the fixed code about as fast. No network; fictional content only.
"""

import time
import unittest

from longview_archive.extract import contacts
from longview_archive.extract.html import Page, parse_page

URL = "https://www.example-cafe.example/"
DOMAIN = "example-cafe.example"


def _timed(fn):
    started = time.monotonic()
    result = fn()
    return result, time.monotonic() - started


class _LinearCase(unittest.TestCase):
    def assert_linear(self, hostile, ordinary):
        """Run both; ``hostile`` may cost a few times ``ordinary``, never orders of magnitude more."""
        _, base = _timed(ordinary)
        result, took = _timed(hostile)
        self.assertLess(took, 5 * base + 1.0, f"hostile input took {took:.2f}s, ordinary {base:.2f}s")
        return result


class DeobfuscateTests(_LinearCase):
    TAIL = " Email: info at example-cafe dot example"

    def test_long_run_of_word_boundaries_is_linear(self):
        for unit in ("a-", "a."):
            with self.subTest(unit=unit):
                found = self.assert_linear(
                    lambda: contacts.emails(Page(url=URL, lines=[unit * 25000 + self.TAIL]), DOMAIN),
                    lambda: contacts.emails(Page(url=URL, lines=[(unit * 4 + "a ") * 5000 + self.TAIL]), DOMAIN))
                self.assertEqual(found, [("info@example-cafe.example", "text", 0.8)])

    def test_long_chain_of_dot_segments_is_linear(self):
        text = "a-" * 8000 + "a at -" + " dot -" * 8000
        out = self.assert_linear(lambda: contacts.deobfuscate(text),
                                 lambda: contacts.deobfuscate("a-a-a at - dot - dot - dot - " * 1400))
        self.assertEqual(out, text)  # nothing here is an address

    def test_spelled_addresses_still_decoded(self):
        self.assertEqual(contacts.deobfuscate("info at example-cafe dot example"), "info@example-cafe.example")
        self.assertEqual(contacts.deobfuscate("front.desk at mail dot example-cafe dot co dot example"),
                         "front.desk@mail.example-cafe.co.example")
        self.assertEqual(contacts.deobfuscate("office [at] example-cafe [dot] example"),
                         "office@example-cafe.example")


class FaxLookbackTests(_LinearCase):
    def test_many_numbers_on_one_line_is_linear(self):
        line = "903-555-0100 " * 15000 + "Fax: 903-555-0101"
        found = self.assert_linear(
            lambda: contacts.phones(Page(url=URL, lines=[line]), allow_fictional=True),
            lambda: contacts.phones(Page(url=URL, lines=["903-555-0100"] * 15000 + ["Fax: 903-555-0101"]),
                                    allow_fictional=True))
        self.assertEqual(found, [("+19035550100", "text", 0.8)])  # the fax number is still skipped

    def test_fax_label_near_and_far(self):
        def numbers(line):
            return [e164 for e164, _, _ in contacts.phones(Page(url=URL, lines=[line]), allow_fictional=True)]

        self.assertEqual(numbers("Phone 903-555-0100 Fax: 903-555-0101"), ["+19035550100"])
        self.assertEqual(numbers("Fax" + " -" * 6 + " 903-555-0101"), [])  # 12 characters between: a fax
        self.assertEqual(numbers("Fax" + " -" * 7 + " 903-555-0101"), ["+19035550101"])  # 14: not a fax label
        self.assertEqual(numbers("x" * 40 + "fax 903-555-0101"), ["+19035550101"])  # no word boundary before 'fax'


class ImpliedCloseTests(_LinearCase):
    N = 15000

    def test_open_tags_under_a_scope_boundary_are_linear(self):
        n = self.N
        cases = {
            # hostile: the thousands of open <div>s sit under a nested list/table, so every new
            # <li>/<td>/<dd> used to walk all of them to reach the boundary; ordinary: the same
            # page without the boundary, where the first walk closes them all.
            "li": ("<ul><li><ul>", "<ul><li><div>", "<div>" * n + "<li>Oil change</li>" * n),
            "td": ("<table><tr><td><table>", "<table><tr><td><div>", "<div>" * n + "<td>Mon</td>" * n),
            "dd": ("<dl><dd><dl>", "<dl><dd><div>", "<div>" * n + "<dd>Brakes</dd>" * n),
            # <p> is closed only across inline tags: a <figure> stops the walk, a <span> does not.
            "p": ("<p><figure>", "<p><span>", "<b>" * n + "<div>Tires</div>" * n),
        }
        for name, (hostile_head, ordinary_head, body) in cases.items():
            with self.subTest(tag=name):
                page = self.assert_linear(lambda: parse_page(hostile_head + body, URL),
                                          lambda: parse_page(ordinary_head + body, URL))
                if name == "li":
                    self.assertEqual(page.list_items, ["Oil change"] * n)
                elif name == "td":
                    self.assertEqual(page.lines, [" ".join(["Mon"] * n)])
                elif name == "dd":
                    self.assertEqual(page.lines, ["Brakes"] * n)
                else:
                    self.assertEqual(page.lines, ["Tires"] * n)

    def test_implied_closes_unchanged(self):
        page = parse_page(
            "<ul><li>Oil change<li>Brakes <b>and <i>tires<li>Alignment</ul>"
            "<ul><li>Outer<ul><li>Inner one<li>Inner two</ul><li>Outer two</ul>"
            "<table><tr><td>Mon<td>8:00 AM - 5:00 PM<tr><td>Tue<td>Closed</table>"
            "<dl><dt>Wash<dd>Hand wash<dt>Detail<dd>Full detail</dl>"
            "<p>First <b>bold<p>Second<figure><p>Inside figure</figure>"
            "<a href='/one'>One<a href='/two'>Two</a><h2>Hours<h3>Weekdays</h3>",
            URL)
        self.assertEqual(page.list_items, ["Oil change", "Brakes and tires", "Alignment", "Inner one", "Inner two",
                                           "Outer", "Outer two"])
        self.assertIn("Mon 8:00 AM - 5:00 PM", page.lines)
        self.assertIn("Tue Closed", page.lines)
        self.assertEqual([p for p in page.lines if p.startswith(("First", "Second", "Inside"))],
                         ["First bold", "Second", "Inside figure"])
        self.assertEqual([(l.url, l.text) for l in page.links], [
            ("https://www.example-cafe.example/one", "One"), ("https://www.example-cafe.example/two", "Two")])
        self.assertEqual(page.headings, [(2, "Hours"), (3, "Weekdays")])


class LinkDedupTests(_LinearCase):
    def test_many_distinct_mailto_tel_and_nav_links_are_linear(self):
        def links(keys):
            return "<nav>" + "".join(
                f"<a>M{k}</a><a href=mailto:m{k}@x.example></a><a href=tel:{k}></a>" for k in keys)

        keys = [f"{i:05d}" for i in range(30000)]
        page = self.assert_linear(lambda: parse_page(links(keys + keys[:5]), URL),
                                  lambda: parse_page(links(["00000"] * (len(keys) + 5)), URL))
        self.assertEqual(page.nav_texts, ["M" + k for k in keys])  # first-seen order, no repeats
        self.assertEqual(page.mailtos, [f"m{k}@x.example" for k in keys])
        self.assertEqual(page.tels, keys)


if __name__ == "__main__":
    unittest.main()
