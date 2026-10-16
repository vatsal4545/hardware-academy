import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { LabList } from "./LabList";

export const metadata: Metadata = { title: "Labs" };

export default function LabsPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Labs</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Hands-on tools that run in the browser. A lab marks itself done on the plan when you hit its goal.
      </p>
      <div className="mt-8">
        <LabList />
      </div>
    </Container>
  );
}
