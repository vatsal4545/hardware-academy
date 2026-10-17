import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { TrackPill } from "@/components/ui/TrackPill";
import { tracks, lessonsFor } from "@/lib/curriculum";
import { formatCitation, lessonReferences, referenceLink, references, trackStartHere, type Reference } from "@/lib/references";

export const metadata: Metadata = { title: "References" };

const kindOrder: Reference["kind"][] = ["book", "paper", "standard", "report", "doc"];
const kindTitle: Record<Reference["kind"], string> = {
  book: "Books",
  paper: "Papers",
  standard: "Standards and codes",
  report: "Reports",
  doc: "Documentation and tutorials",
};

function Citation({ r }: { r: Reference }) {
  const href = referenceLink(r);
  return (
    <li className="text-sm">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="font-medium underline decoration-border underline-offset-4 hover:text-text">
          {formatCitation(r)}
        </a>
      ) : (
        <span className="font-medium">{formatCitation(r)}</span>
      )}
      {r.free && <span className="ml-2 rounded bg-green-400/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-green-300">free online</span>}
      <span className="block text-muted">{r.note}</span>
    </li>
  );
}

export default function ReferencesPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">References</h1>
      <p className="mt-2 max-w-2xl text-muted">
        The books, original papers, standards and manuals behind every lesson, grouped by track. Each lesson page also lists
        its own references with a note on what to read. Start with the &quot;start here&quot; books; use the papers to see
        where an idea came from; cite the standards in interviews.
      </p>
      <div className="mt-8 space-y-10">
        {tracks.map((t) => {
          const ids = new Set<string>();
          for (const l of lessonsFor(t.id)) for (const lr of lessonReferences[l.slug] ?? []) ids.add(lr.id);
          const refs = [...ids].map((id) => references[id]).filter(Boolean);
          return (
            <section key={t.id} aria-labelledby={`refs-${t.id}`}>
              <div className="flex items-center gap-3">
                <TrackPill track={t} />
                <h2 id={`refs-${t.id}`} className="text-xl font-semibold">
                  {t.name}
                </h2>
                <Link href={`/learn/${t.id}`} className="ml-auto text-sm text-muted hover:text-text">
                  Lessons
                </Link>
              </div>
              <Card className="mt-3 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Start here</h3>
                  <ol className="mt-2 list-decimal space-y-2 pl-5">
                    {trackStartHere[t.id].map((id) => (
                      <Citation key={id} r={references[id]} />
                    ))}
                  </ol>
                </div>
                {kindOrder.map((kind) => {
                  const group = refs.filter((r) => r.kind === kind && !trackStartHere[t.id].includes(r.id));
                  if (group.length === 0) return null;
                  return (
                    <div key={kind}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{kindTitle[kind]}</h3>
                      <ul className="mt-2 space-y-2">
                        {group.map((r) => (
                          <Citation key={r.id} r={r} />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>
    </Container>
  );
}
