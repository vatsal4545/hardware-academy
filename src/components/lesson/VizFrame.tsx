import type { ReactNode } from "react";
import { VizErrorBoundary } from "./VizErrorBoundary";

export function VizFrame({
  title,
  description,
  controls,
  children,
  footer,
}: {
  title: string;
  description?: string;
  controls?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <div className="p-4">
        <VizErrorBoundary title={title}>{children}</VizErrorBoundary>
      </div>
      {controls && (
        <div className="grid gap-x-6 gap-y-3 border-t border-border bg-surface-2/40 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
          {controls}
        </div>
      )}
      {footer && <div className="border-t border-border px-4 py-3 text-sm text-muted">{footer}</div>}
    </div>
  );
}
