"use client";

import { useState } from "react";
import { Toggle, VizFrame } from "@/components/lesson";
import { SvgCanvas } from "@/components/viz/shared";
import { BracketScene, FACE_TINT, SURFACE, type Selection } from "./BracketScene";
import { ALL_FEATURES, buildBracket, DEFAULT_PARAMS, makeView, type BracketModel, type Features } from "./bracketModel";
import { cx } from "./ui";

const VIEW = makeView(DEFAULT_PARAMS.length, 440, 380, 14);

type Kind = Selection["kind"];

interface Row {
  label: string;
  value: string;
}

function ids(list: string[]): string {
  return list.length ? list.join(", ") : "none";
}

function describe(model: BracketModel, sel: Selection): { title: string; rows: Row[] } {
  if (sel.kind === "face") {
    const f = model.faces.find((x) => x.id === sel.id)!;
    return {
      title: `Face ${f.id}: ${f.name}`,
      rows: [
        { label: "Surface", value: f.detail },
        { label: "Area", value: `${f.area.toFixed(0)} mm²` },
        { label: "Boundary", value: f.loops === 1 ? "1 wire (the outer outline)" : `${f.loops} wires: the outer outline plus ${f.loops - 1} hole rim` },
        { label: "Edges", value: ids(f.edgeIds) },
        { label: "Touches faces", value: ids(f.neighbourIds) },
        { label: "From this angle", value: f.visible ? "visible" : "hidden (drawn as a dashed ghost)" },
      ],
    };
  }
  if (sel.kind === "edge") {
    const e = model.edges.find((x) => x.id === sel.id)!;
    const sameFace = e.faceIds[0] === e.faceIds[1];
    const sameVertex = e.vertexIds[0] === e.vertexIds[1];
    return {
      title: `Edge ${e.id}`,
      rows: [
        { label: "Curve", value: e.detail },
        { label: "Length", value: `${e.length.toFixed(1)} mm` },
        { label: "Shared by faces", value: sameFace ? `${e.faceIds[0]} on both sides (a seam)` : `${e.faceIds[0]} and ${e.faceIds[1]}` },
        { label: "End vertices", value: sameVertex ? `${e.vertexIds[0]} at both ends (a closed loop)` : `${e.vertexIds[0]} and ${e.vertexIds[1]}` },
        { label: "From this angle", value: e.visible ? "visible" : "hidden (dashed)" },
      ],
    };
  }
  const v = model.vertices.find((x) => x.id === sel.id)!;
  return {
    title: `Vertex ${v.id}`,
    rows: [
      { label: "Point", value: `(${v.p.map((n) => n.toFixed(1)).join(", ")}) mm` },
      { label: "Edges meeting here", value: `${ids(v.edgeIds)} (${v.edgeIds.length})` },
      { label: "From this angle", value: v.visible ? "visible" : "hidden (hollow dot)" },
    ],
  };
}

function ChipRow({
  label,
  kind,
  items,
  selected,
  onSelect,
}: {
  label: string;
  kind: Kind;
  items: Array<{ id: string; title: string; tint?: string; hidden: boolean }>;
  selected: Selection | null;
  onSelect: (s: Selection) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
      {items.map((it) => {
        const on = selected?.kind === kind && selected.id === it.id;
        return (
          <button
            key={it.id}
            type="button"
            aria-pressed={on}
            title={it.title}
            onClick={() => onSelect({ kind, id: it.id })}
            className={cx(
              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors",
              on ? "border-amber-400 bg-amber-400/15 text-text" : "border-border text-muted hover:bg-surface-2 hover:text-text",
              it.hidden && "border-dashed",
            )}
          >
            {it.tint && <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: it.tint }} />}
            {it.id}
          </button>
        );
      })}
    </div>
  );
}

/** An isometric L-bracket whose faces, edges and vertices can be highlighted, counted and inspected one by one. */
export function BRepExplorer() {
  const [show, setShow] = useState({ faces: true, edges: false, vertices: false });
  const [xray, setXray] = useState(true);
  const [features, setFeatures] = useState<Features>(ALL_FEATURES);
  const [picked, setPicked] = useState<Selection | null>(null);

  const model = buildBracket(DEFAULT_PARAMS, features);
  const kindKey: Record<Kind, "faces" | "edges" | "vertices"> = { face: "faces", edge: "edges", vertex: "vertices" };
  const selected = picked && show[kindKey[picked.kind]] ? picked : null;
  const { euler } = model;
  const seen = {
    faces: model.faces.filter((f) => f.visible).length,
    edges: model.edges.filter((e) => e.visible).length,
    vertices: model.vertices.filter((v) => v.visible).length,
  };
  const info = selected ? describe(model, selected) : null;
  const choose = (s: Selection) => setPicked((cur) => (cur && cur.kind === s.kind && cur.id === s.id ? null : s));
  // ids are renumbered when a feature goes away, so a selection would point at a different entity
  const setFeature = (key: keyof Features, on: boolean) => {
    setFeatures((f) => ({ ...f, [key]: on }));
    setPicked(null);
  };

  return (
    <VizFrame
      title="B-rep explorer: one bracket, three kinds of entity"
      description="Switch faces, edges and vertices on and click any of them. With X-ray on, hidden ones are drawn dashed; pick those from the lists. Then remove a feature and watch the counts and the Euler check change."
      controls={
        <>
          <Toggle label={`Faces · ${euler.F}`} checked={show.faces} onChange={(v) => setShow((s) => ({ ...s, faces: v }))} />
          <Toggle label={`Edges · ${euler.E}`} checked={show.edges} onChange={(v) => setShow((s) => ({ ...s, edges: v }))} />
          <Toggle label={`Vertices · ${euler.V}`} checked={show.vertices} onChange={(v) => setShow((s) => ({ ...s, vertices: v }))} />
          <Toggle label="X-ray: show hidden entities" checked={xray} onChange={setXray} />
          <Toggle label="Feature: inside fillet" checked={features.fillet} onChange={(v) => setFeature("fillet", v)} />
          <Toggle label="Feature: base hole" checked={features.baseHole} onChange={(v) => setFeature("baseHole", v)} />
          <Toggle label="Feature: flange hole" checked={features.flangeHole} onChange={(v) => setFeature("flangeHole", v)} />
        </>
      }
      footer={
        <span>
          Euler-Poincaré check: V − E + F − R = {euler.V} − {euler.E} + {euler.F} − {euler.rings} = <strong className="text-text">{euler.chi}</strong>, and 2 − 2g with g = {euler.genus} through-{euler.genus === 1 ? "hole" : "holes"} is{" "}
          {2 - 2 * euler.genus}. Each hole you remove adds 2 back.
        </span>
      }
    >
      <div className="space-y-4">
        <SvgCanvas viewBox="0 0 440 380" title={`Isometric L-bracket with ${euler.F} faces, ${euler.E} edges and ${euler.V} vertices`} className="mx-auto max-w-[520px]">
          <rect width="440" height="380" fill={SURFACE} />
          <BracketScene
            model={model}
            view={VIEW}
            highlight={{ faces: show.faces, edges: show.edges, vertices: show.vertices, xray }}
            selected={selected}
            onSelect={choose}
          />
        </SvgCanvas>

        <p className="text-sm text-muted" aria-live="polite">
          From this angle you can see {seen.faces} of {euler.F} faces, {seen.edges} of {euler.E} edges and {seen.vertices} of {euler.V} vertices. The kernel stores all of them.
        </p>

        <div className="rounded-lg border border-border bg-bg p-3 text-sm" aria-live="polite">
          {info ? (
            <>
              <p className="mb-2 font-semibold">{info.title}</p>
              <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
                {info.rows.map((r) => (
                  <div key={r.label} className="contents">
                    <dt className="text-muted">{r.label}</dt>
                    <dd className="font-mono text-[13px]">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="text-muted">Click a highlighted face, edge or vertex, or pick one from the lists below, to see its exact geometry and what it touches.</p>
          )}
        </div>

        <div className="space-y-2">
          {show.faces && (
            <ChipRow
              label="Faces"
              kind="face"
              selected={selected}
              onSelect={choose}
              items={model.faces.map((f) => ({ id: f.id, title: `${f.name}: ${f.detail}`, tint: FACE_TINT[f.key], hidden: !f.visible }))}
            />
          )}
          {show.edges && (
            <ChipRow
              label="Edges"
              kind="edge"
              selected={selected}
              onSelect={choose}
              items={model.edges.map((e) => ({ id: e.id, title: e.detail, hidden: !e.visible }))}
            />
          )}
          {show.vertices && (
            <ChipRow
              label="Vertices"
              kind="vertex"
              selected={selected}
              onSelect={choose}
              items={model.vertices.map((v) => ({ id: v.id, title: `(${v.p.map((n) => n.toFixed(1)).join(", ")}) mm`, hidden: !v.visible }))}
            />
          )}
        </div>
      </div>
    </VizFrame>
  );
}
