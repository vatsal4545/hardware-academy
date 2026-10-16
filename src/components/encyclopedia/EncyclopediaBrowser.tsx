"use client";

import { entries } from "./entries";

// Placeholder; replaced by the encyclopedia task with search, category filters and a detail panel.
export function EncyclopediaBrowser() {
  return (
    <p className="text-muted">
      {entries.length === 0 ? "The component encyclopedia is being written." : `${entries.length} components`}
    </p>
  );
}
