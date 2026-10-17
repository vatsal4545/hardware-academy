import type { Metadata } from "next";
import type { ComponentType } from "react";
import { lessonBySlug, neighbors, type LessonData } from "@/lib/curriculum";
import { referencesFor } from "@/lib/references";
import { LessonShell } from "./LessonShell";

export function lessonMetadata(slug: string): Metadata {
  const meta = lessonBySlug(slug);
  return { title: meta ? meta.title : "Lesson", description: meta?.summary };
}

/** Rendered by each generated lesson route with exactly one lesson's body and data, so a route only bundles its own lesson. */
export function LessonRoute({ slug, data, Body }: { slug: string; data: LessonData; Body: ComponentType }) {
  const meta = lessonBySlug(slug);
  if (!meta) throw new Error(`Unknown lesson: ${slug}`);
  const nav = neighbors(slug);
  return (
    <LessonShell meta={meta} data={data} prev={nav.prev} next={nav.next} references={referencesFor(slug)}>
      <Body />
    </LessonShell>
  );
}
