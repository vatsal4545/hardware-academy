import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { TrackPill } from "@/components/ui/TrackPill";
import { tracks, lessonsFor, type TrackId } from "@/lib/curriculum";
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

export default async function TrackPage({ params }: { params: Params }) {
  const { track } = await params;
  const t = tracks.find((x) => x.id === track);
  if (!t) notFound();
  const ls = lessonsFor(t.id as TrackId);
  const minutes = ls.reduce((s, l) => s + l.minutes, 0);
  return (
    <Container className="py-10">
      <TrackPill track={t} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t.name}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">{t.tagline}</p>
      <p className="mt-2 font-mono text-xs text-muted">
        {t.days} · {ls.length} lessons · {Math.round(minutes / 60)} h {minutes % 60} min
      </p>
      <div className="mt-8">
        <TrackLessonList track={t.id} />
      </div>
    </Container>
  );
}
