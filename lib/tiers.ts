// Tier sales page data. All rented-stack numbers derive from the sourced
// vendor pricing in the Rent Receipt calculator (checked July 2026).
// $250/mo = midpoint of the typical $200-500/mo rented stack.

export type TierSlug = "learn-it" | "build-it-with-you" | "done-for-you";

export type TierData = {
  slug: TierSlug;
  interest: string;
  name: string;
  price: string;
  unit: string;
  // accent color keys used by the client component
  accent: "sky" | "violet" | "mint";
  headline: string;
  sub: string;
  stats: { value: string; label: string; tone?: "warn" | "mint" | "accent" }[];
  chartTitle: string;
  chartNote: string;
  features: { title: string; desc: string }[];
  steps: { title: string; desc: string }[];
  forYou: string[];
  notForYou: string[];
  faq: { q: string; a: string }[];
  cta: string;
  closing: string;
};

export const TIERS: Record<TierSlug, TierData> = {
  "learn-it": {
    slug: "learn-it",
    interest: "learn",
    name: "Learn It",
    price: "$497",
    unit: "one time. Lifetime access.",
    accent: "sky",
    headline: "Learn the system once. Stop paying rent forever.",
    sub: "The complete Own Your Platform training: Claude and ChatGPT as your dev team, GitHub, Vercel, Supabase, and Figma — built for business owners, not engineers. You walk out with your own working platform.",
    stats: [
      { value: "$200–500/mo", label: "typical rented stack (sourced vendor pricing)", tone: "warn" },
      { value: "$0–25/mo", label: "the stack you'll run when you're done", tone: "mint" },
      { value: "$497", label: "once. Not per month. Not per year.", tone: "accent" },
      { value: "Lifetime", label: "access, updated as the tools evolve", tone: "accent" },
    ],
    chartTitle: "What waiting costs you",
    chartNote: "The bars are your cumulative spend on a typical $250/mo rented stack — watch them heat up from yellow to red as the money piles up. The green line is Learn It, paid once. By month two the training already costs less than the rent.",
    features: [
      { title: "AI as your dev team", desc: "How to direct Claude and ChatGPT to write the code, build the pages, and fix the bugs — in plain English, no programming background." },
      { title: "GitHub: your code vault", desc: "Every line of your site in YOUR account, versioned, backed up, impossible to take from you." },
      { title: "Vercel: your hosting", desc: "Your site live on your own domain. Free tier covers most small businesses." },
      { title: "Supabase: your database", desc: "Leads, customers, orders, logins — your data in your hands, exportable any time." },
      { title: "Figma: see it before you ship it", desc: "Mock up the design, then hand it straight to AI to build." },
      { title: "The capstone", desc: "You finish by building your own business dashboard on the exact stack this site runs on." },
    ],
    steps: [
      { title: "Start Here", desc: "The owned-platform map: what replaces what, and why the math works." },
      { title: "Work the stack top to bottom", desc: "One course per tool. Short lessons, real reps on your actual business." },
      { title: "Build your capstone", desc: "Your own site, form-to-database lead capture, and dashboard — live on your domain." },
      { title: "Keep it forever", desc: "Lifetime access. When the tools evolve, the training updates." },
    ],
    forYou: [
      "You're paying Shopify, Wix, Squarespace, or Mailchimp every month and it stings",
      "You want the skill in-house — you or someone on your team runs the platform",
      "You can put in a few focused hours a week",
      "You want to stop begging algorithms and vendors for permission",
    ],
    notForYou: [
      "You want it done for you with zero involvement — that's the Done For You tier",
      "You need it live next week and can't invest learning time — book a call instead",
    ],
    faq: [
      { q: "I'm not technical. Can I actually do this?", a: "That's the whole point of the training. The AI writes the code. You learn to direct it, check it, and ship it. If you can write a clear text message, you can drive this stack." },
      { q: "What do I need to buy besides the course?", a: "A domain (about $12/year). GitHub, Vercel, and Supabase free tiers cover most small businesses. Heavier usage runs about $25/mo — the calculator on the home page shows your exact number." },
      { q: "How long until I have something live?", a: "The capstone puts a real page with working lead capture on your own domain. Most owners get there in weeks of part-time effort, not months." },
      { q: "What if I get stuck?", a: "Upgrade to Build It With You any time and we build it together — the $497 applies toward it." },
    ],
    cta: "Start Learning — $497",
    closing: "Every month you wait is another rent check to a platform you'll never own.",
  },
  "build-it-with-you": {
    slug: "build-it-with-you",
    interest: "build_with_you",
    name: "Build It With You",
    price: "$2,500",
    unit: "starting at. Scoped on your call.",
    accent: "violet",
    headline: "We build YOUR platform together. You keep the keys AND the skill.",
    sub: "Working sessions on your actual business — not a demo, not a template. Your site, your funnel, your dashboard, built side by side. When we're done you own the system and you know how to run it.",
    stats: [
      { value: "$9,000+", label: "3 years of a typical rented stack — and you still own nothing", tone: "warn" },
      { value: "1-on-1", label: "working sessions on YOUR business, not a course video", tone: "accent" },
      { value: "30 days", label: "of direct support after launch", tone: "accent" },
      { value: "100%", label: "yours: code, data, design, and the skill to run it", tone: "mint" },
    ],
    chartTitle: "Three ways to get a platform — 3-year cost",
    chartNote: "Typical agency: build fee plus monthly care plan, and they usually keep the keys. Rented DIY: $250/mo forever. Build It With You: one build, near-zero running costs, and the skill stays with you. Agency figures are typical market ranges and vary.",
    features: [
      { title: "Everything in Learn It", desc: "Full training access forever — the sessions make it stick because we apply it to your business in real time." },
      { title: "Your actual build", desc: "Site, funnel, lead capture, dashboard — built live in working sessions with your content, your offers, your brand." },
      { title: "Learn by shipping", desc: "You're not watching me work. Your hands are on the keyboard and AI is doing the heavy lifting." },
      { title: "Launch together", desc: "Domain connected, tracking live, forms feeding your database, automation emails firing." },
      { title: "30 days of direct support", desc: "After launch, I'm a message away while you find your footing." },
      { title: "The handover is built in", desc: "There's nothing to hand over — it was in your accounts from day one." },
    ],
    steps: [
      { title: "Discovery call and scope", desc: "What you have, what you're paying, what we're building. You get the plan before you commit." },
      { title: "Figma design approved", desc: "You see the design before a line of code ships." },
      { title: "Site and funnel built", desc: "Working sessions: pages, offers, lead capture — live on your accounts." },
      { title: "Dashboard and database live", desc: "Your leads, messages, and analytics in your own back office." },
      { title: "Domain connected and launched", desc: "Tracking, pixels, and automations on. Traffic can start." },
      { title: "You run it — with backup", desc: "30 days of direct support while you take the wheel." },
    ],
    forYou: [
      "You want it built right AND you want to understand your own system",
      "You have a real business with real offers ready to sell",
      "You can show up to working sessions and do reps between them",
      "You're done paying an agency to gatekeep your own website",
    ],
    notForYou: [
      "You want zero involvement — that's Done For You",
      "You just want the training at your own pace — that's Learn It",
    ],
    faq: [
      { q: "Why 'starting at' $2,500?", a: "Because a coffee shop's funnel and a multi-location service company's platform are not the same build. The call scopes it and you get a firm number before we start. No surprises after." },
      { q: "How is this different from hiring an agency?", a: "An agency builds it in their accounts, bills you monthly, and keeps the leverage. We build in YOUR accounts from day one, and the skill transfers to you. When we're done you don't need me — that's the point." },
      { q: "How long does it take?", a: "Most builds run a handful of weeks depending on scope and how fast you move between sessions. The milestone plan comes out of your discovery call." },
      { q: "What are my costs after launch?", a: "Your stack runs $0–25/mo at typical small-business scale (sourced pricing in the calculator). No retainer required — though one's available if you want me to keep running it." },
    ],
    cta: "Book Your Scoping Call",
    closing: "An agency sells you a website. I hand you a platform and the ability to run it.",
  },
  "done-for-you": {
    slug: "done-for-you",
    interest: "done_for_you",
    name: "Done For You",
    price: "$5,000+",
    unit: "scoped per project.",
    accent: "mint",
    headline: "I build the whole thing. You get every key.",
    sub: "Complete site, funnel, dashboard, and migration off the rented platforms — built end to end and handed over: the GitHub repo, the hosting, the database, the data. You own 100% of it. No monthly ransom to me or anyone else.",
    stats: [
      { value: "$9,000+", label: "what 3 years of renting costs — with nothing to show for it", tone: "warn" },
      { value: "≈ 20 mo", label: "typical break-even vs a $250/mo rented stack", tone: "accent" },
      { value: "$0–25/mo", label: "your running costs after handover", tone: "mint" },
      { value: "Every key", label: "repo, hosting, database, domain — in YOUR accounts", tone: "mint" },
    ],
    chartTitle: "3-year total cost: renting vs owning",
    chartNote: "The rising line is a typical $250/mo rented stack — it runs hotter (yellow into red) the longer it climbs, and it never stops. The green line is the Done For You build plus ~$25/mo infrastructure. They cross around month 22; after that, every month is money you keep.",
    features: [
      { title: "The full platform", desc: "Site, funnel, lead capture, client dashboard, admin back office, analytics — the same architecture this site runs on." },
      { title: "Migration included", desc: "Content, products, lists, and data moved off Shopify, Wix, WordPress, or AWeber without losing what you've built." },
      { title: "Tracking and automation wired", desc: "Meta Pixel, Google tag, first-party analytics, and instant lead-response emails, ready for ad traffic." },
      { title: "The Handover", desc: "GitHub repo, Vercel hosting, Supabase database — transferred to accounts YOU control. This is the part agencies never do." },
      { title: "Team training", desc: "A working session so you or your people can run it day to day." },
      { title: "Proof it works", desc: "The site you're reading runs on this exact stack. So do the builds on the portfolio page." },
    ],
    steps: [
      { title: "Discovery call and scope", desc: "Your business, your current stack, your number. Firm quote before anything starts." },
      { title: "Figma design approved", desc: "You sign off on the look before the build." },
      { title: "Site and funnel built", desc: "Pages, offers, forms, tracking — built and tested." },
      { title: "Dashboard and database live", desc: "Your back office: leads, messages, projects, analytics." },
      { title: "Domain connected and launched", desc: "Live on your domain with tracking verified." },
      { title: "Handover: repo, hosting, database keys", desc: "Everything transferred to your accounts, documented, with training." },
    ],
    forYou: [
      "You want the outcome, not a new hobby",
      "You're spending real money on rented platforms right now",
      "You run ads or plan to, and need a funnel that's actually yours",
      "You want the option to run it in-house later — the keys make that possible",
    ],
    notForYou: [
      "You want to learn to build it yourself — start with Learn It",
      "You want a $99 template site — that's renting with extra steps",
    ],
    faq: [
      { q: "What exactly do I own at the end?", a: "Everything. The GitHub repository with all the code, the Vercel hosting account, the Supabase database with every lead and customer record, and the domain. All in accounts you control. I keep nothing." },
      { q: "Why is it 'scoped per project'?", a: "Because honest pricing follows the work. A lead-gen site with a dashboard is one number; a full e-commerce migration with years of data is another. You get a firm quote on the call — before, not after." },
      { q: "Do I have to pay you monthly after?", a: "No. Your infrastructure runs $0–25/mo paid straight to the vendors (sourced pricing in the calculator). If you WANT me to keep running it, retainers exist — but they're optional, not a hostage situation." },
      { q: "How fast can we launch?", a: "Scope-dependent — the milestone plan comes out of your discovery call, and you watch progress live in your client dashboard the whole way." },
    ],
    cta: "Book Your Scoping Call",
    closing: "They rent you a storefront. I build you the building — and hand you the deed.",
  },
};
