"use client";

import { useId, useState } from "react";
import type { QuizQuestion } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function Quiz({ slug, questions }: { slug: string; questions: QuizQuestion[] }) {
  const { recordQuiz } = useProgress();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const name = useId();
  const score = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  const check = () => {
    setChecked(true);
    recordQuiz(slug, score, questions.length);
  };
  const reset = () => {
    setAnswers({});
    setChecked(false);
  };

  if (questions.length === 0) return null;

  return (
    <div className="space-y-5">
      {questions.map((q, i) => {
        const picked = answers[i];
        const correct = picked === q.answer;
        return (
          <fieldset key={i} className="rounded-lg border border-border bg-surface p-4">
            <legend className="px-1 text-sm font-semibold">
              {i + 1}. {q.q}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {q.choices.map((c, ci) => {
                const id = `${name}-${i}-${ci}`;
                const state = !checked ? "idle" : ci === q.answer ? "correct" : ci === picked ? "wrong" : "idle";
                return (
                  <label
                    key={ci}
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      state === "correct" && "border-green-400/60 bg-green-400/10",
                      state === "wrong" && "border-red-400/60 bg-red-400/10",
                      state === "idle" && "border-border hover:bg-surface-2",
                    )}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={`${name}-${i}`}
                      checked={picked === ci}
                      onChange={() => {
                        if (!checked) setAnswers((a) => ({ ...a, [i]: ci }));
                      }}
                      disabled={checked}
                      className="accent-cyan-400"
                    />
                    <span>{c}</span>
                  </label>
                );
              })}
            </div>
            {checked && (
              <p className={cn("mt-3 text-sm", correct ? "text-green-300" : "text-red-300")}>
                <span className="font-semibold">{correct ? "Correct. " : "Not quite. "}</span>
                <span className="text-text/90">{q.explain}</span>
              </p>
            )}
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        {!checked ? (
          <Button onClick={check} disabled={!allAnswered}>
            Check answers
          </Button>
        ) : (
          <>
            <p className="font-mono text-sm">
              {score} / {questions.length} correct
            </p>
            <Button variant="secondary" onClick={reset}>
              Try again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
