import type { Track } from "@/lib/curriculum";
import { cn } from "@/lib/cn";

export function TrackPill({ track, className }: { track: Track; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ backgroundColor: `${track.color}22`, color: track.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: track.color }} aria-hidden />
      {track.name}
    </span>
  );
}
