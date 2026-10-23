// Seeded randomness for the virtual bench. Every draw is named, so adding a draw in one place never shifts another,
// and the server and the browser compute the same numbers. Only integer and basic float arithmetic is used.
import { hashString } from "@/lib/shuffle";

/** One uniform draw in [0, 1) for a named purpose: one mulberry32 step seeded from the bench seed and the name. */
export function unit(seed: number, key: string): number {
  let t = (hashString(`${seed}|${key}`) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A uniform draw in [min, max). */
export function between(seed: number, key: string, min: number, max: number): number {
  return min + (max - min) * unit(seed, key);
}

const SQRT3 = 1.7320508075688772;

/** An approximately normal draw: four uniforms summed (Irwin-Hall), rescaled to the mean and standard deviation. */
export function gaussian(seed: number, key: string, mean: number, sd: number): number {
  const sum = unit(seed, `${key}#0`) + unit(seed, `${key}#1`) + unit(seed, `${key}#2`) + unit(seed, `${key}#3`);
  return mean + (sum - 2) * SQRT3 * sd;
}
