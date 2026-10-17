"use client";

import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/Button";

export function MarkComplete({ slug }: { slug: string }) {
  const { state, markComplete, unmark, ready } = useProgress();
  const done = Boolean(state.completed[slug]);
  return (
    <Button
      variant={done ? "secondary" : "primary"}
      disabled={!ready}
      onClick={() => (done ? unmark(slug) : markComplete(slug))}
    >
      {done ? "Completed (undo)" : "Mark lesson complete"}
    </Button>
  );
}
