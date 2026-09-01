import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  Laptop,
  MapPin,
  Radar,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkshopServiceClient,
  formatWorkshopDate,
  type WorkshopEventRow,
  type WorkshopPolicies,
} from "@/lib/eventCommerce";
import WorkshopSystemMap from "../WorkshopSystemMap";
import WorkshopCheckout from "./WorkshopCheckout";
import styles from "./workshop.module.css";

type EventRow = WorkshopEventRow;

const PREVIEW_EVENT: EventRow = {
  id: "44a7f680-1693-48f2-9ba6-0555645878fc",
  slug: "east-texas-ai-operator-workshop",
  title: "ChatGPT for Business Owners: Live in Longview",
  description: "A hands-on ChatGPT workshop for East Texas business owners.",
  venue: "The LeadFlow Pro at Premier Dental Academy of Longview",
  city: "Longview, Texas",
  starts_at: "2026-09-10T23:30:00.000Z",
  duration_minutes: 90,
  price_usd: 97,
  capacity: 10,
  is_published: false,
  sales_status: "draft",
  instructor_name: "Ryan Nichols",
};

async function getEvent(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workshop_events")
    .select("id, slug, title, description, venue, city, starts_at, duration_minutes, price_usd, capacity, is_published, sales_status, instructor_name")
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("sales_status", "open")
    .maybeSingle();
  if (data) return data as EventRow;
  const canPreviewDraft =
    process.env.WORKSHOP_PREVIEW === "1" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development";
  if (canPreviewDraft && slug === PREVIEW_EVENT.slug) {
    try {
      const service = createWorkshopServiceClient();
      const { data: draft } = await service
        .from("workshop_events")
        .select("id, slug, title, description, venue, city, starts_at, duration_minutes, price_usd, capacity, is_published, sales_status, instructor_name")
        .eq("slug", slug)
        .maybeSingle();
      if (draft) return draft as EventRow;
    } catch {
      // Local and branch previews keep a safe visual fallback when server
      // credentials have not been pulled.
    }
    return PREVIEW_EVENT;
  }
  return null;
}

async function getPolicies(event: EventRow): Promise<WorkshopPolicies | null> {
  if (!event.is_published || event.sales_status !== "open") return null;
  try {
    const service = createWorkshopServiceClient();
    const { data, error } = await service.rpc("workshop_checkout_terms", { p_event_id: event.id });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};
  return {
    title: `${event.title} | The LeadFlow Pro`,
    description: "A hands-on, beginner-friendly ChatGPT workshop for East Texas business owners. Ten seats. Bring your laptop and build something real.",
    openGraph: {
      title: event.title,
      description: "Ten seats. Ninety minutes. Build something real with ChatGPT.",
      images: [{ url: `/events/${event.slug}/opengraph-image`, width: 1200, height: 630 }],
    },
  };
}

const AGENDA = [
  ["0–10", "ChatGPT in plain English", "Understand Chat, Work, and Codex without the jargon."],
  ["10–25", "The same business task, two ways", "See what a vague request produces, then what changes when you give AI an operator brief."],
  ["25–45", "Build a real business asset live", "Watch an idea become an offer, landing page, form, and follow-up path."],
  ["45–65", "Use the framework on your business", "Work from the same build map while Ryan coaches the room."],
  ["65–78", "One business, mapped live", "One attendee gets a focused map of where AI can save time or recover missed opportunity."],
  ["78–88", "Questions and next moves", "Get practical answers based on the business in front of you."],
  ["88–90", "Choose what happens next", "Leave with a do-it-yourself path and an optional way to get implementation help."],
];

export default async function WorkshopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const policies = await getPolicies(event);
  const salesOpen = event.is_published && event.sales_status === "open" && Boolean(policies);
  const when = formatWorkshopDate(event.starts_at);
  const place = [event.venue, event.city].filter(Boolean).join(" · ") || "Longview, Texas";

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className={styles.hero}>
        <div className={`cb-shell ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className="cb-eyebrow">Live in Longview · Ryan Nichols, instructor</p>
            <h1>Stop watching AI. <em>Start using it.</em></h1>
            <p className={styles.heroLead}>
              A hands-on ChatGPT workshop for business owners who want to build something useful,
              understand what they are doing, and leave with a clear first move.
            </p>
            <div className={styles.factGrid}>
              <span><CalendarDays aria-hidden="true" /><strong>{when}</strong></span>
              <span><Clock3 aria-hidden="true" /><strong>{event.duration_minutes ?? 90} minutes</strong></span>
              <span><MapPin aria-hidden="true" /><strong>{place}</strong></span>
              <span><Users aria-hidden="true" /><strong>{event.capacity ?? 10} seats only</strong></span>
            </div>
            <div className="cb-actions">
              <a href="#reserve" className="cb-btn cb-btn--primary" data-analytics="cta-workshop-hero">
                {salesOpen ? <>Reserve My Seat | {"$"}{Number(event.price_usd)}</> : <>September 10 Target | Sales Closed</>}
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="#agenda" className="cb-btn cb-btn--ghost">See the 90 Minutes</a>
            </div>
            <p className={styles.priceNote}>Founding workshop price. Future sessions will cost more.</p>
          </div>
          <Image
            className={styles.heroImage}
            src="/images/workshops/chatgpt-workshop-stop-watching-ai-4x5-v2.webp"
            alt="Stop watching AI and start using it at the hands-on ChatGPT workshop"
            width={1440}
            height={1800}
            priority
            sizes="(max-width: 900px) 92vw, 40vw"
          />
        </div>
      </section>

      <section className={styles.promiseBand}>
        <div className={`cb-shell ${styles.promiseGrid}`}>
          <div>
            <p className="cb-eyebrow">The point of the room</p>
            <h2 className="cb-h2">You will not sit through another AI lecture.</h2>
          </div>
          <div className={styles.checkList}>
            {["Bring your laptop and your real business", "Build from a repeatable prompt framework", "See a business asset created live", "Leave with your first practical AI use case"].map((item) => (
              <p key={item}><Check aria-hidden="true" />{item}</p>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.systemBand}>
        <div className="cb-shell">
          <WorkshopSystemMap />
        </div>
      </section>

      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The operator loop</p>
              <h2 className="cb-h2">One framework. One useful build. One next move.</h2>
            </div>
            <p className="cb-lead">You do not need fifty tools. You need to know how to give ChatGPT a real job and keep the work inside the business.</p>
          </div>
          <div className={styles.operatorLoop}>
            {[
              ["01", "Brief", "Define the job, context, limits, and finished result."],
              ["02", "Build", "Create one real asset while the business facts are in front of you."],
              ["03", "Check", "Review the output for truth, voice, risk, and missing pieces."],
              ["04", "Use", "Put the finished work into the page, offer, form, or follow-up path."],
              ["05", "Measure", "Watch what happened and decide the next controlled improvement."],
            ].map(([number, title, body]) => (
              <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section id="agenda" className="cb-band">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The 90-minute build</p>
              <h2 className="cb-h2">Every minute has a job.</h2>
            </div>
            <p className="cb-lead">The examples stay simple enough to follow and real enough to use when you get back to work.</p>
          </div>
          <div className={styles.agenda}>
            {AGENDA.map(([time, title, body]) => (
              <article key={time}>
                <span>{time} min</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.progressBand}>
        <div className={`cb-shell ${styles.progressGrid}`}>
          <div>
            <p className="cb-eyebrow">Progress without overload</p>
            <h2 className="cb-h2">The class is the first controlled move.</h2>
            <p className="cb-lead">The workshop gives you a working method and a useful first build. The seven-day review keeps the next step tied to what actually happened in your business.</p>
          </div>
          <div className={styles.progressSteps}>
            <article><Route aria-hidden="true" /><span>Before class</span><strong>Submit one bottleneck</strong><p>Ryan prepares the room around real business needs.</p></article>
            <article><Radar aria-hidden="true" /><span>During class</span><strong>Build and check</strong><p>Practice the operator loop with coaching and feedback.</p></article>
            <article><ShieldCheck aria-hidden="true" /><span>After class</span><strong>Review the next move</strong><p>Use the Next Move card, report progress, and request help only if you want it.</p></article>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint">
        <div className={`cb-shell ${styles.clinicGrid}`}>
          <Image
            src="/images/workshops/chatgpt-workshop-first-use-case-4x5-v2.webp"
            alt="A workshop map turning business problems into practical AI use cases"
            width={1440}
            height={1800}
            sizes="(max-width: 900px) 92vw, 42vw"
          />
          <div>
            <p className="cb-eyebrow">Founding cohort bonus</p>
            <h2 className="cb-h2">Stay for the 30-minute AI Business Clinic.</h2>
            <p className="cb-lead">
              Every attendee gets a Next Move card. Two businesses get live hot seats so the room can see how the same framework changes from one company to another.
            </p>
            <div className={styles.miniCards}>
              <div><BadgeCheck aria-hidden="true" /><strong>Everyone leaves with direction</strong><span>One use case, one recommended tool, one next action.</span></div>
              <div><Laptop aria-hidden="true" /><strong>Two live hot seats</strong><span>Focused maps, not ten rushed consulting sessions.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--ink">
        <div className={`cb-shell ${styles.audienceGrid}`}>
          <div>
            <p className="cb-eyebrow">This is for you if</p>
            <h2 className="cb-h2">You run something real and want AI to help.</h2>
          </div>
          <div className={styles.audienceList}>
            <p>Business owners and operators</p>
            <p>Authors, creators, and people selling expertise</p>
            <p>Local service companies and professional offices</p>
            <p>Anyone ready to build a page, offer, form, follow-up, or workflow</p>
          </div>
        </div>
      </section>

      <section className="cb-band">
        <div className={`cb-shell ${styles.instructorGrid}`}>
          <Image
            src="/images/ryan-meta-raybans-production-clean.jpg"
            alt="Ryan Nichols, instructor for The LeadFlow Pro ChatGPT workshop"
            width={768}
            height={1024}
            sizes="(max-width: 800px) 92vw, 34vw"
          />
          <div>
            <p className="cb-eyebrow">Your instructor</p>
            <h2 className="cb-h2">Ryan builds with this every day.</h2>
            <p className="cb-lead">
              Ryan Nichols uses ChatGPT, Codex, GitHub, Vercel, Supabase, automation, and connected business systems to turn ideas into working assets. This class is taught by the person doing the work, not someone reading slides about it.
            </p>
            <p className={styles.standalone}>The workshop stands on its own. There is no obligation to buy anything else. Optional implementation help is available after class for businesses that want it.</p>
            <p className={styles.partnerNote}>
              Ryan teaches and coaches the room. Pat Grabbs handles qualification and implementation follow-up only when an attendee asks for help after class.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.reserveBand}>
        <div className={`cb-shell ${styles.reserveGrid}`}>
          <div className={styles.reserveCopy}>
            <p className="cb-eyebrow">Bring your laptop</p>
            <h2 className="cb-h2">Leave with confidence, not another folder of notes.</h2>
            <p className="cb-lead">Ten paid seats. First come, first served. Exact arrival instructions are sent after registration.</p>
            <ul>
              <li><Check aria-hidden="true" />Live, beginner-friendly instruction</li>
              <li><Check aria-hidden="true" />The prompt framework used in the build</li>
              <li><Check aria-hidden="true" />Your personal Next Move card</li>
              <li><Check aria-hidden="true" />Optional founding-cohort clinic after class</li>
            </ul>
          </div>
          <WorkshopCheckout event={event} policies={policies} salesOpen={salesOpen} />
        </div>
      </section>

      <section className="cb-band cb-band--tint">
        <div className={`cb-shell ${styles.faq}`}>
          <p className="cb-eyebrow">Straight answers</p>
          <h2 className="cb-h2">Before you reserve.</h2>
          <details><summary>Do I need experience with ChatGPT?</summary><p>No. The workshop starts in plain English and moves into a real build you can follow.</p></details>
          <details><summary>Is this a Claude class too?</summary><p>No. The first workshop stays focused on ChatGPT so the room can go deeper without juggling two platforms. Claude will have its own advanced workshop.</p></details>
          <details><summary>Will I be sold something else?</summary><p>The workshop is a complete standalone class. Ryan will briefly explain optional next steps at the end for anyone who wants implementation help. There is no obligation.</p></details>
          <details><summary>What should I bring?</summary><p>Bring a charged laptop, your ChatGPT login, and one real business task you want help with.</p></details>
          <Link href="/events" className="cb-textlink">See all events <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
