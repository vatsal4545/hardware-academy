"use client";

/** A client component can throw anything, not only an Error, so read the message defensively. */
function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message) {
    return error.message;
  }
  return "Unknown error";
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0b0f17", color: "#e5e7eb", fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Hardware Academy could not load</h1>
        <p style={{ color: "#9ca3af", marginTop: "0.75rem" }}>{errorMessage(error)}</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: "1.5rem", padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "#e5e7eb", color: "#0b0f17", fontWeight: 600 }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
