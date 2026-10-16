"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { SwitchingLossCompare } from "@/components/viz/semiconductors/SwitchingLossCompare";

const metal = "#9ca3af";
const body = vizColors.hole;
const nColor = vizColors.electron;

/** One vertical power-device stack: source metal, body, drift, substrate (with a break), drain metal. */
function DeviceStack({ x, driftH, driftOpacity }: { x: number; driftH: number; driftOpacity: number }) {
  const w = 180;
  const driftTop = 60;
  const subTop = driftTop + driftH;
  return (
    <g>
      <rect x={x} y={40} width={w} height={8} fill={metal} />
      <rect x={x} y={48} width={w} height={12} fill={body} opacity={0.55} />
      <rect x={x + 20} y={48} width={30} height={6} fill={nColor} opacity={0.8} />
      <rect x={x + w - 50} y={48} width={30} height={6} fill={nColor} opacity={0.8} />
      <rect x={x} y={driftTop} width={w} height={driftH} fill={nColor} opacity={driftOpacity} />
      <rect x={x} y={subTop} width={w} height={32} fill={nColor} opacity={0.55} />
      <path
        d={`M${x - 4} ${subTop + 9} l12 -4 l12 8 l12 -8 l12 8 l12 -8 l12 8 l12 -8 l12 8 l12 -8 l12 8 l12 -8 l12 8 l12 -8 l12 8 l12 -4`}
        fill="none"
        stroke={vizColors.bg}
        strokeWidth={4}
      />
      <rect x={x} y={subTop + 32} width={w} height={8} fill={metal} />
      <Label x={x + w / 2} y={subTop + 23} size={10} color={vizColors.bg} bold>
        n⁺ substrate (not to scale)
      </Label>
    </g>
  );
}

function DimBracket({ x, y1, y2, text }: { x: number; y1: number; y2: number; text: string }) {
  return (
    <g>
      <path d={`M${x - 5} ${y1} H${x} V${y2} H${x - 5}`} fill="none" stroke={vizColors.text} strokeWidth={1.5} />
      <Label x={x + 6} y={(y1 + y2) / 2} anchor="start" size={12} bold color={vizColors.text}>
        {text}
      </Label>
    </g>
  );
}

function DriftFigure() {
  const rows: Array<[string, string, string]> = [
    ["Band gap (eV)", "1.12", "3.26"],
    ["Critical field (MV/cm)", "0.3", "≈3"],
    ["Drift width at 1,200 V", "≈100 µm", "≈10 µm"],
    ["Drift doping (cm⁻³)", "1×10¹⁴", "1×10¹⁶"],
    ["Electron mobility (cm²/V·s)", "1,350", "≈900"],
    ["Ideal drift R·A (mΩ·cm²)", "≈460", "≈0.7"],
    ["Thermal conductivity (W/cm·K)", "1.5", "≈3.7"],
  ];
  return (
    <SvgCanvas
      viewBox="0 0 640 330"
      title="Drift region thickness for a 1,200 V device: about 100 µm in silicon versus about 10 µm in silicon carbide"
    >
      <rect x={0} y={0} width={640} height={330} fill={vizColors.bg} />
      <Label x={170} y={22} size={13} bold color={vizColors.text}>
        Silicon, 1,200 V
      </Label>
      <Label x={470} y={22} size={13} bold color={vizColors.violet}>
        4H-SiC, 1,200 V
      </Label>

      <DeviceStack x={80} driftH={200} driftOpacity={0.16} />
      <Label x={170} y={150} size={12} color={vizColors.text}>
        n⁻ drift region
      </Label>
      <Label x={170} y={168} size={11} color={vizColors.muted}>
        N
        <tspan dy={3} fontSize={8}>
          D
        </tspan>
        <tspan dy={-3}> ≈ 1×10¹⁴ cm⁻³</tspan>
      </Label>
      <DimBracket x={272} y1={60} y2={260} text="≈100 µm" />

      <DeviceStack x={380} driftH={20} driftOpacity={0.4} />
      <DimBracket x={572} y1={60} y2={80} text="≈10 µm" />

      <Label x={170} y={318} size={11} color={vizColors.muted}>
        Same 1,200 V across both: V ≈ ½·E
        <tspan dy={3} fontSize={8}>
          c
        </tspan>
        <tspan dy={-3}>·W</tspan>
      </Label>

      <g>
        <Label x={350} y={150} anchor="start" size={11} color={vizColors.muted}>
          Property
        </Label>
        <Label x={565} y={150} anchor="end" size={11} bold color={vizColors.text}>
          Si
        </Label>
        <Label x={628} y={150} anchor="end" size={11} bold color={vizColors.violet}>
          SiC
        </Label>
        <line x1={350} y1={164} x2={628} y2={164} stroke={vizColors.grid} />
        {rows.map(([label, si, sic], k) => (
          <g key={label}>
            <Label x={350} y={178 + k * 20} anchor="start" size={11} color={vizColors.text}>
              {label}
            </Label>
            <Label x={565} y={178 + k * 20} anchor="end" size={11} color={vizColors.text} mono>
              {si}
            </Label>
            <Label x={628} y={178 + k * 20} anchor="end" size={11} color={vizColors.violet} mono>
              {sic}
            </Label>
          </g>
        ))}
      </g>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Why EVs moved to SiC and chargers to GaN">
        <Prose>
          <p>
            Every inverter, charger and DC-DC converter chops current with switches that are either fully on or fully
            off, thousands to millions of times per second. A good power switch blocks high voltage when off, carries
            high current with little voltage drop when on, and moves between the two quickly. Its headline datasheet
            numbers are the blocking voltage (650-750 V parts for 400 V EV batteries, 1,200 V parts for 800 V
            batteries, leaving room for overshoot), the on-resistance Rds(on) or on-voltage Vce(sat), and the switching
            energies Eon and Eoff.
          </p>

          <h3>Two kinds of loss</h3>
          <p>
            Conduction loss is heat while the switch is on: P = I<sub>rms</sub>²·Rds(on) for a MOSFET. Switching loss
            comes from each transition, when voltage and current overlap for a few nanoseconds to a microsecond. Each
            event costs roughly ½·V·I·t<sub>transition</sub>, so P<sub>sw</sub> = (Eon + Eoff)·f. Conduction loss grows
            with current and temperature; switching loss grows in proportion to frequency. Designers want high
            frequency because inductors, transformers and capacitors shrink as frequency rises, so the switch that
            wastes less energy per transition wins on size and cost.
          </p>

          <h3>Why silicon runs out of breath</h3>
          <p>
            To block voltage, a power device has a thick, lightly doped drift region that holds the electric field when
            off. Silicon breaks down at about 0.3 MV/cm, so a 1,200 V device needs roughly 100 µm of drift doped near
            10¹⁴ cm⁻³, and that layer is resistive when the device is on. For unipolar devices, specific on-resistance
            rises with about the 2.5 power of blocking voltage (Baliga’s silicon limit). Superjunction MOSFETs such as
            Infineon’s CoolMOS bend that curve up to 600-900 V, but above that silicon needs a different trick.
          </p>

          <h3>IGBT versus MOSFET</h3>
          <p>
            The IGBT adds a p⁺ collector under a MOSFET structure. When on, it injects holes that flood the drift
            region with carriers (conductivity modulation), so a 1,200 V IGBT carries hundreds of amps at only 1.5-2 V.
            The price is paid at turn-off: the stored carriers must recombine, so current tails off for about a
            microsecond while the voltage is already high. That tail makes Eoff large and keeps IGBTs at roughly 2-20
            kHz; IGBT traction inverters typically switch near 10 kHz. IGBTs also have a knee of about 0.7 V before
            current flows, which wastes power at light load, and their separate anti-parallel diode adds
            reverse-recovery loss. A MOSFET has no knee, no tail and a built-in body diode, but in silicon its drift
            resistance limits it to lower voltages.
          </p>
        </Prose>

        <Figure caption="Blocking 1,200 V: silicon needs about 100 µm of lightly doped drift region; 4H-SiC, with a 10× higher critical field, needs about 10 µm doped 100× more heavily, so its ideal drift resistance is hundreds of times lower. Substrates are drawn short.">
          <DriftFigure />
        </Figure>

        <Prose>
          <h3>Silicon carbide</h3>
          <p>
            4H-SiC has a band gap of 3.26 eV, about ten times silicon’s critical field and more than twice its thermal
            conductivity. For the same 1,200 V rating, the drift region can be about 10 µm thick instead of 100 µm and
            doped about 100× more heavily, so the ideal drift resistance drops by several hundred times. That makes
            1,200 V SiC MOSFETs practical: unipolar, fast, no tail current, and rated for 175-200 °C junctions. Tesla’s
            Model 3, launched in 2017, was the first high-volume car with a SiC main inverter, using 24 SiC MOSFET
            modules from STMicroelectronics. With no knee voltage, SiC gains most at the partial loads where cars spend
            most of their time, commonly credited with several percent more range. 800 V platforms such as the Porsche
            Taycan, Hyundai Ioniq 5 and Lucid Air need 1,200 V-class switches, and SiC has taken most new 800 V
            inverter designs. Its weaknesses are cost and maturity: substrates are hard to grow, wafers are moving from
            150 mm to 200 mm (Wolfspeed opened the first 200 mm SiC fab in 2022), and gate-oxide reliability needs
            careful qualification.
          </p>

          <h3>Gallium nitride</h3>
          <p>
            GaN (band gap 3.4 eV) is usually built as a lateral HEMT on an ordinary silicon wafer. A thin AlGaN layer on
            GaN creates a two-dimensional electron gas with mobility near 2,000 cm²/V·s, without any doping. GaN HEMTs
            have tiny gate charge and no body diode, so no reverse recovery; they switch in a few nanoseconds and run
            converters at hundreds of kHz to a few MHz. That is why GaN took over compact USB-C chargers after Anker’s
            2018 Atom PD 1 used a Navitas chip: higher frequency shrinks the transformer. Most GaN power parts are 650 V
            or 100-200 V because the lateral structure makes very high voltage harder.
          </p>

          <h3>Faster edges, louder EMI</h3>
          <p>
            Speed has a cost. SiC edges reach 20-50 V/ns and GaN about 100 V/ns, versus 3-10 V/ns for IGBTs. Every stray
            capacitance turns dv/dt into current (i = C·dv/dt): 100 pF from a motor winding to its frame at 50 V/ns
            carries 5 A spikes through bearings, shields and signal grounds. Loop inductance rings with device
            capacitance, and 10 nH at 5 A/ns gives 50 V of overshoot (V = L·di/dt). Designers trade speed against EMI
            with gate resistors, Kelvin-source connections, laminated busbars, snubbers and common-mode chokes.
          </p>

          <h3>Cost and suppliers</h3>
          <p>
            Silicon IGBTs remain the cheapest per amp; SiC dies cost roughly two to three times as much for a similar
            rating, but can save on cooling, battery and magnetics. SiC comes from STMicroelectronics, Infineon,
            Wolfspeed, onsemi and Rohm; GaN from Navitas, Innoscience, EPC, Infineon (which bought GaN Systems in 2023)
            and Texas Instruments.
          </p>
        </Prose>

        <Callout kind="tip" title="Rule of thumb">
          Silicon for low cost below about 600 V, SiC for 650-1,700 V at high power, GaN for fast, compact converters up
          to 650 V.
        </Callout>
        <Callout kind="interview" title="Interview angle">
          When asked to pick a device, compute both losses at the hot junction temperature, then mention the cost of
          speed: dv/dt, EMI and gate-drive layout.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: watch the losses move">
        <SwitchingLossCompare />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Losses in one inverter switch">
          <p>
            A SiC MOSFET carries 100 A RMS and switches at 10 kHz. At 25 °C its Rds(on) is 10 mΩ and its Eon + Eoff is
            1 mJ at this current. (1) Compute conduction and switching loss. (2) Repeat with the 150 °C Rds(on) of 14 mΩ.
            (3) Compare an IGBT with Vce(sat) = 1.5 V and Esw = 5 mJ. (4) At what frequency do the IGBT’s switching
            losses equal its conduction losses?
          </p>
          <CodeBlock
            lang="text"
            code={[
              "(1) P_cond = I²·Rds(on) = 100² × 0.010 = 100 W",
              "    P_sw   = Esw·f      = 1 mJ × 10,000 /s = 10 W      → total 110 W",
              "",
              "(2) Hot: P_cond = 100² × 0.014 = 140 W                → total 150 W",
              "",
              "(3) IGBT: P_cond ≈ Vce(sat)·I = 1.5 × 100 = 150 W",
              "          P_sw   = 5 mJ × 10,000 /s = 50 W            → total 200 W",
              "",
              "(4) 5 mJ × f = 150 W  →  f = 30 kHz",
              "    Above that, the IGBT spends more energy switching than conducting.",
            ].join("\n")}
          />
          <p>
            Check part (1) in the visualization: set 100 A, 10 kHz and 25 °C, and the SiC bars read exactly 100 W and
            10 W. Then slide the temperature up and watch the conduction bar grow.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
