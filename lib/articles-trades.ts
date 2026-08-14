// Trade-specific tool articles.
//
// Every one of these answers a question a single trade types into Google, then
// hands them the calculator that turns the answer into their own number, then
// asks for the job. The trade is named in the title on purpose: "how much should
// I charge" is a war against every marketing blog on earth, and "what a lawn care
// business should charge per hour" is a war against almost nobody.
//
// Same shape every time, so the eleventh through the fiftieth are data entry:
//   hook -> the honest answer -> {{TOOL}} -> what to do with the number -> FAQ.

import type { Article } from "./articles";

export const TRADE_ARTICLES: Article[] = [
  {
    slug: "lawn-care-hourly-rate",
    title: "What should a lawn care business charge per hour?",
    description:
      "Your mowing rate is not your wage. Here is how to work out what a lawn care business has to charge per hour to actually pay itself, with a calculator that does the math on your numbers.",
    publishedAt: "2026-08-12",
    readingMinutes: 7,
    ogImage: "/og/articles/lawn-care-hourly-rate.jpg",
    tool: {
      slug: "hourly-rate-calculator",
      heading: "Work out your real hourly rate",
      intro:
        "Put your own numbers in. It takes about two minutes and it uses the hours you actually bill, not the hours you actually work, because those are two very different numbers in lawn care.",
      steps: [
        {
          name: "Start with what you need to take home",
          text: "Not what you would like. What the household actually needs out of this business in a year, before tax. Be honest, because every number after this one is built on it.",
        },
        {
          name: "Add your real overhead",
          text: "Mowers, trimmers, blowers, trailer, truck payment, fuel, blades, string, insurance, phone, software. Anything you pay for whether or not you cut a yard this week.",
        },
        {
          name: "Enter billable hours, not working hours",
          text: "This is where most lawn care owners get it wrong. Drive time between yards, quoting, invoicing, equipment repair and the trip to the shop are all unpaid. If you work fifty hours and bill thirty, put thirty.",
        },
        {
          name: "Set the weeks you actually run",
          text: "Take out the weeks rain shuts you down, the weeks you take off, and the dead stretch in winter if you do not have a leaf or holiday light season to fill it.",
        },
      ],
      readIt: [
        "The number it gives you is a floor, not a price. It is what you have to average to break even on the life you said you wanted. Charging under it is paying for the privilege of working.",
        "If your floor comes out higher than what people around you charge, that is information, not a verdict. It usually means your billable hours are too low, not that your market is too cheap.",
        "Run it twice. Once with today's billable hours, once with what they would be if you tightened your route. The gap between those two numbers is what better scheduling is worth to you per year.",
      ],
      formHeading: "Want the rest of the leak found?",
      formLead:
        "Send me your number and the part that surprised you. I will tell you straight whether it is a pricing problem or a scheduling problem, and I do not need a call to do it.",
      interest: "blueprint",
      industry: "Lawn care and landscaping",
    },
    faq: [
      {
        q: "Should I charge by the hour or by the yard?",
        a: "Quote by the yard, price by the hour. The customer wants one number for the job. You need to know what an hour has to earn so the number you quote is not a loss. Work out the hourly floor first, then build your per-yard prices on top of it.",
      },
      {
        q: "How do I raise prices on customers I have had for years?",
        a: "Give notice, give a reason, and give it in writing. Thirty days, one short message, the new price and the date it starts. Most people who have been happy with your work stay. The ones who leave over a fair increase were usually the ones costing you the most.",
      },
      {
        q: "What counts as overhead if I run the business out of my truck?",
        a: "Anything you pay whether or not you cut grass this week. Truck payment, insurance, phone, fuel, equipment replacement, licenses, software. If a rainy month would still cost you the money, it is overhead.",
      },
      {
        q: "Does drive time count as billable?",
        a: "Only if the customer pays for it, and they usually will not pay for it directly. That is exactly why it has to come out of your billable hours here. Windshield time is real work that earns nothing, which is why a tight route beats a big route.",
      },
    ],
    body: `
Ask ten lawn care guys what they charge and you will hear ten numbers between forty and ninety an hour. Ask them how they landed on it and almost all of them will tell you the same thing: it is what the guy before them charged.

That is not pricing. That is copying.

## The honest answer

There is no correct hourly rate for lawn care. There is only a rate that covers your truck, your equipment, your taxes, your dead weeks, and the life you are trying to pay for. That number is different for a solo operator with a paid-off trailer than it is for a two-crew outfit with a truck note.

What is the same for everybody is the math. And the math has one trap in it that eats more lawn care businesses than any other single mistake.

## The trap: billable hours are not working hours

You leave the house at seven. You get home at six. That is eleven hours.

Now count the ones a customer paid for. Drive time between yards is not billable. The trip to the shop for a belt is not billable. Quoting the new subdivision is not billable. Sitting in the truck waiting out a shower is not billable. Neither is invoicing on Sunday night.

For most solo operators the real number is somewhere between five and seven billable hours out of a long day. Which means if you priced yourself at sixty an hour thinking you work fifty hours a week, you did not build a sixty an hour business. You built one somewhere in the thirties and you have been covering the difference with your own time.

Run your numbers below and you will see your own version of that gap.

{{TOOL}}

## What to do with the number

If your floor came out above what you are charging, you have three moves and only three.

**Raise the price.** The simplest and the scariest. Existing customers get thirty days notice in writing. New quotes go out at the new rate starting tomorrow. Not every customer stays. The ones who do are the ones who were never the problem.

**Bill more of the hours you already work.** Tighter routes so less of the day is spent driving. Same-day invoicing so Sunday night is yours again. Text-back on missed calls so quoting does not eat your evenings. This is usually where the fastest money is, because you are already working those hours for free.

**Do more per hour.** Better equipment, a second set of hands on the big properties, or dropping the yards that take twice as long for the same money. Every route has one or two of those and you already know which ones they are.

## The one thing that is not on the list

Working more hours is not on the list. You already tried that. It is why you are reading a pricing article at nine at night.

## Where this normally leads

Most lawn care owners who run this find the same thing. The price is roughly fine. The billable hours are the problem, and the biggest hole in the billable hours is the phone. Calls come in while you are on a mower with ear protection on, and by the time you call back at six the person has already booked somebody else.

If that sounds like your week, the [missed call math](/articles/missed-calls-cost-customers) is the next number worth knowing, and there is a free calculator for that one too.
`,
  },

  {
    slug: "hvac-missed-calls-cost",
    title: "What missed calls actually cost an HVAC company",
    description:
      "Every call that goes to voicemail in July is somebody else's install. Here is how to put a real dollar number on the calls your HVAC company is missing, and the cheapest way to stop it.",
    publishedAt: "2026-08-12",
    readingMinutes: 6,
    ogImage: "/og/articles/hvac-missed-calls-cost.jpg",
    tool: {
      slug: "missed-call-calculator",
      heading: "Put a number on the calls you are missing",
      intro:
        "You need four things you already know: how many calls come in, how many get missed, what a job is worth, and how often a call turns into work. The tool does the rest.",
      steps: [
        {
          name: "Count the calls, do not guess",
          text: "Pull last month off your carrier bill or your phone log. Total inbound calls to the business line. Use a real month, ideally a busy one, because a busy month is when the misses hurt.",
        },
        {
          name: "Find your actual miss rate",
          text: "Count the ones that rang out, went to voicemail, or came in while you were on another call. Techs in an attic with a phone in the truck is the same as a miss. Most shops that pull the log are surprised.",
        },
        {
          name: "Use your average ticket, blended",
          text: "Not your best install and not your cheapest service call. Take last year's revenue and divide by the number of jobs. Blended is the honest number here.",
        },
        {
          name: "Be realistic on close rate",
          text: "Out of the people who reach a human, what share end up booking? For most HVAC shops in season it is high, which is exactly what makes the misses expensive.",
        },
      ],
      readIt: [
        "The annual figure is the one that gets attention, but the per-week number is the one that changes behavior. It is small enough to believe and big enough to act on.",
        "This is missed opportunity, not lost profit. Not every missed caller would have bought, and a third of them are sales calls. Cut it in half in your head and it is still usually the largest single leak in the business.",
        "Run it again with your July numbers instead of your average month. Peak season is when the phone rings over itself and when the money is actually decided.",
      ],
      formHeading: "Send me your number",
      formLead:
        "Tell me what it came out to and how you handle the phone right now. I will tell you what I would fix first, and whether it needs anything more than a text-back on the line you already have.",
      interest: "build_with_you",
      industry: "HVAC",
    },
    faq: [
      {
        q: "Does an answering service fix this?",
        a: "Partly. It stops the ring-out, which is most of the bleed. What it usually does not do is get the job on the schedule, because the service takes a message and the customer keeps calling down the list while they wait. Booking beats messaging.",
      },
      {
        q: "What is an automatic text back?",
        a: "When a call is missed, the system sends a text from your business number within seconds saying you saw the call and asking what they need. It keeps the conversation on your number instead of pushing them to the next result on Google. It is the cheapest fix on this list and it works while you are in an attic.",
      },
      {
        q: "How fast do I actually need to call back?",
        a: "Faster than the next company. In an emergency trade that is minutes, not hours. A homeowner with no cooling in August is calling three shops, and the one that answers usually wins before price is ever discussed.",
      },
      {
        q: "Do I need a whole new phone system?",
        a: "Usually no. Most shops can keep their number and add missed-call text-back and a shared inbox on top of what they already have. Replacing the phone system is the expensive answer to a problem that has a cheap one.",
      },
    ],
    body: `
It is the second week of July. The phone rings while your tech is in a crawlspace and you are on the other line with a supply house. It rings out.

That homeowner does not leave a voicemail. Nobody leaves voicemails anymore. They hit back and tap the next result.

That was not a missed call. That was somebody else's install.

## Why this hits HVAC harder than most trades

Three things stack up in this trade and they all point the same direction.

**The tickets are big.** A missed call in a business with an eighty dollar average ticket is annoying. In a trade where one call can be a system replacement, it is a different category of mistake.

**The intent is urgent.** Nobody shops around for two weeks when the house is ninety degrees. They call until somebody answers, and then they stop calling.

**The busiest hours are the ones you cannot answer.** Peak season is exactly when everybody is on a roof, in an attic, or elbow deep in a unit. The phone rings hardest at the moment you are least able to pick it up.

Put those together and the calls you miss are worth more than the calls you take, on average, because the ones you miss cluster in your best weeks.

## Stop estimating it

Most owners have a feeling about this. A feeling does not survive a conversation with a spouse or a partner about spending money to fix it. A number does.

{{TOOL}}

## What to do with the number

Work down this list in order. It is ordered by cost, cheapest first, and the cheapest one is usually most of the fix.

**1. Missed call text back.** Within seconds of a missed call, your number texts them. "This is Ryan with the shop, sorry I missed you, what is going on with the unit?" You have now kept the conversation on your number while they were still holding the phone. Costs almost nothing.

**2. One place every conversation lands.** Calls, texts and form fills in a single inbox that more than one person can see. The alternative is that half your customer history lives on the personal phone of whoever answered, and it walks out the door with them.

**3. A real answer for after hours.** Not a voicemail greeting. Either a person, or a text that sets an actual expectation with a time in it. "Somebody will call you before eight in the morning" beats "leave a message after the tone" every single time.

**4. Then, and only then, consider more people.** Hiring somebody to answer a phone that a fifteen dollar automation could have handled is how shops end up with overhead they cannot cover in the shoulder season.

## The part nobody wants to hear

Fixing the phone will not make your marketing work better. It makes your marketing work at all.

If you are running ads, every dollar of that budget is buying calls. If a chunk of those calls ring out, you did not buy calls. You bought the sound of a phone ringing. The [cost per lead math](/articles/missed-calls-cost-customers) gets ugly fast when you divide by the calls that actually got answered instead of the calls that came in.

Fix the phone first. Then spend on ads.
`,
  },

  {
    slug: "dental-office-no-show-cost",
    title: "What no-shows cost a dental office, and how to cut them",
    description:
      "An empty chair does not just lose one appointment. Here is how to price out what no-shows cost your practice a year, and the policy and reminder changes that actually reduce them.",
    publishedAt: "2026-08-12",
    readingMinutes: 6,
    ogImage: "/og/articles/dental-office-no-show-cost.jpg",
    tool: {
      slug: "no-show-calculator",
      heading: "Price out your empty chairs",
      intro:
        "Pull your last month of schedule data and put it in. The number that comes out is usually the single easiest money in the practice to get back, because you are not buying new patients, you are keeping the ones you already booked.",
      steps: [
        {
          name: "Count appointments, not patients",
          text: "How many appointments were on the schedule last month across every chair. If you run hygiene and doctor columns separately, add them together and keep the same basis all the way through.",
        },
        {
          name: "Count true no-shows separately from cancellations",
          text: "A cancellation with two days notice can be refilled. A no-show at nine in the morning usually cannot. If your software separates them, use the no-show number. If it does not, count last-minute cancellations in and note that you did.",
        },
        {
          name: "Use production per appointment, not collections",
          text: "Take last month's production and divide by appointments kept. Production is the right basis because it is what the chair was scheduled to generate.",
        },
        {
          name: "Add your fill rate honestly",
          text: "What share of holes does the front desk actually fill from the short-call list? Be honest. If nobody is working a short-call list, the answer is close to zero and that is the finding.",
        },
      ],
      readIt: [
        "The annual number is the ceiling on what this problem is worth solving. Anything you spend on reminders or a short-call system should be a fraction of it.",
        "Watch the per-week figure against the cost of one more front desk hour a day. That comparison decides whether this is a systems problem or a staffing problem.",
        "Run it a second time with your fill rate raised to something realistic. The difference between those two numbers is what a working short-call list is worth, and it is usually more than the reminder software.",
      ],
      formHeading: "Want the schedule looked at?",
      formLead:
        "Send me the number and how you handle reminders today. I will tell you which of the three fixes below is worth doing first for a practice your size, straight, without a sales call.",
      interest: "build_with_you",
      industry: "Dental and medical practice",
    },
    faq: [
      {
        q: "Should I charge a no-show fee?",
        a: "You can, and a written policy signed at intake is what makes it enforceable and fair. Be aware that collecting it is its own job and that it can cost you a patient over a small amount. Most practices get more out of better reminders and a working short-call list than out of chasing fees.",
      },
      {
        q: "How many reminders is too many?",
        a: "Three is the common pattern: one at booking, one a week out, one the day before, with a reply-to-confirm on the last one. What matters more than the count is that the last one lands on the channel that patient actually reads, which for most people is text.",
      },
      {
        q: "What is a short-call list and why does it matter?",
        a: "A standing list of patients who said they would come in on short notice if a slot opens. When a chair goes empty at eight in the morning, the front desk works the list instead of staring at a hole. It turns a no-show from a loss into a rescheduled appointment.",
      },
      {
        q: "Is this different for a specialty practice?",
        a: "The math is the same, the stakes are higher. Longer appointments and higher production per chair mean each empty slot costs more, and specialty schedules are harder to refill on short notice. That usually justifies more effort on confirmation, not less.",
      },
    ],
    body: `
A no-show is not one lost appointment. It is one lost appointment, plus the patient you turned away for that slot, plus the staff you are paying to stand there, plus the hygienist wondering whether the afternoon is going to fall apart too.

Most practices know no-shows are a problem. Very few know what they cost, which is why the fix never quite makes it to the top of the list.

## Get the number first

Fixing this costs money. Reminder software costs money. An extra hour of front desk time costs money. You cannot decide whether to spend it until you know what the problem is worth.

{{TOOL}}

## The three fixes, in the order that works

**1. Change how you confirm, not how many times you confirm.**

Most practices already send reminders. The reminders are not the problem. The problem is that a reminder tells the patient something, and a confirmation asks the patient something.

"Your appointment is Tuesday at 2" is a reminder. "Reply Y to confirm Tuesday at 2 or R to reschedule" is a confirmation. The second one gets a response you can act on. When somebody replies R on Monday, you just turned a Tuesday no-show into a refilled slot with a day to work with.

**2. Build a short-call list and actually work it.**

Ask every patient who wants an earlier appointment whether they would take one on two hours notice. Keep them in a list, not in somebody's head. When a chair opens, the front desk sends one text to that whole list and takes the first reply.

This is the highest return item on this page and it costs nothing but the discipline to keep the list current.

**3. Write the policy down and get it signed.**

Not because you are going to chase fees. Because a policy signed at intake changes behavior at booking. Patients who have read the sentence show up more often than patients who have not, whether or not you ever charge anybody.

If you are going to have a policy, put it in plain English, make it reasonable, and apply it the same way to everybody. A policy you enforce unevenly is worse than no policy.

## What not to do

Do not double book to cover no-shows. It works right up until the day everybody shows, and then you have burned an hour of goodwill with two patients and your whole afternoon runs late. You solved a scheduling problem by creating a reputation problem.

Do not blame the front desk. If nobody is working a short-call list, that is a systems gap, not a people gap. Give them the list and the template and it fixes itself.

## The follow-on

Practices that tighten this up usually find the next leak is the phone during lunch, when the office is closed and new patients are calling. That is a different number and it has [its own calculator](/articles/missed-calls-cost-customers).
`,
  },

  {
    slug: "auto-shop-credit-card-fees",
    title: "Are card processing fees eating your auto shop?",
    description:
      "Two and a half percent does not sound like much until you multiply it by a year of repair orders. Work out what your auto shop actually pays to take cards, and what your options are.",
    publishedAt: "2026-08-12",
    readingMinutes: 6,
    ogImage: "/og/articles/auto-shop-credit-card-fees.jpg",
    tool: {
      slug: "credit-card-fee-calculator",
      heading: "Work out what cards really cost you",
      intro:
        "Pull one monthly statement from your processor and put the real numbers in. Not the rate on the sales sheet. The rate you actually paid, which is almost never the same thing.",
      steps: [
        {
          name: "Use the effective rate, not the quoted rate",
          text: "Take total fees for the month and divide by total card volume for the month. That percentage is your effective rate and it is the only one that matters. It is usually higher than what you were quoted.",
        },
        {
          name: "Enter a normal month of card volume",
          text: "Not your slowest and not December. Pick an ordinary month so the annual figure is not built on an outlier.",
        },
        {
          name: "Add the per-transaction fee",
          text: "The flat cents on every swipe. It looks trivial and it is not, because a shop that runs a lot of small parts and diagnostic tickets pays it far more often than a shop doing big jobs.",
        },
        {
          name: "Run it again at a lower rate",
          text: "Put in a rate half a point lower and look at the annual difference. That is your negotiating range, and now you know what the conversation with your processor is worth.",
        },
      ],
      readIt: [
        "The annual number is what you are paying for the convenience of getting paid. Some of that is unavoidable. The question is how much of it is.",
        "Compare the annual fee number to one tech's monthly pay. When people see that comparison they stop treating processing as a rounding error.",
        "If your effective rate is more than about half a point above your quoted rate, something is being added on top. That gap is the first thing to ask your processor about, in writing.",
      ],
      formHeading: "Want a second set of eyes on the statement?",
      formLead:
        "Send me your effective rate and what you are being quoted. I am not a processor and I do not sell terminals, so all you get from me is a straight read on whether the number is fair.",
      interest: "unsure",
      industry: "Auto repair",
    },
    faq: [
      {
        q: "Can I just charge customers a card fee?",
        a: "Surcharging is allowed in many places and prohibited or capped in others, and the card networks have their own rules on top of state law. Check your state and your merchant agreement before you post a sign. A cash discount is structured differently from a card surcharge and the difference matters legally.",
      },
      {
        q: "Why is my effective rate higher than what I was quoted?",
        a: "Usually a mix of downgrades on business and rewards cards, monthly account fees, statement fees, PCI fees and gateway fees spread across your volume. The quoted rate is the best case for one card type. The effective rate is what actually happened.",
      },
      {
        q: "Is interchange plus better than flat rate?",
        a: "For most shops with steady volume, interchange plus is more transparent because you can see the markup. Flat rate is simpler and can be fine at low volume. Run your own numbers on both rather than trusting either sales pitch.",
      },
      {
        q: "Does this change if I take a lot of fleet cards?",
        a: "Yes. Fleet and commercial cards often carry different interchange, which is one of the most common reasons a shop's effective rate drifts up. If a big share of your work is fleet, ask your processor specifically how those transactions are priced.",
      },
    ],
    body: `
Nobody opened a repair shop to think about payment processing. It is one of those costs that shows up as one line on a statement you scan for two seconds before filing.

That is exactly why it is worth a look. It is the kind of expense that grows quietly, because the person selling it to you knows you are busy.

## The rate you were quoted is not the rate you pay

Somebody quoted you a number. Maybe two and a nine tenths percent. Maybe a flat rate that sounded clean.

Then the statement has other things on it. A monthly account fee. A PCI compliance fee. A statement fee. Downgrades when a customer pays with a business card or a rewards card, which in a repair shop is a lot of customers. A gateway fee if you take payment online or over the phone.

Add all of it up, divide by what you ran, and you get your effective rate. That is the real one. For a lot of shops it lands well north of what they think they are paying.

{{TOOL}}

## What to do once you know

**Ask for the interchange breakdown in writing.** Not a phone call. Writing. You want to see the base interchange versus the markup your processor is adding. A processor who will not put that in an email is telling you something.

**Take the annual number to a competitor.** Not to switch necessarily. To find out what the market rate is for a shop your size in your area. Processing is one of the few costs where the quote genuinely does drop when you show them you have been shopping.

**Look at ticket mix before you blame the rate.** If you run a lot of small transactions, the flat per-swipe fee may be doing more damage than the percentage. That is a different fix. Batching small parts sales onto the repair order instead of ringing them separately can matter more than a quarter point.

**Check the terminal lease.** If you are leasing hardware on a multi-year agreement, that is often the single worst line in the whole arrangement. Terminals are cheap to buy outright now.

## The part that is not about fees

While you have the statement out, look at how long it takes you to get paid on the work you do not run a card for. Fleet accounts, insurance work, the customer who says they will square up Friday.

Card fees are a known cost you can negotiate. Unpaid invoices are an unknown cost you cannot, and in most shops they are the bigger number. There is a [calculator for that one](/articles/contractor-unpaid-invoices) too, written for contractors but the math is identical for a shop.

## One honest caveat

I do not sell payment processing and I am not going to tell you what your rate should be, because it depends on your card mix, your ticket size and your volume, and anybody who quotes you a target rate without asking about those three things is selling something.

Run your own number. Then go ask hard questions with it in your hand.
`,
  },

  {
    slug: "restaurant-delivery-app-fees",
    title: "What delivery apps actually cost a restaurant",
    description:
      "Thirty percent off the top changes which items are worth putting on the app at all. Work out what third-party delivery is really costing your restaurant per order and per year.",
    publishedAt: "2026-08-12",
    readingMinutes: 6,
    ogImage: "/og/articles/restaurant-delivery-app-fees.jpg",
    tool: {
      slug: "platform-fee-calculator",
      heading: "Run the numbers on your delivery orders",
      intro:
        "Take one month of third-party orders and put the real commission in, not the one you remember agreeing to. Marketing fees, promo fees and processing all belong in the same bucket.",
      steps: [
        {
          name: "Use your payout report, not your sales report",
          text: "Your point of sale shows the order total. The payout report shows what actually hit the bank. The difference between those two is what this exercise is about.",
        },
        {
          name: "Enter your true commission",
          text: "Base commission plus any marketing or promoted-placement fees you opted into, plus processing. If your payout is seventy cents on the dollar, your real rate is thirty percent no matter what the contract calls it.",
        },
        {
          name: "Put in your food cost on those items",
          text: "Use the food cost for the items that actually sell on delivery, which usually skews differently than dine-in. Wings and combos are not the same margin as a steak.",
        },
        {
          name: "Add packaging",
          text: "Containers, bags, lids, sauce cups, labels. Delivery has a packaging cost that dine-in does not, and it is per order, so it hits small orders hardest.",
        },
      ],
      readIt: [
        "If the margin on a delivery order comes out near zero or negative, the app is not a sales channel for that item, it is a paid advertisement you are also cooking.",
        "Look at the per-order profit, not the monthly revenue. Restaurants get talked into these platforms with revenue numbers and quietly lose money on margin.",
        "Run it twice, once at your current commission and once with a delivery-specific menu price. That gap tells you whether menu pricing alone fixes it.",
      ],
      formHeading: "Want help getting orders off the apps?",
      formLead:
        "Tell me what your real margin came out to. I will tell you what a direct ordering setup would need to earn to be worth building, and whether it is worth it at your volume.",
      interest: "build_with_you",
      industry: "Restaurant and food service",
    },
    faq: [
      {
        q: "Should I raise my prices on the delivery apps?",
        a: "Most restaurants do, and the platforms generally allow it. Check your current agreement, because some pricing-parity terms have existed and terms change. Price so the delivery order is worth cooking, and be aware customers who see both menus will notice.",
      },
      {
        q: "Is it worth building my own online ordering?",
        a: "It depends on whether you have a way to reach customers directly. Direct ordering with no audience is a page nobody visits. Direct ordering plus a customer list, a Google Business Profile and a sign on the counter is how restaurants actually shift volume off the apps.",
      },
      {
        q: "Should I just leave the apps entirely?",
        a: "Usually no, not at first. They bring real demand you cannot reach on your own. The move most operators make is to keep them for discovery, fix the margin on what you list there, and work on converting repeat customers to direct.",
      },
      {
        q: "How do I get delivery customers to order direct next time?",
        a: "Put something in the bag. A card with a QR code to your own ordering page and a reason to use it. That insert is the only marketing channel the platform cannot take away from you, because you physically control it.",
      },
    ],
    body: `
The first month on a delivery app usually feels great. Orders are up. The kitchen is busy. The revenue line looks better than it has all year.

Then the payout hits the bank and it is not what the sales report said.

## Where the money goes

You know about the commission. The commission is not the whole story.

There is the base commission. There is the higher tier you got moved to for better placement. There is the marketing fee if you ran a promotion. There is the processing fee. There is the promo you funded when the app offered your customers free delivery, which came out of your side.

Then on your end there is packaging that dine-in does not have, and food cost on an order that is often skewed toward your lower-margin items because that is what travels well.

Stack all of it and the question stops being "how much commission do they take" and becomes "what is left when the order is done."

{{TOOL}}

## What the number usually says

Three outcomes, and you will land on one of them.

**It works.** Your margin on delivery orders is thin but real, the volume is incremental, and the app is bringing you people who would not have found you. Keep it, watch it, and stop worrying.

**It works only on some items.** This is the most common answer. High-margin items are fine and a handful of things on the menu are being cooked at a loss. The fix is not leaving the platform. The fix is a delivery menu that is not a copy of your dine-in menu.

**It does not work.** The margin is at or below zero once packaging and comped remakes are counted. At that point every order is costing you money to fulfill, and volume makes it worse instead of better.

## The moves that actually change the number

**Build a delivery-specific menu.** Fewer items, priced for the channel, chosen for what survives fifteen minutes in a bag. This is the single biggest lever and it does not require leaving anything.

**Price the channel separately.** If it costs you thirty percent to sell through a platform, the menu on that platform reflects it. Check your agreement first.

**Put an insert in every bag.** A card with a QR code that goes to your own ordering page, with a reason to use it. Free drink, dollar off, whatever fits. Every single delivery order is a free chance to convert somebody to a direct customer, and most restaurants throw that chance away.

**Own the customer list.** The platform will never give you your customers. The bag insert and the counter sign will. An email list you own is the only version of this you keep, which is a whole [separate conversation worth having](/articles/own-your-email-list).

## The honest framing

Delivery platforms are not villains and they are not free money. They are a paid distribution channel with a very high take rate. Treat them the way you would treat any ad spend: measure what you get back, keep the parts that pay, and never let the channel own the relationship.
`,
  },

  {
    slug: "contractor-unpaid-invoices",
    title: "What unpaid invoices are costing your contracting business",
    description:
      "Money you earned six months ago and still have not collected is not revenue, it is a loan you made without meaning to. Work out what your outstanding invoices are actually costing you.",
    publishedAt: "2026-08-12",
    readingMinutes: 7,
    ogImage: "/og/articles/contractor-unpaid-invoices.jpg",
    tool: {
      slug: "late-invoice-calculator",
      heading: "Price out what your late invoices cost",
      intro:
        "Pull your aging report, or your shoebox, and put in what is actually outstanding and how long it has been sitting. The cost of late payment is not just the money, it is the money you cannot use.",
      steps: [
        {
          name: "Total what is genuinely outstanding",
          text: "Everything invoiced and unpaid past its due date. Not work in progress and not what you have not billed yet. If you have not billed it yet, that is a different and more fixable problem.",
        },
        {
          name: "Use real days late, not average terms",
          text: "Count from the due date, not the invoice date. If your terms are net 30 and it has been 90 days, that is 60 days late, and 60 is the number that costs you.",
        },
        {
          name: "Put in what the money would be doing",
          text: "If you are carrying a line of credit or a card balance, use that rate, because that is literally what the delay is costing you. If you are not borrowing, use what you would have earned putting it into the next job.",
        },
        {
          name: "Count the chasing",
          text: "The hours you or your office spend calling, texting, resending and following up. That time is real, it is unbilled, and it is usually the part owners underestimate most.",
        },
      ],
      readIt: [
        "The carrying cost is the polite number. The number that matters is what those dollars would have earned in your next job, because that is the actual opportunity you gave up.",
        "If a handful of customers account for most of your late money, this is a customer problem, not a process problem. Fix the terms you give those specific people.",
        "Compare the total to what a deposit policy would have covered. In most contracting businesses, deposits alone would have prevented most of what is on that report.",
      ],
      formHeading: "Want your invoicing tightened up?",
      formLead:
        "Send me the total and how you bill today. I will tell you which two changes would stop most of it, and neither of them is buying more software.",
      interest: "build_with_you",
      industry: "Contracting and construction",
    },
    faq: [
      {
        q: "Can I charge late fees?",
        a: "Generally yes if it is written into the contract or estimate the customer accepted, and if the rate is within what your state allows. A late fee nobody agreed to in advance is very hard to collect and can hurt you in a dispute. Put it in the estimate, not in the reminder email. This is general information, not legal advice, and it is worth having a local attorney look at your terms once.",
      },
      {
        q: "How big should a deposit be?",
        a: "Enough to cover materials and mobilization so you are never funding somebody else's project out of pocket. What is customary varies by trade and by state, and some states cap deposits on certain residential work, so check yours before you set a policy.",
      },
      {
        q: "When should I file a lien?",
        a: "Mechanics lien rules are strict, deadlines are short and they vary a lot by state, including preliminary notice requirements you may have to send at the start of a job. If you do commercial or larger residential work, talk to a construction attorney once and set up your process around your state's deadlines rather than improvising per job.",
      },
      {
        q: "Should I stop working for a customer who owes me?",
        a: "Read your contract before you walk off a job, because stopping work can put you in breach depending on how it is written. The safer version is a payment schedule tied to milestones from the start, so unpaid work never gets big enough to be the question.",
      },
    ],
    body: `
You did the work. You did it well. The customer was happy. That was in March.

It is August and you are still sending the invoice.

Every contractor has some version of this, and most treat it as an annoyance instead of what it is: an interest-free loan you made to somebody who did not ask for it and is in no hurry to repay it.

## Late money is more expensive than it looks

The obvious cost is the cash you do not have. That is the small part.

The real costs stack up behind it. You are carrying a credit line or a card balance you would not need if the money had landed on time. You are turning down or delaying the next job because you cannot float the materials. You or your office are spending hours a month chasing, which is time nobody bills for. And there is the part you cannot put in a calculator, which is what it does to you on a Sunday when you are doing the math in your head instead of resting.

{{TOOL}}

## The two changes that stop most of it

Everything else on the internet about this is about chasing better. Chasing better is losing more slowly. These two change what gets chased in the first place.

**1. Deposits and progress payments, written into the estimate.**

Never fund somebody else's project. Materials and mobilization come out of their money, not yours. Then payments land at milestones you both agreed to before anybody picked up a tool, so unpaid work never accumulates into a number big enough to fight about.

This is the whole game. A contractor with a deposit policy and milestone billing has a fundamentally different aging report than one who invoices at the end and hopes.

**2. Terms in plain English on the document they sign.**

Due date. What happens after the due date. What a change order costs. What happens if the job stops for reasons outside your control. Not buried in fine print, and not in language nobody reads. Six clear sentences on the estimate does more work than any collections process.

If you do not have that language, there is a [free generator for the terms and the deposit wording](/tools/estimate-terms-generator) on this site, and another one for [late payment language](/tools/late-payment-language). Take what they give you to an attorney once for your state and then you have it forever.

## Then chase properly

Once the front end is fixed, the chasing gets simple, because there is much less of it.

Same schedule for everybody, no exceptions and no emotion. A reminder the day it is due. Another at seven days with the invoice attached again, because half the time it genuinely got lost. A phone call at fourteen. A written notice at thirty that references the terms they signed.

Automate the first two. Nobody should be manually sending a seven-day reminder in 2026, and a system that sends it on time is not embarrassed to.

## The customer you have to stop taking

There is usually one. Sometimes two. They are pleasant, they give you steady work, and they pay when they feel like it.

Run the calculator, then look at what share of that total is theirs. That is what their business actually costs you. Nine times out of ten you either put them on prepay or you let somebody else carry them, and the year gets better either way.

## A note on the legal side

I am not a lawyer and none of this is legal advice. Lien deadlines, deposit caps and late fee limits vary by state and some of them are unforgiving. Spend one hour with a construction attorney in your state, set your paperwork up right once, and stop improvising it per job.
`,
  },

  {
    slug: "salon-google-reviews",
    title: "How a salon gets more Google reviews without begging",
    description:
      "Stylists and barbers get told to ask for reviews and never told how. Here is the ask that works, the link that makes it one tap, and a target that is based on math instead of hope.",
    publishedAt: "2026-08-12",
    readingMinutes: 6,
    ogImage: "/og/articles/salon-google-reviews.jpg",
    tool: {
      slug: "google-review-link",
      heading: "Make your one-tap review link and QR code",
      intro:
        "This builds the direct link that opens the review box already open, plus a QR code you can put at the chair. No app, no account, nothing to buy.",
      steps: [
        {
          name: "Find your business on the tool",
          text: "Search the exact name as it appears on Google, with the city if there is more than one salon with your name. You want the profile customers actually see when they look you up.",
        },
        {
          name: "Take the link it gives you",
          text: "This is not your profile link. It is the review link, which opens the star box directly instead of dropping somebody on a page where they have to hunt for where to write.",
        },
        {
          name: "Print the QR code for the station",
          text: "Download the code and put it where the conversation happens. At the chair, at the mirror, on the card you hand back with the payment. Not on the door where nobody is standing still.",
        },
        {
          name: "Save the link into your text template",
          text: "Paste it into your booking software's follow-up text or your phone's saved replies so sending it takes two seconds instead of two minutes.",
        },
      ],
      readIt: [
        "One tap matters more than anything else here. Every extra step between asking and typing loses a chunk of the people who genuinely meant to do it.",
        "The QR at the chair is for the person who is already glowing at their reflection. The text link is for everyone else, sent an hour later.",
        "Do not gate the link behind a happiness question. Sending only happy customers to Google and everyone else somewhere else is against Google's policies and it can cost you the profile.",
      ],
      formHeading: "Want the review flow built into your booking?",
      formLead:
        "Tell me what you book with and I will tell you whether the follow-up text can be automated on what you already pay for, or whether it needs something added.",
      interest: "build_with_you",
      industry: "Salon and barbershop",
    },
    faq: [
      {
        q: "When exactly should I ask?",
        a: "At the mirror while they are still looking at the result, and then again by text about an hour later. The in-chair moment is when they feel it. The text is when they are somewhere they can actually type.",
      },
      {
        q: "Can I offer a discount for a review?",
        a: "No. Paying for reviews with money, discounts or free services violates Google's policies and can get reviews removed or the profile penalized. You can absolutely thank people, and you can remind them. You cannot buy them.",
      },
      {
        q: "What do I do about a bad review?",
        a: "Reply publicly, calmly, once, and offer to take it offline. You are not writing to the reviewer, you are writing to the next hundred people who read it. A short professional reply to a harsh review often does more for you than the review costs.",
      },
      {
        q: "How many reviews do I actually need?",
        a: "Enough to be credible and recent enough to look alive. A profile with steady new reviews usually reads better to a stranger than one with more total reviews that all stopped two years ago. Consistency beats volume.",
      },
    ],
    body: `
Every salon owner has been told to ask for Google reviews. Almost nobody is told how, so it comes out as an apology at the register while the customer is putting a card away and thinking about traffic.

"If you get a chance, a review would really help us out."

They mean it when they say yes. Then they leave and it is gone.

## Why the ask fails

It is not that people do not want to help. Regulars love their stylist. They will absolutely leave a review.

The ask fails for three reasons and all three are fixable.

**Wrong moment.** You asked at the register, which is the one moment in the visit that is about logistics. The moment they cared was three minutes earlier at the mirror.

**Too many steps.** Open Google, search the salon, pick the right one out of the map results, scroll, find the button, tap stars, type. That is seven steps for somebody standing in a parking lot. Most people fall off around step three.

**No reminder.** You asked once, in person, and never again. The person who genuinely intended to do it later got a phone call on the way home and forgot.

## Fix the steps first

The steps are the easiest of the three and it takes about two minutes.

{{TOOL}}

## Now fix the moment and the reminder

**The moment.** Ask at the mirror, not at the register. They are looking at the result, you are both standing there, and it is the only point in the visit where they feel exactly what you want them to write about.

The wording that works is specific, not generic. Not "leave us a review." Try: "If you like how it came out, would you mind saying so on Google? It genuinely helps people find us." Then hand them the QR or point at the card at the station.

**The reminder.** One text about an hour later. "Thanks for coming in today. If you have thirty seconds, here is the review link." Then the link. That is it. No follow-up on the follow-up, no second nudge, no guilt.

If your booking software can send that automatically after a completed appointment, turn it on today. If it cannot, a saved reply on your phone gets it down to two taps.

## The stylist problem

In a multi-chair shop this dies for a specific reason: the shop owner cares about the Google profile and the stylist behind the chair does not, because it is not their profile.

Two things fix it. Ask stylists to request reviews that name them, because a review that says "ask for Jess" sends the next person to Jess. And show the chair the number. People who can see a count move care about the count moving.

That makes the review request something that grows their book, not something that grows yours. Then it actually happens.

## What not to do

Do not buy them. Do not have your cousin write one. Do not use a service that filters unhappy customers away from Google and only sends the happy ones. That last one is called review gating, it is against Google's policies, and salons lose profiles over it.

The slow honest version compounds. The fast dishonest version has a cliff at the end.

## What good looks like

A steady trickle. A few new ones every week, from real customers, with real detail, mentioning real stylists by name, and every single one answered by you within a day or two.

That reads like a busy shop to a stranger, which is the entire point.
`,
  },

  {
    slug: "roofing-cost-per-lead",
    title: "What is a good cost per lead for a roofing company?",
    description:
      "Cost per lead is the wrong number to optimize. Here is how to work out what a roofing lead is actually worth to you, and what you can afford to pay for one.",
    publishedAt: "2026-08-12",
    readingMinutes: 7,
    ogImage: "/og/articles/roofing-cost-per-lead.jpg",
    tool: {
      slug: "cost-per-lead-calculator",
      heading: "Work out your cost per lead and cost per customer",
      intro:
        "Two numbers come out of this and the second one is the important one. Plenty of roofers know what a lead costs them. Very few know what a customer costs them, which is the number that decides whether the ads are working.",
      steps: [
        {
          name: "Use one channel at a time",
          text: "Do not blend Google, Facebook, a lead marketplace and door knocking into one number. They cost different amounts and close at very different rates, and blending them hides the one that is losing money.",
        },
        {
          name: "Count total spend, not just ad spend",
          text: "Ad budget plus what you pay anyone managing it plus any per-lead fees. If you pay a marketplace per lead and an agency to run Google, both belong in the channel they came from.",
        },
        {
          name: "Count leads the way you would defend it",
          text: "A lead is somebody who gave you contact information and wants a roof looked at. Not a click, not a form spam, not a wrong number. Clean the list before you divide.",
        },
        {
          name: "Enter your real close rate for that channel",
          text: "Out of those leads, how many signed. Use the last ninety days, not last year, and keep it channel specific. Marketplace leads and referral leads do not close the same and pretending otherwise wrecks the math.",
        },
      ],
      readIt: [
        "Cost per customer is the number to manage. A channel at ninety dollars a lead that closes one in four beats a channel at thirty a lead that closes one in twenty-five, every time.",
        "Compare cost per customer to your gross profit on an average job. If acquisition is eating a big share of gross profit, the problem is either the channel or the close rate, and you now know which.",
        "Run it separately for retail and insurance work. They have different close rates and different job values, and averaging them together tells you nothing you can act on.",
      ],
      formHeading: "Want to know which channel to cut?",
      formLead:
        "Send me the numbers by channel and I will tell you which one to kill, which one to feed, and whether the problem is actually your speed to lead instead of your ad spend.",
      interest: "build_with_you",
      industry: "Roofing",
    },
    faq: [
      {
        q: "What is a normal cost per lead for roofing?",
        a: "It varies enormously by market, season, storm activity and channel, and anybody who quotes you a single national number is guessing. The useful question is not what other people pay, it is what a lead is worth to you, which depends on your close rate and your job value.",
      },
      {
        q: "Are shared lead marketplaces worth it?",
        a: "Sometimes, at the right price, if you are fast. A shared lead is sold to several contractors and generally goes to whoever calls first. If you cannot respond within minutes, you are buying leads that other people are closing.",
      },
      {
        q: "Should I count storm chasing work separately?",
        a: "Yes. Storm season distorts every number in this business. Run your math on a normal period as your baseline, and treat storm windows as their own thing so you do not build your budget on numbers that only happen after hail.",
      },
      {
        q: "My cost per lead went up. Should I pause the ads?",
        a: "Look at cost per customer first. A rising cost per lead with a steady cost per customer means the leads got better, not worse. Pausing on cost per lead alone is how roofers turn off the channel that was actually working.",
      },
    ],
    body: `
Somebody in a Facebook group says they get roofing leads for twenty-two dollars. Somebody else says a hundred and forty. Both of them are telling the truth and neither number helps you.

Cost per lead on its own is a vanity metric. It is easy to move and it tells you almost nothing about whether the money is working.

## The number that matters

There are only two questions in paid lead generation.

What does it cost you to get a customer? And what is a customer worth to you?

If the second is comfortably bigger than the first, spend more. If it is not, fix something before you spend another dollar. Everything else, including cost per lead, is diagnostic detail underneath those two numbers.

A roofer paying twenty-two dollars a lead who closes one in forty is paying eight hundred and eighty dollars per customer. A roofer paying a hundred and forty who closes one in five is paying seven hundred. The second one has the better business, and if you only looked at cost per lead you would have picked the wrong one.

{{TOOL}}

## Three things that move cost per customer more than ad spend

**Speed.** This is the biggest one in roofing and it is not close. Roofing leads, especially shared ones, go to whoever calls first. Not whoever has the best reviews, not whoever has the nicest truck wrap. Whoever calls first. If your leads sit for two hours because they land in an inbox nobody watches, you are not buying leads, you are subsidizing your competitors' close rate.

**Who calls.** The person who calls a fresh roofing lead should be the person best at booking inspections, not whoever happens to be free. In a lot of companies the best closer is the owner and the leads go to whoever answered. That is backwards.

**What happens on the third day.** Most roofing leads do not sign on the first contact. They get an inspection, they get a proposal, and then they go quiet while they get two more quotes. What you do on days three through fourteen is where close rate is actually won, and in most companies the answer is nothing, because nobody has a follow-up sequence.

## Where the leak usually is

Run the numbers per channel and you will typically find one of three patterns.

**One channel is carrying everything.** Cut the others and put the money there. This is the good outcome and it happens more than people expect.

**Every channel looks bad.** That is almost never a channel problem. That is a close rate problem or a speed problem, and buying more leads will make it worse, not better, because you will be losing more of them faster.

**The numbers do not exist.** You cannot say how many leads came from where, or what closed. This is the most common outcome, and it is the real finding. You have been making budget decisions on feel. Fix the tracking before you touch the budget.

## Before you spend another dollar

Answer these four in writing. If you cannot, that is the project, not the ads.

Where did every lead in the last ninety days come from. How fast did somebody talk to a human. Which ones signed. What was the job worth.

A roofing company that can answer those four questions can improve. One that cannot is just buying lottery tickets with a monthly budget.

If you want to see what the delay is costing on its own, the [lead response time math](/articles/missed-calls-cost-customers) is worth running before you look at your ad account again.
`,
  },

  {
    slug: "trucking-cost-per-mile",
    title: "How to work out your cost per mile (owner operators and hotshot)",
    description:
      "If you do not know your cost per mile you cannot know whether a load pays. Here is how to work it out properly, including the costs most owner operators leave out.",
    publishedAt: "2026-08-12",
    readingMinutes: 7,
    ogImage: "/og/articles/trucking-cost-per-mile.jpg",
    tool: {
      slug: "cost-per-mile-calculator",
      heading: "Work out what a mile actually costs you",
      intro:
        "Fixed costs, variable costs and the miles you actually run. The tool splits it the way it needs splitting so you can see what an empty mile costs as well as a loaded one.",
      steps: [
        {
          name: "List fixed costs first",
          text: "Truck and trailer payments, insurance, permits, plates, ELD subscription, accounting, parking. Everything you pay in a month whether the wheels turn or not. These are the ones that punish a slow month.",
        },
        {
          name: "Then variable, per mile",
          text: "Fuel, tires, oil and maintenance, tolls, def. Use a real average from your own records, not a manufacturer number and not what you paid the one good week.",
        },
        {
          name: "Use total miles, including deadhead",
          text: "This is the one people get wrong. Deadhead miles cost the same fuel and the same wear as loaded miles and earn nothing. If you divide by loaded miles only, your cost per mile is fiction.",
        },
        {
          name: "Pay yourself in the math",
          text: "Put your own pay in as a cost. A truck that only breaks even after the owner works for free is not a business, and you will not find that out until something expensive breaks.",
        },
      ],
      readIt: [
        "The number that comes out is your floor. Any load under it loses money, no matter how good the rate per mile sounds against what somebody else got.",
        "Look at the fixed portion on its own. That is what a week off costs you, and it is why sitting is more expensive than most owner operators think.",
        "Run it again with fewer total miles, like a slow month. Cost per mile goes up when miles go down, which is exactly when rates are usually worst. That is the squeeze that ends most one-truck operations.",
      ],
      formHeading: "Want the back office side handled?",
      formLead:
        "Tell me your cost per mile and how you track loads today. I will tell you straight whether a system is worth it at one truck or whether a spreadsheet is genuinely fine for now.",
      interest: "unsure",
      industry: "Trucking and hotshot",
    },
    faq: [
      {
        q: "Should deadhead miles be in the calculation?",
        a: "Yes. They burn fuel and wear tires and earn nothing. Divide total costs by total miles run, then when you quote a load, look at the total miles that load requires including getting to it. Rate per loaded mile is a broker's framing, not yours.",
      },
      {
        q: "Do I include my own pay as a cost?",
        a: "Yes, if you want a real number. If your pay is whatever is left over, then your cost per mile will always look fine and you will never know you are underpricing until a transmission goes out.",
      },
      {
        q: "How often should I recalculate?",
        a: "Quarterly at minimum, and any time fuel moves hard or you take on a new payment. A cost per mile from eighteen months ago is a number about a truck you no longer operate.",
      },
      {
        q: "What about maintenance I have not paid for yet?",
        a: "Set an amount per mile aside for it even if nothing is broken right now. Tires, brakes and a major service are not surprises, they are scheduled expenses you have not been billed for yet. Owner operators who skip this line are the ones a breakdown takes out.",
      },
    ],
    body: `
A broker offers you two dollars and forty cents a mile. Is that good?

You cannot answer that. Nobody can answer that for you, and every person in a Facebook group who tells you what rate to hold out for is talking about their truck, their payment, their insurance and their lane.

The only number that makes that question answerable is your own cost per mile.

## Why the number is usually wrong

Most owner operators have a cost per mile somewhere in their head. It is almost always too low, for four specific reasons.

**Deadhead is not counted.** You ran twelve hundred miles this week. Nine hundred were loaded. If you divide your costs by nine hundred you get a number that has nothing to do with your bank account.

**Maintenance is counted only when it happens.** Tires are not a surprise. Brakes are not a surprise. A major service at a known interval is not a surprise. If those only show up in the month they get paid, your cost per mile looks great eleven months a year and terrible in the twelfth.

**The owner works for free.** Whatever is left over is the pay. That is not pay, that is residue, and it means the truck can be losing money for a long time without anybody noticing.

**Fixed costs get forgotten in a good month.** When you run hard, fixed costs spread thin and everything looks fine. Then you sit for ten days with a repair and discover that the payment, the insurance and the permits did not care.

{{TOOL}}

## What to do with it

**Set a floor and hold it.** Below your cost per mile you are paying to work. Not "making less", paying. There is no volume argument that fixes a load below cost, because more of them makes it worse.

**Quote on total miles.** When a load comes up, the miles that matter are the miles from where you are to where it ends, not the miles the freight moves. A load at a great rate per loaded mile that requires two hundred deadhead miles to get to might be worse than a mediocre one out your back door.

**Watch what sitting costs.** Take your monthly fixed costs and divide by thirty. That is what a day of not moving costs before you burn a gallon of fuel. Owner operators who see that number get a lot more decisive about repairs and a lot less romantic about waiting for a better rate.

**Recalculate quarterly.** Fuel moves. Insurance renews. A new payment changes everything. A cost per mile from last year is a fact about a truck you do not operate anymore.

## The one nobody wants to hear

If you run the honest version, including your pay, including deadhead, including maintenance you have not been billed for, and the number says the truck does not clear a living, that is not a reason to run harder.

Running harder is how the number gets worse, because more miles on the same equipment pulls maintenance forward and you have already spent the money you were going to fix it with.

The answer is either better freight, lower fixed costs, or a different setup. All three of those are decisions, and you cannot make any of them without the number.

## The back office part

The other thing that quietly eats one-truck operations is the paperwork. Rate cons in a text thread, invoices sent late, detention never billed, factoring fees nobody checks.

That is a systems problem, not a trucking problem, and it has [the same shape as every other unpaid invoice problem](/articles/contractor-unpaid-invoices). The money is earned. It is just not collected.
`,
  },

  {
    slug: "cleaning-business-hire-or-stay-solo",
    title: "Should a cleaning business hire, or stay solo?",
    description:
      "An employee costs a lot more than their hourly wage. Work out the true cost of your first hire, what they have to bill to pay for themselves, and whether staying solo is actually the better business.",
    publishedAt: "2026-08-12",
    readingMinutes: 7,
    ogImage: "/og/articles/cleaning-business-hire-or-stay-solo.jpg",
    tool: {
      slug: "employee-true-cost",
      heading: "Work out what your first hire really costs",
      intro:
        "Wage is the smallest part of it. This adds the employer taxes, the insurance, the supplies, the training time and the hours they are on the clock but not in a house.",
      steps: [
        {
          name: "Start with the honest wage",
          text: "What you would actually have to pay to get somebody reliable in your area, not what you wish the job paid. In cleaning, the difference between those two numbers is the whole turnover problem.",
        },
        {
          name: "Add employer taxes and insurance",
          text: "Payroll taxes, workers comp, and any liability or bonding your clients require. Rates vary by state and by classification, so use your own quotes rather than a rule of thumb.",
        },
        {
          name: "Add the costs that come with a person",
          text: "Extra supplies and equipment, uniforms, background check, phone or app seat, and mileage or a vehicle if they drive. Every one of these is real and none of them are in the hourly rate.",
        },
        {
          name: "Count unbillable hours honestly",
          text: "Drive time between houses, restocking, training weeks, and the gaps in a day that is not fully booked. A cleaner paid for eight hours who is in houses for five is costing you three hours of nothing.",
        },
      ],
      readIt: [
        "The loaded hourly cost is what an hour of that person actually costs you. Compare it to what you bill per hour, not to their wage, or you will convince yourself of something that is not true.",
        "The break-even is how many billable hours a week they have to run before they stop costing you money. If that number is close to a full schedule, the hire is fragile and one slow month hurts.",
        "Run it a second time at ninety percent of full schedule. That is a realistic year with sick days and cancellations in it, and it is the version that tells you whether this works when things are normal instead of perfect.",
      ],
      formHeading: "Not sure whether to hire?",
      formLead:
        "Send me the numbers and what your schedule looks like. I will give you a straight read on whether this is a hiring decision or a pricing decision, because in cleaning it is usually a pricing decision.",
      interest: "blueprint",
      industry: "Cleaning services",
    },
    faq: [
      {
        q: "Employee or contractor?",
        a: "Be careful here. Whether somebody is legally a contractor depends on how much control you have over how and when the work gets done, and the tests differ between the IRS and your state. In residential cleaning, where you set the schedule, the route and the standards, workers are frequently employees regardless of what the paperwork says. Misclassification penalties are serious. Ask an accountant or employment attorney in your state before you decide.",
      },
      {
        q: "What if I just raise prices instead?",
        a: "Often the better first move. A price increase has no payroll tax, no workers comp, no training time and no turnover. Work out what a ten percent increase would do to your take-home before you take on a person, because for a lot of solo cleaners it beats the hire outright.",
      },
      {
        q: "How many clients do I need before hiring?",
        a: "Enough that the new person has a nearly full book on day one, plus enough demand that you are turning work away. Hiring into hope is how cleaning businesses end up paying somebody to sit. The break-even hours in the tool are the number to beat.",
      },
      {
        q: "What does turnover really cost?",
        a: "Recruiting time, background checks, training hours where you are paying two people to clean one house, and the client who leaves because the third new face in six months did not do it the way they like. That last one is the expensive part and it never shows up on a payroll report.",
      },
    ],
    body: `
You are booked. You are turning work away. Everybody tells you the next step is to hire somebody.

Maybe. Or maybe the next step is to charge more and keep your evenings.

The only way to know is to price the hire honestly, and almost nobody does, because the number people compare against is the wage.

## The wage is the small part

Say you would pay twenty an hour. That is not what it costs you.

On top of the wage there are employer payroll taxes. Workers comp, which in cleaning is not cheap because of the injury profile. Liability and bonding, because half your commercial clients require it. Supplies and equipment for a second person. Uniforms. A background check, because clients ask. Mileage or a vehicle if they drive between houses. A seat in whatever software you use.

Then there are the hours. You pay for eight. They are inside houses for maybe five or six once you count driving between jobs, restocking, and the fact that the schedule is not perfectly packed.

Stack it up and the real cost of an hour of that person's time is a long way from twenty dollars.

{{TOOL}}

## The three outcomes

**The break-even hours are comfortably below a full schedule.** Good. You have room for a slow week without the hire becoming a problem. This is the version where hiring works.

**The break-even is close to a full schedule.** This hire only works if everything goes right. One sick week, one client pausing, one slow month and you are paying somebody out of your own pocket. Either raise prices first or wait until you have more demand than one person can absorb.

**The break-even is above a full schedule.** You cannot hire at your current prices. Not "hiring is hard right now". Cannot. The hire would lose money in a perfect month. This is a pricing problem wearing a staffing problem's clothes, and it is the most common result.

## The option nobody offers you

Stay solo and raise prices.

It is not the ambitious answer and nobody posts about it. But a solo cleaner charging properly, with a tight route and no payroll, often takes home more than the same person running two employees at prices that were set back when they were doing it all themselves.

Growth is not the same thing as income. A bigger business with thinner margins and a payroll to make every Friday is a different job with more stress, and it is worth choosing on purpose rather than drifting into.

If you have never worked out what your hour has to be worth, [start there](/articles/lawn-care-hourly-rate). It is written for lawn care but the math is identical for cleaning, and the answer changes this decision more than anything else on this page.

## If you do hire

**Hire into a full book, not into hope.** They should have a nearly full schedule on day one, from work you are already turning away.

**Write down how you do it before day one.** Not in your head. Room order, products, what "done" looks like, what to do when the dog is loose and what to do when something breaks. Cleaning businesses lose clients on the third visit from a new person, not the first, and it is almost always because nobody wrote down the standard.

**Get the classification right.** Employee versus contractor is not a preference, it is a legal test, and in residential cleaning where you set the schedule and the standards it very often lands on employee. Ask an accountant in your state before you make the choice, not after a letter arrives.

**Expect the first ninety days to cost more than the math says.** Training hours, mistakes, and a rework or two. Budget for it so it does not read as a failure when it happens.

## The honest summary

Hiring is not a reward for being busy. It is a bet that you can sell enough work to keep another person full, at prices that cover what that person actually costs.

Run the number. If it works, hire with your eyes open. If it does not, raise your prices and enjoy a business that fits in one truck.
`,
  },
];
