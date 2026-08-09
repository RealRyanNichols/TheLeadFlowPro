"use client";

// The Add-On Menu. Every item is a real system running live on one of Ryan's
// properties. Visitors check what they want, then send the build list straight
// into the CRM with the selections attached. No payment is taken here. The
// offer is the guarantee: pick it, he builds it, you do not pay if you do not
// like it.

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
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

// Same brand palette cycle used on /start.
const TILE_PALETTE: Array<[string, string, string]> = [
  ["#38bdf8", "#2563eb", "#38bdf84d"],
  ["#a78bfa", "#d946ef", "#a78bfa4d"],
  ["#34d399", "#0ea371", "#34d3994d"],
  ["#fbbf24", "#f97316", "#fbbf244d"],
  ["#f87171", "#ef4444", "#f871714d"],
  ["#22d3ee", "#3b82f6", "#22d3ee4d"],
];

function tileVars(i: number) {
  const [a, b, g] = TILE_PALETTE[i % TILE_PALETTE.length];
  return { "--ta": a, "--tb": b, "--tg": g } as React.CSSProperties;
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
        proof: "Live on RepWatchr + RealRyanNichols",
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
        proof: "Live on RealRyanNichols + RepWatchr",
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
        proof: "Live on RepWatchr",
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
        interest: "done_for_you",
        goals: [
          `ADD-ON MENU ORDER (${names.length} item${names.length === 1 ? "" : "s"}): ${names.join("; ")}.`,
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
          next_action: "Review the order, scope it, build it. They do not pay if they do not like it.",
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
    <main className="pb-32">
      {/* HERO */}
      <section className="page-hero page-hero-centered">
        <span className="eyebrow">The Add-On Menu</span>
        <h1>You choose what you want. I build it.</h1>
        <p>
          Every item on this menu is a real system running live on a real site I built.
          Check the boxes you want, tell me how you want it built, and I will fully build
          it out. You do not pay a dime if you do not like it. Fair, right?
        </p>
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-slate-300">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={3} /> Pick what you want
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={3} /> Tell me how to build it
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={3} /> No pay if you do not like it
          </span>
        </div>
      </section>

      {/* MENU */}
      <section className="mx-auto w-[min(1060px,100%-40px)]">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="mt-14 first:mt-4">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">
                  {cat.title}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{cat.blurb}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {cat.items.filter((i) => selected.has(i.id)).length} of {cat.items.length} selected
              </span>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              {cat.items.map((item, i) => {
                const isOn = selected.has(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isOn}
                    style={tileVars(i)}
                    onClick={() => toggle(item.id)}
                    className={`router-option router-option-multi !min-h-[104px] ${isOn ? "is-selected" : ""}`}
                  >
                    <span className="router-option-icon">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="router-option-copy">
                      <strong>{item.name}</strong>
                      <span>{item.desc}</span>
                      <span className="!mt-1 flex items-center gap-1.5 !text-[11px] font-bold uppercase tracking-wide !text-slate-500">
                        <CircleCheck className="h-3 w-3 text-emerald-400/80" />
                        {item.proof}
                      </span>
                    </span>
                    <span className="router-check" aria-hidden="true">
                      {isOn ? <Check className="h-4 w-4" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ORDER FORM */}
      <section ref={formRef} className="mx-auto mt-20 w-[min(860px,100%-40px)] scroll-mt-24">
        {!submitted ? (
          <div className="rounded-[20px] border border-line bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-9">
            <span className="eyebrow">Your build list</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">
              Tell me how you want it built.
            </h2>
            <p className="mt-2 text-slate-400">
              {selectedItems.length === 0
                ? "Nothing checked yet. Pick anything above, or just describe what you want in your own words below."
                : `${selectedItems.length} add-on${selectedItems.length === 1 ? "" : "s"} on your list. Add your details and send it. No payment now. No payment ever if you do not like the build.`}
            </p>

            {selectedItems.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedItems.map((i) => (
                  <span
                    key={i.id}
                    className="flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-200"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                    {i.name}
                  </span>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-field">
                  <span>Your name *</span>
                  <input name="full_name" autoComplete="name" required maxLength={200} />
                </label>
                <label className="form-field">
                  <span>Business name</span>
                  <input name="business_name" autoComplete="organization" maxLength={200} />
                </label>
                <label className="form-field">
                  <span>Email *</span>
                  <input name="email" type="email" autoComplete="email" required maxLength={200} />
                </label>
                <label className="form-field">
                  <span>Mobile phone</span>
                  <input name="phone" type="tel" autoComplete="tel" maxLength={50} />
                </label>
                <label className="form-field">
                  <span>Website or main profile</span>
                  <input
                    name="website_url"
                    type="text"
                    inputMode="url"
                    placeholder="Website, page, or none yet"
                    maxLength={300}
                  />
                </label>
                <label className="form-field">
                  <span>Best way to reach you</span>
                  <select name="best_contact_method" defaultValue="email">
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="text">Text</option>
                    <option value="any">Any</option>
                  </select>
                </label>
              </div>
              <label className="form-field mt-4">
                <span>How do you want it built?</span>
                <textarea
                  name="notes"
                  rows={4}
                  maxLength={1000}
                  placeholder="Your business, your customers, what it should look like, what it should feel like. Talk to me like we are at the counter."
                />
              </label>
              <div className="consent-list mt-4">
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
                <p className="form-error mt-3" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="button-primary mt-6 w-full sm:w-auto"
                disabled={sending}
              >
                {sending ? "Sending Your Build List..." : "Send My Build List"}
                {!sending && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
              </button>
              <p className="form-legal mt-4">
                By submitting, you agree to our <Link href="/terms">Terms</Link> and
                acknowledge our <Link href="/privacy">Privacy Policy</Link>. No payment is
                collected on this page. Ever.
              </p>
            </form>
          </div>
        ) : (
          <div className="rounded-[20px] border border-emerald-400/30 bg-emerald-500/[0.06] p-9 text-center">
            <CircleCheck className="mx-auto h-12 w-12 text-emerald-300" />
            <h2 className="mt-4 text-3xl font-black text-white">Your build list is in.</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              I have your picks and your notes. I will reach out within one business day
              on the channel you chose, we scope it, and then I build it. You see the
              whole thing working before you pay anything.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/portfolio" className="button-secondary">
                See the Live Work
              </Link>
              <Link href="/start" className="button-secondary">
                Map My Whole System
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* GUARANTEE */}
      {!submitted && (
        <section className="mx-auto mt-16 w-[min(860px,100%-40px)] text-center">
          <p className="text-lg font-bold text-white">
            This is not a quote request. It is an order.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            You pick it. I build the whole thing on a platform you own: your code, your
            data, your customer list. You look at it working. If you do not like it, you
            do not pay a dime and we shake hands. If you love it, we go live.
          </p>
        </section>
      )}

      {/* STICKY ORDER BAR */}
      {!submitted && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#0b1018]/90 backdrop-blur">
          <div className="mx-auto flex w-[min(1060px,100%-32px)] items-center justify-between gap-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-blue-600 px-2 text-sm font-black text-white shadow-[0_2px_12px_rgba(56,189,248,0.5)]">
                {selected.size}
              </span>
              <span className="hidden text-sm font-semibold text-white sm:block">
                add-on{selected.size === 1 ? "" : "s"} on your build list
              </span>
            </div>
            <button type="button" className="button-primary !min-h-[42px]" onClick={scrollToForm}>
              Order These
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
