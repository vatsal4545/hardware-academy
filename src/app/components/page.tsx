import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { EncyclopediaBrowser } from "@/components/encyclopedia/EncyclopediaBrowser";

export const metadata: Metadata = { title: "Component encyclopedia" };

export default function ComponentsPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Component encyclopedia</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every component you will meet on a board, in a robot or in an EV drive unit: what it looks like, how it works,
        where it is used, its key specs, how it fails, and what an interviewer asks about it.
      </p>
      <div className="mt-8">
        <EncyclopediaBrowser />
      </div>
    </Container>
  );
}
