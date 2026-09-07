import type { SupabaseClient } from "@supabase/supabase-js";
import { proAccessSecrets, proKindSlug, licenseKey } from "./proAccess";
import { getProTool, PRO_BUNDLE } from "./tools/pro";
import { deliverPaymentEmail } from "./paymentEmailDelivery";

export async function sendProKitReceipt(supabase: SupabaseClient, sessionId: string, email: string, kind: string) {
  const key = process.env.RESEND_API_KEY;
  const secrets = proAccessSecrets();
  if (!key || secrets.length === 0) throw new Error("Pro kit receipt delivery is not configured");

  const slug = proKindSlug(kind);
  const kit = slug ? getProTool(slug) : null;
  const isBundle = kind === PRO_BUNDLE.kind;
  const title = isBundle ? PRO_BUNDLE.name : kit?.name ?? "Pro Kit";
  const path = isBundle ? "/tools/pro" : `/tools/pro/${slug}`;
  const accessKey = licenseKey(email, kind, secrets[0]);
  const site = "https://www.theleadflowpro.com";

  const send = (recipient: "internal" | "buyer", payload: object) => deliverPaymentEmail({
    supabase, sessionId, purpose: `pro-kit:${recipient}`, payload, apiKey: key,
  });

  const deliveries = [send("internal", {
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `PRO KIT SOLD: ${title} - ${email}`,
    text: [
      `${title} was purchased.`,
      `Buyer: ${email}`,
      "",
      "Payment is confirmed. Access-key delivery is handled separately; check its delivery status if the buyer needs help.",
    ].join("\n"),
  }), send("buyer", {
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [email],
    reply_to: "hello@theleadflowpro.com",
    subject: `Your ${title} access key`,
    text: [
      `${title} is unlocked.`,
      "",
      "It is already open in the browser you bought it in. This email is how you",
      "open it anywhere else, so keep it.",
      "",
      `Your key: ${accessKey}`,
      "",
      `Open the kit: ${site}${path}`,
      `Unlock on another device: ${site}/tools/pro/unlock?email=${encodeURIComponent(email)}&key=${encodeURIComponent(accessKey)}`,
      "",
      isBundle
        ? "The bundle covers every kit on the shelf, including the ones added later. Same key."
        : "Change any answer in the kit and every document rebuilds, at no extra cost, for as long as the kit exists.",
      "",
      "There is nothing recurring here and nothing to cancel.",
      "",
      "If anything does not open, reply to this email and I will sort it out.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro",
      "(903) 500-8898",
    ].join("\n"),
  })];
  const results = await Promise.allSettled(deliveries);
  if (results.some(result => result.status === "rejected")) throw new Error("A Pro Kit receipt delivery remains retryable");
}
