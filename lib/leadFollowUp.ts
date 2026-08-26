// The $197 Lead Follow-Up Campaign (/go/lead-follow-up).
//
// Every number and promise on that page lives here and ONLY here. The page
// reads this file to render and /api/checkout reads PRICE_USD to charge, so
// the browser can never invent its own total.
//
// Scope note, deliberate: this offer WRITES follow-up and hands it over. It
// does not send anything from the customer's accounts on their behalf.
// Application-originated outbound SMS has been off since the Aug 21 emergency
// stop, so nothing here may promise automated texting. The missed-call and
// review messages are delivered as copy the owner sends from their own phone
// or tool. Keep it that way unless Ryan says the sending path is back on.

export const LEAD_FOLLOW_UP = {
  id: "lead_followup_campaign",
  name: "Lead Follow-Up Campaign",
  priceUsd: 197,
  /** Charged in cents, server-side. */
  priceCents: 19700,
  turnaroundDays: 5,
  tagline: "Your follow-up, written and ready to send.",
  promise:
    "Most small businesses do not lose leads because the lead was bad. They lose them because nobody " +
    "answered fast enough, and nobody followed up twice. This writes the whole follow-up for one offer " +
    "in your business, in your words, so the answering stops depending on your memory.",

  included: [
    {
      title: "The five-minute first reply",
      detail:
        "The message that goes out while the person still cares, written so you can send it in one tap instead of composing it from scratch every time.",
    },
    {
      title: "A missed-call text-back message",
      detail:
        "Written for you to save as a quick reply on your own phone, so a missed call keeps the conversation alive instead of ending it.",
    },
    {
      title: "A five-message email follow-up sequence",
      detail:
        "For one offer, in your voice, spaced out so the second and third touch add something instead of repeating the pitch.",
    },
    {
      title: "A review request message",
      detail:
        "Paired with your direct Google review link, so asking is one tap for you and one tap for the customer.",
    },
    {
      title: "A one-page send-order cheat sheet",
      detail:
        "When each message goes out and what triggers it, on a single page you can hand to whoever answers the phone.",
    },
  ],

  // Said plainly on the page. An offer this size earns trust by naming its
  // edges before the customer finds them.
  excluded: [
    "We do not send messages from your accounts or on your behalf",
    "Not an ad campaign, and no ad spend is included",
    "Not a website build, CRM setup, or phone system",
    "No new brand identity and no unlimited revision rounds",
  ],

  steps: [
    {
      number: "01",
      name: "Pay",
      body: "$197 one time. No subscription, no seat, nothing recurring.",
    },
    {
      number: "02",
      name: "Intake",
      body: "A short form: your business, the one offer this is for, and how you actually talk to customers.",
    },
    {
      number: "03",
      name: "Written",
      body: `Ryan writes the campaign himself within ${5} business days of your intake landing.`,
    },
    {
      number: "04",
      name: "Handover",
      body: "Delivered as a document you own, with a walkthrough of where each message goes and what sets it off.",
    },
    {
      number: "05",
      name: "One revision",
      body: "You read it, mark what does not sound like you, and it comes back adjusted once.",
    },
  ],

  faq: [
    {
      q: "Do I need any software to use this?",
      a: "No. Every message is written so you can send it from the phone and email you already use. If you do run a CRM or email tool, the cheat sheet tells you where each message belongs in it.",
    },
    {
      q: "Will you send the messages for me?",
      a: "No. This offer writes the follow-up and hands it to you. Having it sent for you is a build, not a $197 campaign, and that is a separate conversation.",
    },
    {
      q: "What if the writing does not sound like me?",
      a: "That is what the revision round is for. Mark the parts that sound wrong and it comes back adjusted once.",
    },
    {
      q: "How is this different from the free tools on your site?",
      a: "The free tools tell you what a problem is costing you. This writes the thing that fixes it, for your specific business and your specific offer.",
    },
    {
      q: "What happens after I pay?",
      a: "You land on a short intake form. Nothing gets written until you fill it in, so the campaign is built on your actual business rather than a template.",
    },
  ],
} as const;

/** Whole-dollar display, no cents. */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
