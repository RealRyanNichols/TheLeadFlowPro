import type { LeadSource, LeadStatus } from "@/lib/hq/types";

// Words an owner uses, not column names. Shared so a lead reads the same on
// the list, on the lead page and in the timeline.

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

export const STATUS_TONE: Record<LeadStatus, "good" | "warn" | "bad" | "blue" | undefined> = {
  new: "warn",
  contacted: "blue",
  quoted: "blue",
  booked: "good",
  won: "good",
  lost: undefined,
  spam: undefined,
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  website: "Website form",
  form: "Form",
  meta: "Meta lead ad",
  sms: "Text message",
  call: "Phone call",
  manual: "Added by you",
  plugin: "Your assistant",
  api: "Connected app",
  email: "Email",
  other: "Other",
};

export const CONTENT_KIND_LABEL: Record<string, string> = {
  post: "Post",
  ad: "Lead ad",
  video_script: "Video script",
  review_reply: "Review reply",
  email: "Email",
};

export const CONTENT_STATUS_TONE: Record<string, "good" | "warn" | "bad" | "blue" | undefined> = {
  draft: "warn",
  approved: "blue",
  scheduled: "blue",
  published: "good",
  rejected: undefined,
};
