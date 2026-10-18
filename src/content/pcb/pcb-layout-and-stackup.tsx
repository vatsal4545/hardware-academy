"use client";

import Link from "next/link";
import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { PcbStackupExploded } from "@/components/viz/pcb/PcbStackupExploded";
import { TraceWidthCalculator } from "@/components/viz/pcb/TraceWidthCalculator";
import { WorkedAnswer } from "@/components/viz/pcb/OhmsLawCircuit.helpers";

const COPPER = "#d98c3f";
const PREPREG = "#bfb874";
const CORE = "#b6a368";
const MASK = "#1f7a4d";

interface Band {
  name: string;
  dim: string;
  y: number;
  h: number;
}

const BANDS: Band[] = [
  { name: "Solder mask", dim: "20 µm", y: 40, h: 6 },
  { name: "L1 · SIG (top)", dim: "35 µm (1 oz)", y: 46, h: 10 },
  { name: "Prepreg 7628", dim: "0.21 mm", y: 56, h: 36 },
  { name: "L2 · GND", dim: "17.5 µm (0.5 oz)", y: 92, h: 8 },
  { name: "Core FR-4", dim: "1.065 mm", y: 100, h: 110 },
  { name: "L3 · PWR", dim: "17.5 µm (0.5 oz)", y: 210, h: 8 },
  { name: "Prepreg 7628", dim: "0.21 mm", y: 218, h: 36 },
  { name: "L4 · SIG (bottom)", dim: "35 µm (1 oz)", y: 254, h: 10 },
  { name: "Solder mask", dim: "20 µm", y: 264, h: 6 },
];

/** Static figure: the common 4-layer 1.6 mm stack-up with dimensions, vias and the 50 ohm microstrip. */
function FourLayerStackFigure() {
  const X = 190;
  const W = 270;
  return (
    <SvgCanvas
      viewBox="0 0 560 340"
      className="mx-auto max-w-[620px]"
      title="Cross-section of a four-layer 1.6 millimetre board: solder mask, 35 micron top copper, 0.21 millimetre prepreg, 17.5 micron ground plane, 1.065 millimetre core, 17.5 micron power plane, 0.21 millimetre prepreg, 35 micron bottom copper and solder mask, with a through via, a blind via and a 50 ohm microstrip trace"
    >
      <Label x={X + W / 2} y={22} size={12} bold color={vizColors.amber}>50 Ω microstrip: 0.35 mm trace over 0.21 mm of prepreg</Label>

      {/* dielectrics and planes */}
      <rect x={X} y={56} width={W} height={36} fill={PREPREG} />
      <rect x={X} y={100} width={W} height={110} fill={CORE} />
      <rect x={X} y={218} width={W} height={36} fill={PREPREG} />
      <rect x={X} y={92} width={W} height={8} fill={COPPER} />
      <rect x={X} y={210} width={W} height={8} fill={COPPER} />
      {/* signal layers carry traces only */}
      {[
        [196, 22],
        [352, 30],
        [432, 22],
      ].map(([x, w]) => (
        <rect key={`t${x}`} x={x} y={46} width={w} height={10} fill={COPPER} />
      ))}
      {[
        [204, 60],
        [290, 50],
        [350, 36],
        [432, 22],
      ].map(([x, w]) => (
        <rect key={`b${x}`} x={x} y={254} width={w} height={10} fill={COPPER} />
      ))}
      <rect x={X} y={40} width={W} height={6} fill={MASK} opacity={0.9} />
      <rect x={X} y={264} width={W} height={6} fill={MASK} opacity={0.9} />
      <rect x={X} y={40} width={W} height={230} fill="none" stroke={vizColors.muted} strokeWidth={1} />

      {/* the 50 ohm trace and its return current */}
      <rect x={292} y={46} width={52} height={10} fill={COPPER} stroke={vizColors.violet} strokeWidth={2} />
      <Arrow x1={306} y1={58} x2={306} y2={90} color={vizColors.violet} width={1.5} head={6} />
      <Arrow x1={318} y1={58} x2={318} y2={90} color={vizColors.violet} width={1.5} head={6} />
      <Arrow x1={330} y1={58} x2={330} y2={90} color={vizColors.violet} width={1.5} head={6} />
      <line x1={318} y1={100} x2={318} y2={120} stroke="#241b0a" strokeWidth={1.5} />
      <Label x={318} y={132} size={11} bold color="#241b0a">return current flows in L2,</Label>
      <Label x={318} y={147} size={11} bold color="#241b0a">directly under the trace</Label>

      {/* through via: clearance holes in both planes, barrel, pads */}
      <rect x={394} y={92} width={32} height={8} fill={vizColors.bg} />
      <rect x={394} y={210} width={32} height={8} fill={vizColors.bg} />
      <rect x={404} y={46} width={4} height={218} fill={COPPER} />
      <rect x={412} y={46} width={4} height={218} fill={COPPER} />
      <rect x={396} y={46} width={28} height={10} fill={COPPER} />
      <rect x={396} y={254} width={28} height={10} fill={COPPER} />
      <Label x={410} y={288} size={11} bold>through via</Label>
      <Label x={410} y={304} size={10} mono color={vizColors.muted}>0.3 mm drill, 0.6 mm pad</Label>

      {/* blind via L1 to L2 */}
      <rect x={234} y={46} width={4} height={54} fill="#fde68a" />
      <rect x={242} y={46} width={4} height={54} fill="#fde68a" />
      <rect x={226} y={46} width={28} height={10} fill="#fde68a" />
      <Label x={240} y={288} size={11} bold color="#fde68a">blind via</Label>
      <Label x={240} y={304} size={10} mono color={vizColors.muted}>L1 to L2 only</Label>

      {/* labels and dimensions */}
      {BANDS.map((b, i) => {
        const slot = 38 + i * 32;
        const mid = b.y + b.h / 2;
        return (
          <g key={`${b.name}-${i}`}>
            <line x1={180} y1={slot} x2={X - 2} y2={mid} stroke={vizColors.grid} strokeWidth={1} />
            <Label x={176} y={slot - 7} anchor="end" size={12}>{b.name}</Label>
            <Label x={176} y={slot + 8} anchor="end" size={11} mono color={vizColors.muted}>{b.dim}</Label>
          </g>
        );
      })}
      <Arrow x1={500} y1={155} x2={500} y2={40} color={vizColors.text} width={1.5} head={7} />
      <Arrow x1={500} y1={155} x2={500} y2={270} color={vizColors.text} width={1.5} head={7} />
      <Label x={512} y={150} anchor="start" size={12} bold>1.6 mm</Label>
      <Label x={512} y={167} anchor="start" size={10} color={vizColors.muted}>63 mil</Label>
      <Label x={X + W / 2} y={330} size={10} color={vizColors.muted}>Not to scale: copper is drawn about 20 times too thick.</Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From a stack of layers to a board you can route">
        <Prose>
          <h3>What a board is made of</h3>
          <p>
            A printed circuit board is a sandwich of copper and glass-reinforced epoxy. <strong>FR-4</strong> is woven glass in flame-retardant
            epoxy, with a dielectric constant near 4.3 and a glass-transition temperature of 135 to 170 °C, and the standard finished thickness
            is 1.6 mm (63 mil). A <strong>core</strong> is fully cured FR-4 with copper foil on both faces. <strong>Prepreg</strong> is partly
            cured glass-epoxy sheet that melts in the press at about 180 °C and bonds the cores and outer foils together; common types are
            1080 (about 0.07 mm), 2116 (0.12 mm) and 7628 (about 0.2 mm). Copper weight is quoted in ounces per square foot: 1 oz is 35 µm
            (1.37 mil), 0.5 oz is 17.5 µm and 2 oz is 70 µm, and finished outer layers are usually 1 oz with inner layers at 0.5 oz. On top
            sit the <strong>solder mask</strong>, about 20 µm of epoxy, green by default and opened over the pads, and the{" "}
            <strong>silkscreen</strong> legend, which must stay off the pads. The exposed copper gets a <strong>surface finish</strong>: HASL
            is cheap but domed, while ENIG, 3 to 6 µm of nickel under a thin gold flash, is flat and suits fine pitch and BGAs.
          </p>

          <h3>Two layers or four</h3>
          <p>
            A 2-layer board is two 35 µm copper layers on one 1.5 mm core: cheap, and fine for simple, slow circuits. Its weakness is the
            return path, because a top-layer signal is 1.5 mm from the nearest plane and its return current must find its own way home. A
            4-layer board adds two inner layers. The classic order is signal, ground, power, signal (SIG/GND/PWR/SIG), with a thin prepreg of
            about 0.2 mm between the top layer and a solid ground plane. Return currents then flow directly under their signals, loop areas
            shrink, EMI and crosstalk fall, and a 0.35 mm top-layer trace over 0.21 mm of prepreg is a 50 Ω transmission line; the same
            trace on a 2-layer board would have to be about 3 mm wide. Use 2 layers for simple boards, and move to 4 once you have fast edges,
            USB or a noisy motor driver beside analog. Keep the stack symmetric about the core so the board does not bow in reflow.
          </p>

          <h3>Vias</h3>
          <p>
            A <strong>through via</strong> is a plated hole through every layer; the usual minimum is a 0.3 mm drill with a 0.6 mm pad, and it
            adds about 1 nH of inductance. A <strong>blind via</strong> joins an outer layer to an inner one, a <strong>buried via</strong>{" "}
            joins inner layers only, and a <strong>microvia</strong> is laser-drilled, about 0.1 mm, across one dielectric layer. These need
            sequential lamination and cost far more, so stay with through vias until density forces a change. A single via carries on the
            order of 1 A, so use several in parallel for power, and put a via beside a decoupling capacitor&apos;s pad instead of at the end
            of a long stub.
          </p>
        </Prose>

        <Figure caption="A common 4-layer, 1.6 mm stack-up with its dimensions, a through via with clearance holes in both planes, a blind via, and the 50 Ω microstrip that the thin top prepreg makes possible.">
          <FourLayerStackFigure />
        </Figure>

        <Prose>
          <h3>Footprints and placement first</h3>
          <p>
            A <strong>footprint</strong> is the copper pads, the mask openings and the courtyard for a part, and an IPC-7351 land pattern
            sizes the pads from the part&apos;s tolerances. Always compare it with the datasheet&apos;s recommended pattern, and print the
            board 1:1 and lay a real part on the paper. Placement decides how good the board can be, because routing only connects what
            placement left. Fix the outline, the mounting holes (an M3 screw needs a 3.2 mm hole and about 6 mm of keep-out for its head),
            connectors and keep-outs first, such as the antenna area of an ESP32 module, which must stay free of copper. Then place the parts
            that carry current or make noise, put decoupling capacitors at their pins, keep analog parts and sensors away from switching
            nodes, and align parts in a few orientations to help assembly.
          </p>

          <h3>Routing, widths and design rules</h3>
          <p>
            Route power and ground first, then the critical signals, then the rest. Trace width follows <strong>IPC-2221</strong>: the copper
            area is <code>(I / (k · ΔT<sup>0.44</sup>))<sup>1/0.725</sup></code> mil², with k = 0.048 for outer and 0.024 for inner layers, and
            the width is that area divided by 1.378 mil per ounce of copper. At a 10 °C rise in 1 oz outer copper this gives 12 mil for 1 A,
            31 mil for 2 A and 54 mil for 3 A; an inner layer needs about 2.6 times as much and 2 oz copper halves the width. Set the fab&apos;s
            limits as <strong>design rules</strong> before you route: 6/6 mil (0.15 mm) trace and space, a 0.3 mm drill, a 0.15 mm annular ring
            and 0.3 mm from copper to the board edge. <strong>Clearance</strong> (the air gap) and <strong>creepage</strong> (the path along
            the surface) grow with voltage: IPC-2221B Table 6-1 (column B2, uncoated external conductors) allows 0.1 mm up to 30 V and 0.6 mm from 31 to 150 V, and mains
            boards need millimetres.
          </p>

          <h3>Thermal relief, outline and panels</h3>
          <p>
            Connect a pad to a pour through <strong>thermal relief</strong> spokes so soldering heat stays at the joint, which prevents cold
            joints and tombstoning, but connect high-current pads solidly. Stitching vias tie ground pours together, and thermal vias sit
            under an exposed pad. Draw the board outline on its own layer with rounded corners. For production the fab arranges boards in a{" "}
            <strong>panel</strong>, joined by V-score lines or by tabs with perforated mouse bites, and a 5 mm rail carries fiducials and
            tooling holes for the pick-and-place machine; keep copper and parts at least 0.5 mm from a V-score line.
          </p>
        </Prose>
      </Section>

      <Section id="viz" title="Interactive: explode the stack-up">
        <Callout kind="info" title="Try this">
          <ul>
            <li>Drag the explode slider to 100% and follow the dashed via barrels. The pale blind via stops at L2; the orange through via goes right through.</li>
            <li>Hover L2: it is an unbroken plane, and the through via passes it inside a dark clearance hole called an antipad.</li>
            <li>Switch to 2 layers. The 50 Ω trace stat jumps from 0.35 mm to about 2.9 mm because the plane is now 1.53 mm away instead of 0.21 mm.</li>
          </ul>
        </Callout>
        <PcbStackupExploded />
      </Section>

      <Section id="trace-width" title="Interactive: how wide must the trace be?">
        <Callout kind="info" title="Try this">
          <ul>
            <li>At the defaults, 3 A at a 10 °C rise in 1 oz external copper needs 53.8 mil (1.37 mm). A 10 mil trace on the same current would rise 160 °C, hot enough to char the board.</li>
            <li>Choose 2 oz: the width halves to 26.9 mil. Choose Internal: it grows to 140 mil.</li>
            <li>Allow a 40 °C rise and 3 A needs only 23 mil, but the board runs hot and its resistance rises about 0.4% per °C. Prefer a bigger margin.</li>
          </ul>
        </Callout>
        <TraceWidthCalculator />
        <p className="mt-3 text-sm text-muted">
          For a full-page version with a live board cross-section, open the{" "}
          <Link href="/labs/trace-width" className="text-cyan-300 underline underline-offset-4">
            trace-width lab
          </Link>
          .
        </p>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Plan the placement order for the motor-driver board">
          <p>
            The motor-driver board is 60 × 40 mm with four M3 holes. It carries a battery connector J1, an AMS1117 regulator U2 with C1 and C2,
            an ESP32 module U1 with C3 and C4, the TB6612FNG U3 with C5, C7 and C8, motor connectors J2 and J3, and the EN network R1, C6 and
            SW1. Put these in the order you would fix or place them and say why. Then give a trace width for each of these nets in 1 oz outer
            copper at a 10 °C rise: the VBAT feed to the driver (3 A at a stall), the motor outputs (1.2 A), the 3V3 rail (0.5 A).
          </p>
          <WorkedAnswer>
            <CodeBlock
              lang="text"
              code={[
                "1  Outline, four M3 holes 3.5 mm from the corners, and keep-outs",
                "   (no copper under the ESP32 antenna end, which overhangs the top edge)",
                "2  Edge connectors: J1 on the left, J2 and J3 on the right edge near U3's outputs",
                "3  U1 ESP32 module, antenna at the top edge",
                "4  U3 TB6612FNG between U1 and the motor connectors, so the motor loop is short",
                "5  C5 and C8 against U3's VM pins, C7 at its VCC pin",
                "6  U2 next to J1, with C1 and C2 on its pins",
                "7  C3 and C4 at U1's 3V3 pin, then R1, C6 and SW1 beside EN",
                "8  Test points, fiducials and silkscreen",
                "",
                "Widths (IPC-2221, 1 oz outer, 10 °C rise)",
                "  VBAT feed to U3, 3 A:   53.8 mil calculated -> draw 60 mil (1.5 mm), or a pour",
                "  motor outputs, 1.2 A:   15.2 mil calculated -> draw 25 mil (0.6 mm)",
                "  3V3 rail, 0.5 A:        4.6 mil calculated  -> draw 15 to 20 mil for robustness",
                "  logic signals:          8 to 10 mil over the ground pour",
              ].join("\n")}
            />
            <p>
              Connectors and mechanical constraints come first because they cannot move. The driver then goes next to its motor connectors and
              the regulator next to the battery entry, which keeps the high-current loops short before anything else competes for space.
              Decoupling capacitors come last in placement but first in importance: they must touch the pins they serve. For routing, do the
              VBAT feed and the motor ground first, as wide traces or pours, and give them a Motor net class of 1.5 mm so the router cannot
              choose less; 60 mil of 1 oz copper then rises only about 8 °C at 3 A. Finish with the ground pours and stitching vias.
            </p>
          </WorkedAnswer>
        </Exercise>
      </Section>
    </>
  );
}
