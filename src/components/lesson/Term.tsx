"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useLessonData } from "./LessonDataContext";

/** Space kept between the definition box and the edge of the screen, in px. */
const EDGE = 8;

/**
 * A word from the lesson's key terms. Hover, keyboard focus or a tap shows the plain definition with the technical one
 * under it; Escape, a tap elsewhere, blur or moving the mouse away closes it.
 */
export function Term({ t, children }: { t: string; children: ReactNode }) {
  const term = useLessonData()?.keyTerms.find((k) => k.term === t);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ shift: 0, above: false });
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

  // The box is 18rem wide, or 80% of a phone screen. It starts under the term and slides left only as far as it must to
  // stay on screen, and it opens upwards when the term sits low on the screen.
  const show = () => {
    const at = box.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const viewport = document.documentElement.clientWidth || window.innerWidth;
    const width = Math.min(18 * rem, 0.8 * window.innerWidth);
    const left = Math.max(EDGE, Math.min(at.left, viewport - EDGE - width));
    setPlace({ shift: left - at.left, above: at.top > 0.6 * window.innerHeight });
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
        // The gap to the term is padding, so the mouse can cross it without leaving. A press inside is cancelled, so
        // focus stays on the term and blur doesn't close the box.
        <span
          className={cn("absolute z-30 block", place.above ? "bottom-full pb-2" : "top-full pt-2")}
          style={{ left: place.shift }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span
            role="tooltip"
            id={tipId}
            className="block w-72 max-w-[80vw] rounded-lg border border-border bg-surface-2 p-3 text-left text-sm font-normal leading-snug shadow-xl"
          >
            <span className="block font-semibold text-text">{term.term}</span>
            <span className="mt-1 block text-text">{term.plain || term.def}</span>
            {term.plain && <span className="mt-2 block text-xs text-muted">{term.def}</span>}
          </span>
        </span>
      )}
    </span>
  );
}
