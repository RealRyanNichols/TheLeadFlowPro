"""Strict hours parser: every supported format, JSON-LD variants, and every issue path."""

import unittest

from longview_archive.extract.hours import HoursResult, hours_from_jsonld, hours_from_lines

WEEKDAYS = ("mon", "tue", "wed", "thu", "fri")
ALL_DAYS = WEEKDAYS + ("sat", "sun")


def same(days, ranges):
    return {day: [list(r) for r in ranges] for day in days}


class TextFormatTests(unittest.TestCase):
    def assertHours(self, lines, expected):
        result = hours_from_lines(lines)
        self.assertEqual(result.issues, [], lines)
        self.assertEqual(result.hours, expected, lines)
        self.assertEqual(result.confidence, 0.85)

    def test_long_day_range_with_colon(self):
        self.assertHours(["Monday - Friday: 8:00 AM - 5:30 PM"], same(WEEKDAYS, [["08:00", "17:30"]]))

    def test_en_dash_short_days_compact_times(self):
        self.assertHours(["Mon–Fri 8am–5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_em_dash(self):
        self.assertHours(["Mon—Fri 8am—5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_single_letter_days_and_a_p_suffix(self):
        self.assertHours(["M-F 8:00a-5:00p"], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_saturday_to_noon_pm(self):
        self.assertHours(["Sat 9am-12pm"], {"sat": [["09:00", "12:00"]]})

    def test_explicit_closed_day(self):
        self.assertHours(["Sunday: Closed"], {"sun": []})

    def test_day_list_with_spaced_ampm(self):
        self.assertHours(["Tue, Thu 10 AM – 6 PM"], same(("tue", "thu"), [["10:00", "18:00"]]))

    def test_two_segments_on_one_line_with_noon(self):
        expected = same(("mon", "tue", "wed", "thu"), [["07:30", "16:30"]])
        expected["fri"] = [["07:30", "12:00"]]
        self.assertHours(["Mon-Thu 7:30am - 4:30pm; Fri 7:30am - noon"], expected)

    def test_open_24_hours(self):
        self.assertHours(["Open 24 hours"], same(ALL_DAYS, [["00:00", "24:00"]]))

    def test_24_7(self):
        self.assertHours(["24/7"], same(ALL_DAYS, [["00:00", "24:00"]]))

    def test_days_open_24_hours(self):
        self.assertHours(["Mon-Fri: Open 24 hours"], same(WEEKDAYS, [["00:00", "24:00"]]))

    def test_overnight_close(self):
        self.assertHours(["Fri-Sat 4pm-2am"], same(("fri", "sat"), [["16:00", "02:00"]]))

    def test_midnight_close_is_24(self):
        self.assertHours(["Thu 5pm - midnight"], {"thu": [["17:00", "24:00"]]})

    def test_12am_close_is_24(self):
        self.assertHours(["Fri 6pm-12am"], {"fri": [["18:00", "24:00"]]})

    def test_midnight_open(self):
        self.assertHours(["Sat midnight - 6am"], {"sat": [["00:00", "06:00"]]})

    def test_noon_open(self):
        self.assertHours(["Sunday noon - 5 PM"], {"sun": [["12:00", "17:00"]]})

    def test_to_as_range_word(self):
        self.assertHours(["Monday through Friday 8 a.m. to 5 p.m."], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_24_hour_clock_is_accepted(self):
        self.assertHours(["Mon-Fri 08:00-17:00"], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_24_hour_clock_hour_over_12(self):
        self.assertHours(["Mo,We 10:00-14:00"], same(("mon", "wed"), [["10:00", "14:00"]]))

    def test_multiple_ranges_same_day(self):
        self.assertHours(["Monday 11am-2pm, 5pm-9pm"], {"mon": [["11:00", "14:00"], ["17:00", "21:00"]]})

    def test_table_rows(self):
        lines = ["Shop Hours", "Monday - Friday 8:00 AM - 5:30 PM", "Saturday 8:00 AM - 12:00 PM", "Sunday Closed"]
        expected = same(WEEKDAYS, [["08:00", "17:30"]])
        expected.update({"sat": [["08:00", "12:00"]], "sun": []})
        self.assertHours(lines, expected)

    def test_day_and_time_on_separate_lines(self):
        self.assertHours(["Hours", "Monday", "8:00 AM - 5:00 PM", "Sunday", "Closed"],
                         {"mon": [["08:00", "17:00"]], "sun": []})

    def test_weekdays_and_weekends(self):
        expected = same(WEEKDAYS, [["07:00", "18:00"]])
        expected.update({"sat": [], "sun": []})
        self.assertHours(["Weekdays 7am-6pm", "Weekends: Closed"], expected)

    def test_daily(self):
        self.assertHours(["Open daily 11am - 9pm"], same(ALL_DAYS, [["11:00", "21:00"]]))

    def test_value_before_days_inside_block(self):
        expected = same(("mon", "tue", "wed", "thu", "fri", "sat"), [["09:00", "17:00"]])
        expected["sun"] = []
        self.assertHours(["Mon-Sat 9am-5pm", "Closed Sundays"], expected)

    def test_label_with_inline_hours(self):
        self.assertHours(["Store Hours: Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_leading_prose_words(self):
        self.assertHours(["We are open Mon-Fri 8am-5pm"], same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_wraparound_day_range(self):
        self.assertHours(["Fri-Mon 10am-4pm"], same(("fri", "sat", "sun", "mon"), [["10:00", "16:00"]]))

    def test_repeated_identical_block_is_not_a_conflict(self):
        lines = ["Mon-Fri 8am-5pm", "Contact us today", "Mon-Fri 8am-5pm"]
        self.assertHours(lines, same(WEEKDAYS, [["08:00", "17:00"]]))

    def test_holiday_note_is_ignored(self):
        lines = ["Hours of Operation", "Mon-Sat 9am-6pm", "Closed on major holidays"]
        self.assertHours(lines, same(("mon", "tue", "wed", "thu", "fri", "sat"), [["09:00", "18:00"]]))

    def test_appointment_days_are_left_unstated(self):
        self.assertHours(["Mon-Fri 8am-5pm, Sat by appointment"], same(WEEKDAYS, [["08:00", "17:00"]]))


class NeverAssumeTests(unittest.TestCase):
    def test_unstated_days_are_absent_not_closed(self):
        result = hours_from_lines(["Mon-Fri 8am-5pm"])
        self.assertEqual(set(result.hours), set(WEEKDAYS))
        self.assertNotIn("sat", result.hours)
        self.assertNotIn("sun", result.hours)

    def test_closed_only_when_said(self):
        result = hours_from_lines(["Saturday 9am-1pm", "Sunday: Closed"])
        self.assertEqual(result.hours, {"sat": [["09:00", "13:00"]], "sun": []})

    def test_no_hours_on_page(self):
        result = hours_from_lines(["Welcome to Example Tire & Lube", "Call (903) 555-0100", "Open Mon-Sat"])
        self.assertEqual(result, HoursResult(None, [], 0.0))

    def test_empty_input(self):
        self.assertEqual(hours_from_lines([]), HoursResult(None, [], 0.0))
        self.assertEqual(hours_from_jsonld([]), HoursResult(None, [], 0.0))

    def test_prose_with_day_name_and_no_times_is_ignored(self):
        result = hours_from_lines(["Sunday brunch is our favorite meal", "Mon-Fri 8am-5pm"])
        self.assertEqual(result.hours, same(WEEKDAYS, [["08:00", "17:00"]]))


class IssueTests(unittest.TestCase):
    def assertIssue(self, lines, issue):
        result = hours_from_lines(lines)
        self.assertIsNone(result.hours, lines)
        self.assertIn(issue, result.issues, lines)
        self.assertEqual(result.confidence, 0.0)

    def test_ambiguous_bare_numbers(self):
        self.assertIssue(["Mon - Fri 8-5"], "ambiguous_ampm")

    def test_ambiguous_colon_times(self):
        self.assertIssue(["Mon-Fri 8:00 - 5:00"], "ambiguous_ampm")

    def test_ambiguous_half_suffix(self):
        self.assertIssue(["Mon-Fri 8 - 5pm"], "ambiguous_ampm")

    def test_ambiguous_inside_otherwise_good_block(self):
        self.assertIssue(["Mon-Fri 8am-5pm", "Sat 9-12"], "ambiguous_ampm")

    def test_lunch_closure(self):
        self.assertIssue(["Hours", "Mon-Fri 8am-5pm", "Closed for lunch 12-1"], "lunch_break")

    def test_lunch_short_note(self):
        self.assertIssue(["Hours", "Mon-Fri 8am-5pm", "Lunch 12-1"], "lunch_break")

    def test_two_locations(self):
        lines = ["North location", "Mon-Fri 8am-5pm", "100 Example St", "Mon-Fri 9am-6pm"]
        self.assertIssue(lines, "multiple_blocks")

    def test_summer_and_winter(self):
        self.assertIssue(["Summer Hours", "Mon-Fri 7am-3pm", "Winter Hours", "Mon-Fri 8am-5pm"], "multiple_blocks")

    def test_office_and_kitchen(self):
        self.assertIssue(["Office Hours: Mon-Fri 8am-5pm", "Kitchen Hours: Mon-Fri 11am-9pm"], "multiple_blocks")

    def test_by_appointment_only(self):
        self.assertIssue(["Hours", "By appointment only"], "by_appointment")

    def test_call_for_appointment(self):
        self.assertIssue(["Hours", "Call to schedule an appointment"], "by_appointment")

    def test_conflicting_days(self):
        self.assertIssue(["Hours", "Monday 8am-5pm", "Monday 9am-5pm"], "conflicting_days")

    def test_conflicting_days_via_range(self):
        self.assertIssue(["Mon-Fri 8am-5pm", "Friday 8am-noon"], "conflicting_days")

    def test_unreadable_hours_line(self):
        self.assertIssue(["Sunday brunch 10am-2pm"], "unparsed")

    def test_times_without_days(self):
        self.assertIssue(["Hours", "8:00 AM - 5:00 PM"], "unparsed")


class JsonLdTests(unittest.TestCase):
    def test_specification_with_schema_urls(self):
        items = [{"@type": "AutoRepair", "openingHoursSpecification": [
            {"dayOfWeek": ["https://schema.org/Monday", "http://schema.org/Tuesday"], "opens": "08:00:00",
             "closes": "17:30:00"},
            {"dayOfWeek": "Saturday", "opens": "09:00", "closes": "12:00"},
        ]}]
        result = hours_from_jsonld(items)
        self.assertEqual(result.issues, [])
        self.assertEqual(result.confidence, 0.95)
        self.assertEqual(result.hours, {"mon": [["08:00", "17:30"]], "tue": [["08:00", "17:30"]],
                                        "sat": [["09:00", "12:00"]]})

    def test_specification_single_object_and_timezone(self):
        items = [{"openingHoursSpecification": {"dayOfWeek": "schema:Friday", "opens": "10:00:00-05:00",
                                                "closes": "22:00:00-05:00"}}]
        self.assertEqual(hours_from_jsonld(items).hours, {"fri": [["10:00", "22:00"]]})

    def test_all_day_23_59(self):
        items = [{"openingHoursSpecification": {"dayOfWeek": ["Saturday", "Sunday"], "opens": "00:00",
                                                "closes": "23:59"}}]
        self.assertEqual(hours_from_jsonld(items).hours, same(("sat", "sun"), [["00:00", "24:00"]]))

    def test_00_00_to_00_00_is_sent_to_review(self):
        # Publishers disagree whether this means open 24 hours or closed; never guess.
        items = [{"openingHoursSpecification": {"dayOfWeek": "Sunday", "opens": "00:00", "closes": "00:00"}}]
        result = hours_from_jsonld(items)
        self.assertIsNone(result.hours)
        self.assertEqual(result.issues, ["ambiguous_all_day"])

    def test_overnight_close_at_midnight(self):
        items = [{"openingHoursSpecification": {"dayOfWeek": "Friday", "opens": "17:00", "closes": "00:00"}}]
        self.assertEqual(hours_from_jsonld(items).hours, {"fri": [["17:00", "24:00"]]})

    def test_split_day_specs(self):
        items = [{"openingHoursSpecification": [
            {"dayOfWeek": "Monday", "opens": "08:00", "closes": "12:00"},
            {"dayOfWeek": "Monday", "opens": "13:00", "closes": "17:00"},
        ]}]
        self.assertEqual(hours_from_jsonld(items).hours, {"mon": [["08:00", "12:00"], ["13:00", "17:00"]]})

    def test_holiday_overrides_ignored(self):
        items = [{"openingHoursSpecification": [
            {"dayOfWeek": "Monday", "opens": "08:00", "closes": "17:00"},
            {"dayOfWeek": "Monday", "opens": "00:00", "closes": "00:00", "validFrom": "2026-12-25",
             "validThrough": "2026-12-25"},
        ]}]
        self.assertEqual(hours_from_jsonld(items).hours, {"mon": [["08:00", "17:00"]]})

    def test_opening_hours_strings(self):
        items = [{"openingHours": ["Mo-Fr 08:00-17:30", "Sa 09:00-12:00"]}]
        expected = same(WEEKDAYS, [["08:00", "17:30"]])
        expected["sat"] = [["09:00", "12:00"]]
        self.assertEqual(hours_from_jsonld(items).hours, expected)

    def test_opening_hours_day_list(self):
        self.assertEqual(hours_from_jsonld([{"openingHours": "Mo,We 10:00-14:00"}]).hours,
                         same(("mon", "wed"), [["10:00", "14:00"]]))

    def test_opening_hours_single_string_many_specs(self):
        result = hours_from_jsonld([{"openingHours": "Mo-Th 9:00-17:00 Fr 9:00-12:00"}])
        expected = same(("mon", "tue", "wed", "thu"), [["09:00", "17:00"]])
        expected["fri"] = [["09:00", "12:00"]]
        self.assertEqual(result.hours, expected)

    def test_opening_hours_days_without_time_is_review(self):
        result = hours_from_jsonld([{"openingHours": "Mo-Su"}])
        self.assertIsNone(result.hours)
        self.assertEqual(result.issues, ["unparsed"])

    def test_two_items_same_hours_merge(self):
        spec = {"dayOfWeek": "Monday", "opens": "08:00", "closes": "17:00"}
        items = [{"@type": "Organization", "openingHoursSpecification": spec},
                 {"@type": "LocalBusiness", "openingHours": "Mo 08:00-17:00"}]
        self.assertEqual(hours_from_jsonld(items).hours, {"mon": [["08:00", "17:00"]]})

    def test_two_items_different_hours_are_multiple_blocks(self):
        items = [{"openingHours": "Mo-Fr 08:00-17:00"}, {"openingHours": "Mo-Fr 09:00-18:00"}]
        result = hours_from_jsonld(items)
        self.assertIsNone(result.hours)
        self.assertEqual(result.issues, ["multiple_blocks"])

    def test_spec_and_string_disagree(self):
        items = [{"openingHoursSpecification": {"dayOfWeek": "Monday", "opens": "08:00", "closes": "17:00"},
                  "openingHours": "Mo 09:00-17:00"}]
        self.assertEqual(hours_from_jsonld(items).issues, ["conflicting_days"])

    def test_items_without_hours_and_junk(self):
        self.assertEqual(hours_from_jsonld([{"@type": "WebSite"}, "junk", None]), HoursResult(None, [], 0.0))


if __name__ == "__main__":
    unittest.main()
