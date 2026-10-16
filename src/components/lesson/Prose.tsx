import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Typography wrapper for lesson text: paragraphs, lists, tables, inline code. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("prose-ha", className)}>{children}</div>;
}
