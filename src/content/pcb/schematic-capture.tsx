"use client";

import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { SchematicExplorer } from "@/components/viz/pcb/SchematicExplorer";
import { WorkedAnswer } from "@/components/viz/pcb/OhmsLawCircuit.helpers";
import { BatterySymbol, CapacitorSymbol, GroundSymbol, JunctionDot } from "@/components/viz/pcb/SchematicExplorer.symbols";

const WIRE = "#8b95a5";
const BAD = vizColors.red;
const GOOD = vizColors.green;

/** A 20 x 20 px "does not mean anything" crossing marker. */
function Doubt({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9} fill={BAD} />
      <Label x={x} y={y + 0.5} size={12} bold color="#ffffff">?</Label>
    </g>
  );
}

/** Static figure: one regulator-and-MCU circuit drawn badly and drawn well. Two panels that stack on a narrow column. */
function WellAndBadlyDrawnFigure() {
  return (
    <div className="@container">
      <div className="grid gap-4 @2xl:grid-cols-2">
        <SvgCanvas
          viewBox="0 0 390 352"
          className="mx-auto max-w-[420px]"
          title="A battery, regulator, decoupling capacitor and microcontroller drawn badly: ground symbols point up, wires cross without a dot, parts have no designators or values, and a capacitor sits far from its pin"
        >
          <Label x={195} y={16} bold size={13} color={BAD}>Hard to read</Label>
        <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 40 154 V 80 H 110 V 150 H 140" />
          <path d="M 40 166 V 250 H 300 V 215 H 320" />
          <path d="M 175 190 V 250" />
          <path d="M 210 150 H 320" />
          <path d="M 250 66 V 250" />
          <path d="M 290 150 V 114" />
          <path d="M 290 106 V 76" />
        </g>
        <BatterySymbol cx={40} cy={160} showSigns={false} />
        <rect x={140} y={130} width={70} height={60} rx={3} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={175} y={152} size={11} bold>U?</Label>
        <Label x={175} y={170} size={10} color={vizColors.muted}>LDO</Label>
        <rect x={320} y={128} width={50} height={100} rx={3} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={345} y={170} size={11} bold>U?</Label>
        <CapacitorSymbol cx={290} cy={110} vertical size={22} gap={8} />
        <Label x={312} y={110} anchor="start" size={10} mono color={vizColors.muted}>C?</Label>
        {/* ground symbol pointing up, at the top of the page */}
        <g transform="translate(250 66) scale(1 -1)">
          <GroundSymbol x={0} y={0} size={16} stroke={BAD} />
        </g>
        <g transform="translate(290 76) scale(1 -1)">
          <GroundSymbol x={0} y={0} size={16} stroke={BAD} />
        </g>
        <Doubt x={250} y={150} />
        <Doubt x={175} y={250} />
        <Label x={110} y={66} anchor="start" size={10} mono color={BAD}>N$14</Label>
        <Label x={262} y={140} anchor="start" size={10} mono color={BAD}>N$3</Label>
        <Label x={60} y={200} anchor="start" size={10} mono color={BAD}>N$7</Label>

        {[
          "no designators or values on the parts",
          "ground symbols point up and sit at the top",
          "the capacitor is far from the pin it serves",
          "wires cross with no dot: joined or not?",
          "auto-generated net names (N$3, N$7, N$14)",
        ].map((t, i) => (
          <Label key={t} x={20} y={272 + i * 17} anchor="start" size={11} color={BAD}>{`✗  ${t}`}</Label>
        ))}
        </SvgCanvas>

        <SvgCanvas
          viewBox="388 0 392 352"
          className="mx-auto max-w-[420px]"
          title="The same circuit drawn well: supply on top, ground below, flow left to right, designators and values on every part, and the decoupling capacitors beside the pin they serve"
        >
          <Label x={585} y={16} bold size={13} color={GOOD}>Easy to review</Label>
        <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 420 112 H 500" />
          <path d="M 455 112 V 140" />
          <path d="M 455 148 V 162" />
          <path d="M 560 112 H 700" />
          <path d="M 530 132 V 148" />
          <path d="M 590 112 V 140" />
          <path d="M 590 148 V 162" />
          <path d="M 640 112 V 140" />
          <path d="M 640 148 V 162" />
          <path d="M 676 112 V 140" />
          <path d="M 676 148 V 162" />
          <path d="M 733 172 V 186" />
        </g>
        <rect x={396} y={96} width={24} height={52} rx={3} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={408} y={112} size={11} bold>+</Label>
        <Label x={408} y={134} size={11} bold>−</Label>
        <Label x={408} y={84} size={11} bold>J1</Label>
        <rect x={500} y={92} width={60} height={40} rx={3} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={530} y={106} size={11} bold>U2</Label>
        <Label x={530} y={121} size={9} mono color={vizColors.muted}>AMS1117</Label>
        <rect x={700} y={92} width={66} height={80} rx={3} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={738} y={134} size={12} bold>U1</Label>
        <Label x={738} y={149} size={9} mono color={vizColors.muted}>ESP32</Label>
        <Label x={706} y={112} anchor="start" size={9} mono>3V3</Label>
        <Label x={733} y={162} size={9} mono>GND</Label>
        <CapacitorSymbol cx={455} cy={144} vertical size={22} gap={8} />
        <CapacitorSymbol cx={590} cy={144} vertical size={22} gap={8} />
        <CapacitorSymbol cx={640} cy={144} vertical size={22} gap={8} />
        <CapacitorSymbol cx={676} cy={144} vertical size={22} gap={8} />
        <JunctionDot x={455} y={112} />
        <JunctionDot x={590} y={112} />
        <JunctionDot x={640} y={112} />
        <JunctionDot x={676} y={112} />
        <GroundSymbol x={455} y={162} size={16} />
        <GroundSymbol x={530} y={148} size={16} />
        <GroundSymbol x={590} y={162} size={16} />
        <GroundSymbol x={640} y={162} size={16} />
        <GroundSymbol x={676} y={162} size={16} />
        <GroundSymbol x={733} y={186} size={16} />
        <Label x={455} y={96} size={10} mono bold color={vizColors.red}>VBAT</Label>
        <Label x={630} y={96} size={10} mono bold color={vizColors.orange}>+3V3</Label>
        {(
          [
            [455, "C1", "10 µF"],
            [590, "C2", "22 µF"],
            [640, "C3", "10 µF"],
            [676, "C4", "100 nF"],
          ] as const
        ).map(([x, ref, val]) => (
          <g key={ref}>
            <Label x={x} y={x === 640 ? 198 : 202} size={10} bold>{ref}</Label>
            <Label x={x} y={x === 640 ? 210 : 214} size={9} mono color={vizColors.muted}>{val}</Label>
          </g>
        ))}

        {[
          "designators, values and part numbers",
          "supply up, ground down, flow left to right",
          "decoupling drawn beside the pin it serves",
          "junction dots only where wires really join",
          "named nets: VBAT and +3V3",
        ].map((t, i) => (
          <Label key={t} x={410} y={272 + i * 17} anchor="start" size={11} color={GOOD}>{`✓  ${t}`}</Label>
        ))}
        </SvgCanvas>
      </div>
    </div>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="A schematic is a document people have to read">
        <Prose>
          <h3>Symbols, designators and nets</h3>
          <p>
            A schematic is a drawing of connections, not of geometry: symbols stand for parts, wires and labels define{" "}
            <strong>nets</strong>, and everything else is annotation. Each part gets a <strong>reference designator</strong>: R resistor, C
            capacitor, L inductor, D diode or LED, Q transistor, U integrated circuit, J connector, Y crystal, SW switch, F fuse, TP test
            point. The designator appears on the schematic, in the BOM and on the board silkscreen, so a technician with a multimeter can find
            C14 without asking anyone. A net is every pin and wire that is electrically one node. A <strong>net label</strong> names it so it
            can cross the page without a drawn wire, and two labels with the same name are one net. The danger is a typo: STBY and STNDBY are
            two nets with one pin each, and nothing looks wrong.
          </p>
          <p>
            <strong>Power symbols</strong> such as +3V3 and GND join every symbol of the same name, so supplies need no wires, and a PWR_FLAG
            tells the checker that a net is driven from off-board. Local labels join nets within a sheet, global labels join them across all
            sheets, and hierarchical labels tie a net to a pin on the sheet symbol in the parent page. Split any design bigger than one screen
            into <strong>hierarchical sheets</strong> such as power, MCU, motor driver and sensors, so a reviewer can read one page in a minute.
          </p>

          <h3>Conventions that make a page readable</h3>
          <ul>
            <li>Signal flow runs left to right: inputs on the left, outputs on the right.</li>
            <li>Positive supplies sit at the top and grounds at the bottom, and no ground symbol ever points up.</li>
            <li>Draw each decoupling capacitor right next to the IC pin it serves, because the layout will copy that grouping.</li>
            <li>Put critical specs in the value field (100 nF X7R 16 V), not in a note, and name nets for what they do (MOTA_PWM, +3V3).</li>
            <li>Use junction dots only where wires join, avoid crossing wires, and use a label instead.</li>
          </ul>
        </Prose>

        <Figure caption="The same battery, regulator and microcontroller supply drawn badly (first panel) and well (second panel). Only the second drawing can be reviewed in a minute.">
          <WellAndBadlyDrawnFigure />
        </Figure>

        <Prose>
          <h3>Net classes and datasheet reference designs</h3>
          <p>
            A <strong>net class</strong> groups nets that share layout rules: Power at 0.5 mm, Motor at 1.5 mm, Signal at 0.2 mm. Assign
            the classes in the schematic and the router and design-rule check apply the right widths without per-net fiddling. Every IC
            datasheet has a typical application circuit. Copy it, then read the footnotes, because that is where it says the AMS1117 wants a
            22 µF tantalum output capacitor or that the ESP32&apos;s EN pin wants a 10 kΩ pull-up with a 1 µF capacitor. Write down every
            deviation and why.
          </p>

          <h3>Unused and special pins</h3>
          <p>
            Every pin needs a defined state in every phase of operation. Unused outputs can stay open, unused inputs get tied, open-drain
            buses need pull-ups, and strapping pins need the right level at boot: an ESP32 with IO0 low at reset enters its bootloader. An
            enable pin left floating passes the bench test and fails in the field.
          </p>

          <h3>ERC: what it catches and what it cannot</h3>
          <p>
            The <strong>electrical rules check</strong> compares connectivity against a pin-type matrix of inputs, outputs, bidirectional,
            power inputs, power outputs, passive and open-collector pins. It flags unconnected pins, power inputs that no power output drives,
            two outputs on one net, duplicate designators, labels that join only one pin, and sheet-pin mismatches. A{" "}
            <strong>no-connect flag</strong> marks a pin as intentionally open, but only after you have read the datasheet, because an input
            marked no-connect is a floating input. ERC cannot know your intent: a missing pull-up, a 100 kΩ where you meant 10 kΩ, a connector
            pinout mirrored left to right and a regulator that cannot supply the load all pass cleanly. Treat every message as a defect until
            it is fixed or waived with a written reason.
          </p>

          <h3>BOM thinking</h3>
          <p>
            A bill of materials lists every part with designators, quantity, value, footprint, manufacturer, <strong>manufacturer part
            number (MPN)</strong> and supplier number. A value like 100 nF is not enough, because dielectric, voltage rating, tolerance and
            package all decide whether the part works, so the MPN is the ground truth: for example Murata GRM155R71C104KA88D is 100 nF, 16 V,
            X7R, 0402. Group identical parts, mark the ones not to be populated, list approved alternates that share the footprint, and check
            stock and lifecycle before release. A missing alternate has turned into a multi-month delay on more than one product.
          </p>

          <h3>Version control</h3>
          <p>
            KiCad stores schematics and boards as text, so Git works. Commit each logical change with a message that says why, tag releases
            such as rev-A together with the exact Gerbers, and keep generated files and backups out of the repository. A schematic you cannot
            diff is a schematic you cannot review.
          </p>
        </Prose>

        <Callout kind="tip" title="A pre-layout review checklist">
          <ul>
            <li>Power budget for every rail, and dropout and heat for every regulator.</li>
            <li>Every IC checked pin by pin against its datasheet, including strap and boot pins.</li>
            <li>A defined state for every input in every phase: reset, boot, run.</li>
            <li>Connector pinouts checked from the mating side, and footprints checked against the land pattern.</li>
            <li>An ERC log with no unexplained messages.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: audit the robot's motor-driver schematic">
        <Callout kind="info" title="Try this">
          <ul>
            <li>Click the GND net, then look at the TB6612FNG: the GND and PGND1 pins light up but PGND2 does not.</li>
            <li>Click the EN net. It has the reset button and a capacitor, and no connection to 3V3.</li>
            <li>Look at the net buttons: there are control nets for PWMA to PWMB but none for STBY.</li>
            <li>Only then switch on ERC mode to compare your findings with the checker&apos;s.</li>
          </ul>
        </Callout>
        <SchematicExplorer />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Find the three ERC errors, then write the BOM">
          <p>
            Open the schematic above and, without switching on ERC mode, find three mistakes: two a rules check would report and one it
            would not. State the fix for each. Then write the bill of materials for the corrected board with designators, quantity, value,
            footprint and an MPN or a note saying what must be chosen.
          </p>
          <WorkedAnswer>
            <CodeBlock
              lang="text"
              code={[
                "1  U3 STBY has no wire          ERC: pin not connected",
                "   fix: IO14 to STBY with R2 = 100 kΩ pull-down (driver off until firmware enables it)",
                "2  U1 EN has no pull-up         ERC cannot see it: the net has a switch and a capacitor",
                "   fix: add R1 = 10 kΩ from EN to 3V3 (with C6 = 1 µF it gives the power-up delay)",
                "3  U3 PGND2 is not wired        ERC: pin not connected",
                "   fix: tie PGND2 to GND with the other ground pins, short and wide",
              ].join("\n")}
            />
            <CodeBlock
              lang="text"
              code={[
                "Ref      Qty  Value                         Footprint        MPN or note",
                "J1       1    battery in, 2 pin             JST-XH, 2.5 mm   B2B-XH-A",
                "J2, J3   2    motor out, 2 pin              JST-PH, 2.0 mm   B2B-PH-K-S",
                "U1       1    ESP32 module, 4 MB flash      module           ESP32-WROOM-32E-N4",
                "U2       1    LDO 3.3 V, 800 mA             SOT-223          AMS1117-3.3",
                "U3       1    dual H-bridge, 1.2 A/channel  SSOP-24          TB6612FNG",
                "C1       1    10 µF, 16 V, X7R              1206             choose and record",
                "C2       1    22 µF, tantalum or polymer    case B           choose and record",
                "C3       1    10 µF, 10 V, X7R              0805             choose and record",
                "C4, C7   2    100 nF, 16 V, X7R             0402             GRM155R71C104KA88D",
                "C5       1    100 µF, 16 V, polymer         6.3 mm SMD       choose and record",
                "C6       1    1 µF, 16 V, X7R               0603             GRM188R71C105KA12D",
                "C8       1    100 nF, 25 V, X7R             0603             choose and record",
                "R1       1    10 kΩ, 1%                     0402             choose and record",
                "R2       1    100 kΩ, 1%                    0402             choose and record",
                "SW1      1    tactile switch, 3.5 x 6 mm    SMD              choose and record",
              ].join("\n")}
            />
            <p>
              Every line needs an MPN before release; the passives are left for you to choose from your vendor&apos;s catalogue, and the
              choice must respect the value field (dielectric, voltage rating, package). For alternates, only list parts that share the
              footprint: a SOT-23-5 LDO such as the AP2112K-3.3 is a redesign, not an alternate, for the SOT-223 AMS1117.
            </p>
          </WorkedAnswer>
        </Exercise>
      </Section>
    </>
  );
}
