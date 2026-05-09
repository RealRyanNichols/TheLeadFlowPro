export type PulseSignalSlug =
  | "live-views"
  | "dwell-time"
  | "traffic-sources"
  | "click-intent"
  | "share-backs"
  | "predictions"
  | "speed-friction"
  | "reward-loop";

export type PulseSignalPage = {
  slug: PulseSignalSlug;
  eyebrow: string;
  title: string;
  shortTitle: string;
  description: string;
  primaryQuestion: string;
  whatItTracks: string[];
  whatItSignals: string[];
  clientBuild: string[];
  cta: string;
  accent: "cyan" | "accent" | "brand" | "rose";
};

export const PULSE_SIGNAL_PAGES: Record<PulseSignalSlug, PulseSignalPage> = {
  "live-views": {
    slug: "live-views",
    eyebrow: "Signal 01",
    title: "Live Views Show Whether Attention Is Actually Here",
    shortTitle: "Live Views",
    description:
      "See active visitors, today's views, returning movement, and whether attention is building or fading in real time.",
    primaryQuestion: "Are people here right now, or did the post only look good on social?",
    whatItTracks: [
      "Anonymous active visitors in the last two minutes.",
      "Views today, total tracked views, and visitor count.",
      "Return visits when someone comes back after a gap.",
      "Hourly and daily movement so spikes are visible.",
    ],
    whatItSignals: [
      "A live audience means the page, post, ad, or share link is pulling people in.",
      "Returning visitors mean the page is worth checking again.",
      "Spikes tell Ryan which hook, share, or traffic source needs more attention.",
    ],
    clientBuild: [
      "Attach live views to a client's service page, ad campaign, booking page, or product page.",
      "Show the owner which page deserves follow-up, retargeting, or a stronger CTA.",
      "Separate real interest from vanity impressions.",
    ],
    cta: "Show me what is live",
    accent: "cyan",
  },
  "dwell-time": {
    slug: "dwell-time",
    eyebrow: "Signal 02",
    title: "Dwell Time Shows Whether The Page Holds Attention",
    shortTitle: "Dwell Time",
    description:
      "Track visible time, engagement seconds, section views, and whether people stay long enough to understand the offer.",
    primaryQuestion: "Did they actually study the page, or did they bounce before the pitch landed?",
    whatItTracks: [
      "Visible seconds while the tab is active.",
      "Scroll depth and section views.",
      "Milestones when a visitor stays long enough to earn Proof Points.",
      "Average attention per view, not just raw traffic.",
    ],
    whatItSignals: [
      "Longer attention means the story, tool, or data view is giving value.",
      "Short attention means the top screen, copy, or CTA needs compression.",
      "Section-level attention shows what to move up, expand, or remove.",
    ],
    clientBuild: [
      "Show clients which page section wins attention before asking for money.",
      "Use long-stay pages as retargeting audiences and sales follow-up triggers.",
      "Turn boring site analytics into a practical content and offer roadmap.",
    ],
    cta: "Find what holds attention",
    accent: "accent",
  },
  "traffic-sources": {
    slug: "traffic-sources",
    eyebrow: "Signal 03",
    title: "Traffic Sources Show Where The Attention Came From",
    shortTitle: "Sources",
    description:
      "UTMs, share links, referrals, direct traffic, and social platforms become a source trail instead of anonymous mystery traffic.",
    primaryQuestion: "Which post, page, ad, or share actually brought the buyer here?",
    whatItTracks: [
      "UTM source and campaign tags.",
      "Tracked share-link tokens.",
      "Known referrers like Facebook, X, TikTok, Instagram, YouTube, Google, and direct.",
      "Source movement by views, visitors, and follow-up actions.",
    ],
    whatItSignals: [
      "A source that brings clicks but no action may need a better landing page.",
      "A source that brings fewer clicks but more booking intent is higher quality.",
      "Referral patterns show what content should be reposted, boosted, or rebuilt.",
    ],
    clientBuild: [
      "Keep the ad, social post, or share source attached from first click to booked job.",
      "Show owners which platform deserves money and which one is just noise.",
      "Build a source ledger the agency cannot hide behind.",
    ],
    cta: "Trace my best source",
    accent: "brand",
  },
  "click-intent": {
    slug: "click-intent",
    eyebrow: "Signal 04",
    title: "Click Intent Shows What Visitors Are Trying To Do",
    shortTitle: "Click Intent",
    description:
      "Service clicks, calendar clicks, checkout starts, dead clicks, copy signals, and external clicks tell the site what visitors want next.",
    primaryQuestion: "Are people moving toward a decision, or clicking around confused?",
    whatItTracks: [
      "Service, booking, capacity, checkout, contact, and start clicks.",
      "Dead clicks where visitors click non-interactive areas.",
      "Copy signals when visitors copy a phone number, phrase, price, or URL.",
      "External clicks that send attention away from the site.",
    ],
    whatItSignals: [
      "Booking and checkout clicks show buying pressure.",
      "Dead clicks show confusing design or missing affordances.",
      "Copy signals can reveal what phrase, number, or offer is valuable.",
    ],
    clientBuild: [
      "Turn click paths into a sales map for the client's page.",
      "Fix dead clicks before buying more traffic.",
      "Trigger follow-up when someone clicks pricing, booking, or checkout but does not finish.",
    ],
    cta: "Map my click intent",
    accent: "cyan",
  },
  "share-backs": {
    slug: "share-backs",
    eyebrow: "Signal 05",
    title: "Share Backs Show Whether Social Attention Returns",
    shortTitle: "Share Backs",
    description:
      "Tracked share URLs connect social posts back to site visits, click-throughs, reported views, and source-specific performance.",
    primaryQuestion: "Did the share create business movement, or just disappear into the feed?",
    whatItTracks: [
      "Share creation events from the Live Pulse board.",
      "Click-backs from share URLs.",
      "Platform labels so Ryan can see where the share was intended to go.",
      "Imported social-view counts when platform analytics are entered or connected.",
    ],
    whatItSignals: [
      "A share that brings visitors back has real distribution value.",
      "A platform with high views but low click-back needs a stronger CTA.",
      "A platform with fewer views but better click-back may deserve more effort.",
    ],
    clientBuild: [
      "Give every client shareable links that report back to the owner.",
      "Tie posts, reels, texts, email links, and QR codes to one live scoreboard.",
      "Show which story is strong enough to travel.",
    ],
    cta: "Build my share tracker",
    accent: "accent",
  },
  predictions: {
    slug: "predictions",
    eyebrow: "Signal 06",
    title: "Prediction Scores Turn Behavior Into The Next Move",
    shortTitle: "Predictions",
    description:
      "The model studies views, clicks, dwell time, shares, source quality, and conversion pressure to recommend what to build next.",
    primaryQuestion: "Based on what people are doing, what should Ryan build, change, or sell next?",
    whatItTracks: [
      "Sample size and confidence level.",
      "Traffic quality and conversion readiness.",
      "Next-24-hour probabilities for service, booking, checkout, return, and share clicks.",
      "The strongest path and the top opportunity.",
    ],
    whatItSignals: [
      "A low-confidence score means collect more traffic before making big decisions.",
      "High service or booking probability means the page can push harder toward the offer.",
      "A strong path with weak checkout means the offer needs better proof or a lower-friction step.",
    ],
    clientBuild: [
      "Build a business-specific prediction panel from the client's real customer journey.",
      "Let the system tell the owner what page, ad, offer, or automation needs work next.",
      "Stop guessing based on opinions and start improving based on behavior.",
    ],
    cta: "Predict my next move",
    accent: "brand",
  },
  "speed-friction": {
    slug: "speed-friction",
    eyebrow: "Signal 07",
    title: "Speed And Friction Show Where The Page Is Making People Fight",
    shortTitle: "Speed + Friction",
    description:
      "Track page-speed signals, CTA impressions, form submits, video actions, dead clicks, and rage clicks so the owner can see where the page helps or hurts.",
    primaryQuestion: "Is the page fast, obvious, and easy to use, or are visitors clicking in frustration?",
    whatItTracks: [
      "Core browser timing signals like TTFB, content paint, load time, LCP, and layout shift.",
      "CTA impressions so Ryan can see whether buttons were actually seen before judging click rate.",
      "Form submits, video play/pause/end events, dead clicks, and rage clicks.",
      "Friction patterns without storing private form answers.",
    ],
    whatItSignals: [
      "A slow page can make a good ad look bad.",
      "High CTA impressions with low clicks means the offer, wording, or placement is not strong enough.",
      "Rage clicks and dead clicks show where users expected something to happen and got nothing.",
    ],
    clientBuild: [
      "Give a client a page-level friction report before spending more on ads.",
      "Show which videos, CTAs, forms, and page sections are actually being used.",
      "Turn usability problems into a punch list that increases leads before buying more traffic.",
    ],
    cta: "Find my friction leaks",
    accent: "cyan",
  },
  "reward-loop": {
    slug: "reward-loop",
    eyebrow: "Signal 08",
    title: "The Reward Loop Makes Attention Worth Coming Back For",
    shortTitle: "Reward Loop",
    description:
      "Proof Points reward staying, clicking, sharing, learning, and returning before any crypto layer is needed.",
    primaryQuestion: "How do we make people stay longer without turning the site into noise?",
    whatItTracks: [
      "Stay milestones as visitors keep the page open and visible.",
      "Tool interactions and tab exploration.",
      "Return visits and share click-backs.",
      "Engagement that indicates learning, not just scrolling.",
    ],
    whatItSignals: [
      "If people stay longer for useful data, the reward loop has business value.",
      "If they only chase points and do not click or buy, the reward is noise.",
      "Crypto only makes sense after the off-chain behavior proves real value.",
    ],
    clientBuild: [
      "Start with off-chain Proof Points tied to real business actions.",
      "Use rewards to encourage quotes, referrals, reviews, shares, and repeat visits.",
      "Only consider a token later if the reward ledger creates measurable demand.",
    ],
    cta: "Design my reward loop",
    accent: "rose",
  },
};

export const PULSE_SIGNAL_LIST = Object.values(PULSE_SIGNAL_PAGES);

export function getPulseSignalPage(slug: string) {
  return PULSE_SIGNAL_PAGES[slug as PulseSignalSlug] || null;
}
