"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { DopingLattice } from "@/components/viz/semiconductors/DopingLattice";

const STEP = 62;
const TOP = 62;

/** A 3×3 patch of lattice with a dopant in the middle. `brokenRight` leaves the bond to the right one electron short. */
function LatticePatch({ cx, dopant, color, brokenRight }: { cx: number; dopant: string; color: string; brokenRight?: boolean }) {
  const atoms: Array<{ x: number; y: number; center: boolean }> = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) atoms.push({ x: cx + (c - 1) * STEP, y: TOP + r * STEP, center: r === 1 && c === 1 });
  const bonds: Array<{ x1: number; y1: number; x2: number; y2: number; broken: boolean }> = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = cx + (c - 1) * STEP;
      const y = TOP + r * STEP;
      if (c < 2) bonds.push({ x1: x + 15, y1: y, x2: x + STEP - 15, y2: y, broken: Boolean(brokenRight) && r === 1 && c === 1 });
      if (r < 2) bonds.push({ x1: x, y1: y + 15, x2: x, y2: y + STEP - 15, broken: false });
    }
  }
  return (
    <g>
      {bonds.map((b, i) => {
        const horizontal = b.y1 === b.y2;
        const dx = horizontal ? 0 : 3;
        const dy = horizontal ? 3 : 0;
        return (
          <g key={i} stroke={vizColors.muted} strokeOpacity={0.6} strokeWidth={1.5}>
            <line x1={b.x1 - dx} y1={b.y1 - dy} x2={b.x2 - dx} y2={b.y2 - dy} />
            {!b.broken && <line x1={b.x1 + dx} y1={b.y1 + dy} x2={b.x2 + dx} y2={b.y2 + dy} />}
          </g>
        );
      })}
      {atoms.map((a, i) => (
        <g key={i}>
          <circle
            cx={a.x}
            cy={a.y}
            r={15}
            fill={a.center ? color : vizColors.grid}
            fillOpacity={a.center ? 0.25 : 1}
            stroke={a.center ? color : vizColors.muted}
            strokeWidth={a.center ? 2 : 1}
          />
          <Label x={a.x} y={a.y + 1} size={a.center ? 12 : 10} color={a.center ? color : vizColors.muted} bold={a.center}>
            {a.center ? dopant : "Si"}
          </Label>
        </g>
      ))}
    </g>
  );
}

/** Static figure: a phosphorus donor with its loosely bound fifth electron, and a boron acceptor with a hole. */
function DopantsFigure() {
  const leftX = 150;
  const rightX = 450;
  return (
    <SvgCanvas viewBox="0 0 600 290" title="A phosphorus donor with its free electron and a boron acceptor with a hole in a silicon lattice">
      <rect x={0} y={0} width={600} height={290} fill={vizColors.bg} rx={8} />
      <Label x={leftX} y={20} size={13} bold>
        n-type: phosphorus donor
      </Label>
      <Label x={rightX} y={20} size={13} bold>
        p-type: boron acceptor
      </Label>
      <line x1={300} y1={34} x2={300} y2={270} stroke={vizColors.grid} strokeWidth={1.5} />

      {/* phosphorus: four bonds plus a loosely bound fifth electron */}
      <LatticePatch cx={leftX} dopant="P" color={vizColors.positive} />
      <ellipse cx={leftX} cy={TOP + STEP} rx={46} ry={40} fill="none" stroke={vizColors.electron} strokeOpacity={0.5} strokeDasharray="4 4" />
      <circle cx={leftX + 33} cy={TOP + STEP - 28} r={5.5} fill={vizColors.electron} />
      <Arrow x1={leftX + 40} y1={TOP + STEP - 33} x2={leftX + 92} y2={TOP + 6} color={vizColors.electron} width={1.5} head={7} />
      <Label x={leftX + 74} y={TOP - 20} anchor="start" size={10} color={vizColors.electron}>
        5th electron, freed
      </Label>
      <Label x={leftX + 13} y={TOP + STEP - 14} size={12} color={vizColors.positive} bold>
        +
      </Label>
      <Label x={leftX} y={248} size={10}>
        Only 45 meV holds it; at 300 K it is free
      </Label>
      <Label x={leftX} y={264} size={10} color={vizColors.muted}>
        P⁺ ion stays fixed, electron carries current
      </Label>

      {/* boron: one bond short of an electron, which is the hole */}
      <LatticePatch cx={rightX} dopant="B" color={vizColors.negative} brokenRight />
      <circle cx={rightX + STEP / 2} cy={TOP + STEP + 3} r={5.5} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={2.2} />
      <Arrow x1={rightX + STEP} y1={TOP + STEP + 40} x2={rightX + STEP / 2 + 6} y2={TOP + STEP + 10} color={vizColors.electron} width={1.4} head={6} dashed />
      <Label x={rightX + STEP + 10} y={TOP + STEP + 28} anchor="start" size={10} color={vizColors.electron}>
        e⁻ hops in
      </Label>
      <Label x={rightX + STEP / 2} y={TOP + STEP - 16} size={10} color={vizColors.hole}>
        hole
      </Label>
      <Label x={rightX} y={248} size={10}>
        A neighbour electron hops in for about 45 meV
      </Label>
      <Label x={rightX} y={264} size={10} color={vizColors.muted}>
        B⁻ ion stays fixed, the hole moves on
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="A few atoms per million change everything">
        <Prose>
          <p>
            Pure silicon at room temperature is a poor conductor. With n = p = n_i ≈ 1 × 10¹⁰ cm⁻³ its resistivity is a
            few hundred thousand Ω·cm, about 10¹¹ times worse than copper. Material like this, whose carriers come only
            from heat, is called <strong>intrinsic</strong>. Adding impurity atoms on purpose, <strong>doping</strong>,
            makes it <strong>extrinsic</strong>, and a tiny amount goes a long way: 10¹⁶ phosphorus atoms per cm³, one
            for every five million silicon atoms (0.2 parts per million), lowers the resistivity to about 0.5 Ω·cm,
            roughly half a million times lower.
          </p>

          <h3>Donors and acceptors</h3>
          <p>
            Phosphorus and arsenic sit in group V of the periodic table with five valence electrons. On a silicon site,
            four of them form bonds and the fifth is held by only about 45 meV (54 meV for arsenic). That is less than
            twice the 26 meV of thermal energy at 300 K, so practically every such <strong>donor</strong> is ionized: it
            contributes one free electron and becomes a fixed positive ion. Silicon doped this way is{" "}
            <strong>n-type</strong>, and electrons are its majority carriers.
          </p>
          <p>
            Boron, in group III, has only three valence electrons, so one of its four bonds is an electron short. A
            neighbouring electron needs only about 45 meV to hop in, which leaves a mobile empty state, a hole, wandering
            through the valence band and a fixed negative boron ion behind. Boron is an <strong>acceptor</strong>, and the
            result is <strong>p-type</strong> silicon with holes as the majority carriers. Aluminium and gallium are
            acceptors too, but boron is the standard choice in silicon (aluminium is used in SiC).
          </p>
        </Prose>

        <Figure caption="A phosphorus donor gives up its fifth electron and becomes a fixed P⁺ ion; a boron acceptor takes an electron from a neighbouring bond, leaving a mobile hole and a fixed B⁻ ion.">
          <DopantsFigure />
        </Figure>

        <Prose>
          <h3>Majority, minority and the mass-action law</h3>
          <p>
            Doping does not just add carriers; it removes the other kind. In equilibrium the product of the electron and
            hole densities is fixed by temperature: <code>n · p = n_i²</code>. Add 10¹⁶ donors per cm³ and n ≈ 10¹⁶, so
            p = (10¹⁰)² / 10¹⁶ = 10⁴ cm⁻³, because the extra electrons recombine with most of the thermally generated
            holes. Holes in n-type material, and electrons in p-type, are <strong>minority carriers</strong>. Here they
            are outnumbered a trillion to one, yet they matter enormously: diodes and bipolar transistors work by injecting
            minority carriers, and minority carriers carry leakage current.
          </p>
          <p>
            If a region holds both donors and acceptors they compensate, and the net doping is |N_D − N_A|. Fabs rely on
            this constantly, implanting an n-well into a p-type wafer and then p⁺ source and drain regions into that well.
          </p>
          <table>
            <thead>
              <tr>
                <th>Region</th>
                <th>Doping (cm⁻³)</th>
                <th>Typical resistivity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Drift layer of a 1200 V silicon power device</td>
                <td>10¹³ to 10¹⁴</td>
                <td>about 45 to 450 Ω·cm</td>
              </tr>
              <tr>
                <td>Standard p-type CMOS starting wafer</td>
                <td>about 10¹⁵</td>
                <td>about 14 Ω·cm</td>
              </tr>
              <tr>
                <td>Wells and transistor channels</td>
                <td>10¹⁶ to 10¹⁸</td>
                <td>about 0.02 to 1.5 Ω·cm</td>
              </tr>
              <tr>
                <td>Source and drain contacts (n⁺, p⁺)</td>
                <td>10¹⁹ to 10²⁰</td>
                <td>about 1 to 10 mΩ·cm</td>
              </tr>
            </tbody>
          </table>

          <h3>Conductivity from carriers and mobility</h3>
          <p>
            At modest fields the average drift velocity of a carrier is proportional to the field, v = μE. The{" "}
            <strong>mobility</strong> μ measures how freely a carrier moves between collisions. In lightly doped silicon
            at 300 K, μn ≈ 1400 cm²/V·s for electrons and μp ≈ 450 cm²/V·s for holes. Electrons are about three times
            more mobile, which is why NMOS transistors are faster and PMOS transistors are drawn two to three times wider.
            Conductivity adds the two contributions, <code>σ = q (n μn + p μp)</code>, and resistivity is ρ = 1/σ. For
            n-type silicon with N_D = 10¹⁶ cm⁻³ the hole term is negligible and σ ≈ 1.6 × 10⁻¹⁹ × 10¹⁶ × 1400 ≈ 2.2 S/cm.
          </p>
          <p>
            Mobility falls as doping rises, because every ionized dopant deflects passing carriers: μn is about 1200 at
            10¹⁶, 270 at 10¹⁸ and 110 cm²/V·s at 10¹⁹ cm⁻³. It also falls with temperature as lattice vibrations grow,
            which is the main reason a silicon MOSFET&apos;s on-resistance rises by roughly 1.5 to 2 times between 25 °C and
            125 °C.
          </p>

          <h3>Drift and diffusion</h3>
          <p>
            Carriers move for two reasons. <strong>Drift</strong> is motion in an electric field. At 1 kV/cm (1 V across
            10 µm), electrons drift at 1400 × 1000 = 1.4 × 10⁶ cm/s, or 14 km/s, a slow bias on top of random thermal
            motion near 100 km/s. Above a few tens of kV/cm the drift velocity saturates near 10⁷ cm/s, which limits
            short-channel transistors. <strong>Diffusion</strong> is motion down a concentration gradient, J = qD·dn/dx,
            the same physics as ink spreading in water. The diffusion constant follows from mobility through the Einstein
            relation, D = μkT/q, so Dn ≈ 1400 × 0.0259 ≈ 36 cm²/s and Dp ≈ 12 cm²/s.
          </p>
          <p>
            Which one dominates depends on where you look. In a resistor or a MOSFET channel, majority carriers move under
            an applied field: drift. In the base of a bipolar transistor, or just outside a forward-biased p-n junction,
            injected minority carriers spread out with almost no field: diffusion. Inside a p-n junction at equilibrium the
            two balance exactly, which is the subject of the next lesson.
          </p>

          <h3>Resistivity and sheet resistance</h3>
          <p>
            For a bar, R = ρL / (W·t). Doped layers in chips are thin, so engineers fold the thickness in and quote{" "}
            <strong>sheet resistance</strong>, R_s = ρ/t, in ohms per square (Ω/□). Any square of the layer, whatever its
            size, measures R_s edge to edge, so a resistor is simply R_s × L/W, the number of squares. A 0.2 µm layer doped
            to 10¹⁹ cm⁻³ (ρ ≈ 5.6 mΩ·cm) has R_s ≈ 280 Ω/□, so a strip 100 µm long and 10 µm wide is 10 squares, 2.8 kΩ.
            Sheet resistance is measured with a four-point probe: force current through the outer two needles, sense the
            voltage across the inner two, and for a thin layer on a large wafer R_s = 4.53 × V/I.
          </p>

          <h3>How dopants get in</h3>
          <ul>
            <li>
              <strong>Diffusion:</strong> expose the wafer to a dopant source such as POCl₃ (phosphorus) or BBr₃ (boron)
              at 900-1100 °C so atoms soak in from the surface. It is cheap and still used for solar cells, but depth and
              profile are hard to control finely.
            </li>
            <li>
              <strong>Ion implantation:</strong> ionize a dopant gas (BF₃, PH₃, AsH₃), accelerate the ions to a few keV or
              up to MeV, and scan the beam across the wafer. The dose is counted by integrating beam current, so 10¹⁵
              ions/cm² lands within about 1%, and photoresist masks where it goes. Each ion knocks silicon atoms out of
              place, and most dopants stop between lattice sites.
            </li>
            <li>
              <strong>Activation anneal:</strong> 1000-1100 °C for seconds (rapid thermal or spike anneal) or milliseconds
              (flash or laser anneal) repairs the damage and moves dopants onto lattice sites, where they become active.
              Until then most implanted atoms donate no carriers at all.
            </li>
          </ul>
        </Prose>

        <Callout kind="info" title="Remember the asymmetry">
          <p>
            Majority carriers set conductivity; minority carriers set leakage and drive diodes and bipolar transistors.
            Doping raises the first and suppresses the second, always with n · p = n_i².
          </p>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: dope the lattice">
        <DopingLattice />
        <Prose>
          <p>Things to try:</p>
          <ul>
            <li>
              Compare n-type and p-type at the same doping: the p-type resistivity is about three times higher because
              holes are less mobile.
            </li>
            <li>
              Sweep the doping from 10¹⁴ to 10¹⁹ cm⁻³: resistivity drops by about 8,000 times rather than 100,000,
              because mobility falls as dopants crowd the lattice.
            </li>
            <li>
              Turn on the field: electrons drift toward the positive plate and holes toward the negative plate, yet both
              carry conventional current in the same direction as E.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Resistivity of n-type silicon at 10¹⁶ cm⁻³">
          <p>
            A wafer is doped n-type with 1 × 10¹⁶ phosphorus atoms per cm³. Using μn = 1400 cm²/V·s, find the hole
            density, the conductivity and the resistivity. Then find the sheet resistance of a 2 µm thick layer of the
            same material, and the resistance of a strip of it 200 µm long and 20 µm wide.
          </p>
          <CodeBlock
            lang="text"
            code={
              "n   ≈ N_D = 1e16 cm^-3\n" +
              "p   = n_i^2 / n = (1e10)^2 / 1e16 = 1e4 cm^-3   (hole term negligible)\n\n" +
              "σ   = q · n · μn = 1.602e-19 × 1e16 × 1400 = 2.24 S/cm\n" +
              "ρ   = 1 / σ = 0.45 Ω·cm\n\n" +
              "R_s = ρ / t = 0.45 Ω·cm / 2e-4 cm = 2230 Ω/□\n" +
              "R   = R_s × L/W = 2230 × (200 / 20) = 22.3 kΩ"
            }
          />
          <p>
            <strong>Answer:</strong> p = 10⁴ cm⁻³, σ ≈ 2.2 S/cm, ρ ≈ 0.45 Ω·cm, R_s ≈ 2.2 kΩ/□ and the strip is about
            22 kΩ. With the doping-dependent mobility the visualization uses (μn ≈ 1170 cm²/V·s at 10¹⁶), the resistivity
            comes out at 0.53 Ω·cm, close to what a four-point probe reads on a real wafer. Textbook mobilities are a good
            first estimate; check the mobility at your actual doping before trusting the second digit.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
