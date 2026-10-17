"use client";

import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { SvgCanvas, Arrow, vizColors } from "@/components/viz/shared";
import { BRepExplorer } from "@/components/viz/ai-design/BRepExplorer";
import { ParametricBracket } from "@/components/viz/ai-design/ParametricBracket";
import { BracketScene, SURFACE } from "@/components/viz/ai-design/BracketScene";
import { buildBracket, DEFAULT_PARAMS, makeView, toScreen, type V3 } from "@/components/viz/ai-design/bracketModel";

const MODEL = buildBracket(DEFAULT_PARAMS);
const VIEW = makeView(DEFAULT_PARAMS.length, 400, 340, 24);
const planes = MODEL.faces.filter((f) => f.surface === "plane").length;
const cylinders = MODEL.faces.length - planes;
const lines = MODEL.edges.filter((e) => e.curve === "line").length;
const arcs = MODEL.edges.filter((e) => e.curve === "arc").length;
const circles = MODEL.edges.filter((e) => e.curve === "circle").length;

const LEVELS = [
  { name: "Solid", count: 1, note: "one closed volume", geo: "", color: vizColors.violet },
  { name: "Shell", count: 1, note: "a closed skin, no gaps", geo: "", color: vizColors.blue },
  { name: "Faces", count: MODEL.faces.length, note: "", geo: `Surface: ${planes} planes, ${cylinders} cylinders`, color: vizColors.green },
  { name: "Wires", count: MODEL.wires, note: `${MODEL.faces.length} outlines + ${MODEL.euler.rings} hole rims`, geo: "", color: vizColors.cyan },
  { name: "Edges", count: MODEL.edges.length, note: "", geo: `Curve: ${lines} lines, ${arcs} arcs, ${circles} circles`, color: vizColors.amber },
  { name: "Vertices", count: MODEL.vertices.length, note: "", geo: "Point: x, y, z in mm", color: vizColors.orange },
];

function pointOf(key: string, kind: "face" | "edge" | "vertex"): V3 {
  if (kind === "face") return key === "flangeInner" ? [6, 9, 38] : [30, 20, 6];
  if (kind === "edge") {
    const e = MODEL.edges.find((x) => x.key === key)!;
    return [(e.pts[0][0] + e.pts[1][0]) / 2, (e.pts[0][1] + e.pts[1][1]) / 2, (e.pts[0][2] + e.pts[1][2]) / 2];
  }
  return MODEL.vertices.find((v) => v.key === key)!.p;
}

function TopologyFigure() {
  const face = MODEL.faces.find((f) => f.key === "flangeInner")!;
  const edge = MODEL.edges.find((e) => e.key === "lat4")!;
  const vertex = MODEL.vertices.find((v) => v.key === "f4")!;
  const fa = toScreen(VIEW, pointOf("flangeInner", "face"));
  const ea = toScreen(VIEW, pointOf("lat4", "edge"));
  const va = toScreen(VIEW, pointOf("f4", "vertex"));
  return (
    <div className="overflow-x-auto">
      <SvgCanvas viewBox="0 0 800 360" className="min-w-[640px]" title="B-rep topology of a bracket: one solid, one shell, 11 faces, 15 wires, 27 edges and 18 vertices, each bound to exact geometry">
        <rect width="800" height="360" fill={SURFACE} />
        <g>
          <BracketScene model={MODEL} view={VIEW} highlight={{ faces: true, edges: true, vertices: true, xray: false }} labels={false} />
          {/* callouts */}
          <g fontSize="12" fontFamily="var(--font-sans)">
            <circle cx={fa.x} cy={fa.y} r="3" fill="#ffffff" />
            <line x1={fa.x} y1={fa.y} x2="236" y2="40" stroke={vizColors.muted} />
            <text x="240" y="38" fill={vizColors.text}>
              Face {face.id}
            </text>
            <text x="240" y="53" fill={vizColors.muted} fontSize="11">
              a bounded patch of one plane
            </text>
            <circle cx={ea.x} cy={ea.y} r="3" fill="#ffffff" />
            <line x1={ea.x} y1={ea.y} x2="262" y2="150" stroke={vizColors.muted} />
            <text x="266" y="148" fill={vizColors.text}>
              Edge {edge.id}
            </text>
            <text x="266" y="163" fill={vizColors.muted} fontSize="11">
              a line shared by F4 and F5
            </text>
            <circle cx={va.x} cy={va.y} r="3" fill="#ffffff" />
            <line x1={va.x} y1={va.y} x2="76" y2="312" stroke={vizColors.muted} />
            <text x="20" y="326" fill={vizColors.text}>
              Vertex {vertex.id}
            </text>
            <text x="20" y="341" fill={vizColors.muted} fontSize="11">
              where E11, E12 and E19 meet
            </text>
          </g>
        </g>

        {/* hierarchy */}
        <g fontFamily="var(--font-sans)">
          <text x="440" y="18" fontSize="11" fill={vizColors.muted} letterSpacing="1">
            TOPOLOGY
          </text>
          <text x="618" y="18" fontSize="11" fill={vizColors.muted} letterSpacing="1">
            BOUND GEOMETRY
          </text>
          {LEVELS.map((l, i) => {
            const y = 30 + i * 54;
            return (
              <g key={l.name}>
                <rect x="440" y={y} width="150" height="38" rx="8" fill="#1a2235" stroke={l.color} strokeWidth="1.5" />
                <text x="454" y={y + 17} fontSize="14" fontWeight="700" fill={l.color}>
                  {l.name}
                </text>
                <text x="576" y={y + 17} fontSize="15" fontWeight="700" textAnchor="end" fill={vizColors.text} fontFamily="var(--font-mono)">
                  {l.count}
                </text>
                {l.note && (
                  <text x="454" y={y + 31} fontSize="10.5" fill={vizColors.muted}>
                    {l.note}
                  </text>
                )}
                {l.geo && (
                  <>
                    <line x1="590" y1={y + 19} x2="612" y2={y + 19} stroke={vizColors.muted} strokeDasharray="3 3" />
                    <text x="618" y={y + 23} fontSize="12" fill={vizColors.text}>
                      {l.geo}
                    </text>
                  </>
                )}
                {i < LEVELS.length - 1 && <Arrow x1={515} y1={y + 40} x2={515} y2={y + 52} color={vizColors.muted} width={1.5} head={6} />}
              </g>
            );
          })}
        </g>
      </SvgCanvas>
      <p className="text-xs text-muted sm:hidden">Swipe sideways to see the whole figure.</p>
    </div>
  );
}

const PLATE_CODE = `from build123d import *

length, width, thickness = 80, 40, 6      # mm
hole_d, inset, corner_r = 6.5, 10, 4

plate = Box(length, width, thickness)
plate = fillet(plate.edges().filter_by(Axis.Z), radius=corner_r)   # round the 4 corners
for sx in (-1, 1):
    for sy in (-1, 1):                                              # four clearance holes
        x, y = sx * (length / 2 - inset), sy * (width / 2 - inset)
        plate -= Pos(x, y, 0) * Cylinder(hole_d / 2, thickness * 2)

print(round(plate.volume, 1), len(plate.faces()))   # 18321.2 mm3, 14 faces
export_step(plate, "plate.step")`;

const MOUNT_CODE = `from build123d import *

plate = Box(50, 50, 6)
plate = fillet(plate.edges().filter_by(Axis.Z), radius=4)    # R4 corners first
plate -= Cylinder(22.5 / 2, 12)                              # pilot bore
for x in (-15.5, 15.5):
    for y in (-15.5, 15.5):
        plate -= Pos(x, y, 0) * Cylinder(3.4 / 2, 12)        # M3 clearance holes

print(len(plate.faces()), len(plate.edges()), len(plate.vertices()), round(plate.volume))
export_step(plate, "nema17_mount.step")
print(round(import_step("nema17_mount.step").volume))      # round trip: same volume`;

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Four ways to describe a solid">
        <Prose>
          <p>
            A CAD file is not a picture of a part. It is a description that a machine shop can cut metal from, and the kind of description decides which questions you can ask later: how wide is this hole, is this surface flat, which
            faces meet at this edge? Four representations dominate engineering, and each answers a different set of questions.
          </p>
          <h3>Mesh, B-rep, CSG and implicit models</h3>
          <ul>
            <li>
              <strong>Mesh (STL).</strong> A bag of triangles. A binary STL is an 80-byte header, a 4-byte triangle count and 50 bytes per triangle, with no units, no colour and no concept of a hole. A 20 mm sphere held within 0.01 mm of
              true needs about 5,000 triangles, roughly 250 KB. Meshes are right for rendering, 3D printing and machine-learning data, and wrong when you need exact dimensions.
            </li>
            <li>
              <strong>B-rep (boundary representation).</strong> The solid is described by its skin: faces (patches of planes, cylinders, cones, spheres, tori or NURBS surfaces), edges (lines, circles, B-splines) and vertices
              (points), plus the topology saying which edge bounds which face. The same sphere is one face with a radius of 10 mm. Mainstream mechanical CAD, and the hand-off to a machine shop, is built on B-rep.
            </li>
            <li>
              <strong>CSG (constructive solid geometry).</strong> A tree of primitives (box, cylinder, sphere) combined by union, difference and intersection. It is compact and naturally parametric, and OpenSCAD is CSG-first. The tree
              must still be evaluated into a B-rep or a mesh before anyone can machine or print it.
            </li>
            <li>
              <strong>Implicit or SDF models.</strong> The solid is where a function f(x, y, z) is negative; union and intersection become max and min, and smooth blends and lattices come almost free. nTop builds lattice and
              heat-exchanger design on this idea. Implicit models have no named faces, so there is nothing to dimension or tap a thread into, and they leave the system as meshes.
            </li>
          </ul>
          <p>
            B-rep obeys a counting rule. For a simple closed solid, vertices − edges + faces = 2. Each through-hole cuts extra loops into the faces it pierces, and the general form is V − E + F − R = 2 − 2g, where R counts those extra
            loops and g is the number of through-holes. The bracket below has 11 faces, 27 edges and 18 vertices in OpenCascade&apos;s convention, where a cylinder carries a seam edge: 18 − 27 + 11 − 4 = −2, which is 2 − 2 × 2 holes.
          </p>
        </Prose>

        <Figure caption="B-rep topology of a bracket: a solid is a shell of faces, each face is bounded by wires of edges, each edge ends at vertices, and every face, edge and vertex is bound to exact geometry.">
          <TopologyFigure />
        </Figure>

        <Prose>
          <h3>Kernels: who does the geometry</h3>
          <p>
            A kernel is the library that does the hard geometry: boolean cuts, fillets, offsets and surface intersections. Parasolid (Siemens) sits under SolidWorks, NX, Solid Edge and Onshape. ACIS (Spatial, a Dassault company) is the
            other long-lived commercial kernel, and Autodesk&apos;s ShapeManager in Inventor and Fusion began as a fork of it. CATIA uses CGM and Creo uses Granite. OpenCascade (OCCT) is the open-source kernel behind FreeCAD,
            CadQuery and build123d, and KiCad uses it to import and export STEP. Kernels agree on the ideas and differ in the details: Parasolid resolves 10⁻⁸ m inside a 1 km modelling box, OpenCascade merges points closer than 10⁻⁷
            model units, and a boolean that succeeds in one can fail in another.
          </p>
          <h3>Feature trees and constraint solvers</h3>
          <p>
            Mechanical CAD is history-based. You draw a sketch, and a 2-D constraint solver (D-Cubed in many commercial tools, planegcs in FreeCAD) moves the geometry until every dimension and relation holds. A sketch is fully
            constrained when it has zero degrees of freedom: a rectangle with horizontal and vertical sides is four numbers (corner x and y, width, height), so pinning the corner and dimensioning both sides leaves nothing free. Features then apply in order: extrude,
            hole, fillet, pattern. That ordered list is the feature tree, and every edit makes the kernel replay it from the top. Change a dimension and the part regenerates; change the order and you may get a different part, or none.
          </p>
          <h3>Exchange formats</h3>
          <p>
            STEP (ISO 10303, usually application protocol AP203, AP214 or AP242) carries exact B-rep, assembly structure, colours and units, and is what a shop wants. IGES froze at version 5.3 in 1996 and survives for surfaces and
            curves. STL dates from 1987 and holds triangles only. 3MF (3MF Consortium, 2015) is zipped XML with units, colours and multiple objects, and is the modern format for printing. Send a shop an STL and every hole becomes a
            ring of flat facets that nobody can dimension.
          </p>
          <h3>Why code-CAD suits AI</h3>
          <p>
            Code-CAD writes the feature tree as a program. build123d (Python, on OpenCascade) and CadQuery are the common choices. An 80 × 40 × 6 mm plate with rounded corners and four holes is a dozen lines, and every dimension is a
            named variable:
          </p>
        </Prose>
        <CodeBlock code={PLATE_CODE} lang="python" title="plate.py" />
        <Prose>
          <p>
            Four properties make this a good target for a language model. Text goes in and geometry comes out, so the model works in its native medium. A diff shows exactly what changed, where a binary CAD file shows nothing. The
            script runs headless in a sandbox, so a failure returns a traceback the model can read and fix. And the parameters are explicit, so a checker can inspect them. The cost is blindness: the model cannot see the part unless
            you return measurements, renders or DFM reports, which is what the next two lessons build.
          </p>
          <h3>Topological naming</h3>
          <p>
            The classic failure of feature trees is the topological naming problem. A fillet stores its target as something like “Edge17”, but edge numbers are not stable: change a hole upstream and the kernel may split, merge or
            renumber edges, so the fillet attaches to a different edge or fails. FreeCAD showed this to every user until version 1.0 (November 2024) added element tracking to mitigate it, and commercial kernels keep persistent IDs with
            heuristics. Code-CAD sidesteps most of it by selecting geometry with queries, such as “the vertical edges at the corners”, instead of numbers.
          </p>
        </Prose>
        <Callout kind="info" title="Three different tolerances">
          <p>
            The kernel tolerance (10⁻⁷ for OpenCascade) decides whether two points are the same point. The modelling clearance is yours: a Ø8.0 bolt in a Ø8.5 hole leaves 0.25 mm per side. The manufacturing tolerance is what the shop
            holds: ISO 2768-m allows ±0.2 mm on dimensions from 6 to 30 mm and ±0.3 mm from 30 to 120 mm unless the drawing says otherwise. A STEP file from an AI usually carries geometry but no tolerance intent.
          </p>
        </Callout>
        <Callout kind="tip" title="Rule of thumb">
          <p>
            If the question starts with “how big”, “how far” or “which face touches”, you need a B-rep or code-CAD. If it starts with “how does it look” or “will it print”, a mesh is enough.
          </p>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: explore a B-rep, then break a parametric part">
        <Prose>
          <p>
            Start with the explorer. Switch faces, edges and vertices on and click them, then remove the holes and the fillet one at a time and watch the counts and the Euler-Poincaré line follow. Then use the parametric bracket: drag a slider and the kernel replays the feature tree.
            Push the hole and the fillet until something fails, then flip the feature order and see where the error lands.
          </p>
        </Prose>
        <BRepExplorer />
        <ParametricBracket />
      </Section>

      <Section id="practice" title="In practice: a motor mount in code">
        <Exercise title="Write, predict and check a NEMA 17 mount in build123d">
          <p>
            Build a mounting plate for a NEMA 17 stepper motor: 50 × 50 mm and 6 mm thick, a 22.5 mm centre bore for the motor&apos;s pilot boss, four Ø3.4 mm clearance holes for M3 screws on a 31 mm square pattern, and R4 on the four
            corners.
          </p>
          <ol>
            <li>Write the build123d script, with the dimensions as named values or clear numbers.</li>
            <li>Before you run it, predict the number of faces, edges and vertices and the volume in mm³.</li>
            <li>Export STEP, import it again and confirm the volume survives the round trip.</li>
            <li>Check the design against two rules we use later: hole rim at least one diameter from the edge for fastener holes, and every wall at least 1.5 mm.</li>
          </ol>
          <details className="mt-3 rounded-lg border border-border bg-bg px-4 py-3">
            <summary className="cursor-pointer font-semibold">Answer</summary>
            <div className="mt-3 space-y-3">
              <CodeBlock code={MOUNT_CODE} lang="python" title="nema17_mount.py" />
              <p>
                <strong>Counts.</strong> The box has 6 faces. Filleting the four vertical edges adds 4 cylindrical faces, and five holes (four screws plus the bore) add 5 more: 15 faces. The filleted outline has 8 edges on top, 8 on
                the bottom and 8 vertical tangent lines, 24 in all, and each hole adds a top circle, a bottom circle and a seam: 24 + 15 = 39 edges. Vertices: 16 on the outline plus 2 per hole for the seam ends, 16 + 10 = 26.
                Euler-Poincaré agrees: 26 − 39 + 15 − 10 hole rings = −8, which is 2 − 2 × 5.
              </p>
              <p>
                <strong>Volume.</strong> 15,000 − 82.4 (four R4 corners) − 2,385.7 (bore) − 217.9 (four holes) = 12,314.0 mm³. The re-imported STEP should print the same rounded value, because STEP stores the exact surfaces.
              </p>
              <p>
                <strong>Rules.</strong> The M3 holes sit 9.5 mm from the plate edge, so the rim is 7.8 mm away against 3.4 mm required. The bore is a cut-out, not a fastener hole, so only the 1.5 mm wall applies: it leaves 13.75 mm to
                the plate edge and 8.97 mm to the nearest M3 hole. Fillet first and drill last is the habit to keep: if a hole later grows too big, the error lands on the hole you just edited and says why, instead of on an unrelated fillet.
              </p>
            </div>
          </details>
        </Exercise>
      </Section>
    </>
  );
}
