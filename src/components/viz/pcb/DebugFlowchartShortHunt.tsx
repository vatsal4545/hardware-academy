"use client";

import { useId, useState } from "react";
import { Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { BOARD, antennaKeepout, dist, parts, type Part } from "./SchematicToLayoutBoard";
import { BOARD_FILL, KeepoutHatch, PX, PartFootprint, bx, by } from "./SchematicToLayoutShapes";

/* ---------- the faults ---------- */

interface Culprit {
  ref: string;
  /** resistance of the short, ohms */
  rShort: number;
  /** junction-to-ambient style thermal resistance of the failed part, C/W */
  theta: number;
  story: string;
}

const CULPRITS: Culprit[] = [
  {
    ref: "C5",
    rShort: 0.45,
    theta: 150,
    story:
      "C5, the 22 µF tantalum on the 3V3 output, was placed 180 degrees rotated: the assembler's library orientation differs from the KiCad footprint. Reverse-biased, a tantalum leaks heavily and heats.",
  },
  {
    ref: "C6",
    rShort: 0.04,
    theta: 180,
    story:
      "C6, the 10 µF 0805 at the module, has a flex crack from the board being twisted during depanelising. The crack became a dead short, so it barely warms: only the voltage gradient finds it.",
  },
  {
    ref: "C7",
    rShort: 0.2,
    theta: 220,
    story: "C7, a 100 nF 0402, has a solder bridge under it: too much paste on one pad pushed solder across the 0.4 mm gap between its terminals.",
  },
  {
    ref: "C4",
    rShort: 0.12,
    theta: 220,
    story: "C4, the 100 nF at the TB6612FNG VCC pin, is cracked: the pick-and-place nozzle pressed it too hard and the ceramic split.",
  },
  {
    ref: "U1",
    rShort: 0.02,
    theta: 60,
    story: "U1, the ESP32 module, has a solder bridge between its 3V3 pad and the neighbouring GND pad. A dead short like that makes almost no heat.",
  },
];

/** Parts that sit on the 3V3 net, so a millivolt probe on them follows the rail. */
const ON_3V3 = new Set(["C4", "C5", "C6", "C7", "U1", "U2", "U3"]);

/** Parts you can desolder: not holes or connectors. */
const REMOVABLE = (p: Part) => p.kind !== "hole" && p.kind !== "conn";

const VIN = 7.4;
const LDO_LIMIT = 1.1; // A, AMS1117 internal current limit (about)
const LDO_ON_RES = 1.4; // ohm, pass element in dropout
const LDO_THETA = 60; // C/W for a SOT-223 on a little copper
const AMBIENT = 25;
const U3_AT = { x: 20, y: 29.2 };

type Mode = "battery" | "inject";

interface Electrical {
  amps: number;
  v3: number;
  supplyV: number;
  culpritRise: number;
  ldoRise: number;
  ldoShutdown: boolean;
}

function electrical(c: Culprit, shorted: boolean, mode: Mode, limitA: number): Electrical {
  if (!shorted) {
    const amps = 0.07;
    return { amps, v3: 3.3, supplyV: mode === "battery" ? VIN : 3.3, culpritRise: 0, ldoRise: mode === "battery" ? LDO_THETA * (VIN - 3.3) * amps : 0, ldoShutdown: false };
  }
  if (mode === "inject") {
    const amps = Math.min(limitA, 1 / c.rShort);
    return { amps, v3: amps * c.rShort, supplyV: amps * c.rShort, culpritRise: c.theta * amps * amps * c.rShort, ldoRise: 0, ldoShutdown: false };
  }
  if (limitA <= LDO_LIMIT) {
    const v3 = limitA * c.rShort;
    return {
      amps: limitA,
      v3,
      supplyV: v3 + limitA * LDO_ON_RES,
      culpritRise: c.theta * limitA * limitA * c.rShort,
      ldoRise: Math.min(110, LDO_THETA * limitA * limitA * LDO_ON_RES),
      ldoShutdown: false,
    };
  }
  const v3 = LDO_LIMIT * c.rShort;
  return { amps: LDO_LIMIT, v3, supplyV: VIN, culpritRise: c.theta * LDO_LIMIT * LDO_LIMIT * c.rShort, ldoRise: 110, ldoShutdown: true };
}

/* ---------- thermal palette ---------- */

const HEAT: Array<[number, [number, number, number]]> = [
  [20, [8, 8, 70]],
  [35, [70, 20, 130]],
  [50, [180, 30, 110]],
  [70, [245, 100, 30]],
  [95, [255, 200, 50]],
  [130, [255, 255, 225]],
];

function heatColor(T: number): string {
  if (T <= HEAT[0][0]) return `rgb(${HEAT[0][1].join(",")})`;
  for (let i = 1; i < HEAT.length; i++) {
    if (T <= HEAT[i][0]) {
      const [t0, c0] = HEAT[i - 1];
      const [t1, c1] = HEAT[i];
      const k = (T - t0) / (t1 - t0);
      return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(",")})`;
    }
  }
  return `rgb(${HEAT[HEAT.length - 1][1].join(",")})`;
}

function HeatBlob({ id, cx, cy, rise, sigma }: { id: string; cx: number; cy: number; rise: number; sigma: number }) {
  const R = 3.2 * sigma * PX;
  // Math.exp can differ in the last digit between the server's engine and the browser's, and React does not patch attribute
  // mismatches, so quantise to tenths of a degree and three decimals of opacity before anything reaches the markup.
  const stops = Array.from({ length: 9 }, (_, k) => {
    const r = (k / 8) * 3.2 * sigma;
    const d = Math.round(rise * Math.exp(-(r * r) / (2 * sigma * sigma)) * 10) / 10;
    return { off: k / 8, color: heatColor(AMBIENT + d), op: Math.round(Math.min(0.9, d / 10) * 1000) / 1000 };
  });
  return (
    <>
      <defs>
        <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={R}>
          {stops.map((s) => (
            <stop key={s.off} offset={s.off} stopColor={s.color} stopOpacity={s.op} />
          ))}
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill={`url(#${id})`} />
    </>
  );
}

function temperatureAt(x: number, y: number, culprit: Part, e: Electrical): number {
  const dc = dist(x, y, culprit.x, culprit.y);
  const dl = dist(x, y, U3_AT.x, U3_AT.y);
  return AMBIENT + e.culpritRise * Math.exp(-(dc * dc) / (2 * 4 * 4)) + e.ldoRise * Math.exp(-(dl * dl) / (2 * 5 * 5));
}

/* ---------- component ---------- */

const buttonClass =
  "inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

export function ShortHunt() {
  const [culpritIndex, setCulpritIndex] = useState(0);
  const [removed, setRemoved] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [mode, setMode] = useState<Mode>("battery");
  const [limitA, setLimitA] = useState(0.5);
  const [thermal, setThermal] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("A new board is on the bench: the 3V3 rail reads well under 1 Ω to ground. Find the part causing the short and desolder it.");
  const uid = useId().replace(/:/g, "");

  const culprit = CULPRITS[culpritIndex];
  const culpritPart = parts.find((p) => p.ref === culprit.ref)!;
  const found = removed.includes(culprit.ref);
  const e = electrical(culprit, !found, mode, limitA);
  const selectedPart = selected ? parts.find((p) => p.ref === selected) : undefined;
  const infoPart = (selected ?? hover) ? parts.find((p) => p.ref === (selected ?? hover)) : undefined;

  function desolder(part: Part) {
    setSelected(null);
    if (removed.includes(part.ref)) {
      setMessage(`${part.ref} is already off the board.`);
      return;
    }
    if (found) {
      setMessage("The short is already cleared. Press New board for another fault.");
      return;
    }
    setRemoved((r) => [...r, part.ref]);
    if (part.ref === culprit.ref) {
      setMessage(`That was it. ${culprit.story} You made ${wrong} wrong guess${wrong === 1 ? "" : "es"}.`);
    } else {
      setWrong((w) => w + 1);
      setMessage(`Removed ${part.ref} (${part.label}): no change. The 3V3 rail is still shorted.`);
    }
  }

  function newBoard() {
    let next = Math.floor(Math.random() * CULPRITS.length);
    if (next === culpritIndex) next = (next + 1) % CULPRITS.length;
    setCulpritIndex(next);
    setRemoved([]);
    setWrong(0);
    setHover(null);
    setSelected(null);
    setMessage("New board on the bench: the 3V3 rail is shorted again. Find the part and desolder it.");
  }

  function replaceParts() {
    setRemoved([]);
    setWrong(0);
    setSelected(null);
    setMessage("Parts replaced, same fault. Try a different method: inject current at the rail or probe millivolts.");
  }

  const probe = (p: Part): string => {
    if (!ON_3V3.has(p.ref)) return "not on the 3V3 net";
    if (found) return "3300 mV, rail healthy";
    const d = dist(p.x, p.y, culpritPart.x, culpritPart.y);
    return `${(1000 * e.amps * (culprit.rShort + 0.02 * d)).toFixed(0)} mV above ground`;
  };

  return (
    <VizFrame
      title="Find the short: a simulated thermal camera and a millivolt probe"
      description="The 3V3 rail is shorted to ground by one part. Power the board two ways, look at the heat, hover or select a part for its millivolt reading, then desolder your suspect."
      controls={
        <>
          <Segmented<Mode>
            label="Where the supply connects"
            options={[
              { value: "battery", label: "Battery input, 7.4 V" },
              { value: "inject", label: "3V3 rail, 1 V" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Slider label="Supply current limit" value={limitA} min={0.1} max={2} step={0.1} unit="A" onChange={setLimitA} />
          <Toggle label="Thermal camera view" checked={thermal} onChange={setThermal} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={buttonClass} onClick={newBoard}>
              New board
            </button>
            <button type="button" className={buttonClass} onClick={replaceParts}>
              Replace all parts
            </button>
          </div>
        </>
      }
      footer={
        <div className="space-y-3">
          <p className="text-text" role="status" aria-live="polite" data-testid="hunt-message">
            {message}
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-bg/60 p-3">
              <dt className="font-mono text-xs uppercase tracking-wide text-amber-300">Supply</dt>
              <dd className="mt-1 text-text" data-testid="hunt-supply">
                {e.supplyV.toFixed(1)} V, drawing {e.amps.toFixed(2)} A{found ? "" : e.amps >= limitA - 0.001 && mode === "battery" && limitA <= LDO_LIMIT ? " (limit)" : ""}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-bg/60 p-3">
              <dt className="font-mono text-xs uppercase tracking-wide text-amber-300">3V3 rail</dt>
              <dd className="mt-1 text-text" data-testid="hunt-rail">
                {e.v3.toFixed(2)} V{found ? ", healthy" : ", pulled to ground"}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-bg/60 p-3">
              <dt className="font-mono text-xs uppercase tracking-wide text-amber-300">Regulator U3</dt>
              <dd className="mt-1 text-text" data-testid="hunt-ldo">
                {(AMBIENT + e.ldoRise).toFixed(0)} °C{e.ldoShutdown ? ", in thermal shutdown cycling" : ""}
              </dd>
            </div>
          </dl>
          <p className="text-sm" data-testid="hunt-hover">
            {infoPart
              ? `${infoPart.ref} (${infoPart.label}): ${temperatureAt(infoPart.x, infoPart.y, culpritPart, e).toFixed(0)} °C, probe ${probe(infoPart)}`
              : "Hover over, tap or focus a part to read its temperature and its millivolt probe reading."}
          </p>
          <div className="flex flex-wrap items-center gap-2" data-testid="hunt-selection">
            {selectedPart ? (
              <>
                <span className="text-sm text-text">
                  Selected: {selectedPart.ref} ({selectedPart.label})
                </span>
                <button type="button" className={buttonClass} onClick={() => desolder(selectedPart)}>
                  Desolder {selectedPart.ref}
                </button>
                <button type="button" className={buttonClass} onClick={() => setSelected(null)}>
                  Clear selection
                </button>
              </>
            ) : (
              <span className="text-sm">Click or tap a part to select it, then desolder it once you are sure.</span>
            )}
          </div>
          <p className="text-xs">
            Simulation: each failed part dissipates P = I² × R, so with a 0.45 Ω short at 0.5 A it is only about 0.1 W, while a dead short of 0.02 Ω
            shows almost no heat. The regulator can easily run hotter than the culprit.
          </p>
        </div>
      }
    >
      <SvgCanvas viewBox="0 0 720 470" title="Motor-driver board with a simulated thermal camera overlay and clickable parts">
        <defs>
          <KeepoutHatch id={`${uid}-hatch`} />
          <linearGradient id={`${uid}-scale`} x1="0" x2="1" y1="0" y2="0">
            {HEAT.map(([t, c]) => (
              <stop key={t} offset={(t - 20) / 110} stopColor={`rgb(${c.join(",")})`} />
            ))}
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="720" height="470" rx="8" fill={vizColors.bg} />
        <rect x={bx(0)} y={by(0)} width={BOARD.w * PX} height={BOARD.h * PX} rx={10} fill={BOARD_FILL} stroke={vizColors.amber} strokeWidth={2} />
        <rect x={bx(antennaKeepout.x)} y={by(antennaKeepout.y)} width={antennaKeepout.w * PX} height={antennaKeepout.h * PX} fill={`url(#${uid}-hatch)`} stroke={vizColors.red} strokeOpacity={0.5} />

        {parts.map((p) => {
          const gone = removed.includes(p.ref);
          return (
            <g key={p.ref} transform={`translate(${bx(p.x)} ${by(p.y)})`} opacity={gone ? 0.9 : 1}>
              <PartFootprint part={p} showRef={!gone && p.kind !== "cap" && p.kind !== "res" && p.kind !== "led"} padsOnly={gone} />
            </g>
          );
        })}

        {thermal && (
          <g style={{ mixBlendMode: "screen" }} pointerEvents="none">
            {e.ldoRise > 0.5 && <HeatBlob id={`${uid}-ldo`} cx={bx(U3_AT.x)} cy={by(U3_AT.y)} rise={e.ldoRise} sigma={5} />}
            {e.culpritRise > 0.5 && <HeatBlob id={`${uid}-bad`} cx={bx(culpritPart.x)} cy={by(culpritPart.y)} rise={e.culpritRise} sigma={4} />}
          </g>
        )}

        {/* hit targets */}
        {parts.filter(REMOVABLE).map((p) => {
          const w = Math.max(p.w * PX, 30);
          const h = Math.max(p.h * PX, 30);
          return (
            <g
              key={`hit-${p.ref}`}
              role="button"
              tabIndex={0}
              aria-label={`Inspect ${p.ref}, ${p.label}`}
              aria-pressed={selected === p.ref}
              transform={`translate(${bx(p.x)} ${by(p.y)})`}
              style={{ cursor: "pointer", outline: "none" }}
              onClick={() => setSelected(p.ref)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  setSelected(p.ref);
                }
              }}
              onPointerEnter={() => setHover(p.ref)}
              onPointerLeave={() => setHover((h0) => (h0 === p.ref ? null : h0))}
              onFocus={() => setHover(p.ref)}
              onBlur={() => setHover((h0) => (h0 === p.ref ? null : h0))}
            >
              <rect
                x={-w / 2}
                y={-h / 2}
                width={w}
                height={h}
                fill="transparent"
                stroke={selected === p.ref || hover === p.ref ? vizColors.cyan : "none"}
                strokeWidth={selected === p.ref ? 2.5 : 1.5}
                strokeDasharray={selected === p.ref ? undefined : "4 3"}
              />
            </g>
          );
        })}

        {/* thermal scale */}
        {thermal && (
          <g>
            <rect x={470} y={446} width={190} height={8} fill={`url(#${uid}-scale)`} stroke={vizColors.grid} />
            {[20, 50, 80, 110].map((t) => (
              <Label key={t} x={470 + ((t - 20) / 110) * 190} y={462} size={10} color={vizColors.muted}>
                {`${t} °C`}
              </Label>
            ))}
          </g>
        )}
        <Label x={60} y={456} anchor="start" size={11} color={vizColors.muted}>
          Click a part to select it
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
