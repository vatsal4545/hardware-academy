import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lessons, lessonBySlug, neighbors } from "@/lib/curriculum";
import { lessonBodies, lessonData } from "@/content/registry";
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

export default async function LessonPage({ params }: { params: Params }) {
  const { track, slug } = await params;
  const meta = lessonBySlug(slug);
  if (!meta || meta.track !== track) notFound();
  const data = lessonData[slug];
  const Body = lessonBodies[slug];
  const nav = neighbors(slug);
  return (
    <LessonShell meta={meta} data={data} prev={nav.prev} next={nav.next}>
      <Body />
    </LessonShell>
  );
}
