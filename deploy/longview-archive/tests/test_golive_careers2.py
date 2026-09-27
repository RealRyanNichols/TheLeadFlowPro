"""Go-live round 2 regression tests for careers-page detection.

A careers page found on a business's own site becomes a public "Hiring" badge
and a "Longview is hiring" listing, published by auto-approve. So a same-site
link counts only on positive evidence: careers wording in its text, or a path
segment that is exactly a careers slug. A bare "job"/"jobs" inside longer text
("Featured Jobs", "Job Pix", "Jobs We Did") is not evidence and is not rescued
by a /jobs path. The old portfolio denylist and its bare-word vetoes ("ee",
"projects", "recent", "photos", "videos") are gone, which fixes the r2
regressions: a GUID containing "2ee1" and a "Project Manager" job link.

Fictional ``.example`` sites and 555-01xx phones only; no network.

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_careers2 -v
"""

from __future__ import annotations

import random
import unittest
import uuid

from longview_archive import publish
from longview_archive.extract import careers
from longview_archive.extract.html import parse_page
from tests.test_worker import WorkerCase, _page

HOME = "https://www.samplebrand.example/"
ROOFER = "https://www.oakridgeroofing.example/"


def links_of(html: str, url: str = HOME) -> list:
    return careers.careers_links(parse_page(html, url))


def anchor(href: str, text: str) -> str:
    return f'<a href="{href}">{text}</a>'


class PortfolioVariantsTest(unittest.TestCase):
    """r2 finding 1: a job word inside longer text is about jobs done, not jobs open."""

    VARIANTS = (
        ("/featured-jobs", "Featured Jobs"),
        ("/jobs", "Featured Jobs"),
        ("/job-pix", "Job Pix"),
        ("/jobs-we-did", "Jobs We Did"),
        ("/residential-jobs", "Residential Jobs"),
        ("/commercial-jobs", "Commercial Jobs"),
        ("/jobs", "Latest Jobs"),
        ("/jobs", "Residential Jobs"),
        ("/job-album", "Job Album"),
        ("/job-slideshow", "Job Slideshow"),
        ("/job-examples", "Job Examples"),
        ("/sample-jobs", "Sample Jobs"),
        ("/jobs/before-after", "Jobs Before/After"),
        ("/jobs?cat=gallery", "Gallery"),
        ("/jobs?cat=gallery", "Job Gallery"),
        ("/job-pics", "Job Pics"),
        ("/jobs-weve-done", "Jobs We've Done"),
        ("/finished-jobs", "Finished Jobs"),
        ("/job-gallery/", "Job Gallery"),
        ("/jobs", "Past Jobs"),
        ("/portfolio/jobs", "Jobs"),
        ("/gallery/careers", "Careers"),
        # By design, "<title> Jobs" is not evidence either: it reads exactly like
        # "Residential Jobs". A real opening says hiring, openings, positions, or
        # careers in its text, or sits under a careers path with a plain title.
        ("/jobs", "Project Manager Jobs"),
    )

    def test_variants_are_not_careers_pages(self):
        for href, text in self.VARIANTS:
            with self.subTest(text=text, href=href):
                self.assertEqual(links_of(anchor(href, text), ROOFER), [])

    def test_non_job_senses_of_careers_words_are_not_careers_pages(self):
        for href, text in (
            ("/practice-areas/employment-law", "Employment Law"),
            ("/apply", "Apply Now"),
            ("/finance/apply", "Apply Now"),
            ("/apply?type=employment", "Apply now"),
            ("/our-work", "Our Work"),
            ("/project-gallery", "Project Gallery"),
        ):
            with self.subTest(text=text, href=href):
                self.assertEqual(links_of(anchor(href, text)), [])


class GuidPathTest(unittest.TestCase):
    """r2 finding 2: a bare "ee" veto dropped recruiting URLs whose GUID has "2ee1" in it."""

    def test_guid_with_ee_on_ats_hosts_is_kept(self):
        for href in (
            "https://recruiting.paylocity.com/recruiting/jobs/All/9b4e2ee1-7c1a-4b1d-a2f1-3a5d7b9c0e2f/Sample-Brand",
            "https://jobs.lever.co/samplebrand/2ee0c1d4-1111-4222-8333-944455556666",
            "https://recruiting.ultipro.com/SAM1000/JobBoard/0ee41d2c-aaaa-4bbb-8ccc-ddddeeeeffff/",
            "https://recruiting.paylocity.com/recruiting/jobs/All/ee12ab34-0000-4000-8000-000000000000/Sample",
        ):
            with self.subTest(href=href):
                self.assertEqual(links_of(anchor(href, "Careers")), [href])

    def test_guid_with_ee_on_same_site_careers_url_is_kept(self):
        href = HOME + "careers/9b4e2ee1-7c1a-4b1d-a2f1-3a5d7b9c0e2f"
        self.assertEqual(links_of(anchor(href, "Front desk")), [href])
        self.assertEqual(links_of(anchor(HOME + "jobs/0ee4", "Receptionist")), [HOME + "jobs/0ee4"])

    def test_random_guids_are_never_dropped(self):
        rng = random.Random(20260927)
        for _ in range(500):
            guid = str(uuid.UUID(int=rng.getrandbits(128), version=4))
            for href in (f"https://recruiting.paylocity.com/recruiting/jobs/All/{guid}/Sample",
                         f"https://jobs.lever.co/samplebrand/{guid}",
                         f"https://recruiting.ultipro.com/SAM1000/JobBoard/{guid}/"):
                self.assertEqual(links_of(anchor(href, "Careers")), [href], href)

    def test_paycom_employee_area_is_still_a_login(self):
        for href, text in (
            ("https://www.paycomonline.net/v4/ee/web.php/app/login", "Careers"),
            ("https://www.paycomonline.net/v4/ee/ee-loginproxy.php", "Employee Login"),
            ("https://www.paycomonline.net/v4/ee/web.php", "Jobs"),
            ("/ee/", "Careers"),
        ):
            with self.subTest(href=href):
                self.assertEqual(links_of(anchor(href, text)), [])


class RealCareersLinksTest(unittest.TestCase):
    """r2 finding 3 and the positives that must keep working."""

    def test_project_manager_and_other_titles_under_a_careers_path(self):
        for href, text in (
            ("/jobs/project-manager", "Project Manager"),
            ("/jobs/video-editor", "Video Editor"),
            ("/careers/photographer", "Photographer"),
            ("/jobs", "Recent Job Postings"),
            ("/jobs", "Jobs: Project Manager"),
            ("/careers/recent", "Careers"),
            ("/careers/photos", "Careers"),
        ):
            with self.subTest(text=text, href=href):
                self.assertEqual(links_of(anchor(href, text)), [HOME + href[1:]])

    def test_career_portal(self):
        for href, text in (
            (HOME + "careers", "Career Portal"),
            (HOME + "careers-portal", "Careers"),
            ("https://recruiting.paylocity.com/recruiting/jobs/All/abc/Sample-Brand", "Career Portal"),
            ("https://recruiting.ultipro.com/SAM1000/JobBoard/abc", "Applicant Portal"),
        ):
            with self.subTest(text=text, href=href):
                self.assertEqual(links_of(anchor(href, text)), [href])

    def test_careers_phrases_in_link_text(self):
        for text in ("Careers", "Career Opportunities", "Employment", "Employment Opportunities",
                     "Job Openings", "Open Positions", "Current Openings", "Join Our Team", "Work With Us",
                     "We're Hiring!", "We’re hiring", "Now Hiring", "Jobs", "JOBS »", "Openings",
                     "Apply now for a job", "Apply for open positions", "Visit our careers portal",
                     "Now hiring: Payroll Specialist", "Photographer job opening"):
            with self.subTest(text=text):
                self.assertEqual(links_of(anchor("/team", text)), [HOME + "team"])

    def test_careers_slugs_in_the_path(self):
        for path in ("careers", "career", "jobs", "job-openings", "employment", "openings", "positions",
                     "join-our-team", "work-with-us", "hiring", "now-hiring", "careers/apply", "jobs/apply",
                     "about/careers", "careers.html", "Join_Our_Team", "employment/application.pdf"):
            with self.subTest(path=path):
                self.assertEqual(links_of(anchor("/" + path, "Details")), [HOME + path])

    def test_apply_slug_needs_a_job_word(self):
        self.assertEqual(links_of(anchor("/apply", "Apply for a job")), [HOME + "apply"])
        self.assertEqual(links_of(anchor("/apply", "Details")), [])

    def test_careers_subdomain_and_careers_page_sections(self):
        self.assertEqual(links_of(anchor("https://careers.samplebrand.example/#/jobs", "Jobs")),
                         ["https://careers.samplebrand.example/"])
        self.assertEqual(links_of(anchor("/careers#openings", "Front desk")), [HOME + "careers"])
        # A section of a page that is not a careers page is still not one.
        self.assertEqual(links_of(anchor("/about#careers", "Careers") + anchor("/#jobs", "Jobs")), [])

    def test_precise_exclusions_still_hold(self):
        for href, text in (
            ("/employee-login", "Employee Login"),
            ("/careers/staff-portal", "Staff Portal"),
            ("/employment-verification", "Employment Verification"),
            ("https://workforcenow.adp.com/workforcenow/login.html", "Careers"),
            ("https://login.ultipro.com/", "Careers"),
            ("https://samplebrand.bamboohr.com/login.php", "Careers"),
        ):
            with self.subTest(href=href):
                self.assertEqual(links_of(anchor(href, text)), [])


class CareersVisitTest(WorkerCase):
    SITE = "https://www.autoglass.example/"
    PHONE = '<p><a href="tel:+19035550150">(903) 555-0150</a></p>'

    def roofer(self, index: int, nav: str) -> int:
        bid = self.add("Oak Ridge Roofing", self.SITE, street="410 Sample Ln", naics="238160",
                       slug=f"oak-ridge-roofing-{index}")
        self.web.override(self.SITE, 200, None, _page("Oak Ridge Roofing", self.PHONE + f"<nav>{nav}</nav>"))
        return bid

    def test_portfolio_variants_give_no_hiring_badge(self):
        for index, (path, text) in enumerate((("featured-jobs", "Featured Jobs"), ("job-pix", "Job Pix"),
                                              ("jobs-we-did", "Jobs We Did"), ("residential-jobs", "Residential Jobs"),
                                              ("jobs", "Latest Jobs"), ("job-album", "Job Album"))):
            with self.subTest(text=text):
                bid = self.roofer(index, anchor("/" + path, text))
                self.web.override(self.SITE + path, 200, None, _page(text, "<p>New roof on Sample Ln.</p>"))
                result, outcome = self.crawl(bid)
                self.assertEqual(outcome, "ok")
                self.assertIsNone(result.careers_url)
                self.assertIsNone(publish.business_profile(self.conn, self.settings, self.row(bid))["careersUrl"])

    def test_project_manager_job_link_is_the_careers_page(self):
        bid = self.roofer(0, anchor("/jobs/project-manager", "Project Manager"))
        self.web.override(self.SITE + "jobs/project-manager", 200, None, _page(
            "Project Manager", "<p>Full-time project manager position. Apply today.</p>"))
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.careers_url, self.SITE + "jobs/project-manager")
        self.assertEqual(publish.business_profile(self.conn, self.settings, self.row(bid))["careersUrl"],
                         self.SITE + "jobs/project-manager")

    def test_paylocity_guid_link_is_the_careers_page(self):
        href = "https://recruiting.paylocity.com/recruiting/jobs/All/9b4e2ee1-7c1a-4b1d-a2f1-3a5d7b9c0e2f/Sample"
        bid = self.roofer(0, anchor(href, "Careers"))
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.careers_url, href)
        self.assertEqual(publish.business_profile(self.conn, self.settings, self.row(bid))["careersUrl"], href)


if __name__ == "__main__":
    unittest.main()
