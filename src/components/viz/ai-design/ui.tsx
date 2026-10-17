"use client";

import { useState, type ButtonHTMLAttributes } from "react";
import { useAnimationFrame, usePrefersReducedMotion } from "@/components/viz/shared";

/** Joins class names, skipping falsy parts. Local to the AI-design visualizations. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const VARIANTS = {
  primary: "bg-text text-bg hover:bg-white",
  secondary: "border border-border bg-surface text-text hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
} as const;

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
}

/** A small action button that matches the lesson controls. */
export function ActionButton({ variant = "secondary", className, type = "button", ...props }: ActionButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export interface CurveArrowProps {
  x1: number;
  y1: number;
  /** control point of the quadratic curve */
  cx: number;
  cy: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  head?: number;
  dashed?: boolean;
  dashOffset?: number;
}

/** A quadratic curve with an arrowhead at (x2, y2), for feedback loops in diagrams. */
export function CurveArrow({ x1, y1, cx, cy, x2, y2, color = "#9ca3af", width = 1.6, head = 8, dashed = false, dashOffset = 0 }: CurveArrowProps) {
  const ang = Math.atan2(y2 - cy, x2 - cx);
  const spread = Math.PI / 7;
  const bx1 = x2 - head * Math.cos(ang - spread);
  const by1 = y2 - head * Math.sin(ang - spread);
  const bx2 = x2 - head * Math.cos(ang + spread);
  const by2 = y2 - head * Math.sin(ang + spread);
  const ex = x2 - head * 0.6 * Math.cos(ang);
  const ey = y2 - head * 0.6 * Math.sin(ang);
  return (
    <g>
      <path
        d={`M${x1} ${y1} Q${cx} ${cy} ${ex} ${ey}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 5" : undefined}
        strokeDashoffset={dashOffset}
      />
      <polygon points={`${x2},${y2} ${bx1},${by1} ${bx2},${by2}`} fill={color} />
    </g>
  );
}

export interface RunClock {
  /** seconds of animation time */
  t: number;
  playing: boolean;
  /** true once t has reached the end of the run, when the frame loop stops */
  done: boolean;
  setPlaying: (p: boolean) => void;
  reset: () => void;
  /** pause or resume; from the end of a run it restarts */
  toggle: () => void;
}

/**
 * A play/pause clock for a run that ends. Unlike a free-running clock it stops ticking at `endSeconds`,
 * so a finished animation costs nothing. It starts paused under reduced motion.
 */
export function useRunClock(autoplay: boolean, endSeconds: number): RunClock {
  const reduced = usePrefersReducedMotion();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [t, setT] = useState(0);
  const done = t >= endSeconds;
  const playing = (choice ?? (autoplay && !reduced)) && !done;
  useAnimationFrame((dt) => setT((x) => x + dt), playing);
  const toggle = () => {
    if (done) {
      setT(0);
      setChoice(true);
    } else {
      setChoice(!playing);
    }
  };
  return { t, playing, done, setPlaying: setChoice, reset: () => setT(0), toggle };
}
