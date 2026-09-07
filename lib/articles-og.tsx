import type { ReactElement } from "react";
import type { Article } from "./articles";

export const ARTICLE_OG_SIZE = { width: 1200, height: 630 } as const;

const NAVY = "#050D1B";
const WHITE = "#F8FBFF";
const MUTED = "#C3D0E0";

const V4_ARTICLE_SLUGS = [
  "data-centers-are-coming-to-texas",
  "the-money-is-in-the-follow-up",
  "marketplace-is-not-your-website",
  "small-business-website-cost",
  "website-builder-monthly-fees",
  "does-my-business-need-a-crm",
  "website-traffic-but-no-customers",
  "missed-calls-cost-customers",
  "facebook-page-is-not-a-website",
  "own-your-email-list",
  "east-texas-business-website-guide",
  "cost-of-renting-business-software",
  "ai-website-small-business-2026",
  "lawn-care-hourly-rate",
  "hvac-missed-calls-cost",
  "dental-office-no-show-cost",
  "auto-shop-credit-card-fees",
  "restaurant-delivery-app-fees",
  "contractor-unpaid-invoices",
  "salon-google-reviews",
  "roofing-cost-per-lead",
  "trucking-cost-per-mile",
  "cleaning-business-hire-or-stay-solo",
  "med-spa-discount-damage",
  "gym-break-even-members",
  "food-truck-taxes-set-aside",
  "mobile-detailing-drive-time",
  "appliance-repair-unclosed-quotes",
  "fencing-contractor-raise-prices",
  "wedding-photographer-after-hours-leads",
  "plumber-call-back-speed",
  "electrician-job-capacity",
  "painting-contractor-markup-vs-margin",
  "barbershop-booth-rent-vs-commission",
  "chiropractor-google-business-profile",
  "towing-truck-downtime-cost",
  "bakery-menu-margins",
  "used-car-lot-slow-website",
  "daycare-late-pickup-policy",
  "real-estate-agent-seo-value",
] as const;

const V4_ARTICLE_ART = Object.fromEntries(
  V4_ARTICLE_SLUGS.map((slug) => [slug, `/images/articles-v4/${slug}.jpg`]),
) as Record<string, string>;

const PREMIUM_ARTICLE_ART: Record<string, string> = {
  "how-to-compare-a-better-close-rate-with-buying-more-leads":
    "/og/tools/close-rate-calculator.jpg",
  "how-to-turn-a-yearly-revenue-goal-into-a-weekly-activity-plan":
    "/og/tools/lead-goal-planner.jpg",
  "hvac-maintenance-plans": "/og/tools/payment-plan-calculator.jpg",
  "what-to-write-down-before-comparing-two-equipment-loans":
    "/og/tools/loan-payment-calculator.jpg",
  "how-to-read-a-cash-runway-estimate-without-counting-credit-as-cash":
    "/og/tools/cash-runway-calculator.jpg",
  "how-to-separate-sales-tax-from-a-tax-inclusive-total":
    "/og/tools/sales-tax-calculator.jpg",
  "how-to-compare-overtime-costs-with-a-hiring-scenario":
    "/og/tools/overtime-cost-calculator.jpg",
  "why-ad-revenue-and-ad-profit-need-separate-columns":
    "/og/tools/roas-calculator.jpg",
  "how-to-build-an-ad-budget-scenario-from-your-own-records":
    "/og/tools/ad-budget-planner.jpg",
  "how-long-does-a-new-customer-take-to-repay-acquisition-cost":
    "/og/tools/cac-payback-calculator.jpg",
  "how-to-scope-an-ad-test-before-splitting-the-budget":
    "/og/tools/ad-test-budget-calculator.jpg",
  "how-to-find-one-admin-task-worth-simplifying-this-week":
    "/og/tools/admin-time-audit.jpg",
  "how-to-decide-whether-a-weekly-meeting-earns-its-time":
    "/og/tools/meeting-cost-calculator.jpg",
  "how-to-compare-the-work-you-do-with-the-work-you-could-delegate":
    "/og/tools/owner-hourly-worth.jpg",
  "how-to-read-a-review-rating-goal-without-gaming-reviews":
    "/og/tools/review-goal-calculator.jpg",
  "what-one-low-rating-changes-and-what-it-cannot-tell-you":
    "/og/tools/bad-review-impact.jpg",
  "how-to-reply-to-a-review-without-arguing-in-public":
    "/og/tools/review-response-writer.jpg",
  "how-to-test-a-website-improvement-before-buying-more-visits":
    "/og/tools/conversion-lift-calculator.jpg",
  "how-to-put-a-useful-qr-code-on-a-printed-flyer":
    "/og/tools/qr-code-maker.jpg",
  "how-to-make-a-guest-wi-fi-card-customers-can-use":
    "/og/tools/wifi-qr-code.jpg",
  "how-to-make-a-contact-card-people-can-save":
    "/og/tools/digital-business-card.jpg",
  "how-to-add-a-call-button-and-check-it-on-your-phone":
    "/og/tools/click-to-call-button.jpg",
  "how-to-write-a-text-us-button-that-starts-the-right-conversation":
    "/og/tools/sms-link-generator.jpg",
  "how-to-tag-a-campaign-link-without-putting-private-data-in-it":
    "/og/tools/utm-link-builder.jpg",
  "how-to-make-an-email-signature-with-one-clear-next-step":
    "/og/tools/email-signature-generator.jpg",
  "how-to-write-a-missed-call-reply-that-tells-people-what-happens-next":
    "/og/tools/missed-call-textback-script.jpg",
  "how-to-ask-for-an-honest-review-after-the-work-is-done":
    "/og/tools/review-request-script.jpg",
  "how-to-check-your-business-details-before-adding-structured-data":
    "/og/tools/localbusiness-schema-generator.jpg",
  "how-to-turn-real-customer-questions-into-useful-website-answers":
    "/og/tools/faq-schema-generator.jpg",
  "how-to-replace-a-page-title-called-home-with-something-useful":
    "/og/tools/meta-title-description-writer.jpg",
  "how-to-check-ad-copy-before-you-paste-it-into-the-platform":
    "/og/tools/ad-character-counter.jpg",
  "how-to-make-a-directions-link-that-reaches-the-right-entrance":
    "/og/tools/google-maps-link-generator.jpg",
  "how-to-give-event-guests-a-calendar-link-they-can-check":
    "/og/tools/add-to-calendar-link.jpg",
  "how-to-leave-callers-with-a-clear-next-step":
    "/og/tools/voicemail-script-generator.jpg",
  "how-to-write-a-job-post-that-explains-the-actual-work":
    "/og/tools/job-post-writer.jpg",
  "how-to-write-one-useful-google-business-profile-update":
    "/og/tools/google-post-writer.jpg",
  "how-to-check-robots-txt-without-treating-it-as-a-lock":
    "/og/tools/robots-txt-generator.jpg",
  "how-to-put-a-month-s-bills-on-one-clear-page":
    "/og/tools/household-budget-planner.jpg",
  "how-to-compare-two-package-sizes-before-buying-the-bigger-one":
    "/og/tools/grocery-unit-price-calculator.jpg",
  "how-to-compare-the-costs-that-come-with-a-job":
    "/og/tools/childcare-vs-work-calculator.jpg",
  "how-to-find-the-renewals-you-stopped-noticing":
    "/og/tools/subscription-audit.jpg",
  "how-to-turn-a-cash-cushion-goal-into-a-monthly-target":
    "/og/tools/emergency-fund-calculator.jpg",
  "how-to-check-what-an-extra-payment-changes-in-a-simple-debt-model":
    "/og/tools/debt-payoff-planner.jpg",
  "how-to-compare-rent-with-the-bills-you-already-have":
    "/og/tools/rent-affordability-estimator.jpg",
  "how-to-compare-two-job-offers-when-the-hours-are-different":
    "/og/tools/salary-to-hourly-converter.jpg",
  "insurance-agent-lead-response": "/og/tools/lead-response-time.jpg",
  "locksmith-after-hours-calls": "/og/tools/after-hours-lead-calculator.jpg",
  "one-useful-business-task-with-ai":
    "/images/articles-v4/ai-website-small-business-2026.jpg",
  "give-every-inquiry-an-owner-and-next-step":
    "/images/articles-v4/does-my-business-need-a-crm.jpg",
  "bring-one-real-task-to-your-business-workshop":
    "/og/events/chatgpt-for-business-owners-longview.jpg",
  ...V4_ARTICLE_ART,
  // September 2026 field notes reuse existing repo art on purpose: the Premier
  // piece shows the real client site, and the mobile piece shares the traffic
  // leak scene its argument extends.
  "free-tools-that-bring-customers": "/og/portfolio/premier-dental.jpg",
  "website-text-too-small-on-mobile": "/og/portfolio/theleadflowpro.jpg",
  "pressure-washing-pricing":
    "/images/articles-v3/pressure-washing-pricing-scene.webp",
  "pest-control-customer-value":
    "/images/articles-v3/pest-control-customer-value-scene.webp",
  "tree-service-buy-or-rent-equipment":
    "/images/articles-v3/tree-service-buy-or-rent-equipment-scene.webp",
};

const PREMIUM_ARTICLE_OG_ART: Record<string, string> = {
  "pressure-washing-pricing":
    "/images/articles-v3/pressure-washing-pricing-scene-og.png",
  "pest-control-customer-value":
    "/images/articles-v3/pest-control-customer-value-scene-og.png",
  "tree-service-buy-or-rent-equipment":
    "/images/articles-v3/tree-service-buy-or-rent-equipment-scene-og.png",
};

const VISUAL_HEADLINES: Record<string, string> = {
  "how-to-compare-a-better-close-rate-with-buying-more-leads":
    "Check the Close Rate First",
  "how-to-turn-a-yearly-revenue-goal-into-a-weekly-activity-plan":
    "Turn the Goal Into Weekly Work",
  "hvac-maintenance-plans": "Make Every Installment Clear",
  "what-to-write-down-before-comparing-two-equipment-loans":
    "Compare the Full Loan Cost",
  "how-to-read-a-cash-runway-estimate-without-counting-credit-as-cash":
    "Count the Cash You Have",
  "how-to-separate-sales-tax-from-a-tax-inclusive-total":
    "Separate the Tax From the Total",
  "how-to-compare-overtime-costs-with-a-hiring-scenario":
    "Compare Cost With Actual Coverage",
  "why-ad-revenue-and-ad-profit-need-separate-columns":
    "Give Ad Revenue Its Cost Columns",
  "how-to-build-an-ad-budget-scenario-from-your-own-records":
    "Build a Budget You Can Explain",
  "how-long-does-a-new-customer-take-to-repay-acquisition-cost":
    "Know When Acquisition Cost Comes Back",
  "how-to-scope-an-ad-test-before-splitting-the-budget":
    "Give Your Ad Test One Question",
  "how-to-find-one-admin-task-worth-simplifying-this-week":
    "Find One Task Worth Simplifying",
  "how-to-decide-whether-a-weekly-meeting-earns-its-time":
    "Give Every Meeting a Clear Job",
  "how-to-compare-the-work-you-do-with-the-work-you-could-delegate":
    "Make the Handoff Worth the Time",
  "how-to-read-a-review-rating-goal-without-gaming-reviews":
    "Understand the Average. Invite Honest Feedback.",
  "what-one-low-rating-changes-and-what-it-cannot-tell-you":
    "Check the Math Before You React",
  "how-to-reply-to-a-review-without-arguing-in-public":
    "Reply With Facts and a Next Step",
  "how-to-test-a-website-improvement-before-buying-more-visits":
    "Make the Next Click Make Sense",
  "how-to-put-a-useful-qr-code-on-a-printed-flyer": "Make a QR People Can Use",
  "how-to-make-a-guest-wi-fi-card-customers-can-use":
    "Share Wi-Fi Without the Typing",
  "how-to-make-a-contact-card-people-can-save":
    "Make Your Contact Details Easy to Save",
  "how-to-add-a-call-button-and-check-it-on-your-phone":
    "Make Your Phone Number Work",
  "how-to-write-a-text-us-button-that-starts-the-right-conversation":
    "Start the Message With One Tap",
  "how-to-tag-a-campaign-link-without-putting-private-data-in-it":
    "Know Which Link Brought the Visit",
  "how-to-make-an-email-signature-with-one-clear-next-step":
    "Give Every Email a Useful Ending",
  "how-to-write-a-missed-call-reply-that-tells-people-what-happens-next":
    "Give the Missed Call a Next Step",
  "how-to-ask-for-an-honest-review-after-the-work-is-done":
    "Ask for Feedback Without Steering It",
  "how-to-check-your-business-details-before-adding-structured-data":
    "Describe the Business You Actually Run",
  "how-to-turn-real-customer-questions-into-useful-website-answers":
    "Make Every Answer Match the Page",
  "how-to-replace-a-page-title-called-home-with-something-useful":
    "Write a Clear Search Result",
  "how-to-check-ad-copy-before-you-paste-it-into-the-platform":
    "Fit the Message Before You Publish",
  "how-to-make-a-directions-link-that-reaches-the-right-entrance":
    "Send People to the Right Place",
  "how-to-give-event-guests-a-calendar-link-they-can-check":
    "Make the Event Easy to Save",
  "how-to-leave-callers-with-a-clear-next-step":
    "Tell Callers What Happens Next",
  "how-to-write-a-job-post-that-explains-the-actual-work":
    "Write a Job People Can Understand",
  "how-to-write-one-useful-google-business-profile-update":
    "Publish One Clear Business Update",
  "how-to-check-robots-txt-without-treating-it-as-a-lock":
    "Guide Crawlers Without Hiding Private Data",
  "how-to-put-a-month-s-bills-on-one-clear-page":
    "Give Every Household Dollar a Place",
  "how-to-compare-two-package-sizes-before-buying-the-bigger-one":
    "Compare the Price for Equal Amounts",
  "how-to-compare-the-costs-that-come-with-a-job":
    "Compare the Whole Workday Cost",
  "how-to-find-the-renewals-you-stopped-noticing":
    "Find the Charges You Still Want",
  "how-to-turn-a-cash-cushion-goal-into-a-monthly-target":
    "Choose a Buffer You Can Explain",
  "how-to-check-what-an-extra-payment-changes-in-a-simple-debt-model":
    "See What the Extra Payment Changes",
  "how-to-compare-rent-with-the-bills-you-already-have":
    "Check the Costs Beyond the Rent",
  "how-to-compare-two-job-offers-when-the-hours-are-different":
    "Compare Pay Using Actual Working Time",
  "insurance-agent-lead-response": "Make the First Reply Useful",
  "locksmith-after-hours-calls": "Know Your After-Hours Gap",
  "one-useful-business-task-with-ai": "One Task. One Useful Result.",
  "give-every-inquiry-an-owner-and-next-step": "Every Inquiry Has a Next Step",
  "bring-one-real-task-to-your-business-workshop":
    "Bring a Task. Learn the Process.",
  "free-tools-that-bring-customers": "Free Tools Fill the Funnel",
  "website-text-too-small-on-mobile": "The Phone Is the Website",
  "data-centers-are-coming-to-texas": "Build for What Is Coming",
  "the-money-is-in-the-follow-up": "Follow-Up Catches Demand",
  "marketplace-is-not-your-website": "Own the Home Base",
  "small-business-website-cost": "Know What You Are Buying",
  "website-builder-monthly-fees": "Stop Renting the Foundation",
  "does-my-business-need-a-crm": "One Place for Every Lead",
  "website-traffic-but-no-customers": "Traffic Is Not Conversion",
  "missed-calls-cost-customers": "Every Missed Call Leaks",
  "facebook-page-is-not-a-website": "Own the Front Door",
  "own-your-email-list": "The Audience Must Be Yours",
  "east-texas-business-website-guide": "Answer the Buying Question",
  "cost-of-renting-business-software": "Subscription Stacks Become Rent",
  "ai-website-small-business-2026": "AI Still Needs a System",
  "lawn-care-hourly-rate": "Price the Route, Not Hours",
  "hvac-missed-calls-cost": "Capture the Emergency Call",
  "dental-office-no-show-cost": "Reminders Protect the Chair",
  "auto-shop-credit-card-fees": "Price the Payment Cost",
  "restaurant-delivery-app-fees": "Know the Channel Margin",
  "contractor-unpaid-invoices": "The Job Is Not Paid",
  "salon-google-reviews": "Make the Review Ask Automatic",
  "roofing-cost-per-lead": "Track Cost Through the Sale",
  "trucking-cost-per-mile": "Every Mile Has a Cost",
  "cleaning-business-hire-or-stay-solo": "Know Your Capacity Ceiling",
  "pressure-washing-pricing": "Price the Whole Job",
  "pest-control-customer-value": "Retention Creates Value",
  "tree-service-buy-or-rent-equipment": "Know the Crossover Point",
  "med-spa-discount-damage": "Discounts Replace Full Margin",
  "gym-break-even-members": "Know the Member Floor",
  "food-truck-taxes-set-aside": "Set the Tax Money Aside",
  "mobile-detailing-drive-time": "Drive Time Is Labor",
  "appliance-repair-unclosed-quotes": "Unclosed Quotes Are Inventory",
  "fencing-contractor-raise-prices": "Price Increases Need Math",
  "wedding-photographer-after-hours-leads": "After-Hours Demand Still Counts",
  "plumber-call-back-speed": "The Callback Clock Is Running",
  "electrician-job-capacity": "Capacity Is a Scheduling Problem",
  "painting-contractor-markup-vs-margin": "Markup Is Not Margin",
  "barbershop-booth-rent-vs-commission": "Choose the Right Chair Model",
  "chiropractor-google-business-profile": "Own the Local Search Signal",
  "towing-truck-downtime-cost": "Downtime Owns the Truck",
  "bakery-menu-margins": "Every Item Needs Margin",
  "used-car-lot-slow-website": "Speed Keeps Buyers Moving",
  "daycare-late-pickup-policy": "Policy Needs an Automatic Clock",
  "real-estate-agent-seo-value": "Rankings Need Owned Follow-Up",
};

const PREMIUM_ARTICLE_ALT: Record<string, string> = {
  "how-to-compare-a-better-close-rate-with-buying-more-leads":
    "The LeadFlow Pro Close Rate Impact Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-turn-a-yearly-revenue-goal-into-a-weekly-activity-plan":
    "The LeadFlow Pro Reverse Revenue Goal Planner graphic with the tool name and its labeled planning illustration.",
  "hvac-maintenance-plans":
    "The LeadFlow Pro Payment Plan Builder graphic with the tool name and its labeled planning illustration.",
  "what-to-write-down-before-comparing-two-equipment-loans":
    "The LeadFlow Pro Equipment & Loan Payment Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-read-a-cash-runway-estimate-without-counting-credit-as-cash":
    "The LeadFlow Pro Cash Runway Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-separate-sales-tax-from-a-tax-inclusive-total":
    "The LeadFlow Pro Sales Tax Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-compare-overtime-costs-with-a-hiring-scenario":
    "The LeadFlow Pro Overtime Cost Calculator graphic with the tool name and its labeled planning illustration.",
  "why-ad-revenue-and-ad-profit-need-separate-columns":
    "The LeadFlow Pro Ad Spend & ROAS Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-build-an-ad-budget-scenario-from-your-own-records":
    "The LeadFlow Pro Ad Budget Planner graphic with the tool name and its labeled planning illustration.",
  "how-long-does-a-new-customer-take-to-repay-acquisition-cost":
    "The LeadFlow Pro Customer Payback Period Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-scope-an-ad-test-before-splitting-the-budget":
    "The LeadFlow Pro Ad Test Budget Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-find-one-admin-task-worth-simplifying-this-week":
    "The LeadFlow Pro Admin Time Audit graphic with the tool name and its labeled planning illustration.",
  "how-to-decide-whether-a-weekly-meeting-earns-its-time":
    "The LeadFlow Pro Meeting Cost Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-compare-the-work-you-do-with-the-work-you-could-delegate":
    "The LeadFlow Pro What Your Hour Is Worth graphic with the tool name and its labeled planning illustration.",
  "how-to-read-a-review-rating-goal-without-gaming-reviews":
    "The LeadFlow Pro Star Rating Goal Calculator graphic with the tool name and its labeled planning illustration.",
  "what-one-low-rating-changes-and-what-it-cannot-tell-you":
    "The LeadFlow Pro Bad Review Impact Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-reply-to-a-review-without-arguing-in-public":
    "The LeadFlow Pro Review Response Writer graphic with the tool name and its labeled planning illustration.",
  "how-to-test-a-website-improvement-before-buying-more-visits":
    "The LeadFlow Pro Conversion Rate Lift Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-put-a-useful-qr-code-on-a-printed-flyer":
    "The LeadFlow Pro QR Code Maker graphic with the tool name and its labeled planning illustration.",
  "how-to-make-a-guest-wi-fi-card-customers-can-use":
    "The LeadFlow Pro Wi-Fi QR Code Generator graphic with the tool name and its labeled planning illustration.",
  "how-to-make-a-contact-card-people-can-save":
    "The LeadFlow Pro Digital Business Card Maker graphic with the tool name and its labeled planning illustration.",
  "how-to-add-a-call-button-and-check-it-on-your-phone":
    "The LeadFlow Pro Click-to-Call Button Builder graphic with the tool name and its labeled planning illustration.",
  "how-to-write-a-text-us-button-that-starts-the-right-conversation":
    "The LeadFlow Pro Text Message Link Generator graphic with the tool name and its labeled planning illustration.",
  "how-to-tag-a-campaign-link-without-putting-private-data-in-it":
    "The LeadFlow Pro UTM Link Builder graphic with the tool name and its labeled planning illustration.",
  "how-to-make-an-email-signature-with-one-clear-next-step":
    "The LeadFlow Pro Email Signature Generator graphic with the tool name and its labeled planning illustration.",
  "how-to-write-a-missed-call-reply-that-tells-people-what-happens-next":
    "The LeadFlow Pro Missed Call Text-Back Script Writer graphic with the tool name and its labeled planning illustration.",
  "how-to-ask-for-an-honest-review-after-the-work-is-done":
    "The LeadFlow Pro Review Request Script Writer graphic with the tool name and its labeled planning illustration.",
  "how-to-check-your-business-details-before-adding-structured-data":
    "The LeadFlow Pro LocalBusiness Schema Generator graphic with the tool name and its labeled planning illustration.",
  "how-to-turn-real-customer-questions-into-useful-website-answers":
    "The LeadFlow Pro FAQ Schema Generator graphic with the tool name and its labeled planning illustration.",
  "how-to-replace-a-page-title-called-home-with-something-useful":
    "The LeadFlow Pro Page Title & Description Writer graphic with the tool name and its labeled planning illustration.",
  "how-to-check-ad-copy-before-you-paste-it-into-the-platform":
    "The LeadFlow Pro Ad Copy Character Counter graphic with the tool name and its labeled planning illustration.",
  "how-to-make-a-directions-link-that-reaches-the-right-entrance":
    "The LeadFlow Pro Directions Link Generator graphic with the tool name and its labeled planning illustration.",
  "how-to-give-event-guests-a-calendar-link-they-can-check":
    "The LeadFlow Pro Add-to-Calendar Link Maker graphic with the tool name and its labeled planning illustration.",
  "how-to-leave-callers-with-a-clear-next-step":
    "The LeadFlow Pro Business Voicemail Script Writer graphic with the tool name and its labeled planning illustration.",
  "how-to-write-a-job-post-that-explains-the-actual-work":
    "The LeadFlow Pro Job Posting Writer graphic with the tool name and its labeled planning illustration.",
  "how-to-write-one-useful-google-business-profile-update":
    "The LeadFlow Pro Google Business Post Writer graphic with the tool name and its labeled planning illustration.",
  "how-to-check-robots-txt-without-treating-it-as-a-lock":
    "The LeadFlow Pro Robots.txt Generator graphic with the tool name and its labeled planning illustration.",
  "how-to-put-a-month-s-bills-on-one-clear-page":
    "The LeadFlow Pro Household Budget Planner graphic with the tool name and its labeled planning illustration.",
  "how-to-compare-two-package-sizes-before-buying-the-bigger-one":
    "The LeadFlow Pro Grocery Unit Price Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-compare-the-costs-that-come-with-a-job":
    "The LeadFlow Pro Childcare vs Work Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-find-the-renewals-you-stopped-noticing":
    "The LeadFlow Pro Subscription Audit graphic with the tool name and its labeled planning illustration.",
  "how-to-turn-a-cash-cushion-goal-into-a-monthly-target":
    "The LeadFlow Pro Emergency Fund Calculator graphic with the tool name and its labeled planning illustration.",
  "how-to-check-what-an-extra-payment-changes-in-a-simple-debt-model":
    "The LeadFlow Pro Debt Payoff Planner graphic with the tool name and its labeled planning illustration.",
  "how-to-compare-rent-with-the-bills-you-already-have":
    "The LeadFlow Pro Rent Affordability Estimator graphic with the tool name and its labeled planning illustration.",
  "how-to-compare-two-job-offers-when-the-hours-are-different":
    "The LeadFlow Pro Salary to Hourly Converter graphic with the tool name and its labeled planning illustration.",
  "insurance-agent-lead-response":
    "LeadFlow Lead Response Time Calculator card with blue and gray comparison bars on a navy background",
  "locksmith-after-hours-calls":
    "LeadFlow After-Hours Lead Calculator card with a purple phone and message panels on a navy background",
  "one-useful-business-task-with-ai":
    "An existing LeadFlow illustration showing an owned website and customer system connected to practical AI work",
  "give-every-inquiry-an-owner-and-next-step":
    "An existing LeadFlow illustration of calls, messages, forms, and notes converging into one customer record",
  "bring-one-real-task-to-your-business-workshop":
    "LeadFlow workshop graphic showing a small Longview class, a laptop, business steps, and the published 97 dollar price",
  "free-tools-that-bring-customers":
    "Premier Dental Academy of Longview homepage with the 12 week RDA program, free training tools, and enrollment paths",
  "website-text-too-small-on-mobile":
    "The LeadFlow Pro homepage, the site whose mobile text this article's fix shipped on",
  "data-centers-are-coming-to-texas":
    "An East Texas business district connected to new data-center infrastructure at dusk",
  "the-money-is-in-the-follow-up":
    "An inquiry signal moving through timed follow-up checkpoints into a completed handoff",
  "marketplace-is-not-your-website":
    "A crowded rented marketplace contrasted with one grounded and connected owned business property",
  "small-business-website-cost":
    "A polished small-business storefront supported by distinct website build and infrastructure layers",
  "website-builder-monthly-fees":
    "A website caught in recurring toll gates contrasted with a stable owned foundation",
  "does-my-business-need-a-crm":
    "Calls, messages, forms, and notes converging into one secure customer record",
  "website-traffic-but-no-customers":
    "Website traffic leaking before a customer action while one repaired path reaches its destination",
  "missed-calls-cost-customers":
    "Incoming call signals falling through an unattended line while one protected route captures the inquiry",
  "facebook-page-is-not-a-website":
    "An unstable rented social storefront contrasted with a grounded owned web property",
  "own-your-email-list":
    "Scattered audience signals moving into a secure business-owned contact vault",
  "east-texas-business-website-guide":
    "An East Texas storefront connected to a clear website buyer path from discovery to contact",
  "cost-of-renting-business-software":
    "A growing stack of recurring software meters drawing from a business operating core",
  "ai-website-small-business-2026":
    "An owned website and customer system connected to practical AI-assisted work paths",
  "lawn-care-hourly-rate":
    "A lawn-care route combining time, equipment, materials, and travel into one job price",
  "hvac-missed-calls-cost":
    "An urgent after-hours HVAC call routed into a protected response and customer record",
  "dental-office-no-show-cost":
    "A dental chair connected to a reminder sequence and a confirmed appointment arrival",
  "auto-shop-credit-card-fees":
    "An auto-repair payment moving through visible processing-cost layers",
  "restaurant-delivery-app-fees":
    "A restaurant order passing through channel tolls before reaching net margin",
  "contractor-unpaid-invoices":
    "A completed contractor job path stopped at an unpaid invoice checkpoint",
  "salon-google-reviews":
    "A completed salon service triggering an automatic review request and feedback loop",
  "roofing-cost-per-lead":
    "Roofing attention tracked through inquiry, inspection, quote, and sale checkpoints",
  "trucking-cost-per-mile":
    "A truck route passing fuel, maintenance, insurance, and ownership cost checkpoints",
  "cleaning-business-hire-or-stay-solo":
    "A cleaning operator capacity path splitting between a solo ceiling and a staffed route",
  "pressure-washing-pricing":
    "A pressure-washing wand crossing three illuminated pricing checkpoints on wet concrete",
  "pest-control-customer-value":
    "A home connected to seasonal pest-control service points and one long-term customer record",
  "tree-service-buy-or-rent-equipment":
    "A professional wood chipper above crossing ownership and rental cost lines",
  "med-spa-discount-damage":
    "A med-spa service margin draining as a discount replaces full-price appointments",
  "gym-break-even-members":
    "A gym overhead ring met by the member capacity needed to reach break-even",
  "food-truck-taxes-set-aside":
    "Food-truck payments splitting into operating cash and a protected tax reserve",
  "mobile-detailing-drive-time":
    "A mobile-detailing van crossing a route where travel time becomes a job cost",
  "appliance-repair-unclosed-quotes":
    "Appliance-repair quotes waiting in an organized follow-up sequence",
  "fencing-contractor-raise-prices":
    "Rising fencing material and labor costs meeting an adjusted price line",
  "wedding-photographer-after-hours-leads":
    "An after-hours photography inquiry entering a protected booking and follow-up path",
  "plumber-call-back-speed":
    "An urgent plumbing inquiry moving through a visible callback timing route",
  "electrician-job-capacity":
    "Electrical jobs arranged against limited crew time and scheduling capacity",
  "painting-contractor-markup-vs-margin":
    "A painting job showing the difference between its markup layer and retained margin",
  "barbershop-booth-rent-vs-commission":
    "A barbershop chair splitting between fixed booth rent and commission paths",
  "chiropractor-google-business-profile":
    "A local search beacon connecting a chiropractic office to its owned website path",
  "towing-truck-downtime-cost":
    "An immobilized tow truck while operating costs continue moving",
  "bakery-menu-margins":
    "Bakery menu items built from visible ingredient, labor, and margin layers",
  "used-car-lot-slow-website":
    "A vehicle shopper stalled by a slow website lane beside a clear fast path",
  "daycare-late-pickup-policy":
    "A daycare pickup clock activating a clear reminder and policy path after its threshold",
  "real-estate-agent-seo-value":
    "Local search visibility connecting a real-estate website to an owned follow-up system",
};

const CURATED_TAKEAWAYS: Record<string, string> = {
  "free-tools-that-bring-customers":
    "Answer the question people search. The tool does the selling.",
  "website-text-too-small-on-mobile":
    "Your customers judge the phone version. Fix that one first.",
  "pressure-washing-pricing": "Labor. Materials. Margin. Price all three.",
  "pest-control-customer-value":
    "One treatment is a sale. Retention builds value.",
  "tree-service-buy-or-rent-equipment":
    "Buy only when real usage crosses rental cost.",
  "east-texas-business-website-guide":
    "A useful website answers the buying question before the call.",
  "the-money-is-in-the-follow-up":
    "Most leads are not lost. They are simply left behind.",
  "cost-of-renting-business-software":
    "Renting is convenient until the monthly total owns the decision.",
  "data-centers-are-coming-to-texas":
    "Growth matters only when the infrastructure can carry it.",
};

const OG_LAYOUTS: Record<
  string,
  {
    direction: "row" | "row-reverse" | "column" | "column-reverse";
    panel: number;
    imagePosition: string;
  }
> = {
  "pressure-washing-pricing": {
    direction: "row",
    panel: 47,
    imagePosition: "64% 50%",
  },
  "pest-control-customer-value": {
    direction: "column-reverse",
    panel: 44,
    imagePosition: "50% 40%",
  },
  "tree-service-buy-or-rent-equipment": {
    direction: "row-reverse",
    panel: 43,
    imagePosition: "38% 50%",
  },
};

const OG_LAYOUT_VARIANTS = [
  { direction: "row" as const, panel: 43, imagePosition: "68% 50%" },
  { direction: "row-reverse" as const, panel: 46, imagePosition: "34% 50%" },
  { direction: "column-reverse" as const, panel: 41, imagePosition: "50% 34%" },
  { direction: "column" as const, panel: 40, imagePosition: "50% 68%" },
  { direction: "row" as const, panel: 50, imagePosition: "72% 45%" },
  { direction: "row-reverse" as const, panel: 40, imagePosition: "28% 56%" },
];

function articleOgLayout(slug: string) {
  if (OG_LAYOUTS[slug]) return OG_LAYOUTS[slug];
  const hash = [...slug].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return OG_LAYOUT_VARIANTS[hash % OG_LAYOUT_VARIANTS.length];
}

export function articlePremiumArtPath(slug: string) {
  const path = PREMIUM_ARTICLE_ART[slug];
  if (!path) throw new Error(`Missing article scene for ${slug}`);
  return path;
}

export function articlePremiumOgArtPath(slug: string) {
  const path = PREMIUM_ARTICLE_OG_ART[slug] ?? PREMIUM_ARTICLE_ART[slug];
  if (!path) throw new Error(`Missing article social scene for ${slug}`);
  return path;
}

export function articleVisualHeadline(slug: string) {
  const headline = VISUAL_HEADLINES[slug];
  if (!headline) throw new Error(`Missing article visual headline for ${slug}`);
  return headline;
}

export function articlePremiumArtAlt(slug: string) {
  const alt = PREMIUM_ARTICLE_ALT[slug];
  if (!alt) throw new Error(`Missing article scene description for ${slug}`);
  return alt;
}

export function articleSocialImagePath(slug: string) {
  return `/articles/${slug}/opengraph-image`;
}

function words(value: string) {
  return value
    .replace(/[.!?]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function articleTakeaway(description: string, slug?: string) {
  if (slug && CURATED_TAKEAWAYS[slug]) return CURATED_TAKEAWAYS[slug];
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0] || description;
  const selected = words(firstSentence).slice(0, 11).join(" ");
  return selected.length < firstSentence.length ? `${selected}...` : selected;
}

function titleSize(title: string, horizontal: boolean) {
  if (title.length > 70) return horizontal ? 41 : 45;
  if (title.length > 56) return horizontal ? 46 : 50;
  if (title.length > 42) return horizontal ? 51 : 56;
  return horizontal ? 58 : 62;
}

type ArticleOgCardProps = {
  article: Article;
  backgroundUrl: string;
};

export function articleOgCard({
  article,
  backgroundUrl,
}: ArticleOgCardProps): ReactElement {
  const visualHeadline = articleVisualHeadline(article.slug);
  if (article.publishedAt === "2026-09-06" && article.ogImage.startsWith("/og/tools/")) {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f3efe8", color: "#20212b", padding: "48px 56px", fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#5135e5" }}>THE LEADFLOW PRO</div>
          <div style={{ fontSize: 19, color: "#625f6d" }}>A practical guide by Ryan Nichols</div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 42 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 620 }}>
            <div style={{ display: "flex", fontSize: 17, fontWeight: 800, letterSpacing: 2, color: "#5135e5", marginBottom: 22 }}>FREE GUIDE + WORKING TOOL</div>
            <div style={{ display: "flex", fontSize: visualHeadline.length > 52 ? 48 : 54, lineHeight: 1.08, fontWeight: 800, letterSpacing: -1.5 }}>{visualHeadline}</div>
            <div style={{ display: "flex", fontSize: 23, lineHeight: 1.4, color: "#625f6d", marginTop: 22 }}>{article.description}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", width: 400, border: "1px solid #dbd0c5", borderRadius: 24, padding: 18, background: "#fff9ef" }}>
            <img src={backgroundUrl} alt="" width={364} height={191} style={{ objectFit: "contain", borderRadius: 12 }} />
            <div style={{ display: "flex", fontSize: 19, lineHeight: 1.4, color: "#34313f", padding: "20px 10px 6px" }}>A worked example. A useful worksheet. A clear next step.</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #dbd0c5", paddingTop: 20, fontSize: 19, color: "#625f6d" }}>
          <div>theleadflowpro.com</div><div>Read it. Try it. Make it useful.</div>
        </div>
      </div>
    );
  }
  const layout = articleOgLayout(article.slug);
  const horizontal =
    layout.direction === "row" || layout.direction === "row-reverse";
  const panelStyle = horizontal
    ? { width: `${layout.panel}%`, height: "100%" }
    : { width: "100%", height: `${layout.panel}%` };

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        flexDirection: layout.direction,
        background: NAVY,
        color: WHITE,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <img
        src={backgroundUrl}
        alt=""
        width={ARTICLE_OG_SIZE.width}
        height={ARTICLE_OG_SIZE.height}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: layout.imagePosition,
        }}
      />

      <div
        style={{
          ...panelStyle,
          display: "flex",
          position: "relative",
          flexDirection: "column",
          justifyContent: horizontal ? "space-between" : "flex-start",
          padding: horizontal ? "48px 50px 44px" : "30px 54px 34px",
          background: "rgba(5, 13, 27, 0.94)",
        }}
      >
        <div
          style={{
            display: "flex",
            color: WHITE,
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          The LeadFlow <span style={{ color: "#3264FF" }}>Pro</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: horizontal ? 0 : 16,
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: horizontal ? 465 : 1080,
              fontSize: titleSize(visualHeadline, horizontal),
              fontWeight: 900,
              letterSpacing: "-0.045em",
              lineHeight: 0.98,
            }}
          >
            {visualHeadline}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: horizontal ? 450 : 1050,
              marginTop: 19,
              color: MUTED,
              fontSize: horizontal ? 22 : 24,
              lineHeight: 1.26,
            }}
          >
            {articleTakeaway(article.description, article.slug)}
          </div>
        </div>
      </div>
    </div>
  );
}
