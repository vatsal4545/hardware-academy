/**
 * The right-hand rule, drawn two ways for the components-in-action lesson.
 *
 * Coil: the current goes down the front of each turn, so the field inside the coil points right and the right end is
 * north; the hand's fingers follow the current and the thumb follows the field. Trace: the current goes up a straight
 * copper strip, so the field circles it and runs to the right on the near side; the thumb follows the current and the
 * fingers follow the field. Reversing the current flips every arrow and rotates the hand by 180°, which keeps it a
 * right hand (a mirror image would be a left hand) while turning the fingers and the thumb the other way.
 *
 * Every coordinate is a literal, so the markup is identical on the server and in the browser.
 */

import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { r3 } from "./OhmsLawCircuit.helpers";

export type RightHandVariant = "coil" | "trace";

export interface RightHandRuleProps {
  variant: RightHandVariant;
  /** true: coil current down the front (north on the right); trace current upward */
  forward: boolean;
  /** 0..1, scales the field-line opacity (defaults to 1) */
  strength?: number;
}

/** Local drawing box of one variant. */
export const RHR_BOX = { w: 300, h: 190 } as const;

const HAND = "#e9bf96";
const HAND_EDGE = "#8a5a2b";
const FIELD = vizColors.violet;

function fieldOpacity(strength: number): number {
  const s = Math.min(1, Math.max(0, strength));
  return r3(0.35 + 0.65 * s);
}

/** Four fingers and a thumb, each drawn as a dark edge under a lighter stroke. */
function Hand({ palm, fingers, thumb, thumbHead, transform }: { palm: { x: number; y: number; w: number; h: number }; fingers: string[]; thumb: string; thumbHead: string; transform?: string }) {
  return (
    <g transform={transform} aria-hidden="true">
      <rect x={palm.x} y={palm.y} width={palm.w} height={palm.h} rx={14} fill={HAND} stroke={HAND_EDGE} strokeWidth={2} />
      {fingers.map((d, k) => (
        <g key={k} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={d} stroke={HAND_EDGE} strokeWidth={12} />
          <path d={d} stroke={HAND} strokeWidth={9} />
        </g>
      ))}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={thumb} stroke={HAND_EDGE} strokeWidth={14} />
        <path d={thumb} stroke={HAND} strokeWidth={11} />
      </g>
      <polygon points={thumbHead} fill={HAND_EDGE} />
    </g>
  );
}

/* ---------- coil ---------- */

const AX = 95; // coil axis, y
const CX = 150; // coil centre, x
const TURNS = [90, 114, 138, 162, 186, 210];
const LOOPS: Array<[number, number]> = [
  [108, 46],
  [128, 64],
  [146, 82],
];

function Coil({ forward, strength }: { forward: boolean; strength: number }) {
  const op = fieldOpacity(strength);
  return (
    <>
      {/* field loops outside the coil run from north back to south */}
      <g fill="none" stroke={FIELD} strokeWidth={1.6} strokeDasharray="6 5" opacity={op}>
        {LOOPS.map(([rx, ry]) => (
          <ellipse key={rx} cx={CX} cy={AX} rx={rx} ry={ry} />
        ))}
      </g>
      <g fill={FIELD} opacity={op}>
        {LOOPS.map(([rx, ry]) =>
          forward ? (
            <g key={rx}>
              <polygon points={`${CX - 7},${AX - ry} ${CX + 5},${AX - ry - 5} ${CX + 5},${AX - ry + 5}`} />
              <polygon points={`${CX - 7},${AX + ry} ${CX + 5},${AX + ry - 5} ${CX + 5},${AX + ry + 5}`} />
            </g>
          ) : (
            <g key={rx}>
              <polygon points={`${CX + 7},${AX - ry} ${CX - 5},${AX - ry - 5} ${CX - 5},${AX - ry + 5}`} />
              <polygon points={`${CX + 7},${AX + ry} ${CX - 5},${AX + ry - 5} ${CX - 5},${AX + ry + 5}`} />
            </g>
          ),
        )}
      </g>
      {/* the field inside the coil, along the axis, toward north */}
      <line x1={forward ? 98 : 202} y1={AX} x2={forward ? 196 : 104} y2={AX} stroke={FIELD} strokeWidth={4} strokeLinecap="round" opacity={op} />
      <polygon points={forward ? `${206},${AX} ${194},${AX - 7} ${194},${AX + 7}` : `${94},${AX} ${106},${AX - 7} ${106},${AX + 7}`} fill={FIELD} opacity={op} />
      <Label x={forward ? 232 : 68} y={AX} size={18} bold color={vizColors.red}>N</Label>
      <Label x={forward ? 68 : 232} y={AX} size={18} bold color={vizColors.blue}>S</Label>

      {/* turns: the back half thin, the front half thick copper with the current arrow */}
      {TURNS.map((tx) => (
        <g key={tx}>
          <ellipse cx={tx} cy={AX} rx={9} ry={32} fill="none" stroke={vizColors.grid} strokeWidth={2} />
          <path d={`M ${tx} ${AX - 32} A 9 32 0 0 0 ${tx} ${AX + 32}`} fill="none" stroke={vizColors.copper} strokeWidth={4} strokeLinecap="round" />
          <polygon
            points={forward ? `${tx - 14},${AX - 6} ${tx - 4},${AX - 6} ${tx - 9},${AX + 6}` : `${tx - 14},${AX + 6} ${tx - 4},${AX + 6} ${tx - 9},${AX - 6}`}
            fill={vizColors.amber}
          />
        </g>
      ))}

      <Hand
        palm={{ x: 118, y: 126, w: 50, h: 42 }}
        fingers={[0, 1, 2, 3].map((k) => {
          const b = 126 + 11 * k;
          return `M ${b} 128 C ${b - 28} 118, ${b - 32} 62, ${b - 6} 50 C ${b + 10} 44, ${b + 22} 56, ${b + 20} 76 C ${b + 19} 92, ${b + 14} 102, ${b + 8} 110`;
        })}
        thumb="M 164 134 C 184 128, 196 112, 212 104 L 230 96"
        thumbHead="228,88 242,95 228,102"
        transform={forward ? undefined : `rotate(180 ${CX} ${AX})`}
      />
      {forward ? (
        <>
          <Label x={58} y={26} anchor="start" size={12} bold color={vizColors.amber}>fingers: current</Label>
          <Label x={296} y={126} anchor="end" size={12} bold color={FIELD}>thumb: field (north)</Label>
        </>
      ) : (
        <>
          <Label x={262} y={170} anchor="end" size={12} bold color={vizColors.amber}>fingers: current</Label>
          <Label x={4} y={64} anchor="start" size={12} bold color={FIELD}>thumb: field (north)</Label>
        </>
      )}
    </>
  );
}

/* ---------- straight trace ---------- */

const WX = 150; // wire, x
const WY = 118; // hand's rotation centre on the wire
const RINGS = [60, 95, 130];

function Trace({ forward, strength }: { forward: boolean; strength: number }) {
  const op = fieldOpacity(strength);
  return (
    <>
      {/* the field circles the wire; the lower half of each ellipse is the half nearer the viewer */}
      <g opacity={op}>
        {RINGS.map((yc) => (
          <g key={yc}>
            <path d={`M ${WX - 70} ${yc} A 70 16 0 0 1 ${WX + 70} ${yc}`} fill="none" stroke={FIELD} strokeWidth={1.4} strokeDasharray="5 5" />
            <polygon
              points={forward ? `${WX - 7},${yc - 16} ${WX + 5},${yc - 21} ${WX + 5},${yc - 11}` : `${WX + 7},${yc - 16} ${WX - 5},${yc - 21} ${WX - 5},${yc - 11}`}
              fill={FIELD}
            />
          </g>
        ))}
      </g>
      <rect x={WX - 6} y={14} width={12} height={162} rx={2} fill={vizColors.copper} />
      <line x1={WX} y1={forward ? 150 : 40} x2={WX} y2={forward ? 42 : 148} stroke={vizColors.amber} strokeWidth={3} />
      <polygon points={forward ? `${WX},24 ${WX - 7},40 ${WX + 7},40` : `${WX},166 ${WX - 7},150 ${WX + 7},150`} fill={vizColors.amber} />
      <g opacity={op}>
        {RINGS.map((yc) => (
          <g key={yc}>
            <path d={`M ${WX - 70} ${yc} A 70 16 0 0 0 ${WX + 70} ${yc}`} fill="none" stroke={FIELD} strokeWidth={2.2} />
            <polygon
              points={forward ? `${WX + 7},${yc + 16} ${WX - 5},${yc + 11} ${WX - 5},${yc + 21}` : `${WX - 7},${yc + 16} ${WX + 5},${yc + 11} ${WX + 5},${yc + 21}`}
              fill={FIELD}
            />
          </g>
        ))}
      </g>

      <Hand
        palm={{ x: 64, y: 96, w: 50, h: 44 }}
        fingers={[0, 1, 2, 3].map((k) => {
          const y = 102 + 11 * k;
          return `M 112 ${y} C 140 ${y - 8}, 168 ${y - 6}, 184 ${y + 4} C 192 ${y + 10}, 186 ${y + 18}, 174 ${y + 16}`;
        })}
        thumb="M 112 100 C 120 86, 128 72, 134 60"
        thumbHead="134,46 126,60 142,60"
        transform={forward ? undefined : `rotate(180 ${WX} ${WY})`}
      />
      {forward ? (
        <>
          <Label x={126} y={44} anchor="end" size={12} bold color={vizColors.amber}>thumb: current</Label>
          <Label x={196} y={172} anchor="start" size={12} bold color={FIELD}>fingers: field</Label>
        </>
      ) : (
        <>
          <Label x={176} y={178} anchor="start" size={12} bold color={vizColors.amber}>thumb: current</Label>
          <Label x={104} y={24} anchor="end" size={12} bold color={FIELD}>fingers: field</Label>
        </>
      )}
    </>
  );
}

/** One variant, drawn in a 300 × 190 box at the caller's transform. */
export function RightHandRule({ variant, forward, strength = 1 }: RightHandRuleProps) {
  return <g>{variant === "coil" ? <Coil forward={forward} strength={strength} /> : <Trace forward={forward} strength={strength} />}</g>;
}

/** Both variants side by side, for the lesson's theory figure. */
export function RightHandRuleFigure() {
  return (
    <SvgCanvas
      viewBox="0 0 640 236"
      className="mx-auto max-w-[680px]"
      title="The right-hand rule drawn twice: a hand gripping a straight copper trace with the thumb along the current and the fingers along the circling field, and a hand gripping a coil with the fingers along the current and the thumb pointing to the coil's north end"
    >
      <rect x={0} y={0} width={640} height={236} rx={8} fill={vizColors.bg} />
      <g transform="translate(10 8)">
        <RightHandRule variant="trace" forward />
      </g>
      <line x1={320} y1={16} x2={320} y2={200} stroke={vizColors.grid} strokeWidth={1} />
      <g transform="translate(330 8)">
        <RightHandRule variant="coil" forward />
      </g>
      <Label x={160} y={218} size={12} color={vizColors.muted}>Straight trace: thumb along the current,</Label>
      <Label x={160} y={232} size={12} color={vizColors.muted}>fingers curl the way the field goes</Label>
      <Label x={480} y={218} size={12} color={vizColors.muted}>Coil, like the motor winding: fingers along the current,</Label>
      <Label x={480} y={232} size={12} color={vizColors.muted}>thumb points to the north end</Label>
    </SvgCanvas>
  );
}
