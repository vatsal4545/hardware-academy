import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { lessons } from "@/lib/curriculum";
import { lessonData } from "@/content/registry";
import { ScenarioBrowser, type ScenarioItem } from "./ScenarioBrowser";

export const metadata: Metadata = { title: "Real-world scenarios" };

export default function ScenariosPage() {
  const items: ScenarioItem[] = lessons
    .map((l) => ({ slug: l.slug, track: l.track, lessonTitle: l.title, scenario: lessonData[l.slug].scenario }))
    .filter((i) => i.scenario.title !== "TODO");
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Real-world scenarios</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every lesson ends with a problem that happened to someone. Read the symptoms, take the hints one at a time, then
        reveal the root cause and compare it with your diagnosis.
      </p>
      <div className="mt-8">
        <ScenarioBrowser items={items} />
      </div>
    </Container>
  );
}
