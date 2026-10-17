"use client";

import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { SchematicToLayout } from "@/components/viz/pcb/SchematicToLayout";
import { PlacementPlan } from "@/components/viz/pcb/SchematicToLayoutShapes";

const DRU = `(version 1)

(rule "Copper to edge, fab minimum 0.3 mm"
  (constraint edge_clearance (min 0.3mm)))

(rule "Smallest drill, fab minimum 0.3 mm"
  (constraint hole_size (min 0.3mm)))

(rule "Hole to hole"
  (constraint hole_to_hole (min 0.5mm)))

(rule "Silkscreen clear of pads"
  (constraint silk_clearance (min 0.15mm)))`;

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="What we are building, and why it is laid out this way">
        <Prose>
          <p>
            This is the lesson where you build the board. The target is the robot&apos;s motor-driver board: 60 × 40 mm, four M3 holes, an
            ESP32-WROOM-32, a TB6612FNG dual H-bridge, a 3.3 V regulator, two motor connectors, an HC-SR04 header, two line-sensor headers and a
            protected battery input. Everything from the last lessons is used here: loops, decoupling, stack-up, DFM, and the bring-up that follows.
          </p>

          <h3>The circuit</h3>
          <table>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Part</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>J1</td>
                <td>JST XH 2-pin</td>
                <td>2S battery input, 6.0 to 8.4 V</td>
              </tr>
              <tr>
                <td>Q1, R1</td>
                <td>AO3401A P-FET, 100 kΩ</td>
                <td>Reverse-polarity protection, drain to the connector</td>
              </tr>
              <tr>
                <td>C1, C2, C3</td>
                <td>100 µF, 10 µF, 100 nF</td>
                <td>VM bulk and ceramics at the TB6612FNG</td>
              </tr>
              <tr>
                <td>U3, C5</td>
                <td>AMS1117-3.3, 22 µF tantalum</td>
                <td>3.3 V regulator and its output capacitor</td>
              </tr>
              <tr>
                <td>U1, C6, C7</td>
                <td>ESP32-WROOM-32, 10 µF, 100 nF</td>
                <td>Module and its 3V3 decoupling</td>
              </tr>
              <tr>
                <td>U2, C4</td>
                <td>TB6612FNG, 100 nF</td>
                <td>Dual H-bridge, 1.2 A average per channel</td>
              </tr>
              <tr>
                <td>J2, J3</td>
                <td>JST PH 6-pin</td>
                <td>Motor and encoder connectors</td>
              </tr>
              <tr>
                <td>J4, J5, J6, J7</td>
                <td>1×4, 1×3, 1×3, 1×4 headers</td>
                <td>HC-SR04, two line sensors, UART for programming</td>
              </tr>
              <tr>
                <td>SW1, SW2, R2, C8</td>
                <td>Tactile switches, 10 kΩ, 1 µF</td>
                <td>BOOT on IO0, EN with its pull-up and delay</td>
              </tr>
              <tr>
                <td>D1, R3</td>
                <td>LED 0603, 1 kΩ</td>
                <td>Status LED on IO13</td>
              </tr>
              <tr>
                <td>H1 to H4</td>
                <td>M3 holes, 3.2 mm</td>
                <td>3.5 mm from each corner</td>
              </tr>
            </tbody>
          </table>

          <h3>The power path</h3>
          <p>
            A 2S Li-ion pack enters J1 and passes Q1. Its drain faces the connector, its source feeds the board and its gate sits at ground through R1.
            With the pack the right way round the FET turns on and drops about 50 mΩ × 3 A = 0.15 V; connect the pack backwards and the gate sees no
            voltage below its source, so the FET stays off and its body diode blocks. The VM rail feeds the TB6612FNG (4.5 to 13.5 V, 1.2 A average and
            3.2 A peak per channel) and the AMS1117-3.3. That regulator burns (8.4 − 3.3) × 0.15 A = 0.77 W at a full pack and 150 mA, about a 46 °C
            rise at 60 °C/W, so its tab gets a copper pour; a buck module is the upgrade for heavy Wi-Fi use.
          </p>

          <h3>Pins and strapping</h3>
          <table>
            <thead>
              <tr>
                <th>Nets</th>
                <th>ESP32 pins</th>
                <th>Goes to</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PWMA, AIN1, AIN2</td>
                <td>IO25, IO26, IO27</td>
                <td>TB6612FNG channel A</td>
              </tr>
              <tr>
                <td>PWMB, BIN1, BIN2, STBY</td>
                <td>IO18, IO19, IO23, IO4</td>
                <td>Channel B and standby</td>
              </tr>
              <tr>
                <td>Encoders A and B, two motors</td>
                <td>IO34, IO35, IO36, IO39</td>
                <td>J2 and J3 (input-only pins)</td>
              </tr>
              <tr>
                <td>LINE_L, LINE_R, TRIG, ECHO</td>
                <td>IO32, IO33, IO16, IO17</td>
                <td>J5, J6 and J4</td>
              </tr>
            </tbody>
          </table>
          <p>
            Keep the strapping pins (IO0, 2, 5, 12, 15) away from anything driven at reset, and remember that IO34 to IO39 are input-only. The line
            sensors sit on ADC1 pins because ADC2 stops working while Wi-Fi runs. The classic HC-SR04 wants 5 V and returns a 5 V ECHO that would
            damage a 3.3 V GPIO. This board only has a 3.3 V rail, so fit an HC-SR04P, which the header can power, or run a classic one from a
            separate 5 V source and divide ECHO with 1 kΩ and 2 kΩ.
          </p>

          <h3>Stack-up and rules</h3>
          <p>
            Order four layers at the fab&apos;s standard 1.6 mm stack-up (JLC04161H-7628 at JLCPCB): L1 parts and signals, L2 solid GND, L3 power pours
            for VM and 3V3, L4 signals and GND. The prepreg between L1 and L2 is 0.21 mm, so every return current runs 0.21 mm below its trace, the
            loop-area win from the integrity lesson. Rules, with margin over the fab&apos;s minimums: 0.2 mm clearance and track, 0.6/0.3 mm vias,
            0.15 mm annular ring, 0.3 mm copper to edge. Net classes: Default 0.2 mm, Power 0.5 mm, Motor 1.5 mm for VBAT, VM and the four motor
            outputs. IPC-2221 gives 1.37 mm for 3 A at a 10 °C rise on 1 oz outer copper, so 1.5 mm is comfortable even with both motors stalled.
          </p>

          <h3>Placement plan</h3>
          <p>
            Think in zones. The motor driver, its bulk capacitor and the motor connectors share the top-left so the motor current loop is short. The
            battery connector, Q1 and the regulator sit at the bottom-left, so power enters beside its biggest user. The ESP32 takes the right side with
            its antenna end at the board edge over a copper keep-out, and the headers line the front edge. Decoupling goes within 3 mm of each power pin
            with its ground via at the pad, the 100 µF bulk capacitor within 5 mm of the VM pins, and the M3 holes get a 6.4 mm keep-out for screw heads
            and washers.
          </p>

          <h3>Heat and copper</h3>
          <p>
            Count the watts before you route. At 1 A per channel the TB6612FNG dissipates about 2 × 1² × 0.5 Ω = 1 W, which on a small SSOP-24 with a
            thermal resistance of roughly 100 °C/W or worse would mean a rise of 100 °C or more. Put the part on a ground pour with a few 0.3 mm thermal vias down to L2 and keep
            the motor currents modest. Q1 dissipates 0.45 W at 3 A and the regulator 0.77 W. None of these is a problem alone; together in one corner of
            a small board they are, which is why the placement spreads them out.
          </p>

          <h3>Ground, returns and the frame</h3>
          <p>
            L2 stays an unbroken ground plane: no slots under the control bus, and the motor return runs from the driver to the battery connector over
            it, not through the logic corner. Treat the enclosure as a constraint from day one. Import the chassis drawing as a reference layer and take
            the outline and hole positions from it, because DRC will happily pass a board that does not fit.
          </p>
        </Prose>

        <Figure caption="Placement plan with zones. The motor current stays in the top-left loop, logic and the antenna sit on the right, and the sensors face forward. Part boxes include their pads.">
          <PlacementPlan />
        </Figure>

        <Callout kind="tip" title="Place first, route second">
          If the ratsnest looks like a hairball, move parts. Routing harder never rescues a bad placement, and a good placement makes most of the routing
          obvious.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: from schematic to layout">
        <Prose>
          <p>
            Drag the slider or press play. Watch the symbols become footprints, the footprints grow a ratsnest, the ratsnest turn into copper one net at a
            time and the board end up poured with ground.
          </p>
        </Prose>
        <SchematicToLayout />
      </Section>

      <Section id="walkthrough" title="The workflow, step by step in KiCad 9">
        <Prose>
          <ol>
            <li>
              <strong>Project.</strong> In the Project Manager choose File, New Project, name it <code>robot-motor-driver</code> and keep Create a new
              folder ticked. Put the folder under git. You get a .kicad_pro, a .kicad_sch and a .kicad_pcb.
            </li>
            <li>
              <strong>Schematic sheet.</strong> Open the Schematic Editor and set File, Page Settings: A4, title, revision A and the date.
            </li>
            <li>
              <strong>Symbols.</strong> Press A and add RF_Module:ESP32-WROOM-32, Regulator_Linear:AMS1117-3.3, Transistor_FET:AO3401A, the TB6612FNG
              (search the symbol chooser for TB6612), Device:R, C, C_Polarized and LED, Switch:SW_Push, Connector_Generic headers and
              Mechanical:MountingHole. Add power symbols with P.
            </li>
            <li>
              <strong>Wires and labels.</strong> Wire the power path (W), label the control nets with L (PWMA, AIN1 and so on), add a PWR_FLAG on VBAT,
              VM and GND, and put no-connect flags (Q) on unused module pins.
            </li>
            <li>
              <strong>Annotate and ERC.</strong> Tools, Annotate Schematic; then Inspect, Electrical Rules Checker. Fix every error and read every
              warning.
            </li>
            <li>
              <strong>Footprints.</strong> Tools, Assign Footprints: 0402 for small passives, 0805 for the 10 µF, SOT-223-3_TabPin2 for the AMS1117,
              SOT-23 for Q1, the 3216 tantalum, SSOP-24 for the TB6612FNG, RF_Module:ESP32-WROOM-32, JST XH and PH connectors and MountingHole_3.2mm_M3.
              Check each against the datasheet. Add an LCSC field with the supplier part numbers.
            </li>
            <li>
              <strong>Update the board.</strong> Open the PCB Editor and press F8, Tools, Update PCB from Schematic. The footprints arrive in a pile.
            </li>
            <li>
              <strong>Board setup.</strong> File, Board Setup: four copper layers; Physical Stackup with 35 µm outer copper, 0.2104 mm prepreg, 15.2 µm
              inner copper and a 1.065 mm core; Constraints from the fab sheet; Net Classes Default, Power and Motor assigned by net name; and the custom
              rules below.
            </li>
            <li>
              <strong>Outline and holes.</strong> Draw a 60 × 40 mm rectangle on Edge.Cuts with 2 mm corner radii, place four MountingHole_3.2mm_M3 at 3.5
              mm from each corner and set Place, Drill/Place File Origin at the bottom-left corner.
            </li>
            <li>
              <strong>Placement.</strong> Grid 0.5 mm. Put connectors on the edges, the module with its antenna at the right edge, U2 beside C1 and the
              decoupling at each pin. Add the antenna keep-out with Place, Rule Area (Keepout: copper, tracks, vias, footprints, all layers). Lock the
              connectors and holes. Check the ratsnest is short.
            </li>
            <li>
              <strong>Routing.</strong> Press X for the interactive router. Route VM and the motor outputs first at 1.5 mm, then 3V3, then the control
              bus at 0.2 mm with 45° bends. Keep signals on L1 and L4 and use 0.6/0.3 mm vias.
            </li>
            <li>
              <strong>Zones.</strong> Draw GND zones with Ctrl+Shift+Z on L2 (solid), L1 and L4 with thermal-relief spokes of 0.3 mm, and power pours on L3.
              Press B to fill all zones and add stitching vias every 5 to 10 mm.
            </li>
            <li>
              <strong>3D check.</strong> View, 3D Viewer (Alt+3): connector orientation, the tall capacitor, module direction.
            </li>
            <li>
              <strong>DRC.</strong> Inspect, Design Rules Checker with Test for parity between PCB and schematic ticked. Zero errors, and read every warning.
            </li>
            <li>
              <strong>Outputs.</strong> File, Fabrication Outputs, Gerbers for F.Cu, In1.Cu, In2.Cu, B.Cu, F.Paste, B.Paste, F.Silkscreen, B.Silkscreen,
              F.Mask, B.Mask and Edge.Cuts, with Use drill/place file origin and Check zone fills before plotting ticked. Then Drill Files (Excellon,
              millimetres), Component Placement (CSV, millimetres, SMD only, drill/place origin) and the BOM. A KiCad 9 jobset can store the whole recipe.
            </li>
            <li>
              <strong>Look at what you made.</strong> Open the Gerbers in a viewer: closed outline, drills inside the pads, layers in the right order.
            </li>
            <li>
              <strong>Order.</strong> At JLCPCB choose four layers, 1.6 mm, 1 oz outer copper, quantity 5. Turn on assembly (top side), upload the BOM and
              the position file with its columns renamed Designator, Mid X, Mid Y, Layer and Rotation. Open the placement preview and fix rotations, read
              the DFM report, then pay.
            </li>
          </ol>
        </Prose>
        <CodeBlock lang="text" title="robot-motor-driver.kicad_dru" code={DRU} />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Build it in KiCad, then submit it to the fab's DFM check">
          <p>
            Do the whole flow yourself with the circuit above, then run this self-review. Do not order until every line is true and the DFM report has
            been read line by line.
          </p>
          <ul>
            <li>ERC has zero errors and every warning is understood; PWR_FLAGs sit on VBAT, VM and GND.</li>
            <li>Every footprint was checked against its datasheet; the polarity marks of C5, D1 and Q1 match the symbols.</li>
            <li>No driver or sensor signal uses a strapping pin; IO34 to IO39 are inputs only.</li>
            <li>The stack-up, design rules and net classes match the fab, and the custom rules file is loaded.</li>
            <li>The antenna keep-out covers every layer and the module sits at the edge.</li>
            <li>The 100 µF capacitor is within 5 mm of the VM pins, and every decoupling capacitor is within 3 mm of its pin with a via at its pad.</li>
            <li>The motor return path is short and over the ground plane, away from the analog inputs.</li>
            <li>No acute copper corners, thermal reliefs on pour pads, silkscreen at least 1 mm tall and clear of pads, with the board name and revision.</li>
            <li>DRC reports zero errors with the schematic parity check on.</li>
            <li>The 3D viewer shows connector orientation and heights that fit the chassis, and any chassis DXF is imported.</li>
            <li>The Gerbers look right in a viewer and the position file origin matches the drill origin.</li>
            <li>The assembler&apos;s placement preview shows pin 1 and polarity correct on every polarised part.</li>
          </ul>
          <p>Finally upload to the fab and submit the board to its DFM check.</p>
          <details className="mt-3 rounded-md border border-border bg-bg/40 p-3">
            <summary className="cursor-pointer font-semibold text-green-300">Worked answer</summary>
            <p className="mt-2">
              A good result is a zip of about 14 files (11 Gerbers, two Excellon drill files and a job file) for a 60 × 40 mm, four-layer, 1.6 mm board,
              with zero DFM errors. Typical messages and your answer to each:
            </p>
            <ul className="mt-2">
              <li>
                Hole below the minimum size: a via or thermal via under 0.3 mm. Enlarge it, or order the tier that allows 0.2 mm.
              </li>
              <li>Silkscreen over a pad: move the text 0.15 mm clear or let the fab clip it, then check the legend is still readable.</li>
              <li>Copper too close to the edge: pull the pour and any trace back to 0.3 mm and refill the zones.</li>
              <li>
                Mask web too narrow: on 0.65 mm pitch pads with 0.4 mm pads, a 0.05 mm expansion leaves 0.15 mm, so a warning means the mask expansion
                is larger than you think.
              </li>
              <li>
                Rotation wrong in the assembly preview: C5&apos;s stripe is on the wrong side. Rotate that part 180° in the preview and note the
                offset for the next order.
              </li>
              <li>Part out of stock: choose an equivalent with the same footprint and update the BOM; if the land pattern differs, change the footprint.</li>
            </ul>
          </details>
        </Exercise>
      </Section>
    </>
  );
}
