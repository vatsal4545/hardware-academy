import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { TrackCards } from "@/components/ui/TrackCards";
import { lessons, tracks, days } from "@/lib/curriculum";
import { labs } from "@/lib/labs";

const steps: [string, string][] = [
  ["Theory", "A plain-language explanation with real numbers and a drawn figure."],
  ["Visualization", "An interactive model you can push, pull and break."],
  ["Practice", "A concrete exercise with an answer you can check."],
  ["Scenario", "A real-world failure to diagnose, with staged hints."],
  ["Interview", "Questions with answers you could say out loud."],
  ["Quiz", "Five or more questions with explanations. Your score is saved."],
];

export default function Home() {
  const totalMinutes = lessons.reduce((s, l) => s + l.minutes, 0) + labs.reduce((s, l) => s + l.minutes, 0);
  return (
    <>
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.12),transparent_60%)]">
        <Container className="py-16 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">A 14-day hands-on path</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Silicon to motion.
            <span className="block text-muted">Learn hardware the way you will be asked about it.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Semiconductors, PCB design, robotics, EV powertrains and AI-assisted design. Every lesson pairs theory with an
            interactive visualization, a practical exercise, a real-world problem and interview questions, so two weeks of
            evenings ends with a portfolio robot and answers you can give in a first-round interview.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/learn/semiconductors/atoms-to-bands">Start Day 1</ButtonLink>
            <ButtonLink href="/plan" variant="secondary">
              See the 14-day plan
            </ButtonLink>
            <ButtonLink href="/labs/robot-sim" variant="ghost">
              Try the robot simulator
            </ButtonLink>
          </div>
          <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-6 font-mono text-sm sm:grid-cols-4">
            {[
              [`${tracks.length}`, "tracks"],
              [`${lessons.length}`, "lessons"],
              [`${labs.length}`, "labs"],
              [`${Math.round(totalMinutes / 60)} h`, "of guided work"],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="text-2xl text-text">{v}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <Container className="py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Five tracks</h2>
          <Link href="/learn" className="text-sm text-muted hover:text-text">
            All lessons
          </Link>
        </div>
        <TrackCards />
      </Container>

      <Container className="py-6">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">How a lesson works</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(([title, body], i) => (
            <li key={title}>
              <Card className="h-full">
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
                <h3 className="mt-1 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Container>

      <Container className="py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Labs</h2>
          <Link href="/labs" className="text-sm text-muted hover:text-text">
            All labs
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {labs.map((lab) => (
            <Link key={lab.id} href={`/labs/${lab.id}`} className="group block">
              <Card className="h-full transition-colors group-hover:bg-surface-2">
                <span className="font-mono text-xs text-muted">{lab.minutes} min</span>
                <h3 className="mt-1 font-semibold">{lab.title}</h3>
                <p className="mt-1 text-sm text-muted">{lab.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>

      <Container className="py-6 pb-16">
        <Card className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Fourteen days, about three hours a day</h2>
            <p className="mt-2 text-sm text-muted">
              Days 1-3 semiconductors, 4-6 PCB design, 7-10 robotics with a build and a simulator, 11-12 EV powertrains,
              13 AI-assisted design, 14 interview marathon. {days.length} days are laid out with checkboxes and time
              estimates.
            </p>
          </div>
          <ButtonLink href="/careers" variant="secondary">
            Which jobs this prepares you for
          </ButtonLink>
        </Card>
      </Container>
    </>
  );
}
