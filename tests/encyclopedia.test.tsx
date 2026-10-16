import { afterEach, describe, expect, it } from "vitest";
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

    it("stays still under reduced motion even when asked to animate", () => {
      stubReducedMotion(true);
      const { container } = render(<entry.Illustration animate />);
      expect(container.querySelector("svg")).not.toBeNull();
      expect(animationCount(container)).toBe(0);
    });
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
