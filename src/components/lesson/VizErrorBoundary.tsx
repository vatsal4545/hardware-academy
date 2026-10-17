"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Keeps one broken visualization from taking down the whole lesson page. */
export class VizErrorBoundary extends Component<{ title: string; children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof console !== "undefined") console.error(`Visualization "${this.props.title}" failed`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm">
          <p className="font-semibold">This visualization hit an error and stopped.</p>
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
