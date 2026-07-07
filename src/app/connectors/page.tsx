import Link from "next/link";
import { ArrowRight, Plug, Globe, Bot, Check, Copy } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { OFFERS } from "@/lib/offers";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");
const MCP_URL = `${SITE_URL}/api/mcp`;

export const metadata = {
  title: "Connectors | The LeadFlow Pro",
  description:
    "LeadFlow Pro is a connector. Add it to Claude, ChatGPT, and Grok with one MCP URL, and embed it on your own website with one script tag to capture and deliver leads.",
};

const platforms = [
  {
    name: "Claude",
    how: "Settings → Connectors → Add custom connector → paste the URL.",
  },
  {
    name: "ChatGPT",
    how: "Apps SDK / Developer Mode → add an MCP app → paste the URL.",
  },
  {
    name: "Grok",
    how: "Connectors → Bring-Your-Own-MCP → paste the URL.",
  },
];

const embedSnippet = `<script src="${SITE_URL}/connect.js"
        data-key="YOUR_SITE_KEY"
        data-industry="mortgage"></script>`;

export default function ConnectorsPage() {
  const connector = OFFERS["connector-status"];

  return (
    <>
      <Header />
      <main className="pb-24">
        <section className="relative isolate overflow-hidden border-b border-white/10 py-14 md:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_8%,rgba(35,184,255,0.16),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(255,154,31,0.14),transparent_30%),linear-gradient(135deg,#030711,#070c18_50%,#101008)]" />
          <div className="container">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-cyan-100">
              <Plug className="h-4 w-4" /> The connector
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] text-white md:text-7xl">
              One connector. Every AI. Every site.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-100">
              LeadFlow Pro plugs in two directions. It lives <strong>inside Claude, ChatGPT, and Grok</strong> as a
              connector they can call to find and buy source-backed leads. And it lives <strong>on your website</strong> as
              a one-tag embed that captures visitors and delivers them to your CRM.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/offers/connector-status" className="btn-accent text-base">
                Get Connector Status — {connector.price.big}{connector.price.sub}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="btn-ghost text-base">See all pricing</Link>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container grid gap-10 lg:grid-cols-2">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                <Bot className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-cyan-300">Inbound · inside the AIs</p>
              <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">Add LeadFlow to your assistant.</h2>
              <p className="mt-4 max-w-xl text-ink-200">
                All three assistants speak the Model Context Protocol. Add one URL and your assistant can search lead
                packs, pull a redacted profile, see pricing, run a lead-leak check, and hand you the buy link.
              </p>

              <div className="mt-6 rounded-lg border border-white/10 bg-ink-950/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Connector URL</p>
                <code className="mt-2 block break-all font-mono text-sm text-cyan-200">{MCP_URL}</code>
              </div>

              <div className="mt-5 space-y-2">
                {platforms.map((p) => (
                  <div key={p.name} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-ink-100">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-400" />
                    <span><strong className="text-white">{p.name}</strong> — {p.how}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-accent-300/25 bg-accent-300/10 text-accent-200">
                <Globe className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-accent-300">Outbound · on your site</p>
              <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">Embed the connector.</h2>
              <p className="mt-4 max-w-xl text-ink-200">
                Drop one tag on your site. It renders a LeadFlow funnel and questionnaire, fires a pixel, builds
                source-backed profiles, and delivers each lead into your CRM — HubSpot, GoHighLevel, Salesforce,
                Zapier, Make, Airtable, Sheets, or a plain webhook.
              </p>

              <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-ink-950/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-400">
                  <Copy className="h-3.5 w-3.5" /> Paste before &lt;/body&gt;
                </div>
                <pre className="whitespace-pre font-mono text-xs leading-6 text-cyan-100">{embedSnippet}</pre>
              </div>
              <p className="mt-3 text-sm text-ink-400">
                Want it placed inline? Add <code className="font-mono text-ink-200">&lt;div id="leadflow-connect"&gt;&lt;/div&gt;</code> where the form should render.
              </p>

              <div className="mt-6 rounded-lg border border-accent-300/20 bg-accent-300/5 p-5">
                <h3 className="text-lg font-black text-white">Your site key comes with Connector Status.</h3>
                <p className="mt-2 text-sm text-ink-200">
                  Connector Status issues your key, turns on delivery to your CRM, and lists your inventory to the AI
                  connectors. {connector.price.big}{connector.price.sub}.
                </p>
                <Link href="/offers/connector-status" className="btn-accent mt-4 inline-flex text-sm">
                  Get Connector Status <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="lead-panel p-6">
                <h3 className="text-lg font-black text-white">Want it built for you?</h3>
                <p className="mt-2 text-sm text-ink-200">A LeadFlow-embedded funnel page, built and wired to your CRM.</p>
                <Link href="/offers/funnel-page" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-300">Funnel Page <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="lead-panel p-6">
                <h3 className="text-lg font-black text-white">Want us to run it?</h3>
                <p className="mt-2 text-sm text-ink-200">Pixels, funnels, SEO, indexing, ranking, and delivery — operated for you.</p>
                <Link href="/offers/done-for-you" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-300">Done-For-You <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="lead-panel p-6">
                <h3 className="text-lg font-black text-white">Just want the leads?</h3>
                <p className="mt-2 text-sm text-ink-200">Buy source-backed buyer signals by industry, no embed required.</p>
                <Link href="/buy-leads" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-300">Buy Leads <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
