"use client";

import { Button } from "@/components/ui/Button";

export function PlayPause({
  playing,
  onToggle,
  onReset,
  onStep,
}: {
  playing: boolean;
  onToggle: () => void;
  onReset?: () => void;
  onStep?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* The label states the action, so no aria-pressed: a toggle must not signal its state twice. */}
      <Button size="sm" variant="secondary" onClick={onToggle}>
        {playing ? "Pause" : "Play"}
      </Button>
      {onStep && (
        <Button size="sm" variant="ghost" onClick={onStep} disabled={playing}>
          Step
        </Button>
      )}
      {onReset && (
        <Button size="sm" variant="ghost" onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  );
}
