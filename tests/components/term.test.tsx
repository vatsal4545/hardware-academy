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
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on keyboard focus with the plain definition first and the technical one under it", () => {
    renderTerm("Hole");
    const button = screen.getByRole("button", { name: "hole" });
    fireEvent.focusIn(button);
    const tip = screen.getByRole("tooltip");
    expect(button.getAttribute("aria-describedby")).toBe(tip.id);
    expect(tip.textContent).toContain("The empty spot an electron leaves behind when it jumps up.");
    expect(tip.textContent).toContain("The empty state an excited electron leaves in the valence band.");
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
    renderTerm("Electron");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("An electron leaves a hole behind.")).toBeTruthy();
    expect(error).toHaveBeenCalledWith('Term: no key term "Electron" in this lesson\'s data');
    error.mockRestore();
  });
});
