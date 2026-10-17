"use client";

import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { OhmsLawCircuit } from "@/components/viz/pcb/OhmsLawCircuit";
import { WorkedAnswer } from "@/components/viz/pcb/OhmsLawCircuit.helpers";
import { GroundSymbol, JunctionDot, ResistorSymbol, BatterySymbol } from "@/components/viz/pcb/SchematicExplorer.symbols";

const WIRE = "#7b8494";

/** Static figure: the 27 k / 10 k divider next to a KVL loop with the same two resistors. Two panels that stack on a narrow column. */
function DividerAndKvlFigure() {
  return (
    <div className="@container">
      <div className="grid gap-4 @2xl:grid-cols-2">
        <SvgCanvas
          viewBox="0 0 360 300"
          className="mx-auto max-w-[400px]"
          title="A 27 kilohm and 10 kilohm voltage divider on 12 volts giving 3.24 volts for an ADC pin"
        >
          <Label x={180} y={18} bold size={13} color={vizColors.muted}>Voltage divider</Label>
          <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 120 46 V 70" />
            <path d="M 120 130 V 185" />
            <path d="M 120 245 V 272" />
            <path d="M 120 170 H 240" />
          </g>
          <circle cx={120} cy={41} r={5} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
          <ResistorSymbol cx={120} cy={100} length={60} width={28} vertical />
          <ResistorSymbol cx={120} cy={215} length={60} width={28} vertical />
          <JunctionDot x={120} y={170} />
          <circle cx={245} cy={170} r={5} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2} />
          <GroundSymbol x={120} y={272} />
          <Arrow x1={80} y1={78} x2={80} y2={158} color={vizColors.amber} width={2} />
          <Label x={72} y={118} anchor="end" size={12} mono color={vizColors.amber}>324 µA</Label>
          <Label x={108} y={41} anchor="end" bold mono>Vin = 12 V</Label>
          <Label x={146} y={92} anchor="start" mono>R1 = 27 kΩ</Label>
          <Label x={146} y={111} anchor="start" size={11} color={vizColors.muted}>drops 8.76 V</Label>
          <Label x={146} y={207} anchor="start" mono>R2 = 10 kΩ</Label>
          <Label x={146} y={226} anchor="start" size={11} color={vizColors.muted}>drops 3.24 V</Label>
          <Label x={182} y={152} bold mono color={vizColors.cyan}>Vout = 3.24 V</Label>
          <Label x={258} y={164} anchor="start" size={12} color={vizColors.muted}>to the ADC pin</Label>
          <Label x={258} y={186} anchor="start" size={11} mono color={vizColors.muted}>Rth = 7.3 kΩ</Label>
        </SvgCanvas>

        <SvgCanvas
          viewBox="358 0 422 300"
          className="mx-auto max-w-[420px]"
          title="A series loop of a 12 volt source and two resistors whose voltage drops of 8.76 and 3.24 volts add up to 12 volts"
        >
          <Label x={580} y={18} bold size={13} color={vizColors.muted}>Kirchhoff&apos;s voltage law around the loop</Label>
          <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 420 149 V 60 H 505" />
            <path d="M 565 60 H 650 V 125" />
            <path d="M 650 185 V 250 H 420 V 161" />
          </g>
          <BatterySymbol cx={420} cy={155} />
          <ResistorSymbol cx={535} cy={60} length={60} width={28} />
          <ResistorSymbol cx={650} cy={155} length={60} width={28} vertical />
          <Label x={398} y={155} anchor="end" bold mono>12 V</Label>
          <Label x={535} y={34} mono>R1 = 27 kΩ</Label>
          <Label x={535} y={90} size={12} mono color={vizColors.orange}>−8.76 V</Label>
          <Label x={676} y={148} anchor="start" mono>R2 = 10 kΩ</Label>
          <Label x={676} y={168} anchor="start" size={12} mono color={vizColors.orange}>−3.24 V</Label>
          <Arrow x1={600} y1={250} x2={480} y2={250} color={vizColors.amber} width={2} />
          <Label x={540} y={270} size={12} mono color={vizColors.amber}>I = 12 V / 37 kΩ = 324 µA</Label>
          <Label x={548} y={125} size={12} color={vizColors.muted}>sum of rises and drops = 0</Label>
          <Label x={548} y={150} bold mono color={vizColors.green}>+12 − 8.76 − 3.24 = 0 V</Label>
          <Label x={548} y={175} size={12} color={vizColors.muted}>the loop closes on itself</Label>
        </SvgCanvas>
      </div>
    </div>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="The handful of circuit ideas that carry real boards">
        <Prose>
          <h3>Charge, current, voltage and power</h3>
          <p>
            Everything on a board starts with four quantities. <strong>Current</strong> is charge moving past a point: 1 A is 1 coulomb per
            second, about 6.24 × 10<sup>18</sup> electrons every second. <strong>Voltage</strong> is energy per unit charge: 1 V means each
            coulomb gains or gives up 1 joule. It is always a difference between two points, so every voltage needs a reference, and in a
            circuit that reference is called ground. <strong>Power</strong> is <code>P = V · I</code>, in watts. A 3.3 V rail supplying
            200 mA delivers 0.66 W, and a 2000 mAh, 3.7 V cell stores 7.4 Wh, which is about 26.6 kJ.
          </p>

          <h3>Ohm&apos;s law and where the heat goes</h3>
          <p>
            For a resistor, <code>V = I · R</code>. Put 5 V across 1 kΩ and 5 mA flows. Power can be written three ways,{" "}
            <code>P = V · I = I² · R = V² / R</code>, and which one you reach for depends on what you know. 5 V across 1 kΩ burns 25 mW,
            but 12 V across the same part burns 144 mW, more than a 0603 resistor (100 mW) can take. Check dissipation against the package
            rating, and keep real designs at half the rating or less.
          </p>

          <h3>Kirchhoff&apos;s laws, series and parallel</h3>
          <p>
            <strong>KCL</strong>: the currents flowing into a node sum to zero, because charge cannot pile up at a point.{" "}
            <strong>KVL</strong>: the voltage rises and drops around any closed loop sum to zero. Take a 12 V battery with R1 = 27 kΩ and
            R2 = 10 kΩ in series. The current is 12 V / 37 kΩ = 324 µA, the drops are 8.76 V and 3.24 V, and 12 − 8.76 − 3.24 = 0. Series
            resistances add. Parallel resistances combine as <code>1/R = 1/R1 + 1/R2</code>, so two 10 kΩ parts make 5 kΩ, and the result
            is always smaller than the smallest branch.
          </p>

          <h3>The voltage divider, loading and Thevenin</h3>
          <p>
            Two series resistors tapped in the middle give <code>Vout = Vin · R2 / (R1 + R2)</code>. To scale 12 V down for a 3.3 V ADC
            you want a ratio of 0.275, and 27 kΩ over 10 kΩ gives 3.24 V while drawing 324 µA. But a divider is not an ideal source.{" "}
            <strong>Thevenin&apos;s theorem</strong> says any linear network seen from two terminals behaves like one ideal source in
            series with one resistance, and here that is 3.24 V behind R1 ∥ R2 = 7.3 kΩ.
          </p>
          <p>
            A load RL on the output forms a second divider with that 7.3 kΩ, so the output falls by the factor RL / (RL + 7.3 kΩ). A 1 MΩ
            load costs 0.7%, 100 kΩ costs 6.8%, and 10 kΩ drags the output down to 1.88 V. Keep the load at least 10 times the Thevenin
            resistance for about 10% error and 100 times for about 1%.
          </p>
        </Prose>

        <Callout kind="tip" title="Design for the worst case, not the nominal">
          <p>
            A 12 V lead-acid battery sits at 14.4 V while charging, which turns the 3.24 V above into 3.89 V, over the limit of a 3.3 V pin.
            Size dividers for the highest input, allow for resistor tolerance (±1% parts give about ±2% on the ratio), and add a 100 nF
            capacitor at an ADC pin so the sampling charge has somewhere to come from.
          </p>
        </Callout>

        <Figure caption="The 27 kΩ / 10 kΩ divider and the KVL loop it forms with the battery: the drops across R1 and R2 add up to the 12 V source.">
          <DividerAndKvlFigure />
        </Figure>

        <Prose>
          <h3>Time and frequency: DC, AC, τ = RC and reactance</h3>
          <p>
            DC has constant polarity; AC alternates, and a sine is described by its peak, its frequency and its RMS value,{" "}
            <code>Vrms = Vpk / √2</code>, so 230 V RMS mains peaks at 325 V. Put a resistor in series with a capacitor and the capacitor
            charges as <code>V · (1 − e<sup>−t/RC</sup>)</code>. The product <strong>τ = R · C</strong> is the time constant: after 1τ the
            capacitor is at 63.2%, after 3τ at 95%, and after 5τ at 99.3%, which is why 5τ is the practical settling time. A 10 kΩ resistor
            with a 100 nF capacitor gives τ = 1 ms and settles in 5 ms; the same pair is a low-pass filter with cutoff{" "}
            <code>fc = 1 / (2πRC)</code> = 159 Hz.
          </p>
          <p>
            Capacitors and inductors oppose AC through their <strong>impedance</strong>, which for an ideal part is pure{" "}
            <strong>reactance</strong>. <code>XC = 1 / (2πfC)</code> falls as frequency rises, while <code>XL = 2πfL</code> rises. A 100 nF capacitor is 15.9 kΩ at 100 Hz but only 1.59 Ω at 1 MHz, which is why it shorts fast
            noise to ground, and a 10 µH inductor is 62.8 Ω at 1 MHz. A capacitor blocks DC and passes high frequencies; an inductor does
            the opposite.
          </p>

          <h3>Decibels</h3>
          <p>
            Engineers quote ratios in decibels: <code>dB = 20 · log10(Vout / Vin)</code> for voltage, with 10 · log10 for power. Remember
            four points: +6 dB doubles a voltage, −6 dB halves it, −20 dB is a factor of 10, and −3 dB is ×0.707, the half-power point
            where a filter reaches its cutoff frequency.
          </p>

          <h3>Measuring with a multimeter</h3>
          <p>
            Measure voltage in parallel with the leads in the V jack. A typical meter presents 10 MΩ, so it barely disturbs a 7 kΩ divider
            but would pull a 1 MΩ source down by about 9%. Measure current in series: break the circuit and use the mA or A jack. The meter
            is then close to a short, so leaving the leads there while you probe a supply blows the fuse. Measure resistance and continuity
            only with the board unpowered and the part isolated, otherwise parallel paths give a wrong answer.
          </p>

          <h3>Floating inputs and the ground reference</h3>
          <p>
            A CMOS input connected to nothing floats: it picks up 50 Hz hum from your hand, sits near mid-rail, and may draw extra current
            or read random bits. Every input needs a defined state, so use a pull-up or pull-down (10 kΩ typical, 100 kΩ when power
            matters) on reset, enable, strap and unused gate pins. A voltage also only means something against a reference. All grounds on
            a board are one node by convention, but copper has resistance: 3 A through 10 mΩ of shared ground is 30 mV of ground bounce,
            tens of counts on a 12-bit ADC.
          </p>
        </Prose>
      </Section>

      <Section id="viz" title="Interactive: Ohm's law and the loaded divider">
        <Callout kind="info" title="Try this">
          <ul>
            <li>Ohm&apos;s law: set V to 12 V and R to 68 Ω with the 1/4 W rating. The resistor glows red because P = 2.1 W is 8 times its rating.</li>
            <li>Divider: keep 27 kΩ over 10 kΩ and attach a 100 kΩ load. Vout falls from 3.24 V to 3.02 V, exactly the Thevenin prediction.</li>
            <li>Raise the load to 1 MΩ, then shrink R1 and R2 by 10×. See how a stiffer divider ignores the load but burns ten times the current.</li>
          </ul>
        </Callout>
        <OhmsLawCircuit />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Design a battery-monitor divider">
          <p>
            A 12 V battery must feed a 3.3 V ADC pin through a divider that may draw at most 0.5 mA. Pick standard resistor values, then
            state Vout, the divider current and the Thevenin resistance. Finally check two things: what the output does if the battery
            reaches 14.4 V, and what a 100 kΩ load does to Vout.
          </p>
          <WorkedAnswer>
            <CodeBlock
              lang="text"
              code={[
                "Ratio     3.3 / 12 = 0.275        R1 / R2 = (1 - 0.275) / 0.275 = 2.64",
                "Budget    12 V / 0.5 mA = 24 kΩ minimum total resistance",
                "Pick      R2 = 10 kΩ, R1 = 27 kΩ (nearest E12 value to 26.4 kΩ)",
                "Vout      12 x 10 / (27 + 10) = 3.24 V",
                "Current   12 V / 37 kΩ = 324 µA (under 0.5 mA), P = 3.9 mW",
                "Rth       27k || 10k = 7.3 kΩ (below 10 kΩ, fine for a SAR ADC)",
                "100 kΩ    3.24 x 100 / (100 + 7.3) = 3.02 V, which is 6.8% low",
                "14.4 V    14.4 x 10 / 37 = 3.89 V, above the 3.3 V pin limit",
                "Fix       R1 = 36 kΩ: 14.4 V gives 3.13 V, 12 V gives 2.61 V, Rth = 7.8 kΩ, I = 313 µA",
              ].join("\n")}
            />
            <p>
              27 kΩ / 10 kΩ meets the brief at a nominal 12 V, but a charging lead-acid battery breaks it. Moving R1 to 36 kΩ keeps the
              pin legal up to 14.4 V and still draws only 313 µA; the price is a lower reading at 12 V, which the firmware scales back
              up. Add 100 nF at the pin so the ADC&apos;s sampling charge does not drag the node down.
            </p>
          </WorkedAnswer>
        </Exercise>
      </Section>
    </>
  );
}
