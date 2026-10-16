"use client";

import { useCallback, useState } from "react";
import { Stepper, VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, useAnimationFrame, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";

/** Seconds each step's process animation takes (deposition grows, light falls, etch cuts...). */
const STEP_SECONDS = 1.4;
const AUTOPLAY_MS = 3400;

// Cross-section geometry in SVG units. Vertical scale is wildly exaggerated: the oxide drawn
// here is 30 units tall next to a "775 µm" wafer, so the drawing is explicitly not to scale.
const X0 = 40;
const X1 = 600;
const MID = (X0 + X1) / 2;
const SURF0 = 176; // silicon surface before oxidation
const OX = 30; // thickness of the grown oxide
const OX_TOP = SURF0 - 0.56 * OX; // oxide grows 56% above the original surface...
const SI_TOP = SURF0 + 0.44 * OX; // ...and consumes silicon for the other 44%
const SI_BOT = 258;
const RES = 24;
const RES_TOP = OX_TOP - RES;
const WIN0 = 270;
const WIN1 = 370;
const MASK_Y = 56;
const MASK_H = 10;
const METAL_H = 16;

const colors = {
  si: "#475569",
  siEdge: "#64748b",
  oxide: "#93c5fd",
  resist: vizColors.amber,
  exposed: vizColors.violet,
  chrome: "#6b7280",
  quartz: "#cbd5e1",
  uv: vizColors.violet,
  plasma: "#f472b6",
  ash: vizColors.cyan,
  ion: vizColors.electron,
  doped: vizColors.electron,
  metal: vizColors.copper,
};

interface ProcessStep {
  title: string;
  tool: string;
  text: string;
}

const STEPS: ProcessStep[] = [
  {
    title: "Bare wafer",
    tool: "Wafer makers: Shin-Etsu, SUMCO, GlobalWafers, Siltronic, SK Siltron",
    text: "A 300 mm p-type wafer, 775 µm thick, boron-doped to about 10 Ω·cm and polished flat to a few nanometres. Only the top few micrometres will ever hold transistors.",
  },
  {
    title: "Grow oxide",
    tool: "Oxidation furnace at about 1,000 °C",
    text: "Dry oxygen grows SiO₂ at roughly 50 nm per hour (steam: about 380 nm per hour). About 44% of the oxide thickness comes from consumed silicon, so the silicon surface moves down as the oxide grows.",
  },
  {
    title: "Spin on photoresist",
    tool: "Coater/developer track (Tokyo Electron)",
    text: "A few millilitres of resist are dispensed and spun at a few thousand rpm into a uniform film, typically 100 nm to 1 µm thick, then soft-baked at about 100 °C to drive out the solvent.",
  },
  {
    title: "Expose through the mask",
    tool: "Scanner (ASML): 193 nm ArF immersion or 13.5 nm EUV",
    text: "The scanner images the reticle onto the resist at 4× reduction, one 26 × 33 mm field at a time (drawn here 1:1). Light passes only where the chrome is open; in a chemically amplified positive resist it releases acid that makes those areas soluble.",
  },
  {
    title: "Develop",
    tool: "Track with 2.38% TMAH developer",
    text: "After a post-exposure bake, an aqueous base developer dissolves the exposed resist in about a minute, leaving a resist stencil of the mask. Line width and overlay are measured before the wafer may continue.",
  },
  {
    title: "Etch the oxide",
    tool: "Plasma etcher (Lam Research, Tokyo Electron, Applied Materials)",
    text: "A fluorocarbon plasma (CF₄/CHF₃) cuts the oxide straight down only where the resist is open. An oxide-to-silicon selectivity of 10:1 or better lets the etch stop cleanly on the silicon.",
  },
  {
    title: "Strip the resist",
    tool: "Oxygen-plasma asher plus a wet clean",
    text: "Oxygen plasma burns away the polymer resist and a wet clean removes the residue. The pattern now lives in the oxide, which serves as a hard mask for the implant.",
  },
  {
    title: "Implant and anneal",
    tool: "Ion implanter (Applied Materials, Axcelis), then rapid thermal anneal",
    text: "Phosphorus ions at about 30 keV and a dose near 10¹⁵ cm⁻² enter the silicon only through the window; the oxide stops them everywhere else. A spike anneal near 1,000 °C repairs the lattice and activates the dopant, forming an n⁺ region.",
  },
  {
    title: "Deposit and pattern metal",
    tool: "PVD barrier + copper electroplating + CMP (Applied Materials)",
    text: "Metal fills the contact window and forms a wire: sputtered aluminium in older processes, damascene copper today. A real chip repeats loops like this one for 60-plus mask layers, about 1,000 steps in all.",
  },
];

/** Legend entries with x offsets sized to their label lengths. */
const LEGEND: Array<{ label: string; color: string; x: number; opacity?: number }> = [
  { label: "p-type Si", color: colors.si, x: 0 },
  { label: "SiO₂", color: colors.oxide, x: 92, opacity: 0.75 },
  { label: "Photoresist", color: colors.resist, x: 168, opacity: 0.85 },
  { label: "Exposed resist", color: colors.exposed, x: 278, opacity: 0.85 },
  { label: "n⁺ silicon", color: colors.doped, x: 408, opacity: 0.55 },
  { label: "Metal", color: colors.metal, x: 510 },
];

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function ease(x: number): number {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/** Deterministic per-ion delay in [0, 0.5), so the drawing is identical on server and client. */
function ionDelay(i: number): number {
  return ((i * 37) % 11) / 22;
}

function CrossSection({ step, p }: { step: number; p: number }) {
  const e = ease(p);

  // Silicon and oxide surfaces (oxidation moves both).
  const siTop = step === 0 ? SURF0 : step === 1 ? SURF0 + 0.44 * OX * e : SI_TOP;
  const oxTop = step === 1 ? SURF0 - 0.56 * OX * e : OX_TOP;
  const showOxide = step >= 1;
  const windowOxTop = step < 5 ? oxTop : step === 5 ? lerp(OX_TOP, SI_TOP, e) : SI_TOP;

  // Resist geometry.
  let resist: { x: number; y: number; w: number; h: number; rx: number; opacity: number } | null = null;
  if (step === 2) {
    const w = lerp(90, X1 - X0, e);
    const h = lerp(54, RES, e);
    resist = { x: MID - w / 2, y: OX_TOP - h, w, h, rx: lerp(24, 0, e), opacity: 0.85 };
  } else if (step >= 3 && step <= 5) {
    resist = { x: X0, y: RES_TOP, w: X1 - X0, h: RES, rx: 0, opacity: 0.85 };
  } else if (step === 6) {
    resist = { x: X0, y: RES_TOP + RES * e, w: X1 - X0, h: RES * (1 - e), rx: 0, opacity: 0.85 * (1 - e) };
  }
  // Exposed (soluble) resist inside the window.
  const exposedOpacity = step === 3 ? e : step === 4 ? 1 : 0;
  const exposedTop = step === 4 ? RES_TOP + RES * e : RES_TOP;
  const windowOpen = step >= 4; // after develop, resist in the window is gone (animated in step 4)

  // Implant.
  const dopedOpacity = step === 7 ? 0.6 * ease(p * 1.4 - 0.3) : step > 7 ? 0.6 : 0;

  // Metal.
  const fill = ease(p * 2);
  const spread = ease(p * 2 - 1);
  const metalFillTop = step === 8 ? lerp(SI_TOP, OX_TOP - METAL_H, fill) : OX_TOP - METAL_H;
  const lineW = lerp(WIN1 - WIN0, 240, spread);

  const ions = Array.from({ length: 19 }, (_, i) => {
    const x = X0 + 18 + i * 29.6;
    const inWindow = x > WIN0 + 4 && x < WIN1 - 4;
    const stop = inWindow ? SI_TOP + 12 + (i % 3) * 6 : OX_TOP + 5 + (i % 3) * 3;
    const q = clamp01(p * 1.6 - ionDelay(i));
    return { x, y: lerp(36, stop, q), landed: q >= 1, inWindow };
  });

  const plasmaArrows = [0, 1, 2, 3].map((k) => {
    const phase = (p * 3 + k * 0.27) % 1;
    const x = WIN0 + 18 + k * 21;
    const y = lerp(112, windowOxTop - 6, phase);
    return { x, y };
  });

  return (
    <SvgCanvas viewBox="0 0 640 300" title={`Wafer cross-section, step ${step + 1} of 9: ${STEPS[step].title}`}>
      <rect x={0} y={0} width={640} height={300} fill={vizColors.bg} />
      <Label x={X1} y={18} anchor="end" size={11} color={vizColors.muted}>
        Cross-section, not to scale
      </Label>

      {/* Silicon substrate */}
      <rect x={X0} y={siTop} width={X1 - X0} height={SI_BOT - siTop} fill={colors.si} stroke={colors.siEdge} />
      <Label x={X0 + 10} y={SI_BOT - 14} anchor="start" size={11} color={vizColors.text}>
        p-type silicon wafer (775 µm thick)
      </Label>

      {/* n+ region from the implant */}
      {dopedOpacity > 0 && (
        <g>
          <rect
            x={WIN0 - 14}
            y={SI_TOP - 1}
            width={WIN1 - WIN0 + 28}
            height={36}
            rx={14}
            fill={colors.doped}
            opacity={dopedOpacity}
          />
          <Label x={MID} y={SI_TOP + 26} size={11} color={vizColors.text}>
            n⁺
          </Label>
        </g>
      )}

      {/* Oxide: left and right of the window, plus the part inside the window until it is etched */}
      {showOxide && (
        <path
          d={`M${X0} ${oxTop} H${WIN0} V${windowOxTop} H${WIN1} V${oxTop} H${X1} V${siTop} H${X0} Z`}
          fill={colors.oxide}
          opacity={0.75}
        />
      )}
      {showOxide && siTop - oxTop > 14 && (
        <Label x={X1 - 10} y={(oxTop + siTop) / 2} anchor="end" size={11} color={vizColors.bg} bold>
          SiO₂
        </Label>
      )}

      {/* Photoresist */}
      {resist && (
        <g opacity={resist.opacity}>
          {windowOpen ? (
            <>
              <rect x={X0} y={resist.y} width={WIN0 - X0} height={resist.h} fill={colors.resist} />
              <rect x={WIN1} y={resist.y} width={X1 - WIN1} height={resist.h} fill={colors.resist} />
            </>
          ) : (
            <rect x={resist.x} y={resist.y} width={resist.w} height={resist.h} rx={resist.rx} fill={colors.resist} />
          )}
        </g>
      )}
      {exposedOpacity > 0 && OX_TOP - exposedTop > 0.5 && (
        <rect
          x={WIN0}
          y={exposedTop}
          width={WIN1 - WIN0}
          height={OX_TOP - exposedTop}
          fill={colors.exposed}
          opacity={0.85 * exposedOpacity}
        />
      )}
      {resist && resist.h > 14 && resist.w > 400 && (
        <Label x={X1 - 10} y={resist.y + resist.h / 2} anchor="end" size={11} color={vizColors.bg} bold>
          Photoresist
        </Label>
      )}

      {/* Step 4: reticle and light */}
      {step === 3 && (
        <g>
          {Array.from({ length: 14 }, (_, k) => X0 + 20 + k * 40).map((x) => (
            <line key={x} x1={x} y1={28} x2={x} y2={MASK_Y} stroke={colors.uv} strokeWidth={2} opacity={0.5} />
          ))}
          <rect x={X0} y={MASK_Y} width={X1 - X0} height={MASK_H} fill={colors.quartz} opacity={0.35} />
          <rect x={X0} y={MASK_Y} width={WIN0 - X0} height={MASK_H} fill={colors.chrome} />
          <rect x={WIN1} y={MASK_Y} width={X1 - WIN1} height={MASK_H} fill={colors.chrome} />
          {[WIN0 + 20, WIN0 + 40, WIN0 + 60, WIN0 + 80].map((x) => (
            <line
              key={x}
              x1={x}
              y1={MASK_Y + MASK_H}
              x2={x}
              y2={lerp(MASK_Y + MASK_H, RES_TOP, Math.min(1, p * 1.6))}
              stroke={colors.uv}
              strokeWidth={3}
              opacity={0.85}
            />
          ))}
          <Label x={X0} y={20} anchor="start" size={11} color={colors.uv}>
            193 nm ArF laser light (EUV: 13.5 nm)
          </Label>
          <Label x={X0 + 6} y={MASK_Y + 22} anchor="start" size={11} color={vizColors.muted}>
            Reticle: chrome on quartz
          </Label>
        </g>
      )}

      {/* Step 5: developer */}
      {step === 4 && (
        <Label x={MID} y={RES_TOP - 22} size={11} color={vizColors.cyan}>
          TMAH developer dissolves the exposed resist
        </Label>
      )}

      {/* Step 6: etch plasma */}
      {step === 5 && (
        <g>
          <rect x={X0} y={80} width={X1 - X0} height={30} rx={8} fill={colors.plasma} opacity={0.16} />
          <Label x={X0 + 10} y={95} anchor="start" size={11} color={colors.plasma}>
            CF₄ / CHF₃ plasma
          </Label>
          {plasmaArrows.map((a, k) => (
            <Arrow key={k} x1={a.x} y1={a.y - 14} x2={a.x} y2={a.y} color={colors.plasma} width={2} head={6} />
          ))}
        </g>
      )}

      {/* Step 7: resist strip */}
      {step === 6 && (
        <g opacity={1 - 0.6 * e}>
          <rect x={X0} y={80} width={X1 - X0} height={30} rx={8} fill={colors.ash} opacity={0.14} />
          <Label x={X0 + 10} y={95} anchor="start" size={11} color={colors.ash}>
            O₂ plasma ashing
          </Label>
        </g>
      )}

      {/* Step 8: implant */}
      {step === 7 && (
        <g>
          <Label x={X0} y={22} anchor="start" size={11} color={colors.ion}>
            P⁺ ions · 30 keV · 1×10¹⁵ cm⁻²
          </Label>
          {ions.map((ion) => (
            <circle
              key={ion.x}
              cx={ion.x}
              cy={ion.y}
              r={3.2}
              fill={colors.ion}
              opacity={ion.landed && !ion.inWindow ? 0.45 : 0.95}
            />
          ))}
        </g>
      )}

      {/* Step 9: metal */}
      {step === 8 && (
        <g fill={colors.metal}>
          <rect x={WIN0} y={metalFillTop} width={WIN1 - WIN0} height={SI_TOP - metalFillTop} />
          {spread > 0 && <rect x={MID - lineW / 2} y={OX_TOP - METAL_H} width={lineW} height={METAL_H} />}
        </g>
      )}
      {step === 8 && spread > 0.5 && (
        <Label x={MID} y={OX_TOP - METAL_H - 12} size={11} color={colors.metal}>
          Metal contact and wire
        </Label>
      )}

      {/* Legend */}
      <g>
        {LEGEND.map((l) => (
          <g key={l.label} transform={`translate(${X0 + l.x}, 284)`}>
            <rect x={0} y={-6} width={12} height={12} rx={2} fill={l.color} opacity={l.opacity ?? 1} />
            <Label x={17} y={0} anchor="start" size={11} color={vizColors.muted}>
              {l.label}
            </Label>
          </g>
        ))}
      </g>
    </SvgCanvas>
  );
}

function StepBody({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="text-text/90">{step.text}</p>
      <p className="font-mono text-xs text-muted">Tool: {step.tool}</p>
    </div>
  );
}

/** Nine fab steps on an animated wafer cross-section: bare wafer to a metal contact on an n+ region. */
export function FabProcessStepper() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(1);
  const animating = progress < 1 && !reduced;

  useAnimationFrame((dt) => setProgress((x) => Math.min(1, x + dt / STEP_SECONDS)), animating);

  const go = useCallback((i: number) => {
    setIndex(i);
    setProgress(0);
  }, []);

  const p = reduced ? 1 : progress;
  const steps = STEPS.map((s) => ({ title: s.title, body: <StepBody step={s} /> }));

  return (
    <VizFrame
      title="Patterning loop on a wafer cross-section"
      description="Step through one full loop: oxidize, coat, expose, develop, etch, strip, implant and metallize. Auto-play cycles through all nine steps."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Each step animates once when you arrive; reduced-motion settings show the end state immediately.</span>
          <button
            type="button"
            onClick={() => setProgress(0)}
            disabled={reduced}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-text hover:bg-surface-2 disabled:opacity-40"
          >
            Replay step animation
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <CrossSection step={index} p={p} />
        <Stepper steps={steps} index={index} onChange={go} autoplayMs={AUTOPLAY_MS} />
      </div>
    </VizFrame>
  );
}
