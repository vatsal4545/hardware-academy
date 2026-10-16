/**
 * Small helpers shared by the Semiconductors A visualizations
 * (BandDiagram, DopingLattice, PNJunction, MosfetCrossSection, CmosInverter).
 * Pure functions only, so they are safe to call during render.
 */
import type { ReactNode } from "react";

/** Boltzmann constant in eV/K. */
export const K_B = 8.617e-5;
/** Elementary charge in coulombs. */
export const Q = 1.602e-19;

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/** Smoothstep easing on 0..1. */
export function ease(f: number): number {
  const x = clamp(f, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Deterministic PRNG (mulberry32), so particle layouts are identical on server and client. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded shuffle of 0..n-1. */
export function seededOrder(n: number, seed: number): number[] {
  const r = mulberry32(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export function superscript(n: number): string {
  return String(n)
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");
}

/** Scientific notation such as "1.0 × 10¹⁶" with `digits` significant figures. */
export function sci(x: number, digits = 2): string {
  if (x === 0) return "0";
  if (!Number.isFinite(x)) return "∞";
  const sign = x < 0 ? "−" : "";
  const ax = Math.abs(x);
  let exp = Math.floor(Math.log10(ax));
  let mant = ax / 10 ** exp;
  if (Number(mant.toFixed(digits - 1)) >= 10) {
    mant /= 10;
    exp += 1;
  }
  return `${sign}${mant.toFixed(digits - 1)} × 10${superscript(exp)}`;
}

const PREFIXES: Array<[number, string]> = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
  [1e-15, "f"],
];

/** Engineering notation with an SI prefix, such as "4.16 mA" or "−10.0 fA". */
export function eng(x: number, unit: string, digits = 3): string {
  if (x === 0) return `0 ${unit}`;
  if (!Number.isFinite(x)) return `∞ ${unit}`;
  const sign = x < 0 ? "−" : "";
  const ax = Math.abs(x);
  for (let i = 0; i < PREFIXES.length; i++) {
    const [scale, prefix] = PREFIXES[i];
    if (ax >= scale) {
      const shown = Number((ax / scale).toPrecision(digits));
      if (shown >= 1000 && i > 0) {
        const [upScale, upPrefix] = PREFIXES[i - 1];
        return `${sign}${(ax / upScale).toPrecision(digits)} ${upPrefix}${unit}`;
      }
      return `${sign}${(ax / scale).toPrecision(digits)} ${prefix}${unit}`;
    }
  }
  return `${sign}${sci(ax)} ${unit}`;
}

/** One labelled value in a viz readout grid. */
export function Readout({ label, value, accent }: { label: ReactNode; value: ReactNode; accent?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-sm text-text" style={accent ? { color: accent } : undefined}>
        {value}
      </dd>
    </div>
  );
}

/** Grid wrapper for <Readout> items. */
export function ReadoutGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
      {children}
    </dl>
  );
}
