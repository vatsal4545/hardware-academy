"use client";

import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, makeScale, polyline, vizColors } from "@/components/viz/shared";
import { RcCharging } from "@/components/viz/pcb/RcCharging";
import { r2, WorkedAnswer } from "@/components/viz/pcb/OhmsLawCircuit.helpers";
import { CapacitorSymbol, InductorSymbol, ResistorSymbol } from "@/components/viz/pcb/SchematicExplorer.symbols";

const WIRE = "#7b8494";
const FERRITE = "#4b5563";

/** Static figure: an MLCC cut open with its series RLC model, a wire-wound inductor, and its saturation curve. */
function CapacitorAndInductorFigure() {
  const px = makeScale([0, 2], [566, 752]);
  const py = makeScale([0, 1], [200, 50]);
  const curve: Array<[number, number]> = Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * 2;
    return [px(a), py(1 / (1 + Math.pow(a / 1.25, 4)))];
  });
  return (
    <SvgCanvas
      viewBox="0 0 520 570"
      className="mx-auto max-w-[560px]"
      title="A multilayer ceramic capacitor cut open with its series resistance and inductance model, a wire-wound inductor on a ferrite core, and a plot of inductance falling beyond the saturation current"
    >
      <line x1={260} y1={30} x2={260} y2={318} stroke={vizColors.grid} strokeWidth={1} />
      <line x1={14} y1={334} x2={506} y2={334} stroke={vizColors.grid} strokeWidth={1} />

      {/* panel 1: MLCC */}
      <Label x={130} y={18} bold size={13} color={vizColors.muted}>Ceramic capacitor (MLCC), cut open</Label>
      <rect x={46} y={56} width={168} height={84} rx={3} fill={vizColors.substrate} fillOpacity={0.3} stroke={vizColors.substrate} strokeWidth={1.5} />
      {[70, 94, 118].map((y) => (
        <line key={`a${y}`} x1={52} y1={y} x2={196} y2={y} stroke={vizColors.copper} strokeWidth={3} />
      ))}
      {[82, 106, 130].map((y) => (
        <line key={`b${y}`} x1={64} y1={y} x2={208} y2={y} stroke={vizColors.copper} strokeWidth={3} />
      ))}
      <rect x={34} y={52} width={18} height={92} rx={3} fill="#9ca3af" stroke={vizColors.text} strokeWidth={1} />
      <rect x={208} y={52} width={18} height={92} rx={3} fill="#9ca3af" stroke={vizColors.text} strokeWidth={1} />
      <rect x={40} y={164} width={14} height={8} fill={vizColors.copper} />
      <Label x={62} y={168} anchor="start" size={11}>nickel electrodes, interleaved</Label>
      <rect x={40} y={182} width={14} height={8} fill={vizColors.substrate} fillOpacity={0.5} stroke={vizColors.substrate} />
      <Label x={62} y={186} anchor="start" size={11}>ceramic dielectric, 1 to 2 µm layers</Label>
      <rect x={40} y={200} width={14} height={8} fill="#9ca3af" />
      <Label x={62} y={204} anchor="start" size={11}>tin-plated end terminations</Label>

      <Label x={130} y={236} bold size={12} color={vizColors.muted}>A real capacitor behaves like this</Label>
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round">
        <path d="M 30 262 H 58" />
        <path d="M 94 262 H 108" />
        <path d="M 144 262 H 174" />
        <path d="M 182 262 H 230" />
      </g>
      <InductorSymbol cx={76} cy={262} bumps={3} r={6} />
      <ResistorSymbol cx={126} cy={262} length={36} width={12} />
      <CapacitorSymbol cx={178} cy={262} size={22} gap={8} />
      <Label x={64} y={286} size={11} mono>ESL 1 nH</Label>
      <Label x={128} y={286} size={11} mono>ESR 5 mΩ</Label>
      <Label x={194} y={286} size={11} mono>C 100 nF</Label>
      <Label x={130} y={310} bold size={12} color={vizColors.amber}>resonates at 1 / (2π√LC) = 16 MHz</Label>

      {/* panel 2: inductor */}
      <Label x={390} y={18} bold size={13} color={vizColors.muted}>Inductor, wire-wound on ferrite</Label>
      <path d="M 458 80 C 520 22, 260 22, 322 80" fill="none" stroke={vizColors.violet} strokeWidth={1.5} strokeDasharray="5 4" />
      <path d="M 450 72 C 490 42, 290 42, 330 72" fill="none" stroke={vizColors.violet} strokeWidth={1.5} strokeDasharray="5 4" />
      <Arrow x1={398} y1={35} x2={382} y2={35} color={vizColors.violet} width={1.5} head={7} />
      <rect x={322} y={66} width={12} height={70} rx={2} fill={FERRITE} stroke={vizColors.muted} />
      <rect x={446} y={66} width={12} height={70} rx={2} fill={FERRITE} stroke={vizColors.muted} />
      <rect x={334} y={88} width={112} height={26} fill={FERRITE} stroke={vizColors.muted} />
      {Array.from({ length: 8 }, (_, k) => (
        <ellipse key={k} cx={342 + k * 13.5} cy={101} rx={3.5} ry={20} fill="none" stroke={vizColors.copper} strokeWidth={2.5} />
      ))}
      <rect x={322} y={136} width={12} height={6} fill={vizColors.copper} />
      <rect x={446} y={136} width={12} height={6} fill={vizColors.copper} />
      <Label x={390} y={170} bold size={12} color={vizColors.copper}>winding: DCR = 50 mΩ</Label>
      <Label x={390} y={190} size={12} color={vizColors.muted}>ferrite core: saturates at Isat</Label>
      <Label x={390} y={226} bold mono size={12} color={vizColors.amber}>10 µH · Isat 3 A</Label>
      <Label x={390} y={244} bold mono size={12} color={vizColors.amber}>Irms 2.5 A · DCR 50 mΩ</Label>
      <Label x={390} y={270} size={11} mono color={vizColors.muted}>E = ½ L I² = 45 µJ at 3 A</Label>

      {/* panel 3: L vs I, drawn in the second row */}
      <g transform="translate(-520 336)">
        <Label x={650} y={18} bold size={13} color={vizColors.muted}>Inductance versus current</Label>
        <rect x={px(1)} y={50} width={752 - px(1)} height={150} fill={vizColors.red} opacity={0.08} />
        <line x1={566} y1={200} x2={752} y2={200} stroke={vizColors.muted} strokeWidth={1.5} />
        <line x1={566} y1={50} x2={566} y2={200} stroke={vizColors.muted} strokeWidth={1.5} />
        <line x1={566} y1={py(0.7)} x2={752} y2={py(0.7)} stroke={vizColors.grid} strokeWidth={1} strokeDasharray="4 4" />
        <line x1={px(1)} y1={50} x2={px(1)} y2={200} stroke={vizColors.grid} strokeWidth={1} strokeDasharray="4 4" />
        <path d={polyline(curve)} fill="none" stroke={vizColors.violet} strokeWidth={2.5} />
        <circle cx={r2(px(1))} cy={r2(py(1 / (1 + Math.pow(1 / 1.25, 4))))} r={5} fill={vizColors.amber} stroke={vizColors.bg} strokeWidth={2} />
        <Label x={560} y={50} anchor="end" size={10} mono color={vizColors.muted}>L0</Label>
        <Label x={560} y={py(0.7)} anchor="end" size={10} mono color={vizColors.muted}>70%</Label>
        <Label x={560} y={200} anchor="end" size={10} mono color={vizColors.muted}>0</Label>
        <Label x={566} y={212} size={10} mono color={vizColors.muted}>0</Label>
        <Label x={px(1)} y={212} size={10} mono color={vizColors.amber}>Isat</Label>
        <Label x={752} y={212} size={10} mono color={vizColors.muted}>2 × Isat</Label>
        <Label x={672} y={66} anchor="start" size={11} color={vizColors.amber}>L down about 30%</Label>
        <Label x={706} y={186} size={11} color={vizColors.red}>current runs away</Label>
      </g>
      <Label x={395} y={380} bold size={12} color={vizColors.muted}>How to use the curve</Label>
      <Label x={395} y={408} size={12}>Keep Iload + ΔI/2 below Isat,</Label>
      <Label x={395} y={426} size={12}>with margin for tolerance and heat.</Label>
      <Label x={395} y={456} size={11} color={vizColors.muted}>Isat limits the peak current,</Label>
      <Label x={395} y={472} size={11} color={vizColors.muted}>Irms limits the heating.</Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Three passive parts, and what their labels leave out">
        <Prose>
          <h3>Resistors: value, tolerance, power, package</h3>
          <p>
            A chip resistor is defined by four numbers: value, tolerance, power rating and package. Thick-film parts are ±1% (E96 series) or
            ±5% (E24) with a tempco of about ±100 ppm/°C, so a 10 kΩ resistor drifts 60 Ω over a 60 °C swing. Thin-film parts reach ±0.1% and
            ±25 ppm/°C for precision dividers and current sensing. Through-hole metal-film parts are the classic 1/4 W resistor, and
            wirewound or metal-strip parts handle watts and milliohm current shunts. Chip packages are named in hundredths of an inch:
          </p>
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th>Size</th>
                <th>Typical power</th>
                <th>Where it fits</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0402</td>
                <td>1.0 × 0.5 mm</td>
                <td>62.5 mW (1/16 W)</td>
                <td>dense boards, decoupling</td>
              </tr>
              <tr>
                <td>0603</td>
                <td>1.6 × 0.8 mm</td>
                <td>100 mW</td>
                <td>prototypes, hand soldering</td>
              </tr>
              <tr>
                <td>0805</td>
                <td>2.0 × 1.25 mm</td>
                <td>125 mW (1/8 W)</td>
                <td>easy rework, bulk capacitors</td>
              </tr>
              <tr>
                <td>1206</td>
                <td>3.2 × 1.6 mm</td>
                <td>250 mW (1/4 W)</td>
                <td>higher power, 10 µF X7R</td>
              </tr>
            </tbody>
          </table>
          <p>
            Pull-ups and pull-downs are the humble workhorse: 10 kΩ on reset, enable and strap pins, 4.7 kΩ on I²C at 3.3 V, and 100 kΩ where
            quiescent current matters. Too weak a pull is slow and noise-sensitive; too strong wastes current, because 3.3 V across 1 kΩ is
            3.3 mA.
          </p>
        </Prose>

        <Callout kind="tip" title="Reading markings">
          <ul>
            <li>Resistors: 103 means 10 × 10³ = 10 kΩ, 4R7 is 4.7 Ω, and 1002 is a 1% 10.0 kΩ. Inductors use the same code in µH: 100 is 10 µH.</li>
            <li>Ceramic capacitors carry no marking at all, so keep the reels labelled and the bags sealed.</li>
            <li>Polarity: the bar on a tantalum is the plus, the band on an aluminium can is the minus, and the bar on a diode is the cathode.</li>
          </ul>
        </Callout>

        <Prose>
          <h3>Capacitors: what the label hides</h3>
          <p>
            Ceramic (MLCC) capacitors dominate boards, and the dielectric code tells you how they behave. Class I <strong>C0G (NP0)</strong>{" "}
            stays within ±30 ppm/°C and does not change with voltage, but tops out near 100 nF in an 0805; use it for timing, filters and RF.
            Class II <strong>X7R</strong> is ±15% from −55 to +125 °C and packs far more capacitance, but it ages about 2.5% per decade-hour,
            can be microphonic, and loses capacitance under DC bias. <strong>Y5V</strong> swings +22/−82% and has no place where the value
            matters. The letters decode as lowest temperature, highest temperature and allowed change.
          </p>
          <p>
            DC-bias derating is the trap. A small-case, high-value X7R may keep 60% of its capacitance at half its rated voltage and only 35%
            at the rating, so a 10 µF, 10 V part on a 3.3 V rail delivers about 7.5 µF, and the same capacitor rated 6.3 V delivers about 6 µF.
            Choose a voltage rating of 2 to 3 times the working voltage and read the manufacturer&apos;s bias curve.
          </p>
          <p>
            Other families fill other roles. <strong>Aluminium electrolytics</strong> give hundreds of microfarads cheaply but are polarised
            (reverse voltage vents them), have ESR from 0.05 Ω to a few ohms, and wear out: life roughly doubles for every 10 °C below the
            105 °C rating, so 2000 h becomes about 64,000 h at 55 °C. <strong>Tantalum</strong> is compact and stable with low ESR, but MnO₂
            types can fail short and ignite, so run them at half their rated voltage and never reverse them. <strong>Polymer</strong> types
            add very low ESR, and <strong>film</strong> capacitors are stable and non-polarised, used for timing, audio, snubbers and mains
            safety.
          </p>
          <p>
            The role decides the part: 100 nF X7R next to every IC supply pin plus 4.7 to 10 µF bulk per rail for decoupling, C0G or film for
            timing and filters, and X7R, polymer or electrolytic for bulk storage and coupling.
          </p>
        </Prose>

        <Figure caption="Top: a multilayer ceramic capacitor cut open with the series ESR and ESL model of a real part, and a wire-wound inductor. Bottom: how an inductor's inductance collapses past its saturation current.">
          <CapacitorAndInductorFigure />
        </Figure>

        <Prose>
          <h3>ESR, ESL and self-resonance</h3>
          <p>
            A real capacitor is a series chain of capacitance, <strong>ESR</strong> and <strong>ESL</strong>. ESR turns ripple current into heat
            (<code>P = I² · ESR</code>) and sets the ripple of a switching supply; some older LDOs, the AMS1117 among them, even need a minimum
            ESR in the output capacitor to stay stable. ESL, about 0.5 to 1 nH for an 0402 plus a nanohenry or so from pads and vias, makes the
            part resonate at <code>f = 1 / (2π√(LC))</code>: 100 nF with 1 nH resonates near 16 MHz, 10 µF with 2 nH near 1.1 MHz, and above
            that frequency the capacitor behaves like an inductor. This is why decoupling capacitors sit millimetres from the pin with the
            shortest possible path to the plane.
          </p>

          <h3>Inductors and ferrite beads</h3>
          <p>
            An inductor stores energy in a magnetic field, <code>E = ½ · L · I²</code>. Three numbers matter. <strong>Saturation current</strong>{" "}
            (Isat) is where the core can hold no more flux and the inductance has fallen by 20 to 30%; above it the current ramps almost
            without limit, which can destroy the switch of a buck converter. <strong>RMS current</strong> is the continuous current that heats
            the part by about 40 °C. <strong>DCR</strong> is the winding resistance: a 10 µH inductor with 50 mΩ wastes 0.45 W at 3 A. Choose
            L from the ripple target, <code>ΔI = (Vin − Vout) · D / (L · f)</code>, usually 20 to 40% of the load current, and keep the peak
            current Iload + ΔI/2 below Isat with margin. Shielded parts radiate less.
          </p>
          <p>
            A <strong>ferrite bead</strong> acts like a small inductor at low frequency and a resistor at high frequency, for example 600 Ω at
            100 MHz, so it absorbs noise as heat instead of reflecting it. Put one in series with an analog supply or a cable shield, and
            remember that its impedance drops as DC bias current rises.
          </p>
        </Prose>
      </Section>

      <Section id="viz" title="Interactive: charge a capacitor, then derate it">
        <Callout kind="info" title="Try this">
          <ul>
            <li>At the defaults, R = 100 kΩ and C = 10 µF, so τ = 1 s. The green ring marks 63.2% of 5 V exactly at 1 s, and the curve is within 1% of the final value at 5 s.</li>
            <li>Double C: every label stretches to 2τ per division but the curve keeps its shape, and the plates hold twice the charge.</li>
            <li>
              Turn on X7R derating with the 10 V rating. At 5 V the capacitor is only 61% of its label, 6.1 µF, and the time to 63.2% falls to
              0.87 s. Pick 6.3 V and it drops to 44% and 0.78 s with a stress warning; pick 25 V and it is nearly ideal.
            </li>
          </ul>
        </Callout>
        <RcCharging />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Specify the decoupling for a small MCU">
          <p>
            A 3.3 V microcontroller in an LQFP-48 has three VDD pins and a VDDA analog supply pin, fed from an LDO. List the capacitors you
            would place, with value, dielectric, package, voltage rating and position. Then compute the real capacitance of your bulk capacitor
            at 3.3 V, assuming a 10 µF X7R keeps about 75% of its capacitance at one third of its rating and 86% at one fifth.
          </p>
          <WorkedAnswer>
            <CodeBlock
              lang="text"
              code={[
                "VDD pins   3 x 100 nF X7R 0402, 16 V   one per pin, within 2 mm, ground via at the pad",
                "VDDA       1 x 1 µF X7R 0603, 16 V     plus 1 x 10 nF to 100 nF 0402, behind a ferrite bead",
                "Bulk       1 x 10 µF X7R 0805, 16 V    near the MCU, on the 3.3 V rail",
                "LDO        per datasheet (AMS1117-3.3: 22 µF solid tantalum out for stability; 10 µF in is good practice)",
                "",
                "Bulk capacitance at 3.3 V:",
                "  16 V rating: 3.3 / 16 = 0.21 of rating, about 86% -> 8.6 µF",
                "  10 V rating: 3.3 / 10 = 0.33 of rating, about 75% -> 7.5 µF",
                "  6.3 V rating: 3.3 / 6.3 = 0.52 of rating, about 59% -> 5.9 µF",
              ].join("\n")}
            />
            <p>
              The 100 nF parts supply the fast edges, so they go closest to the pins, on the same side as the MCU, with the ground via at the
              pad instead of a long trace. The 10 µF part covers slower load steps and the interaction with the regulator. Choosing the 16 V
              rating over the 6.3 V rating recovers about 2.7 µF of real capacitance for a few cents.
            </p>
          </WorkedAnswer>
        </Exercise>
      </Section>
    </>
  );
}
