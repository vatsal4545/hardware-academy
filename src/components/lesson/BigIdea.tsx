import { Lightbulb } from "lucide-react";

/** The lesson's main point in plain words, at the top of the page. */
export function BigIdea({ text }: { text: string }) {
  return (
    <section id="big-idea" aria-labelledby="big-idea-heading" className="scroll-mt-20 rounded-2xl border border-(--track)/40 bg-(--track)/10 p-5 sm:p-6">
      <h2 id="big-idea-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-(--track)">
        <Lightbulb aria-hidden className="h-4 w-4" />
        The big idea
      </h2>
      <p data-layer="simple" className="simple-text mt-2 text-text">
        {text}
      </p>
    </section>
  );
}
