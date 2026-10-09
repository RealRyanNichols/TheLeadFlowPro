import type { Article } from "./articles";

// October 2026 field notes.
//
// Each of these started as something a client asked us, a number from our own
// lead records, or a change a platform made this fall that costs owners money.
// Every outside figure names its source. Every figure of ours is counted across
// the businesses we run systems for, in total, never by name. Worked examples
// say Illustrative. Nothing here promises a result.

export const OCTOBER_2026_ARTICLES: Article[] = [
  {
    slug: "google-local-services-ads-missed-call-charges",
    title: "Google Local Services Ads now bills you for missed calls. Here is the fix.",
    description:
      "Since October 1, 2026, a Local Services Ads call you do not answer can be charged as a lead. What changed, what it costs, and the phone setup that stops it.",
    publishedAt: "2026-10-09",
    readingMinutes: 9,
    ogImage: "/images/articles-v5/google-local-services-ads-missed-call-charges.jpg",
    tags: ["missed calls", "google local services ads", "speed to lead", "phone", "home services"],
    tool: {
      slug: "missed-call-calculator",
      heading: "Put a dollar figure on the calls you are not picking up",
      intro:
        "Before you decide whether to answer every ring, hire help, or set up a text-back, find out what a missed call costs you now. Use last month, your real close rate, and the ticket you actually invoice. The calculator does not know your market, so it will not tell you whether a call was a customer or a robocall. It will tell you what the pattern costs if the usual share of them were.",
      steps: [
        {
          name: "Count the calls you missed last month",
          text: "Pull the missed-call list from your phone or your call app. Count only calls during the hours you advertise as open. If you cannot tell a customer from a spam call, count the ones that left a voicemail or called back, and note the rest as unknown.",
        },
        {
          name: "Enter the share of callers that become jobs",
          text: "Close rate is the share of real inquiries that turn into paid work. Use the number from your last fifty calls, not the one you tell your friends. If you do not track it, start a tally this week and use 30 percent as a placeholder you replace next month.",
        },
        {
          name: "Use the ticket you actually invoice",
          text: "Average job value is the median invoice for a first visit, not your biggest job. For a service call with a repair, use the repair. For an estimate visit that becomes a project, use the project.",
        },
        {
          name: "Add repeat business only if you measure it",
          text: "Repeat jobs per customer counts how many more times a first-time customer calls you back in a year. If you do not know, enter zero. The number you get is then a floor, which is the honest way to argue for a change.",
        },
      ],
      readIt: [
        "Money missed per month is the number to compare against the cost of answering: a person, a shared answering line, or a text-back that keeps the caller from dialing the next company.",
        "If Local Services Ads is charging you for a missed call and the caller still books with the next company on the list, you paid twice. The calculator shows the second payment. Your Ads invoice shows the first.",
        "A small number here is fine. It means the phone is covered and the new Google rule costs you little. Keep the tally going so you notice when that changes.",
      ],
      formHeading: "Want your phone set up so a missed call still becomes a conversation?",
      formLead:
        "Tell us how your calls are answered today, roughly how many you miss in a week, and which hours you advertise. We will tell you the setup we would use, what it costs, and where Local Services Ads fits or does not. Totals and your process, no customer details.",
      interest: "system_map",
      industry: "Home services",
    },
    charts: [
      {
        id: "when-people-reach-out",
        title: "When customers actually reach a local business",
        subtitle: "Share of inbound calls, texts and website forms by time of day, Central time.",
        kind: "columns",
        unit: "percent",
        bars: [
          { label: "Before 8 AM", value: 2, tone: "muted" },
          { label: "8 AM to noon", value: 36, tone: "blue" },
          { label: "Noon to 5 PM", value: 43, tone: "blue" },
          { label: "5 PM to 8 PM", value: 14, tone: "gold" },
          { label: "After 8 PM", value: 6, tone: "muted" },
        ],
        source:
          "our own lead records, about 1,500 inbound calls, texts and forms across the businesses we run systems for, July to October 2026, counted in total.",
      },
      {
        id: "paid-twice",
        title: "What one missed call can cost when Google charges for it",
        subtitle: "A worked example for an HVAC company. Practice numbers, not anyone's account.",
        kind: "bars",
        unit: "money",
        bars: [
          { label: "The Local Services Ads lead charge", value: 45, tone: "red", note: "Charged whether or not you picked up, if the caller held past 20 seconds during business hours." },
          { label: "The job that booked with the next company", value: 285, tone: "red", note: "A $950 repair at a 30 percent close rate is $285 of expected revenue walking out the door." },
          { label: "A text-back that keeps the conversation", value: 0, tone: "green", note: "Costs the same whether you miss zero calls or fifty, which is the point." },
        ],
        max: 300,
        source: "worked example in this article, built on a $45 lead charge, a $950 average repair and a 30 percent close rate. Your numbers go in the calculator.",
        illustrative: true,
      },
    ],
    sources: [
      {
        label: "PPC Land: Google LSA advertisers face missed call charges from October 1",
        url: "https://ppc.land/google-lsa-advertisers-face-missed-call-charges-from-october-1/",
        date: "September 25, 2026",
      },
      {
        label: "Lead Response Management Study, James Oldroyd (the five minute callback study)",
        url: "https://www.leadresponsemanagement.org/lrm_study",
        date: "2007, still the most cited figure on callback speed",
      },
    ],
    faq: [
      {
        q: "Does Google charge for missed calls after hours?",
        a: "Google's notice, as reported by PPC Land, says missed calls during business hours will be charged as valid leads when the caller stays on the line more than 20 seconds. Calls outside the hours you set are not covered by that sentence. That makes your listed hours a billing setting, not a courtesy. Set them to the hours a human or a system can actually respond.",
      },
      {
        q: "Does a call that goes to voicemail count as a missed call?",
        a: "The notice does not say how voicemail is treated, and it does not say whether the 20 seconds start at the first ring or when the call connects. Until Google clears that up, assume a caller who rings through to voicemail and stays past 20 seconds can be billed. Answer in person or forward to a line that answers.",
      },
      {
        q: "Can I dispute a charge for a call I never spoke on?",
        a: "The notice did not address disputes. Keep your own call log with timestamps so you have a record if Google opens a path later. The better move is to stop producing missed calls in the first place, because a dispute you win still cost you the customer.",
      },
      {
        q: "Should I just turn Local Services Ads off?",
        a: "Not because of this rule alone. If LSA sends you jobs you could not get otherwise and your phone is covered, the math still works. Run the calculator on last month. If missed calls are a large share of your calls, fix the phone first and keep the ads on. If you are missing most of them, pause the ads until the phone is handled, because every missed call is now a charge plus a lost job.",
      },
    ],
    body: `On October 1, 2026, a rule changed for every business running Google Local Services Ads. A call you do not answer during your business hours can now be billed as a lead, as long as the caller stays on the line past 20 seconds.

Read that again. You can pay Google for a customer you never spoke to.

I run phones and lead systems for service businesses in East Texas. Missed calls were already the most expensive leak in most of them. This rule turns the leak into an invoice, so it is worth twenty minutes to understand exactly what changed and what to do about it this week.

## What changed, in plain English

PPC Land reported the notice on September 25. It went to Local Services Ads advertisers by email on August 24 under the title "Upcoming changes to lead charge policy," and it took effect October 1. The parts that matter:

- **Missed calls during business hours are charged as valid leads** if the caller holds for more than 20 seconds.
- **If your phone tree makes callers press a key,** the 20 seconds start after the key press. Someone who hangs up at the menu is not charged.
- **Follow-up calls** between you and the same person inside 15 days are covered by the one charge, according to Google's Ads Liaison account.
- **Google did not say** whether the clock starts at the first ring or when the call connects, how voicemail is treated, or how to dispute one. It promised new protections against spam and robocalls without a timeline.

So the rule is narrow in one way and wide in another. It only applies during the hours you tell Google you are open. But inside those hours, every ring you let go past 20 seconds is money.

## Why this hits small shops hardest

A ten-truck company has a dispatcher. A two-truck company has a phone in a pocket under a house.

That second company is exactly who Local Services Ads was built for, and it is who this rule punishes most. The owner is on a ladder, the call rings six times, it goes to voicemail, the caller holds through the greeting, and the meter runs.

Here is the part most owners miss. The caller does not wait. In the lead response research everybody quotes, the odds of reaching a web lead fall off a cliff after five minutes. Phone callers are faster than that. They dial the next company on the list while your voicemail is still talking.

{{CHART:when-people-reach-out}}

That chart is from our own records: about 1,500 calls, texts and website forms that reached the businesses we run systems for over roughly ninety days. Most of it lands in two windows, late morning and early afternoon, which is exactly when a one-person shop is working. Only about one in five comes in after 5 PM, so if you are paying for an answering service that only covers evenings, you bought coverage for the quiet part of the day.

## The two bills on one missed call

Say you run HVAC. A lead charge in your market is $45. Your average first-visit repair is $950 and you close about three out of ten real inquiries. Those are practice numbers, so run yours in the calculator below, but the shape holds.

A missed call during business hours now costs you the $45 charge. It also costs you the expected value of that caller, which is $950 times 30 percent, or $285. One ring you did not pick up is $330 gone, and the customer is now on the phone with someone else.

{{CHART:paid-twice}}

The green bar is the fix, and it is the whole argument of this article. A system that catches the call costs the same whether you miss five calls a month or fifty. The charge and the lost job scale with every miss.

## What to do this week

**1. Set your hours to the hours you can answer.** Google only charges inside the hours you list. If nobody can pick up before 8 AM, do not list 7 AM. If Saturday is a truck day with no phone coverage, decide now whether Saturday calls are worth a person or a system, and set the hours to match.

**2. Forward the ring, do not let it ring out.** Your business line should ring you, then ring a second person, then land somewhere a human or a system answers, in that order, inside 20 seconds. Most phone apps do this with simultaneous or sequential ring. If your line still rings one phone until voicemail, change that today.

**3. Text every missed call back inside a minute.** Not a canned "we missed you." A message that says who you are, that you saw the call, and what happens next, with a way to book or reply. We wrote the script and how to use it in [how to write a missed call reply that tells people what happens next](/articles/how-to-write-a-missed-call-reply-that-tells-people-what-happens-next). Google still bills the call. The text is what keeps the customer.

**4. Keep your own call log.** Timestamps, duration, and what the call was. Google has not published a dispute process. When it does, the businesses with records will be the ones that get refunds.

**5. Check your call volume against your coverage.** Pull your missed-call list from last month and count the ones in business hours. If it is a handful, your phone is covered and this rule costs you little. If it is dozens, you now have a monthly invoice for the problem.

{{TOOL}}

## What this does not fix

A text-back does not make a robocall into a customer, and Google has not said how it will keep spam calls from being charged. Watch your Local Services Ads lead list for the first few weeks of October and flag anything that was not a person. Keep the record even if there is nowhere to send it yet.

It also does not fix a phone tree that confuses people. If callers have to press a key, the clock starts after the key press, which sounds like protection until you notice that confused callers hang up at the menu and you lose them anyway. Keep the menu to one question or none.

## The bottom line

Local Services Ads will now charge you for a call you did not take. The customer on that call was already leaving. The fix is not to argue with Google. It is to make sure every call during your listed hours reaches a person or a text inside 20 seconds, and to set those hours honestly.

If you want the phone part handled, the form above is how you ask. If you want to see what the missed calls cost first, the calculator is right there, and it is free.`,
  },
  {
    slug: "is-google-really-calling-my-business",
    title: "Is Google really calling your business? How to tell the AI from the scam",
    description:
      "Google's AI now calls home service businesses to ask prices. So do scammers claiming your listing is broken. How to tell them apart, what to say, and what to fix first.",
    publishedAt: "2026-10-09",
    readingMinutes: 8,
    ogImage: "/images/articles-v5/is-google-really-calling-my-business.jpg",
    tags: ["google business profile", "ai search", "phone", "spam calls", "local seo"],
    tool: {
      slug: "google-business-profile-scorecard",
      heading: "Check the listing the AI is going to read out loud",
      intro:
        "When Google's agent calls to ask your price and availability, or answers a customer's question about you, it starts from your Business Profile and your website. The scorecard walks the parts that matter, one check at a time. It cannot see your profile, so answer honestly and it will tell you where the gaps are.",
      steps: [
        {
          name: "Open your Business Profile next to the scorecard",
          text: "Sign in to the Google account that owns your listing. If you do not know which account that is, that is the first finding. A listing nobody can sign in to is a listing a scammer can offer to 'fix' for you.",
        },
        {
          name: "Check every box only if it is true today",
          text: "Hours, phone number, service area, services with descriptions, photos from this year, a reply on recent reviews. If you are not sure, leave the box unchecked. The score is for you, not for anyone else.",
        },
        {
          name: "Read the misses as a to-do list",
          text: "The unchecked items are what an AI assistant will get wrong or skip when it describes you. Fix the phone number and hours first. Those are what the agent reads back to a customer who asked.",
        },
      ],
      readIt: [
        "A high score does not rank you. It means a machine that reads your listing gets the right answers: the right number, the right hours, the right services.",
        "Any miss on phone, hours, or services is a reason a scam caller sounds believable. If your own listing is complete, 'your listing has a problem' has no hook.",
        "Photos and review replies are the parts Google reads as a living business. A profile with nothing new in a year reads as closed.",
      ],
      formHeading: "Want the listing, the website, and the phone to tell the same story?",
      formLead:
        "Tell us your business name and city, how your phone is answered, and what the last call from 'Google' sounded like. We will check the listing against the site, tell you what the AI will read, and quote what it takes to fix it. No login needed and we never ask for one.",
      interest: "system_map",
      industry: "General small business",
    },
    charts: [
      {
        id: "weekdays",
        title: "Which days customers reach a local business",
        subtitle: "Share of inbound calls, texts and website forms by weekday.",
        kind: "columns",
        unit: "percent",
        bars: [
          { label: "Sun", value: 3, tone: "muted" },
          { label: "Mon", value: 19, tone: "blue" },
          { label: "Tue", value: 21, tone: "blue" },
          { label: "Wed", value: 23, tone: "blue" },
          { label: "Thu", value: 14, tone: "blue" },
          { label: "Fri", value: 16, tone: "blue" },
          { label: "Sat", value: 5, tone: "muted" },
        ],
        source:
          "our own lead records, about 1,500 inbound calls, texts and forms across the businesses we run systems for, July to October 2026, counted in total. Spam calls are not in this count, which is the point of the article.",
      },
    ],
    sources: [
      {
        label: "JobNimbus: Google's AI is calling home service businesses (I/O announcement, May 20, 2026)",
        url: "https://www.jobnimbus.com/blog/google-ai-calling-home-services",
        date: "May 27, 2026",
      },
      {
        label: "Google: Business Agent for leads",
        url: "https://business.google.com/us/accelerate/announcements/business-agent-for-leads/",
        date: "updated August 26, 2026",
      },
      {
        label: "Google Business Profile Help: About automated calls and texts from Google to your business",
        url: "https://support.google.com/business/answer/7690269",
        date: "read October 9, 2026",
      },
      {
        label: "SOCi 2026 Local Discovery Index, as summarized by SEOteric",
        url: "https://www.seoteric.com/ai-usage-surges-6x-for-local-search-what-socis-2026-local-discovery-index-means-for-local-businesses/",
        date: "October 5, 2026",
      },
    ],
    faq: [
      {
        q: "How do I know if a call is really from Google?",
        a: "Google's help page lists the only reasons its automated system calls a business: to book an appointment for a customer, check a wait time, confirm prices and availability, check in-demand inventory, or confirm your hours. The calls are recorded, and you can end them for good by saying 'Please stop calling my business' or by turning them off under Business Profile settings. A caller who says customers cannot find you, that your listing will be removed, or that you need to register or pay to stay listed is asking for something that is not on Google's list. Hang up, then sign in to your Business Profile yourself.",
      },
      {
        q: "Should I answer Google's AI call or let it go to voicemail?",
        a: "Answer it, or make sure the person or system that answers your line can. The call is a customer asking a question through Google. If your answer is clear, Google can pass it on. If nobody answers, Google works from whatever your listing and website say, and if that is thin or old, the customer gets a thin or old answer.",
      },
      {
        q: "Why does my business line get so many spam calls?",
        a: "Because your number is public, on your listing, your site, and every directory that scraped them. Directory sales teams, 'Google listing' robocalls, and lead resellers all dial the same list. Do not take your number down. Do route the line through a phone app that labels and blocks known spam, keep your real listing complete so the pitch has no hook, and never give a caller a login or a card number to 'fix' a listing.",
      },
      {
        q: "Can a scam caller actually change my Google listing?",
        a: "Only if you give them access, or if nobody owns the listing and they claim it. Sign in and confirm the listing belongs to an account you control, with your own email and phone as recovery. Add a second owner you trust. Then the worst a caller can do is waste your time.",
      },
    ],
    body: `One of our business lines got close to sixty calls in a single day last week. Most of them were not customers. They were a voice directory selling "assistant registration," a robocall telling us customers could not find us on Google, and a rep who said the calls would stop once we signed up.

In the same month, Google announced its AI will call home repair businesses across the country to ask about prices and availability on behalf of people searching.

So the phone now rings with two kinds of robot. One is a customer in disguise. The other is a salesman in disguise. If you run a service business you are going to have to tell them apart in the first five seconds, and your answer to the real one is going to be read back to a customer.

## What Google is actually doing

At Google I/O on May 20, 2026, Google said the AI calling feature it had been testing, where Google phones a business to check price and availability for a searcher, would expand to home repair nationwide this summer. JobNimbus covered what that means for contractors a week later.

Separately, Google now offers a Business Agent for leads: an AI that answers a customer's questions about your business inside Search, grounded in your website. Google's own page, updated August 26, 2026, says it works from the content you publish. If your site says you charge $89 for a service call and work Monday through Friday, that is what the agent tells people. If your site says nothing, the agent has nothing.

Two things follow from that. First, your website and your Business Profile are now a script a machine reads to customers. Second, a call that starts "this is an automated call from Google" is worth answering well, because a human on the other end of Google is waiting for the answer.

## What the scammers are doing

The scam calls have been around for years and they have gotten better at sounding like the real thing. The three I hear most:

- **"Customers are having trouble finding you on Google."** A robocall. Press a key and a person tries to sell you listing management or "verification." Google does not do this.
- **"Your Google listing is about to be removed."** Pressure plus a deadline. Google does not call to threaten removal.
- **"We can get your business listed with the voice assistants."** A directory selling placement in a database that may or may not feed anything. The one that called us said the calls would stop when we signed up. That is not a service. That is a toll.

None of these need your Google login, your card, or a callback. All of them will ask for at least one of those.

## Five seconds: real or not

**Real Google** calls for a short list of reasons, and Google publishes the list: booking an appointment for a customer, checking a wait time, confirming prices and availability, checking inventory, or confirming your hours. The call asks a plain question (do you do water heater replacement, what is the price range, are you available this week) and ends. Google says the calls are recorded, that it avoids early mornings and late nights, and that you can stop them by saying "Please stop calling my business" or by turning them off in your Business Profile settings. Nothing on that list involves verifying anything, paying anything, pressing a key to keep anything, or calling a number back.

**Not Google** uses urgency, mentions removal or suspension, asks you to press a key to speak to a specialist, asks for a login or a card, or offers to make the calls stop for a fee.

When in doubt, hang up and sign in to your Business Profile yourself. If something is wrong, you will see it there. If nothing is wrong, you just saved yourself a sales call.

## What to say when it is really Google

The AI is asking because a customer asked. Answer the way you would answer the customer.

- **Price:** give a range and what it depends on. "Service call is $89, repairs usually run $250 to $900 depending on the part." A range beats "it depends," which the machine cannot pass along.
- **Availability:** give a real window. "Tomorrow afternoon or Thursday morning."
- **Scope:** say what you do and do not do. "We service residential units. We do not do commercial rooftop work."

Then put the same answers on your website and your listing, because the next customer's question gets answered from there without a call. That is the quiet part of this change. The businesses that publish prices and scope in plain words get recommended. The ones that make people call to find out get skipped.

## Why your listing is the real defense

Every scam pitch works on the same hook: something is wrong with your listing. The defense is a listing with nothing wrong with it, owned by an account you control.

{{CHART:weekdays}}

That chart is when real customers reach the businesses we run systems for. Spam calls do not follow that pattern. They come all day, every day. If your phone is lighting up on a Sunday afternoon with "Google," it is not Google, and if it is lighting up on a Wednesday at 10 AM, answer it, because that is when your customers call too.

Run the scorecard below against your actual profile. Then fix the misses in this order: phone number, hours, services with a sentence each, this year's photos, replies on recent reviews, and a second owner on the account.

{{TOOL}}

## The bigger picture

SOCi's 2026 Local Discovery Index, summarized by SEOteric this month, reports that two thirds of people who used AI for local search say they got wrong information about a business at least once. That is not the AI making things up out of nothing. It is the AI reading an old website, an unclaimed listing, or a Facebook page that says "call for pricing."

The machine is going to describe your business whether you help it or not. Help it. And when the phone rings and a voice says it is Google, you will know in five seconds whether to answer like it is a customer, because it is, or hang up, because it is not.`,
  },
  {
    slug: "how-to-get-chatgpt-to-recommend-your-local-business",
    title: "How to get ChatGPT to recommend your local business",
    description:
      "Nearly half of consumers now ask AI for local recommendations. Where ChatGPT gets its local answers, what we publish for clients so the machine gets them right, and what to skip.",
    publishedAt: "2026-10-09",
    readingMinutes: 10,
    ogImage: "/images/articles-v5/how-to-get-chatgpt-to-recommend-your-local-business.jpg",
    tags: ["ai search", "chatgpt", "google business profile", "local seo", "website"],
    tool: {
      slug: "faq-schema-generator",
      heading: "Turn the questions customers ask you into answers a machine can quote",
      intro:
        "AI assistants recommend businesses they can describe. The fastest way to become describable is to publish the five questions every customer asks you, with plain answers, and mark them up so a machine knows they are questions and answers. This tool writes that markup. You paste it on the page. It does not make a page rank, and it cannot invent answers you have not written.",
      steps: [
        {
          name: "Write the five questions customers ask before they buy",
          text: "Price, area, timing, what is included, and how to book. Use the words they use on the phone, not your trade's words. 'How much does a service call cost' beats 'diagnostic fee structure'.",
        },
        {
          name: "Answer each one in two to four plain sentences",
          text: "Give a number or a range when there is one. Give a day count when there is one. If the honest answer is 'it depends', say what it depends on in one sentence and give the typical case.",
        },
        {
          name: "Generate the markup and paste it on the page that shows those answers",
          text: "The markup has to match text that is visible on the page. Put the questions and answers on the page for people first, then add the code. Markup for answers that are not on the page is the kind of thing search engines penalize.",
        },
      ],
      readIt: [
        "The output is a block of code, not a ranking. It helps a machine read what you already published. The writing is the work.",
        "If you could not answer a question with a number, a range, or a day count, that is the question customers call about, and the question the AI will answer badly for you until you fix it.",
        "Put the same answers on your Google Business Profile in the Q&A and services sections. The assistant reads both.",
      ],
      formHeading: "Want us to find out what the AI says about your business today?",
      formLead:
        "Tell us your business name and town. We will run the questions a customer would ask about your trade in ChatGPT and Google, show you what came back and where it came from, and tell you what to publish first. Real test, your name, no guesswork.",
      interest: "system_map",
      industry: "General small business",
    },
    charts: [
      {
        id: "ai-use",
        title: "How many people ask AI for a local recommendation",
        subtitle: "Share of US consumers surveyed, Local Consumer Review Survey 2026 (1,002 adults).",
        kind: "bars",
        unit: "percent",
        bars: [
          { label: "Used an AI tool for local business recommendations in the last year", value: 45, tone: "blue", note: "Up from 6 percent the year before." },
          { label: "Used ChatGPT specifically", value: 31, tone: "blue", note: "The most used tool in the survey." },
          { label: "AI users who double-check recommendations against real reviews at least sometimes", value: 97, tone: "green", note: "Reviews still close the loop." },
        ],
        max: 100,
        source: "BrightLocal, Local Consumer Review Survey 2026, published March 10, 2026.",
      },
      {
        id: "pin-sources",
        title: "Where ChatGPT's local map pins came from",
        subtitle: "Share of hotel map entities by data provider, last tracked week of March 2026. Hotels, not every trade.",
        kind: "bars",
        unit: "percent",
        bars: [
          { label: "Google Places", value: 70.3, tone: "blue", note: "In December 2025 it was all of them." },
          { label: "Yelp", value: 22.4, tone: "gold" },
          { label: "Foursquare, Tripadvisor and others", value: 7.3, tone: "muted" },
        ],
        max: 100,
        source: "Nicolas Sitter's tracking of about 25,600 ChatGPT hotel searches, December 2025 to March 2026, as reported by SocialPlaces on August 19, 2026. The article notes it is unclear whether services follow the same pattern.",
      },
    ],
    sources: [
      {
        label: "BrightLocal: Local Consumer Review Survey 2026, AI and trust",
        url: "https://www.brightlocal.com/research/lcrs-ai-trust/",
        date: "March 10, 2026",
      },
      {
        label: "SocialPlaces: ChatGPT Maps tab, where the pins come from",
        url: "https://socialplaces.io/blog/chatgpt-maps-tab-where-the-pins-come-from/",
        date: "August 19, 2026",
      },
      {
        label: "SOCi 2026 Local Discovery Index, as summarized by SEOteric",
        url: "https://www.seoteric.com/ai-usage-surges-6x-for-local-search-what-socis-2026-local-discovery-index-means-for-local-businesses/",
        date: "October 5, 2026",
      },
      {
        label: "Google: Business Agent for leads",
        url: "https://business.google.com/us/accelerate/announcements/business-agent-for-leads/",
        date: "updated August 26, 2026",
      },
    ],
    faq: [
      {
        q: "Can I pay to be recommended by ChatGPT?",
        a: "Not for the organic recommendation. OpenAI has started selling ads inside ChatGPT, and those are labeled as ads. The recommendation itself comes from what the model can find about you: your Google Business Profile, your reviews on Google and Yelp, and the plain text on your website. Nobody can sell you a shortcut into that, and anyone who says they can is selling the same listing-management pitch with a new name.",
      },
      {
        q: "Does ChatGPT read my Google reviews?",
        a: "In the tracking SocialPlaces reported, Google Places supplied most of ChatGPT's local pins, and Yelp supplied most of the rest. Both carry reviews. Treat your reviews as part of your public description: recent, specific, and replied to. A review that says 'fixed our AC the same day, $340 all in' is a sentence a machine can repeat.",
      },
      {
        q: "How long before AI recommendations change?",
        a: "Nobody can give you a date, and we do not promise one. Listings update fast, often within days. Website changes are picked up when the pages are crawled again, which depends on how often your site changes and who links to it. Publish the answers, keep the listing current, and run the test every month.",
      },
      {
        q: "What should I NOT do?",
        a: "Do not stuff your pages with 'best plumber in Tyler TX' twenty times. Do not post fake reviews, which is illegal under the FTC's 2024 rule on fake reviews and testimonials and is exactly the kind of pattern these systems learn to discount. Do not hide your prices behind 'call for a quote' if you can publish a range. And do not buy a listing in a 'voice assistant directory' from someone who called you.",
      },
    ],
    body: `Open ChatGPT and type the question your next customer is going to type. "Best HVAC company in Longview TX." "Who does land clearing near Tyler." "Dental assistant school near me."

Three or four businesses come back with a sentence about each. Either you are one of them or you are not.

I do this for clients before we build anything, because it tells you what the machine believes about you today. This article is what we have learned about where those answers come from and what to publish so they come out right. No tricks, because there are none that last.

## How many people are actually asking

BrightLocal's Local Consumer Review Survey 2026, published in March, put a number on it: 45 percent of US consumers said they had used an AI tool for local business recommendations in the past year, up from 6 percent the year before. ChatGPT was the most used tool at 31 percent.

{{CHART:ai-use}}

The third bar is the one to remember. Almost everyone who gets an AI recommendation checks it against real reviews at least sometimes. So the AI opens the door and your reviews decide whether the customer walks through. Both halves have to be right.

## Where ChatGPT gets its local answers

This is the part most articles skip because it takes work to find out.

A researcher named Nicolas Sitter tracked roughly 25,600 ChatGPT hotel searches between December 2025 and March 2026, close to 100,000 map pins. In December, every pin came from Google Places. By the last week of March, Google Places supplied 70 percent, Yelp 22 percent, and Foursquare and Tripadvisor the rest. SocialPlaces published the breakdown in August.

{{CHART:pin-sources}}

Hotels are not plumbers, and the article says so. But the lesson transfers: ChatGPT is not inventing a list of businesses. It is reading the same listings Google Maps reads, plus review sites, plus whatever it can crawl on your website. If your Google Business Profile is thin, you are thin everywhere that reads it.

Google itself now sells the same idea back to you. Its Business Agent for leads answers customer questions inside Search, and Google's own page says the agent is grounded in your website. The machine's script is your site.

## What we publish for clients, in order

**1. One listing, complete, that you own.** Same business name, address and phone everywhere. Hours that are true. Every service listed with a sentence. Photos from this year. Replies on reviews. The owner's own Google account on it, with a second trusted owner. This is the source most assistants start from, so it goes first.

**2. A website that answers questions in plain words.** A machine cannot summarize "quality service at a fair price." It can summarize "Service calls are $89. Most repairs run $250 to $900. We cover Gregg, Harrison and Upshur counties. Same-week appointments." Every service page we build has a price or a range, an area, a timeline, and what is included, written the way the owner says it on the phone.

**3. The five questions, answered, on the page, with markup.** Price, area, timing, what is included, how to book. Visible on the page for people, marked up as questions and answers for machines. The tool below writes the markup. You write the answers.

{{TOOL}}

**4. Reviews that say something.** Ask every happy customer, and ask them to say what was done and what it cost if they are comfortable. "Great job" is a rating. "Replaced our water heater the same afternoon for $1,400" is a sentence a machine can quote. We wrote the asking script in [how to ask for an honest review after the work is done](/articles/how-to-ask-for-an-honest-review-after-the-work-is-done).

**5. The same answers on your Business Profile.** Services with descriptions, the Q&A section seeded with your five questions, and a post when something changes. The assistants read the profile and the site. Make them agree.

**6. Run the test monthly.** Same three questions, ChatGPT and Google, screenshot the results. You are not watching rankings. You are watching whether the machine's description of you is accurate. The day it says you charge a price you stopped charging two years ago, you know which page to fix.

## What this costs and what it does not do

Everything above is writing and listing work. There is no software to rent. If you have an afternoon, you can do the listing and the five questions yourself. If you want it done and kept current, that is what we do, and the form above is how you ask.

It does not promise a position in anyone's answer. SOCi's 2026 Local Discovery Index found two thirds of AI users have gotten wrong information about a local business at least once, which tells you how much of this is still rough. The businesses that publish clear facts are the ones the rough edges hurt least.

## The bottom line

ChatGPT recommends businesses it can describe accurately from public sources it already reads. Make your Google listing complete, publish prices and scope in plain words on a site you own, answer the five questions, collect reviews that say what happened, and check the machine's work every month.

That is the whole method. It is not clever. It is the same thing that made your business findable on Google ten years ago, written for a reader that now talks back.`,
  },
  {
    slug: "facebook-link-post-limit-local-business",
    title: "Facebook is limiting link posts. Where should your posts send people now?",
    description:
      "Some free Facebook Pages are capped at two link posts a month unless they pay. What the test is, why link posts already got buried, and the posting setup we use for local businesses.",
    publishedAt: "2026-10-09",
    readingMinutes: 8,
    ogImage: "/images/articles-v5/facebook-link-post-limit-local-business.jpg",
    tags: ["facebook", "social media", "own your platform", "website", "local business marketing"],
    form: {
      heading: "Want your Facebook posts to land somewhere you own?",
      lead:
        "Tell us what you post now, how often, and where the link goes. We will show you a posting setup that keeps reach on the Page and sends serious people to a site and a phone you control, with a quote for building the parts you are missing.",
      interest: "system_map",
      industry: "General small business",
    },
    charts: [
      {
        id: "two-vs-thirty",
        title: "Two link posts a month against a real posting schedule",
        subtitle: "Posts per month: the cap in Meta's test versus what we schedule for a local business Page.",
        kind: "bars",
        unit: "count",
        bars: [
          { label: "Link posts allowed on an affected free Page", value: 2, tone: "red", note: "Meta's test, reported by Social Media Today, September 17, 2026." },
          { label: "Posts we schedule for a local business Page each month", value: 28, tone: "blue", note: "Our own planner: about one a day, most with no outside link at all." },
        ],
        max: 30,
        source: "Social Media Today for the cap; our own posting schedule for the second bar.",
      },
      {
        id: "views-without-links",
        title: "Most of what people see on Facebook has no outside link",
        subtitle: "Share of US Facebook post views, Meta's own Widely Viewed Content Report.",
        kind: "bars",
        unit: "percent",
        bars: [
          { label: "Post views with no external link", value: 98.7, tone: "blue" },
          { label: "Post views that included an external link", value: 1.3, tone: "red" },
        ],
        max: 100,
        source: "Meta Widely Viewed Content Report, first quarter of 2026, as cited by Social Media Today on September 17, 2026.",
      },
    ],
    sources: [
      {
        label: "Social Media Today: Facebook Pages get charged for link posts",
        url: "https://www.socialmediatoday.com/news/facebook-pages-get-charged-for-link-posts/",
        date: "September 17, 2026",
      },
    ],
    faq: [
      {
        q: "Is every Facebook Page limited to two link posts now?",
        a: "No. As Social Media Today reported it, the two-links-a-month cap is a test on some non-paying professional Pages, publisher Pages are exempt, and Meta said other Pages may be restricted later. Meta first tested the same cap in December 2025. Whether your Page is in the test, the direction is clear: links in posts are becoming a paid feature.",
      },
      {
        q: "Should I pay for Meta One to get links back?",
        a: "Not just for links. Meta One for Business launched in September 2026 with paid tiers, and at the time of the report Facebook post links were not even listed as a benefit. Before paying any platform a monthly fee for the right to send people to your own website, count what that website does with the visitors. If it has no clear next step and no follow-up, the link was never the problem.",
      },
      {
        q: "Does putting the link in the first comment work?",
        a: "It is what we do, and it keeps the post itself free of a link, which is the thing that gets buried. It is not a loophole Meta has blessed and it could change. Treat it as a habit, not a strategy. The strategy is that your Page makes people want to find you, and your website and phone are easy to find without a link.",
      },
      {
        q: "If links are limited, how do I get customers off Facebook?",
        a: "Your business name, a memorable domain, and a phone number in plain text in every post and in the Page bio. A pinned post with directions and hours. A Page call button that rings a line somebody answers. And a Messenger reply that asks for a phone number or email in the first exchange, so the conversation lives somewhere you own by the second message.",
      },
    ],
    body: `In September, Social Media Today reported that some Facebook Pages are now limited to two link posts a month unless they pay for a Meta One subscription. Publisher Pages are exempt, because Meta wants their content flowing in. Business Pages are not.

That number is small enough to be a joke until you count. Two. A local business that posts a job photo with a link to its website every day runs out of links by the second of the month.

We manage Pages for local businesses, so we had already changed how we post before this test expanded. Here is what we do and why it works better anyway.

## This did not start in September

Meta's own Widely Viewed Content Report for the first quarter of 2026 says 98.7 percent of US post views did not include an external link. That is Meta describing its own feed.

{{CHART:views-without-links}}

So before any cap, a post with a link was already the post almost nobody saw. The cap just makes official what the feed was doing quietly. We noticed it the way most owners do: a post with a link got a tenth of the reach of the same post without one. We stopped putting links in captions on our client Pages months ago and moved them to the first comment. Reach went back up.

## What the cap looks like against a real schedule

{{CHART:two-vs-thirty}}

For a local business Page we schedule about a post a day: a job photo, a before and after, a short video from the truck, a question for the audience, a customer's words with their permission. Almost none of those need a link, and the ones that do (a new article, a seasonal offer, an event) can carry the link in the first comment or in the Page bio.

Two linked posts a month is enough for that schedule. The problem is not the cap. The problem is a business whose only way home from Facebook was the link.

## Where your posts should send people now

The honest answer is that a post should not have to send people anywhere. It should make them want to find you, and finding you should take one tap.

**Put the name, the town and the phone in plain text in every post.** "Scott's crew, Tyler. (903) 555-0100." A phone number is not a link. Meta cannot cap it, and a person can tap it.

**Fix the Page itself.** The call button rings a line someone answers. The website field is filled in. The about section says what you do, where, and what it costs to start. The pinned post is directions, hours, and the phone.

**Make the website worth the trip.** When someone does type your domain, the site should load in two seconds on a phone, show a price or a range, and have a form or a text button above the fold. We built the checklist for that in [a Facebook page is not a website](/articles/facebook-page-is-not-a-website), and it matters more now, not less.

**Move the conversation off Meta in the second message.** When someone messages the Page, the first reply answers the question and the second asks for a phone number or email so you can send the quote. Now the relationship lives in your phone and your inbox, which no test can cap.

**Use the two links on purpose.** One for the thing you most want read this month. One in reserve. Everything else goes in a comment or the bio.

## Why this is good news if you own your platform

Every one of these changes pushes in the same direction. Reach on Facebook is rented. The link out is rented. The audience is rented. The things Meta cannot touch are your name, your phone number, your domain, your email list, and the website that turns a visit into a call.

If your business already has those, this test is a footnote. If it does not, this is the month to build them, because the next change will not come with a news article.

## What to do this week

1. Check whether your Page has the pop-up about link limits. If it does, you are in the test. If not, post as if you are.
2. Move links out of captions and into the first comment. Put the phone number and domain in the caption in plain text.
3. Fill in the Page's call button, website field, and about section. Pin a post with hours, directions and the phone.
4. Open your website on your own phone. Time it. Find the price. Find the button. If any of those three fail, that is the real job.
5. Decide what the two linked posts this month are for before you spend them.

That is the whole fix. The form below is how you ask us to build the parts you are missing. The rest you can do today.`,
  },
  {
    slug: "squarespace-wix-price-increase-2026-how-to-leave",
    title: "Squarespace and Wix raised prices again. How to leave without losing your domain or your rankings.",
    description:
      "Squarespace plans rose up to 26 percent in July 2026 and Wix followed in August. The step by step exit: your domain, your email, your redirects, and what you own on the other side.",
    publishedAt: "2026-10-09",
    readingMinutes: 11,
    ogImage: "/images/articles-v5/squarespace-wix-price-increase-2026-how-to-leave.jpg",
    tags: ["own your platform", "website builder fees", "squarespace", "wix", "website", "monthly fees"],
    tool: {
      slug: "rent-receipt",
      heading: "Add up what the rented stack costs you now, before you decide",
      intro:
        "A price increase feels like a decision point, but the website builder is usually one line on a longer receipt. Put every monthly tool your business pays for into the Rent Receipt and see the yearly total, what one more round of increases does to it, and what you would own if the same money went into a build. It cannot tell you what a move costs in your case. It tells you what staying costs.",
      steps: [
        {
          name: "List every tool with a monthly charge",
          text: "Website builder, booking, email marketing, texting, forms, reviews, CRM seats, scheduling, the extras you added to the builder. Pull them from your card statement, not from memory. Most owners find two they forgot.",
        },
        {
          name: "Use the price on your next bill, not the price you signed up at",
          text: "Promotional first-year prices expire. If your renewal email shows a new number, use that one. If you are on a plan that just went up, use the new plan price.",
        },
        {
          name: "Set the yearly increase you have actually seen",
          text: "The tool asks what you expect prices to rise per year. Look at your own history. If a plan went from $23 to $29 in one notice, that is 26 percent in a year, and planning on zero is how the receipt sneaks up.",
        },
      ],
      readIt: [
        "The yearly total is the number to put next to a one-time build. A build you own costs once and then costs hosting, which is small and does not care how many visitors you had.",
        "The five-year line is where rented stacks get expensive. Each increase compounds on the last, and you never get the money back when you leave.",
        "If the yearly total is small and the site does its job, stay and spend your time elsewhere. The point is to decide with the number in front of you.",
      ],
      formHeading: "Want the move planned so nothing breaks?",
      formLead:
        "Tell us the builder you are on, roughly how many pages you have, where your domain is registered, and whether your email runs through the builder. We will map the move, tell you what you keep and what you rebuild, and quote it. Nothing changes until you say so.",
      interest: "website_launch",
      industry: "General small business",
    },
    charts: [
      {
        id: "price-moves",
        title: "What the two biggest builders did to annual plan prices in 2026",
        subtitle: "Monthly price when billed annually, before and after the change.",
        kind: "bars",
        unit: "money",
        bars: [
          { label: "Squarespace Basic, before", value: 16, tone: "muted" },
          { label: "Squarespace Basic, after (up 19%)", value: 19, tone: "red" },
          { label: "Squarespace Core, before", value: 23, tone: "muted" },
          { label: "Squarespace Core, after (up 26%)", value: 29, tone: "red" },
          { label: "Squarespace Plus, before", value: 39, tone: "muted" },
          { label: "Squarespace Plus, after (up 26%)", value: 49, tone: "red" },
          { label: "Wix Light, before", value: 17, tone: "muted" },
          { label: "Wix Light, after (up 12%)", value: 19, tone: "red" },
        ],
        max: 50,
        source: "PetaPixel, July 17, 2026, on Squarespace's customer emails; UsagePricing, August 27, 2026, on Wix Light. Monthly-billing prices moved less and are in the sources.",
      },
      {
        id: "five-years",
        title: "What a rented site costs over five years if increases keep coming",
        subtitle: "A worked example: a $29 plan plus $40 of add-ons, rising 10 percent a year, against a one-time build on hosting you own.",
        kind: "bars",
        unit: "money",
        bars: [
          { label: "Year 1 rented ($69 a month)", value: 828, tone: "red" },
          { label: "Year 3 rented (after two increases)", value: 1002, tone: "red" },
          { label: "Year 5 rented (after four increases)", value: 1212, tone: "red" },
          { label: "Five years rented, total", value: 5055, tone: "red", note: "You own nothing at the end of it." },
          { label: "Five years of hosting a site you own, at $20 a month", value: 1200, tone: "green", note: "Plus the one-time build, which you keep." },
        ],
        max: 5200,
        source: "arithmetic in this article. The plan prices are real; the add-ons, the 10 percent assumption and the hosting figure are practice numbers for your receipt to replace.",
        illustrative: true,
      },
    ],
    sources: [
      {
        label: "PetaPixel: Squarespace is increasing prices by up to 26 percent",
        url: "https://petapixel.com/2026/07/17/squarespace-is-increasing-prices-by-up-to-26/",
        date: "July 17, 2026",
      },
      {
        label: "UsagePricing: Wix price change, August 27, 2026",
        url: "https://usagepricing.com/blueprint/activity/wix-2026-08-27-price-change",
        date: "August 27, 2026",
      },
    ],
    faq: [
      {
        q: "If I cancel Squarespace or Wix, do I lose my domain?",
        a: "Not if you act before the site plan lapses and the domain is in your name. A domain bought through the builder is a separate product from the site plan. Transfer it to a registrar you control, or at least confirm the registrant contact is you and not an agency, before you cancel anything. Transfers usually need the domain unlocked, an authorization code, and a few days. Do this first, because the domain is the one thing you cannot rebuild.",
      },
      {
        q: "Will I lose my Google rankings when I move?",
        a: "You can lose them if the old page addresses stop working, and you can keep them if every old address sends people and Google to the new page. That is a redirect map: a list of every old URL and where it goes now. Make the list before the move, set the redirects the day you switch, and keep them for at least a year. Rankings that were earned by the content follow the content when the redirects are right.",
      },
      {
        q: "What about my email if it runs through the builder?",
        a: "Builder-bundled email is usually Google Workspace or Microsoft 365 sold through the builder. Find out which, and whether you can move the subscription to a direct account before you cancel. Export the mailboxes either way. Then make sure the DNS records for mail move with the domain. An email outage on the day of a site move is the most common self-inflicted wound in this whole process.",
      },
      {
        q: "Is a one-time build really cheaper than $29 a month?",
        a: "Over one year, often not. Over five, usually yes, and the gap grows with every increase. The real difference is what you have at the end. After five years of rent you have a cancellation. After a build you own, you have a site, the code, the domain, the forms, and the list, and hosting costs about what one lunch does. Run your own numbers in the Rent Receipt before you believe either answer.",
      },
    ],
    body: `In July, Squarespace emailed customers that annual plan prices were going up. Basic went from $16 to $19 a month, Core from $23 to $29, Plus from $39 to $49. PetaPixel covered it on July 17. In August, Wix moved its Light plan from $17 to $19 on yearly billing.

{{CHART:price-moves}}

None of those numbers will break a business. That is what makes them dangerous. Each one is small enough to ignore, and together they are a rent payment on a building you will never own.

I build websites that owners own. So I am not neutral on this. But I have also moved enough sites off builders to tell you plainly: the move is not hard, and the two ways people get hurt are both avoidable. They lose the domain, or they lose the rankings. Here is how to do neither.

## First, decide with the whole receipt

The website builder is one line. The booking tool, the email tool, the texting app, the review tool, and the extras you bolted onto the builder are the other lines. Put them all in the Rent Receipt below and look at the yearly number before you decide anything.

{{TOOL}}

If the yearly total is small and the site does its job, staying is a fine answer. If it is not small, keep reading.

{{CHART:five-years}}

That chart is practice arithmetic, not a quote. The plan prices are real. The ten percent a year is an assumption, and this year Squarespace Core beat it by a lot. The point is the shape: rent compounds, and ownership does not.

## The move, in the order that keeps you safe

**Step 1. Secure the domain before anything else.** Find out where it is registered. If it is through the builder, confirm the registrant is you, not an agency or an employee who left. Unlock it, get the authorization code, and transfer it to a registrar you control. This takes days, so start now. A site can be rebuilt in a week. A lost domain can be gone for good.

**Step 2. Save your email.** If email runs through the builder, find out which provider it really is, export every mailbox, and move the subscription to a direct account if you can. Write down the mail records in your DNS (the MX, the SPF text record, the DKIM record) so they move with the domain. Do not cancel the builder until mail works from the new setup.

**Step 3. Make the redirect map.** List every page address on the old site. Decide where each one goes on the new site. Pages that no longer exist go to the closest page, not the homepage. This list is your rankings. Keep it.

**Step 4. Export what you can and rewrite what you should.** Builders export blog posts and images, usually badly. Take the export, then rewrite the pages that matter with a price, an area, a timeline and a next step on each. Half the value of a move is fixing the pages you have been meaning to fix.

**Step 5. Build the new site somewhere you own.** For us that means code in a repository the owner holds, hosting on a server or account in the owner's name, forms that post to the owner's own lead system, and no page that depends on a plugin someone can raise the price of. We wrote out the stack and what it costs in [how AI actually builds and runs a business website in 2026](/articles/ai-website-small-business-2026).

**Step 6. Switch DNS and set the redirects the same hour.** Point the domain at the new site, publish the redirects from your map, and test ten old addresses on your phone. Then test email. Then test the form by filling it out yourself.

**Step 7. Cancel the builder plan after the new site has been live for two weeks.** Not before. Keep the redirects for at least a year.

## What you own on the other side

The domain in your name at a registrar you control. The code. The hosting account. The forms and the list of people who filled them out. The Google Business Profile, which was always yours. The ability to add a page, a tool, or a calculator without checking a plan tier.

And a monthly bill that is hosting, which is small and does not go up because a company needs to hit a quarter.

## What this does not fix

A site you own with no clear next step on it is a cheaper version of the same problem. The move is worth doing when the new site answers the questions customers ask, loads fast on a phone, and turns a visit into a call or a form that someone follows up. We covered why that matters more than the platform in [your website gets visitors, why is nobody calling](/articles/website-traffic-but-no-customers).

## The bottom line

The increases are the reminder, not the reason. The reason to leave a builder is that you want to own the thing your business runs on. Secure the domain, save the email, map the redirects, build it right, switch, and cancel last. Do it in that order and you keep everything that mattered.`,
  },
  {
    slug: "texas-sb-140-business-texting-checklist",
    title: "Texas SB 140: the texting checklist for a Texas business owner",
    description:
      "A year after Texas SB 140 took effect, what a local business should check before texting customers: consent on your own forms, quiet hours, records, and the carrier registration most texts fail. Not legal advice.",
    publishedAt: "2026-10-09",
    readingMinutes: 9,
    ogImage: "/images/articles-v5/texas-sb-140-business-texting-checklist.jpg",
    tags: ["texting", "sms", "texas", "compliance", "follow up", "a2p 10dlc"],
    tool: {
      slug: "sms-link-generator",
      heading: "Make the customer text you first",
      intro:
        "The cleanest consent you can get is a customer who texts you. A text link on your website, your Google listing and your invoices opens their messaging app with a message already written. They tap send, you reply, and the conversation started on their side. This tool writes the link. It does not write your consent policy, and it does not register your number with the carriers.",
      steps: [
        {
          name: "Use the business line that is registered, not your cell",
          text: "The number in the link should be the one your business texts from, the one you registered or will register with the carriers. Mixing a personal cell into customer texting is how records get lost.",
        },
        {
          name: "Write the opening message as a request, not a sales line",
          text: "'Hi, I would like a quote for' and a blank beats 'Sign me up for deals.' The first text sets the tone of the whole thread, and a quote request is a conversation a customer expects you to answer.",
        },
        {
          name: "Put the link where people are already deciding",
          text: "The contact page, the Google Business Profile, the estimate email, the invoice footer. One tap in those places starts more conversations than any form.",
        },
      ],
      readIt: [
        "A text link produces an inbound text, which is the clearest record that the customer opened the conversation. Keep the thread.",
        "It does not replace a written consent checkbox for marketing texts. A quote request is not permission to send promotions next spring. Ask for that separately, in writing, and keep the record.",
        "If your number is not registered with the carriers, some of your replies will not arrive no matter how clean the consent was. Registration is the first job.",
      ],
      formHeading: "Want your texting set up so it reaches people and keeps the records?",
      formLead:
        "Tell us what you text today (replies, reminders, promotions), from what number, and whether it has ever been registered with the carriers. We will set up registration, consent capture on your own forms, quiet hours and a log, on a line you own. We are not lawyers and will say so when you need one.",
      interest: "system_map",
      industry: "General small business",
    },
    charts: [
      {
        id: "when-texts-come-in",
        title: "When customers text and call a local business",
        subtitle: "Share of inbound calls, texts and forms by time of day, Central time. Reply inside these windows and you rarely have to think about quiet hours.",
        kind: "columns",
        unit: "percent",
        bars: [
          { label: "Before 8 AM", value: 2, tone: "muted" },
          { label: "8 AM to noon", value: 36, tone: "blue" },
          { label: "Noon to 5 PM", value: 43, tone: "blue" },
          { label: "5 PM to 8 PM", value: 14, tone: "gold" },
          { label: "After 8 PM", value: 6, tone: "muted" },
        ],
        source: "our own lead records, about 1,500 inbound calls, texts and forms across the businesses we run systems for, July to October 2026, counted in total.",
      },
    ],
    sources: [
      {
        label: "K&L Gates: Text message marketing in Texas, one year after SB 140",
        url: "https://www.klgates.com/thought-leadership/Litigation-Minute-Text-Message-Marketing-in-Texas-One-Year-After-SB-140-9-14-2026",
        date: "September 14, 2026",
      },
      {
        label: "Forbes Technology Council: The A2P 10DLC rules most businesses are breaking without knowing it",
        url: "https://www.forbes.com/councils/forbestechcouncil/2026/09/15/the-a2p-10dlc-rules-most-businesses-are-breaking-without-knowing-it/",
        date: "September 15, 2026",
      },
    ],
    faq: [
      {
        q: "Does Texas SB 140 apply to a small business texting its own customers?",
        a: "It can. SB 140 changed Chapter 302 of the Texas Business and Commerce Code so that 'telephone solicitation' covers a call or other transmission, which brings marketing texts under the chapter's registration and disclosure rules, for conduct from September 1, 2025 on. K&L Gates' one-year review notes the State has taken the position in court that consent-based messaging does not need the registration, the Secretary of State's FAQ says the same, and neither is binding precedent yet. We are not lawyers. If you send promotional texts to Texans, pay a Texas attorney for an hour before the next batch, and keep every consent record either way.",
      },
      {
        q: "What counts as consent for texting?",
        a: "The safest form is written, specific and kept: a checkbox on your own form that says what you will text and how often, unticked by default, with the date, the phone number, and the page it was on saved somewhere you can find in two years. A customer texting you first is a strong record for replying to them. It is not permission to put them on a promotion list. Ask for that separately.",
      },
      {
        q: "What are quiet hours for texting?",
        a: "Texas's telephone solicitation rules restrict calls and now texts to certain hours, and federal rules restrict telemarketing to 8 AM to 9 PM in the recipient's time zone. The practical answer for a local business is simpler: text between 8 AM and 8 PM Central, reply to inbound texts whenever they come in, and let automated messages queue until morning. Our own records show almost nobody texts a business after 8 PM anyway.",
      },
      {
        q: "Why do my texts not arrive even though customers asked for them?",
        a: "Because the carriers filter business texts from numbers that are not registered under A2P 10DLC, and they compare what you send against the samples you registered. Unregistered traffic gets blocked quietly, with no bounce. If replies from your business line go missing, registration is the first thing to check, before anyone touches the wording.",
      },
    ],
    body: `Texas changed its texting rules a year ago, and most of the business owners I talk to found out the way you find out about any law: someone mentioned a lawsuit.

Senate Bill 140 took effect September 1, 2025. It rewrote the definition of telephone solicitation in Chapter 302 of the Business and Commerce Code from a "telephone call" to a "call or other transmission," which brings marketing texts under rules that had been written for phone calls, including the chapter's registration and disclosure requirements. K&L Gates published a one-year review on September 14, 2026. The short version: the State has argued in court that consent-based messaging does not need the registration, the Secretary of State's FAQ says the same, no contested decision has settled it, and the risk sits with businesses that text people who never asked.

I am not a lawyer and this is not legal advice. I set up texting systems for local businesses, and what follows is the checklist we run so a client can hand a lawyer a clean file instead of a shoebox. If you send promotional texts in Texas, buy an hour of a Texas attorney's time. This article is what to bring to that hour.

## The checklist

**1. Know which of your texts are marketing.** A reply to someone who texted you is a conversation. A reminder for an appointment they booked is a transaction. "Fall tune-up special, book this week" to your whole customer list is marketing. The rules get strictest on the third kind, and most small businesses send all three from the same phone without noticing the difference.

**2. Get consent on your own forms, in writing, unticked by default.** Every form on your website that collects a phone number should have a separate checkbox for texts, not pre-checked, that says what you will send and how often. Save the date, the number, the form, and the page. Our forms on this site do exactly that, and the consent line is written out where anyone can read it.

**3. Keep the record where you can find it in two years.** The consent, the first message, the opt-out. If a dispute comes, the business with the record is in a different position from the business with a memory.

**4. Honor opt-outs instantly and everywhere.** STOP means stop on that number and on every list you run. If a customer texts your office line to opt out and your review tool keeps texting from a different number, you have a problem that no consent form fixes.

**5. Respect the hours.** Federal telemarketing rules keep calls and texts between 8 AM and 9 PM in the recipient's time zone, and Texas has its own hour limits in the solicitation rules. We set every automated message to send between 8 AM and 8 PM Central and to queue overnight.

{{CHART:when-texts-come-in}}

That is our own data, and it says the quiet-hours question mostly answers itself. People reach local businesses in the daytime. If you reply inside the windows they already use, you are rarely near the line.

**6. Register the number with the carriers.** This one is not Texas law. It is the carriers, and it is the reason most business texts fail. Business texting from a regular phone number goes through A2P 10DLC registration, and Forbes Technology Council wrote in September about how many businesses are breaking those rules without knowing it. Unregistered traffic gets filtered with no bounce. Registered traffic that does not match the samples you registered gets filtered too. If customers say "I never got your text," check this before you check anything else.

**7. Make it easy for the customer to text first.** The cleanest consent is a conversation the customer started. A text link on your website, your Google listing, your estimates and your invoices does that in one tap.

{{TOOL}}

**8. Review the list before any blast.** Who on this list asked for marketing texts, when, and where is the record? If the answer for a chunk of them is "they bought from us once," that chunk gets an email, not a text, until they say otherwise.

## What this looks like when it is set up right

A customer fills out a quote form on a site you own. The form has two unchecked boxes, one for email, one for texts, each saying what they get. They check the text box. The system saves the consent with a timestamp and the page. A text goes out within a minute from your registered business line, during allowed hours, saying who you are and what happens next. They reply. The thread lives on your line, logged. If they ever text STOP, every list you run drops them that minute.

None of that is exotic. It is a form, a registered line, a log, and a rule about hours. We build it for clients as part of the phone and follow-up setup, and the form above is how you ask.

## What this does not cover

Whether your specific messages count as solicitation under Texas law, whether you need the state registration and bond, and what your exposure is if you have already been texting a list without consent. Those are lawyer questions, and the K&L Gates piece is a good thing to read before the call so you ask the right ones.

## The bottom line

Texting works because people read texts. That is also why the rules are tightening. Ask in writing, keep the record, honor stops, text in daylight, register the line, and let customers start the conversation when you can. Do that and the law is a document in a folder instead of a letter in the mail.`,
  },
  {
    slug: "how-fast-do-businesses-actually-call-leads-back",
    title: "How fast do small businesses actually call leads back? We counted 202 of ours.",
    description:
      "Everyone quotes the five minute rule. We pulled 202 real leads from businesses we run systems for and counted. One in nine got a call or text inside five minutes. Here is the rest, and the fix.",
    publishedAt: "2026-10-09",
    readingMinutes: 9,
    ogImage: "/images/articles-v5/how-fast-do-businesses-actually-call-leads-back.jpg",
    tags: ["speed to lead", "follow up", "lead response time", "missed calls", "data"],
    tool: {
      slug: "lead-response-time",
      heading: "See what your own callback speed is costing",
      intro:
        "The calculator takes your monthly lead count, how long it usually takes you to respond, your average ticket and your close rate, and shows what a faster reply would be worth. It uses the published research on contact rates by response time. It cannot see your phone, so be honest about the hours.",
      steps: [
        {
          name: "Count last month's new inquiries",
          text: "Calls, forms, messages and texts from new people. Not repeat customers. If you do not know, pull your call log and your form notifications for one month and count.",
        },
        {
          name: "Enter your real response time in hours",
          text: "Not your best day. The typical gap between the inquiry and the first call or text back. If forms sit until the evening, that is eight or ten hours. If calls go to voicemail and get returned the next morning, that is sixteen.",
        },
        {
          name: "Use the ticket and close rate you actually see",
          text: "Average job value is a typical first invoice. Close rate is the share of real inquiries that become paid work at your current speed, which is the number the calculator improves on.",
        },
      ],
      readIt: [
        "The gap between your current line and the five-minute line is money you are paying to be slow. It is also the budget for fixing it: a text-back, a shared line, or a person for the busy hours.",
        "If your response time is already under an hour, the calculator will show a small gap. Good. Protect it, because the number creeps up as you get busier.",
        "Treat the result as a direction, not a forecast. The research is about contact rates. Your close rate still depends on the quote.",
      ],
      formHeading: "Want a text-back and a call queue that run without you?",
      formLead:
        "Tell us how leads reach you (calls, forms, Facebook, Google), roughly how many a month, and what happens to one that comes in at 2 PM on a Tuesday when you are on a job. We will show you the setup we run and quote it. Totals and process, no customer details.",
      interest: "system_map",
      industry: "General small business",
    },
    charts: [
      {
        id: "first-touch",
        title: "How long 202 real leads waited for the first call or text back",
        subtitle: "New leads, September 18 to October 7, 2026, across the businesses we run systems for. Email-only follow-up is not counted as a touch.",
        kind: "bars",
        unit: "percent",
        bars: [
          { label: "Called or texted within 5 minutes", value: 11, tone: "green", note: "22 of 202." },
          { label: "Within 1 hour (cumulative)", value: 12, tone: "green", note: "24 of 202. Almost everyone who was going to be fast was fast in the first five minutes." },
          { label: "Within 24 hours (cumulative)", value: 20, tone: "gold", note: "41 of 202." },
          { label: "First touch came after 24 hours", value: 11, tone: "red", note: "23 of 202." },
          { label: "No call or text on record at all", value: 68, tone: "red", note: "138 of 202. Some got an email. None got a phone call or a text we can find." },
        ],
        max: 100,
        source: "our own lead records, counted in total across two businesses. The window starts September 18 because that is when every outbound text began to be logged, so earlier months would undercount.",
      },
      {
        id: "replies",
        title: "Who wrote back, by how fast we reached them",
        subtitle: "Share of leads that replied by call or text, grouped by the speed of our first touch. Small groups, read the direction, not the decimals.",
        kind: "bars",
        unit: "percent",
        bars: [
          { label: "First touch inside an hour (24 leads)", value: 33, tone: "green", note: "8 replied." },
          { label: "First touch after 24 hours (23 leads)", value: 17, tone: "red", note: "4 replied." },
        ],
        max: 100,
        source: "the same 202-lead window. Two dozen leads in each group is enough to see a direction and not enough to quote as a statistic.",
      },
    ],
    sources: [
      {
        label: "Lead Response Management Study, James Oldroyd (contact and qualification odds by response time)",
        url: "https://www.leadresponsemanagement.org/lrm_study",
        date: "2007",
      },
    ],
    faq: [
      {
        q: "Is the five minute rule real?",
        a: "The research behind it is real and old. The Lead Response Management Study found the odds of making contact with a web lead fell sharply after five minutes and kept falling by the hour. Newer studies keep finding the same shape. What our own count adds is how far most small businesses are from it: one in nine leads got a call or text inside five minutes, and two thirds got none at all.",
      },
      {
        q: "Why did two thirds of leads get no call or text?",
        a: "Three reasons we see over and over. The lead arrived while the owner was working and nobody else owned the phone. The form notification went to an inbox that is checked at night. And the lead came from an ad on a platform where the owner never set up a notification at all. None of those are laziness. They are the absence of a system, and a system is a cheap thing to add.",
      },
      {
        q: "Does a text count, or does it have to be a call?",
        a: "A text within a minute beats a call within an hour, because the text arrives while the person is still holding the phone they used to reach you. We count both as a first touch. The best setup does both: an automatic text that says who you are and what happens next, then a call from a person inside the hour.",
      },
      {
        q: "How did you count this, and why only 202?",
        a: "We pulled every new lead that reached two businesses we run systems for between September 18 and October 7, 2026, and looked for the first outbound call or text logged against each one. September 18 is when every outbound text started being recorded, so earlier months would have made the numbers look worse than they were. Nobody is named, and nothing in the count identifies a customer. It is a small window on purpose: it is the one we can vouch for.",
      },
    ],
    body: `Every article about lead follow-up quotes the same study. Call back inside five minutes and your odds of reaching the person are many times higher than at thirty. It is a real study and the shape holds up.

What nobody quotes is how far the average small business is from it. So we counted.

Between September 18 and October 7, 2026, 202 new leads reached the businesses we run systems for: calls, forms, texts and ad leads. We looked for the first outbound call or text logged against each one and how long it took. Here is what came back.

{{CHART:first-touch}}

Read that bottom bar twice. Sixty-eight percent of new leads have no phone call and no text on record. Some of them got an email. Some of them got nothing. The person asked, and the business never picked up the phone.

I am not writing this from a high horse. One of those businesses is mine. The point is not that owners are lazy. The point is that follow-up is a system, and when there is no system, this is what the numbers look like for almost everyone.

## What the fast group looks like

The most interesting number is the gap between five minutes and one hour: 11 percent and 12 percent. Almost nobody who called back in the first hour did it between minute six and minute sixty. Either the business reached the lead almost instantly, or it did not reach them that hour at all.

That is what a system looks like in the data. The fast touches are automatic texts and a person who happened to be at the desk. The slow touches are humans getting to it later.

## Does speed change the reply rate?

We checked who wrote back.

{{CHART:replies}}

Two dozen leads in each group is a small sample, and I am not going to pretend a third versus a sixth is a law of nature. But it points the same direction as every larger study: reach someone while they are still deciding and they talk to you. Reach them tomorrow and half of them already talked to someone else.

## Why this happens to good businesses

**The lead arrives while you are working.** Most inquiries come in late morning and early afternoon, which is exactly when the owner is on a roof or in a chair. Nobody owns the phone, so nobody answers it.

**The notification goes somewhere nobody looks.** Form submissions land in an inbox checked at night. Facebook leads sit in a tab nobody opens. Google messages go to an app nobody installed.

**The ad was set up without a follow-up plan.** Money went into the campaign. Nothing went into what happens the minute a lead arrives. We see this most with ad leads, and it is the easiest to fix because the platform tells you the instant someone fills the form.

**Nobody wrote down what the first reply says.** When the reply has to be composed from scratch, it waits for a quiet moment. Quiet moments come at 9 PM.

## The fix, in order of cheapness

**1. An automatic text inside a minute, from your business line.** It says who you are, that you got the message, and what happens next. It is not the sale. It is the thing that keeps the person from dialing the next company. We wrote the script in [how to write a missed call reply that tells people what happens next](/articles/how-to-write-a-missed-call-reply-that-tells-people-what-happens-next).

**2. One place every lead lands.** Calls, forms, Facebook, Google, all in one list with the time it arrived and who owns it. Not six apps. If you want the reasoning, read [give every inquiry an owner and a next step](/articles/give-every-inquiry-an-owner-and-next-step).

**3. A person who owns the phone from 8 to 5.** That can be you with the ringer on, a family member, an office hire, or a shared answering line. Decide who, write it down, and make the list from step two their job.

**4. A daily call queue.** Every lead that did not get a human touch yesterday is a call today, in order, before anything else. Ten minutes a day clears most small businesses' backlog.

**5. Measure it monthly.** Count the leads, count the ones touched inside an hour, count the ones never touched. The number you watch is the one that moves.

Run your own numbers first. The calculator below uses the published research to show what your current response time is costing against your ticket and close rate.

{{TOOL}}

## What this does not prove

It does not prove that speed alone closes jobs. The quote still has to be right and the work still has to be good. It does not prove anything about your trade in your town, because it is two businesses in East Texas over three weeks. And it does not say owners do not care. It says the phone needs an owner, and most businesses have not given it one.

## The bottom line

Two thirds of the leads in our own records never got a call or a text. One in nine got one inside five minutes. The gap between those two numbers is the cheapest revenue most small businesses will ever find, and the fix starts with a sixty-second text and one person who owns the phone.

If you want that built and running on a line you own, the form above is how you ask. If you want to see the cost first, the calculator is right there.`,
  },
  {
    slug: "land-clearing-leads-cost",
    title: "What a land clearing or dirt work lead actually costs, from a campaign we ran",
    description:
      "Real numbers from an East Texas land clearing campaign: what the first leads cost, what we budget once the easy ones are gone, and the math that decides whether a lead at $150 is cheap.",
    publishedAt: "2026-10-09",
    readingMinutes: 9,
    ogImage: "/images/articles-v5/land-clearing-leads-cost.jpg",
    tags: ["land clearing", "cost per lead", "meta ads", "contractors", "excavation", "east texas"],
    tool: {
      slug: "lead-value-calculator",
      heading: "Work out what one land clearing lead is worth to you before you buy any",
      intro:
        "Cost per lead means nothing until you know what a lead is worth. This calculator takes your close rate, your average job, your margin, repeat work and referrals, and tells you what a new inquiry is worth and how much you can pay for one. Use the numbers from your last ten jobs, not the best one.",
      steps: [
        {
          name: "Use your close rate on quoted jobs",
          text: "Of the last twenty people you quoted, how many hired you? That is the number. Land clearing closes lower than service calls because the tickets are bigger and people shop. Be honest; the tool only works with the real rate.",
        },
        {
          name: "Enter a typical job, not a dream job",
          text: "The median invoice across your last ten jobs. If pads and ponds run $4,000 and brush clearing runs $1,200 and you do more clearing, the typical job is closer to $1,200.",
        },
        {
          name: "Use the margin after fuel, operator and machine time",
          text: "Gross margin is what you keep after the direct cost of running the job. Equipment payments count even when the machine is yours, because an hour on the dozer is an hour of its life.",
        },
        {
          name: "Add repeat and referral only from your own history",
          text: "Landowners who clear five acres this year often clear five more next year, and they talk to neighbors. Count what has actually happened on your past jobs, or enter zero and let the result be a floor.",
        },
      ],
      readIt: [
        "The value of a lead is what you can afford to pay for one and still make money. If it is $300 and leads cost $150, the ads work. If it is $90, they do not, and the fix is the close rate or the price, not the ad.",
        "Repeat and referral value is where land work gets interesting. One cleared property that turns into a pond, a road and a neighbor's job is worth several first jobs.",
        "A low number means tighten the quote process before spending on leads. More inquiries into a slow quote is money into a bucket with a hole in it.",
      ],
      formHeading: "Want a lead campaign for your dirt work, land clearing or excavation business?",
      formLead:
        "Tell us the counties you work, the jobs you want more of, your typical ticket, and what you have tried. We will tell you what we would run, what a lead should cost in your area, and what the first ninety days look like. Your numbers stay yours.",
      interest: "lead_engine",
      industry: "Land clearing and excavation",
    },
    charts: [
      {
        id: "campaign-costs",
        title: "What leads cost on one East Texas land clearing campaign",
        subtitle: "Cost per lead at three points. One client, one campaign, Meta instant forms, October 2026.",
        kind: "bars",
        unit: "money",
        bars: [
          { label: "First two leads (first days, $47.77 spent)", value: 23.89, tone: "green", note: "Early leads are cheap because the audience is fresh and the first responders are the most interested." },
          { label: "A single dirt work lead the following week", value: 33.81, tone: "green", note: "The cost of that one lead on the day it came in." },
          { label: "What we budget once the easy ones are gone", value: 150, tone: "gold", note: "Our planning figure for this trade in this market, the top of a $125 to $150 range. Not a result, a budget." },
        ],
        max: 160,
        source: "an ad account we manage for a land clearing client in East Texas, October 2026, totals only and no names. Early costs are real; the $150 is what we plan on, not what we promise.",
      },
      {
        id: "worth-it",
        title: "Is a $150 lead expensive? It depends on three numbers you already have.",
        subtitle: "A worked example: $150 per lead, one job in four closes, $2,400 typical job, 40 percent margin.",
        kind: "bars",
        unit: "money",
        bars: [
          { label: "Cost to get one paying customer (4 leads at $150)", value: 600, tone: "red" },
          { label: "Gross profit on the typical job ($2,400 at 40%)", value: 960, tone: "blue" },
          { label: "Left after the cost of getting the job", value: 360, tone: "green", note: "Before any repeat work or the neighbor who calls next spring." },
        ],
        max: 1000,
        source: "arithmetic in this article. Practice numbers for your calculator to replace.",
        illustrative: true,
      },
    ],
    faq: [
      {
        q: "What is a good cost per lead for land clearing?",
        a: "There is no number that is good on its own. A $150 lead is cheap for a business that closes one in four at $2,400 a job, and expensive for one that closes one in twelve at $900. On the campaign in this article the first leads came in under $35 each, and we budget $125 to $150 once the early audience is used up. Work out what a lead is worth to you with the calculator, then compare.",
      },
      {
        q: "Why do the first leads cost less than the later ones?",
        a: "When a campaign starts, the platform shows the ad to the people most likely to respond, and the most interested people respond first. As those get used up, each additional lead costs more to find. Judge a campaign on its third and fourth week, not its first three days, in either direction.",
      },
      {
        q: "Should I use Facebook instant forms or send people to my website?",
        a: "Instant forms produce more leads at a lower cost because the person never leaves Facebook. They also produce more tire kickers. A website form produces fewer, more serious leads and builds a site you own. We run forms to start, add qualifying questions so the serious ones sort themselves, and build the website so the business is not renting its lead flow forever.",
      },
      {
        q: "Who should pay for the ad spend, me or the agency?",
        a: "You, on your own card, in your own ad account, with the agency managing it. Then the account, the audience data and the history are yours if you ever change agencies. An agency that insists on running your ads from its account is keeping your results as its property.",
      },
    ],
    body: `A contractor asked me last week what a land clearing lead should cost. He had been quoted a price per lead by a lead service and had no way to tell if it was fair.

The honest answer is that I can tell you what ours cost, and then I can show you the three numbers that decide whether that price is cheap or expensive for you. Nobody can skip the second part, and anyone who quotes you a flat "good" cost per lead is selling you something.

## What ours actually cost

We run a Meta campaign for a land clearing and dirt work client in East Texas. The ad account numbers are ours to report; the client stays unnamed. In the first days the campaign spent $47.77 and produced two leads, which is about $24 a lead. The next week a dirt work lead came in at $33.81.

{{CHART:campaign-costs}}

Here is the part the lead services leave out. Those first leads are cheap because the audience is fresh. The platform shows the ad to the people most likely to respond, and the most interested ones answer first. As they get used up, every additional lead costs more to find. So we do not plan on $24 or $34. For this trade in this market we budget $125 to $150 a lead once the easy ones are gone, and we judge the campaign on week three, not day three.

If a lead service is quoting you $40 flat for land clearing leads, ask whether they are shared with other contractors and how old they are. Exclusive, fresh, local leads in a trade with $2,000 tickets do not cost $40 for long.

## The three numbers that decide if $150 is cheap

**Close rate on quoted jobs.** Of the last twenty people you quoted, how many hired you? Land work closes lower than a service call because the ticket is bigger and people get three bids. One in four is respectable. One in eight means the quote process needs work before the ad budget does.

**Typical job value.** The median invoice across your last ten jobs. Not the $9,000 pad. The $2,400 brush and stump job you do most weeks.

**Gross margin.** What you keep after fuel, the operator and machine time. The machine counts even if it is paid off, because an hour on the dozer is an hour of its life.

{{CHART:worth-it}}

That chart is practice arithmetic, not anyone's account. At a $150 lead, one in four closing, a $2,400 job and 40 percent margin, you pay $600 to land a customer and keep $360 on the first job. If your close rate is one in eight, the same lead costs you $1,200 per customer and the first job loses money. Same ad, same lead price, opposite result. The difference is entirely in your three numbers.

Put yours in the calculator.

{{TOOL}}

## The repeat and referral part most contractors undercount

Land work is unusual. A landowner who clears five acres often clears five more the next year. The cleared lot becomes a pad, the pad needs a road, the road needs culverts, and the neighbor watched the whole thing from the porch.

If your history says one in three first jobs turns into a second one, a $600 cost per customer is buying a lot more than $2,400 of work. Count it from your own past jobs and put it in the calculator. If you have never tracked it, enter zero and treat the result as a floor.

## How we run it so the numbers hold

**The client owns the ad account and pays the spend on his own card.** The audience, the pixel, the history, all his. If he ever fires us, he keeps the asset.

**Instant forms with two qualifying questions.** Acreage and timing. The tire kickers sort themselves out before the phone rings.

**A text inside a minute and a call inside the hour.** A land clearing lead that waits until tomorrow is talking to another contractor by lunch. We showed what that costs across 202 real leads in [how fast do small businesses actually call leads back](/articles/how-fast-do-businesses-actually-call-leads-back).

**Video from the seat of the machine.** The ads that produce cheap leads in this trade are the owner talking from the cab, not a stock photo of an excavator. Thirty seconds, phone camera, honest.

**A website that shows the work.** The forms start the relationship. The site is where the serious landowner goes to see the pond you dug last spring before he calls. That is what moves the close rate, which is what moves every other number here.

## What this does not tell you

It does not tell you what leads cost in your county this month. It does not promise any number of leads or jobs; nobody can, and the budget line in the chart is a budget, not a result. And it does not help if the quotes go out three days late. Fix the follow-up first. Then buy leads.

## The bottom line

On our campaign the first land clearing leads cost under $35 and we budget $125 to $150 after that. Whether that is cheap depends on your close rate, your typical job and your margin, and the calculator tells you in two minutes. If the lead is worth more than it costs, run the ads from an account you own. If it is not, the problem is the quote, not the lead.`,
  },
  {
    slug: "cheap-website-for-small-business-what-500-dollars-buys",
    title: "The $500 website: what it buys, what it costs later, and when it is the right call",
    description:
      "We have sold $500 websites and we have cleaned up after them. What a cheap site actually includes, the three things it almost never has, and how to tell when cheap is smart and when it is a trap.",
    publishedAt: "2026-10-09",
    readingMinutes: 9,
    ogImage: "/images/articles-v5/cheap-website-for-small-business-what-500-dollars-buys.jpg",
    tags: ["website", "small business website cost", "own your platform", "pricing", "lead capture"],
    tool: {
      slug: "website-grader",
      heading: "Score the site you have, or the one you are about to buy",
      intro:
        "Before you spend $500 or $5,000, check what the site actually does. The scorecard walks the things that turn a visitor into a call: speed on a phone, a price or a range, a form that goes somewhere, a text button, the business name and town where a search engine can read them. Score your current site, then score the proposal in front of you.",
      steps: [
        {
          name: "Open the site on your own phone, on cellular",
          text: "Not on the office Wi-Fi. Time how long until you can read the headline. Scroll to find a price and a way to contact you. The scorecard asks about what you actually saw, not what the designer promised.",
        },
        {
          name: "Check each box only if it is true today",
          text: "If the form exists but you are not sure where it sends, leave the box empty and go fill it out yourself. A form nobody receives is the most common defect in a cheap site and it looks fine from the outside.",
        },
        {
          name: "Score the proposal the same way",
          text: "Take the quote you were given and ask which boxes it would check. A site that checks the speed, price, form and phone boxes for $500 is a good deal. One that checks only 'looks nice' is a brochure.",
        },
      ],
      readIt: [
        "The score is not a grade on the design. It is a count of the jobs a website has to do before it earns its keep. Design is one of them, not all of them.",
        "Any miss on the form, the phone, or the price is a leak that costs more every month than the site cost once.",
        "If the current site scores well, do not rebuild it because someone offered you a cheaper one. Fix the misses.",
      ],
      formHeading: "Want a straight answer on what your website should cost?",
      formLead:
        "Tell us what you have now, what you want it to do, and what you have been quoted. We will tell you whether a cheap build fits, what has to be in it, and what we would charge for the version that captures and follows up. Totals and process, nothing you have to commit to.",
      interest: "website_launch",
      industry: "General small business",
    },
    charts: [
      {
        id: "whats-in-it",
        title: "What a $500 website usually includes, and what it usually does not",
        subtitle: "From the cheap sites we have built and the ones we have been hired to fix. Our experience, not a survey.",
        kind: "bars",
        unit: "text",
        bars: [
          { label: "A template, your logo and colors, five pages", value: 100, tone: "green", note: "Almost always included." },
          { label: "Your photos and your words on the pages", value: 60, tone: "gold", note: "Often it is the template's words with your name swapped in." },
          { label: "A contact form that lands somewhere a human checks", value: 35, tone: "red", note: "The most common silent failure. Fill it out yourself the day it launches." },
          { label: "A price or a range a customer can find", value: 20, tone: "red", note: "Rare, because nobody asked the owner for one." },
          { label: "A text-back or any follow-up when someone reaches out", value: 5, tone: "red", note: "Almost never. It was not in the quote." },
        ],
        max: 100,
        source: "our own builds and cleanups. The bar lengths are our rough sense of how often each item shows up, not measured percentages, which is why there are no numbers on them.",
        illustrative: true,
      },
      {
        id: "two-years",
        title: "What two years cost with each kind of site",
        subtitle: "A worked example for a service business that gets 20 inquiries a month from its website.",
        kind: "bars",
        unit: "money",
        bars: [
          { label: "The $500 build, plus a $25 builder plan for 24 months", value: 1100, tone: "gold" },
          { label: "Inquiries lost to a form nobody receives: 2 a month, 1 in 4 closes, $900 job, 24 months", value: 10800, tone: "red", note: "This is the line that makes a cheap site expensive." },
          { label: "A site you own with capture and follow-up built in, plus hosting", value: 4480, tone: "green", note: "The one-time build you keep, plus $20 a month of hosting." },
        ],
        max: 11000,
        source: "arithmetic in this article. The inquiry counts, close rate and job value are practice numbers. Replace them with yours.",
        illustrative: true,
      },
    ],
    faq: [
      {
        q: "Is a $500 website ever a good idea?",
        a: "Yes, in three cases. You are brand new and need a real address for your Google listing this week. You already have a phone and follow-up system and the site only needs to point at it. Or the $500 includes the four things that matter: fast on a phone, a price, a form that lands with a person, and a text button. In those cases cheap is smart. In every other case, cheap is a brochure with your name on it.",
      },
      {
        q: "What questions should I ask before I pay for a cheap site?",
        a: "Where does the form send, and can I test it before launch? Will my prices be on it? Who owns the domain and the hosting account when we are done? Can I take the site with me if I leave? What happens when someone fills out the form at 2 PM on a Tuesday? If the answers are vague, the price is not the problem.",
      },
      {
        q: "Why do agencies stop selling $500 websites?",
        a: "Because the site is never the whole job. The owner needs the site to produce calls, and a $500 build has no budget for the parts that produce calls, so the agency either does them for free or leaves them undone. We did both and learned the same lesson other builders learn: quote the whole system or quote nothing. That is better for the owner too, because a site that does not produce calls is not cheap at any price.",
      },
      {
        q: "What should a small business website cost in 2026?",
        a: "It depends on what it has to do, which is why we wrote a separate guide on it. The short version: a site that captures and follows up on leads, on accounts you own, costs more than a template once and less than a rented stack over three years. Run the scorecard on your current site, then price the misses, not the whole thing.",
      },
    ],
    body: `I have sold $500 websites. I have also been hired to clean up after them, sometimes the ones I sold. So this is not a lecture from someone who never took the cheap job. It is what the cheap job turns into, on both sides of the invoice.

## What $500 buys

A template. Your logo and colors on it. Five pages: home, about, services, gallery, contact. Launched in a week or two, often on a builder with a monthly plan on top of the $500.

{{CHART:whats-in-it}}

Look at the bottom three bars. The form, the price, and the follow-up are the parts of a website that turn a visitor into a phone call, and they are the parts a $500 build almost never has. Not because the builder is dishonest. Because they were not in the quote, and at that price there is no room to add them.

## The three things that are never in the quote

**Where the form goes.** The single most common defect we find on a cheap site is a contact form that sends to nobody: an old email, a spam folder, a builder notification that was never turned on. It looks perfect. Customers fill it out. Nothing happens. The owner concludes the website does not work, which is true, but not for the reason they think.

**A price.** Nobody asked the owner what things cost, so the services page says "contact us for a quote." Every customer who wanted a number before calling went to the competitor who published one. We wrote about why that matters more now in [how to get ChatGPT to recommend your local business](/articles/how-to-get-chatgpt-to-recommend-your-local-business): machines cannot summarize "call for pricing" either.

**What happens next.** A customer fills out the form at 2 PM on a Tuesday. The owner is on a job. The form email arrives at 2:01 and gets read at 9 PM. By then the customer has talked to someone else. A text-back and a call queue fix that, and they cost about as much as the site did, which is why they are never included.

## What it costs later

{{CHART:two-years}}

Practice numbers, and the chart says so. But the shape is the thing. The cheap site is cheap. The leaks are not. Two inquiries a month lost to a dead form, at a one-in-four close and a $900 job, is more money in two years than any website we have ever quoted. And that is one leak.

## When cheap is the right call

**You are new and need an address.** Your Google Business Profile needs a website. A fast five-page site with a phone number and real hours is better than nothing, as long as the form goes to a phone you check. Buy it, and plan the real build for when the jobs are coming in.

**You already own the system.** If calls and forms already land in a lead list with a text-back and a daily call queue, the website just has to point at it. A clean, fast, cheap site in front of a good system is a fine setup. The system is where the money was all along.

**The $500 includes the four things.** Fast on a phone. A price or a range on every service. A form you tested yourself. A text button. If a builder will do those for $500, pay them and send them more work.

## When cheap is a trap

When the quote is for "a website" and nobody has asked where the form goes, what your prices are, who owns the domain, or what happens when a lead arrives while you are working. That site will look fine and produce nothing, and you will spend the next two years believing websites do not work for your trade.

Score what you have, or what you are being offered, before you decide.

{{TOOL}}

## What we do now, and why

We stopped quoting websites by themselves. We learned it the expensive way: a $500 site turns into $2,000 of unpaid fixes when the owner, reasonably, expects it to produce calls. Now we quote the system: the site, the forms, where they land, the text-back, the call queue, and who owns every account at the end. It costs more than $500 once. It costs less than a rented stack over three years. And the owner keeps it.

We laid out what a full build should cost and why in [how much does a small business website actually cost in 2026](/articles/small-business-website-cost).

## The bottom line

A $500 website is a template with your name on it. That is fine if you only need an address, or if the system behind it is already built. It is a trap if you expect it to bring customers, because the parts that bring customers were never in the price. Check the form, the price, the phone and the follow-up before you buy anything, and if a cheap site has all four, it is not cheap. It is a bargain.`,
  },
  {
    slug: "hvac-ai-answering-service-cost",
    title: "What an AI answering service costs an HVAC or plumbing company, and what it should say",
    description:
      "Jobber's AI receptionist is $29 a month for 30 conversations, then 79 cents each. The real math for a service company, what a good AI answer sounds like, and when a text-back is enough.",
    publishedAt: "2026-10-09",
    readingMinutes: 10,
    ogImage: "/images/articles-v5/hvac-ai-answering-service-cost.jpg",
    tags: ["ai receptionist", "missed calls", "hvac", "plumbing", "phone", "ai for small business"],
    tool: {
      slug: "hire-vs-automate",
      heading: "Compare a person on the phone with a system on the phone, in dollars",
      intro:
        "The honest comparison is not AI against nothing. It is AI against the dispatcher or office hire you would otherwise make, against the share of calls each one can handle. Put in the loaded cost of the hire, the one-time cost to set a system up, its monthly cost, and the share of the work a system can really do. The calculator shows the break-even. It cannot tell you how your customers feel about talking to a machine, so read the section on that before you decide.",
      steps: [
        {
          name: "Use the loaded cost of the person, not the wage",
          text: "Wage plus payroll taxes, plus the hours they are paid when the phone is quiet. A part-time office hire at $18 an hour, 25 hours a week, is roughly $27,000 a year loaded. Use your own number.",
        },
        {
          name: "Enter the real cost of the system",
          text: "Setup is the one-time cost to connect it to your phone line, your calendar and your lead list. Monthly is the subscription plus the per-conversation charges at the volume you actually get, not the included 30.",
        },
        {
          name: "Be honest about the share a system can handle",
          text: "An AI can book a maintenance visit, take a message, and give a price range. It cannot talk a scared homeowner through a gas smell or decide whether to send the truck tonight. For most service companies the honest share is 50 to 70 percent of call volume, not 100.",
        },
      ],
      readIt: [
        "The break-even is the number of calls a month where the system and the person cost the same. Below it, a text-back and your own phone may be enough. Above it, the system pays for itself even before you count the calls it saves.",
        "If the share a system can handle is low, the calculator will tell you to hire. Believe it. A machine that mishandles emergencies costs more than it saves.",
        "The best setup for most shops is both: a system that answers instantly and books the routine calls, and a person who gets the hard ones.",
      ],
      formHeading: "Want your phone answered in seconds without sounding like a robot?",
      formLead:
        "Tell us how many calls a day you get, how many you miss, who answers now, and what your busiest week looks like. We will show you the setup we run (text-back first, AI for routine booking, a person for the rest), on a line you own, and quote it. No customer details needed.",
      interest: "system_map",
      industry: "HVAC and plumbing",
    },
    charts: [
      {
        id: "jobber-cost",
        title: "What Jobber's AI receptionist costs at three call volumes",
        subtitle: "Monthly add-on cost: $29 for 30 conversations, then $0.79 per conversation. Requires a Jobber plan on top.",
        kind: "bars",
        unit: "money",
        bars: [
          { label: "30 conversations a month (slow month)", value: 29, tone: "blue", note: "Covered by the base fee." },
          { label: "100 conversations a month", value: 84.3, tone: "blue", note: "$29 plus 70 at $0.79." },
          { label: "300 conversations a month (summer)", value: 242.3, tone: "gold", note: "$29 plus 270 at $0.79. Plus the Jobber subscription itself." },
        ],
        max: 260,
        source: "Jobber add-on pricing as read by FitMyCall on September 4, 2026 ($29 a month for 30 conversations, $0.79 each after). The volume math is ours. Jobber's Plus plan includes the receptionist with unlimited use at a higher monthly price.",
      },
      {
        id: "cost-of-silence",
        title: "What a month of missed calls costs next to any answering option",
        subtitle: "A worked example: 40 missed calls a month, 30 percent close rate, $650 average ticket.",
        kind: "bars",
        unit: "money",
        bars: [
          { label: "Revenue walking out the door from 40 missed calls", value: 7800, tone: "red", note: "40 calls, 30 percent would have booked, $650 each." },
          { label: "AI receptionist at 100 conversations", value: 84, tone: "green" },
          { label: "Text-back on your business line", value: 25, tone: "green", note: "A typical business texting line. It answers in seconds but it does not book." },
          { label: "Part-time office hire, one month, loaded", value: 2250, tone: "gold", note: "Also does invoicing, scheduling and the hard calls." },
        ],
        max: 8000,
        source: "arithmetic in this article. Missed-call counts, close rate and ticket are practice numbers for your calculator to replace.",
        illustrative: true,
      },
    ],
    sources: [
      {
        label: "FitMyCall: Jobber AI Receptionist pricing",
        url: "https://fitmycall.com/jobber-ai-receptionist/pricing/",
        date: "prices read September 4, 2026",
      },
      {
        label: "PPC Land: Google LSA advertisers face missed call charges from October 1",
        url: "https://ppc.land/google-lsa-advertisers-face-missed-call-charges-from-october-1/",
        date: "September 25, 2026",
      },
    ],
    faq: [
      {
        q: "How much does an AI answering service cost for an HVAC company?",
        a: "The add-on from Jobber was $29 a month for 30 conversations and $0.79 for each one after that when FitMyCall read the price in September 2026, on top of a Jobber subscription. Other field service platforms price their own versions differently, and standalone AI receptionists range from tens to several hundred dollars a month depending on minutes. Work out your real monthly volume before comparing, because the per-conversation charges are where a summer bill lives.",
      },
      {
        q: "Will customers hang up on an AI?",
        a: "Some will, and more will hang up on a voicemail. The ones who stay are the ones who get a useful answer in the first sentence: who they reached, that a person will call back, and the chance to book or leave details. Keep the script short, make it easy to reach a human, and never let the AI pretend to be one. Texas also has an AI law in effect this year that touches disclosure in some settings, so ask a lawyer if you are in healthcare or deal with sensitive data.",
      },
      {
        q: "Is a text-back enough instead of an AI receptionist?",
        a: "For a lot of small shops, yes, for now. A text inside a minute that says who you are and what happens next keeps most callers from dialing the next company, and it costs almost nothing. Add an AI receptionist when the volume of routine booking calls is large enough that a person cannot keep up, or when Google's new Local Services Ads rule means every call that rings through to voicemail during business hours costs you a lead charge.",
      },
      {
        q: "What should the AI never handle?",
        a: "Anything that smells like an emergency: gas, flooding, no heat with an infant in the house. The script should recognize those words and ring a human immediately. It also should not quote firm prices on work it cannot see, promise arrival times nobody confirmed, or take payment. Those are the calls that build or break your reputation, and a machine should hand them off.",
      },
    ],
    body: `Every field service platform now sells an AI that answers your phone. Jobber's add-on, when FitMyCall read the price in September 2026, was $29 a month for 30 conversations and 79 cents for every conversation after that, on top of the Jobber plan itself. Housecall Pro and ServiceTitan have their own. So do a dozen standalone companies that will call you after you read this.

I set up phones for service businesses, and I have one of these answering a line right now. So here is the math nobody puts on the pricing page, what a good AI answer actually sounds like, and when a sixty-second text does the same job for a fraction of the cost.

## The pricing page versus the summer bill

{{CHART:jobber-cost}}

Thirty conversations a month is a slow month for a one-truck shop and a slow day for a busy one. At 100 conversations the add-on is about $84. At 300, which is a normal July for an HVAC company in Texas, it is about $242, plus the platform subscription underneath. Jobber includes unlimited use on its higher plan, which is a different bill.

None of those numbers are unreasonable. They are just not $29. Price the volume you actually get in your busiest month, because that is the month you need it.

## The cost of saying nothing

The comparison that matters is not AI against free. It is AI against what silence already costs you.

{{CHART:cost-of-silence}}

Practice numbers, and the chart says so. Forty missed calls a month, three in ten of which would have booked a $650 job, is $7,800 of work that went to whoever answered. Against that, every option on the chart is cheap. The question is which one fits your volume and your customers, and the calculator below will tell you where a system and a person cost the same.

{{TOOL}}

And there is a new line on this bill since October 1. Google's Local Services Ads now charges you for a business-hours call you did not answer if the caller holds past 20 seconds. We covered it in [Google Local Services Ads now bills you for missed calls](/articles/google-local-services-ads-missed-call-charges). If you run LSA, a ring that goes to voicemail is now a lead charge plus a lost job.

## What a good AI answer sounds like

Most of these systems ship with a script written by someone who has never dispatched a truck. Rewrite it. Here is the shape we use.

**Say who they reached in the first sentence.** "You've reached Nichols Heating and Air in Longview." Not a greeting, not "thank you for calling," the name. Callers decide in two seconds whether they dialed right.

**Say it is an assistant and that a person will call back.** "I'm the scheduling assistant. I can book a visit now or have a technician call you back within the hour." Never let it pass for a human. People forgive a machine that says so and resent one that does not.

**Ask the three things, in order.** What is going on, where, and when they want someone. That is enough to book or to triage.

**Give a range, not a quote.** "Service calls are $89 and most repairs run $250 to $900 depending on the part." A range answers the question customers actually have. A firm number on work nobody has seen is a promise you will break.

**Hand off emergencies instantly.** Gas smell, water coming in, no heat with a baby in the house. The script should hear those words and ring a human. If the human does not pick up, the system texts the caller and rings the next human. No machine should ever be the last stop on an emergency.

**Confirm by text.** Whatever was booked or promised, the caller gets a text with it before they hang up. Now the conversation lives on your line, where you can see it.

## When a text-back is enough

For a shop with a handful of missed calls a day and an owner who returns them inside the hour, a text-back does most of the work for almost nothing. The text arrives while the caller is still holding the phone. It says who you are and that you will call back by a time. Most people wait.

Add the AI when the routine calls (book a tune-up, reschedule Thursday, what do you charge) outnumber the ones that need a human, or when you are missing calls faster than one person can return them. That is a volume question, and the calculator is how you answer it.

## When to hire instead

If the share of calls a machine can handle is low in your business, because your calls are complicated or your customers are older and hate menus, the calculator will tell you to hire, and it will be right. A part-time office person also does invoicing, scheduling, and the hard calls. The best setup we see at growing shops is both: the system answers in seconds and books the routine, the person gets the rest and the whole day's list.

## What this does not fix

An AI receptionist that books a visit nobody shows up for is a new kind of missed call. The system has to land on a calendar someone owns and a lead list someone works. And it does not fix a line nobody registered: if your business texts are not registered with the carriers, the confirmation texts will not arrive and you will not know. The Texas texting checklist is in [the texting checklist for a Texas business owner](/articles/texas-sb-140-business-texting-checklist).

## The bottom line

An AI answering service costs more than its pricing page says and far less than the calls you are missing. Price it at your busiest month, rewrite the script so it says who you are and hands off emergencies, start with a text-back if your volume is small, and put the whole thing on a phone line and a lead list you own. The form above is how you ask us to set it up. The calculator is how you check the math first.`,
  },
];
