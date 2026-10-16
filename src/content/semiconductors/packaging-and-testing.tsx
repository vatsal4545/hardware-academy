"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { PackageExploded } from "@/components/viz/semiconductors/PackageExploded";

const c = {
  sink: "#9ca3af",
  tim: "#6b7280",
  lid: "#b8c0cc",
  die: "#475569",
  bump: "#e5e7eb",
  underfill: vizColors.amber,
  substrate: "#8b6b3d",
  ball: "#cbd5e1",
  pcb: vizColors.mask,
};

function Leader({ x1, y1, y2, text }: { x1: number; y1: number; y2: number; text: string }) {
  return (
    <g>
      <line x1={x1 + 4} y1={y1} x2={494} y2={y2} stroke={vizColors.muted} strokeWidth={1} opacity={0.7} />
      <Label x={500} y={y2} anchor="start" size={11} color={vizColors.text}>
        {text}
      </Label>
    </g>
  );
}

function BgaCrossSection() {
  const balls = Array.from({ length: 12 }, (_, i) => 80 + i * 32.73);
  const bumps = Array.from({ length: 11 }, (_, i) => 196 + i * 12.8);
  const fins = Array.from({ length: 9 }, (_, i) => 118 + i * 35);
  return (
    <SvgCanvas
      viewBox="0 0 640 370"
      title="Cross-section of a flip-chip BGA on a PCB with a lid and heat sink, showing the main and secondary heat paths"
    >
      <rect x={0} y={0} width={640} height={370} fill={vizColors.bg} />

      {/* Heat sink */}
      {fins.map((x) => (
        <rect key={x} x={x} y={62} width={10} height={70} fill={c.sink} />
      ))}
      <rect x={110} y={132} width={300} height={20} fill={c.sink} />
      <rect x={130} y={152} width={260} height={6} fill={c.tim} />

      {/* Lid */}
      <rect x={100} y={158} width={320} height={16} fill={c.lid} />
      <rect x={100} y={174} width={14} height={52} fill={c.lid} />
      <rect x={406} y={174} width={14} height={52} fill={c.lid} />

      {/* TIM1, die, bumps, underfill */}
      <rect x={190} y={174} width={140} height={6} fill={c.tim} />
      <rect x={190} y={180} width={140} height={34} fill={c.die} />
      <line x1={190} y1={212} x2={330} y2={212} stroke={vizColors.cyan} strokeWidth={2} />
      <polygon points="176,226 190,214 330,214 344,226" fill={c.underfill} opacity={0.45} />
      {bumps.map((x) => (
        <circle key={x} cx={x} cy={220} r={5.5} fill={c.bump} />
      ))}

      {/* Substrate with copper layers and vias */}
      <rect x={60} y={226} width={400} height={48} fill={c.substrate} />
      <rect x={60} y={244} width={400} height={12} fill="#6f5530" />
      {[231, 238, 262, 269].map((y) => (
        <line key={y} x1={64} y1={y} x2={456} y2={y} stroke={vizColors.copper} strokeWidth={1.2} strokeDasharray="14 6" />
      ))}
      {[120, 180, 230, 290, 340, 400].map((x) => (
        <line key={x} x1={x} y1={228} x2={x} y2={272} stroke={vizColors.copper} strokeWidth={2.5} />
      ))}

      {/* Solder balls and PCB */}
      {balls.map((x) => (
        <circle key={x} cx={x} cy={286} r={12} fill={c.ball} />
      ))}
      <rect x={40} y={298} width={440} height={30} fill={c.pcb} />
      {balls.map((x) => (
        <rect key={`pad-${x}`} x={x - 10} y={298} width={20} height={3} fill={vizColors.copper} />
      ))}
      {[308, 318].map((y) => (
        <line key={y} x1={44} y1={y} x2={476} y2={y} stroke={vizColors.copper} strokeWidth={1.2} opacity={0.7} />
      ))}

      {/* Heat paths */}
      <Arrow x1={260} y1={204} x2={260} y2={40} color={vizColors.red} width={4} head={12} />
      <Label x={272} y={34} anchor="start" size={11} color={vizColors.red}>
        Main heat path: die → TIM1 → lid → TIM2 → heat sink → air
      </Label>
      <Arrow x1={218} y1={214} x2={218} y2={338} color={vizColors.orange} width={2.5} head={9} dashed />
      <Label x={40} y={352} anchor="start" size={11} color={vizColors.orange}>
        Secondary path: bumps → substrate → balls → PCB copper
      </Label>

      {/* Labels */}
      <Leader x1={410} y1={98} y2={92} text="Heat sink + fins" />
      <Leader x1={390} y1={155} y2={128} text="TIM2" />
      <Leader x1={420} y1={166} y2={150} text="Lid: Ni-plated copper" />
      <Leader x1={330} y1={177} y2={172} text="TIM1: indium or gel" />
      <Leader x1={330} y1={197} y2={194} text="Die, face down" />
      <Leader x1={344} y1={222} y2={216} text="C4 bumps + underfill" />
      <Leader x1={460} y1={250} y2={244} text="Substrate ≈1 mm" />
      <Leader x1={452} y1={286} y2={274} text="Balls, 1.0 mm pitch" />
      <Leader x1={480} y1={313} y2={304} text="PCB" />
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From a finished wafer to a part you can solder">
        <Prose>
          <p>
            A finished wafer is not a product yet. Each die still needs a tested, protected body with connections a
            circuit board can use and a path for its heat. Packaging and test cost from a few cents for a simple SOIC to
            hundreds of dollars for an AI accelerator, and today they decide as much about performance as the
            transistors do.
          </p>

          <h3>Sort, thin, dice and attach</h3>
          <p>
            Wafer sort (probe) comes first. A probe card with thousands of fine needles lands on each die’s pads, and
            automatic test equipment (ATE) from Advantest or Teradyne runs a short electrical test, storing a pass or
            fail bin for every die in a wafer map. Test structures in the scribe lines are measured too, giving the fab
            sheet resistance and threshold voltage for each lot. The wafer is then back-ground from 775 µm to 50-200 µm,
            mounted on tape and diced with a diamond blade, which cuts a street about 20-30 µm wide, or with a laser.
            Only good dies are picked. Die attach glues each one to a lead frame or substrate with silver-filled epoxy,
            solder, or sintered silver for power devices.
          </p>

          <h3>Wire bond or flip chip</h3>
          <p>
            Wire bonding welds 15-50 µm gold or copper wires from pads on the die’s edge to the leads, one wire at a
            time at more than ten wires per second. It is cheap and flexible, but connections are limited to the
            perimeter and each millimetre of wire adds about 1 nH of inductance. Flip chip turns the die face down onto
            an array of solder bumps (C4 bumps at about 150-200 µm pitch) or copper pillars (40-80 µm pitch) spread
            over its whole area. That gives thousands of short, low-inductance connections and lets heat leave through
            the back of the die. An epoxy underfill fills the gap so the bumps survive thermal cycling.
          </p>

          <h3>Package families</h3>
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th>Pitch</th>
                <th>Connections</th>
                <th>Typical θJA</th>
                <th>Where you see it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>DIP (dual in-line)</td>
                <td>2.54 mm</td>
                <td>8-64</td>
                <td>≈80-100 °C/W</td>
                <td>Through-hole, breadboards, legacy parts</td>
              </tr>
              <tr>
                <td>SOIC (small outline)</td>
                <td>1.27 mm</td>
                <td>8-28</td>
                <td>≈100-160 °C/W</td>
                <td>Op-amps, gate drivers, interface chips</td>
              </tr>
              <tr>
                <td>QFN (quad flat no-lead)</td>
                <td>0.4-0.65 mm</td>
                <td>8-100</td>
                <td>≈25-50 °C/W</td>
                <td>Microcontrollers, regulators, RF</td>
              </tr>
              <tr>
                <td>BGA (ball grid array)</td>
                <td>0.4-1.27 mm</td>
                <td>100-5,000+</td>
                <td>≈10-25 °C/W</td>
                <td>FPGAs, SoCs, GPUs</td>
              </tr>
              <tr>
                <td>CSP / WLCSP (chip scale)</td>
                <td>0.35-0.5 mm</td>
                <td>4-400</td>
                <td>≈50-100 °C/W</td>
                <td>Phones and wearables</td>
              </tr>
            </tbody>
          </table>
          <p>
            A chip-scale package is at most about 1.2× the die area; a wafer-level CSP puts solder balls directly on the
            die. The θJA column is for JEDEC test boards, so treat it as a starting point.
          </p>
        </Prose>

        <Figure caption="Flip-chip BGA cross-section. The die sits face down on C4 bumps in underfill; the substrate fans the bumps out to 1 mm-pitch balls. Most heat goes up through the lid into the heat sink; some goes down into the PCB.">
          <BgaCrossSection />
        </Figure>

        <Prose>
          <h3>2.5D, 3D, chiplets and HBM</h3>
          <p>
            In 2.5D packaging, dies sit side by side on a silicon interposer that carries fine wiring and through-silicon
            vias (TSVs). NVIDIA’s H100 places its 814 mm² GPU next to stacks of HBM on TSMC’s CoWoS interposer. HBM
            (high-bandwidth memory) is itself 3D: 8-12 DRAM dies, thinned and stacked with TSVs, exposing a 1024-bit
            interface for about 0.8-1.2 TB/s per stack. True 3D stacking bonds dies face to face; AMD’s 3D V-Cache
            hybrid-bonds a 64 MB SRAM die onto a CPU die at 9 µm pitch. Chiplets split one design into smaller dies:
            AMD’s EPYC Genoa combines up to 12 CPU dies on 5 nm with one I/O die on 6 nm, and the UCIe standard (2022)
            defines the die-to-die link. The reasons are yield (small dies yield exponentially better), the reticle
            limit of 26 × 33 mm (858 mm²) per die, and freedom to build each function on its best process.
          </p>

          <h3>The thermal path</h3>
          <p>
            Every watt has to reach the air. Datasheets model this as a chain of thermal resistances: Tj = Ta + P·θJA,
            where θJA in °C/W lumps junction-to-case, case-to-board and board-to-air. It is measured on a standard
            4-layer JEDEC board (JESD51-7), so a small two-layer board can do much worse. A large flip-chip BGA with a
            lid has a junction-to-case resistance of only 0.1-0.3 °C/W, so the heat sink dominates. Commercial silicon
            is usually limited to a 125 °C junction, and many automotive parts to 150 °C.
          </p>

          <h3>Final test, burn-in and reliability</h3>
          <p>
            After assembly, final test runs every part on ATE, often at several temperatures (−40, 25 and 125 °C for
            automotive), and sorts it into speed and quality bins. Burn-in runs parts hot at raised voltage for hours to
            remove infant-mortality failures, the falling left edge of the bathtub curve. Qualification adds stress
            tests: 1,000 hours of high-temperature operating life (HTOL) at 125 °C, 1,000 temperature cycles from
            −55 °C to 125 °C, and humidity tests such as HAST. Two wear-out mechanisms dominate. Electromigration is
            electron current slowly dragging metal atoms out of lines and bumps; Black’s equation puts lifetime
            proportional to J⁻² and falling exponentially with temperature. Thermal-cycling fatigue cracks solder
            joints because silicon expands 2.6 ppm/°C and FR-4 about 14-17 ppm/°C.
          </p>

          <h3>Why packaging is the frontier</h3>
          <p>
            In 2023 and 2024 the bottleneck for AI accelerators was not wafers but TSMC’s CoWoS packaging capacity,
            which TSMC roughly doubled in a year. Hybrid bonding below 10 µm pitch, glass-core substrates (announced by
            Intel in 2023) and co-packaged optics are where much of the next decade’s gains will come from.
          </p>
        </Prose>

        <Callout kind="tip" title="Rule of thumb">
          Each 10 °C hotter roughly halves the life of many wear-out mechanisms, so 15 °C of thermal margin is worth
          more than it looks.
        </Callout>
        <Callout kind="interview" title="Interview angle">
          If asked about a package, cover four things: how the die connects (wire or bump), how heat leaves (lid or
          exposed pad), what fails (joints, wires, delamination), and how it is inspected (X-ray, acoustic microscopy).
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: take a package apart">
        <PackageExploded />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Will this regulator overheat?">
          <p>
            A linear regulator dissipates 1.5 W in a QFN with θJA = 40 °C/W (JEDEC board). The enclosure reaches 50 °C
            and the part is rated for a 125 °C junction. (1) Find Tj. (2) What is the maximum power if you keep a 10 °C
            guard band? (3) A thermocouple on the package top reads 104 °C and the datasheet gives ΨJT = 2 °C/W. What is
            the real junction temperature?
          </p>
          <CodeBlock
            lang="text"
            code={[
              "(1) Tj = Ta + P·θJA = 50 + 1.5 × 40 = 110 °C",
              "    Under 125 °C, but only 15 °C of margin: OK with little margin.",
              "",
              "(2) Keep Tj ≤ 125 − 10 = 115 °C:",
              "    P_max = (115 − 50) / 40 = 1.63 W",
              "",
              "(3) Tj ≈ T_top + ΨJT·P = 104 + 2 × 1.5 = 107 °C",
              "    Your board beats the JEDEC board (θJA ≈ (107 − 50)/1.5 = 38 °C/W).",
              "",
              "Fixes if margin is too thin: more copper and 6-9 thermal vias under the",
              "exposed pad, a package with lower θJA, or a buck converter instead of the LDO.",
            ].join("\n")}
          />
          <p>
            ΨJT (junction-to-top characterization parameter) is not a thermal resistance, because most heat does not
            leave through the top; it is a calibration factor for turning a case measurement into a junction estimate.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
