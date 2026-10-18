import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import type { LessonData } from "@/lib/curriculum";
import { BRepExplorer } from "@/components/viz/ai-design/BRepExplorer";
import { ParametricBracket } from "@/components/viz/ai-design/ParametricBracket";
import { DesignPipeline } from "@/components/viz/ai-design/DesignPipeline";
import { McpSequence } from "@/components/viz/ai-design/McpSequence";
import { BracketScene, type SceneHighlight, type Selection } from "@/components/viz/ai-design/BracketScene";
import { CurveArrow } from "@/components/viz/ai-design/ui";
import { SvgCanvas } from "@/components/viz/shared";
import {
  ALL_FEATURES,
  AL_DENSITY,
  DEFAULT_PARAMS,
  bracketVolume,
  buildBracket,
  dfmChecks,
  makeView,
  rebuild,
  toScreen,
  type BracketParams,
  type Features,
} from "@/components/viz/ai-design/bracketModel";
import { DEFECTS, STAGES, buildScript, snapshotAt, type DefectId } from "@/components/viz/ai-design/pipelineModel";
import { FAIL_ROW, LIFELINES, PASS_ROW, ROWS } from "@/components/viz/ai-design/mcpModel";
import CadKernels from "@/content/ai-design/cad-kernels-and-parametric-design";
import cadKernelsData from "@/content/ai-design/cad-kernels-and-parametric-design.data";
import AiAgents from "@/content/ai-design/ai-agents-for-hardware-design";
import aiAgentsData from "@/content/ai-design/ai-agents-for-hardware-design.data";
import ClaudeCadTool from "@/content/ai-design/build-a-claude-cad-tool";
import claudeCadToolData from "@/content/ai-design/build-a-claude-cad-tool.data";

afterEach(cleanup);

const lessons: Array<{ slug: string; Lesson: ComponentType; data: LessonData }> = [
  { slug: "cad-kernels-and-parametric-design", Lesson: CadKernels, data: cadKernelsData },
  { slug: "ai-agents-for-hardware-design", Lesson: AiAgents, data: aiAgentsData },
  { slug: "build-a-claude-cad-tool", Lesson: ClaudeCadTool, data: claudeCadToolData },
];

/** Words in #theory: every text node except the heading, figures and SVG labels (code blocks and callouts count). */
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
    const controls = container.querySelectorAll('#viz input[type="range"], #viz [role="radiogroup"], #viz [role="switch"], #viz button');
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

  it("does not give the quiz answers away by length", () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const sizes = data.quiz.map((q) => ({
      correct: q.choices[q.answer].length,
      others: q.choices.filter((_, i) => i !== q.answer).map((c) => c.length),
    }));
    const longest = sizes.filter((x) => x.correct > Math.max(...x.others)).length;
    const shortest = sizes.filter((x) => x.correct < Math.min(...x.others)).length;
    // a strictly longest (or strictly shortest) key is a tell when it happens in most questions
    expect(longest / sizes.length, "share of questions where the correct choice is strictly the longest").toBeLessThanOrEqual(0.4);
    expect(shortest / sizes.length, "share of questions where the correct choice is strictly the shortest").toBeLessThanOrEqual(0.4);
    const ratios = sizes.map((x) => x.correct / mean(x.others));
    expect(mean(ratios), "mean ratio of the correct length to the mean distractor length").toBeGreaterThan(0.85);
    expect(mean(ratios), "mean ratio of the correct length to the mean distractor length").toBeLessThan(1.2);
    for (const r of ratios) {
      expect(r).toBeGreaterThan(0.6);
      expect(r).toBeLessThan(1.5);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Viz tests. Animations start paused under reduced motion, so stepping is deterministic.
// ---------------------------------------------------------------------------------------------

const realMatchMedia = typeof window !== "undefined" ? window.matchMedia : undefined;
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterAll(() => {
  if (realMatchMedia) window.matchMedia = realMatchMedia;
});

describe("bracket model", () => {
  const m = buildBracket(DEFAULT_PARAMS);

  it("matches the hand-counted topology: 11 faces, 27 edges, 18 vertices", () => {
    expect([m.faces.length, m.edges.length, m.vertices.length]).toEqual([11, 27, 18]);
    expect(m.wires).toBe(15);
    expect(m.euler.rings).toBe(4);
    expect(m.euler.chi).toBe(-2);
    expect(m.faces.filter((f) => f.surface === "plane").length).toBe(8);
    expect(m.edges.filter((e) => e.curve === "line").length).toBe(21);
    expect(m.edges.filter((e) => e.curve === "arc").length).toBe(2);
    expect(m.edges.filter((e) => e.curve === "circle").length).toBe(4);
  });

  const subsets: Features[] = [];
  for (const fillet of [false, true]) for (const baseHole of [false, true]) for (const flangeHole of [false, true]) subsets.push({ fillet, baseHole, flangeHole });
  it.each(subsets)("satisfies Euler-Poincaré for every feature subset: %o", (f) => {
    const model = buildBracket(DEFAULT_PARAMS, f);
    expect(model.euler.chi).toBe(2 - 2 * model.euler.genus);
    expect(model.euler.genus).toBe((f.baseHole ? 1 : 0) + (f.flangeHole ? 1 : 0));
  });

  it("links every edge to real faces and vertices, and every face use is mirrored", () => {
    const faceIds = new Set(m.faces.map((f) => f.id));
    const vertexIds = new Set(m.vertices.map((v) => v.id));
    for (const e of m.edges) {
      for (const id of e.faceIds) expect(faceIds.has(id)).toBe(true);
      for (const id of e.vertexIds) expect(vertexIds.has(id)).toBe(true);
    }
    const uses = m.faces.reduce((n, f) => n + f.edgeIds.length, 0);
    const expected = m.edges.reduce((n, e) => n + (e.faceIds[0] === e.faceIds[1] ? 1 : 2), 0);
    expect(uses).toBe(expected);
    // seams are the only edges that touch the same face on both sides
    expect(m.edges.filter((e) => e.faceIds[0] === e.faceIds[1]).map((e) => e.key)).toEqual(["hbSeam", "hfSeam"]);
  });

  it("hides the bottom, outer flange and back faces from the isometric view", () => {
    expect(m.faces.filter((f) => !f.visible).map((f) => f.key)).toEqual(["bottom", "flangeOuter", "back"]);
    expect([m.faces, m.edges, m.vertices].map((list) => list.filter((x) => x.visible).length)).toEqual([8, 20, 15]);
  });
});

describe("rebuild and DFM rules of the parametric bracket", () => {
  it("builds all five features at the defaults, in either order, and passes DFM", () => {
    for (const order of ["fillet-first", "holes-first"] as const) {
      const r = rebuild(DEFAULT_PARAMS, order);
      expect(r.failure).toBeNull();
      expect(r.applied).toEqual(ALL_FEATURES);
      expect(dfmChecks(DEFAULT_PARAMS, r).every((c) => c.status === "pass")).toBe(true);
    }
  });

  it("fails the fillet when the hole is enlarged and the holes come first (the lesson scenario)", () => {
    const params = { length: 70, holeD: 12, fillet: 12 };
    const holesFirst = rebuild(params, "holes-first");
    expect(holesFirst.statuses.map((x) => x.state)).toEqual(["ok", "ok", "ok", "ok", "failed"]);
    expect(holesFirst.failure?.id).toBe("fillet");
    expect(holesFirst.failure?.message).toMatch(/BRep_API/);
    // the original 8.5 mm hole left 1.75 mm of face and built fine
    expect(rebuild({ ...params, holeD: 8.5 }, "holes-first").failure).toBeNull();
    // the same edit in the other order fails on the hole, with a readable cause
    const filletFirst = rebuild(params, "fillet-first");
    expect(filletFirst.failure?.id).toBe("holeFlange");
    expect(filletFirst.failure?.message).toMatch(/start of the fillet/);
  });

  it("reports a too-close hole as a DFM failure even when the rebuild succeeds", () => {
    const params = { length: 70, holeD: 12.5, fillet: 6 };
    const built = rebuild(params, "fillet-first");
    expect(built.failure).toBeNull();
    expect(dfmChecks(params, built).find((c) => c.id === "edge")?.status).toBe("fail");
  });

  it("computes volume and mass for 6061 aluminium", () => {
    const v = bracketVolume(DEFAULT_PARAMS, ALL_FEATURES);
    expect(Math.round(v)).toBe(25548);
    expect(v * AL_DENSITY).toBeCloseTo(69.0, 1);
  });
});

describe("BRepExplorer", () => {
  it("labels the toggles with entity counts and shows the Euler-Poincaré check", () => {
    render(<BRepExplorer />);
    expect(screen.getByRole("switch", { name: /faces · 11/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /edges · 27/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /vertices · 18/i })).toBeTruthy();
    expect(document.body.textContent).toMatch(/18 − 27 \+ 11 − 4 = -2/);
  });

  it("offers chips for each entity class once its toggle is on, and describes a selection", () => {
    render(<BRepExplorer />);
    expect(screen.queryByRole("button", { name: "E27" })).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: /edges/i }));
    fireEvent.click(screen.getByRole("switch", { name: /vertices/i }));
    fireEvent.click(screen.getByRole("button", { name: "E19" }));
    expect(document.body.textContent).toMatch(/F4 and F5/);
    fireEvent.click(screen.getByRole("button", { name: "V12" }));
    expect(document.body.textContent).toMatch(/Edges meeting here/);
    fireEvent.click(screen.getByRole("button", { name: "F10" }));
    expect(document.body.textContent).toMatch(/cylinder, r = 4\.25 mm, axis along z/);
    expect(document.body.textContent).toMatch(/Touches faces/);
  });
});

describe("BRepExplorer features", () => {
  it("updates the counts and the Euler check when a feature is removed", () => {
    render(<BRepExplorer />);
    fireEvent.click(screen.getByRole("switch", { name: /feature: flange hole/i }));
    expect(screen.getByRole("switch", { name: /faces · 10/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /edges · 24/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /vertices · 16/i })).toBeTruthy();
    expect(document.body.textContent).toMatch(/16 − 24 \+ 10 − 2 = 0/);
    fireEvent.click(screen.getByRole("switch", { name: /feature: base hole/i }));
    fireEvent.click(screen.getByRole("switch", { name: /feature: inside fillet/i }));
    // a plain extruded L has 12 vertices, 18 edges and 8 faces, and an Euler characteristic of 2
    expect(screen.getByRole("switch", { name: /faces · 8/i })).toBeTruthy();
    expect(document.body.textContent).toMatch(/12 − 18 \+ 8 − 0 = 2/);
  });

  it("clears the selection when a feature is removed, because ids are renumbered", () => {
    render(<BRepExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "F10" }));
    expect(document.body.textContent).toMatch(/Face F10/);
    fireEvent.click(screen.getByRole("switch", { name: /feature: base hole/i }));
    expect(document.body.textContent).not.toMatch(/Face F10/);
  });
});

describe("BRepExplorer drawing", () => {
  /** SVG shapes carry a <title> child; Testing Library only matches the root one, so find the shape by hand. */
  const shapeTitled = (root: HTMLElement, text: string): Element => {
    const title = [...root.querySelectorAll("title")].find((t) => t.textContent === text);
    if (!title?.parentElement) throw new Error(`no SVG shape titled "${text}"`);
    return title.parentElement;
  };

  it("selects faces, edges and vertices when their shapes are clicked", () => {
    const { container } = render(<BRepExplorer />);
    fireEvent.click(shapeTitled(container, "F3 base top"));
    expect(document.body.textContent).toMatch(/Face F3: base top/);
    fireEvent.click(screen.getByRole("switch", { name: /edges/i }));
    fireEvent.click(screen.getByRole("switch", { name: /vertices/i }));
    fireEvent.click(shapeTitled(container, "E19: line, 40 mm"));
    expect(document.body.textContent).toMatch(/Edge E19/);
    fireEvent.click(shapeTitled(container, "V12 at (6.0, 40.0, 12.0) mm"));
    expect(document.body.textContent).toMatch(/Vertex V12/);
  });

  it("does not let a hidden ghost face steal clicks from the visible face above it", () => {
    const { container } = render(<BRepExplorer />);
    const ghosts = [...container.querySelectorAll("path")].filter((p) => p.getAttribute("stroke-dasharray") === "6 4");
    expect(ghosts.length).toBe(3);
    for (const g of ghosts) expect((g as SVGElement).style.pointerEvents).toBe("none");
  });
});

describe("ParametricBracket", () => {
  it("regenerates the drawing and the readouts when a slider moves", () => {
    const { container } = render(<ParametricBracket />);
    const before = container.textContent ?? "";
    fireEvent.change(screen.getByRole("slider", { name: /base length/i }), { target: { value: "100" } });
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toMatch(/base length 100 mm/);
    expect(container.textContent).not.toBe(before);
    expect(screen.getByRole("status").textContent).toMatch(/Rebuild OK/);
  });

  it("reproduces the failure, and the error moves when the feature order flips", () => {
    render(<ParametricBracket />);
    fireEvent.click(screen.getByRole("button", { name: /reproduce the failure/i }));
    expect(screen.getByRole("status").textContent).toMatch(/Rebuild failed at feature 5 of 5/);
    expect(document.body.textContent).toMatch(/BRep_API/);
    fireEvent.click(screen.getByRole("radio", { name: /fillet first/i }));
    expect(screen.getByRole("status").textContent).toMatch(/Rebuild failed/);
    expect(document.body.textContent).toMatch(/break into the curved face/);
    expect(document.body.textContent).not.toMatch(/BRep_API/);
  });
});

describe("pipeline model", () => {
  it("passes all 14 checks on a clean run", () => {
    const events = buildScript("none", true);
    expect(events.length).toBe(STAGES.length * 3 + 1);
    const snap = snapshotAt(events, events.length - 1);
    expect(snap.finished).toBe(true);
    expect(snap.stages.every((s) => s === "pass")).toBe(true);
    expect(snap.checks.flat().every((c) => c === "pass")).toBe(true);
  });

  const injectable = DEFECTS.filter((d) => d.id !== "none");
  it.each(injectable)("catches the $id defect at stage $stage and loops back to stage $retryTo", (defect) => {
    const events = buildScript(defect.id, true);
    const failures = events.flatMap((e, i) => (e.kind === "check" && e.result === "fail" ? [{ e, i }] : []));
    expect(failures.length).toBe(1);
    const { e, i } = failures[0];
    expect(e.kind === "check" && [e.stage, e.check]).toEqual([defect.stage, defect.check]);
    const retry = events[i + 1];
    expect(retry).toMatchObject({ kind: "retry", from: defect.stage, to: defect.retryTo });
    // the stages between the fix and the catch run again, in order
    const reentered = events.slice(i + 2).filter((x) => x.kind === "enter").map((x) => (x.kind === "enter" ? x.stage : -1));
    expect(reentered.slice(0, defect.stage - defect.retryTo + 1)).toEqual(Array.from({ length: defect.stage - defect.retryTo + 1 }, (_, k) => defect.retryTo + k));
    const final = snapshotAt(events, events.length - 1);
    expect(final.finished && final.stages.every((s) => s === "pass")).toBe(true);
  });

  it("catches an undersized compressor before any geometry exists", () => {
    const events = buildScript("compressor", true);
    const at = events.findIndex((e) => e.kind === "check" && e.result === "fail");
    const snap = snapshotAt(events, at);
    expect(snap.stages[3]).toBe("fail");
    expect(snap.stages.slice(4)).toEqual(["idle", "idle", "idle"]);
  });

  it("lets a hidden fastener reach the shop floor when no DFA check is written", () => {
    const events = buildScript("fastener", false);
    expect(events.some((e) => e.kind === "check" && e.result === "fail")).toBe(false);
    expect(events.some((e) => e.kind === "check" && e.result === "skipped")).toBe(true);
    const snap = snapshotAt(events, events.length - 1);
    expect(snap.escaped).toBe(true);
    const withDfa = snapshotAt(buildScript("fastener", true), buildScript("fastener", true).length - 1);
    expect(withDfa.escaped).toBe(false);
  });

  it("keeps the defect list and the stage list in step", () => {
    const ids: DefectId[] = ["none", "bend", "edge", "compressor", "fastener"];
    expect(DEFECTS.map((d) => d.id)).toEqual(ids);
    for (const s of STAGES) expect(s.checks.length).toBe(2);
  });
});

describe("DesignPipeline", () => {
  it("shows the inputs and outputs of a clicked stage", () => {
    render(<DesignPipeline />);
    fireEvent.click(screen.getByRole("button", { name: /5 geometry/i }));
    expect(document.body.textContent).toMatch(/B-rep assembly exported as STEP/);
    expect(document.body.textContent).toMatch(/\(pinned\)/);
    fireEvent.click(screen.getByRole("button", { name: /follow the animation/i }));
    expect(document.body.textContent).toMatch(/following the animation/);
  });

  it("injects a defect, shows the DFM catch and then the retry loop", () => {
    render(<DesignPipeline />);
    fireEvent.click(screen.getByRole("button", { name: /inject a defect/i }));
    fireEvent.click(screen.getByRole("button", { name: /^pause$/i }));
    for (let i = 0; i < 40 && !/DFM FAIL/.test(screen.getByRole("status").textContent ?? ""); i++) fireEvent.click(screen.getByRole("button", { name: /^step$/i }));
    expect(screen.getByRole("status").textContent).toMatch(/DFM FAIL: suction-line bend R18 mm/);
    fireEvent.click(screen.getByRole("button", { name: /^step$/i }));
    expect(screen.getByRole("status").textContent).toMatch(/Diagnostics return to the geometry stage/);
  });

  it("shows the escape banner for a hidden fastener with the DFA check off", () => {
    render(<DesignPipeline />);
    fireEvent.click(screen.getByRole("radio", { name: /hidden fastener/i }));
    fireEvent.click(screen.getByRole("switch", { name: /assembly-access/i }));
    fireEvent.click(screen.getByRole("button", { name: /^pause$/i }));
    for (let i = 0; i < 40; i++) fireEvent.click(screen.getByRole("button", { name: /^step$/i }));
    expect(document.body.textContent).toMatch(/Defect escaped: found on the shop floor/);
  });
});

describe("McpSequence", () => {
  it("tells one consistent story: list, call, DFM failure, retry, pass, export", () => {
    expect(ROWS.length).toBe(20);
    expect(ROWS[0].label).toBe("tools/list");
    expect(ROWS[FAIL_ROW].kind).toBe("fail");
    expect(ROWS[PASS_ROW].kind).toBe("pass");
    expect(ROWS[FAIL_ROW].payload).toMatch(/2\.76/);
    expect(ROWS[PASS_ROW].payload).toMatch(/3\.8/);
    for (const r of ROWS) {
      expect(r.from).toBeLessThan(LIFELINES.length);
      expect(r.to).toBeLessThan(LIFELINES.length);
      expect(r.caption.length).toBeGreaterThan(30);
    }
    expect(ROWS.filter((r) => r.label.startsWith("export_step")).length).toBe(1);
    expect(ROWS.findIndex((r) => r.label.startsWith("export_step"))).toBeGreaterThan(PASS_ROW);
  });

  it("jumps to the failure and the pass and shows each payload", () => {
    render(<McpSequence />);
    fireEvent.click(screen.getByRole("button", { name: /jump to the dfm failure/i }));
    expect(document.body.textContent).toMatch(/hole_to_edge/);
    expect(document.body.textContent).toMatch(/tool result: failed check/);
    fireEvent.click(screen.getByRole("button", { name: /jump to the pass/i }));
    expect(document.body.textContent).toMatch(/"pass": true/);
    fireEvent.click(screen.getByRole("button", { name: /jump to the end/i }));
    expect(document.body.textContent).toMatch(/message 20 of 20/);
  });

  it("advances one message per Step press while paused", () => {
    render(<McpSequence />);
    expect(document.body.textContent).toMatch(/message 1 of 20/);
    fireEvent.click(screen.getByRole("button", { name: /^step$/i }));
    expect(document.body.textContent).toMatch(/message 2 of 20/);
    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(document.body.textContent).toMatch(/message 1 of 20/);
  });
});

describe("numbers quoted in the lessons follow from the geometry", () => {
  /** volume of a plate with four corner holes, a centre bore and rounded corners */
  const plateVolume = (L: number, W: number, T: number, holeD: number, bore: number, corner: number) =>
    L * W * T - 4 * (1 - Math.PI / 4) * corner * corner * T - Math.PI * (bore / 2) ** 2 * T - 4 * Math.PI * (holeD / 2) ** 2 * T;

  it("matches the build123d examples and the MCP example conversation", () => {
    expect(plateVolume(80, 40, 6, 6.5, 0, 4)).toBeCloseTo(18321.2, 1);
    expect(Math.round(plateVolume(50, 50, 6, 3.4, 22.5, 4))).toBe(12314);
    const volumes = [0, 8, 4].map((r) => Math.round(plateVolume(42, 42, 6, 3.4, 22.5, r)));
    expect(volumes).toEqual([7980, 7651, 7898]);
    const story = ROWS.map((r) => r.payload).join("\n");
    for (const v of volumes) expect(story).toContain(String(v));
  });

  it("matches the rim-to-edge distances behind the DFM failure and the retry", () => {
    const hole = 15.5;
    const arcGap = (r: number) => r - Math.hypot(hole - (21 - r), hole - (21 - r)) - 1.7; // hole centre inside the corner arc
    expect(arcGap(8)).toBeCloseTo(2.76, 2);
    expect(21 - hole - 1.7).toBeCloseTo(3.8, 6);
    expect(hole * Math.SQRT2 - 11.25 - 1.7).toBeCloseTo(8.97, 2); // hole to bore ligament
  });

  it("matches the counting in the motor-mount practice", () => {
    const faces = 6 + 4 + 5;
    const edges = 24 + 5 * 3;
    const vertices = 16 + 5 * 2;
    expect([faces, edges, vertices]).toEqual([15, 39, 26]);
    expect(vertices - edges + faces - 10).toBe(2 - 2 * 5);
    // a box with one through-hole
    expect([8 + 2, 12 + 3, 6 + 1]).toEqual([10, 15, 7]);
    expect(10 - 15 + 7 - 2).toBe(2 - 2 * 1);
  });

  it("matches the STL and heat-pump arithmetic", () => {
    // 20 mm sphere within 0.01 mm: triangles of circumradius sqrt(2 r s)
    const r = 10;
    const rho = Math.sqrt(2 * r * 0.01);
    const side = rho * Math.sqrt(3);
    const triangles = (4 * Math.PI * r * r) / ((Math.sqrt(3) / 4) * side * side);
    expect(triangles).toBeGreaterThan(4500);
    expect(triangles).toBeLessThan(5200);
    expect(80 + 4 + 50 * Math.round(triangles)).toBeLessThan(260_000);
    // Carnot, COP, energy balance, minimum circuit ampacity
    const carnot = (35 + 273.15) / (35 - 7);
    expect(carnot).toBeCloseTo(11.0, 1);
    expect(10.2 / 2.4).toBeCloseTo(4.25, 2);
    expect(10.2 / 2.4 / carnot).toBeCloseTo(0.39, 2);
    expect(Math.abs(10.2 - (7.5 + 2.4)) / 10.2).toBeCloseTo(0.029, 3);
    expect(1.25 * 11.5 + 1.2).toBeCloseTo(15.6, 1);
    expect(6.8 / carnot).toBeGreaterThan(0.55);
    expect(Math.abs(9.5 - (7.5 + 2.4)) / 9.5).toBeCloseTo(0.042, 3);
  });
});

describe("the MCP server listing", () => {
  it("is a complete, tested-shape MCPServer listing of about 140 lines that never prints to stdout", () => {
    const { container } = render(<ClaudeCadTool />);
    const code = [...container.querySelectorAll("code")].map((c) => c.textContent ?? "").find((t) => t.includes("MCPServer(")) ?? "";
    const lines = code.split("\n").length;
    expect(lines).toBeGreaterThan(120);
    expect(lines).toBeLessThan(160);
    for (const tool of ["make_box", "make_plate_with_holes", "fillet_edges", "export_step", "dfm_check"]) expect(code).toContain(`def ${tool}(`);
    expect((code.match(/@mcp\.tool\(\)/g) ?? []).length).toBe(5);
    expect(code).toContain("mcp.run()");
    expect(code).not.toMatch(/\bprint\(/);
    // mcp 2.x: MCPServer from mcp.server.mcpserver, pinned below 3, and every deliberate rejection is a ToolError so its text reaches the model
    expect(code).toContain('"mcp>=2,<3"');
    expect(code).toContain("from mcp.server.mcpserver import MCPServer");
    expect(code).toContain("from mcp.server.mcpserver.exceptions import ToolError");
    expect(code).not.toMatch(/raise ValueError\(/);
    expect((code.match(/raise ToolError\(/g) ?? []).length).toBeGreaterThanOrEqual(7);
    // declared return types give every tool an output schema and a structuredContent copy of its result
    expect((code.match(/-> dict\[str, Any\]:/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(code).not.toMatch(/-> dict:/);
    // the thinnest-wall search starts from the smallest bounding-box dimension, in x, y and z
    expect(code).toMatch(/wall = min\(size\.X, size\.Y, size\.Z\)/);
    expect(container.textContent).toMatch(/claude_desktop_config\.json/);
    expect(container.textContent).toMatch(/mcpServers/);
  });

  it("agrees with the payloads shown in the sequence diagram", () => {
    const { container } = render(<ClaudeCadTool />);
    const text = [...container.querySelectorAll("code")].map((c) => c.textContent ?? "");
    const code = text.find((t) => t.includes("MCPServer(")) ?? "";
    // structuredContent and outputSchema appear in the payloads exactly when the listing declares return types
    const declared = !/-> dict:/.test(code) && /-> dict\[str, Any\]:/.test(code);
    const story = ROWS.map((r) => r.payload).join("\n");
    expect(story.includes("structuredContent")).toBe(declared);
    expect(story.includes("outputSchema")).toBe(declared);
    // the text block of a result is the dict as indent-2 JSON, with newlines escaped on the wire
    expect(ROWS[5].payload).toContain('\\n  \\"name\\"');
    // the example conversation and the sequence quote the same failure and the same pass
    const conversation = text.find((t) => t.startsWith("You: Design a mounting plate")) ?? "";
    for (const row of [ROWS[FAIL_ROW], ROWS[PASS_ROW]]) {
      const numbers = row.payload.match(/\d+\.\d+/g) ?? [];
      for (const n of numbers) expect(conversation, `the conversation should quote ${n}`).toContain(n);
    }
  });

  it("tests a thin wall in x, y and z in its pytest examples", () => {
    const { container } = render(<ClaudeCadTool />);
    const tests = [...container.querySelectorAll("code")].map((c) => c.textContent ?? "").find((t) => t.includes("def test_export_refuses_a_thin_part")) ?? "";
    for (const size of ["(40, 40, 1.0)", "(1.0, 40, 40)", "(40, 1.0, 40)"]) expect(tests).toContain(size);
  });
});

// ---------------------------------------------------------------------------------------------
// Hydration stability. Server and browser engines can differ in the last bits of sin, cos, atan2, sqrt and
// friends. Any such value that reaches markup unrounded makes the hydrated page differ from the server HTML.
// These tests render the same markup with those functions nudged by one part in 10^14 and require identical
// output, over many more states than the initial render that tests/hydration-stability.test.tsx covers.
// ---------------------------------------------------------------------------------------------

const NUDGE = 1 + 1e-14;
const NUDGED = ["sin", "cos", "tan", "atan2", "atan", "asin", "acos", "exp", "log", "log10", "sqrt", "pow", "hypot", "cbrt"] as const;

function withNudgedMath<T>(fn: () => T): T {
  const saved = new Map<string, (...args: number[]) => number>();
  for (const name of NUDGED) {
    const original = Math[name] as (...args: number[]) => number;
    saved.set(name, original);
    (Math as unknown as Record<string, unknown>)[name] = (...args: number[]) => {
      const v = original(...args);
      return v === 0 || !Number.isFinite(v) ? v : v * NUDGE;
    };
  }
  try {
    return fn();
  } finally {
    for (const [name, original] of saved) (Math as unknown as Record<string, unknown>)[name] = original;
  }
}

/** Attribute values containing a number with four or more decimals are almost always an unrounded float. */
const LONG_DECIMAL = /="[^"]*\d\.\d{4,}[^"]*"/g;

interface SceneState {
  name: string;
  params: BracketParams;
  features: Features;
  highlight: SceneHighlight;
  selected: Selection | null;
  dims: boolean;
}
const ON: SceneHighlight = { faces: true, edges: true, vertices: true, xray: true };
const sceneStates: SceneState[] = [
  { name: "defaults, everything highlighted", params: DEFAULT_PARAMS, features: ALL_FEATURES, highlight: ON, selected: null, dims: false },
  { name: "defaults, plain with dimensions", params: DEFAULT_PARAMS, features: ALL_FEATURES, highlight: { faces: false, edges: false, vertices: false, xray: false }, selected: null, dims: true },
  { name: "selected face F4 (the fillet)", params: DEFAULT_PARAMS, features: ALL_FEATURES, highlight: ON, selected: { kind: "face", id: "F4" }, dims: false },
  { name: "selected hidden face F1", params: DEFAULT_PARAMS, features: ALL_FEATURES, highlight: ON, selected: { kind: "face", id: "F1" }, dims: false },
  { name: "selected edge E24 (a seam)", params: DEFAULT_PARAMS, features: ALL_FEATURES, highlight: ON, selected: { kind: "edge", id: "E24" }, dims: false },
  { name: "selected vertex V17", params: DEFAULT_PARAMS, features: ALL_FEATURES, highlight: ON, selected: { kind: "vertex", id: "V17" }, dims: false },
  { name: "short base, big hole, R16", params: { length: 50, holeD: 14, fillet: 16 }, features: ALL_FEATURES, highlight: ON, selected: null, dims: true },
  { name: "long base, small hole, no fillet", params: { length: 100, holeD: 4, fillet: 0 }, features: { fillet: false, baseHole: true, flangeHole: true }, highlight: ON, selected: null, dims: true },
  { name: "odd values, fillet only", params: { length: 63, holeD: 9.5, fillet: 7.5 }, features: { fillet: true, baseHole: false, flangeHole: false }, highlight: ON, selected: null, dims: true },
  { name: "plain extruded L", params: DEFAULT_PARAMS, features: { fillet: false, baseHole: false, flangeHole: false }, highlight: ON, selected: null, dims: true },
];

function sceneMarkup(state: SceneState): string {
  const model = buildBracket(state.params, state.features);
  const view = makeView(100, 440, 400, 14);
  return renderToStaticMarkup(
    <SvgCanvas viewBox="0 0 440 400" title={state.name}>
      <BracketScene model={model} view={view} highlight={state.highlight} selected={state.selected} dims={state.dims} labels />
    </SvgCanvas>,
  );
}

describe("hydration stability", () => {
  it.each(sceneStates)("the bracket drawing does not depend on last-bit float differences: $name", (state) => {
    const plain = sceneMarkup(state);
    const nudged = withNudgedMath(() => sceneMarkup(state));
    expect(nudged).toBe(plain);
    expect(plain.match(LONG_DECIMAL)).toBeNull();
  });

  it("projects model points to coordinates rounded to two decimals", () => {
    const view = makeView(100, 440, 400, 14);
    for (const p of [[0, 0, 0], [70, 40, 6], [12.345, 7.891, 33.3333], [100, 40, 44]] as const) {
      const { x, y } = toScreen(view, [...p]);
      expect(Math.round(x * 100) / 100).toBe(x);
      expect(Math.round(y * 100) / 100).toBe(y);
    }
  });

  const arrows: Array<[number, number, number, number, number, number]> = [
    [382, 112, 328, 58, 277.5, 109],
    [490, 112, 328, -46, 166, 109],
    [598, 168, 544, 206, 500, 171],
    [706, 168, 598, 318, 480, 171],
    [635, 62, 543, 4, 451, 60],
    [451, 292, 543, 346, 635, 294],
    [10, 10, 33.3, 77.7, 91.1, 12.2],
  ];
  it.each(arrows)("a curved arrow from (%f, %f) via (%f, %f) to (%f, %f) has stable, short numbers", (x1, y1, cx, cy, x2, y2) => {
    const markup = () => renderToStaticMarkup(createElement("svg", null, createElement(CurveArrow, { x1, y1, cx, cy, x2, y2, dashed: true, dashOffset: -12.3456789 })));
    const plain = markup();
    expect(withNudgedMath(markup)).toBe(plain);
    expect(plain.match(LONG_DECIMAL)).toBeNull();
  });

  it.each(lessons)("the initial markup of $slug does not depend on last-bit float differences", ({ Lesson }) => {
    const plain = renderToStaticMarkup(createElement(Lesson));
    const nudged = withNudgedMath(() => renderToStaticMarkup(createElement(Lesson)));
    expect(plain.length).toBeGreaterThan(1000);
    expect(nudged).toBe(plain);
    expect(plain.match(LONG_DECIMAL)).toBeNull();
  });

  it.each([
    ["BRepExplorer", BRepExplorer],
    ["ParametricBracket", ParametricBracket],
    ["DesignPipeline", DesignPipeline],
    ["McpSequence", McpSequence],
  ] as Array<[string, ComponentType]>)("%s renders identical, short-number markup under nudged math", (_name, Viz) => {
    const plain = renderToStaticMarkup(createElement(Viz));
    const nudged = withNudgedMath(() => renderToStaticMarkup(createElement(Viz)));
    expect(nudged).toBe(plain);
    expect(plain.match(LONG_DECIMAL)).toBeNull();
  });
});
