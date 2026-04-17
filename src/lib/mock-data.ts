/**
 * Demo data for the dashboard before real integrations are wired up.
 * Replace with live DB / API calls module-by-module.
 */

export const MOCK_USER = {
  name: "You",
  businessName: "Your Business",
  industry: "Local Service",
  plan: "growth" as const
};

export const MOCK_KPIS = {
  newLeadsThisMonth: 50,
  costPerLead: 7.66,
  adSpend: 382.88,
  missedCallsRecovered: 12,
  responseRateMinutes: 1.4,
  conversionRate: 0.18
};

export const MOCK_LEADS = [
  {
    id: "1",
    name: "Maria Gonzalez",
    phone: "+1 (903) 555-0123",
    source: "ad_meta" as const,
    status: "new" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 8),
    estValue: 2400,
    notes: "Asked about pricing — hot lead"
  },
  {
    id: "2",
    name: "James Carter",
    phone: "+1 (903) 555-0144",
    source: "call" as const,
    status: "contacted" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    estValue: 800,
    notes: "Missed call → text back sent automatically"
  },
  {
    id: "3",
    name: "Sara Patel",
    phone: "+1 (469) 555-0182",
    source: "form" as const,
    status: "nurturing" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    estValue: 1500,
    notes: "Wants weekend appointment, in nurture sequence"
  },
  {
    id: "4",
    name: "Kevin O'Neil",
    phone: "+1 (214) 555-0177",
    source: "dm_instagram" as const,
    status: "qualified" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    estValue: 3200,
    notes: "Cosmetic consult — replied to GIF, ready to book"
  },
  {
    id: "5",
    name: "Bethany Lloyd",
    phone: "+1 (903) 555-0103",
    source: "referral" as const,
    status: "booked" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    estValue: 1100,
    notes: "Booked for Thursday 10AM"
  },
  {
    id: "6",
    name: "Anthony Diaz",
    phone: "+1 (903) 555-0099",
    source: "ad_google" as const,
    status: "won" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    estValue: 2800,
    notes: "Closed after 3 messages + 1 video"
  }
];

export const MOCK_NEXT_MOVES = [
  {
    id: "nm1",
    priority: 1,
    title: "Reply to Maria Gonzalez (pricing inquiry)",
    body: "She asked about pricing 8 minutes ago via Meta ad. The hot-lead window is closing — send the pricing walkthrough video now.",
    kind: "send_message" as const,
    suggestedAction: "Send 'invisalign-pricing.mp4' from your library"
  },
  {
    id: "nm2",
    priority: 1,
    title: "Run a TikTok ad for your top service this week",
    body: "Your TikTok engagement is up 41% on service walkthrough posts but you're not running ads there. Cost per lead would likely be ~$4 (vs $7.66 on Meta).",
    kind: "run_ad" as const,
    suggestedAction: "Generate ad copy → review → launch"
  },
  {
    id: "nm3",
    priority: 2,
    title: "Follow up with Sara Patel (3 hours since last contact)",
    body: "She's in nurture but hasn't replied to the appointment-options message. Send the GIF 'we-want-you-here.gif' — it has a 64% reply rate.",
    kind: "follow_up" as const,
    suggestedAction: "Send GIF + offer 3 time slots"
  },
  {
    id: "nm4",
    priority: 3,
    title: "Post a customer-testimonial reel on Instagram",
    body: "Saturday 6–8pm is your highest-engagement window. You haven't posted a testimonial in 12 days — those drove your top 3 lead-generating posts last month.",
    kind: "post_content" as const,
    suggestedAction: "Pick from 4 unused testimonial clips in your library"
  }
];

export const MOCK_AUTOMATIONS = [
  {
    id: "a1",
    name: "Missed-call text-back",
    trigger: "missed_call",
    status: "active",
    runsThisMonth: 24,
    leadsRecovered: 12
  },
  {
    id: "a2",
    name: "New patient nurture (5-day SMS + video)",
    trigger: "new_lead",
    status: "active",
    runsThisMonth: 50,
    leadsRecovered: 9
  },
  {
    id: "a3",
    name: "Re-engage cold leads (after 14 days)",
    trigger: "inactive_lead",
    status: "draft",
    runsThisMonth: 0,
    leadsRecovered: 0
  }
];

export const MOCK_SOCIAL = [
  { platform: "instagram", handle: "@yourbusiness",  followers: 4280, engagement: 5.2, growth7d: 1.8, connected: true },
  { platform: "tiktok",    handle: "@yourbusiness",  followers: 11200, engagement: 8.7, growth7d: 4.4, connected: true },
  { platform: "facebook",  handle: "Your Business",  followers: 2870, engagement: 2.1, growth7d: 0.4, connected: true },
  { platform: "x",         handle: "@yourbusiness",  followers: 612,  engagement: 0.8, growth7d: -0.2, connected: false },
  { platform: "youtube",   handle: "@yourbusiness",  followers: 1840, engagement: 3.4, growth7d: 1.1, connected: false }
];

export const MOCK_CHART = [
  { day: "Mon", leads: 4 },
  { day: "Tue", leads: 7 },
  { day: "Wed", leads: 6 },
  { day: "Thu", leads: 9 },
  { day: "Fri", leads: 12 },
  { day: "Sat", leads: 8 },
  { day: "Sun", leads: 4 }
];

export const MOCK_FLOWCARD = {
  slug: "ryan",
  displayName: "Ryan Nichols",
  tagline: "Founder · The LeadFlow Pro",
  bio: "Helping local businesses stop missing leads. If you're losing money on missed calls or slow responses — let's fix it.",
  avatarUrl: "",
  themeAccent: "#23b8ff",
  phone: "+1 (903) 555-0100",
  email: "ryan@theleadflowpro.com",
  websiteUrl: "https://www.theleadflowpro.com",
  views: 1248,
  qrScans: 387,
  followAllClicks: 211,
  links: [
    { platform: "instagram", label: "Instagram", url: "https://instagram.com/theleadflowpro", handle: "@theleadflowpro" },
    { platform: "tiktok",    label: "TikTok",    url: "https://tiktok.com/@theleadflowpro",   handle: "@theleadflowpro" },
    { platform: "facebook",  label: "Facebook",  url: "https://facebook.com/theleadflowpro",  handle: "The LeadFlow Pro" },
    { platform: "youtube",   label: "YouTube",   url: "https://youtube.com/@theleadflowpro",  handle: "@theleadflowpro" },
    { platform: "x",         label: "X / Twitter", url: "https://x.com/theleadflowpro",       handle: "@theleadflowpro" },
    { platform: "linkedin",  label: "LinkedIn",  url: "https://linkedin.com/in/ryannichols",  handle: "Ryan Nichols" }
  ]
};

export const MOCK_MEDIA = [
  { id: "m1", kind: "video" as const, title: "Pricing explainer (60s)", tags: ["pricing", "explainer"], bestFor: "When a lead asks 'how much does it cost?'" },
  { id: "m2", kind: "gif"   as const, title: "We want you here!", tags: ["nurture", "humor"], bestFor: "After 24h of no reply" },
  { id: "m3", kind: "video" as const, title: "Customer testimonial — Bethany", tags: ["social-proof", "testimonial"], bestFor: "Leads still shopping around" },
  { id: "m4", kind: "gif"   as const, title: "Thanks for booking!", tags: ["thank-you", "post-booking"], bestFor: "Right after appointment booked" },
  { id: "m5", kind: "video" as const, title: "Meet the team (60s)", tags: ["intro", "trust"], bestFor: "First reply to brand-new lead" }
];
