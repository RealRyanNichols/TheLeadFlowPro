import { redirect } from "next/navigation";
import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import { getHqSession } from "@/lib/hq/session";
import { parseAuthorizeParams, SCOPES } from "@/lib/hq/oauth";
import { getClient } from "@/lib/hq/server";
import { HQ_PLAN } from "@/lib/hq/types";
import ConsentForm from "./ConsentForm";

export const metadata = { ...PRIVATE_PAGE_METADATA, title: "Connect The LeadFlow Pro" };
export const dynamic = "force-dynamic";

// The consent screen. ChatGPT or Claude sends the owner here with a
// client id, a redirect address, and a PKCE challenge. The owner signs
// in (the middleware handles that), sees which business is about to be
// connected, and approves. The approve route mints the code.

const SCOPE_LABELS: Record<string, string> = {
  "leads:read": "See your leads, briefs, and reports",
  "leads:write": "Add leads, log calls, and schedule follow-ups",
  "messages:send": "Send texts and emails to leads when you say so",
  "content:write": "Draft and approve posts, ads, and video scripts",
  "calculators:run": "Run the free LeadFlow calculators",
};

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);

  const session = await getHqSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/hq/authorize?${params.toString()}`)}`);
  }
  if (!session.workspace) {
    redirect(`/hq/start?then=${encodeURIComponent(`/hq/authorize?${params.toString()}`)}`);
  }

  const client = await getClient(session.db, params.get("client_id") ?? "");
  const parsed = parseAuthorizeParams(params, client);

  if (!parsed.ok) {
    if (parsed.redirect) redirect(parsed.redirect);
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-black text-[var(--heading)]">This connection request is not valid</h1>
        <p className="mt-3 text-[var(--muted)]">{parsed.error}</p>
        <p className="mt-6 text-sm text-[var(--muted)]">
          Go back to your assistant and start the connection again from its connector settings. The address to use is <code className="rounded bg-[var(--fill-2)] px-1">https://www.theleadflowpro.com/api/mcp</code>.
        </p>
      </main>
    );
  }

  const scopes = parsed.value.scope.split(" ").filter((s) => (SCOPES as readonly string[]).includes(s));
  // Registration is open, so the one thing the owner must be able to check
  // is where the approval sends them. Show the host in plain sight.
  const backTo = new URL(parsed.value.redirect_uri).host;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <p className="text-xs font-black uppercase tracking-wide text-[var(--blue)]">{HQ_PLAN.name}</p>
      <h1 className="mt-2 text-2xl font-black text-[var(--heading)]">
        Connect <span className="text-[var(--blue)]">{client?.client_name || "your assistant"}</span> to {session.workspace.name}
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        Signed in as {session.user.email}. Once connected, your assistant can act for {session.workspace.name} through The LeadFlow Pro. You can disconnect any time from HQ.
      </p>
      <p className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--fill-2)] px-3 py-2 text-sm text-[var(--text)]">
        After you approve, you will be sent back to <strong>{backTo}</strong>. If that is not the app you started from, choose Not now.
      </p>
      <ul className="mt-6 space-y-2">
        {scopes.map((s) => (
          <li key={s} className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm">
            <span aria-hidden className="mt-0.5 inline-block h-4 w-4 rounded-full bg-[var(--blue)]" />
            <span>{SCOPE_LABELS[s] ?? s}</span>
          </li>
        ))}
      </ul>
      <ConsentForm
        clientId={parsed.value.client_id}
        redirectUri={parsed.value.redirect_uri}
        state={parsed.value.state}
        codeChallenge={parsed.value.code_challenge}
        scope={parsed.value.scope}
        resource={parsed.value.resource ?? ""}
        clientName={client?.client_name || "your assistant"}
      />
    </main>
  );
}
