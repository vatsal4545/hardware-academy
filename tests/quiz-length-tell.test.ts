import { describe, it, expect } from "vitest";
import { lessonData } from "@/content/registry";
import { lengthTellReport } from "./quiz-length-tell";

// The quiz shuffles choice order, so length is the only surface cue left. If the correct choice is
// usually the longest string, a learner can pass by always picking the longest answer. With four
// choices, chance alone makes the key the single longest in about a quarter of questions, so the
// honest target is "near chance" in both directions: not usually the longest, not usually the
// shortest, and not so rarely the longest that "never pick the longest" becomes the tell instead.
describe("quiz length tell", () => {
  const report = lengthTellReport(lessonData);
  const share = (n: number) => `${n} of ${report.questions} questions (${((100 * n) / report.questions).toFixed(1)}%)`;
  const offenders = (pick: (l: { longest: number; shortest: number }) => number) =>
    report.lessons.filter((l) => pick(l) * 2 > l.questions).map((l) => `${l.slug} ${pick(l)}/${l.questions}`);

  it("the correct choice is the single longest in at most 30% of all questions", () => {
    expect(report.longest / report.questions, `correct choice is the single longest in ${share(report.longest)}`).toBeLessThanOrEqual(0.3);
  });

  it("the correct choice is the single longest in at least 10% of all questions", () => {
    expect(report.longest / report.questions, `correct choice is the single longest in only ${share(report.longest)}`).toBeGreaterThanOrEqual(0.1);
  });

  it("the correct choice is the single shortest in at most 30% of all questions", () => {
    expect(report.shortest / report.questions, `correct choice is the single shortest in ${share(report.shortest)}`).toBeLessThanOrEqual(0.3);
  });

  it("no lesson has the longest-choice tell in more than half of its questions", () => {
    const bad = offenders((l) => l.longest);
    expect(bad, `lessons where the key is the longest choice in more than half the questions: ${bad.join(", ")}`).toEqual([]);
  });

  it("no lesson has the shortest-choice tell in more than half of its questions", () => {
    const bad = offenders((l) => l.shortest);
    expect(bad, `lessons where the key is the shortest choice in more than half the questions: ${bad.join(", ")}`).toEqual([]);
  });
});
