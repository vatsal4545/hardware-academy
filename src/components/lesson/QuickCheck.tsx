"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, CircleQuestionMark, X } from "lucide-react";
import { hashString, seededOrder } from "@/lib/shuffle";
import { cn } from "@/lib/cn";
import { useLessonData } from "./LessonDataContext";

/** One question from the lesson's `checks`, answered on the spot with an explanation. Not scored or saved. */
export function QuickCheck({ id }: { id: string }) {
  const q = useLessonData()?.checks?.[id];
  const [picked, setPicked] = useState<number | null>(null);
  const name = useId();
  const order = useMemo(() => (q ? seededOrder(hashString(`check:${id}:${q.q}`), q.choices.length) : []), [id, q]);

  useEffect(() => {
    if (!q) console.error(`QuickCheck: no check "${id}" in this lesson's data`);
  }, [id, q]);

  if (!q) return null;
  const answered = picked !== null;
  const right = picked === q.answer;

  return (
    <div data-check-id={id} className="rounded-xl border border-border bg-surface-2/50 p-4">
      <fieldset>
        <legend className="w-full">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-(--track)">
            <CircleQuestionMark aria-hidden className="h-4 w-4" />
            Quick check
          </span>
          <span className="mt-1 block font-medium">{q.q}</span>
        </legend>
        <div className="mt-3 grid gap-2">
          {order.map((ci) => {
            const state = !answered ? "idle" : ci === q.answer ? "right" : ci === picked ? "wrong" : "idle";
            return (
              <label
                key={ci}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm",
                  state === "right" && "border-green-400/60 bg-green-400/10",
                  state === "wrong" && "border-red-400/60 bg-red-400/10",
                  state === "idle" && "border-border hover:bg-surface-2",
                )}
              >
                <input type="radio" name={name} checked={picked === ci} onChange={() => setPicked(ci)} className="mt-0.5 accent-cyan-400" />
                <span>{q.choices[ci]}</span>
                {/* An icon and words as well as the colour, so the result isn't shown by colour alone (WCAG 1.4.1). */}
                {state === "right" && (
                  <>
                    <Check aria-hidden className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-green-300" />
                    <span className="sr-only"> (correct answer)</span>
                  </>
                )}
                {state === "wrong" && (
                  <>
                    <X aria-hidden className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                    <span className="sr-only"> (your answer)</span>
                  </>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
      <p aria-live="polite" className={cn("text-sm", answered && "mt-3", right ? "text-green-300" : "text-red-300")}>
        {answered && (
          <>
            <span className="font-semibold">{right ? "Right. " : "Not quite. "}</span>
            <span className="text-text/90">{q.explain}</span>
          </>
        )}
      </p>
    </div>
  );
}
