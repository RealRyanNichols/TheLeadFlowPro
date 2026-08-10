// Owned article library. Articles are plain markdown in the repo so they ship
// with the site, rank under the site's own domain, and never live in a rented
// CMS. Each article page embeds the Map My System CTA for lead generation.

export type Article = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  ogImage: string; // path under /public, 1200x630
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
    ogImage: "/og/articles/the-money-is-in-the-follow-up.jpg",
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
    ogImage: "/og/articles/marketplace-is-not-your-website.jpg",
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
  {
    slug: "small-business-website-cost",
    title: "How much does a small business website actually cost in 2026?",
    description:
      "Template builders, agencies, and owned builds priced honestly. What you pay up front, what you pay forever, and the questions that keep you from overpaying.",
    publishedAt: "2026-08-09",
    readingMinutes: 7,
    ogImage: "/og/articles/small-business-website-cost.jpg",
    body: `
Ask five people what a small business website costs and you will get five confident answers that have nothing to do with each other. Twelve dollars a month. Five hundred bucks. Five thousand. Fifty thousand. All of them are real prices. They are just prices for different things.

Here is the honest breakdown.

## The three ways to pay for a website

Every website deal on earth is one of three shapes:

1. **You rent a builder and do it yourself.** Wix, Squarespace, Shopify, GoDaddy builder. Low monthly fee, your evenings and weekends as the real cost.
2. **You pay someone to build on a rented platform.** A freelancer or agency sets up WordPress, Wix, or Shopify for you, then you keep paying the platform, the plugins, and often the person.
3. **You own the build.** The site, the code, the database, and the accounts belong to the business. You pay to build it, then you pay small infrastructure costs instead of a stack of subscriptions.

None of these is automatically wrong. They are wrong when the shape does not match the job.

## What DIY builders really cost

The advertised price is not the price. A builder plan that says twenty to forty dollars a month grows the moment the business gets real. An email tool gets added. A booking tool. A review tool. Extra seats. A plugin that does the thing the builder cannot. Businesses I map are often paying two hundred to five hundred dollars a month across their stack without ever deciding to.

The bigger cost is the ceiling. When you need the site to do something the template cannot, the answer is another subscription or a rebuild.

## What agencies really cost

Local agencies and freelancers commonly land between two and ten thousand dollars for a small business build, and well above that for e-commerce or custom work. Some of that work is excellent. Two questions separate the good deals from the bad ones:

- Who owns the accounts when the project ends? If the hosting, domain, and site live in the agency's accounts, you bought a service, not an asset.
- What happens when you stop paying the monthly fee? If the answer is that the site degrades or disappears, that is rent with extra steps.

## What an owned build costs

Building custom used to be the expensive option. That changed. Modern tools cut the labor dramatically, which is the whole reason The LeadFlow Pro exists. An owned build costs more up front than a template, and then the monthly picture flips: infrastructure for an owned stack often runs less than a single builder subscription, and there is no per-feature toll booth.

You are not paying for pixels. You are paying for the system: the site, the lead capture, the follow-up, the database, all in accounts with your name on them. See [what those builds include](/pricing) if you want real ranges instead of a mystery quote.

## How to decide

- If you are testing an idea and money is tight, use a builder. It is the right tool for that season.
- If the business is proven and the stack of fees is growing, run the numbers on ownership.
- Whatever you choose, keep the domain in your own registrar account. Always. That one is not negotiable.

The cheapest website is the one that catches the customers you are already paying to attract. Start by mapping what you actually need before anyone quotes you anything.
`,
  },
  {
    slug: "website-builder-monthly-fees",
    title: "Wix, Squarespace, Shopify: what your monthly fee actually buys",
    description:
      "Website builders are not a scam. They are a trade. Here is exactly what you get for the monthly fee, what you give up, and when the trade stops making sense.",
    publishedAt: "2026-08-09",
    readingMinutes: 6,
    ogImage: "/og/articles/website-builder-monthly-fees.jpg",
    body: `
I am not going to tell you Wix, Squarespace, and Shopify are evil. They are not. They are a trade, and trades should be understood before they are signed.

## What the fee buys you

Real things. Hosting you never think about. Templates that look decent on day one. Security patches you never see. Support chat at midnight. For a brand-new business with no traffic and no systems, that bundle is legitimately useful.

## What the fee does not buy you

Ownership. Read the terms of any builder and you will find the same shape: you own your content, they own the platform. In practice that means:

- The site cannot move. There is no export that walks out the door with a working website under your arm.
- Features live behind plan tiers. The moment you need the next thing, you need the next plan.
- The data model is theirs. Your customers, orders, and form fills live in their structure, reachable the way they permit.
- Price changes are their decision, not yours.

## The quiet math

The fee that starts small rarely stays small, because the builder is almost never alone. There is an email tool next to it. A booking app. A review widget. A form upgrade. Each one is a reasonable monthly number, and together they become a permanent line item that buys the business nothing it owns.

Add up your own list honestly. Not the advertised prices, the actual charges on the card. That number, times twelve, is what renting costs per year. [The rent receipt article](/articles/cost-of-renting-business-software) walks through the full worksheet.

## When the trade makes sense

- You are new, unproven, and need something live this week.
- Your website is a brochure and genuinely nothing more.
- The total monthly stack is still small and the business is not leaning on it.

Keep the builder in those seasons. No shame in it.

## When the trade stops making sense

- The stack costs hundreds a month and the business depends on it.
- You keep hitting the template ceiling and buying plugins to punch through it.
- Leads come in from calls, texts, forms, and DMs, and the builder holds none of that together.
- You want the customer list, the follow-up, and the site to live in accounts you control.

That is the point where ownership beats convenience, and it arrives earlier than most owners expect. When you get there, map the system you actually need before you buy anything else. The diagnosis is free and it does not ask who you are first.
`,
  },
  {
    slug: "does-my-business-need-a-crm",
    title: "What a CRM actually does, and whether your business needs one",
    description:
      "CRM in plain English: one list of every lead and customer, what happened last, and what happens next. When a spreadsheet is fine and when it stops being fine.",
    publishedAt: "2026-08-09",
    readingMinutes: 6,
    ogImage: "/og/articles/does-my-business-need-a-crm.jpg",
    body: `
CRM is one of those letters-words that software companies love and business owners quietly nod at. Customer relationship management. Fine. But what is it?

Strip the acronym and a CRM is three lists that stay in sync:

1. Every lead and customer, in one place, with how they found you.
2. What happened last with each one: the call, the text, the quote, the job.
3. What happens next, assigned to a person, with a date.

That is the entire concept. Everything else is decoration.

## When a spreadsheet is genuinely fine

If you get a handful of inquiries a month and one person handles all of them, a spreadsheet or a notebook works. The system is small enough to live in one head. Adding software to that adds cost and clicks, not customers.

## The moment it stops being fine

The breaking point is not company size. It is surface area. The business starts getting leads from more than one place: calls, a website form, Facebook messages, referrals, a marketplace. More than one person touches them. And suddenly the four questions that matter have no answers:

- Who came in this week?
- Who was never called back?
- Which source sends the customers that actually pay?
- What is supposed to happen tomorrow?

If answering those requires opening five apps and asking two people, you do not have a memory problem. You have a systems gap. [The follow-up leak](/articles/the-money-is-in-the-follow-up) lives exactly here.

## What to look for, and what to ignore

Ignore the feature checklists. For a small business, a working CRM needs to do five things:

- Catch every lead automatically, from every source, with the source recorded.
- Show one pipeline: new, contacted, booked, quoted, won, lost.
- Keep the whole conversation history attached to the person.
- Assign a next action so nothing depends on remembering.
- Let you leave with your data if you ever want to.

That last one matters more than any feature. Per-seat pricing that punishes growth and export tools that produce a useless pile of CSVs are how rented CRMs keep you. A CRM your business owns, sitting on your own database, does not have that lever.

## The honest recommendation

Do not buy a CRM because a blog told you to, including this one. Count your inquiry sources, count the people who touch leads, and pull up your last ten inquiries to see how many got a same-day response and a recorded next step. If those numbers embarrass you a little, fix the system. Map it first, then build the smallest version that closes the leak.
`,
  },
  {
    slug: "website-traffic-but-no-customers",
    title: "Your website gets visitors. Why is nobody calling?",
    description:
      "Traffic without customers is a diagnosable problem. Five leaks that turn website visitors into strangers, and how to find yours in an afternoon.",
    publishedAt: "2026-08-09",
    readingMinutes: 6,
    ogImage: "/og/articles/website-traffic-but-no-customers.jpg",
    body: `
A website that gets visitors and produces no customers is not bad luck. It is a leak, and leaks can be found. Here are the five I find most often when I map a business, in the order I check them.

## Leak one: there is no obvious next step

Pull up your homepage on your phone and pretend you are a stranger with a problem and thirty seconds. Can you tell what this business does, who it serves, and what to do next without scrolling twice? If the biggest button on the page is not the thing you want customers to do, the page is decoration.

Every page needs one primary action. Call, book, quote, buy. Pick one per page and make it unmissable.

## Leak two: the page answers your questions, not theirs

Most business websites are organized around the business: our story, our services, our mission. Customers arrive with three questions: do you solve my problem, can I trust you, and what does it roughly cost. Pages that answer those three fast turn visitors into inquiries. Pages that make people dig do not.

Proof carries most of the trust load. Real photos, real reviews, real jobs. Stock photos of smiling call centers do the opposite of what people hope.

## Leak three: the form goes somewhere nobody lives

The form works. It sends an email. The email lands in an inbox that gets checked when someone remembers. By then the visitor has filled out two competitors' forms.

Speed matters because the customer is still in the buying moment when they submit. An instant honest confirmation plus a fast human follow-up beats a beautiful website with a slow inbox every single time. This is [the follow-up problem](/articles/the-money-is-in-the-follow-up), and it eats more businesses than bad design ever will.

## Leak four: the phone number is a dead end

If the site's main action is a phone call, then every unanswered ring is a bounce. Missed call, no text back, no voicemail anyone checks, no record it happened. Visitors did exactly what you asked and got silence. [Missed calls are their own leak](/articles/missed-calls-cost-customers) and deserve their own fix.

## Leak five: you are measuring nothing

If you cannot say how many inquiries came in last month and from where, every fix is a guess. You do not need an analytics degree. You need each lead tagged with its source in one list, so that in ninety days you can see which channel sends people who actually pay.

## Find yours in an afternoon

Walk the path yourself: search, land, read, submit, call. Time the response. Check where the lead ended up. The leak usually announces itself in the first twenty minutes. If you want the structured version, map your system and get the diagnosis before anyone asks for your name.
`,
  },
  {
    slug: "missed-calls-cost-customers",
    title: "Every missed call is a customer calling the next business on the list",
    description:
      "People who call are ready to buy now. Here is the honest math on missed calls, and the simple system that catches them: text back, one inbox, recorded follow-up.",
    publishedAt: "2026-08-09",
    readingMinutes: 5,
    ogImage: "/og/articles/missed-calls-cost-customers.jpg",
    body: `
Nobody calls a business to browse. People call when they are ready to act: the AC is out, the tooth hurts, the deadline is Friday, the water is coming through the ceiling. A caller is the most valuable visitor you will ever get, and they are the one you cannot ask to wait.

When the call goes unanswered, most people do not leave a voicemail. They hang up and dial the next result on the list. Your ad money found them, your reputation earned the call, and your competitor answered it.

## Run your own numbers

Skip the scary internet statistics. Use yours:

1. How many calls does the business get in a week? Your phone history knows.
2. How many ring out or hit voicemail? Be honest about job sites, evenings, and lunch.
3. What is an average customer worth to you, not just on the first job but over a year or two?

Multiply. Whatever that number is, that is the size of the hole, and you paid marketing money to dig it.

## Why answering everything yourself is not the fix

You are on a ladder, in a patient's mouth, driving, or living your life. The fix is not superhuman answering. It is a system that catches what you miss:

- **A missed call gets an instant text back.** Something honest: sorry we missed you, we are with a customer, what do you need? The customer is held in the moment instead of dialing the next number. Most will text back.
- **Calls and texts run on a business line, not a personal cell.** The conversation history belongs to the business, visible to anyone who covers the phone, instead of trapped on one person's phone that leaves when they do.
- **Every missed call becomes a lead with a next action.** It lands on a list with a name, a number, and a task. Nothing depends on remembering at 9pm.

## The part most businesses skip

Catching the first contact is half the job. The other half is what happens after: the quote that never got sent, the follow-up that never happened. That is a system problem too, and the same one-inbox approach fixes it. [The money is in the follow-up](/articles/the-money-is-in-the-follow-up) walks through it.

## Where to start

This is one of the cheapest leaks in business to fix, which is what makes it painful to ignore. Map how calls, texts, and forms reach you today and where they die. The map shows you the fix before you spend a dollar on it.
`,
  },
  {
    slug: "facebook-page-is-not-a-website",
    title: "A Facebook page is not a website",
    description:
      "Running a business on Facebook alone works until it does not. What the algorithm decides for you, what a locked account costs, and the owned home base fix.",
    publishedAt: "2026-08-09",
    readingMinutes: 6,
    ogImage: "/og/articles/facebook-page-is-not-a-website.jpg",
    body: `
Plenty of real businesses run entirely on a Facebook page, an Instagram profile, or a TikTok account. The posts get engagement. The DMs bring orders. It works, and because it works, suggesting a website sounds like something a salesman would say.

So let me say the honest version instead: keep Facebook. It is a real channel with real reach. Just stop letting it be the only place your business exists.

## What the platform decides for you

On a social platform, someone else decides:

- **Who sees your posts.** Reach is an algorithm's choice that changes without notice. The people who followed you are not actually yours to reach; you get whatever slice the feed grants today.
- **What you are allowed to post.** Category rules shift. Whole industries wake up to restricted reach without doing anything wrong.
- **Whether your account exists tomorrow.** Ask any owner who has been through a hacked page, a mistaken flag, or a locked account how the appeal process went. Rebuilding years of followers from zero is the price of having no second location.

None of this makes the platform bad. It makes it rented.

## What renters cannot do

There are basic business moves a page cannot make. You cannot pull a list of your customers off Facebook. You cannot follow up with the person who messaged you last month unless the platform surfaces them. You cannot show up when someone searches Google for the thing you sell in your town. And when someone asks for your website and the answer is a Facebook link, a slice of customers quietly decides you are not established enough for the big job.

## The home base next to the channel

The fix is the same one I give [marketplace sellers](/articles/marketplace-is-not-your-website): keep the channel, add a home base you own.

- A simple site that shows up in search, states the offer, and takes the call, form, or booking.
- Every inquiry, from DMs to calls, landing in one owned list with follow-up attached.
- An email or text list, built with permission, that reaches customers without asking an algorithm first.

Facebook keeps doing what it is great at: attention. The home base does what Facebook will never do: hold the customer relationship in accounts that belong to you.

## The first move

Do not build anything yet. First map where your business actually lives online, where the orders come from, and what would break if one account disappeared. That answer tells you how urgent this is. For some businesses it is a someday project. For social-only businesses it is the whole ballgame.
`,
  },
  {
    slug: "own-your-email-list",
    title: "Your email list is the only audience you own",
    description:
      "Followers are rented reach. An email list is owned reach. Why the list beats the algorithm, how to build one with permission, and what to send without being spam.",
    publishedAt: "2026-08-09",
    readingMinutes: 6,
    ogImage: "/og/articles/own-your-email-list.jpg",
    body: `
Ten thousand followers sounds like an audience. It is closer to an audition. Every post you make is a request to an algorithm to please show your work to the people who already said yes to you. Some days it says fine. Most days it shows a sliver.

An email list is the opposite arrangement. You write, you send, it arrives. No bid, no feed, no middleman deciding your reach this week. That is the entire case, and it has not changed in twenty years of platforms rising and falling.

## What owned reach is worth

The difference shows up the day you need it:

- The platform changes its algorithm: your list does not care.
- Your account gets flagged or hacked: your list does not care.
- You need revenue this month, not impressions: the list is where offers actually convert, because everyone on it raised their hand.

Social finds strangers. Email keeps customers. A business needs both jobs done, and only one of them can be owned.

## Build it with permission or do not build it

The fastest way to ruin a list is to fill it with people who never asked. Bought lists and scraped emails are spam with paperwork, and in Texas as everywhere, consent rules are not optional. The list that works is the one people chose:

- Every customer, invited at the point of sale: want the receipt and updates by email?
- A reason to sign up that is worth a real email address: a genuinely useful guide, first access, a real discount. Not a newsletter for its own sake.
- A checkbox on every form you already run, unchecked by default, honest about what you will send.

Slow is fine. Two hundred real locals who chose you beat ten thousand strangers every time.

## What to send without being spam

The bar is simple: send what a reasonable customer would be glad to get. A monthly note that is mostly useful and a little promotional. Seasonal reminders that match your trade. Real news: new service, new hours, a job you are proud of. And when you have an offer, make it plainly.

If writing it is the blocker, that is a solvable problem. The unsolvable problem is having no list to send to.

## Where the list lives matters too

An email list trapped in a rented tool with per-contact pricing is only half owned. Keep the list in a database that belongs to the business, synced to whatever sending tool you use, exportable on any given Tuesday. That way the tool can change and the audience stays. This is the same principle as everything else here: [the platform is a channel. The home base is yours.](/articles/facebook-page-is-not-a-website)
`,
  },
  {
    slug: "east-texas-business-website-guide",
    title: "What East Texas businesses should know before paying for a website",
    description:
      "A Longview-based guide for East Texas owners: what a local business website must do, what it should cost, and the questions that protect you before you sign.",
    publishedAt: "2026-08-09",
    readingMinutes: 7,
    ogImage: "/og/articles/east-texas-business-website-guide.jpg",
    body: `
I build business systems from Longview, and I talk to owners across East Texas: Longview, Tyler, Marshall, Kilgore, Gladewater, Hallsville, White Oak, and the towns between. The stories rhyme. Somebody paid for a website years ago. The guy who built it moved, or the agency keeps billing, or the login is lost, and nobody is sure what the site even does for the business anymore.

Before you pay anyone for a website, including me, here is what an East Texas business should actually know.

## Around here, Google is the front door

Most local customers do not browse. They search: plumber near me, dentist Longview, shop that does lift kits. Winning that moment takes three things working together:

- **A Google Business Profile that is claimed, complete, and active.** Photos, hours, services, and reviews. For local search this single free listing often matters more than the website itself.
- **A website that backs it up.** Google connects the profile to your site. A real site with your services, your service area, and your proof strengthens the whole listing.
- **Reviews with responses.** Steady honest reviews, answered like a human, beat a perfect logo every time.

If a web quote does not mention your Google Business Profile at all, that tells you something.

## What a local business site has to do

Not much, done well:

1. Say what you do, where you do it, and for whom, in the first screen.
2. Show proof: real photos of real jobs, real reviews, the actual faces behind the work. East Texas buys from people, not templates.
3. Make contact effortless: tap-to-call, a short form, honest hours. On a phone, because that is where your customers are.
4. Catch every inquiry. A form that emails a dead inbox is a leak, not a website. [The follow-up is where the money is.](/articles/the-money-is-in-the-follow-up)

## Questions that protect you

Ask these before signing anything, local or not:

- Who owns the domain, and is it registered in MY account? If the answer is fuzzy, walk.
- Who owns the hosting and the site itself when we are done paying the build fee?
- What exactly does the monthly fee cover, and what happens to the site if I stop paying it?
- Can I get my customer list and form submissions out, in a usable format, whenever I want?

A fair vendor answers all four without flinching. The wrong deal reveals itself right here, before any money moves.

## What it should cost

Nationally, small business builds run from a few hundred dollars on a template to five figures for custom work, and [the full cost breakdown](/articles/small-business-website-cost) covers the shapes. The East Texas version of the advice: judge quotes by ownership and by what the system catches for you, not by page count. A cheap site that loses calls is the most expensive thing you can buy.

If you want a straight answer on what your business actually needs before anyone quotes you, map your system first. It is free, it is honest about what you do not need, and it was built up the road, not in a call center.
`,
  },
  {
    slug: "cost-of-renting-business-software",
    title: "The rent receipt: add up what your business pays every month to exist online",
    description:
      "Site builder, email tool, booking app, CRM seats, review widget. The worksheet that totals your real software rent, and how to read the number honestly.",
    publishedAt: "2026-08-09",
    readingMinutes: 6,
    ogImage: "/og/articles/cost-of-renting-business-software.jpg",
    body: `
Nobody decides to spend serious money renting software. It accumulates. Each tool arrived on the day it solved a problem, each one costs less than lunch, and none of them ever leaves. The only way to see the real number is to add it up on purpose.

## The worksheet

Open your card statement and walk the categories. Write real numbers, not advertised prices:

- Website builder or hosting plan
- Domain and email hosting
- Email marketing tool, priced per contact
- Booking or scheduling app
- CRM, priced per seat
- Forms, surveys, or quiz tools
- Review collection widget
- Social scheduling tool
- E-commerce platform fees and app store add-ons
- Invoicing or payments software subscriptions
- The plugins and upgrades attached to all of the above

Total it. Multiply by twelve. For a lot of established small businesses that yearly number lands somewhere between a used truck and a decent salary, and it buys the business nothing it owns.

## Read the number honestly

The point is not that every subscription is bad. Some of that rent is fair: the tool does a hard job well and the price is honest. Read each line with three questions:

1. **Does the business own what this tool holds?** Customer lists, conversation history, bookings, reviews. If cancelling loses the data, the fee is not for the feature. It is for hostage care.
2. **Does the price scale against my growth?** Per-contact and per-seat pricing means the bill rises precisely because the business is winning. That is a tax on growth you volunteered for.
3. **Would one owned system do this job?** Half of most stacks is duct tape between tools that do not talk: the form tool feeding the spreadsheet feeding the email tool. A system built on one owned database does not need most of the tape.

## What ownership changes, and what it does not

An owned stack does not make software free. Infrastructure has real costs, usually modest ones. What changes is the shape of the deal: costs that stay flat as you grow, data that lives in your accounts, features that get built once instead of rented forever, and no tool that can hold the customer list over your head. [What the builder fee actually buys](/articles/website-builder-monthly-fees) covers the same trade from the other side.

## Do the receipt before you decide anything

This is the rare business decision you can start with an hour and a bank statement. Get your real number. If it is small and the tools serve you, keep them with a clear conscience. If the number makes you sit back in your chair, map your system and see what one owned build would replace. Run your numbers first. Then decide like an owner.
`,
  },
  {
    slug: "ai-website-small-business-2026",
    title: "How AI actually builds and runs a business website in 2026",
    description:
      "Past the hype: what AI genuinely changes about building a business website and system, what it cannot do, and what it means for what owners should pay.",
    publishedAt: "2026-08-09",
    readingMinutes: 7,
    ogImage: "/og/articles/ai-website-small-business-2026.jpg",
    body: `
Every software company on earth has bolted the letters AI onto its pricing page, so I understand if your eyes glaze over. Underneath the marketing, something real did change, and it matters specifically to small business owners. Here is the honest version.

## What actually changed

Custom software used to mean months of developer time, which meant custom was for companies with budgets. That was the entire reason template builders won: not because templates are great, but because custom was out of reach.

AI collapsed the labor. A builder who knows what they are doing can now stand up in days what used to take a team months: a real website, a lead database, automated follow-up, booking, client portals, all as custom code in accounts the business owns. The tools are ordinary and public: Claude, ChatGPT, GitHub, Vercel, Supabase. Nothing exotic. What changed is the speed, and speed is cost.

The practical consequence: owning a custom system now costs what renting a template stack used to. That is the shift. Everything else is noise.

## What AI runs after the build

Day to day, the useful AI in a small business system is boring on purpose:

- Drafting: follow-up emails, quotes, review responses, service pages, written fast and edited by a human who knows the customer.
- Sorting: reading inbound leads, tagging the source, flagging the urgent ones so mornings start with a list instead of an inbox dig.
- Answering honestly: instant first replies that say a real person will follow up, and when. Not a chatbot pretending to be human at 2am.

Rule of thumb: AI drafts, humans send. Especially in a town where your customers know your name.

## What AI cannot do

It cannot know your trade, your prices, your standards, or your county. It cannot make the offer for you, answer for your reputation, or care whether the customer calls back. And it absolutely cannot fix a business that ignores its leads. An AI-built system pointed at [a follow-up leak](/articles/the-money-is-in-the-follow-up) just documents the leak faster.

Anyone selling AI as a set-and-forget employee is selling you the same old magic beans with a new sticker.

## What this means for what you pay

Two things to watch as an owner. First, be suspicious of old prices for work AI made cheap: a five-figure quote for a template reskin deserves hard questions in 2026. Second, be suspicious of AI as a reason to rent more: an AI feature bolted onto a subscription you do not own is still rent. The leverage goes to owners: custom, owned, connected systems at prices that used to buy a template.

If you want to see what that looks like for your specific business, map your system. The diagnosis is free, the recommendation is specific, and nobody asks for your contact information before you see it.
`,
  },
];

export function getArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug);
}
