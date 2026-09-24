"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Film, Globe, Images, Mail, MapPin, Megaphone, Phone, ShieldCheck, Video } from "lucide-react";
import { PRICE_CENTS, ADS_CENTS, SERVICE_CENTS, STARTS_AT, ENDS_AT } from "@/lib/septemberSpecial";
import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd, usdFrom } from "@/lib/site/prices";
import styles from "./special.module.css";

const PRICE = usd(PRICE_CENTS / 100);
const ADS = usd(ADS_CENTS / 100);
const SERVICES = usd(SERVICE_CENTS / 100);

type Availability = {
  availableSpots: number;
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "open" | "sold_out" | "expired" | "unavailable";
};

const features = [
  { icon: Megaphone, count: "100", name: "Facebook business posts", body: "Three posts every day for 30 days, plus 10 extra posts. Your business stays in front of people." },
  { icon: Globe, count: "01", name: "Business website", body: "A website built around your business, your offer and a clear way for customers to reach you." },
  { icon: Mail, count: "30 days", name: "Automated email follow-up", body: "A 30-day follow-up series for your leads. You keep the series after the introductory month." },
  { icon: Video, count: "02 hours", name: "On-location commercial shoot", body: "Ryan comes to your business for a two-hour session. Includes one edited commercial. Within 50 miles of Longview, Texas." },
  { icon: Images, count: "10", name: "Custom business images", body: "Ten images customized for your business, ready to support your content and offer." },
  { icon: Film, count: "05", name: "Short reels", body: "Five short videos to give your business more ways to show up and tell its story." },
];

export default function SeptemberSpecial({ initialNow }: { initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [sending, setSending] = useState(false);
  const [resume, setResume] = useState<{ url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const starts = Date.parse(STARTS_AT);
  const ends = Date.parse(ENDS_AT);
  const expired = now >= ends || availability?.status === "expired";
  const upcoming = now < starts;
  const soldOut = availability?.status === "sold_out";
  const unavailable = !availability || availability.status === "unavailable";
  const seconds = Math.max(0, Math.floor(((upcoming ? starts : ends) - now) / 1000));
  const clock = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("leadflow-september-resume") || "null");
      if (saved && typeof saved.url === "string" && typeof saved.expiresAt === "string") {
        const url = new URL(saved.url);
        if (url.protocol === "https:" && url.hostname === "checkout.stripe.com" && Date.parse(saved.expiresAt) > Date.now()) setResume(saved);
      }
    } catch { /* Session storage may be unavailable. */ }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/september-special/availability", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (active) setAvailability(response.ok ? data : { availableSpots: 0, startsAt: STARTS_AT, endsAt: ENDS_AT, status: "unavailable" });
      } catch { if (active) setAvailability({ availableSpots: 0, startsAt: STARTS_AT, endsAt: ENDS_AT, status: "unavailable" }); }
    }
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, []);

  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (upcoming || expired || soldOut || sending || unavailable) return;
    setSending(true);
    setError(null);
    const fields = new FormData(event.currentTarget);
    const params = new URLSearchParams(window.location.search);
    try {
      const email = String(fields.get("email") || "").trim().toLowerCase();
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
      const identity = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      try {
        const saved = JSON.parse(sessionStorage.getItem("leadflow-september-checkout") || "null");
        if (saved?.identity === identity && typeof saved.id === "string" && Date.now() - saved.createdAt < 35 * 60 * 1000) requestId.current = saved.id;
        else requestId.current = crypto.randomUUID();
        sessionStorage.setItem("leadflow-september-checkout", JSON.stringify({ id: requestId.current, identity, createdAt: saved?.id === requestId.current ? saved.createdAt : Date.now() }));
      } catch { requestId.current ??= crypto.randomUUID(); }
      const response = await fetch("/api/september-special/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId.current,
          full_name: String(fields.get("full_name") || "").trim(),
          email: String(fields.get("email") || "").trim(),
          phone: String(fields.get("phone") || "").trim(),
          business_name: String(fields.get("business_name") || "").trim(),
          business_city: String(fields.get("business_city") || "").trim(),
          website_url: (() => { const value = String(fields.get("website_url") || "").trim(); return value && !/^https?:\/\//i.test(value) ? `https://${value}` : value; })(),
          within_service_area: fields.get("within_service_area") === "on",
          offer_terms_accepted: fields.get("offer_terms_accepted") === "on",
          marketing_email_consent: fields.get("marketing_email_consent") === "on",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign") || "september-special-2026",
        }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") {
        if (data.code === "hold_expired" || data.code === "request_conflict") {
          requestId.current = null;
          try { sessionStorage.removeItem("leadflow-september-checkout"); } catch { /* Storage can be disabled. */ }
        }
        throw new Error(data.error || "Checkout could not open. Please try again or call Ryan.");
      }
      const target = new URL(data.url);
      if (target.protocol !== "https:" || target.hostname !== "checkout.stripe.com") throw new Error("Checkout could not open. Please call Ryan.");
      if (typeof data.expiresAt === "string" && Date.parse(data.expiresAt) > Date.now()) {
        const existingCheckout = { url: target.href, expiresAt: data.expiresAt };
        setResume(existingCheckout);
        try { sessionStorage.setItem("leadflow-september-resume", JSON.stringify(existingCheckout)); } catch { /* The checkout still opens when storage is unavailable. */ }
      }
      window.location.assign(target.href);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Checkout could not open. Please try again.");
      setSending(false);
    }
  }

  const canResume = resume !== null && Date.parse(resume.expiresAt) > now;
  const resumeCheckout = canResume ? (
    <div className={styles.resume}>
      <p>You already opened a checkout. Complete payment before its hold expires to secure your spot.</p>
      <a className={styles.primary} href={resume.url}>Resume your checkout <ArrowRight size={18} /></a>
    </div>
  ) : null;

  if (expired) return (
    <main className={styles.page}>
      <section className={styles.closed}>
        <span className={styles.kicker}>The LeadFlow Pro</span>
        <h1>The September offer has closed.</h1>
        <p>New checkouts closed September 24, 2026 at 6:00 p.m. Central. Already-open checkouts have 30 minutes to finish. New work is quoted at the pricing in your written proposal.</p>
        {resumeCheckout}
        <Link className={styles.primary} href="/start">Get a proposal <ArrowRight size={18} /></Link>
        <a className={styles.contact} href={BUSINESS.phone.tel}>Call Ryan: {BUSINESS.phone.display}</a>
      </section>
    </main>
  );

  return (
    <main className={styles.page}>
      <section className={styles.deadline} aria-label="Offer deadline">
        <div>
          <p><Clock3 size={17} aria-hidden="true" /> {upcoming ? "48-hour offer opens tonight" : "The 48-hour checkout window is open"}</p>
          <strong>{upcoming ? "Tuesday, September 22 · 6:00 p.m. Central" : "Closes Thursday, September 24 · 6:00 p.m. Central"}</strong>
        </div>
        <div className={styles.countdown} role="timer" aria-label={`${upcoming ? "Opens" : "Closes"} in ${clock[0]} hours ${clock[1]} minutes ${clock[2]} seconds`}>
          {clock.map((number, i) => <div key={i}><b>{String(number).padStart(2, "0")}</b><span>{["Hours", "Minutes", "Seconds"][i]}</span></div>)}
        </div>
      </section>

      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}>September special · Five businesses</span>
          <h1>Give us 30 days.<br /><em>Put your business<br />in front of people.</em></h1>
          <p className={styles.intro}>The posts. The website. The follow-up. The video. One focused month with The LeadFlow Pro, built to turn attention into real conversations.</p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href="#claim">{upcoming ? "See how to claim your spot" : soldOut ? "Check availability" : `Claim a spot for ${PRICE}`} <ArrowRight size={18} /></a>
            <a className={styles.textLink} href="#included">See everything included ↓</a>
          </div>
          <div className={styles.trust}><span><Check size={16} />One-time payment</span><span><Check size={16} />No automatic renewal</span><span><MapPin size={16} />Longview + 50 miles</span></div>
        </div>
        <aside className={styles.priceCard} aria-label="Package price">
          <div className={styles.priceTop}><span>The whole first month</span><span>5 CLIENT LIMIT</span></div>
          <p className={styles.price}>{PRICE}<span>one time</span></p>
          <p className={styles.priceCopy}>Everything below. Including your first {ADS} in advertising.</p>
          <div className={styles.split}><div><b>{SERVICES}</b><span>Content, website,<br />video + follow-up</span></div><span>+</span><div><b>{ADS}</b><span>Included<br />ad budget</span></div></div>
          <ul className={styles.quickList}><li><Check />100 Facebook posts</li><li><Check />Website + 30-day email series</li><li><Check />On-site shoot + edited commercial</li><li><Check />10 custom images + 5 short reels</li></ul>
          <p className={styles.paymentNote}>Payment secures the offer. A conversation or an unfinished checkout does not.</p>
        </aside>
      </section>

      <div className={styles.offerGraphic}>
        <Image
          src="/images/offers/september-special-1497.png"
          alt={`The LeadFlow Pro September special: ${PRICE} one time, ${ADS} in ads included, 100 Facebook posts, a website, 30-day email follow-up, one commercial, five reels and ten custom images. Five businesses. Start checkout before September 24 at 6 p.m. Central.`}
          width={1254}
          height={1254}
          sizes="(max-width: 740px) calc(100vw - 40px), 720px"
        />
      </div>

      <section className={styles.includes} id="included">
        <div className={styles.sectionHead}><span className={styles.kicker}>One month. Real work.</span><h2>Here is what we are<br />putting behind your business.</h2></div>
        <div className={styles.featureGrid}>{features.map(({ icon: Icon, count, name, body }) => <article className={styles.feature} key={name}><div><Icon size={23} aria-hidden="true" /><span>{count}</span></div><h3>{name}</h3><p>{body}</p></article>)}</div>
        <div className={styles.adBand}><Megaphone size={27} aria-hidden="true" /><div><h3>{ADS} of your payment goes toward ads.</h3><p>It is part of the {PRICE} total. Any additional ad spend is your choice and requires your approval.</p></div></div>
      </section>

      <section className={styles.value}>
        <div className={styles.sectionHead}><span className={styles.kicker}>Put the price in perspective</span><h2>A small introductory price.<br />A substantial list of work.</h2><p>Our standard services and other providers’ published starting prices show what individual pieces can cost. Scopes and ongoing fees differ.</p></div>
        <p className={styles.estimate}><strong>Ryan’s custom-package estimate: {usd(PRICES.septemberSpecialEstimateLow)}–{usdFrom(PRICES.septemberSpecialEstimateHigh)}.</strong> That is his estimate for this mix of work in a separately scoped engagement. Final custom pricing depends on scope.</p>
        <div className={styles.comparison}>
          <article><span className={styles.kicker}>Our standard starting points</span><h3>The LeadFlow Pro</h3><dl><div><dt>Website Launch</dt><dd>{usd(PRICES.websiteLaunchTotal)}</dd></div><div><dt>Lead Engine</dt><dd>{usdFrom(PRICES.leadEngineFrom)}</dd></div><div><dt>Company OS</dt><dd>{usdFrom(PRICES.companyOsFrom)}</dd></div></dl><p>Separate offers with their own written scopes. <Link href="/packages">See our standard services.</Link></p></article>
          <article><span className={styles.kicker}>Published provider examples</span><h3>What individual pieces can cost</h3><dl><div><dt><a href="https://www.lyfemarketing.com/services/social-media-solutions/" target="_blank" rel="noopener noreferrer">LYFE: 12 image posts / month</a></dt><dd>$750/mo</dd></div><div><dt><a href="https://norakramerdesigns.com/turnkey-website-design-prices/" target="_blank" rel="noopener noreferrer">Nora Kramer: 5-page website</a></dt><dd>From $2,500</dd></div></dl><p>Public prices checked September 22, 2026. LYFE includes Facebook and Instagram. Nora Kramer adds $89/month care. Scope, location and ongoing fees differ.</p></article>
        </div>
        <div className={styles.ryanNote}><p>Try us for one month. Let the work speak for itself.</p><span>Ryan Nichols · The LeadFlow Pro</span><small>No required second month. No guaranteed lead count, sales or revenue. We deliver the work, build the follow-up and give your business a real run at it.</small></div>
      </section>

      <section className={styles.claim} id="claim">
        <div className={styles.claimCopy}>
          <span className={styles.kicker}>Completed payment is what locks it in</span>
          <h2>Five businesses.<br />One 48-hour window.</h2>
          <p>Start checkout before September 24 at 6:00 p.m. Central, while a spot is available. You then have 30 minutes to finish payment. After the deadline, no new special-price checkouts open and written proposal pricing applies.</p>
          <ol><li><b>1</b><div><strong>Tell us about your business.</strong><span>Confirm your location is within 50 miles of Longview for the included shoot.</span></div></li><li><b>2</b><div><strong>Pay {PRICE} through Stripe.</strong><span>Start before the deadline and finish payment within your 30-minute checkout window. Only completed payment secures your spot.</span></div></li><li><b>3</b><div><strong>We confirm the kickoff.</strong><span>We arrange account access, approve your business offer and schedule your shoot. Your 30-day service period begins at the agreed kickoff.</span></div></li></ol>
          <a className={styles.phone} href={BUSINESS.phone.tel}><Phone size={19} /> Talk to Ryan: {BUSINESS.phone.display}</a>
        </div>
        <div className={styles.formCard}>
          {resumeCheckout}
          <div className={styles.formHead}><ShieldCheck size={22} /><div><h3>{soldOut ? "All spots are paid or temporarily held" : "Get your business in"}</h3><p>{soldOut ? "A spot may reopen if a checkout expires. You can also contact Ryan about the next project." : upcoming ? "Checkout opens September 22 at 6:00 p.m. Central." : "One payment. One month. No automatic renewal."}</p></div></div>
          {availability?.status === "open" && <p className={styles.capacity}>{availability.availableSpots} spot{availability.availableSpots === 1 ? "" : "s"} currently available. Active checkouts can temporarily hold a spot.</p>}
          {soldOut ? <a className={styles.primary} href={`mailto:${BUSINESS.email.hello}`}>Ask about the next opening <ArrowRight size={18} /></a> : <form onSubmit={checkout}>
            {!upcoming && unavailable && <p className={styles.error} role="status">We are checking live availability. If checkout stays unavailable, call Ryan at {BUSINESS.phone.display}. This page checks again automatically.</p>}
            <div className={styles.fields}>
              <label>Your name<input name="full_name" autoComplete="name" required maxLength={160} /></label>
              <label>Email<input name="email" type="email" autoComplete="email" required maxLength={200} /></label>
              <label>Business name<input name="business_name" autoComplete="organization" required maxLength={200} /></label>
              <label>Phone<input name="phone" type="tel" autoComplete="tel" required maxLength={50} /></label>
              <label>Business city<input name="business_city" autoComplete="address-level2" required maxLength={150} placeholder="Longview, TX" /></label>
              <label>Current website <span>(optional)</span><input name="website_url" maxLength={300} placeholder="yourbusiness.com" /></label>
            </div>
            <label className={styles.checkbox}><input name="within_service_area" type="checkbox" required /><span>My business location is within 50 miles of Longview, Texas.</span></label>
            <label className={styles.checkbox}><input name="offer_terms_accepted" type="checkbox" required /><span>I understand the package is {PRICE} total, including {ADS} in ad spend. I agree to the <Link href="/terms" target="_blank">Terms</Link> and acknowledge the <Link href="/privacy" target="_blank">Privacy Policy</Link>.</span></label>
            <label className={styles.checkbox}><input name="marketing_email_consent" type="checkbox" /><span>Email me occasional LeadFlow offers and tips. Optional. Unsubscribe any time.</span></label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={styles.primary} type="submit" disabled={sending || upcoming || unavailable}>{sending ? "Opening secure checkout…" : upcoming ? "Checkout opens at 6:00 p.m. Central" : unavailable ? "Checking availability…" : `Continue to payment · ${PRICE}`}{!sending && !upcoming && <ArrowRight size={18} />}</button>
            <p className={styles.formNote}>Klarna payment options may be available at checkout, subject to eligibility and provider terms.</p>
            <p className={styles.formNote}>You will review and pay on Stripe. Checkout temporarily holds a spot for 30 minutes. Only completed payment secures the package.</p>
          </form>}
        </div>
      </section>

      <section className={styles.faq} aria-labelledby="faq-title">
        <h2 id="faq-title">Know what you are buying.</h2>
        {[
          [`Is the ${ADS} ad budget extra?`, `No. Your one-time payment is ${PRICE} total: ${ADS} allocated to advertising and ${SERVICES} for the listed services. You approve any additional advertising budget before it is spent.`],
          ["Do I have to keep paying after 30 days?", "No. This package does not automatically renew. You keep the website, the delivered creative assets and your email follow-up series. Any future services require a separate agreement. Domain, hosting and email-platform costs, if needed, are identified before setup and approved separately."],
          ["How do 100 posts work in 30 days?", "The plan is three Facebook business-page posts per day for 30 days, plus 10 additional posts. We coordinate content, access and approvals with you before publishing."],
          ["When does my month start?", "Your service period begins on the kickoff date we agree after payment and account access are in place. The checkout deadline is separate: start before September 24, 2026 at 6:00 p.m. Central, then finish payment within 30 minutes."],
          ["What is included in the commercial?", "One two-hour visit to your business within 50 miles of Longview, Texas, and one edited commercial. We schedule the visit with you. The package also includes five short reels and ten custom business images."],
          ["Does this guarantee leads or sales?", "No provider can honestly promise a specific number of leads, sales or revenue from this package. Results depend on your offer, market, audience and follow-through. Our commitment is the work listed here."],
          ["What happens when the countdown ends?", "The introductory price expires exactly 48 hours after opening. Start checkout before the deadline while capacity remains. An already-open checkout has 30 minutes to finish payment. Afterward, new work uses your written proposal pricing."],
        ].map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}
      </section>
    </main>
  );
}
