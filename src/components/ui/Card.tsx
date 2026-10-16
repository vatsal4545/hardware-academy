import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** accent colour for the top border */
  accent?: string;
  padded?: boolean;
}

export function Card({ accent, padded = true, className, style, children, ...rest }: CardProps) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-surface", accent && "border-t-2", padded && "p-5", className)}
      style={accent ? { ...style, borderTopColor: accent } : style}
      {...rest}
    >
      {children}
    </div>
  );
}
