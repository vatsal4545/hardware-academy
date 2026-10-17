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

describe("useProgress across tabs and on import", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const saved = (completed: Record<string, string>) => JSON.stringify({ completed, quiz: {}, labs: {} });

  it("adopts progress written by another tab when the storage event fires", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => {
      localStorage.setItem(PROGRESS_KEY, saved({ other: "2026-01-02T00:00:00.000Z" }));
      window.dispatchEvent(new StorageEvent("storage", { key: PROGRESS_KEY, newValue: localStorage.getItem(PROGRESS_KEY) }));
    });
    expect(result.current.state.completed.other).toBe("2026-01-02T00:00:00.000Z");
  });

  it("keeps another tab's write when this tab updates afterwards", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.markComplete("mine"));
    // The other tab wrote and this tab never saw a storage event for it.
    localStorage.setItem(PROGRESS_KEY, saved({ mine: "2026-01-01T00:00:00.000Z", theirs: "2026-01-03T00:00:00.000Z" }));
    act(() => result.current.markComplete("later"));
    const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
    expect(Object.keys(stored.completed).sort()).toEqual(["later", "mine", "theirs"]);
    expect(result.current.state.completed.theirs).toBe("2026-01-03T00:00:00.000Z");
  });

  it("ignores storage events for other keys and follows a cleared store", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.markComplete("keep"));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "something-else", newValue: "x" }));
    });
    expect(result.current.state.completed.keep).toBeDefined();
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current.state.completed.keep).toBeUndefined();
  });

  it("rejects imports that are not progress and keeps what it had", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.markComplete("keep"));
    for (const bad of ["{}", '{"foo":1}', "[]", "null", '{"completed":"nope"}']) {
      let ok = true;
      act(() => {
        ok = result.current.importJson(bad);
      });
      expect(ok, `import of ${bad} should fail`).toBe(false);
    }
    expect(result.current.state.completed.keep).toBeDefined();
  });

  it("drops malformed entries on import but keeps the valid ones", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    let ok = false;
    act(() => {
      ok = result.current.importJson(
        JSON.stringify({
          completed: { good: "2026-01-01T00:00:00.000Z", bad: 5 },
          quiz: { q: { score: "x" } },
          labs: { pid: "2026-01-01T00:00:00.000Z" },
        }),
      );
    });
    expect(ok).toBe(true);
    expect(result.current.state.completed).toEqual({ good: "2026-01-01T00:00:00.000Z" });
    expect(result.current.state.quiz).toEqual({});
    expect(result.current.state.labs.pid).toBe("2026-01-01T00:00:00.000Z");
  });
});
