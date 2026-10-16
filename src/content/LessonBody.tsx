"use client";

import { lazy, Suspense, type ComponentType } from "react";
import { lessonBodies } from "./bodies";

// One lazy component per lesson, created on first use and cached for the session.
const cache = new Map<string, ComponentType>();

function lazyBody(slug: string): ComponentType {
  const cached = cache.get(slug);
  if (cached) return cached;
  const loader = lessonBodies[slug];
  const Body = loader ? lazy(loader) : () => <p className="text-muted">This lesson could not be loaded.</p>;
  cache.set(slug, Body);
  return Body;
}

export function LessonBody({ slug }: { slug: string }) {
  const Body = lazyBody(slug);
  return (
    <Suspense fallback={<p className="animate-pulse text-muted">Loading lesson…</p>}>
      <Body />
    </Suspense>
  );
}
