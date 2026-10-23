import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LessonDataProvider, Term } from "@/components/lesson";
import { lessonFixture } from "../helpers/fixtures";

afterEach(cleanup);

const renderTerm = (t: string) =>
  render(
    <LessonDataProvider data={lessonFixture()}>
      <p>
        An electron leaves a <Term t={t}>hole</Term> behind.
      </p>
    </LessonDataProvider>,
  );

describe("Term", () => {
  it("starts closed, with no tooltip in the page", () => {
    renderTerm("Hole");
    expect(screen.getByRole("button", { name: "hole" }).getAttribute("aria-expanded")).toBe("false");
    // Absent, not just hidden: the readability gate must never count a definition.
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("opens on keyboard focus with the plain definition first and the technical one under it", () => {
    renderTerm("Hole");
    const button = screen.getByRole("button", { name: "hole" });
    fireEvent.focusIn(button);
    const tip = screen.getByRole("tooltip");
    expect(button.getAttribute("aria-describedby")).toBe(tip.id);
    const text = tip.textContent ?? "";
    const plain = text.indexOf("The empty spot an electron leaves behind when it jumps up.");
    const technical = text.indexOf("The empty state an excited electron leaves in the valence band.");
    expect(plain).toBeGreaterThan(-1);
    expect(technical).toBeGreaterThan(plain);
  });

  it("closes when keyboard focus moves on", () => {
    renderTerm("Hole");
    const button = screen.getByRole("button", { name: "hole" });
    fireEvent.focusIn(button);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.focusOut(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes on Escape", () => {
    renderTerm("Hole");
    fireEvent.click(screen.getByRole("button", { name: "hole" }));
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes on a tap elsewhere", () => {
    renderTerm("Hole");
    fireEvent.click(screen.getByRole("button", { name: "hole" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("stays open while the pointer presses inside the box", () => {
    renderTerm("Hole");
    fireEvent.click(screen.getByRole("button", { name: "hole" }));
    const tip = screen.getByRole("tooltip");
    fireEvent.pointerDown(tip);
    // The press is cancelled, so focus stays on the term.
    expect(fireEvent.mouseDown(tip)).toBe(false);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("slides the box left to stay on a phone screen", () => {
    const width = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 200, top: 100 } as DOMRect);
    try {
      renderTerm("Hole");
      fireEvent.click(screen.getByRole("button", { name: "hole" }));
      // The box is 288 px wide, so it may start at most at 375 - 8 - 288 = 79 px: 121 px left of the term.
      expect(screen.getByRole("tooltip").parentElement?.style.left).toBe("-121px");
    } finally {
      rect.mockRestore();
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    }
  });

  it("shows the technical definition alone when there is no plain one", () => {
    render(
      <LessonDataProvider data={lessonFixture()}>
        <Term t="Band gap (Eg)">band gap</Term>
      </LessonDataProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "band gap" }));
    expect(screen.getByRole("tooltip").textContent).toBe(
      "Band gap (Eg)The forbidden energy range between the valence and conduction bands.",
    );
  });

  it("renders plain text and reports a term the lesson does not define", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      renderTerm("Electron");
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.getByText("An electron leaves a hole behind.")).toBeTruthy();
      expect(error).toHaveBeenCalledWith('Term: no key term "Electron" in this lesson\'s data');
    } finally {
      error.mockRestore();
    }
  });
});
