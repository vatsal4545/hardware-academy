"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/** A client component can throw anything, not only an Error, so read the message defensively. */
function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message) {
    return error.message;
  }
  return "Unknown error";
}

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-20 text-center">
      <p className="font-mono text-sm text-muted">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">This page hit an error</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted">{errorMessage(error)}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
}
