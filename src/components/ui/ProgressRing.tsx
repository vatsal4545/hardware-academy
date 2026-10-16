import { vizColors } from "@/components/viz/shared/colors";

export interface ProgressRingProps {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({ value, size = 48, stroke = 5, color = vizColors.cyan, label }: ProgressRingProps) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(v * 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? `${pct}% complete`}
      className="shrink-0"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={vizColors.grid} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - v)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.26}
        fontFamily="var(--font-mono)"
        fill={vizColors.text}
      >
        {pct}%
      </text>
    </svg>
  );
}
