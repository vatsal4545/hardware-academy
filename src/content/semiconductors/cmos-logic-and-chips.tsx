"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { CmosInverter } from "@/components/viz/semiconductors/CmosInverter";

/** Transistor symbol with its channel at x + 10 and source/drain terminals at (x + 30, y ± 40). */
function FetSymbol({ x, y, pmos }: { x: number; y: number; pmos?: boolean }) {
  const c = vizColors.text;
  return (
    <g stroke={c} strokeWidth={1.6} fill="none">
      <line x1={x + 10} y1={y - 20} x2={x + 10} y2={y + 20} strokeWidth={3} stroke={pmos ? vizColors.hole : vizColors.electron} />
      <polyline points={`${x + 10},${y - 14} ${x + 30},${y - 14} ${x + 30},${y - 40}`} />
      <polyline points={`${x + 10},${y + 14} ${x + 30},${y + 14} ${x + 30},${y + 40}`} />
      <line x1={x} y1={y - 16} x2={x} y2={y + 16} strokeWidth={2} />
      {pmos && <circle cx={x - 5} cy={y} r={4} fill={vizColors.bg} />}
      <line x1={pmos ? x - 9 : x} y1={y} x2={x - 30} y2={y} />
    </g>
  );
}

/** Doping-type labels for the diffusions in the cross-section, by x position. */
const DIFFUSION_LABELS: Array<[number, string]> = [
  [246, "p⁺"],
  [283, "n⁺"],
  [363, "n⁺"],
  [429, "p⁺"],
  [509, "p⁺"],
  [557, "n⁺"],
];

/** Static figure: CMOS inverter schematic beside a simplified cross-section of the same circuit. */
function InverterFigure() {
  const top = 140; // silicon surface in the cross-section
  return (
    <SvgCanvas viewBox="0 0 640 300" title="CMOS inverter schematic beside its silicon cross-section">
      <rect x={0} y={0} width={640} height={300} fill={vizColors.bg} rx={8} />

      {/* ---------- schematic ---------- */}
      <Label x={115} y={18} size={12} bold>
        Schematic
      </Label>
      <line x1={70} y1={40} x2={180} y2={40} stroke={vizColors.red} strokeWidth={2.5} />
      <Label x={186} y={40} anchor="start" size={10} color={vizColors.red}>
        VDD
      </Label>
      <line x1={130} y1={40} x2={130} y2={55} stroke={vizColors.text} strokeWidth={1.6} />
      <FetSymbol x={100} y={95} pmos />
      <FetSymbol x={100} y={205} />
      <line x1={130} y1={135} x2={130} y2={165} stroke={vizColors.text} strokeWidth={1.6} />
      <line x1={130} y1={150} x2={190} y2={150} stroke={vizColors.amber} strokeWidth={2} />
      <circle cx={130} cy={150} r={3.5} fill={vizColors.amber} />
      <Label x={194} y={150} anchor="start" size={11} color={vizColors.amber} bold>
        OUT
      </Label>
      <line x1={130} y1={245} x2={130} y2={262} stroke={vizColors.text} strokeWidth={1.6} />
      <line x1={70} y1={262} x2={180} y2={262} stroke={vizColors.text} strokeWidth={2} />
      <Label x={186} y={262} anchor="start" size={10} color={vizColors.muted}>
        GND
      </Label>
      <line x1={70} y1={95} x2={70} y2={205} stroke={vizColors.cyan} strokeWidth={2} />
      <line x1={30} y1={150} x2={70} y2={150} stroke={vizColors.cyan} strokeWidth={2} />
      <Label x={28} y={138} anchor="start" size={11} color={vizColors.cyan} bold>
        IN
      </Label>
      <Label x={146} y={95} anchor="start" size={10} color={vizColors.hole}>
        PMOS
      </Label>
      <Label x={146} y={205} anchor="start" size={10} color={vizColors.electron}>
        NMOS
      </Label>

      <line x1={222} y1={30} x2={222} y2={280} stroke={vizColors.grid} strokeWidth={1.5} />

      {/* ---------- cross-section ---------- */}
      <Label x={430} y={18} size={12} bold>
        Cross-section (same circuit)
      </Label>
      <rect x={230} y={top} width={400} height={130} fill={vizColors.hole} fillOpacity={0.08} stroke={vizColors.muted} strokeOpacity={0.5} />
      <Label x={300} y={255} size={10} color={vizColors.hole}>
        p-type substrate
      </Label>
      <rect x={400} y={top} width={225} height={95} rx={10} fill={vizColors.electron} fillOpacity={0.1} stroke={vizColors.electron} strokeOpacity={0.6} />
      <Label x={590} y={222} size={10} color={vizColors.electron}>
        n-well
      </Label>

      {/* diffusions */}
      <rect x={236} y={top} width={20} height={22} rx={4} fill={vizColors.hole} fillOpacity={0.4} />
      <rect x={266} y={top} width={35} height={26} rx={5} fill={vizColors.electron} fillOpacity={0.35} />
      <rect x={346} y={top} width={35} height={26} rx={5} fill={vizColors.electron} fillOpacity={0.35} />
      <rect x={412} y={top} width={35} height={26} rx={5} fill={vizColors.hole} fillOpacity={0.4} />
      <rect x={492} y={top} width={35} height={26} rx={5} fill={vizColors.hole} fillOpacity={0.4} />
      <rect x={545} y={top} width={25} height={22} rx={4} fill={vizColors.electron} fillOpacity={0.35} />
      {DIFFUSION_LABELS.map(([x, text]) => (
        <Label key={x} x={x} y={top + 13} size={9} color={vizColors.text}>
          {text}
        </Label>
      ))}

      {/* gates over thin oxide */}
      <rect x={301} y={top - 4} width={45} height={4} fill={vizColors.silk} fillOpacity={0.5} />
      <rect x={301} y={top - 20} width={45} height={16} fill={vizColors.violet} fillOpacity={0.4} stroke={vizColors.violet} />
      <rect x={447} y={top - 4} width={45} height={4} fill={vizColors.silk} fillOpacity={0.5} />
      <rect x={447} y={top - 20} width={45} height={16} fill={vizColors.violet} fillOpacity={0.4} stroke={vizColors.violet} />
      <Label x={323} y={top + 40} size={10} color={vizColors.electron}>
        NMOS
      </Label>
      <Label x={469} y={top + 40} size={10} color={vizColors.hole}>
        PMOS
      </Label>

      {/* wiring */}
      <g stroke={vizColors.text} strokeWidth={1.4}>
        <line x1={246} y1={top} x2={246} y2={118} />
        <line x1={283} y1={top} x2={283} y2={118} />
        <line x1={509} y1={top} x2={509} y2={118} />
        <line x1={557} y1={top} x2={557} y2={118} />
      </g>
      <line x1={246} y1={118} x2={283} y2={118} stroke={vizColors.muted} strokeWidth={2} />
      <Label x={264} y={108} size={10} color={vizColors.muted}>
        GND
      </Label>
      <line x1={509} y1={118} x2={557} y2={118} stroke={vizColors.red} strokeWidth={2} />
      <Label x={533} y={108} size={10} color={vizColors.red}>
        VDD
      </Label>
      <g stroke={vizColors.amber} strokeWidth={2}>
        <line x1={363} y1={top} x2={363} y2={106} />
        <line x1={429} y1={top} x2={429} y2={106} />
        <line x1={363} y1={106} x2={429} y2={106} />
      </g>
      <Label x={396} y={96} size={10} color={vizColors.amber} bold>
        OUT
      </Label>
      <g stroke={vizColors.cyan} strokeWidth={2}>
        <line x1={323} y1={top - 20} x2={323} y2={70} />
        <line x1={469} y1={top - 20} x2={469} y2={70} />
        <line x1={323} y1={70} x2={469} y2={70} />
      </g>
      <Label x={396} y={60} size={10} color={vizColors.cyan} bold>
        IN (both gates)
      </Label>
      <Label x={430} y={290} size={9} color={vizColors.muted}>
        Body ties: p⁺ tap to GND, n⁺ well tap to VDD
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From one inverter to tens of billions of transistors">
        <Prose>
          <p>
            CMOS, complementary MOS, pairs n-channel and p-channel MOSFETs. In the simplest gate, the{" "}
            <strong>inverter</strong>, a PMOS connects the output to the supply VDD and an NMOS connects it to ground, and
            one input drives both gates. Input high: the NMOS turns on, the PMOS turns off and the output is pulled to 0 V.
            Input low: the PMOS turns on, the NMOS turns off and the output is pulled to VDD. In either steady state one
            transistor is off, so there is no DC path from supply to ground: a CMOS gate holding a value draws only leakage.
            Frank Wanlass of Fairchild filed the patent in 1963, and by the late 1980s CMOS had replaced NMOS and bipolar
            logic almost everywhere.
          </p>
        </Prose>

        <Figure caption="A CMOS inverter: the schematic (left) and the same circuit in silicon (right). The NMOS sits in the p-type substrate, the PMOS in an n-well; the input drives both gates and the output joins both drains.">
          <InverterFigure />
        </Figure>

        <Prose>
          <h3>Where the power goes</h3>
          <p>
            Power is spent when outputs switch. Charging a load capacitance C (the next gates&apos; inputs plus wiring,
            around 1 fF per gate in a modern process) from 0 to VDD draws energy C·VDD² from the supply: half is stored and
            half burns in the PMOS, and the stored half burns in the NMOS on the way back down. Averaged over a chip,{" "}
            <code>P = α · C · V² · f</code>, where C is the total switchable capacitance, f the clock and α the activity
            factor, the fraction of capacitance that charges each cycle (0.05-0.2 for logic, 1 for the clock tree). A brief
            short-circuit current while both transistors are partly on adds about 10%, and leakage adds static power that
            climbs with temperature.
          </p>
          <p>
            The square makes voltage the strongest knob. Maximum clock frequency is roughly proportional to voltage, so
            lowering both by 10% cuts dynamic power by about 27% (0.9³ = 0.73). That is{" "}
            <strong>dynamic voltage and frequency scaling (DVFS)</strong>: phones and laptops drop to 0.6-0.7 V when lightly
            loaded and raise voltage only for bursts.
          </p>

          <h3>NAND, NOR and sequential logic</h3>
          <p>
            Every CMOS gate is a pull-down network of NMOS transistors plus the mirror-image pull-up network of PMOS. A
            2-input NAND has two NMOS in series (the output goes low only when both inputs are high) and two PMOS in
            parallel: four transistors. NOR swaps the arrangement. Designers prefer NAND because the slower PMOS devices sit
            in parallel rather than in series, and NAND alone can build any logic function.
          </p>
          <p>
            <strong>Combinational</strong> logic, such as adders and multiplexers, computes outputs from current inputs only.{" "}
            <strong>Sequential</strong> logic adds memory: a D flip-flop of about 20 transistors captures its input on a
            clock edge and holds it until the next. A synchronous design moves data from flip-flop to flip-flop once per
            clock period, 333 ps at 3 GHz, and the slowest chain of gates between two flip-flops, the critical path, sets the
            maximum clock.
          </p>

          <h3>From gates to a CPU</h3>
          <p>
            Gates make adders; adders, shifters and multiplexers make an arithmetic logic unit (ALU); add registers,
            instruction decode and control and you have a processor. The Intel 4004 of 1971 had 2,300 transistors on a 10 µm
            process. Apple&apos;s M3 Max (2023) has 92 billion and NVIDIA&apos;s B200 GPU 208 billion across two dies.
          </p>

          <h3>Memory</h3>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Cell</th>
                <th>Speed</th>
                <th>Where and why</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>SRAM</td>
                <td>6 transistors: two cross-coupled inverters plus two access transistors</td>
                <td>about 1 ns</td>
                <td>Caches and registers; no refresh, but about 0.02 µm² per bit even at 3-5 nm</td>
              </tr>
              <tr>
                <td>DRAM</td>
                <td>1 transistor + 1 capacitor (1T1C)</td>
                <td>tens of ns</td>
                <td>Main memory (DDR5, HBM); the charge leaks, so every row is refreshed every 64 ms</td>
              </tr>
              <tr>
                <td>Flash</td>
                <td>1 floating-gate or charge-trap transistor</td>
                <td>tens of µs to read</td>
                <td>SSDs and microcontroller program memory; keeps data unpowered for years; 3D NAND stacks 200+ layers</td>
              </tr>
            </tbody>
          </table>
          <p>
            Flash stores charge on an isolated gate, shifting the transistor&apos;s threshold voltage; a read checks whether
            the cell conducts at a chosen gate voltage. Programming pushes electrons through the oxide by tunneling at about
            15-20 V, which slowly wears it out: about 1,000-3,000 program-erase cycles for TLC NAND, up to 100,000 for SLC.
          </p>

          <h3>What &quot;3 nm&quot; means</h3>
          <p>
            Until the late 1990s a node name matched the gate length: a 0.35 µm process had 0.35 µm gates. Since then it is
            a generation label. TSMC&apos;s 3 nm process has a contacted gate pitch around 45-50 nm and a tightest metal pitch
            around 23 nm; nothing on the chip is 3 nm wide. The meaningful number is density, roughly 1.6× more logic
            transistors per mm² per full node.
          </p>
          <p>
            Shape matters as much as size. Below about 30 nm a <strong>planar</strong> gate, touching the channel only from
            above, could not turn the transistor fully off because the drain&apos;s field leaked into the channel. Intel&apos;s
            22 nm process (2011) introduced the <strong>FinFET</strong>, standing the channel up as a fin 5-8 nm wide with
            the gate on three sides. <strong>Gate-all-around</strong> (GAA) nanosheets wrap the gate around stacked
            horizontal ribbons on all four sides: Samsung&apos;s 3 nm (2022), then TSMC N2 and Intel 18A (2025). Next comes
            CFET, stacking the NMOS directly on the PMOS.
          </p>

          <h3>TDP and thermal limits</h3>
          <p>
            Every watt must leave through the package and cooler. <strong>Thermal design power (TDP)</strong> is the
            sustained power a cooler is built for: about 15-45 W for laptop chips, 65-250 W for desktop CPUs, 700 W for an
            NVIDIA H100 and up to 1,000 W for a B200. Near 100 °C the chip throttles, cutting frequency and voltage. Since
            Dennard scaling ended around 2005, supply voltages have stayed near 0.7-1 V, because thresholds cannot drop
            further without leakage exploding (at best 60 mV per tenfold change in subthreshold current at room
            temperature). Clock speeds stalled at 3-5 GHz, and extra transistors went into more cores, bigger caches and
            specialised accelerators.
          </p>
        </Prose>

        <Callout kind="tip" title="Power rules of thumb">
          <ul>
            <li>Dynamic power ∝ V²·f, so roughly ∝ V³ when frequency tracks voltage.</li>
            <li>+10% voltage at a fixed clock costs +21% dynamic power, before leakage rises.</li>
            <li>An idle block still leaks unless it is power-gated.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: switch the gates">
        <CmosInverter />
        <Prose>
          <p>Things to try:</p>
          <ul>
            <li>Toggle the inverter input: a tall supply-current spike appears only when the output rises.</li>
            <li>
              In NAND mode, set A = 0 and toggle B: the output never changes, so almost no charge moves. That is what a low
              activity factor α looks like.
            </li>
            <li>Raise VDD from 1.0 to 1.1 V at 3 GHz: power goes from 0.30 to 0.36 W, the 21% of the scenario below.</li>
          </ul>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Truth table of a NAND from its transistors">
          <p>
            For a 2-input CMOS NAND (NMOS A and B in series to ground, PMOS A and B in parallel to VDD), work out which
            transistors conduct for each input pair and what the output is.
          </p>
          <CodeBlock
            lang="text"
            code={
              " A B | NMOS A  NMOS B (series) | PMOS A  PMOS B (parallel) | OUT\n" +
              " 0 0 |  off     off   → open   |  on      on    → closed   |  1\n" +
              " 0 1 |  off     on    → open   |  on      off   → closed   |  1\n" +
              " 1 0 |  on      off   → open   |  off     on    → closed   |  1\n" +
              " 1 1 |  on      on    → closed |  off     off   → open     |  0"
            }
          />
          <p>
            <strong>Answer:</strong> OUT = NOT(A AND B). In every row exactly one network conducts, so there is never a DC
            path from VDD to ground, which is why the gate draws no static current.
          </p>
        </Exercise>

        <Exercise title="Dynamic power of a small chip">
          <p>
            A chip has C = 1 nF of total switchable capacitance, runs at V = 1 V and f = 3 GHz, and its activity factor is
            α = 0.1. Compute its dynamic power. Then compute it after a 10% voltage increase at the same clock, and after
            lowering both voltage and frequency by 10%.
          </p>
          <CodeBlock
            lang="text"
            code={
              "P = α · C · V² · f\n" +
              "  = 0.1 × 1e-9 F × (1 V)² × 3e9 Hz   = 0.30 W\n\n" +
              "V = 1.1 V, f = 3 GHz:   0.1 × 1e-9 × 1.21 × 3e9   = 0.363 W   (+21%)\n" +
              "V = 0.9 V, f = 2.7 GHz: 0.1 × 1e-9 × 0.81 × 2.7e9 = 0.219 W   (−27%)"
            }
          />
          <p>
            <strong>Answer:</strong> 0.3 W at nominal, 0.363 W (+21%) with 10% more voltage, and 0.219 W (−27%) when DVFS
            lowers voltage and frequency together. The same arithmetic, scaled up to hundreds of nanofarads, is why a
            desktop CPU lands near 100 W.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
