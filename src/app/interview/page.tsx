import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { lessons } from "@/lib/curriculum";
import { lessonData } from "@/content/registry";
import { InterviewBank, type BankItem } from "./InterviewBank";

export const metadata: Metadata = { title: "Interview bank" };

export default function InterviewPage() {
  const items: BankItem[] = lessons.flatMap((l) =>
    lessonData[l.slug].interview.map((q) => ({ ...q, slug: l.slug, track: l.track, lessonTitle: l.title })),
  );
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Interview bank</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every interview question from every lesson, with answers you could say out loud. Filter by track and level, search,
        or run a timed mock interview.
      </p>
      <div className="mt-8">
        <InterviewBank items={items} />
      </div>
    </Container>
  );
}
