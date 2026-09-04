import { TOOL_COUNT } from "./tools";
import { TRADE_ARTICLES } from "./articles-trades";
import { TRADE_ARTICLES_2 } from "./articles-trades-2";
import { TRADE_ARTICLES_3 } from "./articles-trades-3";
import { SEPTEMBER_LAUNCH_ARTICLES } from "./articles-september-launch";
import { isArticlePublished, publishedArticles } from "./article-publication";

// Owned article library. Articles are plain markdown in the repo so they ship
// with the site, rank under the site's own domain, and never live in a rented
// CMS. Each article page embeds the Map My System CTA for lead generation.

// A video attached to an article. Files live under /public/video so the video is
// served from our own domain instead of a rented player that can be pulled down.
export type ArticleVideo = {
  src: string; // path under /public, mp4 (h264 + aac)
  poster: string; // path under /public, still frame
  captions?: string; // path under /public, WebVTT
  title: string;
  description: string;
  durationSeconds: number;
  width: number;
  height: number;
};

// A free tool embedded inside an article, plus the teaching around it.
//
// The article answers the question the person typed into Google. The tool turns
// the answer into their number. The form is how they ask for help once they have
// seen it. Steps and questions also emit HowTo and FAQPage schema, which is what
// puts these pages in the rich results for "how do I work out X".
export type ArticleTool = {
  slug: string; // a published slug from lib/tools
  heading: string;
  intro: string;
  steps: { name: string; text: string }[]; // teach them how to run it
  readIt: string[]; // teach them how to read the answer
  formHeading: string;
  formLead: string;
  interest: string; // a key from INTEREST_LABELS, stamped on the lead
  industry: string; // stamped on the lead so the trade is known on arrival
};

export type ArticleFaq = { q: string; a: string };

export type Article = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  ogImage: string; // path under /public, 1200x630
  video?: ArticleVideo; // optional, plays inline at the top of the article
  tool?: ArticleTool; // optional, renders where {{TOOL}} appears in the body
  faq?: ArticleFaq[]; // optional, renders at the end and emits FAQPage schema
  body: string; // markdown. Put {{TOOL}} on its own line to place the tool.
};

export const ARTICLES: Article[] = [
  {
    slug: "free-tools-that-bring-customers",
    title: "How a dental school uses free training tools to start conversations",
    description:
      "Premier Dental Academy of Longview puts free tools in front of strangers and lets Google do the introductions. Here is the whole play, step by step, so you can run it for your business.",
    publishedAt: "2026-09-03",
    readingMinutes: 8,
    ogImage: "/og/portfolio/premier-dental.jpg",
    tool: {
      slug: "cost-per-lead-calculator",
      heading: "First, find out what a lead costs you today",
      intro:
        "The free tool play only makes sense against your current numbers. Work out what you pay for a lead and a customer right now, so you know exactly what a page that produces them for content instead of cash is worth.",
      steps: [
        {
          name: "Enter your monthly marketing spend",
          text: "Ads, boosted posts, lead services, directories. Everything you pay to make the phone ring, in one number.",
        },
        {
          name: "Count the leads it produced",
          text: "Calls, forms, and messages from that spend last month. If you cannot separate them by source, that is a finding all by itself.",
        },
        {
          name: "Count the ones that closed",
          text: "Leads that became paying customers. Now you have your cost per lead and your cost per customer, side by side.",
        },
        {
          name: "Add what a customer is worth",
          text: "First job plus the repeat business. The tool shows your return on the spend, which is the bar any new play has to clear.",
        },
      ],
      readIt: [
        "Cost per customer is the number the free tool play attacks. A useful page ranks for years and produces leads without a per-click bill attached.",
        "If your cost per lead is tiny and your close rate is high, protect what works. This play adds a channel. It does not replace one that pays.",
        "Return on ad spend below break-even means stop scaling the ads and fix the system first. No channel survives a broken follow-up.",
      ],
      formHeading: "Want this play built for your business?",
      formLead:
        "Tell me what you sell and the question customers always ask you. I will tell you which free tool fits your business, where it should live, and what it costs to build. The same answer I gave the dental school.",
      interest: "lead_engine",
      industry: "General small business",
    },
    faq: [
      {
        q: "Does giving away free tools give away the business?",
        a: "No, because the tool is not the product. A calculator that tells a student what tuition costs does not teach a single clinical skill. A quote calculator does not swing a hammer. The tool answers the question people have before they buy, which is exactly the moment you want them on your site instead of a competitor's.",
      },
      {
        q: "How long does it take a tool page to rank on Google?",
        a: "Months, not days, and nobody honest will promise you a position. What you control is the inputs: a page that genuinely answers a real question, clean structure Google can read, and patience. The compounding is the point. A ranked page keeps producing after the ad budget would have run dry.",
      },
      {
        q: "What kind of tool should my business build?",
        a: "Take the question every customer asks before they buy, usually about price, time, or whether they qualify, and turn the answer into something interactive: a calculator, a scorecard, a checklist. If you hear the same question three times a week, that is your tool.",
      },
      {
        q: "Do I need to know how to code?",
        a: "No. You need to know your customers' questions. The build is the buildable part, and it is exactly what I do. Every tool on this site and every tool on Premier's site came from the same system, and it is the same system I build for clients.",
      },
    ],
    body: `
There is a dental assistant school in Longview that hands its training tools to total strangers. Free practice software. A tuition calculator that shows the real cost before anyone asks for a name. Career tools. No paywall, no email gate on the front end.

That is not charity. That is the funnel.

I know because I built it.

## The play, in one paragraph

A person with a problem types a question into Google. Your site answers it with a page that does not just talk, it works: a calculator, a scorecard, a simulator. The person gets their answer, on your site, with their own numbers in it. Right under the tool is a form that says: want help with what you just saw? Google watches people find that page, use it, and stay. Pages like that earn rankings. Rankings bring the next stranger. The wheel turns without an ad bill.

That is the whole thing. Everything else is execution.

## What Premier actually runs

[Premier Dental Academy of Longview](/premier-system) is a real school with a real enrollment problem to solve: how does a working adult in East Texas find, trust, and choose a 12-week dental assistant program?

Here is what sits at the top of their funnel:

- **Free training simulators.** Practice-management software a curious person can try before they ever apply. The person who spends twenty minutes practicing is not a cold lead anymore.
- **An interactive tuition planner.** The scariest question, what does it cost, answered with a tool instead of a sales call. It shows payment plans, including buy now pay later, with the person's own choices in it.
- **Applications and records the school owns.** Every inquiry lands in the school's own database with its source attached, so the school can see which door each student walked in through.

The school's operating dashboard shows leads arriving from calls, Facebook, tools, applications, and texts, each one labeled. Not because labeling is fun. Because next month's budget decision needs to know which of those doors is worth widening.

## Why the tool ranks when the brochure does not

Google is in the business of answering questions. A services page that says we are the best in East Texas answers nothing. A page that computes what will dental assistant school cost me answers the exact question the person typed.

Three things stack up for a working tool page:

1. **It matches the search.** The page exists to answer one question one audience is actually asking. That focus is what ranking is made of.
2. **It is structured so Google can read it.** These pages carry the schema that tells search engines here is the question, here are the steps, here are the answers. That is the plumbing behind the rich results you see for how-do-I questions.
3. **People behave differently on it.** They stay. They type. They come back with their spouse. Every one of those signals says this page did its job.

## Why the lead is better

A lead from a tool already trusts you a little, because you already helped them. They did math on your site. They saw your name at the top of a page that treated them like an adult instead of a target.

So the form under the tool does not need tricks. It says what it says on every tool page I build: here is what you just worked out, want a real person to look at it with you? The people who fill that out are the people who meant it.

And because the lead lands in a database the business owns, with the source stamped on it, the follow-up starts the same minute. [The money is in the follow-up.](/articles/the-money-is-in-the-follow-up) It always was.

## The receipts on this site

I do not ask clients to run a play I will not run myself. This website carries ${TOOL_COUNT} free working tools and the articles around them, built on the exact system I am describing. The tool below is one of them. The form under it works the same way Premier's does. You are standing inside the example.

{{TOOL}}

## How to run this for your business

You do not need 86 tools. You need one good one.

1. **Find the question.** The one customers always ask before they buy. It is usually about price, time, or whether they qualify.
2. **Turn the answer into a tool.** A calculator, a scorecard, a checklist that produces their number, not a generic one.
3. **Put it on a site you own.** The rankings, the page, and every lead it produces should belong to your business, not a platform.
4. **Put the ask under the tool.** A short form, an honest sentence, and follow-up that starts the same day.
5. **Label the door.** Every lead records where it came from, so in ninety days you know exactly what the tool is earning.

Then leave it alone and let it compound. That is the part ad spend can never do for you.

## The bottom line

The school gives away training tools to help prospective students try the work. This site gives away ${TOOL_COUNT} of them and writes articles about it. The play is sitting right there, and in most trades in most towns, nobody is running it yet.

Somebody in your market is going to build the page that answers your customers' favorite question. The only question is whose name is on it.
`,
  },
  {
    slug: "website-text-too-small-on-mobile",
    title: "If they cannot read your website on a phone, you do not have a website",
    description:
      "A real person tried to read this site on her phone and could not. Here is what we found, what we fixed, and the two-minute test that tells you if your site has the same problem.",
    publishedAt: "2026-09-03",
    readingMinutes: 6,
    ogImage: "/og/portfolio/theleadflowpro.jpg",
    tool: {
      slug: "mobile-traffic-loss",
      heading: "Price your mobile leak",
      intro:
        "Most of your visitors are on a phone. If the site works worse there than on a desktop, that gap has a dollar figure. Work out yours.",
      steps: [
        {
          name: "Enter your monthly visitors",
          text: "From your analytics. If you have none, use a guess and treat the result as a floor. Then go get analytics, because flying blind is its own leak.",
        },
        {
          name: "Set the share on phones",
          text: "Your analytics knows this too. For most local businesses it is well past half, which is why the phone version of your site is the real version.",
        },
        {
          name: "Enter both conversion rates",
          text: "What share of desktop visitors contact you, and what share of phone visitors do. The gap between those two numbers is the leak this article is about.",
        },
        {
          name: "Add what a customer is worth",
          text: "Average value and your close rate, so the leak comes out in dollars instead of percentages.",
        },
      ],
      readIt: [
        "The yearly figure is what the phone gap costs at your traffic and prices. It is the budget for fixing it, computed from your own numbers.",
        "If mobile matched desktop is the line to look at twice. That is not a fantasy number. It is what readable text, tappable buttons, and a short form buy back.",
        "A small leak means your site passes the phone test. Congratulations, go check your follow-up instead.",
      ],
      formHeading: "Failed your own phone test?",
      formLead:
        "Send me your website address and I will look at it on a phone the way a customer does, then tell you plainly: fix the site you have, or start over with the free five-page build. One of those is the honest answer, and I will tell you which.",
      interest: "free_website_program",
      industry: "General small business",
    },
    faq: [
      {
        q: "What font size should a website use on mobile?",
        a: "Sixteen pixels is the floor for body text, and that is not a style opinion. It is roughly the size phone browsers consider readable without zooming, and it is the size Apple and Google use as the baseline in their own guidance. Labels and buttons should not be far behind it.",
      },
      {
        q: "How do I test my website on a phone properly?",
        a: "Hand your phone to someone over fifty, in daylight, and ask them to find your price and contact you. Watch silently. The pinching, squinting, and mis-taps you see in the next two minutes are what every customer experiences and never mentions. They just leave.",
      },
      {
        q: "Does Google punish sites that are hard to read on phones?",
        a: "Google indexes the mobile version of your site as the primary one and its own documentation says readable text and usable tap targets matter for the mobile experience. But the honest reason to fix it is closer to home: the customer who cannot read your page does not file a complaint. They call your competitor.",
      },
      {
        q: "Do I need a whole new website to fix this?",
        a: "Not always. Sometimes it is raising the type, spacing the buttons, and shortening the form on the site you have. It becomes a rebuild when the site also fails the deeper tests: no clear next step, no lead capture, no follow-up behind it. The phone test tells you where to start, not always where to stop.",
      },
    ],
    body: `
This week somebody tried to read this website on her phone. She could not do it. The text on some of our fanciest sections was small enough to need a magnifying glass, and she said so.

She was right. We measured it. Some labels were eight pixels tall. Eight. On a site that tells other businesses how to catch customers.

So we fixed it. Four hundred and seventy-one text sizes raised in one pass, bigger buttons, brighter contrast, tested at phone width before it shipped. And then I wrote this, because if it happened to us, it is happening to you.

## The phone is not the small version. It is the version.

Pull up your analytics and look at the device split. For most local businesses, most visitors are on phones. The desktop site you approved on a big monitor in perfect lighting is the minority experience.

Which means every decision you made while leaning into a 27-inch screen gets judged by a customer squinting at six inches of glass in a parking lot.

## The two-minute test

Do not audit your site. Hand your phone to someone and watch.

1. Can they read the body text without pinching?
2. Can they tell what you do from the first screen?
3. Can they find the price, or at least the path to it?
4. Can they tap the phone number with a thumb, first try?
5. Can they finish your form in under a minute?

Every failure on that list is quiet. No error message fires when a 62-year-old customer with reading glasses gives up on your quote form. The visit just ends, and your analytics files it under bounce.

## What we actually changed, so you can steal the list

- **A floor under the text.** Body text at sixteen pixels minimum. Labels close behind. If a word matters enough to print, it matters enough to read.
- **Buttons built for thumbs.** Tap targets sized so a working hand hits them the first time, with space between them so it does not hit two.
- **Contrast that survives daylight.** Light text on dark backgrounds looks sharp in a design review and vanishes on a phone in the sun. We brightened the dim text and lifted the dark-on-dark sections.
- **One action per screen.** A phone screen is small. It gets one job: call, start, read. Not six competing buttons.
- **Shorter forms.** Every extra field on a phone keyboard costs more than the same field on a desktop. [Count yours.](/articles/website-traffic-but-no-customers)

None of that is decoration. Every line of it exists to stop a customer from leaving mid-sentence.

## Put a price on it

The leak is measurable, and your own numbers are sitting in your analytics.

{{TOOL}}

## The part that stings

The person who cannot read your site does not know your labels are eight pixels. She does not know what a viewport is. She knows your business felt hard to deal with and the next one on the list felt easy.

The record does not care how the site looked on your monitor. It cares what happened on her phone.

We took the correction and shipped the fix the same day. Your move is the same one: run the test, price the leak, fix the floor. And if the site fails deeper than type size, the [free five-page build](/free-build) exists for exactly that.
`,
  },
  {
    slug: "data-centers-are-coming-to-texas",
    title: "Data centers are coming to Texas. Here is what I am going to do about it.",
    description:
      "Forty-two seconds shot on my porch about the data center buildout and what it means for East Texas business owners. AI is not going away. Complaining is not a plan.",
    publishedAt: "2026-08-12",
    readingMinutes: 5,
    ogImage: "/og/articles/data-centers-are-coming-to-texas.jpg",
    video: {
      src: "/video/data-centers-are-coming-to-texas.mp4",
      poster: "/video/data-centers-are-coming-to-texas-poster.jpg",
      captions: "/video/data-centers-are-coming-to-texas.vtt",
      title: "Data centers are coming to Texas",
      description:
        "Ryan Nichols on the Texas data center buildout, what AI actually changed for small business owners, and why the answer is to build instead of complain.",
      durationSeconds: 42,
      width: 720,
      height: 1280,
    },
    tool: {
      slug: "task-automation-savings",
      heading: "Find out if the robot pays for itself",
      intro:
        "Do not use AI because a video told you to, including mine. Pick one repetitive task in your business and run the payback math on automating it. That is how you use this stuff like an owner instead of a fan.",
      steps: [
        {
          name: "Pick one task you do every week",
          text: "Sending the quote follow-up. Posting the job photos. Chasing the invoice. Typing the same reply to the same question. One task, not your whole business.",
        },
        {
          name: "Enter the minutes and how often",
          text: "How long the task takes and how many times a week it happens. Count the version where you get interrupted, because that is the real one.",
        },
        {
          name: "Put in what the time costs",
          text: "Your hourly worth or the wage of whoever does it. Owner time is not free. It is the most expensive labor in the building.",
        },
        {
          name: "Add what automating it would cost",
          text: "A one-time setup cost and any monthly cost. If you do not have a quote, put in a placeholder and see what the task could justify.",
        },
      ],
      readIt: [
        "The payback line is the decision. Pays for itself in months: build it. Pays for itself in years: skip it and keep your money.",
        "The hours-a-year number is the one that sneaks up on people. Small weekly tasks quietly eat work-weeks of your year.",
        "Run it for three or four tasks and stack the results. That stack is your automation roadmap, in order, with receipts.",
      ],
      formHeading: "Want the roadmap built for your business?",
      formLead:
        "Send me the task you ran and the payback number. I will tell you what else in your week automates profitably, what should stay human, and what the build costs. Straight answer, no pressure.",
      interest: "system_map",
      industry: "East Texas small business",
    },
    faq: [
      {
        q: "Do I need to understand AI to use it in my business?",
        a: "No more than you need to understand a transmission to drive a truck. You need to know what job you are hiring it for, what it costs, and how to check the work. The payback math above is the owner's version of understanding, and it is the only version that pays.",
      },
      {
        q: "What should a small business automate first?",
        a: "The task that scores best on three things: it happens constantly, it follows the same steps every time, and dropping it costs money. For most local businesses that is lead follow-up, missed-call responses, and review requests. Not the craft. Not the judgment calls.",
      },
      {
        q: "Is it too late to get ahead of this?",
        a: "In East Texas? No. The list of local businesses actually running these tools is short, which is the entire opening. The tools are cheap and public. The advantage goes to whoever learns to run them first, and around here that race has barely started.",
      },
      {
        q: "How do I avoid AI becoming another monthly fee trap?",
        a: "Same rule as everything else on this site: if AI is going to run part of your business, it should run inside accounts you own. Your site, your database, your customer list. An AI feature bolted onto a subscription that holds your data hostage is the same old rent with a new sticker.",
      },
    ],
    body: `
I shot this on my porch. Forty-two seconds. No script, no studio, no agency.

Watch it, then read the rest.

## The short version

Data centers are going up across Texas. You can drive past the cranes. That is not a prediction. That is concrete.

I do not love every part of it, and I said so. We do not even want to go there. But we have to. They are coming.

And if the data centers are coming, the AI is here. It is not going away.

So what are you going to do about it?

## There are two answers

Complain about it. Or use it.

Complaining is free. It feels good for about a day. It does not put one customer in your pipeline.

Using it is work. It is also the cheapest advantage a small business owner has ever been handed.

## What actually changed for an owner

Here is the part nobody explains at the coffee shop.

Work that used to mean a [five figure quote and a three month wait](/articles/small-business-website-cost) now takes a weekend and tools you can cancel. A real website. A real database. [Follow-up that answers a lead](/articles/the-money-is-in-the-follow-up) at eleven at night on a Sunday. Quotes, invoices, reminders, review requests, all running without anyone remembering to do it.

That used to be an enterprise budget. Now it is a Tuesday.

The tools got cheap. The advantage did not go to whoever has the biggest budget. It went to whoever learns to run them first.

In East Texas, that list is short. That is the opening.

Want proof instead of a pep talk? Run the math on one task from your own week.

{{TOOL}}

## The trap I want you to see coming

Cheap tools also mean new rent traps.

Every one of those companies would love to sell you AI as [one more monthly fee](/articles/cost-of-renting-business-software). Another seat. Another platform that holds your customer list and raises the price once you are too deep to leave.

Same old deal, new sticker.

If AI is going to run part of your business, it should run inside accounts you own. Your site. Your database. Your customer list. Your number. Your data.

Own your platform. Fire your monthly fees.

## What I am going to do about it

I said in the video that I would tell you. Here it is.

I am building owned systems for business owners while the tools are cheap and most people are still arguing about whether any of this is real.

There are three honest starting points. Pick the smallest one that solves the problem in front of you.

1. **Website Launch.** Five focused pages, one lead path, a $1,000 fixed total, and a working approval checkpoint before the final $500 and production launch.
2. **System Map.** A $497 paid diagnosis for a business with software, data, people, migrations, or dependencies that need to be understood before anyone quotes a larger build.
3. **Larger connected system.** Lead Engine, Training Platform, Company OS, or Custom Platform work is scoped from the real modules and starts higher because it includes more than a public website.

There is no version of this where I hold your platform hostage. That is the entire point.

## What I am not going to do

I am not going to quote you a number I have not verified. I am not going to tell you a data center is landing in your county unless I can show you the filing. When numbers show up on this site, they come with a source.

That is not a limitation. That is the reason to trust the rest of it.

## What comes next

The video says stay tuned. I meant it. This is the first one. There will be more.

Data centers are not going anywhere. AI is not going anywhere. The only open question is whether you use what they power to build something, or spend the next three years complaining about it.

I already picked.

## Your move

Map your system. You answer a few questions about the problem, your home base, and where your sales actually come from. You see the diagnosis and the recommended build before anyone asks who you are.

Free to look. No call required. No card.

## Full transcript

"Data centers are coming to Texas. Oh, we don't even want to go there. No shooting in this area. Does that include this? Shooting? Ha, whatever. We don't want to go there, but we have to. They're coming. They're coming, aren't they? And if the data centers are coming, the AI is here, and it's not going away. What are you going to do about it? I've had a long time to think about that. I'll tell you what I'm going to do about it. I'll tell you."

Data centers aren't going anywhere. Will you use what they power to build something, or just complain about it?
`,
  },
  {
    slug: "the-money-is-in-the-follow-up",
    title: "The money is in the follow-up",
    description:
      "Most businesses do not have a lead problem. They have a follow-up problem. Here is how a connected system catches the leads you already paid for.",
    publishedAt: "2026-08-08",
    readingMinutes: 6,
    ogImage: "/og/articles/the-money-is-in-the-follow-up.jpg",
    tool: {
      slug: "quote-follow-up-calculator",
      heading: "See what your open quotes are worth",
      intro:
        "Do not take my word for the leak. Put your own numbers in and look at what the quotes sitting on your desk would pay if somebody simply followed up on them.",
      steps: [
        {
          name: "Count the quotes you send in a month",
          text: "Written quotes, texted prices, emailed estimates. If a number left your business and a customer was waiting on it, count it.",
        },
        {
          name: "Enter your average quote value",
          text: "Add up your last ten quotes and divide by ten. Do not use your dream job, use the normal one.",
        },
        {
          name: "Be honest about your close rate",
          text: "Out of ten quotes, how many turn into paid work today? Most owners guess high. Check the last month before you type it.",
        },
        {
          name: "Set what follow-up would add",
          text: "A conservative bump is fine. Even a few extra points of close rate is real money, and the tool shows you exactly how much.",
        },
      ],
      readIt: [
        "The yearly number is the size of the leak, not a promise. It is what the quotes you already wrote would pay if the follow-up happened every time.",
        "If the number feels too big to believe, lower the inputs until it feels honest. It usually stays big. That is the point.",
        "Compare the number against what a follow-up system costs to run. That comparison is the whole decision.",
      ],
      formHeading: "Want me to find the rest of the leak?",
      formLead:
        "Send me your number and where your quotes go after you hit send. I will tell you straight whether your leak is speed, tracking, or follow-up, and what the smallest fix looks like.",
      interest: "lead_engine",
      industry: "General small business",
    },
    faq: [
      {
        q: "How fast should a business respond to a new lead?",
        a: "The honest answer is: while the person is still in the buying moment. Someone who fills out a form or sends a message is comparing options right then. An instant confirmation plus a human response the same day beats a perfect response two days later.",
      },
      {
        q: "Does follow-up mean pestering people?",
        a: "No. Follow-up means keeping the promise the quote made. A reminder a few days after a quote, a check-in a week later, and a clear way to say no thanks. Most customers read that as professional, not pushy. The pushy version is what happens when there is no system and someone panics at the end of the month.",
      },
      {
        q: "Can I do follow-up without buying software?",
        a: "Yes, at small volume. A spreadsheet with a date column and a daily ten-minute habit works until the volume or the team grows. The software version exists because the habit breaks the first busy week. The important part is the system, not the tool.",
      },
      {
        q: "What should an automated reply actually say?",
        a: "The truth. That the message arrived, that a real person will respond, and when. Do not fake a human. A fast honest robot beats a slow fake one, and it beats silence by a mile.",
      },
    ],
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

## Run your own numbers

Here is where this stops being an article and starts being your business.

{{TOOL}}

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
    tool: {
      slug: "platform-fee-calculator",
      heading: "See what the platform takes off your year",
      intro:
        "This is the audit from the last section, running. Put your real monthly numbers in and see the platform's cut for the year, the five-year total, and the piece repeat customers could bring direct.",
      steps: [
        {
          name: "Enter your monthly revenue through the platform",
          text: "One platform at a time. Run it once per channel if you sell on several. Use a normal month, not December.",
        },
        {
          name: "Put in their real cut",
          text: "Category fees, payment processing, and program fees together. Your seller statement has it. Do not use the headline rate from their pricing page.",
        },
        {
          name: "Add listing, ad, and subscription fees",
          text: "The fixed monthly costs you pay to be there at all: store subscriptions, promoted listings you run every month, listing fees.",
        },
        {
          name: "Estimate your repeat share honestly",
          text: "What portion of orders come from people who bought from you before? That is the share where the platform is charging you full freight to reach your own customers.",
        },
      ],
      readIt: [
        "The five-year total is the one to sit with. A fee that feels fine per order looks different as a truck-sized number.",
        "The cut on repeat customers is your leverage. New buyers are worth the fee. People who already know you are the ones a home base can serve direct, where the platform rules allow it.",
        "If the repeat number is small, your channel is doing exactly what a channel should. Keep it and revisit in a year.",
      ],
      formHeading: "Want the home base mapped around your channel?",
      formLead:
        "Send me your platform, your five-year number, and your repeat share. I will tell you what an owned home base should do first for your operation and what it costs, without touching the channel that works.",
      interest: "system_map",
      industry: "Marketplace and ecommerce sellers",
    },
    faq: [
      {
        q: "Should I stop selling on Amazon or eBay?",
        a: "No. A working channel with real demand is worth the fees when the math works. The move is not leaving. It is building an owned home base next to the channel so the customer relationships, the data, and the follow-up belong to your business.",
      },
      {
        q: "Can I contact my marketplace buyers directly?",
        a: "Only within each platform's rules, and the rules differ. What you can always do is build direct relationships on your own property: your site, your email list built with permission, your packaging, your brand. Read the current policy for your platform before you act, because violations can cost the account.",
      },
      {
        q: "What are typical marketplace fees?",
        a: "They vary by platform, category, and program, and they change. That is exactly why this article will not quote you a blended percentage. Pull your own seller statements. Your effective rate, including ads and subscriptions, is knowable in an evening and it is the only rate that matters.",
      },
      {
        q: "What should a seller's home base actually include?",
        a: "One operating view of products, orders, and fees across channels, a direct storefront or catalog, an owned customer list with consent, and follow-up that the business controls. Not a clone of the marketplace. The jobs the marketplace will never do for you.",
      },
    ],
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

{{TOOL}}
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
    tool: {
      slug: "website-grader",
      heading: "Grade the website you already have",
      intro:
        "Before you spend a dollar on a new website, find out what the current one is worth. Pull your site up on your phone, answer honestly, and get a grade in about two minutes.",
      steps: [
        {
          name: "Open your site on your phone, not your desktop",
          text: "Your customers are on phones. Judge the site the way they meet it, on cell data, in daylight.",
        },
        {
          name: "Check what is actually true",
          text: "Tappable phone number, loads fast, says what you do in the first sentence, real photos, short form. Check only what a stranger would agree with, not what you meant to build.",
        },
        {
          name: "Read the grade like a buyer would",
          text: "Every unchecked box is a customer question your site does not answer. The grade tells you whether you need a fix, a rebuild, or nothing at all.",
        },
      ],
      readIt: [
        "A low grade does not always mean spend money. Half these boxes, like a tappable number and an honest first sentence, are afternoon fixes on any platform.",
        "A high grade with no customers means your problem is not the website. Go check your follow-up and your phone before you pay for a redesign.",
        "If the site fails the phone test and the form test, that is when a rebuild pays, because those two boxes are where inquiries actually come from.",
      ],
      formHeading: "Want a straight answer on what your site needs?",
      formLead:
        "Send me your grade and your website address. I will tell you which shape of build fits, what it should cost, and just as plainly if the site you have is fine.",
      interest: "free_website_program",
      industry: "General small business",
    },
    faq: [
      {
        q: "How much should a five-page small business website cost?",
        a: "Templates you build yourself run tens of dollars a month plus your evenings. Freelancers and agencies commonly land between two and ten thousand dollars on rented platforms. An owned build has a fixed build cost and small infrastructure costs after. The LeadFlow Pro's buy-it-outright five-page build is $1,000, and approved businesses can apply for the same foundation at a $0 build fee.",
      },
      {
        q: "Why is there such a huge range in website quotes?",
        a: "Because the word website covers three different products: pages you rent, pages someone assembles for you on a rented platform, and a system you own. The quotes are not for the same thing. Ask who owns the accounts and what the monthly total is in year two, and the quotes sort themselves fast.",
      },
      {
        q: "Is a free website ever actually free?",
        a: "Ask what the catch is, always, including with us. Our version: the five-page build fee is genuinely $0 for approved businesses, you own the code and accounts, and growth services after that are optional and quoted before you approve them. Domains, and hosting after the included 90 days, are real costs and we say so up front.",
      },
      {
        q: "What ongoing costs does any website have?",
        a: "A domain renews yearly. Hosting is either bundled into a builder fee or paid directly on an owned stack, usually modestly. The costs that sneak up are the add-ons: email tools, booking apps, form upgrades, plugins. Whatever you build, total the monthly stack once a year on purpose.",
      },
    ],
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

## Before you buy anything, grade what you have

{{TOOL}}

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
    tool: {
      slug: "rent-receipt",
      heading: "Total your builder stack, right now",
      intro:
        "The builder fee never travels alone. Check off everything your business pays for each month and watch the real number assemble itself. Bring your card statement, not your memory.",
      steps: [
        {
          name: "Open your last card statement",
          text: "The advertised prices are wrong and your memory is generous. The statement has the real charges, including the annual ones you forgot.",
        },
        {
          name: "Check every box that charges you",
          text: "Builder plan, email tool, booking app, CRM seats, review widget, chat, forms, phone platform. If it hits the card monthly or yearly, it counts.",
        },
        {
          name: "Adjust the amounts to your real prices",
          text: "The tool starts with typical prices. Overwrite them with what you actually pay so the total is yours, not an estimate.",
        },
      ],
      readIt: [
        "The monthly total times twelve is your yearly rent. That is the number to hold up against what the stack actually produces.",
        "Circle the lines that hold your data: the customer list, the bookings, the reviews. Those fees are not for features. They are for custody.",
        "A modest total serving a business well is a fine trade. Keep it and stop feeling guilty. A big total with your leads scattered across five inboxes is the signal to consolidate.",
      ],
      formHeading: "Want to know what one owned system would replace?",
      formLead:
        "Send me your monthly total and the three tools you would miss most. I will map which lines an owned build replaces, which ones to keep, and what the crossover math looks like for your size.",
      interest: "system_map",
      industry: "General small business",
    },
    faq: [
      {
        q: "Is Wix or Squarespace bad for a small business?",
        a: "No. For a new, unproven business that needs to be live this week, a builder is the right tool. The trade goes bad later, when the stack of add-ons grows, the template ceiling arrives, and the business depends on tools it can never own or leave cleanly.",
      },
      {
        q: "Can I move my Wix or Squarespace site somewhere else later?",
        a: "Not as a working website. You can usually export content like text, images, and some data, but the site itself, its design and functionality, stays on the platform. A move is a rebuild. That is the single most important thing to know before you invest years in one.",
      },
      {
        q: "What is the real monthly cost of a builder site?",
        a: "The plan fee plus everything around it: email marketing, booking, forms, review tools, plugins, apps, extra seats. Businesses I map are often paying several times the advertised plan price across the stack without ever deciding to. Add yours up with real statement numbers before judging the trade.",
      },
      {
        q: "When should a business leave the builder?",
        a: "When the monthly stack is large and load-bearing, when leads arrive from calls, texts, forms, and DMs that the builder cannot hold together, or when you keep buying plugins to punch through the template ceiling. At that point ownership usually beats convenience, and the move should start with a map, not a purchase.",
      },
    ],
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

Add up your own list honestly. Not the advertised prices, the actual charges on the card. That number, times twelve, is what renting costs per year. You can do it right here.

{{TOOL}}

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
    tool: {
      slug: "lead-value-calculator",
      heading: "Work out what one lead is worth to you",
      intro:
        "Before you decide whether leads deserve a system, find out what one is worth. This is the number that makes the whole CRM question stop being abstract.",
      steps: [
        {
          name: "Enter how many leads become customers",
          text: "Out of ten inquiries, how many end up paying you? Use last month's real inquiries, not the good week you remember.",
        },
        {
          name: "Put in the average first job",
          text: "What a new customer spends the first time, on a normal job.",
        },
        {
          name: "Add repeat jobs and referrals",
          text: "A kept customer buys again and sends friends. This is where the real value hides, and it is exactly the value a dropped lead never produces.",
        },
        {
          name: "Enter what you pay per lead now",
          text: "Ad spend divided by leads, or zero if it is all referrals today. The tool shows you the ceiling of what a lead is worth against what you pay.",
        },
      ],
      readIt: [
        "Revenue per raw lead is the number to memorize. Every lead that dies in an unchecked inbox costs you that much, on average, every time.",
        "The lifetime value line explains why follow-up beats more ads. Keeping one customer is worth several first jobs.",
        "If a lead is worth real money, then the question is not whether you need a CRM. It is how many leads a month you can afford to keep dropping.",
      ],
      formHeading: "Not sure if your business is at the CRM point?",
      formLead:
        "Tell me your lead sources and who touches them, and send the number the tool gave you. I will tell you honestly whether you need a system yet or whether a spreadsheet is still fine.",
      interest: "system_map",
      industry: "General small business",
    },
    faq: [
      {
        q: "What does CRM stand for and what does it actually do?",
        a: "Customer relationship management. In practice it is one list of every lead and customer, what happened last with each one, and what happens next, assigned to a person with a date. Everything else a CRM vendor shows you is decoration on those three lists.",
      },
      {
        q: "When is a spreadsheet good enough?",
        a: "When one person handles a handful of inquiries a month from one or two sources. The system fits in one head at that size. It stops being enough when leads come from several places, more than one person touches them, or the honest answer to who was never called back is nobody knows.",
      },
      {
        q: "What should a small business CRM cost?",
        a: "Rented CRMs commonly price per seat per month, and the total grows as your team does. An owned CRM built on your own database costs more once and then runs on modest infrastructure. Which shape wins depends on your size and growth, which is exactly what a system map works out before anyone buys anything.",
      },
      {
        q: "Can I move my data out later if I pick the wrong one?",
        a: "Ask that question before you sign, because the honest answer varies wildly. Look for a real export of contacts, history, and notes in a usable format. If leaving means losing the conversation history, the price is not the monthly fee. It is the exit.",
      },
    ],
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

## First, find out what a dropped lead costs you

{{TOOL}}

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
    tool: {
      slug: "form-friction-calculator",
      heading: "Count what your form is costing you",
      intro:
        "Leak three has a calculator. Every field on your contact form filters out real customers, and this shows the yearly price of the fields you did not need.",
      steps: [
        {
          name: "Count the fields on your main form",
          text: "Open your own contact or quote form and count every box, dropdown, and required checkbox a customer has to get through.",
        },
        {
          name: "Estimate how many people reach the form",
          text: "Your analytics knows visitors to the contact or quote page. If you have no analytics, that is its own finding. Use your best monthly guess.",
        },
        {
          name: "Enter what a customer is worth and how often you close",
          text: "Average job value and your honest close rate on inquiries. The tool turns abandoned forms into dollars with those two numbers.",
        },
      ],
      readIt: [
        "The number is what extra fields cost per year at your traffic and your prices. Fields are not free. Each one buys you information and costs you leads.",
        "Compare the with-three-fields line to today. Name, phone or email, and what do you need. Almost every business can qualify from there in the follow-up conversation instead of the form.",
        "If your form is already short and the leak is still there, move to leak one and leak four: the next step and the phone.",
      ],
      formHeading: "Want the leak found for you?",
      formLead:
        "Send me your website address and the number the tool gave you. I will walk your site the way a stranger would and tell you which of the five leaks is eating your traffic. Straight answer, no call required.",
      interest: "free_website_program",
      industry: "General small business",
    },
    faq: [
      {
        q: "How many fields should a contact form have?",
        a: "As few as let you respond usefully. Name, one way to reach them, and what they need covers most service businesses. Every additional required field trades away inquiries for information you could have collected on the first call.",
      },
      {
        q: "How do I find out where visitors give up?",
        a: "Walk the path yourself on a phone: search, land, read, tap, submit, call. Time every step. Then check whether your analytics records form starts against form completions. The gap between those two numbers is your form leak, measured.",
      },
      {
        q: "Is more traffic ever the answer?",
        a: "Only after the path converts. Pouring more visitors into a leaking page rents you bigger numbers and the same silence. Fix the next step, the form, and the phone first. Then more traffic multiplies something that works.",
      },
      {
        q: "Do I need to redesign the whole site to fix this?",
        a: "Usually not. Shortening a form, making the phone number tappable, and putting one clear action on each page are small edits on any platform. A rebuild earns its cost when the site also needs to catch, record, and follow up on the leads, which is system work, not design work.",
      },
    ],
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

And while we are on forms: count your fields.

{{TOOL}}

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
    tool: {
      slug: "missed-call-calculator",
      heading: "Put a dollar figure on your missed calls",
      intro:
        "Open your phone log before you touch this. The tool only works if the inputs are real, and your call history already has the honest numbers in it.",
      steps: [
        {
          name: "Count the calls you missed last week",
          text: "Missed, declined, and sent to a voicemail nobody checks all count. Look at the actual log. Owners who guess always guess low.",
        },
        {
          name: "Estimate how many of those callers were buyers",
          text: "Not every missed call is a customer. Some are spam, some are vendors. Pick an honest share. Half is a common starting point for a service business.",
        },
        {
          name: "Enter what a first sale is worth",
          text: "The average ticket for a first job, not your biggest one.",
        },
        {
          name: "Add the repeat business",
          text: "A caught customer usually comes back. Put in how many more times a happy customer buys, because the missed call did not just lose one job.",
        },
      ],
      readIt: [
        "The yearly figure is what unanswered rings cost at your volume and your prices. It is your number, not an internet statistic.",
        "The recovered-by-text-back line matters most. That is the share a simple automatic text catches without you answering a single extra call.",
        "If the number is small, good: your phone is not your leak. Go check your quotes and your forms instead.",
      ],
      formHeading: "Want the phone leak fixed?",
      formLead:
        "Send me your number and how calls get answered today. I will tell you what a text-back setup looks like for your business and what it costs, straight, before any call.",
      interest: "lead_engine",
      industry: "Phone-first local business",
    },
    faq: [
      {
        q: "What is missed-call text-back?",
        a: "When a call goes unanswered, the caller automatically gets a text within seconds: sorry we missed you, we are with a customer, what do you need? It holds the person in the moment instead of letting them dial the next name on the list. Most people will answer a text.",
      },
      {
        q: "Do people really not leave voicemails anymore?",
        a: "Check your own voicemail count against your missed call count. For most businesses the gap is enormous. People treat an unanswered ring as a no and move on, especially when they found you in a search next to four competitors.",
      },
      {
        q: "Should the text pretend to be me?",
        a: "No. Honest beats clever. Say it is an automatic message, say a real person will call back, and ask what they need. Customers do not mind automation. They mind being lied to.",
      },
      {
        q: "Does this need a new phone number?",
        a: "It needs a business line that can do texting, which can usually keep or forward your existing number. The bigger win is that calls and texts land in one shared inbox with the customer's history, instead of living on one person's cell.",
      },
    ],
    body: `
Nobody calls a business to browse. People call when they are ready to act: the AC is out, the tooth hurts, the deadline is Friday, the water is coming through the ceiling. A caller is the most valuable visitor you will ever get, and they are the one you cannot ask to wait.

When the call goes unanswered, most people do not leave a voicemail. They hang up and dial the next result on the list. Your ad money found them, your reputation earned the call, and your competitor answered it.

## Run your own numbers

Skip the scary internet statistics. Use yours:

1. How many calls does the business get in a week? Your phone history knows.
2. How many ring out or hit voicemail? Be honest about job sites, evenings, and lunch.
3. What is an average customer worth to you, not just on the first job but over a year or two?

Multiply. Whatever that number is, that is the size of the hole, and you paid marketing money to dig it.

Or skip the napkin math and let the calculator do it right here.

{{TOOL}}

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
    tool: {
      slug: "seo-traffic-value",
      heading: "Price the search traffic your page cannot reach",
      intro:
        "A Facebook page does not show up when somebody Googles your service in your town. This puts a dollar figure on what that search visibility is worth, using your own numbers.",
      steps: [
        {
          name: "Estimate the searchers, or start with a guess",
          text: "If you have a website with analytics, use your organic visitors. If you are social-only, put in a modest number like a hundred a month and treat the result as a floor.",
        },
        {
          name: "Enter what a click would cost to buy",
          text: "What businesses like yours pay per click on Google ads locally. If you do not know, a few dollars is a fair starting point for most local services.",
        },
        {
          name: "Add your contact and close rates",
          text: "Out of a hundred visitors, how many reach out, and how many of those buy. Honest guesses beat no numbers.",
        },
        {
          name: "Enter your customer value",
          text: "The first job plus the repeat business a kept customer brings.",
        },
      ],
      readIt: [
        "The monthly figure is what showing up in search would be worth at those rates, or what it would cost to rent the same visibility with ads forever.",
        "Search traffic is high intent. These are people typing the problem into Google today, which is why it converts differently than a feed scroller.",
        "The number only gets collected by a real website. A Facebook page does not rank for your service in your town, and that is the entire point of this article.",
      ],
      formHeading: "Social-only and thinking about a home base?",
      formLead:
        "Tell me your business, your town, and where your orders come from today. I will tell you what a search-visible home base would do first for you, and whether the free five-page build fits.",
      interest: "free_website_program",
      industry: "Social-first local business",
    },
    faq: [
      {
        q: "Do I really need a website if my Facebook page brings in business?",
        a: "You need a second location for your business's existence, and a page cannot be it. Keep the page. It is a real channel. The website adds what the page cannot: showing up in Google searches, holding your customer list, and surviving an account lock or an algorithm change.",
      },
      {
        q: "Why does my Facebook page not show up on Google?",
        a: "Google can show a page in results, but it almost never ranks one for local service searches the way it ranks a real website with service pages, a location, and a Google Business Profile pointing at it. The people searching plumber near me are finding your competitors' websites, not anyone's Facebook page.",
      },
      {
        q: "What happens to my followers if my account gets locked?",
        a: "They stay on the platform, not with you. There is no way to take followers with you or contact them off-platform. That is why the home base plan always includes building an owned list, with permission, from the audience while you have their attention.",
      },
      {
        q: "What is the smallest useful website for a social-first business?",
        a: "A few pages that say what you do, where you do it, and how to buy or book, with every inquiry landing in one owned list. That is exactly the shape of the free five-page build, and for a social-only business it is the difference between renting your existence and owning it.",
      },
    ],
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

That Google search you are invisible to has a dollar value. Work it out.

{{TOOL}}

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
    tool: {
      slug: "customer-lifetime-value",
      heading: "Work out what a kept customer is worth",
      intro:
        "The case for an owned list is the value of the customers it keeps. Run your numbers and see what one relationship is actually worth over the years, because that is what the list protects.",
      steps: [
        {
          name: "Enter your average sale",
          text: "A normal ticket, not your best one.",
        },
        {
          name: "Put in purchases per year and years they stay",
          text: "How often a regular buys, and how long a good customer stays with you. Look at your five longest customers if you are not sure.",
        },
        {
          name: "Add your margin",
          text: "Roughly what you keep after the direct costs of delivering the work.",
        },
        {
          name: "Count the referrals",
          text: "How many new customers one happy customer sends over their lifetime. Even a fraction counts. This is the compounding the algorithm never shows you.",
        },
      ],
      readIt: [
        "Lifetime profit per customer is the number that reframes everything. A follower is a maybe. A customer on your list is worth this much, and reaching them costs you nothing per send.",
        "The afford-to-spend line tells you what acquiring one more customer is worth. Most owners are underspending on keeping and overspending on chasing.",
        "Multiply the lifetime number by two hundred real subscribers. Now compare that to ten thousand followers you cannot reach. That is the whole argument.",
      ],
      formHeading: "Have customers but no list?",
      formLead:
        "Tell me how customers reach you today and what your lifetime number came out to. I will map the shortest honest path to an owned list for your business: where it lives, how it fills, and what to send.",
      interest: "lead_engine",
      industry: "General small business",
    },
    faq: [
      {
        q: "Is email marketing still worth it?",
        a: "Owned reach is worth it, and email is its cheapest form. The list does not care about algorithm changes, account locks, or platform trends, and offers convert there because everyone on it raised a hand. The businesses saying email is dead are usually the ones sending nothing worth opening.",
      },
      {
        q: "How do I start an email list from zero?",
        a: "Invite every customer at the point of sale, put an honest unchecked checkbox on every form you already run, and offer something genuinely worth an address. Two hundred real locals who chose you beat ten thousand strangers. Slow is fine. Bought lists are spam with paperwork and they poison your sending reputation.",
      },
      {
        q: "How often should a small business email its list?",
        a: "As often as you have something a reasonable customer would be glad to get. For most local businesses that is monthly, plus seasonal reminders that match the trade and the occasional plain offer. The test is simple: would you be annoyed to receive it? Then do not send it.",
      },
      {
        q: "Where should the list live?",
        a: "In a database your business controls, synced to whatever sending tool you currently like. Tools change and per-contact pricing punishes growth. If the list itself is portable, you can switch senders on any Tuesday and the audience stays yours.",
      },
    ],
    body: `
Ten thousand followers sounds like an audience. It is closer to an audition. Every post you make is a request to an algorithm to please show your work to the people who already said yes to you. Some days it says fine. Most days it shows a sliver.

An email list is the opposite arrangement. You write, you send, it arrives. No bid, no feed, no middleman deciding your reach this week. That is the entire case, and it has not changed in twenty years of platforms rising and falling.

## What owned reach is worth

The difference shows up the day you need it:

- The platform changes its algorithm: your list does not care.
- Your account gets flagged or hacked: your list does not care.
- You need revenue this month, not impressions: the list is where offers actually convert, because everyone on it raised their hand.

Social finds strangers. Email keeps customers. A business needs both jobs done, and only one of them can be owned.

Before you build the list, price the thing it protects.

{{TOOL}}

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
    tool: {
      slug: "google-business-profile-scorecard",
      heading: "Score your Google Business Profile",
      intro:
        "For local search around here, this free listing often matters more than the website. Score yours in two minutes and see exactly which boxes your competitors have checked that you have not.",
      steps: [
        {
          name: "Search your own business by name",
          text: "Pull up your profile the way a customer sees it. If nothing comes up, your first box is unchecked: the profile is not claimed.",
        },
        {
          name: "Check what is actually done",
          text: "Claimed and verified, right categories, correct hours, real photos, services listed, reviews answered. Check only what a stranger would see is true today.",
        },
        {
          name: "Read the score against your busiest competitor",
          text: "Open their profile next to yours. The gaps you see are the checklist, in order.",
        },
      ],
      readIt: [
        "Every unchecked box is free visibility you are leaving to the shop across town. None of these boxes cost money. They cost an afternoon.",
        "Photos and answered reviews carry more weight with real customers than the polish of your logo. East Texas buys from people.",
        "A strong profile pointing at a weak website is a handshake with nothing behind it. The listing gets the click. The site has to catch it.",
      ],
      formHeading: "Want a local's eyes on the whole front door?",
      formLead:
        "Send me your business name and your score. I am up the road in Longview, and I will tell you what to fix on the listing, whether your website backs it up, and whether the free five-page build fits.",
      interest: "free_website_program",
      industry: "East Texas local business",
    },
    faq: [
      {
        q: "Is a Google Business Profile really free?",
        a: "Completely. Claiming, verifying, photos, posts, services, and review responses cost nothing. Companies that cold-call East Texas businesses selling Google registration are selling you paperwork you can do yourself in an afternoon.",
      },
      {
        q: "What matters more, the profile or the website?",
        a: "For getting found locally, the profile often wins. For getting chosen and getting the inquiry caught, the website does the work. Google also reads them together: a real site with your services and towns strengthens the listing. You want both pulling the same direction.",
      },
      {
        q: "How do I get more Google reviews without being weird about it?",
        a: "Ask at the moment the customer is happiest, usually right when the job wraps, with a direct link that takes one tap. Answer every review like a human, including the bad ones. Steady and honest beats a burst of favors from cousins.",
      },
      {
        q: "Who should own the website and domain when I pay someone to build it?",
        a: "You. The domain registered in your account, the site and hosting in accounts with your business's name, and a straight answer about what happens if you stop paying. Any vendor who flinches at those questions, local or not, just told you everything.",
      },
    ],
    body: `
I build business systems from Longview, and I talk to owners across East Texas: Longview, Tyler, Marshall, Kilgore, Gladewater, Hallsville, White Oak, and the towns between. The stories rhyme. Somebody paid for a website years ago. The guy who built it moved, or the agency keeps billing, or the login is lost, and nobody is sure what the site even does for the business anymore.

Before you pay anyone for a website, including me, here is what an East Texas business should actually know.

## Around here, Google is the front door

Most local customers do not browse. They search: plumber near me, dentist Longview, shop that does lift kits. Winning that moment takes three things working together:

- **A Google Business Profile that is claimed, complete, and active.** Photos, hours, services, and reviews. For local search this single free listing often matters more than the website itself.
- **A website that backs it up.** Google connects the profile to your site. A real site with your services, your service area, and your proof strengthens the whole listing.
- **Reviews with responses.** Steady honest reviews, answered like a human, beat a perfect logo every time.

If a web quote does not mention your Google Business Profile at all, that tells you something.

Score yours before you read another word.

{{TOOL}}

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
    tool: {
      slug: "rent-receipt",
      heading: "The Rent Receipt, live",
      intro:
        "This is the worksheet, working. Check off what your business pays for, correct the amounts to your real charges, and the receipt totals itself while you go.",
      steps: [
        {
          name: "Get the card statement open first",
          text: "Not your memory. The statement catches the tools you forgot you keep, the annual renewals, and the plan upgrade you approved eight months ago.",
        },
        {
          name: "Check every line that applies",
          text: "Builder, email marketing, booking, CRM seats, reviews, chat, forms, phone platform, listings services. Walk the whole list before you judge anything.",
        },
        {
          name: "Fix the amounts to match your charges",
          text: "The defaults are typical prices. Yours are the ones that matter. Overwrite them.",
        },
        {
          name: "Look at the yearly total, not the monthly one",
          text: "Monthly numbers are engineered to feel small. The yearly total is the honest one, and it is the one to compare against owning.",
        },
      ],
      readIt: [
        "This total is rent, not waste. Some of it is a fair trade. The receipt exists so the trade is a decision instead of a drift.",
        "Mark which tools hold data you could not walk away with. Those lines cost more than their price.",
        "Compare the yearly total against a one-time owned build. When rent passes the build cost every couple of years, ownership stops being the expensive option.",
      ],
      formHeading: "Sat back in your chair at the total?",
      formLead:
        "Send me the number and the list. I will tell you which lines an owned system replaces, which ones are worth keeping, and what the first move costs. No call needed for the answer.",
      interest: "system_map",
      industry: "General small business",
    },
    faq: [
      {
        q: "How much does the average small business spend on software subscriptions?",
        a: "Published surveys vary too much to trust, and your number is the only one that matters. Businesses I map are frequently surprised to find hundreds a month across their stack, assembled one reasonable-sounding tool at a time. An hour with a bank statement gets you the real figure.",
      },
      {
        q: "Which subscriptions should a business cut first?",
        a: "Start with duplicates doing the same job, then tools you kept for one feature, then anything a system you own already handles. Do not start with the tool that holds hostage data. Export and migrate that data first, then cancel.",
      },
      {
        q: "Does owning software really cost less than renting it?",
        a: "Not always, and anyone who says always is selling something. Owning costs more up front and less per month, with costs that stay flat as you grow. Renting is cheap to start and grows with your contact list and your team. The receipt plus a build quote is the whole comparison, and for some businesses renting honestly wins.",
      },
      {
        q: "What does owned actually mean here?",
        a: "The code, database, domain, and accounts carry your business's name and you can leave any vendor, including us, without losing them. If cancelling a tool means losing the customer list or the site, you were renting, whatever the contract called it.",
      },
    ],
    body: `
Nobody decides to spend serious money renting software. It accumulates. Each tool arrived on the day it solved a problem, each one costs less than lunch, and none of them ever leaves. The only way to see the real number is to add it up on purpose.

## The worksheet

Open your card statement and walk the categories with the live worksheet below. Write real numbers, not advertised prices. For a lot of established small businesses the yearly total lands somewhere between a used truck and a decent salary, and it buys the business nothing it owns.

{{TOOL}}

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
    tool: {
      slug: "hire-vs-automate",
      heading: "Hire a person or build the system?",
      intro:
        "This is the question AI actually changed the math on. Compare the three-year cost of the next hire against a system that does part of the same work, with your numbers.",
      steps: [
        {
          name: "Enter the loaded cost of the hire",
          text: "Wages plus taxes, insurance, and everything else. A loaded cost usually runs well above the wage itself. Include a yearly raise, because there will be one.",
        },
        {
          name: "Put in what the system costs",
          text: "A one-time build cost plus its monthly running cost. If you have a quote, use it. If not, use the build shapes on the pricing page as honest placeholders.",
        },
        {
          name: "Be honest about the overlap",
          text: "What share of the role's work can a system genuinely do: the answering, sorting, reminding, and drafting. Not the judgment, the craft, or the customer relationships. Guess low on purpose.",
        },
      ],
      readIt: [
        "The three-year lines are the comparison that matters. Year one flatters the hire because the build cost lands up front. The gap opens after.",
        "If the overlap share is small, hire the person. A system does not carry a toolbox or calm down an angry customer. This tool exists to stop the wrong automation, too.",
        "The best answer is often both: the system takes the repetitive slice so the person you do hire spends their hours on work that needs a human.",
      ],
      formHeading: "Weighing a hire against a build?",
      formLead:
        "Tell me the role you are trying to fill and what the tool showed you. I will tell you which slice of it a system can honestly take, what that build costs, and where you still need the human.",
      interest: "system_map",
      industry: "General small business",
    },
    faq: [
      {
        q: "Can AI really build a whole business website?",
        a: "AI collapses the labor. A builder who knows what they are doing directs it, checks it, and wires it into a real system: site, database, follow-up, in accounts the business owns. What changed is the speed and therefore the price. What did not change is that somebody has to know what good looks like.",
      },
      {
        q: "What should AI handle in a small business, day to day?",
        a: "The boring slice: drafting follow-ups and quotes for a human to send, sorting and tagging inbound leads, and instant honest first replies that say when a real person will respond. Rule of thumb: AI drafts, humans send. Especially in a town where customers know your name.",
      },
      {
        q: "Will AI replace my staff?",
        a: "In a small business, the honest pattern is different: the system absorbs the repetitive work nobody was ever going to be hired for, or frees your existing people from it. The judgment calls, the craft, and the relationships stay human, because those are the business.",
      },
      {
        q: "How do I avoid paying old prices for AI-speed work?",
        a: "Ask what you own when the project ends and how long the build actually takes. A five-figure quote and a three-month timeline for a template reskin deserves hard questions in 2026. So does any AI feature sold as one more monthly fee on a platform you can never leave.",
      },
    ],
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

So run the honest version of the question instead.

{{TOOL}}

There is a bigger version of this question worth forty-two seconds of your time: [data centers are coming to Texas, and here is what I am going to do about it](/articles/data-centers-are-coming-to-texas).

## What this means for what you pay

Two things to watch as an owner. First, be suspicious of old prices for work AI made cheap: a five-figure quote for a template reskin deserves hard questions in 2026. Second, be suspicious of AI as a reason to rent more: an AI feature bolted onto a subscription you do not own is still rent. The leverage goes to owners: custom, owned, connected systems at prices that used to buy a template.

If you want to see what that looks like for your specific business, map your system. The diagnosis is free, the recommendation is specific, and nobody asks for your contact information before you see it.
`,
  },
];

// Trade-specific tool articles live in their own module so this file stays about
// the originals. They are the same Article shape and behave identically.
ARTICLES.push(...TRADE_ARTICLES, ...TRADE_ARTICLES_2, ...TRADE_ARTICLES_3, ...SEPTEMBER_LAUNCH_ARTICLES);

// Keep ARTICLES as the complete authored catalog for build tools and duplicate
// checks. Public callers use these functions so future dates remain hidden.
export function getPublishedArticles(now = new Date()): Article[] {
  return publishedArticles(ARTICLES, now);
}

export function getArticle(slug: string, now = new Date()): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug && isArticlePublished(article, now));
}

export function getRelatedArticles(slug: string, limit = 3, now = new Date()): Article[] {
  return getPublishedArticles(now)
    .filter((article) => article.slug !== slug)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, Math.max(0, Math.floor(limit)));
}
