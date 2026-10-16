import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { TrackCards } from "@/components/ui/TrackCards";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Tracks</h1>
      <p className="mt-2 max-w-2xl text-muted">Five tracks, 37 lessons. Each track page lists its lessons by day.</p>
      <div className="mt-8">
        <TrackCards />
      </div>
    </Container>
  );
}
