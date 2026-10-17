"use client";

import { useState, type ReactNode } from "react";
import { Segmented, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";

/* ---------- rules, profiles and the measured layout ---------- */

type RuleId = "spacing" | "angle" | "web" | "ring" | "edge" | "silk" | "thermal";
type Profile = "advanced" | "standard" | "conservative";

interface Measured {
  spacing: number; // mm between two parallel traces
  angle: number; // degrees at a trace junction
  web: number; // mm of solder mask between pad openings
  ring: number; // mm annular ring
  edge: number; // mm copper to board edge
  silk: number; // mm silkscreen to exposed pad (negative = overlap)
  relief: boolean; // pad tied to the pour through thermal relief
}

const BAD: Measured = { spacing: 0.11, angle: 35, web: 0.09, ring: 0.1, edge: 0.2, silk: -0.2, relief: false };
const FIXED: Measured = { spacing: 0.25, angle: 90, web: 0.2, ring: 0.2, edge: 0.6, silk: 0.25, relief: true };

interface RuleDef {
  id: RuleId;
  name: string;
  unit: string;
  /** minimum required, per profile; undefined for the yes/no thermal rule */
  limits?: Record<Profile, number>;
  caughtBy: "drc" | "dfm";
  why: string;
}

const RULES: RuleDef[] = [
  {
    id: "spacing",
    name: "Trace spacing",
    unit: "mm",
    limits: { advanced: 0.09, standard: 0.127, conservative: 0.2 },
    caughtBy: "drc",
    why: "Copper that close can bridge during etching or plating.",
  },
  {
    id: "ring",
    name: "Annular ring",
    unit: "mm",
    limits: { advanced: 0.075, standard: 0.15, conservative: 0.2 },
    caughtBy: "drc",
    why: "Drill wander can break a thin ring and leave an open via.",
  },
  {
    id: "edge",
    name: "Copper to board edge",
    unit: "mm",
    limits: { advanced: 0.2, standard: 0.3, conservative: 0.5 },
    caughtBy: "drc",
    why: "Routing and V-score tolerance can expose or short edge copper.",
  },
  {
    id: "silk",
    name: "Silkscreen clear of pads",
    unit: "mm",
    limits: { advanced: 0.05, standard: 0.15, conservative: 0.2 },
    caughtBy: "drc",
    why: "Ink on a pad ruins solderability, so the fab clips the text or rejects.",
  },
  {
    id: "web",
    name: "Solder mask web",
    unit: "mm",
    limits: { advanced: 0.075, standard: 0.1, conservative: 0.15 },
    caughtBy: "dfm",
    why: "A thin mask strip between pads peels off, and then solder bridges.",
  },
  {
    id: "angle",
    name: "Junction angle (acid trap)",
    unit: "°",
    limits: { advanced: 30, standard: 45, conservative: 90 },
    caughtBy: "dfm",
    why: "Etchant pools in an acute wedge and over-etches or leaves residue.",
  },
  {
    id: "thermal",
    name: "Thermal relief on pour pads",
    unit: "",
    caughtBy: "dfm",
    why: "A pad on a solid pour heats late and tombstones small parts.",
  },
];

const PROFILE_LABEL: Record<Profile, string> = {
  advanced: "Advanced fab",
  standard: "Standard fab",
  conservative: "Conservative target",
};

function measuredValue(id: RuleId, m: Measured): number {
  if (id === "thermal") return m.relief ? 1 : 0;
  return m[id];
}

function format(id: RuleId, v: number, m: Measured): string {
  if (id === "thermal") return m.relief ? "four relief spokes" : "solid connection";
  if (id === "angle") return `${v.toFixed(0)}°`;
  if (id === "silk" && v < 0) return `overlaps by ${(-v).toFixed(2)} mm`;
  return `${v.toFixed(2)} mm`;
}

interface Evaluation {
  fail: boolean;
  measured: string;
  required: string;
  /** short text for the red label on the drawing */
  short: string;
}

function evaluate(rule: RuleDef, m: Measured, profile: Profile): Evaluation {
  const v = measuredValue(rule.id, m);
  const measured = format(rule.id, v, m);
  if (!rule.limits) return { fail: !m.relief, measured, required: "thermal relief spokes", short: "solid pour connection" };
  const lim = rule.limits[profile];
  const required = rule.id === "angle" ? `at least ${lim}°` : `at least ${lim} mm`;
  let short: string;
  if (rule.id === "angle") short = `${v.toFixed(0)}° < ${lim}°`;
  else if (rule.id === "silk" && v < 0) short = "silk on a pad";
  else short = `${v.toFixed(2)} < ${lim} mm`;
  return { fail: v < lim, measured, required, short };
}

/* ---------- drawing: 40 px per mm, origin at (20, 20) ---------- */

const PX = 40;
const OX = 20;
const OY = 20;
const X = (mm: number) => OX + PX * mm;
const Y = (mm: number) => OY + PX * mm;
const S = (mm: number) => PX * mm;

const TRACE_W = 0.2;
const COPPER = vizColors.copper;
const TAN = vizColors.substrate;

function Trace({ pts }: { pts: Array<[number, number]> }) {
  return (
    <polyline
      points={pts.map(([x, y]) => `${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(" ")}
      fill="none"
      stroke={COPPER}
      strokeWidth={S(TRACE_W)}
      strokeLinejoin="miter"
      strokeLinecap="butt"
    />
  );
}

function Highlight({ shape, label, lx, ly, anchor = "middle" }: { shape: ReactNode; label: string; lx: number; ly: number; anchor?: "start" | "middle" | "end" }) {
  return (
    <g aria-hidden>
      {shape}
      <Label x={X(lx)} y={Y(ly)} anchor={anchor} size={13} color={vizColors.red} bold>
        {label}
      </Label>
    </g>
  );
}

const ringProps = { fill: "none", stroke: vizColors.red, strokeWidth: 2.5, strokeDasharray: "7 4" } as const;

function Layout({ m, fails }: { m: Measured; fails: Record<RuleId, string | null> }) {
  // fine-pitch pad row (right edge of a QFN), 0.5 mm pitch
  const padH = 0.3;
  const opening = 0.5 - m.web;
  const padYs = [1.2, 1.7, 2.2, 2.7, 3.2, 3.7];
  const padX0 = 3.4;
  const padL = 0.8;

  // two parallel traces
  const sep = TRACE_W + m.spacing;
  const yA = 1.95 - sep / 2;
  const yB = 1.95 + sep / 2;

  // junction at J with angle theta between branch and trunk
  const jx = 6.6;
  const jy = 3.7;
  const theta = (m.angle * Math.PI) / 180;
  const dx = 1.0 / Math.tan(theta);

  // via: drill 0.3 mm
  const viaPad = 0.3 + 2 * m.ring;
  const viaX = 9.0;

  // edge trace
  const edgeX = 16 - m.edge - TRACE_W / 2;

  // 0402 and pour
  const p1x = 11.3;
  const p2x = 12.35;
  const pw = 0.55;
  const ph = 0.6;
  const py = 6.7;
  const pourX1 = 12.05;

  return (
    <g>
      {/* board and edge */}
      <rect x={X(0)} y={Y(0)} width={S(16)} height={S(10)} fill={vizColors.mask} />

      {/* IC outline (silk) and pads with mask openings */}
      <rect x={X(0.5)} y={Y(0.8)} width={S(2.8)} height={S(3.4)} fill="none" stroke={vizColors.silk} strokeWidth={1.5} />
      <circle cx={X(0.8)} cy={Y(1.1)} r={4} fill={vizColors.silk} />
      <Label x={X(1.9)} y={Y(2.5)} size={13} color={vizColors.silk}>
        U1
      </Label>
      {padYs.map((y) => (
        <g key={y}>
          <rect x={X(padX0 - 0.05)} y={Y(y - opening / 2)} width={S(padL + 0.1)} height={S(opening)} fill={TAN} />
          <rect x={X(padX0)} y={Y(y - padH / 2)} width={S(padL)} height={S(padH)} fill={COPPER} />
        </g>
      ))}

      {/* parallel traces */}
      <Trace pts={[[padX0 + padL, 1.7], [4.8, 1.7], [5.2, yA], [viaX, yA]]} />
      <Trace pts={[[padX0 + padL, 2.2], [4.8, 2.2], [5.2, yB], [8.0, yB]]} />
      <circle cx={X(8.0)} cy={Y(yB)} r={S(0.3)} fill={COPPER} />

      {/* via */}
      <circle cx={X(viaX)} cy={Y(yA)} r={S(viaPad / 2)} fill={COPPER} />
      <circle cx={X(viaX)} cy={Y(yA)} r={S(0.15)} fill="#0b0f17" />

      {/* junction: branch joins trunk */}
      <Trace pts={[[padX0 + padL, 2.7], [jx - dx, 2.7], [jx, jy]]} />
      <Trace pts={[[padX0 + padL, 3.7], [9.4, 3.7]]} />

      {/* edge trace */}
      <Trace pts={[[edgeX, 1.0], [edgeX, 9.0]]} />

      {/* 0402 with a pour */}
      <rect x={X(9.6)} y={Y(5.4)} width={S(pourX1 - 9.6)} height={S(3.2)} fill={COPPER} opacity={0.55} />
      {m.relief && (
        <g>
          <rect x={X(p1x - 0.25)} y={Y(py - 0.25)} width={S(pw + 0.5)} height={S(ph + 0.5)} fill={vizColors.mask} />
          <rect x={X(p1x - 0.25)} y={Y(py + ph / 2 - 0.125)} width={S(0.25)} height={S(0.25)} fill={COPPER} />
          <rect x={X(p1x + pw)} y={Y(py + ph / 2 - 0.125)} width={S(0.25)} height={S(0.25)} fill={COPPER} />
          <rect x={X(p1x + pw / 2 - 0.125)} y={Y(py - 0.25)} width={S(0.25)} height={S(0.25)} fill={COPPER} />
          <rect x={X(p1x + pw / 2 - 0.125)} y={Y(py + ph)} width={S(0.25)} height={S(0.25)} fill={COPPER} />
        </g>
      )}
      <rect x={X(p1x)} y={Y(py)} width={S(pw)} height={S(ph)} fill={COPPER} />
      <rect x={X(p2x)} y={Y(py)} width={S(pw)} height={S(ph)} fill={COPPER} />
      <Trace pts={[[p2x + pw, py + ph / 2], [14.2, py + ph / 2]]} />
      <rect x={X(p1x + 0.1)} y={Y(py - 0.15)} width={S(1.45)} height={S(ph + 0.3)} fill="none" stroke={vizColors.silk} strokeWidth={1} opacity={0.6} />
      <Label x={X(m.silk < 0 ? 12.6 : 11.4)} y={Y(m.silk < 0 ? 7.2 : 5.95)} anchor="start" size={15} color={vizColors.silk} bold>
        R7
      </Label>

      {/* board edge line */}
      <rect x={X(0)} y={Y(0)} width={S(16)} height={S(10)} fill="none" stroke={vizColors.amber} strokeWidth={2} />

      {/* violation highlights */}
      {fails.spacing && (
        <Highlight shape={<circle cx={X(7.0)} cy={Y(1.95)} r={S(0.85)} {...ringProps} />} label={fails.spacing} lx={7.0} ly={0.75} />
      )}
      {fails.ring && (
        <Highlight shape={<circle cx={X(viaX)} cy={Y(yA)} r={S(0.55)} {...ringProps} />} label={fails.ring} lx={9.0} ly={0.85} anchor="start" />
      )}
      {fails.web && (
        <Highlight shape={<rect x={X(3.2)} y={Y(0.85)} width={S(1.2)} height={S(3.7)} rx={8} {...ringProps} />} label={fails.web} lx={3.8} ly={4.95} />
      )}
      {fails.angle && (
        <Highlight shape={<circle cx={X(jx - 0.6)} cy={Y(jy - 0.3)} r={S(0.75)} {...ringProps} />} label={fails.angle} lx={6.3} ly={4.55} />
      )}
      {fails.edge && (
        <Highlight shape={<rect x={X(edgeX - 0.35)} y={Y(3.8)} width={S(0.9 + m.edge)} height={S(2.4)} rx={6} {...ringProps} />} label={fails.edge} lx={15.45} ly={3.35} anchor="end" />
      )}
      {fails.silk && (
        <Highlight shape={<rect x={X(12.15)} y={Y(6.45)} width={S(1.65)} height={S(1.1)} rx={6} {...ringProps} />} label={fails.silk} lx={13.0} ly={7.85} />
      )}
      {fails.thermal && (
        <Highlight shape={<rect x={X(p1x - 0.45)} y={Y(py - 0.45)} width={S(pw + 0.9)} height={S(ph + 0.9)} rx={6} {...ringProps} />} label={fails.thermal} lx={10.6} ly={8.95} />
      )}

      {/* feature captions */}
      <Label x={X(0.5)} y={Y(9.3)} anchor="start" size={12} color={vizColors.muted}>
        Left: 0.5 mm pitch pads, parallel traces, a junction and a via. Right: an 0402 beside a ground pour.
      </Label>
    </g>
  );
}

export function DfmChecker() {
  const [profile, setProfile] = useState<Profile>("standard");
  const [fixed, setFixed] = useState(false);
  const [enabled, setEnabled] = useState<Record<RuleId, boolean>>({
    spacing: true,
    ring: true,
    edge: true,
    silk: true,
    web: false,
    angle: false,
    thermal: false,
  });

  const m = fixed ? FIXED : BAD;
  const results = RULES.map((r) => ({ rule: r, ...evaluate(r, m, profile) }));
  const fails = {} as Record<RuleId, string | null>;
  for (const r of results) {
    fails[r.rule.id] = enabled[r.rule.id] && r.fail ? r.short : null;
  }
  const active = results.filter((r) => enabled[r.rule.id] && r.fail);
  const drc = active.filter((r) => r.rule.caughtBy === "drc").length;
  const dfm = active.length - drc;

  return (
    <VizFrame
      title="DFM checker: the same tiny layout against three sets of numbers"
      description="Toggle checks on and watch violations light up. Start with the four checks a CAD DRC runs, then switch on the three that normally need the fab's DFM review, change the fab profile, or apply the fixes."
      controls={
        <>
          <Segmented<Profile>
            label="Rules to check against"
            options={(Object.keys(PROFILE_LABEL) as Profile[]).map((p) => ({ value: p, label: PROFILE_LABEL[p] }))}
            value={profile}
            onChange={setProfile}
          />
          <Toggle label="Apply fixes to the layout" checked={fixed} onChange={setFixed} />
        </>
      }
      footer={
        <p data-testid="dfm-summary">
          {active.length === 0
            ? "No violations with the checks that are switched on."
            : `${active.length} violation${active.length === 1 ? "" : "s"}: ${drc} that CAD DRC would catch with these numbers and ${dfm} that usually need the fab's DFM review or an assembly check.`}{" "}
          Profile numbers are illustrative; always use your fab&apos;s current capability sheet.
        </p>
      }
    >
      <div className="space-y-4">
        <SvgCanvas viewBox="0 0 680 440" title="A tiny PCB layout with design-for-manufacturing violations highlighted in red">
          <rect x="0" y="0" width="680" height="440" rx="8" fill={vizColors.bg} />
          <Layout m={m} fails={fails} />
        </SvgCanvas>
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.map(({ rule, fail, measured, required }) => {
            const on = enabled[rule.id];
            return (
              <li key={rule.id} className="rounded-lg border border-border bg-bg/60 p-3">
                <Toggle label={rule.name} checked={on} onChange={(v) => setEnabled((e) => ({ ...e, [rule.id]: v }))} />
                <p className="mt-1 text-sm text-text">
                  {measured} <span className="text-muted">against {required}</span>
                </p>
                <p className="text-sm">
                  {on ? (
                    fail ? (
                      <span className="font-semibold text-red-300">Violation</span>
                    ) : (
                      <span className="font-semibold text-green-300">Pass</span>
                    )
                  ) : (
                    <span className="text-muted">Check off</span>
                  )}
                  <span className="text-muted"> · usually caught by {rule.caughtBy === "drc" ? "CAD DRC" : "the fab's DFM review"}</span>
                </p>
                <p className="mt-1 text-xs text-muted">{rule.why}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </VizFrame>
  );
}
