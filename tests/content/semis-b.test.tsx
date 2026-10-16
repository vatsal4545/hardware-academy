import type { ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LessonData } from "@/lib/curriculum";
import WaferFabrication from "@/content/semiconductors/wafer-fabrication";
import waferFabricationData from "@/content/semiconductors/wafer-fabrication.data";
import PackagingAndTesting from "@/content/semiconductors/packaging-and-testing";
import packagingAndTestingData from "@/content/semiconductors/packaging-and-testing.data";
import PowerSemiconductors from "@/content/semiconductors/power-semiconductors";
import powerSemiconductorsData from "@/content/semiconductors/power-semiconductors.data";
import IndustryAndRoles from "@/content/semiconductors/semiconductor-industry-and-roles";
import industryAndRolesData from "@/content/semiconductors/semiconductor-industry-and-roles.data";
import { FabProcessStepper } from "@/components/viz/semiconductors/FabProcessStepper";
import { PackageExploded } from "@/components/viz/semiconductors/PackageExploded";
import { SwitchingLossCompare } from "@/components/viz/semiconductors/SwitchingLossCompare";
import { IndustryMap } from "@/components/viz/semiconductors/IndustryMap";

afterEach(cleanup);

const lessons: Array<{ slug: string; Lesson: ComponentType; data: LessonData }> = [
  { slug: "wafer-fabrication", Lesson: WaferFabrication, data: waferFabricationData },
  { slug: "packaging-and-testing", Lesson: PackagingAndTesting, data: packagingAndTestingData },
  { slug: "power-semiconductors", Lesson: PowerSemiconductors, data: powerSemiconductorsData },
  { slug: "semiconductor-industry-and-roles", Lesson: IndustryAndRoles, data: industryAndRolesData },
];

/** Words of theory text: everything in #theory except the section heading, figures and SVG labels. */
function theoryWords(container: HTMLElement): number {
  const theory = container.querySelector("#theory");
  if (!theory) return 0;
  const copy = theory.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("h2, figure, svg").forEach((n) => n.remove());
  const parts: string[] = [];
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.textContent ?? "");
  return parts
    .join(" ")
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

describe.each(lessons)("$slug", ({ Lesson, data }) => {
  it("renders theory, viz and practice sections", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory")).not.toBeNull();
    expect(container.querySelector("#viz")).not.toBeNull();
    expect(container.querySelector("#practice")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has a static figure in the theory and an interactive visualization with controls", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory figure svg")).not.toBeNull();
    expect(container.querySelector("#viz svg")).not.toBeNull();
    const controls = container.querySelectorAll(
      '#viz input[type="range"], #viz [role="radiogroup"], #viz [role="switch"], #viz button',
    );
    expect(controls.length).toBeGreaterThan(0);
    expect(container.querySelector("#practice pre")).not.toBeNull();
  });

  it("has 700-1200 words of theory", () => {
    const { container } = render(<Lesson />);
    const words = theoryWords(container);
    expect(words).toBeGreaterThanOrEqual(700);
    expect(words).toBeLessThanOrEqual(1200);
  });

  it("has complete lesson data", () => {
    expect(data.keyTerms.length).toBeGreaterThanOrEqual(5);
    expect(data.interview.length).toBeGreaterThanOrEqual(4);
    expect(data.interview.some((q) => q.level === "deep")).toBe(true);
    expect(data.quiz.length).toBeGreaterThanOrEqual(5);
    for (const q of data.quiz) {
      expect(q.choices).toHaveLength(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(10);
    }
    const s = data.scenario;
    for (const field of [s.title, s.context, s.rootCause, s.fix, s.lesson]) {
      expect(field.length).toBeGreaterThan(10);
      expect(field).not.toBe("TODO");
    }
    expect(s.symptoms.length).toBeGreaterThanOrEqual(2);
    expect(s.hints.length).toBeGreaterThanOrEqual(2);
  });
});

describe("FabProcessStepper", () => {
  it("walks through the nine process steps", () => {
    render(<FabProcessStepper />);
    expect(screen.getByText("Step 1 / 9")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 / 9")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /go to step 9/i }));
    expect(screen.getByText("Step 9 / 9")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /metal/i })).toBeTruthy();
  });
});

describe("PackageExploded", () => {
  it("shows the SVG cross-section without WebGL and never mounts a canvas", () => {
    const { container } = render(<PackageExploded />);
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getAllByText(/solder balls/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("radio", { name: /qfn/i }));
    expect(screen.getAllByText(/bond wires/i).length).toBeGreaterThan(0);
    const slider = screen.getByRole("slider", { name: /explode/i }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0" } });
    expect(slider.value).toBe("0");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("keeps the SVG and leaves 3D opt-in under reduced motion, even when WebGL exists", () => {
    const w = window as unknown as Record<string, unknown>;
    const originalMatchMedia = window.matchMedia;
    w.WebGLRenderingContext = function WebGLRenderingContext() {};
    window.matchMedia = ((q: string) => ({
      ...originalMatchMedia(q),
      matches: q.includes("prefers-reduced-motion"),
    })) as typeof window.matchMedia;
    try {
      const { container } = render(<PackageExploded />);
      const toggle = screen.getByRole("switch", { name: /3d view/i });
      expect(toggle.getAttribute("aria-checked")).toBe("false");
      expect(container.querySelector("svg")).not.toBeNull();
      expect(container.querySelector("canvas")).toBeNull();
    } finally {
      window.matchMedia = originalMatchMedia;
      delete w.WebGLRenderingContext;
    }
  });
});

describe("SwitchingLossCompare", () => {
  it("matches the hand calculation and responds to frequency and temperature", () => {
    render(<SwitchingLossCompare />);
    expect(screen.getByTestId("sic-cond").textContent).toBe("100 W");
    expect(screen.getByTestId("sic-sw").textContent).toBe("10 W");
    fireEvent.change(screen.getByRole("slider", { name: /frequency/i }), { target: { value: "50" } });
    expect(screen.getByTestId("sic-sw").textContent).toBe("50 W");
    expect(screen.getByTestId("igbt-sw").textContent).toBe("250 W");
    fireEvent.change(screen.getByRole("slider", { name: /temperature/i }), { target: { value: "150" } });
    expect(screen.getByTestId("sic-rds").textContent).toMatch(/14\.0 mΩ/);
    expect(screen.getByTestId("sic-cond").textContent).toBe("140 W");
  });
});

describe("IndustryMap", () => {
  it("reveals companies for a clicked node", () => {
    render(<IndustryMap />);
    fireEvent.click(screen.getByRole("button", { name: /^foundry/i }));
    expect(screen.getAllByText(/TSMC/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^osat/i }));
    expect(screen.getAllByText(/Amkor/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/interview/i).length).toBeGreaterThan(0);
  });

  it("starts the trace-a-chip animation on demand", () => {
    render(<IndustryMap />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
});
