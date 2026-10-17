"use client";

import { useId, useState } from "react";
import { PlayPause, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, polyline, useViz, vizColors } from "@/components/viz/shared";
import { Readout, ReadoutGrid, clamp, eng, r2, r3 } from "./semisA-shared";

/** Threshold voltage, V. */
export const VTH = 1.5;
/** Transconductance parameter μn·Cox·W/L, A/V². */
export const K = 2e-3;
/** Channel-length modulation, 1/V. */
export const LAMBDA = 0.04;
const VT = 0.02585;
/** Subthreshold slope factor and current at threshold, for the cutoff readout. */
const N_SUB = 1.5;
const I_T = 2e-6;

export type MosfetRegion = "cutoff" | "triode" | "saturation";

export function mosfetRegion(vgs: number, vds: number): MosfetRegion {
  if (vgs <= VTH) return "cutoff";
  return vds < vgs - VTH ? "triode" : "saturation";
}

/** Long-channel square law with channel-length modulation; exponential subthreshold leakage below Vth. */
export function drainCurrent(vgs: number, vds: number): number {
  if (vds <= 0) return 0;
  const vov = vgs - VTH;
  if (vov <= 0) return I_T * Math.exp(vov / (N_SUB * VT)) * (1 - Math.exp(-vds / VT));
  if (vds < vov) return K * (vov * vds - (vds * vds) / 2) * (1 + LAMBDA * vds);
  return 0.5 * K * vov * vov * (1 + LAMBDA * vds);
}

const REGION_LABEL: Record<MosfetRegion, string> = {
  cutoff: "Cutoff",
  triode: "Triode (linear)",
  saturation: "Saturation",
};

// ---- cross-section geometry ---------------------------------------------------
const SURF = 130; // silicon surface
const CH_X0 = 150; // source edge of the channel
const CH_L = 150; // channel length in px

// ---- output-characteristic plot -------------------------------------------------
const P_X0 = 490;
const P_X1 = 735;
const P_Y0 = 280;
const PX_PER_V = (P_X1 - P_X0) / 5;
const PX_PER_MA = 15;
const xOfVds = (v: number) => P_X0 + v * PX_PER_V;
const yOfId = (i: number) => P_Y0 - Math.min(i * 1000, 16) * PX_PER_MA;
const curveFor = (vgs: number) =>
  polyline(Array.from({ length: 101 }, (_, k) => k * 0.05).map((v) => [xOfVds(v), yOfId(drainCurrent(vgs, v))]));
const FAMILY = [2, 2.5, 3, 3.5, 4, 4.5, 5].map((vgs) => ({ vgs, d: curveFor(vgs) }));
const BOUNDARY = polyline(
  Array.from({ length: 71 }, (_, k) => k * 0.05).map((v) => [xOfVds(v), yOfId(0.5 * K * v * v * (1 + LAMBDA * v))]),
);
const I_MAX = drainCurrent(5, 5);

// fixed electrons inside the n+ source and drain
const WELL_DOTS = Array.from({ length: 12 }, (_, i) => ({ dx: 14 + (i % 6) * 15, dy: 10 + Math.floor(i / 6) * 12 }));

export function MosfetCrossSection() {
  const [vgs, setVgs] = useState(3);
  const [vds, setVds] = useState(2);
  const { playing, toggle, reset, t } = useViz();
  const gradId = `mos-channel-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const region = mosfetRegion(vgs, vds);
  const id = drainCurrent(vgs, vds);
  const vov = vgs - VTH;
  const on = vov > 0;

  // gradual-channel picture: local overdrive u(x) falls from Vov at the source to Vov − Veff at the drain end
  const pinchFrac = region === "saturation" ? 1 - clamp(0.06 * (vds - vov), 0, 0.25) : 1;
  const lEff = CH_L * pinchFrac;
  const vEff = Math.min(vds, Math.max(vov, 0));
  const uAt = (frac: number) => (on ? Math.sqrt(Math.max(vov * vov - (vov * vov - (vov - vEff) ** 2) * frac, 0)) : 0);
  const thickness = (u: number) => 1.5 + (9 * u) / 3.5;
  const top: Array<[number, number]> = [];
  const bottom: Array<[number, number]> = [];
  for (let k = 0; k <= 30; k++) {
    const frac = k / 30;
    const x = CH_X0 + frac * lEff;
    top.push([x, SURF]);
    bottom.push([x, SURF + thickness(uAt(frac))]);
  }
  const channelPath = `${polyline([...top, ...bottom.slice().reverse()])} Z`;
  const stops = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, o: r3(0.25 + (0.65 * uAt(f)) / 3.5) }));

  // depletion boundaries: under the gate (grows until threshold, then pins) and around source and drain wells
  const gateDep = r2(6 + 12 * clamp(vgs / VTH, 0, 1));
  const drainDep = r2(5 + 5 * Math.sqrt(0.7 + vds));
  const sourceDep = r2(5 + 5 * Math.sqrt(0.7));

  // moving electrons: count follows channel charge, speed follows current
  const nMove = on ? clamp(Math.round(3 + 2.5 * vov), 0, 12) : 0;
  const speed = (140 * id) / I_MAX;
  const movers = Array.from({ length: nMove }, (_, i) => {
    const x = CH_X0 + ((((t * speed + (i * CH_L) / nMove) % CH_L) + CH_L) % CH_L);
    const frac = (x - CH_X0) / lEff;
    const y = frac <= 1 ? SURF + thickness(uAt(frac)) / 2 : SURF + 2.5;
    return { x: r2(x), y: r2(y), key: i };
  });

  const opX = xOfVds(vds);
  const opY = r2(yOfId(id));

  return (
    <VizFrame
      title="NMOS transistor: gate opens a channel"
      description="Raise V_GS past the 1.5 V threshold and an electron channel forms under the gate (brighter means more electrons). Raise V_DS and the channel thins toward the drain until it pinches off: the current stops growing and the transistor saturates."
      controls={
        <>
          <Slider label="Gate voltage V_GS" value={vgs} min={0} max={5} step={0.05} unit="V" onChange={setVgs} format={(v) => `${v.toFixed(2)} V`} />
          <Slider label="Drain voltage V_DS" value={vds} min={0} max={5} step={0.05} unit="V" onChange={setVds} format={(v) => `${v.toFixed(2)} V`} />
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer={
        <ReadoutGrid label="MOSFET readouts">
          <Readout label="Region" value={REGION_LABEL[region]} accent={vizColors.amber} />
          <Readout label="Drain current I_D" value={id < 1e-15 ? "< 1 fA" : eng(id, "A")} />
          <Readout label="Overdrive V_GS − V_th" value={on ? `${vov.toFixed(2)} V` : `${vov.toFixed(2)} V (below threshold)`} />
          <Readout label="On-resistance at small V_DS, 1/(k·V_ov)" value={on ? eng(1 / (K * vov), "Ω") : "open: no channel"} />
          <Readout label="Power in the channel V_DS·I_D" value={eng(vds * id < 1e-15 ? 0 : vds * id, "W")} />
          <Readout label="Threshold V_th, gate current" value="1.50 V, ≈ 0 (insulated gate)" />
        </ReadoutGrid>
      }
    >
      <SvgCanvas viewBox="0 0 760 330" title={`NMOS cross-section at V_GS ${vgs.toFixed(2)} V and V_DS ${vds.toFixed(2)} V, region ${REGION_LABEL[region]}`}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
            {stops.map((s) => (
              <stop key={s.f} offset={s.f} stopColor={vizColors.electron} stopOpacity={s.o} />
            ))}
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={760} height={330} fill={vizColors.bg} rx={8} />

        {/* ---------- cross-section ---------- */}
        <rect x={30} y={SURF} width={390} height={160} fill={vizColors.hole} fillOpacity={0.08} stroke={vizColors.muted} strokeOpacity={0.5} />
        <Label x={225} y={270} size={11} color={vizColors.hole}>
          p-type body
        </Label>

        {/* depletion boundaries */}
        <path
          d={`M ${50 - sourceDep} ${SURF} V ${SURF + 48 + sourceDep} H ${150 + sourceDep} V ${SURF + gateDep} H ${300 - drainDep} V ${SURF + 48 + drainDep} H ${400 + drainDep} V ${SURF}`}
          fill="none"
          stroke={vizColors.muted}
          strokeDasharray="4 4"
          strokeOpacity={0.7}
        />
        <Label x={350} y={SURF + 66 + drainDep} size={9} color={vizColors.muted}>
          depletion edge
        </Label>

        {/* source and drain wells */}
        <rect x={50} y={SURF} width={100} height={48} rx={8} fill={vizColors.electron} fillOpacity={0.22} stroke={vizColors.electron} />
        <rect x={300} y={SURF} width={100} height={48} rx={8} fill={vizColors.electron} fillOpacity={0.22} stroke={vizColors.electron} />
        {WELL_DOTS.map((d, i) => (
          <g key={i}>
            <circle cx={50 + d.dx} cy={SURF + d.dy} r={2.6} fill={vizColors.electron} opacity={0.8} />
            <circle cx={300 + d.dx} cy={SURF + d.dy} r={2.6} fill={vizColors.electron} opacity={0.8} />
          </g>
        ))}
        <Label x={100} y={SURF + 38} size={10} color={vizColors.electron}>
          n⁺ source
        </Label>
        <Label x={350} y={SURF + 38} size={10} color={vizColors.electron}>
          n⁺ drain
        </Label>

        {/* channel */}
        {on ? (
          <path d={channelPath} fill={`url(#${gradId})`} />
        ) : (
          <Label x={225} y={SURF + 14} size={9} color={vizColors.muted}>
            no channel (off)
          </Label>
        )}
        {region === "saturation" && (
          <g>
            <line x1={r2(CH_X0 + lEff)} y1={SURF - 2} x2={r2(CH_X0 + lEff)} y2={SURF + 14} stroke={vizColors.amber} strokeWidth={1.5} />
            <Label x={r2(CH_X0 + lEff - 4)} y={SURF + 24} anchor="end" size={9} color={vizColors.amber}>
              pinch-off
            </Label>
          </g>
        )}
        {movers.map((m) => (
          <circle key={m.key} cx={m.x} cy={m.y} r={2.8} fill={vizColors.electron} />
        ))}

        {/* oxide and gate */}
        <rect x={CH_X0} y={SURF - 8} width={CH_L} height={8} fill={vizColors.silk} fillOpacity={0.45} />
        <rect x={CH_X0} y={SURF - 36} width={CH_L} height={28} fill={vizColors.violet} fillOpacity={0.3} stroke={vizColors.violet} />
        <Label x={225} y={SURF - 22} size={10} color={vizColors.violet}>
          gate
        </Label>

        {/* contacts and terminals */}
        <rect x={70} y={SURF - 16} width={60} height={16} fill={vizColors.silk} fillOpacity={0.6} />
        <rect x={320} y={SURF - 16} width={60} height={16} fill={vizColors.silk} fillOpacity={0.6} />
        <rect x={205} y={SURF - 48} width={40} height={12} fill={vizColors.silk} fillOpacity={0.6} />
        <rect x={200} y={SURF + 160} width={50} height={8} fill={vizColors.silk} fillOpacity={0.6} />
        <Label x={100} y={SURF - 26} size={12} bold>
          S · 0 V
        </Label>
        <Label x={350} y={SURF - 26} size={12} bold>
          {`D · ${vds.toFixed(2)} V`}
        </Label>
        <Label x={225} y={SURF - 60} size={12} bold>
          {`G · ${vgs.toFixed(2)} V`}
        </Label>
        <Label x={225} y={SURF + 180} size={11} color={vizColors.muted}>
          B (body) · 0 V
        </Label>
        <Label x={30} y={22} anchor="start" size={13} bold color={vizColors.amber}>
          {REGION_LABEL[region]}
        </Label>

        {/* ---------- output characteristics ---------- */}
        <rect x={P_X0 - 30} y={20} width={P_X1 - P_X0 + 52} height={292} fill={vizColors.bg} stroke={vizColors.grid} rx={6} />
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={`gx${v}`}>
            <line x1={xOfVds(v)} y1={yOfId(0.016)} x2={xOfVds(v)} y2={P_Y0} stroke={vizColors.grid} />
            <Label x={xOfVds(v)} y={P_Y0 + 11} size={9} color={vizColors.muted}>
              {v}
            </Label>
          </g>
        ))}
        {[5, 10, 15].map((ma) => (
          <g key={`gy${ma}`}>
            <line x1={P_X0} y1={yOfId(ma / 1000)} x2={P_X1} y2={yOfId(ma / 1000)} stroke={vizColors.grid} />
            <Label x={P_X0 - 4} y={yOfId(ma / 1000)} anchor="end" size={9} color={vizColors.muted}>
              {ma}
            </Label>
          </g>
        ))}
        <line x1={P_X0} y1={P_Y0} x2={P_X1} y2={P_Y0} stroke={vizColors.muted} />
        <line x1={P_X0} y1={P_Y0} x2={P_X0} y2={yOfId(0.016)} stroke={vizColors.muted} />
        <Label x={P_X0 - 4} y={28} anchor="start" size={10}>
          I_D (mA)
        </Label>
        <Label x={P_X1} y={P_Y0 + 24} anchor="end" size={10}>
          V_DS (V)
        </Label>
        {FAMILY.map((c) => (
          <path key={c.vgs} d={c.d} fill="none" stroke={vizColors.muted} strokeOpacity={0.35} strokeWidth={1} />
        ))}
        {[3, 4, 5].map((v) => (
          <Label key={`lbl${v}`} x={P_X1 + 3} y={r2(yOfId(drainCurrent(v, 5)))} anchor="start" size={9} color={vizColors.muted}>
            {`${v} V`}
          </Label>
        ))}
        <path d={BOUNDARY} fill="none" stroke={vizColors.amber} strokeDasharray="5 4" strokeWidth={1.4} />
        <Label x={xOfVds(0.2)} y={44} anchor="start" size={10} color={vizColors.amber}>
          triode
        </Label>
        <Label x={xOfVds(4.9)} y={44} anchor="end" size={10} color={vizColors.amber}>
          saturation
        </Label>
        <Label x={xOfVds(1.8)} y={58} size={9} color={vizColors.muted}>
          dashed: V_DS = V_GS − V_th
        </Label>
        {on && <path d={curveFor(vgs)} fill="none" stroke={vizColors.cyan} strokeWidth={2.5} />}
        <circle cx={opX} cy={opY} r={6} fill={vizColors.amber} stroke={vizColors.bg} strokeWidth={2} />
      </SvgCanvas>
    </VizFrame>
  );
}
