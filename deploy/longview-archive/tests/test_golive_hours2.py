"""Go-live hours, round 2: holiday and seasonal hours are never published as the regular week.

- A holiday or seasonal HEADING ("Holiday Hours", "Christmas Eve", "Summer
  schedule now in effect!") covers its whole block of day rows, even with a few
  sentences between the heading and the rows. A plain hours label after other
  copy, or a long run of copy, ends it.
- Abbreviated months and month ranges ("Hours (Mar - Oct)", "Nov-Feb Hours",
  "Jan-Mar", "Sept. 1 - Nov. 30") are seasonal.
- A holiday line right after rows that only close days ("Thursday: Closed /
  Friday: Closed / Happy Thanksgiving!") makes those rows holiday closures.
- "12am - midnight", "midnight - 12am", "12:00 AM - 12 midnight" are the same as
  00:00-00:00: ambiguous, sent to review, as in openingHoursSpecification.
- A business name used as the hours label ("Summerfield Dental hours:") does not
  mark hours seasonal; only whole seasonal words do. Ordinary weekly hours still
  publish. Fictional businesses and ``.example`` hosts only.

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_hours2 -v
"""

from __future__ import annotations

import unittest

from longview_archive.extract.hours import hours_from_jsonld, hours_from_lines
from tests import test_golive_hours as round1  # module import: its test classes are not collected twice

same = round1.same

WEEKDAYS = ("mon", "tue", "wed", "thu", "fri")
ALL_DAYS = WEEKDAYS + ("sat", "sun")
NINE_TO_FIVE = same(WEEKDAYS, [["08:00", "17:00"]])


class _Asserts(unittest.TestCase):
    def assertSeasonal(self, lines):
        result = hours_from_lines(lines)
        self.assertIsNone(result.hours, lines)
        self.assertIn("seasonal_hours", result.issues, lines)
        self.assertEqual(result.confidence, 0.0)

    def assertHours(self, lines, expected):
        result = hours_from_lines(lines)
        self.assertEqual(result.issues, [], lines)
        self.assertEqual(result.hours, expected, lines)


class HolidayHeadingCoversItsBlockTests(_Asserts):
    COPY = ["We want to thank every customer for a wonderful year.",
            "Our team is taking a short break to rest and recharge.",
            "Online orders placed during the break ship when we return."]

    def test_holiday_hours_heading_then_sentences_then_closed_rows(self):
        self.assertSeasonal(["Holiday Hours"] + self.COPY + ["Thursday: Closed", "Friday: Closed"])
        self.assertSeasonal(["Thanksgiving Hours"] + self.COPY + ["Thursday: Closed", "Friday: Closed"])
        self.assertSeasonal(["Christmas Hours:"] + self.COPY + ["Mon-Tue 8am-noon"])

    def test_heading_forms_without_the_word_hours(self):
        for heading in ("Holiday Schedule", "Christmas Eve", "Happy Holidays!", "Thanksgiving",
                        "Summer Schedule", "Temporarily closed"):
            with self.subTest(heading=heading):
                self.assertSeasonal([heading, "We close early.", "Please plan ahead.", "Thank you!",
                                     "Thursday: Closed"])
        self.assertSeasonal(["Christmas Eve", "We close early.", "Please plan ahead.", "Thank you!",
                             "Thursday 8am-noon"])

    def test_every_row_of_the_block_is_covered(self):
        self.assertSeasonal(["Holiday Hours"] + self.COPY + [
            "Monday: 8am-5pm", "Tuesday: 8am-5pm", "Wednesday: 8am-noon", "Thursday: Closed", "Friday: Closed"])

    def test_a_plain_hours_label_after_copy_ends_the_holiday_block(self):
        self.assertHours(["Holiday Hours", "See our Facebook page", "Gift cards available", "Order online",
                          "Hours", "Mon-Fri 8am-5pm"], NINE_TO_FIVE)
        self.assertHours(["Holiday Hours"] + self.COPY + ["Store Hours: Mon-Fri 8am-5pm"], NINE_TO_FIVE)

    def test_a_plain_label_right_under_the_heading_does_not_end_it(self):
        self.assertSeasonal(["Holiday Hours", "Store Hours: Mon-Fri 8am-5pm"])
        self.assertSeasonal(["Christmas Eve", "Hours", "Thursday 8am-noon"])

    def test_a_long_run_of_copy_ends_the_holiday_block(self):
        copy = ["Fresh bread.","Custom cakes.", "Pies and tarts.", "Gluten-free options.",
                "Family owned.", "Catering available.", "Gift cards."]
        self.assertHours(["Holiday Hours"] + copy + ["Mon-Fri 8am-5pm"], NINE_TO_FIVE)

    def test_a_standing_closure_policy_still_ends_after_two_lines(self):
        self.assertHours(["Closed Thanksgiving & Christmas Day", "Call for a free estimate", "Licensed and insured",
                          "Family owned", "Mon-Fri 8am-5pm"], NINE_TO_FIVE)


class AbbreviatedMonthTests(_Asserts):
    def test_abbreviated_month_ranges_are_seasonal(self):
        for lines in (["Hours (Mar - Oct)", "Mon-Sat 10am-6pm"],
                      ["Hours (Mar - Oct): Mon-Sun 10am-8pm"],
                      ["Hours (Nov–Feb)", "Mon-Fri 9am-4pm"],
                      ["Nov-Feb Hours: Mon-Fri 9am-4pm"],
                      ["Hours Nov - Feb: Mon-Fri 9am-4pm"],
                      ["Jan-Mar", "Mon-Fri 9am-4pm"],
                      ["Open Jan-Mar", "Mon-Fri 9am-4pm"],
                      ["Sept. 1 - Nov. 30", "Mon-Fri 9am-4pm"],
                      ["Hours Sept. 1 - Nov. 30", "Mon-Fri 9am-4pm"],
                      ["Garden Center", "Open Mar. - Oct.", "Mon - Sun: 9am - 6pm", "Store Hours"],
                      ["Mon-Fri 9am-4pm (Jan-Mar)"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_names_and_years_that_look_like_months_still_publish(self):
        for lines in (["Jan's Bakery Hours: Mon-Fri 8am-5pm"], ["Decatur Tire Hours: Mon-Fri 8am-5pm"],
                      ["Marshall Dental Hours: Mon-Fri 8am-5pm"], ["Augusta Tire Hours: Mon-Fri 8am-5pm"],
                      ["Novak Law Hours: Mon-Fri 8am-5pm"], ["Hours (updated Mar 2024)", "Mon-Fri 8am-5pm"],
                      ["Serving Longview since Oct 1998", "Mon-Fri 8am-5pm"]):
            with self.subTest(lines=lines):
                self.assertHours(lines, NINE_TO_FIVE)


class SentenceHeadingTests(_Asserts):
    def test_sentence_style_seasonal_headings(self):
        for lines in (["Summer hours are now in effect", "Mon-Thu 7am-5pm"],
                      ["Summer schedule now in effect!", "Mon - Thu: 7am - 5pm", "Fri: 7am - 11am"],
                      ["Our summer schedule has changed!", "Mon-Thu 7am-5pm"],
                      ["We have changed our summer schedule", "Mon-Thu 7am-5pm"],
                      ["Our hours have changed for the holidays", "Mon-Thu 7am-5pm"],
                      ["New winter hours are here!", "Mon-Fri 9am-4pm"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_ordinary_greetings_still_publish(self):
        for first in ("Have a great day!", "We have changed our phone number", "New patients welcome"):
            with self.subTest(first=first):
                self.assertHours([first, "Mon-Fri 8am-5pm"], NINE_TO_FIVE)


class HolidayLineAfterClosedRowsTests(_Asserts):
    def test_holiday_line_right_after_closed_only_rows(self):
        for lines in (["Hours", "Thursday: Closed", "Friday: Closed", "Happy Thanksgiving!"],
                      ["Thursday: Closed", "Friday: Closed", "Happy Holidays!"],
                      ["Hours", "Thursday - Friday: Closed", "Merry Christmas!"],
                      ["Hours: Closed Thursday & Friday", "Happy Thanksgiving!"],
                      ["Thursday: Closed", "Friday: Closed", "We reopen Monday", "Happy Thanksgiving!"]):
            with self.subTest(lines=lines):
                self.assertSeasonal(lines)

    def test_a_closure_policy_after_rows_still_publishes(self):
        self.assertHours(["Sat: Closed", "Sun: Closed", "Closed Thanksgiving & Christmas Day"],
                         {"sat": [], "sun": []})
        self.assertHours(["Hours", "Mon-Fri 8am-5pm", "Closed Thanksgiving & Christmas Day"], NINE_TO_FIVE)
        expected = dict(NINE_TO_FIVE, sat=[], sun=[])
        self.assertHours(["Hours", "Mon-Fri 8am-5pm", "Sat-Sun: Closed", "Closed on major holidays"], expected)


class MidnightWordTests(unittest.TestCase):
    def assertAllDayReview(self, result, what):
        self.assertIsNone(result.hours, what)
        self.assertEqual(result.issues, ["ambiguous_all_day"], what)

    def test_midnight_words_are_00_00_to_00_00(self):
        for line in ("Sunday 12am - midnight", "Sunday midnight - 12am", "Sunday 12:00 AM - 12 midnight",
                     "Sunday 12 midnight - 12:00 AM", "Mon-Fri 12am - midnight", "Daily: 12am - midnight"):
            with self.subTest(line=line):
                self.assertAllDayReview(hours_from_lines(["Hours", line]), line)
                self.assertAllDayReview(hours_from_lines([line]), line)

    def test_same_as_opening_hours_specification(self):
        spec = hours_from_jsonld([{"openingHoursSpecification": {
            "dayOfWeek": "Sunday", "opens": "00:00", "closes": "00:00"}}])
        self.assertAllDayReview(spec, "spec")
        for value in ("Su 12am-midnight", "Su midnight-12am", "Su 00:00-00:00"):
            with self.subTest(value=value):
                self.assertAllDayReview(hours_from_jsonld([{"openingHours": value}]), value)

    def test_real_midnight_closes_still_parse(self):
        self.assertEqual(hours_from_lines(["Thu 5pm - midnight"]).hours, {"thu": [["17:00", "24:00"]]})
        self.assertEqual(hours_from_lines(["Sat midnight - 6am"]).hours, {"sat": [["00:00", "06:00"]]})


class BusinessNameLabelTests(_Asserts):
    def test_a_name_that_contains_a_seasonal_word_is_not_seasonal(self):
        for label in ("Summerfield Dental hours:", "Temple Barber hours:", "Four Seasons Salon Hours:",
                      "Weatherford Tire Hours:", "Specialty Pharmacy Hours:", "Easterling Law Hours:",
                      "Maybank Office Hours:"):
            with self.subTest(label=label):
                self.assertHours([f"{label} Mon-Fri 8am-5pm"], NINE_TO_FIVE)
                self.assertHours([label, "Mon-Fri 8am-5pm"], NINE_TO_FIVE)

    def test_whole_seasonal_words_in_a_label_still_hold(self):
        for label in ("Summer Hours:", "Winter Store Hours:", "Temporary Hours:", "Holiday Hours:",
                      "Dec Hours:"):
            with self.subTest(label=label):
                self.assertSeasonal([f"{label} Mon-Fri 8am-5pm"])


class OrdinaryHoursStillPublishTests(_Asserts):
    def test_plain_weekly_text_hours(self):
        self.assertHours(["Mon-Fri 8:00 AM - 5:00 PM"], NINE_TO_FIVE)
        self.assertHours(["Hours", "Mon-Fri 8:00 AM - 5:00 PM"], NINE_TO_FIVE)
        self.assertHours(["Store Hours: Mon-Fri 8:00 AM - 5:00 PM", "Sat-Sun: Closed"],
                         dict(NINE_TO_FIVE, sat=[], sun=[]))
        self.assertHours(["Hours of Operation", "Mon-Fri 8am-5pm", "Closed on major holidays"], NINE_TO_FIVE)

    def test_schema_org_opening_hours(self):
        result = hours_from_jsonld([{"openingHours": "Mo-Fr 08:00-17:00"}])
        self.assertEqual((result.hours, result.issues), (NINE_TO_FIVE, []))
        result = hours_from_jsonld([{"openingHours": ["Mo-Fr 08:00-17:00", "Sa 09:00-12:00"]}])
        self.assertEqual(result.hours, dict(NINE_TO_FIVE, sat=[["09:00", "12:00"]]))
        self.assertEqual(result.issues, [])


class GoLiveHours2WorkerTest(round1.GoLiveHoursWorkerTest):
    """End to end through the worker: these pages write no hours fact and open a review item."""

    # Run only this class's tests here; the inherited ones run in test_golive_hours.
    test_holiday_banner_is_not_published_as_weekly_hours = None
    test_holiday_heading_over_an_office_hours_label_is_not_published = None
    test_seasonal_copy_higher_on_the_page_does_not_hold_regular_hours = None
    test_jsonld_00_00_is_not_published_as_open_24_hours = None

    def assertHeldSeasonal(self, body):
        bid = self.home(body=body)
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertIn("seasonal_hours", result.hours.issues)
        self.assertHeldForReview(bid, "seasonal_hours")

    def test_holiday_heading_with_sentences_before_the_rows(self):
        self.assertHeldSeasonal("<h2>Holiday Hours</h2><p>We want to thank every customer for a wonderful year.</p>"
                                "<p>Our team is taking a short break to rest and recharge.</p>"
                                "<p>Online orders placed during the break ship when we return.</p>"
                                "<ul><li>Thursday: Closed</li><li>Friday: Closed</li></ul>")

    def test_abbreviated_month_range(self):
        self.assertHeldSeasonal("<h2>Garden Center</h2><p>Open Mar. - Oct.</p><p>Mon - Sun: 9am - 6pm</p>"
                                "<p>Store Hours</p>")

    def test_sentence_heading(self):
        # The worker reads text hours only from a page that says "hours" somewhere.
        self.assertHeldSeasonal("<h2>Hours</h2><h3>Summer schedule now in effect!</h3><p>Mon - Thu: 7am - 5pm</p>"
                                "<p>Fri: 7am - 11am</p>")

    def test_holiday_line_after_closed_rows(self):
        self.assertHeldSeasonal("<h3>Hours</h3><p>Thursday: Closed<br>Friday: Closed</p>"
                                "<p><em>Happy Thanksgiving!</em></p>")

    def test_midnight_words(self):
        bid = self.home(body="<h3>Hours</h3><p>Sunday: 12am - midnight</p>")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertHeldForReview(bid, "ambiguous_all_day")

    def test_ordinary_hours_publish(self):
        bid = self.home(body="<h3>Summerfield Dental hours:</h3><p>Mon - Fri 8:00 AM - 5:00 PM</p>")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.hours.issues, [])
        self.assertEqual(self.value(bid, "hours"), NINE_TO_FIVE)
        self.assertEqual(self.reviews(bid, "seasonal_hours"), [])


if __name__ == "__main__":
    unittest.main()
