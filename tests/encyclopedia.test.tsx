import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { EncyclopediaBrowser } from "@/components/encyclopedia/EncyclopediaBrowser";
import { entries } from "@/components/encyclopedia/entries";
import { rankEntries } from "@/components/encyclopedia/search";
import { categoryLabels, type ComponentCategory } from "@/components/encyclopedia/types";
import { lessonBySlug } from "@/lib/curriculum";

/** The ids the plan calls for, grouped by category. */
const planned: Record<string, string[]> = {
  passive: ["resistor", "capacitor-ceramic", "capacitor-electrolytic", "inductor", "ferrite-bead", "crystal"],
  semiconductor: ["diode", "zener-diode", "schottky-diode", "led", "bjt", "mosfet", "igbt", "sic-mosfet", "wafer-and-die"],
  active: ["op-amp", "ldo-regulator", "buck-converter", "tvs-diode"],
  compute: ["microcontroller", "fpga"],
  sensor: ["ultrasonic-sensor", "ir-line-sensor", "rotary-encoder", "imu", "lidar", "hall-sensor", "thermistor", "current-shunt"],
  actuator: ["dc-brushed-motor", "bldc-motor", "servo", "stepper-motor", "h-bridge-driver"],
  ev: ["li-ion-cell", "bms", "traction-inverter"],
  connector: ["jst-connector", "pin-header"],
};

const categoryOrder = Object.keys(categoryLabels) as ComponentCategory[];

const SMIL_TAGS = new Set(["animate", "animatetransform", "animatemotion", "set"]);

/** Number of SMIL timing elements below `root` (the illustrations animate with SMIL only). */
function animationCount(root: Element): number {
  return Array.from(root.querySelectorAll("*")).filter((el) => SMIL_TAGS.has(el.localName.toLowerCase())).length;
}

const NUMERIC_ATTRIBUTES = new Set(["opacity", "fill-opacity", "stroke-opacity", "r", "rx", "ry", "x", "y", "cx", "cy", "width", "height", "stroke-width", "stroke-dashoffset"]);
const COLOR_ATTRIBUTES = new Set(["fill", "stroke"]);
/** Allowed number of components per value of each animateTransform type. */
const TRANSFORM_COMPONENTS: Record<string, number[]> = { translate: [1, 2], scale: [1, 2], rotate: [1, 3], skewX: [1], skewY: [1] };

function splitList(value: string | null): string[] {
  return value === null ? [] : value.split(";").map((part) => part.trim()).filter((part) => part !== "");
}

/**
 * A browser does not report a malformed SMIL animation: it just ignores it (for example linear `keyTimes` that stop short of 1),
 * so the illustration silently stops animating. This lists everything that would make a browser ignore an animation below `root`.
 */
function smilProblems(root: Element): string[] {
  const problems: string[] = [];
  const elements = Array.from(root.querySelectorAll("*")).filter((el) => SMIL_TAGS.has(el.localName.toLowerCase()) && el.localName.toLowerCase() !== "set");
  elements.forEach((el, index) => {
    const tag = el.localName.toLowerCase();
    const where = `<${el.localName}> #${index + 1} inside <${el.parentElement?.localName ?? "?"}>`;
    const problem = (message: string) => problems.push(`${where}: ${message}`);
    const attr = (name: string) => el.getAttribute(name);
    const motion = tag === "animatemotion";

    const dur = attr("dur");
    if (dur === null || !/^\d+(\.\d+)?s$/.test(dur) || parseFloat(dur) <= 0) problem(`dur must be a positive number of seconds, got "${dur}"`);
    const begin = attr("begin");
    if (begin !== null && !/^-?\d+(\.\d+)?s$/.test(begin)) problem(`begin must be an offset in seconds, got "${begin}"`);
    if (attr("repeatCount") !== "indefinite") problem("an illustration animation should loop (repeatCount=indefinite)");

    const calcMode = attr("calcMode") ?? (motion ? "paced" : "linear");
    let count: number;
    if (motion) {
      const points = splitList(attr("keyPoints"));
      if (attr("path") === null && el.querySelector("mpath") === null) problem("animateMotion needs a path");
      if (attr("keyTimes") !== null || attr("keyPoints") !== null) {
        if (points.length === 0) problem("keyTimes on animateMotion needs keyPoints");
        if (calcMode === "paced") problem("keyPoints and keyTimes are ignored under calcMode paced, which is the default for animateMotion");
        if (points.some((v) => !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 1)) problem("keyPoints must be numbers from 0 to 1");
      }
      count = points.length;
    } else {
      const name = attr("attributeName");
      if (name === null) problem("missing attributeName");
      const values = splitList(attr("values"));
      const endpoints = [attr("from"), attr("to")].filter((v): v is string => v !== null);
      const all = values.length > 0 ? values : endpoints;
      count = values.length > 0 ? values.length : attr("to") !== null ? 2 : 0;
      if (all.length < 1 || count < 2) problem("needs at least two values (a values list, or from and to)");
      if (name !== null && NUMERIC_ATTRIBUTES.has(name) && all.some((v) => !Number.isFinite(Number(v)))) problem(`${name} values must be numbers, got "${all.join(";")}"`);
      if (name !== null && COLOR_ATTRIBUTES.has(name) && all.some((v) => !/^#[0-9a-f]{3,8}$/i.test(v))) problem(`${name} values must be hex colours, got "${all.join(";")}"`);
      if (tag === "animatetransform") {
        const type = attr("type") ?? "translate";
        const allowed = TRANSFORM_COMPONENTS[type];
        if (!allowed) problem(`unknown transform type "${type}"`);
        else {
          for (const v of all) {
            const parts = v.split(/[\s,]+/).filter(Boolean);
            if (!allowed.includes(parts.length) || parts.some((c) => !Number.isFinite(Number(c)))) problem(`${type} value "${v}" must have ${allowed.join(" or ")} numeric component(s)`);
          }
        }
      }
    }

    if (attr("keyTimes") !== null) {
      const keyTimes = splitList(attr("keyTimes")).map(Number);
      const last = keyTimes[keyTimes.length - 1];
      if (keyTimes.length !== count) problem(`keyTimes has ${keyTimes.length} entries but there are ${count} values`);
      if (keyTimes.some((t) => !Number.isFinite(t) || t < 0 || t > 1)) problem("keyTimes must be numbers from 0 to 1");
      if (keyTimes.some((t, i) => i > 0 && t < keyTimes[i - 1])) problem("keyTimes must not decrease");
      if (keyTimes[0] !== 0) problem(`keyTimes must start at 0 (starts at ${keyTimes[0]})`);
      if (calcMode !== "discrete" && last !== 1) problem(`keyTimes must end at 1 unless calcMode is discrete (ends at ${last}); the browser ignores the whole animation`);
    }

    const splines = splitList(attr("keySplines"));
    if (calcMode === "spline" || attr("keySplines") !== null) {
      if (calcMode !== "spline") problem("keySplines only apply when calcMode is spline");
      else if (splines.length !== count - 1) problem(`keySplines has ${splines.length} entries but spline mode needs ${count - 1}`);
      for (const spline of splines) {
        const n = spline.split(/[\s,]+/).filter(Boolean).map(Number);
        if (n.length !== 4 || n.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) problem(`keySplines entry "${spline}" must be four numbers from 0 to 1`);
      }
    }
  });
  return problems;
}

let restoreMatchMedia: (() => void) | null = null;

function stubReducedMotion(reduce: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  restoreMatchMedia = () => {
    window.matchMedia = original;
  };
}

afterEach(() => {
  cleanup();
  restoreMatchMedia?.();
  restoreMatchMedia = null;
});

function cardButtons(): HTMLElement[] {
  return screen.getAllByRole("button").filter((b) => b.getAttribute("aria-haspopup") === "dialog");
}

function cardNames(): string[] {
  return cardButtons().map((b) =>
    (b.getAttribute("aria-labelledby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join("")
      .trim(),
  );
}

function search(value: string) {
  fireEvent.change(screen.getByRole("searchbox", { name: /search/i }), { target: { value } });
}

describe("encyclopedia entries", () => {
  it("covers every planned id, in the planned category", () => {
    for (const [category, ids] of Object.entries(planned)) {
      const found = entries.filter((e) => e.category === category).map((e) => e.id);
      expect(found.slice().sort(), `category ${category}`).toEqual(ids.slice().sort());
    }
    const total = Object.values(planned).reduce((n, ids) => n + ids.length, 0);
    expect(entries.length).toBe(total);
  });

  it("has unique ids and unique names", () => {
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(new Set(entries.map((e) => e.name)).size).toBe(entries.length);
  });

  it("is sorted by category (in categoryLabels order) and then by name", () => {
    const expected = [...entries].sort(
      (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name, "en"),
    );
    expect(entries.map((e) => e.id)).toEqual(expected.map((e) => e.id));
  });

  describe.each(entries.map((e) => [e.id, e] as const))("entry %s", (_id, entry) => {
    it("has the content the contract requires", () => {
      expect(entry.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(entry.name.trim().length).toBeGreaterThan(1);
      expect(Object.keys(categoryLabels)).toContain(entry.category);
      expect(entry.oneLiner.trim().length).toBeGreaterThan(20);
      expect(entry.howItWorks.length).toBeGreaterThanOrEqual(3);
      expect(entry.howItWorks.length).toBeLessThanOrEqual(6);
      expect(entry.whereUsed.length).toBeGreaterThanOrEqual(3);
      expect(entry.whereUsed.length).toBeLessThanOrEqual(5);
      expect(entry.keySpecs.length).toBeGreaterThanOrEqual(3);
      expect(entry.keySpecs.length).toBeLessThanOrEqual(6);
      expect(entry.failureModes.length).toBeGreaterThanOrEqual(2);
      expect(entry.failureModes.length).toBeLessThanOrEqual(4);
      expect(entry.interviewTip.trim().length).toBeGreaterThan(0);
    });

    it("has no empty or placeholder text", () => {
      const sentences = [entry.oneLiner, entry.interviewTip, ...entry.howItWorks, ...entry.whereUsed, ...entry.failureModes];
      const fragments = entry.keySpecs.flatMap((s) => [s.label, s.value]);
      for (const s of sentences) expect(s.trim().length, `"${s}"`).toBeGreaterThan(25);
      for (const s of fragments) expect(s.trim().length, `"${s}"`).toBeGreaterThanOrEqual(2);
      for (const s of [...sentences, ...fragments]) expect(s).not.toMatch(/\b(TODO|TBD|lorem|placeholder)\b/i);
      for (const p of entry.howItWorks) expect(p.length, p).toBeGreaterThan(60);
      const labels = entry.keySpecs.map((s) => s.label);
      expect(new Set(labels).size, "spec labels are unique").toBe(labels.length);
    });

    it("phrases the interview tip as a question plus the shape of an answer", () => {
      expect(entry.interviewTip).toContain("?");
      expect(entry.interviewTip.length).toBeGreaterThan(200);
    });

    it("points at a real lesson when relatedLesson is set", () => {
      if (entry.relatedLesson !== undefined) {
        expect(lessonBySlug(entry.relatedLesson), entry.relatedLesson).toBeDefined();
      }
    });

    it("renders a labelled svg, still by default", () => {
      const { container } = render(<entry.Illustration />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("role")).toBe("img");
      expect((svg?.getAttribute("aria-label") ?? "").length).toBeGreaterThan(10);
      expect(svg?.querySelector("title")?.textContent).toBe(svg?.getAttribute("aria-label"));
      expect(animationCount(container)).toBe(0);
    });

    it("animates when asked to", () => {
      const { container } = render(<entry.Illustration animate />);
      expect(container.querySelector("svg")).not.toBeNull();
      expect(animationCount(container)).toBeGreaterThan(0);
    });

    it("uses only valid SMIL timing, so the browser does not silently ignore an animation", () => {
      const { container } = render(<entry.Illustration animate />);
      expect(smilProblems(container), entry.id).toEqual([]);
    });

    it("stays still under reduced motion even when asked to animate", () => {
      stubReducedMotion(true);
      const { container } = render(<entry.Illustration animate />);
      expect(container.querySelector("svg")).not.toBeNull();
      expect(animationCount(container)).toBe(0);
    });
  });
});

describe("smilProblems (the validator itself)", () => {
  const problemsFor = (inner: string) => {
    const host = document.createElement("div");
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10">${inner}</rect></svg>`;
    return smilProblems(host);
  };
  const animate = (attrs: string) => `<animate attributeName="opacity" dur="2s" repeatCount="indefinite" ${attrs} />`;

  it("accepts well-formed animations of each kind", () => {
    expect(problemsFor(animate('values="0;1;0" keyTimes="0;0.5;1"'))).toEqual([]);
    expect(problemsFor(animate('values="1;0.2;0.2" keyTimes="0;0.25;0.5" calcMode="discrete"'))).toEqual([]);
    expect(problemsFor(animate('values="0;1;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"'))).toEqual([]);
    expect(problemsFor('<animateTransform attributeName="transform" type="rotate" values="0 5 5;360 5 5" dur="3s" repeatCount="indefinite" />')).toEqual([]);
    expect(problemsFor('<animateMotion path="M0 0 L10 10" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" dur="2s" repeatCount="indefinite" />')).toEqual([]);
  });

  it.each([
    ["linear keyTimes that stop short of 1 (the microcontroller pin bug)", '<animate attributeName="fill" values="#111111;#222222;#111111" keyTimes="0;0.15;0.45" dur="2s" repeatCount="indefinite" />', /must end at 1/],
    ["keyTimes that stop short of 1 on a five-value list", animate('values="0.1;0.1;0.95;0.95;0.1" keyTimes="0;0.25;0.45;0.62;0.8"'), /must end at 1/],
    ["keyTimes with a different count from values", animate('values="0;1;0" keyTimes="0;1"'), /2 entries but there are 3 values/],
    ["keyTimes that do not start at 0", animate('values="0;1" keyTimes="0.1;1"'), /must start at 0/],
    ["keyTimes that decrease", animate('values="0;1;0" keyTimes="0;0.8;0.5"'), /must not decrease/],
    ["spline mode with too few keySplines", animate('values="0;1;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1"'), /needs 2/],
    ["keySplines without spline mode", animate('values="0;1" keyTimes="0;1" keySplines="0.4 0 0.6 1"'), /only apply when calcMode is spline/],
    ["a single value", animate('values="1"'), /at least two values/],
    ["a non-numeric opacity", animate('values="0;high"'), /must be numbers/],
    ["a non-looping animation", `<animate attributeName="opacity" values="0;1" dur="2s" />`, /should loop/],
    ["a wrong rotate value", '<animateTransform attributeName="transform" type="rotate" values="0 5;360 5" dur="3s" repeatCount="indefinite" />', /1 or 3 numeric/],
    ["animateMotion keyPoints under the default paced mode", '<animateMotion path="M0 0 L10 10" keyPoints="0;1;0" keyTimes="0;0.5;1" dur="2s" repeatCount="indefinite" />', /ignored under calcMode paced/],
  ])("flags %s", (_name, markup, expected) => {
    const found = problemsFor(markup);
    expect(found.length).toBeGreaterThan(0);
    expect(found.join("\n")).toMatch(expected);
  });
});

describe("rankEntries", () => {
  it("returns every entry in the given order for an empty query", () => {
    expect(rankEntries(entries, "   ").map((e) => e.id)).toEqual(entries.map((e) => e.id));
  });

  it("ranks an exact name match ahead of partial and text matches", () => {
    const ids = rankEntries(entries, "mosfet").map((e) => e.id);
    expect(ids[0]).toBe("mosfet");
    expect(ids).toContain("sic-mosfet");
    expect(ids.indexOf("sic-mosfet")).toBeLessThan(ids.indexOf("igbt"));
    expect(ids).not.toContain("resistor");
  });

  it("finds part numbers and tolerates hyphens, spaces and case", () => {
    expect(rankEntries(entries, "1N4007").map((e) => e.id)).toContain("diode");
    expect(rankEntries(entries, "hc-sr04").map((e) => e.id)).toContain("ultrasonic-sensor");
    expect(rankEntries(entries, "op amp")[0]?.id).toBe("op-amp");
    expect(rankEntries(entries, "opamp")[0]?.id).toBe("op-amp");
    expect(rankEntries(entries, "Li-Ion")[0]?.id).toBe("li-ion-cell");
  });

  it("matches word starts, not arbitrary substrings", () => {
    const ids = rankEntries(entries, "led").map((e) => e.id);
    expect(ids[0]).toBe("led");
    expect(ids.length).toBeLessThan(entries.length / 2);
  });

  it("requires every word to match", () => {
    expect(rankEntries(entries, "zener lidar")).toEqual([]);
    expect(rankEntries(entries, "zener clamp").map((e) => e.id)).toContain("zener-diode");
  });
});

describe("EncyclopediaBrowser", () => {
  it("shows every entry as a card, grouped by category and sorted by name", () => {
    render(<EncyclopediaBrowser />);
    expect(cardNames()).toEqual(entries.map((e) => e.name));
    for (const category of new Set(entries.map((e) => e.category))) {
      expect(screen.getByRole("heading", { level: 2, name: new RegExp(`^${categoryLabels[category]}\\b`) })).toBeTruthy();
    }
    expect(screen.getByRole("status").textContent).toContain(`${entries.length}`);
  });

  it("offers a chip for each category that has entries, plus All", () => {
    render(<EncyclopediaBrowser />);
    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
    for (const category of categoryOrder) {
      const chip = screen.queryByRole("button", { name: categoryLabels[category] });
      if (entries.some((e) => e.category === category)) expect(chip, categoryLabels[category]).not.toBeNull();
      else expect(chip, categoryLabels[category]).toBeNull();
    }
  });

  it("filters by category and goes back to everything with All", () => {
    render(<EncyclopediaBrowser />);
    fireEvent.click(screen.getByRole("button", { name: categoryLabels.passive }));
    const passive = entries.filter((e) => e.category === "passive").map((e) => e.name);
    expect(cardNames()).toEqual(passive);
    expect(screen.getByRole("button", { name: categoryLabels.passive }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: "Diode" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(cardNames().length).toBe(entries.length);
  });

  it("filters by search with the best match first", () => {
    render(<EncyclopediaBrowser />);
    search("mosfet");
    const names = cardNames();
    expect(names[0]).toBe("MOSFET");
    expect(names).toContain("SiC MOSFET");
    expect(names).not.toContain("Resistor");
    expect(names.length).toBeLessThan(entries.length);
  });

  it("combines search and category, and shows an empty state with a way out", () => {
    render(<EncyclopediaBrowser />);
    fireEvent.click(screen.getByRole("button", { name: categoryLabels.sensor }));
    search("magnet");
    const names = cardNames();
    expect(names).toContain("Hall sensor");
    expect(names).not.toContain("MOSFET");

    fireEvent.click(screen.getByRole("button", { name: categoryLabels.passive }));
    search("ultrasonic");
    expect(cardNames()).toEqual([]);
    expect(screen.getByText(/no components match/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(cardNames().length).toBe(entries.length);
    expect((screen.getByRole("searchbox", { name: /search/i }) as HTMLInputElement).value).toBe("");
  });

  it("animates a card illustration on hover and on focus only", () => {
    render(<EncyclopediaBrowser />);
    const card = screen.getByRole("button", { name: "LED" });
    expect(animationCount(card)).toBe(0);
    fireEvent.mouseEnter(card);
    expect(animationCount(card)).toBeGreaterThan(0);
    fireEvent.mouseLeave(card);
    expect(animationCount(card)).toBe(0);
    fireEvent.focus(card);
    expect(animationCount(card)).toBeGreaterThan(0);
    fireEvent.blur(card);
    expect(animationCount(card)).toBe(0);
  });

  it("keeps the card illustration from showing the SVG title as a native tooltip", () => {
    render(<EncyclopediaBrowser />);
    const art = screen.getByRole("button", { name: "Resistor" }).querySelector('[aria-hidden="true"]');
    expect(art?.querySelector("svg")).not.toBeNull();
    expect(art?.className).toContain("pointer-events-none");
  });

  it("moves focus to the search box after Clear filters, so it is not lost when the empty state disappears", () => {
    render(<EncyclopediaBrowser />);
    const box = screen.getByRole("searchbox", { name: /search/i });
    search("zzzz");
    const clear = screen.getByRole("button", { name: /clear filters/i });
    clear.focus();
    fireEvent.click(clear);
    expect(screen.queryByRole("button", { name: /clear filters/i })).toBeNull();
    expect(document.activeElement).toBe(box);
  });

  it("keeps card illustrations still under reduced motion", () => {
    stubReducedMotion(true);
    render(<EncyclopediaBrowser />);
    const card = screen.getByRole("button", { name: "LED" });
    fireEvent.mouseEnter(card);
    expect(animationCount(card)).toBe(0);
  });

  it("opens a detail dialog with every section when a card is clicked", () => {
    render(<EncyclopediaBrowser />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const entry = entries.find((e) => e.id === "resistor")!;
    fireEvent.click(screen.getByRole("button", { name: entry.name }));

    const dialog = screen.getByRole("dialog", { name: entry.name });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);
    expect(document.body.style.overflow).toBe("hidden");
    expect(within(dialog).getByRole("heading", { level: 2, name: entry.name })).toBeTruthy();
    expect(within(dialog).getByText(entry.oneLiner)).toBeTruthy();
    for (const heading of ["How it works", "Where it is used", "Key specs", "Failure modes", "Interview tip"]) {
      expect(within(dialog).getByRole("heading", { level: 3, name: heading })).toBeTruthy();
    }
    for (const p of entry.howItWorks) expect(within(dialog).getByText(p)).toBeTruthy();
    expect(within(dialog).getAllByRole("row").length).toBe(entry.keySpecs.length);
    expect(within(dialog).getByText(entry.keySpecs[0].label)).toBeTruthy();
    expect(within(dialog).getByText(entry.interviewTip)).toBeTruthy();
    expect(dialog.querySelector("svg")).not.toBeNull();
    expect(animationCount(dialog)).toBeGreaterThan(0);

    const lesson = lessonBySlug(entry.relatedLesson!)!;
    const link = within(dialog).getByRole("link");
    expect(link.getAttribute("href")).toBe(`/learn/${lesson.track}/${lesson.slug}`);
    expect(link.textContent).toContain(lesson.title);
  });

  it("closes with Escape, the Close button and the backdrop, and gives focus back to the card", () => {
    render(<EncyclopediaBrowser />);
    const card = screen.getByRole("button", { name: "Servo" });

    fireEvent.click(card);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(card);
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(card);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(card);

    fireEvent.click(card);
    fireEvent.click(screen.getByTestId("encyclopedia-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps Tab focus inside the open dialog", () => {
    render(<EncyclopediaBrowser />);
    fireEvent.click(screen.getByRole("button", { name: "Thermistor" }));
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "Close" });
    const link = within(dialog).getByRole("link");

    link.focus();
    fireEvent.keyDown(link, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(link);
  });

  it("lets the viewer pause the detail animation, and offers no toggle under reduced motion", () => {
    render(<EncyclopediaBrowser />);
    fireEvent.click(screen.getByRole("button", { name: "Stepper motor" }));
    const dialog = screen.getByRole("dialog");
    expect(animationCount(dialog)).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByRole("button", { name: /pause animation/i }));
    expect(animationCount(dialog)).toBe(0);
    fireEvent.click(within(dialog).getByRole("button", { name: /play animation/i }));
    expect(animationCount(dialog)).toBeGreaterThan(0);

    cleanup();
    stubReducedMotion(true);
    render(<EncyclopediaBrowser />);
    fireEvent.click(screen.getByRole("button", { name: "Stepper motor" }));
    const still = screen.getByRole("dialog");
    expect(animationCount(still)).toBe(0);
    expect(within(still).queryByRole("button", { name: /animation/i })).toBeNull();
  });

  it("opens and closes the detail view for every entry", () => {
    render(<EncyclopediaBrowser />);
    for (const entry of entries) {
      fireEvent.click(screen.getByRole("button", { name: entry.name }));
      const dialog = screen.getByRole("dialog", { name: entry.name });
      expect(within(dialog).getAllByRole("row").length, entry.id).toBe(entry.keySpecs.length);
      expect(dialog.querySelector("svg"), entry.id).not.toBeNull();
      if (entry.relatedLesson) expect(within(dialog).getByRole("link"), entry.id).toBeTruthy();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog"), entry.id).toBeNull();
    }
  });
});

// Server and browser engines can differ in the last bits of sin, cos, exp and friends. A coordinate that reaches the markup
// unrounded then differs between the server render and the client, which React reports as a hydration mismatch. This renders
// every illustration twice, once normally and once with those functions nudged by one part in 10^14 (also while the entry
// modules are evaluated, because most of the geometry is computed at module scope), and requires identical markup.
const NUDGE = 1 + 1e-14;
const NUDGED_MATH = ["sin", "cos", "tan", "atan2", "atan", "asin", "acos", "exp", "log", "log10", "sqrt", "pow", "hypot", "cbrt"] as const;

async function renderEveryIllustration(nudge: boolean): Promise<Map<string, string>> {
  vi.resetModules();
  const saved = new Map<string, (...args: number[]) => number>();
  if (nudge) {
    for (const name of NUDGED_MATH) {
      const original = Math[name] as (...args: number[]) => number;
      saved.set(name, original);
      (Math as unknown as Record<string, unknown>)[name] = (...args: number[]) => {
        const value = original(...args);
        return value === 0 || !Number.isFinite(value) ? value : value * NUDGE;
      };
    }
  }
  try {
    // Imported after the reset so react, react-dom and the entries all come from one fresh module graph.
    const { entries: fresh } = await import("@/components/encyclopedia/entries");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const markup = new Map<string, string>();
    for (const entry of fresh) {
      for (const animate of [false, true]) markup.set(`${entry.id} animate=${animate}`, renderToStaticMarkup(createElement(entry.Illustration, { animate })));
    }
    return markup;
  } finally {
    for (const [name, original] of saved) (Math as unknown as Record<string, unknown>)[name] = original;
  }
}

function firstDifference(a: string, b: string): string {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `...${a.slice(Math.max(0, i - 100), i + 50)}...  vs  ...${b.slice(Math.max(0, i - 100), i + 50)}...`;
}

describe("hydration stability", () => {
  it("illustration markup does not depend on last-bit float differences between JavaScript engines", async () => {
    const plain = await renderEveryIllustration(false);
    const nudged = await renderEveryIllustration(true);
    expect(plain.size).toBe(entries.length * 2);
    const differences: string[] = [];
    for (const [key, html] of plain) {
      const other = nudged.get(key) ?? "";
      if (other !== html) differences.push(`${key}: ${firstDifference(html, other)}`);
    }
    expect(differences).toEqual([]);
  }, 60_000);
});
