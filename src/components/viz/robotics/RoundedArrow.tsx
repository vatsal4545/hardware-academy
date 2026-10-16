import { vizColors } from "@/components/viz/shared";

/**
 * Round an SVG coordinate to 0.01. Node (V8) and some browsers (JavaScriptCore) disagree in the last bit of
 * Math.sin/cos/atan2, which makes server-rendered attributes differ from the client and logs hydration
 * mismatches. Two decimals is far below a pixel and identical on both sides.
 */
export const r2 = (v: number): number => Math.round(v * 100) / 100;

export interface RoundedArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  head?: number;
  dashed?: boolean;
  opacity?: number;
}

/** Same look as the shared Arrow, but every computed coordinate is rounded so SSR and hydration agree at any angle. */
export function RoundedArrow({ x1, y1, x2, y2, color = vizColors.text, width = 2, head = 8, dashed = false, opacity }: RoundedArrowProps) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  const bx1 = x2 - head * Math.cos(angle - spread);
  const by1 = y2 - head * Math.sin(angle - spread);
  const bx2 = x2 - head * Math.cos(angle + spread);
  const by2 = y2 - head * Math.sin(angle + spread);
  const shaftX = x2 - head * 0.6 * Math.cos(angle);
  const shaftY = y2 - head * 0.6 * Math.sin(angle);
  return (
    <g opacity={opacity}>
      <line
        x1={r2(x1)}
        y1={r2(y1)}
        x2={r2(shaftX)}
        y2={r2(shaftY)}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 5" : undefined}
      />
      <polygon points={`${r2(x2)},${r2(y2)} ${r2(bx1)},${r2(by1)} ${r2(bx2)},${r2(by2)}`} fill={color} />
    </g>
  );
}
