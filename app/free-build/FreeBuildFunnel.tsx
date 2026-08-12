"use client";

// The Facebook-ad landing funnel. The offer: tell Ryan about your business,
// upload anything you have, and he builds the whole site before you pay a
// dime. Quick-start lives right in the hero so people start typing on the
// first screen. Leads save to the CRM first, uploads go to private Supabase
// storage, and the instant email + text fire on submit.

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Check,
  FileUp,
  Hammer,
  MessageSquareMore,
  Mic,
  Paperclip,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import RentVsOwnChart from "@/components/charts/RentVsOwnChart";
import FollowUpSpeedChart from "@/components/charts/FollowUpSpeedChart";
import MallWalkVideo from "@/components/site/MallWalkVideo";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Real screenshots of real live sites. Served from our own /public/proof so
// they always render: hotlinking another site's OG image breaks the day that
// site changes a path or blocks referrers, and a broken proof wall is worse
// than no proof wall.
// A list of blue underlined names is not proof to anybody. A wall of finished
// work is. Every one of these is live right now and every one was built here.
const PROOF = [
  {
    name: "Premier Dental Academy",
    url: "https://www.premierdentalacademyoflongview.com",
    img: "/proof/premier.jpg",
    what: "A school running its own enrollment, payment plans, and training simulators",
  },
  {
    name: "RepWatchr.com",
    url: "https://repwatchr.com",
    img: "/proof/repwatchr.jpg",
    what: "A searchable database of public officials, votes, and money trails. Real software, not a brochure",
  },
  {
    name: "GideonHQ.com",
    url: "https://gideonhq.com",
    img: "/proof/gideon.jpg",
    what: "A full marketplace: listings, auctions, storefronts, AI listing builder",
  },
  {
    name: "DonAndPatti.com",
    url: "https://www.donandpatti.com",
    img: "/proof/donandpatti.jpg",
    what: "Mission platform with sponsorship checkout, a photo archive, and an open ledger",
  },
  {
    name: "RealRyanNichols.com",
    url: "https://realryannichols.com",
    img: "/proof/rrn.jpg",
    what: "Publishing engine, searchable case archive, tip line, and store",
  },
  {
    name: "TheLeadFlowPro.com",
    url: "https://www.theleadflowpro.com",
    img: "/og/home.png",
    what: "The page you are standing on. Same stack I would hand you",
  },
] as const;

const TIERS = [
  {
    name: "The Starter Site",
    tag: "Get online right",
    range: "Most land $497 to $1,500",
    desc: "A clean, fast site that makes your business look as good as it actually is.",
    items: [
      "Full website with your pages, your words, your photos",
      "Contact and lead capture forms",
      "Click to call and click to text",
      "Google Business Profile setup",
      "Facebook and social pages built or cleaned up",
      "Built in about a week or less",
    ],
    featured: false,
  },
  {
    name: "The Business System",
    tag: "Most popular",
    range: "Most land $1,500 to $7,500",
    desc: "The site plus the machine behind it: capture, follow up, book, get paid.",
    items: [
      "Everything in The Starter Site",
      "CRM: every lead named, tracked, followed up",
      "Instant text-back and email automation",
      "Booking, scheduling, and payment buttons",
      "Blog and content engine for Google",
      "Member dashboard and admin portal",
    ],
    featured: true,
  },
  {
    name: "The Full Platform",
    tag: "The whole operation",
    range: "Scoped from $7,500+",
    desc: "Custom software your business runs on. Portals, tools, archives, the works.",
    items: [
      "Everything in The Business System",
      "Customer, member, or student portals",
      "Calculators, tools, and interactive features",
      "Courses, archives, and searchable records",
      "10 to 100 day email and text sequences",
      "Yours: your code, your data, your customer list",
    ],
    featured: false,
  },
] as const;

// The three taps that decide everything: what they do, what they have now, and
// how fast they want it. Same three questions as the Facebook instant form, so
// a lead looks identical no matter which door they came through. Required,
// because a lead with no answers is a lead Ryan cannot prioritize.
const QUALIFIERS = [
  {
    name: "q_industry",
    label: "What kind of business do you run? *",
    options: [
      "Home services or trades",
      "Restaurant, retail, or shop",
      "Health, beauty, or wellness",
      "Professional or office services",
      "Something else",
    ],
  },
  {
    name: "q_platform",
    label: "What do you have online right now? *",
    options: [
      "Nothing at all",
      "Just a Facebook page",
      "An old site that needs replacing",
      "A site I like, but no system behind it",
    ],
  },
  {
    name: "q_timeline",
    label: "How soon do you want this built? *",
    options: ["This week", "This month", "Next 90 days", "Just looking right now"],
  },
] as const;

// Optional deep-dive questions. People love talking about themselves and
// every answer makes the first build land closer. All skippable.
const DEEP_DIVE = [
  { name: "dd_started", label: "When did you start the business?", ph: "2019, last month, 30 years ago..." },
  { name: "dd_best_month", label: "What has been your best month ever?", ph: "Sales, jobs, whatever counts for you" },
  { name: "dd_setback", label: "What has been your biggest setback?", ph: "The thing that hurt the most" },
  { name: "dd_missing", label: "What do you wish you had that you do not?", ph: "More calls? More time? A booking system?" },
  { name: "dd_dream_tool", label: "One tool that would change your life right now?", ph: "Dream big. I might build it." },
  { name: "dd_fav_app", label: "An app or connector you already love?", ph: "QuickBooks, Square, Calendly..." },
  { name: "dd_hosted", label: "Where is your website hosted right now?", ph: "Wix, GoDaddy, Facebook only, nowhere..." },
  { name: "dd_monthly_spend", label: "Roughly what do you pay per month total?", ph: "Site + email + texting + ads + tools" },
] as const;

const MAX_FILES = 8;
const MAX_MB = 50;

export default function FreeBuildFunnel() {
  const [business, setBusiness] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Push to talk: record a voice memo in the browser and attach it like any
  // other upload. Caps at 3 minutes to keep files sane.
  async function toggleRecording() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported on this browser. Upload a voice memo file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size) {
          const ext = (mr.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
          const memo = new File([blob], `voice-memo-${Date.now().toString(36)}.${ext}`, { type: blob.type });
          setFiles((prev) => (prev.length >= MAX_FILES ? prev : [...prev, memo]));
        }
      };
      recRef.current = mr;
      mr.start();
      setRecSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setRecSeconds((s) => {
          if (s + 1 >= 180) recRef.current?.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Could not reach your microphone. You can upload a voice memo file instead.");
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      if (f.size > MAX_MB * 1024 * 1024) continue;
      next.push(f);
    }
    setFiles(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    if (smsConsent && !phone) {
      setError("Add a mobile number so I can text you.");
      setSending(false);
      return;
    }

    // 1) Upload their files to private storage.
    const uploaded: string[] = [];
    if (files.length) {
      setProgress(`Uploading your files (0 of ${files.length})...`);
      const supabase = createClient();
      const stamp = Date.now().toString(36);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const path = `${stamp}-${Math.random().toString(36).slice(2, 8)}/${safe}`;
        const { error: upErr } = await supabase.storage.from("intake").upload(path, f);
        if (!upErr) uploaded.push(path);
        setProgress(`Uploading your files (${i + 1} of ${files.length})...`);
      }
      setProgress(null);
    }

    const story = notes.trim();
    const aiPref = String(form.get("dd_ai") ?? "").trim();
    const deepDive: Record<string, string> = {};
    for (const q of DEEP_DIVE) {
      const v = String(form.get(q.name) ?? "").trim();
      if (v) deepDive[q.name.replace("dd_", "")] = v.slice(0, 300);
    }
    if (aiPref) deepDive.ai_preference = aiPref;
    const deepDiveText = Object.entries(deepDive)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join(" | ");
    const params = new URLSearchParams(window.location.search);

    // 2) Save the lead. Instant email + text fire server-side.
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        business_name: business,
        email: form.get("email"),
        phone: phone || null,
        website_url: form.get("website_url"),
        industry: form.get("q_industry"),
        current_platform: form.get("q_platform"),
        timeline: form.get("q_timeline"),
        interest: "done_for_you",
        goals: [
          "FREE BUILD REQUEST (Facebook funnel).",
          story ? `Their words: ${story}` : "",
          deepDiveText ? `Deep dive: ${deepDiveText}` : "",
          uploaded.length ? `${uploaded.length} file(s) uploaded to intake storage.` : "",
        ]
          .filter(Boolean)
          .join(" ")
          .slice(0, 2000),
        sms_consent: smsConsent,
        marketing_email_consent: form.get("marketing_email_consent") === "on",
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        diagnostic: {
          version: 3,
          source: "free_build_funnel",
          uploads: uploaded,
          owner_notes: story || null,
          deep_dive: Object.keys(deepDive).length ? deepDive : null,
          next_action:
            "Free build request. Review uploads, build the site, send preview. No pay until they love it.",
        },
      }),
    });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}) as { error?: string })).error ??
          "That did not go through. Try again or text me: (903) 500-8898.",
      );
      setSending(false);
      return;
    }
    window.fbq?.("track", "Lead");
    setSubmitted(true);
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="pb-24">
      {/* HERO */}
      <section className="page-hero page-hero-centered">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-sky-400/40 bg-gradient-to-r from-sky-500/25 via-blue-600/20 to-violet-500/25 px-4 py-2 shadow-[0_0_30px_rgba(56,189,248,0.28)] backdrop-blur">
          <Hammer aria-hidden="true" className="h-3.5 w-3.5 text-sky-300" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-100">
            The Free Build Offer
          </span>
          <span className="rounded-full border border-emerald-400/50 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
            $0 up front
          </span>
        </span>
        <h1 style={{ marginTop: 18 }}>
          I will build your whole website. You pay nothing until you love it.
        </h1>
        <p style={{ marginTop: 14 }}>
          A Facebook page, an old site, photos, a voice memo, or nothing but a name. I
          build the complete site. You look at it. Do not want it? We shake hands and
          part friends. Love it? We agree on a fair price and it is yours.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="button-primary" onClick={scrollToForm}>
            Start My Free Build
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
          <a href="sms:+19035008898" className="button-secondary">
            Text Me: (903) 500-8898
          </a>
        </div>
        <p className="mt-4 text-sm font-semibold text-emerald-300">
          No card. No deposit. No contract. The build happens first. Fair, right?
        </p>

        {/* QUICK START — start typing right here on the first screen */}
        <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-sky-400/30 bg-white/[0.05] p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-5">
          <p className="text-sm font-extrabold text-white">
            Start right here. It takes 30 seconds.
          </p>
          <input
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="Your business name"
            maxLength={200}
            className="mt-3 w-full rounded-lg border border-white/15 bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-sky-400/60 focus:outline-none"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Tell me about it. What do you do? What do you want?"
            className="mt-2.5 w-full rounded-lg border border-white/15 bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-sky-400/60 focus:outline-none"
          />
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={toggleRecording}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                recording
                  ? "border-red-400/60 bg-red-500/15 text-red-200"
                  : "border-white/15 bg-black/25 text-slate-200 hover:border-sky-400/50"
              }`}
            >
              <Mic className={`h-4 w-4 ${recording ? "animate-pulse text-red-300" : "text-sky-300"}`} />
              {recording ? `Recording ${recSeconds}s... tap to stop` : "Rather talk? Record a voice memo"}
            </button>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-sky-400/50">
              <Paperclip className="h-4 w-4 text-sky-300" />
              Add photos, logo, or files
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
          </div>
          {files.length > 0 && (
            <p className="mt-2 text-xs font-semibold text-emerald-300">
              {files.length} file{files.length > 1 ? "s" : ""} attached. It all rides along when you hit send below.
            </p>
          )}
          {error && !submitted && (
            <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
          )}
          <button type="button" onClick={scrollToForm} className="button-primary mt-3 w-full">
            Keep Going. I Am Already Listening.
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* MALL WALK VIDEO — first thing under the hero. Ryan talking to a real
          business owner in the Longview Mall does more work than any paragraph
          on this page. People meet the man, then they meet the form. */}
      <MallWalkVideo onStart={scrollToForm} />

      {/* INTAKE — the form sits above the price bands on purpose. 48 ad
          visits produced zero fills while it lived below three tiers of
          numbers. People bounced on the price before they ever saw the ask. */}
      <section ref={formRef} className="mx-auto mt-14 w-[min(860px,100%-40px)] scroll-mt-24">
        {!submitted ? (
          <div className="rounded-[20px] border border-line bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-9">
            <span className="eyebrow">Start your free build</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">
              Tell me about your business.
            </h2>
            <p className="mt-2 text-slate-400">
              Four boxes and three taps. That is the whole ask. Everything under it is
              optional, and the more you give me the closer the first version lands to
              what you actually pictured.
            </p>
            <form onSubmit={handleSubmit} className="mt-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-field">
                  <span>Your name *</span>
                  <input name="full_name" autoComplete="name" required maxLength={200} />
                </label>
                <label className="form-field">
                  <span>Business name *</span>
                  <input
                    name="business_name"
                    required
                    maxLength={200}
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Email *</span>
                  <input name="email" type="email" autoComplete="email" required maxLength={200} />
                </label>
                <label className="form-field">
                  <span>Mobile phone *</span>
                  <input name="phone" type="tel" autoComplete="tel" required maxLength={50} />
                </label>
              </div>

              {/* THE THREE TAPS — same questions as the Facebook form */}
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {QUALIFIERS.map((q) => (
                  <label key={q.name} className="form-field">
                    <span>{q.label}</span>
                    <select name={q.name} required defaultValue="">
                      <option value="" disabled>
                        Pick one
                      </option>
                      {q.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label className="form-field mt-4">
                <span>Anything else you want me to know</span>
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional. What you do, what you want the site to feel like, businesses you admire. Or skip it and I will just call you."
                />
              </label>

              {/* OPTIONAL DEEP DIVE — folded away. Four required fields plus three
                  taps is the whole ask. Everything else is for the people who
                  want to talk, and they will open it themselves. */}
              <details className="group mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <summary className="cursor-pointer list-none text-sm font-extrabold text-sky-300">
                  Want to tell me more? Open this. Totally optional.
                </summary>
                <p className="mt-2 text-xs text-slate-500">
                  Skip anything. Answer what you feel like. Every answer makes the first
                  version sharper.
                </p>
                <label className="form-field mt-4">
                  <span>Facebook page, old website, or any link you have</span>
                  <input name="website_url" type="text" inputMode="url" placeholder="Anything counts. Or nothing at all." maxLength={300} />
                </label>
                <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                  {DEEP_DIVE.map((q) => (
                    <label key={q.name} className="form-field">
                      <span>{q.label}</span>
                      <input name={q.name} maxLength={300} placeholder={q.ph} />
                    </label>
                  ))}
                  <label className="form-field">
                    <span>Do you use ChatGPT or Claude?</span>
                    <select name="dd_ai" defaultValue="">
                      <option value="">Pick one if you want</option>
                      <option value="ChatGPT">ChatGPT mostly</option>
                      <option value="Claude">Claude mostly</option>
                      <option value="Both">Both</option>
                      <option value="Neither yet">Neither yet</option>
                    </select>
                  </label>
                </div>
              </details>

              {/* UPLOADS */}
              <div className="mt-5">
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Logos, photos, videos, voice memos (up to {MAX_FILES} files, {MAX_MB}MB each)
                </span>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-black/25 px-6 py-8 text-center transition hover:border-sky-400/50">
                  <FileUp className="h-7 w-7 text-sky-300" />
                  <span className="text-sm font-bold text-white">Tap to add your files</span>
                  <span className="text-xs text-slate-500">Images, video, audio, documents. Anything helps.</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
                        <span className="truncate">{f.name}</span>
                        <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, x) => x !== i))}>
                          <X className="h-4 w-4 text-slate-500 hover:text-white" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="consent-list mt-5">
                <label>
                  <input type="checkbox" name="sms_consent" defaultChecked />
                  <span>
                    Text me about my free build at the number above. The LeadFlow Pro may
                    call or text about this request and project updates. Consent is not a
                    condition of purchase. Message and data rates may apply. Reply STOP to
                    opt out.
                  </span>
                </label>
                <label>
                  <input type="checkbox" name="marketing_email_consent" defaultChecked />
                  <span>
                    Email me about my build plus occasional LeadFlow tools and updates. I
                    can unsubscribe at any time.
                  </span>
                </label>
              </div>
              {progress && <p className="mt-3 text-sm font-semibold text-sky-300">{progress}</p>}
              {error && (
                <p className="form-error mt-3" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="button-primary mt-6 w-full sm:w-auto" disabled={sending}>
                {sending ? "Sending It All to Ryan..." : "Build My Site Free"}
                {!sending && <Sparkles aria-hidden="true" className="h-4 w-4" />}
              </button>
              <p className="form-legal mt-4">
                By submitting, you agree to our <Link href="/terms">Terms</Link> and
                acknowledge our <Link href="/privacy">Privacy Policy</Link>. No payment
                is collected on this page. Ever. You pay only if you decide you want the
                finished build.
              </p>
            </form>
          </div>
        ) : (
          <div className="rounded-[20px] border border-emerald-400/30 bg-emerald-500/[0.06] p-9 text-center">
            <CircleCheck className="mx-auto h-12 w-12 text-emerald-300" />
            <h2 className="mt-4 text-3xl font-black text-white">I got it. I am on it.</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Check your phone and your email: confirmation is already on the way. I am
              reviewing everything you sent and your build goes on my bench. You will get
              a preview link when it is standing. Remember the deal: you do not pay a dime
              unless you love it.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/portfolio" className="button-secondary">
                See What Your Site Could Look Like
              </Link>
              <a href="sms:+19035008898" className="button-secondary">
                Text Me Anytime
              </a>
            </div>
          </div>
        )}
      </section>
      {/* 3 STEPS */}
      <section className="mx-auto mt-10 w-[min(1000px,100%-40px)]">
        <div className="grid gap-3.5 md:grid-cols-3">
          {[
            { icon: MessageSquareMore, t: "1. Tell me about it", d: "As little or as much as you want. Name, photos, videos, voice memos, old links. Dump it all on me." },
            { icon: Hammer, t: "2. I build the whole thing", d: "Real pages, real forms, real follow-up. Built like the live sites below, customized to you." },
            { icon: ShieldCheck, t: "3. You decide", d: "Love it? We agree on a fair price by real hours, not agency math. Do not want it? You pay nothing." },
          ].map((s) => (
            <div key={s.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <s.icon className="h-6 w-6 text-sky-300" />
              <h2 className="mt-3 text-lg font-extrabold text-white">{s.t}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROOF WALL — screenshots, not a list of links */}
      <section className="mx-auto mt-14 w-[min(1100px,100%-40px)]">
        <div className="text-center">
          <span className="eyebrow">Built by me. Live right now.</span>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
            Do not take my word for it. Go click on them.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Every screen below is a real business running on a platform they own. Open
            any of them in a new tab and poke around. That is what yours looks like.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROOF.map((site) => (
            <a
              key={site.name}
              href={site.url}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-sky-400/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.22)]"
            >
              <div className="aspect-[1200/630] w-full overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={site.img}
                  alt={`${site.name} homepage`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-4">
                <p className="text-sm font-extrabold text-white">{site.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{site.what}</p>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-6 text-center text-sm font-black text-white">
          Plus more that are not even on this list.
        </p>
      </section>

      {/* THE NUMBERS — two charts instead of two paragraphs */}
      <section className="mx-auto mt-14 w-[min(1100px,100%-40px)]">
        <div className="text-center">
          <span className="eyebrow">Why this matters in dollars</span>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
            Renting your platform costs more than you think.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Published vendor pricing, not my opinion. And the second chart is the one
            that decides whether a lead ever becomes a customer.
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <RentVsOwnChart />
          <FollowUpSpeedChart />
        </div>
        <div className="mt-6 text-center">
          <button type="button" className="button-primary" onClick={scrollToForm}>
            Build Mine Free
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* TIERS */}
      <section className="mx-auto mt-14 w-[min(1060px,100%-40px)]">
        <div className="text-center">
          <span className="eyebrow">What builds usually look like</span>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
            Priced by real hours. Never agency math.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            If your build takes me an hour, I am not charging you thousands for it. These
            are typical ranges, and you approve the exact price before you pay anything.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                t.featured
                  ? "border-sky-400/60 bg-sky-500/[0.06] shadow-[0_0_40px_rgba(56,189,248,0.15)]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <span className={`self-start rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${t.featured ? "border-sky-400/50 bg-sky-500/15 text-sky-200" : "border-white/15 bg-white/[0.05] text-slate-300"}`}>
                {t.tag}
              </span>
              <h3 className="mt-3 text-2xl font-black text-white">{t.name}</h3>
              <p className="mt-1 text-sm font-bold text-sky-300">{t.range}</p>
              <p className="mt-2 text-sm text-slate-400">{t.desc}</p>
              <ul className="mt-4 flex-1 space-y-2.5">
                {t.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-400" strokeWidth={3} />
                    {it}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={scrollToForm}
                className={`mt-6 ${t.featured ? "button-primary" : "button-secondary"} w-full`}
              >
                Build Mine Free First
              </button>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-slate-400">
          Ready to commit today? Down payments and pay-in-full with card, Klarna, or
          Afterpay are on the{" "}
          <Link href="/packages/launch" className="font-bold text-sky-300 underline">
            package pages
          </Link>
          . But the free build needs no money at all.
        </p>
      </section>

    </main>
  );
}
