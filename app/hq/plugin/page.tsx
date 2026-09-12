import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, MessageSquareText, Sparkles, SquareTerminal, Terminal } from "lucide-react";
import { getHqSession } from "@/lib/hq/session";
import { listApiKeys, listTokensForWorkspace } from "@/lib/hq/server";
import { HQ_PLAN, planIsLive } from "@/lib/hq/types";
import ApiKeys from "../_components/ApiKeys";
import ConnectedAssistants from "../_components/ConnectedAssistants";
import CopyButton from "../_components/CopyButton";

// The install page. Four places people put it, one address, and the exact
// taps in each. The OAuth places need no key at all; the terminal ones do,
// so the key section sits right under them.

export const dynamic = "force-dynamic";

const MCP_URL = "https://www.theleadflowpro.com/api/mcp";
const CODE_COMMAND = `claude mcp add --transport http leadflow ${MCP_URL} --header "Authorization: Bearer YOUR_KEY"`;

const PLACES = [
  {
    id: "chatgpt",
    icon: Sparkles,
    name: "ChatGPT",
    who: "On the web, on your phone, or the desktop app.",
    oauth: true,
    steps: [
      "Open Settings, then Apps and Connectors, then Add.",
      "Paste the address below into the MCP server URL box and save it.",
      "You will be asked to sign in and approve. Sign in with the same email you use here, then approve.",
      `Ask it "run my morning brief" to check it took.`,
    ],
  },
  {
    id: "claude",
    icon: Bot,
    name: "Claude, web and desktop",
    who: "claude.ai in a browser, or the Claude desktop app.",
    oauth: true,
    steps: [
      "Open Settings, then Connectors, then Add custom connector.",
      "Paste the address below and save it.",
      "You will be asked to sign in and approve. Sign in with the same email you use here, then approve.",
      `Ask it "who should I call right now" to check it took.`,
    ],
  },
  {
    id: "claude-code",
    icon: Terminal,
    name: "Claude Code",
    who: "The terminal version. This one wants a key.",
    oauth: false,
    steps: [
      "Make a key in the Keys section below and copy it.",
      "Run the command below in your terminal, with your key in place of YOUR_KEY.",
      `Ask it "draft this week's posts" to check it took.`,
    ],
  },
  {
    id: "cursor",
    icon: SquareTerminal,
    name: "Cursor",
    who: "The code editor. Also wants a key.",
    oauth: false,
    steps: [
      "Make a key in the Keys section below and copy it.",
      "Open Cursor Settings, then MCP, then Add new MCP server.",
      `Choose the HTTP type, paste the address below, and add a header called Authorization with the value "Bearer" followed by a space and your key.`,
      "Save it and reload the window.",
    ],
  },
];

const EXAMPLES = [
  { prompt: "Run my morning brief", why: "Reads back today's numbers, who to call and what to approve." },
  { prompt: "Who should I call right now?", why: "Ranks your open leads and tells you why each one is near the top." },
  { prompt: "Draft this week's posts", why: "Writes the three posts, the lead ad and the video script for the week." },
];

export default async function HqPluginPage() {
  const session = await getHqSession();
  if (!session) redirect("/login?next=/hq/plugin");
  if (!session.workspace) redirect("/hq/start");

  const ws = session.workspace;
  const [keys, connectors] = await Promise.all([listApiKeys(session.db, ws.id), listTokensForWorkspace(session.db, ws.id)]);
  const live = planIsLive(ws.plan, ws.trial_ends_at);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <p className="hq-eyebrow">Plugin</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">Put {HQ_PLAN.connectorName} in your assistant</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          One address, four places you can paste it. After that you talk to your leads the way you already talk to ChatGPT or Claude, and it works on
          this workspace.
        </p>
      </header>

      {!live && (
        <p className="hq-note mt-5">
          Your plan is not active, so the connector will refuse to answer. Start it on the{" "}
          <Link href="/hq/billing" className="font-bold text-[var(--blue)] hover:underline">
            Billing page
          </Link>{" "}
          and the install below works straight away.
        </p>
      )}

      <section className="hq-card mt-6">
        <p className="hq-eyebrow">The address</p>
        <code className="hq-code mt-2">{MCP_URL}</code>
        <div className="mt-3">
          <CopyButton value={MCP_URL} label="Copy the address" className="hq-btn" />
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">Same address everywhere. Nothing to download and nothing to install on your computer.</p>
      </section>

      <div className="mt-6 grid gap-4">
        {PLACES.map((place) => {
          const Icon = place.icon;
          return (
            <section key={place.id} id={place.id} className="hq-card scroll-mt-24">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[var(--accent-tint)] text-[var(--blue)]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-[var(--heading)]">{place.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{place.who}</p>
                </div>
              </div>

              <ol className="mt-4 grid gap-2">
                {place.steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-[var(--fill-3)] text-sm font-black text-[var(--heading)]"
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--text)]">{step}</span>
                  </li>
                ))}
              </ol>

              {place.id === "claude-code" ? (
                <>
                  <code className="hq-code mt-4">{CODE_COMMAND}</code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyButton value={CODE_COMMAND} label="Copy the command" className="hq-btn" />
                    <Link href="#keys" className="hq-btn">
                      Make a key
                    </Link>
                  </div>
                </>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <CopyButton value={MCP_URL} label="Copy the address" className="hq-btn" />
                  {!place.oauth && (
                    <Link href="#keys" className="hq-btn">
                      Make a key
                    </Link>
                  )}
                </div>
              )}

              {place.oauth && (
                <p className="hq-note mt-3">
                  You will be asked to sign in and approve. That approval screen is on this site, it shows you exactly what the assistant will be able to
                  do for {ws.name}, and you can take it back from this page at any time.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <section className="hq-card mt-6">
        <div className="flex items-center gap-2">
          <MessageSquareText aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
          <h2 className="text-xl font-black text-[var(--heading)]">Three things to try first</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">Type these in plain words. There is nothing to learn.</p>
        <ul className="mt-4 grid gap-3">
          {EXAMPLES.map((example) => (
            <li key={example.prompt} className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
              <p className="text-sm font-black text-[var(--heading)]">&ldquo;{example.prompt}&rdquo;</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{example.why}</p>
              <div className="mt-3">
                <CopyButton value={example.prompt} label="Copy" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-4">
        <ApiKeys keys={keys} />
        <ConnectedAssistants rows={connectors} />
      </div>
    </main>
  );
}
