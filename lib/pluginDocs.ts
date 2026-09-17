// Everything /plugin and /plugin/docs say about the product, in one place.
//
// The facts here describe what ships in lib/hq today (docs/PLUGIN.md is the
// engineering reference): a connector at the MCP endpoint, the HQ pages, the
// Autopilot cron, the inbound doors, and the plan in HQ_PLAN. Nothing here
// promises a feature that is not in the repository. Price and trial come from
// lib/site/prices.ts through HQ_PLAN.

import { HQ_PLAN } from "@/lib/hq/types";
import { BUSINESS } from "@/lib/site/business";
import { EXTERNAL_LINKS } from "@/lib/site/external-links";
import { PRICES, usd } from "@/lib/site/prices";

export const PLUGIN = {
  name: HQ_PLAN.name,
  shortName: HQ_PLAN.shortName,
  connectorName: HQ_PLAN.connectorName,
  priceUsd: HQ_PLAN.priceUsd,
  priceLabel: `${usd(HQ_PLAN.priceUsd)} a month`,
  trialDays: HQ_PLAN.trialDays,
  mcpUrl: EXTERNAL_LINKS.mcpEndpoint,
  signupHref: "/login?mode=signup&next=%2Fhq%2Fstart",
  hqHref: "/hq",
  docsHref: "/plugin/docs",
  billingHref: "/hq/billing",
  supportEmail: BUSINESS.email.hello,
  supportPhone: BUSINESS.phone.display,
  supportSms: BUSINESS.phone.sms,
  /** Semantic version served by the MCP server (lib/hq/mcp.ts SERVER_INFO). */
  version: "1.0.0",
} as const;

export type PluginPlatform = {
  id: "chatgpt" | "claude" | "claude-code" | "cursor";
  name: string;
  who: string;
  /** OAuth sign-in (no key) or a pasted API key. */
  auth: "oauth" | "api_key";
  steps: string[];
  check: string;
};

export const PLUGIN_PLATFORMS: readonly PluginPlatform[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    who: "On the web, on your phone, or the desktop app.",
    auth: "oauth",
    steps: [
      "Open Settings, then Apps and Connectors, then Add.",
      "Paste the address into the MCP server URL box and save it.",
      "You will be asked to sign in and approve. Sign in with the same email you use for HQ, then approve.",
    ],
    check: "Ask it: run my morning brief.",
  },
  {
    id: "claude",
    name: "Claude, web and desktop",
    who: "claude.ai in a browser, or the Claude desktop app.",
    auth: "oauth",
    steps: [
      "Open Settings, then Connectors, then Add custom connector.",
      "Paste the address and save it.",
      "You will be asked to sign in and approve. Sign in with the same email you use for HQ, then approve.",
    ],
    check: "Ask it: who should I call right now?",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    who: "The terminal version. This one wants a key from HQ.",
    auth: "api_key",
    steps: [
      "In HQ, open Plugin, make a key, and copy it. It is shown once.",
      `Run: claude mcp add --transport http leadflow ${EXTERNAL_LINKS.mcpEndpoint} --header "Authorization: Bearer YOUR_KEY"`,
    ],
    check: "Ask it: draft this week's posts.",
  },
  {
    id: "cursor",
    name: "Cursor",
    who: "The code editor. Also wants a key from HQ.",
    auth: "api_key",
    steps: [
      "In HQ, open Plugin, make a key, and copy it.",
      "Open Cursor Settings, then MCP, then Add new MCP server.",
      "Choose the HTTP type, paste the address, and add a header called Authorization with the value Bearer, a space, and your key.",
      "Save it and reload the window.",
    ],
    check: "Ask it: list my open leads.",
  },
];

/** What you can say, and what the connector does. Real tool names from lib/hq/mcp.ts. */
export const PLUGIN_TASKS: readonly { prompt: string; does: string; tools: string[] }[] = [
  { prompt: "Run my morning brief", does: "Reads back who is waiting, what is due today, and three things to do before noon.", tools: ["daily_brief"] },
  { prompt: "Who should I call right now?", does: "Ranks your open leads by fit, timing, and how long they have waited, and says why each one is near the top.", tools: ["next_calls"] },
  { prompt: "Add a lead: Sam Tate, 903 555 0100, wants a quote on a fence", does: "Creates the lead in your workspace with the source set to the assistant. No consent to text is assumed.", tools: ["add_lead"] },
  { prompt: "Text Jamie back and tell her we can be there Thursday morning", does: "Drafts the message in your voice. You say send, and it goes from your connected line only if she agreed to texts.", tools: ["draft_reply", "send_message"] },
  { prompt: "Draft this week's posts", does: "Writes three Facebook posts, one lead ad, and one thirty-second video script with a shot list. Nothing publishes until you approve it.", tools: ["draft_weekly_content", "approve_content", "publish_post"] },
  { prompt: "What does a missed call cost me?", does: "Runs the free calculator on your own numbers, inside the assistant.", tools: ["list_calculators", "run_calculator"] },
];

export type PluginDemo = {
  id: string;
  title: string;
  /** What the screen recording will show. Ryan captures it (docs/plugin-capture-checklist.md). */
  capture: string;
  exchange: { ask: string; did: string }[];
  /** Path under /public once captured. Null renders the exchange only, never a fake frame. */
  media: string | null;
};

export const PLUGIN_DEMOS: readonly PluginDemo[] = [
  {
    id: "morning",
    title: "The morning brief, inside ChatGPT",
    capture: "ChatGPT with the connector installed; the owner types 'run my morning brief'; the brief comes back with three call-now rows and the week's lead count.",
    exchange: [
      {
        ask: "Run my morning brief",
        did: "Three people are waiting. The newest came in twelve minutes ago from your website form. Two follow-ups are drafted for today. Say 'who first' and I will rank them.",
      },
      { ask: "Who first?", did: "The website form lead: they asked for a quote and nobody has replied. Here is the number and a one-line reply you can send." },
    ],
    media: null,
  },
  {
    id: "reply",
    title: "A reply in your voice, sent from your line",
    capture: "Claude desktop; the owner asks for a text back to a lead; the draft appears; the owner says send; the message log in HQ shows it went from the connected line.",
    exchange: [
      {
        ask: "Text Dana back. We can look at the water heater today between two and four.",
        did: "Draft: 'Hi Dana, this is Kirby Plumbing. We can be out today between 2 and 4 to look at the water heater. Want me to hold that?' Say send and it goes from your business line. Dana agreed to texts on your form.",
      },
      { ask: "Send it.", did: "Sent from (903) 555 0100 at 9:14 AM. I logged it on Dana's record and set a reminder for tomorrow if she does not reply." },
    ],
    media: null,
  },
  {
    id: "content",
    title: "The week's content, drafted on Monday",
    capture: "HQ Content page after asking the assistant to draft the week; three posts, one ad, one video script; the owner approves two posts and they show as published to the connected Page.",
    exchange: [
      {
        ask: "Draft this week's posts.",
        did: "Three Facebook posts, one lead ad, and a thirty-second video script with a shot list you can shoot on your phone. They are in HQ under Content. Approve the ones you like and they publish to your Page.",
      },
    ],
    media: null,
  },
];

export const PLUGIN_INCLUDED: readonly string[] = [
  "Autopilot working every five minutes for your business",
  "Every lead in one inbox: website forms, texts, Meta lead ads, Zapier, or one you add by talking to the assistant",
  "An instant reply in your own voice: a text back when you have a connected line and they said yes to texts, an email otherwise",
  "A call-this-person-now alert the moment a lead arrives, and again if nobody answered inside your response target",
  "Follow-ups scheduled and drafted on a ladder: day 1, day 3, day 7, day 14, and day 30",
  "A morning brief every day, by email and inside the assistant",
  "A scoreboard every Monday: leads by source, how fast they were answered, booked, won",
  "Every week: three Facebook posts, one lead ad, and one thirty-second video script with a phone shot list, approved in one tap",
  "Every free LeadFlow calculator, callable inside the assistant",
  `Every Pro Kit, normally ${usd(PRICES.proKitMin)} to ${usd(PRICES.proKitMax)} each, included while you subscribe`,
];

export const PLUGIN_DATA_HANDLING: readonly { title: string; body: string }[] = [
  {
    title: "Your leads and messages belong to your business",
    body: "They live in your workspace, separate from every other business on the plugin. You can export them any time, and they are still yours if you cancel.",
  },
  {
    title: "Connection keys are encrypted",
    body: "The key for your text line or Facebook Page is encrypted before it is stored and is never shown again after you paste it. API keys and sign-in tokens are stored only as hashes.",
  },
  {
    title: "Texts go only to people who agreed",
    body: "Nothing is texted without recorded consent and a connected line. STOP turns texting off for that person immediately. Texting the business first counts as consent; START turns it back on.",
  },
  {
    title: "The assistant only sees what you connected",
    body: "ChatGPT or Claude talks to the connector over an authorised sign-in you approve once and can revoke from HQ. The connector answers about your workspace and nothing else.",
  },
  {
    title: "No cross-business audiences",
    body: "One business's leads are never used for another's ads, content, or lists.",
  },
];

export const PLUGIN_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "What am I actually installing?",
    a: `${HQ_PLAN.connectorName} is a connector, the same standard apps like Figma and Descript use inside ChatGPT. You paste one address, sign in once, and the assistant can then work on your leads.`,
  },
  {
    q: "Which platforms does it work in?",
    a: "ChatGPT (web, phone, desktop), Claude (web and desktop), Claude Code, and Cursor. Anything that speaks MCP over HTTP can connect with a key from HQ.",
  },
  {
    q: "Do I have to learn new software?",
    a: "No. You use ChatGPT or Claude the way you already do and ask it questions in plain words. HQ is a web page you can open if you want to see everything at once, but most owners never need it.",
  },
  {
    q: "Do I need a text line for this to work?",
    a: "No. Without a connected text line, new leads get an email reply instead and your alerts arrive by email. Connect a line later and the text back turns on. Texts only go to people who agreed to be texted.",
  },
  {
    q: "Will it send things without asking me?",
    a: "The instant reply to a brand-new lead is the one thing that goes out on its own, because answering fast is the whole point, and you write the rules it follows. Follow-ups, posts, ads, and video scripts are drafted and wait for your yes.",
  },
  {
    q: "Where does my data live, and who can see it?",
    a: "In your own workspace on The LeadFlow Pro, protected by membership rules in the database. Connection keys are encrypted, sign-in tokens are hashed, and you can export your leads and messages at any time.",
  },
  {
    q: "How do I cancel?",
    a: `From your account: HQ, then Billing, then Manage billing opens the Stripe portal and you cancel there. It stops at the end of the period. No call, no form, no waiting. If anything gets in the way, one email to ${BUSINESS.email.hello} does it.`,
  },
  {
    q: `What happens after the ${HQ_PLAN.trialDays} days?`,
    a: `It becomes ${usd(HQ_PLAN.priceUsd)} a month. Your card is not charged until the trial ends, and you can cancel before then and pay nothing.`,
  },
  {
    q: "Is this going to make me money?",
    a: "That depends on your market, your prices, and whether you call the people it puts in front of you. What it does is make sure every lead is answered and nothing gets forgotten.",
  },
];

export const PLUGIN_CHANGELOG: readonly { version: string; date: string; notes: string[] }[] = [
  {
    version: "1.0.1",
    date: "2026-09-16",
    notes: [
      "A plan cancelled at the end of its period now shows the end date in HQ and stops the trial reminders.",
      "The consent page accepts a real button click from every browser.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-09-12",
    notes: [
      "First release of the connector for ChatGPT, Claude, Claude Code, and Cursor.",
      "Autopilot: instant reply, call-now alerts, follow-up ladder, morning brief, weekly scoreboard, weekly content bundle.",
      "HQ: Today, Leads, Content, Plugin, Settings, Billing, and the three-screen setup.",
      "Inbound doors for website forms, Meta lead ads, Zapier, and connected text lines.",
    ],
  },
];

export const PLUGIN_DOCS_SECTIONS = [
  { id: "install", title: "Install" },
  { id: "first-tasks", title: "First tasks" },
  { id: "what-it-does", title: "What it can do" },
  { id: "data", title: "Your data" },
  { id: "billing", title: "Billing and cancellation" },
  { id: "support", title: "Support" },
  { id: "changelog", title: "What's new" },
] as const;
