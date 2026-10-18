"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { BuckConverter } from "@/components/viz/pcb/BuckConverter";
import { WorkedAnswer } from "@/components/viz/pcb/OhmsLawCircuit.helpers";
import { CapacitorSymbol, GroundSymbol, InductorSymbol, JunctionDot } from "@/components/viz/pcb/SchematicExplorer.symbols";

const WIRE = "#7b8494";

function Block({
  x,
  y,
  w,
  h,
  title,
  sub,
  color = vizColors.text,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: ReactNode;
  color?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={vizColors.bg} stroke={color} strokeWidth={2} />
      <Label x={x + w / 2} y={sub ? y + h / 2 - 8 : y + h / 2} size={12} bold color={color}>{title}</Label>
      {sub && (
        <Label x={x + w / 2} y={y + h / 2 + 9} size={10} color={vizColors.muted}>{sub}</Label>
      )}
    </g>
  );
}

/** Static figure: the same 12 V to 3.3 V job as an LDO block diagram and as a buck converter. */
function LdoVsBuckFigure() {
  return (
    <SvgCanvas
      viewBox="0 0 560 392"
      className="mx-auto max-w-[600px]"
      title="Block diagram of a linear regulator that turns 4.35 watts into heat next to a buck converter with a switch, inductor and controller that wastes about 0.2 watts for the same 12 to 3.3 volt, 0.5 amp job"
    >
      {/* LDO */}
      <Label x={14} y={16} anchor="start" bold size={13} color={vizColors.muted}>Linear regulator (LDO): the difference becomes heat</Label>
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 35 90 H 100" />
        <path d="M 210 90 H 440" />
        <path d="M 330 90 V 138 H 310" />
        <path d="M 230 146 H 155 V 114" />
      </g>
      <circle cx={30} cy={90} r={5} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
      <Label x={30} y={68} size={12} mono bold>12 V in</Label>
      <Block x={100} y={66} w={110} h={48} title="Pass transistor" sub="a variable resistor" />
      <Block x={440} y={66} w={100} h={48} title="Load" sub="3.3 V, 0.5 A" color={vizColors.cyan} />
      <Block x={230} y={126} w={80} h={40} title="Error amp" />
      <JunctionDot x={330} y={90} />
      <Arrow x1={362} y1={160} x2={312} y2={156} color={vizColors.muted} width={1.5} head={6} />
      <Label x={368} y={162} anchor="start" size={11} mono color={vizColors.muted}>Vref</Label>
      <Arrow x1={155} y1={118} x2={155} y2={112} color={vizColors.muted} width={1.5} head={6} />
      <Label x={270} y={68} size={12} mono bold color={vizColors.cyan}>Vout = 3.3 V</Label>
      <Arrow x1={155} y1={64} x2={155} y2={38} color={vizColors.red} width={2.5} head={9} />
      <Label x={168} y={38} anchor="start" size={12} bold color={vizColors.red}>heat = (12 − 3.3) V × 0.5 A = 4.35 W</Label>
      <Label x={548} y={140} anchor="end" size={12} mono bold color={vizColors.amber}>η = 3.3 / 12 = 27.5%</Label>
      <Label x={548} y={160} anchor="end" size={11} color={vizColors.muted}>Iin = Iout</Label>

      <line x1={14} y1={184} x2={546} y2={184} stroke={vizColors.grid} strokeWidth={1} />

      {/* buck */}
      <Label x={14} y={204} anchor="start" bold size={13} color={vizColors.muted}>Buck converter: chops the input, then averages it</Label>
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 35 272 H 84" />
        <path d="M 192 272 H 262" />
        <path d="M 318 272 H 440" />
        <path d="M 225 272 V 302" />
        <path d="M 225 340 V 354" />
        <path d="M 370 272 V 326" />
        <path d="M 370 338 V 352" />
        <path d="M 420 272 V 384 H 87 V 366" />
      </g>
      <circle cx={30} cy={272} r={5} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
      <Label x={30} y={250} size={12} mono bold>12 V in</Label>
      <Block x={84} y={248} w={108} h={48} title="High-side switch" sub="on for D = 27.5%" color={vizColors.green} />
      <InductorSymbol cx={290} cy={272} bumps={4} r={7} stroke={vizColors.violet} />
      <Label x={290} y={250} size={11} bold color={vizColors.violet}>L stores energy</Label>
      <Label x={225} y={252} size={10} mono color={vizColors.muted}>SW</Label>
      <JunctionDot x={225} y={272} />
      <JunctionDot x={370} y={272} />
      <JunctionDot x={420} y={272} />
      <Block x={195} y={302} w={60} h={38} title="Low-side" sub="or diode" color={vizColors.green} />
      <CapacitorSymbol cx={370} cy={332} vertical size={24} gap={8} />
      <Label x={388} y={332} anchor="start" size={11}>Cout</Label>
      <GroundSymbol x={225} y={354} />
      <GroundSymbol x={370} y={352} />
      <Block x={440} y={248} w={100} h={48} title="Load" sub="3.3 V, 0.5 A" color={vizColors.cyan} />
      <Label x={386} y={252} size={11} mono bold color={vizColors.cyan}>Vout = D · Vin</Label>
      <Block x={24} y={322} w={126} h={44} title="PWM controller" sub="compares Vout with Vref" />
      <Arrow x1={110} y1={322} x2={110} y2={298} color={vizColors.muted} width={1.5} head={6} />
      <Arrow x1={150} y1={340} x2={193} y2={326} color={vizColors.muted} width={1.5} head={6} />
      <Label x={255} y={376} size={11} color={vizColors.muted}>feedback from Vout</Label>
      <Label x={548} y={330} anchor="end" size={12} mono bold color={vizColors.amber}>η ≈ 90%</Label>
      <Label x={548} y={350} anchor="end" size={12} bold color={vizColors.green}>heat ≈ 0.2 W</Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Regulators, op-amps and the MCU on a board">
        <Prose>
          <h3>Two ways to step a voltage down</h3>
          <p>
            A <strong>linear regulator</strong> (LDO) is a variable resistor in series with the load: an error amplifier compares the output
            with a reference and adjusts a pass transistor until Vout is right. Everything the transistor drops becomes heat,{" "}
            <code>P = (Vin − Vout) · I</code>, and the efficiency is just Vout / Vin. From 12 V to 3.3 V at 500 mA that is 8.7 V × 0.5 A =
            4.35 W at 27.5% efficiency, inside a part the size of a fingernail whose junction rises 60 to 90 °C per watt. Its virtues are
            real: two capacitors, no switching noise, and 60 dB or more of supply rejection. The <strong>dropout voltage</strong>, the smallest
            Vin − Vout it can regulate, is 1.1 V typical and 1.3 V maximum at 0.8 A for the classic AMS1117 (Advanced Monolithic Systems datasheet) and 100 to 300 mV for modern PMOS parts.
          </p>
          <p>
            A <strong>buck converter</strong> never lets a resistive element carry the difference. A switch connects the input to an inductor
            for a fraction D of each period, and the inductor and output capacitor average the pulses, so <code>Vout = D · Vin</code>: 3.3 V
            from 12 V needs D = 27.5%. While the switch is on, the inductor current rises by (Vin − Vout) · D / (L · f); while it is off, the
            low-side switch or a diode carries the current as it falls. Efficiency is typically 85 to 95% at moderate load, so the same 0.5 A
            job wastes about 0.2 W. The price is a 100 kHz to 2 MHz switching frequency, an inductor, input and output capacitors, a few
            millivolts of ripple, EMI, and a layout that needs care, because the loop of input capacitor and two switches carries amps in
            nanoseconds.
          </p>
          <h3>Boost, buck-boost and choosing</h3>
          <p>
            A <strong>boost</strong> converter makes <code>Vout = Vin / (1 − D)</code> and draws more current than it delivers: a 3.7 V cell
            producing 5 V at 1 A with 90% efficiency pulls 1.5 A. A <strong>buck-boost</strong> or SEPIC handles inputs that cross the output,
            as a Li-ion cell does around 3.3 V. The decision rule is simple. If (Vin − Vout) · I exceeds a watt or two, use a switcher. If the
            rail feeds a noise-sensitive analog circuit, follow the switcher with a low-noise LDO. If the drop is small and the current low,
            an LDO is cheaper and quieter.
          </p>
        </Prose>

        <Figure caption="The same 12 V to 3.3 V, 0.5 A job. The LDO converts 4.35 W into heat; the buck converter moves energy through an inductor and wastes about 0.2 W.">
          <LdoVsBuckFigure />
        </Figure>

        <Prose>
          <h3>Op-amps and comparators</h3>
          <p>
            An op-amp is a differential amplifier with enormous open-loop gain, so with negative feedback two golden rules hold: the output
            does whatever it takes to make the two inputs equal, and the inputs draw no current. The non-inverting amplifier then has gain{" "}
            <code>1 + Rf / Rg</code> and the inverting one <code>−Rf / Rin</code>. A 10 mΩ shunt carrying 3 A drops 30 mV, and Rf = 99 kΩ with
            Rg = 1 kΩ gives a gain of 100, so an ADC sees 3.0 V. Respect the gain-bandwidth product: a 1 MHz part such as the LM358 has only
            10 kHz of bandwidth at a gain of 100, and its few millivolts of input offset become hundreds of millivolts at the output. A{" "}
            <strong>comparator</strong> is the same triangle without feedback: the output slams to a rail depending on which input is higher.
            Add positive feedback for hysteresis, use a real comparator such as the open-collector LM393 (with a pull-up) instead of an
            op-amp, and never leave an input floating.
          </p>
          <h3>A microcontroller on a board</h3>
          <p>
            A bare MCU needs five things. <strong>Power</strong>: 100 nF at every supply pin, bulk capacitance per rail and a filtered analog
            supply. <strong>Reset</strong>: a 10 kΩ pull-up on the reset or EN pin, often with a capacitor and a button to ground.{" "}
            <strong>Boot configuration</strong>: strapping pins at defined levels, such as IO0 and IO12 on an ESP32. <strong>Clock</strong>: the
            internal RC oscillator is good to a few percent, but USB, CAN and accurate timing need a crystal, which uses the MCU&apos;s
            inverting amplifier plus two load capacitors, C1 = C2 = 2 · (CL − Cstray), about 10 pF for an 8 pF crystal with 3 pF of stray
            capacitance. An oscillator module is a powered clock with a buffered output; it costs more but removes the tuning.{" "}
            <strong>Programming</strong>: a header for SWD (SWDIO, SWCLK, reset, 3V3, ground), or UART plus the boot pins, or USB.
          </p>
          <h3>Interfaces and protection</h3>
          <p>
            For <strong>level shifting</strong>, a 5 V signal into a 3.3 V pin needs a resistor divider (1 kΩ over 2 kΩ for a slow signal such
            as the HC-SR04 echo), a BSS138 MOSFET stage with pull-ups for I²C, or a translator IC such as the 74LVC245.{" "}
            <strong>TVS diodes</strong> clamp surges and ESD: pick a standoff voltage above the working voltage, for example an SMBJ12A (12 V
            standoff, about 20 V clamp) on a 12 V input, place it at the connector, and give it a short, wide path to ground.{" "}
            <strong>Connectors</strong> carry the current and the abuse: a JST-XH is rated about 3 A per pin, and keyed housings stop reversed
            plugs. Add a P-FET or diode for reverse-battery protection on any supply that people plug in by hand.
          </p>
        </Prose>

        <Callout kind="tip" title="See these parts working">
          <p>
            Every part in this lesson sits on the robot&apos;s motor-driver board. The{" "}
            <Link href="/learn/pcb/components-in-action" className="underline">
              components-in-action lesson
            </Link>{" "}
            powers that board up one station at a time, with live numbers.
          </p>
        </Callout>

        <Callout kind="warning" title="Always compute the LDO heat first">
          <p>
            Before choosing a linear regulator, calculate (Vin − Vout) × I at the highest input voltage and the highest load, then multiply by
            the package&apos;s thermal resistance. If the junction would pass about 100 °C at your worst-case ambient, you need a switcher or
            a pre-regulator.
          </p>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: the buck converter in slow motion">
        <Callout kind="info" title="Try this">
          <ul>
            <li>At the defaults (12 V, D = 27.5%, 0.5 A) Vout is 3.30 V, the LDO bar is 4.35 W and the buck bar is about 0.19 W, so the buck is roughly 90% efficient.</li>
            <li>Drag the duty cycle: Vout follows D · Vin. At D = 95% the LDO verdict flips to &quot;In dropout&quot; because Vin − Vout is under 1.2 V.</li>
            <li>Switch to the 10 µH inductor and drop the load to 50 mA. The ripple exceeds twice the load current, so the inductor current dips below zero (forced-PWM operation).</li>
            <li>Raise the frequency to 2 MHz: the ripple shrinks, but switching loss grows with f and efficiency falls to about 75%.</li>
          </ul>
        </Callout>
        <BuckConverter />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title={"Pick the regulator for the robot's logic rail"}>
          <p>
            The robot&apos;s logic rail is 3.3 V at 500 mA for an ESP32 and its sensors, fed from a 12 V, 2000 mAh pack. (a) Compute the
            LDO&apos;s dissipation, efficiency and junction rise at 60 °C/W. (b) Estimate the loss of a buck converter at 90% efficiency, and
            the current each option draws from the pack. (c) Estimate the run time for each. (d) Choose an inductor for 30% ripple at 500 kHz.
          </p>
          <WorkedAnswer>
            <CodeBlock
              lang="text"
              code={[
                "(a) LDO     P = (12 - 3.3) x 0.5 = 4.35 W,  efficiency 3.3 / 12 = 27.5%",
                "            junction rise = 4.35 W x 60 °C/W = 261 °C  -> far past 150 °C shutdown",
                "(b) Buck    Pout = 3.3 x 0.5 = 1.65 W,  Pin = 1.65 / 0.9 = 1.83 W,  loss = 0.18 W",
                "            pack current: LDO 500 mA, buck 1.83 W / 12 V = 153 mA",
                "(c) Runtime LDO 2000 mAh / 500 mA = 4 h,  buck 2000 mAh / 153 mA = 13 h",
                "(d) Inductor dI = 0.3 x 0.5 = 0.15 A",
                "            L = (12 - 3.3) x 0.275 / (0.15 x 500 kHz) = 31.9 µH -> choose 33 µH",
                "            peak = 0.5 + 0.075 = 0.575 A -> Isat of 1 A or more",
                "            ripple voltage = 0.15 / (8 x 500 kHz x 22 µF) = 1.7 mV",
              ].join("\n")}
            />
            <p>
              The LDO is not just inefficient here, it is impossible: 261 °C of rise means thermal shutdown within seconds. The buck costs
              an inductor and a careful layout but runs about 3.3 times longer on the same pack. If the ADC needs a very quiet 3.3 V, put a
              small LDO after a 5 V buck rail, where it only dissipates 1.7 V × 0.5 A = 0.85 W at full load.
            </p>
          </WorkedAnswer>
        </Exercise>
      </Section>
    </>
  );
}
