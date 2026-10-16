import type { ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LessonData } from "@/lib/curriculum";
import BatteriesLesson from "@/content/ev/batteries-and-bms";
import batteriesData from "@/content/ev/batteries-and-bms.data";
import TeslaLesson from "@/content/ev/tesla-roadster-and-motor-evolution";
import teslaData from "@/content/ev/tesla-roadster-and-motor-evolution.data";
import ChargingLesson from "@/content/ev/ev-charging-systems";
import chargingData from "@/content/ev/ev-charging-systems.data";
import { CELLS, packSpecs } from "@/components/viz/ev/BatteryPackExplorer.model";
import { CURVE_PACK, chargePoint, minutesBetween } from "@/components/viz/ev/ChargingCurve.model";
import { MOTORS, operatingPoint } from "@/components/viz/ev/TorqueSpeedCurve.model";
import { SITES, ampsForDuty, grantedPower, pilotDutyForAmps, sizeSite } from "@/components/viz/ev/ChargingSessionFlow.model";
import { BatteryPackExplorer } from "@/components/viz/ev/BatteryPackExplorer";
import { ChargingCurve } from "@/components/viz/ev/ChargingCurve";
import { MotorEvolutionTimeline } from "@/components/viz/ev/MotorEvolutionTimeline";
import { TorqueSpeedCurve } from "@/components/viz/ev/TorqueSpeedCurve";
import { ChargingSessionFlow } from "@/components/viz/ev/ChargingSessionFlow";

const lessons: Array<{ slug: string; Lesson: ComponentType; data: LessonData }> = [
  { slug: "batteries-and-bms", Lesson: BatteriesLesson, data: batteriesData },
  { slug: "tesla-roadster-and-motor-evolution", Lesson: TeslaLesson, data: teslaData },
  { slug: "ev-charging-systems", Lesson: ChargingLesson, data: chargingData },
];

// Vitest globals are off, so Testing Library cannot register its own cleanup; without it earlier
// renders stay in the document and running animation loops outlive the test.
afterEach(cleanup);

/** Words of theory prose: the #theory section without figures, SVG labels or the heading.
 *  Text nodes are joined with spaces so words in adjacent elements are not glued together. */
function theoryWords(container: HTMLElement): number {
  const theory = container.querySelector("#theory");
  if (!theory) return 0;
  const copy = theory.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("figure, svg, h2").forEach((n) => n.remove());
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
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

  it("has a static figure in the theory and interactive SVGs with real controls in the viz section", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory figure svg")).not.toBeNull();
    expect(container.querySelector("#viz svg")).not.toBeNull();
    expect(container.querySelectorAll('#viz input[type="range"], #viz [role="radiogroup"]').length).toBeGreaterThan(0);
  });

  it("has 700-1200 words of theory", () => {
    const { container } = render(<Lesson />);
    const words = theoryWords(container);
    expect(words).toBeGreaterThanOrEqual(700);
    expect(words).toBeLessThanOrEqual(1200);
  });

  it("has a practice exercise with a worked answer", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#practice")?.textContent ?? "").toMatch(/Answer/);
  });

  it("has complete lesson data", () => {
    expect(data.keyTerms.length).toBeGreaterThanOrEqual(5);
    expect(data.interview.length).toBeGreaterThanOrEqual(4);
    expect(data.interview.some((q) => q.level === "deep")).toBe(true);
    for (const q of data.interview) {
      // answers a candidate could say aloud: 3-6 sentences
      const sentences = q.a.split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/).filter(Boolean).length;
      expect(sentences, q.q).toBeGreaterThanOrEqual(3);
      expect(sentences, q.q).toBeLessThanOrEqual(6);
    }
    expect(data.quiz.length).toBeGreaterThanOrEqual(5);
    for (const q of data.quiz) {
      expect(q.choices.length, q.q).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(new Set(q.choices).size, q.q).toBe(4);
      expect(q.explain.length, q.q).toBeGreaterThan(40);
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

describe("pack arithmetic (BatteryPackExplorer model)", () => {
  it("computes the practice pack: 96s46p of 4.8 Ah, 3.6 V 2170 cells", () => {
    const p = packSpecs(96, 46, CELLS["2170"]);
    expect(p.cells).toBe(4416);
    expect(p.nominalV).toBeCloseTo(345.6, 6);
    expect(p.maxV).toBeCloseTo(403.2, 6);
    expect(p.minV).toBeCloseTo(288, 6);
    expect(p.capacityAh).toBeCloseTo(220.8, 6);
    expect(p.energyKWh).toBeCloseTo(76.31, 2);
    expect(p.modules).toBe(16);
  });

  it("rearranging the same cells as 192s23p doubles voltage and keeps energy", () => {
    const a = packSpecs(96, 46, CELLS["2170"]);
    const b = packSpecs(192, 23, CELLS["2170"]);
    expect(b.cells).toBe(a.cells);
    expect(b.nominalV).toBeCloseTo(2 * a.nominalV, 6);
    expect(b.energyKWh).toBeCloseTo(a.energyKWh, 6);
    expect(b.voltageClass).toBe("800 V class");
    expect(a.voltageClass).toBe("400 V class");
  });

  it("counts the Model S 85 layout and partial modules", () => {
    expect(packSpecs(96, 74, CELLS["18650"]).cells).toBe(7104);
    expect(packSpecs(100, 10, CELLS["18650"]).modules).toBe(17);
  });

  it("keeps cell-level energy density near 250 Wh/kg", () => {
    for (const c of Object.values(CELLS)) {
      const whPerKg = packSpecs(1, 1, c).cellWhPerKg;
      expect(whPerKg).toBeGreaterThan(230);
      expect(whPerKg).toBeLessThan(270);
    }
  });
});

describe("charging model (ChargingCurve)", () => {
  const maxPackV = CURVE_PACK.series * CURVE_PACK.cellMaxV;

  it("never exceeds the charger power or the pack voltage limit", () => {
    for (const charger of [50, 150, 250]) {
      for (const temp of [-10, 0, 25, 40, 50]) {
        for (let soc = 0; soc <= 1.0001; soc += 0.05) {
          const p = chargePoint(Math.min(soc, 1), temp, charger);
          expect(p.powerKw).toBeLessThanOrEqual(charger + 1e-6);
          expect(p.voltageV).toBeLessThanOrEqual(maxPackV + 1e-6);
          expect(p.currentA).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("tapers with state of charge and ends in a constant-voltage phase", () => {
    const low = chargePoint(0.2, 40, 250);
    const high = chargePoint(0.9, 40, 250);
    expect(high.powerKw).toBeLessThan(low.powerKw / 2);
    expect(chargePoint(0.1, 40, 250).limit).toBe("charger");
    expect(chargePoint(0.5, 40, 250).limit).toBe("bms");
    expect(chargePoint(0.99, 40, 250).limit).toBe("voltage");
  });

  it("charges far slower when the pack is cold, and preconditioning recovers it", () => {
    expect(chargePoint(0.2, 40, 250).powerKw).toBeGreaterThan(3 * chargePoint(0.2, 0, 250).powerKw);
    const warm = minutesBetween(0.1, 0.8, 40, 250);
    expect(warm).toBeGreaterThan(15);
    expect(warm).toBeLessThan(40);
    expect(minutesBetween(0.1, 0.8, 0, 250)).toBeGreaterThan(3 * warm);
  });

  it("is flat on a 50 kW charger until near full", () => {
    expect(chargePoint(0.3, 40, 50).powerKw).toBeCloseTo(50, 3);
    expect(chargePoint(0.8, 40, 50).powerKw).toBeCloseTo(50, 3);
  });
});

describe("torque-speed model (TorqueSpeedCurve)", () => {
  it("holds peak torque below base speed, then constant power, then falling power", () => {
    for (const m of Object.values(MOTORS)) {
      const slow = operatingPoint(m, m.baseRpm / 2);
      expect(slow.region).toBe("constant-torque");
      expect(slow.torqueNm).toBe(m.peakTorqueNm);
      const peakKw = (m.peakTorqueNm * m.baseRpm * 2 * Math.PI) / 60 / 1000;
      const mid = operatingPoint(m, (m.baseRpm + m.cornerRpm) / 2);
      expect(mid.region).toBe("constant-power");
      expect(mid.powerKw).toBeCloseTo(peakKw, 6);
      expect(mid.torqueNm).toBeLessThan(m.peakTorqueNm);
      const fast = operatingPoint(m, (m.cornerRpm + m.maxRpm) / 2);
      expect(fast.region).toBe("reduced-power");
      expect(fast.powerKw).toBeLessThan(peakKw);
      expect(operatingPoint(m, m.maxRpm + 1).region).toBe("beyond-max");
    }
  });

  it("gives the carbon-sleeved PM the widest speed range", () => {
    expect(MOTORS.sleeved.maxRpm).toBe(20000);
    expect(MOTORS.sleeved.maxRpm).toBeGreaterThan(MOTORS.induction.maxRpm);
    expect(operatingPoint(MOTORS.sleeved, 15000).powerKw).toBeGreaterThan(operatingPoint(MOTORS.induction, 15000).powerKw);
  });
});

describe("site and session model (ChargingSessionFlow)", () => {
  it("applies vehicle, dispenser and site limits in that order", () => {
    expect(grantedPower(SITES.dc, 100, 0)).toMatchObject({ kw: 100, limitedBy: "vehicle", suspended: false });
    expect(grantedPower(SITES.dc, 350, 0)).toMatchObject({ kw: 150, limitedBy: "port", suspended: false });
    expect(grantedPower(SITES.dc, 350, 500)).toMatchObject({ kw: 100, limitedBy: "site", suspended: false });
    expect(grantedPower(SITES.dc, 350, 600)).toMatchObject({ kw: 0, suspended: true });
  });

  it("suspends an AC session when the share falls below the 6 A pilot minimum", () => {
    const g = grantedPower(SITES.ac, 11.5, 59);
    expect(g.suspended).toBe(true);
    expect(grantedPower(SITES.ac, 7.7, 0)).toMatchObject({ kw: 7.7, limitedBy: "vehicle", suspended: false });
  });

  it("maps J1772 pilot duty cycle to amps both ways", () => {
    expect(pilotDutyForAmps(32)).toBeCloseTo(53.33, 2);
    expect(pilotDutyForAmps(80)).toBeCloseTo(96, 6);
    expect(pilotDutyForAmps(5)).toBeNull();
    expect(ampsForDuty(50)).toBeCloseTo(30, 6);
    expect(ampsForDuty(96)).toBeCloseTo(80, 6);
  });

  it("sizes the practice site: 8 x 150 kW with 2:1 sharing", () => {
    const s = sizeSite({ dispensers: 8, kwEach: 150, shareRatio: 2, efficiency: 0.95, powerFactor: 0.99, auxKva: 15 });
    expect(s.nameplateKw).toBe(1200);
    expect(s.sharedKw).toBe(600);
    expect(s.inputKva).toBeCloseTo(653, 0);
    expect(s.transformerKva).toBe(750);
    expect(s.continuousAmps480).toBeCloseTo(982, 0);
    expect(s.mainBreakerA).toBe(1000);
  });
});

describe("visualization behaviour", () => {
  it("BatteryPackExplorer shows the practice pack and recomputes from the sliders and presets", () => {
    const { container } = render(<BatteryPackExplorer />);
    expect(screen.getAllByText("76.3 kWh").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("slider", { name: /series groups/i }), { target: { value: "192" } });
    expect(screen.getAllByText("152.6 kWh").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Model S 85 layout/i }));
    expect(screen.getAllByText("7,104").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("radio", { name: "Cell" }));
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toMatch(/cell/i);
    fireEvent.click(screen.getByRole("radio", { name: "Module" }));
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toMatch(/module/i);
  });

  it("ChargingCurve slows down when cold and recovers with preconditioning", () => {
    const { container } = render(<ChargingCurve />);
    const minutes = () => Number(/10-80 % takes about (\d+) min/.exec(container.textContent ?? "")?.[1]);
    const warm = minutes();
    expect(warm).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("slider", { name: /pack temperature/i }), { target: { value: "0" } });
    expect(minutes()).toBeGreaterThan(2 * warm);
    fireEvent.click(screen.getByRole("switch", { name: /precondition/i }));
    expect(minutes()).toBeLessThan(warm);
  });

  it("MotorEvolutionTimeline steps through shipped cars", () => {
    render(<MotorEvolutionTimeline />);
    expect(screen.getByRole("article", { name: /Roadster \(2008\)/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Later/ }));
    expect(screen.getByRole("article", { name: /Model S \(2012\)/ })).toBeTruthy();
  });

  it("MotorEvolutionTimeline labels every second-generation Roadster number as a claim", () => {
    render(<MotorEvolutionTimeline />);
    fireEvent.click(screen.getByRole("radio", { name: /Roadster 2/ }));
    const card = screen.getByRole("article", { name: /second generation/i });
    expect(card.textContent).toMatch(/Announced claims, not shipped specifications/);
    expect(card.textContent).toMatch(/delayed repeatedly/);
    expect(card.textContent).toMatch(/Check Tesla's site/);
    const values = Array.from(card.querySelectorAll("dd")).map((d) => d.textContent ?? "");
    expect(values.length).toBeGreaterThanOrEqual(5);
    for (const v of values) expect(v).toMatch(/^Claimed/);
  });

  it("TorqueSpeedCurve moves the operating point through its regions", () => {
    render(<TorqueSpeedCurve />);
    const slider = screen.getByRole("slider", { name: /motor speed/i });
    fireEvent.change(slider, { target: { value: "2000" } });
    expect(screen.getByText("Constant torque (current limit)")).toBeTruthy();
    fireEvent.change(slider, { target: { value: "9000" } });
    expect(screen.getByText("Constant power (field weakening)")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Induction" }));
    fireEvent.change(slider, { target: { value: "17000" } });
    expect(screen.getByText("Beyond maximum speed")).toBeTruthy();
  });

  it("ChargingSessionFlow shows load management capping DC and AC sessions", () => {
    const { container } = render(<ChargingSessionFlow />);
    fireEvent.change(screen.getByRole("slider", { name: /other stalls/i }), { target: { value: "500" } });
    expect(container.textContent).toMatch(/granted 100 kW, set by the site's load-management cap/);
    fireEvent.click(screen.getByRole("radio", { name: "AC Level 2" }));
    expect(container.textContent).toMatch(/47\.9 A at 240 V, a 79\.9 % pilot duty cycle/);
    fireEvent.change(screen.getByRole("slider", { name: /other stalls/i }), { target: { value: "59" } });
    expect(container.textContent).toMatch(/SuspendedEVSE/);
  });
});

describe("accuracy rules", () => {
  it("presents the second-generation Roadster figures as delayed, announced claims", () => {
    const { container } = render(<TeslaLesson />);
    const theory = container.querySelector("#theory")?.textContent ?? "";
    expect(theory).toMatch(/November 2017/);
    expect(theory).toMatch(/announced claim, not a shipped specification/);
    expect(theory).toMatch(/delayed repeatedly/);
    expect(theory).toMatch(/check Tesla's site/i);
  });
});
