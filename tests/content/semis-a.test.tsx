import type { ComponentType } from "react";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import type { LessonData } from "@/lib/curriculum";
import AtomsToBands from "@/content/semiconductors/atoms-to-bands";
import atomsToBandsData from "@/content/semiconductors/atoms-to-bands.data";
import DopingAndCarriers from "@/content/semiconductors/doping-and-carriers";
import dopingAndCarriersData from "@/content/semiconductors/doping-and-carriers.data";
import PnJunction from "@/content/semiconductors/pn-junction-and-diodes";
import pnJunctionData from "@/content/semiconductors/pn-junction-and-diodes.data";
import Transistors from "@/content/semiconductors/transistors-bjt-mosfet";
import transistorsData from "@/content/semiconductors/transistors-bjt-mosfet.data";
import CmosLogic from "@/content/semiconductors/cmos-logic-and-chips";
import cmosLogicData from "@/content/semiconductors/cmos-logic-and-chips.data";
import { BandDiagram, BAND_MATERIALS, intrinsicDensity } from "@/components/viz/semiconductors/BandDiagram";
import { DopingLattice, carrierDensities } from "@/components/viz/semiconductors/DopingLattice";
import { PNJunction, DIODES, diodeOperatingPoint, depletionWidthUm } from "@/components/viz/semiconductors/PNJunction";
import { MosfetCrossSection, mosfetRegion, drainCurrent } from "@/components/viz/semiconductors/MosfetCrossSection";
import { CmosInverter, dynamicPower, gateOutput } from "@/components/viz/semiconductors/CmosInverter";

afterEach(cleanup);

const lessons: Array<{ slug: string; Lesson: ComponentType; data: LessonData }> = [
  { slug: "atoms-to-bands", Lesson: AtomsToBands, data: atomsToBandsData },
  { slug: "doping-and-carriers", Lesson: DopingAndCarriers, data: dopingAndCarriersData },
  { slug: "pn-junction-and-diodes", Lesson: PnJunction, data: pnJunctionData },
  { slug: "transistors-bjt-mosfet", Lesson: Transistors, data: transistorsData },
  { slug: "cmos-logic-and-chips", Lesson: CmosLogic, data: cmosLogicData },
];

/** Prose words in #theory: text nodes joined with spaces, without the heading, figures and SVG labels. */
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

/** Rough sentence count: a period, question or exclamation mark followed by whitespace or the end. */
function sentences(text: string): number {
  return text.split(/[.!?](?:\s+|$)/).filter((s) => s.trim().length > 0).length;
}

describe.each(lessons)("$slug", ({ slug, Lesson, data }) => {
  it("renders theory, viz and practice sections", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory")).not.toBeNull();
    expect(container.querySelector("#viz")).not.toBeNull();
    expect(container.querySelector("#practice")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has a static figure in the theory and an interactive SVG with real controls in the viz", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory figure svg")).not.toBeNull();
    expect(container.querySelector("#viz svg")).not.toBeNull();
    const controls = container.querySelectorAll('#viz input[type="range"], #viz [role="radiogroup"], #viz [role="switch"]');
    expect(controls.length).toBeGreaterThan(0);
  });

  it("has 700-1200 words of theory", () => {
    const { container } = render(<Lesson />);
    const words = theoryWords(container);
    // SEMIS_A_WORDS=1 npx vitest run tests/content/semis-a.test.tsx prints the counts for the task report
    if (process.env.SEMIS_A_WORDS) console.log(`theory words ${slug}: ${words}`);
    expect(words).toBeGreaterThanOrEqual(700);
    expect(words).toBeLessThanOrEqual(1200);
  });

  it("has a practice exercise with a worked answer", () => {
    const { container } = render(<Lesson />);
    const practice = container.querySelector("#practice");
    expect(practice?.textContent ?? "").toMatch(/Answer/);
  });

  it("has complete lesson data", () => {
    expect(data.keyTerms.length).toBeGreaterThanOrEqual(5);
    expect(new Set(data.keyTerms.map((k) => k.term)).size).toBe(data.keyTerms.length);
    for (const k of data.keyTerms) expect(k.def.length).toBeGreaterThan(20);

    const s = data.scenario;
    for (const field of [s.title, s.context, s.rootCause, s.fix, s.lesson]) {
      expect(field.length).toBeGreaterThan(10);
      expect(field).not.toBe("TODO");
    }
    expect(s.symptoms.length).toBeGreaterThanOrEqual(2);
    expect(s.hints.length).toBeGreaterThanOrEqual(2);

    expect(data.interview.length).toBeGreaterThanOrEqual(4);
    expect(data.interview.some((q) => q.level === "deep")).toBe(true);
    for (const q of data.interview) {
      const n = sentences(q.a);
      expect(n, q.q).toBeGreaterThanOrEqual(3);
      expect(n, q.q).toBeLessThanOrEqual(6);
    }

    expect(data.quiz.length).toBeGreaterThanOrEqual(5);
    for (const q of data.quiz) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size, q.q).toBe(4);
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(40);
    }
    // the right answer is not always in the same slot
    expect(new Set(data.quiz.map((q) => q.answer)).size).toBeGreaterThan(1);
  });
});

describe("BandDiagram", () => {
  it("computes n_i from the band gap with the T^1.5 · exp(-Eg/2kT) law", () => {
    const si = BAND_MATERIALS.si;
    expect(intrinsicDensity(si, 300)).toBeCloseTo(1e10, -6);
    const ratio = intrinsicDensity(si, 400) / intrinsicDensity(si, 300);
    expect(ratio).toBeGreaterThan(300);
    expect(ratio).toBeLessThan(400);
    expect(intrinsicDensity(si, 0)).toBe(0);
    expect(intrinsicDensity(BAND_MATERIALS.sic, 300)).toBeLessThan(intrinsicDensity(BAND_MATERIALS.gaas, 300));
  });

  it("updates the readouts when the material and temperature change", () => {
    const { container } = render(<BandDiagram />);
    expect(screen.getByText("1.0 × 10¹⁰ cm⁻³")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "SiC" }));
    expect(screen.getByText("1.0 × 10⁻⁸ cm⁻³")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: /temperature/i }), { target: { value: "600" } });
    expect(screen.getByText("1.4 × 10⁶ cm⁻³")).toBeTruthy();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("DopingLattice", () => {
  it("applies the mass-action law n·p = n_i²", () => {
    const n = carrierDensities("n", 1e16);
    expect(n.n).toBeCloseTo(1e16, -10);
    expect(n.p).toBeCloseTo(1e4, 0);
    const p = carrierDensities("p", 1e17);
    expect(p.n).toBeCloseTo(1e3, 0);
    const i = carrierDensities("intrinsic", 1e16);
    expect(i.n).toBe(1e10);
    expect(i.p).toBe(1e10);
  });

  it("switches between n-type, p-type and intrinsic and toggles the field", () => {
    render(<DopingLattice />);
    // default: n-type at 1e16 cm^-3
    expect(screen.getAllByText("1.0 × 10¹⁶ cm⁻³").length).toBeGreaterThan(0);
    expect(screen.getByText("1.0 × 10⁴ cm⁻³")).toBeTruthy();
    expect(screen.getByText("0.533 Ω·cm")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "p-type" }));
    expect(screen.getByText("1.52 Ω·cm")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Intrinsic" }));
    expect(screen.getAllByText("1.0 × 10¹⁰ cm⁻³").length).toBe(2);

    const field = screen.getByRole("switch", { name: /electric field/i });
    expect(field.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(field);
    expect(field.getAttribute("aria-checked")).toBe("true");
  });

  it("raises conductivity with doping", () => {
    render(<DopingLattice />);
    fireEvent.change(screen.getByRole("slider", { name: /doping/i }), { target: { value: "19" } });
    expect(screen.getByText("1.0 × 10¹⁹ cm⁻³", { selector: "dd" })).toBeTruthy();
  });
});

describe("PNJunction", () => {
  it("solves the Shockley equation with series resistance", () => {
    const si = DIODES.si;
    const at07 = diodeOperatingPoint(si, 0.7);
    expect(at07.current).toBeGreaterThan(3e-3);
    expect(at07.current).toBeLessThan(5e-3);
    expect(diodeOperatingPoint(si, 0).current).toBe(0);
    expect(diodeOperatingPoint(si, -5).current).toBeCloseTo(-1e-14, 20);
    // a Schottky conducts milliamps at a voltage where silicon conducts nanoamps
    expect(diodeOperatingPoint(DIODES.schottky, 0.3).current).toBeGreaterThan(1e-2);
    expect(diodeOperatingPoint(si, 0.3).current).toBeLessThan(1e-8);
  });

  it("widens the depletion region as sqrt(V_bi - V)", () => {
    const w0 = depletionWidthUm(DIODES.si, 0);
    const w5 = depletionWidthUm(DIODES.si, -5);
    expect(w0).toBeCloseTo(0.59, 2);
    expect(w5 / w0).toBeCloseTo(Math.sqrt((DIODES.si.vbi + 5) / DIODES.si.vbi), 6);
  });

  it("updates current, depletion width and state with bias and diode type", () => {
    render(<PNJunction />);
    const bias = screen.getByRole("slider", { name: /bias/i });
    expect(screen.getByText("0 A")).toBeTruthy();
    expect(screen.getByText("0.59 µm")).toBeTruthy();

    fireEvent.change(bias, { target: { value: "-5" } });
    expect(screen.getByText("1.71 µm")).toBeTruthy();
    expect(screen.getByText(/reverse/i, { selector: "dd" })).toBeTruthy();

    fireEvent.change(bias, { target: { value: "0.3" } });
    expect(screen.getByText(/nA$/, { selector: "dd" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Schottky" }));
    expect(screen.getByText(/mA$/, { selector: "dd" })).toBeTruthy();
  });
});

describe("MosfetCrossSection", () => {
  it("uses the square law with Vth = 1.5 V", () => {
    expect(mosfetRegion(1, 3)).toBe("cutoff");
    expect(mosfetRegion(5, 0.5)).toBe("triode");
    expect(mosfetRegion(3, 2)).toBe("saturation");
    // saturation: ½·k·Vov²·(1 + λVds) with k = 2 mA/V², λ = 0.04 /V
    expect(drainCurrent(3, 2)).toBeCloseTo(0.5 * 2e-3 * 1.5 ** 2 * 1.08, 9);
    // triode and saturation meet at Vds = Vov
    expect(drainCurrent(4, 2.5 - 1e-9)).toBeCloseTo(drainCurrent(4, 2.5 + 1e-9), 8);
    expect(drainCurrent(1, 5)).toBeLessThan(1e-9);
    expect(drainCurrent(3, 0)).toBe(0);
  });

  it("labels the region and current as the sliders move", () => {
    render(<MosfetCrossSection />);
    expect(screen.getByText("Saturation", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("2.43 mA")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: /gate voltage/i }), { target: { value: "1" } });
    expect(screen.getByText("Cutoff", { selector: "dd" })).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: /gate voltage/i }), { target: { value: "5" } });
    fireEvent.change(screen.getByRole("slider", { name: /drain voltage/i }), { target: { value: "0.5" } });
    expect(screen.getByText("Triode (linear)", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("143 Ω")).toBeTruthy();
  });
});

describe("CmosInverter", () => {
  it("computes logic and dynamic power", () => {
    expect(gateOutput("inv", false, false)).toBe(true);
    expect(gateOutput("inv", true, false)).toBe(false);
    expect(gateOutput("nand", true, false)).toBe(true);
    expect(gateOutput("nand", true, true)).toBe(false);
    // P = αCV²f with α = 0.1 and C = 1 nF: 0.3 W at 1 V and 3 GHz
    expect(dynamicPower(1, 3e9)).toBeCloseTo(0.3, 10);
    expect(dynamicPower(1.1, 3e9) / dynamicPower(1, 3e9)).toBeCloseTo(1.21, 10);
  });

  it("flips the output when the input toggles and only draws charge when the output switches", () => {
    render(<CmosInverter />);
    expect(screen.getByText("1 (pulled up to VDD)")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: /input a/i }));
    expect(screen.getByText("0 (pulled down to GND)")).toBeTruthy();
    expect(screen.getByText(/output fell/i, { selector: "dd" })).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "NAND" }));
    // A is still 1, B is 0: NAND output is 1
    expect(screen.getByText("1 (pulled up to VDD)")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: /input b/i }));
    expect(screen.getByText("0 (pulled down to GND)")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: /input a/i }));
    expect(screen.getByText(/output rose/i, { selector: "dd" })).toBeTruthy();
    // with A = 0 the output stays 1 whatever B does, so no charge moves
    fireEvent.click(screen.getByRole("switch", { name: /input b/i }));
    expect(screen.getByText(/unchanged/i, { selector: "dd" })).toBeTruthy();
  });

  it("scales the power bar with V² and f", () => {
    render(<CmosInverter />);
    expect(screen.getByText("0.30 W")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: /supply/i }), { target: { value: "1.1" } });
    expect(screen.getByText("0.36 W")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: /clock/i }), { target: { value: "1.5" } });
    expect(screen.getByText("0.18 W")).toBeTruthy();
  });
});
