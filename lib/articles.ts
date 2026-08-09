// Owned article library. Articles are plain markdown in the repo so they ship
// with the site, rank under the site's own domain, and never live in a rented
// CMS. Each article page embeds the Map My System CTA for lead generation.

export type Article = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  body: string; // markdown
};

export const ARTICLES: Article[] = [
  {
    slug: "the-money-is-in-the-follow-up",
    title: "The money is in the follow-up",
    description:
      "Most businesses do not have a lead problem. They have a follow-up problem. Here is how a connected system catches the leads you already paid for.",
    publishedAt: "2026-08-08",
    readingMinutes: 6,
    body: `
The post gets attention. The system makes money.

Most businesses I map do not have a lead problem. They have a follow-up problem. The phone rings while you are working. A form submission lands in an inbox nobody checks on weekends. A DM sits unread because it arrived on the one platform you forgot to open. None of those people were lost because your offer was weak. They were lost because nothing caught them.

## What a follow-up leak actually looks like

Walk through your last ten inquiries and ask four questions:

1. How did each one reach you: call, text, form, DM, referral, marketplace message?
2. How long did it take a human to respond?
3. Where is that conversation recorded right now?
4. What was the next action, and did it happen?

If the answers live in four different apps and two people's memories, that is the leak. It is not a character flaw. It is a systems gap.

## What catching them looks like

A connected system gives every inquiry the same treatment no matter where it came from:

- The lead lands in one owned database with its source attached.
- An instant, honest reply goes out. Not a fake chatbot pretending to be you. A real confirmation that a real person read it and what happens next.
- The lead gets a stage, an owner, and a next action that shows up on a task list.
- Calls and texts run through a shared number, so the conversation history stays with the business instead of one person's phone.

That is the whole trick. Your leads stay yours, the response is fast, and nothing depends on someone remembering.

## Where to start

You do not need to buy software to find your leak. Map where inquiries come in, where they are supposed to go, and where the last ten actually went. If you want a second set of eyes, the guided system map below does exactly that, and it shows you the recommended fix before it ever asks for your contact information.
`,
  },
  {
    slug: "marketplace-is-not-your-website",
    title: "Amazon is a sales channel. It is not your website.",
    description:
      "Marketplace sellers on Amazon, eBay, Poshmark, Mercari, or Whatnot do not need to abandon the channel. They need an owned home base next to it.",
    publishedAt: "2026-08-08",
    readingMinutes: 7,
    body: `
If most of your business happens on Amazon, eBay, Poshmark, Mercari, Whatnot, or Etsy, you have probably heard two kinds of advice. One says the marketplace is all you need. The other says burn it down and build a website. Both are wrong.

## The marketplace is real demand you should keep

Those platforms bring buyers you could not reach on your own. That reach is worth the fees when the math works. Walking away from a working channel to make a point about ownership is bad business.

## What you do not own there

You do not own the customer relationship, the data, the account, or the rules. Fee schedules change by category and program. A policy update or an account review can pause your income overnight, and the buyer list you spent years serving stays with the platform.

That is not a reason to panic. It is a reason to build leverage.

## The owned home base next to the channel

An owned home base is a site and database in accounts you control that does the jobs the marketplace will never do for you:

- One operating view of products, orders, fees, and reporting across every channel, within what each platform permits.
- A direct line to the customers you are allowed to bring closer: your brand, your story, your email list, your repeat buyers.
- Follow-up that belongs to the business: inquiries, quotes, wholesale requests, and conversations recorded in one place.

The marketplaces keep doing what they are good at. The home base holds what has to be yours.

## Audit the real numbers first

Do not trust a blended fee percentage from a blog post, including this one. Pull your actual statements. Category fees, fulfillment, storage, advertising, and payment processing all land differently for every seller. The honest move is to audit the statements, then decide where an owned home base creates leverage and where the channel should keep running exactly as it is.
`,
  },
];

export function getArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug);
}
