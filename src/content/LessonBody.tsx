"use client";

import { lazy, Suspense, type ComponentType } from "react";
import { lessonBodies } from "./bodies";

// One lazy component per lesson, created once at module load; the import itself runs on first render.
const lazyBodies: Record<string, ComponentType> = Object.fromEntries(
  Object.entries(lessonBodies).map(([slug, loader]) => [slug, lazy(loader)]),
);

function MissingLesson() {
  return <p className="text-muted">This lesson could not be loaded.</p>;
}

export function LessonBody({ slug }: { slug: string }) {
  const Body = lazyBodies[slug] ?? MissingLesson;
  return (
    <Suspense fallback={<p className="animate-pulse text-muted">Loading lesson…</p>}>
      <Body />
    </Suspense>
  );
}
