import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Section({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={cn("scroll-mt-20 space-y-5", className)}>
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}
