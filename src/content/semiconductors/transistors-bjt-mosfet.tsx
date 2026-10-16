"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { MosfetCrossSection } from "@/components/viz/semiconductors/MosfetCrossSection";

/** Static figure: a labelled NMOS cross-section with its channel switched on. */
function NmosFigure() {
  const surf = 128;
  return (
    <SvgCanvas viewBox="0 0 600 300" title="Labelled cross-section of an n-channel MOSFET">
      <rect x={0} y={0} width={600} height={300} fill={vizColors.bg} rx={8} />

      {/* body, wells, depletion */}
      <rect x={40} y={surf} width={520} height={140} fill={vizColors.hole} fillOpacity={0.08} stroke={vizColors.muted} strokeOpacity={0.5} />
      <path
        d={`M 62 ${surf} V ${surf + 66} H 198 V ${surf + 18} H 402 V ${surf + 66} H 538 V ${surf}`}
        fill="none"
        stroke={vizColors.muted}
        strokeDasharray="4 4"
      />
      <rect x={70} y={surf} width={120} height={56} rx={8} fill={vizColors.electron} fillOpacity={0.22} stroke={vizColors.electron} />
      <rect x={410} y={surf} width={120} height={56} rx={8} fill={vizColors.electron} fillOpacity={0.22} stroke={vizColors.electron} />
      <Label x={130} y={surf + 30} size={12} color={vizColors.electron} bold>
        n⁺ source
      </Label>
      <Label x={470} y={surf + 30} size={12} color={vizColors.electron} bold>
        n⁺ drain
      </Label>

      {/* channel */}
      <rect x={190} y={surf} width={220} height={6} fill={vizColors.electron} fillOpacity={0.85} />
      {Array.from({ length: 11 }, (_, i) => (
        <circle key={i} cx={200 + i * 20} cy={surf + 3} r={2.2} fill={vizColors.bg} />
      ))}

      {/* oxide, gate, contacts */}
      <rect x={190} y={surf - 10} width={220} height={10} fill={vizColors.silk} fillOpacity={0.45} />
      <rect x={190} y={surf - 52} width={220} height={42} fill={vizColors.violet} fillOpacity={0.3} stroke={vizColors.violet} />
      <Label x={300} y={surf - 31} size={12} color={vizColors.violet} bold>
        gate (poly-Si or metal)
      </Label>
      <rect x={100} y={surf - 18} width={60} height={18} fill={vizColors.silk} fillOpacity={0.6} />
      <rect x={440} y={surf - 18} width={60} height={18} fill={vizColors.silk} fillOpacity={0.6} />
      <rect x={280} y={surf - 66} width={40} height={14} fill={vizColors.silk} fillOpacity={0.6} />
      <rect x={275} y={surf + 140} width={50} height={8} fill={vizColors.silk} fillOpacity={0.6} />
      <Label x={130} y={surf - 30} size={13} bold>
        S
      </Label>
      <Label x={470} y={surf - 30} size={13} bold>
        D
      </Label>
      <Label x={300} y={surf - 78} size={13} bold>
        G
      </Label>
      <Label x={300} y={surf + 160} size={11} color={vizColors.muted}>
        B (body), usually tied to S
      </Label>

      {/* callouts */}
      <Arrow x1={520} y1={40} x2={404} y2={surf - 6} color={vizColors.silk} width={1.2} head={6} />
      <Label x={590} y={28} anchor="end" size={10} color={vizColors.silk}>
        gate oxide: ~1 nm (logic) to ~50 nm (power)
      </Label>
      <Arrow x1={140} y1={surf + 96} x2={196} y2={surf + 6} color={vizColors.electron} width={1.2} head={6} />
      <Label x={50} y={surf + 104} anchor="start" size={10} color={vizColors.electron}>
        inversion channel, a few nm deep (Vgs &gt; Vth)
      </Label>
      <Label x={470} y={surf + 80} size={10} color={vizColors.muted}>
        depletion edge
      </Label>
      <Label x={300} y={surf + 118} size={11} color={vizColors.hole}>
        p-type body
      </Label>
      <line x1={190} y1={surf + 40} x2={410} y2={surf + 40} stroke={vizColors.amber} strokeWidth={1.2} />
      <line x1={190} y1={surf + 34} x2={190} y2={surf + 46} stroke={vizColors.amber} strokeWidth={1.2} />
      <line x1={410} y1={surf + 34} x2={410} y2={surf + 46} stroke={vizColors.amber} strokeWidth={1.2} />
      <Label x={300} y={surf + 52} size={10} color={vizColors.amber}>
        channel length L
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="A valve for electrons">
        <Prose>
          <p>
            A transistor lets a small signal control a large current, so it can amplify or switch. John Bardeen and Walter
            Brattain built the first one, a germanium point-contact device, at Bell Labs in December 1947; William
            Shockley&apos;s junction transistor followed in 1948, and Mohamed Atalla and Dawon Kahng demonstrated the MOSFET
            in 1959. The bipolar transistor survives in analog and RF niches, while MOSFETs are essentially every transistor
            in a processor: an estimated 1.3 × 10²² had been made by 2018, more than any other manufactured object.
          </p>

          <h3>The bipolar junction transistor</h3>
          <p>
            An NPN BJT is two junctions back to back: a heavily doped n⁺ emitter, a thin p-type base (well under 1 µm in
            modern parts) and an n-type collector. Forward-bias the base-emitter junction, Vbe ≈ 0.6-0.7 V at milliamp
            currents, and the emitter injects electrons into the base. The base is so thin that about 99% of them diffuse
            across before recombining, and the reverse-biased collector junction sweeps them up. The small base current
            that does flow sets the collector current: <code>Ic = β · Ib</code>, with β (also written hFE) between 50 and
            300. A 2N3904 specifies 100-300 at 10 mA.
          </p>
          <ul>
            <li>
              <strong>Cutoff:</strong> Vbe below about 0.5 V; no collector current.
            </li>
            <li>
              <strong>Active:</strong> Vce above about 0.3 V and Ic = β·Ib; Ic rises tenfold per 60 mV of Vbe. Amplifiers
              live here.
            </li>
            <li>
              <strong>Saturation:</strong> both junctions forward-biased, Vce(sat) ≈ 0.1-0.2 V; a closed switch. Designers
              overdrive the base with a forced β of about 10 to get there reliably.
            </li>
          </ul>
          <p>
            The catch is that a BJT needs base current the whole time it is on: 10 mA of collector current at β = 100 takes
            0.1 mA of continuous drive, and β itself varies two to three times between parts.
          </p>

          <h3>The MOSFET</h3>
          <p>
            An n-channel MOSFET (NMOS) starts with a p-type body. Two n⁺ regions, the source and drain, sit a channel length
            L apart, and above the gap lies a gate electrode separated from the silicon by a thin insulator: SiO₂, or
            hafnium oxide with an equivalent thickness near 1 nm in modern logic, or tens of nanometres in power MOSFETs.
            Because the gate is insulated it draws essentially no DC current; the MOSFET is controlled by voltage.
          </p>
          <p>
            With Vgs = 0 the source-body-drain path is two back-to-back diodes and nothing flows. Raise Vgs and the gate
            field first pushes holes away from the surface, then pulls electrons in. At the{" "}
            <strong>threshold voltage</strong> Vth the surface inverts: electrons outnumber the body&apos;s holes and form a
            channel a few nanometres deep from source to drain. Vth is about 0.3-0.5 V in logic transistors, 1-2 V in
            logic-level power MOSFETs and 2-4 V in standard power parts.
          </p>
        </Prose>

        <Figure caption="An n-channel MOSFET. A positive gate voltage above Vth inverts the surface of the p-type body into an electron channel that connects the n⁺ source and drain.">
          <NmosFigure />
        </Figure>

        <Prose>
          <h3>Three regions</h3>
          <ul>
            <li>
              <strong>Cutoff</strong> (Vgs &lt; Vth): no channel. Only subthreshold leakage flows, falling about tenfold for
              every 70-100 mV below Vth.
            </li>
            <li>
              <strong>Triode or linear</strong> (Vds &lt; Vgs − Vth): the channel reaches the drain and acts as a resistor
              set by the gate, <code>I_D = μCox(W/L)[(Vgs − Vth)Vds − Vds²/2]</code>. A switch should sit here.
            </li>
            <li>
              <strong>Saturation</strong> (Vds ≥ Vgs − Vth): the channel pinches off near the drain and the current levels
              out at <code>I_D = ½ μCox(W/L)(Vgs − Vth)²</code>. Amplifiers live here.
            </li>
          </ul>
          <p>
            Mind the vocabulary: &quot;saturation&quot; means a fully-on switch for a BJT but the constant-current region
            for a MOSFET.
          </p>

          <h3>MOSFETs as switches</h3>
          <p>
            Three datasheet numbers matter. <strong>Rds(on)</strong> is the channel resistance when fully on, specified at
            stated gate voltages: the IRLML6344 is rated 29 mΩ at Vgs = 4.5 V and 37 mΩ at 2.5 V. Conduction loss is
            I²·Rds(on), and Rds(on) rises about 1.5× between 25 °C and 125 °C. <strong>Vgs(th)</strong> is defined at a
            tiny current, typically 250 µA: it marks where conduction starts, not where the part is on.{" "}
            <strong>Gate charge</strong> Qg is what the driver must deliver: 10 nC from an MCU pin sourcing 20 mA takes
            0.5 µs, while a 2 A gate driver does it in 5 ns. Logic-level parts guarantee Rds(on) at 4.5 V or 2.5 V so a
            microcontroller can drive them directly.
          </p>
          <p>
            MOSFETs won for three reasons. They are voltage-controlled, so a gate holding a logic state draws no static
            current. They shrink well: Robert Dennard showed in 1974 that scaling dimensions and voltages together keeps
            power density constant while speed rises. And n- and p-channel devices sit side by side in one process, which
            makes CMOS logic possible. BJTs remain in precision analog circuits such as bandgap references, in RF as SiGe
            heterojunction transistors, and, with a MOS gate added, as the IGBTs in many high-power inverters.
          </p>

          <h3>Power MOSFETs and gate driving</h3>
          <p>
            A discrete power MOSFET turns the structure on its side. Current flows from source contacts on top through
            thousands of channel cells in parallel (planar or trench), then down through a lightly doped n⁻ drift region to
            the drain on the back of the die. The drift region sets the voltage rating and the parallel cells give
            milliohm resistance. Because the p-body is tied to the source, every power MOSFET also contains a{" "}
            <strong>body diode</strong> from source to drain. It conducts whenever the drain is pulled below the source,
            which H-bridges use for freewheeling, and it has the reverse recovery of any PN diode.
          </p>
          <p>
            The gate is a capacitor of a few nanocoulombs, so a good drive circuit has a series resistor of a few to tens of
            ohms to tame ringing, a 10-100 kΩ pull-down to keep the part off while the microcontroller is still in reset,
            and enough voltage to reach the Rds(on) rating without exceeding the absolute maximum Vgs, typically ±20 V, or
            ±12 V for many logic-level parts.
          </p>
        </Prose>

        <Callout kind="warning" title="Vgs(th) is not 'on'">
          <p>
            A MOSFET at Vgs(th) passes only about 250 µA. Driving a part rated at 10 V from a 3.3 V pin leaves it half on,
            in the region where it dissipates the most.
          </p>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: open the channel">
        <MosfetCrossSection />
        <Prose>
          <p>Things to try:</p>
          <ul>
            <li>Hold V_DS at 0.5 V and raise V_GS from 1.5 V to 5 V: the on-resistance falls from kilohms to 143 Ω.</li>
            <li>
              At V_GS = 3 V, sweep V_DS: the current rises until 1.5 V, then flattens as the channel pinches off at the
              drain.
            </li>
            <li>
              Compare the channel power at V_GS = 5 V, V_DS = 0.5 V (triode, about 1.7 mW) with V_GS = 2.5 V, V_DS = 5 V
              (saturation, about 6 mW): the half-on transistor passes less current yet burns more than three times the power.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Pick a MOSFET for a 2 A motor on a 3.3 V microcontroller">
          <p>
            A 12 V DC motor draws 2 A while running and is switched by a 3.3 V GPIO. Choose a low-side N-channel MOSFET,
            estimate its loss, and list the parts around it.
          </p>
          <CodeBlock
            lang="text"
            code={
              "Requirements\n" +
              "  Vds rating      ≥ 2 × 12 V             → 30 V class\n" +
              "  Gate            Vgs(th) max < 2 V, Rds(on) specified at Vgs = 2.5 V\n" +
              "  Current         ≥ 2 × running current, survive the stall current\n\n" +
              "Candidate: IRLML6344 (30 V, 5 A, SOT-23, Vgs(th) 0.5-1.1 V)\n" +
              "  Rds(on) at 2.5 V  = 37 mΩ max\n" +
              "  P (25 °C)          = I² × R = 2² × 0.037 = 0.15 W\n" +
              "  P (hot, ×1.5)      = 0.22 W\n" +
              "  ΔT (~100 °C/W pad) ≈ +22 °C\n\n" +
              "PWM at 20 kHz, Qg ≈ 5 nC from a 20 mA pin → edges ≈ 0.25 µs\n" +
              "  P_sw ≈ ½ × V × I × (t_r + t_f) × f = ½ × 12 × 2 × 0.5e-6 × 20e3 = 0.12 W"
            }
          />
          <p>
            <strong>Answer:</strong> a logic-level 30 V part such as the IRLML6344 dissipates about 0.15-0.22 W in
            conduction, comfortable on a SOT-23 with a modest copper pad. Add a Schottky flyback diode across the motor, a
            100 Ω gate resistor and a 100 kΩ pull-down. For on/off control or PWM up to a few kHz the GPIO can drive the gate
            directly; at 20 kHz switching loss rivals conduction loss, so a small gate driver earns its place. If the motor
            can stall at 6 A, conduction loss jumps ninefold, so size for stall or add current limiting.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
