// Post Creator idea engine: the call to action at the end of a free draft, in
// each of the four voices.
//
// Every reach-out line (call, text, book, message, stop by, comment) reads
// right after any angle, a thank you and a story included, so none of them
// asks for "your question" or "your answer" when the post asked nothing.
// "Save" and "share" only follow the angles people save and share (each
// angle's `ctas`, angles.ts).
//
// A line that needs the owner's own detail (a booking link, where to find
// them) leaves it as a [blank]. The engine never writes a phone number, a
// link, or an email for anyone, and no line says "any time", which could read
// as round-the-clock service. Pure data, browser-safe.

import type { CtaId, VoiceId } from "../options";

export const CTA_LINES: Record<CtaId, Record<VoiceId, string>> = {
  call: {
    friendly: "Give us a call. We would love to hear from you.",
    direct: "Call us.",
    professional: "Call us with any questions.",
    playful: "Pick up the phone and give us a ring.",
  },
  text: {
    friendly: "Send us a text and say hello.",
    direct: "Text us.",
    professional: "Send us a text with any questions.",
    playful: "Shoot us a text. We do not bite.",
  },
  book: {
    friendly: "Book a time here: [booking link]",
    direct: "Book here: [booking link]",
    professional: "Schedule a visit here: [booking link]",
    playful: "Grab a spot here: [booking link]",
  },
  message: {
    friendly: "Send us a message and we will get back to you.",
    direct: "Message us.",
    professional: "Send us a message with any questions.",
    playful: "Slide into our messages and say hi.",
  },
  visit: {
    friendly: "Come see us at [where to find you].",
    direct: "Stop by: [where to find you].",
    professional: "Visit us at [where to find you].",
    playful: "Swing by and say hi: [where to find you].",
  },
  save: {
    friendly: "Save this post so it is handy later.",
    direct: "Save this.",
    professional: "Save this post for reference.",
    playful: "Save this one for later. Future you will thank you.",
  },
  share: {
    friendly: "Share this with a neighbor who could use it.",
    direct: "Share this.",
    professional: "Share this with someone it could help.",
    playful: "Tag a friend who needs to see this.",
  },
  comment: {
    friendly: "Tell us what you think in the comments.",
    direct: "Comment below.",
    professional: "Share your thoughts in the comments.",
    playful: "Drop your thoughts in the comments.",
  },
};

export function ctaLine(cta: CtaId, voice: VoiceId): string {
  return CTA_LINES[cta]?.[voice] ?? CTA_LINES[cta]?.friendly ?? CTA_LINES.message.friendly;
}
