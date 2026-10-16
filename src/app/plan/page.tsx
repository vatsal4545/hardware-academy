import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PlanBoard } from "./PlanBoard";

export const metadata: Metadata = { title: "14-day plan" };

export default function PlanPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">The 14-day plan</h1>
      <p className="mt-2 max-w-2xl text-muted">
        About three hours a day. Tick lessons off here or on the lesson page; labs tick themselves when you hit their goal.
      </p>
      <div className="mt-8">
        <PlanBoard />
      </div>
    </Container>
  );
}
