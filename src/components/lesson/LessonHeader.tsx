import Link from "next/link";
import { Check } from "lucide-react";
import type { LessonMeta, Track } from "@/lib/curriculum";
import { TrackPill } from "@/components/ui/TrackPill";
import { HEADER_PARTS } from "./lessonParts";

/** Header of a simple-first lesson: a wash of the track colour, the title and objectives, and links to the parts. */
export function LessonHeader({ meta, track }: { meta: LessonMeta; track: Track }) {
  return (
    <header className="space-y-4 rounded-2xl border border-border bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--track)_22%,transparent),transparent_65%)] p-6 sm:p-8">
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
      <p className="max-w-[48ch] text-lg text-text/80">{meta.summary}</p>
      <p className="font-mono text-xs text-muted">
        Day {meta.day} · {meta.minutes} min
      </p>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">After this lesson</p>
        <ul className="space-y-1.5 text-sm">
          {meta.objectives.map((o) => (
            <li key={o} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--track)" />
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </div>
      <nav aria-label="Lesson parts" className="xl:hidden">
        <ol className="flex flex-wrap gap-2">
          {HEADER_PARTS.map((p, i) => (
            <li key={p.id}>
              <a
                href={`#${p.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg/40 px-3 py-1 text-xs text-muted hover:text-text"
              >
                <span className="font-mono text-(--track)">{i + 1}</span>
                {p.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
