"""Go-live regression tests for the website worker: out-of-area phones and careers pages.

* A phone outside 903/430 goes to review even when a TABC, NPI, or OSM record
  has the same number (c9, c16).
* Payroll/HR logins and a contractor's "Job Gallery" are not careers pages
  (c17), and a "/#careers" anchor never makes the home page the careers page
  or has roles read from it (c18).

Fictional ``.example`` sites and 555-01xx phones only; no network.

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_worker -v
"""

from __future__ import annotations

import json
import unittest

from longview_archive import facts, publish, worker
from longview_archive.extract import careers
from longview_archive.extract.html import parse_page
from tests.fixtures import builders as b
from tests.test_worker import WorkerCase, _page

HOME = "https://www.samplebrand.example/"


def links_of(html: str, url: str = HOME) -> list:
    return careers.careers_links(parse_page(html, url))


def anchors(pairs) -> str:
    return "".join(f'<a href="{href}">{text}</a>' for href, text in pairs)


# ---------------------------------------------------------------- c9, c16: phones

class KnownOutOfAreaPhoneTest(WorkerCase):
    INSURANCE = "https://www.insurance.example/"  # lists only (214) 555-0142

    def add_insurance(self, slug: str = "example-insurance-agency") -> int:
        return self.add("Example Insurance Agency", self.INSURANCE, street="88 Placeholder Dr Ste 5",
                        naics="524210", slug=slug)

    def test_choose_phone_flags_a_known_number_outside_903_430(self):
        f = worker.Found
        dallas = f("+12145550142", "tel_link", 0.95, "u")
        longview = f("+19035550120", "text", 0.8, "u")
        tollfree = f("+18005550160", "tel_link", 0.95, "u")
        local_430 = f("+14305550120", "tel_link", 0.95, "u")
        self.assertEqual(worker.choose_phone([dallas], "+12145550142"), (dallas, "phone_out_of_area"))
        # The record's toll-free number never quietly wins over the site's local one.
        self.assertEqual(worker.choose_phone([longview, tollfree], "+18005550160"),
                         (tollfree, "phone_out_of_area"))
        self.assertEqual(worker.choose_phone([tollfree, longview], "+19035550120"), (longview, None))
        self.assertEqual(worker.choose_phone([local_430], "+14305550120"), (local_430, None))

    def test_record_with_the_same_out_of_area_number_is_not_an_exemption(self):
        for source in ("tx_tabc", "npi", "osm"):
            with self.subTest(source=source):
                bid = self.add_insurance(f"example-insurance-agency-{source}")
                b.add_record(self.conn, bid, source, phone="+12145550142")
                self.assertEqual(self.snap(bid).phone, "+12145550142")
                _, outcome = self.crawl(bid)
                self.assertEqual(outcome, "ok")
                self.assertIsNone(facts.get_fact(self.conn, bid, "phone"))
                items = self.reviews(bid, "phone_out_of_area")
                self.assertEqual(len(items), 1)
                self.assertEqual(json.loads(items[0]["proposed_json"]), "+12145550142")
                profile = publish.business_profile(self.conn, self.settings, self.row(bid))
                self.assertIsNone(profile["phone"])

    def test_record_toll_free_number_does_not_replace_the_local_one_unreviewed(self):
        site = "https://www.examplefamilydental.example/"
        bid = self.add("Example Family Dental", site, naics="621210")
        b.add_record(self.conn, bid, "osm", phone="+18005550160")
        self.web.override(site, 200, None, _page(
            "Example Family Dental",
            '<p>Call <a href="tel:+19035550120">(903) 555-0120</a> or toll free'
            ' <a href="tel:+18005550160">(800) 555-0160</a></p>'))
        self.crawl(bid)
        self.assertIsNone(facts.get_fact(self.conn, bid, "phone"))
        items = self.reviews(bid, "phone_out_of_area")
        self.assertEqual([json.loads(i["proposed_json"]) for i in items], ["+18005550160"])

    def test_number_a_person_accepted_is_confirmed_on_revisit_not_queued_again(self):
        bid = self.add_insurance()
        b.add_record(self.conn, bid, "tx_tabc", phone="+12145550142")
        self.crawl(bid)
        item = self.reviews(bid, "phone_out_of_area")[0]
        facts.accept_review(self.conn, item["id"], "ryan")
        self.assertEqual(self.value(bid, "phone"), "+12145550142")
        self.later(31)
        _, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(self.value(bid, "phone"), "+12145550142")
        self.assertEqual([(i["kind"], i["status"]) for i in self.reviews(bid)],
                         [("phone_out_of_area", "accepted")])


# ---------------------------------------------------------------- c17, c18: careers links

class CareersLinksTest(unittest.TestCase):
    def test_payroll_and_hr_logins_are_not_careers_pages(self):
        self.assertEqual(links_of(anchors([
            ("https://www.paycomonline.net/v4/ee/web.php/app/login", "Employee Login"),
            ("https://www.paycomonline.net/v4/ee/web.php/app/login", "Careers"),
            ("https://workforcenow.adp.com/workforcenow/login.html", "Employee Portal"),
            ("https://access.paylocity.com/", "Payroll by Paylocity"),
            ("https://access.paylocity.com/", "Careers"),
            ("https://login.ultipro.com/", "UKG Login"),
            ("https://login.ultipro.com/", "Careers"),
            ("https://www.dayforcehcm.com/mydayforce/login.aspx", "Dayforce"),
            ("https://www.bamboohr.com/", "HR software by BambooHR"),
            ("https://samplebrand.bamboohr.com/login.php", "BambooHR login"),
            ("https://www.indeed.com/cmp/Sample-Brand", "Find us on Indeed"),
            ("https://www.indeed.com/cmp/Sample-Brand/reviews", "Reviews on Indeed"),
            ("/employee-login", "Employee Login"),
            ("/jobs/login", "Team Login"),
            ("/employment-verification", "Employment Verification"),
        ])), [])

    def test_contractor_portfolio_is_not_a_careers_page(self):
        self.assertEqual(links_of(anchors([
            ("/job-gallery/", "Job Gallery"),
            ("/our-jobs", "Our Jobs"),
            ("/recent-jobs", "Recent Jobs"),
            ("/completed-jobs", "Completed Jobs"),
            ("/job-photos", "Job Photos"),
            ("/jobs", "Past Jobs"),
            ("/portfolio/jobs", "Jobs"),
            ("/project-gallery", "Project Gallery"),
        ]), "https://www.oakridgeroofing.example/"), [])

    def test_real_careers_and_recruiting_links_are_still_found(self):
        keep = [
            (HOME + "careers", "Careers"),
            (HOME + "now-hiring", "Now hiring: $500 sign-on bonus"),
            (HOME + "jobs/front-desk", "Front desk opening"),
            ("https://careers.samplebrand.example/", "Careers"),
            ("https://www.paycomonline.net/v4/ats/web.php/jobs?clientkey=ABC", "Click here"),
            ("https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=x", "See openings"),
            ("https://recruiting.paylocity.com/recruiting/jobs/All/abc/Sample", "Now hiring"),
            ("https://recruiting.ultipro.com/SAM1000/JobBoard/abc", "Work here"),
            ("https://jobs.dayforcehcm.com/en-US/sample/CANDIDATEPORTAL", "Current openings"),
            ("https://jobs.lever.co/samplebrand", "Lever"),
            ("https://jobs.lever.co/oak-ridge-projects", "Lever"),  # a portfolio word in a job board's slug
            ("https://samplebrand.bamboohr.com/careers", "BambooHR"),
            ("https://www.indeed.com/cmp/Sample-Brand/jobs", "See us on Indeed"),
            ("https://samplebrand.applytojob.com/apply", "Apply Now"),
        ]
        self.assertEqual(links_of(anchors(keep)), [url for url, _ in keep])

    def test_same_page_anchor_is_not_a_careers_page(self):
        # html.py drops "#careers" and "#jobs", so these links point back at the page itself.
        self.assertEqual(links_of(anchors([("/#careers", "Careers"), (HOME + "#jobs", "Jobs"),
                                           ("/?utm_source=nav#careers", "Careers")])), [])
        self.assertEqual(links_of(anchors([("/about#careers", "Careers"), ("/about/", "Jobs")]),
                                  HOME + "about"), [])


# ---------------------------------------------------------------- c17, c18: the visit

class CareersVisitTest(WorkerCase):
    ROOFER = "https://www.autoglass.example/"
    CLINIC = "https://www.examplefamilydental.example/"
    PHONE = '<p><a href="tel:+19035550150">(903) 555-0150</a></p>'

    def assert_not_hiring(self, bid: int, result) -> None:
        self.assertIsNone(result.careers_url)
        self.assertIsNone(result.roles)
        self.assertIsNone(facts.get_fact(self.conn, bid, "careers"))
        self.assertIsNone(self.conn.execute("SELECT 1 FROM hiring_signals WHERE business_id=?", (bid,)).fetchone())
        profile = publish.business_profile(self.conn, self.settings, self.row(bid))
        self.assertIsNone(profile["careersUrl"])
        self.assertEqual(profile["hiringRoles"], [])

    def test_employee_login_footer_gives_no_hiring_badge(self):
        bid = self.add("Pinecrest Tire", self.ROOFER, street="410 Sample Ln")
        self.web.override(self.ROOFER, 200, None, _page("Pinecrest Tire", self.PHONE + (
            '<footer><a href="https://www.paycomonline.net/v4/ee/web.php/app/login">Employee Login</a>'
            '<a href="https://workforcenow.adp.com/workforcenow/login.html">Team Login</a></footer>')))
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assert_not_hiring(bid, result)

    def test_job_gallery_is_not_the_careers_page(self):
        bid = self.add("Oak Ridge Roofing", self.ROOFER, street="410 Sample Ln", naics="238160")
        self.web.override(self.ROOFER, 200, None, _page("Oak Ridge Roofing", self.PHONE + (
            '<nav><a href="/job-gallery/">Job Gallery</a><a href="/our-jobs">Our Jobs</a></nav>')))
        self.web.override(self.ROOFER + "job-gallery/", 200, None, _page(
            "Job Gallery", "<p>Our front desk team photographed every roof.</p>"))
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assert_not_hiring(bid, result)

    def test_one_page_careers_anchor_does_not_make_the_home_page_the_careers_page(self):
        bid = self.add("Pinecrest Clinic", self.CLINIC, street="12 Sample Rd", naics="621111")
        self.web.override(self.CLINIC, 200, None, _page("Pinecrest Clinic", self.PHONE + (
            '<nav><a href="/#careers">Careers</a><a href="https://www.examplefamilydental.example/#jobs">Jobs</a>'
            '<a href="/about">About</a></nav>'
            "<p>Please call our front desk.</p><p>Our medical assistants will take your vitals.</p>"
            '<h2 id="careers">Careers</h2><p>We are not hiring at this time.</p>')))
        # A sub-page's anchors: to its own section, and back to the home page's.
        self.web.override(self.CLINIC + "about", 200, None, _page("About Pinecrest Clinic", (
            '<a href="/about#careers">Careers</a><a href="/#careers">Join our team</a>'
            "<p>Our receptionist greets you.</p>")))
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertIn(self.CLINIC + "about", result.fetched_urls)
        self.assert_not_hiring(bid, result)

    def test_careers_anchor_to_the_site_root_from_a_location_home_page(self):
        home = self.CLINIC + "longview"
        bid = self.add("Pinecrest Clinic", home, street="12 Sample Rd", naics="621111")
        self.web.override(home, 200, None, _page("Pinecrest Clinic Longview", self.PHONE + (
            '<nav><a href="/#careers">Careers</a></nav>')))
        self.web.override(self.CLINIC, 200, None, _page("Pinecrest Clinic", (
            "<p>Check in at our front desk; our receptionist will get you set up.</p>")))
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assert_not_hiring(bid, result)

    def test_a_real_careers_page_still_counts(self):
        bid = self.add("Pinecrest Clinic", self.CLINIC, street="12 Sample Rd", naics="621111")
        self.web.override(self.CLINIC, 200, None, _page("Pinecrest Clinic", self.PHONE + (
            '<nav><a href="/#careers">Careers</a><a href="/careers">Careers</a></nav>'
            "<p>Please call our front desk.</p>")))
        self.web.override(self.CLINIC + "careers", 200, None, _page(
            "Careers", "<p>Now hiring: receptionist, part-time.</p>"))
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.careers_url, self.CLINIC + "careers")
        self.assertEqual(result.roles, ["receptionist"])
        profile = publish.business_profile(self.conn, self.settings, self.row(bid))
        self.assertEqual(profile["careersUrl"], self.CLINIC + "careers")


if __name__ == "__main__":
    unittest.main()
