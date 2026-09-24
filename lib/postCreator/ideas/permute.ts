// Post Creator idea engine: the shuffle math.
//
// The idea machine walks every core idea for a set of settings once, in an
// order that looks random, before it shows any core again. The order is an
// affine map p -> (offset + step * p) mod C with a step coprime to C, which
// is a bijection on 0..C-1: no repeats, no gaps, and nothing to store but a
// cursor. The offset and the step both come from a 32-bit key, so each
// browser (its own seed) and each set of settings gets a different order.
// Pure, browser-safe.

/** 32-bit FNV-1a over the string's UTF-16 code units, as an unsigned integer. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Greatest common divisor of two non-negative integers. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/**
 * A step in [1, size - 1] that shares no factor with `size`. The search
 * starts at a point picked by the key and wraps, so it always ends (1 is
 * coprime to everything). Sizes of 2 or less step by 1.
 */
export function coprimeStep(size: number, key: number): number {
  if (size <= 2) return 1;
  const k = key >>> 0;
  const span = size - 1;
  const start = 1 + (Math.floor(k / size) % span);
  for (let n = 0; n < span; n++) {
    const s = 1 + ((start - 1 + n) % span);
    if (gcd(s, size) === 1) return s;
  }
  return 1;
}

/** Where the p-th draw (0 <= p < size) lands. A bijection on 0..size-1 for any key. */
export function permuteIndex(p: number, size: number, key: number): number {
  if (size <= 1) return 0;
  const k = key >>> 0;
  return ((k % size) + coprimeStep(size, k) * p) % size;
}
