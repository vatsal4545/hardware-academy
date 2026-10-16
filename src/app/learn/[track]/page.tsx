import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { TrackPill } from "@/components/ui/TrackPill";
import { tracks, lessonsFor } from "@/lib/curriculum";
import { TrackLessonList } from "./TrackLessonList";

type Params = Promise<{ track: string }>;

export function generateStaticParams() {
  return tracks.map((t) => ({ track: t.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { track } = await params;
  const t = tracks.find((x) => x.id === track);
  return { title: t ? t.name : "Track" };
}

async function TrackContent({ params }: { params: Params }) {
  const { track } = await params;
  const t = tracks.find((x) => x.id === track);
  if (!t) notFound();
  const ls = lessonsFor(t.id);
  const minutes = ls.reduce((s, l) => s + l.minutes, 0);
  return (
    <>
      <TrackPill track={t} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t.name}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">{t.tagline}</p>
      <p className="mt-2 font-mono text-xs text-muted">
        {t.days} · {ls.length} lessons · {Math.floor(minutes / 60)} h {minutes % 60} min
      </p>
      <div className="mt-8">
        <TrackLessonList track={t.id} />
      </div>
    </>
  );
}

function TrackFallback() {
  return (
    <div aria-busy="true">
      <div className="h-5 w-32 animate-pulse rounded-full bg-surface-2" />
      <div className="mt-4 h-9 w-1/2 animate-pulse rounded bg-surface-2" />
      <div className="mt-8 h-64 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}

export default function TrackPage({ params }: { params: Params }) {
  return (
    <Container className="py-10">
      <Suspense fallback={<TrackFallback />}>
        <TrackContent params={params} />
      </Suspense>
    </Container>
  );
}
