import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import type { QuizQuestion } from "@/lib/curriculum";
import { days, lessonBySlug } from "@/lib/curriculum";
import { referencesFor } from "@/lib/references";
import { BOARD_DEFAULTS, fetStation, ledStation } from "@/lib/sim/board";
import Lesson from "@/content/pcb/components-in-action";
import data from "@/content/pcb/components-in-action.data";

afterEach(cleanup);

/** Prose words in #theory: text nodes joined with spaces, without the heading, figures and SVG labels (as in pcb-a). */
function theoryWords(container: HTMLElement): number {
  const theory = container.querySelector("#theory");
  if (!theory) return 0;
  const copy = theory.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("h2, figure, svg").forEach((n) => n.remove());
  const parts: string[] = [];
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.textContent ?? "");
  return parts
    .join(" ")
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

function sentences(text: string): number {
  return text.split(/[.!?](?:\s+|$)/).filter((s) => s.trim().length > 0).length;
}

// The quiz branch's tests/quiz-length-tell.ts gates these across the whole course; the same two rules, inlined.
const isLongest = (q: QuizQuestion) => q.choices.every((c, i) => i === q.answer || c.length < q.choices[q.answer].length);
const isShortest = (q: QuizQuestion) => q.choices.every((c, i) => i === q.answer || c.length > q.choices[q.answer].length);

describe("components-in-action", () => {
  it("renders theory, viz and practice sections", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory")).not.toBeNull();
    expect(container.querySelector("#viz")).not.toBeNull();
    expect(container.querySelector("#practice")).not.toBeNull();
  });

  it("has two static figures in the theory and the board tour with real controls in the viz", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelectorAll("#theory figure svg").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector("#viz svg")).not.toBeNull();
    const controls = container.querySelectorAll('#viz input[type="range"], #viz [role="radiogroup"], #viz [role="switch"]');
    expect(controls.length).toBeGreaterThan(0);
    expect(container.querySelectorAll('#viz [role="button"][data-part]')).toHaveLength(28);
  });

  it("has 700-1200 words of theory that name every law", () => {
    const { container } = render(<Lesson />);
    const words = theoryWords(container);
    expect(words).toBeGreaterThanOrEqual(700);
    expect(words).toBeLessThanOrEqual(1200);
    const text = container.querySelector("#theory")?.textContent ?? "";
    for (const law of ["Ohm", "Kirchhoff", "Thevenin", "τ = R · C", "L · di/dt", "right-hand rule", "voltage divider"]) expect(text).toContain(law);
  });

  it("the 'Try this' numbers come from the model", () => {
    const { container } = render(<Lesson />);
    const text = container.querySelector("#viz")?.textContent ?? "";
    const stalled = fetStation({ ...BOARD_DEFAULTS, iMotorL: 1.5, iMotorR: 1.5 });
    expect(text).toContain(`${stalled.iPack.toFixed(3)} A`);
    expect(text).toContain(`${(stalled.vFet * 1e3).toFixed(2)} mV`);
    expect(ledStation({ ...BOARD_DEFAULTS, ledColor: "blue" }).iLed * 1e6).toBeCloseTo(300, 6);
    expect(ledStation({ ...BOARD_DEFAULTS, ledColor: "blue", ledR: 220 }).iLed * 1e3).toBeCloseTo(1.36, 2);
  });

  it("has a practice exercise with a worked answer", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#practice")?.textContent ?? "").toMatch(/Answer/);
  });

  it("has complete lesson data", () => {
    expect(data.keyTerms.length).toBeGreaterThanOrEqual(5);
    expect(new Set(data.keyTerms.map((k) => k.term)).size).toBe(data.keyTerms.length);
    for (const k of data.keyTerms) expect(k.def.length).toBeGreaterThan(20);

    const s = data.scenario;
    for (const field of [s.title, s.context, s.rootCause, s.fix, s.lesson]) {
      expect(field.length).toBeGreaterThan(10);
      expect(field).not.toBe("TODO");
    }
    expect(s.symptoms.length).toBeGreaterThanOrEqual(2);
    expect(s.hints.length).toBeGreaterThanOrEqual(2);

    expect(data.interview.length).toBeGreaterThanOrEqual(4);
    expect(data.interview.some((q) => q.level === "deep")).toBe(true);
    for (const q of data.interview) {
      const n = sentences(q.a);
      expect(n, q.q).toBeGreaterThanOrEqual(3);
      expect(n, q.q).toBeLessThanOrEqual(6);
    }

    expect(data.quiz.length).toBeGreaterThanOrEqual(5);
    for (const q of data.quiz) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size, q.q).toBe(4);
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(40);
    }
    expect(new Set(data.quiz.map((q) => q.answer)).size).toBe(4);
  });

  it("the quiz has no length tell", () => {
    expect(data.quiz.filter(isShortest)).toHaveLength(0);
    expect(data.quiz.filter(isLongest).length).toBeLessThanOrEqual(2);
  });

  it("is a 55-minute day-4 lesson after active components, and cites the original papers", () => {
    const meta = lessonBySlug("components-in-action")!;
    expect(meta.day).toBe(4);
    expect(meta.minutes).toBe(55);
    expect(meta.track).toBe("pcb");
    expect(days[3].lessonSlugs.slice(-2)).toEqual(["active-components", "components-in-action"]);
    const ids = referencesFor("components-in-action").map((r) => r.id);
    for (const id of ["ohm1827", "kirchhoff1845", "thevenin1883", "feynman-ii", "horowitz-hill", "ott"]) expect(ids).toContain(id);
  });
});
