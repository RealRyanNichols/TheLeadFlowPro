import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Check, CircleAlert, Laptop, LockKeyhole, MapPin } from "lucide-react";
import { createWorkshopServiceClient, workshopCalendarUrl, type WorkshopEventRow } from "@/lib/eventCommerce";
import type { StripeCheckoutSession } from "@/lib/stripeCheckout";
import ProgressCheckin from "./ProgressCheckin";
import styles from "./confirmed.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workshop seat confirmation | The LeadFlow Pro",
  robots: { index: false, follow: false },
};

type ConfirmedRegistration = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  business_name: string | null;
  notes: string | null;
  status: string;
  payment_status: string;
  seat_number: number | null;
  stripe_checkout_session_id: string | null;
};

type PrivateDetails = {
  exact_address: string | null;
  arrival_notes: string | null;
};

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function retrieveStripeSession(sessionId: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as StripeCheckoutSession;
}

export default async function WorkshopConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const sessionId = clean(query.session_id, 240);
  const stripe = sessionId ? await retrieveStripeSession(sessionId) : null;
  const metadata = stripe?.metadata ?? {};
  const eventId = clean(metadata.event_id, 80);
  const registrationId = clean(metadata.registration_id, 80);
  const schema = clean(metadata.workshop_schema, 20);
  const stripePaid = stripe?.payment_status === "paid";

  if (!stripe || !stripePaid || schema !== "v2" || !eventId || !registrationId) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <CircleAlert aria-hidden="true" />
          <p>Payment verification</p>
          <h1>This confirmation link is not ready.</h1>
          <span>No private arrival information has been released. If you just paid, wait a moment and reopen the link from Stripe or your confirmation email.</span>
          <Link href={`/events/${slug}`}>Return to the workshop</Link>
        </section>
      </main>
    );
  }

  const service = createWorkshopServiceClient();
  const [{ data: event }, { data: registration }] = await Promise.all([
    service
      .from("workshop_events")
      .select("id, slug, title, description, venue, city, starts_at, duration_minutes, price_usd, capacity, is_published, sales_status, instructor_name")
      .eq("id", eventId)
      .eq("slug", slug)
      .maybeSingle(),
    service
      .from("workshop_registrations")
      .select("id, event_id, full_name, email, business_name, notes, status, payment_status, seat_number, stripe_checkout_session_id")
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle(),
  ]);

  const attendee = registration as ConfirmedRegistration | null;
  const workshop = event as WorkshopEventRow | null;
  const confirmed = attendee?.status === "confirmed" && attendee.payment_status === "paid";
  if (!workshop || !attendee || !confirmed) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <LockKeyhole aria-hidden="true" />
          <p>Payment received</p>
          <h1>Your seat is being confirmed.</h1>
          <span>Stripe shows the payment, but the private attendee record is still processing. Refresh this page in a moment. The address stays locked until both records agree.</span>
        </section>
      </main>
    );
  }

  const { data: privateRows } = await service.rpc("workshop_confirmation_details", {
    p_event_id: workshop.id,
  });
  const privateDetails = (Array.isArray(privateRows) ? privateRows[0] : privateRows) as PrivateDetails | null;
  if (!privateDetails?.exact_address) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <Check aria-hidden="true" />
          <p>Seat confirmed</p>
          <h1>You are in, {attendee.full_name.split(/\s+/)[0]}.</h1>
          <span>Your arrival instructions are being finalized. Ryan will send them to {attendee.email} before class.</span>
        </section>
      </main>
    );
  }

  const calendarUrl = workshopCalendarUrl(workshop);
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <p>Verified paid attendee</p>
          <h1>Your seat is confirmed.</h1>
          <span>{attendee.full_name}, this page contains your private arrival and preparation details.</span>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.shellGrid}>
          <article className={styles.arrivalCard}>
            <div><MapPin aria-hidden="true" /><span>Private arrival location</span></div>
            <h2>{privateDetails.exact_address}</h2>
            <p>{privateDetails.arrival_notes || "Arrive 10 to 15 minutes early so you can connect and get settled."}</p>
            {attendee.seat_number && <strong>Seat {attendee.seat_number} of {workshop.capacity}</strong>}
            {calendarUrl && <a href={calendarUrl} target="_blank" rel="noreferrer"><CalendarPlus aria-hidden="true" />Add workshop and clinic to Google Calendar</a>}
          </article>
          <aside className={styles.prepCard}>
            <Laptop aria-hidden="true" />
            <p>Bring these three things</p>
            <h2>Charged laptop. ChatGPT login. One real bottleneck.</h2>
            <ul>
              <li><Check aria-hidden="true" />Test your ChatGPT login before class</li>
              <li><Check aria-hidden="true" />Bring the business facts needed for the build</li>
              <li><Check aria-hidden="true" />Write down what “better” would look like</li>
            </ul>
          </aside>
        </div>
        <div className={`${styles.shell} ${styles.nextMove}`}>
          <p>Your submitted bottleneck</p>
          <blockquote>{attendee.notes || "Bring one real business bottleneck and Ryan will help you identify the first controlled move."}</blockquote>
          <span>After class, use your Next Move card for seven days. Track what you built, what happened, and where you got stuck. You can keep building on your own or request a progress review.</span>
        </div>
        <div className={styles.shell}>
          <ProgressCheckin sessionId={sessionId} />
        </div>
      </section>
    </main>
  );
}
