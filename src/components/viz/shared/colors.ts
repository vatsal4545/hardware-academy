import type { TrackId } from "@/lib/curriculum";

export const vizColors = {
  bg: "#0b0f17",
  grid: "#1f2937",
  text: "#e5e7eb",
  muted: "#9ca3af",
  violet: "#a78bfa",
  green: "#34d399",
  cyan: "#22d3ee",
  orange: "#fb923c",
  amber: "#fbbf24",
  red: "#f87171",
  blue: "#60a5fa",
  copper: "#d98c3f",
  mask: "#1f7a4d",
  silk: "#f3f4f6",
  substrate: "#c8b67a",
  electron: "#22d3ee",
  hole: "#fb7185",
  positive: "#f87171",
  negative: "#60a5fa",
} as const;

export type VizColor = keyof typeof vizColors;

export const trackColors: Record<TrackId, string> = {
  semiconductors: "#a78bfa",
  pcb: "#34d399",
  robotics: "#22d3ee",
  ev: "#fb923c",
  "ai-design": "#fbbf24",
};
