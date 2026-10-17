"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/** Keeps one broken visualization (or one broken part of a section) from taking down the whole lesson page. */
export class VizErrorBoundary extends Component<{ title: string; what?: string; children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: asError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (typeof console !== "undefined") console.error(`"${this.props.title}" failed`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm">
          <p className="font-semibold">This {this.props.what ?? "visualization"} hit an error and stopped.</p>
          <p className="mt-1 text-muted">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
