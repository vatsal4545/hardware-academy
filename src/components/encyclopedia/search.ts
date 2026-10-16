import { categoryLabels, type ComponentEntry } from "./types";

/** Lower-case alphanumeric runs: "HC-SR04" becomes ["hc", "sr04"]. */
function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Everything but letters and digits removed, so "op-amp", "op amp" and "opamp" compare equal. */
function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

interface SearchIndex {
  nameWords: string[];
  nameSquashed: string;
  categoryWords: string[];
  textWords: Set<string>;
  textList: string[];
}

const indexCache = new WeakMap<ComponentEntry, SearchIndex>();

function indexOf(entry: ComponentEntry): SearchIndex {
  const cached = indexCache.get(entry);
  if (cached) return cached;
  const text = [
    entry.oneLiner,
    entry.interviewTip,
    ...entry.howItWorks,
    ...entry.whereUsed,
    ...entry.failureModes,
    ...entry.keySpecs.flatMap((s) => [s.label, s.value]),
  ].join(" ");
  const textWords = new Set(words(text));
  const built: SearchIndex = {
    nameWords: words(entry.name),
    nameSquashed: squash(entry.name),
    categoryWords: words(categoryLabels[entry.category]),
    textWords,
    textList: Array.from(textWords),
  };
  indexCache.set(entry, built);
  return built;
}

/** Best score for one query word against one entry; 0 means "does not match". Word starts count, arbitrary substrings do not. */
function scoreWord(ix: SearchIndex, word: string): number {
  let best = 0;
  if (ix.nameWords.includes(word)) best = 100;
  else if (ix.nameWords.some((w) => w.startsWith(word))) best = 70;
  if (word.length >= 3 && ix.nameSquashed.includes(word)) best = Math.max(best, 60);
  if (ix.categoryWords.some((w) => w.startsWith(word))) best = Math.max(best, 25);
  if (ix.textWords.has(word)) best = Math.max(best, 12);
  else if (ix.textList.some((w) => w.startsWith(word))) best = Math.max(best, 8);
  return best;
}

/**
 * Filters `list` to the entries that match every word of `query` (word-start matching over the name, category and all text),
 * best match first. An empty query returns the list unchanged. The sort is stable, so ties keep the incoming order.
 */
export function rankEntries(list: readonly ComponentEntry[], query: string): ComponentEntry[] {
  const queryWords = words(query);
  if (queryWords.length === 0) return [...list];
  const whole = squash(query);
  const scored: { entry: ComponentEntry; score: number; at: number }[] = [];
  list.forEach((entry, at) => {
    const ix = indexOf(entry);
    let score = 0;
    for (const word of queryWords) {
      const s = scoreWord(ix, word);
      if (s === 0) return;
      score += s;
    }
    if (whole === ix.nameSquashed) score += 60;
    scored.push({ entry, score, at });
  });
  scored.sort((a, b) => b.score - a.score || a.at - b.at);
  return scored.map((s) => s.entry);
}
