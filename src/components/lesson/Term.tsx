"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useLessonData } from "./LessonDataContext";

/**
 * A word from the lesson's key terms. Hover, keyboard focus or a tap shows the plain definition with the technical one
 * under it; Escape, a tap elsewhere, blur or moving the mouse away closes it.
 */
export function Term({ t, children }: { t: string; children: ReactNode }) {
  const term = useLessonData()?.keyTerms.find((k) => k.term === t);
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!term) console.error(`Term: no key term "${t}" in this lesson's data`);
  }, [t, term]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (!term) return <>{children}</>;

  // Open towards the side with more room, so the box stays on screen near either edge of the column.
  const show = () => {
    const left = box.current?.getBoundingClientRect().left ?? 0;
    setAlignEnd(left > window.innerWidth / 2);
    setOpen(true);
  };

  return (
    <span ref={box} className="relative" onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={show}
        className="cursor-help rounded-sm underline decoration-(--track) decoration-dotted decoration-2 underline-offset-4 hover:text-(--track) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          id={tipId}
          className={cn(
            "absolute top-full z-30 mt-2 block w-72 max-w-[80vw] rounded-lg border border-border bg-surface-2 p-3 text-left text-sm font-normal leading-snug shadow-xl",
            alignEnd ? "right-0" : "left-0",
          )}
        >
          <span className="block font-semibold text-text">{term.term}</span>
          <span className="mt-1 block text-text">{term.plain ?? term.def}</span>
          {term.plain && <span className="mt-2 block text-xs text-muted">{term.def}</span>}
        </span>
      )}
    </span>
  );
}
