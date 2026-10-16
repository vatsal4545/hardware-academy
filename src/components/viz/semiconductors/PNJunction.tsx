"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, polyline, useViz, vizColors } from "@/components/viz/shared";
import { Q, Readout, ReadoutGrid, clamp, eng, lerp, mulberry32 } from "./semisA-shared";

export type DiodeKind = "si" | "schottky";

/** Thermal voltage kT/q at 300 K, V. */
const VT = 0.02585;
/** Permittivity of silicon, F/cm. */
const EPS_SI = 11.7 * 8.854e-14;
const NI = 1e10;
/** Doping on each side of the junction, cm^-3. */
const DOPING = 5e15;
/** Die area used for the capacitance readout: 0.1 mm². */
const AREA_CM2 = 1e-3;

export interface DiodeModel {
  label: string;
  /** saturation current, A */
  is: number;
  /** ideality factor */
  n: number;
  /** series resistance, Ω */
  rs: number;
  /** built-in potential, V */
  vbi: number;
  /** p-side doping, cm^-3 (0 for the metal of a Schottky) */
  na: number;
  /** n-side doping, cm^-3 */
  nd: number;
}

export const DIODES: Record<DiodeKind, DiodeModel> = {
  // V_bi = (kT/q) ln(N_A N_D / n_i²) ≈ 0.68 V
  si: { label: "Si p-n", is: 1e-14, n: 1, rs: 2, vbi: VT * Math.log((DOPING * DOPING) / (NI * NI)), na: DOPING, nd: DOPING },
  // 0.6 eV barrier minus (Ec − E_F) = kT ln(Nc/N_D) ≈ 0.38 V
  schottky: { label: "Schottky", is: 1e-6, n: 1.05, rs: 2, vbi: 0.6 - VT * Math.log(2.8e19 / DOPING), na: 0, nd: DOPING },
};

const KIND_OPTIONS: { value: DiodeKind; label: string }[] = [
  { value: "si", label: "Si p-n" },
  { value: "schottky", label: "Schottky" },
];

function junctionCurrent(d: DiodeModel, vj: number): number {
  return d.is * Math.expm1(vj / (d.n * VT));
}

/** Solves V = Vj + I·Rs with I = Is(exp(Vj/nV_T) − 1) by bisection. */
export function diodeOperatingPoint(d: DiodeModel, v: number): { current: number; vj: number } {
  if (v === 0) return { current: 0, vj: 0 };
  let lo = Math.min(v, 0) - 1e-3;
  let hi = Math.max(v, 0) + 1e-3;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (mid + d.rs * junctionCurrent(d, mid) - v > 0) hi = mid;
    else lo = mid;
  }
  const vj = (lo + hi) / 2;
  return { current: junctionCurrent(d, vj), vj };
}

/** Depletion width in µm: W = sqrt(2ε(V_bi − Vj)/q · (1/N_A + 1/N_D)), held above a small floor near flat-band. */
export function depletionWidthUm(d: DiodeModel, vj: number): number {
  const v = Math.max(d.vbi - vj, 0.02);
  const inv = (d.na > 0 ? 1 / d.na : 0) + 1 / d.nd;
  return Math.sqrt(((2 * EPS_SI * v) / Q) * inv) * 1e4;
}

function stateText(v: number, i: number): string {
  if (v < 0) return "Reverse bias: blocking, leakage only";
  if (v === 0) return "Equilibrium: drift balances diffusion";
  if (i < 1e-6) return "Forward, barely conducting";
  if (i < 1e-3) return "Forward, turning on";
  return "Forward, conducting";
}

// ---- cross-section geometry ---------------------------------------------------
const CS_X0 = 30;
const CS_X1 = 430;
const CS_Y0 = 44;
const CS_Y1 = 140;
const XJ = 230;
const PX_PER_UM = 66;
const ROWS_Y = [58, 78, 98, 118];

// ---- band diagram geometry ----------------------------------------------------
const EC_N = 280; // conduction band edge in the neutral n region
const S = 20; // px per eV
const EG_PX = 1.12 * S;

// ---- I-V plot geometry ----------------------------------------------------------
const PX0 = 480;
const PX1 = 745;
const XO = 565;
const YO = 232;
const FWD_PX_PER_V = PX1 - XO; // 0..1 V
const REV_PX_PER_V = (XO - PX0) / 5; // -5..0 V
const I_FWD_MAX = 0.05;
const FWD_H = 190;
const I_REV_MAX = 2e-6;
const REV_H = 60;
const xOfV = (v: number) => (v >= 0 ? XO + v * FWD_PX_PER_V : XO + v * REV_PX_PER_V);
const yOfI = (i: number) => (i >= 0 ? YO - (Math.min(i, I_FWD_MAX) / I_FWD_MAX) * FWD_H : YO + (Math.min(-i, I_REV_MAX) / I_REV_MAX) * REV_H);

/** I-V curves for both diodes, computed once. Forward curves stop where they leave the 50 mA window. */
function buildCurve(d: DiodeModel): string {
  const pts: Array<[number, number]> = [];
  for (let k = 0; k <= 50; k++) {
    const v = -5 + k * 0.1;
    pts.push([xOfV(v), yOfI(diodeOperatingPoint(d, v).current)]);
  }
  let prev: { v: number; i: number } = { v: 0, i: 0 };
  for (let k = 1; k <= 250; k++) {
    const v = k * 0.004;
    const i = diodeOperatingPoint(d, v).current;
    if (i > I_FWD_MAX) {
      const vc = lerp(prev.v, v, (I_FWD_MAX - prev.i) / (i - prev.i));
      pts.push([xOfV(vc), yOfI(I_FWD_MAX)]);
      break;
    }
    pts.push([xOfV(v), yOfI(i)]);
    prev = { v, i };
  }
  return polyline(pts);
}
const CURVES: Record<DiodeKind, string> = { si: buildCurve(DIODES.si), schottky: buildCurve(DIODES.schottky) };
const CURVE_COLORS: Record<DiodeKind, string> = { si: vizColors.violet, schottky: vizColors.cyan };

/** Seeded jitter for the majority-carrier grid so it does not look like a spreadsheet. */
const JITTER = (() => {
  const r = mulberry32(77);
  return Array.from({ length: 64 }, () => ({ dx: (r() - 0.5) * 8, dy: (r() - 0.5) * 6, ph: r() * 6.28, w: 1.5 + r() * 2 }));
})();

export function PNJunction() {
  const [bias, setBias] = useState(0);
  const [kind, setKind] = useState<DiodeKind>("si");
  const { playing, toggle, reset, t } = useViz();

  const d = DIODES[kind];
  const { current, vj } = diodeOperatingPoint(d, bias);
  const w = depletionWidthUm(d, vj);
  const barrier = d.vbi - vj;
  const capacitance = (EPS_SI * AREA_CM2) / (w * 1e-4);
  const schottky = kind === "schottky";

  // depletion edges in the cross-section
  const xL = schottky ? XJ : XJ - (w / 2) * PX_PER_UM;
  const xR = schottky ? XJ + w * PX_PER_UM : XJ + (w / 2) * PX_PER_UM;

  // majority carriers outside the depletion region
  const holes: Array<{ x: number; y: number; key: string }> = [];
  const electrons: Array<{ x: number; y: number; key: string }> = [];
  ROWS_Y.forEach((y, r) => {
    for (let k = 0; k < 9; k++) {
      const j = JITTER[(r * 9 + k) % JITTER.length];
      const wob = 1.6 * Math.sin(j.w * t + j.ph);
      const hx = CS_X0 + 14 + 22 * k + j.dx + wob;
      if (!schottky && hx < xL - 6) holes.push({ x: hx, y: y + j.dy, key: `h${r}-${k}` });
      const ex = XJ + 12 + 22 * k + j.dx - wob;
      if (ex > xR + 6 && ex < CS_X1 - 6) electrons.push({ x: ex, y: y + j.dy, key: `e${r}-${k}` });
    }
  });

  // fixed ions uncovered by the depletion region
  const ions: Array<{ x: number; y: number; sign: "+" | "−"; key: string }> = [];
  for (let k = 0; k < 10; k++) {
    for (let r = 0; r < 4; r++) {
      const y = 60 + r * 22;
      const off = 6 + 13 * k + (r % 2) * 4;
      if (!schottky && XJ - off > xL) ions.push({ x: XJ - off, y, sign: "−", key: `a${k}-${r}` });
      if (XJ + off < xR) ions.push({ x: XJ + off, y, sign: "+", key: `d${k}-${r}` });
    }
  }

  // carriers crossing the junction in forward bias; count grows with log(current)
  const nCross = current > 0 ? clamp(Math.round((Math.log10(current) + 9) * 1.2), 0, 10) : 0;
  const crossing: Array<{ x: number; y: number; kind: "e" | "h"; opacity: number; key: string }> = [];
  for (let k = 0; k < nCross; k++) {
    const f = (t / 2.2 + k * 0.37) % 1;
    const lane = 56 + (k % 5) * 18;
    const fade = f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1;
    const eStart = Math.min(xR + 70, CS_X1 - 10);
    const eEnd = Math.max(xL - 70, CS_X0 + 10);
    crossing.push({ x: lerp(eStart, eEnd, f), y: lane, kind: "e", opacity: fade, key: `ce${k}` });
    if (!schottky) {
      const hStart = Math.max(xL - 70, CS_X0 + 10);
      const hEnd = Math.min(xR + 70, CS_X1 - 10);
      crossing.push({ x: lerp(hStart, hEnd, f), y: lane + 9, kind: "h", opacity: fade, key: `ch${k}` });
    }
  }
  // a Schottky leaks visibly in reverse: electrons from the metal over the fixed barrier
  if (schottky && current < -1e-7) {
    const f = (t / 4) % 1;
    crossing.push({ x: lerp(XJ - 30, Math.min(xR + 60, CS_X1 - 10), f), y: 96, kind: "e", opacity: 0.6, key: "leak" });
  }

  // band diagram: Ec(x) from the depletion approximation (parabolic bending)
  const b = Math.max(barrier, 0.02) * S;
  const ecAt = (x: number): number => {
    if (schottky) {
      if (x < XJ) return NaN;
      const u = clamp((x - XJ) / Math.max(xR - XJ, 1), 0, 1);
      return EC_N - b * (1 - u) ** 2;
    }
    if (x <= xL) return EC_N - b;
    if (x >= xR) return EC_N;
    if (x >= XJ) {
      const u = (x - XJ) / (xR - XJ);
      return EC_N - (b / 2) * (1 - u) ** 2;
    }
    const u = (XJ - x) / (XJ - xL);
    return EC_N - b + (b / 2) * (1 - u) ** 2;
  };
  const bandXs = Array.from({ length: 81 }, (_, k) => CS_X0 + (k * (CS_X1 - CS_X0)) / 80).filter((x) => !schottky || x >= XJ);
  const ecPath = polyline(bandXs.map((x) => [x, ecAt(x)]));
  const evPath = polyline(bandXs.map((x) => [x, ecAt(x) + EG_PX]));
  const efMetalY = EC_N - b + 0.6 * S; // metal Fermi level sits φ_B = 0.6 eV below the barrier top

  // operating point on the I-V plot
  const mx = xOfV(bias);
  const offScale = current > I_FWD_MAX;
  const my = offScale ? YO - FWD_H : yOfI(current);

  return (
    <VizFrame
      title="The p-n junction under bias"
      description="Drag the bias. Forward bias lowers the barrier and carriers pour across (the number of moving carriers grows with the log of the current); reverse bias widens the depletion region and blocks. Switch to a Schottky to see a lower turn-on voltage and higher leakage."
      controls={
        <>
          <Slider
            label="Bias voltage (anode to cathode)"
            value={bias}
            min={-5}
            max={1}
            step={0.05}
            onChange={setBias}
            format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} V`}
          />
          <Segmented label="Diode" options={KIND_OPTIONS} value={kind} onChange={setKind} />
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer={
        <ReadoutGrid label="Junction readouts">
          <Readout label="Current I" value={eng(Math.abs(current) < 1e-18 ? 0 : current, "A")} accent={vizColors.amber} />
          <Readout label="Depletion width W" value={`${w.toFixed(2)} µm`} />
          <Readout label="Barrier q(V_bi − V_j)" value={barrier < 0.02 ? "≈ 0 (high injection)" : `${barrier.toFixed(2)} eV`} />
          <Readout label="Built-in potential V_bi" value={`${d.vbi.toFixed(2)} V`} />
          <Readout label="Junction capacitance (0.1 mm²)" value={eng(capacitance, "F")} />
          <Readout label="State" value={stateText(bias, current)} />
        </ReadoutGrid>
      }
    >
      <SvgCanvas viewBox="0 0 760 330" title={`${d.label} junction at ${bias.toFixed(2)} V: current ${eng(current, "A")}`}>
        <rect x={0} y={0} width={760} height={330} fill={vizColors.bg} rx={8} />

        {/* ---------- cross-section ---------- */}
        {schottky ? (
          <rect x={CS_X0} y={CS_Y0} width={XJ - CS_X0} height={CS_Y1 - CS_Y0} fill={vizColors.copper} fillOpacity={0.3} />
        ) : (
          <rect x={CS_X0} y={CS_Y0} width={XJ - CS_X0} height={CS_Y1 - CS_Y0} fill={vizColors.hole} fillOpacity={0.1} />
        )}
        <rect x={XJ} y={CS_Y0} width={CS_X1 - XJ} height={CS_Y1 - CS_Y0} fill={vizColors.electron} fillOpacity={0.08} />
        <rect x={xL} y={CS_Y0} width={xR - xL} height={CS_Y1 - CS_Y0} fill={vizColors.bg} fillOpacity={0.75} />
        <line x1={xL} y1={CS_Y0} x2={xL} y2={CS_Y1} stroke={vizColors.muted} strokeDasharray="3 3" />
        <line x1={xR} y1={CS_Y0} x2={xR} y2={CS_Y1} stroke={vizColors.muted} strokeDasharray="3 3" />
        <rect x={CS_X0} y={CS_Y0} width={CS_X1 - CS_X0} height={CS_Y1 - CS_Y0} fill="none" stroke={vizColors.muted} strokeOpacity={0.6} />
        {/* contacts */}
        <rect x={CS_X0 - 8} y={CS_Y0} width={8} height={CS_Y1 - CS_Y0} fill={vizColors.silk} fillOpacity={0.7} />
        <rect x={CS_X1} y={CS_Y0} width={8} height={CS_Y1 - CS_Y0} fill={vizColors.silk} fillOpacity={0.7} />
        <Label x={CS_X0 - 4} y={CS_Y1 + 12} size={12} bold color={bias > 0 ? vizColors.positive : bias < 0 ? vizColors.negative : vizColors.muted}>
          {bias > 0 ? "+" : bias < 0 ? "−" : "0"}
        </Label>
        <Label x={CS_X1 + 4} y={CS_Y1 + 12} size={12} bold color={vizColors.muted}>
          0
        </Label>

        <Label x={(CS_X0 + XJ) / 2} y={CS_Y0 - 12} size={11} color={schottky ? vizColors.copper : vizColors.hole}>
          {schottky ? "metal (anode)" : "p-type, 5 × 10¹⁵ cm⁻³ (anode)"}
        </Label>
        <Label x={(XJ + CS_X1) / 2 + 20} y={CS_Y0 - 12} size={11} color={vizColors.electron}>
          n-type, 5 × 10¹⁵ cm⁻³ (cathode)
        </Label>
        <Label x={(xL + xR) / 2} y={CS_Y1 + 12} size={10} color={vizColors.muted}>
          W
        </Label>

        {ions.map((ion) => (
          <Label key={ion.key} x={ion.x} y={ion.y} size={11} bold color={ion.sign === "+" ? vizColors.positive : vizColors.negative}>
            {ion.sign}
          </Label>
        ))}
        {holes.map((h) => (
          <circle key={h.key} cx={h.x} cy={h.y} r={4} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={1.8} />
        ))}
        {electrons.map((e) => (
          <circle key={e.key} cx={e.x} cy={e.y} r={3.8} fill={vizColors.electron} />
        ))}
        {crossing.map((c) =>
          c.kind === "e" ? (
            <circle key={c.key} cx={c.x} cy={c.y} r={4} fill={vizColors.electron} opacity={c.opacity} />
          ) : (
            <circle key={c.key} cx={c.x} cy={c.y} r={4.2} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={1.8} opacity={c.opacity} />
          ),
        )}

        {/* ---------- band diagram ---------- */}
        <Label x={CS_X1} y={162} anchor="end" size={10} color={vizColors.muted}>
          Electron energy across the junction
        </Label>
        {schottky && (
          <g>
            <rect x={CS_X0} y={efMetalY} width={XJ - CS_X0} height={Math.max(0, 318 - efMetalY)} fill={vizColors.copper} fillOpacity={0.18} />
            <line x1={CS_X0} y1={efMetalY} x2={XJ} y2={efMetalY} stroke={vizColors.copper} strokeWidth={1.5} />
            <Label x={CS_X0 + 6} y={efMetalY + 10} anchor="start" size={10} color={vizColors.copper}>
              metal, filled to E_F
            </Label>
            <line x1={XJ - 6} y1={EC_N - b} x2={XJ - 6} y2={efMetalY} stroke={vizColors.amber} strokeWidth={1.5} />
            <Label x={XJ - 10} y={EC_N - b - 8} anchor="end" size={10} color={vizColors.amber}>
              φB = 0.6 eV from the metal side
            </Label>
          </g>
        )}
        {!schottky && <line x1={CS_X0} y1={EC_N} x2={xR} y2={EC_N} stroke={vizColors.grid} strokeDasharray="4 4" />}
        <path d={ecPath} fill="none" stroke={vizColors.electron} strokeWidth={2} />
        <path d={evPath} fill="none" stroke={vizColors.hole} strokeWidth={2} />
        <Label x={CS_X1 + 6} y={EC_N} anchor="start" size={10} color={vizColors.electron}>
          Ec
        </Label>
        <Label x={CS_X1 + 6} y={EC_N + EG_PX} anchor="start" size={10} color={vizColors.hole}>
          Ev
        </Label>
        {!schottky && (
          <g>
            <line x1={CS_X0 + 40} y1={EC_N - b} x2={CS_X0 + 40} y2={EC_N} stroke={vizColors.amber} strokeWidth={1.5} />
            <Label x={CS_X0 + 46} y={EC_N - b - 10} anchor="start" size={10} color={vizColors.amber}>
              {barrier < 0.02 ? "barrier ≈ 0: high injection, series R limits I" : `barrier ${barrier.toFixed(2)} eV`}
            </Label>
          </g>
        )}

        {/* ---------- I-V plot ---------- */}
        <rect x={PX0 - 6} y={24} width={PX1 - PX0 + 12} height={292} fill={vizColors.bg} stroke={vizColors.grid} rx={6} />
        {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
          <g key={`fv${v}`}>
            <line x1={xOfV(v)} y1={YO - FWD_H} x2={xOfV(v)} y2={YO} stroke={vizColors.grid} />
            <Label x={xOfV(v)} y={YO + 11} size={9} color={vizColors.muted}>
              {v.toFixed(1)}
            </Label>
          </g>
        ))}
        {[-1, -2, -3, -4, -5].map((v) => (
          <g key={`rv${v}`}>
            <line x1={xOfV(v)} y1={YO} x2={xOfV(v)} y2={YO + REV_H} stroke={vizColors.grid} />
            <Label x={xOfV(v)} y={YO - 9} size={9} color={vizColors.muted}>
              {`−${-v}`}
            </Label>
          </g>
        ))}
        {[10, 20, 30, 40, 50].map((ma) => (
          <g key={`fi${ma}`}>
            <line x1={XO} y1={yOfI(ma / 1000)} x2={PX1} y2={yOfI(ma / 1000)} stroke={vizColors.grid} />
            <Label x={XO - 4} y={yOfI(ma / 1000)} anchor="end" size={9} color={vizColors.muted}>
              {`${ma}`}
            </Label>
          </g>
        ))}
        {[1, 2].map((ua) => (
          <g key={`ri${ua}`}>
            <line x1={PX0} y1={yOfI(-ua * 1e-6)} x2={XO} y2={yOfI(-ua * 1e-6)} stroke={vizColors.grid} />
            <Label x={XO + 4} y={yOfI(-ua * 1e-6)} anchor="start" size={9} color={vizColors.muted}>
              {`−${ua}`}
            </Label>
          </g>
        ))}
        <line x1={PX0} y1={YO} x2={PX1} y2={YO} stroke={vizColors.muted} />
        <line x1={XO} y1={YO - FWD_H} x2={XO} y2={YO + REV_H} stroke={vizColors.muted} />
        <Label x={XO + 6} y={34} anchor="start" size={10} color={vizColors.text}>
          I (mA)
        </Label>
        <Label x={XO + 30} y={YO + 50} anchor="start" size={10} color={vizColors.text}>
          I (µA), reverse
        </Label>
        <Label x={PX1} y={YO + 24} anchor="end" size={10} color={vizColors.text}>
          V, 0.2 V/div
        </Label>
        <Label x={PX0 + 2} y={YO - 22} anchor="start" size={10} color={vizColors.text}>
          V, 1 V/div
        </Label>
        {(Object.keys(CURVES) as DiodeKind[]).map((k) => (
          <path
            key={k}
            d={CURVES[k]}
            fill="none"
            stroke={CURVE_COLORS[k]}
            strokeWidth={k === kind ? 2.5 : 1.2}
            strokeOpacity={k === kind ? 1 : 0.35}
          />
        ))}
        <circle cx={mx} cy={my} r={6} fill={vizColors.amber} stroke={vizColors.bg} strokeWidth={2} />
        {offScale && (
          <Label x={mx - 8} y={my + 14} anchor="end" size={9} color={vizColors.amber}>
            off scale ↑
          </Label>
        )}
        <g>
          <line x1={PX0 + 4} y1={300} x2={PX0 + 22} y2={300} stroke={vizColors.violet} strokeWidth={2.5} />
          <Label x={PX0 + 26} y={300} anchor="start" size={10} color={vizColors.violet}>
            Si p-n
          </Label>
          <line x1={PX0 + 74} y1={300} x2={PX0 + 92} y2={300} stroke={vizColors.cyan} strokeWidth={2.5} />
          <Label x={PX0 + 96} y={300} anchor="start" size={10} color={vizColors.cyan}>
            Schottky
          </Label>
        </g>
      </SvgCanvas>
    </VizFrame>
  );
}
