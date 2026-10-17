import { Children, isValidElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { VizErrorBoundary } from "./VizErrorBoundary";

/**
 * A lesson section. Every direct child gets its own error boundary, so a visualization that throws
 * (say at an edge-case slider value) is replaced by a short notice while the rest of the section and
 * the lesson stay readable. The boundary adds no DOM, so the section's spacing is unchanged.
 */
export function Section({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={cn("scroll-mt-20 space-y-5", className)}>
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <VizErrorBoundary title={title} what="part of the section">
            {child}
          </VizErrorBoundary>
        ) : (
          child
        ),
      )}
    </section>
  );
}
