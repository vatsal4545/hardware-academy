/**
 * A small L-bracket modelled the way a B-rep kernel stores it: faces, edges and vertices with
 * adjacency, plus the 3-D geometry needed to draw it. Pure functions, no React.
 *
 * Coordinates are millimetres: x runs along the base (from the flange's outer face), y along the
 * width, z up. The profile (an L with an optional inside fillet) lies in the x-z plane and is
 * extruded along y. Topology follows OpenCascade conventions: a cylindrical face carries a seam
 * edge, and a closed circle has one vertex.
 */

export type V3 = [number, number, number];

export const THICKNESS = 6;
export const WIDTH = 40;
export const FLANGE_H = 44;
/** base hole centre, measured from the base end */
export const HOLE_END = 17;
/** flange hole centre height above the bottom */
export const FLANGE_HOLE_Z = 24;
export const MIN_LIGAMENT = 1.5;
export const MIN_FILLET = 0.5;
/** 6061 aluminium, grams per cubic millimetre */
export const AL_DENSITY = 0.0027;

export interface BracketParams {
  length: number;
  holeD: number;
  fillet: number;
}
export interface Features {
  fillet: boolean;
  baseHole: boolean;
  flangeHole: boolean;
}
export const ALL_FEATURES: Features = { fillet: true, baseHole: true, flangeHole: true };
export const DEFAULT_PARAMS: BracketParams = { length: 70, holeD: 8.5, fillet: 6 };

export type SurfaceType = "plane" | "cylinder";
export type CurveType = "line" | "arc" | "circle";

export interface BFace {
  id: string;
  key: string;
  name: string;
  surface: SurfaceType;
  detail: string;
  area: number;
  visible: boolean;
  loops: number;
  edgeIds: string[];
  neighbourIds: string[];
}
export interface BEdge {
  id: string;
  key: string;
  curve: CurveType;
  detail: string;
  length: number;
  faceIds: [string, string];
  vertexIds: [string, string];
  visible: boolean;
  pts: V3[];
}
export interface BVertex {
  id: string;
  key: string;
  p: V3;
  edgeIds: string[];
  visible: boolean;
}
export interface FacePoly {
  faceId: string;
  key: string;
  outer: V3[];
  loops: V3[][];
  normal: V3;
  /** where to put the id label when the centroid would sit on a hole */
  labelAt?: V3;
  /** curved faces are shaded as bands; each band has its own normal */
  bands?: Array<{ poly: V3[]; normal: V3 }>;
}
export interface HoleGeom {
  key: "base" | "flange";
  wallFaceId: string;
  radius: number;
  nearRim: V3[];
  farRim: V3[];
}
export interface Euler {
  V: number;
  E: number;
  F: number;
  rings: number;
  genus: number;
  chi: number;
}
export interface BracketModel {
  params: BracketParams;
  features: Features;
  faces: BFace[];
  edges: BEdge[];
  vertices: BVertex[];
  polys: FacePoly[];
  holes: HoleGeom[];
  euler: Euler;
  wires: number;
}

const TAU = Math.PI * 2;
const N_CIRCLE = 48;
const N_ARC = 14;
const HIDDEN_FACES = new Set(["bottom", "flangeOuter", "back"]);
const HIDDEN_EDGES = new Set(["hbBot", "hfOut", "hbSeam", "hfSeam"]);

const FACE_NAMES: Record<string, string> = {
  bottom: "bottom",
  end: "base end",
  baseTop: "base top",
  fillet: "inside fillet",
  flangeInner: "flange inner",
  flangeTop: "flange top",
  flangeOuter: "flange outer",
  front: "front cap",
  back: "back cap",
  wallBase: "base hole wall",
  wallFlange: "flange hole wall",
};

function circlePts(axis: "x" | "z", c: V3, radius: number, theta0: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < N_CIRCLE; i++) {
    const a = theta0 + (i / N_CIRCLE) * TAU;
    const u = radius * Math.cos(a);
    const v = radius * Math.sin(a);
    out.push(axis === "z" ? [c[0] + u, c[1] + v, c[2]] : [c[0], c[1] + u, c[2] + v]);
  }
  return out;
}

function dist(a: V3, b: V3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** up to two decimals, no trailing zeros: 4.25, 6, 9.4 */
function fmt2(n: number): string {
  return String(Number(n.toFixed(2)));
}

interface EdgeDraft {
  key: string;
  curve: CurveType;
  pts: V3[];
  faces: [string, string];
  verts: [string, string];
  length: number;
  detail: string;
}

export function buildBracket(p: BracketParams, f: Features = ALL_FEATURES): BracketModel {
  const L = p.length;
  const T = THICKNESS;
  const W = WIDTH;
  const H = FLANGE_H;
  const r = f.fillet && p.fillet > 0 ? p.fillet : 0;
  const R = p.holeD / 2;
  const xc = L - HOLE_END;
  const yc = W / 2;
  const zc = FLANGE_HOLE_Z;

  const corners: Array<[number, number]> =
    r > 0
      ? [[0, 0], [L, 0], [L, T], [T + r, T], [T, T + r], [T, H], [0, H]]
      : [[0, 0], [L, 0], [L, T], [T, T], [T, H], [0, H]];
  const n = corners.length;
  const segFace =
    r > 0
      ? ["bottom", "end", "baseTop", "fillet", "flangeInner", "flangeTop", "flangeOuter"]
      : ["bottom", "end", "baseTop", "flangeInner", "flangeTop", "flangeOuter"];
  const arcSeg = r > 0 ? 3 : -1;
  const at = (i: number, y: number): V3 => [corners[i][0], y, corners[i][1]];
  const arcPts = (y: number): V3[] => {
    const out: V3[] = [];
    for (let k = 0; k <= N_ARC; k++) {
      const phi = -Math.PI / 2 - (k / N_ARC) * (Math.PI / 2);
      out.push([T + r + r * Math.cos(phi), y, T + r + r * Math.sin(phi)]);
    }
    return out;
  };

  // ---- vertices ----
  const vDraft: Array<{ key: string; p: V3 }> = [];
  for (let i = 0; i < n; i++) vDraft.push({ key: `b${i}`, p: at(i, 0) });
  for (let i = 0; i < n; i++) vDraft.push({ key: `f${i}`, p: at(i, W) });

  // ---- edges ----
  const eDraft: EdgeDraft[] = [];
  const profileEdge = (prefix: "back" | "front", y: number, i: number): EdgeDraft => {
    const j = (i + 1) % n;
    const vk = prefix === "back" ? "b" : "f";
    const isArc = i === arcSeg;
    const pts = isArc ? arcPts(y) : [at(i, y), at(j, y)];
    const length = isArc ? (Math.PI / 2) * r : dist(at(i, y), at(j, y));
    return {
      key: `${prefix}${i}`,
      curve: isArc ? "arc" : "line",
      pts,
      faces: [prefix, segFace[i]],
      verts: [`${vk}${i}`, `${vk}${j}`],
      length,
      detail: isArc ? `arc, r = ${fmt2(r)} mm, 90°` : `line, ${fmt2(length)} mm`,
    };
  };
  for (let i = 0; i < n; i++) eDraft.push(profileEdge("back", 0, i));
  for (let i = 0; i < n; i++) eDraft.push(profileEdge("front", W, i));
  for (let i = 0; i < n; i++) {
    eDraft.push({
      key: `lat${i}`,
      curve: "line",
      pts: [at(i, 0), at(i, W)],
      faces: [segFace[(i - 1 + n) % n], segFace[i]],
      verts: [`b${i}`, `f${i}`],
      length: W,
      detail: `line, ${fmt2(W)} mm`,
    });
  }

  // ---- holes ----
  const holes: HoleGeom[] = [];
  const loopsByFace: Record<string, V3[][]> = {};
  const addHole = (
    key: "base" | "flange",
    axis: "z" | "x",
    near: V3,
    far: V3,
    theta0: number,
    names: { near: string; far: string; wall: string; nearEdge: string; farEdge: string; seam: string; vNear: string; vFar: string },
  ) => {
    const nearRim = circlePts(axis, near, R, theta0);
    const farRim = circlePts(axis, far, R, theta0);
    holes.push({ key, wallFaceId: names.wall /* a key for now; swapped for the real id below */, radius: R, nearRim, farRim });
    (loopsByFace[names.near] ??= []).push(nearRim);
    (loopsByFace[names.far] ??= []).push(farRim);
    vDraft.push({ key: names.vNear, p: nearRim[0] });
    vDraft.push({ key: names.vFar, p: farRim[0] });
    const circumference = TAU * R;
    const circleDetail = `circle, r = ${fmt2(R)} mm`;
    eDraft.push({
      key: names.nearEdge,
      curve: "circle",
      pts: [...nearRim, nearRim[0]],
      faces: [names.near, names.wall],
      verts: [names.vNear, names.vNear],
      length: circumference,
      detail: circleDetail,
    });
    eDraft.push({
      key: names.farEdge,
      curve: "circle",
      pts: [...farRim, farRim[0]],
      faces: [names.far, names.wall],
      verts: [names.vFar, names.vFar],
      length: circumference,
      detail: circleDetail,
    });
    eDraft.push({
      key: names.seam,
      curve: "line",
      pts: [nearRim[0], farRim[0]],
      faces: [names.wall, names.wall],
      verts: [names.vNear, names.vFar],
      length: T,
      detail: `seam line, ${fmt2(T)} mm (the cylinder wraps around and meets itself here)`,
    });
  };
  if (f.baseHole) {
    addHole("base", "z", [xc, yc, T], [xc, yc, 0], Math.PI / 4, {
      near: "baseTop", far: "bottom", wall: "wallBase", nearEdge: "hbTop", farEdge: "hbBot", seam: "hbSeam", vNear: "hbTopV", vFar: "hbBotV",
    });
  }
  if (f.flangeHole) {
    addHole("flange", "x", [T, yc, zc], [0, yc, zc], Math.PI / 4, {
      near: "flangeInner", far: "flangeOuter", wall: "wallFlange", nearEdge: "hfIn", farEdge: "hfOut", seam: "hfSeam", vNear: "hfInV", vFar: "hfOutV",
    });
  }

  // ---- faces ----
  const x0 = r > 0 ? T + r : T;
  const z0 = r > 0 ? T + r : T;
  const holeArea = Math.PI * R * R;
  const baseHoleArea = f.baseHole ? holeArea : 0;
  const flangeHoleArea = f.flangeHole ? holeArea : 0;
  const profileArea = L * T + (H - T) * T + (r > 0 ? (1 - Math.PI / 4) * r * r : 0);
  const profilePoly = (y: number): V3[] => {
    const out: V3[] = [];
    for (let i = 0; i < n; i++) {
      out.push(at(i, y));
      if (i === arcSeg) out.push(...arcPts(y).slice(1, -1));
    }
    return out;
  };
  interface FaceDraft {
    key: string;
    surface: SurfaceType;
    detail: string;
    area: number;
    outer: V3[];
    normal: V3;
    bands?: Array<{ poly: V3[]; normal: V3 }>;
  }
  const fDraft: FaceDraft[] = [];
  fDraft.push({ key: "bottom", surface: "plane", detail: "plane, normal −z", area: L * W - baseHoleArea, outer: [[0, 0, 0], [L, 0, 0], [L, W, 0], [0, W, 0]], normal: [0, 0, -1] });
  fDraft.push({ key: "end", surface: "plane", detail: "plane, normal +x", area: W * T, outer: [[L, 0, 0], [L, W, 0], [L, W, T], [L, 0, T]], normal: [1, 0, 0] });
  fDraft.push({ key: "baseTop", surface: "plane", detail: "plane, normal +z", area: (L - x0) * W - baseHoleArea, outer: [[x0, 0, T], [L, 0, T], [L, W, T], [x0, W, T]], normal: [0, 0, 1] });
  if (r > 0) {
    const front = arcPts(W);
    const back = arcPts(0);
    const bands: Array<{ poly: V3[]; normal: V3 }> = [];
    for (let k = 0; k < N_ARC; k++) {
      const phi = -Math.PI / 2 - ((k + 0.5) / N_ARC) * (Math.PI / 2);
      bands.push({ poly: [front[k], front[k + 1], back[k + 1], back[k]], normal: [-Math.cos(phi), 0, -Math.sin(phi)] });
    }
    fDraft.push({
      key: "fillet",
      surface: "cylinder",
      detail: `cylinder, r = ${fmt2(r)} mm, axis along y (concave)`,
      area: (Math.PI / 2) * r * W,
      outer: [...front, ...back.slice().reverse()],
      normal: [-0.7, 0, -0.7],
      bands,
    });
  }
  fDraft.push({ key: "flangeInner", surface: "plane", detail: "plane, normal +x", area: (H - z0) * W - flangeHoleArea, outer: [[T, 0, z0], [T, W, z0], [T, W, H], [T, 0, H]], normal: [1, 0, 0] });
  fDraft.push({ key: "flangeTop", surface: "plane", detail: "plane, normal +z", area: T * W, outer: [[0, 0, H], [T, 0, H], [T, W, H], [0, W, H]], normal: [0, 0, 1] });
  fDraft.push({ key: "flangeOuter", surface: "plane", detail: "plane, normal −x", area: H * W - flangeHoleArea, outer: [[0, 0, 0], [0, W, 0], [0, W, H], [0, 0, H]], normal: [-1, 0, 0] });
  fDraft.push({ key: "front", surface: "plane", detail: "plane, normal +y", area: profileArea, outer: profilePoly(W), normal: [0, 1, 0] });
  fDraft.push({ key: "back", surface: "plane", detail: "plane, normal −y", area: profileArea, outer: profilePoly(0), normal: [0, -1, 0] });
  if (f.baseHole) {
    fDraft.push({ key: "wallBase", surface: "cylinder", detail: `cylinder, r = ${fmt2(R)} mm, axis along z`, area: Math.PI * 2 * R * T, outer: holes[0].nearRim, normal: [0, 0, 1] });
  }
  if (f.flangeHole) {
    fDraft.push({ key: "wallFlange", surface: "cylinder", detail: `cylinder, r = ${fmt2(R)} mm, axis along x`, area: Math.PI * 2 * R * T, outer: holes[holes.length - 1].nearRim, normal: [1, 0, 0] });
  }

  // ---- assign ids and resolve adjacency ----
  const faceId = new Map(fDraft.map((d, i) => [d.key, `F${i + 1}`]));
  const edgeId = new Map(eDraft.map((d, i) => [d.key, `E${i + 1}`]));
  const vertId = new Map(vDraft.map((d, i) => [d.key, `V${i + 1}`]));

  const faceEdges = new Map<string, Set<string>>();
  for (const d of fDraft) faceEdges.set(d.key, new Set());
  const faceNeighbours = new Map<string, Set<string>>();
  for (const d of fDraft) faceNeighbours.set(d.key, new Set());
  const vertEdges = new Map<string, Set<string>>();
  for (const d of vDraft) vertEdges.set(d.key, new Set());
  for (const e of eDraft) {
    faceEdges.get(e.faces[0])?.add(e.key);
    faceEdges.get(e.faces[1])?.add(e.key);
    if (e.faces[0] !== e.faces[1]) {
      faceNeighbours.get(e.faces[0])?.add(e.faces[1]);
      faceNeighbours.get(e.faces[1])?.add(e.faces[0]);
    }
    vertEdges.get(e.verts[0])?.add(e.key);
    vertEdges.get(e.verts[1])?.add(e.key);
  }

  const edgeVisible = (e: EdgeDraft) =>
    !HIDDEN_EDGES.has(e.key) && e.faces.some((fk) => !HIDDEN_FACES.has(fk));
  const edgeVisibleByKey = new Map(eDraft.map((e) => [e.key, edgeVisible(e)]));

  const faces: BFace[] = fDraft.map((d) => ({
    id: faceId.get(d.key)!,
    key: d.key,
    name: FACE_NAMES[d.key],
    surface: d.surface,
    detail: d.detail,
    area: d.area,
    visible: !HIDDEN_FACES.has(d.key),
    loops: 1 + (loopsByFace[d.key]?.length ?? 0),
    edgeIds: [...(faceEdges.get(d.key) ?? [])].map((k) => edgeId.get(k)!),
    neighbourIds: [...(faceNeighbours.get(d.key) ?? [])].map((k) => faceId.get(k)!),
  }));
  const edges: BEdge[] = eDraft.map((e) => ({
    id: edgeId.get(e.key)!,
    key: e.key,
    curve: e.curve,
    detail: e.detail,
    length: e.length,
    faceIds: [faceId.get(e.faces[0])!, faceId.get(e.faces[1])!],
    vertexIds: [vertId.get(e.verts[0])!, vertId.get(e.verts[1])!],
    visible: edgeVisibleByKey.get(e.key) ?? false,
    pts: e.pts,
  }));
  const vertices: BVertex[] = vDraft.map((v) => {
    const incident = [...(vertEdges.get(v.key) ?? [])];
    return {
      id: vertId.get(v.key)!,
      key: v.key,
      p: v.p,
      edgeIds: incident.map((k) => edgeId.get(k)!),
      visible: incident.some((k) => edgeVisibleByKey.get(k)),
    };
  });
  const labelAnchors: Record<string, V3 | undefined> = {
    baseTop: [x0 + 0.35 * (L - x0), yc, T],
    flangeInner: [T, yc, z0 + 0.8 * (H - z0)],
    // the L-shaped caps have their centroid in the empty inside corner, so label the base leg instead
    front: [L * 0.58, W, T / 2],
  };
  const polys: FacePoly[] = fDraft
    .filter((d) => d.key !== "wallBase" && d.key !== "wallFlange")
    .map((d) => ({
      faceId: faceId.get(d.key)!,
      key: d.key,
      outer: d.outer,
      loops: loopsByFace[d.key] ?? [],
      normal: d.normal,
      labelAt: labelAnchors[d.key],
      bands: d.bands,
    }));
  for (const h of holes) h.wallFaceId = faceId.get(h.key === "base" ? "wallBase" : "wallFlange")!;

  const wires = faces.reduce((sum, face) => sum + face.loops, 0);
  const rings = wires - faces.length;
  const genus = holes.length;
  const euler: Euler = {
    V: vertices.length,
    E: edges.length,
    F: faces.length,
    rings,
    genus,
    chi: vertices.length - edges.length + faces.length - rings,
  };
  return { params: p, features: f, faces, edges, vertices, polys, holes, euler, wires };
}

// ---------------------------------------------------------------------------------------------
// Feature-tree rebuild and DFM checks for the parametric bracket
// ---------------------------------------------------------------------------------------------

export type FeatureId = "sketch" | "extrude" | "fillet" | "holeBase" | "holeFlange";
export type FeatureOrder = "fillet-first" | "holes-first";
export interface FeatureStatus {
  id: FeatureId;
  label: string;
  state: "ok" | "failed" | "skipped";
  message?: string;
}
export interface Rebuild {
  statuses: FeatureStatus[];
  applied: Features;
  failure: FeatureStatus | null;
}

/** Clearance between a hole rim and the start of the fillet (or the corner edge when there is no fillet). */
export function filletClearance(p: BracketParams, hole: "base" | "flange", filletR: number): number {
  const R = p.holeD / 2;
  const centre = hole === "base" ? p.length - HOLE_END : FLANGE_HOLE_Z;
  return centre - R - (THICKNESS + filletR);
}

/** Smallest distance from a hole rim to the outer edges of the face it is drilled in (not counting the fillet). */
export function plateEdgeGap(p: BracketParams, hole: "base" | "flange"): number {
  const R = p.holeD / 2;
  const far = hole === "base" ? HOLE_END - R : FLANGE_H - FLANGE_HOLE_Z - R;
  return Math.min(far, WIDTH / 2 - R);
}

export function rebuild(p: BracketParams, order: FeatureOrder): Rebuild {
  const sequence: FeatureId[] =
    order === "fillet-first"
      ? ["sketch", "extrude", "fillet", "holeBase", "holeFlange"]
      : ["sketch", "extrude", "holeBase", "holeFlange", "fillet"];
  const labels: Record<FeatureId, string> = {
    sketch: `Sketch: L-profile ${fmt(p.length)} × ${FLANGE_H} mm, t = ${THICKNESS} mm`,
    extrude: `Extrude: ${WIDTH} mm wide`,
    fillet: p.fillet > 0 ? `Fillet: R${fmt(p.fillet)} inside bend` : "Fillet: none (sharp inside corner)",
    holeBase: `Hole: Ø${fmt(p.holeD)} through the base`,
    holeFlange: `Hole: Ø${fmt(p.holeD)} through the flange`,
  };
  const failed = (id: FeatureId, message: string): FeatureStatus => ({ id, label: labels[id], state: "failed", message });
  const applied: Features = { fillet: false, baseHole: false, flangeHole: false };
  const statuses: FeatureStatus[] = [];
  let failure: FeatureStatus | null = null;

  for (const id of sequence) {
    if (failure) {
      statuses.push({ id, label: labels[id], state: "skipped" });
      continue;
    }
    let result: FeatureStatus = { id, label: labels[id], state: "ok" };
    if (id === "fillet") {
      if (p.fillet <= 0) {
        result = { ...result, message: "No radius requested." };
      } else if (p.fillet > Math.min(p.length - THICKNESS, FLANGE_H - THICKNESS) - MIN_LIGAMENT) {
        result = failed(id, `Fillet R${fmt(p.fillet)} is larger than the faces it rolls between.`);
      } else {
        // holes that already exist when the fillet is built can block the rolling ball
        const blocking = (["base", "flange"] as const)
          .filter((h) => (h === "base" ? applied.baseHole : applied.flangeHole))
          .map((h) => ({ h, gap: filletClearance(p, h, p.fillet) }))
          .sort((a, b) => a.gap - b.gap)[0];
        if (blocking && blocking.gap < MIN_LIGAMENT) {
          result = failed(
            id,
            `BRep_API: command not done. The rolling ball for R${fmt(p.fillet)} runs into the ${blocking.h} hole: ${fmt(Math.max(0, blocking.gap))} mm of face is left, ${MIN_LIGAMENT} mm needed.`,
          );
        } else {
          applied.fillet = true;
        }
      }
    } else if (id === "holeBase" || id === "holeFlange") {
      const which = id === "holeBase" ? "base" : "flange";
      const breakout = plateEdgeGap(p, which);
      const clearance = filletClearance(p, which, applied.fillet ? p.fillet : 0);
      if (breakout < 0) {
        result = failed(id, `The hole breaks through the edge of the ${which} by ${fmt(-breakout)} mm.`);
      } else if (applied.fillet && clearance < MIN_LIGAMENT) {
        result = failed(
          id,
          `Hole rim is ${fmt(Math.max(0, clearance))} mm from the start of the fillet, so the drill would break into the curved face (${MIN_LIGAMENT} mm needed).`,
        );
      } else if (which === "base") {
        applied.baseHole = true;
      } else {
        applied.flangeHole = true;
      }
    }
    statuses.push(result);
    if (result.state === "failed") failure = result;
  }
  return { statuses, applied, failure };
}

export interface DfmCheck {
  id: "wall" | "edge" | "fillet";
  label: string;
  measured: string;
  rule: string;
  status: "pass" | "fail" | "na";
}

const mm = (n: number) => `${fmt(Math.round(n * 10) / 10)} mm`;

export function dfmChecks(p: BracketParams, built: Rebuild): DfmCheck[] {
  const { applied } = built;
  const gaps: number[] = [];
  if (applied.baseHole) gaps.push(plateEdgeGap(p, "base"));
  if (applied.flangeHole) gaps.push(plateEdgeGap(p, "flange"));
  const wall = Math.min(THICKNESS, ...gaps);
  const minGap = Math.min(...gaps);
  const filletBuilt = applied.fillet;
  return [
    {
      id: "wall",
      label: "Minimum wall",
      measured: mm(wall),
      rule: `at least ${MIN_LIGAMENT} mm`,
      status: wall >= MIN_LIGAMENT ? "pass" : "fail",
    },
    {
      id: "edge",
      label: "Hole to edge",
      measured: gaps.length ? mm(minGap) : "no hole built",
      rule: `at least 1 × hole diameter (${mm(p.holeD)})`,
      status: gaps.length === 0 ? "na" : minGap >= p.holeD ? "pass" : "fail",
    },
    {
      id: "fillet",
      label: "Fillet feasibility",
      measured: filletBuilt ? `R${fmt(p.fillet)}` : p.fillet > 0 ? "not built" : "sharp corner",
      rule: `inside radius of at least ${MIN_FILLET} mm`,
      status: filletBuilt ? (p.fillet >= MIN_FILLET ? "pass" : "fail") : p.fillet > 0 ? "na" : "fail",
    },
  ];
}

export function bracketVolume(p: BracketParams, applied: Features): number {
  const r = applied.fillet && p.fillet > 0 ? p.fillet : 0;
  const R = p.holeD / 2;
  const profile = p.length * THICKNESS + (FLANGE_H - THICKNESS) * THICKNESS + (r > 0 ? (1 - Math.PI / 4) * r * r : 0);
  const holes = (applied.baseHole ? 1 : 0) + (applied.flangeHole ? 1 : 0);
  return profile * WIDTH - holes * Math.PI * R * R * THICKNESS;
}

// ---------------------------------------------------------------------------------------------
// Isometric projection
// ---------------------------------------------------------------------------------------------

export interface Pt {
  x: number;
  y: number;
}
export interface View {
  scale: number;
  ox: number;
  oy: number;
}
const C30 = Math.cos(Math.PI / 6);

function isoRaw(p: V3): Pt {
  return { x: (p[0] - p[1]) * C30, y: (p[0] + p[1]) * 0.5 - p[2] };
}

/** A view that fits the bracket at `maxLength` into a width x height canvas with padding. */
export function makeView(maxLength: number, width: number, height: number, pad = 18): View {
  const x0 = isoRaw([0, WIDTH, 0]).x;
  const x1 = isoRaw([maxLength, 0, 0]).x;
  const y0 = isoRaw([0, 0, FLANGE_H]).y;
  const y1 = isoRaw([maxLength, WIDTH, 0]).y;
  const scale = Math.min((width - 2 * pad) / (x1 - x0), (height - 2 * pad) / (y1 - y0));
  return { scale, ox: width / 2 - ((x0 + x1) / 2) * scale, oy: height / 2 - ((y0 + y1) / 2) * scale };
}

export function toScreen(v: View, p: V3): Pt {
  const r = isoRaw(p);
  return { x: v.ox + r.x * v.scale, y: v.oy + r.y * v.scale };
}
