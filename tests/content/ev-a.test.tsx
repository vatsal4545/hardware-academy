import type { ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import type { LessonData } from "@/lib/curriculum";
import PowertrainLesson from "@/content/ev/ev-powertrain-architecture";
import powertrainData from "@/content/ev/ev-powertrain-architecture.data";
import MotorsLesson from "@/content/ev/three-phase-motors";
import motorsData from "@/content/ev/three-phase-motors.data";
import InverterLesson from "@/content/ev/inverters-pwm-and-foc";
import inverterData from "@/content/ev/inverters-pwm-and-foc.data";
import { EvDrivetrainFlow, drivetrainFlow, ETA } from "@/components/viz/ev/EvDrivetrainFlow";
import { ThreePhaseField, phaseCurrents, spaceVector, syncSpeedRpm } from "@/components/viz/ev/ThreePhaseField";
import { Motor3D } from "@/components/viz/ev/Motor3D";
import { ThreePhaseInverterPwm, legStates, pwmWaveforms, type PwmMode } from "@/components/viz/ev/ThreePhaseInverterPwm";
import { DqFrame, abcToDq, dqToAbc, torqueNm } from "@/components/viz/ev/DqFrame";

const lessons: Array<{ slug: string; Lesson: ComponentType; data: LessonData }> = [
  { slug: "ev-powertrain-architecture", Lesson: PowertrainLesson, data: powertrainData },
  { slug: "three-phase-motors", Lesson: MotorsLesson, data: motorsData },
  { slug: "inverters-pwm-and-foc", Lesson: InverterLesson, data: inverterData },
];

// Vitest globals are off, so Testing Library cannot register its own cleanup. Without it, earlier
// containers stay in the document and jsdom resolves "#theory" to the first (stale) element.
afterEach(cleanup);

/** Words of theory: the #theory section without its figures (SVG labels and captions are not prose). */
function theoryWords(container: HTMLElement): number {
  const theory = container.querySelector("#theory");
  if (!theory) return 0;
  const copy = theory.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("figure, svg, h2").forEach((n) => n.remove());
  return (copy.textContent ?? "").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

describe.each(lessons)("$slug", ({ Lesson, data }) => {
  it("renders theory, viz and practice sections", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory")).not.toBeNull();
    expect(container.querySelector("#viz")).not.toBeNull();
    expect(container.querySelector("#practice")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has a static figure in the theory and an interactive SVG in the viz section", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory figure svg")).not.toBeNull();
    expect(container.querySelector("#viz svg")).not.toBeNull();
    // real controls: at least one slider or radio group inside the viz section
    expect(container.querySelectorAll('#viz input[type="range"], #viz [role="radiogroup"]').length).toBeGreaterThan(0);
  });

  it("has 700-1200 words of theory", () => {
    const { container } = render(<Lesson />);
    const words = theoryWords(container);
    expect(words).toBeGreaterThanOrEqual(700);
    expect(words).toBeLessThanOrEqual(1200);
  });

  it("has a worked practice exercise", () => {
    const { container } = render(<Lesson />);
    const practice = container.querySelector("#practice");
    expect(practice?.textContent ?? "").toMatch(/Answer/);
  });

  it("has complete lesson data", () => {
    expect(data.keyTerms.length).toBeGreaterThanOrEqual(5);
    expect(new Set(data.keyTerms.map((k) => k.term)).size).toBe(data.keyTerms.length);
    expect(data.interview.length).toBeGreaterThanOrEqual(4);
    expect(data.interview.some((q) => q.level === "deep")).toBe(true);
    for (const q of data.interview) {
      const sentences = q.a.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(3);
      expect(sentences.length).toBeLessThanOrEqual(6);
    }
    expect(data.quiz.length).toBeGreaterThanOrEqual(5);
    for (const q of data.quiz) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(40);
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

describe("EvDrivetrainFlow", () => {
  it("computes bus current from P = V·I and multiplies the efficiency chain", () => {
    const at400 = drivetrainFlow(75, false, false, 400);
    expect(at400.busKw).toBe(150);
    expect(at400.currentA).toBe(375);
    expect(drivetrainFlow(75, false, false, 800).currentA).toBe(187.5);
    expect(at400.wheelKw / at400.cellsKw).toBeCloseTo(ETA.pack * ETA.inverter * ETA.motor * ETA.reducer, 6);
    const lossSum = Object.values(at400.losses).reduce((a, b) => a + b, 0);
    expect(lossSum).toBeCloseTo(at400.cellsKw - at400.wheelKw, 6);
    // same cable, half the current: a quarter of the I²R loss
    expect(drivetrainFlow(75, false, false, 800).cableLossW / at400.cableLossW).toBeCloseTo(0.25, 6);
  });

  it("caps regen at the BMS charge limit when the pack is cold and hands the rest to the friction brakes", () => {
    const warm = drivetrainFlow(50, true, false, 400);
    expect(warm.limitedBy).toBeNull();
    expect(warm.frictionKw).toBeCloseTo(0, 6);
    const cold = drivetrainFlow(50, true, true, 400);
    expect(cold.limitedBy).toBe("charge");
    expect(cold.busKw).toBe(5);
    expect(cold.frictionKw + cold.wheelKw).toBeCloseTo(cold.requestedKw, 6);
    expect(cold.cellsKw).toBeLessThan(cold.busKw);
  });

  it("shows 375 A at 400 V, 187.5 A at 800 V, and reverses for regen", () => {
    const { container } = render(<EvDrivetrainFlow />);
    expect(container.textContent).toContain("375 A");
    fireEvent.click(screen.getByRole("radio", { name: "800 V" }));
    expect(container.textContent).toContain("187.5 A");
    expect(container.textContent).not.toContain("375 A");
    expect(container.textContent).toContain("DRIVE");
    fireEvent.click(screen.getByRole("switch", { name: /Brake \(regen\)/ }));
    expect(container.textContent).toContain("REGEN");
    expect(screen.getByRole("slider", { name: /Brake pedal/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: /Cold pack/ }));
    expect(container.textContent).toContain("BMS charge limit");
  });
});

describe("ThreePhaseField", () => {
  it("adds three balanced phase vectors into a constant 1.5 vector that turns with the electrical angle", () => {
    for (let k = 0; k < 24; k++) {
      const th = (k / 24) * 2 * Math.PI;
      const v = spaceVector(th);
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(1.5, 9);
      expect(Math.cos(Math.atan2(v.y, v.x) - th)).toBeCloseTo(1, 9);
      const [a, b, c] = phaseCurrents(th);
      expect(a + b + c).toBeCloseTo(0, 12);
    }
  });

  it("uses n_s = 120·f/p", () => {
    expect(syncSpeedRpm(400, 4)).toBe(12000);
    expect(syncSpeedRpm(50, 4)).toBe(1500);
    expect(syncSpeedRpm(60, 2)).toBe(3600);
  });

  it("shows slip for the induction rotor and a locked rotor for PM", () => {
    const { container } = render(<ThreePhaseField />);
    expect(container.textContent).toContain("1,500 rpm");
    expect(container.textContent).toContain("1,425 rpm"); // 5% slip
    fireEvent.change(screen.getByRole("slider", { name: /Electrical frequency/ }), { target: { value: "400" } });
    expect(container.textContent).toContain("12,000 rpm");
    expect(container.textContent).toContain("11,400 rpm");
    fireEvent.click(screen.getByRole("radio", { name: "PM synchronous" }));
    expect(screen.queryByRole("slider", { name: /^Slip/ })).toBeNull();
    expect(screen.getByRole("slider", { name: /Torque angle/ })).toBeTruthy();
    expect(container.textContent).not.toContain("11,400 rpm");
    expect(container.textContent).toContain("0.00 Hz");
  });
});

describe("Motor3D", () => {
  it("falls back to the 2D exploded drawing without WebGL and never mounts a canvas", () => {
    const { container } = render(<Motor3D />);
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.textContent).toContain("no WebGL");
    const before = container.querySelector('[data-part="rotor"]')?.getAttribute("transform");
    fireEvent.change(screen.getByRole("slider", { name: /Explode/ }), { target: { value: "1" } });
    const after = container.querySelector('[data-part="rotor"]')?.getAttribute("transform");
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
  });
});

describe("ThreePhaseInverterPwm", () => {
  const fundamental = (m: number, mode: PwmMode, deadFrac = 0) => pwmWaveforms({ m, mode, ratio: 15, deadFrac }).fundamentalPeak;

  it("produces a phase fundamental of m·Vdc/2 in the linear range", () => {
    expect(Math.abs(fundamental(0.8, "spwm") - 160)).toBeLessThan(2);
    expect(Math.abs(fundamental(1.0, "spwm") - 200)).toBeLessThan(2);
  });

  it("keeps SVPWM linear up to m = 1.155 while sine PWM saturates above 1", () => {
    expect(Math.abs(fundamental(1.1, "svpwm") - 220)).toBeLessThan(2);
    expect(Math.abs(fundamental(2 / Math.sqrt(3), "svpwm") - 400 / Math.sqrt(3))).toBeLessThan(2);
    expect(fundamental(1.1, "spwm")).toBeLessThan(215);
  });

  it("never turns on both switches of a leg, and dead time costs about td/Ts × Vdc", () => {
    let deadSamples = 0;
    for (let j = 0; j < 1500; j++) {
      for (const leg of legStates(j / 1500, { m: 0.8, mode: "spwm", ratio: 15, deadFrac: 0.01 })) {
        expect(leg.high && leg.low).toBe(false);
        if (!leg.high && !leg.low) deadSamples++;
      }
    }
    expect(deadSamples).toBeGreaterThan(0);
    // 1% of 400 V is a 4 V square-wave error following the current; its fundamental is 4/π × 4 V ≈ 5 V
    const loss = fundamental(0.8, "spwm") - fundamental(0.8, "spwm", 0.01);
    expect(loss).toBeGreaterThan(3.5);
    expect(loss).toBeLessThan(6);
  });

  it("updates the fundamental with the modulation index and flags overmodulation", () => {
    const { container } = render(<ThreePhaseInverterPwm />);
    fireEvent.change(screen.getByRole("slider", { name: /Dead time/ }), { target: { value: "0" } });
    expect(container.textContent).toContain("160 V");
    fireEvent.change(screen.getByRole("slider", { name: /Modulation index/ }), { target: { value: "0.5" } });
    expect(container.textContent).toContain("100 V");
    fireEvent.change(screen.getByRole("slider", { name: /Modulation index/ }), { target: { value: "1.15" } });
    expect(container.textContent).toContain("Overmodulating");
    fireEvent.click(screen.getByRole("radio", { name: "SVPWM" }));
    expect(container.textContent).not.toContain("Overmodulating");
  });
});

describe("DqFrame", () => {
  it("turns constant Id and Iq into balanced phase currents of amplitude √(Id² + Iq²)", () => {
    let peak = 0;
    for (let j = 0; j < 360; j++) {
      const th = (j / 360) * 2 * Math.PI;
      const [a, b, c] = dqToAbc(-300, 400, th);
      expect(a + b + c).toBeCloseTo(0, 9);
      peak = Math.max(peak, a);
      const back = abcToDq(a, b, c, th);
      expect(back.d).toBeCloseTo(-300, 9);
      expect(back.q).toBeCloseTo(400, 9);
    }
    expect(peak).toBeCloseTo(500, 1);
  });

  it("makes torque only from Iq in a surface PM motor and adds reluctance torque in an interior PM motor", () => {
    expect(torqueNm(0, 300, "spm")).toBeCloseTo(121.5, 6);
    expect(torqueNm(-300, 300, "spm")).toBeCloseTo(121.5, 6);
    expect(torqueNm(-300, 300, "ipm")).toBeCloseTo(202.5, 6);
  });

  it("updates the amplitude and torque readouts from the sliders", () => {
    const { container } = render(<DqFrame />);
    expect(container.textContent).toContain("300 A peak");
    expect(container.textContent).toContain("121.5 N·m");
    fireEvent.change(screen.getByRole("slider", { name: /Id \(d-axis/ }), { target: { value: "-300" } });
    expect(container.textContent).toContain("424 A peak");
    expect(container.textContent).toContain("121.5 N·m");
    fireEvent.click(screen.getByRole("radio", { name: "Interior PM" }));
    expect(container.textContent).toContain("202.5 N·m");
  });
});

describe("reduced motion", () => {
  it("starts paused and keeps the 3D model as an opt-in behind the 2D drawing", () => {
    const w = window as unknown as Record<string, unknown>;
    const originalMatchMedia = window.matchMedia;
    w.WebGLRenderingContext = function WebGLRenderingContext() {};
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const flow = render(<EvDrivetrainFlow />);
      expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
      flow.unmount();
      const { container } = render(<Motor3D />);
      expect(container.textContent).toContain("reduced motion");
      expect(screen.getByRole("switch", { name: /3D model/ }).getAttribute("aria-checked")).toBe("false");
      expect(container.querySelector("canvas")).toBeNull();
    } finally {
      delete w.WebGLRenderingContext;
      window.matchMedia = originalMatchMedia;
    }
  });
});
