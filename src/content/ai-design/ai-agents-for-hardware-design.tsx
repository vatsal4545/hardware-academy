"use client";

import { Section, Prose, Callout, Figure, Exercise } from "@/components/lesson";
import { Arrow, SvgCanvas, vizColors } from "@/components/viz/shared";
import { DesignPipeline } from "@/components/viz/ai-design/DesignPipeline";
import { CurveArrow } from "@/components/viz/ai-design/ui";

const NODES = [
  { name: "Requirements", sub: "spec + tests" },
  { name: "Schematics", sub: "P&ID + wiring" },
  { name: "Components", sub: "real parts" },
  { name: "Simulation", sub: "COP, current" },
  { name: "Geometry", sub: "CAD kernel" },
  { name: "DFM / DFA", sub: "compile time" },
  { name: "Assembly", sub: "order, motion" },
];
const NODE_W = 96;
const NODE_H = 56;
const NODE_Y = 112;
const cx = (i: number) => 10 + i * 108 + NODE_W / 2;

function PipelineFigure() {
  const loop = vizColors.amber;
  return (
    <div className="overflow-x-auto">
      <SvgCanvas viewBox="0 0 764 326" className="min-w-[640px]" title="Design pipeline with seven stages and four feedback loops: simulation to components, geometry to schematics, DFM checks to geometry, and assembly order to geometry">
        <g fontFamily="var(--font-sans)">
          {/* feedback loops above the row */}
          <CurveArrow x1={cx(3)} y1={NODE_Y} cx={(cx(3) + cx(2)) / 2} cy={58} x2={cx(2)} y2={NODE_Y - 3} color={loop} width={1.8} dashed />
          <text x={(cx(3) + cx(2)) / 2} y={80} textAnchor="middle" fontSize="11" fill={loop}>
            undersized
          </text>
          <CurveArrow x1={cx(4)} y1={NODE_Y} cx={(cx(4) + cx(1)) / 2} cy={-46} x2={cx(1)} y2={NODE_Y - 3} color={loop} width={1.8} dashed />
          <text x={(cx(4) + cx(1)) / 2} y={22} textAnchor="middle" fontSize="11" fill={loop}>
            netlist does not match the schematic
          </text>

          {/* feedback loops below the row */}
          <CurveArrow x1={cx(5)} y1={NODE_Y + NODE_H} cx={(cx(5) + cx(4)) / 2 + 6} cy={NODE_Y + NODE_H + 46} x2={cx(4) + 10} y2={NODE_Y + NODE_H + 3} color={loop} width={1.8} dashed />
          <text x={(cx(5) + cx(4)) / 2 + 6} y={NODE_Y + NODE_H + 38} textAnchor="middle" fontSize="11" fill={loop}>
            rule violation
          </text>
          <CurveArrow x1={cx(6)} y1={NODE_Y + NODE_H} cx={(cx(6) + cx(4)) / 2} cy={NODE_Y + NODE_H + 150} x2={cx(4) - 10} y2={NODE_Y + NODE_H + 3} color={loop} width={1.8} dashed />
          <text x={(cx(6) + cx(4)) / 2} y={NODE_Y + NODE_H + 90} textAnchor="middle" fontSize="11" fill={loop}>
            no free insertion path
          </text>

          {/* forward flow */}
          {NODES.slice(0, -1).map((_, i) => (
            <Arrow key={i} x1={cx(i) + NODE_W / 2 + 2} y1={NODE_Y + NODE_H / 2} x2={cx(i + 1) - NODE_W / 2 - 3} y2={NODE_Y + NODE_H / 2} color={vizColors.green} width={2} head={7} />
          ))}

          {/* stages */}
          {NODES.map((n, i) => (
            <g key={n.name}>
              <rect x={cx(i) - NODE_W / 2} y={NODE_Y} width={NODE_W} height={NODE_H} rx="9" fill="#1a2235" stroke={i < 4 ? vizColors.violet : vizColors.cyan} strokeWidth="1.6" />
              <text x={cx(i)} y={NODE_Y + 24} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={vizColors.text}>
                {n.name}
              </text>
              <text x={cx(i)} y={NODE_Y + 42} textAnchor="middle" fontSize="10.5" fill={vizColors.muted}>
                {n.sub}
              </text>
            </g>
          ))}

          {/* level brackets */}
          <g stroke={vizColors.muted} strokeWidth="1.2" fill="none">
            <path d={`M${cx(0) - NODE_W / 2} 290 v8 H${cx(3) + NODE_W / 2} v-8`} />
            <path d={`M${cx(4) - NODE_W / 2} 290 v8 H${cx(6) + NODE_W / 2} v-8`} />
          </g>
          <text x={(cx(0) + cx(3)) / 2} y="316" textAnchor="middle" fontSize="11.5" fill={vizColors.violet}>
            SYSTEMS LEVEL: graphs and physics
          </text>
          <text x={(cx(4) + cx(6)) / 2} y="316" textAnchor="middle" fontSize="11.5" fill={vizColors.cyan}>
            GEOMETRY LEVEL: solids and rules
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
      <Section id="theory" title="Systems first, geometry second">
        <Prose>
          <p>
            You may have seen a post where an AI agent produced a manufacturable heat pump: refrigerant piping and wiring first, a simulation, then 3D geometry checked by DFM rules, and finally an animated assembly order. Treat it as
            a pipeline claim to understand and test, not as magic. The structure is sound, and it is the same structure behind PCB design, EV charging site design and your own local 3D agent. What matters is what each stage needs, what a model can and cannot do there, and how you would know the result is good. Ask three questions of any such demo: which checks ran, what would they not catch, and has anyone built and tested the part?
          </p>
          <h3>The pipeline, stage by stage</h3>
          <ol>
            <li>
              <strong>Requirements.</strong> A brief becomes a spec in which every target has a unit, a test condition and a limit: 10 kW of heat at 7 °C outdoor air and 35 °C water, R290 refrigerant, 240 V, inside 1.2 × 0.5 × 1.0
              m.
            </li>
            <li>
              <strong>System schematics.</strong> Two graphs, not drawings: the P&amp;ID of the refrigerant loop (compressor, condenser, expansion valve, evaporator, reversing valve, sensors and safety devices, in ISA-5.1 symbols) and the
              electrical single-line and wiring (supply, breaker, contactor, inverter, fans, controller).
            </li>
            <li>
              <strong>Component selection.</strong> Each duty is matched to a real part whose datasheet envelope covers the operating point: a compressor with 3.1 kW input, a brazed-plate heat exchanger, an electronic expansion
              valve, and wire sized to the current.
            </li>
            <li>
              <strong>End-to-end simulation.</strong> The refrigerant cycle (properties from a library such as CoolProp) and the electrical model run together and give state points, heat output, COP, pressure drops and current.
            </li>
            <li>
              <strong>Geometry through a CAD kernel.</strong> The agent writes code that places each component at the port positions the P&amp;ID demands, routes tubes and wires, builds the frame and exports STEP.
            </li>
            <li>
              <strong>DFM and DFA checkers at “compile time”.</strong> Rule checkers read the geometry and return diagnostics the way a compiler does: tube bend radius at least 2 × OD, wall at least 1.5 mm, hole rim at least one
              diameter from the edge, and a tool path to every screw.
            </li>
            <li>
              <strong>Subassemblies and assembly order.</strong> Parts are grouped (fan module, compressor skid, frame) and sequenced so that each can be inserted along a free path, which is what the assembly animation shows.
            </li>
          </ol>
          <p>
            Failures loop back to the cheapest stage that can fix them: a DFM violation sends diagnostics to the geometry stage, an undersized compressor sends the simulation result back to component selection, and a netlist mismatch
            sends geometry back to the schematics. That is why it is a pipeline with feedback and not one-shot generation.
          </p>
          <p>
            The loops only converge if the feedback is exact. A good diagnostic is a compiler error for geometry: a rule id, the part, the measured value, the limit and a location, for example <code>HOLE_EDGE bracket_fan H3: 4.9 mm, needs 6.5 mm</code>.
            The agent edits one parameter and reruns. Vague feedback such as “too close to the edge” makes the loop wander, while exact numbers make it converge in a few iterations.
          </p>
        </Prose>

        <Figure caption="The design-agent pipeline: seven stages, each with a machine check, and four feedback loops (dashed) that return an error to the stage that can fix it cheaply.">
          <PipelineFigure />
        </Figure>

        <Prose>
          <h3>Why systems first works</h3>
          <p>
            The schematic is a small graph with checkable physics, while the geometry has vastly more degrees of freedom. Fixing the systems level first turns the geometric problem into packing and routing against hard requirements: port
            positions, tube diameters, clearances and an envelope. A wrong line size costs seconds in the simulator and a recall in the field. The same graph also feeds the 3D model and the BOM, so a layout-versus-schematic check can
            compare them automatically, as layout-versus-schematic checks do for chips and boards. PCB design already works this way: schematic, then layout, then DRC.
          </p>
          <h3>What AI does well, and what it does badly</h3>
          <ul>
            <li>
              <strong>Well:</strong> searching catalogs with thousands of parts, boilerplate (BOM tables, wire lists, the fortieth bracket), keeping names, units and IDs consistent across schematic, BOM and 3D, and trying variants
              quickly.
            </li>
            <li>
              <strong>Badly:</strong> tolerances and fits, tacit shop knowledge (which press brake can hold a 1.5 mm flange), physics nobody simulated (compressor vibration, defrost, oil return, acoustics), left and right and mirrored
              geometry, and regulation such as the charge limit for flammable R290. It also invents plausible part numbers and datasheet values, so every number needs a lookup.
            </li>
          </ul>
          <h3>Three layers of verification</h3>
          <p>
            Rule-based checks are cheap, fast and complete for exactly the rules written, and blind to anything not encoded. Simulation covers physics inside its validity domain and is only as good as its inputs. Human review and test
            cover the rest: a prototype, a pressure test, a certification such as UL 60335-2-40 for heat pumps, and a named engineer who signs. An AI-generated design earns trust by passing all three, and each layer catches what
            the others cannot. The practice section turns the layers into a ten-check rubric you can score a design against.
          </p>
          <h3>Neighbours and your own projects</h3>
          <p>
            The same shape exists elsewhere. Zoo (formerly KittyCAD) offers text-to-CAD and a code-first CAD language. Open-source CadQuery and build123d agents write a script, run it and retry on the error. Flux and JITX bring AI and
            code to PCB design, Quilter generates board layouts with physics-driven search, and several vendors sell AI P&amp;ID digitization. Your EV charging site-design engine is the same pipeline in another domain: requirements
            (stalls, kW per stall, utility service) become a single-line diagram and load calculation, parts are selected (transformer, switchboard, conductors, EVSE), simulation checks voltage drop and load management, geometry places
            stalls and trenches, and code checkers (NEC 625, accessibility rules such as CBC 11B) play the role of DFM. Your local 3D agent is the geometry stage with a render-and-look critic instead of a rule-based one.
          </p>
        </Prose>
        <Callout kind="interview" title="How to answer “would you trust an AI-generated design?”">
          <p>Answer in layers: rule checks for what is encoded, simulation for the physics, human review and a prototype for the rest, plus reproducible source so every change is a diff. Then name what each layer cannot see.</p>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: run the pipeline and break it">
        <Prose>
          <p>
            Press Play on the clean run, then inject a defect. Watch which check fails, where the dashed loop sends the error, and which stages run again. The undersized compressor is caught before any geometry exists, which is the whole
            argument for systems first. Finish with the hidden fastener and switch the assembly-access check off.
          </p>
        </Prose>
        <DesignPipeline />
      </Section>

      <Section id="practice" title="In practice: score an AI-generated design">
        <Exercise title="A ten-check rubric for an AI-generated heat pump">
          <p>An agent hands you its design for a 10 kW air-to-water heat pump (R290, 240 V, A7/W35, spec COP at least 4.0). Its report says:</p>
          <ul>
            <li>Spec: 24 requirements, 22 with a test (none for the 55 dB(A) noise limit or the defrost time).</li>
            <li>Schematic: refrigerant loop closed, high-pressure switch and relief valve present, electrical rule check clean.</li>
            <li>Parts: 31 part numbers, 30 found in the supplier catalog. The compressor, SCX-310-R290, is not there.</li>
            <li>Simulation at A7/W35: condenser 10.2 kW, evaporator 7.5 kW, compressor input 2.4 kW.</li>
            <li>Electrical: compressor rated-load current 11.5 A, fan 1.2 A. The agent chose 14 AWG wire and a 15 A breaker.</li>
            <li>Geometry: 22 of 22 refrigerant lines and 31 of 31 wires match the schematic, no interference.</li>
            <li>DFM: every tube bend passes. One bracket hole (Ø6.5 mm) has its rim 4.9 mm from the edge.</li>
            <li>DFA: tool-access sweeps ran for 41 of 43 fasteners. The 2 fan-bracket screws were not swept.</li>
            <li>Provenance: script and parameters are in git with pinned versions. No vibration, defrost or R290 charge-limit analysis. No named reviewer.</li>
          </ul>
          <p>Score each of the ten checks pass, fail or unknown, give the total, say which stage every failure returns to, and decide: release, fix, or reject.</p>
          <ol>
            <li>Traceability: every requirement maps to a test.</li>
            <li>Schematic completeness: loop closed, safety devices present, rule check clean.</li>
            <li>Real parts: every part number resolves and sits inside its datasheet envelope.</li>
            <li>Energy balance: condenser heat equals evaporator heat plus compressor input within 3%.</li>
            <li>Performance: heat and COP meet the spec, and COP is 35 to 55% of the Carnot limit.</li>
            <li>Electrical sizing: wire ampacity at least the minimum circuit ampacity (1.25 × the largest compressor current plus other loads), with a breaker within the nameplate maximum.</li>
            <li>Layout versus schematic: the geometry netlist equals the P&amp;ID and wire list, with no interference.</li>
            <li>DFM: bend radius at least 2 × OD, hole rim at least one diameter from the edge, wall at least 1.5 mm.</li>
            <li>DFA: every fastener has a verified tool path and the assembly order has no cycle.</li>
            <li>Provenance and review: regenerated from versioned source, physics outside the simulation covered, a named human signs.</li>
          </ol>
          <details className="mt-3 rounded-lg border border-border bg-bg px-4 py-3">
            <summary className="cursor-pointer font-semibold">Answer</summary>
            <div className="mt-3 space-y-3">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Verdict</th>
                    <th>Evidence</th>
                    <th>Returns to</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>Fail</td>
                    <td>22 of 24 requirements have tests; noise and defrost have none.</td>
                    <td>Requirements</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Pass</td>
                    <td>Loop closed, safety devices present, rule check clean.</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>Fail</td>
                    <td>SCX-310-R290 does not exist in the catalog. A replacement changes the compressor, so the simulation must run again.</td>
                    <td>Components, then Simulation</td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>Pass</td>
                    <td>7.5 + 2.4 = 9.9 kW against 10.2 kW: 2.9% mismatch, barely inside 3%.</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>5</td>
                    <td>Pass</td>
                    <td>COP = 10.2 / 2.4 = 4.25, above 4.0. Carnot at 7 °C and 35 °C is 308.15 / 28 = 11.0, so 4.25 is 39%, inside the band.</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>6</td>
                    <td>Fail</td>
                    <td>MCA = 1.25 × 11.5 + 1.2 = 15.6 A. 14 AWG with a 15 A breaker is too small; 12 AWG with a 20 A breaker works if the nameplate maximum allows it.</td>
                    <td>Schematics (wire list)</td>
                  </tr>
                  <tr>
                    <td>7</td>
                    <td>Pass</td>
                    <td>22 of 22 lines and 31 of 31 wires match, no interference.</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>8</td>
                    <td>Fail</td>
                    <td>Hole rim is 4.9 mm from the edge; one diameter is 6.5 mm.</td>
                    <td>Geometry</td>
                  </tr>
                  <tr>
                    <td>9</td>
                    <td>Unknown</td>
                    <td>2 of 43 fasteners were never swept. Count it as a fail until they are.</td>
                    <td>DFM / DFA</td>
                  </tr>
                  <tr>
                    <td>10</td>
                    <td>Fail</td>
                    <td>Source is versioned, which is good, but vibration, defrost and the R290 charge limit are not covered and nobody has signed.</td>
                    <td>Human review</td>
                  </tr>
                </tbody>
              </table>
              <p>
                <strong>Score: 4 pass, 5 fail, 1 unknown. Decision: do not release; fix.</strong> Four of the fixes return to cheap stages (tests, wire list, geometry, sweeps). The compressor swap restarts the simulation, and check 10 needs
                a person, not another script. Checks 4 and 5 passed with little room to spare, so record their margins instead of celebrating them.
              </p>
            </div>
          </details>
        </Exercise>
      </Section>
    </>
  );
}
