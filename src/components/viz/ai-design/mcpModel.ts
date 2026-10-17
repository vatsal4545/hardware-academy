/**
 * The message script for the McpSequence visualization: a NEMA 17 motor-mount request that hits a DFM failure,
 * is repaired by the model, and exports STEP. Numbers match the tool outputs in the lesson's example conversation.
 */

export interface Lifeline {
  id: "user" | "claude" | "server" | "kernel";
  label: string;
  sub: string;
}

export const LIFELINES: Lifeline[] = [
  { id: "user", label: "You", sub: "chat window" },
  { id: "claude", label: "Claude Desktop", sub: "model + MCP client" },
  { id: "server", label: "cad_server.py", sub: "FastMCP, 5 tools" },
  { id: "kernel", label: "build123d", sub: "OpenCascade kernel" },
];

export type RowKind = "say" | "call" | "result" | "fail" | "pass" | "think" | "kernel" | "list";

export interface Row {
  from: 0 | 1 | 2 | 3;
  to: 0 | 1 | 2 | 3;
  kind: RowKind;
  label: string;
  caption: string;
  payload: string;
}

const PLATE_ARGS = `"name": "mount", "length": 42, "width": 42, "thickness": 6,
        "hole_diameter": 3.4, "hole_inset": 5.5, "bore_diameter": 22.5`;

export const ROWS: Row[] = [
  {
    from: 1,
    to: 2,
    kind: "list",
    label: "tools/list",
    caption: "When Claude Desktop starts the server it first asks which tools exist. This request and every reply is one JSON-RPC 2.0 message over the server's stdin and stdout.",
    payload: `{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}`,
  },
  {
    from: 2,
    to: 1,
    kind: "result",
    label: "5 tools + JSON Schemas",
    caption:
      "The server describes each tool: a name, a description, a JSON Schema for the arguments and, because the functions are annotated -> dict[str, Any], an output schema. The model reads these to decide what to call, so the descriptions and limits are part of the prompt. The message is trimmed here.",
    payload: `{"jsonrpc": "2.0", "id": 1, "result": {"tools": [
  {"name": "make_box", ...},
  {"name": "make_plate_with_holes",
   "description": "Create a plate centred on the origin with four through-holes ...",
   "inputSchema": {"type": "object",
     "properties": {
       "thickness": {"type": "number", "minimum": 1.5, "maximum": 50},
       "length":    {"type": "number", "exclusiveMinimum": 0, "maximum": 500},
       ...},
     "required": ["name", "length", "width", "thickness", "hole_diameter", "hole_inset"]},
   "outputSchema": {"additionalProperties": true, "title": "make_plate_with_holesDictOutput", "type": "object"}},
  {"name": "fillet_edges", ...}, {"name": "dfm_check", ...}, {"name": "export_step", ...}]}}`,
  },
  {
    from: 0,
    to: 1,
    kind: "say",
    label: "Design a NEMA 17 mount…",
    caption: "You ask in plain language. The model decides which tools to call and with which numbers.",
    payload: `Design a mounting plate for a NEMA 17 stepper: 42 x 42 mm, 6 mm aluminium,
four M3 holes on a 31 mm square, a 22.5 mm pilot bore and nicely rounded
corners (8 mm). Check it for manufacturability and export STEP.`,
  },
  {
    from: 1,
    to: 2,
    kind: "call",
    label: "make_plate_with_holes(…)",
    caption: "Claude Desktop asks you to allow the tool call, then sends a tools/call request. The arguments must satisfy the schema, or the server rejects them with a readable error.",
    payload: `{"jsonrpc": "2.0", "id": 2, "method": "tools/call",
 "params": {"name": "make_plate_with_holes",
   "arguments": {${PLATE_ARGS}}}}`,
  },
  {
    from: 2,
    to: 3,
    kind: "kernel",
    label: "Box − holes − bore",
    caption: "The tool is ordinary Python. It builds the plate with boolean cuts in the OpenCascade kernel and returns the solid.",
    payload: `plate = Box(42, 42, 6)
plate -= Pos(sx * 15.5, sy * 15.5, 0) * Cylinder(1.7, 12)   # four M3 holes
plate -= Cylinder(11.25, 12)                                  # 22.5 mm bore`,
  },
  {
    from: 2,
    to: 1,
    kind: "result",
    label: "11 faces, 7980 mm³",
    caption:
      "The result is text the model can reason about: size, volume and entity counts. Six box faces plus five hole walls make 11. FastMCP sends the dict twice: as an indent-2 JSON text block for the model and as structuredContent for programs. The text is shortened here.",
    payload: `{"jsonrpc": "2.0", "id": 2, "result": {
  "content": [{"type": "text",
    "text": "{\\n  \\"name\\": \\"mount\\",\\n  \\"size_mm\\": [\\n    42.0,\\n    42.0,\\n    6.0\\n  ],\\n  \\"volume_mm3\\": 7980, ..."}],
  "structuredContent": {"name": "mount", "size_mm": [42.0, 42.0, 6.0], "volume_mm3": 7980, "faces": 11, "edges": 27},
  "isError": false}}`,
  },
  {
    from: 1,
    to: 2,
    kind: "call",
    label: "fillet_edges(r=8)",
    caption: "Claude rounds the four corners as requested. Edges are chosen by a rule (the vertical corner edges), not by an index that could change.",
    payload: `{"jsonrpc": "2.0", "id": 3, "method": "tools/call",
 "params": {"name": "fillet_edges",
   "arguments": {"name": "mount", "radius": 8, "which": "corners"}}}`,
  },
  {
    from: 2,
    to: 1,
    kind: "result",
    label: "15 faces, 7651 mm³",
    caption: "The kernel built the fillets, so the call succeeded. Nothing so far says the design is bad: every call was valid on its own. Same envelope as before; only the structured result is shown.",
    payload: `{"name": "mount", "size_mm": [42.0, 42.0, 6.0], "volume_mm3": 7651, "faces": 15, "edges": 39}`,
  },
  {
    from: 1,
    to: 2,
    kind: "call",
    label: "dfm_check()",
    caption: "Verification is a tool call, not an afterthought. export_step's description says it refuses unless this check passes, so the model has every reason to run it first.",
    payload: `{"jsonrpc": "2.0", "id": 4, "method": "tools/call",
 "params": {"name": "dfm_check", "arguments": {"name": "mount"}}}`,
  },
  {
    from: 2,
    to: 3,
    kind: "kernel",
    label: "distance(rim, outline)",
    caption: "The checker asks the kernel for exact distances between each hole rim and the part outline. The 8 mm corner arc passes closer to the holes than the straight edge would.",
    payload: `for hole in top.inner_wires():
    gap = hole.distance_to(outline)   # 2.76 mm for each M3 hole
    # rule: fastener-hole rim at least 1 diameter (3.40 mm) from the edge`,
  },
  {
    from: 2,
    to: 1,
    kind: "fail",
    label: "FAIL: 2.76 mm < 3.40 mm",
    caption: "A failed check is a normal result, not an exception. It carries the rule, the worst measured value and the required value, which is exactly what the model needs to fix the design. Only the structured result is shown.",
    payload: `{"pass": false,
 "violations": ["hole_to_edge: 4 hole(s) too close to the edge; worst is 2.76 mm
                 from a 3.40 mm hole, needs >= 3.40 mm"],
 "measured": {"min_wall_mm": 2.76, "min_hole_to_edge_mm": 2.76, "holes": 5}}`,
  },
  {
    from: 1,
    to: 1,
    kind: "think",
    label: "reads FAIL, picks R4",
    caption: "The model turns the diagnostic into a plan. This step happens inside Claude: no message crosses the wire.",
    payload: `The 8 mm corner radius is larger than the 5.5 mm hole inset, so the rounded corner
passes closer to the holes than the straight edge. The rule needs 3.40 mm.
With R4 the nearest edge is the straight side: 5.5 - 1.7 = 3.8 mm. Rebuild the
plate and fillet with 4 mm instead.`,
  },
  {
    from: 1,
    to: 2,
    kind: "call",
    label: "rebuild + fillet_edges(r=4)",
    caption: "The old plate was already filleted, so Claude rebuilds it from scratch (the name is reused) and then fillets with R4. Two requests, ids 5 and 6.",
    payload: `{"jsonrpc": "2.0", "id": 5, "method": "tools/call",
 "params": {"name": "make_plate_with_holes", "arguments": {${PLATE_ARGS}}}}
{"jsonrpc": "2.0", "id": 6, "method": "tools/call",
 "params": {"name": "fillet_edges", "arguments": {"name": "mount", "radius": 4, "which": "corners"}}}`,
  },
  {
    from: 2,
    to: 1,
    kind: "result",
    label: "ok: 15 faces, 7898 mm³",
    caption: "Both calls succeed. The volume rose from 7651 to 7898 mm³ because the smaller corner radius removes less material.",
    payload: `{"name": "mount", "size_mm": [42.0, 42.0, 6.0], "volume_mm3": 7898, "faces": 15, "edges": 39}`,
  },
  {
    from: 1,
    to: 2,
    kind: "call",
    label: "dfm_check()",
    caption: "Same check, new geometry. The loop of build, measure, repair and re-measure is the whole point of giving the model a checker.",
    payload: `{"jsonrpc": "2.0", "id": 7, "method": "tools/call",
 "params": {"name": "dfm_check", "arguments": {"name": "mount"}}}`,
  },
  {
    from: 2,
    to: 1,
    kind: "pass",
    label: "PASS: min wall 3.8 mm",
    caption: "Now the straight edge is the nearest boundary: 5.5 mm centre-to-edge minus the 1.7 mm hole radius is 3.8 mm, above the 3.4 mm limit.",
    payload: `{"pass": true, "violations": [],
 "measured": {"min_wall_mm": 3.8, "min_hole_to_edge_mm": 3.8, "holes": 5}}`,
  },
  {
    from: 1,
    to: 2,
    kind: "call",
    label: "export_step()",
    caption: "Exporting is the last call. The tool runs dfm_check itself, so a model cannot skip verification even if it wants to.",
    payload: `{"jsonrpc": "2.0", "id": 8, "method": "tools/call",
 "params": {"name": "export_step", "arguments": {"name": "mount"}}}`,
  },
  {
    from: 2,
    to: 3,
    kind: "kernel",
    label: "write mount.step",
    caption: "After re-running the checker, the server writes the exact B-rep as STEP into its one allowed output folder.",
    payload: `report = dfm_check(name)            # refuses to continue if report["pass"] is False
write_step(part, "/Users/you/cad-out/mount.step")`,
  },
  {
    from: 2,
    to: 1,
    kind: "result",
    label: "~/cad-out/mount.step",
    caption: "The path comes back as text. Open the file in FreeCAD to measure it, or hand it to a Blender worker for a render.",
    payload: `{"path": "/Users/you/cad-out/mount.step", "checked": true}`,
  },
  {
    from: 1,
    to: 0,
    kind: "say",
    label: "Done: R4 corners, DFM pass",
    caption: "The final answer reports what was built and what was changed. The reduction from R8 to R4 is visible because the failure was a tool result, not a hidden guess.",
    payload: `Done. mount.step is 42 x 42 x 6 mm with four 3.4 mm holes on a 31 mm square and a
22.5 mm bore. I reduced the corner radius from 8 mm to 4 mm: at 8 mm the holes were
only 2.76 mm from the edge, under the 3.4 mm rule. DFM now passes (min wall 3.8 mm).`,
  },
];

export const FAIL_ROW = 10; // index of the FAIL result
export const PASS_ROW = 15; // index of the PASS result that closes the retry loop

export const KIND_LABEL: Record<RowKind, string> = {
  say: "chat message",
  call: "tools/call request",
  result: "tool result",
  fail: "tool result: failed check",
  pass: "tool result: passed check",
  think: "model reasoning",
  kernel: "Python call into the kernel",
  list: "tools/list request",
};
