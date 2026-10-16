"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { BandDiagram } from "@/components/viz/semiconductors/BandDiagram";

const PANEL_W = 190;

function EnergyAxis({ x }: { x: number }) {
  return (
    <g>
      <line x1={x} y1={214} x2={x} y2={44} stroke={vizColors.muted} strokeWidth={1.2} />
      <polygon points={`${x},36 ${x - 4},45 ${x + 4},45`} fill={vizColors.muted} />
      <Label x={x - 9} y={128} size={9} color={vizColors.muted} rotate={-90}>
        Energy
      </Label>
    </g>
  );
}

function Dots({ x0, x1, y, color, n }: { x0: number; x1: number; y: number; color: string; n: number }) {
  const step = (x1 - x0) / (n - 1);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={x0 + i * step} cy={y} r={3} fill={color} />
      ))}
    </g>
  );
}

/** Static figure: metal, semiconductor and insulator band structures side by side. */
function BandStructuresFigure() {
  const metalX = 10;
  const semiX = metalX + PANEL_W + 5;
  const insX = semiX + PANEL_W + 5;
  return (
    <SvgCanvas viewBox="0 0 590 270" title="Band diagrams of a metal, a semiconductor and an insulator">
      <rect x={0} y={0} width={590} height={270} fill={vizColors.bg} rx={8} />

      {/* Metal: overlapping, partly filled bands */}
      <g>
        <Label x={metalX + PANEL_W / 2} y={18} size={13} bold>
          Metal (copper)
        </Label>
        <EnergyAxis x={metalX + 22} />
        <rect x={metalX + 40} y={112} width={86} height={100} fill={vizColors.blue} fillOpacity={0.15} stroke={vizColors.blue} rx={3} />
        <rect x={metalX + 92} y={52} width={86} height={100} fill={vizColors.cyan} fillOpacity={0.1} stroke={vizColors.cyan} rx={3} />
        <rect x={metalX + 40} y={132} width={86} height={80} fill={vizColors.electron} fillOpacity={0.35} />
        <rect x={metalX + 92} y={132} width={86} height={20} fill={vizColors.electron} fillOpacity={0.35} />
        <line x1={metalX + 34} y1={132} x2={metalX + 184} y2={132} stroke={vizColors.amber} strokeDasharray="5 4" strokeWidth={1.5} />
        <Label x={metalX + 150} y={124} size={10} color={vizColors.amber}>
          E_F
        </Label>
        <Label x={metalX + PANEL_W / 2 + 6} y={234} size={10} color={vizColors.text}>
          Bands overlap, partly filled
        </Label>
        <Label x={metalX + PANEL_W / 2 + 6} y={250} size={10} color={vizColors.muted}>
          8.5 × 10²² free electrons/cm³
        </Label>
      </g>

      {/* Semiconductor: 1.12 eV gap, a few excited carriers */}
      <g>
        <Label x={semiX + PANEL_W / 2} y={18} size={13} bold>
          Semiconductor (Si)
        </Label>
        <EnergyAxis x={semiX + 22} />
        <rect x={semiX + 40} y={52} width={140} height={56} fill={vizColors.cyan} fillOpacity={0.1} stroke={vizColors.cyan} rx={3} />
        <rect x={semiX + 40} y={156} width={140} height={56} fill={vizColors.blue} fillOpacity={0.15} stroke={vizColors.blue} rx={3} />
        <Dots x0={semiX + 50} x1={semiX + 170} y={170} color={vizColors.electron} n={11} />
        <Dots x0={semiX + 50} x1={semiX + 170} y={186} color={vizColors.electron} n={11} />
        <Dots x0={semiX + 50} x1={semiX + 170} y={202} color={vizColors.electron} n={11} />
        {/* two excited electrons and their holes */}
        <circle cx={semiX + 74} cy={92} r={3.4} fill={vizColors.electron} />
        <circle cx={semiX + 146} cy={82} r={3.4} fill={vizColors.electron} />
        <circle cx={semiX + 74} cy={170} r={4.2} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={1.8} />
        <circle cx={semiX + 146} cy={170} r={4.2} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={1.8} />
        <Arrow x1={semiX + 74} y1={163} x2={semiX + 74} y2={100} color={vizColors.electron} width={1.2} head={6} dashed />
        <line x1={semiX + 112} y1={110} x2={semiX + 112} y2={154} stroke={vizColors.violet} strokeWidth={1.2} />
        <Label x={semiX + 118} y={132} anchor="start" size={11} color={vizColors.violet} bold>
          Eg = 1.12 eV
        </Label>
        <Label x={semiX + PANEL_W / 2 + 6} y={234} size={10} color={vizColors.text}>
          Small gap: heat frees a few carriers
        </Label>
        <Label x={semiX + PANEL_W / 2 + 6} y={250} size={10} color={vizColors.muted}>
          n_i ≈ 1 × 10¹⁰ cm⁻³ at 300 K
        </Label>
      </g>

      {/* Insulator: ~9 eV gap, nothing crosses */}
      <g>
        <Label x={insX + PANEL_W / 2} y={18} size={13} bold>
          Insulator (SiO₂)
        </Label>
        <EnergyAxis x={insX + 22} />
        <rect x={insX + 40} y={40} width={140} height={34} fill={vizColors.cyan} fillOpacity={0.1} stroke={vizColors.cyan} rx={3} />
        <rect x={insX + 40} y={178} width={140} height={34} fill={vizColors.blue} fillOpacity={0.15} stroke={vizColors.blue} rx={3} />
        <Dots x0={insX + 50} x1={insX + 170} y={189} color={vizColors.electron} n={11} />
        <Dots x0={insX + 50} x1={insX + 170} y={203} color={vizColors.electron} n={11} />
        <line x1={insX + 112} y1={76} x2={insX + 112} y2={176} stroke={vizColors.violet} strokeWidth={1.2} />
        <Label x={insX + 118} y={126} anchor="start" size={11} color={vizColors.violet} bold>
          Eg ≈ 9 eV
        </Label>
        <Label x={insX + PANEL_W / 2 + 6} y={234} size={10} color={vizColors.text}>
          Huge gap: nothing gets across
        </Label>
        <Label x={insX + PANEL_W / 2 + 6} y={250} size={10} color={vizColors.muted}>
          kT = 0.026 eV is hopeless
        </Label>
      </g>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Why silicon sits between copper and glass">
        <Prose>
          <p>
            Silicon has atomic number 14. Ten of its electrons sit in tightly bound inner shells and four sit in the outer,
            or valence, shell. Like carbon and germanium in the same column of the periodic table, each silicon atom shares
            those four electrons with four neighbours, forming covalent bonds at 109.5° to one another. Repeat that in three
            dimensions and you get the <strong>diamond cubic lattice</strong>: a cube 0.543 nm on a side, 5 × 10²² atoms
            per cm³, and every bond holding exactly two electrons. At absolute zero every valence electron is locked into a
            bond, and pure silicon is a perfect insulator.
          </p>

          <h3>From energy levels to energy bands</h3>
          <p>
            An isolated atom has sharp, discrete energy levels. Bring two atoms together and each level splits in two,
            because the Pauli exclusion principle forbids two electrons from sharing one state. A sugar-cube-sized crystal
            holds about 10²² atoms, so each level splits into that many sublevels, packed so closely that they form a
            continuous <strong>band</strong>. In silicon the outer 3s and 3p levels mix and split into two bands with a
            forbidden range of energy between them:
          </p>
          <ul>
            <li>
              <strong>Valence band:</strong> the bonding states. With four electrons per atom it is exactly full at 0 K.
            </li>
            <li>
              <strong>Conduction band:</strong> the antibonding states, empty at 0 K. An electron promoted here can roam
              the whole crystal.
            </li>
            <li>
              <strong>Band gap (Eg):</strong> the energy from the top of the valence band to the bottom of the conduction
              band, 1.12 eV for silicon at 300 K.
            </li>
          </ul>
          <p>
            A completely full band cannot carry a net current: for every electron moving one way another moves the other
            way, and there are no empty states to shift into. Conduction needs a partly filled band. When an electron
            jumps the gap it becomes free in the conduction band and leaves an empty state, a <strong>hole</strong>,
            behind in the valence band, and the hole lets that band conduct as well. Every thermal jump therefore creates
            two carriers.
          </p>
        </Prose>

        <Figure caption="Metal, semiconductor and insulator band structures. The gaps are not drawn to the same scale: SiO₂'s 9 eV gap is eight times silicon's.">
          <BandStructuresFigure />
        </Figure>

        <Prose>
          <h3>Metals, semiconductors and insulators</h3>
          <p>
            In copper the bands overlap and the highest occupied band is only partly filled, so about 8.5 × 10²² free
            electrons per cm³ conduct at any temperature, giving a resistivity of 1.7 µΩ·cm. In SiO₂ the gap is about
            9 eV, and the thermal energy at room temperature, kT = 25.9 meV, is hopeless against it. Semiconductors sit in
            between with gaps of roughly 0.5 to 3.5 eV: small enough that heat, light or impurity atoms can put carriers
            into the conduction band in a controlled way.
          </p>
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Eg at 300 K</th>
                <th>Where you meet it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Germanium (Ge)</td>
                <td>0.66 eV</td>
                <td>The first transistors (Bell Labs, 1947), infrared detectors, SiGe in RF chips</td>
              </tr>
              <tr>
                <td>Silicon (Si)</td>
                <td>1.12 eV</td>
                <td>More than 90% of all chips, solar cells, power MOSFETs and IGBTs</td>
              </tr>
              <tr>
                <td>Gallium arsenide (GaAs)</td>
                <td>1.42 eV, direct</td>
                <td>Phone RF power amplifiers, laser diodes, space solar cells</td>
              </tr>
              <tr>
                <td>Silicon carbide (4H-SiC)</td>
                <td>3.26 eV</td>
                <td>1200 V MOSFETs in EV traction inverters and fast chargers</td>
              </tr>
              <tr>
                <td>Gallium nitride (GaN)</td>
                <td>3.4 eV, direct</td>
                <td>Blue and white LEDs, 65 W USB-C chargers, 5G radio amplifiers</td>
              </tr>
              <tr>
                <td>Silicon dioxide (SiO₂)</td>
                <td>about 9 eV</td>
                <td>Insulator and gate oxide, grown directly on silicon</td>
              </tr>
            </tbody>
          </table>

          <h3>Temperature: the exponential that rules everything</h3>
          <p>
            The density of electrons that make the jump in pure, or intrinsic, material is the{" "}
            <strong>intrinsic carrier density</strong>, <code>n_i ∝ T^1.5 · exp(−Eg / 2kT)</code>. The factor of 2
            appears because each jump makes an electron and a hole, and they recombine in pairs. For silicon at 300 K,
            Eg/2kT ≈ 21.7 and n_i ≈ 1 × 10¹⁰ cm⁻³: one free electron for every five trillion atoms. Germanium, with
            about half the gap, has 2 × 10¹³ cm⁻³; GaAs about 2 × 10⁶ cm⁻³; 4H-SiC about 10⁻⁸ cm⁻³, which works out
            to one thermally freed electron per 100 cubic metres.
          </p>
          <p>
            Because temperature sits in the exponent, n_i is brutally sensitive to it. In silicon it roughly doubles every
            10 °C near room temperature. Anything that depends on thermally generated carriers, above all the reverse
            leakage of every p-n junction, grows about 1000× between 25 °C and 125 °C. That is why silicon parts carry
            temperature grades of 85 °C (industrial), 125 °C (automotive) and 150 °C (junction), and why a circuit can
            work perfectly on the bench and fail in an engine bay.
          </p>
        </Prose>

        <Callout kind="tip" title="Rule of thumb">
          <p>
            Leakage doubles every 10 °C. Before you trust a high-impedance node, multiply its room-temperature leakage by
            2^(ΔT/10) and then by the node impedance: 1 nA at 25 °C becomes about 1 µA at 125 °C, which is 1 V across
            1 MΩ.
          </p>
        </Callout>

        <Prose>
          <h3>Why silicon won</h3>
          <ul>
            <li>
              <strong>A native oxide.</strong> Heating silicon in oxygen or steam at 900-1100 °C grows SiO₂ with a 9 eV gap,
              a breakdown field near 10 MV/cm and a clean interface. That oxide enabled Jean Hoerni&apos;s planar process
              (Fairchild, 1959) and the MOSFET (Atalla and Kahng, Bell Labs, 1959-60). Germanium&apos;s oxide dissolves
              in water.
            </li>
            <li>
              <strong>Abundance and purity.</strong> Silicon is about 28% of the Earth&apos;s crust by mass. Sand is
              refined into 99.9999999% (nine nines) pure polysilicon, then grown into single crystals and sliced into
              300 mm wafers.
            </li>
            <li>
              <strong>A useful gap.</strong> 1.12 eV keeps leakage manageable to about 150 °C, while germanium&apos;s
              0.66 eV limits it to roughly 70-85 °C.
            </li>
            <li>
              <strong>Cost.</strong> Seventy years of investment mean a bare 300 mm silicon wafer costs around $100. A
              150 mm SiC wafer, with a quarter of the area, costs several times more.
            </li>
          </ul>

          <h3>Why wide band gaps matter for EVs</h3>
          <p>
            A wider gap does two things. It slashes the intrinsic carrier density, so SiC and GaN devices keep low leakage
            at 175-200 °C, and it raises the critical electric field from about 0.3 MV/cm in silicon to about 2.8 MV/cm
            in 4H-SiC. Ten times the field means a 1200 V device needs a drift layer roughly ten times thinner and far more
            heavily doped, so its resistance per unit area can fall by over a hundred times at the material limit.
            Tesla&apos;s Model 3 (2017) was the first high-volume car with a SiC MOSFET traction inverter, and most 800 V
            platforms now use 1200 V SiC parts. GaN does the same job in 65-240 W laptop chargers, switching several times
            faster than silicon designs so the transformer can shrink.
          </p>
        </Prose>
      </Section>

      <Section id="viz" title="Interactive: heat the crystal">
        <BandDiagram />
        <Prose>
          <p>Things to try:</p>
          <ul>
            <li>
              Silicon from 300 K to 400 K: the conduction band gains about three electrons, which on this log scale means
              several hundred times more carriers.
            </li>
            <li>
              Germanium at 300 K against silicon at 440-450 K: they have about the same n_i, so room-temperature germanium
              leaks like silicon at 170 °C. That is why germanium transistors failed in hot equipment.
            </li>
            <li>
              SiC at 600 K (327 °C): at most one electron in the conduction band, and an intrinsic conductivity about
              40,000 times lower than silicon&apos;s at room temperature.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="How much hotter is 'hot' for silicon?">
          <p>
            Silicon&apos;s n_i at 300 K is 1 × 10¹⁰ cm⁻³. Using n_i ∝ T^1.5 · exp(−Eg/2kT) with Eg = 1.12 eV and
            k = 8.617 × 10⁻⁵ eV/K, estimate n_i at 400 K (127 °C). Then explain why a SiC MOSFET can run with its
            junction at 200 °C while a silicon power device cannot.
          </p>
          <CodeBlock
            lang="text"
            code={
              "Eg / 2k   = 1.12 / (2 × 8.617e-5)       = 6499 K\n" +
              "exponent  = 6499 × (1/300 − 1/400)      = 6499 × 8.33e-4 = 5.42\n" +
              "exp(5.42) = 225\n" +
              "(400/300)^1.5                           = 1.54\n" +
              "ratio     = 1.54 × 225                  ≈ 350\n" +
              "n_i(400 K) ≈ 350 × 1e10                 ≈ 3.5e12 cm^-3\n\n" +
              "SiC at 473 K: Eg/2kT = 3.26 / (2 × 8.617e-5 × 473) = 40.0\n" +
              "Si  at 300 K: Eg/2kT = 1.12 / (2 × 8.617e-5 × 300) = 21.7\n" +
              "e^-40 / e^-21.7 = e^-18.3 ≈ 1e-8"
            }
          />
          <p>
            <strong>Answer:</strong> about 350× with the gap held at 1.12 eV, so n_i ≈ 3.5 × 10¹² cm⁻³. Silicon&apos;s gap
            actually shrinks to about 1.10 eV at 400 K, and measured data give roughly 550×. Either way it is hundreds of
            times. The doubling-every-10 °C rule predicts 2¹⁰ ≈ 1000×, a slight overestimate for n_i, because the
            doubling interval stretches from about 9 °C at room temperature to about 15 °C at 400 K. Junction leakage has
            a diffusion component that grows as n_i², so real leakage often rises even faster than n_i, and 1000× remains
            a sensible design margin.
          </p>
          <p>
            For SiC at 200 °C the exponent Eg/2kT is still 40, far larger than silicon&apos;s 21.7 at room temperature, so
            hot SiC has tens of millions of times fewer intrinsic carriers than cool silicon (n_i ≈ 2 × 10² cm⁻³) and its
            junction leakage stays negligible. Silicon at 200 °C reaches n_i ≈ 10¹⁴ cm⁻³, comparable to the doping of the
            drift layer in a 1200 V device, so that layer stops behaving like doped material and the part can no longer
            block. For SiC the real 200 °C limits are the package (solder, gel, mould compound) and gate-oxide
            reliability, not the semiconductor.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
