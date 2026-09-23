import type { PaidSession } from "./stripeSession";

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
