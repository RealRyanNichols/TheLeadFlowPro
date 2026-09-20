import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Check, ShieldCheck, Sparkles, SquareTerminal, Terminal } from "lucide-react";
import {
  PLUGIN,
  PLUGIN_CHANGELOG,
  PLUGIN_DATA_HANDLING,
  PLUGIN_DOCS_SECTIONS,
  PLUGIN_PLATFORMS,
  PLUGIN_TASKS,
} from "@/lib/pluginDocs";
import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd } from "@/lib/site/prices";
import { breadcrumbJsonLd, graph, jsonLdText } from "@/lib/site/structuredData";

// The plugin manual. Install per platform, the first things to say, what it
// can do, how data is handled, how to cancel, and what changed. Structured so
// a new section is one entry in lib/pluginDocs.ts.

export const metadata: Metadata = withPublicPageMetadata("/plugin/docs", {
  title: `${PLUGIN.name} docs: install, first tasks, data, billing | The LeadFlow Pro`,
  description: `Install ${PLUGIN.connectorName} in ChatGPT, Claude, Claude Code, or Cursor, run your first tasks, and see exactly how your data and billing are handled.`,
});

const ICONS = { chatgpt: Sparkles, claude: Bot, "claude-code": Terminal, cursor: SquareTerminal } as const;

export default function PluginDocsPage() {
  const jsonLd = graph(
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Plugin", path: "/plugin" },
      { name: "Docs", path: "/plugin/docs" },
    ]),
  );
  return (
    <main className="cb-page plugin-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />

      <section className="cb-hero sv-hero--compact">
        <div className="cb-shell">
          <p className="cb-eyebrow">{PLUGIN.name} · version {PLUGIN.version}</p>
          <h1 className="cb-h1">
            <em>The manual.</em>
            Install it, say the first thing, know where your data is.
          </h1>
          <p className="cb-hero-lead">
            Everything on this page describes what ships today. When something changes, it lands in
            the changelog at the bottom and in the monthly note to subscribers.
          </p>
          <nav className="cb-actions" aria-label="Sections">
            {PLUGIN_DOCS_SECTIONS.map((s) => (
              <a key={s.id} className="cb-btn cb-btn--ghost cb-btn--sm" href={`#${s.id}`}>
                {s.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* --------------------------------------------------------- install */}
      <section id="install" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Install</p>
              <h2 className="cb-h2 cb-heading">One address. Four places to paste it.</h2>
            </div>
            <p className="cb-lead">
              ChatGPT and Claude sign you in with a button. Claude Code and Cursor take a key you
              make in HQ. Nothing downloads and nothing installs on your computer.
            </p>
          </div>
          <div className="plugin-url">
            <span className="plugin-url-tag">Paste this address</span>
            <code>{PLUGIN.mcpUrl}</code>
          </div>
          <div className="plugin-rail plugin-rail--plain mt-6">
            {PLUGIN_PLATFORMS.map((platform, i) => {
              const Icon = ICONS[platform.id];
              return (
                <article key={platform.id} id={`install-${platform.id}`} className="plugin-card">
                  <span className="plugin-step-top">
                    <span className="plugin-step-num">{i + 1}</span>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3>{platform.name}</h3>
                  <p>{platform.who}</p>
                  {platform.requires ? (
                    <p className="plugin-fine">
                      <strong>Needs:</strong> {platform.requires}
                    </p>
                  ) : null}
                  <ol className="plugin-steps">
                    {platform.steps.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                    <li>
                      <strong>Check it took.</strong> {platform.check}
                    </li>
                  </ol>
                  <p className="plugin-fine">
                    {platform.auth === "oauth"
                      ? "Signs in through an approval screen you can revoke from HQ at any time."
                      : "Uses a key shown once in HQ. Revoke it there if it ever leaks."}
                  </p>
                </article>
              );
            })}
          </div>
          <p className="plugin-note">
            Before any of this works you need a workspace: <Link href={PLUGIN.signupHref}>create your
            account</Link>, answer three short screens, and start the {PLUGIN.trialDays} day trial.
            Already signed up? Open <Link href="/hq/plugin">HQ, then Plugin</Link>.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------- first tasks */}
      <section id="first-tasks" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">First tasks</p>
              <h2 className="cb-h2 cb-heading">Say it the way you would say it to the person who answers your phone.</h2>
            </div>
            <p className="cb-lead">
              These six cover most days. Each one names the tool the assistant calls behind the
              scenes, so what happens is never a mystery.
            </p>
          </div>
          <div className="plugin-chat mt-10">
            {PLUGIN_TASKS.map((task) => (
              <div key={task.prompt} className="plugin-turn">
                <p className="plugin-ask">{task.prompt}</p>
                <p className="plugin-say">
                  {task.does}{" "}
                  <span className="plugin-fine">Tools: {task.tools.join(", ")}.</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- what it does */}
      <section id="what-it-does" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What it can do</p>
              <h2 className="cb-h2 cb-heading">Three rhythms, and the rules they follow.</h2>
            </div>
            <p className="cb-lead">
              Every five minutes Autopilot checks for new leads and overdue replies. Every morning it
              writes the brief. Every Monday it writes the scoreboard and the week&apos;s content.
            </p>
          </div>
          <div className="plugin-rail mt-10">
            <article className="plugin-card">
              <span className="plugin-when">Leads</span>
              <h3>One inbox, five doors</h3>
              <p>
                Website forms, text messages, Meta lead ads, Zapier, and leads you add by talking to
                the assistant. One record per person, one history of what was said.
              </p>
            </article>
            <article className="plugin-card">
              <span className="plugin-when">Replies</span>
              <h3>Fast first, then drafted</h3>
              <p>
                The instant reply to a brand-new lead goes out on its own, following rules you set.
                Every follow-up after that is drafted and waits for your yes.
              </p>
            </article>
            <article className="plugin-card">
              <span className="plugin-when">Content</span>
              <h3>Drafted weekly, published on approval</h3>
              <p>
                Three posts, one lead ad, one video script with a shot list. Approve in HQ and they
                publish to your connected Facebook Page, or copy them anywhere.
              </p>
            </article>
          </div>
          <ul className="plugin-list mt-8">
            {[
              "Every text ends with 'Reply STOP to opt out' and fits in 300 characters.",
              "Nothing texts without recorded consent and a connected line.",
              "Real rows only in briefs and reports. No estimates.",
              "No guarantees, no filler phrases, in anything the engine writes.",
            ].map((rule) => (
              <li key={rule}>
                <Check aria-hidden="true" className="h-4 w-4" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ data */}
      <section id="data" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Your data</p>
              <h2 className="cb-h2 cb-heading">Where it lives and who can see it.</h2>
            </div>
            <p className="cb-lead">
              Built in accounts you control, the same way every LeadFlow system is. Here is what that
              means for the plugin specifically.
            </p>
          </div>
          <div className="plugin-rail plugin-rail--plain mt-10">
            {PLUGIN_DATA_HANDLING.map((item) => (
              <article key={item.title} className="plugin-card">
                <span className="plugin-icon">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <p className="plugin-note">
            Want the engineering detail? The connector uses standard OAuth with PKCE, tokens rotate,
            and every database read is scoped to your workspace. Ask and Ryan will walk you through
            it.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- billing */}
      <section id="billing" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Billing and cancellation</p>
              <h2 className="cb-h2 cb-heading">{PLUGIN.priceLabel}. {PLUGIN.trialDays} days free. Cancel yourself.</h2>
            </div>
            <p className="cb-lead">
              Your card is not charged until the trial ends. One trial per business. If you cancel
              before the trial ends you pay nothing.
            </p>
          </div>
          <ol className="plugin-steps mt-8">
            <li>Open HQ, then Billing.</li>
            <li>Choose Manage billing. Stripe&apos;s portal opens in a new tab.</li>
            <li>Cancel the plan there. It stops at the end of the current period and HQ shows the end date.</li>
            <li>Your leads, messages, and content stay yours. Ask and Ryan sends you a file of them.</li>
          </ol>
          <p className="plugin-fine">
            If the portal will not open for any reason, email {BUSINESS.email.hello} and Ryan cancels
            it by hand the same business day. No retention call.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- support */}
      <section id="support" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Support</p>
              <h2 className="cb-h2 cb-heading">A person answers.</h2>
            </div>
            <p className="cb-lead">
              Email <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a> or text{" "}
              <a href={BUSINESS.phone.sms}>{BUSINESS.phone.display}</a>. Say which assistant you are
              using and paste what it said back. Ryan reads every one.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- changelog */}
      <section id="changelog" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What&apos;s new</p>
              <h2 className="cb-h2 cb-heading">Changelog</h2>
            </div>
            <p className="cb-lead">
              Subscribers get one short note a month with what changed. Nothing else is sent.
            </p>
          </div>
          <div className="plugin-faq mt-8">
            {PLUGIN_CHANGELOG.map((entry) => (
              <details key={entry.version} className="plugin-faq-item" open={entry === PLUGIN_CHANGELOG[0]}>
                <summary>
                  {entry.version} · {entry.date}
                </summary>
                <ul className="plugin-list">
                  {entry.notes.map((note) => (
                    <li key={note}>
                      <Check aria-hidden="true" className="h-4 w-4" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <p className="plugin-note">
            Not a subscriber yet? The plugin is {usd(PRICES.pluginMonthly)} a month after{" "}
            {PRICES.pluginTrialDays} days free. <Link href="/plugin">See what it does</Link>, or start
            with the <Link href="/chatgpt/free">free ChatGPT lesson</Link> if you would rather learn the
            tool first.
          </p>
        </div>
      </section>
    </main>
  );
}
