"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { FabProcessStepper } from "@/components/viz/semiconductors/FabProcessStepper";

const fig = {
  si: "#475569",
  oxide: "#93c5fd",
  dielectric: "#1e293b",
  doped: vizColors.electron,
  gate: "#94a3b8",
  highK: vizColors.amber,
  spacer: "#cbd5e1",
  tungsten: "#a1a1aa",
  copper: vizColors.copper,
  passivation: "#86efac",
  solder: "#e5e7eb",
};

/** Bracket with a title and two lines of detail, drawn at the right of the figure. */
function Bracket({ y1, y2, title, lines }: { y1: number; y2: number; title: string; lines: string[] }) {
  const mid = (y1 + y2) / 2;
  return (
    <g>
      <path d={`M512 ${y1 + 2} H518 V${y2 - 2} H512`} fill="none" stroke={vizColors.muted} strokeWidth={1.5} />
      <Label x={526} y={mid - (lines.length * 7)} anchor="start" size={12} bold color={vizColors.text}>
        {title}
      </Label>
      {lines.map((l, i) => (
        <Label key={l} x={526} y={mid - lines.length * 7 + 15 + i * 13} anchor="start" size={10} color={vizColors.muted}>
          {l}
        </Label>
      ))}
    </g>
  );
}

function TransistorStackFigure() {
  // Copper line segments per level: [x, width].
  const m1: Array<[number, number]> = [
    [115, 35],
    [180, 45],
    [280, 40],
    [375, 45],
    [450, 35],
  ];
  const m2: Array<[number, number]> = [
    [110, 30],
    [160, 90],
    [350, 90],
    [460, 30],
  ];
  const leftLabels: Array<[number, string]> = [
    [26, "Bump"],
    [49, "Passivation"],
    [73, "Top metal"],
    [123, "M11"],
    [168, "M4-M10"],
    [195, "M3"],
    [228, "M2"],
    [260, "M1"],
    [285, "Contacts"],
    [323, "Gate"],
    [359, "Source/drain"],
    [405, "Silicon"],
  ];
  return (
    <SvgCanvas
      viewBox="0 0 640 440"
      title="Cross-section of a finished transistor with contacts, copper wiring layers, passivation and a bump"
    >
      <rect x={0} y={0} width={640} height={440} fill={vizColors.bg} />

      {/* Dielectric that surrounds every wire */}
      <rect x={100} y={42} width={400} height={308} fill={fig.dielectric} />

      {/* Silicon, isolation, source and drain */}
      <rect x={100} y={350} width={400} height={80} fill={fig.si} />
      <rect x={110} y={350} width={30} height={34} fill={fig.oxide} opacity={0.75} />
      <rect x={460} y={350} width={30} height={34} fill={fig.oxide} opacity={0.75} />
      <rect x={160} y={350} width={85} height={18} rx={4} fill={fig.doped} opacity={0.55} />
      <rect x={355} y={350} width={85} height={18} rx={4} fill={fig.doped} opacity={0.55} />
      <Label x={300} y={362} size={10} color={vizColors.text}>
        channel
      </Label>

      {/* Gate stack with spacers */}
      <rect x={248} y={302} width={10} height={48} fill={fig.spacer} opacity={0.6} />
      <rect x={342} y={302} width={10} height={48} fill={fig.spacer} opacity={0.6} />
      <rect x={258} y={302} width={84} height={42} fill={fig.gate} />
      <rect x={258} y={344} width={84} height={6} fill={fig.highK} />

      {/* Tungsten contacts (middle of line) */}
      <rect x={195} y={268} width={14} height={82} fill={fig.tungsten} />
      <rect x={391} y={268} width={14} height={82} fill={fig.tungsten} />
      <rect x={293} y={268} width={14} height={34} fill={fig.tungsten} />

      {/* M1, V1, M2, V2, M3 */}
      {m1.map(([x, w]) => (
        <rect key={`m1-${x}`} x={x} y={252} width={w} height={16} fill={fig.copper} />
      ))}
      <rect x={196} y={236} width={12} height={16} fill={fig.copper} />
      <rect x={392} y={236} width={12} height={16} fill={fig.copper} />
      {m2.map(([x, w]) => (
        <rect key={`m2-${x}`} x={x} y={220} width={w} height={16} fill={fig.copper} />
      ))}
      <rect x={228} y={204} width={12} height={16} fill={fig.copper} />
      <rect x={360} y={204} width={12} height={16} fill={fig.copper} />
      <rect x={140} y={186} width={130} height={18} fill={fig.copper} />
      <rect x={330} y={186} width={140} height={18} fill={fig.copper} />

      {/* Compressed intermediate levels */}
      <line x1={100} y1={154} x2={500} y2={154} stroke={vizColors.muted} strokeDasharray="4 5" />
      <line x1={100} y1={182} x2={500} y2={182} stroke={vizColors.muted} strokeDasharray="4 5" />
      <Label x={300} y={168} size={11} color={vizColors.muted}>
        ⋯ M4-M10: intermediate levels, pitch growing upward ⋯
      </Label>

      {/* Upper vias, M11, top metal */}
      <rect x={240} y={136} width={16} height={18} fill={fig.copper} />
      <rect x={344} y={136} width={16} height={18} fill={fig.copper} />
      <rect x={130} y={110} width={160} height={26} fill={fig.copper} />
      <rect x={320} y={110} width={150} height={26} fill={fig.copper} />
      <rect x={270} y={90} width={20} height={20} fill={fig.copper} />
      <rect x={330} y={90} width={20} height={20} fill={fig.copper} />
      <rect x={120} y={56} width={360} height={34} fill={fig.copper} />

      {/* Passivation with a pad opening and a copper-pillar bump */}
      <rect x={100} y={42} width={170} height={14} fill={fig.passivation} opacity={0.55} />
      <rect x={330} y={42} width={170} height={14} fill={fig.passivation} opacity={0.55} />
      <rect x={276} y={20} width={48} height={36} fill={fig.copper} />
      <ellipse cx={300} cy={20} rx={27} ry={9} fill={fig.solder} />

      {/* Layer names */}
      {leftLabels.map(([y, text]) => (
        <Label key={text} x={94} y={y} anchor="end" size={11} color={vizColors.muted}>
          {text}
        </Label>
      ))}

      {/* FEOL / MOL / BEOL brackets */}
      <Bracket y1={14} y2={266} title="BEOL" lines={["Cu wiring in low-k", "10-15+ levels", "built below ~400 °C"]} />
      <Bracket y1={268} y2={302} title="MOL" lines={["W / Co contacts"]} />
      <Bracket y1={302} y2={432} title="FEOL" lines={["transistors in", "the silicon"]} />
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From sand to a finished wafer">
        <Prose>
          <p>
            Every chip is made from the same handful of unit processes: oxidation, deposition, lithography, etch,
            implantation, planarization and metallization. A fab strings them into a loop that runs hundreds of times on
            a 300 mm disc of silicon. Learn the loop and any process flow becomes readable.
          </p>

          <h3>From quartz to a 300 mm wafer</h3>
          <p>
            It starts with quartz sand (SiO₂), reduced with carbon in an arc furnace to metallurgical-grade silicon of
            about 98-99% purity. The Siemens process turns that into trichlorosilane, distills it, and deposits it back as
            electronic-grade polysilicon at 9 to 11 nines (99.9999999% or better). In Czochralski (CZ) growth the
            polysilicon is melted in a quartz crucible at about 1,420 °C (silicon melts at 1,414 °C), a seed crystal is
            dipped in and pulled upward while rotating, and the melt freezes onto it as a single crystal. A 300 mm ingot
            is 1-2 m long and weighs up to a few hundred kilograms; boron or phosphorus added to the melt sets its
            doping. Wire saws slice it into wafers 775 µm thick, which are lapped, etched and polished flat to a few
            nanometres. Five companies (Shin-Etsu, SUMCO, GlobalWafers, Siltronic and SK Siltron) make most of the
            world’s wafers.
          </p>

          <h3>The cleanroom</h3>
          <p>
            One 0.1 µm particle on a critical layer can kill a die. Ordinary room air carries about 35 million particles
            of 0.5 µm or larger per cubic metre; the air around exposed wafers inside a modern tool meets ISO Class 1-3,
            at most 1,000 particles of 0.1 µm or larger per cubic metre. Wafers travel 25 at a time in sealed FOUPs
            (front-opening unified pods) carried by overhead robots, so people rarely touch them. Lithography bays use
            yellow light because resist reacts to blue and ultraviolet, and rinses use ultrapure water at 18.2 MΩ·cm.
          </p>

          <h3>The unit processes</h3>
          <ul>
            <li>
              <strong>Oxidation.</strong> Heating silicon to 800-1,200 °C in oxygen or steam grows SiO₂. At 1,000 °C,
              dry oxygen grows about 50 nm in an hour and steam about 380 nm. Roughly 44% of the oxide’s thickness
              comes from consumed silicon.
            </li>
            <li>
              <strong>Deposition.</strong> CVD reacts gases on the surface to build oxide, nitride or polysilicon. PVD
              (sputtering) knocks metal atoms off a target for barriers and seed layers. ALD builds a film one
              self-limiting layer at a time, about 0.1 nm per cycle, which is how the 1-2 nm hafnium-oxide gate
              dielectric is made.
            </li>
            <li>
              <strong>Photolithography.</strong> Spin on resist, expose it through a reticle imaged at 4× reduction, and
              develop it. Resolution is about k₁·λ/NA. DUV immersion scanners use 193 nm ArF laser light with water under
              the lens (NA 1.35) and print about 38 nm half-pitch per exposure; tighter pitches need multiple patterning.
              EUV uses 13.5 nm light from tin droplets hit by a CO₂ laser 50,000 times a second, reflected by mirrors in
              vacuum, and prints about 13 nm half-pitch. ASML is the only EUV supplier, at about $200 million per
              scanner (about $380 million for High-NA).
            </li>
            <li>
              <strong>Etch.</strong> Wet etching in liquids such as hydrofluoric acid is selective but isotropic, so it
              undercuts the mask. Plasma (dry) etching uses ions and radicals to cut straight down, making vertical
              trenches, contacts and the 3D NAND holes that are more than 50 times deeper than they are wide.
            </li>
            <li>
              <strong>Ion implantation.</strong> Boron, phosphorus or arsenic ions are fired in at keV to MeV energies,
              with doses from 10¹¹ to 10¹⁶ per cm². Energy sets depth; dose sets doping. An anneal, a one-second spike
              near 1,000-1,050 °C or a millisecond laser flash, repairs the lattice and activates the dopant.
            </li>
            <li>
              <strong>CMP.</strong> Chemical mechanical planarization presses the wafer onto a rotating pad with
              abrasive slurry and flattens it to nanometres, because an exposure stays in focus over only about 100 nm
              of height.
            </li>
            <li>
              <strong>Metallization.</strong> Since IBM introduced copper wiring in 1997, logic chips use the damascene
              process: etch trenches and vias in a low-k dielectric, line them with a few nanometres of TaN/Ta,
              electroplate copper and polish off the excess. Copper cannot be plasma-etched cleanly, so it is inlaid.
              A modern chip has 10-15 or more metal layers, from 20-40 nm pitch at the bottom to micrometre-thick power
              layers at the top.
            </li>
          </ul>
        </Prose>

        <Figure caption="A finished transistor and its wiring stack (schematic, not to scale). Wires get wider and thicker going up: the bottom levels are tens of nanometres wide, the top levels are micrometres thick and carry power to the bumps.">
          <TransistorStackFigure />
        </Figure>

        <Prose>
          <h3>FEOL, BEOL and the loop</h3>
          <p>
            The front end of line (FEOL) builds transistors in the silicon: trench isolation, wells, the gate stack,
            spacers, source and drain, and silicide. The middle of line adds tungsten or cobalt contacts, and the back
            end of line (BEOL) stacks the copper wiring. The split is set by temperature: once copper and fragile low-k
            dielectric are on the wafer, everything must stay below about 400 °C, so all hot steps happen first.
            Patterning one layer is a loop: deposit or grow a film, coat, expose, develop, etch or implant, strip,
            clean and inspect. A leading-edge flow repeats it for 60 or more mask layers, about 1,000 steps, and a wafer
            spends roughly three months in the fab.
          </p>

          <h3>Yield and cost</h3>
          <p>
            Fabs track defect density D₀, the number of killer defects per cm². The simplest yield model is Poisson:
            Y = e<sup>−A·D₀</sup> for die area A. A mature process runs at roughly 0.05-0.1 defects per cm², so a
            1 cm² die yields about 90%, but a 6 cm² GPU-class die at the same D₀ yields only 55%. That exponential
            penalty is why big chips carry spare memory rows and why the industry is moving to chiplets. Inspection
            tools from KLA and Applied Materials scan wafers after critical steps, and yield engineers match wafer-map
            signatures to the tool that caused them. None of it is cheap: a leading-edge fab costs more than $20
            billion, and TSMC has committed $165 billion to its Arizona site.
          </p>
        </Prose>

        <Callout kind="tip" title="Rule of thumb">
          At D₀ = 0.1 /cm², every extra 0.1 cm² (10 mm²) of die area costs about 1% of yield, and the losses
          multiply: e<sup>−0.01</sup> ≈ 0.99 per 10 mm².
        </Callout>
        <Callout kind="interview" title="Interview angle">
          Be ready to recite the patterning loop (deposit, coat, expose, develop, etch, strip, clean, inspect) and to name
          one equipment vendor for each step: ASML for lithography, Lam and Tokyo Electron for etch, Applied Materials
          for deposition and CMP, KLA for inspection.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: run one patterning loop">
        <FabProcessStepper />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Dies per wafer and yield for a 100 mm² die">
          <p>
            Your 10 mm × 10 mm (100 mm²) die runs on 300 mm wafers with a 3 mm edge exclusion. The process sits at
            D₀ = 0.1 defects/cm². Estimate (1) dies per wafer, (2) Poisson yield, (3) good dies per wafer. Then repeat
            for a 600 mm² GPU-class die.
          </p>
          <CodeBlock
            lang="text"
            code={[
              "Dies per wafer: DPW ≈ π·(d/2)²/S − π·d/√(2·S)",
              "  full 300 mm:   π·150²/100 − π·300/√200 = 706.9 − 66.6 ≈ 640",
              "  d = 294 mm:    π·147²/100 − π·294/√200 = 678.9 − 65.3 ≈ 614   → about 600",
              "",
              "Yield (Poisson): A = 100 mm² = 1.0 cm²",
              "  Y = exp(−A·D0) = exp(−1.0 × 0.1) = 0.905   → about 90%",
              "",
              "Good dies ≈ 614 × 0.905 ≈ 555 per wafer",
              "",
              "Same wafer, 600 mm² die (A = 6 cm²):",
              "  DPW ≈ π·147²/600 − π·294/√1200 = 113.1 − 26.7 ≈ 86",
              "  Y   = exp(−0.6) = 0.55",
              "  Good dies ≈ 86 × 0.55 ≈ 47  (6× the area, but 12× fewer good dies)",
            ].join("\n")}
          />
          <p>
            The second term of the dies-per-wafer formula counts partial dies lost around the edge. Real planners also
            subtract scribe lanes (50-100 µm wide) and test-structure sites, but the estimate is usually within a few
            percent.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
