import type { LessonData, QuizQuestion } from "@/lib/curriculum";

// A multiple-choice question has a "length tell" when the correct choice is the single longest
// (or single shortest) string: a learner can then pick by length without knowing the material.
// The quiz shuffles choice order, so length is the only surface cue left to measure.

export function correctIsLongest(q: QuizQuestion): boolean {
  const key = q.choices[q.answer].length;
  return q.choices.every((c, i) => i === q.answer || c.length < key);
}

export function correctIsShortest(q: QuizQuestion): boolean {
  const key = q.choices[q.answer].length;
  return q.choices.every((c, i) => i === q.answer || c.length > key);
}

export interface LessonTell {
  slug: string;
  questions: number;
  longest: number;
  shortest: number;
}

export interface TellReport {
  questions: number;
  longest: number;
  shortest: number;
  lessons: LessonTell[];
}

export function lengthTellReport(data: Record<string, LessonData>): TellReport {
  const lessons = Object.entries(data).map(([slug, d]) => ({
    slug,
    questions: d.quiz.length,
    longest: d.quiz.filter(correctIsLongest).length,
    shortest: d.quiz.filter(correctIsShortest).length,
  }));
  const sum = (k: "questions" | "longest" | "shortest") => lessons.reduce((n, l) => n + l[k], 0);
  return { questions: sum("questions"), longest: sum("longest"), shortest: sum("shortest"), lessons };
}
