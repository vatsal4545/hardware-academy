import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { act, type ComponentType } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import type { LessonData } from "@/lib/curriculum";
import PowerAndSignalIntegrity from "@/content/pcb/power-and-signal-integrity";
import powerData from "@/content/pcb/power-and-signal-integrity.data";
import DfmAndManufacturing from "@/content/pcb/dfm-and-manufacturing";
import dfmData from "@/content/pcb/dfm-and-manufacturing.data";
import BringUpAndDebugging from "@/content/pcb/bring-up-and-debugging";
import bringUpData from "@/content/pcb/bring-up-and-debugging.data";
import KicadProjectWalkthrough from "@/content/pcb/kicad-project-walkthrough";
import kicadData from "@/content/pcb/kicad-project-walkthrough.data";
import { DecouplingDemo } from "@/components/viz/pcb/DecouplingDemo";
import { ReturnPathDemo } from "@/components/viz/pcb/ReturnPathDemo";
import { SmtAssemblyStepper } from "@/components/viz/pcb/SmtAssemblyStepper";
import { DfmChecker } from "@/components/viz/pcb/DfmChecker";
import { DebugFlowchart } from "@/components/viz/pcb/DebugFlowchart";
import { SchematicToLayout } from "@/components/viz/pcb/SchematicToLayout";
import { PlacementPlan } from "@/components/viz/pcb/SchematicToLayoutShapes";
import { nets, parts, partBox, BOARD, NET_WIDTH, distSegmentSegment, antennaKeepout } from "@/components/viz/pcb/SchematicToLayoutBoard";
import { symptoms } from "@/components/viz/pcb/DebugFlowchartData";

interface Case {
  slug: string;
  Lesson: ComponentType;
  data: LessonData;
}

const cases: Case[] = [
  { slug: "power-and-signal-integrity", Lesson: PowerAndSignalIntegrity, data: powerData },
  { slug: "dfm-and-manufacturing", Lesson: DfmAndManufacturing, data: dfmData },
  { slug: "bring-up-and-debugging", Lesson: BringUpAndDebugging, data: bringUpData },
  { slug: "kicad-project-walkthrough", Lesson: KicadProjectWalkthrough, data: kicadData },
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Words of running prose in the theory section: everything except SVG labels, captions, callouts and the heading. */
function theoryProseWords(root: Element): number {
  const theory = root.querySelector("#theory");
  if (!theory) return 0;
  const clone = theory.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("svg, figcaption, aside, h2").forEach((n) => n.remove());
  return countWords(clone.textContent ?? "");
}

function sentenceCount(text: string): number {
  return text.split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/).filter((s) => s.trim().length > 0).length;
}

// Vitest runs without globals, so Testing Library does not clean up on its own; duplicate ids would confuse jsdom's #id lookup.
afterEach(() => cleanup());

describe.each(cases)("$slug", ({ Lesson, data }) => {
  it("renders theory, viz and practice sections with an svg", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory")).not.toBeNull();
    expect(container.querySelector("#viz")).not.toBeNull();
    expect(container.querySelector("#practice")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has a static figure with an inline svg in the theory section", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory figure svg")).not.toBeNull();
    expect(container.querySelector("#theory figure figcaption")).not.toBeNull();
  });

  it("has 700-1200 words of theory", () => {
    const { container } = render(<Lesson />);
    const prose = theoryProseWords(container);
    const total = countWords(container.querySelector("#theory")?.textContent ?? "");
    expect(prose).toBeGreaterThanOrEqual(700);
    expect(total).toBeLessThanOrEqual(1200);
  });

  it("has an interactive visualization with real controls", () => {
    const { container } = render(<Lesson />);
    const viz = container.querySelector("#viz");
    expect(viz).not.toBeNull();
    expect(viz!.querySelector("svg")).not.toBeNull();
    const controls = viz!.querySelectorAll("input[type=range], [role=switch], [role=radio], button");
    expect(controls.length).toBeGreaterThanOrEqual(2);
  });

  it("has a practice exercise with a worked answer", () => {
    const { container } = render(<Lesson />);
    const practice = container.querySelector("#practice");
    expect(practice).not.toBeNull();
    expect(practice!.textContent ?? "").toMatch(/worked answer/i);
    expect(practice!.textContent ?? "").toMatch(/practice/i);
  });

  it("has complete lesson data", () => {
    expect(data.keyTerms.length).toBeGreaterThanOrEqual(5);
    for (const k of data.keyTerms) {
      expect(k.term.length).toBeGreaterThan(1);
      expect(k.def.length).toBeGreaterThan(20);
    }
    const s = data.scenario;
    expect(s.title.length).toBeGreaterThan(10);
    for (const field of [s.context, s.rootCause, s.fix, s.lesson]) {
      expect(field.length).toBeGreaterThan(30);
      expect(field).not.toBe("TODO");
    }
    expect(s.symptoms.length).toBeGreaterThanOrEqual(2);
    expect(s.hints.length).toBeGreaterThanOrEqual(2);
    expect(data.interview.length).toBeGreaterThanOrEqual(4);
    expect(data.interview.some((q) => q.level === "deep")).toBe(true);
    expect(data.quiz.length).toBeGreaterThanOrEqual(5);
  });

  it("has interview answers a candidate could say aloud (3-6 sentences)", () => {
    for (const q of data.interview) {
      const n = sentenceCount(q.a);
      expect(n, `"${q.q}" has ${n} sentences`).toBeGreaterThanOrEqual(3);
      expect(n, `"${q.q}" has ${n} sentences`).toBeLessThanOrEqual(6);
    }
  });

  it("has quiz questions with four choices and teaching explanations", () => {
    for (const q of data.quiz) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(60);
    }
  });
});

/** Pull the first number out of a readout such as "min 2.93 V, 711 mV peak to peak". */
function numberAfter(text: string, pattern: RegExp): number {
  const m = text.match(pattern);
  expect(m, `no match for ${pattern} in "${text}"`).not.toBeNull();
  return Number(m![1]);
}

describe("DecouplingDemo", () => {
  it("shows more noise as the capacitor moves away from the pin", () => {
    render(<DecouplingDemo />);
    const slider = screen.getByRole("slider", { name: /loop inductance/i });
    fireEvent.change(slider, { target: { value: "1" } });
    const near = numberAfter(screen.getByTestId("decoupled-readout").textContent ?? "", /([\d.]+) mV peak/);
    fireEvent.change(slider, { target: { value: "20" } });
    const far = numberAfter(screen.getByTestId("decoupled-readout").textContent ?? "", /([\d.]+) mV peak/);
    expect(far).toBeGreaterThan(near * 2);
  });

  it("compares against the bare rail and can remove the capacitor", () => {
    render(<DecouplingDemo />);
    const bare = numberAfter(screen.getByTestId("bare-readout").textContent ?? "", /([\d.]+) mV peak/);
    const dec = numberAfter(screen.getByTestId("decoupled-readout").textContent ?? "", /([\d.]+) mV peak/);
    expect(bare).toBeGreaterThan(dec * 2);
    fireEvent.click(screen.getByRole("switch", { name: /decoupling capacitor/i }));
    expect(screen.queryByTestId("decoupled-readout")).toBeNull();
    expect(screen.getByText(/not fitted/i)).toBeTruthy();
  });

  it("bigger current steps make the bare rail worse", () => {
    render(<DecouplingDemo />);
    const step = screen.getByRole("slider", { name: /current step/i });
    fireEvent.change(step, { target: { value: "20" } });
    const small = numberAfter(screen.getByTestId("bare-readout").textContent ?? "", /([\d.]+) mV peak/);
    fireEvent.change(step, { target: { value: "120" } });
    const large = numberAfter(screen.getByTestId("bare-readout").textContent ?? "", /([\d.]+) mV peak/);
    expect(large).toBeGreaterThan(small * 3);
  });
});

describe("ReturnPathDemo", () => {
  const area = () => numberAfter(screen.getByTestId("loop-area").textContent ?? "", /([\d.]+) mm/);

  it("a slit multiplies the loop area and a stitching capacitor mostly repairs it", () => {
    render(<ReturnPathDemo />);
    const withSlit = area();
    fireEvent.click(screen.getByRole("switch", { name: /stitching capacitor/i }));
    const withCap = area();
    fireEvent.click(screen.getByRole("switch", { name: /cut a slit/i }));
    const solid = area();
    expect(solid).toBeCloseTo(9.6, 1);
    expect(withSlit).toBeGreaterThan(solid * 4);
    expect(withCap).toBeLessThan(withSlit / 2);
    expect(withCap).toBeGreaterThan(solid);
  });

  it("a closer plane gives a smaller loop and slow signals have no loop to measure", () => {
    render(<ReturnPathDemo />);
    fireEvent.click(screen.getByRole("switch", { name: /cut a slit/i }));
    fireEvent.click(screen.getByRole("radio", { name: "0.1 mm" }));
    const close = area();
    fireEvent.click(screen.getByRole("radio", { name: /1.6 mm/i }));
    const far = area();
    expect(far).toBeGreaterThan(close * 10);
    fireEvent.click(screen.getByRole("radio", { name: /slow/i }));
    expect(within(screen.getByTestId("loop-area")).queryByText(/mm/)).toBeNull();
    expect(screen.getByTestId("return-path").textContent).toMatch(/whole plane/i);
  });
});

describe("SmtAssemblyStepper", () => {
  const next = () => fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

  it("walks through stencil, paste, place, reflow and inspect", () => {
    render(<SmtAssemblyStepper />);
    expect(screen.getByText("Step 1 / 5")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Stencil" })).toBeTruthy();
    for (const title of ["Paste", "Place", "Reflow", "Inspect"]) {
      next();
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    }
    expect(screen.getByText("Step 5 / 5")).toBeTruthy();
  });

  it("grades the reflow profile the learner sets", () => {
    render(<SmtAssemblyStepper />);
    next();
    next();
    next();
    // default profile sits in the SAC305 window
    expect(screen.getByTestId("reflow-verdict").textContent).toMatch(/inside the sac305 window/i);
    const peak = screen.getByRole("slider", { name: /peak temperature/i });
    fireEvent.change(peak, { target: { value: "228" } });
    expect(screen.getByTestId("reflow-verdict").textContent).toMatch(/too low/i);
    fireEvent.change(peak, { target: { value: "262" } });
    expect(screen.getByTestId("reflow-verdict").textContent).toMatch(/255/);
    fireEvent.change(peak, { target: { value: "245" } });
    fireEvent.change(screen.getByRole("slider", { name: /preheat ramp/i }), { target: { value: "4" } });
    expect(screen.getByTestId("reflow-verdict").textContent).toMatch(/tombstoning/i);
  });

  it("lets the learner inject a tombstone at the inspection step", () => {
    const { container } = render(<SmtAssemblyStepper />);
    for (let i = 0; i < 4; i++) next();
    const before = container.querySelector("svg")!.textContent ?? "";
    expect(before).toMatch(/4 of 4 joints pass/);
    fireEvent.click(screen.getByRole("switch", { name: /tombstone/i }));
    expect(container.querySelector("svg")!.textContent ?? "").toMatch(/1 defect: tombstone/);
  });
});

describe("DfmChecker", () => {
  const summary = () => screen.getByTestId("dfm-summary").textContent ?? "";
  const count = () => numberAfter(summary(), /^(\d+) violation/);

  it("starts with the DRC-style checks and finds more once the DFM checks are on", () => {
    render(<DfmChecker />);
    expect(count()).toBe(4);
    fireEvent.click(screen.getByRole("switch", { name: /solder mask web/i }));
    expect(count()).toBe(5);
    fireEvent.click(screen.getByRole("switch", { name: /junction angle/i }));
    fireEvent.click(screen.getByRole("switch", { name: /thermal relief on pour/i }));
    expect(count()).toBe(7);
    expect(summary()).toMatch(/4 that CAD DRC would catch/);
    expect(summary()).toMatch(/3 that usually need the fab/);
  });

  it("changes with the fab profile and goes clean when fixes are applied", () => {
    render(<DfmChecker />);
    for (const name of [/solder mask web/i, /junction angle/i, /thermal relief on pour/i]) {
      fireEvent.click(screen.getByRole("switch", { name }));
    }
    fireEvent.click(screen.getByRole("radio", { name: /advanced/i }));
    expect(count()).toBe(2);
    fireEvent.click(screen.getByRole("radio", { name: /conservative/i }));
    expect(count()).toBe(7);
    fireEvent.click(screen.getByRole("switch", { name: /apply fixes/i }));
    expect(summary()).toMatch(/no violations/i);
  });

  it("switching a check off removes its highlight", () => {
    const { container } = render(<DfmChecker />);
    const rings = () => container.querySelectorAll("svg g[aria-hidden]").length;
    const before = rings();
    expect(before).toBe(4);
    fireEvent.click(screen.getByRole("switch", { name: /trace spacing/i }));
    expect(rings()).toBe(before - 1);
  });
});

describe("DebugFlowchart decision tree", () => {
  it("walks from a symptom to a likely cause, back one step and over again", () => {
    render(<DebugFlowchart />);
    fireEvent.click(screen.getByRole("button", { name: /current limit/i }));
    expect(screen.getByRole("heading", { name: /measure each rail to ground/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /under about 5/i }));
    expect(screen.getByRole("heading", { name: /push a little current/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^a capacitor$/i }));
    expect(screen.getByTestId("flow-card").textContent).toMatch(/likely cause.*reversed or failed capacitor/i);
    fireEvent.click(screen.getByRole("button", { name: /back one step/i }));
    expect(screen.getByRole("heading", { name: /push a little current/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /start over/i }));
    expect(screen.getByRole("button", { name: /wrong voltage/i })).toBeTruthy();
  });

  it("every symptom reaches a cause with a fix, whichever first answer is chosen", () => {
    for (const s of symptoms) {
      const { unmount } = render(<DebugFlowchart />);
      fireEvent.click(screen.getByRole("button", { name: s.label }));
      for (let i = 0; i < 8; i++) {
        const card = screen.getByTestId("flow-card");
        if (/likely cause/i.test(card.textContent ?? "")) break;
        const options = within(card)
          .getAllByRole("button")
          .filter((b) => !/back one step|start over/i.test(b.textContent ?? ""));
        fireEvent.click(options[options.length - 1]);
      }
      const text = screen.getByTestId("flow-card").textContent ?? "";
      expect(text, s.label).toMatch(/likely cause/i);
      expect(text, s.label).toMatch(/try:/i);
      unmount();
    }
  });
});

describe("DebugFlowchart find-the-short game", () => {
  const rise = () => numberAfter(screen.getByTestId("hunt-ldo").textContent ?? "", /(\d+) °C/);
  const hoverText = () => screen.getByTestId("hunt-hover").textContent ?? "";
  const part = (ref: string) => screen.getByRole("button", { name: new RegExp(`inspect ${ref},`, "i") });
  /** Select a part on the board, then confirm with the Desolder button. */
  const desolder = (ref: string) => {
    fireEvent.click(part(ref));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^desolder ${ref}$`, "i") }));
  };

  it("a regulator that feeds the short runs hot from the battery, but stays cool when you inject at the rail", () => {
    render(<DebugFlowchart />);
    fireEvent.change(screen.getByRole("slider", { name: /current limit/i }), { target: { value: "1" } });
    const hot = rise();
    expect(hot).toBeGreaterThan(60);
    fireEvent.click(screen.getByRole("radio", { name: /3V3 rail, 1 V/i }));
    expect(rise()).toBe(25);
  });

  it("injecting current heats the failed part, and the millivolt probe reads lowest at it", () => {
    render(<DebugFlowchart />);
    fireEvent.click(screen.getByRole("radio", { name: /3V3 rail, 1 V/i }));
    fireEvent.change(screen.getByRole("slider", { name: /current limit/i }), { target: { value: "1" } });
    fireEvent.focus(part("C5"));
    const tC5 = numberAfter(hoverText(), /: (\d+) °C/);
    const mvC5 = numberAfter(hoverText(), /probe (\d+) mV/);
    fireEvent.focus(part("C7"));
    const tC7 = numberAfter(hoverText(), /: (\d+) °C/);
    const mvC7 = numberAfter(hoverText(), /probe (\d+) mV/);
    fireEvent.focus(part("U1"));
    const mvU1 = numberAfter(hoverText(), /probe (\d+) mV/);
    expect(tC5).toBeGreaterThan(tC7 + 15);
    expect(mvC5).toBeLessThan(mvC7);
    expect(mvC7).toBeLessThan(mvU1);
    fireEvent.focus(part("R1"));
    expect(hoverText()).toMatch(/not on the 3V3 net/);
  });

  it("selecting a part shows its readings but removes nothing until Desolder is pressed", () => {
    render(<DebugFlowchart />);
    fireEvent.change(screen.getByRole("slider", { name: /current limit/i }), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("radio", { name: /3V3 rail, 1 V/i }));
    fireEvent.click(part("C5"));
    expect(hoverText()).toMatch(/^C5 \(22 µF\): \d+ °C, probe \d+ mV/);
    expect(screen.getByTestId("hunt-selection").textContent).toMatch(/Selected: C5/);
    expect(screen.getByTestId("hunt-message").textContent).toMatch(/new board is on the bench/i);
    expect(screen.getByRole("button", { name: /^desolder C5$/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(screen.queryByRole("button", { name: /^desolder C5$/i })).toBeNull();
    fireEvent.click(part("C7"));
    expect(screen.getByTestId("hunt-selection").textContent).toMatch(/Selected: C7/);
  });

  it("a wrong guess leaves the short, the right part clears it", () => {
    render(<DebugFlowchart />);
    desolder("C7");
    expect(screen.getByTestId("hunt-message").textContent).toMatch(/removed C7.*no change/i);
    expect(screen.getByTestId("hunt-rail").textContent).toMatch(/pulled to ground/);
    desolder("C5");
    expect(screen.getByTestId("hunt-message").textContent).toMatch(/that was it.*tantalum.*1 wrong guess/i);
    expect(screen.getByTestId("hunt-rail").textContent).toMatch(/3\.30 V, healthy/);
    expect(screen.getByTestId("hunt-supply").textContent).toMatch(/0\.07 A/);
  });

  it("New board picks a different fault and restores the parts", () => {
    render(<DebugFlowchart />);
    desolder("C5");
    expect(screen.getByTestId("hunt-message").textContent).toMatch(/that was it/i);
    fireEvent.click(screen.getByRole("button", { name: /new board/i }));
    expect(screen.getByTestId("hunt-message").textContent).toMatch(/new board/i);
    desolder("C5");
    expect(screen.getByTestId("hunt-message").textContent).toMatch(/removed C5.*no change/i);
  });
});

describe("SchematicToLayout", () => {
  const slider = () => screen.getByRole("slider", { name: /design progress/i });
  const stage = () => screen.getByTestId("stl-stage").textContent ?? "";
  const counters = () => screen.getByTestId("stl-counters").textContent ?? "";

  it("moves through the five stages as the slider scrubs", () => {
    render(<SchematicToLayout />);
    expect(stage()).toMatch(/1\. Schematic/);
    fireEvent.change(slider(), { target: { value: "25" } });
    expect(stage()).toMatch(/2\. Update PCB/);
    fireEvent.change(slider(), { target: { value: "44" } });
    expect(stage()).toMatch(/3\. Ratsnest/);
    fireEvent.change(slider(), { target: { value: "70" } });
    expect(stage()).toMatch(/4\. Routing/);
    fireEvent.change(slider(), { target: { value: "100" } });
    expect(stage()).toMatch(/5\. Ground pour/);
  });

  it("places footprints, then routes the unrouted connections down to zero", () => {
    render(<SchematicToLayout />);
    expect(counters()).toMatch(/placed 0 \//);
    fireEvent.change(slider(), { target: { value: "40" } });
    expect(counters()).toMatch(new RegExp(`placed ${parts.length} / ${parts.length}`));
    const unrouted = () => numberAfter(counters(), /connections (\d+) of/);
    const total = nets.length + 1;
    fireEvent.change(slider(), { target: { value: "45" } });
    expect(unrouted()).toBe(total);
    fireEvent.change(slider(), { target: { value: "70" } });
    const mid = unrouted();
    expect(mid).toBeLessThan(total);
    expect(mid).toBeGreaterThan(1);
    fireEvent.change(slider(), { target: { value: "100" } });
    expect(unrouted()).toBe(0);
  });

  it("jump buttons set the slider and the drawing changes with it", () => {
    const { container } = render(<SchematicToLayout />);
    const polylines = () => container.querySelectorAll("svg polyline[stroke-dasharray]").length;
    const before = polylines();
    fireEvent.click(screen.getByRole("radio", { name: "Routing" }));
    expect(stage()).toMatch(/4\. Routing/);
    expect(polylines()).toBeGreaterThan(before);
    fireEvent.click(screen.getByRole("radio", { name: "Schematic" }));
    expect(stage()).toMatch(/1\. Schematic/);
  });

  it("play advances the progress and the replay button restarts it", () => {
    render(<SchematicToLayout />);
    fireEvent.change(slider(), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /^(play|pause)$/i }));
    expect(Number((slider() as HTMLInputElement).value)).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(Number((slider() as HTMLInputElement).value)).toBe(0);
  });
});

describe("board layout data", () => {
  it("keeps every part on the board and out of other parts", () => {
    for (let i = 0; i < parts.length; i++) {
      const a = partBox(parts[i]);
      expect(a.x0, parts[i].ref).toBeGreaterThanOrEqual(0);
      expect(a.y0, parts[i].ref).toBeGreaterThanOrEqual(0);
      expect(a.x1, parts[i].ref).toBeLessThanOrEqual(BOARD.w);
      expect(a.y1, parts[i].ref).toBeLessThanOrEqual(BOARD.h);
      for (let j = i + 1; j < parts.length; j++) {
        const b = partBox(parts[j]);
        const overlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > -0.1 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > -0.1;
        expect(overlap, `${parts[i].ref} overlaps ${parts[j].ref}`).toBe(false);
      }
    }
  });

  it("routes nets on the same layer without copper collisions or keep-out violations", () => {
    const segs = nets.flatMap((n) =>
      n.routes.flatMap((r) =>
        r.pts.slice(1).map((p, i) => ({ net: n.id, layer: r.layer, a: r.pts[i], b: p, w: NET_WIDTH[n.cls] })),
      ),
    );
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const s = segs[i];
        const u = segs[j];
        if (s.net === u.net || s.layer !== u.layer) continue;
        const gap = distSegmentSegment(s.a, s.b, u.a, u.b) - s.w / 2 - u.w / 2;
        expect(gap, `${s.net} vs ${u.net}`).toBeGreaterThanOrEqual(0.15);
      }
    }
    for (const n of nets) {
      for (const r of n.routes) {
        for (const [x, y] of r.pts) {
          const inKeepout = x > antennaKeepout.x && y > antennaKeepout.y && y < antennaKeepout.y + antennaKeepout.h;
          expect(inKeepout, `${n.id} enters the antenna keep-out`).toBe(false);
        }
      }
    }
  });
});

describe("placement plan figure", () => {
  it("labels the four zones and the antenna keep-out", () => {
    const { container } = render(<PlacementPlan />);
    const text = container.textContent ?? "";
    for (const zone of ["Motor driver", "Power entry", "ESP32 and logic", "Sensor edge", "antenna keep-out"]) expect(text).toContain(zone);
  });
});

/**
 * Hydration safety. Server and browser may run different JavaScript engines, and sin, cos, exp, tan and friends can differ in the
 * last digit between them. Any such value printed unrounded into the markup is a hydration mismatch. This renders every lesson
 * twice, the second time with those functions nudged by a few ulps, and requires identical markup.
 */
function nudge(x: number): number {
  if (!Number.isFinite(x) || Number.isInteger(x)) return x; // exact results (cos 0, exp 0, log10 100) are specified, so leave them
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  view.setBigUint64(0, view.getBigUint64(0) + BigInt(x > 0 ? 4 : -4)); // 4 ulps: well above the 1 to 2 ulp that engines disagree by
  return view.getFloat64(0);
}

function renderWithNudgedMath(Lesson: ComponentType): string {
  const names = ["exp", "sin", "cos", "tan", "atan2", "log", "log10", "pow", "hypot"] as const;
  const saved = Object.fromEntries(names.map((n) => [n, Math[n]])) as Record<(typeof names)[number], (...a: number[]) => number>;
  try {
    for (const n of names) (Math as unknown as Record<string, unknown>)[n] = (...a: number[]) => nudge(saved[n](...a));
    return renderToStaticMarkup(<Lesson />);
  } finally {
    for (const n of names) (Math as unknown as Record<string, unknown>)[n] = saved[n];
  }
}

describe.each(cases)("hydration safety: $slug", ({ Lesson }) => {
  it("prints the same markup whatever the last digit of sin, cos, exp, tan and log is", () => {
    const exact = renderToStaticMarkup(<Lesson />);
    const nudged = renderWithNudgedMath(Lesson);
    if (exact !== nudged) {
      // show the first difference so the culprit is easy to find
      let i = 0;
      while (i < exact.length && exact[i] === nudged[i]) i++;
      expect.fail(`markup depends on the last digit of a transcendental function near: ...${exact.slice(Math.max(0, i - 60), i + 60)}`);
    }
    expect(nudged.length).toBeGreaterThan(5000);
  });
});

describe.each(cases)("hydration: $slug", ({ Lesson }) => {
  it("hydrates its server-rendered markup with no mismatch warning and no recoverable error", async () => {
    const html = renderToString(<Lesson />);
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = html;
    const problems: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      problems.push(args.map(String).join(" ").slice(0, 300));
    });
    // Testing Library flips this flag between tests; React's own act() needs it on.
    const env = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previous = env.IS_REACT_ACT_ENVIRONMENT;
    env.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      await act(async () => {
        hydrateRoot(container, <Lesson />, { onRecoverableError: (e) => problems.push(`recoverable: ${String(e).slice(0, 300)}`) });
      });
    } finally {
      env.IS_REACT_ACT_ENVIRONMENT = previous;
      spy.mockRestore();
      container.remove();
    }
    expect(problems.join("\n")).toBe("");
  });
});
