import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tracks } from "@/lib/curriculum";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function token(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`--color-${name} not found in globals.css`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const backgrounds = ["bg", "surface", "surface-2"];

describe("theme contrast", () => {
  it.each(backgrounds)("body text is at least 7:1 on %s", (bg) => {
    expect(contrast(token("text"), token(bg))).toBeGreaterThanOrEqual(7);
  });

  it.each(backgrounds)("muted text is at least 4.5:1 on %s", (bg) => {
    expect(contrast(token("muted"), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it("muted text is lifted to at least 6.5:1 on surface-2", () => {
    expect(contrast(token("muted"), token("surface-2"))).toBeGreaterThanOrEqual(6.5);
  });

  it("card borders stand out from cards by at least 1.35:1", () => {
    expect(contrast(token("border"), token("surface"))).toBeGreaterThanOrEqual(1.35);
  });

  it.each(tracks.map((t) => [t.name, t.color]))("%s colour is at least 4.5:1 on surface-2", (_, color) => {
    expect(contrast(color, token("surface-2"))).toBeGreaterThanOrEqual(4.5);
  });
});
