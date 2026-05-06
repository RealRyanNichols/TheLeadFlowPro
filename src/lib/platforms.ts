// src/lib/platforms.ts — Per-platform sales page data.
//
// Each platform renders through /app/platforms/[handle]/page.tsx with the
// same structure: hero / what is this platform / who's it for / DIY-vs-You
// comparison / Ryan's real growth / sample posts / final CTAs.

import type { LucideIcon } from "lucide-react";
import { Facebook, Music2, Twitter, Youtube } from "lucide-react";

export type PlatformHandle = "tiktok" | "facebook" | "x" | "youtube";

export type Platform = {
  handle: PlatformHandle;
  displayName: string;
  Icon: LucideIcon;
  brandColor: string; // hex for accent / glow

  metaTitle: string;
  metaDescription: string;

  hero: {
    h1Lead: string;
    h1Highlight: string;
    paragraph: string;
  };

  // Why it matters for 3 audience types
  audiences: {
    who: string;        // "Business owners", "Creators", "People with a message"
    why: string;        // 1-2 sentences on why the platform matters for them
  }[];

  // DIY vs With Ryan — 3 row comparison
  diyVsYou: {
    metric: string;
    diy: string;
    you: string;
  }[];

  // Ryan's real growth on this platform
  ryanGrowth: {
    current: string;          // "43,800+"
    started: string;          // "0"
    months: string;            // "Built over X months"
    note: string;              // Caption
  };

  // Sample-post placeholder slots (Ryan to drop real screenshots later)
  samplePosts: {
    type: string;              // "Hook", "Long-form", "Reply", etc.
    note: string;              // Description of why it worked
  }[];

  // Linked offer slugs
  primaryOfferSlug: string;    // "power-bundle" | per-platform $497/mo etc.
  primaryCtaLabel: string;     // "Bring me in for TikTok"

  // Platform-specific FAQs
  faqs: { q: string; a: string }[];
};

export const PLATFORMS: Record<PlatformHandle, Platform> = {
  tiktok: {
    handle: "tiktok",
    displayName: "TikTok",
    Icon: Music2,
    brandColor: "#000000",

    metaTitle: "TikTok Growth — Done For You · The LeadFlow Pro",
    metaDescription:
      "TikTok run end-to-end by Ryan Nichols. Daily short-form built around the hooks the algorithm is rewarding this week. Done for business owners, creators, and people with a message worth hearing.",

    hero: {
      h1Lead: "TikTok rewards the people who",
      h1Highlight: "show up daily with the right hooks.",
      paragraph:
        "Most owners post once a week, panic at zero views, and quit. TikTok wants daily, hook-first, native short-form — and it punishes anyone trying to be a billboard. I run TikTok the way the algorithm wants it run, in your voice, on your topic, with the hook patterns that are winning this week.",
    },

    audiences: [
      {
        who: "Business owners",
        why: "Local services, mortgage, real estate, contractors — the FYP routinely sends customers in your zip code your way IF the hooks are right and the cadence is daily.",
      },
      {
        who: "Creators",
        why: "TikTok is still where new audiences get discovered fastest. Daily output + hook iteration is the lever. I run it so you can keep creating.",
      },
      {
        who: "People with a message",
        why: "Faith, recovery, redemption, opinion, niche advocacy — the algorithm does not care what you stand for, only how clearly you hook and how consistently you show up.",
      },
    ],

    diyVsYou: [
      { metric: "Followers in 90 days",         diy: "Guessing, posting, stopping", you: "Baseline set after intake; weekly hook tests and a real posting rhythm" },
      { metric: "Time spent / week",            diy: "8–12 hrs (planning, filming, editing, posting)", you: "30 min content sync + we run the rest" },
      { metric: "Lead / inbound conversations", diy: "Random DMs, no tracking",      you: "Tracked conversations routed into an offer and follow-up system" },
    ],

    ryanGrowth: {
      current: "Building",
      started: "0",
      months: "Active rebuild after 4 years offline",
      note: "TikTok is being rebuilt right now — I'm running the same playbook I'll run for you. Real numbers will live here as they grow.",
    },

    samplePosts: [
      { type: "Hook test", note: "First-3-second hook patterns measured against your baseline" },
      { type: "Native short", note: "30-45s native short shot on phone, edited in CapCut, captioned" },
      { type: "Reply trend", note: "Stitched / replied to a trending creator's video to ride the topic wave" },
    ],

    primaryOfferSlug: "power-bundle",
    primaryCtaLabel: "Bring me in for TikTok",

    faqs: [
      { q: "Will you appear in the videos for me?", a: "No — your face, your voice. I write hooks, captions, edit cuts, and post. If you can record 5–10 minutes of native phone footage per week, we're operational." },
      { q: "Do you post daily?", a: "Yes. 20+ short-form posts per month, daily-ish cadence with the hooks tuned weekly. Cadence beats production value on TikTok." },
      { q: "What if my niche is 'boring'?", a: "There's no such thing. I've run mortgage, dental, legal — every niche has hooks. The work is finding yours." },
      { q: "Cross-posted to Reels and YT Shorts?", a: "Yes — every TikTok we ship is cross-posted to IG Reels and YouTube Shorts at no extra cost." },
    ],
  },

  facebook: {
    handle: "facebook",
    displayName: "Facebook",
    Icon: Facebook,
    brandColor: "#1877F2",

    metaTitle: "Facebook Growth — Done For You · The LeadFlow Pro",
    metaDescription:
      "Facebook page + groups managed end-to-end by Ryan Nichols. 18,900+ followers built. Built for businesses where buyers actually live on Facebook — local services, mortgage, real estate, B2B.",

    hero: {
      h1Lead: "Facebook is where",
      h1Highlight: "your buyers actually live.",
      paragraph:
        "Everyone says Facebook is dead. Everyone is wrong. Local service businesses, mortgage originators, contractors, real estate, dental — your buyers still live in the Facebook feed, groups, and Messenger. The page-and-groups game still works. I've run it for years and grown my own to 18,900+.",
    },

    audiences: [
      {
        who: "Local service businesses",
        why: "Roofers, dentists, contractors, mortgage, real estate. FB Local + the right groups + Messenger funnel = a steady inbound pipe.",
      },
      {
        who: "Creators with an audience over 25",
        why: "Facebook still owns the over-25 daily-active audience. If your buyers aren't Gen Z, FB is your channel.",
      },
      {
        who: "B2B operators",
        why: "Niche FB groups quietly host the highest-intent B2B conversations. The right group seeding is a moat.",
      },
    ],

    diyVsYou: [
      { metric: "Page followers in 90 days",   diy: "Stagnant, inconsistent", you: "Baseline set after intake; page, group, and Messenger rhythm installed" },
      { metric: "Time spent / week",            diy: "5–8 hrs",                you: "20 min content sync" },
      { metric: "Inbound DMs / leads",          diy: "Untracked conversations", you: "Messenger and site follow-up tied to a real offer" },
    ],

    ryanGrowth: {
      current: "18,900+",
      started: "0",
      months: "Built across years; rebuilt post-2025 with same playbook",
      note: "Facebook page at 18,900+ followers. Live API count drops in once Meta App Review is approved.",
    },

    samplePosts: [
      { type: "Long-form story", note: "Owner story post with a direct offer and reply path" },
      { type: "Group seed", note: "Helpful comment in a niche group that earns attention without spamming" },
      { type: "Native video", note: "Native upload tested against link posts and static posts" },
    ],

    primaryOfferSlug: "power-bundle",
    primaryCtaLabel: "Bring me in for Facebook",

    faqs: [
      { q: "Do you also run Facebook Ads?", a: "Yes — separate engagement (see /offers/fb-ads). Organic + paid is the strongest combination on FB. Stack them and it compounds." },
      { q: "Can you manage my groups too?", a: "Group seeding is included. Running your private group is a +$497/mo add-on (community management is a different bandwidth)." },
      { q: "What about Messenger automations?", a: "Included — auto-reply, missed-DM follow-up, qualification questions. Routes leads to your inbox already warmed up." },
    ],
  },

  x: {
    handle: "x",
    displayName: "X / Twitter",
    Icon: Twitter,
    brandColor: "#0F1419",

    metaTitle: "X / Twitter Growth — Done For You · The LeadFlow Pro",
    metaDescription:
      "X account run end-to-end by Ryan Nichols. 43,800+ followers built. Daily posting + reply game. Built for personal brands, founders, and operators who want to be in the conversation.",

    hero: {
      h1Lead: "X is the algorithm",
      h1Highlight: "rewarding the loudest right voices.",
      paragraph:
        "X is the operator's platform. Not the most users — the most influential. Founders, journalists, deal-makers, and your future buyers all spend hours a day here. I've grown to 43,800+ on X using daily posting + intentional replies. Same playbook, your voice.",
    },

    audiences: [
      {
        who: "Founders and operators",
        why: "X is where investors, partners, and high-trust customers find you. A few hundred right followers beats a million wrong ones.",
      },
      {
        who: "Personal brands",
        why: "Daily posting + reply game compounds faster on X than anywhere else. Show up for a year and the algorithm shows up for you.",
      },
      {
        who: "Niche thought leaders",
        why: "Faith, sports, recovery, legal, finance, parenting — niche tribes are bigger on X than anywhere except YouTube. Find yours and the audience stays.",
      },
    ],

    diyVsYou: [
      { metric: "Followers in 90 days",         diy: "Sporadic posts and replies", you: "Baseline set after intake; daily post and reply rhythm installed" },
      { metric: "Time spent / day",             diy: "1–2 hrs scrolling/replying", you: "10 min content sync" },
      { metric: "DMs from real prospects",      diy: "Crickets",                you: "5–20 / week, qualified" },
    ],

    ryanGrowth: {
      current: "43,800+",
      started: "0",
      months: "Built over years; the platform that survived everything",
      note: "Live API count drops in once X $100/mo Basic tier is configured. The 43.8K stayed through prison and came back stronger.",
    },

    samplePosts: [
      { type: "Hook + story",   note: "Tweet that opens with a counter-intuitive line and unspools 200 words" },
      { type: "Reply targeting", note: "First-comment reply on a 100K-impression tweet that drove 80 follows" },
      { type: "Long-form thread", note: "10-tweet thread that got 800K impressions and a Substack signup spike" },
    ],

    primaryOfferSlug: "power-bundle",
    primaryCtaLabel: "Bring me in for X",

    faqs: [
      { q: "Will you ghost-write or use my voice?", a: "Your voice. We pull from your own past posts, calls, and notes. I never publish in someone else's voice." },
      { q: "What about X Premium / Verified?", a: "Yes — Premium is required for paid algorithmic boosting. You pay X directly; I optimize the content for what Premium unlocks." },
      { q: "Do you reply to DMs for me?", a: "First-touch yes — qualifying questions + warm-up. Anything that turns into a real conversation routes to you." },
    ],
  },

  youtube: {
    handle: "youtube",
    displayName: "YouTube",
    Icon: Youtube,
    brandColor: "#FF0000",

    metaTitle: "YouTube Growth — Done For You · The LeadFlow Pro",
    metaDescription:
      "YouTube channel run end-to-end by Ryan Nichols. 12,000+ subscribers. Long-form engineered for the home feed and search. Built for owners and creators who want compounding evergreen reach.",

    hero: {
      h1Lead: "YouTube is the only platform",
      h1Highlight: "that pays you in compound interest.",
      paragraph:
        "TikTok dies in 7 days. X dies in 7 hours. A YouTube video that nails its hook + thumbnail + retention loop pays you for 7 years. I run YouTube as the long-arc asset it is — 1 long-form a week, engineered for both the home feed and search.",
    },

    audiences: [
      {
        who: "Coaches and educators",
        why: "Every YouTube view is a search match. Your video answers a question forever. Asset, not content.",
      },
      {
        who: "Local service businesses",
        why: "'Roofers near me' searches happen on YouTube too. Local YouTube is uncrowded — first-mover advantage is enormous.",
      },
      {
        who: "Creators monetizing reach",
        why: "Ad revenue + sponsorships + your own products. YouTube is the only platform where one good video pays you for years.",
      },
    ],

    diyVsYou: [
      { metric: "Subscribers in 90 days",       diy: "Irregular uploads",      you: "Baseline set after intake; repeatable long-form and Shorts cadence" },
      { metric: "Time spent / video",           diy: "10–15 hrs (filming + edit + upload)", you: "1 hr filming, we run the rest" },
      { metric: "Compound views (12-mo)",       diy: "Each video dies in a week", you: "Top videos still earning views year 1" },
    ],

    ryanGrowth: {
      current: "12,000+",
      started: "0",
      months: "@RealRyanNicholsSr — verified live via YouTube API",
      note: "Live YouTube API count: refreshes hourly on this site. Real, not a fake follower-count brag.",
    },

    samplePosts: [
      { type: "Long-form (10–15 min)", note: "Title + thumbnail iterated 3× to hit 4K+ views in week 1" },
      { type: "YouTube Short",         note: "60s vertical pulled from a long-form, drove 200 sub conversions" },
      { type: "Search-targeted",       note: "Video built around an exact-match search query that's still ranking" },
    ],

    primaryOfferSlug: "power-bundle",
    primaryCtaLabel: "Bring me in for YouTube",

    faqs: [
      { q: "Do I need to be on camera?", a: "Yes for long-form — your face/voice carry trust. Faceless is possible but slower. We figure out the right setup in week 1." },
      { q: "How long until I'm monetized?", a: "YouTube requires 1,000 subs + 4,000 watch hours. Our typical client hits monetization in 6–9 months at the standard cadence." },
      { q: "Can I do Shorts only?", a: "Shorts only is a different game (closer to TikTok). YouTube long-form is what builds the asset. We can ship both." },
    ],
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);
