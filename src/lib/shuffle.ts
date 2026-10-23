// Deterministic shuffle so a correct choice does not sit at a predictable position, while the server and the
// browser render the same order for the same question.

/** FNV-1a hash of a string. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A Fisher-Yates order of 0..n-1 driven by a linear congruential generator; a seed of 0 counts as 1. */
export function seededOrder(seed: number, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
