import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { TrackPill } from "@/components/ui/TrackPill";
import { lessonsFor, tracks, type TrackId } from "@/lib/curriculum";
import { TrackLessonList } from "./TrackLessonList";

export function trackMetadata(trackId: TrackId): Metadata {
  const t = tracks.find((x) => x.id === trackId);
  return { title: t ? t.name : "Track" };
}

/** Rendered by each generated track route, so the page is fully static and unknown track URLs are real 404s. */
export function TrackRoute({ trackId }: { trackId: TrackId }) {
  const t = tracks.find((x) => x.id === trackId);
  if (!t) throw new Error(`Unknown track: ${trackId}`);
  const ls = lessonsFor(t.id);
  const minutes = ls.reduce((s, l) => s + l.minutes, 0);
  return (
    <Container className="py-10">
      <TrackPill track={t} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t.name}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">{t.tagline}</p>
      <p className="mt-2 font-mono text-xs text-muted">
        {t.days} · {ls.length} lessons · {Math.floor(minutes / 60)} h {minutes % 60} min
      </p>
      <div className="mt-8">
        <TrackLessonList track={t.id} />
      </div>
    </Container>
  );
}
