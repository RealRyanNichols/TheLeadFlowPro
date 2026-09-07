import { purchaseEvent } from "./purchaseEvent";
import type { ProPurchaseEvent } from "../proPurchaseReceipt";

/** One request/event per document, including Strict Mode and overlapping mounts. */
export function createProPurchaseReceiptConsumer(fetcher: typeof fetch = (...args) => fetch(...args), endpoint = "/api/pro/purchase-receipt") {
  let pending: Promise<ProPurchaseEvent | null> | null = null;
  const handled = new Set<string>();
  return {
    consume(): Promise<ProPurchaseEvent | null> {
      if (!pending) {
        pending = fetcher(endpoint, {
          method: "POST", credentials: "same-origin", cache: "no-store", referrerPolicy: "same-origin",
          headers: { "X-LeadFlow-Receipt": "1" },
        }).then(async (response) => {
          if (response.status === 503) throw new Error("Receipt service is temporarily unavailable");
          if (!response.ok || response.status === 204) return null;
          const body = await response.json() as Partial<ProPurchaseEvent>;
          if (body.currency !== "USD" || typeof body.sku !== "string" || body.sku.length > 80 ||
            typeof body.value !== "number" || body.value <= 0) return null;
          const event = purchaseEvent(body.value, body.eventId, body.sku);
          return event?.sku ? { value: event.value, currency: event.currency, eventId: event.eventId, sku: event.sku } : null;
        }).catch((error: unknown) => {
          pending = null;
          throw error;
        });
      }
      return pending;
    },
    claimEvent(eventId: string): boolean {
      if (handled.has(eventId)) return false;
      handled.add(eventId);
      return true;
    },
  };
}
