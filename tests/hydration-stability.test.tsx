import { describe, it, expect, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ComponentType } from "react";
import { lessons } from "@/lib/curriculum";
import { lessonBodies } from "@/content/bodies";
import { RobotSim, PidLab, ArmLab, TraceWidthLab } from "@/components/labs";

// Server and browser engines can differ in the last bits of transcendental functions. Any such value that
// reaches markup unrounded produces a hydration mismatch, which React 19 reports and may leave the lesson
// body non-interactive. This renders every lesson body twice: once as-is, once with those functions nudged
// by one part in 10^14, and requires identical markup.

const NUDGE = 1 + 1e-14;
const FUNCS = ["sin", "cos", "tan", "atan2", "atan", "asin", "acos", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh", "exp", "expm1", "log", "log1p", "log2", "log10", "sqrt", "pow", "hypot", "cbrt"] as const;
const originals: Partial<Record<(typeof FUNCS)[number], (...args: number[]) => number>> = {};

function nudgeMath() {
  for (const name of FUNCS) {
    const fn = Math[name] as (...args: number[]) => number;
    originals[name] = fn;
    (Math as unknown as Record<string, unknown>)[name] = (...args: number[]) => {
      const v = fn(...args);
      return v === 0 || !Number.isFinite(v) ? v : v * NUDGE;
    };
  }
}

function restoreMath() {
  for (const name of FUNCS) {
    const fn = originals[name];
    if (fn) (Math as unknown as Record<string, unknown>)[name] = fn;
  }
}

afterEach(restoreMath);

function renderTwice(name: string, Comp: ComponentType) {
  restoreMath();
  const plain = renderToStaticMarkup(createElement(Comp));
  nudgeMath();
  const nudged = renderToStaticMarkup(createElement(Comp));
  restoreMath();
  expect(plain.length).toBeGreaterThan(500);
  if (plain !== nudged) {
    let i = 0;
    while (i < plain.length && plain[i] === nudged[i]) i++;
    const context = plain.slice(Math.max(0, i - 160), i + 80);
    throw new Error(`${name}: markup differs at offset ${i}: …${context}…`);
  }
}

describe("hydration stability: lab markup does not depend on last-bit float differences", () => {
  const labs: Array<[string, ComponentType]> = [
    ["robot-sim", RobotSim as ComponentType],
    ["pid", PidLab as ComponentType],
    ["arm", ArmLab as ComponentType],
    ["trace-width", TraceWidthLab as ComponentType],
  ];
  for (const [name, Comp] of labs) {
    it(name, () => renderTwice(name, Comp));
  }
});

describe("hydration stability: lesson markup does not depend on last-bit float differences", () => {
  for (const lesson of lessons) {
    it(lesson.slug, async () => {
      const Body = (await lessonBodies[lesson.slug]()).default as ComponentType;
      renderTwice(lesson.slug, Body);
    });
  }
});
