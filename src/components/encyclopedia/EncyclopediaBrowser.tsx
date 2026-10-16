"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { lessonBySlug } from "@/lib/curriculum";
import { usePrefersReducedMotion, vizColors } from "@/components/viz/shared";
import { entries } from "./entries";
import { rankEntries } from "./search";
import { categoryLabels, type ComponentCategory, type ComponentEntry } from "./types";

const categoryAccent: Record<ComponentCategory, string> = {
  passive: vizColors.copper,
  active: vizColors.violet,
  power: vizColors.red,
  sensor: vizColors.cyan,
  actuator: vizColors.green,
  compute: vizColors.blue,
  semiconductor: vizColors.amber,
  ev: vizColors.orange,
  connector: vizColors.hole,
};

/** Categories in the order of `categoryLabels`, skipping any that have no entries yet (no dead chips). */
const categories = (Object.keys(categoryLabels) as ComponentCategory[]).filter((c) => entries.some((e) => e.category === c));

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function EncyclopediaBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ComponentCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const searchId = useId();
  const idBase = useId();

  const searching = /[a-z0-9]/i.test(query);
  const pool = category === "all" ? entries : entries.filter((e) => e.category === category);
  const visible = rankEntries(pool, query);
  const sections: { key: string; title?: string; items: ComponentEntry[] }[] = searching
    ? [{ key: "results", items: visible }]
    : categories
        .map((c) => ({ key: c, title: categoryLabels[c], items: visible.filter((e) => e.category === c) }))
        .filter((s) => s.items.length > 0);
  const selected = selectedId === null ? undefined : entries.find((e) => e.id === selectedId);

  const openEntry = useCallback((id: string, opener: HTMLElement) => {
    openerRef.current = opener;
    setSelectedId(id);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    openerRef.current?.focus();
  }, []);

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <label htmlFor={searchId} className="sr-only">
            Search components
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, e.g. 1N4007 or servo"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          />
        </div>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {visible.length === entries.length ? `${entries.length} components` : `Showing ${visible.length} of ${entries.length} components`}
        </p>
      </div>

      <div role="group" aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
        <Chip active={category === "all"} onClick={() => setCategory("all")} count={entries.length}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)} count={entries.filter((e) => e.category === c).length} accent={categoryAccent[c]}>
            {categoryLabels[c]}
          </Chip>
        ))}
      </div>

      <div className="mt-8 space-y-10">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-medium">
              No components match &ldquo;{query.trim()}&rdquo;
              {category !== "all" ? ` in ${categoryLabels[category]}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">Try a part number, a use case, or fewer words.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.key} aria-label={section.title ? undefined : "Search results"}>
              {section.title && (
                <h2 className="mb-4 flex items-baseline gap-2 text-lg font-semibold">
                  {section.title}
                  <span aria-hidden="true" className="text-sm font-normal text-muted">
                    {section.items.length}
                  </span>
                </h2>
              )}
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((entry) => (
                  <li key={entry.id}>
                    <EntryCard entry={entry} idBase={`${idBase}${entry.id}`} onOpen={openEntry} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {selected && <EntryDetail key={selected.id} entry={selected} onClose={closeDetail} />}
    </div>
  );
}

function Chip({ active, onClick, count, accent, children }: { active: boolean; onClick: () => void; count: number; accent?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
        active ? "border-transparent bg-text text-bg" : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      {accent && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
      {children}
      <span aria-hidden="true" className={cn("text-xs font-normal", active ? "text-bg/70" : "text-muted")}>
        {count}
      </span>
    </button>
  );
}

function EntryCard({ entry, idBase, onOpen }: { entry: ComponentEntry; idBase: string; onOpen: (id: string, opener: HTMLElement) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const nameId = `${idBase}-name`;
  const categoryId = `${idBase}-category`;
  const summaryId = `${idBase}-summary`;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-labelledby={nameId}
      aria-describedby={`${categoryId} ${summaryId}`}
      onClick={(e) => onOpen(entry.id, e.currentTarget)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left transition-colors hover:border-white/25 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      <span aria-hidden="true" className="block border-b border-border bg-bg">
        <entry.Illustration animate={hovered || focused} />
      </span>
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span id={categoryId} className="text-xs font-semibold uppercase tracking-wide" style={{ color: categoryAccent[entry.category] }}>
          {categoryLabels[entry.category]}
        </span>
        <span id={nameId} className="text-base font-semibold text-text">
          {entry.name}
        </span>
        <span id={summaryId} className="text-sm leading-relaxed text-muted">
          {entry.oneLiner}
        </span>
      </span>
    </button>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function EntryDetail({ entry, onClose }: { entry: ComponentEntry; onClose: () => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const lesson = entry.relatedLesson ? lessonBySlug(entry.relatedLesson) : undefined;

  // Modal behaviour: take focus, stop the page behind from scrolling, undo both on close.
  useEffect(() => {
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function trapTab(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div data-testid="encyclopedia-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-border bg-surface shadow-2xl outline-none"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: categoryAccent[entry.category] }}>
              {categoryLabels[entry.category]}
            </p>
            <h2 id={titleId} className="text-2xl font-bold tracking-tight">
              {entry.name}
            </h2>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="space-y-7 px-5 py-6">
          <div>
            <div className="overflow-hidden rounded-xl border border-border bg-bg">
              <entry.Illustration animate={!paused} />
            </div>
            {!reducedMotion && (
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={() => setPaused((p) => !p)} className={buttonClass("ghost", "sm")}>
                  {paused ? "Play animation" : "Pause animation"}
                </button>
              </div>
            )}
          </div>

          <p className="text-lg leading-relaxed text-text">{entry.oneLiner}</p>

          <DetailSection title="How it works">
            <div className="space-y-3 text-sm leading-relaxed text-text/90">
              {entry.howItWorks.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </DetailSection>

          <DetailSection title="Where it is used">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text/90 marker:text-muted">
              {entry.whereUsed.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </DetailSection>

          <DetailSection title="Key specs">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Key specs for {entry.name}</caption>
                <tbody>
                  {entry.keySpecs.map((s) => (
                    <tr key={s.label} className="border-t border-border align-top first:border-t-0">
                      <th scope="row" className="w-2/5 bg-surface-2/60 px-3 py-2 text-left font-medium text-muted">
                        {s.label}
                      </th>
                      <td className="px-3 py-2 text-text">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>

          <DetailSection title="Failure modes">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text/90 marker:text-orange-400">
              {entry.failureModes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </DetailSection>

          <section className="rounded-xl border border-violet-400/40 bg-violet-400/10 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-300">Interview tip</h3>
            <p className="mt-2 text-sm leading-relaxed text-text/90">{entry.interviewTip}</p>
          </section>

          {lesson && (
            <Link href={`/learn/${lesson.track}/${lesson.slug}`} className={buttonClass("secondary", "md", "w-full justify-between")}>
              <span>Go deeper: {lesson.title}</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
