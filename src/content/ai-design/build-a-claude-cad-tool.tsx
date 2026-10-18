"use client";

import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { Arrow, SvgCanvas, vizColors } from "@/components/viz/shared";
import { McpSequence } from "@/components/viz/ai-design/McpSequence";

const SERVER_CODE = `# /// script
# requires-python = ">=3.10,<3.14"
# dependencies = ["mcp>=2,<3", "build123d>=0.13"]
# ///
"""cad_server.py: an MCP server that gives Claude a CAD kernel (build123d) and a DFM checker."""
import re
from math import pi
from pathlib import Path
from typing import Annotated, Any, Literal

from build123d import Axis, Box, Cylinder, GeomType, Pos, export_step as write_step
from mcp.server.mcpserver import MCPServer             # mcp 2.x; on SDK 1.10 to 1.28 this class was FastMCP in mcp.server.fastmcp
from mcp.server.mcpserver.exceptions import ToolError  # the one exception whose text reaches the model
from pydantic import Field

mcp = MCPServer("cad")
OUT_DIR = Path.home() / "cad-out"  # the only folder this server writes to
MIN_WALL = 1.5       # mm: thinnest wall or ligament we will machine (6061, 3-axis mill)
HOLE_EDGE = 1.0      # fastener holes: rim to part edge, in hole diameters (centre to edge 1.5 d)
FASTENER_MAX = 14.0  # mm: bigger openings are cut-outs and only need MIN_WALL
MIN_FILLET = 0.5     # mm: smaller radii need a cutter we do not stock
Dim = Annotated[float, Field(gt=0, le=500)]  # a size in mm; the limits appear in the tool schema
PARTS: dict = {}     # name -> build123d Part; this dict is the server's memory


def get(name: str):
    if name not in PARTS:
        raise ToolError(f"No part named {name!r}. Existing parts: {sorted(PARTS) or 'none'}")
    return PARTS[name]


def store(name: str, part) -> dict[str, Any]:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", name):
        raise ToolError("name must be 1 to 40 letters, digits, hyphens or underscores")
    PARTS[name] = part
    size = part.bounding_box().size
    return {"name": name, "size_mm": [round(v, 2) for v in (size.X, size.Y, size.Z)],
            "volume_mm3": round(part.volume), "faces": len(part.faces()), "edges": len(part.edges())}


@mcp.tool()
def make_box(name: str, length: Dim, width: Dim, height: Dim) -> dict[str, Any]:
    """Create a block centred on the origin (x=length, y=width, z=height), in mm."""
    return store(name, Box(length, width, height))


@mcp.tool()
def make_plate_with_holes(
    name: str, length: Dim, width: Dim,
    thickness: Annotated[float, Field(ge=MIN_WALL, le=50)],
    hole_diameter: Dim, hole_inset: Dim, bore_diameter: Annotated[float, Field(ge=0, le=500)] = 0.0,
) -> dict[str, Any]:
    """Create a plate centred on the origin with four through-holes, each hole_inset mm from
    its two nearest edges (to the hole centre), plus an optional centre bore. In mm."""
    if not hole_diameter / 2 < hole_inset < min(length, width) / 2:
        raise ToolError("hole_inset must keep the whole hole inside the plate")
    plate = Box(length, width, thickness)
    for sx in (-1, 1):
        for sy in (-1, 1):
            at = Pos(sx * (length / 2 - hole_inset), sy * (width / 2 - hole_inset), 0)
            plate -= at * Cylinder(hole_diameter / 2, thickness * 2)
    if bore_diameter:
        if bore_diameter > min(length, width) - 2 * MIN_WALL:
            raise ToolError("bore_diameter leaves less than the minimum wall at the plate edge")
        plate -= Cylinder(bore_diameter / 2, thickness * 2)
    return store(name, plate)


@mcp.tool()
def fillet_edges(name: str, radius: Dim, which: Literal["corners", "top", "bottom"] = "corners") -> dict[str, Any]:
    """Round edges of a plate: the four vertical "corners", or the outer edge loop of the
    "top" or "bottom" face (not the holes). In mm. Fails if the radius cannot fit."""
    part = get(name)
    box = part.bounding_box()
    if which == "corners":
        edges = [e for e in part.edges().filter_by(Axis.Z)
                 if abs(abs(e.center().X) - box.size.X / 2) < 1e-6
                 and abs(abs(e.center().Y) - box.size.Y / 2) < 1e-6]
        limit = min(box.size.X, box.size.Y) / 2
    else:
        face = part.faces().sort_by(Axis.Z)[-1 if which == "top" else 0]
        edges, limit = face.outer_wire().edges(), box.size.Z
    if not edges:
        raise ToolError(f"No {which} edges found. Was this part already filleted?")
    if radius >= limit:
        raise ToolError(f"radius {radius} mm must be below {limit:.2f} mm for {which} edges")
    try:
        return store(name, part.fillet(radius, edges))
    except ValueError as e:  # the kernel's message is readable ("Failed creating a fillet with radius of 20, try a smaller value...")
        raise ToolError(str(e)) from e


@mcp.tool()
def dfm_check(name: str) -> dict[str, Any]:
    """Check a plate against the shop's CNC rules: minimum wall 1.5 mm, fastener-hole rim at
    least one diameter from the edge, fillet radius at least 0.5 mm. Returns pass, one message
    per violated rule, and the measured values so the design can be corrected."""
    part = get(name)
    top = part.faces().sort_by(Axis.Z)[-1]
    outline, holes = top.outer_wire(), list(top.inner_wires())
    size = part.bounding_box().size
    wall = min(size.X, size.Y, size.Z)  # the smallest bounding-box dimension is the first candidate for thinnest wall
    fasteners = []                     # (rim-to-edge gap, diameter) of each fastener-sized hole
    for i, hole in enumerate(holes):
        gap = hole.distance_to(outline)
        wall = min(wall, gap, *(hole.distance_to(other) for other in holes[i + 1:]))
        if (diameter := hole.bounding_box().size.X) <= FASTENER_MAX:
            fasteners.append((gap, diameter))
    problems = []
    if wall < MIN_WALL:
        problems.append(f"min_wall: thinnest wall is {wall:.2f} mm, needs >= {MIN_WALL} mm")
    tight = [(gap, d) for gap, d in fasteners if gap < HOLE_EDGE * d]
    if tight:
        gap, d = min(tight)
        problems.append(f"hole_to_edge: {len(tight)} hole(s) too close to the edge; worst is {gap:.2f} mm "
                        f"from a {d:.2f} mm hole, needs >= {HOLE_EDGE * d:.2f} mm")
    arcs = [e for e in part.edges().filter_by(GeomType.CIRCLE) if e.length < 2 * pi * e.radius - 1e-6]
    if any(e.radius < MIN_FILLET for e in arcs):
        problems.append(f"fillet: a radius below {MIN_FILLET} mm cannot be cut with our tooling")
    nearest = round(min(gap for gap, _ in fasteners), 2) if fasteners else None
    return {"pass": not problems, "violations": problems,
            "measured": {"min_wall_mm": round(wall, 2), "min_hole_to_edge_mm": nearest, "holes": len(holes)}}


@mcp.tool()
def export_step(name: str) -> dict[str, Any]:
    """Write the part to ~/cad-out/<name>.step. Refuses unless dfm_check passes."""
    part = get(name)
    report = dfm_check(name)
    if not report["pass"]:
        raise ToolError("Refusing to export; dfm_check failed: " + "; ".join(report["violations"]))
    OUT_DIR.mkdir(exist_ok=True)
    path = OUT_DIR / f"{name}.step"
    write_step(part, str(path))
    return {"path": str(path), "checked": True}


if __name__ == "__main__":
    mcp.run()  # stdio transport: Claude Desktop starts this script and talks over stdin/stdout`;

const CONFIG_UV = `{
  "mcpServers": {
    "cad": {
      "command": "/opt/homebrew/bin/uv",
      "args": ["run", "/Users/you/cad-mcp/cad_server.py"]
    }
  }
}`;

const CONFIG_PY = `{
  "mcpServers": {
    "cad": {
      "command": "/Users/you/cad-mcp/.venv/bin/python",
      "args": ["/Users/you/cad-mcp/cad_server.py"]
    }
  }
}`;

const RUN_CMDS = `# one-time: install uv, then find its absolute path for the config file
brew install uv
which uv                                    # for example /opt/homebrew/bin/uv

# try the server without Claude: the MCP Inspector lists tools and lets you call them
npx @modelcontextprotocol/inspector uv run ~/cad-mcp/cad_server.py

# if the server misbehaves inside Claude Desktop, read its log
tail -n 40 ~/Library/Logs/Claude/mcp-server-cad.log`;

const CONVERSATION = `You: Design a mounting plate for a NEMA 17 stepper: 42 x 42 mm, 6 mm aluminium,
     four M3 holes on a 31 mm square, a 22.5 mm pilot bore and nicely rounded
     corners (8 mm). Check it for manufacturability and export STEP.

Claude: I'll build the plate, round the corners, then check it before exporting.
  > make_plate_with_holes(name="mount", length=42, width=42, thickness=6,
                          hole_diameter=3.4, hole_inset=5.5, bore_diameter=22.5)
    {"size_mm": [42.0, 42.0, 6.0], "volume_mm3": 7980, "faces": 11, "edges": 27}
  > fillet_edges(name="mount", radius=8, which="corners")
    {"volume_mm3": 7651, "faces": 15, "edges": 39}
  > dfm_check(name="mount")
    {"pass": false, "violations": ["hole_to_edge: 4 hole(s) too close to the edge;
      worst is 2.76 mm from a 3.40 mm hole, needs >= 3.40 mm"],
     "measured": {"min_wall_mm": 2.76, "min_hole_to_edge_mm": 2.76, "holes": 5}}

Claude: The 8 mm corner radius is larger than the 5.5 mm hole inset, so the rounded
        corner passes closer to the holes than the straight edge. I'll rebuild with 4 mm.
  > make_plate_with_holes(...same arguments...)
  > fillet_edges(name="mount", radius=4, which="corners")
  > dfm_check(name="mount")
    {"pass": true, "violations": [],
     "measured": {"min_wall_mm": 3.8, "min_hole_to_edge_mm": 3.8, "holes": 5}}
  > export_step(name="mount")
    {"path": "/Users/you/cad-out/mount.step", "checked": true}

Claude: Done. mount.step is 42 x 42 x 6 mm with four 3.4 mm holes on a 31 mm square and a
        22.5 mm bore. I reduced the corner radius from 8 mm to 4 mm because at 8 mm the
        holes were only 2.76 mm from the edge, under the 3.4 mm rule.`;

const TEST_CODE = `# test_cad_server.py   run:  uv run --with pytest --with "mcp>=2,<3" --with build123d pytest -q
import pytest
from mcp.server.mcpserver.exceptions import ToolError

import cad_server as cad


def test_good_mount_passes_and_exports(tmp_path, monkeypatch):
    monkeypatch.setattr(cad, "OUT_DIR", tmp_path)
    cad.make_plate_with_holes("t", 50, 50, 6, 3.4, 9.5, 22.5)
    cad.fillet_edges("t", 4)
    assert cad.dfm_check("t")["pass"]
    cad.export_step("t")
    assert (tmp_path / "t.step").exists()


def test_known_bad_design_must_fail():
    cad.make_plate_with_holes("bad", 42, 42, 6, 3.4, 5.5, 22.5)
    cad.fillet_edges("bad", 8)                      # R8 pulls the outline toward the holes
    report = cad.dfm_check("bad")
    assert not report["pass"] and "hole_to_edge" in report["violations"][0]


def test_export_refuses_a_thin_part(tmp_path, monkeypatch):
    monkeypatch.setattr(cad, "OUT_DIR", tmp_path)
    for size in [(40, 40, 1.0), (1.0, 40, 40), (40, 1.0, 40)]:   # a 1 mm wall in z, in x and in y
        cad.make_box("thin", *size)                              # below the 1.5 mm rule
        with pytest.raises(ToolError):
            cad.export_step("thin")
    assert not list(tmp_path.iterdir())`;

const PREVIEW_CODE = `from build123d import export_stl

@mcp.tool()
def preview(name: str) -> dict[str, Any]:
    """Tessellate a part to STL so Blender or a viewer can show it. Returns the path."""
    path = OUT_DIR / f"{name}.stl"
    OUT_DIR.mkdir(exist_ok=True)
    export_stl(get(name), str(path))                 # B-rep to triangles, for looking only
    return {"path": str(path)}`;

function ArchitectureFigure() {
  const box = (x: number, y: number, w: number, h: number, stroke: string) => (
    <rect x={x} y={y} width={w} height={h} rx="12" fill="#151d2f" stroke={stroke} strokeWidth="1.8" />
  );
  const inner = (x: number, y: number, w: number, h: number, title: string, sub?: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="7" fill="#1e293b" stroke="#334155" />
      <text x={x + w / 2} y={y + (sub ? 17 : h / 2 + 4)} textAnchor="middle" fontSize="12" fontWeight="600" fill={vizColors.text}>
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + 32} textAnchor="middle" fontSize="10.5" fill={vizColors.muted}>
          {sub}
        </text>
      )}
    </g>
  );
  return (
    <div className="overflow-x-auto">
      <SvgCanvas viewBox="0 0 764 346" className="min-w-[640px]" title="Architecture: you talk to Claude Desktop, its MCP client talks to cad_server.py over stdio, the server calls the build123d and OpenCascade kernel, and STEP files go to one folder that FreeCAD or a Blender worker can open">
        <g fontFamily="var(--font-sans)">
          <text x="112" y="18" textAnchor="middle" fontSize="12" fill={vizColors.muted}>
            You: “design a motor mount”
          </text>
          <Arrow x1={112} y1={24} x2={112} y2={42} color={vizColors.muted} width={1.5} head={6} />

          {box(12, 46, 200, 164, vizColors.violet)}
          <text x="112" y="68" textAnchor="middle" fontSize="14" fontWeight="700" fill={vizColors.violet}>
            Claude Desktop
          </text>
          {inner(26, 80, 172, 52, "Claude model", "chooses tools and arguments")}
          {inner(26, 144, 172, 52, "MCP client", "you approve each tool call")}

          {box(312, 46, 200, 164, vizColors.cyan)}
          <text x="412" y="68" textAnchor="middle" fontSize="14" fontWeight="700" fill={vizColors.cyan}>
            cad_server.py
          </text>
          {inner(326, 80, 172, 36, "schemas + validation")}
          {inner(326, 124, 172, 36, "5 tools, one PARTS dict")}
          {inner(326, 168, 172, 32, "DFM rules, gate on export")}

          {box(592, 46, 160, 164, vizColors.green)}
          <text x="672" y="68" textAnchor="middle" fontSize="14" fontWeight="700" fill={vizColors.green}>
            build123d
          </text>
          {inner(606, 80, 132, 52, "OpenCascade", "booleans, fillets")}
          {inner(606, 144, 132, 52, "queries + STEP", "distances, writer")}

          {/* client <-> server */}
          <Arrow x1={214} y1={104} x2={310} y2={104} color={vizColors.cyan} width={2} head={8} />
          <text x="262" y="96" textAnchor="middle" fontSize="11" fill={vizColors.cyan}>
            tools/call
          </text>
          <Arrow x1={310} y1={140} x2={214} y2={140} color={vizColors.muted} width={2} head={8} dashed />
          <text x="262" y="158" textAnchor="middle" fontSize="11" fill={vizColors.muted}>
            result
          </text>
          <text x="262" y="182" textAnchor="middle" fontSize="10.5" fill={vizColors.muted}>
            stdio
          </text>
          <text x="262" y="195" textAnchor="middle" fontSize="10.5" fill={vizColors.muted}>
            JSON-RPC 2.0
          </text>

          {/* server <-> kernel */}
          <Arrow x1={514} y1={104} x2={590} y2={104} color={vizColors.violet} width={2} head={8} />
          <text x="552" y="96" textAnchor="middle" fontSize="11" fill={vizColors.violet}>
            Python
          </text>
          <Arrow x1={590} y1={140} x2={514} y2={140} color={vizColors.muted} width={2} head={8} dashed />
          <text x="552" y="158" textAnchor="middle" fontSize="11" fill={vizColors.muted}>
            solids
          </text>

          {/* output folder and viewers */}
          <Arrow x1={412} y1={212} x2={412} y2={250} color={vizColors.amber} width={2} head={8} />
          {box(312, 254, 200, 44, vizColors.amber)}
          <text x="412" y="273" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={vizColors.amber}>
            ~/cad-out/*.step
          </text>
          <text x="412" y="289" textAnchor="middle" fontSize="10.5" fill={vizColors.muted}>
            the only folder it writes to
          </text>
          <Arrow x1={310} y1={276} x2={216} y2={276} color={vizColors.muted} width={1.6} head={7} />
          {box(12, 254, 200, 44, "#4b5563")}
          <text x="112" y="273" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={vizColors.text}>
            FreeCAD
          </text>
          <text x="112" y="289" textAnchor="middle" fontSize="10.5" fill={vizColors.muted}>
            opens STEP, measures it
          </text>
          <Arrow x1={514} y1={276} x2={590} y2={276} color={vizColors.muted} width={1.6} head={7} />
          {box(592, 254, 160, 44, "#4b5563")}
          <text x="672" y="273" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={vizColors.text}>
            Blender worker
          </text>
          <text x="672" y="289" textAnchor="middle" fontSize="10.5" fill={vizColors.muted}>
            STL or glTF, then a render
          </text>

          <text x="412" y="326" textAnchor="middle" fontSize="11.5" fill={vizColors.amber}>
            Limits, validation and DFM live in the server, not in the prompt.
          </text>
        </g>
      </SvgCanvas>
      <p className="text-xs text-muted sm:hidden">Swipe sideways to see the whole figure.</p>
    </div>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="MCP in one page, and how to design tools for a model">
        <Prose>
          <p>
            The Model Context Protocol (MCP) is an open protocol, announced by Anthropic in November 2024, that standardises how an AI application connects to tools and data. Claude Desktop is the host. For every server in its config
            it starts an MCP client, and client and server exchange JSON-RPC 2.0 messages. Two transports matter: stdio, where the host launches the server as a local subprocess and reads and writes newline-delimited JSON on its
            standard input and output, and Streamable HTTP for remote servers. A session opens with an initialize exchange that negotiates versions and capabilities, then the client calls tools/list to discover tools and tools/call
            to run one.
          </p>
          <p>
            A server can offer three kinds of capability: tools (functions the model chooses to call), resources (data the application attaches, such as a file or a part list) and prompts (templates the user picks). For CAD, tools do
            the work. Each tool has a name, a natural-language description and a JSON Schema for its arguments, and the model reads those to decide what to call, so they are part of the prompt. A result comes back as content blocks plus an isError flag. A tool with a declared return type (dict[str, Any] in our server) also gets an output schema and a structuredContent copy of its data, and when a tool raises ToolError the Python SDK turns it into an isError result that carries the message. Since SDK 2.0 any other exception reaches the client only as the bare text <code>Error executing tool</code>, with its details kept in the server log, so a rule the model should read is raised as ToolError.
          </p>
        </Prose>
        <Figure caption="Architecture of the Claude CAD tool: the model never touches the kernel directly. Every call crosses the MCP boundary, where the server validates it, runs it and measures the result.">
          <ArchitectureFigure />
        </Figure>
        <Prose>
          <h3>Design tools so the output is verifiable</h3>
          <p>
            A CAD tool for an LLM is not a thin wrapper around the kernel. Four rules make it a safe interface. First, keep tools small and typed, like make_plate_with_holes(length, width, thickness, ...), so each call is a claim you
            can check. Second, return numbers the model can reason about: size, volume, face count, measured distances. Third, reject impossible input with an error that says what to change, because the error text is the
            model&apos;s next prompt. Fourth, put constraints in the tool, not only in the prompt: a limit in a system prompt competes with the user&apos;s request, and a limit in code does not.
          </p>
          <p>
            Our server has five tools: make_box, make_plate_with_holes, fillet_edges, export_step and dfm_check. The schema carries the limits (thickness at least 1.5 mm, sizes up to 500 mm), so the model sees them before it calls.
            dfm_check enforces three rules: minimum wall 1.5 mm, a fastener-hole rim at least one diameter from the edge, and a fillet radius of at least 0.5 mm. export_step runs the checker itself and refuses to write a failing
            part, so verification cannot be skipped. Edges are selected by rule (the four vertical corner edges), never by an index that could shift.
          </p>
          <h3>Connect it to Claude Desktop</h3>
          <p>
            Claude Desktop reads claude_desktop_config.json (on macOS in ~/Library/Application Support/Claude/, on Windows in %APPDATA%\Claude\) and starts each entry under mcpServers as a subprocess. Use absolute paths, because a GUI app
            does not inherit your shell PATH, and quit and reopen the app after every edit. If the server stays silent, read ~/Library/Logs/Claude/mcp-server-cad.log. One rule is absolute for stdio servers: never print to stdout,
            because stdout carries the protocol. Log to stderr.
          </p>
          <h3>See the result</h3>
          <p>
            A STEP file is only useful once you can look at it. FreeCAD opens STEP directly and can measure faces and edges. For the local 3D agent pattern, add a preview tool that tessellates the part to STL and hands the path to a
            Blender worker, which imports it and returns a render for the vision model to inspect. That closes the loop with eyes as well as numbers. Whichever viewer you use, compare the measured bounding box and volume with what the
            tool reported.
          </p>
          <h3>Extend it</h3>
          <p>
            The same pattern scales. KiCad exposes the pcbnew Python module, the newer IPC API with the kicad-python package (KiCad 9), and kicad-cli, which runs DRC and ERC headlessly. Tools such as place_footprint and run_drc give
            Claude a PCB with verifiable checks, as dfm_check does for a plate. A simulation tool (ngspice for circuits, CalculiX for stress, CoolProp for thermodynamics) returns numbers and a pass or fail against the requirement. The design rule stays the same: every generative tool gets a checking tool beside it. A server can also expose resources and prompts: a resource that serves the shop&apos;s rule sheet (minimum wall, bend radii) lets the model read the rules it is checked against, and a prompt template can start every session with the right design-review steps.
          </p>
          <h3>Sandbox it and test it</h3>
          <p>
            The server runs with your permissions, so treat every model-written argument as untrusted input. Validate names (the export path is built from the part name, so only letters, digits, hyphens and underscores are allowed,
            and one output folder), cap sizes, and do not add a run_python tool unless it runs in a container with a timeout and no network. Your local 3D agent follows the same idea when every mutation writes a new checkpoint instead of overwriting the source: bound what a tool can touch. Keep Claude Desktop&apos;s per-call approval on while you develop. Test at three levels: unit
            tests call the tool functions directly, the MCP Inspector exercises the protocol, and transcript review checks what the model really did. Negative tests matter most: a checker that never fails proves nothing, so keep a
            corpus of known-bad designs that must be rejected.
          </p>
        </Prose>
        <Callout kind="tip" title="Where limits are enforced">
          <p>The schema limits are checked at the protocol layer, when a client calls the tool. A direct Python call in a unit test skips them, which is why dfm_check also measures the geometry itself.</p>
        </Callout>
      </Section>

      <Section id="server" title="The complete server, about 140 lines">
        <Prose>
          <p>
            Save this as <code>~/cad-mcp/cad_server.py</code>. The comment block at the top is inline script metadata, so <code>uv run</code> builds an environment with the right Python and packages by itself. The part kernel is
            build123d in algebra mode. Everything the model can do goes through five functions, and three of them (<code>make_plate_with_holes</code>, <code>dfm_check</code> and <code>export_step</code>) carry the rules.
            The listing was run for this lesson with uv 0.13.1, Python 3.13.7, mcp 2.3.0 and build123d 0.13.0 (macOS, October 2026); every number in the
            transcript and in the answers below comes from that run, driven through the MCP Python client over stdio.
          </p>
        </Prose>
        <CodeBlock code={SERVER_CODE} lang="python" title="cad_server.py" />
        <Prose>
          <ul>
            <li>
              <code>Dim</code> and the <code>thickness</code> annotation put limits in the JSON Schema. The model sees <code>minimum: 1.5</code> before it calls, and the SDK rejects violations before your code runs, as an isError result that quotes pydantic: <code>Input should be greater than or equal to 1.5</code>.
            </li>
            <li>
              <code>fillet_edges</code> selects by geometry (vertical edges at the bounding-box corners) and refuses a radius that cannot fit. When the kernel itself fails (8 mm corners on the 42 mm plate are fine, 20 mm are not) build123d raises a ValueError with a readable message, and the except clause re-raises it as ToolError so the text gets through.
            </li>
            <li>
              <code>dfm_check</code> measures the geometry with exact kernel distances, and its thinnest-wall search starts at the smallest bounding-box dimension, so a block that is only 0.5 mm thick in x, y or z fails. A failed check is a normal return value with the rule, the worst measured value and the limit, so the model can repair the design.
            </li>
            <li>
              <code>export_step</code> calls <code>dfm_check</code> itself and raises on failure. Nothing is written outside <code>~/cad-out</code>, and names are restricted to letters, digits, hyphens and underscores.
            </li>
            <li>
              <code>mcp.run()</code> serves over stdio. There is no <code>print()</code> anywhere: stdout is the protocol.
            </li>
          </ul>
        </Prose>
        <Callout kind="warning" title="build123d moves quickly">
          <p>
            The listing sticks to documented build123d calls (<code>inner_wires</code>, <code>distance_to</code>, <code>filter_by</code>, the <code>fillet</code> method), but the library is young and renames things between releases. Pin
            the version you test with in the script header, and if a name has moved, run the tool in the Inspector and read the traceback. The mcp package moved
            faster still: version 2.0 renamed FastMCP to MCPServer (now in <code>mcp.server.mcpserver</code>) and stopped forwarding the text of plain
            exceptions, which is why the header says <code>mcp&gt;=2,&lt;3</code> and the listing raises ToolError. Output schemas and structuredContent
            arrived in SDK 1.10; on a 1.x install (1.10 to 1.28) the imports are <code>from mcp.server.fastmcp import FastMCP</code> and{" "}
            <code>from mcp.server.fastmcp.exceptions import ToolError</code>.
          </p>
        </Callout>

        <Prose>
          <h3>Connect it to Claude Desktop</h3>
          <p>
            Run the script once in a terminal first, so uv downloads the packages (a first start inside Claude Desktop can time out). Then edit the config (Settings, Developer, Edit Config opens it), use absolute paths, quit Claude Desktop completely and reopen it.
          </p>
        </Prose>
        <CodeBlock code={CONFIG_UV} lang="json" title="claude_desktop_config.json (uv)" />
        <CodeBlock code={CONFIG_PY} lang="json" title='claude_desktop_config.json (venv with pip install "mcp>=2,<3" build123d)' />
        <CodeBlock code={RUN_CMDS} lang="bash" title="try it, then debug it" />

        <Prose>
          <h3>An example conversation</h3>
          <p>This is what the exchange looks like in Claude Desktop, with the tool calls expanded. Note the failure in the middle: it is the most useful part.</p>
        </Prose>
        <CodeBlock code={CONVERSATION} lang="text" title="transcript" />

        <Prose>
          <h3>Look at it, extend it, test it</h3>
          <p>
            A preview tool gives the local Blender pattern a file to import (the STEP stays the source of truth), and a short pytest file keeps the rules honest. The third test matters most: it proves that the checker can say no.
          </p>
        </Prose>
        <CodeBlock code={PREVIEW_CODE} lang="python" title="an extra tool for Blender or a viewer" />
        <CodeBlock code={TEST_CODE} lang="python" title="test_cad_server.py" />
      </Section>

      <Section id="viz" title="Interactive: one design request, step by step">
        <Prose>
          <p>
            Step through the whole conversation as messages. Watch the first tools/list, the three tool calls that look fine, the dfm_check that fails, the model&apos;s repair, and the export that only happens after a pass. Each step shows
            the payload that crosses the wire.
          </p>
        </Prose>
        <McpSequence />
      </Section>

      <Section id="practice" title="In practice: run it yourself">
        <Exercise title="Run the server, design a motor mount, check it, export STEP">
          <ol>
            <li>Install uv, save the listing as <code>~/cad-mcp/cad_server.py</code> and run it once in a terminal. It should wait silently for input, which is what a healthy stdio server does. The first run downloads the OpenCascade bindings, roughly a few hundred MB.</li>
            <li>Open it in the MCP Inspector and list the tools. Read the schema of <code>make_plate_with_holes</code>: where does the 1.5 mm limit appear?</li>
            <li>Call <code>make_plate_with_holes</code> for a 50 × 50 × 6 mm NEMA 17 mount (holes 3.4 mm, inset 9.5, bore 22.5), then <code>fillet_edges</code> with radius 4, <code>dfm_check</code> and <code>export_step</code>. Note the numbers.</li>
            <li>Add the server to Claude Desktop, restart it, and ask for the 42 mm plate with 8 mm corners from the example conversation. Watch for the failure and the retry.</li>
            <li>Open <code>~/cad-out/mount.step</code> in FreeCAD and measure the bore diameter and the hole spacing.</li>
            <li>Break it on purpose: ask for a 0.5 mm plate, then try to export a block that is only 1 mm thick in x (<code>make_box</code> with length 1, width 40, height 40). Which layer stops each?</li>
          </ol>
          <details className="mt-3 rounded-lg border border-border bg-bg px-4 py-3">
            <summary className="cursor-pointer font-semibold">Answer</summary>
            <div className="mt-3 space-y-3">
              <p>
                <strong>Inspector.</strong> Five tools. In the schema of <code>make_plate_with_holes</code>, <code>thickness</code> has <code>minimum: 1.5</code> and <code>maximum: 50</code>, and the other sizes have{" "}
                <code>exclusiveMinimum: 0</code> and <code>maximum: 500</code>.
              </p>
              <p>
                <strong>50 × 50 mount.</strong> About 12,314 mm³ and 15 faces after the R4 corners. <code>dfm_check</code> passes with <code>min_wall_mm: 6.0</code> (the plate thickness is the thinnest section) and{" "}
                <code>min_hole_to_edge_mm: 7.8</code> (9.5 − 1.7), against 3.4 required. The 22.5 mm bore is treated as a cut-out, not a fastener hole, so only the wall rule applies to it.
              </p>
              <p>
                <strong>42 mm plate, R8.</strong> The check fails at 2.76 mm against 3.40 mm, and a good run ends with the model choosing R4 and passing at 3.8 mm. If Claude exports without checking, <code>export_step</code> refuses and
                prints the same violation.
              </p>
              <p>
                <strong>FreeCAD.</strong> The bore measures 22.5 mm and the hole centres are 31.0 mm apart. The STEP carries exact surfaces, so the numbers match the script.
              </p>
              <p>
                <strong>Breaking it.</strong> The 0.5 mm plate is rejected by the schema before any code runs. The 1 mm block is a valid <code>make_box</code> call, because the schema only bounds sizes, but <code>export_step</code> refuses with <code>min_wall: thinnest wall is 1.00 mm</code>: the check starts from the smallest bounding-box dimension, so it does not matter whether the thin direction is x, y or z. That is the point of layers: a schema limit for the obvious cases, a geometric check for everything the schema cannot express, and a gate so the check cannot be skipped.
              </p>
              <p>
                <strong>If it does not connect.</strong> Check for a relative path, a missing absolute path to <code>uv</code>, an app that was closed but not quit, or a stray <code>print()</code> to stdout. The log in{" "}
                <code>~/Library/Logs/Claude/mcp-server-cad.log</code> usually names the problem.
              </p>
            </div>
          </details>
        </Exercise>
      </Section>
    </>
  );
}
