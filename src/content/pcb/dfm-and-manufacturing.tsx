"use client";

import { Section, Prose, Callout, Figure, Exercise } from "@/components/lesson";
import { Label, SvgCanvas, makeScale, polyline, vizColors } from "@/components/viz/shared";
import { SmtAssemblyStepper } from "@/components/viz/pcb/SmtAssemblyStepper";
import { DfmChecker } from "@/components/viz/pcb/DfmChecker";

/** Static SAC305 reflow profile. Points are (seconds, degrees C). */
const PROFILE: Array<[number, number]> = [
  [0, 25],
  [62, 150],
  [142, 190],
  [203, 245],
  [213, 245],
  [271, 100],
  [301, 60],
];
const fx = makeScale([0, 330], [60, 690]);
const fy = makeScale([25, 270], [210, 36]);

function ReflowProfileFigure() {
  const path = polyline(PROFILE.map(([t, T]): [number, number] => [fx(t), fy(T)]));
  // time above 217 C: up-crossing at 142 + 27/0.9 = 172 s, down-crossing at 213 + 28/2.5 = 224 s
  const tUp = 172;
  const tDown = 224;
  const shade = `${fx(tUp)},${fy(217)} ${fx(203)},${fy(245)} ${fx(213)},${fy(245)} ${fx(tDown)},${fy(217)}`;
  return (
    <SvgCanvas viewBox="0 0 720 262" title="Reflow profile for SAC305 solder: preheat, soak, reflow peak near 245 degrees and cooling">
      <rect x="0" y="0" width="720" height="262" rx="8" fill={vizColors.bg} />
      {[50, 100, 150, 200, 250].map((v) => (
        <g key={v}>
          <line x1={60} x2={690} y1={fy(v)} y2={fy(v)} stroke={vizColors.grid} />
          <Label x={52} y={fy(v)} anchor="end" size={11} color={vizColors.muted}>
            {v}
          </Label>
        </g>
      ))}
      <Label x={52} y={22} anchor="end" size={11} color={vizColors.muted}>
        °C
      </Label>
      {[0, 60, 120, 180, 240, 300].map((v) => (
        <Label key={v} x={fx(v)} y={226} size={11} color={vizColors.muted}>
          {v}
        </Label>
      ))}
      <Label x={690} y={246} anchor="end" size={11} color={vizColors.muted}>
        time, s
      </Label>

      {/* zone bands */}
      {[
        { x0: 0, x1: 62, name: "preheat", fill: vizColors.blue },
        { x0: 62, x1: 142, name: "soak", fill: vizColors.green },
        { x0: 142, x1: 224, name: "reflow", fill: vizColors.orange },
        { x0: 224, x1: 301, name: "cooling", fill: vizColors.violet },
      ].map((z) => (
        <g key={z.name}>
          <rect x={fx(z.x0)} y={36} width={fx(z.x1) - fx(z.x0)} height={174} fill={z.fill} opacity={0.06} />
          <Label x={(fx(z.x0) + fx(z.x1)) / 2} y={200} size={12} color={z.fill} bold>
            {z.name}
          </Label>
        </g>
      ))}

      <line x1={60} x2={690} y1={fy(217)} y2={fy(217)} stroke={vizColors.orange} strokeDasharray="5 4" />
      <Label x={688} y={fy(217) + 12} anchor="end" size={12} color={vizColors.orange}>
        217 °C liquidus
      </Label>
      <polygon points={shade} fill={vizColors.amber} opacity={0.35} />
      <path d={path} fill="none" stroke={vizColors.cyan} strokeWidth={3} strokeLinejoin="round" />

      <line x1={102} x2={146} y1={180} y2={180} stroke={vizColors.muted} strokeWidth={1} />
      <Label x={152} y={180} anchor="start" size={12} color={vizColors.text}>
        ramp 3 °C/s or less
      </Label>
      <Label x={255} y={140} size={12} color={vizColors.text}>
        soak 150 to 200 °C
      </Label>
      <Label x={255} y={155} size={12} color={vizColors.muted}>
        for 60 to 120 s
      </Label>
      <Label x={fx(208)} y={40} size={12} color={vizColors.text} bold>
        peak about 245 °C
      </Label>
      <Label x={438} y={106} size={12} color={vizColors.amber}>
        45 to 90 s above 217 °C
      </Label>
      <Label x={628} y={112} size={12} color={vizColors.text}>
        cool 4 to 6 °C/s at most
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From Gerbers to a soldered board">
        <Prose>
          <p>
            Your CAD tool&apos;s design rule check (DRC) answers one question: does the board obey the numbers you typed in? Design for
            manufacturability (DFM) asks a harder one: will a factory build it, at a sensible price, with a high yield? DRC compares geometry with
            numbers. DFM also looks at process: acid traps, mask slivers, thermal balance, paste volume and panelisation. A board can pass DRC cleanly
            and still tombstone, so copy the fab&apos;s capability sheet into your DRC rules before you route.
          </p>

          <h3>What a fab can build</h3>
          <p>
            Typical low-cost prototype capabilities (check the current page, the numbers move): trace and space 0.127 mm (5 mil); mechanical drill 0.3
            mm, or 0.2 mm on four layers; annular ring 0.15 mm; solder-mask web 0.1 mm; copper to board edge 0.3 mm; silkscreen line 0.15 mm and text 1
            mm tall. Design with margin. My defaults are 0.2 mm trace and space and a 0.3 mm drill with a 0.6 mm pad, dropping to the minimum only where
            a QFN or BGA forces it. Every step tighter costs yield and eventually money.
          </p>

          <h3>The files</h3>
          <p>
            The fab needs one Gerber (RS-274X) file for each copper layer, solder mask, silkscreen and paste, one for the board outline, and an
            Excellon file for drills. A single IPC-2581 or ODB++ package can carry all of that plus the stack-up and netlist. The assembler also needs a
            bill of materials (BOM) with supplier part numbers, a centroid file giving each reference designator&apos;s X, Y, rotation and side, and an
            assembly drawing with polarity marks. Rotation conventions differ between CAD tools and assembly houses, so always inspect the
            assembler&apos;s placement preview for diodes, tantalum capacitors and ICs.
          </p>

          <h3>How the bare board is made</h3>
          <ol>
            <li>Imaging: photoresist on 35 µm copper-clad laminate is exposed with your artwork, inner layers first.</li>
            <li>Etching removes the unprotected inner-layer copper, and automated optical inspection checks each inner layer.</li>
            <li>Lamination presses the layers and prepreg together at about 180 °C.</li>
            <li>Drilling cuts the holes: mechanical down to 0.2 mm, laser for microvias.</li>
            <li>Plating puts about 20 µm of copper in the barrels so the holes connect layers.</li>
            <li>The outer layers are imaged and etched only now, after plating, with tin protecting the copper that stays.</li>
            <li>Solder mask, a liquid photoimageable ink, is printed and exposed, leaving the pads open.</li>
            <li>Legend: silkscreen text is printed by inkjet.</li>
            <li>Surface finish (HASL, ENIG gold over nickel, or OSP) protects the exposed copper.</li>
            <li>E-test: a flying-probe tester checks every net for opens and shorts.</li>
          </ol>
          <p>
            Surface finish matters for assembly. HASL is cheap but leaves uneven domes that are bad under fine-pitch parts. ENIG is flat and keeps
            well, which is why QFNs and BGAs want it. OSP is flat and cheapest but has a short shelf life once the bag is opened.
          </p>
        </Prose>

        <Figure caption="A SAC305 reflow profile. The shaded area is the time above the 217 °C liquidus; the solder only wets while it is liquid.">
          <ReflowProfileFigure />
        </Figure>

        <Prose>
          <h3>How it is assembled</h3>
          <p>
            A laser-cut stainless stencil, about 0.12 mm thick, lets a squeegee print solder paste on every pad; paste is roughly 50 % metal by volume.
            A pick-and-place machine then sets each part onto the paste to about 0.05 mm. Reflow melts the paste along a profile for SAC305: ramp at 3
            °C/s or less, soak at 150 to 200 °C for 60 to 120 s, peak at about 245 °C with 45 to 90 s above 217 °C, cool at 4 to 6 °C/s at most.
            Through-hole parts are soldered afterwards by wave (about 260 °C for 2 to 4 s) or selectively. Automated optical inspection checks every
            joint, and X-ray looks under BGAs and QFN thermal pads.
          </p>
          <p>
            Stencil design is half of paste printing. An aperture needs an area ratio (opening area divided by wall area) of at least 0.66 and an
            aspect ratio (width divided by stencil thickness) of at least 1.5, or the paste stays on the walls. A 0.2 × 0.6 mm aperture for a 0.4 mm
            pitch QFN passes at 0.1 mm thickness (ratio 0.75) but fails at 0.12 mm (0.63), which is why fine-pitch boards use thinner stencils and Type 4
            powder.
          </p>

          <h3>Classic pitfalls</h3>
          <ul>
            <li>
              <strong>Tombstoning:</strong> one pad melts first and its surface tension lifts the part. Balance the copper on both pads and use
              thermal relief on pour connections.
            </li>
            <li>
              <strong>Bridges:</strong> mask webs under 0.1 mm or too much paste short fine-pitch pins. Keep mask dams and shrink stencil apertures by
              about 10 %.
            </li>
            <li>
              <strong>Acid traps:</strong> acute copper angles hold etchant. Keep junctions at 90° or use 45° chamfers.
            </li>
            <li>
              <strong>Fiducials and rails:</strong> three 1 mm fiducials per board, and 5 mm panel rails with tooling holes, let the line align and
              carry the boards. Keep tall parts 3 mm from the rails.
            </li>
          </ul>
          <p>
            Small boards ship in panels. V-score cuts a groove from both sides and snaps apart, but needs parts and copper about 0.4 mm back from the
            cut. Tab routing with perforated mouse bites allows odd outlines. Either way, keep ceramic capacitors away from the break line, because
            flexing a board cracks them and a cracked capacitor becomes a short.
          </p>

          <h3>What drives the price</h3>
          <p>
            Layer count (each step up roughly doubles the board price), board area, quantity, smallest drill and trace, finish (ENIG over HASL) and
            impedance control set the bare-board cost. For assembly it is the number of unique parts, BGA or double-sided placement and the one-off
            stencil and set-up fees. A five-board run is dominated by fixed costs, so reusing common parts matters more than shaving a square
            centimetre.
          </p>

          <h3>DFM at compile time</h3>
          <p>
            AI design pipelines turn the same idea into a compiler pass: the generator proposes geometry, an automated checker applies the fab&apos;s
            rules, and violations return as errors until the design compiles. You can do this for a PCB today by running kicad-cli pcb drc in CI with
            the fab&apos;s rules and failing the build on any violation.
          </p>
        </Prose>

        <Callout kind="tip" title="Ask for the check before you pay">
          Most fabs run a free DFM check on upload and show the Gerbers back to you. For assembly, open the placement preview and check pin 1 and
          polarity on every polarised part.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: watch a board get assembled, then check it">
        <Prose>
          <p>
            Step through the assembly line, then set the reflow profile yourself and see when SAC305 wets, balls up or overheats. Afterwards run the same
            tiny layout through a DRC-style check and a fab-style check.
          </p>
        </Prose>
        <SmtAssemblyStepper />
        <DfmChecker />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Read a capability sheet and export the right files">
          <p>
            You have the fab&apos;s capability sheet and the values from your own board. Decide which design values break the sheet and what the
            smallest fix is.
          </p>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Fab capability (standard tier)</th>
                <th>Your design</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Trace / space</td>
                <td>0.127 / 0.127 mm</td>
                <td>0.15 / 0.10 mm at the TQFP escape</td>
              </tr>
              <tr>
                <td>Via drill / pad</td>
                <td>0.3 / 0.6 mm, ring 0.15 mm</td>
                <td>0.3 / 0.5 mm</td>
              </tr>
              <tr>
                <td>Mask web</td>
                <td>0.10 mm</td>
                <td>QFN, 0.5 mm pitch, 0.3 mm pads, 0.05 mm mask expansion each side</td>
              </tr>
              <tr>
                <td>Copper to board edge</td>
                <td>0.3 mm</td>
                <td>Ground pour pulled back 0.2 mm</td>
              </tr>
              <tr>
                <td>Silkscreen</td>
                <td>0.15 mm line, 1.0 mm tall</td>
                <td>0.1 mm line, 0.8 mm tall</td>
              </tr>
              <tr>
                <td>Smallest drill</td>
                <td>0.3 mm</td>
                <td>0.25 mm thermal vias under a QFN</td>
              </tr>
            </tbody>
          </table>
          <p>Then write the export checklist: which KiCad outputs go to the fab, which go to the assembler, and what you check before uploading.</p>
          <details className="mt-3 rounded-md border border-border bg-bg/40 p-3">
            <summary className="cursor-pointer font-semibold text-green-300">Worked answer</summary>
            <ol className="mt-2">
              <li>Spacing 0.10 mm is below 0.127 mm, so widen the gap to 0.127 mm or more (0.15 mm is comfortable) or pay for the finer tier.</li>
              <li>Via ring is (0.5 − 0.3) / 2 = 0.10 mm, below 0.15 mm. Use a 0.6 mm pad.</li>
              <li>
                Mask web is 0.5 − 0.3 − 2 × 0.05 = 0.10 mm. It meets the sheet exactly, with no margin, so cut the expansion to 0.03 mm or the pad to
                0.28 mm.
              </li>
              <li>Copper to edge 0.2 mm is below 0.3 mm. Pull the pour back to 0.3 mm and set the same value in Board Setup, Constraints.</li>
              <li>Silkscreen fails twice: a 0.1 mm line is under 0.15 mm and 0.8 mm text is under 1.0 mm. Use 1.0 mm text with a 0.15 mm stroke.</li>
              <li>A 0.25 mm thermal via is under the 0.3 mm minimum drill. Use 0.3 mm vias or order the tier that allows 0.2 mm.</li>
            </ol>
            <p className="mt-2">
              Export checklist, KiCad 9: run DRC with zero errors and fill the zones; File, Fabrication Outputs, Gerbers with F.Cu, B.Cu (and inner
              layers), F.Mask, B.Mask, F.Silkscreen, B.Silkscreen, F.Paste, B.Paste and Edge.Cuts, with the drill and place origin used consistently;
              generate the Excellon drill files; export the component placement file (CSV, millimetres, SMD only) and the BOM with supplier part
              numbers; zip the Gerbers and drills; open them in a Gerber viewer and confirm the outline is closed and the drills sit in the pads; upload,
              read every DFM warning, then check the assembler&apos;s placement preview for rotation and polarity.
            </p>
          </details>
        </Exercise>
      </Section>
    </>
  );
}
