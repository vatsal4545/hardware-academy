import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CodeBlock } from "@/components/lesson";
import { roles, pitchTemplate, honestNote, resources } from "./careers-data";

export const metadata: Metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Careers</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Five roles this curriculum prepares you for, what each one does all day, what you must know, what the interview
        loop looks like, and what to put in your portfolio and on your resume.
      </p>

      <Card accent="#fbbf24" className="mt-8">
        <p className="text-sm leading-relaxed">{honestNote}</p>
      </Card>

      <nav aria-label="Roles" className="mt-8 flex flex-wrap gap-2">
        {roles.map((r) => (
          <a key={r.id} href={`#${r.id}`} className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:text-text">
            {r.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-10">
        {roles.map((r) => (
          <section key={r.id} id={r.id} aria-labelledby={`${r.id}-heading`} className="scroll-mt-20">
            <Card className="space-y-6">
              <header>
                <h2 id={`${r.id}-heading`} className="text-2xl font-semibold tracking-tight">
                  {r.title}
                </h2>
                <p className="mt-1 text-sm text-muted">Titles you will see: {r.entryTitles.join(", ")}</p>
                <p className="mt-3 max-w-3xl">{r.summary}</p>
              </header>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Day to day</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {r.dayToDay.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Must know (lessons)</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {r.mustKnow.map((m) => (
                      <li key={m.slug + m.topic}>
                        <Link href={`/learn/${m.track}/${m.slug}`} className="underline decoration-border underline-offset-4 hover:text-text">
                          {m.topic}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Tools</h3>
                  <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                    {r.tools.map((t) => (
                      <li key={t} className="rounded-md border border-border bg-bg px-2 py-0.5">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">The interview loop</h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                    {r.interviewLoop.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Portfolio</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {r.portfolio.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Resume bullets to adapt</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {r.resumeBullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </section>
        ))}
      </div>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Your 30-second pitch</h2>
          <p className="mt-1 text-sm text-muted">Fill in the brackets, say it out loud until it is under 30 seconds.</p>
          <div className="mt-3">
            <CodeBlock code={pitchTemplate} lang="text" />
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Keep going</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {resources.map((res) => (
              <li key={res.url}>
                <a href={res.url} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
                  {res.name}
                </a>
                <span className="text-muted"> — {res.why}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </Container>
  );
}
