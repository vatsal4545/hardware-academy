"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { lessonsFor, trackById, type LessonData, type LessonMeta } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { TrackPill } from "@/components/ui/TrackPill";
import { ButtonLink } from "@/components/ui/Button";
import { InterviewQuestions, KeyTermsRail, MarkComplete, Quiz, ScenarioCard, Section } from "@/components/lesson";
import { cn } from "@/lib/cn";

function LessonNav({ meta }: { meta: LessonMeta }) {
  const { state } = useProgress();
  const ls = lessonsFor(meta.track);
  return (
    <ol className="space-y-0.5 text-sm">
      {ls.map((l, i) => {
        const current = l.slug === meta.slug;
        const done = Boolean(state.completed[l.slug]);
        return (
          <li key={l.slug}>
            <Link
              href={`/learn/${l.track}/${l.slug}`}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-1.5",
                current ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span className={cn("font-mono text-xs", done ? "text-green-400" : "text-muted")}>{done ? "✓" : String(i + 1).padStart(2, "0")}</span>
              <span>{l.title}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function LessonShell({
  meta,
  data,
  prev,
  next,
  children,
}: {
  meta: LessonMeta;
  data: LessonData;
  prev?: LessonMeta;
  next?: LessonMeta;
  children: ReactNode;
}) {
  const track = trackById(meta.track);
  return (
    <Container className="py-8 lg:py-10">
      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[230px_minmax(0,1fr)_250px]">
        <aside className="mb-6 lg:mb-0">
          <details className="rounded-lg border border-border bg-surface lg:hidden">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium">{track.name} lessons</summary>
            <div className="border-t border-border p-2">
              <LessonNav meta={meta} />
            </div>
          </details>
          <div className="hidden lg:sticky lg:top-20 lg:block">
            <p className="mb-2 px-2 font-mono text-xs uppercase tracking-wide text-muted">{track.name}</p>
            <LessonNav meta={meta} />
          </div>
        </aside>

        <article className="min-w-0 space-y-12">
          <header className="space-y-3">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <Link href="/learn" className="hover:text-text">
                Learn
              </Link>
              <span className="mx-1.5">/</span>
              <Link href={`/learn/${track.id}`} className="hover:text-text">
                {track.name}
              </Link>
            </nav>
            <TrackPill track={track} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{meta.title}</h1>
            <p className="text-lg text-muted">{meta.summary}</p>
            <p className="font-mono text-xs text-muted">
              Day {meta.day} · {meta.minutes} min
            </p>
            <Card className="mt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">After this lesson</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {meta.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </Card>
          </header>

          {children}

          <Section id="scenario" title="Real-world scenario">
            <ScenarioCard scenario={data.scenario} />
          </Section>
          <Section id="interview" title="Interview questions">
            <InterviewQuestions items={data.interview} />
          </Section>
          <Section id="quiz" title="Quiz">
            <Quiz slug={meta.slug} questions={data.quiz} />
          </Section>

          <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <MarkComplete slug={meta.slug} />
            <div className="flex flex-wrap gap-2">
              {prev && (
                <ButtonLink variant="secondary" href={`/learn/${prev.track}/${prev.slug}`}>
                  ← Previous
                </ButtonLink>
              )}
              {next && <ButtonLink href={`/learn/${next.track}/${next.slug}`}>Next: {next.title} →</ButtonLink>}
            </div>
          </div>
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <KeyTermsRail terms={data.keyTerms} />
          </div>
        </aside>
      </div>
      <div className="mt-10 xl:hidden">
        <KeyTermsRail terms={data.keyTerms} />
      </div>
    </Container>
  );
}
