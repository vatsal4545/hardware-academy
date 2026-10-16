import { vizColors, type ArrowProps } from "@/components/viz/shared";

/**
 * Rounds an SVG coordinate to 0.01. The server (Node) and the browser can return Math.sin/Math.cos results that
 * differ in the last bit, and an unrounded value then fails React hydration. Two decimals are far below a pixel.
 */
export const r2 = (v: number) => Math.round(v * 100) / 100;

/** The shared Arrow's look, with every trig-derived coordinate rounded so server and client markup match. */
export function RoundedArrow({ x1, y1, x2, y2, color = vizColors.text, width = 2, head = 8, dashed = false }: ArrowProps) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  const bx1 = r2(x2 - head * Math.cos(angle - spread));
  const by1 = r2(y2 - head * Math.sin(angle - spread));
  const bx2 = r2(x2 - head * Math.cos(angle + spread));
  const by2 = r2(y2 - head * Math.sin(angle + spread));
  const shaftX = r2(x2 - head * 0.6 * Math.cos(angle));
  const shaftY = r2(y2 - head * 0.6 * Math.sin(angle));
  return (
    <g>
      <line
        x1={r2(x1)}
        y1={r2(y1)}
        x2={shaftX}
        y2={shaftY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 5" : undefined}
      />
      <polygon points={`${r2(x2)},${r2(y2)} ${bx1},${by1} ${bx2},${by2}`} fill={color} />
    </g>
  );
}
