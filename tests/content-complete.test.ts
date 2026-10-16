import { describe, it, expect } from "vitest";
import { lessons } from "@/lib/curriculum";
import { lessonData } from "@/content/registry";

// Completeness gate: fails while any lesson still has stub data.
describe("content completeness", () => {
  for (const l of lessons) {
    it(`${l.slug} has complete data`, () => {
      const d = lessonData[l.slug];
      expect(d.keyTerms.length).toBeGreaterThanOrEqual(5);
      expect(d.interview.length).toBeGreaterThanOrEqual(4);
      expect(d.interview.some((q) => q.level === "deep")).toBe(true);
      expect(d.quiz.length).toBeGreaterThanOrEqual(5);
      for (const q of d.quiz) {
        expect(q.choices.length).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
        expect(q.explain.length).toBeGreaterThan(10);
      }
      const s = d.scenario;
      for (const field of [s.title, s.context, s.rootCause, s.fix, s.lesson]) {
        expect(field.length).toBeGreaterThan(10);
        expect(field).not.toBe("TODO");
      }
      expect(s.symptoms.length).toBeGreaterThanOrEqual(2);
      expect(s.hints.length).toBeGreaterThanOrEqual(2);
    });
  }
});
