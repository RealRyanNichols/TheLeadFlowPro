// The free business consultation: the one thing the homepage asks for.
//
// No events, no seats, no dates. A business owner gives us their name, their
// business, and what is getting in the way, and Ryan sits down with them for
// thirty minutes: at their shop, at the Longview office, or on a call. The
// homepage form, the header CTA, the footer link, the owner alert, and the
// welcome email all read from here so the offer is described one way.
//
// Leaf module: no imports. Safe in middleware, client components, and tests.

const MINUTES = 30;

export const CONSULTATION = {
  minutes: MINUTES,
  /** The form's id on the homepage. */
  anchor: "free-consultation",
  /** Where every "book a consultation" link on the site points. */
  href: "/#free-consultation",
  /** diagnostic.source on the lead row; picks the welcome email. */
  funnel: "free_consultation",
  /** leads.interest for a consultation request: the done-for-you lane. */
  interest: "done_for_you",
  /** Analytics placement for the homepage form. */
  placement: "home_hero",

  eyebrow: `Free ${MINUTES}-minute business consultation`,
  headline: "Bring the business. Leave with your next three moves.",
  body: `Ryan sits down with you for ${MINUTES} minutes and goes through whatever you bring. No pitch deck. No homework first.`,

  /** Where the thirty minutes happen. Longview and East Texas get a visit. */
  meetings: [
    {
      id: "your_place",
      label: "Come to my business",
      detail: "Longview and East Texas. Ryan comes to you and sees the business the way your customers do.",
    },
    {
      id: "our_office",
      label: "I will come to the Longview office",
      detail: "Sit down at the table with everything you want looked at.",
    },
    {
      id: "call",
      label: "Phone or video call",
      detail: "Anywhere. Same thirty minutes.",
    },
  ],

  /** How they want Ryan to reach back. Maps to leads.best_contact_method. */
  contactMethods: [
    { id: "text", label: "Text" },
    { id: "call", label: "Call" },
    { id: "email", label: "Email" },
  ],

  /** What to have on the table. Also printed in the welcome email. */
  bring: [
    "Your website address and your Facebook page",
    "Where calls, texts, and form inquiries land right now",
    "The last quote or inquiry that never got an answer",
    "The software you pay for every month",
    "The one thing you want more of: calls, jobs, bookings, or buyers",
  ],
} as const;

export type ConsultationMeeting = (typeof CONSULTATION.meetings)[number]["id"];
export type ConsultationContact = (typeof CONSULTATION.contactMethods)[number]["id"];
