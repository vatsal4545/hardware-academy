import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, act, cleanup } from "@testing-library/react";
import { LESSON_PARTS, LessonHeader, OnThisPage, Remember } from "@/components/lesson";
import { lessonBySlug, trackById } from "@/lib/curriculum";
import { lessonFixture } from "../helpers/fixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Remember", () => {
  it("lists takeaways and formulas and folds the key terms away", () => {
    const { container } = render(
      <Remember
        takeaways={["One.", "Two.", "Three."]}
        formulas={[{ expr: "V = I × R", parts: [{ symbol: "V", meaning: "voltage" }] }]}
        keyTerms={lessonFixture().keyTerms}
      />,
    );
    expect(screen.getByRole("heading", { name: "Remember this" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["One.", "Two.", "Three."]);
    expect(screen.getByText("V = I × R")).toBeTruthy();
    const terms = container.querySelector("#remember details[data-deeper]") as HTMLDetailsElement;
    expect(terms.open).toBe(false);
    expect(screen.getByText("All key terms (2)")).toBeTruthy();
    expect(terms.textContent).toContain("The empty spot an electron leaves behind when it jumps up.");
  });
});

describe("LessonHeader", () => {
  it("shows the title and objectives and links to the six learning parts", () => {
    const meta = lessonBySlug("atoms-to-bands")!;
    render(<LessonHeader meta={meta} track={trackById("semiconductors")} />);
    expect(screen.getByRole("heading", { level: 1, name: meta.title })).toBeTruthy();
    for (const o of meta.objectives) expect(screen.getByText(o)).toBeTruthy();
    const links = within(screen.getByRole("navigation", { name: "Lesson parts" })).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#big-idea", "#theory", "#viz", "#practice", "#remember", "#quiz"]);
  });
});

describe("OnThisPage", () => {
  it("links every part and marks the first as current before any scrolling", () => {
    render(<OnThisPage />);
    const links = within(screen.getByRole("navigation", { name: "On this page" })).getAllByRole("link");
    expect(links).toHaveLength(LESSON_PARTS.length);
    expect(links[0].getAttribute("aria-current")).toBe("location");
    expect(links.slice(1).every((a) => !a.hasAttribute("aria-current"))).toBe(true);
  });

  it("marks the part the observer reports as on screen", () => {
    let report: IntersectionObserverCallback = () => {};
    class FakeObserver {
      constructor(callback: IntersectionObserverCallback) {
        report = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(
      <>
        <section id="big-idea" />
        <section id="theory" />
        <OnThisPage />
      </>,
    );
    act(() =>
      report(
        [{ target: document.getElementById("theory")!, isIntersecting: true } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(screen.getByRole("link", { name: /Build it up/ }).getAttribute("aria-current")).toBe("location");
    expect(screen.getByRole("link", { name: /Big idea/ }).hasAttribute("aria-current")).toBe(false);
  });
});
