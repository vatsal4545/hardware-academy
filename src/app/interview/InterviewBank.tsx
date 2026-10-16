"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { tracks, trackById, type TrackId } from "@/lib/curriculum";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export interface BankItem {
  q: string;
  a: string;
  level: "screen" | "deep";
  slug: string;
  track: TrackId;
  lessonTitle: string;
}

const SECONDS_PER_QUESTION = 90;
const MOCK_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Mock {
  qs: BankItem[];
  i: number;
  revealed: boolean;
  secondsLeft: number;
  finished: boolean;
}

export function InterviewBank({ items }: { items: BankItem[] }) {
  const [track, setTrack] = useState<TrackId | "all">("all");
  const [level, setLevel] = useState<"all" | "screen" | "deep">("all");
  const [query, setQuery] = useState("");
  const [mock, setMock] = useState<Mock | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        (track === "all" || it.track === track) &&
        (level === "all" || it.level === level) &&
        (q === "" || it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
    );
  }, [items, track, level, query]);

  useEffect(() => {
    if (!mock || mock.revealed || mock.finished) return;
    const id = setInterval(() => {
      setMock((m) => (m && !m.revealed && m.secondsLeft > 0 ? { ...m, secondsLeft: m.secondsLeft - 1 } : m));
    }, 1000);
    return () => clearInterval(id);
  }, [mock]);

  const startMock = () => {
    const qs = shuffle(filtered).slice(0, MOCK_SIZE);
    if (qs.length === 0) return;
    setMock({ qs, i: 0, revealed: false, secondsLeft: SECONDS_PER_QUESTION, finished: false });
  };

  if (mock) {
    const current = mock.qs[mock.i];
    const t = trackById(current.track);
    return (
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-sm text-muted">
            Mock interview · question {mock.i + 1} / {mock.qs.length}
          </p>
          <p
            className={cn("font-mono text-sm", mock.secondsLeft <= 15 && !mock.revealed ? "text-red-300" : "text-muted")}
            aria-live="polite"
          >
            {mock.revealed ? "answer shown" : `${mock.secondsLeft}s to answer aloud`}
          </p>
        </div>
        {mock.finished ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Done. {mock.qs.length} questions answered aloud.</h2>
            <p className="text-sm text-muted">
              Go back over the ones you stumbled on in the bank below, then run it again with a different track filter.
            </p>
            <Button onClick={() => setMock(null)}>Back to the bank</Button>
          </div>
        ) : (
          <>
            <p className="text-xs" style={{ color: t.color }}>
              {t.name} · {current.level}
            </p>
            <h2 className="text-xl font-semibold">{current.q}</h2>
            {mock.revealed ? (
              <div className="rounded-lg border border-border bg-bg p-4 text-sm leading-relaxed">
                <p>{current.a}</p>
                <p className="mt-2 text-muted">
                  From{" "}
                  <Link href={`/learn/${current.track}/${current.slug}`} className="underline">
                    {current.lessonTitle}
                  </Link>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Say your answer out loud as if the interviewer were across the table.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {!mock.revealed ? (
                <Button onClick={() => setMock({ ...mock, revealed: true })}>Reveal answer</Button>
              ) : mock.i < mock.qs.length - 1 ? (
                <Button onClick={() => setMock({ ...mock, i: mock.i + 1, revealed: false, secondsLeft: SECONDS_PER_QUESTION })}>
                  Next question
                </Button>
              ) : (
                <Button onClick={() => setMock({ ...mock, finished: true })}>Finish</Button>
              )}
              <Button variant="ghost" onClick={() => setMock(null)}>
                Quit
              </Button>
            </div>
          </>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-semibold">Mock interview mode</h2>
          <p className="text-sm text-muted">
            {Math.min(MOCK_SIZE, filtered.length)} random questions from the current filter, {SECONDS_PER_QUESTION} seconds
            each, answer out loud, then compare.
          </p>
        </div>
        <Button onClick={startMock} disabled={filtered.length === 0}>
          Start mock interview
        </Button>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div role="radiogroup" aria-label="Track" className="flex flex-wrap gap-2">
          {[{ id: "all" as const, name: "All tracks", color: "#e5e7eb" }, ...tracks].map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={track === t.id}
              onClick={() => setTrack(t.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                track === t.id ? "border-text bg-surface-2 text-text" : "border-border text-muted hover:text-text",
              )}
              style={track === t.id && t.id !== "all" ? { borderColor: t.color, color: t.color } : undefined}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Level" className="flex gap-2">
          {(["all", "screen", "deep"] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => setLevel(l)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                level === l ? "border-text bg-surface-2 text-text" : "border-border text-muted hover:text-text",
              )}
            >
              {l === "all" ? "All levels" : l}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search questions"
          aria-label="Search questions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm md:ml-auto md:w-64"
        />
      </div>

      <p className="text-sm text-muted">{filtered.length} questions</p>
      <div className="space-y-2">
        {filtered.map((it, i) => (
          <details key={`${it.slug}-${i}`} className="rounded-lg border border-border bg-surface open:bg-surface-2/40">
            <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 text-sm font-medium">
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                  it.level === "deep" ? "bg-violet-400/20 text-violet-300" : "bg-cyan-400/20 text-cyan-300",
                )}
              >
                {it.level}
              </span>
              <span>{it.q}</span>
            </summary>
            <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-text/90">
              <p>{it.a}</p>
              <p className="mt-2 text-muted">
                From{" "}
                <Link href={`/learn/${it.track}/${it.slug}`} className="underline hover:text-text">
                  {it.lessonTitle}
                </Link>
                <span style={{ color: trackById(it.track).color }}> · {trackById(it.track).name}</span>
              </p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
