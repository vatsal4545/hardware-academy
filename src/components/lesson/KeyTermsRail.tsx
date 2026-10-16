import type { KeyTerm } from "@/lib/curriculum";

export function KeyTermsRail({ terms }: { terms: KeyTerm[] }) {
  if (terms.length === 0) return null;
  return (
    <aside aria-labelledby="key-terms-heading" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="key-terms-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Key terms
      </h3>
      <dl className="space-y-3 text-sm">
        {terms.map((t) => (
          <div key={t.term}>
            <dt className="font-semibold">{t.term}</dt>
            <dd className="text-muted">{t.def}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
