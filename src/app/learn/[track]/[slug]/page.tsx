import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { lessons, lessonBySlug, neighbors } from "@/lib/curriculum";
import { lessonData } from "@/content/registry";
import { LessonBody } from "@/content/LessonBody";
import { Container } from "@/components/ui/Container";
import { LessonShell } from "./LessonShell";

type Params = Promise<{ track: string; slug: string }>;

export function generateStaticParams() {
  return lessons.map((l) => ({ track: l.track, slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const meta = lessonBySlug(slug);
  return { title: meta ? meta.title : "Lesson", description: meta?.summary };
}

async function LessonContent({ params }: { params: Params }) {
  const { track, slug } = await params;
  const meta = lessonBySlug(slug);
  if (!meta || meta.track !== track) notFound();
  const data = lessonData[slug];
  const nav = neighbors(slug);
  return (
    <LessonShell meta={meta} data={data} prev={nav.prev} next={nav.next}>
      <LessonBody slug={slug} />
    </LessonShell>
  );
}

function LessonFallback() {
  return (
    <Container className="py-10" aria-busy="true">
      <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 h-9 w-2/3 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 h-5 w-1/2 animate-pulse rounded bg-surface-2" />
      <div className="mt-8 h-40 animate-pulse rounded-xl bg-surface" />
    </Container>
  );
}

export default function LessonPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<LessonFallback />}>
      <LessonContent params={params} />
    </Suspense>
  );
}
