"use client";

// The Add-On Menu. Every item is a real system running live on one of Ryan's
// properties. Visitors check what they want, then send the build list straight
// into the CRM with the selections attached. The form is a scope request, not a
// checkout: selected modules are priced and approved in writing before paid
// production work begins.

import Link from "next/link";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import styles from "./add-ons.module.css";
import {
  ArrowRight,
  Archive,
  BadgeCheck,
  BookOpen,
  Bot,
  CalendarDays,
  Camera,
  ChartNoAxesCombined,
  Check,
  CircleCheck,
  Compass,
  CreditCard,
  Database,
  GraduationCap,
  HandCoins,
  Images,
  Landmark,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareMore,
  Newspaper,
  PanelsTopLeft,
  PhoneCall,
  PhoneMissed,
  PlugZap,
  QrCode,
  Route,
  ScanSearch,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Store,
  Target,
  UsersRound,
  Wrench,
} from "lucide-react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type AddOn = {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  proof: string;
  moduleId: string;
};

type Category = {
  id: string;
  title: string;
  blurb: string;
  items: AddOn[];
};

const CATEGORIES: Category[] = [
  {
    id: "get_found",
    title: "Get found and get leads",
    blurb: "The front door. How strangers become names in your database.",
    items: [
      {
        id: "lead_funnel",
        name: "Lead capture funnel",
        desc: "Pages and offers built to turn attention into real inquiries, not just visits.",
        icon: Megaphone,
        proof: "Live on TheLeadFlowPro.com",
        moduleId: "website_funnels",
      },
      {
        id: "guided_front_door",
        name: "Guided front door",
        desc: "A short branching quiz that asks what the visitor needs and routes them to the right offer.",
        icon: Compass,
        proof: "Live on TheLeadFlowPro.com + private client build",
        moduleId: "forms_tools",
      },
      {
        id: "free_tool_magnet",
        name: "Free calculator or estimator",
        desc: "A tool your market actually uses: savings estimators, payment calculators, fee builders, salary tools.",
        icon: Sliders,
        proof: "Live on GideonHQ + Premier Dental Academy",
        moduleId: "forms_tools",
      },
      {
        id: "local_seo",
        name: "Local SEO and Google Maps setup",
        desc: "Clickable address, embedded map, review flow, and pages built to rank in your town.",
        icon: MapPin,
        proof: "Private client build",
        moduleId: "website_funnels",
      },
      {
        id: "tip_intake",
        name: "Tip line and story intake",
        desc: "Anonymous or named submission forms with categories, files, and witness statements.",
        icon: ScanSearch,
        proof: "Live on RealRyanNichols + Faretta.legal",
        moduleId: "forms_tools",
      },
      {
        id: "landing_pages",
        name: "Story driven landing pages",
        desc: "Narrative pages that walk a visitor step by step from problem to proof to action.",
        icon: LayoutTemplate,
        proof: "Live on DonAndPatti.com",
        moduleId: "website_funnels",
      },
    ],
  },
  {
    id: "take_money",
    title: "Sell and take money",
    blurb: "Checkout that fits how your customers actually buy.",
    items: [
      {
        id: "one_click_checkout",
        name: "One click checkout buttons",
        desc: "Buy buttons straight on the page. No cart, no account, no friction.",
        icon: CreditCard,
        proof: "Private client build + Faretta.legal",
        moduleId: "payments_checkout",
      },
      {
        id: "payment_plans",
        name: "Payment plans and buy now pay later",
        desc: "Down payments, weekly or monthly schedules, and Klarna, Afterpay, or Affirm at checkout.",
        icon: HandCoins,
        proof: "Live on Premier Dental Academy",
        moduleId: "payments_checkout",
      },
      {
        id: "offer_ladder",
        name: "Flat fee offer ladder",
        desc: "A clear menu of priced services from a small first yes up to your premium package.",
        icon: ListChecks,
        proof: "Live on Faretta.legal + RealRyanNichols",
        moduleId: "payments_checkout",
      },
      {
        id: "online_store",
        name: "Online store",
        desc: "Products, merch, books, and digital goods with your own checkout.",
        icon: ShoppingBag,
        proof: "Live on RealRyanNichols",
        moduleId: "commerce_hub",
      },
      {
        id: "marketplace",
        name: "Marketplace platform",
        desc: "Multi seller listings, auctions, offers, storefronts, and trust systems. The big build.",
        icon: Store,
        proof: "Live on GideonHQ",
        moduleId: "commerce_hub",
      },
      {
        id: "venue_booking",
        name: "Event and venue booking",
        desc: "Inquiry to quote to deposit, with plain language terms and a calendar behind it.",
        icon: CalendarDays,
        proof: "Private client build",
        moduleId: "booking_routing",
      },
      {
        id: "donation_engine",
        name: "Donation and sponsorship engine",
        desc: "Tiered giving, item level sponsorships, monthly supporters, and live funding progress bars.",
        icon: HandCoins,
        proof: "Live on DonAndPatti.com",
        moduleId: "payments_checkout",
      },
      {
        id: "live_configurator",
        name: "Live pricing configurator",
        desc: "Customers pick options and watch the price update in real time before they ever call you.",
        icon: Sliders,
        proof: "Live on Premier Dental Academy + GideonHQ",
        moduleId: "forms_tools",
      },
    ],
  },
  {
    id: "never_miss",
    title: "Never miss a lead",
    blurb: "The follow-up machine. The money is in the follow-up.",
    items: [
      {
        id: "missed_call",
        name: "Missed call text back",
        desc: "Someone calls, you are busy, they get a text in seconds. Missed calls stop being missed revenue.",
        icon: PhoneMissed,
        proof: "Built on the LeadFlow stack",
        moduleId: "calls_texts",
      },
      {
        id: "shared_inbox",
        name: "Business calls and texting inbox",
        desc: "One shared number for the team with texts, calls, contacts, and history in one place.",
        icon: PhoneCall,
        proof: "Built on the LeadFlow stack",
        moduleId: "calls_texts",
      },
      {
        id: "email_sequences",
        name: "Automatic email follow-up",
        desc: "Instant replies and nurture sequences that keep working while you sleep.",
        icon: Mail,
        proof: "Live on TheLeadFlowPro.com",
        moduleId: "email_automation",
      },
      {
        id: "sms_list",
        name: "SMS alerts and broadcast list",
        desc: "Your own text list. No algorithm between you and the people who asked to hear from you.",
        icon: MessageSquareMore,
        proof: "Live on RealRyanNichols + DonAndPatti.com",
        moduleId: "email_automation",
      },
      {
        id: "booking",
        name: "Booking and scheduling",
        desc: "Calendars, tour bookings, appointments, and reminders wired to your real availability.",
        icon: CalendarDays,
        proof: "Live on Premier Dental Academy",
        moduleId: "booking_routing",
      },
      {
        id: "lead_routing",
        name: "Lead routing",
        desc: "The right lead to the right person, location, or calendar automatically.",
        icon: Route,
        proof: "Built on the LeadFlow stack",
        moduleId: "booking_routing",
      },
    ],
  },
  {
    id: "run_business",
    title: "Run the business",
    blurb: "The back office. One place to see everything and act on it.",
    items: [
      {
        id: "crm",
        name: "CRM and pipeline",
        desc: "Every lead with status, source, owner, notes, and the next action. Nothing falls through.",
        icon: UsersRound,
        proof: "Live on TheLeadFlowPro.com",
        moduleId: "crm_pipeline",
      },
      {
        id: "admin_office",
        name: "Admin back office",
        desc: "One workspace for the team to review, assign, approve, export, and report.",
        icon: PanelsTopLeft,
        proof: "Live on TheLeadFlowPro.com",
        moduleId: "admin_workspace",
      },
      {
        id: "analytics",
        name: "First party analytics",
        desc: "Your traffic and conversions in your own database, not rented from an ad platform.",
        icon: ChartNoAxesCombined,
        proof: "Live on TheLeadFlowPro.com",
        moduleId: "analytics_reporting",
      },
      {
        id: "ads_pixel",
        name: "Ads and pixel wiring",
        desc: "Meta and Google tracking installed right, with source attribution back to revenue.",
        icon: Target,
        proof: "Live on TheLeadFlowPro.com",
        moduleId: "ads_attribution",
      },
      {
        id: "transparency",
        name: "Open book transparency page",
        desc: "A public ledger of money in and money out. The strongest trust device on the internet.",
        icon: Landmark,
        proof: "Live on DonAndPatti.com + Faretta.legal",
        moduleId: "website_funnels",
      },
    ],
  },
  {
    id: "serve_members",
    title: "Serve customers and members",
    blurb: "Give people a real place to log in and get what they paid for.",
    items: [
      {
        id: "member_portal",
        name: "Member login portal",
        desc: "A secure home for customers, members, students, partners, or supporters.",
        icon: ShieldCheck,
        proof: "Live on DonAndPatti.com + Faretta.legal",
        moduleId: "customer_portal",
      },
      {
        id: "courses",
        name: "Courses and training delivery",
        desc: "Lessons, progress tracking, quizzes, and certificates under your own roof.",
        icon: BookOpen,
        proof: "Live on Premier Dental Academy",
        moduleId: "courses_training",
      },
      {
        id: "simulators",
        name: "Interactive simulators",
        desc: "Let people try the real thing free: practice software, virtual tours, hands on demos.",
        icon: GraduationCap,
        proof: "Live on Premier Dental Academy",
        moduleId: "courses_training",
      },
      {
        id: "client_dashboard",
        name: "Client project dashboard",
        desc: "Clients log in and see milestones, deliverables, progress, and a direct message line.",
        icon: LayoutDashboard,
        proof: "Live on TheLeadFlowPro.com",
        moduleId: "customer_portal",
      },
      {
        id: "directory",
        name: "Directory or community hub",
        desc: "Graduates, employers, partners, vendors, or local businesses in a searchable public directory.",
        icon: UsersRound,
        proof: "Live on Premier Dental Academy",
        moduleId: "archive_library",
      },
    ],
  },
  {
    id: "content_proof",
    title: "Content, proof, and authority",
    blurb: "The record. Publish it, archive it, make it searchable.",
    items: [
      {
        id: "blog_engine",
        name: "Blog and article engine",
        desc: "Long form publishing with categories, sharing, and search engines actually finding it.",
        icon: Newspaper,
        proof: "Live on all seven properties",
        moduleId: "archive_library",
      },
      {
        id: "searchable_archive",
        name: "Searchable archive or database",
        desc: "Thousands of records, profiles, or documents that visitors can search, filter, and share.",
        icon: Database,
        proof: "Live on RealRyanNichols",
        moduleId: "archive_library",
      },
      {
        id: "galleries",
        name: "Photo and video galleries",
        desc: "Organized albums and video libraries that tell the story of years of work.",
        icon: Images,
        proof: "Live on DonAndPatti.com",
        moduleId: "archive_library",
      },
      {
        id: "testimonial_wall",
        name: "Verified testimonial wall",
        desc: "Reviews with sources shown, so proof reads like proof instead of decoration.",
        icon: BadgeCheck,
        proof: "Private client build",
        moduleId: "website_funnels",
      },
      {
        id: "photo_evidence",
        name: "Receipts and evidence walls",
        desc: "Documents, filings, screenshots, and records embedded right where the claim is made.",
        icon: Camera,
        proof: "Live on RealRyanNichols + DonAndPatti.com",
        moduleId: "archive_library",
      },
    ],
  },
  {
    id: "ai_advanced",
    title: "AI and advanced",
    blurb: "The edge. Systems most local businesses have never seen.",
    items: [
      {
        id: "ai_assistant",
        name: "AI assistant trained on your business",
        desc: "Answers questions in your voice, qualifies leads, and recommends the right offer around the clock.",
        icon: Bot,
        proof: "Live on RealRyanNichols + Faretta.legal",
        moduleId: "ai_agent",
      },
      {
        id: "ai_content",
        name: "AI listing and content builder",
        desc: "Descriptions, listings, and drafts generated from your products and your voice.",
        icon: Sparkles,
        proof: "Live on GideonHQ",
        moduleId: "ai_agent",
      },
      {
        id: "ai_connector",
        name: "ChatGPT and Claude connector",
        desc: "A secure connector so AI tools can work with your business data with your permission.",
        icon: PlugZap,
        proof: "Built on the LeadFlow stack",
        moduleId: "connector_mcp",
      },
      {
        id: "qr_flows",
        name: "QR code flows",
        desc: "QR verified pickup, check in, reviews, and instant contact from print to phone.",
        icon: QrCode,
        proof: "Live on GideonHQ",
        moduleId: "commerce_hub",
      },
      {
        id: "search_everything",
        name: "Site wide smart search",
        desc: "One search box that finds every product, article, record, and page you have.",
        icon: Search,
        proof: "Live on RealRyanNichols",
        moduleId: "archive_library",
      },
      {
        id: "migration",
        name: "White glove migration",
        desc: "Your content, records, and customers moved off the old platform without losing a thing.",
        icon: Wrench,
        proof: "Done for every build",
        moduleId: "admin_workspace",
      },
    ],
  },
];

const ALL_ITEMS: AddOn[] = CATEGORIES.flatMap((c) => c.items);

export default function AddOnsMenu() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const selectedItems = useMemo(
    () => ALL_ITEMS.filter((i) => selected.has(i.id)),
    [selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    if (smsConsent && !phone) {
      setError("Add a mobile number before choosing call or text consent.");
      setSending(false);
      return;
    }
    const names = selectedItems.map((i) => i.name);
    const moduleIds = Array.from(new Set(selectedItems.map((i) => i.moduleId)));
    const notes = String(form.get("notes") ?? "").trim();
    const params = new URLSearchParams(window.location.search);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        business_name: form.get("business_name"),
        email: form.get("email"),
        phone: phone || null,
        website_url: form.get("website_url"),
        desired_modules: moduleIds,
        interest: "company_os",
        goals: [
          `ADD-ON SCOPE REQUEST (${names.length} item${names.length === 1 ? "" : "s"}): ${names.join("; ")}.`,
          notes ? `How they want it built: ${notes}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        best_contact_method: form.get("best_contact_method"),
        sms_consent: smsConsent,
        marketing_email_consent: form.get("marketing_email_consent") === "on",
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        diagnostic: {
          version: 2,
          source: "add_ons_menu",
          add_ons: selectedItems.map((i) => ({ id: i.id, name: i.name })),
          owner_notes: notes || null,
          next_action:
            "Review the selected modules, confirm scope, timeline, and price in writing, then schedule paid production work.",
        },
      }),
    });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}) as { error?: string })).error ??
          "The request did not go through. Please try again.",
      );
      setSending(false);
      return;
    }
    window.fbq?.("track", "Lead");
    setSubmitted(true);
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <figure className={styles.heroVisual}>
            <Image
              src="/images/offer-v2/premier-operating-system.webp"
              alt="A connected operating system with website, customer records, payment, and delivery modules"
              width={3840}
              height={2160}
              sizes="(max-width: 760px) calc(100vw - 32px), 54vw"
              priority
            />
            <figcaption>
              <span>Real modules. One connected company.</span>
              <strong>Scope the next build.</strong>
            </figcaption>
          </figure>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>The Add-On Menu</p>
            <h1>
              Choose the capability.
              <span>Get the scope before the build.</span>
            </h1>
            <p className={styles.heroLead}>
              This is not a checkout. Select the proven modules your business needs, tell
              me the outcome, and I will return a written scope, timeline, and price before
              paid production begins.
            </p>
            <div className={styles.heroActions}>
              <a href="#module-menu" className={styles.primaryButton}>
                Build My Scope
                <ArrowRight aria-hidden="true" />
              </a>
              <Link href="/pricing" className={styles.secondaryButton}>
                See Current Offers
              </Link>
            </div>
            <div className={styles.qualifier}>
              <ShieldCheck aria-hidden="true" />
              <p>
                Approved first five-page websites have a $0 build fee. Funnels,
                CRM, tools, portals, courses, ads, automation, and every add-on
                below are optional and scoped separately.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="module-menu" className={styles.menuSection}>
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrow}>Build list</p>
            <h2>Start with the outcome. Select only what supports it.</h2>
          </div>
          <p>
            Every module is based on a real system already running on a LeadFlow build.
            Your selections create a scope request, not a purchase or authorization to work.
          </p>
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className={styles.category}>
            <div className={styles.categoryHead}>
              <div>
                <h3>{cat.title}</h3>
                <p>{cat.blurb}</p>
              </div>
              <span className={styles.selectedCount}>
                {cat.items.filter((i) => selected.has(i.id)).length} of {cat.items.length} selected
              </span>
            </div>
            <div className={styles.itemGrid}>
              {cat.items.map((item) => {
                const isOn = selected.has(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggle(item.id)}
                    className={`${styles.item} ${isOn ? styles.itemSelected : ""}`}
                  >
                    <span className={styles.itemIcon}>
                      <Icon aria-hidden="true" strokeWidth={1.8} />
                    </span>
                    <span className={styles.itemCopy}>
                      <strong>{item.name}</strong>
                      <span>{item.desc}</span>
                      <span className={styles.proofLine}>
                        <CircleCheck aria-hidden="true" />
                        {item.proof}
                      </span>
                    </span>
                    <span className={styles.itemCheck} aria-hidden="true">
                      {isOn ? <Check /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section ref={formRef} className={styles.formSection}>
        {!submitted ? (
          <div className={styles.formCard}>
            <p className={styles.eyebrow}>Your scope request</p>
            <h2>
              Tell me how you want it built.
            </h2>
            <p className={styles.formIntro}>
              {selectedItems.length === 0
                ? "Nothing checked yet. Pick anything above, or just describe what you want in your own words below."
                : `${selectedItems.length} add-on${selectedItems.length === 1 ? "" : "s"} on your list. Add your details and send it for a written scope, timeline, and price.`}
            </p>

            {selectedItems.length > 0 && (
              <div className={styles.selectedPills} aria-label="Selected add-ons">
                {selectedItems.map((i) => (
                  <span key={i.id}>
                    <Check aria-hidden="true" strokeWidth={3} />
                    {i.name}
                  </span>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Your name *</span>
                  <input name="full_name" autoComplete="name" required maxLength={200} />
                </label>
                <label className={styles.field}>
                  <span>Business name</span>
                  <input name="business_name" autoComplete="organization" maxLength={200} />
                </label>
                <label className={styles.field}>
                  <span>Email *</span>
                  <input name="email" type="email" autoComplete="email" required maxLength={200} />
                </label>
                <label className={styles.field}>
                  <span>Mobile phone</span>
                  <input name="phone" type="tel" autoComplete="tel" maxLength={50} />
                </label>
                <label className={styles.field}>
                  <span>Website or main profile</span>
                  <input
                    name="website_url"
                    type="text"
                    inputMode="url"
                    placeholder="Website, page, or none yet"
                    maxLength={300}
                  />
                </label>
                <label className={styles.field}>
                  <span>Best way to reach you</span>
                  <select name="best_contact_method" defaultValue="email">
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="text">Text</option>
                    <option value="any">Any</option>
                  </select>
                </label>
              </div>
              <label className={`${styles.field} ${styles.notesField}`}>
                <span>How do you want it built?</span>
                <textarea
                  name="notes"
                  rows={4}
                  maxLength={1000}
                  placeholder="Your business, your customers, what it should look like, what it should feel like. Talk to me like we are at the counter."
                />
              </label>
              <div className={styles.consentList}>
                <label>
                  <input type="checkbox" name="sms_consent" />
                  <span>
                    If I provided a mobile number, The LeadFlow Pro may call or text me
                    about this request and related project updates. Consent is not a
                    condition of purchase. Message and data rates may apply. Reply STOP to
                    opt out.
                  </span>
                </label>
                <label>
                  <input type="checkbox" name="marketing_email_consent" />
                  <span>
                    Send me occasional LeadFlow articles, tools, and launch updates by
                    email. I can unsubscribe at any time.
                  </span>
                </label>
              </div>
              {error && (
                <p className={styles.formError} role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={sending}
              >
                {sending ? "Sending Your Build List..." : "Send My Build List"}
                {!sending && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
              </button>
              <p className={styles.formLegal}>
                By submitting, you agree to our <Link href="/terms">Terms</Link> and
                acknowledge our <Link href="/privacy">Privacy Policy</Link>. This form does
                not charge you or authorize work. Selected modules are quoted separately.
              </p>
            </form>
          </div>
        ) : (
          <div className={styles.successCard}>
            <CircleCheck aria-hidden="true" />
            <h2>Your build list is in.</h2>
            <p>
              I have your picks and your notes. I will reach out within one business day
              on the channel you chose to confirm the scope, timeline, and price before
              paid production work begins.
            </p>
            <div className={styles.successActions}>
              <Link href="/portfolio" className={styles.secondaryButton}>
                See the Live Work
              </Link>
              <Link href="/start" className={styles.secondaryButton}>
                Map My Whole System
              </Link>
            </div>
          </div>
        )}
      </section>

      {!submitted && (
        <section className={styles.scopeTerms}>
          <p>
            This is a scope request, not a blank check.
          </p>
          <p>
            Approved first five-page websites have a $0 build fee through the Free Website
            Program. Application, capacity, written scope, and outside-cost rules apply.
            Funnels, CRM, tools, portals, courses, ads, automation, and other modules are
            optional and priced separately before work begins.
          </p>
        </section>
      )}

      {!submitted && selected.size > 0 && (
        <div className={styles.stickyBar}>
          <div className={styles.stickyInner}>
            <div className={styles.stickyCount}>
              <span>
                {selected.size}
              </span>
              <strong>
                add-on{selected.size === 1 ? "" : "s"} on your build list
              </strong>
            </div>
            <button type="button" className={styles.stickyButton} onClick={scrollToForm}>
              Review Scope Request
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
