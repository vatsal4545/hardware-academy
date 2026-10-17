"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, useAnimationFrame, useViz, vizColors } from "@/components/viz/shared";
import { Q, Readout, ReadoutGrid, clamp, eng, mulberry32, r2, sci } from "./semisA-shared";

export type DopingMode = "intrinsic" | "n" | "p";

/** Intrinsic carrier density of silicon at 300 K, cm^-3. */
const NI = 1e10;
/** Silicon atoms per cm^3. */
const SI_ATOMS = 5e22;

/** Electron and hole densities from charge neutrality plus the mass-action law n·p = n_i². */
export function carrierDensities(mode: DopingMode, doping: number): { n: number; p: number } {
  if (mode === "intrinsic") return { n: NI, p: NI };
  const majority = doping / 2 + Math.sqrt((doping / 2) ** 2 + NI * NI);
  const minority = (NI * NI) / majority;
  return mode === "n" ? { n: majority, p: minority } : { n: minority, p: majority };
}

/** Caughey-Thomas mobility of silicon at 300 K, with low-doping limits of 1400 (electrons) and 450 (holes) cm²/V·s. */
export function mobility(impurities: number): { mun: number; mup: number } {
  const mun = 65 + (1400 - 65) / (1 + (impurities / 9.2e16) ** 0.711);
  const mup = 47.7 + (450 - 47.7) / (1 + (impurities / 2.23e17) ** 0.719);
  return { mun, mup };
}

function formatConductivity(s: number): string {
  if (s >= 0.01 && s < 1000) return `${Number(s.toPrecision(3))} S/cm`;
  return `${sci(s)} S/cm`;
}

function formatResistivity(r: number): string {
  if (r >= 1000) return `${sci(r)} Ω·cm`;
  if (r >= 0.01) return `${Number(r.toPrecision(3))} Ω·cm`;
  return eng(r, "Ω·cm");
}

function oneIn(r: number): string {
  if (r >= 1e9) return `${Number((r / 1e9).toPrecision(2))} billion`;
  if (r >= 1e6) return `${Number((r / 1e6).toPrecision(2))} million`;
  const v = Number(r.toPrecision(2));
  return v >= 1000 ? `${Math.floor(v / 1000)},${String(v % 1000).padStart(3, "0")}` : String(v);
}

// ---- geometry -------------------------------------------------------------
const COLS = 9;
const ROWS = 5;
const PITCH = 58;
const SX = 68;
const SY = 52;
const ATOM_R = 16;
const X_MIN = 40;
const X_MAX = 560;
const siteX = (c: number) => SX + c * PITCH;
const siteY = (r: number) => SY + r * PITCH;
/** Lattice sites that become dopants, in the order they appear as doping rises. */
const DOPANT_SITES: Array<[number, number]> = [
  [4, 2],
  [1, 1],
  [7, 3],
  [2, 4],
  [6, 0],
  [8, 1],
];
const MODE_OPTIONS: { value: DopingMode; label: string }[] = [
  { value: "intrinsic", label: "Intrinsic" },
  { value: "n", label: "n-type" },
  { value: "p", label: "p-type" },
];

/** Thermal-motion parameters for up to 8 carriers; seeded so server and client agree. */
const WANDER = (() => {
  const r = mulberry32(2024);
  return Array.from({ length: 8 }, () => ({
    w1: 0.9 + r() * 1.2,
    w2: 2.1 + r() * 1.5,
    w3: 0.8 + r() * 1.1,
    w4: 1.9 + r() * 1.7,
    p1: r() * 6.28,
    p2: r() * 6.28,
    p3: r() * 6.28,
    p4: r() * 6.28,
  }));
})();

interface Carrier {
  kind: "e" | "h";
  bx: number;
  by: number;
  minority: boolean;
}

const wrap = (x: number) => X_MIN + ((((x - X_MIN) % (X_MAX - X_MIN)) + (X_MAX - X_MIN)) % (X_MAX - X_MIN));

export function DopingLattice() {
  const [mode, setMode] = useState<DopingMode>("n");
  const [logN, setLogN] = useState(16);
  const [field, setField] = useState(false);
  const [driftTime, setDriftTime] = useState(0);
  const { playing, toggle, reset, t } = useViz();
  useAnimationFrame((dt) => setDriftTime((d) => d + dt), playing && field);

  const doping = 10 ** logN;
  const impurities = mode === "intrinsic" ? 0 : doping;
  const { n, p } = carrierDensities(mode, doping);
  const { mun, mup } = mobility(impurities);
  const sigma = Q * (n * mun + p * mup);
  const rho = 1 / sigma;
  const dopantCount = mode === "intrinsic" ? 0 : clamp(Math.round(logN - 13), 1, DOPANT_SITES.length);
  const dopants = DOPANT_SITES.slice(0, dopantCount);
  const dopantKey = new Set(dopants.map(([c, r]) => `${c},${r}`));

  // carriers: one majority carrier per drawn dopant plus one (dim) minority carrier; intrinsic shows two thermal pairs
  const carriers: Carrier[] =
    mode === "intrinsic"
      ? [
          { kind: "e", bx: siteX(1) + PITCH / 2, by: siteY(1) + PITCH / 2, minority: false },
          { kind: "h", bx: siteX(2) + PITCH / 2, by: siteY(2) + PITCH / 2, minority: false },
          { kind: "e", bx: siteX(5) + PITCH / 2, by: siteY(0) + PITCH / 2, minority: false },
          { kind: "h", bx: siteX(6) + PITCH / 2, by: siteY(3) + PITCH / 2, minority: false },
        ]
      : [
          ...dopants.map(([c, r], i): Carrier => ({
            kind: mode === "n" ? "e" : "h",
            bx: siteX(c) + (i % 2 === 0 ? 1 : -1) * (PITCH / 2),
            by: siteY(clamp(r, 0, ROWS - 2)) + PITCH / 2,
            minority: false,
          })),
          { kind: mode === "n" ? "h" : "e", bx: siteX(3) + PITCH / 2, by: siteY(2) + PITCH / 2, minority: true },
        ];

  const ve = 36 * (mun / 1400); // px/s, proportional to mobility
  const vh = 36 * (mup / 1400);
  const placed = carriers.map((c, i) => {
    const w = WANDER[i % WANDER.length];
    const drift = c.kind === "e" ? -ve * driftTime : vh * driftTime;
    // thermal wander uses Math.sin: round before the value reaches markup
    const x = r2(wrap(c.bx + drift + 14 * Math.sin(w.w1 * t + w.p1) + 6 * Math.sin(w.w2 * t + w.p2)));
    const y = r2(clamp(c.by + 10 * Math.sin(w.w3 * t + w.p3) + 5 * Math.sin(w.w4 * t + w.p4), 34, 296));
    return { ...c, x, y, key: i };
  });

  const bonds: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1) bonds.push({ x1: siteX(c) + ATOM_R, y1: siteY(r), x2: siteX(c + 1) - ATOM_R, y2: siteY(r), key: `h${c}-${r}` });
      if (r < ROWS - 1) bonds.push({ x1: siteX(c), y1: siteY(r) + ATOM_R, x2: siteX(c), y2: siteY(r + 1) - ATOM_R, key: `v${c}-${r}` });
    }
  }

  const dopantLabel = mode === "n" ? "P" : "B";
  const ionSign = mode === "n" ? "+" : "−";
  const ionColor = mode === "n" ? vizColors.positive : vizColors.negative;

  return (
    <VizFrame
      title="Doping lattice: electrons and holes"
      description="A 2-D cartoon of the silicon lattice; each pair of lines is a two-electron bond. Cyan dots are free electrons, pink rings are holes, and the dim one is a minority carrier. Turn on the field: electrons and holes drift in opposite directions, electrons about three times faster, yet both carry current the same way."
      controls={
        <>
          <Segmented label="Material" options={MODE_OPTIONS} value={mode} onChange={setMode} />
          <Slider
            label={mode === "intrinsic" ? "Doping concentration (unused when intrinsic)" : "Doping concentration"}
            value={logN}
            min={14}
            max={19}
            step={0.1}
            onChange={setLogN}
            format={(v) => `${sci(10 ** v)} cm⁻³`}
          />
          <div className="space-y-3">
            <Toggle label="Apply electric field" checked={field} onChange={setField} />
            <PlayPause
              playing={playing}
              onToggle={toggle}
              onReset={() => {
                reset();
                setDriftTime(0);
              }}
            />
          </div>
        </>
      }
      footer={
        <ReadoutGrid label="Doping readouts">
          <Readout label="Electrons n" value={`${sci(n)} cm⁻³`} accent={vizColors.electron} />
          <Readout label="Holes p" value={`${sci(p)} cm⁻³`} accent={vizColors.hole} />
          <Readout label="Mobility μn / μp" value={`${Math.round(mun)} / ${Math.round(mup)} cm²/V·s`} />
          <Readout label="Conductivity σ = q(nμn + pμp)" value={formatConductivity(sigma)} />
          <Readout label="Resistivity ρ = 1/σ" value={formatResistivity(rho)} accent={vizColors.amber} />
          <Readout label="Drift speed at 1 kV/cm (e⁻ / h⁺)" value={`${(mun / 100).toFixed(1)} / ${(mup / 100).toFixed(1)} km/s`} />
          <Readout label="Dopant atoms" value={mode === "intrinsic" ? "none: pure crystal" : `1 in ${oneIn(SI_ATOMS / doping)} Si atoms`} />
        </ReadoutGrid>
      }
    >
      <SvgCanvas
        viewBox="0 0 600 330"
        title={`Silicon lattice, ${mode === "intrinsic" ? "intrinsic" : `${mode}-type at ${sci(doping)} per cubic centimetre`}${field ? ", with an applied electric field" : ""}`}
      >
        <rect x={0} y={0} width={600} height={330} fill={vizColors.bg} rx={8} />

        {/* field plates */}
        {field && (
          <g>
            <rect x={10} y={30} width={10} height={270} fill={vizColors.positive} fillOpacity={0.7} rx={2} />
            <rect x={580} y={30} width={10} height={270} fill={vizColors.negative} fillOpacity={0.7} rx={2} />
            <Label x={15} y={18} size={14} color={vizColors.positive} bold>
              +
            </Label>
            <Label x={585} y={18} size={14} color={vizColors.negative} bold>
              −
            </Label>
            <Arrow x1={250} y1={16} x2={350} y2={16} color={vizColors.amber} width={2} />
            <Label x={300} y={6} size={10} color={vizColors.amber}>
              field E
            </Label>
          </g>
        )}

        {/* bonds: two lines per bond = two shared electrons */}
        {bonds.map((b) => {
          const horizontal = b.y1 === b.y2;
          const dx = horizontal ? 0 : 3;
          const dy = horizontal ? 3 : 0;
          return (
            <g key={b.key} stroke={vizColors.muted} strokeOpacity={0.35} strokeWidth={1.4}>
              <line x1={b.x1 - dx} y1={b.y1 - dy} x2={b.x2 - dx} y2={b.y2 - dy} />
              <line x1={b.x1 + dx} y1={b.y1 + dy} x2={b.x2 + dx} y2={b.y2 + dy} />
            </g>
          );
        })}

        {/* atoms */}
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const isDopant = dopantKey.has(`${c},${r}`);
            return (
              <g key={`a${c}-${r}`}>
                <circle
                  cx={siteX(c)}
                  cy={siteY(r)}
                  r={ATOM_R}
                  fill={isDopant ? ionColor : vizColors.grid}
                  fillOpacity={isDopant ? 0.25 : 1}
                  stroke={isDopant ? ionColor : vizColors.muted}
                  strokeOpacity={isDopant ? 1 : 0.5}
                  strokeWidth={isDopant ? 2 : 1}
                />
                <Label x={siteX(c)} y={siteY(r) + 1} size={isDopant ? 12 : 10} color={isDopant ? ionColor : vizColors.muted} bold={isDopant}>
                  {isDopant ? dopantLabel : "Si"}
                </Label>
                {isDopant && (
                  <Label x={siteX(c) + 13} y={siteY(r) - 13} size={12} color={ionColor} bold>
                    {ionSign}
                  </Label>
                )}
              </g>
            );
          }),
        )}

        {/* free carriers */}
        {placed.map((c) =>
          c.kind === "e" ? (
            <circle key={c.key} cx={c.x} cy={c.y} r={5.5} fill={vizColors.electron} opacity={c.minority ? 0.45 : 1} />
          ) : (
            <circle key={c.key} cx={c.x} cy={c.y} r={5.5} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={2.2} opacity={c.minority ? 0.45 : 1} />
          ),
        )}

        {/* footnote and current direction */}
        <Label x={40} y={318} anchor="start" size={10} color={vizColors.muted}>
          {mode === "intrinsic"
            ? "Pure silicon: n = p = n_i, about 1 × 10¹⁰ cm⁻³"
            : `Not to scale: really 1 in ${oneIn(SI_ATOMS / doping)} atoms`}
        </Label>
        {field ? (
          <g>
            <Arrow x1={430} y1={318} x2={540} y2={318} color={vizColors.amber} width={2} />
            <Label x={420} y={318} anchor="end" size={10} color={vizColors.amber}>
              current I
            </Label>
          </g>
        ) : (
          <Label x={560} y={318} anchor="end" size={10} color={vizColors.muted}>
            No field: no net drift
          </Label>
        )}
      </SvgCanvas>
    </VizFrame>
  );
}
