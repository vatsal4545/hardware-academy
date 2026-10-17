/** Reference types and the two small formatting helpers the lesson pages need; the data itself lives in references.ts. */

export type ReferenceKind = "book" | "paper" | "standard" | "doc" | "report";

export interface Reference {
  id: string;
  kind: ReferenceKind;
  title: string;
  authors: string;
  year: number;
  /** publisher, or journal with volume and pages */
  venue: string;
  doi?: string;
  url?: string;
  /** plain-language note: what this is and why it matters */
  note: string;
  /** free to read online */
  free?: boolean;
}

export interface LessonReference {
  id: string;
  /** what to read for this lesson, in plain words */
  read: string;
}

export function referenceLink(ref: Reference): string | undefined {
  if (ref.doi) return `https://doi.org/${ref.doi}`;
  return ref.url;
}

export function formatCitation(ref: Reference): string {
  // A title that already ends in punctuation (a question, say) gets no extra full stop.
  const title = /[.?!]$/.test(ref.title) ? ref.title : `${ref.title}.`;
  return `${ref.authors} (${ref.year}). ${title} ${ref.venue}.`;
}
