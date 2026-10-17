import type { ComponentType, ReactElement } from "react";
import { render, cleanup, fireEvent, screen, act, type RenderResult } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import type { LessonData } from "@/lib/curriculum";
import CircuitFundamentals from "@/content/pcb/circuit-fundamentals";
import circuitFundamentalsData from "@/content/pcb/circuit-fundamentals.data";
import PassiveComponents from "@/content/pcb/passive-components";
import passiveComponentsData from "@/content/pcb/passive-components.data";
import ActiveComponents from "@/content/pcb/active-components";
import activeComponentsData from "@/content/pcb/active-components.data";
import SchematicCapture from "@/content/pcb/schematic-capture";
import schematicCaptureData from "@/content/pcb/schematic-capture.data";
import PcbLayoutAndStackup from "@/content/pcb/pcb-layout-and-stackup";
import pcbLayoutAndStackupData from "@/content/pcb/pcb-layout-and-stackup.data";
import {
  DIVIDER_DOTS,
  DIVIDER_PATH_LENGTHS,
  DIVIDER_PX_PER_S_AT_REF,
  DIVIDER_REF_A,
  DIVIDER_SPEED_CAP,
  OHM_DOTS,
  OHM_LOOP_LENGTH,
  OHM_PX_PER_S_AT_REF,
  OHM_REF_A,
  OHM_SPEED_CAP,
  OhmsLawCircuit,
} from "@/components/viz/pcb/OhmsLawCircuit";
import { dotSpeed, dotSpeeds, parallel } from "@/components/viz/pcb/OhmsLawCircuit.helpers";
import { RcCharging, x7rDerating } from "@/components/viz/pcb/RcCharging";
import { BUCK_DOTS, BUCK_LOOP_LENGTHS, BUCK_SPEED_CAP, BuckConverter, buckModel, ldoModel } from "@/components/viz/pcb/BuckConverter";
import { SchematicExplorer } from "@/components/viz/pcb/SchematicExplorer";
import { PcbStackupExploded } from "@/components/viz/pcb/PcbStackupExploded";
import { TraceWidthCalculator, riseAtWidth } from "@/components/viz/pcb/TraceWidthCalculator";
import { traceWidth } from "@/lib/sim/traceWidth";

afterEach(cleanup);

const lessons: Array<{ slug: string; Lesson: ComponentType; data: LessonData }> = [
  { slug: "circuit-fundamentals", Lesson: CircuitFundamentals, data: circuitFundamentalsData },
  { slug: "passive-components", Lesson: PassiveComponents, data: passiveComponentsData },
  { slug: "active-components", Lesson: ActiveComponents, data: activeComponentsData },
  { slug: "schematic-capture", Lesson: SchematicCapture, data: schematicCaptureData },
  { slug: "pcb-layout-and-stackup", Lesson: PcbLayoutAndStackup, data: pcbLayoutAndStackupData },
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

describe.each(lessons)("$slug", ({ Lesson, data }) => {
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

/** Text of the <dd> that follows the <dt> with this exact label. */
function readout(container: HTMLElement, label: string): string {
  const dt = Array.from(container.querySelectorAll("dt")).find((n) => n.textContent === label);
  if (!dt) throw new Error(`no readout labelled "${label}"`);
  return dt.nextElementSibling?.textContent ?? "";
}

function sliders(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="range"]'));
}

describe("OhmsLawCircuit", () => {
  it("starts at 5 V across 1 kΩ: 5 mA and 25 mW", () => {
    const { container } = render(<OhmsLawCircuit />);
    expect(readout(container, "Current  I = V / R")).toBe("5 mA");
    expect(readout(container, "Power  P = V · I")).toBe("25 mW");
    expect(readout(container, "Verdict")).toBe("Comfortable");
  });

  it("flags a resistor that is pushed past its rating", () => {
    const { container } = render(<OhmsLawCircuit />);
    const [volts, resistance] = sliders(container);
    fireEvent.change(volts, { target: { value: "12" } }); // 12 V
    fireEvent.change(resistance, { target: { value: "10" } }); // E12 index 10 is 68 ohm
    expect(readout(container, "Current  I = V / R")).toBe("176 mA");
    expect(readout(container, "Verdict")).toBe("Over rating");
  });

  it("divider mode: 27 k / 10 k on 12 V gives 3.243 V, and a 100 k load pulls it to 3.023 V", () => {
    const { container } = render(<OhmsLawCircuit />);
    fireEvent.click(screen.getByRole("radio", { name: "Voltage divider" }));
    expect(readout(container, "Vout, unloaded")).toBe("3.243 V");
    expect(readout(container, "Thevenin Rth = R1 ∥ R2")).toBe("7.3 kΩ");
    expect(readout(container, "Current into load")).toBe("0 A");
    fireEvent.click(screen.getByRole("switch"));
    expect(readout(container, "Vout, as drawn")).toBe("3.023 V");
    expect(readout(container, "Loading error")).toBe("6.8%");
  });
});

describe("charge-dot speed", () => {
  // helper behaviour with round numbers: 10 mA moves the dots 920 px per second, capped at 1500 px per second
  const ohmSpeed = (i: number) => dotSpeed(i, 0.01, 920, 1500);

  it("is strictly proportional to the current on screen, in px per second, and keeps its direction", () => {
    expect(ohmSpeed(0.001)).toBeCloseTo(92, 9);
    expect(ohmSpeed(0.002)).toBeCloseTo(184, 9);
    expect(ohmSpeed(0.005)).toBeCloseTo(460, 9);
    expect(ohmSpeed(0.012) / ohmSpeed(0.001)).toBeCloseTo(12, 9); // 12 times the current is 12 times the speed
    expect(ohmSpeed(-0.005)).toBeCloseTo(-460, 9);
    expect(ohmSpeed(0)).toBe(0);
  });

  it("has a visible cap, so large currents stop looking faster instead of strobing", () => {
    expect(ohmSpeed(0.0163)).toBeCloseTo(1500, 0);
    expect(ohmSpeed(1.2)).toBe(1500);
    expect(ohmSpeed(-1.2)).toBe(-1500);
  });

  it("the real caps keep one 60 Hz frame under half the dot spacing in every drawing, so dots never seem to run backwards", () => {
    const drawings = [
      { cap: OHM_SPEED_CAP, spacings: [OHM_LOOP_LENGTH / OHM_DOTS] },
      { cap: DIVIDER_SPEED_CAP, spacings: DIVIDER_PATH_LENGTHS.map((length, k) => length / DIVIDER_DOTS[k]) },
      { cap: BUCK_SPEED_CAP, spacings: [BUCK_LOOP_LENGTHS.on / BUCK_DOTS.on, BUCK_LOOP_LENGTHS.off / BUCK_DOTS.off] },
    ];
    for (const { cap, spacings } of drawings) {
      for (const spacing of spacings) expect(cap / 60).toBeLessThan(spacing / 2);
    }
    // review N2: 14 dots on the Ohm loop flip direction above 60 / (2 x 14) = 2.14 loops per second, and the cap is at most 2
    expect(OHM_SPEED_CAP / OHM_LOOP_LENGTH).toBeLessThanOrEqual(2);
    expect(BUCK_SPEED_CAP / BUCK_LOOP_LENGTHS.on).toBeLessThan(60 / (2 * BUCK_DOTS.on));
    expect(BUCK_SPEED_CAP / BUCK_LOOP_LENGTHS.off).toBeLessThan(60 / (2 * BUCK_DOTS.off));
  });

  // 12 V across 27 k over 10 k with a 100 k load, the drawing's own numbers: the load and R2 see the same voltage, so their
  // currents are in the ratio 100 k : 10 k, and R1 carries the sum of the two, which makes 11 : 10 : 1
  const rEff = parallel(10e3, 100e3);
  const iR1 = 12 / (27e3 + rEff);
  const vOut = 12 - iR1 * 27e3;
  const dividerCurrents = [iR1, vOut / 10e3, vOut / 100e3];

  it("divider streams share one on-screen scale: px per second are the current ratios, whatever the path lengths", () => {
    const [r1, r2, load] = dotSpeeds(dividerCurrents, DIVIDER_REF_A, DIVIDER_PX_PER_S_AT_REF, DIVIDER_SPEED_CAP);
    expect(r1 / load).toBeCloseTo(11, 9);
    expect(r2 / load).toBeCloseTo(10, 9);
    expect(r1).toBeCloseTo((DIVIDER_PX_PER_S_AT_REF * iR1) / DIVIDER_REF_A, 9); // 300 uA is 124 px per second
    expect(r1).toBeLessThan(DIVIDER_SPEED_CAP);
  });

  it("keeps those ratios when the largest divider current would pass the cap", () => {
    const [a, b, c] = dotSpeeds([0.1, 0.09, 0.009], DIVIDER_REF_A, DIVIDER_PX_PER_S_AT_REF, DIVIDER_SPEED_CAP);
    expect(a).toBeCloseTo(DIVIDER_SPEED_CAP, 9);
    expect(a / c).toBeCloseTo(0.1 / 0.009, 9);
    expect(b / c).toBeCloseTo(0.09 / 0.009, 9);
  });

  it("spaces the dots about evenly on every stream, so dots per second follow the current too", () => {
    expect(DIVIDER_DOTS).toEqual([6, 6, 15]);
    const spread = (spacings: number[]) => Math.max(...spacings) / Math.min(...spacings);
    expect(spread(DIVIDER_PATH_LENGTHS.map((length, k) => length / DIVIDER_DOTS[k]))).toBeLessThan(1.06);
    // the two buck loops (the long one through the high-side switch and the short freewheeling one) share one spacing as well
    expect(spread([BUCK_LOOP_LENGTHS.on / BUCK_DOTS.on, BUCK_LOOP_LENGTHS.off / BUCK_DOTS.off])).toBeLessThan(1.06);
  });

  /** First amber dot of the first stream, before and after `ms` of animation (fake timers), as raw on-screen px. */
  async function firstDotTravel(setup: (container: HTMLElement) => void, ms: number): Promise<number> {
    vi.useFakeTimers();
    try {
      const { container, unmount } = render(<OhmsLawCircuit />);
      setup(container);
      const dot = () => {
        const c = container.querySelector('g[fill="#fbbf24"] circle');
        return { x: Number(c?.getAttribute("cx")), y: Number(c?.getAttribute("cy")) };
      };
      const before = dot();
      await act(async () => {
        vi.advanceTimersByTime(ms);
      });
      const after = dot();
      unmount();
      return Math.hypot(after.x - before.x, after.y - before.y);
    } finally {
      vi.useRealTimers();
    }
  }

  it("the animated divider streams really move in proportion to their currents, in px per second and in dots per second", async () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<OhmsLawCircuit />);
      fireEvent.click(screen.getByRole("radio", { name: "Voltage divider" }));
      fireEvent.click(screen.getByRole("switch")); // attach the 100 k load
      const streams = () => [
        container.querySelectorAll('g[fill="#fbbf24"]')[0], // R1
        container.querySelectorAll('g[fill="#fbbf24"]')[1], // R2
        container.querySelector('g[fill="#fb923c"]'), // load
      ];
      const firstDot = (g: Element | null) => {
        const c = g?.querySelector("circle");
        return { x: Number(c?.getAttribute("cx")), y: Number(c?.getAttribute("cy")) };
      };
      expect(streams().map((g) => g?.querySelectorAll("circle").length)).toEqual(DIVIDER_DOTS);
      const before = streams().map(firstDot);
      await act(async () => {
        vi.advanceTimersByTime(480);
      });
      const after = streams().map(firstDot);
      // raw displacement in px, no path-length normalisation: R1 and R2 run straight down, the load runs right first
      const moved = [after[0].y - before[0].y, after[1].y - before[1].y, after[2].x - before[2].x];
      expect(moved.every((d) => d > 0)).toBe(true);
      expect(moved[0]).toBeLessThan(DIVIDER_PATH_LENGTHS[0]); // no wrap-around hiding in the measurement
      expect(moved[0] / moved[2]).toBeGreaterThan(11 * 0.985);
      expect(moved[0] / moved[2]).toBeLessThan(11 * 1.015);
      expect(moved[1] / moved[2]).toBeGreaterThan(10 * 0.985);
      expect(moved[1] / moved[2]).toBeLessThan(10 * 1.015);
      // dots passing a point each second = displacement / dot spacing, which differs by under 5% from stream to stream
      const dotsPassed = moved.map((d, k) => d / (DIVIDER_PATH_LENGTHS[k] / DIVIDER_DOTS[k]));
      expect(dotsPassed[0] / dotsPassed[2]).toBeGreaterThan(11 * 0.94);
      expect(dotsPassed[0] / dotsPassed[2]).toBeLessThan(11 * 1.06);
      expect(dotsPassed[1] / dotsPassed[2]).toBeGreaterThan(10 * 0.94);
      expect(dotsPassed[1] / dotsPassed[2]).toBeLessThan(10 * 1.06);
    } finally {
      vi.useRealTimers();
    }
  });

  it("Ohm's-law mode: twice the current is twice the on-screen speed, and the biggest current runs at the cap, not faster", async () => {
    // the viz starts at 5 V across 1 kOhm; E12 index 0 is 10 ohm
    const at = (volts: string, rIndex?: string) => (container: HTMLElement) => {
      const [v, r] = sliders(container);
      fireEvent.change(v, { target: { value: volts } });
      if (rIndex !== undefined) fireEvent.change(r, { target: { value: rIndex } });
    };
    const fiveMilliamps = await firstDotTravel(at("5"), 160);
    const tenMilliamps = await firstDotTravel(at("10"), 160); // 10 V across 1 kOhm
    expect(fiveMilliamps).toBeCloseTo((OHM_PX_PER_S_AT_REF * 0.005) / OHM_REF_A * 0.16, 0);
    expect(tenMilliamps / fiveMilliamps).toBeGreaterThan(2 * 0.98);
    expect(tenMilliamps / fiveMilliamps).toBeLessThan(2 * 1.02);
    // 12 V across 10 ohm is 1.2 A, far past the cap: the dots run at the cap, so one frame still moves under half a spacing
    const frame = await firstDotTravel(at("12", "0"), 16);
    expect(frame).toBeGreaterThan(0);
    expect(frame).toBeLessThan(OHM_LOOP_LENGTH / OHM_DOTS / 2);
    const capped = await firstDotTravel(at("12", "0"), 160);
    expect(capped).toBeCloseTo(OHM_SPEED_CAP * 0.16, 0);
  });
});

describe("RcCharging", () => {
  it("defaults to 100 kΩ and 10 µF: τ = 1 s, 5τ = 5 s, 63.2% reached at 1 s", () => {
    const { container } = render(<RcCharging />);
    expect(readout(container, "Time constant τ = R · C")).toBe("1 s");
    expect(readout(container, "5τ (99.3% settled)")).toBe("5 s");
    expect(readout(container, "Time to 63.2% of the step")).toBe("1 s");
    expect(readout(container, "Capacitance now")).toBe("10 µF (100%)");
  });

  it("ten times the capacitance gives ten times the time constant", () => {
    const { container } = render(<RcCharging />);
    const [, cap] = sliders(container);
    fireEvent.change(cap, { target: { value: String(Number(cap.value) + 12) } }); // E12: twelve steps per decade
    expect(readout(container, "Time constant τ = R · C")).toBe("10 s");
    expect(readout(container, "5τ (99.3% settled)")).toBe("50 s");
  });

  it("X7R derating makes the real capacitor smaller, so 63.2% arrives before τ", () => {
    const { container } = render(<RcCharging />);
    const [, derate] = screen.getAllByRole("switch");
    fireEvent.click(derate);
    expect(readout(container, "Time constant τ = R · C")).toBe("1 s");
    expect(readout(container, "Time to 63.2% of the step")).toBe("871 ms");
    fireEvent.click(screen.getByRole("radio", { name: "6.3 V" }));
    expect(readout(container, "Time to 63.2% of the step")).toBe("780 ms");
  });

  it("shows the capacitance-versus-bias plot only while derating is on, and follows the voltage rating", () => {
    const { container } = render(<RcCharging />);
    expect(container.textContent).not.toContain("Capacitance vs DC bias");
    fireEvent.click(screen.getAllByRole("switch")[1]);
    expect(container.textContent).toContain("Capacitance vs DC bias (X7R, 10 V rated)");
    fireEvent.click(screen.getByRole("radio", { name: "25 V" }));
    expect(container.textContent).toContain("Capacitance vs DC bias (X7R, 25 V rated)");
  });

  it("the derating curve matches the figures quoted in the lesson", () => {
    expect(x7rDerating(0)).toBe(1);
    expect(x7rDerating(0.25)).toBeCloseTo(0.82, 2);
    expect(x7rDerating(0.5)).toBeCloseTo(0.61, 2);
    expect(x7rDerating(1)).toBeCloseTo(0.36, 2);
  });
});

describe("BuckConverter", () => {
  const base = { vin: 12, duty: 0.275, loadA: 0.5, lUh: 22, fKhz: 500 };

  it("model: 12 V to 3.3 V at 0.5 A is about 90% efficient and wastes about 0.2 W, where an LDO wastes 4.35 W", () => {
    const buck = buckModel(base);
    expect(buck.vout).toBeCloseTo(3.3, 6);
    expect(buck.rippleA).toBeCloseTo(0.2175, 4);
    expect(buck.rippleV * 1e3).toBeCloseTo(2.47, 1);
    expect(buck.loss.total).toBeGreaterThan(0.17);
    expect(buck.loss.total).toBeLessThan(0.21);
    expect(buck.efficiency).toBeGreaterThan(0.88);
    expect(buck.efficiency).toBeLessThan(0.92);
    const ldo = ldoModel(12, buck.vout, 0.5);
    expect(ldo.loss).toBeCloseTo(4.35, 6);
    expect(ldo.efficiency).toBeCloseTo(0.275, 6);
    expect(ldo.junctionRise).toBeCloseTo(261, 0);
  });

  it("model: a higher switching frequency shrinks the ripple but costs efficiency", () => {
    const slow = buckModel(base);
    const fast = buckModel({ ...base, fKhz: 2000 });
    expect(fast.rippleA).toBeLessThan(slow.rippleA / 3);
    expect(fast.efficiency).toBeLessThan(slow.efficiency - 0.1);
  });

  it("model: at light load with a small inductor the current goes negative (forced PWM)", () => {
    const m = buckModel({ ...base, loadA: 0.05, lUh: 10 });
    expect(m.iMin).toBeLessThan(0);
  });

  it("shows the lesson numbers at the defaults", () => {
    const { container } = render(<BuckConverter />);
    expect(readout(container, "Output voltage D · Vin")).toBe("3.30 V");
    expect(readout(container, "Inductor ripple ΔIL")).toBe("0.218 A");
    expect(readout(container, "LDO junction rise")).toBe("+261 °C");
    expect(readout(container, "LDO verdict")).toBe("Thermal shutdown");
    expect(container.textContent).toContain("4.35 W");
  });

  it("the duty slider sets Vout = D · Vin, and 95% leaves the LDO in dropout", () => {
    const { container } = render(<BuckConverter />);
    const [duty] = sliders(container);
    fireEvent.change(duty, { target: { value: "50" } });
    expect(readout(container, "Output voltage D · Vin")).toBe("6.00 V");
    fireEvent.change(duty, { target: { value: "95" } });
    expect(readout(container, "Output voltage D · Vin")).toBe("11.40 V");
    expect(readout(container, "LDO verdict")).toBe("In dropout");
  });
});

describe("SchematicExplorer", () => {
  it("lists the nets as buttons, and there is no net for the floating STBY pin", () => {
    render(<SchematicExplorer />);
    for (const n of ["VBAT", "3V3", "GND", "EN", "PWMA", "AIN1", "AIN2", "BIN1", "BIN2", "PWMB", "AO1", "AO2", "BO1", "BO2"]) {
      expect(screen.getByRole("button", { name: n })).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: "STBY" })).toBeNull();
  });

  it("selecting a net lists every pin on it, and PGND2 is not among the GND pins", () => {
    const { container } = render(<SchematicExplorer />);
    const gnd = screen.getByRole("button", { name: "GND" });
    fireEvent.click(gnd);
    expect(gnd.getAttribute("aria-pressed")).toBe("true");
    const text = container.textContent ?? "";
    expect(text).toContain("U3.PGND1");
    expect(text).toContain("J1.2");
    expect(text).not.toContain("PGND2,");
    fireEvent.click(gnd);
    expect(gnd.getAttribute("aria-pressed")).toBe("false");
  });

  it("the EN net has a switch and a capacitor but no pull-up", () => {
    const { container } = render(<SchematicExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(container.textContent).toContain("Pins: U1.EN, SW1.1, C6.1");
  });

  it("clicking or keying a part shows its role", () => {
    const { container } = render(<SchematicExplorer />);
    fireEvent.click(screen.getByRole("button", { name: /^U3, TB6612FNG/ }));
    expect(container.textContent).toContain("STBY must be high");
    fireEvent.keyDown(screen.getByRole("button", { name: /^U2, AMS1117-3\.3/ }), { key: "Enter" });
    expect(container.textContent).toContain("Turns VBAT into 3.3 V");
  });

  it("the drawing is a labelled group, not an image, so its 15 part buttons stay available to assistive technology", () => {
    const { container } = render(<SchematicExplorer />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("group");
    expect(svg.getAttribute("aria-label")).toContain("Schematic of a robot motor-driver board");
    const partButtons = Array.from(svg.querySelectorAll('[role="button"]'));
    expect(partButtons).toHaveLength(15);
    for (const b of partButtons) expect(b.getAttribute("tabindex")).toBe("0");
  });

  it("the view buttons zoom the drawing to one section of the board", () => {
    const { container } = render(<SchematicExplorer />);
    const viewBox = () => container.querySelector("svg")?.getAttribute("viewBox");
    expect(viewBox()).toBe("0 0 980 480");
    fireEvent.click(screen.getByRole("radio", { name: "Motor driver" }));
    expect(viewBox()).toBe("590 24 390 450");
    fireEvent.click(screen.getByRole("radio", { name: "Power" }));
    expect(viewBox()).toBe("20 24 380 230");
  });

  it("ERC mode reveals exactly three planted errors, and only two are caught by the ERC itself", () => {
    const { container } = render(<SchematicExplorer />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    const circlesBefore = container.querySelectorAll("svg circle").length;
    fireEvent.click(screen.getByRole("switch"));
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    const text = items.map((i) => i.textContent ?? "").join("|");
    expect(text).toContain("U3, STBY");
    expect(text).toContain("U1, EN");
    expect(text).toContain("U3, PGND2");
    expect((text.match(/ERC finds it automatically/g) ?? []).length).toBe(2);
    expect((text.match(/Only a review finds it/g) ?? []).length).toBe(1);
    // one red marker per planted error appears on the drawing
    expect(container.querySelectorAll("svg circle").length - circlesBefore).toBe(3);
  });
});

describe("PcbStackupExploded", () => {
  const layerSelect = () => screen.getByRole("combobox", { name: /Layer/ });
  const optionTexts = () => Array.from(layerSelect().querySelectorAll("option")).map((o) => o.textContent ?? "");

  it("draws 11 layers for a 4-layer board and 7 for a 2-layer board", () => {
    const { container } = render(<PcbStackupExploded />);
    expect(container.querySelectorAll('rect[data-face="front"]')).toHaveLength(11);
    expect(optionTexts()).toHaveLength(11);
    fireEvent.click(screen.getByRole("radio", { name: "2 layers" }));
    expect(container.querySelectorAll('rect[data-face="front"]')).toHaveLength(7);
    expect(optionTexts()).toHaveLength(7);
  });

  it("hovering a layer in the drawing shows its description, and the Layer list follows", () => {
    const { container } = render(<PcbStackupExploded />);
    fireEvent.mouseEnter(container.querySelector('[data-layer="l2"]')!);
    expect(container.textContent).toContain("unbroken ground plane");
    expect((layerSelect() as HTMLSelectElement).value).toBe("l2");
  });

  it("the Layer list is the keyboard and screen-reader route, in top-to-bottom order", () => {
    const { container } = render(<PcbStackupExploded />);
    expect((layerSelect() as HTMLSelectElement).value).toBe("l1"); // the described layer is the selected one
    const texts = optionTexts();
    expect(texts[0]).toMatch(/^Top silkscreen/);
    expect(texts[2]).toMatch(/^L1 · top copper/);
    expect(texts[texts.length - 1]).toMatch(/^Bottom silkscreen/);
    fireEvent.change(layerSelect(), { target: { value: "pp1" } });
    expect(container.textContent).toContain("partly cured glass-and-epoxy");
    fireEvent.change(layerSelect(), { target: { value: "core" } });
    expect(container.textContent).toContain("fully cured glass-epoxy core");
  });

  it("the drawing is a labelled image whose painter-order layer shapes are hidden from assistive technology and are not tab stops", () => {
    const { container } = render(<PcbStackupExploded />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("img"); // nothing inside is interactive for AT; the Layer list is the control
    expect(svg.getAttribute("aria-label")).toContain("Exploded view of a 4-layer PCB");
    const layers = container.querySelectorAll("[data-layer]");
    expect(layers).toHaveLength(11);
    for (const g of Array.from(layers)) {
      expect(g.getAttribute("aria-hidden")).toBe("true");
      expect(g.getAttribute("tabindex")).toBeNull();
      expect(g.getAttribute("role")).toBeNull();
    }
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("the explode slider pulls the layers apart", () => {
    const { container } = render(<PcbStackupExploded />);
    const slider = sliders(container)[0];
    const spread = () => {
      const faces = container.querySelectorAll('rect[data-face="front"]');
      // the bottom layer is drawn first so that upper layers occlude lower ones
      return Math.abs(Number(faces[faces.length - 1].getAttribute("y")) - Number(faces[0].getAttribute("y")));
    };
    fireEvent.change(slider, { target: { value: "0" } });
    const collapsed = spread();
    fireEvent.change(slider, { target: { value: "100" } });
    expect(spread()).toBeGreaterThan(collapsed + 200);
  });

  it("a 4-layer board gets a 0.35 mm 50 Ω trace; a 2-layer board needs about 2.9 mm", () => {
    const { container } = render(<PcbStackupExploded />);
    expect(readout(container, "50 Ω trace on the top layer")).toBe("0.35 mm (14 mil)");
    expect(readout(container, "Copper layers")).toBe("4");
    fireEvent.click(screen.getByRole("radio", { name: "2 layers" }));
    expect(readout(container, "50 Ω trace on the top layer")).toBe("about 2.9 mm (115 mil)");
    expect(readout(container, "Copper layers")).toBe("2");
  });
});

describe("TraceWidthCalculator", () => {
  it("uses the shared traceWidth(): 3 A, 10 °C rise, 1 oz external is 53.8 mil, 1.37 mm", () => {
    const { container } = render(<TraceWidthCalculator />);
    const expected = traceWidth({ currentA: 3, tempRiseC: 10, copperOz: 1, layer: "external" });
    expect(readout(container, "Trace width needed")).toBe(`${expected.widthMil.toFixed(1)} mil / ${expected.widthMm.toFixed(2)} mm`);
    expect(readout(container, "Trace width needed")).toBe("53.8 mil / 1.37 mm");
    expect(readout(container, "Round up to a standard width")).toBe("60 mil / 1.52 mm");
  });

  it("shows what a 10 mil trace does at 3 A: about +160 °C", () => {
    const { container } = render(<TraceWidthCalculator />);
    expect(readout(container, "A 10 mil trace at this current")).toBe("+160 °C");
  });

  it("2 oz copper halves the width and an internal layer needs about 2.6 times as much", () => {
    const { container } = render(<TraceWidthCalculator />);
    fireEvent.click(screen.getByRole("radio", { name: "2 oz" }));
    expect(readout(container, "Trace width needed")).toBe("26.9 mil / 0.68 mm");
    fireEvent.click(screen.getByRole("radio", { name: "1 oz" }));
    fireEvent.click(screen.getByRole("radio", { name: "Internal" }));
    expect(readout(container, "Trace width needed")).toMatch(/^140\.\d mil \/ 3\.5\d mm$/);
  });

  it("the sliders drive the answer", () => {
    const { container } = render(<TraceWidthCalculator />);
    const [current, rise] = sliders(container);
    fireEvent.change(current, { target: { value: "1" } });
    expect(readout(container, "Trace width needed")).toBe("11.8 mil / 0.30 mm");
    fireEvent.change(rise, { target: { value: "20" } });
    const expected = traceWidth({ currentA: 1, tempRiseC: 20, copperOz: 1, layer: "external" });
    expect(readout(container, "Trace width needed")).toBe(`${expected.widthMil.toFixed(1)} mil / ${expected.widthMm.toFixed(2)} mm`);
  });

  it("riseAtWidth inverts traceWidth", () => {
    const w = traceWidth({ currentA: 2, tempRiseC: 25, copperOz: 1, layer: "external" }).widthMil;
    expect(riseAtWidth(w, 2, 1, "external")).toBeCloseTo(25, 3);
    expect(riseAtWidth(60, 3, 1, "external")).toBeCloseTo(8.4, 1);
    expect(riseAtWidth(10, 3, 1, "external")).toBeCloseTo(160, 0);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Hydration stability of the interactive states. tests/hydration-stability.test.tsx covers every lesson's default
// markup; this renders each visualization in several other states with and without the transcendental functions
// nudged by one part in 10^14 (the way a different engine's last-bit differences would look) and requires the same markup.
// ---------------------------------------------------------------------------------------------------------------

const NUDGE_FUNCS = ["sin", "cos", "tan", "atan2", "atan", "asin", "acos", "exp", "log", "log10", "sqrt", "pow", "hypot", "cbrt"] as const;

function withNudgedMath<T>(fn: () => T): T {
  const saved: Array<[string, (...args: number[]) => number]> = [];
  for (const name of NUDGE_FUNCS) {
    const original = Math[name] as (...args: number[]) => number;
    saved.push([name, original]);
    (Math as unknown as Record<string, unknown>)[name] = (...args: number[]) => {
      const v = original(...args);
      return v === 0 || !Number.isFinite(v) ? v : v * (1 + 1e-14);
    };
  }
  try {
    return fn();
  } finally {
    for (const [name, original] of saved) (Math as unknown as Record<string, unknown>)[name] = original;
  }
}

/** Render, drive the component into a state, and return its markup with generated ids (useId) neutralised. */
function markupAfter(ui: ReactElement, drive: (utils: RenderResult) => void): string {
  const utils = render(ui);
  drive(utils);
  const html = utils.container.innerHTML.replace(/\b(id|for|aria-labelledby|aria-describedby)="[^"]*"/g, '$1=""');
  cleanup();
  return html;
}

const pick = (name: string | RegExp) => () => fireEvent.click(screen.getByRole("radio", { name }));
const slide = (container: HTMLElement, index: number, value: number | string) =>
  fireEvent.change(sliders(container)[index], { target: { value: String(value) } });

const scenarios: Array<[string, ReactElement, (utils: RenderResult) => void]> = [
  ["OhmsLawCircuit, default", <OhmsLawCircuit key="a" />, () => {}],
  ["OhmsLawCircuit, 12 V into 68 Ω", <OhmsLawCircuit key="b" />, ({ container }) => (slide(container, 0, 12), slide(container, 1, 10))],
  ["OhmsLawCircuit, loaded divider", <OhmsLawCircuit key="c" />, () => (pick("Voltage divider")(), fireEvent.click(screen.getByRole("switch")))],
  ["RcCharging, default", <RcCharging key="d" />, () => {}],
  ["RcCharging, derated 6.3 V", <RcCharging key="e" />, () => (fireEvent.click(screen.getAllByRole("switch")[1]), pick("6.3 V")())],
  ["RcCharging, discharging with derating", <RcCharging key="f" />, () => (fireEvent.click(screen.getAllByRole("switch")[0]), fireEvent.click(screen.getAllByRole("switch")[1]))],
  ["RcCharging, ten times the capacitance", <RcCharging key="g" />, ({ container }) => slide(container, 1, Number(sliders(container)[1].value) + 12)],
  ["BuckConverter, default", <BuckConverter key="h" />, () => {}],
  ["BuckConverter, 95% duty", <BuckConverter key="i" />, ({ container }) => slide(container, 0, 95)],
  ["BuckConverter, light load with 10 µH", <BuckConverter key="j" />, ({ container }) => (slide(container, 1, 50), pick("10 µH")())],
  ["BuckConverter, 2 MHz, 47 µH, 1.5 A", <BuckConverter key="k" />, ({ container }) => (slide(container, 0, 75), slide(container, 1, 1500), pick("2 MHz")(), pick("47 µH")())],
  ["SchematicExplorer, default", <SchematicExplorer key="l" />, () => {}],
  ["SchematicExplorer, ERC mode", <SchematicExplorer key="m" />, () => fireEvent.click(screen.getByRole("switch"))],
  ["SchematicExplorer, GND net and U3 selected", <SchematicExplorer key="n" />, () => (fireEvent.click(screen.getByRole("button", { name: "GND" })), fireEvent.click(screen.getByRole("button", { name: /^U3, TB6612FNG/ })))],
  ["SchematicExplorer, motor driver view with ERC", <SchematicExplorer key="o" />, () => (pick("Motor driver")(), fireEvent.click(screen.getByRole("switch")))],
  ["PcbStackupExploded, default", <PcbStackupExploded key="p" />, () => {}],
  ["PcbStackupExploded, 2 layers", <PcbStackupExploded key="q" />, () => pick("2 layers")()],
  ["PcbStackupExploded, fully exploded with L2", <PcbStackupExploded key="r" />, ({ container }) => (slide(container, 0, 100), fireEvent.mouseEnter(container.querySelector('[data-layer="l2"]')!))],
  ["TraceWidthCalculator, default", <TraceWidthCalculator key="s" />, () => {}],
  ["TraceWidthCalculator, 10 A internal 2 oz", <TraceWidthCalculator key="t" />, ({ container }) => (slide(container, 0, 10), pick("Internal")(), pick("2 oz")())],
  ["TraceWidthCalculator, 0.1 A 0.5 oz", <TraceWidthCalculator key="u" />, ({ container }) => (slide(container, 0, 0.1), pick("0.5 oz")())],
];

describe("hydration stability of interactive states", () => {
  it.each(scenarios)("%s renders identical markup when sin, cos, exp, log, sqrt, pow and hypot differ in the last bits", (_name, ui, drive) => {
    const plain = markupAfter(ui, drive);
    const nudged = withNudgedMath(() => markupAfter(ui, drive));
    expect(plain.length).toBeGreaterThan(500);
    expect(nudged).toBe(plain);
  });
});
