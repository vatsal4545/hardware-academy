"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, polyline, vizColors } from "@/components/viz/shared";
import { PNJunction } from "@/components/viz/semiconductors/PNJunction";

// figure geometry
const XL = 250; // depletion edge, p side
const XR = 350; // depletion edge, n side
const XJ = 300;
const PX_PER_EV = 45;
const EC_N = 190;
const VBI = 0.68;

/** Conduction-band edge across the junction: two parabolas meeting at the metallurgical junction. */
function ecAt(x: number): number {
  const b = VBI * PX_PER_EV;
  if (x <= XL) return EC_N - b;
  if (x >= XR) return EC_N;
  if (x >= XJ) return EC_N - (b / 2) * (1 - (x - XJ) / (XR - XJ)) ** 2;
  return EC_N - b + (b / 2) * (1 - (XJ - x) / (XJ - XL)) ** 2;
}

/** Static figure: junction cross-section with the depletion region and the band bending underneath. */
function JunctionFigure() {
  const xs = Array.from({ length: 101 }, (_, i) => 40 + i * 5.2);
  const ec = polyline(xs.map((x) => [x, ecAt(x)]));
  const ev = polyline(xs.map((x) => [x, ecAt(x) + 1.12 * PX_PER_EV]));
  const efY = EC_N + 0.22 * PX_PER_EV;
  return (
    <SvgCanvas viewBox="0 0 600 300" title="p-n junction cross-section with its depletion region and band diagram">
      <rect x={0} y={0} width={600} height={300} fill={vizColors.bg} rx={8} />

      {/* cross-section */}
      <rect x={40} y={34} width={XL - 40} height={66} fill={vizColors.hole} fillOpacity={0.12} />
      <rect x={XR} y={34} width={560 - XR} height={66} fill={vizColors.electron} fillOpacity={0.1} />
      <rect x={XL} y={34} width={XR - XL} height={66} fill={vizColors.grid} />
      <rect x={40} y={34} width={520} height={66} fill="none" stroke={vizColors.muted} strokeOpacity={0.6} />
      <Label x={145} y={22} size={12} color={vizColors.hole} bold>
        p-type (holes)
      </Label>
      <Label x={455} y={22} size={12} color={vizColors.electron} bold>
        n-type (electrons)
      </Label>
      <Label x={XJ} y={22} size={11} color={vizColors.text}>
        depletion region
      </Label>
      {Array.from({ length: 7 }, (_, k) =>
        [48, 66, 84].map((y) => (
          <g key={`c${k}-${y}`}>
            <circle cx={60 + k * 27 + (y === 66 ? 12 : 0)} cy={y} r={4} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={1.6} />
            <circle cx={370 + k * 27 + (y === 66 ? 12 : 0)} cy={y} r={3.8} fill={vizColors.electron} />
          </g>
        )),
      )}
      {[0, 1, 2].map((k) =>
        [46, 62, 78, 94].map((y) => (
          <g key={`i${k}-${y}`}>
            <Label x={XL + 10 + k * 15} y={y} size={12} color={vizColors.negative} bold>
              −
            </Label>
            <Label x={XJ + 10 + k * 15} y={y} size={12} color={vizColors.positive} bold>
              +
            </Label>
          </g>
        )),
      )}
      <Arrow x1={XR - 6} y1={112} x2={XL + 6} y2={112} color={vizColors.amber} width={1.8} />
      <Label x={XJ} y={124} size={10} color={vizColors.amber}>
        built-in field E (n to p)
      </Label>

      {/* depletion edges carried down to the band diagram */}
      <line x1={XL} y1={100} x2={XL} y2={262} stroke={vizColors.muted} strokeDasharray="3 4" strokeOpacity={0.6} />
      <line x1={XR} y1={100} x2={XR} y2={262} stroke={vizColors.muted} strokeDasharray="3 4" strokeOpacity={0.6} />

      {/* band diagram */}
      <path d={ec} fill="none" stroke={vizColors.electron} strokeWidth={2.2} />
      <path d={ev} fill="none" stroke={vizColors.hole} strokeWidth={2.2} />
      <line x1={40} y1={efY} x2={560} y2={efY} stroke={vizColors.amber} strokeDasharray="6 4" strokeWidth={1.4} />
      <Label x={566} y={EC_N} anchor="start" size={10} color={vizColors.electron}>
        Ec
      </Label>
      <Label x={566} y={EC_N + 1.12 * PX_PER_EV} anchor="start" size={10} color={vizColors.hole}>
        Ev
      </Label>
      <Label x={566} y={efY} anchor="start" size={10} color={vizColors.amber}>
        E_F
      </Label>
      <line x1={XL - 40} y1={EC_N - VBI * PX_PER_EV} x2={XL - 40} y2={EC_N} stroke={vizColors.violet} strokeWidth={1.4} />
      <line x1={XL - 46} y1={EC_N} x2={XR} y2={EC_N} stroke={vizColors.violet} strokeDasharray="2 3" strokeOpacity={0.7} />
      <Label x={XL - 46} y={EC_N - (VBI * PX_PER_EV) / 2} anchor="end" size={11} color={vizColors.violet} bold>
        qV_bi ≈ 0.68 eV
      </Label>
      <Label x={120} y={278} size={10} color={vizColors.muted}>
        Electrons on the n side face an uphill climb
      </Label>
      <Label x={455} y={278} size={10} color={vizColors.muted}>
        Fermi level flat: no net current
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Where p meets n">
        <Prose>
          <p>
            Put p-type and n-type silicon side by side in one crystal and something happens at once. The n side has about
            10¹⁶ free electrons per cm³ and the p side almost none, so electrons diffuse across the boundary while holes
            diffuse the other way. Near the junction they meet and recombine. What they leave behind are the dopant ions,
            which cannot move: positive donor ions on the n side, negative acceptor ions on the p side. This strip, emptied
            of mobile carriers, is the <strong>depletion region</strong>, typically 0.1 to 1 µm wide.
          </p>
          <p>
            The uncovered ions create an electric field pointing from n to p, which pushes electrons back toward the n side
            and holes back toward the p side. Within picoseconds the drift current from that field cancels the diffusion
            current, and the junction settles with a potential step across it, the <strong>built-in potential</strong>{" "}
            <code>V_bi = (kT/q) · ln(N_A·N_D / n_i²)</code>. For N_A = N_D = 5 × 10¹⁵ cm⁻³ that is 0.026 ×
            ln(2.5 × 10¹¹) ≈ 0.68 V; moderately doped silicon junctions sit around 0.6-0.7 V and heavily doped ones approach
            0.9 V. You cannot read V_bi with a voltmeter, because the contact potentials at the metal leads cancel it.
          </p>
          <p>
            The width follows from the charge: <code>W = sqrt(2ε(V_bi − V)/q · (1/N_A + 1/N_D))</code>, about 0.59 µm for
            the junction above, with a peak field near 23 kV/cm. The depletion region reaches further into the more lightly
            doped side, so in a p⁺-n junction it lives almost entirely on the n side.
          </p>
        </Prose>

        <Figure caption="A p-n junction at equilibrium. Diffusion uncovers fixed ions whose field balances further diffusion; the bands bend by qV_bi across the depletion region while the Fermi level stays flat.">
          <JunctionFigure />
        </Figure>

        <Prose>
          <h3>Forward bias: the exponential diode</h3>
          <p>
            Make the p side positive by V and the barrier drops to V_bi − V. The number of carriers energetic enough to
            climb it depends exponentially on its height, so electrons pour into the p side and holes into the n side, where
            they become minority carriers, diffuse a few micrometres and recombine. The result is the Shockley equation,{" "}
            <code>I = I_s(exp(V / nV_T) − 1)</code>, where V_T = kT/q = 26 mV at 300 K, I_s is the tiny saturation current
            (around 10⁻¹⁴ A for a small silicon diode) and n is the ideality factor, between 1 and 2.
          </p>
          <p>
            Two consequences follow. Current rises tenfold for every 60 mV (2.3 × 26 mV), and the famous 0.7 V is not a
            threshold, just the voltage where current becomes useful. With I_s = 10⁻¹⁴ A, 1 mA flows at 0.65 V and 10 mA at
            0.71 V, while at 0.4 V only about 50 nA flows. A power diode carrying 1 A, such as a 1N4007, shows about 0.9-1 V
            once its internal resistance is included. The forward drop also falls about 2 mV per °C, which is how many
            on-chip temperature sensors work.
          </p>

          <h3>Reverse bias: leakage and breakdown</h3>
          <p>
            Make the p side negative and the barrier grows to V_bi + V_R. The depletion region widens as{" "}
            <code>W ∝ sqrt(V_bi − V)</code>, so going from 0 V to −5 V widens our example from 0.59 to 1.71 µm. Only a
            small leakage flows, carried by minority carriers and by pairs generated thermally inside the depletion region:
            picoamps to nanoamps in a small silicon diode at 25 °C, roughly doubling every 10 °C.
          </p>
          <p>
            Push hard enough and the junction breaks down. In lightly doped junctions the field accelerates carriers until
            they knock new electron-hole pairs loose, an <strong>avalanche</strong> that dominates above about 6-7 V and has
            a positive temperature coefficient. In heavily doped junctions the depletion region is only about 10 nm thick and
            electrons tunnel straight through, the <strong>Zener effect</strong>, dominant below about 5 V with a negative
            coefficient. Between them, 5.1-6.2 V Zeners drift least with temperature. Breakdown is not destructive as long
            as something limits the current.
          </p>
          <p>
            The depletion region is two slabs of fixed charge separated by an insulating gap, so it is also a capacitor,{" "}
            <strong>C_j = εA/W</strong>, falling as reverse bias widens W. Varactor diodes use this to tune oscillators; in
            fast circuits it is a parasitic to charge on every edge. A 1N4148 has up to 4 pF at zero bias.
          </p>

          <h3>The diode family</h3>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Example</th>
                <th>Key numbers</th>
                <th>Used for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rectifier</td>
                <td>1N4007</td>
                <td>1 A, 1000 V; Vf about 1 V at 1 A; trr about 2 µs</td>
                <td>Mains rectification at 50/60 Hz</td>
              </tr>
              <tr>
                <td>Small signal</td>
                <td>1N4148</td>
                <td>100 V; trr 4 ns; 4 pF</td>
                <td>Logic, clamps, fast detectors</td>
              </tr>
              <tr>
                <td>Schottky</td>
                <td>BAT54, SS34</td>
                <td>Vf 0.2-0.4 V at modest current; no stored charge; µA to mA leakage</td>
                <td>Low-loss rectifiers, converter catch diodes, polarity protection</td>
              </tr>
              <tr>
                <td>Zener</td>
                <td>BZX84C5V1</td>
                <td>5.1 V ± 5% at 5 mA</td>
                <td>Simple references and clamps</td>
              </tr>
              <tr>
                <td>LED</td>
                <td>AlGaInP red, InGaN blue</td>
                <td>Photon energy ≈ Eg: red about 1.8 eV, blue about 2.7 eV</td>
                <td>Indicators, lighting, displays</td>
              </tr>
              <tr>
                <td>Photodiode</td>
                <td>Silicon PIN</td>
                <td>Reverse biased; about 0.5-0.6 A/W near 850-900 nm</td>
                <td>Light sensors, optical links, lidar receivers</td>
              </tr>
            </tbody>
          </table>
          <p>
            A <strong>Schottky</strong> diode replaces the p side with a metal. Only majority carriers cross, so it turns on
            at 0.2-0.4 V and stores no minority charge, but its leakage is two to three orders of magnitude higher. An{" "}
            <strong>LED</strong> is a junction in a direct-gap material where each recombination can emit a photon with
            energy close to Eg: wavelength in nm ≈ 1240 / Eg in eV, so red at 1.8 eV is about 690 nm and blue at 2.7 eV about
            460 nm. Blue InGaN LEDs earned Akasaki, Amano and Nakamura the 2014 Nobel Prize, and a white LED is a blue one
            under a yellow phosphor. A <strong>photodiode</strong> runs the process backwards: photons above Eg create pairs
            that the depletion field sweeps out as current.
          </p>
        </Prose>

        <Callout kind="info" title="Datasheet vocabulary">
          <ul>
            <li>
              <strong>Vf</strong>: forward voltage at a stated current and temperature. <strong>If</strong>: rated average
              forward current, 1 A for a 1N4007.
            </li>
            <li>
              <strong>Vr / VRRM</strong>: maximum repetitive reverse voltage, 1000 V for a 1N4007. <strong>Ir</strong>:
              reverse leakage at that voltage.
            </li>
            <li>
              <strong>trr</strong>: reverse recovery time, the time to sweep out stored charge before the diode blocks:
              about 2 µs for a 1N4007, 75 ns for a UF4007, practically zero for a Schottky.
            </li>
          </ul>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: bias the junction">
        <PNJunction />
        <Prose>
          <p>Things to try:</p>
          <ul>
            <li>
              Silicon at 0.3 V, then switch to Schottky: about 1 nA becomes about 17 mA at the same voltage.
            </li>
            <li>Sweep from 0 to −5 V and watch W grow as a square root while the capacitance falls from 17.5 to 6 pF.</li>
            <li>Above about 0.8 V the silicon curve straightens: the 2 Ω series resistance, not the junction, starts to set the current.</li>
          </ul>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Test a diode with a multimeter">
          <p>
            Set the meter to diode mode: it pushes about 1 mA through the part and displays the voltage. Put the red probe
            on the anode and the black probe on the cathode (the end with the band), then swap.
          </p>
          <CodeBlock
            lang="text"
            code={
              "Silicon diode, forward   0.5-0.7 V     (1N4148 about 0.6 V)\n" +
              "Schottky, forward        0.15-0.3 V\n" +
              "Red LED, forward         1.6-1.9 V     (may glow faintly)\n" +
              "Any good diode, reversed OL            (open)\n" +
              "Shorted diode            ~0 V both ways\n" +
              "Open diode               OL both ways\n" +
              "Leaky diode              low reading both ways"
            }
          />
          <p>
            <strong>Answer:</strong> a good silicon diode reads about 0.6 V one way and OL the other. Measuring in circuit, a
            parallel resistor or another junction can fake a reading, so lift one leg before you condemn a part.
          </p>
        </Exercise>

        <Exercise title="Size the series resistor for an LED">
          <p>
            A red LED with Vf = 2.0 V should run at 10 mA from a 5 V rail. Choose the resistor, then check the real current
            and both power dissipations.
          </p>
          <CodeBlock
            lang="text"
            code={
              "R     = (V_supply − Vf) / I = (5 − 2) / 0.010 = 300 Ω\n" +
              "pick  330 Ω (E12, next value up)\n" +
              "I     = (5 − 2) / 330 = 9.1 mA\n" +
              "P_R   = I² × R = (9.1e-3)² × 330 = 27 mW   → a 0402 (63 mW) is fine\n" +
              "P_LED = Vf × I = 2.0 × 9.1e-3 = 18 mW"
            }
          />
          <p>
            <strong>Answer:</strong> 330 Ω, giving about 9.1 mA, with 27 mW in the resistor. The 270 Ω value would give
            11 mA, slightly above target. With only 0.3 V of headroom, as for a 3.0 V blue LED on 3.3 V, the same method
            fails: a 0.1 V spread in Vf changes the current by a third, so use a constant-current driver.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
