"use client";

import { Section, Prose, Callout, Figure, Exercise } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { DecouplingDemo } from "@/components/viz/pcb/DecouplingDemo";
import { ReturnPathDemo } from "@/components/viz/pcb/ReturnPathDemo";

function ReturnPathFigure() {
  return (
    <SvgCanvas viewBox="0 0 720 262" title="Return current over a solid ground plane compared with over a plane that has a slot">
      <rect x="0" y="0" width="720" height="262" rx="8" fill={vizColors.bg} />

      {/* solid plane */}
      <g>
        <Label x={180} y={22} size={14} bold>
          Solid plane
        </Label>
        <rect x="20" y="40" width="320" height="182" fill={vizColors.copper} opacity={0.16} stroke={vizColors.copper} strokeOpacity={0.5} />
        <polygon points="70,118 290,118 290,106 70,106" fill={vizColors.amber} opacity={0.35} />
        <line x1="70" y1="118" x2="290" y2="118" stroke={vizColors.cyan} strokeWidth="3" />
        <line x1="290" y1="106" x2="70" y2="106" stroke={vizColors.amber} strokeWidth="3" />
        <Arrow x1={170} y1={118} x2={215} y2={118} color={vizColors.cyan} width={3} />
        <Arrow x1={190} y1={106} x2={145} y2={106} color={vizColors.amber} width={3} />
        <rect x="38" y="98" width="32" height="28" rx="4" fill="#1a2235" stroke={vizColors.muted} />
        <rect x="290" y="98" width="32" height="28" rx="4" fill="#1a2235" stroke={vizColors.muted} />
        <Label x={54} y={112} size={10}>
          driver
        </Label>
        <Label x={306} y={112} size={10}>
          load
        </Label>
        <Label x={180} y={198} size={13} color={vizColors.amber}>
          return stays under the trace
        </Label>
        <Label x={180} y={216} size={14} bold>
          loop area ≈ 10 mm²
        </Label>
      </g>

      {/* plane with a slot */}
      <g transform="translate(360 0)">
        <Label x={180} y={22} size={14} bold>
          Plane with a slot
        </Label>
        <rect x="20" y="40" width="320" height="182" fill={vizColors.copper} opacity={0.16} stroke={vizColors.copper} strokeOpacity={0.5} />
        <rect x="176" y="56" width="8" height="112" fill={vizColors.bg} stroke={vizColors.red} strokeDasharray="3 2" />
        <Label x={180} y={180} size={12} color={vizColors.red}>
          slot
        </Label>
        <polygon points="70,118 290,118 290,106 234,106 184,56 176,56 126,106 70,106" fill={vizColors.amber} opacity={0.35} />
        <line x1="70" y1="118" x2="290" y2="118" stroke={vizColors.cyan} strokeWidth="3" />
        <polyline
          points="290,106 234,106 184,56 176,56 126,106 70,106"
          fill="none"
          stroke={vizColors.amber}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <Arrow x1={110} y1={118} x2={150} y2={118} color={vizColors.cyan} width={3} />
        <Arrow x1={270} y1={106} x2={250} y2={106} color={vizColors.amber} width={3} />
        <rect x="38" y="98" width="32" height="28" rx="4" fill="#1a2235" stroke={vizColors.muted} />
        <rect x="290" y="98" width="32" height="28" rx="4" fill="#1a2235" stroke={vizColors.muted} />
        <Label x={54} y={112} size={10}>
          driver
        </Label>
        <Label x={306} y={112} size={10}>
          load
        </Label>
        <Label x={180} y={198} size={13} color={vizColors.amber}>
          return detours round the slot
        </Label>
        <Label x={180} y={216} size={14} bold>
          loop area ≈ 50 mm²
        </Label>
      </g>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Where the current really goes">
        <Prose>
          <p>
            Every signal on a board is a loop. Current leaves the driver, runs down the trace, enters the receiver and must return to where it
            started. Power integrity, signal integrity and EMI are three views of one fact: the size and shape of that loop decide whether a board is
            quiet or a small radio transmitter.
          </p>

          <h3>Return currents follow the signal</h3>
          <p>
            At DC the return current takes the path of least resistance and spreads through the copper. Above roughly 100 kHz inductance wins, and the
            current takes the path of least inductance, which is the one that encloses the smallest area: straight underneath the trace on the adjacent
            plane. About 80 % of it flows within three dielectric heights either side of the trace, so with 0.2 mm of prepreg it is a stripe 1.2 mm
            wide, while on a two-layer board with 1.6 mm of FR-4 it is 9.6 mm wide.
          </p>
          <p>
            Cut a slot or split in that plane and the return current must detour around its end. The loop area, the inductance and the radiation all
            jump, and the detour couples noise into neighbours. Never route a fast signal across a gap in its reference plane. If it has to change
            layers, change between layers that share the same reference, or add a stitching via (or a 100 nF capacitor) within a few millimetres of
            the signal via.
          </p>
        </Prose>

        <Figure caption="The same 48 mm trace over a solid plane and over a plane with a 12 mm slot. The return is drawn beside the trace for clarity; it really flows directly beneath it.">
          <ReturnPathFigure />
        </Figure>

        <Prose>
          <h3>Decoupling and loop area</h3>
          <p>
            A microcontroller does not draw a smooth current. Each clock edge takes tens of milliamps in a nanosecond or two, and loop inductance fights
            any change with V = L·di/dt. A 50 mA step in 2 ns is 25 MA/s, so 10 nH (about 10 mm of thin trace) costs 250 mV and 1 nH costs 25 mV. A
            decoupling capacitor is a local charge reservoir whose real job is to shrink the fast current loop from tens of centimetres to a few
            millimetres.
          </p>
          <p>
            So place the 100 nF capacitor first and closest, put its ground via right at the pad, and let the power trace reach the capacitor before it
            reaches the pin. A capacitor is only a capacitor below its self-resonance, f = 1/(2π√(LC)): 100 nF with 1 nH resonates at 16 MHz, with 10
            nH at only 5 MHz, and above that it is an inductor.
          </p>

          <h3>PDN impedance in one paragraph</h3>
          <p>
            Treat the power distribution network as an impedance that must stay below Z_target = allowed ripple ÷ transient current. For a 3.3 V rail
            that may move 5 % (165 mV) under a 0.5 A Wi-Fi burst, Z_target is 0.33 Ω. The regulator holds that up to about 100 kHz, bulk capacitors (22
            to 100 µF) carry 100 kHz to 1 MHz, 100 nF ceramics carry 1 to 20 MHz, and above that only loop inductance and plane capacitance matter. A 60
            × 40 mm plane pair 0.1 mm apart is only about 0.9 nF: planes help above 100 MHz but never replace local capacitors.
          </p>

          <h3>Rise time, impedance and termination</h3>
          <p>
            Signal integrity is about edges, not clock rates. An edge of rise time tr has content up to about 0.35/tr, so a 1 ns edge reaches 350 MHz
            even on a 1 MHz signal. A trace becomes a transmission line when its one-way delay exceeds about a sixth of the rise time. FR-4 outer
            layers delay a signal by about 6 ps/mm, so the critical length is tr ÷ (6 × 6 ps/mm): 28 mm for 1 ns, 8 mm for 0.3 ns and about 140 mm for
            a slow 5 ns GPIO.
          </p>
          <p>
            Past that length you control the characteristic impedance and terminate. The targets are 50 Ω single-ended and 90 Ω (USB) or 100 Ω
            (Ethernet, LVDS) differential. On a four-layer board with 0.21 mm of prepreg a 50 Ω microstrip is about 0.35 mm wide; on a two-layer 1.6 mm
            board it would need about 3 mm, which is why impedance-controlled boards are usually four-layer. Terminate by matching: a 22 to 33 Ω series
            resistor at the driver for a point-to-point line, a parallel resistor at the load for a bus, 100 Ω across a differential receiver. Length
            matching is delay matching: skew = length difference × 6 ps/mm, so 10 mm of mismatch is 60 ps.
          </p>

          <h3>Crosstalk</h3>
          <p>
            Neighbouring traces couple through mutual capacitance and inductance. Backward crosstalk falls roughly as 1/(1 + (s/h)²), where s is the
            centre-to-centre spacing and h the height above the plane, so the cheapest cure is a closer plane. The 3W rule (centre spacing of at least
            three trace widths) contains about 70 % of the field and 10W about 98 %. Keep clocks and motor PWM away from sensitive analog traces, and
            cross rather than run parallel on adjacent layers.
          </p>

          <h3>Loops as antennas</h3>
          <p>
            A small loop of area A carrying current I at frequency f radiates E ≈ 2.6×10⁻¹⁴ · f² · A · I / r (SI units). One square centimetre carrying
            10 mA at 100 MHz gives about 90 µV/m at 3 m, over half of the 150 µV/m FCC Class B limit. Common-mode current on cables is worse: E ≈
            1.26×10⁻⁶ · f · L · I / r, so just 10 µA on a 0.5 m cable at 100 MHz gives about 210 µV/m and fails. That is why the motor leads are the
            antenna. Filter where a cable enters the board with a ferrite bead or common-mode choke plus a capacitor, keep a solid plane under every
            connector, and remember that a shield is only as good as its biggest hole: about 20·log10(λ/2l) dB for a slot of length l.
          </p>

          <h3>Partitioning motors from analog</h3>
          <p>
            Partition by placement, not by cutting the plane. Put the motor driver, its bulk capacitor and the battery connector in one corner so the
            motor return current flows straight back to the battery, and put the ADC inputs and line sensors on the far side. Keep one solid ground. For
            an ADC pin use a 1 kΩ plus 100 nF filter (corner 1.6 kHz), route over unbroken ground away from switching edges, and sample between PWM
            edges.
          </p>
        </Prose>

        <Callout kind="tip" title="Loop inductance rules of thumb">
          About 1 nH per millimetre of thin trace, about 1 nH per via and about 0.5 nH for a 0402 capacitor body. A capacitor 5 mm away through two vias
          is therefore about 8 nH, and above 6 MHz it is just an inductor.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: decoupling and return paths">
        <Prose>
          <p>
            First move the capacitor away from the pin and watch the benefit disappear, then cut a slit under the trace and read the loop-area tile.
            Try the 1.6 mm two-layer setting to see why a close plane matters so much.
          </p>
        </Prose>
        <DecouplingDemo />
        <ReturnPathDemo />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Find and shrink the loops on the motor-driver board">
          <p>
            Rev A of the motor-driver board is a two-layer design with no ground plane under the traces. Its four current loops, measured on the layout
            as length × spacing between the outgoing and return copper:
          </p>
          <table>
            <thead>
              <tr>
                <th>Loop</th>
                <th>What flows round it</th>
                <th>Length × spacing</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>VM loop: battery connector, TB6612FNG VM, PGND, back to the connector</td>
                <td>55 mm × 14 mm</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Motor output loop: OUT pins, motor connector, second wire back</td>
                <td>40 mm × 10 mm</td>
              </tr>
              <tr>
                <td>3</td>
                <td>ESP32 3V3 loop: capacitor, 3V3 pin, GND pin, capacitor</td>
                <td>12 mm × 6 mm</td>
              </tr>
              <tr>
                <td>4</td>
                <td>Line-sensor loop: signal trace and its return to the ADC input</td>
                <td>80 mm × 5 mm</td>
              </tr>
            </tbody>
          </table>
          <ol>
            <li>Compute the area of each loop.</li>
            <li>Rank the loops by how much each would radiate for equal current and frequency, then by which carries the largest di/dt.</li>
            <li>
              Rev B adds a solid ground plane on layer 2, 0.2 mm below layer 1, so loops 1, 3 and 4 close under their own trace. Compute their new areas
              and the reduction in dB (20·log10 of the area ratio).
            </li>
            <li>What do you do about loop 2?</li>
          </ol>
          <p>Check yourself in the demo above: with the plane at 0.2 mm and a 12 mm slit the loop-area tile should read about 50 mm².</p>
          <details className="mt-3 rounded-md border border-border bg-bg/40 p-3">
            <summary className="cursor-pointer font-semibold text-green-300">Worked answer</summary>
            <ol className="mt-2">
              <li>Areas: loop 1 is 55 × 14 = 770 mm², loop 2 is 40 × 10 = 400 mm², loop 3 is 12 × 6 = 72 mm², loop 4 is 80 × 5 = 400 mm².</li>
              <li>
                For equal current and frequency emission follows area: loop 1, then loops 2 and 4, then loop 3. The currents are not equal, though.
                Loop 1 carries amps with microsecond edges (the largest di/dt), loop 3 carries only tens of milliamps but with 1 to 3 ns edges (the
                highest frequencies), and loop 4 carries microamps but is a receiving antenna for everything else. Fix 1 and 3 first.
              </li>
              <li>
                With the plane: loop 1 becomes 55 × 0.2 = 11 mm² (70 times smaller, about 37 dB less), loop 3 becomes 12 × 0.2 = 2.4 mm² (30 times,
                about 30 dB) and loop 4 becomes 80 × 0.2 = 16 mm² (25 times, 28 dB).
              </li>
              <li>
                Loop 2 is mostly the cable. Twist the two motor wires so their loop area collapses, keep them short, add 100 nF across the motor
                terminals, run the OUT traces side by side over the plane, and keep them out of the ADC corner.
              </li>
            </ol>
          </details>
        </Exercise>
      </Section>
    </>
  );
}
