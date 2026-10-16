import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ProgressProvider, useProgress, PROGRESS_KEY } from "@/lib/progress";

const wrapper = ({ children }: { children: ReactNode }) => <ProgressProvider>{children}</ProgressProvider>;

describe("useProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("marks lessons complete, persists, and unmarks", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.markComplete("a"));
    expect(typeof result.current.state.completed.a).toBe("string");
    expect(localStorage.getItem(PROGRESS_KEY)).toContain('"a"');
    act(() => result.current.unmark("a"));
    expect(result.current.state.completed.a).toBeUndefined();
  });

  it("records quiz scores and labs", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.recordQuiz("b", 4, 5));
    act(() => result.current.markLab("pid"));
    expect(result.current.state.quiz.b.score).toBe(4);
    expect(result.current.state.quiz.b.total).toBe(5);
    expect(typeof result.current.state.labs.pid).toBe("string");
  });

  it("imports valid JSON and rejects invalid JSON", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    let ok = true;
    act(() => {
      ok = result.current.importJson("{bad");
    });
    expect(ok).toBe(false);
    act(() => {
      ok = result.current.importJson(JSON.stringify({ completed: { x: "2026-01-01T00:00:00.000Z" }, quiz: {}, labs: {} }));
    });
    expect(ok).toBe(true);
    expect(result.current.state.completed.x).toBe("2026-01-01T00:00:00.000Z");
    expect(JSON.parse(result.current.exportJson()).completed.x).toBe("2026-01-01T00:00:00.000Z");
  });

  it("loads existing storage on mount and resets", async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: { z: "2026-01-01T00:00:00.000Z" }, quiz: {}, labs: {} }));
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.state.completed.z).toBeDefined();
    act(() => result.current.reset());
    expect(result.current.state.completed.z).toBeUndefined();
  });

  it("works without a provider as a no-op", () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.state.completed).toEqual({});
    expect(() => result.current.markComplete("q")).not.toThrow();
  });
});
