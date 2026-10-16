"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener?.("change", onChange);
  return () => mq.removeEventListener?.("change", onChange);
}

function readReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** True when the viewer asked the OS for reduced motion. SSR-safe (false on the server). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
}

/** Runs `callback(dtSeconds, elapsedSeconds)` on every animation frame while `playing` is true.
 *  dt is clamped to 50 ms so a background tab does not produce a giant step. */
export function useAnimationFrame(callback: (dt: number, t: number) => void, playing: boolean): void {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);
  useEffect(() => {
    if (!playing || typeof window === "undefined") return;
    let raf = 0;
    const start = performance.now();
    let last = start;
    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      cbRef.current(dt, (now - start) / 1000);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [playing]);
}

export interface VizClock {
  playing: boolean;
  setPlaying: (p: boolean) => void;
  toggle: () => void;
  /** seconds elapsed while playing */
  t: number;
  reset: () => void;
  reducedMotion: boolean;
}

/** A play/pause clock for visualizations. Starts paused under reduced motion; the viewer can still press play. */
export function useViz(initialPlaying = true): VizClock {
  const reducedMotion = usePrefersReducedMotion();
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? (initialPlaying && !reducedMotion);
  const [t, setT] = useState(0);
  useAnimationFrame((dt) => setT((x) => x + dt), playing);
  const reset = useCallback(() => setT(0), []);
  const setPlaying = useCallback((p: boolean) => setUserPlaying(p), []);
  const toggle = useCallback(() => setUserPlaying(!playing), [playing]);
  return { playing, setPlaying, toggle, t, reset, reducedMotion };
}
