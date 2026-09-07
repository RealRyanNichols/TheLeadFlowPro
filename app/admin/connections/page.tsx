import Link from "next/link";
import { requireOperatorAdmin } from "@/lib/operatoros/auth";
import { createServiceClient } from "@/lib/supabase/service";
import LiveRefresh from "../command-center/LiveRefresh";
import WorkspaceLinks from "@/components/WorkspaceLinks";

export const metadata = {
  title: "Capture & Connections | The LeadFlow Pro",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function date(value: string | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Chicago",
      }).format(new Date(value)) + " CT"
    : "No activity recorded yet";
}

export default async function ConnectionsPage() {
  const { supabase } = await requireOperatorAdmin();
  const [meta, all, replies, calls, messages] = await Promise.all([
    supabase
      .from("leads")
      .select("created_at", { count: "exact" })
      .eq("is_test", false)
      .is("deleted_at", null)
      .in("source", ["meta_lead_ad", "facebook-lead-ad", "facebook_lead_ad"])
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("leads")
      .select("created_at", { count: "exact" })
      .eq("is_test", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("lead_messages")
      .select("created_at", { count: "exact" })
      .eq("direction", "in")
      .eq("channel", "sms")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("lead_calls").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
  ]);
  let emailCount: number | null = null;
  let emailAt: string | undefined;
  let emailError = true;
  try {
    // Outbox is private. Only aggregates are returned to this verified admin.
    const delivered = await createServiceClient()
      .from("lead_email_notifications")
      .select("sent_at", { count: "exact" })
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(1);
    emailError = Boolean(delivered.error);
    emailCount = delivered.count;
    emailAt = delivered.data?.[0]?.sent_at;
  } catch {
    /* Render unavailable, never a false zero or a page failure. */
  }
  const metaConfigured = Boolean(
    process.env.META_PAGE_ACCESS_TOKEN &&
    process.env.META_APP_SECRET &&
    process.env.CRON_SECRET,
  );
  const smsConfigured = Boolean(
    process.env.QUO_WEBHOOK_SECRET &&
    process.env.QUO_LEADFLOW_INBOUND_PHONE_NUMBER_ID,
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">
            Capture & conversation connections
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            Saved activity and connection setup are shown separately. A
            configured key is not proof that every message has synced.
          </p>
        </div>
        <LiveRefresh />
      </header>
      <WorkspaceLinks admin />
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Facebook lead forms"
          label={
            meta.error ? "Unavailable" : `${meta.count ?? 0} live leads saved`
          }
        >
          <p>
            Last capture:{" "}
            {meta.error
              ? "Could not read activity"
              : date(meta.data?.[0]?.created_at)}
            .
          </p>
          <p>
            {metaConfigured
              ? "Webhook and five-minute backfill credentials are configured."
              : "Capture configuration needs review. Existing saved records remain in the CRM."}{" "}
            Open a lead to see the form, campaign, original answers, and
            submission time.
          </p>
          <Link href="/admin" className="font-bold text-[var(--blue)]">
            Open the lead list →
          </Link>
        </Card>
        <Card
          title="Website and other lead sources"
          label={
            all.error
              ? "Unavailable"
              : `${all.count ?? 0} live leads across all sources`
          }
        >
          <p>
            Last saved lead:{" "}
            {all.error
              ? "Could not read activity"
              : date(all.data?.[0]?.created_at)}
            .
          </p>
          <p>
            Website forms, Facebook forms, and imported call inquiries share the
            lead pipeline. Test and deleted records are excluded from this
            count.
          </p>
        </Card>
        <Card
          title="Lead alert emails"
          label={
            emailError ? "Unavailable" : `${emailCount ?? 0} notifications sent`
          }
        >
          <p>
            Last provider-accepted send:{" "}
            {emailError ? "Could not read delivery status" : date(emailAt)}.
          </p>
          <p>
            The outbox retries failed deliveries on a five-minute schedule.
            Provider acceptance does not verify inbox placement or that a
            recipient read the email.
          </p>
        </Card>
        <Card
          title="Calls and incoming texts"
          label={
            calls.error
              ? "Call records unavailable"
              : `${calls.count ?? 0} call records`
          }
        >
          <p>
            {smsConfigured
              ? "Inbound text handling is configured for the LeadFlow phone line."
              : "Automatic incoming texts need their Quo webhook connection checked."}
          </p>
          <p>
            {replies.error
              ? "Incoming text history could not be loaded."
              : `${replies.count ?? 0} incoming text messages recorded. Last: ${date(replies.data?.[0]?.created_at)}.`}{" "}
            Recorded calls and their available summaries appear on the matching
            lead.
          </p>
        </Card>
        <Card
          title="Member messages"
          label={
            messages.error
              ? "Unavailable"
              : `${messages.count ?? 0} messages saved`
          }
        >
          <p>
            Messages submitted through the member portal and public contact form
            are available in the back office.
          </p>
          <Link href="/admin/messages" className="font-bold text-[var(--blue)]">
            Open member and website messages →
          </Link>
        </Card>
        <Card
          title="Outlook email replies"
          label="Automatic mailbox sync is not connected"
        >
          <p>
            Emails sent through this CRM and manually logged replies appear in
            the lead history. Replies arriving in Ryan’s or Pat’s Outlook inbox
            are not automatically imported yet.
          </p>
          <p>
            Until the company mailboxes are connected, use “Log a reply” on the
            matching lead. It saves the conversation without sending another
            message.
          </p>
          <Link href="/admin" className="font-bold text-[var(--blue)]">
            Find the lead to log a reply →
          </Link>
        </Card>
      </div>
      <div className="card">
        <h3 className="font-bold">Three destinations, one clear way in</h3>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <li>
            <a
              className="font-bold text-[var(--blue)]"
              href="https://go.theleadflowpro.com"
            >
              go.theleadflowpro.com
            </a>{" "}
            opens the role-appropriate admin, staff, or member workspace after
            sign-in.
          </li>
          <li>
            <a
              className="font-bold text-[var(--blue)]"
              href="https://sites.theleadflowpro.com"
              target="_blank"
              rel="noreferrer"
            >
              sites.theleadflowpro.com
            </a>{" "}
            is the separately hosted website/audit request page; it is not a
            login portal.
          </li>
          <li>
            <Link
              href="/login?mode=reset"
              className="font-bold text-[var(--blue)]"
            >
              Password help
            </Link>{" "}
            lets each person set their own password from a secure email link.
          </li>
        </ul>
      </div>
    </div>
  );
}
function Card({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-5">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="my-3 text-sm font-bold text-[var(--blue)]">{label}</p>
      <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
        {children}
      </div>
    </section>
  );
}
