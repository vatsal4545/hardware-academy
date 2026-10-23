import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** For each rule whose selector matches, the at-rules and selectors around it, outermost first. */
function enclosing(source: string, selector: RegExp): string[][] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: string[][] = [];
  const open: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      const head = text.slice(start, i).trim();
      if (selector.test(head)) found.push([...open]);
      open.push(head);
      start = i + 1;
    } else if (text[i] === "}" || text[i] === ";") {
      if (text[i] === "}") open.pop();
      start = i + 1;
    }
  }
  return found;
}

describe("theme CSS", () => {
  it("animates .reveal only where scroll-driven animations exist and the reader allows motion", () => {
    const places = enclosing(css, /\.reveal(?![\w-])/);
    expect(places.length).toBeGreaterThan(0);
    for (const around of places) {
      expect(around).toContain("@supports (animation-timeline: view())");
      expect(around).toContain("@media (prefers-reduced-motion: no-preference)");
    }
  });
});
