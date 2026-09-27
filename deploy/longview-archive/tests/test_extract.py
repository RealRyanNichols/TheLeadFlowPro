"""Extractor tests over fictional fixture pages (tests/fixtures/sites)."""

import unittest
from pathlib import Path

from longview_archive.extract import careers, contacts, identity, services, social
from longview_archive.extract.html import Link, Page, parse_page

SITES = Path(__file__).parent / "fixtures" / "sites"
TIRE_URL = "https://www.exampletire.example/"
TACOS_URL = "https://www.samplestreettacos.example/menu"
DENTAL_URL = "https://www.fictionalfamilydental.example/careers"


def load(name, url):
    return parse_page((SITES / name).read_text(encoding="utf-8"), url)


class HtmlParseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tire = load("example_tire_home.html", TIRE_URL)
        cls.tacos = load("sample_tacos_menu.html", TACOS_URL)

    def test_title_meta_and_entities(self):
        self.assertEqual(self.tire.title, "Example Tire & Lube | Auto Repair")
        self.assertEqual(self.tire.meta["og:site_name"], "Example Tire & Lube")
        self.assertEqual(self.tacos.title, "Menu – Sample Street Tacos")
        self.assertIn("Mon–Thu 11am–9pm", self.tacos.lines)

    def test_hidden_content_skipped(self):
        text = self.tire.text
        for hidden in ("owner@exampletire.example", "coupon", "Hidden template", "Wrench icon", "3am-4am",
                       "color: red", "1am-2am"):
            self.assertNotIn(hidden, text)

    def test_block_elements_and_br_break_lines(self):
        self.assertIn("1200 W. Example Ave.", self.tire.lines)
        self.assertIn("Longview, TX 75601", self.tire.lines)
        self.assertIn("Monday - Friday 8:00 AM - 5:30 PM", self.tire.lines)  # table cells share a row line

    def test_headings(self):
        self.assertEqual(self.tire.headings, [(1, "Example Tire & Lube"), (2, "Free Estimates & Financing"),
                                              (3, "Shop Hours")])

    def test_links_resolved_against_base_href_and_normalized(self):
        urls = [link.url for link in self.tire.links]
        self.assertIn("https://www.exampletire.example/services/oil-change", urls)
        self.assertIn("https://www.exampletire.example/contact", urls)  # utm_source stripped
        self.assertIn(Link("https://www.exampletire.example/careers", "Careers", ""), self.tire.links)
        self.assertEqual(self.tire.base_url, "https://www.exampletire.example/")
        page = parse_page('<base href="https://cdn.example/sub/"><a href="page">P</a><a href="/root">R</a>',
                          "https://a.example/x/y")
        self.assertEqual([l.url for l in page.links], ["https://cdn.example/sub/page", "https://cdn.example/root"])

    def test_mailto_and_tel_exposed_separately(self):
        self.assertEqual(self.tire.mailtos, ["info@exampletire.example"])
        self.assertEqual(self.tire.tels, ["+19035550100"])
        self.assertFalse(any(l.url.startswith(("mailto:", "tel:")) for l in self.tire.links))

    def test_jsonld_graph_flattened(self):
        types = [item.get("@type") for item in self.tire.jsonld]
        self.assertEqual(types, ["AutoRepair", "WebSite"])
        page = parse_page('<script type="application/ld+json">[{"@type":"A","name":"x",},{"@type":"B"}]</script>'
                          '<script type="application/ld+json">{not json</script>', "https://a.example/")
        self.assertEqual([i["@type"] for i in page.jsonld], ["A", "B"])

    def test_nav_texts_from_nav_header_footer_and_role(self):
        for text in ("Oil Changes", "Brake Repair", "Careers", "Facebook"):
            self.assertIn(text, self.tire.nav_texts)
        self.assertNotIn("Example Tire & Lube", self.tire.nav_texts)
        self.assertEqual(self.tacos.nav_texts[:3], ["Tacos", "Catering", "Curbside Pickup"])

    def test_list_items(self):
        self.assertIn("Walk-Ins Welcome", self.tire.list_items)
        self.assertIn("Gluten-Free Options", self.tacos.list_items)

    def test_unclosed_tags_and_nested_lists(self):
        page = parse_page("<ul><li>One<li>Two<ul><li>Inner</ul><li>Three</ul><p>A<p>B", "https://a.example/")
        self.assertEqual(sorted(page.list_items), ["Inner", "One", "Three", "Two"])
        self.assertEqual(page.lines, ["One", "Two", "Inner", "Three", "A", "B"])

    def test_image_alt_as_link_text(self):
        page = parse_page('<a href="https://www.facebook.com/x.example"><img alt="Facebook"></a>', "https://a.example/")
        self.assertEqual(page.links[0].text, "Facebook")

    def test_garbage_input_does_not_raise(self):
        page = parse_page("<<<>>></div></p><script>unterminated", "https://a.example/")
        self.assertIsInstance(page, Page)
        self.assertEqual(parse_page("", "https://a.example/").lines, [])


class ContactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tire = load("example_tire_home.html", TIRE_URL)
        cls.tacos = load("sample_tacos_menu.html", TACOS_URL)

    def test_phone_from_tel_link_wins_and_fax_skipped(self):
        self.assertEqual(contacts.phones(self.tire, allow_fictional=True), [("+19035550100", "tel_link", 0.95)])

    def test_fictional_numbers_rejected_by_default(self):
        self.assertEqual(contacts.phones(self.tire), [])

    def test_phone_from_jsonld_and_text(self):
        page = parse_page('<script type="application/ld+json">{"@type":"Dentist","telephone":"903-555-0177"}</script>'
                          "<p>Main line 903.555.0142</p><p>Fax 903-555-0143</p>", "https://a.example/")
        self.assertEqual(contacts.phones(page, allow_fictional=True),
                         [("+19035550177", "jsonld", 0.95), ("+19035550142", "text", 0.8)])

    def test_phone_text_dedupes_to_best_method(self):
        page = parse_page('<a href="tel:9035550150">Call</a><p>Call (903) 555-0150</p>', "https://a.example/")
        self.assertEqual(contacts.phones(page, allow_fictional=True), [("+19035550150", "tel_link", 0.95)])

    def test_emails_generic_same_domain_only(self):
        found = contacts.emails(self.tire, "www.exampletire.example")
        self.assertEqual(found, [
            ("service@exampletire.example", "jsonld", 0.95),
            ("info@exampletire.example", "mailto", 0.9),
            ("parts@exampletire.example", "text", 0.8),
        ])
        values = [e for e, _, _ in found]
        self.assertNotIn("jane.doe@exampletire.example", values)   # personal-looking: dropped
        self.assertNotIn("info@examplemail.example", values)       # off-domain: dropped

    def test_obfuscated_email_decoded(self):
        self.assertEqual(contacts.deobfuscate("info [at] samplestreettacos [dot] example"),
                         "info@samplestreettacos.example")
        self.assertEqual(contacts.deobfuscate("office(at)fictionalfamilydental(dot)example"),
                         "office@fictionalfamilydental.example")
        self.assertEqual(contacts.deobfuscate("hello at samplestreettacos dot example"),
                         "hello@samplestreettacos.example")
        page = parse_page("<p>Write info [at] samplestreettacos [dot] example</p>", TACOS_URL)
        self.assertEqual(contacts.emails(page, "samplestreettacos.example"),
                         [("info@samplestreettacos.example", "text", 0.8)])

    def test_entity_encoded_email_in_text(self):
        self.assertEqual(contacts.emails(self.tacos, "samplestreettacos.example"),
                         [("hello@samplestreettacos.example", "text", 0.8)])

    def test_no_site_domain_means_no_email(self):
        self.assertEqual(contacts.emails(self.tire, None), [])


class SocialTests(unittest.TestCase):
    def test_business_profiles_matched_and_share_links_ignored(self):
        tire = load("example_tire_home.html", TIRE_URL)
        found = {c.url: c for c in social.social_links(tire, "Example Tire & Lube", "exampletire.example")}
        self.assertIn("https://www.facebook.com/exampletirelube", found)
        self.assertTrue(found["https://www.facebook.com/exampletirelube"].matches)
        self.assertEqual(found["https://www.facebook.com/exampletirelube"].network, "facebook")
        self.assertTrue(found["https://www.instagram.com/example.tire"].matches)
        self.assertFalse(any("sharer" in u or "/p/" in u for u in found))
        self.assertEqual(len(found), 3)

    def test_mismatch_flagged(self):
        tire = load("example_tire_home.html", TIRE_URL)
        found = {c.url: c for c in social.social_links(tire, "Example Tire & Lube", "exampletire.example")}
        designer = found["https://www.instagram.com/sampledesignstudio"]
        self.assertFalse(designer.matches)
        self.assertEqual(designer.reason, "mismatch")

    def test_groups_numeric_profiles_and_platform_pages(self):
        tacos = load("sample_tacos_menu.html", TACOS_URL)
        found = {c.url: c for c in social.social_links(tacos, "Sample Street Tacos", "samplestreettacos.example")}
        self.assertEqual(found["https://www.facebook.com/groups/123456789012345"].reason, "group")
        self.assertFalse(found["https://www.facebook.com/groups/123456789012345"].matches)
        numeric = found["https://www.facebook.com/profile.php?id=100012345678901"]
        self.assertEqual((numeric.matches, numeric.reason), (False, "numeric_profile"))
        self.assertTrue(found["https://www.facebook.com/samplestreettacos"].matches)  # m.facebook.com normalized
        self.assertTrue(found["https://www.instagram.com/samplestreettacos"].matches)
        self.assertFalse(any("/plugins" in u or "/tr" in u for u in found))

    def test_ignored_paths(self):
        for url in ("https://www.facebook.com/sharer.php?u=x", "https://www.facebook.com/share/abc",
                    "https://www.facebook.com/dialog/feed", "https://www.facebook.com/login",
                    "https://www.facebook.com/policies", "https://www.facebook.com/help/123",
                    "https://www.facebook.com/events/123", "https://www.facebook.com/photos/1",
                    "https://www.facebook.com/watch/?v=1", "https://www.facebook.com/hashtag/tacos",
                    "https://www.instagram.com/reel/abc/", "https://www.instagram.com/explore/tags/tacos/",
                    "https://www.instagram.com/stories/x/", "https://www.instagram.com/accounts/login/",
                    "https://www.facebook.com/", "https://www.facebook.com/facebook",
                    "https://www.instagram.com/instagram/"):
            with self.subTest(url=url):
                self.assertIsNone(social.classify(url))

    def test_host_variants_normalized(self):
        for url in ("https://fb.com/ExampleTire", "https://web.facebook.com/ExampleTire/",
                    "http://facebook.com/ExampleTire?ref=bookmarks"):
            with self.subTest(url=url):
                self.assertEqual(social.classify(url)[:2], ("facebook", "https://www.facebook.com/exampletire"))

    def test_handle_matching_rules(self):
        cases = [
            ("ExampleTireLube", "Example Tire & Lube", (True, "name_token")),     # camelCase split
            ("sample_street_tacos", "Sample Street Tacos", (True, "name_token")),  # underscores
            ("tire.shop", "Example Tire & Lube", (False, "mismatch")),             # only a category word
            ("exampletire903", "Unrelated Name", (True, "domain_label")),          # contains the label
            ("exampletirelongview", "Unrelated Name", (True, "domain_label")),
            ("bestwebdesigns", "Example Tire & Lube", (False, "mismatch")),
            ("lube", "Unrelated Name", (False, "mismatch")),
        ]
        for handle, name, expected in cases:
            with self.subTest(handle=handle):
                self.assertEqual(social.handle_matches(handle, name, "exampletire.example"), expected)

    def test_fragment_of_the_domain_label_is_not_a_match(self):
        # A handle that is only a piece of the domain label ("pletire", or "ford" inside
        # "longviewfordexample") does not name the business; it goes to review.
        self.assertEqual(social.handle_matches("pletire", "Unrelated Name", "exampletire.example"),
                         (False, "mismatch"))
        self.assertEqual(social.handle_matches("ex", "Unrelated Name", "exampletire.example"),
                         (False, "mismatch"))
        self.assertEqual(social.handle_matches("Ford", "Longview Ford Example Motors", "longviewfordexample.example"),
                         (False, "mismatch"))

    def test_generic_brand_or_category_word_is_not_a_match(self):
        cases = [
            ("Ford", "Longview Ford Lincoln", "longviewfordlincoln.example"),           # the franchise brand
            ("NAPAAutoCare", "Smiths Auto Repair", "smithsautorepair.example"),         # a supplier
            ("AmericanDentalAssociation", "Example Family Dental", "examplefamilydental.example"),  # an association
            ("FamilyCareCenter", "Sample Family Care", "samplefamilycare.example"),
            ("ExampleChurchSupply", "Sample Community Church", "samplechurch.example"),
            ("HomeServicesStore", "Example Home Services", "examplehomeservices.example"),
        ]
        for handle, name, domain in cases:
            with self.subTest(handle=handle):
                self.assertEqual(social.handle_matches(handle, name, domain), (False, "mismatch"))
        # The business's own distinctive name or whole domain label still matches.
        self.assertEqual(social.handle_matches("SmithsAutoRepair", "Smiths Auto Repair", "smithsautorepair.example"),
                         (True, "name_token"))
        self.assertEqual(social.handle_matches("familydentalcare", "Family Dental Care", "familydentalcare.example"),
                         (True, "domain_label"))

    def test_brand_page_on_a_real_page_goes_to_review(self):
        page = parse_page('<footer><a href="https://www.facebook.com/Ford">Ford</a>'
                          '<a href="https://www.facebook.com/SmithsFordExample">Us</a></footer>',
                          "https://www.smithsfordexample.example/")
        found = {c.url: c for c in social.social_links(page, "Smiths Ford Example", "smithsfordexample.example")}
        self.assertEqual((found["https://www.facebook.com/ford"].matches,
                          found["https://www.facebook.com/ford"].reason), (False, "mismatch"))
        self.assertTrue(found["https://www.facebook.com/smithsfordexample"].matches)


class CareersTests(unittest.TestCase):
    def test_careers_links_same_site_and_ats(self):
        dental = load("fictional_dental_careers.html", DENTAL_URL)
        links = careers.careers_links(dental)
        self.assertEqual(links, [
            "https://www.fictionalfamilydental.example/join-our-team",
            "https://fictionalfamilydental.bamboohr.com/careers/12",
            "https://www.indeed.com/cmp/Fictional-Family-Dental/jobs",
            "https://www.fictionalfamilydental.example/employment/application.pdf",
        ])
        self.assertNotIn("https://www.otherclinic.example/careers", links)  # another site
        self.assertNotIn("https://www.fictionalfamilydental.example/about", links)

    def test_careers_link_by_text_or_path(self):
        page = parse_page('<a href="/team">We\'re Hiring!</a><a href="/jobs/">Open roles</a>'
                          '<a href="/menu">Menu</a><a href="/work-with-us">Details</a>',
                          "https://www.samplestreettacos.example/")
        self.assertEqual(careers.careers_links(page), [
            "https://www.samplestreettacos.example/team",
            "https://www.samplestreettacos.example/jobs/",
            "https://www.samplestreettacos.example/work-with-us",
        ])

    def test_apply_now_alone_is_not_a_careers_link(self):
        # Credit, rental, and enrollment applications are not jobs.
        page = parse_page('<nav><a href="/finance/credit-application">Apply Now</a>'
                          '<a href="/apply">Apply now</a><a href="/residents/apply-online">Apply Online</a>'
                          '<a href="/enroll">Apply Today</a></nav>',
                          "https://www.samplemotors.example/")
        self.assertEqual(careers.careers_links(page), [])

    def test_apply_now_with_a_jobs_signal_is_kept(self):
        page = parse_page('<a href="/careers/apply">Apply Now</a>'
                          '<a href="/apply?type=employment">Apply now</a>'
                          '<a href="/apply-form">Apply for open positions</a>'
                          '<a href="https://samplemotors.applytojob.com/apply">Apply Now</a>'
                          '<a href="/finance/apply">Apply Now</a>',
                          "https://www.samplemotors.example/")
        self.assertEqual(careers.careers_links(page), [
            "https://www.samplemotors.example/careers/apply",
            "https://www.samplemotors.example/apply-form",
            "https://samplemotors.applytojob.com/apply",
        ])

    def test_ats_link_from_tacos(self):
        tacos = load("sample_tacos_menu.html", TACOS_URL)
        self.assertEqual(careers.careers_links(tacos), ["https://samplestreettacos.applytojob.com/apply"])

    def test_roles(self):
        dental = load("fictional_dental_careers.html", DENTAL_URL)
        self.assertEqual(careers.roles_on_page(dental),
                         ["dental_assistant", "front_desk", "medical_assistant", "office_manager"])

    def test_ma_needs_job_context(self):
        page = parse_page("<p>Our MA team helps with sterilization.</p><p>Boston, MA 02101</p>", DENTAL_URL)
        self.assertEqual(careers.roles_on_page(page), [])
        page = parse_page("<li>Hiring: MA, part-time</li><p>Receptionists wanted</p>", DENTAL_URL)
        self.assertEqual(careers.roles_on_page(page), ["medical_assistant", "receptionist"])

    def test_word_boundaries(self):
        page = parse_page("<p>frontdesking is not a word; the Office Managerial team</p><p>ma'am</p>", DENTAL_URL)
        self.assertEqual(careers.roles_on_page(page), [])


class ServiceTests(unittest.TestCase):
    def test_tags_from_nav_headings_and_list_items(self):
        tire = load("example_tire_home.html", TIRE_URL)
        tags = services.service_tags(tire, "auto")
        for tag in ("oil change", "brake repair", "tire rotation", "battery replacement", "free estimates",
                    "financing", "walk-ins welcome"):
            self.assertIn(tag, tags)
        self.assertEqual(tags, sorted(tags))

    def test_never_from_paragraphs_or_long_items(self):
        tire = load("example_tire_home.html", TIRE_URL)
        tags = services.service_tags(tire, "auto")
        # Named only in a paragraph or a sentence-length list item.
        for tag in ("wheel alignment", "transmission repair", "state inspection", "engine repair", "diagnostics"):
            self.assertNotIn(tag, tags)

    def test_restaurant_and_dental(self):
        tacos = load("sample_tacos_menu.html", TACOS_URL)
        self.assertEqual(services.service_tags(tacos, "restaurants"),
                         ["breakfast", "catering", "curbside pickup", "gluten-free options", "tacos"])
        dental = load("fictional_dental_careers.html", DENTAL_URL)
        self.assertEqual(services.service_tags(dental, "health-dental"),
                         ["dental implants", "new patients welcome", "teeth whitening"])

    def test_at_most_twelve_and_unknown_category(self):
        items = "".join(f"<li>{t}</li>" for t in services.VOCABULARY["auto"][:20])
        page = parse_page(f"<ul>{items}<li>Gift Cards</li></ul>", TIRE_URL)
        self.assertEqual(len(services.service_tags(page, "auto")), 12)
        self.assertEqual(services.service_tags(page, "no-such-category"), ["gift cards"])

    def test_vocabulary_sizes(self):
        major = ["auto", "restaurants", "health-dental", "beauty", "home-services", "retail", "professional",
                 "faith-community", "lodging-recreation", "education-childcare", "industrial"]
        for slug in major:
            with self.subTest(slug=slug):
                tags = services.VOCABULARY[slug]
                self.assertTrue(20 <= len(tags) <= 60, len(tags))
                self.assertEqual(len(set(tags)), len(tags))
                self.assertTrue(all(t == t.lower() and len(t) <= 40 for t in tags))

    def test_negated_items_never_become_tags(self):
        page = parse_page("<ul><li>No financing</li><li>No delivery</li><li>Not accepting walk-ins</li>"
                          "<li>We don't offer catering</li><li>Takeout only - no curbside pickup</li>"
                          "<li>All services except gift cards</li><li>Online booking: not available</li>"
                          "<li>Breakfast without reservations</li><li>We do not have free estimates</li></ul>",
                          TACOS_URL)
        self.assertEqual(services.service_tags(page, "restaurants"), ["takeout"])

    def test_negation_in_another_clause_keeps_the_tag(self):
        page = parse_page("<ul><li>Dine-in and takeout only - no delivery</li>"
                          "<li>No appointment needed, walk-ins welcome</li><li>Free delivery</li></ul>",
                          TACOS_URL)
        self.assertEqual(services.service_tags(page, "restaurants"),
                         ["delivery", "dine-in", "takeout", "walk-ins welcome"])

    def test_plural_and_hyphen_tolerance(self):
        page = parse_page("<h2>Brake Repairs</h2><h3>Walk Ins Welcome</h3><h3>24 Hour Service</h3>", TIRE_URL)
        self.assertEqual(services.service_tags(page, "auto"),
                         ["24-hour service", "brake repair", "walk-ins welcome"])


class IdentityTests(unittest.TestCase):
    def test_name_in_title_and_address_listed(self):
        tire = load("example_tire_home.html", TIRE_URL)
        self.assertEqual(identity.site_matches_business([tire], "Example Tire & Lube LLC", "1200 W Example Ave"),
                         (True, "name_in_title", True))

    def test_address_listed_needs_number_and_core_word_on_one_line(self):
        page = parse_page("<title>Welcome</title><p>1200 Main St</p><p>Example Ave</p>", "https://x.example/")
        self.assertEqual(identity.site_matches_business(page, "Unrelated Name", "1200 W Example Ave"),
                         (False, "no_match", False))
        page = parse_page("<title>Welcome</title><p>Visit 1200 West Example Avenue</p>", "https://x.example/")
        self.assertEqual(identity.site_matches_business(page, "Unrelated Name", "1200 W Example Ave"),
                         (True, "street_listed", True))

    def test_other_name_signals(self):
        site_name = parse_page('<title>Home</title><meta property="og:site_name" content="Sample Street Tacos">',
                               "https://x.example/")
        self.assertEqual(identity.site_matches_business(site_name, "Sample Street Tacos")[:2],
                         (True, "name_in_site_name"))
        h1 = parse_page("<title>Home</title><h1>Sample Street Tacos</h1>", "https://x.example/")
        self.assertEqual(identity.site_matches_business(h1, "Sample Street Tacos")[:2], (True, "name_in_h1"))
        ld = parse_page('<title>Home</title><script type="application/ld+json">{"@type":"Restaurant",'
                        '"name":"Sample Street Tacos"}</script>', "https://x.example/")
        self.assertEqual(identity.site_matches_business(ld, "Sample Street Tacos")[:2], (True, "name_in_jsonld"))

    def test_domain_label(self):
        page = parse_page("<title>Home</title>", "https://www.samplestreettacos.example/")
        self.assertEqual(identity.site_matches_business(page, "Sample Street Tacos")[:2], (True, "domain_label"))

    def test_phone_listed(self):
        page = parse_page('<title>Home</title><a href="tel:903-555-0133">Call</a>', "https://x.example/")
        self.assertEqual(identity.site_matches_business(page, "Unrelated Name", phone="+19035550133")[:2],
                         (True, "phone_listed"))

    def test_mismatch(self):
        page = parse_page("<title>Sample Design Studio</title><h1>Web design</h1>", "https://designs.example/")
        self.assertEqual(identity.site_matches_business(page, "Example Tire & Lube", "1200 W Example Ave",
                                                        "+19035550100"), (False, "no_match", False))

    def test_one_shared_short_token_is_not_enough(self):
        # Only one of three distinctive tokens: below half.
        page = parse_page("<title>Tire Warehouse</title>", "https://x.example/")
        self.assertFalse(identity.site_matches_business(page, "Example Tire & Lube")[0])

    def test_street_key(self):
        self.assertEqual(identity.street_key("1200 W Example Ave Ste 4"), ("1200", "example"))
        self.assertEqual(identity.street_key("100 US Highway 259 N"), ("100", "259"))
        self.assertIsNone(identity.street_key("PO Box 12"))


if __name__ == "__main__":
    unittest.main()
