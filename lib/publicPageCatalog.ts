// Reviewed canonical public pages. Redirects and private completion URLs are excluded.
export const PUBLIC_PAGE_CATALOG = [
  {
    path: "/events",
    title: "Events and business workshops",
    description: "Bring one real business task to a practical workshop. Review the current events page for dates, registration, and workshop details.",
    eyebrow: "Business workshops",
    index: false,
  },
  {
    path: "/chatgpt/free",
    title: "Build your first ChatGPT page",
    description:
      "Practice building a landing page, inspect the result, and make one useful revision in this free written lesson.",
    eyebrow: "Free ChatGPT training",
    index: false,
  },
  {
    path: "/events/chatgpt-for-business-owners-longview",
    title: "ChatGPT for Business Owners: Live in Longview",
    description:
      "Bring one real business task and practice a useful process. Review the workshop page for current event and registration details.",
    eyebrow: "Live learning in Longview",
    index: false,
  },
  {
    path: "/events/chatgpt-for-business-owners-longview/worksheet",
    title: "Workshop worksheet",
    description: "The worksheet the room works from: one task, one brief, two runs. For attendees.",
    eyebrow: "Live learning in Longview",
    index: false,
  },
  {
    path: "/commerce",
    title: "Make buying it easy",
    description:
      "Connect your online store, payments, customer records, and delivery. Try a working kit or plan a commerce build.",
    eyebrow: "Commerce",
    art: "/images/page-art/commerce-20260907.webp",
  },
  {
    path: "/chase-sheet",
    title: "Every open quote. Chased every day.",
    description:
      "Chase Sheet writes the follow-up for every quote you send, tells you who to chase today, and sends from your own phone with one tap. $20 a month, or $97 once.",
    eyebrow: "Chase Sheet",
  },
  {
    path: "/chase-sheet/terms",
    title: "Chase Sheet purchase terms",
    description:
      "What the monthly plan and the one-time purchase cover, how cancellation works, and what you send yourself.",
    eyebrow: "Chase Sheet terms",
  },
  {
    path: "/chase-sheet/app",
    title: "Your Chase Sheet",
    description: "The sheet itself: today's chase list, your quotes, and the ledger. For buyers.",
    eyebrow: "Chase Sheet",
    index: false,
  },
  {
    path: "/tlfp",
    title: "Every dollar in comes back bigger.",
    description:
      "TLFP Credits: store credit for LeadFlow Pro services. Earn credits by finishing courses, showing up, and sending business. Buy packs with a bonus. Spend them on any build.",
    eyebrow: "TLFP Credits",
  },
  {
    path: "/tlfp/terms",
    title: "TLFP Credits terms",
    description:
      "What a credit is, how credits are earned and bought, how they are spent, and the limits: no cash value, not transferable, redeemable only with The LeadFlow Pro.",
    eyebrow: "TLFP Credits terms",
  },
  {
    path: "/sellerproof",
    title: "Organized evidence. A clearer response.",
    description:
      "Build a chargeback evidence packet before your deadline. Free preview, $49 to export one dispute packet. You review and submit it yourself.",
    eyebrow: "SellerProof",
  },
  {
    path: "/sellerproof/terms",
    title: "SellerProof purchase terms",
    description:
      "What a single evidence packet purchase covers, how delivery works, and your responsibility to review and submit the evidence.",
    eyebrow: "SellerProof terms",
  },
  {
    path: "/sellerproof/privacy",
    title: "Your records stay under your control",
    description:
      "How SellerProof handles draft entries, temporary processing, private backups, purchase access, and original evidence files.",
    eyebrow: "SellerProof privacy",
  },
  {
    path: "/",
    title: "Leads, websites, and follow-up. Done for you.",
    description:
      "Ads, websites, funnels, and follow-up built and run for East Texas businesses in accounts you own. Start with a free 30-minute consultation.",
    eyebrow: "Done for you",
    art: "/images/ryan-wholesale-universe-warehouse-pallets-flag.jpg",
  },
  {
    path: "/about",
    title: "Meet Ryan Nichols",
    description:
      "The operator behind The LeadFlow Pro, and the work that shaped the business.",
    eyebrow: "The operator",
    art: "/images/ryan-wholesale-universe-owner.jpg",
  },
  {
    path: "/longview",
    title: "Marketing agency in Longview, TX",
    description:
      "Ads, websites, and follow-up for Longview and East Texas businesses, built and run in accounts you own. Free 30-minute consultation at your business, the Longview office, or by phone.",
    eyebrow: "Longview and East Texas",
  },
  // The Longview business directory. Indexing is an owner decision: these
  // stay out of the sitemap until the publish export's indexable switch and
  // these flags are turned on together.
  {
    path: "/longview/businesses",
    title: "Longview businesses",
    description:
      "Businesses in the City of Longview, listed A to Z with the source and check date for every fact. Not ranked, no reviews.",
    eyebrow: "Longview business directory",
    index: false,
  },
  {
    path: "/longview/businesses/about",
    title: "About the Longview business directory",
    description:
      "Where the directory's facts come from, how they are checked, what it never shows, and how to claim, correct, or remove a listing.",
    eyebrow: "Longview business directory",
    index: false,
  },
  {
    path: "/services",
    title: "Build the part your business needs",
    description:
      "Websites, lead capture, follow-up, payments, portals, and reporting in accounts you control.",
    eyebrow: "Services",
  },
  {
    path: "/start",
    title: "Find your next business step",
    description:
      "Answer a few practical questions and see where to start before sharing your contact details.",
    eyebrow: "Start here",
  },
  {
    path: "/diagnostic",
    title: "Find the gap in your business",
    description:
      "Tell us what is working, where work stalls, and what you want to improve next.",
    eyebrow: "Business diagnostic",
  },
  {
    path: "/pricing",
    title: "Choose the right starting point",
    description:
      "Compare the Website Launch, System Map, and larger systems around the work you need done.",
    eyebrow: "Pricing",
  },
  {
    path: "/packages",
    title: "Build a website. Connect the work.",
    description:
      "Explore the Website Launch and the separately scoped tools, portals, and systems that can follow.",
    eyebrow: "Product studio",
  },
  {
    path: "/packages/system-map",
    title: "Know what to build first",
    description:
      "Map your website, customer path, ownership, and next build phases before a larger project.",
    eyebrow: "System Map",
  },
  {
    path: "/packages/launch",
    title: "A five-page website with a clear plan",
    description:
      "Review the Website Launch scope, approval process, and payment stages.",
    eyebrow: "Website Launch",
  },
  {
    path: "/packages/industry-os",
    title: "Build around the way you work",
    description:
      "Scope the website, lead flow, delivery, and reporting your business actually needs.",
    eyebrow: "Industry operating system",
  },
  {
    path: "/add-ons",
    title: "Add the next useful piece",
    description:
      "Explore practical modules for leads, follow-up, payments, courses, and customer delivery.",
    eyebrow: "The add-on menu",
  },
  {
    path: "/tools",
    title: "Free tools for real business tasks",
    description:
      "Calculate, plan, draft, and check your work with the free LeadFlow tool library.",
    eyebrow: "Free tools",
    art: "/images/page-art/tools-library.png",
  },
  {
    path: "/tools/pro",
    title: "Turn the number into a working kit",
    description:
      "Preview practical document kits, scripts, checklists, and downloads built from your own inputs.",
    eyebrow: "Pro Kits",
    art: "/images/page-art/pro-kits.png",
  },
  {
    path: "/plugin",
    title: "Run your leads from inside ChatGPT",
    description:
      "Install The LeadFlow Pro in ChatGPT or Claude. Every lead lands in one inbox, gets answered fast, and gets followed up until it is won.",
    eyebrow: "The LeadFlow Pro Plugin",
  },
  {
    path: "/plugin/docs",
    title: "Install it, say the first thing, know where your data is",
    description:
      "The plugin manual: install in ChatGPT, Claude, Claude Code, or Cursor, first tasks, data handling, billing, cancellation, and the changelog.",
    eyebrow: "Plugin docs",
  },
  {
    path: "/agency",
    title: "Ads, websites, automation, video, and content, run for you",
    description:
      "The agency lane: Meta ads, Google Ads, websites, automation, video, and content in accounts you own. You pay the platforms directly and keep the leads.",
    eyebrow: "Run it for me",
  },
  {
    path: "/agency/meta-ads",
    title: "Meta ads management in your own Business Manager",
    description:
      "Lead ads and landing pages built in your Meta account, wired to your inbox and CRM, with the trace from ad to lead to outcome kept in your records.",
    eyebrow: "Agency · Meta ads",
  },
  {
    path: "/agency/google-ads",
    title: "Google Ads management with call and form tracking",
    description:
      "Search and local campaigns in your Google Ads account, conversion tracking for calls and forms, and plain-English reporting against your own records.",
    eyebrow: "Agency · Google Ads",
  },
  {
    path: "/agency/websites",
    title: "Five pages that give people a next step",
    description:
      "A mobile-first five-page site with lead capture, search foundation, and analytics in your account. Buy the Website Launch outright, in accounts you own.",
    eyebrow: "Agency · Websites",
  },
  {
    path: "/agency/automation",
    title: "Follow-up that runs whether you are free or not",
    description:
      "The capture, record, follow-up, sale, delivery, reporting loop installed in your accounts, with every automation documented and pauseable.",
    eyebrow: "Agency · Automation",
  },
  {
    path: "/agency/video",
    title: "Video and media shot on location, cut for the phone",
    description:
      "Vertical shorts, an offer explainer, and customer stories captured with written consent, delivered as files you own.",
    eyebrow: "Agency · Video",
  },
  {
    path: "/agency/content",
    title: "Posts, pages, and emails that answer real questions",
    description:
      "A content engine built around one offer at a time, drafted in your voice and published in your accounts on a calendar you approve.",
    eyebrow: "Agency · Content",
  },
  {
    path: "/agency/start",
    title: "Tell Ryan what is leaking",
    description:
      "The agency intake: business, channels, the ad budget you are genuinely prepared to spend, the bottleneck, who decides, and when.",
    eyebrow: "Agency intake",
    index: false,
  },
  {
    path: "/agency/pay",
    title: "Pay the number in your written scope",
    description:
      "Pay an agency scope by card: the service, one-time or monthly, the amount Ryan put in writing, and your receipt. Ad spend stays on your own card.",
    eyebrow: "Agency payment",
    index: false,
  },
  {
    path: "/portfolio",
    title: "Open the work and inspect it",
    description:
      "Explore real websites and systems, with client and founder-owned projects labeled clearly.",
    eyebrow: "The work",
  },
  {
    path: "/results",
    title: "See what has actually been built",
    description:
      "Visit the working websites, enrollment systems, archives, and business software.",
    eyebrow: "Working systems",
    art: "/og/portfolio/donandpatti.jpg",
  },
  {
    path: "/premier-system",
    title: "The school behind the system",
    description:
      "Meet Amanda Williams and explore Premier Dental Academy’s website, enrollment path, and student learning tools.",
    eyebrow: "Premier Dental Academy of Longview",
    art: "/images/premier/academy-learning-20260907.webp",
  },
  {
    path: "/live",
    title: "See what visitors actually do",
    description:
      "Privacy-safe traffic, tool activity, lead tracking, and a website grader in one view.",
    eyebrow: "Live analytics",
  },
  {
    path: "/scoreboard",
    title: "Follow the work across businesses",
    description:
      "Read each business's own aggregate views, clicks, leads, and recorded activity.",
    eyebrow: "The scoreboard",
  },
  {
    path: "/proof-floor",
    title: "See what moved and what finished",
    description:
      "Inspect aggregate operating records, completed work, approvals, and verified cash.",
    eyebrow: "The proof floor",
  },
  {
    path: "/operatoros",
    title: "Give repetitive work a clear process",
    description:
      "Map the job, define the AI worker's permissions, and review the work through Mission Control.",
    eyebrow: "OperatorOS",
  },
  {
    path: "/showcase",
    title: "Explore a business command center",
    description:
      "A clearly labeled simulation shows how a larger analytics and automation system can work.",
    eyebrow: "Interactive showcase",
  },
  {
    path: "/demo",
    title: "Explore a sample client website",
    description:
      "Piney Woods Coffee Co. is a labeled example of a website, offer, and lead-capture experience.",
    eyebrow: "Website demonstration",
    art: "/images/page-art/coffee-demo.png",
  },
  {
    path: "/articles",
    title: "Read it. Try it. Use it.",
    description:
      "Practical business guides with worked examples, checklists, prompts, and existing tools.",
    eyebrow: "The article library",
  },
  {
    path: "/academy",
    title: "You can learn this",
    description:
      "Ten practical business courses, including two free courses, with written lessons and workbooks.",
    eyebrow: "Operator Academy",
  },
  {
    path: "/training",
    title: "Continue building your business skills",
    description:
      "Browse the Operator Academy course library and return to the next lesson in your learning path.",
    eyebrow: "Training library",
  },
  {
    path: "/chatgpt",
    title: "Give ChatGPT one useful job",
    description:
      "Learn practical prompting, checking, and repeatable business workflows in The ChatGPT Operator.",
    eyebrow: "The ChatGPT Operator",
  },
  {
    path: "/operator-academy/content-engine",
    title: "Give your content a clear purpose",
    description:
      "Learn a repeatable process for planning, recording, editing, and publishing useful business content.",
    eyebrow: "The Content Engine",
  },
  {
    path: "/go/tools",
    title: "Give visitors something useful",
    description:
      "Explore a calculator, quiz, estimator, generator, archive, or lead funnel your business owns.",
    eyebrow: "Tool Studio",
  },
  {
    path: "/go/lead-follow-up",
    title: "Give every inquiry a next step",
    description:
      "Review the scope of a practical lead follow-up campaign written for one business offer.",
    eyebrow: "Lead follow-up",
  },
  {
    path: "/go/time-back",
    title: "Get your time back from posting",
    description:
      "Choose a scoped content package, review the total, and keep the work in your own accounts.",
    eyebrow: "Time Back",
    index: false,
  },
  {
    path: "/contact",
    title: "Tell us what you are working on",
    description:
      "Send The LeadFlow Pro a question or describe the business task you need help with.",
    eyebrow: "Contact",
    art: "/images/page-art/contact.png",
  },
  {
    path: "/book",
    title: "Talk through your next move",
    description:
      "Share your business, the problem you want to solve, and the next step you need to make clear.",
    eyebrow: "Book a call",
  },
  {
    path: "/privacy",
    title: "Know how your information is handled",
    description:
      "Read The LeadFlow Pro's privacy policy, including collection, use, and choices.",
    eyebrow: "Privacy policy",
  },
  {
    path: "/terms",
    title: "Know the terms before you start",
    description:
      "Read the terms for using The LeadFlow Pro website and requesting services.",
    eyebrow: "Terms of use",
  },
] as const;
