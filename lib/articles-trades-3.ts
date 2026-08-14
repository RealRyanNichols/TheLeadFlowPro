// Trade-specific tool articles, batch three.
//
// Same shape as batches one and two, ten more trades, ten more tools that had
// no article pointing at them:
//   hook -> the honest answer -> {{TOOL}} -> what to do with the number -> FAQ.

import type { Article } from "./articles";

export const TRADE_ARTICLES_3: Article[] = [
  {
    slug: "plumber-call-back-speed",
    title: "How fast does a plumber have to call back?",
    description:
      "A homeowner with water on the floor calls until somebody answers, then stops. Work out what your call-back time costs you and what getting faster is worth.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/plumber-call-back-speed.jpg",
    tool: {
      slug: "lead-response-time",
      heading: "Price out how long you take to call back",
      intro:
        "Put in how many leads you get, how long they wait, and what a job is worth. It shows what the delay costs, which in an emergency trade is usually the largest single number in the business.",
      steps: [
        {
          name: "Count real leads, not calls",
          text: "Missed calls, voicemails, web forms and texts from people who wanted a plumber. Not suppliers, not spam, not the same person calling three times.",
        },
        {
          name: "Use your actual response time, from the timestamps",
          text: "Not what it feels like. Look at when the call came in and when somebody spoke to them. If a form comes in at two and you reply at six, that is four hours, and that is the number that matters.",
        },
        {
          name: "Use a blended job value",
          text: "Take last year's revenue and divide by the number of jobs. Blend the drain clears with the repipes. A blended average is honest and stops the math being driven by one big job.",
        },
        {
          name: "Enter close rate now, and close rate if you were first",
          text: "Be honest about both. In emergency plumbing, being the first person to answer is close to decisive, which is exactly why the gap between those two numbers is so expensive.",
        },
      ],
      readIt: [
        "The gap between your two close rates, multiplied by your lead volume and job value, is what speed is worth. It is almost always larger than what the fix costs.",
        "Look at the per-week number rather than the annual one. Per week is small enough to believe and big enough to act on tomorrow.",
        "If you are running ads, divide your ad spend by leads that reached a human, not leads that came in. That is your real cost per lead and it is usually a shock.",
      ],
      formHeading: "Want the phone fixed?",
      formLead:
        "Tell me your number and how calls are handled now. I will tell you the smallest change that closes most of the gap, and whether it needs anything beyond the line you already have.",
      interest: "build_with_you",
      industry: "Plumbing",
    },
    faq: [
      {
        q: "How fast is fast enough?",
        a: "Faster than the next plumber on the list. For emergency work that is minutes. A homeowner with a leak is calling down a search results page and stops at the first human voice, usually before price is ever discussed.",
      },
      {
        q: "I am under a house. How am I supposed to answer?",
        a: "You are not. An automatic text back from your business number within seconds does the holding for you. It keeps the conversation on your number while you finish what you are doing, and it costs almost nothing.",
      },
      {
        q: "Does an answering service solve it?",
        a: "It stops the ring-out, which is most of the bleed, but a service that only takes a message still leaves the customer calling down the list while they wait. Booking beats messaging. If you use a service, give them access to your calendar.",
      },
      {
        q: "What about after hours?",
        a: "Decide whether you want that work, then be honest on the line about it. A recording that says somebody will call before seven in the morning beats a generic voicemail. What loses jobs is silence, not closed hours.",
      },
    ],
    body: `
Somebody has water coming through a ceiling. They are not researching. They are not comparing reviews. They have a phone in one hand and a bucket in the other, and they are calling plumbers in the order Google listed them.

The first one who answers gets the job. Not the best one. Not the cheapest one. The one who picked up.

## Why this trade is the extreme case

Every service business loses money to slow response. Plumbing loses more, for three reasons that stack.

**The urgency is real.** Nobody schedules a burst pipe for next Tuesday. The decision window is minutes.

**The tickets are large and unplanned.** People who did not budget for this are not shopping carefully. They are shopping fast.

**You are physically unable to answer.** Under a sink, in a crawlspace, on a roof, hands wet, phone in the truck. The hours the phone rings hardest are exactly the hours you cannot pick it up.

Put those together and the calls you miss are worth more on average than the calls you take, because they cluster in your busiest hours.

{{TOOL}}

## The fix, cheapest first

**1. Missed call text back.** Within seconds of a missed call, your business number sends a text. "This is Ryan, sorry I missed you, what is going on?" You have kept the conversation on your number while they still have the phone in their hand. This is the single highest return change in the trade and it costs almost nothing.

**2. One inbox for everything.** Calls, texts and web forms landing in one place that more than one person can see. Otherwise half your customer history lives on somebody's personal phone and leaves when they do.

**3. A real after-hours answer.** Either a person, or a message with an actual time in it. "Somebody will call you before seven" beats "leave a message" every time, because it stops them dialing the next number.

**4. Only then, more people.** Hiring somebody to answer a phone that a cheap automation would have handled is how a plumbing company ends up with overhead it cannot cover in a slow month.

## The part that changes your marketing

If you are buying leads or running ads, every dollar is buying calls. If a share of those calls ring out, you did not buy calls. You bought the sound of a phone ringing.

Divide your ad spend by the leads that actually reached a human and you have your real cost per lead. For a lot of plumbing companies that number is double what they thought, and no amount of ad optimisation fixes it. The phone does.

Fix the phone before you touch the budget. It is cheaper, it works immediately, and it makes everything you already spend work better.
`,
  },

  {
    slug: "electrician-job-capacity",
    title: "How many jobs can an electrician actually run in a week?",
    description:
      "Booking more work than you can deliver is how good electricians end up with bad reviews. Work out your real weekly capacity before you say yes to another job.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/electrician-job-capacity.jpg",
    tool: {
      slug: "capacity-calculator",
      heading: "Work out what your week can actually hold",
      intro:
        "Crew hours available, average hours per job, and the time that disappears into things that are not the job. What comes out is the number of jobs you can genuinely deliver in a week.",
      steps: [
        {
          name: "Count crew hours, not clock hours",
          text: "Number of people who actually turn wrenches, times the hours they are on site. The office does not count and neither do you if you spend the day quoting.",
        },
        {
          name: "Use the real average hours per job",
          text: "Look back at your last twenty jobs and average them. Include the ones that went long, because those are the ones that eat a week.",
        },
        {
          name: "Take out everything that is not the job",
          text: "Drive time, supply house runs, permits and inspections, quoting, and the callback on last month's work. In most electrical shops this is a large share of the day and it is why the calendar lies.",
        },
        {
          name: "Leave room for the emergency",
          text: "Something will come up. If your week is booked to a hundred percent, one urgent call blows up four appointments and you spend the day apologising instead of working.",
        },
      ],
      readIt: [
        "The job count is what you can deliver well, not what you can cram in. Booking above it is how you turn a scheduling problem into a reputation problem.",
        "Compare it to what you actually booked last week. If you booked more, that is where the late arrivals and the missed windows came from.",
        "Run it with one more person on the crew. That tells you what a hire would add in delivered jobs, which is a far better basis for that decision than a gut feeling.",
      ],
      formHeading: "Want the scheduling looked at?",
      formLead:
        "Send me your capacity number and what you are booking now. I will tell you whether the answer is a hire, a dispatch change or just saying no more often.",
      interest: "blueprint",
      industry: "Electrical",
    },
    faq: [
      {
        q: "Should I book to a hundred percent of capacity?",
        a: "No. Leave a buffer for emergencies and overruns. A shop booked to the limit is one urgent call away from a day of angry customers, and in this trade the angry customer is the one who writes the review.",
      },
      {
        q: "What if I turn work away and they never come back?",
        a: "Some will not. But a customer who was told honestly that you are booked until Thursday is far more likely to come back than one who was promised Tuesday and got Friday. Overpromising costs more customers than saying no does.",
      },
      {
        q: "Does more capacity mean hiring?",
        a: "Sometimes. Very often the first several hours a week come back from routing, from a supply list that stops the extra trip, and from quoting in a block rather than between jobs. Look at the unbillable time before you look at payroll.",
      },
      {
        q: "How do I handle service calls and project work together?",
        a: "Separate them. Trying to run both out of one calendar means the service calls constantly interrupt the projects and both run late. Most shops that grow past a couple of trucks end up dedicating people to one or the other.",
      },
    ],
    body: `
The phone rings and it is work. Good work, from a customer you want.

You look at the calendar, see some white space on Thursday, and say yes.

Then Thursday arrives, the panel change from Wednesday ran three hours over, the supply house did not have the breaker, and you are calling somebody to say you are not coming. That customer will remember that phone call much longer than they will remember the job.

## Capacity is not the white space on the calendar

The calendar shows hours. It does not show the drive to the far side of the county, the supply run, the inspection you have to be present for, the quote you promised by Friday, or the twenty minutes on the phone with a customer about work you did last month.

All of that is real, all of it consumes the day, and none of it appears in the block you just filled.

Which is why shops that look busy on paper feel overwhelmed in reality. The calendar was measuring the wrong thing.

{{TOOL}}

## What to do with the number

**If you are booking above it**, that is where your late arrivals come from. Not from bad luck. From arithmetic. Book at or under capacity and the same crew delivers the same work without the apologies.

**If you are booking well under it**, you have room and the constraint is demand. That is a marketing and response speed problem, not a delivery problem, and the fix is completely different.

**If capacity is lower than you expected**, look at what is eating the day before you look at hiring. In most electrical shops the biggest single loss is trips to the supply house, and the fix is a proper material list at quoting time rather than a discovery at nine in the morning.

## The three hours nobody counts

**Supply runs.** Two a week at forty-five minutes each is most of a job's worth of time.

**Quoting between jobs.** Stopping to write a quote in the truck costs more than the quote is worth. Block it. One or two windows a week, everything gets done then.

**Callbacks.** Every callback is unbillable time on work you already delivered. If callbacks are eating real hours, that is a quality or a documentation problem showing up as a capacity problem.

## Why this matters more as you grow

At one truck, you feel capacity directly. When the day is full, you know.

At three trucks, you do not feel it any more. Dispatch fills the calendar, the crews absorb the overrun, and nobody tells you that everybody is running late every day until the reviews start arriving.

Knowing the number and dispatching to it is what separates a shop that grows cleanly from one that grows into chaos.
`,
  },

  {
    slug: "painting-contractor-markup-vs-margin",
    title: "Markup and margin are not the same thing, and it is costing painters money",
    description:
      "Adding fifty percent to your costs does not give you a fifty percent margin. Here is the difference, why it matters on every paint job, and a converter for it.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/painting-contractor-markup-vs-margin.jpg",
    tool: {
      slug: "markup-vs-margin",
      heading: "Convert markup to margin, and back",
      intro:
        "Put in the markup you have been adding and see the margin it actually produces. Then work backwards from the margin you need to the markup that gets you there.",
      steps: [
        {
          name: "Start with your true job cost",
          text: "Paint, sundries, sprayer wear, masking, labor at the loaded rate, and the drive. This is the number the markup gets applied to, so if it is wrong nothing after it can be right.",
        },
        {
          name: "Put in the markup you currently add",
          text: "Whatever you have been doing. Fifty percent, a third, double the material. Whatever it is, put in the real one, not the one you meant to use.",
        },
        {
          name: "Read the margin it actually produces",
          text: "This is the moment most painters find the gap. A fifty percent markup does not produce a fifty percent margin. It never has.",
        },
        {
          name: "Work backwards from the margin you need",
          text: "Decide the margin the business has to make to cover overhead and slow months, then take the markup the tool gives you and use that number on every quote.",
        },
      ],
      readIt: [
        "Markup is on cost. Margin is on price. They are different numbers and the difference grows as the percentage grows, which is why it bites hardest on your biggest jobs.",
        "If you have been quoting on markup and thinking in margin, you have been earning less than you believed on every single job for as long as you have been doing it.",
        "Once you know the markup that produces the margin you need, it becomes one number you apply every time instead of a decision you make while the customer watches.",
      ],
      formHeading: "Want your quoting rebuilt around it?",
      formLead:
        "Send me your cost, your markup and what you thought you were making. I will show you the gap and what to change on your next quote, and it is usually one number.",
      interest: "blueprint",
      industry: "Painting",
    },
    faq: [
      {
        q: "What is the actual difference?",
        a: "Markup is calculated on what the job cost you. Margin is calculated on what you charged. A hundred dollar cost marked up fifty percent is a hundred and fifty dollar price, and the fifty dollars of profit is a third of that price, not half. So a fifty percent markup is a thirty-three percent margin.",
      },
      {
        q: "Which should I quote from?",
        a: "Quote from markup, because it is applied to a number you know at quoting time. Manage the business on margin, because that is what actually pays overhead. The converter is how you keep the two honest with each other.",
      },
      {
        q: "What margin should a painting business run at?",
        a: "There is no universal answer, and anybody quoting you one without knowing your overhead, your crew structure and your market is guessing. Work out what your overhead and your own pay require, then set the margin that covers it.",
      },
      {
        q: "Does this apply to material and labor differently?",
        a: "Many painters mark them up at different rates, and that is fine. Just run each through the same conversion so you know the blended margin on the job rather than assuming it.",
      },
    ],
    body: `
This is the most expensive arithmetic mistake in the trades and almost nobody notices they are making it.

A painter figures the job costs two thousand in paint and labor. He adds fifty percent. Quotes three thousand. In his head, he made fifty percent.

He made a thousand dollars on a three thousand dollar job. That is a thirty-three percent margin, not fifty.

Every job. For years.

## Why it matters more than it sounds

If you set your overhead, your slow-season cushion and your own pay based on a margin you are not actually earning, the shortfall shows up somewhere. Usually in a winter where the work slowed down and there was less put away than expected.

And the gap grows with the percentage. A twenty-five percent markup is a twenty percent margin, which is close enough to feel harmless. A hundred percent markup is a fifty percent margin. The bigger the number you thought you were earning, the further off you were.

{{TOOL}}

## The order to do this in

**One. Get your true cost right.** Everything after this is built on it. Paint, sundries, tape, plastic, sprayer tips, equipment wear, labor at what it actually costs you including taxes and insurance, and the drive.

Most painters underestimate labor because they price it at what they pay the crew rather than what the crew costs the business.

**Two. Decide the margin the business needs.** Not wants. Needs. Enough to cover overhead across the year including the months where nobody is painting anything, plus your pay, plus something for the truck when it dies.

**Three. Convert that margin into a markup.** Now you have one number that goes on every quote. No decision to make in front of the customer, no negotiating with yourself.

## Where painters lose the margin they set

**The extra coat.** It was not in the quote. It went on anyway. Put an allowance in or put it in writing that it is extra.

**Prep that was worse than the walk-through.** Old wallpaper, damage under the paint, surfaces that need more than a scuff. Your estimate should say plainly that the price assumes normal prep and that anything beyond it gets quoted before it starts.

**The friendly discount.** The last five percent given away at the end of a conversation comes straight off the margin, not off the price. On a thirty percent margin, giving away five percent of the price is giving away a sixth of your profit.

**Change orders that never got written.** They asked for the trim too. You said sure. Write it down and price it, every time.

## The one number to leave with

Work out the markup that produces the margin you need, write it on something you will see, and use it on every quote from tomorrow.

It is the cheapest raise in the business, because nothing about the work has to change.
`,
  },

  {
    slug: "barbershop-booth-rent-vs-commission",
    title: "Booth rent or commission: which pays a barbershop more?",
    description:
      "Booth rent is predictable. Commission scales. Work out what each one actually pays your shop at your chair count and your service prices before you pick.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/barbershop-booth-rent-vs-commission.jpg",
    tool: {
      slug: "commission-calculator",
      heading: "Run the commission math",
      intro:
        "Put in what a barber produces and the split you are considering. Compare what the shop keeps against what a booth rent would have brought in at the same chair.",
      steps: [
        {
          name: "Use what a chair actually produces in a month",
          text: "Services plus product, from a real month. Not a barber's best week and not what you hope a new hire will do.",
        },
        {
          name: "Enter the split you are considering",
          text: "The shop's percentage. If you cover product, supplies or card processing out of the shop's side, note that, because it comes off your share and not theirs.",
        },
        {
          name: "Compare against the booth rent you could charge",
          text: "What could you realistically get for that chair per week in your market? That is the alternative, and it is the number commission has to beat.",
        },
        {
          name: "Run it at a low producer and a high producer",
          text: "This is the whole point. Commission and rent cross over at some level of production, and knowing where that line sits tells you which model fits which barber.",
        },
      ],
      readIt: [
        "Below the crossover, booth rent pays the shop more. Above it, commission does. That single line is the decision.",
        "Booth rent is steady and low ceiling. Commission is variable and shares the upside. Which one is right depends on how confident you are in the chair, not on which is fashionable.",
        "Whatever the math says, classification is a separate legal question and it is not optional. Read the FAQ below before you decide anything.",
      ],
      formHeading: "Want the shop's numbers looked at?",
      formLead:
        "Send me what a chair produces and what you are considering. I will tell you where your crossover sits and which chairs belong on which model.",
      interest: "unsure",
      industry: "Barbershop and salon",
    },
    faq: [
      {
        q: "Is booth rent or commission legally simpler?",
        a: "Neither is automatically simple, and getting it wrong is expensive. Whether somebody is an employee or an independent contractor depends on how much control you have over their hours, prices, products and methods, and the tests differ between the IRS and your state. A booth renter who has to work your hours at your prices with your products may not be a renter in the eyes of the law regardless of what the agreement says. Talk to an employment attorney or accountant in your state before you set this up.",
      },
      {
        q: "Which model attracts better barbers?",
        a: "It depends on the barber. Established barbers with a full book usually prefer booth rent because they keep the upside. Newer barbers often prefer commission because there is no fixed cost in a slow week. Many shops run both.",
      },
      {
        q: "Can I run both in one shop?",
        a: "Plenty do, and the math above is exactly how you decide who goes where. Just be careful that the two groups are genuinely treated differently in practice, not just on paper, because that difference is what the classification tests look at.",
      },
      {
        q: "What about product sales?",
        a: "Decide it explicitly and write it down. Retail is often the difference between a chair being worth having and not, and an unclear product arrangement is the most common source of arguments in this trade.",
      },
    ],
    body: `
Every shop owner has this argument with themselves eventually.

Booth rent means a known number lands every week whether the chair was busy or not. Commission means the shop shares the upside when a barber is packed and shares the pain when they are not.

Both work. They just work at different levels of production, and the crossover is a number you can find in about three minutes.

## What each model actually does

**Booth rent** is a fixed, predictable payment. You are essentially a landlord. Your income does not move when a barber has a great month, and it does not move when they have a terrible one either. The ceiling is the rent.

**Commission** ties the shop's income to what the chair produces. A busy barber pays the shop far more than rent would have. A slow one pays less, and in a really slow month, close to nothing.

There is a production level where the two lines cross. Below it, rent wins for the shop. Above it, commission wins.

{{TOOL}}

## What the crossover tells you

Once you know the line, the decision stops being a philosophy argument and becomes a sorting exercise.

**A barber consistently producing above the crossover** is worth more to you on commission, and is usually worth more to themselves on rent. That tension is real and it is why established barbers push for booth rent. Sometimes the right answer is to let them rent and keep the chair filled.

**A barber below the crossover** is worth more to you on rent, but rent is the model most likely to make them leave, because a fixed weekly cost in a slow month is frightening when your book is not full. Commission keeps them in the chair while they build.

**A new barber with no book** is almost always commission, because rent will break them before they establish, and an empty chair pays you nothing either way.

## The costs that decide it

Run the numbers again with these in, because they change the answer.

**Product and supplies.** If the shop buys them on commission chairs and the renters buy their own, that comes off your commission side and belongs in the comparison.

**Card processing.** Whoever eats the percentage should have it in their column.

**Marketing.** If you advertise the shop and fill the chairs, you are producing value the renters get for free. That is a legitimate argument for commission or for a higher rent.

**Front desk and booking.** Same thing. Somebody is answering that phone.

## The part that is not optional

The math tells you which model pays better. It does not tell you which one you are legally allowed to use.

Employee versus independent contractor is a legal test, not a preference, and it turns on how much control you exercise. If you set the hours, set the prices, provide the products and decide how the work gets done, you may have an employee no matter what the paperwork calls them. Misclassification penalties are serious and they land on the shop, not the barber.

Spend an hour with an employment attorney or an accountant in your state before you restructure anything. Do the math first so you know what you want, then get it set up correctly. In that order.
`,
  },

  {
    slug: "chiropractor-google-business-profile",
    title: "Your Google Business Profile matters more than your website",
    description:
      "Most people looking for a chiropractor never reach your site. They decide from the map result. Score your profile and fix what is costing you the click.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/chiropractor-google-business-profile.jpg",
    tool: {
      slug: "google-business-profile-scorecard",
      heading: "Score your profile",
      intro:
        "Work through it with your actual profile open in another tab. It takes about five minutes and it finds the gaps that are costing you calls before anybody ever sees your website.",
      steps: [
        {
          name: "Open your profile as a stranger sees it",
          text: "Search your practice name in an incognito window, or on your phone with a map search for chiropractor near me. Look at what a new patient sees, not what your dashboard shows you.",
        },
        {
          name: "Check the basics first",
          text: "Hours including holidays, phone number, whether the booking link works, categories, and the address. Wrong hours are the single most common and most expensive error in this trade.",
        },
        {
          name: "Look hard at the photos",
          text: "Interior, exterior, the front desk, the treatment rooms, and the team. New patients are deciding whether a place feels clean and professional, and stock imagery does not do that job.",
        },
        {
          name: "Score reviews on recency, not just count",
          text: "A profile with steady recent reviews reads as a busy practice. One with more total reviews that stopped two years ago reads as closed. And every review should have a reply.",
        },
      ],
      readIt: [
        "The low scores are your list. Work top down and most of them are twenty minute fixes you can do this afternoon.",
        "Anything to do with hours, phone and booking comes first. Those are not ranking factors, they are people trying to give you money and failing.",
        "Re-score quarterly. Profiles drift, hours change, categories get added by Google, and photos go stale.",
      ],
      formHeading: "Want the local side handled?",
      formLead:
        "Send me your score and what came out lowest. I will tell you what to fix first and what is genuinely not worth your time, which is more of it than most agencies will admit.",
      interest: "build_with_you",
      industry: "Chiropractic and physical therapy",
    },
    faq: [
      {
        q: "Does the profile matter more than the website?",
        a: "For getting the first call, usually yes. A large share of local searchers decide from the map result and call directly without ever loading a website. The site matters for the people who do click through and for building trust, but the profile is what gets seen first.",
      },
      {
        q: "How often should I post to the profile?",
        a: "Regularly enough that it does not look abandoned. Consistency matters more than frequency, and a post about a new service or a schedule change is more useful than filler.",
      },
      {
        q: "What is the most common mistake?",
        a: "Wrong or incomplete hours, especially around holidays. Somebody drives to your office, finds it closed, and you have lost them permanently and possibly earned a review about it.",
      },
      {
        q: "Should I reply to every review?",
        a: "Yes, and keep it short. For health practices be careful not to confirm that a reviewer is a patient or discuss any detail of their care, because privacy rules apply to your reply as much as anywhere else. Thank them, keep it generic, and take anything specific offline.",
      },
    ],
    body: `
Think about how somebody actually finds a chiropractor.

Their back hurts. They pick up their phone. They search chiropractor near me. They get a map with three results, each with a star rating, a distance, hours, and a call button.

They tap one. They call. They book.

At no point in that sequence did anybody visit a website.

## Where the money actually is

This is the part that catches practices that have spent real money on a site. The website is doing a job, but it is the second job. The first job belongs entirely to your Google Business Profile, and for most practices it is the least maintained asset they own.

It also happens to be free, and fixable in an afternoon.

{{TOOL}}

## Fix these in this order

**1. Anything that stops a phone call.** Wrong hours, a phone number that goes to a line nobody answers, a booking link that is broken or points at an old system. These are not ranking issues. These are people actively trying to become patients and failing. Fix them today.

**2. Holiday hours.** Set them in advance for the whole year. A patient who drives to a closed office on a day your profile said open is a patient you have lost, and often a review you did not want.

**3. Photos of the actual place.** Exterior so they can find it. Interior so they know what they are walking into. Treatment rooms. The front desk. The team. New patients, especially for a hands-on health service, are deciding whether this place looks clean, professional and welcoming. Stock photography actively hurts here because people recognise it.

**4. Categories.** Primary category matters. Secondary categories should reflect what you actually do. Get this wrong and you are invisible for searches you should own.

**5. Reviews, recent and answered.** Recency reads as alive. Volume without recency reads as closed. And every single review gets a reply, including the bad ones, because you are writing for the next hundred people who read it, not for the reviewer.

There is a [free review link and QR maker on this site](/tools/google-review-link) that gets the ask down to one tap, which is most of the battle.

## The privacy thing, because this is healthcare

Be careful replying to reviews. Do not confirm somebody is a patient, do not reference their condition, do not discuss their treatment, do not argue about the facts of their visit. Even when a review is unfair and you could correct the record, the reply is public and privacy obligations apply.

The safe reply is short, warm, generic and offers to talk offline. It reads well to strangers and it keeps you out of trouble.

## What this is worth

A practice that fixes hours, adds real photos, gets the categories right and starts answering reviews usually sees the phone move within weeks. Not because of an algorithm trick, but because more of the people who were already finding them now have a reason to tap call instead of tapping the next result.

It costs nothing but an afternoon, which makes it the highest return marketing work available to a local health practice.
`,
  },

  {
    slug: "towing-truck-downtime-cost",
    title: "What a truck being down costs a towing company",
    description:
      "A wrecker in the shop is not just a repair bill. Work out what the lost calls, the turned-down work and the idle driver actually cost per day.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/towing-truck-downtime-cost.jpg",
    tool: {
      slug: "downtime-cost-calculator",
      heading: "Price out a day with the truck down",
      intro:
        "Revenue per truck per day, the fixed costs that keep running, and how long it is out. The repair bill is usually the smallest part of what a breakdown costs you.",
      steps: [
        {
          name: "Use revenue per truck per day",
          text: "Take that truck's revenue over a normal month and divide by the days it ran. Use the truck, not the company average, because a rotator and a light-duty wrecker are different businesses.",
        },
        {
          name: "Keep the fixed costs running",
          text: "The payment, the insurance and the driver do not stop because the truck is in the shop. That is the part owners forget and it is what makes downtime hurt twice.",
        },
        {
          name: "Use realistic days out, including waiting on parts",
          text: "Not the shop time. The calendar time from when it broke to when it was earning again. Waiting on a part is downtime even though nobody is working on it.",
        },
        {
          name: "Add the work you had to turn away",
          text: "If you lost a motor club rotation, missed calls on your busiest night, or had to refuse a job you would normally take, that is real and it belongs in the number.",
        },
      ],
      readIt: [
        "The per-day figure is what a breakdown costs before the repair bill. Compare it to what preventive maintenance costs and the argument for scheduled service usually ends right there.",
        "Multiply the daily figure by your realistic annual downtime and you have what unreliability costs you per year. That number is often the best case for a newer truck or a second one.",
        "If losing one truck stops you taking calls entirely, you do not have a maintenance problem, you have a single point of failure.",
      ],
      formHeading: "Want the dispatch side tightened up?",
      formLead:
        "Send me the number and how many trucks you run. I will tell you what would have to change for a truck going down to be an inconvenience instead of a lost week.",
      interest: "unsure",
      industry: "Towing and recovery",
    },
    faq: [
      {
        q: "Is preventive maintenance actually worth it?",
        a: "Run the daily downtime number and compare it to the cost of scheduled service. In towing, where the trucks are hard-used and the revenue per truck per day is high, scheduled maintenance almost always wins on math alone. The argument is usually about finding a day to take the truck out of service, not about the money.",
      },
      {
        q: "Should I keep a spare truck?",
        a: "Depends on your call volume and how much of it you lose when a truck goes down. If losing one truck means turning away motor club rotations you would struggle to get back, a spare or a standby arrangement with another operator can pay for itself quickly.",
      },
      {
        q: "What about the driver during downtime?",
        a: "If they are on hourly you are paying for nothing, and if they are on commission they are earning nothing and will look elsewhere. Losing an experienced wrecker driver over a two week breakdown is a cost most owners never put in the calculation.",
      },
      {
        q: "How do I keep motor club rotations while a truck is out?",
        a: "Talk to them before you miss calls rather than after. Most will work with an operator who communicates. The relationships that break are the ones where calls went unanswered with no explanation.",
      },
    ],
    body: `
The wrecker throws a transmission on a Friday. The shop quotes the repair and you wince at the number.

Then you focus on that number, get it fixed, and move on.

The repair bill was the cheapest part of that week.

## What actually happened while it sat

The payment came out anyway. So did the insurance. The driver either got paid to do nothing or made nothing and started looking around.

Calls came in and you could not take them. Some of those callers found somebody else and will call that person next time. If you are on a motor club rotation, you missed calls in the rotation, and rotations have a way of not fully coming back.

And the work you did take got done by a truck that was already busy, which means everything ran late for a week.

None of that is on the repair invoice.

{{TOOL}}

## The comparison that makes the decision

Take the daily downtime figure and hold it next to what scheduled maintenance costs.

For most towing operations it is not close. A day of downtime costs multiples of what a service interval costs, which means the only real argument against preventive maintenance is finding a day to take the truck out of service.

That is a scheduling problem, and scheduling problems are cheaper than transmissions. Pick your slowest day of the week and make it the maintenance day.

## Where the hidden costs live

**The rotation.** Missing calls in a motor club rotation can affect what you get sent afterwards. Communicate before you miss them, not after.

**The driver.** Experienced wrecker drivers are hard to find and easy to lose. Two weeks of no income is a strong reason for one to take a call from a competitor.

**The customers who called once.** They needed a tow, you could not come, somebody else did. That is not one job lost, it is a customer who now has somebody else's number saved.

**The rest of the fleet.** Covering with the remaining trucks means more hours and more miles on them, which pulls their maintenance forward. Downtime propagates.

## What to do with the number

**If it is large and you run one truck**, that is a single point of failure and the number tells you what it is worth to solve. Standby arrangement with another operator, a backup truck, or a maintenance schedule you actually keep.

**If you run several**, use it to decide how hard to push each truck. Running a truck until it breaks looks cheap in the maintenance budget and expensive everywhere else.

**Either way, log the downtime.** Days out, per truck, per year. Most owners have a feeling about which truck is the problem child. Written down, it usually turns out to be worse than the feeling, and it makes the replace-or-repair decision obvious.
`,
  },

  {
    slug: "bakery-menu-margins",
    title: "Which items on your bakery menu actually make money?",
    description:
      "Popular and profitable are not the same list. Work out the real margin on each item so you know what to push, what to reprice and what to stop making.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/bakery-menu-margins.jpg",
    tool: {
      slug: "profit-margin-calculator",
      heading: "Run the margin on one item at a time",
      intro:
        "Do your five best sellers first. Cost in, price in, margin out. The results usually rearrange what you thought you knew about your own case.",
      steps: [
        {
          name: "Cost the recipe properly, per unit",
          text: "Flour, butter, sugar, eggs, fillings, at what you actually pay this month. Divide by what the batch yields. Butter and eggs move enough that a cost from last year is fiction.",
        },
        {
          name: "Add packaging and waste",
          text: "The box, the liner, the sticker, the bag. Then add your real waste percentage, because a croissant that goes in the bin at six was still made out of ingredients you paid for.",
        },
        {
          name: "Include the labor in the item",
          text: "A laminated dough that needs three days of attention is not the same product as a muffin, even if the ingredient costs look similar. If you skip labor you will conclude the wrong things.",
        },
        {
          name: "Then put in your shelf price",
          text: "What it actually sells for, including whatever it goes for in a bundle or a discount at the end of the day.",
        },
      ],
      readIt: [
        "Sort your menu by margin, then look at what sells most. Where those two lists disagree is where the money is.",
        "A low margin item is not automatically a bad item. It might be what brings people in. But it should be a decision, not a surprise.",
        "Anything with a genuinely negative margin comes off the case or gets repriced this week. There is no volume that fixes it.",
      ],
      formHeading: "Want the whole case costed?",
      formLead:
        "Send me your top five and what came out. I will tell you which ones to reprice, which to keep as a loss leader on purpose, and which to stop making.",
      interest: "blueprint",
      industry: "Bakery and coffee shop",
    },
    faq: [
      {
        q: "Should I drop every low margin item?",
        a: "No. Some items exist to get people through the door and they earn their place through what customers buy alongside them. The rule is that a low margin item has to be a deliberate choice with a reason, not an accident nobody costed.",
      },
      {
        q: "How often should I recost recipes?",
        a: "Whenever a major ingredient moves, and at minimum a couple of times a year. Butter, eggs, chocolate and flour do not hold still, and a menu priced against last year's costs quietly stops working.",
      },
      {
        q: "What about end of day markdowns?",
        a: "Include them, because they are part of your real average selling price. If you routinely discount half of something at four in the afternoon, its real margin is much lower than the shelf price suggests.",
      },
      {
        q: "How do I raise prices in a small town?",
        a: "Small increases, more often, beats one big jump every three years. Round numbers, no apology, and no sign explaining yourself. Most customers do not track pastry prices to the dime, but everybody notices a sudden twenty percent move.",
      },
    ],
    body: `
Every bakery owner knows which item sells the most. Almost none of them can tell you which item makes the most.

Those are different questions and the answers are frequently different items.

## The item that sells out and loses money

It happens more than you would think, and it usually looks like this. Something is labor intensive, uses expensive ingredients, and is priced against what the shop down the street charges rather than what it costs to make.

It sells out every morning. Customers love it. It is the thing people mention in reviews.

And every one you sell costs you money, which means the better it sells, the worse the day goes.

You cannot see this from the register. The register tells you what sold. It does not tell you what any of it cost.

{{TOOL}}

## Do it in this order

**Start with the top five sellers.** Volume magnifies everything, so an error on your best seller matters more than the whole rest of the case. Get those five right first.

**Then anything labor intensive.** Laminated doughs, decorated cakes, anything that comes back to for a second and third stage. These are where the cost hides, because the ingredients look cheap and the hours are not.

**Then the special orders.** Custom cakes are where bakeries most often lose money, because the price gets quoted on ingredients and feel rather than on the four hours of decorating.

## What to do with the results

**Reprice the negatives immediately.** No volume fixes a negative margin. Either the price goes up or the item comes off.

**Push the high margin items you already make.** Case position, the first thing the counter mentions, the item in the photo on your profile. Selling more of what already works is the cheapest change available.

**Decide about the low margin favourites.** Some earn their place by bringing people in who buy coffee at a good margin alongside. That is a real strategy. Just make sure it is the strategy and not an accident.

**Look at waste as its own number.** If a product's margin only works when almost nothing is thrown away, it is fragile. Bake to a pattern you can actually sell.

## The coffee side

If you sell drinks alongside, run those too. Beverage margins are usually far better than baked goods, which changes what you want the counter to say.

A shop where every pastry sale gets asked about coffee is a meaningfully different business from one where it does not, and that is a training change rather than a menu change.

## The number to leave with

Sort your case by margin. Look at the top three and the bottom three.

Then look at where they sit in the display. In most bakeries the highest margin items are not at eye level, and the ones losing money are front and centre because they look the best.

Moving them around costs nothing and takes ten minutes.
`,
  },

  {
    slug: "used-car-lot-slow-website",
    title: "What a slow website costs a used car lot",
    description:
      "Every second of load time on a mobile connection costs you shoppers before they ever see a vehicle. Work out what your site speed is costing in leads and units.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/used-car-lot-slow-website.jpg",
    tool: {
      slug: "website-speed-money",
      heading: "Price out what the delay costs",
      intro:
        "Traffic, load time, conversion rate and what a sale is worth. On a high-ticket item like a vehicle, a small percentage of lost visitors turns into a large number very quickly.",
      steps: [
        {
          name: "Get your real load time on a phone",
          text: "Test on mobile data, not on the office wifi. Most of your shoppers are on a phone in a parking lot somewhere, and that is the experience that decides whether they wait.",
        },
        {
          name: "Use your actual monthly traffic",
          text: "From your analytics, not an estimate. Inventory pages specifically if you can separate them, because that is where the buying happens.",
        },
        {
          name: "Put in your real lead conversion rate",
          text: "The share of visitors who fill in a form, call, or start a finance application. Most lots know units sold and have never worked this one out.",
        },
        {
          name: "Use gross per unit, not sale price",
          text: "What you actually make on an average unit including any back end. That is what a lost shopper is worth, and it is what makes this math get big.",
        },
      ],
      readIt: [
        "The number is an estimate built on your inputs, not a promise. Use it to decide whether speed is worth attention, not as a forecast.",
        "Vehicle photos are almost always the cause. Twenty full resolution images on a listing page will bring any site to a crawl on mobile data.",
        "Compare the annual figure to what fixing it would cost. On a high-ticket item, one recovered unit often covers the entire fix.",
      ],
      formHeading: "Want the site looked at?",
      formLead:
        "Send me your load time and your traffic. I will tell you what is actually slowing it down, and it is almost always the photos rather than anything exotic.",
      interest: "build_with_you",
      industry: "Auto dealer",
    },
    faq: [
      {
        q: "What usually makes a dealer site slow?",
        a: "Photos, by a mile. Twenty or thirty full resolution images per vehicle, uploaded straight off a camera or a phone, served at full size to a mobile browser. After that it is usually a stack of third-party scripts: chat widgets, trade valuation tools, tracking pixels and inventory feeds all loading at once.",
      },
      {
        q: "How fast should it be?",
        a: "Fast enough that a shopper on mobile data sees the vehicle before they lose patience. Rather than chasing a target number, test your own site on a phone away from the lot and be honest about whether you would have waited.",
      },
      {
        q: "Can I fix this without rebuilding the site?",
        a: "Usually a large part of it, yes. Compressing and correctly sizing vehicle photos, lazy loading images below the fold, and removing scripts nobody uses will fix most dealer sites without touching the platform.",
      },
      {
        q: "What if my inventory site is provided by a vendor?",
        a: "You still control the photos you upload, which is most of the problem. Beyond that, put the speed question to your vendor directly and ask what they can change. It is a reasonable thing to expect from a platform you pay for.",
      },
    ],
    body: `
Somebody sees a truck they like. They tap the listing while standing in a parking lot on mobile data.

The page starts loading. First a header. Then a spinner where the photos should be. Then more spinner.

They go back and tap the next dealer.

That shopper was ready. They had intent, they had the phone in their hand, and they never saw your vehicle.

## Why this hits car lots harder than most businesses

**The product is photos.** Nobody buys a used vehicle without seeing twenty pictures of it. Which means your listing pages are the heaviest pages you have, and they are the ones that matter most.

**The ticket is enormous.** A lost visitor at a coffee shop is a few dollars. A lost visitor here might have been a unit. The math scales accordingly.

**Shoppers are comparing in real time.** They have four tabs open on the same body style. Whoever loads first gets looked at first, and often gets the call.

**They are on their phone, away from wifi.** On the lot, at work, in somebody else's driveway. That is the connection that matters, and it is not the one your office tests on.

{{TOOL}}

## The fix is nearly always the photos

Before anybody sells you a rebuild, check the images.

**Size them for the web.** A photo straight off a camera can be several megabytes. The same photo correctly sized for a phone screen is a fraction of that and looks identical to the shopper. Thirty photos at full size is a page nobody waits for.

**Compress them.** Modern formats do this well and the quality difference is invisible on a phone.

**Load them lazily.** Show the first few images immediately and load the rest as the shopper scrolls. Most never scroll to photo twenty-eight anyway.

Do those three and most dealer sites get dramatically faster without changing anything else.

## Then the scripts

Open your site and count the third-party tools loading on it. Chat widget, trade-in valuation, finance calculator, two analytics tools, a heat map tool somebody installed in 2023, a pixel for an ad account you no longer run.

Every one of those is a request the browser makes before the page finishes. Remove the ones nobody uses. In most cases that is more than half.

## Test it honestly

Go stand at the far side of your own lot with your phone on cellular data, turn off wifi, and load a vehicle detail page.

Count the seconds. Ask yourself whether you would have waited if you were not the owner.

That is the whole diagnostic, and it is more useful than any report, because it is exactly the moment where you are winning or losing the shopper.
`,
  },

  {
    slug: "daycare-late-pickup-policy",
    title: "The late pickup and absence policy every daycare needs",
    description:
      "Unclear policies cost daycares money and goodwill at the same time. Here is what a fair, enforceable late pickup policy says, plus a generator that writes it.",
    publishedAt: "2026-08-14",
    readingMinutes: 6,
    ogImage: "/og/articles/daycare-late-pickup-policy.jpg",
    tool: {
      slug: "cancellation-policy-generator",
      heading: "Write your policy",
      intro:
        "It asks a few questions and gives you clean, plain-English language you can put in your handbook and your enrollment paperwork. Have your attorney read it before it goes live.",
      steps: [
        {
          name: "Decide the grace period first",
          text: "Traffic happens and parents are human. Most centers allow a small window before a fee applies. Pick it deliberately rather than improvising it in the moment.",
        },
        {
          name: "Set the fee so it changes behavior, not so it earns revenue",
          text: "A late fee exists to get children picked up on time and to pay the staff member who has to stay. If it is too small it is a parking fee, and if it is punitive it damages a relationship you need.",
        },
        {
          name: "Say what happens on absences and holidays",
          text: "Tuition is usually charged whether a child attends or not, because your costs do not change. Say so plainly at enrollment, because this is the single most common billing argument in childcare.",
        },
        {
          name: "Put it in the enrollment packet, not just the handbook",
          text: "Language a parent signed at enrollment is understood and enforceable in a way that a sign on the door never is.",
        },
      ],
      readIt: [
        "Plain language beats legal language here. A parent who understood the policy at enrollment almost never argues about it later.",
        "Consistency is what makes it work. A policy enforced for some families and not others is worse than no policy, because it reads as unfair rather than as a rule.",
        "Have a local attorney review it before you use it. Childcare is regulated and the rules vary by state, so a generic template is a starting point rather than a finished document.",
      ],
      formHeading: "Want the enrollment paperwork sorted?",
      formLead:
        "Tell me what you have now and what keeps causing arguments. I will tell you what to add and what to cut, and how to get it signed without adding paperwork to your morning.",
      interest: "unsure",
      industry: "Childcare and daycare",
    },
    faq: [
      {
        q: "Is a late fee actually enforceable?",
        a: "Generally yes when it is disclosed in advance and agreed to in writing at enrollment, and when it is reasonable. Childcare is regulated at the state level and some states have specific requirements around fees and contracts, so have a local attorney check yours before you rely on it.",
      },
      {
        q: "Should I charge tuition when a child is absent?",
        a: "Most centers do, because your staffing and your space cost the same whether that child attends or not. What matters is that parents understood it before they enrolled, not that you were technically entitled to it.",
      },
      {
        q: "What do I do about a family that is always late?",
        a: "Have a direct conversation before it becomes a fee dispute. Usually there is a work schedule problem behind it and sometimes a different pickup time or an arrangement solves it. Fees alone rarely change a structural problem in somebody's life.",
      },
      {
        q: "How do I raise tuition without losing families?",
        a: "Notice well in advance, in writing, with a clear date. Sixty days is common in childcare because families have to plan around it. Be straightforward about why. Parents accept increases far better than they accept surprises.",
      },
    ],
    body: `
It is 6:15. You close at six. One child is still here, one staff member is still here because you cannot leave a child alone, and the parent is not answering.

That staff member is on the clock. You are paying for it. And when the parent arrives, apologetic and stressed, the last thing you want is an argument about money.

This is the most common recurring friction in childcare and it is almost always caused by the same thing: nothing was written down clearly enough at enrollment.

## What a policy is actually for

Not revenue. If your late fees are a meaningful part of your income, something is wrong.

A policy does three things. It changes behavior, because people are more punctual when there is a known consequence. It pays the person who has to stay. And most importantly, it removes the argument, because the answer was agreed to months ago by somebody who read it and signed it.

That last one is the real value. The fee is secondary to never having the conversation.

{{TOOL}}

## What it needs to cover

**Late pickup.** Grace period, the fee, how it is applied, and what happens if it becomes a pattern rather than an occasional thing.

**Absences.** Whether tuition is charged when a child is out sick or on vacation. This is the number one billing dispute in the industry and it is entirely preventable with one clear sentence at enrollment.

**Holidays and closures.** Which days you are closed and whether those are charged. Put the calendar in the enrollment packet so nobody is surprised in November.

**Withdrawal notice.** How much notice you need before a family leaves. Losing a spot with no warning is expensive, because filling it takes time you did not have.

**Illness.** When a child has to stay home and when they can return. This one usually has to follow state and local health requirements, so check yours rather than writing it from scratch.

## Making it work in practice

**Get it signed at enrollment.** Not handed over. Signed, with the specific policies initialed. A parent who initialed the late pickup fee does not argue about the late pickup fee.

**Apply it the same way to everybody.** The moment you waive it for one family and charge another, it stops being a policy and starts being a judgment about who you like. That is far more damaging than the money involved.

**Lead with the conversation, not the invoice.** A family who is late twice in a year gets a friendly reminder. A family who is late twice a week has something structural going on and a conversation will fix more than a fee will.

**Say it warmly.** This is childcare. The tone of your paperwork is part of how families experience your center. Plain and clear is not the same as cold.

## The legal part

Childcare is regulated and the rules differ meaningfully by state, covering everything from contract terms to ratios to health requirements.

Use the generator to get clean language quickly, then have a local attorney read it once before it goes in the packet. One review sets you up for years, and it is a great deal cheaper than discovering a problem when a family disputes something.
`,
  },

  {
    slug: "real-estate-agent-seo-value",
    title: "What ranking on Google is worth to a real estate agent",
    description:
      "Portal leads cost money every month and belong to somebody else. Work out what organic search traffic would be worth to you, and whether it is worth building.",
    publishedAt: "2026-08-14",
    readingMinutes: 7,
    ogImage: "/og/articles/real-estate-agent-seo-value.jpg",
    tool: {
      slug: "seo-traffic-value",
      heading: "Price out what your rankings are worth",
      intro:
        "Search volume, where you rank, your conversion rate and what a closing is worth to you. In a business with commissions this size, even modest traffic turns into a serious number.",
      steps: [
        {
          name: "Pick specific searches, not vague ones",
          text: "Not real estate agent. Homes for sale in your specific neighbourhood, or the school district people actually search by, or condos in the building everybody asks about. Specific beats broad every time for an individual agent.",
        },
        {
          name: "Use a realistic click share for your position",
          text: "Position one takes a large share of clicks and it falls off steeply from there. Be honest about where you actually rank rather than where you would like to.",
        },
        {
          name: "Use your real conversion rate",
          text: "Of the people who land on your site, what share become a lead you actually spoke to? For most agent sites this is a small number, and knowing it is more useful than pretending.",
        },
        {
          name: "Use commission per closing, and your real lead-to-close rate",
          text: "Not gross volume. Your commission after the split, and the share of leads that eventually close. Both sides matter and both are usually softer than agents assume.",
        },
      ],
      readIt: [
        "The output is an estimate from your own inputs, not a prediction. Use it to judge whether the effort is worth it, not to plan a year on.",
        "Compare it against what you currently spend on portal leads per year. That comparison is the actual decision, because it is rent versus ownership.",
        "Organic takes months and does not switch off when you stop paying. Portal leads work immediately and stop the day you stop. Neither is wrong, they are different instruments.",
      ],
      formHeading: "Want the owned side built?",
      formLead:
        "Send me the number and what you spend on leads now. I will tell you what would actually rank in your market and whether it is worth your time at your price point.",
      interest: "build_with_you",
      industry: "Real estate",
    },
    faq: [
      {
        q: "Can an individual agent outrank the big portals?",
        a: "Not for broad terms, and it is not worth trying. Where individual agents genuinely win is hyperlocal and specific: a neighbourhood, a subdivision, a building, a school zone, or a question buyers in your market actually type. The portals write for everywhere and cannot compete with somebody who lives there.",
      },
      {
        q: "How long does it take?",
        a: "Months, not weeks, and anybody promising otherwise is selling something. It is a compounding asset rather than a switch. That is exactly why it is worth starting before you need it.",
      },
      {
        q: "Should I stop buying portal leads?",
        a: "Not while they are working. Run both. Portal leads pay the bills now, organic builds something you own later. Cutting the thing that currently produces in order to fund something that has not started yet is how agents have a very quiet year.",
      },
      {
        q: "What should I actually write?",
        a: "What buyers and sellers in your specific market ask you every week. What the HOA covers in that subdivision. What a house in that neighbourhood actually sold for versus listed. What the school zoning is. Local knowledge that a national portal literally cannot produce is the entire advantage.",
      },
    ],
    body: `
Most agents get leads one of two ways. They buy them from a portal, or they get them from people who already know them.

The first costs money every single month and the lead was never yours. The portal owns the relationship, sells the same buyer to your competitors, and raises the price when it feels like it.

The second is wonderful and does not scale.

There is a third way, it is slower, and almost nobody does it properly, which is exactly why it works.

## Why agents dismiss it

Because they think about the wrong keywords.

Trying to rank for real estate agent or homes for sale is competing with companies that have thousands of employees and decades of authority. You will not win that and you should not spend a minute trying.

What you can win is the stuff those companies cannot be bothered to write and could not write well if they tried.

What does the HOA actually cover in that subdivision. Which streets are in which school zone. What the commute really looks like from that neighbourhood at eight in the morning. Whether that building allows short term rentals. What the flood situation is on that side of the creek.

A national portal cannot write those pages. You can write them from memory.

{{TOOL}}

## What the number is for

Not to predict a year. To answer one question: is this worth the effort at my commission level?

Because commissions are large, the answer usually flips at a very small amount of traffic. A handful of the right visitors a month, converting at a modest rate, closing at a modest rate, is one extra transaction a year. For most agents, one extra transaction pays for a great deal of writing.

That is the entire business case. It does not require the traffic numbers a media company would need.

## Rented versus owned

This is the same argument as everything else on this site.

Portal leads are rent. They work immediately, they stop the moment you stop paying, and the customer relationship belongs to the platform. That is not a scam, it is a product, and it is a reasonable product to buy.

Organic is ownership. It takes months, it compounds, and a page that ranks keeps working while you are at a closing or on holiday. Nobody can raise your rate on it or sell the same lead to three other agents.

The right answer for most agents is both. Keep buying while you build. What you should not do is spend a decade paying rent and never start building, because a decade of portal spend with nothing owned at the end is the most common financial story in this industry.

## Where to start

Write down the ten questions clients ask you most often about your specific market. Not general real estate questions. Local ones, with place names in them.

That list is your content plan. One page each, written properly, with real local detail nobody else has.

Ten pages will not make you famous. But ten pages about a market you actually know, on a site you actually own, will outrank a national portal for the searches that matter in your neighbourhood, and it will still be doing that in five years.
`,
  },
];
