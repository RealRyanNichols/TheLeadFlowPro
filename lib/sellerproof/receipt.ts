import { accessSecrets, signAccess } from "./access";
import { paidAccess } from "./server";

// Called only by the existing signature-verified payment webhook.
// Idempotency keys and stable purchase-time tokens make retries safe.
export async function sendSellerProofReceipt(email: string, sessionId: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !accessSecrets().length)
    throw new Error("SellerProof receipt delivery unavailable");
  const access = await paidAccess(sessionId);
  if (!access) return; // Refunded or invalid purchases never receive a recovery key.
  const recoveryKey = signAccess(access, accessSecrets()[0]);
  const messages = [
    {
      suffix: "buyer",
      to: email,
      subject: "Your SellerProof packet purchase",
      text: [
        "Your $49 Single Evidence Packet purchase is confirmed.",
        "",
        "Return to your packet in the same browser tab:",
        "https://www.theleadflowpro.com/sellerproof/build",
        "",
        "Review the draft and all four confirmations, then download the printable packet. Open the file and choose Print → Save as PDF. Attach the original evidence files yourself in your provider dashboard before its deadline.",
        "",
        "Download a private backup from the builder before closing the tab. We do not store your evidence entries in our database.",
        "",
        "If you need to restore purchase access without a backup, enter the original provider, order reference, dispute reference, disputed amount, and currency in step 1. Open 'Already purchased? Restore from your receipt' and paste this private recovery key:",
        recoveryKey,
        "",
        "The recovery key restores the purchase, not your evidence. Keep it private. Use your backup or re-enter your records.",
        "",
        "If access fails, reply with this receipt. Do not pay again to fix an access problem.",
        "",
        "Not legal advice. No outcome guarantees. You review and submit the evidence yourself.",
        "",
        "The LeadFlow Pro",
      ].join("\n"),
    },
    {
      suffix: "owner",
      to: "hello@theleadflowpro.com",
      subject: "SellerProof: $49 packet purchased",
      text: `A SellerProof Single Evidence Packet was purchased.\n\nBuyer: ${email}\nAmount: $49 USD\nPurchase is recorded in Stripe and the existing purchases table.\nThe buyer receives export and recovery instructions. Evidence stays private.\n\nhttps://www.theleadflowpro.com/admin`,
    },
  ];
  for (const message of messages) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `sellerproof-${sessionId}-${message.suffix}`,
      },
      body: JSON.stringify({
        from: "The LeadFlow Pro <hello@theleadflowpro.com>",
        reply_to: "hello@theleadflowpro.com",
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok)
      throw new Error(`SellerProof receipt delivery failed (${r.status})`);
  }
}
