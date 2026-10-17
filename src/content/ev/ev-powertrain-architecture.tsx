"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { RoundedArrow } from "@/components/viz/ev/EvAShapes";
import { EvDrivetrainFlow } from "@/components/viz/ev/EvDrivetrainFlow";

const BOX = "#1a2235";

function Block({
  x,
  y,
  w,
  h,
  title,
  lines = [],
  stroke = vizColors.muted,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: string[];
  stroke?: string;
}) {
  const top = y + h / 2 - (lines.length * 15) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={BOX} stroke={stroke} strokeWidth={1.5} />
      <Label x={x + w / 2} y={top} size={12} bold>
        {title}
      </Label>
      {lines.map((l, i) => (
        <Label key={l} x={x + w / 2} y={top + 15 * (i + 1)} size={10.5} color={vizColors.muted}>
          {l}
        </Label>
      ))}
    </g>
  );
}

function PowertrainBlockDiagram() {
  const hv = vizColors.orange;
  return (
    <SvgCanvas
      viewBox="0 0 780 450"
      title="EV powertrain block diagram: pack, fuse and contactors, HV bus, inverter, motor, reducer, wheels, with DC-DC, on-board charger, DC charging, thermal system and vehicle controller"
    >
      <rect x={0} y={0} width={780} height={450} fill={vizColors.bg} rx={10} />

      {/* HV DC bus */}
      <rect x={280} y={60} width={8} height={372} rx={3} fill={hv} />
      <Label x={284} y={46} size={11} bold color={hv}>
        HV DC bus
      </Label>

      {/* CAN bus */}
      <line x1={74} y1={128} x2={715} y2={128} stroke={vizColors.cyan} strokeWidth={1.2} strokeDasharray="5 4" />
      {[
        [74, 150],
        [360, 165],
        [715, 166],
      ].map(([x, y2]) => (
        <line key={x} x1={x} y1={128} x2={x} y2={y2} stroke={vizColors.cyan} strokeWidth={1.2} strokeDasharray="5 4" />
      ))}
      <line x1={680} y1={110} x2={680} y2={128} stroke={vizColors.cyan} strokeWidth={1.2} strokeDasharray="5 4" />
      <Label x={40} y={128} size={10} color={vizColors.cyan}>
        CAN
      </Label>

      {/* main power path */}
      <Block x={14} y={150} w={120} h={100} title="Battery pack" lines={["96 cells in series", "≈350 V nominal"]} stroke={hv} />
      <rect x={44} y={222} width={60} height={20} rx={4} fill={vizColors.grid} />
      <Label x={74} y={232} size={10}>
        BMS
      </Label>
      <line x1={134} y1={200} x2={156} y2={200} stroke={hv} strokeWidth={3} />
      <Block x={156} y={160} w={100} h={80} title="Contactors" lines={["+ pyro fuse", "+ precharge R"]} stroke={hv} />
      <line x1={256} y1={200} x2={280} y2={200} stroke={hv} strokeWidth={3} />
      <line x1={288} y1={200} x2={310} y2={200} stroke={hv} strokeWidth={3} />

      {/* integrated drive unit */}
      <rect x={300} y={152} width={350} height={100} rx={12} fill="none" stroke={vizColors.violet} strokeDasharray="6 5" />
      <Label x={645} y={244} size={10} anchor="end" color={vizColors.violet}>
        integrated drive unit
      </Label>
      <Block x={310} y={165} w={100} h={70} title="Inverter" lines={["DC → 3-phase AC", "SiC or IGBT"]} stroke={vizColors.violet} />
      {[190, 200, 210].map((y) => (
        <line key={y} x1={410} y1={y} x2={444} y2={y} stroke={vizColors.amber} strokeWidth={2} />
      ))}
      <circle cx={485} cy={200} r={42} fill={BOX} stroke={vizColors.copper} strokeWidth={2} />
      <Label x={485} y={192} size={12} bold>
        Motor
      </Label>
      <Label x={485} y={209} size={10.5} color={vizColors.muted}>
        3-phase AC
      </Label>
      <line x1={527} y1={200} x2={560} y2={200} stroke={vizColors.muted} strokeWidth={7} />
      <Block x={560} y={170} w={80} h={60} title="Reducer" lines={["≈9:1 + diff"]} />
      <line x1={640} y1={200} x2={681} y2={200} stroke={vizColors.muted} strokeWidth={7} />
      <circle cx={715} cy={200} r={30} fill="#111827" stroke="#374151" strokeWidth={9} />
      <circle cx={715} cy={200} r={12} fill="none" stroke={vizColors.muted} strokeWidth={2} />
      <Label x={715} y={248} size={11}>
        Wheels + brakes
      </Label>

      {/* regen */}
      <RoundedArrow x1={700} y1={272} x2={84} y2={272} color={vizColors.green} width={2} dashed />
      <Label x={488} y={288} size={11} color={vizColors.green}>
        Regen: the same path in reverse, capped by the BMS charge limit
      </Label>

      {/* low-voltage branch */}
      <line x1={288} y1={81} x2={310} y2={81} stroke={hv} strokeWidth={3} />
      <Block x={310} y={58} w={100} h={46} title="DC-DC" lines={["→ 12 V or 48 V"]} stroke={vizColors.blue} />
      <line x1={410} y1={81} x2={440} y2={81} stroke={vizColors.blue} strokeWidth={3} />
      <Block x={440} y={58} w={124} h={46} title="12 V battery" lines={["ECUs, lights, pumps"]} stroke={vizColors.blue} />
      <Block x={600} y={50} w={160} h={60} title="Vehicle controller" lines={["pedal → torque request", "regen / friction blend"]} stroke={vizColors.cyan} />

      {/* charging branches */}
      <line x1={288} y1={338} x2={310} y2={338} stroke={hv} strokeWidth={3} />
      <Block x={310} y={316} w={112} h={44} title="On-board charger" lines={["AC → DC, 7-11 kW"]} stroke={hv} />
      <Block x={454} y={316} w={92} h={44} title="AC inlet" lines={["wallbox"]} />
      <RoundedArrow x1={454} y1={338} x2={424} y2={338} color={vizColors.muted} />
      <line x1={288} y1={396} x2={310} y2={396} stroke={hv} strokeWidth={3} />
      <Block x={310} y={374} w={112} h={44} title="DC contactors" lines={["bypass the OBC"]} stroke={hv} />
      <Block x={454} y={374} w={92} h={44} title="DC inlet" lines={["50-350 kW"]} />
      <RoundedArrow x1={454} y1={396} x2={424} y2={396} color={vizColors.muted} />

      {/* thermal */}
      <Block
        x={580}
        y={316}
        w={180}
        h={102}
        title="Thermal system"
        lines={["heat pump + e-compressor", "coolant loop: pack, inverter", "oil loop: motor, reducer", "PTC heater"]}
        stroke={vizColors.red}
      />
      <polyline points="288,432 670,432 670,418" fill="none" stroke={hv} strokeWidth={3} />
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From cells to tire tread">
        <Prose>
          <p>
            An electric powertrain has far fewer moving parts than an engine and gearbox, but much more power electronics.
            Follow the energy from the cells to the tire and you meet the same blocks in every modern EV, from a Nissan Leaf
            to a Porsche Taycan.
          </p>

          <h3>The high-voltage path</h3>
          <ul>
            <li>
              <strong>Battery pack.</strong> Cells in series set the voltage. 96 lithium-ion cells in series give about 350 V
              nominal and 403 V full, the classic &quot;400 V&quot; pack; 192 in series give an &quot;800 V&quot; pack. The
              battery management system (BMS) measures every cell voltage and temperature and publishes how much power the
              pack may deliver and accept right now.
            </li>
            <li>
              <strong>Fuse and contactors.</strong> A main fuse, often a pyrotechnic fuse the airbag controller can fire in a
              crash, plus a contactor on each pole connect the pack to the bus. A precharge contactor and resistor first
              charge the inverter&apos;s capacitors to about 95% of pack voltage. Closing straight onto an empty capacitor
              bank would draw thousands of amps and weld the contacts.
            </li>
            <li>
              <strong>HV bus and DC link.</strong> Orange cables carry the bus to the inverter, where a film capacitor bank
              of a few hundred µF to about 1 mF supplies the switching ripple current. The same bus feeds the DC-DC
              converter, the on-board charger, the electric A/C compressor and the heaters.
            </li>
            <li>
              <strong>Inverter.</strong> Six power switches chop the DC into three-phase AC of controlled amplitude and
              frequency, which is how the car controls torque. Tesla&apos;s Model 3 (2017) was the first high-volume car
              with a silicon carbide (SiC) MOSFET traction inverter: 24 STMicroelectronics modules of 650 V parts.
            </li>
            <li>
              <strong>Motor.</strong> A three-phase induction or permanent-magnet machine (next lesson) turns current into
              torque. The rear motor of a Model 3 RWD peaks at about 208 kW.
            </li>
            <li>
              <strong>Reducer and differential.</strong> The motor makes full torque from standstill and spins to
              16,000-20,000 rpm, so one fixed ratio of about 9:1 is enough (Model 3: 9.04:1). At 100 km/h a 0.67 m tire
              turns about 790 rpm, so the motor runs near 7,200 rpm. No clutch, no gear shifts.
            </li>
          </ul>

          <h3>Low-voltage and support systems</h3>
          <ul>
            <li>
              <strong>DC-DC converter.</strong> An isolated 2-3.5 kW converter replaces the alternator and keeps the 12 V
              battery charged for ECUs, lights, pumps and contactor coils. Tesla&apos;s Cybertruck (2023) moved this network
              to 48 V, which cuts wiring current by four for the same power.
            </li>
            <li>
              <strong>On-board charger (OBC).</strong> AC charging runs through the car&apos;s own AC-to-DC converter,
              typically 7-11 kW (11.5 kW at 48 A and 240 V in a Model 3 Long Range). DC fast charging bypasses the OBC: the
              station&apos;s converter connects to the pack through separate DC contactors, and the BMS tells the station how
              much current it wants.
            </li>
            <li>
              <strong>Thermal system.</strong> A coolant loop through the pack&apos;s cold plates, an oil loop through the
              drive unit and a refrigerant loop with an electric compressor. A heat pump moves heat instead of making it,
              delivering 2-3 kW of heat per kW of electricity near 0 °C, against 1:1 for a PTC heater. Tesla&apos;s Octovalve
              (Model Y, 2020) routes these loops through one valve block so motor waste heat can warm the pack or cabin.
            </li>
            <li>
              <strong>Vehicle controller (VCU).</strong> It turns pedal position and speed into a torque request, clamps it
              to the limits published by the BMS and inverter, splits braking between regen and friction, and talks to
              everything over CAN.
            </li>
          </ul>

          <h3>Regen: the same path backwards</h3>
          <p>
            Lift off the accelerator and the VCU asks for negative torque. The motor becomes a generator, the inverter steers
            current from the motor back onto the bus, and the pack charges. Every block loses a little in each direction, so a
            round trip from motion to battery and back to motion keeps about 0.89 × 0.89 ≈ 79% of the energy. Regen is capped
            by the pack&apos;s charge-power limit, which collapses when cells are cold or full, by motor and inverter current
            limits, and by stability, because it brakes only the driven axle. It also fades below a few km/h, so every EV still
            carries full-size friction brakes.
          </p>

          <h3>The efficiency chain</h3>
          <p>
            Efficiencies multiply. At a typical operating point the pack delivers 98% of its chemical power, the inverter
            98%, the motor 95% and the reducer 97.5%: 0.98 × 0.98 × 0.95 × 0.975 = 0.89, so 89% of the energy reaches the
            tire. A combustion car turns only about 20-30% of its fuel energy into motion over a typical drive. Every point
            still matters: 1% of a 75 kWh pack is 0.75 kWh, about 5 km of range at 150 Wh/km.
          </p>

          <h3>400 V versus 800 V</h3>
          <p>
            Power is voltage times current. At 150 kW a 400 V bus carries 375 A; an 800 V bus carries 187.5 A. Half the
            current means a quarter of the I²R loss in the same cable, or half the copper for the same loss: a 2 m run of
            70 mm² cable (two conductors) holds about 2.5 kg of copper, its 35 mm² equivalent about 1.25 kg.
          </p>
          <p>
            Charging is where it shows. DC fast-charge cables and stations top out around 500 A, so a 400 V car peaks near
            200 kW while an 800 V car can use a 350 kW charger; Hyundai&apos;s E-GMP cars (Ioniq 5, 2021) charge 10-80% in
            about 18 minutes. The price is parts rated for 1,000 V-class peaks. A full 800 V pack sits near 850-900 V
            and switching overshoot adds more, so the inverter needs 1,200 V switches. 1,200 V SiC MOSFETs, with far
            lower switching loss than 1,200 V IGBTs, make an 800 V drivetrain more efficient, but they are not what made
            it possible. Porsche&apos;s Taycan (2019), the first production 800 V car, launched with 1,200 V silicon
            IGBTs; the Lucid Air runs at about 900 V.
          </p>

          <h3>Integrated drive units</h3>
          <p>
            Modern cars put the motor, inverter and reducer in one housing, a &quot;3-in-1&quot; e-axle. The inverter bolts
            onto the motor so the three-phase current runs through short busbars instead of cables, one oil and coolant
            circuit serves all three, and the unit is tested as one assembly. The Model 3 rear drive unit, with its roughly
            208 kW motor, 9.04:1 reducer and SiC inverter in one casting, is the reference design; Bosch, ZF and BorgWarner
            sell similar e-axles to other carmakers.
          </p>
        </Prose>

        <Figure caption="The EV powertrain. Orange is the HV DC bus, amber the three-phase AC, blue the 12 V network, dashed cyan the CAN bus. The violet box is what an integrated drive unit packages together.">
          <PowertrainBlockDiagram />
        </Figure>

        <Callout kind="tip" title="Rule of thumb">
          At the same power, current is P / V. Double the bus voltage and you halve the current and quarter the conduction
          loss in every cable, connector and contactor.
        </Callout>
        <Callout kind="interview">
          &quot;Why does an EV not need a gearbox?&quot; Answer with the torque curve: full torque from 0 rpm and an efficient
          speed range up to 16,000-20,000 rpm, so one 9:1 ratio covers launch to top speed.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: follow the energy">
        <EvDrivetrainFlow />
        <Callout kind="info" title="Try this">
          Turn on Brake and then Cold pack. Regen collapses to the BMS charge limit and the friction brakes glow: that is the
          real-world scenario below. Then flip to 800 V and watch the bus current halve while every kW figure stays the same.
        </Callout>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Size the HV cable for 150 kW at 400 V and at 800 V">
          <p>
            A drive unit draws 150 kW from the bus. The HV cable pair from the pack to the inverter is 2 m long. Copper has a
            resistivity of 1.72 × 10⁻⁸ Ω·m and a density of 8,960 kg/m³. Keep the current density near 5.4 A/mm².
          </p>
          <ol>
            <li>What current flows at 400 V and at 800 V?</li>
            <li>What cross-section does each need, using standard sizes of 35 mm² and 70 mm²?</li>
            <li>What is the copper mass and the I²R loss of each cable pair?</li>
            <li>A station cable is limited to 500 A. What is the most each car can charge at?</li>
          </ol>
          <CodeBlock
            lang="text"
            code={[
              "1) I = P / V",
              "   400 V: 150,000 / 400 = 375 A",
              "   800 V: 150,000 / 800 = 187.5 A   (about 187 A)",
              "",
              "2) A = I / J  at J ≈ 5.4 A/mm²",
              "   400 V: 375 / 5.4   = 69 mm²  -> 70 mm²",
              "   800 V: 187.5 / 5.4 = 35 mm²  -> 35 mm²",
              "",
              "3) mass = density × A × length (2 conductors × 2 m = 4 m)",
              "   70 mm²: 8960 × 70e-6 × 4 = 2.51 kg",
              "   35 mm²: 8960 × 35e-6 × 4 = 1.25 kg",
              "   R = ρ × 4 m / A",
              "   70 mm²: 1.72e-8 × 4 / 70e-6 = 0.98 mΩ  ->  375² × 0.98 mΩ = 138 W",
              "   35 mm²: 1.72e-8 × 4 / 35e-6 = 1.97 mΩ  ->  187.5² × 1.97 mΩ = 69 W",
              "",
              "4) P = V × I_max",
              "   400 V × 500 A = 200 kW     800 V × 500 A = 400 kW (station-limited to 350 kW)",
            ].join("\n")}
          />
          <p>
            <strong>Answer:</strong> 375 A at 400 V versus 187.5 A (about 187 A) at 800 V. The 800 V car uses half the
            copper (1.25 kg instead of 2.51 kg) and still loses half as much heat in the cable (69 W versus 138 W). Keep the
            70 mm² cable at 800 V instead and the loss drops to a quarter, 35 W. At the charger, 500 A caps the 400 V car at
            200 kW while the 800 V car can use the full 350 kW.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
