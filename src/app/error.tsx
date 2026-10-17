"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-20 text-center">
      <p className="font-mono text-sm text-muted">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">This page hit an error</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted">{error.message || "Unknown error"}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
}
