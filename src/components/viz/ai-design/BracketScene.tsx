"use client";

import { useId } from "react";
import { vizColors } from "@/components/viz/shared";
import { toScreen, FLANGE_HOLE_Z, HOLE_END, THICKNESS, WIDTH, type BracketModel, type FacePoly, type Pt, type V3, type View } from "./bracketModel";
import { r2 } from "./num";

/** The card colour behind the viz; "see-through" areas of a hole are painted with it. */
export const SURFACE = "#121826";

export const FACE_TINT: Record<string, string> = {
  bottom: "#94a3b8",
  end: "#fb923c",
  baseTop: "#34d399",
  fillet: "#fbbf24",
  flangeInner: "#22d3ee",
  flangeTop: "#a78bfa",
  flangeOuter: "#f87171",
  front: "#60a5fa",
  back: "#d98c3f",
  wallBase: "#f472b6",
  wallFlange: "#c084fc",
};

export interface Selection {
  kind: "face" | "edge" | "vertex";
  id: string;
}
export interface SceneHighlight {
  faces: boolean;
  edges: boolean;
  vertices: boolean;
  /** draw hidden edges, vertices and faces as dashed ghosts */
  xray: boolean;
}

const f1 = (n: number) => n.toFixed(1);
/** a dimension value without a trailing .0 */
const dim = (n: number) => String(Number(n.toFixed(1)));

function pathOf(view: View, pts: V3[], close: boolean): string {
  return (
    pts
      .map((p, i) => {
        const s = toScreen(view, p);
        return `${i === 0 ? "M" : "L"}${f1(s.x)} ${f1(s.y)}`;
      })
      .join(" ") + (close ? " Z" : "")
  );
}

function polyPath(view: View, poly: FacePoly): string {
  return [pathOf(view, poly.outer, true), ...poly.loops.map((l) => pathOf(view, l, true))].join(" ");
}

function centroid(view: View, pts: V3[]): Pt {
  const s = pts.map((p) => toScreen(view, p));
  return { x: r2(s.reduce((a, b) => a + b.x, 0) / s.length), y: r2(s.reduce((a, b) => a + b.y, 0) / s.length) };
}

/** Neutral shading by surface normal: top lightest, the +y side medium, the +x side darkest. */
function shade(n: V3): string {
  const d = Math.max(0, n[0] * 0.35 + n[1] * 0.45 + n[2] * 0.82);
  const k = 0.4 + 0.6 * d;
  return `rgb(${Math.round(138 * k)},${Math.round(156 * k)},${Math.round(190 * k)})`;
}

const HALO = { stroke: vizColors.bg, strokeWidth: 3, paintOrder: "stroke" as const };

/** Length, hole diameter and fillet radius annotations, projected with the same view as the solid. */
function Dimensions({ model, view }: { model: BracketModel; view: View }) {
  const p = model.params;
  const baseHole = model.holes.find((h) => h.key === "base");
  const flangeHole = model.holes.find((h) => h.key === "flange");
  const yd = WIDTH + 9;
  const a = toScreen(view, [0, yd, 0]);
  const b = toScreen(view, [p.length, yd, 0]);
  const ea = toScreen(view, [0, WIDTH + 1.5, 0]);
  const eb = toScreen(view, [p.length, WIDTH + 1.5, 0]);
  const mid = { x: r2((a.x + b.x) / 2 - 5), y: r2((a.y + b.y) / 2 + 11) };
  const text = { fill: vizColors.text, ...HALO };
  const baseAt = baseHole && toScreen(view, [p.length - HOLE_END + baseHole.radius + 3, WIDTH / 2, THICKNESS]);
  const flangeAt = flangeHole && toScreen(view, [THICKNESS, WIDTH / 2, FLANGE_HOLE_Z + flangeHole.radius + 3.5]);

  return (
    <g fontFamily="var(--font-mono)" fontSize={11}>
      <g stroke={vizColors.muted} strokeWidth={1}>
        <line x1={ea.x} y1={ea.y} x2={r2(a.x + (a.x - ea.x) * 0.2)} y2={r2(a.y + (a.y - ea.y) * 0.2)} />
        <line x1={eb.x} y1={eb.y} x2={r2(b.x + (b.x - eb.x) * 0.2)} y2={r2(b.y + (b.y - eb.y) * 0.2)} />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      </g>
      <text x={mid.x} y={mid.y} textAnchor="middle" transform={`rotate(30 ${mid.x} ${mid.y})`} fill={vizColors.text}>
        {`L = ${dim(p.length)} mm`}
      </text>
      {baseAt && (
        <text x={baseAt.x} y={baseAt.y} {...text}>
          {`Ø${dim(baseHole!.radius * 2)}`}
        </text>
      )}
      {flangeAt && (
        <text x={r2(flangeAt.x + 6)} y={r2(flangeAt.y - 4)} {...text}>
          {`Ø${dim(flangeHole!.radius * 2)}`}
        </text>
      )}
      {model.features.fillet && p.fillet > 0 && <FilletLabel view={view} radius={p.fillet} />}
    </g>
  );
}

function FilletLabel({ view, radius }: { view: View; radius: number }) {
  const at = r2(THICKNESS + radius - radius * Math.SQRT1_2);
  const arcMid = toScreen(view, [at, WIDTH, at]);
  // the label sits on the flange's inner face just above the fillet, where there is always room
  const label = toScreen(view, [THICKNESS, WIDTH - 5, THICKNESS + radius + 6]);
  return (
    <g>
      <line x1={arcMid.x} y1={arcMid.y} x2={label.x} y2={r2(label.y + 3)} stroke={vizColors.muted} strokeWidth={1} />
      <text x={r2(label.x + 3)} y={label.y} fill={vizColors.text} {...HALO}>
        {`R${dim(radius)}`}
      </text>
    </g>
  );
}

function SelectionOutline({ model, view, id }: { model: BracketModel; view: View; id: string }) {
  const poly = model.polys.find((q) => q.faceId === id);
  const hole = model.holes.find((h) => h.wallFaceId === id);
  const pts = poly ? poly.outer : hole?.nearRim;
  if (!pts) return null;
  return <path d={pathOf(view, pts, true)} fill="none" stroke={vizColors.amber} strokeWidth={3} strokeLinejoin="round" style={{ pointerEvents: "none" }} />;
}

export interface BracketSceneProps {
  model: BracketModel;
  view: View;
  highlight: SceneHighlight;
  selected?: Selection | null;
  onSelect?: (s: Selection) => void;
  /** draw length, diameter and radius dimensions */
  dims?: boolean;
  /** show face ids on highlighted faces */
  labels?: boolean;
}

/** Draws a bracket model as SVG shapes. Returns a group, so it can sit inside any SvgCanvas. */
export function BracketScene({ model, view, highlight, selected, onSelect, dims = false, labels = true }: BracketSceneProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const interactive = Boolean(onSelect);
  const pick = (s: Selection) => (onSelect ? () => onSelect(s) : undefined);
  const faceById = new Map(model.faces.map((f) => [f.id, f]));
  const isHidden = (p: FacePoly) => !faceById.get(p.faceId)?.visible;
  const isSel = (kind: Selection["kind"], id: string) => selected?.kind === kind && selected.id === id;
  const hiddenPolys = model.polys.filter(isHidden);
  const visiblePolys = model.polys.filter((p) => !isHidden(p));
  const hiddenEdgesShown = highlight.edges && highlight.xray;
  const faceCursor = highlight.faces && interactive ? "pointer" : undefined;
  const faceEvents = highlight.faces ? ("all" as const) : ("none" as const);

  return (
    <g>
      {/* visible faces */}
      {visiblePolys.map((poly) => {
        const name = faceById.get(poly.faceId)?.name;
        const common = { style: { cursor: faceCursor, pointerEvents: faceEvents }, onClick: pick({ kind: "face", id: poly.faceId }) };
        const tint = highlight.faces && (
          <path d={polyPath(view, poly)} fillRule="evenodd" fill={FACE_TINT[poly.key]} fillOpacity={0.5} style={{ pointerEvents: "none" }} />
        );
        if (poly.bands) {
          return (
            <g key={poly.faceId}>
              {poly.bands.map((b, i) => (
                <path key={i} d={pathOf(view, b.poly, true)} fill={shade(b.normal)} stroke={shade(b.normal)} strokeWidth={0.6} {...common} />
              ))}
              {tint}
              <path d={pathOf(view, poly.outer, true)} fill="transparent" {...common}>
                <title>{`${poly.faceId} ${name}`}</title>
              </path>
            </g>
          );
        }
        return (
          <g key={poly.faceId}>
            <path d={polyPath(view, poly)} fillRule="evenodd" fill={shade(poly.normal)} {...common}>
              <title>{`${poly.faceId} ${name}`}</title>
            </path>
            {tint}
          </g>
        );
      })}

      {/* holes: wall colour, then the see-through opening clipped to the near rim */}
      {model.holes.map((h, i) => {
        const clipId = `${uid}-hole${i}`;
        const near = pathOf(view, h.nearRim, true);
        return (
          <g key={h.key}>
            <clipPath id={clipId}>
              <path d={near} />
            </clipPath>
            <path d={near} fill="#2f3b58" style={{ cursor: faceCursor, pointerEvents: faceEvents }} onClick={pick({ kind: "face", id: h.wallFaceId })}>
              <title>{`${h.wallFaceId} ${faceById.get(h.wallFaceId)?.name}`}</title>
            </path>
            {highlight.faces && <path d={near} fill={FACE_TINT[h.key === "base" ? "wallBase" : "wallFlange"]} fillOpacity={0.45} style={{ pointerEvents: "none" }} />}
            <path d={pathOf(view, h.farRim, true)} fill={SURFACE} clipPath={`url(#${clipId})`} style={{ pointerEvents: "none" }} />
          </g>
        );
      })}

      {/* hidden faces as dashed ghosts on top of the solid, while highlighting faces or when one is selected. They never take clicks, so the visible faces underneath stay selectable; pick hidden ones from the lists. */}
      {hiddenPolys.map((poly) => {
        const chosen = isSel("face", poly.faceId);
        if (!chosen && !(highlight.xray && highlight.faces)) return null;
        const colour = FACE_TINT[poly.key];
        return (
          <path
            key={poly.faceId}
            d={polyPath(view, poly)}
            fillRule="evenodd"
            fill={colour}
            fillOpacity={chosen ? 0.3 : 0.12}
            stroke={colour}
            strokeOpacity={0.9}
            strokeDasharray="6 4"
            strokeWidth={1.4}
            style={{ pointerEvents: "none" }}
          />
        );
      })}

      {/* edges: visible ones always, hidden ones only in x-ray mode while edges are highlighted */}
      {model.edges.map((e) => {
        const chosen = isSel("edge", e.id);
        if (!e.visible && !hiddenEdgesShown && !chosen) return null;
        const d = pathOf(view, e.pts, false);
        return (
          <g key={e.id}>
            <path
              d={d}
              fill="none"
              stroke={chosen ? vizColors.amber : highlight.edges ? vizColors.cyan : "#cbd5e1"}
              strokeWidth={chosen ? 3.2 : highlight.edges ? 2 : 1.1}
              strokeOpacity={e.visible || chosen ? 1 : 0.7}
              strokeDasharray={e.visible ? undefined : "5 4"}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />
            {highlight.edges && interactive && (
              <path d={d} fill="none" stroke="transparent" strokeWidth={11} style={{ cursor: "pointer", pointerEvents: "stroke" }} onClick={pick({ kind: "edge", id: e.id })}>
                <title>{`${e.id}: ${e.detail}`}</title>
              </path>
            )}
          </g>
        );
      })}

      {/* vertices */}
      {highlight.vertices &&
        model.vertices.map((v) => {
          const chosen = isSel("vertex", v.id);
          if (!v.visible && !highlight.xray && !chosen) return null;
          const s = toScreen(view, v.p);
          return (
            <circle
              key={v.id}
              cx={s.x}
              cy={s.y}
              r={chosen ? 6 : 4}
              fill={v.visible ? vizColors.amber : SURFACE}
              stroke={chosen ? "#ffffff" : vizColors.amber}
              strokeWidth={chosen ? 2 : 1.5}
              strokeOpacity={v.visible ? 1 : 0.8}
              style={{ cursor: interactive ? "pointer" : undefined }}
              onClick={pick({ kind: "vertex", id: v.id })}
            >
              <title>{`${v.id} at (${v.p.map((n) => f1(n)).join(", ")}) mm`}</title>
            </circle>
          );
        })}

      {/* ids of the visible faces */}
      {labels &&
        highlight.faces &&
        model.faces
          .filter((f) => f.visible)
          .map((f) => {
            const poly = model.polys.find((q) => q.faceId === f.id);
            const hole = model.holes.find((h) => h.wallFaceId === f.id);
            const pts = poly ? poly.outer : hole?.nearRim;
            if (!pts) return null;
            const c = poly?.labelAt ? toScreen(view, poly.labelAt) : centroid(view, pts);
            return (
              <text
                key={f.id}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill="#ffffff"
                fontFamily="var(--font-mono)"
                style={{ pointerEvents: "none" }}
                {...HALO}
              >
                {f.id}
              </text>
            );
          })}

      {selected?.kind === "face" && <SelectionOutline model={model} view={view} id={selected.id} />}
      {dims && <Dimensions model={model} view={view} />}
    </g>
  );
}
