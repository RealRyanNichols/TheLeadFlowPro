"""Go-live regression tests for the website worker: out-of-area phones and careers pages.

* A phone outside 903/430 goes to review even when a TABC, NPI, or OSM record
  has the same number, and never costs the site its own local number (c9, c16).
* Payroll/HR logins and a contractor's "Job Gallery" or "Job Pics" are not
  careers pages, while "Career Portal" or "Now hiring: Project Manager" still
  are (c17). A "/#careers", "/index.html#careers", or "/about#careers" anchor
  never makes the page it lands on the careers page or has roles read from it
  (c18).

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
    DENTAL = "https://www.examplefamilydental.example/"
    BOTH = ('<p>Call <a href="tel:+19035550120">(903) 555-0120</a> or toll free'
            ' <a href="tel:+18005550160">(800) 555-0160</a></p>')

    def add_insurance(self, slug: str = "example-insurance-agency") -> int:
        return self.add("Example Insurance Agency", self.INSURANCE, street="88 Placeholder Dr Ste 5",
                        naics="524210", slug=slug)

    def test_choose_phone_flags_a_known_number_outside_903_430(self):
        f = worker.Found
        dallas = f("+12145550142", "tel_link", 0.95, "u")
        longview = f("+19035550120", "text", 0.8, "u")
        longview_2 = f("+19035550130", "tel_link", 0.95, "u")
        tollfree = f("+18005550160", "tel_link", 0.95, "u")
        local_430 = f("+14305550120", "tel_link", 0.95, "u")
        self.assertEqual(worker.choose_phone([dallas], "+12145550142"), (dallas, "phone_out_of_area"))
        self.assertEqual(worker.choose_phone([dallas, tollfree], "+18005550160"), (tollfree, "phone_out_of_area"))
        # The record's toll-free number never wins over the site's local one: the
        # local one is chosen as if there were no record.
        self.assertEqual(worker.choose_phone([longview, tollfree], "+18005550160"), (longview, None))
        self.assertEqual(worker.choose_phone([tollfree, longview], "+18005550160"), (longview, None))
        self.assertEqual(worker.choose_phone([tollfree, longview, longview_2], "+18005550160"),
                         (longview, "multiple_phones"))
        self.assertEqual(worker.choose_phone([tollfree, longview, longview_2], "+18005550160", ["+19035550130"]),
                         (longview_2, None))
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

    def test_record_toll_free_number_does_not_replace_the_local_one(self):
        # The site's own local number is used, as it is with no record; the
        # toll-free number is kept as an observation only.
        bid = self.add("Example Family Dental", self.DENTAL, naics="621210")
        b.add_record(self.conn, bid, "osm", phone="+18005550160")
        self.web.override(self.DENTAL, 200, None, _page("Example Family Dental", self.BOTH))
        for _ in range(2):
            _, outcome = self.crawl(bid)
            self.assertEqual(outcome, "ok")
            self.assertEqual(self.value(bid, "phone"), "+19035550120")
            self.assertEqual(self.reviews(bid), [])
            self.later(31)
        profile = publish.business_profile(self.conn, self.settings, self.row(bid))
        self.assertEqual(profile["phone"]["e164"], "+19035550120")

    def test_rejected_record_number_does_not_cost_the_site_its_local_number(self):
        # The site first lists only the record's toll-free number: review, and a
        # person rejects it. Once the site lists a local number, that is used.
        bid = self.add("Example Family Dental", self.DENTAL, naics="621210")
        b.add_record(self.conn, bid, "osm", phone="+18005550160")
        self.web.override(self.DENTAL, 200, None, _page(
            "Example Family Dental", '<p>Toll free <a href="tel:+18005550160">(800) 555-0160</a></p>'))
        self.crawl(bid)
        facts.reject_review(self.conn, self.reviews(bid, "phone_out_of_area")[0]["id"], "ryan")
        self.later(31)
        self.web.override(self.DENTAL, 200, None, _page("Example Family Dental", self.BOTH))
        self.crawl(bid)
        self.assertEqual(self.value(bid, "phone"), "+19035550120")
        self.assertEqual([(i["kind"], i["status"]) for i in self.reviews(bid)], [("phone_out_of_area", "rejected")])

    def test_accepted_out_of_area_number_meets_a_new_local_number_once(self):
        # A person accepted the toll-free number; the site then adds a local one:
        # one field_conflict, never queued again after the person decides.
        bid = self.add("Example Family Dental", self.DENTAL, naics="621210")
        self.web.override(self.DENTAL, 200, None, _page(
            "Example Family Dental", '<p>Toll free <a href="tel:+18005550160">(800) 555-0160</a></p>'))
        self.crawl(bid)
        facts.accept_review(self.conn, self.reviews(bid, "phone_out_of_area")[0]["id"], "ryan")
        self.later(31)
        self.crawl(bid)
        self.assertEqual(len(self.reviews(bid)), 1)  # confirmed, not queued again
        self.web.override(self.DENTAL, 200, None, _page("Example Family Dental", self.BOTH))
        self.later(31)
        self.crawl(bid)
        conflicts = self.reviews(bid, "field_conflict")
        self.assertEqual([json.loads(i["proposed_json"]) for i in conflicts], ["+19035550120"])
        self.assertEqual(self.value(bid, "phone"), "+18005550160")
        facts.reject_review(self.conn, conflicts[0]["id"], "ryan")
        self.later(31)
        self.crawl(bid)
        self.assertEqual(len(self.reviews(bid)), 2)
        self.assertEqual(self.value(bid, "phone"), "+18005550160")

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

    def test_payroll_suite_pages_other_than_recruiting_are_not_careers_pages(self):
        # Link text alone does not make a payroll/HR suite's login a careers page.
        self.assertEqual(links_of(anchors([
            ("https://workforcenow.adp.com/", "Employment Portal"),
            ("https://workforcenow.adp.com/workforcenow/", "Employment"),
            ("https://samplebrand.bamboohr.com/employees/", "Positions"),
            ("https://samplebrand.bamboohr.com/", "Careers"),
            ("https://www.paycomonline.net/", "Now hiring"),
            ("/employee-portal", "Employee Portal"),
            ("/careers/staff-portal", "Staff Portal"),
            ("/careers/team-member-access", "Team Member Access"),
            ("/jobs/employee-center", "Employee Center"),
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
            ("/job-pics", "Job Pics"),
            ("/job-images", "Job Images"),
            ("/job-videos", "Job Videos"),
            ("/job-showcase", "Job Showcase"),
            ("/jobs-weve-done", "Jobs We've Done"),
            ("/jobs-done", "Jobs Done"),
            ("/finished-jobs", "Finished Jobs"),
            ("/previous-jobs", "Previous Jobs"),
        ]), "https://www.oakridgeroofing.example/"), [])

    def test_portal_payroll_and_project_words_do_not_hide_real_careers_links(self):
        # Each is a real careers link; "portal", "payroll", "project", or "recent"
        # in it is not a login or a portfolio.
        for href, text in (
            ("https://recruiting.paylocity.com/recruiting/jobs/All/abc/Sample-Brand", "Career Portal"),
            ("https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=x", "Careers Portal"),
            ("https://recruiting.ultipro.com/SAM1000/JobBoard/abc", "Applicant Portal"),
            ("https://www.paycomonline.net/v4/ats/web.php/jobs?clientkey=ABC", "Job Portal"),
            (HOME + "careers", "Career Portal"),
            (HOME + "careers", "Visit our careers portal"),
            (HOME + "careers-portal", "Careers"),
            (HOME + "careers/payroll-specialist", "Now hiring: Payroll Specialist"),
            (HOME + "jobs/project-manager", "Now hiring: Project Manager"),
            (HOME + "careers/project-coordinator", "Project Coordinator - apply"),
            (HOME + "careers", "Recent job openings"),
            (HOME + "careers/recent", "Careers"),
            (HOME + "careers/our-work-culture", "Careers"),
            (HOME + "jobs/photographer", "Photographer job opening"),
        ):
            with self.subTest(text=text, href=href):
                self.assertEqual(links_of(anchors([(href, text)])), [href])

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

    def test_index_file_anchor_is_the_same_page(self):
        # "index.html#careers" works from sub-pages too, so one-page sites use it.
        self.assertEqual(links_of(anchors([
            ("/index.html#careers", "Careers"), ("/index.php#careers", "Careers"),
            ("/index.htm#jobs", "Jobs"), ("/home#careers", "Careers"),
            ("/default.aspx#careers", "Careers"), ("/Index.HTML", "Jobs"),
        ])), [])
        self.assertEqual(careers._page_key(HOME + "index.html"), careers._page_key(HOME))
        self.assertEqual(careers._page_key(HOME + "longview/home"), careers._page_key(HOME + "longview/"))
        self.assertEqual(links_of(anchors([("/longview/index.html#careers", "Careers")]), HOME + "longview/"), [])

    def test_section_of_another_page_is_not_a_careers_page(self):
        # A "#careers" section of the About page: the rest of that page is not about jobs.
        self.assertEqual(links_of(anchors([("/about#careers", "Careers"), ("/about-us/#jobs", "Jobs"),
                                           ("/contact?x=1#join", "Join our team")])), [])
        # A section of a page that is itself a careers page still counts.
        self.assertEqual(links_of(anchors([
            ("/careers#openings", "Careers"), ("/jobs.html#front-desk", "Front desk"),
            ("https://careers.samplebrand.example/#/jobs", "Jobs"),
        ])), [HOME + "careers", HOME + "jobs.html", "https://careers.samplebrand.example/"])
        # An applicant-tracking link's own "#" route is not a section of a page.
        self.assertEqual(links_of(anchors([("https://recruiting.paylocity.com/recruiting/jobs/All/abc#list",
                                            "Careers")])),
                         ["https://recruiting.paylocity.com/recruiting/jobs/All/abc"])

    def test_link_fragment_flag(self):
        page = parse_page(anchors([("/about#careers", "A"), ("/about#", "B"), ("/about", "C"),
                                   ("/about#careers", "Careers"), ("/about", "Careers")]), HOME)
        self.assertEqual([(link.text, link.fragment) for link in page.links],
                         [("A", True), ("B", False), ("C", False), ("Careers", True), ("Careers", False)])


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

    def test_job_pics_and_jobs_done_are_not_the_careers_page(self):
        for index, (path, text) in enumerate((("job-pics", "Job Pics"), ("jobs-weve-done", "Jobs We've Done"),
                                              ("finished-jobs", "Finished Jobs"))):
            with self.subTest(text=text):
                bid = self.add("Oak Ridge Roofing", self.ROOFER, street="410 Sample Ln", naics="238160",
                               slug=f"oak-ridge-roofing-{index}")
                self.web.override(self.ROOFER, 200, None, _page("Oak Ridge Roofing", self.PHONE + (
                    f'<nav><a href="/{path}">{text}</a></nav>')))
                self.web.override(self.ROOFER + path, 200, None, _page(
                    text, "<p>Our front desk team photographed every roof.</p>"))
                result, outcome = self.crawl(bid)
                self.assertEqual(outcome, "ok")
                self.assertIn(self.ROOFER + path, result.fetched_urls)
                self.assert_not_hiring(bid, result)

    def test_career_portal_and_project_manager_opening_still_count(self):
        bid = self.add("Pinecrest Clinic", self.CLINIC, street="12 Sample Rd", naics="621111")
        self.web.override(self.CLINIC, 200, None, _page("Pinecrest Clinic", self.PHONE + (
            '<nav><a href="/careers">Career Portal</a></nav>')))
        self.web.override(self.CLINIC + "careers", 200, None, _page(
            "Careers", "<p>Now hiring: receptionist, part-time.</p>"))
        result, _ = self.crawl(bid)
        self.assertEqual((result.careers_url, result.roles), (self.CLINIC + "careers", ["receptionist"]))
        self.assertEqual(publish.business_profile(self.conn, self.settings, self.row(bid))["hiringRoles"],
                         ["receptionist"])

        roofer = self.add("Oak Ridge Roofing", self.ROOFER, street="410 Sample Ln", naics="238160")
        self.web.override(self.ROOFER, 200, None, _page("Oak Ridge Roofing", self.PHONE + (
            '<p><a href="/jobs/project-manager">Now hiring: Project Manager</a></p>')))
        self.web.override(self.ROOFER + "jobs/project-manager", 200, None, _page(
            "Project Manager", "<p>Now hiring a project manager, full-time.</p>"))
        result, _ = self.crawl(roofer)
        self.assertEqual(result.careers_url, self.ROOFER + "jobs/project-manager")
        self.assertEqual(publish.business_profile(self.conn, self.settings, self.row(roofer))["careersUrl"],
                         self.ROOFER + "jobs/project-manager")

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

    ONE_PAGE = ("<p>Please call our front desk.</p><p>Our medical assistants will take your vitals.</p>"
                '<h2 id="careers">Careers</h2><p>We are not hiring at this time.</p>')

    def test_index_file_careers_anchor_on_a_one_page_site(self):
        # The server gives the same one-page document at its index file.
        for index, href in enumerate(("/index.html#careers", "/index.php#careers", "/index.htm#careers",
                                      "/home#careers", "/default.aspx#careers")):
            with self.subTest(href=href):
                bid = self.add("Pinecrest Clinic", self.CLINIC, street="12 Sample Rd", naics="621111",
                               slug=f"pinecrest-clinic-{index}")
                body = _page("Pinecrest Clinic", self.PHONE + f'<nav><a href="{href}">Careers</a></nav>'
                             + self.ONE_PAGE)
                self.web.override(self.CLINIC, 200, None, body)
                self.web.override(self.CLINIC + href[1:].split("#")[0], 200, None, body)
                result, outcome = self.crawl(bid)
                self.assertEqual(outcome, "ok")
                self.assert_not_hiring(bid, result)

    def test_page_served_with_the_home_page_content_is_the_home_page(self):
        # A one-page theme answers "/careers" with the home document itself.
        bid = self.add("Pinecrest Clinic", self.CLINIC, street="12 Sample Rd", naics="621111")
        body = _page("Pinecrest Clinic", self.PHONE + '<nav><a href="/careers">Careers</a></nav>' + self.ONE_PAGE)
        self.web.override(self.CLINIC, 200, None, body)
        self.web.override(self.CLINIC + "careers", 200, None, body)
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertIn(self.CLINIC + "careers", result.fetched_urls)
        self.assert_not_hiring(bid, result)

    def test_careers_section_of_the_about_page_is_not_the_careers_page(self):
        bid = self.add("Pinecrest Clinic", self.CLINIC, street="12 Sample Rd", naics="621111")
        self.web.override(self.CLINIC, 200, None, _page("Pinecrest Clinic", self.PHONE + (
            '<nav><a href="/about">About</a><a href="/about#careers">Careers</a></nav>')))
        self.web.override(self.CLINIC + "about", 200, None, _page("About Pinecrest Clinic", (
            "<p>Our receptionist greets you and our medical assistants take vitals.</p>"
            '<h2 id="careers">Careers</h2><p>We are not hiring at this time.</p>')))
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertIn(self.CLINIC + "about", result.fetched_urls)
        self.assert_not_hiring(bid, result)

    def test_a_section_of_the_careers_page_still_counts(self):
        bid = self.add("Pinecrest Clinic", self.CLINIC, street="12 Sample Rd", naics="621111")
        self.web.override(self.CLINIC, 200, None, _page("Pinecrest Clinic", self.PHONE + (
            '<nav><a href="/careers#openings">Careers</a></nav><p>Please call our front desk.</p>')))
        self.web.override(self.CLINIC + "careers", 200, None, _page(
            "Careers", '<h2 id="openings">Openings</h2><p>Now hiring: receptionist, part-time.</p>'))
        result, _ = self.crawl(bid)
        self.assertEqual((result.careers_url, result.roles), (self.CLINIC + "careers", ["receptionist"]))

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
