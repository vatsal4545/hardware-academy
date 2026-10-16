"use client";

import { useState } from "react";
import { Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import {
  CELLS,
  GROUPS_PER_MODULE,
  PACK_PRESETS,
  packSpecs,
  type CellFormat,
  type CellSpec,
  type PackSpecs,
} from "@/components/viz/ev/BatteryPackExplorer.model";

type Zoom = "cell" | "module" | "pack";

const EV = "#fb923c";
const STEEL = "#3b4252";
const GRAPHITE = "#4b5563";

function fmt(v: number, digits = 1): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Grid that fits n circles in a w x h box with the largest radius. */
function packCircles(n: number, w: number, h: number): { cols: number; rows: number; r: number } {
  let best = { cols: 1, rows: n, r: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const r = Math.min(w / (2 * cols), h / (2 * rows));
    if (r > best.r) best = { cols, rows, r };
  }
  return best;
}

function CellView({ cell }: { cell: CellSpec }) {
  const other = cell.id === "2170" ? CELLS["18650"] : CELLS["2170"];
  const k = 5; // px per mm
  const x0 = 110;
  const cy = 112;
  const len = cell.lengthMm * k;
  const dia = cell.diameterMm * k;
  const top = cy - dia / 2;
  const wx = x0 + len * 0.28;
  const ww = len * 0.5;
  const wy = top + 7;
  const wh = dia - 14;
  const pattern: Array<{ h: number; fill: string }> = [
    { h: 2, fill: vizColors.copper },
    { h: 6, fill: GRAPHITE },
    { h: 2, fill: vizColors.silk },
    { h: 6, fill: vizColors.blue },
    { h: 2, fill: "#d1d5db" },
    { h: 6, fill: vizColors.blue },
    { h: 2, fill: vizColors.silk },
    { h: 6, fill: GRAPHITE },
  ];
  const stripes: Array<{ y: number; h: number; fill: string }> = [];
  for (let y = wy, i = 0; y < wy + wh; i++) {
    const p = pattern[i % pattern.length];
    const h = Math.min(p.h, wy + wh - y);
    stripes.push({ y, h, fill: p.fill });
    y += p.h;
  }
  const cellWh = (cell.nominalV * cell.capacityAh).toFixed(1);
  const legend: Array<{ fill: string; text: string }> = [
    { fill: GRAPHITE, text: "Anode: graphite coated on copper foil" },
    { fill: vizColors.blue, text: "Cathode: NCA or NMC on aluminium foil" },
    { fill: vizColors.silk, text: "Separator: porous polymer film" },
    { fill: vizColors.copper, text: "Copper current collector (negative)" },
    { fill: "#d1d5db", text: "Aluminium current collector (positive)" },
    { fill: STEEL, text: "Steel can is the negative terminal" },
  ];
  return (
    <g>
      <Label x={24} y={24} anchor="start" size={15} bold>
        {`One ${cell.label} cell: ${cell.diameterMm} mm across, ${cell.lengthMm} mm long`}
      </Label>
      <Label x={x0} y={cy + (Math.max(dia, other.diameterMm * k) / 2) + 14} anchor="start" size={11} color={vizColors.muted}>
        {`dashed amber: ${other.label} outline for scale`}
      </Label>
      <rect x={x0} y={top} width={len} height={dia} rx={10} fill={STEEL} stroke={vizColors.muted} />
      <rect x={x0 + len} y={cy - dia * 0.18} width={8} height={dia * 0.36} rx={2} fill="#9ca3af" />
      <rect x={wx - 2} y={wy - 2} width={ww + 4} height={wh + 4} fill={vizColors.bg} />
      {stripes.map((s, i) => (
        <rect key={i} x={wx} y={s.y} width={ww} height={s.h} fill={s.fill} opacity={0.9} />
      ))}
      <rect
        x={x0}
        y={cy - (other.diameterMm * k) / 2}
        width={other.lengthMm * k}
        height={other.diameterMm * k}
        rx={9}
        fill="none"
        stroke={vizColors.amber}
        strokeOpacity={0.8}
        strokeDasharray="5 4"
      />
      <Label x={wx + ww / 2} y={top - 10} size={11} color={vizColors.muted}>
        cut-away: the electrode sandwich is wound into a spiral (the jelly roll)
      </Label>
      <Label x={x0 + len + 18} y={cy - 8} anchor="start" size={12} bold>
        + cap
      </Label>
      <Label x={x0 + len + 18} y={cy + 9} anchor="start" size={11} color={vizColors.muted}>
        vent and current-interrupt device
      </Label>
      {legend.map((l, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 40 + col * 340;
        const y = 210 + row * 24;
        return (
          <g key={l.text}>
            <rect x={x} y={y - 7} width={14} height={14} rx={2} fill={l.fill} stroke={vizColors.grid} />
            <Label x={x + 22} y={y} anchor="start" size={12}>
              {l.text}
            </Label>
          </g>
        );
      })}
      <Label x={360} y={306} size={13} mono color={vizColors.amber}>
        {`${cell.nominalV} V nominal (${cell.minV.toFixed(1)}-${cell.maxV.toFixed(1)} V) · ${cell.capacityAh} Ah · ${cellWh} Wh · ${cell.massG} g · ${Math.round(
          (cell.nominalV * cell.capacityAh) / (cell.massG / 1000),
        )} Wh/kg`}
      </Label>
    </g>
  );
}

function ModuleView({ cell, parallel }: { cell: CellSpec; parallel: number }) {
  const gx0 = 30;
  const gw = 96;
  const gap = 16;
  const gy0 = 66;
  const gh = 168;
  const fit = packCircles(parallel, gw - 6, gh - 6);
  const groupAh = parallel * cell.capacityAh;
  const moduleV = GROUPS_PER_MODULE * cell.nominalV;
  const moduleKWh = (moduleV * groupAh) / 1000;
  const groups = Array.from({ length: GROUPS_PER_MODULE }, (_, g) => g);
  const gapX = (g: number) => gx0 + (g + 1) * gw + g * gap + gap / 2; // gap after group g
  return (
    <g>
      <Label x={24} y={22} anchor="start" size={15} bold>
        {`One module: ${GROUPS_PER_MODULE} groups in series, each ${parallel} ${cell.label} cells in parallel (${GROUPS_PER_MODULE * parallel} cells)`}
      </Label>
      {groups.map((g) => {
        const x = gx0 + g * (gw + gap);
        const plusUp = g % 2 === 0;
        const cw = fit.cols * fit.r * 2;
        const ch = fit.rows * fit.r * 2;
        const ox = x + (gw - cw) / 2;
        const oy = gy0 + (gh - ch) / 2;
        return (
          <g key={g}>
            <rect x={x} y={gy0} width={gw} height={gh} rx={6} fill="#141b2a" stroke={vizColors.grid} />
            {Array.from({ length: parallel }, (_, i) => {
              const cx = ox + fit.r + (i % fit.cols) * fit.r * 2;
              const cyy = oy + fit.r + Math.floor(i / fit.cols) * fit.r * 2;
              return (
                <g key={i}>
                  <circle cx={cx} cy={cyy} r={Math.max(0.8, fit.r - 0.8)} fill={STEEL} stroke="#6b7280" strokeWidth={0.6} />
                  {plusUp && fit.r > 3 && <circle cx={cx} cy={cyy} r={fit.r * 0.38} fill="#9ca3af" />}
                </g>
              );
            })}
            <Label x={x + gw / 2} y={gy0 + gh + 26} size={11} color={vizColors.muted}>
              {`G${g + 1} ${plusUp ? "(+ up)" : "(− up)"}`}
            </Label>
          </g>
        );
      })}
      {/* bus bars alternate top and bottom so each group's + meets the next group's − */}
      {groups.slice(0, -1).map((g) => {
        const x = gx0 + g * (gw + gap) + gw * 0.3;
        const w = gw * 1.4 + gap;
        const topBar = g % 2 === 0;
        return (
          <rect key={g} x={x} y={topBar ? gy0 - 12 : gy0 + gh + 5} width={w} height={7} rx={2} fill={vizColors.copper} />
        );
      })}
      <rect x={gx0 + gw * 0.15} y={gy0 + gh + 5} width={gw * 0.55} height={7} rx={2} fill={vizColors.copper} />
      <Label x={gx0 + 4} y={gy0 + gh + 9} anchor="end" size={13} bold color={vizColors.negative}>
        −
      </Label>
      <rect x={gx0 + 5 * (gw + gap) + gw * 0.3} y={gy0 + gh + 5} width={gw * 0.55} height={7} rx={2} fill={vizColors.copper} />
      <Label x={gx0 + 5 * (gw + gap) + gw + 8} y={gy0 + gh + 9} anchor="start" size={13} bold color={vizColors.positive}>
        +
      </Label>
      {/* voltage sense taps: one per bus bar plus the two ends = groups + 1 */}
      {groups.slice(0, -1).map((g) => {
        const topBar = g % 2 === 0;
        return (
          <line
            key={g}
            x1={gapX(g)}
            y1={topBar ? gy0 - 5 : gy0 + gh + 12}
            x2={gapX(g)}
            y2={272}
            stroke={vizColors.cyan}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.8}
          />
        );
      })}
      <line x1={gx0 + 8} y1={gy0 + gh + 12} x2={gx0 + 8} y2={272} stroke={vizColors.cyan} strokeWidth={1} strokeDasharray="3 3" />
      <line
        x1={gx0 + 5 * (gw + gap) + gw - 8}
        y1={gy0 + gh + 12}
        x2={gx0 + 5 * (gw + gap) + gw - 8}
        y2={272}
        stroke={vizColors.cyan}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <rect x={gx0} y={272} width={6 * gw + 5 * gap} height={26} rx={5} fill="#0f2a2f" stroke={vizColors.cyan} />
      <Label x={gx0 + (6 * gw + 5 * gap) / 2} y={285} size={12} color={vizColors.cyan}>
        {`Module monitor board: ${GROUPS_PER_MODULE + 1} voltage taps, thermistors, one bleed resistor per group for passive balancing`}
      </Label>
      <Label x={360} y={314} size={13} mono color={vizColors.amber}>
        {`${GROUPS_PER_MODULE} × ${cell.nominalV} V = ${fmt(moduleV)} V nominal · ${parallel} × ${cell.capacityAh} Ah = ${fmt(groupAh)} Ah · ${fmt(
          moduleKWh,
          2,
        )} kWh`}
      </Label>
    </g>
  );
}

function PackView({ series, parallel, spec }: { series: number; parallel: number; spec: PackSpecs }) {
  const n = spec.modules;
  const rows = Math.ceil(n / 8);
  const cols = Math.ceil(n / rows);
  const gx = 24;
  const gy = 50;
  const gw = 516;
  const gh = 196;
  const mw = (gw - (cols - 1) * 8) / cols;
  const mh = Math.min(70, (gh - (rows - 1) * 12) / rows);
  const pos = Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const inRow = i % cols;
    const col = row % 2 === 0 ? inRow : cols - 1 - inRow; // serpentine: neighbours in series sit side by side
    return { x: gx + col * (mw + 8), y: gy + row * (mh + 12) };
  });
  const gridBottom = gy + rows * mh + (rows - 1) * 12;
  const hv = [
    { y: 108, text: "Main + contactor" },
    { y: 140, text: "Precharge relay + resistor" },
    { y: 172, text: "Main − contactor" },
    { y: 204, text: "Current sensor (shunt)" },
  ];
  return (
    <g>
      <Label x={24} y={22} anchor="start" size={15} bold>
        {`Pack: ${n} module${n === 1 ? "" : "s"} in series = ${series}s${parallel}p, ${spec.cells.toLocaleString("en-US")} cells`}
      </Label>
      {pos.slice(0, -1).map((p, i) => (
        <line
          key={i}
          x1={p.x + mw / 2}
          y1={p.y + mh / 2}
          x2={pos[i + 1].x + mw / 2}
          y2={pos[i + 1].y + mh / 2}
          stroke={vizColors.copper}
          strokeWidth={3}
        />
      ))}
      {pos.map((p, i) => {
        const groups = i === n - 1 && series % GROUPS_PER_MODULE !== 0 ? series % GROUPS_PER_MODULE : GROUPS_PER_MODULE;
        return (
          <g key={i}>
            <rect x={p.x} y={p.y} width={mw} height={mh} rx={4} fill="#1a2235" stroke={EV} strokeOpacity={0.75} />
            {mw >= 24 && (
              <Label x={p.x + mw / 2} y={p.y + (mh >= 34 ? mh / 2 - 7 : mh / 2)} size={mw >= 40 ? 11 : 9}>
                {`M${i + 1}`}
              </Label>
            )}
            {mh >= 34 && mw >= 48 && (
              <Label x={p.x + mw / 2} y={p.y + mh / 2 + 8} size={9} mono color={vizColors.muted}>
                {`${groups}s${parallel}p`}
              </Label>
            )}
          </g>
        );
      })}
      <path
        d={`M ${gx} ${gridBottom + 16} C ${gx + 120} ${gridBottom + 28}, ${gx + 240} ${gridBottom + 4}, ${gx + 360} ${gridBottom + 16} S ${gx + 480} ${gridBottom + 28}, ${gx + gw} ${gridBottom + 16}`}
        fill="none"
        stroke={vizColors.cyan}
        strokeWidth={3}
      />
      <Label x={gx + gw / 2} y={gridBottom + 36} size={11} color={vizColors.cyan}>
        water-glycol loop: cooling ribbons between cylindrical cells, or cold plates under modules
      </Label>
      <rect x={560} y={50} width={146} height={44} rx={6} fill="#1f1530" stroke={vizColors.violet} />
      <Label x={633} y={64} size={12} bold color={vizColors.violet}>
        BMS master
      </Label>
      <Label x={633} y={81} size={10} color={vizColors.muted}>
        SoC, SoH, limits, isolation
      </Label>
      {hv.map((h) => (
        <g key={h.text}>
          <rect x={560} y={h.y} width={146} height={24} rx={5} fill="#1a2235" stroke={vizColors.grid} />
          <Label x={633} y={h.y + 12} size={10}>
            {h.text}
          </Label>
        </g>
      ))}
      <line x1={540} y1={120} x2={560} y2={120} stroke={vizColors.positive} strokeWidth={2} />
      <line x1={540} y1={184} x2={560} y2={184} stroke={vizColors.negative} strokeWidth={2} />
      <Label x={633} y={244} size={10} color={vizColors.muted}>
        HV out → inverter, DC charging
      </Label>
      <Label x={360} y={310} size={13} mono color={vizColors.amber}>
        {`${series} × 3.6 V = ${fmt(spec.nominalV)} V nominal (${fmt(spec.minV, 0)}-${fmt(spec.maxV, 0)} V) · ${fmt(spec.capacityAh)} Ah · ${fmt(
          spec.energyKWh,
        )} kWh`}
      </Label>
    </g>
  );
}

const zoomOptions: { value: Zoom; label: string }[] = [
  { value: "cell", label: "Cell" },
  { value: "module", label: "Module" },
  { value: "pack", label: "Pack" },
];

const cellOptions: { value: CellFormat; label: string }[] = [
  { value: "18650", label: "18650 (3.2 Ah)" },
  { value: "2170", label: "2170 (4.8 Ah)" },
];

export function BatteryPackExplorer() {
  const [zoom, setZoom] = useState<Zoom>("pack");
  const [cellId, setCellId] = useState<CellFormat>("2170");
  const [series, setSeries] = useState(96);
  const [parallel, setParallel] = useState(46);
  const cell = CELLS[cellId];
  const spec = packSpecs(series, parallel, cell);
  const chargeC = 250 / spec.energyKWh;

  const stats: Array<{ label: string; value: string }> = [
    { label: "Cells", value: spec.cells.toLocaleString("en-US") },
    { label: "Pack voltage", value: `${fmt(spec.nominalV)} V` },
    { label: "Window", value: `${fmt(spec.minV, 0)}-${fmt(spec.maxV, 0)} V` },
    { label: "Capacity", value: `${fmt(spec.capacityAh)} Ah` },
    { label: "Energy", value: `${fmt(spec.energyKWh)} kWh` },
    { label: "Cell mass", value: `${fmt(spec.cellMassKg, 0)} kg` },
  ];

  const title =
    zoom === "cell"
      ? `Cut-away of a ${cell.label} lithium-ion cell`
      : zoom === "module"
        ? `A module of ${GROUPS_PER_MODULE} series groups of ${parallel} parallel cells`
        : `A ${series}s${parallel}p pack of ${spec.modules} modules with its BMS and contactors`;

  return (
    <VizFrame
      title="Battery pack explorer"
      description="Zoom from one cell to a whole pack. Series groups (s) add voltage; cells in parallel (p) add amp-hours. Energy is their product."
      controls={
        <>
          <Segmented label="Zoom" options={zoomOptions} value={zoom} onChange={setZoom} />
          <Segmented label="Cell" options={cellOptions} value={cellId} onChange={setCellId} />
          <Slider label="Series groups (s)" value={series} min={6} max={200} step={1} onChange={setSeries} format={(v) => `${v}s`} />
          <Slider label="Cells in parallel (p)" value={parallel} min={1} max={80} step={1} onChange={setParallel} format={(v) => `${v}p`} />
        </>
      }
      footer={
        <span>
          {`${spec.voltageClass}. A 250 kW charge on this pack is ${fmt(chargeC)}C. `}
          Cell values are representative nickel-rich cells; a production pack&apos;s badge uses its own cell rating and usable-energy rules.
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {PACK_PRESETS.map((p) => {
          const active = p.cell === cellId && p.series === series && p.parallel === parallel;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setCellId(p.cell);
                setSeries(p.series);
                setParallel(p.parallel);
              }}
              className={
                active
                  ? "rounded-md border border-ev/60 bg-ev/15 px-2.5 py-1 text-xs text-text"
                  : "rounded-md border border-border bg-bg px-2.5 py-1 text-xs text-muted hover:text-text"
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <SvgCanvas viewBox="0 0 720 330" title={title}>
        <rect x={0} y={0} width={720} height={330} fill={vizColors.bg} rx={8} />
        {zoom === "cell" && <CellView cell={cell} />}
        {zoom === "module" && <ModuleView cell={cell} parallel={parallel} />}
        {zoom === "pack" && <PackView series={series} parallel={parallel} spec={spec} />}
      </SvgCanvas>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-bg px-3 py-2">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="font-mono text-sm text-text">{s.value}</dd>
          </div>
        ))}
      </dl>
    </VizFrame>
  );
}
