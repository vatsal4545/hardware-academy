"use client";

import type { ReactNode } from "react";
import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { BoardInAction } from "@/components/viz/pcb/BoardInAction";
import { WorkedAnswer } from "@/components/viz/pcb/OhmsLawCircuit.helpers";
import { RightHandRuleFigure } from "@/components/viz/pcb/RightHandRule";

const WIRE = "#7b8494";

function Box({ x, y, w, h, title, sub, color = vizColors.text }: { x: number; y: number; w: number; h: number; title: string; sub?: ReactNode; color?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={vizColors.bg} stroke={color} strokeWidth={2} />
      <Label x={x + w / 2} y={sub ? y + h / 2 - 8 : y + h / 2} size={12} bold color={color}>{title}</Label>
      {sub && <Label x={x + w / 2} y={y + h / 2 + 9} size={10} color={vizColors.muted}>{sub}</Label>}
    </g>
  );
}

/** Static figure: the board's power tree with the law that acts at each part pinned next to it. */
function PowerTreeFigure() {
  return (
    <SvgCanvas
      viewBox="0 0 720 400"
      className="mx-auto max-w-[760px]"
      title="Power tree of the motor-driver board: the pack enters through J1 and Q1, splits at the VM node into the motor driver and the regulator, and the 3.3 volt rail feeds the ESP32, the EN network and the LED; each part is labelled with the law that acts there"
    >
      <rect x={0} y={0} width={720} height={400} rx={8} fill={vizColors.bg} />
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 130 198 H 150" />
        <path d="M 220 198 H 240" />
        <path d="M 350 198 H 400" />
        <path d="M 400 198 V 68 H 460" />
        <path d="M 400 198 V 258 H 460" />
        <path d="M 580 68 H 620" />
        <path d="M 580 258 H 596 V 334 H 610" />
        <path d="M 596 222 H 610" />
        <path d="M 596 278 H 610" />
        <path d="M 400 198 V 328 H 240" />
      </g>
      <Box x={20} y={170} w={110} h={56} title="2S Li-ion pack" sub="6.0 to 8.4 V" color={vizColors.orange} />
      <Box x={150} y={170} w={70} h={56} title="J1" sub="JST XH, 3 A" />
      <Box x={240} y={170} w={110} h={56} title="Q1 P-FET" sub="Ohm: 0.15 V at 3 A" color={vizColors.amber} />
      <circle cx={400} cy={198} r={6} fill={vizColors.amber} />
      <Label x={400} y={176} size={11} bold color={vizColors.amber}>VM node: KCL</Label>
      <Label x={400} y={218} size={10} mono color={vizColors.muted}>3.0 A + 0.155 A in = out</Label>
      <Box x={460} y={40} w={120} h={56} title="U2 TB6612FNG" sub="two H-bridges" color={vizColors.violet} />
      <Box x={620} y={30} w={90} h={34} title="Motor L" color={vizColors.blue} />
      <Box x={620} y={72} w={90} h={34} title="Motor R" color={vizColors.blue} />
      <Label x={520} y={120} size={10} color={vizColors.violet}>winding: right-hand rule,</Label>
      <Label x={520} y={134} size={10} color={vizColors.violet}>flyback V = L · di/dt</Label>
      <Box x={460} y={230} w={120} h={56} title="U3 AMS1117-3.3" sub="P = 5.1 V × 0.15 A = 0.77 W" color={vizColors.red} />
      <Arrow x1={520} y1={228} x2={520} y2={206} color={vizColors.red} width={2} head={7} />
      <Label x={520} y={196} size={10} color={vizColors.red}>heat, +46 °C</Label>
      <Label x={602} y={210} anchor="start" size={10} mono bold color={vizColors.cyan}>3V3</Label>
      <Box x={610} y={200} w={100} h={44} title="ESP32 + C7" sub="V = L · di/dt" color={vizColors.cyan} />
      <Box x={610} y={256} w={100} h={44} title="R2, C8 on EN" sub="τ = R · C = 10 ms" color={vizColors.cyan} />
      <Box x={610} y={312} w={100} h={44} title="R3 and D1" sub="KVL: 3.3 = 1.3 + 2.0" color={vizColors.cyan} />
      <Box x={240} y={300} w={150} h={56} title="R4 100 k / R5 47 k" sub="divider 2.69 V, Rth 32 kΩ" color={vizColors.green} />
      <Label x={315} y={372} size={10} color={vizColors.muted}>to the ADC pin, with C9 100 nF</Label>
      <Label x={16} y={386} anchor="start" size={11} color={vizColors.muted}>Follow the current left to right; every ground return runs back to the pack over the ground plane.</Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="One real board, and the handful of laws that run it">
        <Prose>
          <h3>Start with the water picture</h3>
          <p>
            Think of a garden hose. The tap&apos;s pressure is <strong>voltage</strong>, the water passing a point each second is{" "}
            <strong>current</strong>, and a kink in the hose is <strong>resistance</strong>. On the robot&apos;s motor-driver board the tap is a
            two-cell lithium pack at 6.0 to 8.4 V. This lesson follows that flow from the battery connector to the motor winding and stops at each part to show one law with the board&apos;s own
            numbers.
          </p>

          <h3>Ohm&apos;s law at the connector: Q1 is a resistor when it is on</h3>
          <p>
            After J1 the current meets Q1, a P-channel MOSFET that protects the board if the pack goes in backwards. The right way round it is
            switched on, and a switched-on MOSFET is a small resistor, here about 50 mΩ. Ohm&apos;s law, <code>V = I · R</code>, says what that
            costs: with both motors stalled at 1.5 A each plus the logic, about 3.15 A flows, so Q1 drops 0.16 V. The heat follows from{" "}
            <code>P = I² · R</code>, about 0.5 W, the limit for a SOT-23 package.
          </p>

          <h3>Kirchhoff&apos;s current law at the VM node</h3>
          <p>
            A river that splits around an island carries, in both arms together, exactly the water that arrived. Charge cannot pile up either,
            so at any junction <strong>the currents in equal the currents out</strong>. On this board the junction is the VM node just after Q1.
            It feeds the TB6612FNG with the two motor currents and the AMS1117 with the logic current plus the regulator&apos;s own 5 mA. At stall
            that is 1.5 + 1.5 + 0.155 = 3.155 A, and that total is what the connector pins, the fuse, Q1 and the first trace must carry. The 100 µF capacitor on the node is the local reservoir: a 1.5 A
            start-up surge lasting 10 µs drags it down by only <code>ΔV = I · Δt / C</code> = 0.15 V.
          </p>

          <h3>Power dissipation at the regulator</h3>
          <p>
            A linear regulator is a tap that throttles the pressure down and turns the difference into heat. The AMS1117 takes 8.4 V from a full
            pack and delivers 3.3 V, so every milliamp through it drops 5.1 V: <code>P = (Vin − Vout) · I</code> = 5.1 V × 0.15 A = 0.77 W, plus
            8.4 V × 5 mA of ground current. At 60 °C/W for a SOT-223 on a modest pad, 0.81 W is a 48 °C rise, so about 73 °C, which is fine.
            Push the logic rail to 400 mA with Wi-Fi and the junction reaches the 150 °C shutdown line. Above a few hundred milliamps a buck
            converter in front of the regulator wastes a tenth of the power.
          </p>

          <h3>Kirchhoff&apos;s voltage law around the LED</h3>
          <p>
            Walk a loop of hills back to your own door: every metre you climbed, you also descended. Voltage around a closed loop works the same
            way, <strong>the rises equal the drops</strong>. The status LED is the smallest loop on the board: pin IO13 lifts the charge to 3.3 V,
            R3 drops some of it, the LED drops its forward voltage and ground closes the loop. A red LED drops about 2.0 V, so R3 gets 1.3 V and,
            by Ohm&apos;s law, 1.3 V / 1 kΩ = 1.3 mA flows: 3.3 − 1.3 − 2.0 = 0. Swap in a blue LED, which drops about 3.0 V, and only 0.3 V is
            left for the resistor: 0.3 mA, too dim to see. The rule for the resistor is <code>R = (Vcc − Vf) / I</code>, and the current should
            stay well under the 20 mA a microcontroller pin can source.
          </p>

          <h3>The voltage divider and Thevenin at the ADC pin</h3>
          <p>
            Two resistors in series share the voltage in proportion to their size, <code>Vout = Vin · R2 / (R1 + R2)</code>. The battery monitor
            uses 100 kΩ over 47 kΩ, so a full 8.4 V pack appears as 2.69 V at the ADC pin. Thevenin&apos;s theorem adds the catch: seen from the
            pin, the divider is not a perfect 2.69 V source but a source behind R1 ∥ R2 = 32 kΩ. A tap at the end of a long thin pipe reads full
            pressure until you draw water, and an ADC draws a gulp of charge every time it samples. 32 kΩ is three times the 10 kΩ an ADC input
            likes, so this board puts 100 nF right at the pin: the capacitor hands over each gulp and the divider refills it in a few
            milliseconds.
          </p>

          <h3>The RC time constant on EN</h3>
          <p>
            Fill a bucket through a narrow tap and it fills fast at first, then slower as the level rises. A capacitor charging through a resistor
            does the same, and the product <strong>τ = R · C</strong> sets the pace: 63% of the way at 1τ, 75% at 1.39τ, 99% at 5τ. The
            ESP32&apos;s EN pin hangs off 10 kΩ to 3V3 with 1 µF to ground, so τ = 10 ms and EN crosses the chip&apos;s 0.75 × VDD threshold about
            14 ms after the rail appears. That delay is the point: the regulator and the capacitors settle before the processor starts.
          </p>

          <h3>Decoupling: every trace is a small inductor</h3>
          <p>
            Water in a long hose has inertia: open the nozzle and it takes a moment to get going. Current has the same inertia, called inductance,
            and every millimetre of thin trace is about 1 nH of it. An inductor resists a change in current with <code>V = L · di/dt</code>. When
            the ESP32 switches, it pulls 50 mA in about 2 ns, 25 million amps per second, so 1 nH costs 25 mV and 10 mm of trace costs 250 mV,
            enough to glitch 3.3 V logic. The 100 nF capacitors C7 and C4 sit within a millimetre or two of their pins for exactly this reason:
            they shrink the loop the fast current has to travel, and with it the inductance.
          </p>

          <h3>The right-hand rule at the motor</h3>
          <p>
            In 1820 Ørsted saw a compass needle turn beside a wire: a current makes a magnetic field. The <strong>right-hand rule</strong> gives
            its direction. Grip a wire with your right hand, thumb along the current, and your fingers curl the way the field circles it. For a
            coil, curl your fingers along the current and your thumb points along the field inside, toward the coil&apos;s north end. The motor
            winding is that coil, and the H-bridge decides which way the current goes through it: reverse AIN1 and AIN2 and the field flips, so
            the torque flips. The winding is also an inductor, so when the bridge switches the current off it fights back with V = L · di/dt; 1 A stopped in 100 ns through
            1 mH would be 10 kV, which is why the MOSFETs&apos; body diodes give the current a path and clamp the pin at VM plus 0.7 V.
          </p>
        </Prose>

        <Callout kind="tip" title="Which law to reach for">
          <ul>
            <li>Parts in a chain: Ohm&apos;s law for each, KVL for the loop.</li>
            <li>A junction: KCL, which sizes the fuse, connector and trace.</li>
            <li>Something hot: P = V · I or I² · R.</li>
            <li>A slow rise or a delay: τ = R · C.</li>
            <li>A glitch on a fast edge: V = L · di/dt, so shorten the loop.</li>
            <li>A motor or a magnet: the right-hand rule.</li>
          </ul>
        </Callout>

        <Figure caption="The board's power tree, with the law that acts at each part pinned next to it. The interactive below walks this tree station by station.">
          <PowerTreeFigure />
        </Figure>

        <Figure caption="The right-hand rule two ways: thumb along the current in a straight trace and the fingers follow the field; fingers along the current in a coil and the thumb points to its north end.">
          <RightHandRuleFigure />
        </Figure>
      </Section>

      <Section id="viz" title="Interactive: the board in action">
        <Callout kind="info" title="Try this">
          <ul>
            <li>Station 1: push both motor sliders to 1.5 A. The pack current reads 3.155 A, Q1 drops 157.75 mV and makes about 0.5 W.</li>
            <li>Station 4: pick the blue LED. The current collapses from 1.3 mA to 300 µA and the verdict says dim; 220 Ω brings it back to 1.36 mA.</li>
            <li>Station 5: switch C9 off. The Thevenin resistance stays 32 kΩ, but the verdict flips to &quot;reads low&quot;.</li>
            <li>Station 8: choose Reverse. The current arrows on the coil flip, the hand turns over and north moves to the other end.</li>
            <li>Click any part on the board, C1 for example, to read its job and its live numbers; press Escape to close the card.</li>
          </ul>
        </Callout>
        <BoardInAction />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Audit the board at full load">
          <p>
            Both motors stall at 1.5 A, the logic rail draws 150 mA, and the pack is full at 8.4 V. (a) Find the pack current and the drop and heat
            in Q1. (b) Find the regulator&apos;s heat and junction temperature at 60 °C/W, then repeat for a 400 mA Wi-Fi burst and say what you would
            change. (c) The status LED becomes blue and must run at 5 mA: choose R3. (d) Firmware wants EN to wait 50 ms after the rail: choose C8.
          </p>
          <WorkedAnswer>
            <CodeBlock
              lang="text"
              code={[
                "(a) Pack current  1.5 + 1.5 + 0.15 + 0.005 = 3.155 A           (KCL at the VM node)",
                "    Q1            V = 3.155 A x 0.05 Ω = 0.158 V,  P = 3.155² x 0.05 Ω = 0.498 W",
                "                  a SOT-23 at its limit: fine for a stall, not for ever; 1.5 mm trace drops only 13 mV",
                "(b) U3 at 150 mA  (8.4 - 3.3) x 0.15 + 8.4 x 0.005 = 0.807 W -> +48 °C -> 73 °C junction, fine",
                "    U3 at 400 mA  (8.4 - 3.3) x 0.40 + 0.042 = 2.08 W -> +125 °C -> 150 °C, thermal shutdown",
                "                  put a 5 V buck in front (loss about 0.15 W at 400 mA) and let the LDO drop 1.7 V",
                "(c) Blue LED 5 mA R = (3.3 - 3.0) / 0.005 = 60 Ω -> 56 Ω or 62 Ω (E24), P = 15 mW",
                "                  or keep 1 kΩ and fit a red LED: 1.3 mA is plenty for an indicator",
                "(d) EN for 50 ms  t = 1.386 x R x C  ->  C = 0.050 / (1.386 x 10 kΩ) = 3.6 µF",
                "                  4.7 µF gives 65 ms, 3.3 µF gives 46 ms; pick 4.7 µF if the firmware says 'at least'",
              ].join("\n")}
            />
            <p>
              Every line is one of the laws from the theory: KCL for the pack current, Ohm and I²R for Q1, (Vin − Vout) · I for the regulator, KVL
              for the LED and τ · ln 4 for EN. The audit also shows why the numbers in a design review are never read off a datasheet alone: the
              regulator is fine at the nominal load and over the line in a Wi-Fi burst.
            </p>
          </WorkedAnswer>
        </Exercise>
      </Section>
    </>
  );
}
