/**
 * Money helpers — all internal amounts are in *cents* (integers) to avoid
 * floating-point drift. Format only at the UI boundary.
 */

export function currency(cents: number, withSymbol = false): string {
  const dollars = (cents / 100).toFixed(2);
  return withSymbol ? `$${dollars}` : dollars;
}

export function addCents(...values: Array<number | null | undefined>): number {
  let sum = 0;
  for (const v of values) sum += v ?? 0;
  return sum;
}

export function clampCents(value: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (value < min) return min;
  if (value > max) return max;
  return Math.round(value);
}
