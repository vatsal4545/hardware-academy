// Text measures for the simple-first lessons: the readability gate in the tests and the "Go deeper" check in
// scripts/check-go-deeper.mts. It imports nothing, so Node can run it directly with native type stripping.

/** Whitespace-separated tokens that contain a letter or a digit. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Sentences end at ".", "!" or "?" followed by whitespace; pieces without a word are dropped. "1.12" stays whole. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => countWords(s) > 0);
}

/** Mean words per sentence over all the blocks together; 0 when there is no sentence. */
export function averageSentenceLength(blocks: string[]): number {
  const sentences = blocks.flatMap(splitSentences);
  if (sentences.length === 0) return 0;
  return sentences.reduce((n, s) => n + countWords(s), 0) / sentences.length;
}

const ENTITIES: Record<string, string> = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

/**
 * The visible text of a stretch of JSX source: comments, tags and their attributes are dropped, {" "} and {"..."}
 * literals and HTML entities are resolved, and whitespace is collapsed. Attribute text such as captions is dropped
 * too, so compare like with like: both sides of a comparison go through this function.
 */
export function jsxToText(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\{\s*"([^"]*)"\s*\}/g, "$1")
    .replace(/\{\s*'([^']*)'\s*\}/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:apos|quot|amp|lt|gt|nbsp);/g, (e) => ENTITIES[e])
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCK_TAG =
  /<\/?(?:p|li|ul|ol|h[1-6]|table|thead|tbody|tr|td|th|div|pre|blockquote|figure|figcaption|Prose|Callout|Figure|Section|Exercise)\b[^>]*>/g;

/**
 * The visible text of JSX source, cut into blocks at paragraph, list, heading, table and section tags. Text without a
 * full stop (a table, a heading) then cannot run into the next paragraph and form one "sentence" that breaks as soon
 * as the conversion puts the two in different steps.
 */
export function textBlocks(source: string): string[] {
  return source
    .split(BLOCK_TAG)
    .map(jsxToText)
    .filter((b) => b.length > 0);
}

/** The JSX between the opening tag of the section with id="theory" and the <Section that opens id="viz". */
export function theorySectionSource(source: string): string {
  const theoryAt = source.indexOf('id="theory"');
  const vizAt = source.indexOf('id="viz"');
  if (theoryAt < 0 || vizAt < theoryAt) return "";
  const start = source.indexOf(">", theoryAt) + 1;
  const end = source.lastIndexOf("<Section", vizAt);
  return source.slice(start, end > start ? end : vizAt);
}

/** Sentences of four or more words in the old theory section that appear nowhere in the new lesson source. */
export function missingSentences(oldSource: string, newSource: string): string[] {
  const now = jsxToText(newSource);
  return textBlocks(theorySectionSource(oldSource))
    .flatMap(splitSentences)
    .filter((s) => countWords(s) >= 4 && !now.includes(s));
}
