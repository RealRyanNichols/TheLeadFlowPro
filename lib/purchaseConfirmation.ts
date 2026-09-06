import type { PaidSession } from "./stripeSession";
import { findFreeBuildTier } from "./freeBuild";

/** URL hints can identify a payment attempt, never prove a payment or its product. */
export function purchaseConfirmation(
  request: { purchase?: string; sessionId?: string },
  paid: PaidSession | null,
): "lead" | "unverified" | "deposit" | "event" | "system_map" | "training" | "payment" {
  if (!paid) return request.purchase || request.sessionId ? "unverified" : "lead";
  if (["build_deposit", "package_deposit", "package_full"].includes(paid.kind ?? "")) return "deposit";
  if (paid.kind === "event") return "event";
  if (paid.kind === "system_map") return "system_map";
  if (paid.kind === "learn_it") return "training";
  return "payment";
}

/** Keep historical paid Free Build IDs usable without substituting today's tier or price. */
export function freeBuildConfirmation(paid: PaidSession | null) {
  if (!paid) return { status: "unverified" as const, tier: undefined };
  if (!paid.kind?.startsWith("free_build_")) return { status: "other_payment" as const, tier: undefined };
  return { status: "paid" as const, tier: findFreeBuildTier(paid.kind) };
}
