"use client";

import { useState } from "react";
import { Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, makeScale, vizColors } from "@/components/viz/shared";
import { traceWidth } from "@/lib/sim/traceWidth";
import { ControlBar, formatSI, r2, r6, Stat } from "./OhmsLawCircuit.helpers";

type Oz = "0.5" | "1" | "2" | "3";
type LayerKind = "external" | "internal";

const STANDARD_MIL = [6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
const MM_PER_MIL = 0.0254;
const RHO_CU = 1.72e-8; // ohm metres, copper at 20 °C
const OZ_M = 35e-6; // metres of copper per ounce
const OZ_OPTIONS: Oz[] = ["0.5", "1", "2", "3"];

/**
 * traceWidth() with its pow-derived outputs rounded to 6 decimals (about a millionth of a mil), so that the numbers
 * reaching text and markup are identical whichever engine computed them.
 */
function tw(input: Parameters<typeof traceWidth>[0]): ReturnType<typeof traceWidth> {
  const r = traceWidth(input);
  return { areaMil2: r6(r.areaMil2), widthMil: r6(r.widthMil), widthMm: r6(r.widthMm) };
}

/**
 * The temperature rise (°C) that a trace of this width reaches at this current, found by
 * inverting traceWidth(): the required width falls as the allowed rise grows, so bisect on the rise.
 */
export function riseAtWidth(widthMil: number, currentA: number, copperOz: number, layer: LayerKind): number {
  if (currentA <= 0 || widthMil <= 0) return 0;
  const required = (rise: number) => tw({ currentA, tempRiseC: rise, copperOz, layer }).widthMil;
  let lo = 0.01;
  let hi = 2000;
  if (required(hi) > widthMil) return hi;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (required(mid) > widthMil) lo = mid;
    else hi = mid;
  }
  return r6((lo + hi) / 2);
}

function formatRise(rise: number): string {
  return rise >= 1000 ? "over 1000 °C" : `+${Math.round(rise)} °C`;
}

function PlanView({
  currentA,
  budget,
  widthMil,
  widthMm,
  oz,
  layer,
}: {
  currentA: number;
  budget: number;
  widthMil: number;
  widthMm: number;
  oz: number;
  layer: LayerKind;
}) {
  const s = Math.min(26, 90 / Math.max(widthMm, 0.0001)); // px per mm, shared by every strip
  const strips: Array<{ y: number; mil: number; title: string; color: string }> = [
    { y: 58, mil: 6, title: "6 mil, finest routing", color: vizColors.muted },
    { y: 106, mil: 10, title: "10 mil, typical signal", color: vizColors.muted },
    { y: 172, mil: widthMil, title: `${widthMil.toFixed(1)} mil needed`, color: vizColors.amber },
  ];
  return (
    <>
      <Label x={16} y={16} anchor="start" size={12} bold color={vizColors.muted}>Plan view, every width drawn to the same scale</Label>
      <rect x={10} y={30} width={400} height={208} rx={6} fill={vizColors.mask} fillOpacity={0.22} stroke={vizColors.grid} />
      {strips.map((st, i) => {
        const h = Math.max(1, st.mil * MM_PER_MIL * s);
        const rise = i === 2 ? budget : riseAtWidth(st.mil, currentA, oz, layer);
        const hot = rise > Math.max(40, budget * 2);
        return (
          <g key={st.title}>
            <rect x={30} y={r2(st.y - h / 2)} width={220} height={r2(h)} rx={r2(Math.min(3, h / 2))} fill={vizColors.copper} />
            <Label x={270} y={st.y - 9} anchor="start" size={11} bold color={i === 2 ? vizColors.amber : vizColors.text}>{st.title}</Label>
            <Label x={270} y={st.y + 8} anchor="start" size={11} mono color={hot ? vizColors.red : i === 2 ? vizColors.green : vizColors.muted}>
              {`${formatRise(rise)} at ${currentA.toFixed(1)} A`}
            </Label>
          </g>
        );
      })}
      <Label x={270} y={172 + 26} anchor="start" size={10} mono color={vizColors.muted}>{`= ${widthMm.toFixed(2)} mm wide`}</Label>
      <Label x={16} y={228} anchor="start" size={10} mono color={vizColors.muted}>{`scale: 1 mm = ${s.toFixed(1)} px`}</Label>
    </>
  );
}

function OptionBars({ currentA, rise, oz, layer }: { currentA: number; rise: number; oz: Oz; layer: LayerKind }) {
  const rows = OZ_OPTIONS.map((o) => ({ oz: o, w: tw({ currentA, tempRiseC: rise, copperOz: Number(o), layer }).widthMil }));
  const other = tw({ currentA, tempRiseC: rise, copperOz: Number(oz), layer: layer === "external" ? "internal" : "external" }).widthMil;
  const here = tw({ currentA, tempRiseC: rise, copperOz: Number(oz), layer }).widthMil;
  const max = Math.max(...rows.map((r) => r.w), 1);
  const x = makeScale([0, max], [0, 190]);
  return (
    <>
      <Label x={16} y={16} anchor="start" size={12} bold color={vizColors.muted}>Same current, other copper weights</Label>
      {rows.map((r, i) => {
        const y = 40 + i * 40;
        const on = r.oz === oz;
        return (
          <g key={r.oz}>
            <Label x={16} y={y + 12} anchor="start" size={12} bold={on} color={on ? vizColors.amber : vizColors.text}>{`${r.oz} oz`}</Label>
            <rect x={64} y={y} width={r2(Math.max(2, x(r.w)))} height={24} rx={3} fill={on ? vizColors.amber : vizColors.cyan} fillOpacity={on ? 0.9 : 0.55} />
            <Label x={r2(64 + Math.max(2, x(r.w)) + 8)} y={y + 12} anchor="start" size={11} mono color={on ? vizColors.amber : vizColors.muted}>
              {`${r.w.toFixed(1)} mil`}
            </Label>
          </g>
        );
      })}
      <line x1={64} y1={34} x2={64} y2={198} stroke={vizColors.muted} strokeWidth={1.2} />
      <Label x={16} y={218} anchor="start" size={11} color={vizColors.muted}>
        {layer === "external"
          ? `Inner layers need ${other.toFixed(1)} mil at ${oz} oz (${(other / here).toFixed(1)}× wider).`
          : `Outer layers need only ${other.toFixed(1)} mil at ${oz} oz (${(here / other).toFixed(1)}× narrower).`}
      </Label>
      <Label x={16} y={236} anchor="start" size={10} color={vizColors.muted}>Doubling the copper weight halves the width.</Label>
    </>
  );
}

export function TraceWidthCalculator() {
  const [currentA, setCurrentA] = useState(3);
  const [rise, setRise] = useState(10);
  const [oz, setOz] = useState<Oz>("1");
  const [layer, setLayer] = useState<LayerKind>("external");
  const [lengthMm, setLengthMm] = useState(50);

  const copperOz = Number(oz);
  const r = tw({ currentA, tempRiseC: rise, copperOz, layer });
  const nice = STANDARD_MIL.find((m) => m >= r.widthMil) ?? Math.ceil(r.widthMil / 100) * 100;
  const niceMm = nice * MM_PER_MIL;
  const riseNice = riseAtWidth(nice, currentA, copperOz, layer);
  const rise10 = riseAtWidth(10, currentA, copperOz, layer);

  const resistance = (RHO_CU * (lengthMm / 1000)) / (nice * 25.4e-6 * copperOz * OZ_M);
  const drop = currentA * resistance;
  const heat = currentA * currentA * resistance;

  return (
    <VizFrame
      title="Trace width calculator (IPC-2221)"
      description="Set the current, the temperature rise you can live with, the copper weight and the layer. See the width in mil and millimetres, how it compares with a signal trace, and what the copper costs in voltage drop."
      controls={
        <Slider label="Trace length (for resistance)" value={lengthMm} min={10} max={200} step={5} unit="mm" onChange={setLengthMm} />
      }
      footer="IPC-2221 is a rule of thumb for steady current in still air. IPC-2152 is more accurate because it accounts for nearby planes and board thickness; a copper pour does better than either chart, and an enclosure does worse. Resistance uses 1.72 × 10⁻⁸ Ω·m at 20 °C and rises about 0.4% per °C."
    >
      <ControlBar>
        <Slider label="Current" value={currentA} min={0.1} max={10} step={0.1} unit="A" onChange={setCurrentA} />
        <Slider label="Allowed temperature rise" value={rise} min={5} max={60} step={1} unit="°C" onChange={setRise} />
        <Segmented<Oz>
          label="Copper weight"
          options={[
            { value: "0.5", label: "0.5 oz" },
            { value: "1", label: "1 oz" },
            { value: "2", label: "2 oz" },
            { value: "3", label: "3 oz" },
          ]}
          value={oz}
          onChange={setOz}
        />
        <Segmented<LayerKind>
          label="Layer"
          options={[
            { value: "external", label: "External" },
            { value: "internal", label: "Internal" },
          ]}
          value={layer}
          onChange={setLayer}
        />
      </ControlBar>
      <div className="@container">
        <div className="grid gap-3 @3xl:grid-cols-2">
          <SvgCanvas
            viewBox="0 0 420 250"
            className="mx-auto max-w-[460px]"
            title={`Plan view to scale: a ${r.widthMil.toFixed(1)} mil trace for ${currentA.toFixed(1)} amps next to 6 mil and 10 mil traces`}
          >
            <rect x={0} y={0} width={420} height={250} fill={vizColors.bg} rx={8} />
            <PlanView currentA={currentA} budget={rise} widthMil={r.widthMil} widthMm={r.widthMm} oz={copperOz} layer={layer} />
          </SvgCanvas>
          <SvgCanvas
            viewBox="0 0 420 250"
            className="mx-auto max-w-[460px]"
            title="Required trace width for each copper weight at the chosen current and temperature rise"
          >
            <rect x={0} y={0} width={420} height={250} fill={vizColors.bg} rx={8} />
            <OptionBars currentA={currentA} rise={rise} oz={oz} layer={layer} />
          </SvgCanvas>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
        <Stat label="Trace width needed" value={`${r.widthMil.toFixed(1)} mil / ${r.widthMm.toFixed(2)} mm`} tone="ok" />
        <Stat label="Round up to a standard width" value={`${nice} mil / ${niceMm.toFixed(2)} mm`} />
        <Stat label="Rise at that width" value={`+${riseNice.toFixed(1)} °C`} hint={`budget +${rise} °C`} />
        <Stat label="Copper cross-section" value={`${r.areaMil2.toFixed(1)} mil²`} />
        <Stat label={`Resistance over ${lengthMm} mm`} value={formatSI(resistance, "Ω")} hint="at the rounded width" />
        <Stat label={`Voltage drop at ${currentA.toFixed(1)} A`} value={formatSI(drop, "V")} />
        <Stat label="Heat in the trace" value={formatSI(heat, "W")} />
        <Stat
          label="A 10 mil trace at this current"
          value={formatRise(rise10)}
          tone={rise10 > Math.max(40, rise * 2) ? "bad" : rise10 > rise ? "warn" : "ok"}
          hint={rise10 > rise ? "Too thin for this current." : "Thick enough."}
        />
      </dl>
    </VizFrame>
  );
}
