import { redirect } from "next/navigation";
import { getHqSession } from "@/lib/hq/session";
import { listConnections } from "@/lib/hq/server";
import AutomationForm from "../_components/AutomationForm";
import BusinessForm from "../_components/BusinessForm";
import FacebookCard from "../_components/FacebookCard";
import SmsCard from "../_components/SmsCard";
import WebsiteFormCard from "../_components/WebsiteFormCard";

// Everything about this business in one place: who you are, what runs on its
// own, and where the leads come in from.

export const dynamic = "force-dynamic";

export default async function HqSettingsPage() {
  const session = await getHqSession();
  if (!session) redirect("/login?next=/hq/settings");
  if (!session.workspace) redirect("/hq/start");

  const ws = session.workspace;
  const connections = await listConnections(session.db, ws.id);
  const sms = connections.find((c) => (c.kind === "openphone" || c.kind === "twilio") && c.status === "connected") ?? null;
  const facebook = connections.find((c) => c.kind === "meta_page" && c.status === "connected") ?? null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <p className="hq-eyebrow">Settings</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">How {ws.name} runs</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Three cards. Who you are, what Autopilot may do without asking, and where your leads come in from.
        </p>
      </header>

      <div className="mt-6 grid gap-6">
        <BusinessForm workspace={ws} />

        <AutomationForm settings={ws.settings} smsConnected={!!sms} />

        <section id="channels" className="scroll-mt-24">
          <h2 className="text-xl font-black text-[var(--heading)]">Where leads come in</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            You do not need all three. Each one you connect is one more place a customer can reach you without anything falling through.
          </p>
          <div className="mt-4 grid gap-4">
            <SmsCard connection={sms} />
            <FacebookCard connection={facebook} />
            <WebsiteFormCard businessName={ws.name} />
          </div>
        </section>
      </div>
    </main>
  );
}
