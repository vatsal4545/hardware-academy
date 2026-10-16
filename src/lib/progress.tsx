"use client";

import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export const PROGRESS_KEY = "hardware-academy:progress:v1";

export interface ProgressState {
  completed: Record<string, string>;
  quiz: Record<string, { score: number; total: number; at: string }>;
  labs: Record<string, string>;
}

export interface ProgressApi {
  state: ProgressState;
  ready: boolean;
  markComplete(slug: string): void;
  unmark(slug: string): void;
  recordQuiz(slug: string, score: number, total: number): void;
  markLab(id: string): void;
  exportJson(): string;
  importJson(json: string): boolean;
  reset(): void;
}

interface Snapshot {
  state: ProgressState;
  ready: boolean;
}

const EMPTY: ProgressState = { completed: {}, quiz: {}, labs: {} };
const SERVER_SNAPSHOT: Snapshot = { state: EMPTY, ready: false };

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalize(p: unknown): ProgressState | null {
  if (!isRecord(p)) return null;
  return {
    completed: isRecord(p.completed) ? (p.completed as ProgressState["completed"]) : {},
    quiz: isRecord(p.quiz) ? (p.quiz as ProgressState["quiz"]) : {},
    labs: isRecord(p.labs) ? (p.labs as ProgressState["labs"]) : {},
  };
}

function load(): ProgressState {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY;
    return normalize(JSON.parse(raw)) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(state: ProgressState): void {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode, quota); keep in-memory state only
  }
}

interface Store {
  subscribe(listener: () => void): () => void;
  getSnapshot(): Snapshot;
  getServerSnapshot(): Snapshot;
  update(fn: (s: ProgressState) => ProgressState): void;
}

function createStore(): Store {
  let snap: Snapshot = SERVER_SNAPSHOT;
  const listeners = new Set<() => void>();
  const getSnapshot = () => {
    if (!snap.ready) snap = { state: load(), ready: true };
    return snap;
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot,
    getServerSnapshot: () => SERVER_SNAPSHOT,
    update(fn) {
      const next = fn(getSnapshot().state);
      snap = { state: next, ready: true };
      save(next);
      listeners.forEach((l) => l());
    },
  };
}

const noopStore: Store = {
  subscribe: () => () => {},
  getSnapshot: () => SERVER_SNAPSHOT,
  getServerSnapshot: () => SERVER_SNAPSHOT,
  update: () => {},
};

const ProgressContext = createContext<Store | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createStore);
  return <ProgressContext.Provider value={store}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const store = useContext(ProgressContext) ?? noopStore;
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return useMemo<ProgressApi>(
    () => ({
      state: snap.state,
      ready: snap.ready,
      markComplete: (slug) =>
        store.update((s) => ({ ...s, completed: { ...s.completed, [slug]: new Date().toISOString() } })),
      unmark: (slug) =>
        store.update((s) => {
          const completed = { ...s.completed };
          delete completed[slug];
          return { ...s, completed };
        }),
      recordQuiz: (slug, score, total) =>
        store.update((s) => ({ ...s, quiz: { ...s.quiz, [slug]: { score, total, at: new Date().toISOString() } } })),
      markLab: (id) => store.update((s) => ({ ...s, labs: { ...s.labs, [id]: new Date().toISOString() } })),
      exportJson: () => JSON.stringify(snap.state, null, 2),
      importJson: (json) => {
        try {
          const next = normalize(JSON.parse(json));
          if (!next) return false;
          store.update(() => next);
          return true;
        } catch {
          return false;
        }
      },
      reset: () => store.update(() => EMPTY),
    }),
    [snap, store],
  );
}
