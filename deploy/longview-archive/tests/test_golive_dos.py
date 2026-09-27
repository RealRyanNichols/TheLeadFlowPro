"""One hostile page must not stall the crawl: extraction stays linear in the page size.

The email deobfuscator, the fax check before each phone number, the parser's
implied-close scan, the mailto/tel/nav and careers-link de-duplication, and the
worker's JSON-LD phone list and phone choice each took time with the square of
the input on a crafted page far under the 2.5 MB cap (about 10 CPU-hours for
one page of 'a-a-a-...'). Each test times a hostile input against an ordinary
input of about the same size on the same machine, so a slow CI box slows both:
the old code was 12 to 1000 times slower on the hostile input, the fixed code
about as fast. The deobfuscator must also read every line exactly as the old
single pattern did. No network; fictional content only.
"""

import random
import re
import time
import unittest
from pathlib import Path

from longview_archive import config, worker
from longview_archive.extract import careers, contacts
from longview_archive.extract.html import Link, Page, parse_page

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

    def test_long_labels_and_many_at_words_are_linear(self):
        ordinary = "Book a table: info at example-cafe dot example or call. " * 1800
        cases = {
            "label": "a-" * 32 + "a at " + "-" * 100000,  # one label as long as the page
            "at_run": ("a-" * 31 + "a at ") * 1500,  # every run ends in ' at ', none has a domain
            "at_dot": "dot at " * 14000,  # each 'at' is also a label of the one before
        }
        for name, text in cases.items():
            with self.subTest(case=name):
                out = self.assert_linear(lambda: contacts.deobfuscate(text), lambda: contacts.deobfuscate(ordinary))
                self.assertEqual(out, _old_deobfuscate(text))


# The spelled-out pattern before it was made linear: the reading every line must keep.
_OLD_SPELLED = re.compile(r"\b([a-z0-9][a-z0-9._\-]*)\s+at\s+([a-z0-9\-]+(?:\s+dot\s+[a-z0-9\-]+)+)\b", re.I)


def _old_deobfuscate(text):
    out = text
    for pattern, repl in contacts._OBFUSCATED:
        out = pattern.sub(repl, out)
    return _OLD_SPELLED.sub(lambda m: m.group(1) + "@" + re.sub(r"\s+dot\s+", ".", m.group(2), flags=re.I), out)


class SpelledAddressTests(unittest.TestCase):
    """A spelled-out address is read whole, never cut short: a shorter one can be a different address."""

    def emails(self, line):
        return [email for email, _, _ in contacts.emails(Page(url=URL, lines=[line]), DOMAIN)]

    def test_long_address_is_not_cut_down_to_the_sites_domain(self):
        line = "info at a dot b dot c dot d dot e dot f dot g dot example-cafe dot example dot evil dot test"
        self.assertEqual(contacts.deobfuscate(line), "info@a.b.c.d.e.f.g.example-cafe.example.evil.test")
        self.assertEqual(self.emails(line), [])  # on evil.test, not the site's own domain

    def test_address_with_ten_labels_is_still_found(self):
        line = "info at a dot b dot c dot d dot e dot f dot g dot h dot example-cafe dot example"
        self.assertEqual(self.emails(line), ["info@a.b.c.d.e.f.g.h.example-cafe.example"])

    def test_overlong_words_read_as_before(self):
        # A 70-character local part or label makes an address that is never kept, but it still
        # takes the words after it, so no second, shorter address is read out of the same text.
        cases = {
            "x" * 70 + " at a dot info at example-cafe dot example": "x" * 70 + "@a.info at example-cafe dot example",
            "info at " + "x" * 70 + " dot info at example-cafe dot example":
                "info@" + "x" * 70 + ".info at example-cafe dot example",
        }
        for line, decoded in cases.items():
            with self.subTest(line=line[:12]):
                self.assertEqual(contacts.deobfuscate(line), decoded)
                self.assertEqual(self.emails(line), [])

    def test_same_reading_as_the_old_pattern(self):
        words = ["at", "dot", "AT", "Dot", "info", "office", "a", "b-", "-", "a.b", "a_b", "_", "c-d", "é", "%",
                 "[at]", "(dot)", "example-cafe", "example", "x" * 70, "a-" * 40, "y" * 63, "z" * 64, "a." * 35,
                 "1", "9-", ".", "at.", "dot-", "-at", "at-", "a@b"]
        gaps = [" "] * 10 + ["", "  ", "\t", "\n"]
        rng = random.Random(20260927)
        for _ in range(4000):
            line = "".join(rng.choice(words) + rng.choice(gaps) for _ in range(rng.randint(1, 24)))
            self.assertEqual(contacts.deobfuscate(line), _old_deobfuscate(line), repr(line))


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

    def test_many_distinct_careers_links_are_linear(self):
        n = 40000
        urls = [f"{URL}careers/{i}" for i in range(n)]
        distinct = Page(url=URL, links=[Link(u, "Careers") for u in urls + urls[:5]])
        repeated = Page(url=URL, links=[Link(urls[0], "Careers")] * (n + 5))
        found = self.assert_linear(lambda: careers.careers_links(distinct), lambda: careers.careers_links(repeated))
        self.assertEqual(found, urls)  # page order, no repeats

    def test_careers_links_order_unchanged(self):
        page = Page(url=URL, links=[
            Link(f"{URL}jobs", "Jobs"), Link("https://boards.greenhouse.io/examplecafe", "Apply"),
            Link(f"{URL}menu", "Menu"), Link(f"{URL}jobs", "Jobs again"),
            Link("https://www.other-cafe.example/careers", "Careers"),
            Link("https://boards.greenhouse.io/examplecafe", "Open roles"), Link(f"{URL}team", "Join our team")])
        self.assertEqual(careers.careers_links(page), [
            f"{URL}jobs", "https://boards.greenhouse.io/examplecafe", f"{URL}team"])


def _fictional_numbers(n):
    """n distinct numbers from 555-0100 to 555-0199, the range kept for fiction, across area codes."""
    areas = [a for a in range(200, 1000) if a % 100 != 11 and a != 555]
    return [f"+1{area}555{line:04d}" for area in areas for line in range(100, 200)][:n]


class PhoneListTests(_LinearCase):
    SETTINGS = config.Settings(data_dir=Path("/nonexistent/lva-dos-test"), allow_fictional_phones=True)
    SNAP = worker.BusinessSnapshot(id=1, public_id="b1", name="Example Cafe", category="restaurant", street=None,
                                   street_norm=None, zip="75601", website=URL, website_domain=DOMAIN)

    def extract(self, numbers):
        page = Page(url=URL, title="Example Cafe", lines=["Example Cafe"],
                    jsonld=[{"@type": "LocalBusiness", "name": "Example Cafe", "telephone": numbers}])
        result = worker.VisitResult(host="www.example-cafe.example", final_url=URL)
        worker._extract(result, self.SNAP, [(None, page), (None, page)], self.SETTINGS)
        return result

    def test_many_distinct_structured_numbers_are_linear(self):
        numbers = _fictional_numbers(30000)
        result = self.assert_linear(lambda: self.extract(numbers + numbers[:5]),
                                    lambda: self.extract(numbers[:1] * (len(numbers) + 5)))
        self.assertEqual(result.jsonld_phones, numbers)  # first-seen order, no repeats, across both pages
        self.assertEqual(self.extract(["(903) 555-0120", "+1 903 555 0120", "903.555.0130"]).jsonld_phones,
                         ["+19035550120", "+19035550130"])

    def test_choosing_among_many_numbers_is_linear(self):
        # Placeholders shaped like 903 numbers (a letter keeps them from being real ones): only
        # local numbers are checked against the site's structured data, one lookup each.
        n = 30000
        phones = [worker.Found(f"+1903X{i:06d}", "tel_link", 0.95, URL) for i in range(n)]
        structured = [f"+1430X{i:06d}" for i in range(n)]
        best, flag = self.assert_linear(lambda: worker.choose_phone(phones, None, structured),
                                        lambda: worker.choose_phone(phones, None, structured[:1]))
        self.assertEqual((best, flag), (phones[0], "multiple_phones"))
        chosen = worker.choose_phone(phones, None, structured + [phones[7].value])
        self.assertEqual(chosen, (phones[7], None))  # the one local number the structured data lists


if __name__ == "__main__":
    unittest.main()
