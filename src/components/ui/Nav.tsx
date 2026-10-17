"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { lessons } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/cn";
import { Container } from "./Container";

const links = [
  ["/plan", "Plan"],
  ["/learn", "Learn"],
  ["/labs", "Labs"],
  ["/components", "Components"],
  ["/scenarios", "Scenarios"],
  ["/interview", "Interview"],
  ["/references", "References"],
  ["/careers", "Careers"],
] as const;

export function Nav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const { state, ready } = useProgress();
  const done = Object.keys(state.completed).filter((slug) => lessons.some((l) => l.slug === slug)).length;

  const linkClass = (href: string) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm transition-colors",
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-surface-2 text-text"
        : "text-muted hover:bg-surface-2 hover:text-text",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="font-semibold tracking-tight">
          Hardware <span className="text-muted">Academy</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={linkClass(href)}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span
            className="hidden rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted sm:inline-flex"
            aria-live="polite"
          >
            {ready ? `${done} / ${lessons.length} lessons` : `– / ${lessons.length} lessons`}
          </span>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
        </div>
      </Container>
      {open && (
        <nav id="mobile-nav" aria-label="Primary mobile" className="flex flex-col border-t border-border bg-bg px-4 py-2 lg:hidden">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={linkClass(href)} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
