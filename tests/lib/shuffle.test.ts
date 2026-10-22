import { describe, it, expect } from "vitest";
import { hashString, seededOrder } from "@/lib/shuffle";

describe("stable shuffle", () => {
  it("hashes with FNV-1a", () => {
    expect(hashString("abc")).toBe(440920331);
  });

  it("keeps the quiz order it produced before the move", () => {
    const seed = hashString("atoms-to-bands:0:What is the band gap of silicon at room temperature?");
    expect(seededOrder(seed, 4)).toEqual([2, 3, 1, 0]);
  });

  it("treats a zero seed as 1 and always returns a permutation", () => {
    expect(seededOrder(0, 3)).toEqual(seededOrder(1, 3));
    expect([...seededOrder(12345, 5)].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});
