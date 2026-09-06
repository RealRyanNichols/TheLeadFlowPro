/** Only server-verified purchase amounts and opaque event IDs reach vendor payloads. */
export function purchaseEvent(value: number | undefined, eventId: string | null | undefined, sku?: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
    !eventId || !/^purchase_[a-f0-9]{64}$/.test(eventId)) return null;
  if (sku !== undefined && !/^(?:pro_bundle|[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(sku)) return null;
  return { value, currency: "USD" as const, eventId, ...(sku ? { sku } : {}) };
}
