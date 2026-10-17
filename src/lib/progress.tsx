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
  const hasKnownKey = ["completed", "quiz", "labs"].some((k) => isRecord(p[k]));
  if (!hasKnownKey) return null;
  const completed: ProgressState["completed"] = {};
  if (isRecord(p.completed)) {
    for (const [k, v] of Object.entries(p.completed)) if (typeof v === "string") completed[k] = v;
  }
  const quiz: ProgressState["quiz"] = {};
  if (isRecord(p.quiz)) {
    for (const [k, v] of Object.entries(p.quiz)) {
      if (isRecord(v) && typeof v.score === "number" && typeof v.total === "number" && typeof v.at === "string") {
        quiz[k] = { score: v.score, total: v.total, at: v.at };
      }
    }
  }
  const labs: ProgressState["labs"] = {};
  if (isRecord(p.labs)) {
    for (const [k, v] of Object.entries(p.labs)) if (typeof v === "string") labs[k] = v;
  }
  return { completed, quiz, labs };
}

/** Reads storage; null when storage is unavailable or holds nothing usable. */
function loadOrNull(): ProgressState | null {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function load(): ProgressState {
  return loadOrNull() ?? EMPTY;
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
  let storageBound = false;
  const emit = () => listeners.forEach((l) => l());
  const getSnapshot = () => {
    if (!snap.ready) snap = { state: load(), ready: true };
    return snap;
  };
  // Another tab wrote progress: adopt it so this tab's view and its next update build on it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== PROGRESS_KEY) return;
    snap = { state: load(), ready: true };
    emit();
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      if (!storageBound && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
        storageBound = true;
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && storageBound) {
          window.removeEventListener("storage", onStorage);
          storageBound = false;
        }
      };
    },
    getSnapshot,
    getServerSnapshot: () => SERVER_SNAPSHOT,
    update(fn) {
      // Re-read storage first so an update never clobbers what another tab saved since our last read.
      const base = loadOrNull() ?? getSnapshot().state;
      const next = fn(base);
      snap = { state: next, ready: true };
      save(next);
      emit();
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
