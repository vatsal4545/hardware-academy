import { describe, it, expect } from "vitest";
import { lessons, tracks } from "@/lib/curriculum";
import { lessonReferences, references, referencesFor, trackStartHere } from "@/lib/references";

describe("references", () => {
  it("every lesson cites at least two references that resolve", () => {
    for (const l of lessons) {
      const refs = referencesFor(l.slug);
      expect(refs.length, l.slug).toBeGreaterThanOrEqual(2);
      for (const r of refs) expect(r.read.length, `${l.slug}:${r.id}`).toBeGreaterThan(10);
    }
    for (const [slug, items] of Object.entries(lessonReferences)) {
      expect(lessons.some((l) => l.slug === slug), slug).toBe(true);
      for (const it of items) expect(references[it.id], `${slug} -> ${it.id}`).toBeDefined();
    }
  });

  it("references are well formed", () => {
    for (const r of Object.values(references)) {
      expect(r.title.length).toBeGreaterThan(3);
      expect(r.authors.length).toBeGreaterThanOrEqual(2);
      expect(r.year).toBeGreaterThanOrEqual(1940);
      expect(r.year).toBeLessThanOrEqual(2026);
      expect(r.note.length).toBeGreaterThan(20);
      if (r.doi) expect(r.doi).toMatch(/^10\.\d{4,9}\/\S+$/);
      if (r.url) expect(r.url.startsWith("https://")).toBe(true);
    }
  });

  it("every track has start-here books that resolve", () => {
    for (const t of tracks) {
      expect(trackStartHere[t.id].length).toBeGreaterThanOrEqual(2);
      for (const id of trackStartHere[t.id]) expect(references[id], `${t.id} -> ${id}`).toBeDefined();
    }
  });
});
