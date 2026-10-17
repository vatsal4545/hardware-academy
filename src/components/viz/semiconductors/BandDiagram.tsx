"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";
import { K_B, Q, Readout, ReadoutGrid, clamp, ease, lerp, mulberry32, r2, sci, seededOrder } from "./semisA-shared";

export type BandMaterialId = "si" | "ge" | "gaas" | "sic";

export interface BandMaterial {
  label: string;
  name: string;
  /** band gap at 300 K, eV */
  eg: number;
  /** intrinsic carrier density at 300 K, cm^-3 */
  ni300: number;
  /** electron and hole mobility at 300 K, cm²/V·s */
  mun: number;
  mup: number;
}

export const BAND_MATERIALS: Record<BandMaterialId, BandMaterial> = {
  si: { label: "Si", name: "Silicon", eg: 1.12, ni300: 1.0e10, mun: 1400, mup: 450 },
  ge: { label: "Ge", name: "Germanium", eg: 0.66, ni300: 2.0e13, mun: 3900, mup: 1900 },
  gaas: { label: "GaAs", name: "Gallium arsenide", eg: 1.42, ni300: 2.1e6, mun: 8500, mup: 400 },
  sic: { label: "SiC", name: "4H silicon carbide", eg: 3.26, ni300: 1.0e-8, mun: 900, mup: 120 },
};

const MATERIAL_OPTIONS = (Object.keys(BAND_MATERIALS) as BandMaterialId[]).map((id) => ({
  value: id,
  label: BAND_MATERIALS[id].label,
}));

/** n_i(T) = n_i(300 K) · (T/300)^1.5 · exp(−Eg/2k · (1/T − 1/300)), with Eg held at its 300 K value. */
export function intrinsicDensity(m: BandMaterial, kelvin: number): number {
  if (kelvin <= 0) return 0;
  return m.ni300 * (kelvin / 300) ** 1.5 * Math.exp(-(m.eg / (2 * K_B)) * (1 / kelvin - 1 / 300));
}

/** Intrinsic conductivity q·n_i·(μn + μp) in S/cm. Lattice-limited mobility falls roughly as T^-1.5. */
export function intrinsicConductivity(m: BandMaterial, kelvin: number): number {
  const ni = intrinsicDensity(m, kelvin);
  const mobilityScale = (Math.max(kelvin, 100) / 300) ** -1.5;
  return Q * ni * (m.mun + m.mup) * mobilityScale;
}

/** Electrons drawn in the conduction band: one per decade of n_i above 10^5 cm^-3 (a log scale). */
export function visibleElectrons(ni: number): number {
  if (ni <= 0) return 0;
  return clamp(Math.round(Math.log10(ni) - 5), 0, 14);
}

// ---- geometry -------------------------------------------------------------
const EV_Y = 250; // top edge of the valence band
const BAND_H = 50;
const PX_PER_EV = 55;
const X0 = 50;
const X1 = 330;
const COLS = 12;
const ROWS = 2;
const RISE = 0.6;
const FALL = 0.6;

// conductivity column, log scale 1e-16 .. 1e6 S/cm
const BAR_X = 478;
const BAR_TOP = 46;
const BAR_BOTTOM = 300;
const LOG_MIN = -16;
const LOG_MAX = 6;
const barY = (log: number) => r2(BAR_BOTTOM - ((clamp(log, LOG_MIN, LOG_MAX) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (BAR_BOTTOM - BAR_TOP));
const REFERENCES = [
  { name: "Copper", log: Math.log10(6e5) },
  { name: "Seawater", log: Math.log10(5e-2) },
  { name: "Si at 300 K", log: Math.log10(3e-6) },
  { name: "Glass", log: -13 },
];

/** One valence-band slot per electron, plus the random parameters of its hop cycle. Seeded, so SSR matches. */
const PAIRS = (() => {
  const r = mulberry32(1123);
  return Array.from({ length: COLS * ROWS }, (_, i) => ({
    x: X0 + 14 + (i % COLS) * ((X1 - X0 - 28) / (COLS - 1)),
    y: EV_Y + 15 + Math.floor(i / COLS) * 20,
    fx: r(),
    fy: r(),
    dwell: 2.4 + 2.2 * r(),
    rest: 0.5 + 1.1 * r(),
    offset: r(),
    w: 0.7 + 0.9 * r(),
    ph: r() * Math.PI * 2,
  }));
})();
/** Which slots get excited first as n_i rises, spread across the band. */
const ORDER = seededOrder(COLS * ROWS, 42);

function formatDensity(ni: number): string {
  if (ni === 0) return "0 cm⁻³";
  if (ni < 1e-99) return "≈ 0 cm⁻³";
  return `${sci(ni)} cm⁻³`;
}

function formatRatio(r: number): string {
  if (r === 0) return "0×";
  if (r < 1e-99) return "≈ 0×";
  if (r >= 0.1 && r < 1000) return `${Number(r.toPrecision(2))}×`;
  return `${sci(r)}×`;
}

export function BandDiagram() {
  const [kelvin, setKelvin] = useState(300);
  const [materialId, setMaterialId] = useState<BandMaterialId>("si");
  const { playing, toggle, reset, t } = useViz();

  const m = BAND_MATERIALS[materialId];
  const ni = intrinsicDensity(m, kelvin);
  const sigma = intrinsicConductivity(m, kelvin);
  const nVis = visibleElectrons(ni);
  const kT = K_B * kelvin;
  const ec = r2(EV_Y - m.eg * PX_PER_EV); // bottom edge of the conduction band
  const active = new Set(ORDER.slice(0, nVis));
  const jiggle = (kelvin / 600) * 1.6;

  const carriers = PAIRS.map((p, i) => {
    const home = { x: p.x + jiggle * Math.sin(t * 9 + i), y: p.y + jiggle * Math.cos(t * 7 + 2 * i) };
    if (!active.has(i)) return { key: i, ex: home.x, ey: home.y, hole: false, rising: false, sx: p.x, sy: p.y };
    const cbx = clamp(X0 + 16 + p.fx * (X1 - X0 - 32) + 10 * Math.sin(t * p.w + p.ph), X0 + 6, X1 - 6);
    const cby = clamp(ec - 10 - p.fy * (BAND_H - 20) + 4 * Math.sin(t * p.w * 1.3 + p.ph * 2), ec - BAND_H + 6, ec - 6);
    const cycle = RISE + p.dwell + FALL + p.rest;
    // start each excited electron in the middle of its stay in the conduction band, so a paused frame shows n_i
    const s = (((t + RISE + p.offset * p.dwell) % cycle) + cycle) % cycle;
    if (s < RISE) {
      const f = ease(s / RISE);
      return { key: i, ex: lerp(p.x, cbx, f), ey: lerp(p.y, cby, f), hole: true, rising: true, sx: p.x, sy: p.y };
    }
    if (s < RISE + p.dwell) return { key: i, ex: cbx, ey: cby, hole: true, rising: false, sx: p.x, sy: p.y };
    if (s < RISE + p.dwell + FALL) {
      const f = ease((s - RISE - p.dwell) / FALL);
      return { key: i, ex: lerp(cbx, p.x, f), ey: lerp(cby, p.y, f), hole: true, rising: false, sx: p.x, sy: p.y };
    }
    return { key: i, ex: home.x, ey: home.y, hole: false, rising: false, sx: p.x, sy: p.y };
  }).map((c) => ({ ...c, ex: r2(c.ex), ey: r2(c.ey), sx: r2(c.sx), sy: r2(c.sy) }));

  const logSigma = sigma > 0 ? Math.log10(sigma) : -Infinity;
  const sigmaY = barY(logSigma);
  const belowScale = !(logSigma > LOG_MIN);
  const kTpx = r2(Math.max(1, kT * PX_PER_EV));

  return (
    <VizFrame
      title="Band diagram: heat the crystal"
      description="Electrons hop from the full valence band across the gap at a rate set by exp(−Eg/2kT), leaving holes behind. The animation is log-scaled (each extra electron in the conduction band means about 10× more carriers); the readouts are exact."
      controls={
        <>
          <Slider
            label="Temperature"
            value={kelvin}
            min={0}
            max={600}
            step={10}
            onChange={setKelvin}
            format={(v) => `${v} K (${Math.round(v - 273.15)} °C)`}
          />
          <Segmented label="Material" options={MATERIAL_OPTIONS} value={materialId} onChange={setMaterialId} />
          <PlayPause
            playing={playing}
            onToggle={toggle}
            onReset={() => {
              reset();
              setKelvin(300);
              setMaterialId("si");
            }}
          />
        </>
      }
      footer={
        <ReadoutGrid label="Band diagram readouts">
          <Readout label="Material" value={`${m.name}, Eg = ${m.eg.toFixed(2)} eV`} />
          <Readout label="Thermal energy kT" value={`${(kT * 1000).toFixed(1)} meV`} />
          <Readout label="Eg / 2kT" value={kelvin > 0 ? (m.eg / (2 * kT)).toFixed(1) : "∞"} />
          <Readout label="Free electrons n_i (= holes)" value={formatDensity(ni)} accent={vizColors.electron} />
          <Readout label="Compared with Si at 300 K" value={formatRatio(ni / BAND_MATERIALS.si.ni300)} />
          <Readout label="Intrinsic conductivity σ" value={sigma > 0 ? `${sci(sigma)} S/cm` : "0 S/cm"} accent={vizColors.amber} />
        </ReadoutGrid>
      }
    >
      <SvgCanvas
        viewBox="0 0 640 320"
        title={`Energy band diagram of ${m.name.toLowerCase()} at ${kelvin} K with ${nVis} electrons drawn in the conduction band`}
      >
        <rect x={0} y={0} width={640} height={320} fill={vizColors.bg} rx={8} />

        {/* energy axis */}
        <line x1={30} y1={306} x2={30} y2={20} stroke={vizColors.muted} strokeWidth={1.5} />
        <polygon points="30,12 25,22 35,22" fill={vizColors.muted} />
        <Label x={18} y={160} size={11} color={vizColors.muted} rotate={-90}>
          Electron energy
        </Label>

        {/* conduction band */}
        <rect x={X0} y={ec - BAND_H} width={X1 - X0} height={BAND_H} fill={vizColors.cyan} fillOpacity={0.1} stroke={vizColors.cyan} strokeOpacity={0.6} rx={4} />
        <Label x={X0 + 8} y={ec - BAND_H + 11} anchor="start" size={10} color={vizColors.cyan}>
          Conduction band (empty at 0 K)
        </Label>

        {/* valence band */}
        <rect x={X0} y={EV_Y} width={X1 - X0} height={BAND_H} fill={vizColors.blue} fillOpacity={0.16} stroke={vizColors.blue} strokeOpacity={0.6} rx={4} />
        <Label x={X0 + 8} y={EV_Y + BAND_H + 10} anchor="start" size={10} color={vizColors.blue}>
          Valence band (bonding electrons)
        </Label>

        {/* gap annotation */}
        <line x1={X1 + 14} y1={ec} x2={X1 + 14} y2={EV_Y} stroke={vizColors.violet} strokeWidth={1.5} />
        <polygon points={`${X1 + 14},${ec} ${X1 + 10},${ec + 7} ${X1 + 18},${ec + 7}`} fill={vizColors.violet} />
        <polygon points={`${X1 + 14},${EV_Y} ${X1 + 10},${EV_Y - 7} ${X1 + 18},${EV_Y - 7}`} fill={vizColors.violet} />
        <Label x={X1 + 22} y={(ec + EV_Y) / 2} anchor="start" size={12} color={vizColors.violet} bold>
          {`Eg = ${m.eg.toFixed(2)} eV`}
        </Label>

        {/* kT drawn to the same energy scale */}
        <rect x={X1 + 10} y={r2(EV_Y + BAND_H - kTpx)} width={8} height={kTpx} fill={vizColors.amber} />
        <Label x={X1 + 22} y={EV_Y + BAND_H - 6} anchor="start" size={10} color={vizColors.amber}>
          kT, same scale
        </Label>

        {/* hop trails, holes and electrons */}
        {carriers.map((c) =>
          c.rising ? (
            <line key={`tr${c.key}`} x1={c.sx} y1={c.sy} x2={c.ex} y2={c.ey} stroke={vizColors.electron} strokeOpacity={0.35} strokeDasharray="3 3" />
          ) : null,
        )}
        {carriers.map((c) =>
          c.hole ? <circle key={`h${c.key}`} cx={c.sx} cy={c.sy} r={5} fill="none" stroke={vizColors.hole} strokeWidth={1.8} /> : null,
        )}
        {carriers.map((c) => (
          <circle key={`e${c.key}`} cx={c.ex} cy={c.ey} r={4.2} fill={vizColors.electron} />
        ))}

        {kelvin === 0 && (
          <Label x={(X0 + X1) / 2} y={(ec + EV_Y) / 2} size={11} color={vizColors.muted}>
            0 K: every electron is locked in a bond
          </Label>
        )}

        {/* conductivity column */}
        <Label x={BAR_X + 40} y={16} size={11} color={vizColors.text}>
          Intrinsic conductivity
        </Label>
        <Label x={BAR_X + 40} y={30} size={9} color={vizColors.muted}>
          S/cm, log scale
        </Label>
        <rect x={BAR_X} y={BAR_TOP} width={16} height={BAR_BOTTOM - BAR_TOP} fill={vizColors.grid} rx={3} />
        {!belowScale && <rect x={BAR_X} y={sigmaY} width={16} height={r2(BAR_BOTTOM - sigmaY)} fill={vizColors.amber} rx={3} />}
        {REFERENCES.map((ref) => (
          <g key={ref.name}>
            <line x1={BAR_X - 4} y1={barY(ref.log)} x2={BAR_X + 20} y2={barY(ref.log)} stroke={vizColors.muted} strokeWidth={1} />
            <Label x={BAR_X + 26} y={barY(ref.log)} anchor="start" size={10} color={vizColors.muted}>
              {ref.name}
            </Label>
          </g>
        ))}
        <Label x={BAR_X - 6} y={BAR_TOP} anchor="end" size={9} color={vizColors.muted}>
          10⁶
        </Label>
        <Label x={BAR_X - 6} y={BAR_BOTTOM} anchor="end" size={9} color={vizColors.muted}>
          10⁻¹⁶
        </Label>
        {belowScale && (
          <Label x={BAR_X + 8} y={BAR_BOTTOM + 12} size={9} color={vizColors.muted}>
            below scale
          </Label>
        )}
      </SvgCanvas>
    </VizFrame>
  );
}
