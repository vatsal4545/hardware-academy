import type { Metadata } from "next";
import Link from "next/link";
import { PidLab } from "@/components/labs/PidLab";
import { Container } from "@/components/ui/Container";
import { TrackPill } from "@/components/ui/TrackPill";
import { trackById } from "@/lib/curriculum";
import { labById } from "@/lib/labs";

const lab = labById("pid");

export const metadata: Metadata = { title: lab?.title, description: lab?.description };

export default function PidLabPage() {
  return (
    <Container className="py-10">
      <Link href="/labs" className="text-sm text-muted hover:text-text">
        ← Back to labs
      </Link>
      <header className="mt-4 space-y-2">
        {lab && <TrackPill track={trackById(lab.track)} />}
        <h1 className="text-3xl font-bold tracking-tight">{lab?.title}</h1>
        <p className="max-w-3xl text-muted">{lab?.description}</p>
        {lab && <p className="font-mono text-xs text-muted">About {lab.minutes} min</p>}
      </header>
      <div className="mt-8">
        <PidLab />
      </div>
    </Container>
  );
}
