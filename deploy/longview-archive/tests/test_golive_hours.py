"""Go-live hours fixes: holiday, seasonal, and 00:00-00:00 hours are never published as the regular week.

c14: a "Holiday Hours" / "Summer Hours" / "Temporary Hours" block, a holiday
heading, or a date goes to review (``seasonal_hours``) instead of becoming the
business's weekly hours. A plain "Hours" label under a holiday heading does not
end it; a heading covers only the hours right after it, so ordinary copy
("Summer Grove Dental", "Rated 5/5") higher on the page does not hold them.
c15: 00:00-00:00 (and 00:00-24:00, 12am-midnight, midnight-midnight) in JSON-LD
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
from longview_archive.extract.html import parse_page
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
        self.assertHours(["Business Hours (except holidays)", "Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))
        self.assertHours(["Hours may vary on holidays", "Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))
        self.assertHours(["Closed holidays", "Mon-Sat 9am-6pm"], same(WEEKDAYS + ("sat",), [["09:00", "18:00"]]))
        self.assertHours(["Day Care Hours: Mon-Fri 6:30am-6pm"], same(WEEKDAYS, [["06:30", "18:00"]]))
        self.assertHours(["Mother's Day Out Hours: Tue & Thu 9am-2pm"], same(("tue", "thu"), [["09:00", "14:00"]]))
        self.assertHours(["Hours (updated March 2024)", "Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_dates_with_a_colon_and_month_ranges(self):
        for lines in (["Dec 24: Closed", "Thursday 8am-5pm"], ["12/24: Closed", "Thursday 8am-5pm"],
                      ["Dec 24: 8am-noon", "Thursday 8am-5pm"], ["Hours", "Thursday, Dec 24: Closed"],
                      ["Hours of operation (March - October)", "Mon-Sat 10am-6pm"],
                      ["Hours (March - October): Mon-Sat 10am-6pm"],
                      ["Effective Jan 5", "Mon-Fri 9am-5pm"], ["Out of office Dec 20 - Jan 2", "Mon-Fri 8am-5pm"],
                      ["Martin Luther King Jr. Day", "Monday: Closed"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_plain_hours_label_does_not_end_a_holiday_heading(self):
        # A generic "Hours" line between a holiday heading and its rows is part of the holiday block.
        for lines in (["Holiday Hours", "Store Hours: Mon-Fri 8am-5pm"],
                      ["Happy Holidays!", "Store Hours", "Mon-Fri 8am-5pm"],
                      ["Christmas Eve", "Hours", "Thursday 8am-noon"],
                      ["Thanksgiving", "Store Hours", "Thursday: Closed", "Friday: Closed"],
                      ["HOLIDAY SCHEDULE", "Business Hours: Thu-Fri Closed"],
                      ["Dec 24 & 25", "Hours: Thursday & Friday Closed"],
                      ["Holiday Hours", "Hours:", "Thursday: Closed", "Friday: Closed"],
                      ["Holiday Hours", "Our hours", "Thursday: Closed"],
                      ["Holiday Hours", "Office Hours", "Monday: 8am-5pm", "Tuesday: 8am-5pm", "Wednesday: 8am-noon",
                       "Thursday: Closed", "Friday: Closed"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_holiday_heading_over_an_office_hours_paragraph(self):
        page = parse_page("<h2>Christmas Week</h2><p>Office Hours: Monday - Tuesday 8am - noon, "
                          "Wednesday - Friday Closed</p>", "https://www.maplegrovebakery.example/")
        self.assertSeasonal(page.lines)

    def test_plural_holidays(self):
        for lines in (["Holidays Hours: Closed Thursday & Friday"],
                      ["Hours During Holidays: Closed Thursday & Friday"],
                      ["Hours", "Holidays: Closed Thursday & Friday"],
                      ["Hours", "Closed Thursday & Friday for holidays"],
                      ["Hours", "Closed Thursday & Friday over the holidays"],
                      ["Office Hours", "Closed Thu-Fri (holidays)"],
                      ["Holidays", "Thursday: Closed", "Friday: Closed"],
                      ["Happy Holidays!", "Thursday: Closed", "Friday: Closed"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_named_holidays_with_either_apostrophe(self):
        for lines in (["Mother’s Day Hours: Sunday 10am-2pm"], ["Father's Day Hours: Sunday 10am-2pm"],
                      ["MLK Day Hours: Closed Monday"], ["Martin Luther King Jr. Day Hours: Closed Monday"],
                      ["Presidents’ Day Hours: Closed Monday"], ["Presidents' Day Hours: Closed Monday"],
                      ["Veterans’ Day Hours: Closed Tuesday"], ["Valentine’s Day Hours: Friday 5pm-10pm"],
                      ["Halloween Hours: Friday 5pm-10pm"], ["Columbus Day Hours: Closed Monday"],
                      ["St. Patrick’s Day Hours: Tuesday 11am-11pm"], ["Mardi Gras Hours: Tue 11am-11pm"],
                      ["X-mas Hours: Mon-Fri 10am-2pm"], ["Christmastime Hours: Mon-Fri 10am-2pm"],
                      ["Founders Day Hours: Closed Friday"],
                      ["Presidents’ Day", "Monday: Closed"], ["Halloween", "Friday 5pm-10pm"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_temporary_wordings(self):
        for lines in (["Modified Hours: Mon-Fri 10am-2pm"], ["Temp Hours: Mon-Fri 10am-2pm"],
                      ["Limited Hours: Mon-Fri 10am-2pm"], ["Reduced Hours: Mon-Fri 10am-2pm"],
                      ["Adjusted Hours: Mon-Fri 10am-2pm"], ["This Week's Hours: Mon-Wed 9am-1pm"],
                      ["This Week’s Hours: Mon-Wed 9am-1pm"], ["Hours this week", "Mon-Wed 9am-1pm"],
                      ["Vacation Hours: Mon-Fri 10am-2pm"], ["Snow Day Hours: Closed Monday"],
                      ["Storm Hours: Mon-Fri 10am-2pm"], ["December Hours: Mon-Fri 10am-6pm"],
                      ["Snow Day", "Monday: Closed"], ["Modified Schedule", "Monday: Closed"],
                      ["Summer", "Mon-Fri 7am-3pm"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)


HVAC_PAGE = """<h1>Cedar Lane Heating &amp; Air</h1>
<p>Beat the summer heat with a new AC system.</p>
<ul><li>AC repair</li><li>Heater tune-ups before winter</li></ul>
<p>Licensed and insured.</p><p>Free estimates on new systems.</p><p>Serving Longview and Kilgore.</p>
<footer><p>Mon - Fri: 8:00am - 5:00pm</p></footer>"""

DENTAL_PAGE = """<h1>Pine Street Dental</h1>
<ul><li>Cleanings</li><li>Temporary crowns</li></ul>
<table><tr><td>Monday</td><td>8:00 AM - 5:00 PM</td></tr><tr><td>Tuesday</td><td>8:00 AM - 5:00 PM</td></tr></table>"""


class SeasonalMarkerScopeTests(unittest.TestCase):
    """A holiday, season, or date covers the hours right after it, not the whole page."""

    assertSeasonal = SeasonalTextHoursTests.assertSeasonal
    assertHours = SeasonalTextHoursTests.assertHours

    def test_home_page_copy_does_not_hold_footer_hours(self):
        page = parse_page(HVAC_PAGE, "https://www.cedarlaneair.example/")
        self.assertHours(page.lines, same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_service_list_does_not_hold_an_hours_table(self):
        page = parse_page(DENTAL_PAGE, "https://www.pinestreetdental.example/")
        self.assertHours(page.lines, same(("mon", "tue"), [["08:00", "17:00"]]))

    def test_names_addresses_and_ratings_right_above_hours(self):
        for first in ("Summer Grove Dental", "123 Holiday Dr, Longview, TX", "Serving East Texas since 1/1/1998",
                      "Rated 5/5 by customers", "Grand opening May 5!", "Temporary crowns",
                      "Winter storm tips for homeowners", "1200 MLK Blvd, Longview, TX",
                      "1200 Martin Luther King Jr. Blvd", "Have a great day!", "Book this week and save!"):
            with self.subTest(first=first):
                self.assertHours([first, "Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_a_holiday_line_ends_after_ordinary_lines(self):
        weekdays = same(WEEKDAYS, [["08:00", "17:00"]])
        self.assertHours(["Closed Thanksgiving & Christmas Day", "Call for a free estimate", "Licensed and insured",
                          "Family owned", "Mon-Fri 8am-5pm"], weekdays)
        self.assertHours(["Holiday Hours", "See our Facebook page", "Gift cards available", "Order online",
                          "Hours", "Mon-Fri 8am-5pm"], weekdays)
        # After the hours, a holiday note changes nothing.
        self.assertHours(["Mon-Fri 8am-5pm", "Closed Thanksgiving & Christmas Day"], weekdays)

    def test_a_holiday_line_still_covers_the_hours_right_after_it(self):
        self.assertSeasonal(["Holiday Hours", "Please note", "Thursday: Closed"])
        self.assertSeasonal(["Christmas Eve", "We close early", "Please plan ahead", "Thursday 8am-noon"])
        # Right above the rows, a line naming a holiday cannot be told apart from
        # a holiday-week schedule ("Closed Thanksgiving" / "Thursday: Closed" /
        # "Friday: 10am-2pm"), so a person decides.
        self.assertSeasonal(["Closed Thanksgiving & Christmas Day", "Mon-Fri 8am-5pm"])
        self.assertSeasonal(["Closed Thanksgiving", "Thursday: Closed", "Friday: 10am-2pm"])
        # A long paragraph about a holiday counts too.
        self.assertSeasonal(["Thanksgiving week: " + "we are baking pies for everyone in town. " * 5,
                             "Thursday: Closed", "Friday: 10am-2pm"])


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

    def test_midnight_words_are_the_same_as_12am(self):
        # "12am - midnight" states the same span as "12am-12am"; neither is "Open 24 hours".
        for lines in (["Hours", "Sunday 12am - midnight"], ["Hours", "Sunday 12:00 AM - 12 midnight"],
                      ["Sunday midnight - 12am"], ["Sunday midnight - midnight"], ["Sunday 12 midnight-12 midnight"]):
            with self.subTest(lines=lines):
                self.assertAllDayReview(hours_from_lines(lines))

    def test_real_all_day_and_midnight_closes_still_parse(self):
        self.assertEqual(hours_from_lines(["Open 24 hours"]).hours, same(ALL_DAYS, [["00:00", "24:00"]]))
        self.assertEqual(hours_from_lines(["Sat 17:00-00:00"]).hours, {"sat": [["17:00", "24:00"]]})
        self.assertEqual(hours_from_lines(["Fri 6pm-12am"]).hours, {"fri": [["18:00", "24:00"]]})
        self.assertEqual(hours_from_lines(["Thu 5pm - midnight"]).hours, {"thu": [["17:00", "24:00"]]})
        self.assertEqual(hours_from_lines(["Sat midnight - 6am"]).hours, {"sat": [["00:00", "06:00"]]})
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

    def test_holiday_heading_over_an_office_hours_label_is_not_published(self):
        bid = self.home(body="<h2>Christmas Week</h2><p>Office Hours: Monday - Tuesday 8am - noon, "
                             "Wednesday - Friday Closed</p>")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.hours.issues, ["seasonal_hours"])
        self.assertHeldForReview(bid, "seasonal_hours")

    def test_seasonal_copy_higher_on_the_page_does_not_hold_regular_hours(self):
        bid = self.home(body="<p>Cool off this summer with our iced lemon bars.</p>"
                             "<ul><li>Custom cakes</li><li>Temporary kiosk at the farmers market</li></ul>"
                             "<p>Order your Thanksgiving pies early.</p>"
                             "<p>Custom orders welcome.</p><p>Gluten-free options.</p><p>Family owned since 1998.</p>"
                             "<h3>Hours</h3><p>Mon - Fri: 7:00am - 3:00pm</p>")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.hours.issues, [])
        self.assertEqual(self.value(bid, "hours"), same(WEEKDAYS, [["07:00", "15:00"]]))
        self.assertEqual(self.reviews(bid, "seasonal_hours"), [])

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
