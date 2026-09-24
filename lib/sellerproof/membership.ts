// SellerProof Membership lives in the SellerProof app (its own Vercel project),
// reachable at sellerproof.theleadflowpro.com once that CNAME resolves. Until
// then the app answers at sellerproof.vercel.app; NEXT_PUBLIC_SELLERPROOF_APP_URL
// flips it without a code change. Leaf module: safe in client components.
export const SELLERPROOF_APP_URL = (
  process.env.NEXT_PUBLIC_SELLERPROOF_APP_URL?.trim() || "https://sellerproof.vercel.app"
).replace(/\/+$/, "");

export const SELLERPROOF_MEMBER_PRICING_URL = `${SELLERPROOF_APP_URL}/pricing`;

export const SELLERPROOF_MEMBER_INCLUDES = [
  "Unlimited dispute packets",
  "Response drafts and PDF export",
  "Reusable evidence library",
  "Deadline tracking across disputes",
  "Member referral program",
] as const;
