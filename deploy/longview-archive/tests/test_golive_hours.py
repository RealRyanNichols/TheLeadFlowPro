"""Go-live hours fixes: holiday, seasonal, and 00:00-00:00 hours are never published as the regular week.

c14: a "Holiday Hours" / "Summer Hours" / "Temporary Hours" block, a holiday
heading, or a date goes to review (``seasonal_hours``) instead of becoming the
business's weekly hours. c15: 00:00-00:00 (and 00:00-24:00) in JSON-LD
``openingHours`` strings and visible text is ``ambiguous_all_day``, exactly as
``openingHoursSpecification`` already treats it. Fictional businesses and
``.example`` hosts only.

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_hours -v
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from longview_archive import facts
from longview_archive.extract.hours import hours_from_jsonld, hours_from_lines
from tests.fixtures.e2e.pipeline import FakeWeb, make_fetcher
from tests.test_worker import WorkerCase

WEEKDAYS = ("mon", "tue", "wed", "thu", "fri")
ALL_DAYS = WEEKDAYS + ("sat", "sun")


def same(days, ranges):
    return {day: [list(r) for r in ranges] for day in days}


class SeasonalTextHoursTests(unittest.TestCase):
    def assertSeasonal(self, lines):
        result = hours_from_lines(lines)
        self.assertIsNone(result.hours, lines)
        self.assertIn("seasonal_hours", result.issues, lines)
        self.assertEqual(result.confidence, 0.0)

    def assertHours(self, lines, expected):
        result = hours_from_lines(lines)
        self.assertEqual(result.issues, [], lines)
        self.assertEqual(result.hours, expected, lines)

    def test_holiday_label_with_closed_days(self):
        for lines in (["Holiday Hours: Closed Thursday & Friday"],
                      ["HOLIDAY HOURS: CLOSED THURSDAY & FRIDAY"],
                      ["Thanksgiving Hours: Closed Thursday & Friday"],
                      ["Thanksgiving Hours: We will be closed Thursday and Friday"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_holiday_heading_then_rows(self):
        for lines in (["Holiday Hours", "Closed Thursday & Friday"],
                      ["Holiday Hours:", "Thursday: Closed", "Friday: Closed"],
                      ["Holiday Hours", "Closed Thu & Fri"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_seasonal_and_temporary_labels(self):
        for lines in (["Christmas Hours: Mon-Tue 8am-noon"],
                      ["Temporary Hours: Mon-Fri 10am-2pm"],
                      ["Summer Hours: Mon-Fri 7am-3pm"],
                      ["Summer Hours (June-August): Mon-Fri 7am-3pm"],
                      ["Hours for Thanksgiving week: Mon-Wed 8am-5pm"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_holiday_block_is_never_merged_into_regular_hours(self):
        # Sunday and Saturday come only from the holiday block; neither is published.
        self.assertSeasonal(["Store Hours: Mon-Sat 10am-8pm", "Holiday Hours: Sunday 12pm-5pm"])
        self.assertSeasonal(["Hours: Mon-Fri 8am-5pm", "Holiday Hours: Closed Saturday"])
        self.assertSeasonal(["Holiday Hours: Closed Thursday & Friday", "Regular Hours", "Mon-Fri 8am-5pm"])

    def test_closed_for_the_holidays(self):
        for lines in (["Hours: Closed Thursday & Friday for the holidays"],
                      ["Hours", "Mon-Fri 8am-5pm", "Closed Thursday & Friday for the holidays"],
                      ["Hours", "Thursday: Closed for the holiday"],
                      ["Hours", "Monday", "Closed for the holidays"],
                      ["Now open Sundays for the holidays: 12pm-5pm"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_holiday_and_date_headings(self):
        for lines in (["Holiday Schedule", "Thursday: Closed", "Friday: Closed"],
                      ["Thanksgiving", "Thursday: Closed", "Friday: Closed"],
                      ["Christmas Eve", "Thursday 8am-noon"],
                      ["Dec 24", "Thursday 8am-noon"],
                      ["December 24th", "Thursday 8am-noon"],
                      ["12/24", "Thursday 8am-noon"],
                      ["July 4th", "Friday: Closed"],
                      ["Temporarily closed", "Saturday: Closed"],
                      ["Holiday Hours", "Please note", "Thursday: Closed"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_general_holiday_notes_still_publish(self):
        self.assertHours(["Mon-Fri 8am-5pm except holidays"], same(WEEKDAYS, [["08:00", "17:00"]]))
        self.assertHours(["Hours of Operation", "Mon-Sat 9am-6pm", "Closed on major holidays"],
                         same(WEEKDAYS + ("sat",), [["09:00", "18:00"]]))
        expected = same(WEEKDAYS + ("sat",), [["09:00", "18:00"]])
        expected["sun"] = []
        self.assertHours(["Mon-Sat 9am-6pm", "Closed Sundays & holidays"], expected)
        self.assertHours(["Hours", "Mon-Fri 8am-5pm", "Holiday hours may vary"], same(WEEKDAYS, [["08:00", "17:00"]]))
        self.assertHours(["Spring Hill Location Hours: Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))
        self.assertHours(["Open 24/7"], same(ALL_DAYS, [["00:00", "24:00"]]))

    def test_plain_hours_label_ends_a_seasonal_heading(self):
        self.assertHours(["Happy Holidays!", "Store Hours", "Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))
        self.assertHours(["Holiday Hours", "Store Hours: Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))


class AllDayZeroTests(unittest.TestCase):
    def assertAllDayReview(self, result):
        self.assertIsNone(result.hours)
        self.assertEqual(result.issues, ["ambiguous_all_day"])
        self.assertEqual(result.confidence, 0.0)

    def test_opening_hours_string_00_00_is_sent_to_review(self):
        self.assertAllDayReview(hours_from_jsonld(
            [{"openingHours": ["Mo-Fr 08:00-17:00", "Sa 00:00-00:00", "Su 00:00-00:00"]}]))
        self.assertAllDayReview(hours_from_jsonld([{"openingHours": "Mo-Su 0:00-0:00"}]))

    def test_opening_hours_string_matches_the_specification(self):
        for closes in ("00:00", "24:00"):
            with self.subTest(closes=closes):
                spec = hours_from_jsonld([{"openingHoursSpecification": {
                    "dayOfWeek": "Sunday", "opens": "00:00", "closes": closes}}])
                text = hours_from_jsonld([{"openingHours": f"Su 00:00-{closes}"}])
                self.assertAllDayReview(spec)
                self.assertAllDayReview(text)

    def test_visible_text_00_00_is_sent_to_review(self):
        for lines in (["Hours", "Sunday 00:00 - 00:00"], ["Sunday 00:00-00:00"], ["Sunday 0:00-0:00"],
                      ["Sunday 00:00-24:00"], ["Sunday 12:00 AM - 12:00 AM"], ["Sunday 12am-12am"]):
            with self.subTest(lines=lines):
                self.assertAllDayReview(hours_from_lines(lines))

    def test_real_all_day_and_midnight_closes_still_parse(self):
        self.assertEqual(hours_from_lines(["Open 24 hours"]).hours, same(ALL_DAYS, [["00:00", "24:00"]]))
        self.assertEqual(hours_from_lines(["Sat 17:00-00:00"]).hours, {"sat": [["17:00", "24:00"]]})
        self.assertEqual(hours_from_lines(["Fri 6pm-12am"]).hours, {"fri": [["18:00", "24:00"]]})
        self.assertEqual(hours_from_jsonld([{"openingHours": "Fr 17:00-00:00"}]).hours, {"fri": [["17:00", "24:00"]]})
        spec = [{"openingHoursSpecification": {"dayOfWeek": "Sunday", "opens": "00:00", "closes": "23:59"}}]
        self.assertEqual(hours_from_jsonld(spec).hours, {"sun": [["00:00", "24:00"]]})


PAGE = """<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Maple Grove Bakery</title>{head}</head>
<body>
<h1>Maple Grove Bakery</h1>
<p>Fresh bread and pies every morning.</p>
{body}
<p>Call <a href="tel:+19035550150">(903) 555-0150</a></p>
</body>
</html>
"""


class GoLiveHoursWorkerTest(WorkerCase):
    """End to end through the worker: a visit that finds only these hours writes no hours fact."""

    HOST = "www.maplegrovebakery.example"

    def setUp(self):
        super().setUp()
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-golive-hours-")
        self.site = Path(self.tmp.name) / self.HOST
        self.site.mkdir()
        (self.site / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
        self.web = FakeWeb(root=Path(self.tmp.name), clock=self.clock)
        self.fetcher = make_fetcher(self.settings, self.web, self.clock)

    def tearDown(self):
        self.tmp.cleanup()
        super().tearDown()

    def home(self, head: str = "", body: str = "") -> int:
        (self.site / "index.html").write_text(PAGE.format(head=head, body=body), encoding="utf-8")
        return self.add("Maple Grove Bakery", f"https://{self.HOST}/")

    def assertHeldForReview(self, bid: int, kind: str):
        self.assertIsNone(facts.get_fact(self.conn, bid, "hours"))
        items = self.reviews(bid, kind)
        self.assertEqual(len(items), 1)
        self.assertEqual((items[0]["field"], items[0]["detail"]), ("hours", kind))
        self.assertIsNone(items[0]["proposed_json"])

    def test_holiday_banner_is_not_published_as_weekly_hours(self):
        bid = self.home(body="<p>Holiday Hours: Closed Thursday &amp; Friday</p>")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.hours.issues, ["seasonal_hours"])
        self.assertHeldForReview(bid, "seasonal_hours")

    def test_jsonld_00_00_is_not_published_as_open_24_hours(self):
        data = {"@context": "https://schema.org", "@type": "Bakery", "name": "Maple Grove Bakery",
                "openingHours": ["Mo-Fr 08:00-17:00", "Sa 00:00-00:00", "Su 00:00-00:00"]}
        bid = self.home(head=f'<script type="application/ld+json">{json.dumps(data)}</script>',
                        body="<h2>Hours</h2>")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.hours_method, "jsonld")
        self.assertHeldForReview(bid, "ambiguous_all_day")


if __name__ == "__main__":
    unittest.main()
