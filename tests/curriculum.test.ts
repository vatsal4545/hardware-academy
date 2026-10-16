import { describe, it, expect } from "vitest";
import { tracks, lessons, days, lessonBySlug, lessonsFor, neighbors, trackById } from "@/lib/curriculum";
import { labs } from "@/lib/labs";
import { lessonData, lessonBodies } from "@/content/registry";

describe("curriculum", () => {
  it("has 37 lessons with unique slugs", () => {
    expect(lessons.length).toBe(37);
    expect(new Set(lessons.map((l) => l.slug)).size).toBe(37);
  });

  it("every lesson belongs to a known track and has objectives", () => {
    for (const l of lessons) {
      expect(tracks.some((t) => t.id === l.track)).toBe(true);
      expect(l.objectives.length).toBeGreaterThanOrEqual(3);
      expect(l.minutes).toBeGreaterThan(0);
      expect(l.day).toBeGreaterThanOrEqual(1);
      expect(l.day).toBeLessThanOrEqual(13);
    }
  });

  it("days cover 1..14, days 1-13 have lessons, every lesson is scheduled once", () => {
    expect(days.map((d) => d.day)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    const scheduled = days.flatMap((d) => d.lessonSlugs);
    expect(new Set(scheduled).size).toBe(scheduled.length);
    for (const d of days) {
      if (d.day <= 13) expect(d.lessonSlugs.length).toBeGreaterThan(0);
      for (const s of d.lessonSlugs) expect(lessonBySlug(s)?.day).toBe(d.day);
      for (const id of d.labIds) expect(labs.some((l) => l.id === id)).toBe(true);
    }
    for (const l of lessons) expect(scheduled).toContain(l.slug);
  });

  it("track helpers work", () => {
    expect(trackById("pcb").name).toBe("PCB Design");
    expect(lessonsFor("semiconductors").length).toBe(9);
    const first = lessons[0];
    expect(neighbors(first.slug).prev).toBeUndefined();
    expect(neighbors(first.slug).next?.slug).toBe(lessons[1].slug);
    expect(neighbors(lessons[lessons.length - 1].slug).next).toBeUndefined();
  });

  it("registry has data and a body for every lesson", () => {
    for (const l of lessons) {
      expect(lessonData[l.slug], l.slug).toBeDefined();
      expect(lessonBodies[l.slug], l.slug).toBeDefined();
    }
  });
});
