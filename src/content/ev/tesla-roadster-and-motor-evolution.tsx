"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { MotorEvolutionTimeline } from "@/components/viz/ev/MotorEvolutionTimeline";
import { TorqueSpeedCurve } from "@/components/viz/ev/TorqueSpeedCurve";

const STATOR = "#2b3445";
const ROTOR = "#3b4252";
const SHAFT = "#6b7280";

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function Stator({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={116} fill={STATOR} stroke={vizColors.muted} />
      {Array.from({ length: 36 }, (_, i) => {
        const [x1, y1] = polar(cx, cy, 91, i * 10);
        const [x2, y2] = polar(cx, cy, 108, i * 10);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={vizColors.copper} strokeWidth={7} />;
      })}
      <circle cx={cx} cy={cy} r={88} fill={vizColors.bg} />
    </g>
  );
}

function InductionRotor({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={84} fill={ROTOR} />
      {Array.from({ length: 28 }, (_, i) => {
        const [x1, y1] = polar(cx, cy, 66, (i * 360) / 28);
        const [x2, y2] = polar(cx, cy, 79, (i * 360) / 28);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={vizColors.copper} strokeWidth={7} strokeLinecap="round" />;
      })}
      <circle cx={cx} cy={cy} r={15} fill={SHAFT} />
    </g>
  );
}

function IpmRotor({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={84} fill={ROTOR} />
      {Array.from({ length: 8 }, (_, k) => {
        const th = ((k * 45 + 22.5) * Math.PI) / 180;
        const u = [Math.cos(th), Math.sin(th)];
        const t = [-Math.sin(th), Math.cos(th)];
        const pt = (r: number, s: number): [number, number] => [cx + r * u[0] + s * t[0], cy + r * u[1] + s * t[1]];
        const color = k % 2 === 0 ? vizColors.positive : vizColors.negative;
        return (
          <g key={k}>
            {[1, -1].map((side) => {
              const [ax, ay] = pt(47, 3 * side);
              const [bx, by] = pt(75, 16 * side);
              const [fx, fy] = pt(79.5, 19 * side);
              return (
                <g key={side}>
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={7} />
                  <circle cx={fx} cy={fy} r={3.2} fill={vizColors.bg} />
                </g>
              );
            })}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={86} fill="none" stroke={vizColors.violet} strokeWidth={2} strokeDasharray="5 4" />
      <circle cx={cx} cy={cy} r={15} fill={SHAFT} />
    </g>
  );
}

function RotorFigure() {
  const legend: Array<{ color: string; text: string; dashed?: boolean }> = [
    { color: vizColors.copper, text: "copper" },
    { color: vizColors.positive, text: "magnet, N pole" },
    { color: vizColors.negative, text: "magnet, S pole" },
    { color: ROTOR, text: "laminated steel" },
    { color: vizColors.violet, text: "carbon sleeve", dashed: true },
  ];
  return (
    <SvgCanvas viewBox="0 0 720 330" title="Cross-sections of an induction rotor and an interior permanent magnet rotor inside their stators">
      <rect x={0} y={0} width={720} height={330} rx={8} fill={vizColors.bg} />
      <Label x={180} y={22} size={14} bold>
        Induction rotor
      </Label>
      <Label x={180} y={40} size={11} color={vizColors.muted}>
        Roadster, Model S, Model 3/Y front motor
      </Label>
      <Stator cx={180} cy={170} />
      <InductionRotor cx={180} cy={170} />
      <Label x={180} y={302} size={11}>
        Copper bars, shorted by end rings, carry induced current
      </Label>
      <Label x={180} y={318} size={11} color={vizColors.muted}>
        No magnets: no field and almost no drag when unpowered
      </Label>

      <Label x={540} y={22} size={14} bold>
        Interior permanent magnet rotor (IPM-SynRM)
      </Label>
      <Label x={540} y={40} size={11} color={vizColors.muted}>
        Model 3/Y rear motor
      </Label>
      <Stator cx={540} cy={170} />
      <IpmRotor cx={540} cy={170} />
      <Label x={540} y={302} size={11}>
        Buried V-shaped magnets plus flux barriers (air pockets)
      </Label>
      <Label x={540} y={318} size={11} color={vizColors.muted}>
        Magnets are always on: back-EMF and drag when coasting
      </Label>

      {legend.map((l, i) => {
        const y = 118 + i * 24;
        return (
          <g key={l.text}>
            {l.dashed ? (
              <line x1={312} x2={328} y1={y} y2={y} stroke={l.color} strokeWidth={2} strokeDasharray="4 3" />
            ) : (
              <rect x={312} y={y - 6} width={16} height={12} rx={2} fill={l.color} />
            )}
            <Label x={334} y={y} anchor="start" size={10}>
              {l.text}
            </Label>
          </g>
        );
      })}
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Fifteen years of Tesla drive units">
        <Prose>
          <p>
            Tesla&apos;s motors are a compact history of EV engineering: each generation fixed the constraint that limited the one before. The
            constraints are always the same four: torque per unit of rotor volume, how fast the rotor can spin, how much heat can be removed, and how
            efficiently the inverter switches.
          </p>

          <h3>2008 Roadster: proving the idea</h3>
          <p>
            The first Roadster was built on a <strong>Lotus Elise-derived chassis</strong> with a rear-mounted{" "}
            <strong>three-phase AC induction motor of about 185 kW</strong>. Its <strong>53 kWh</strong> pack held{" "}
            <strong>6,831 18650 cells</strong>, the laptop-battery format, which gave <strong>0-60 mph in 3.7-3.9 s</strong> and{" "}
            <strong>244 miles</strong> of EPA range. A two-speed gearbox was planned and then abandoned for a single fixed reduction: an electric
            motor makes full torque from standstill and keeps making power over a far wider speed range than a piston engine, so a second gear added
            mass and failure points for little gain.
          </p>
          <p>
            Why induction? The rotor is a stack of steel laminations with conducting bars shorted by end rings, and no magnets. The stator&apos;s
            field rotates slightly faster than the rotor (the slip), induces currents in the bars, and those currents make torque. No magnets means no
            rare-earth supply risk and no demagnetization at high temperature. It also means no field when the inverter is off, so an unpowered
            induction motor freewheels with almost no drag and cannot generate a dangerous voltage after a fault at high speed.
          </p>

          <h3>Model S (2012): induction, scaled up</h3>
          <p>
            The Model S kept the recipe and scaled it: a liquid-cooled induction motor with <strong>copper rotor bars</strong>, which have lower
            resistance than the usual cast aluminium and so make less rotor heat, fed by an 85 kWh pack of 7,104 18650 cells in 16 modules. Dual-motor
            versions arrived in 2014 with a second induction motor at the front.
          </p>

          <h3>Model 3 and Model Y: magnets arrive</h3>
          <p>
            The Model 3 (deliveries from July 2017) introduced a rear <strong>IPM-SynRM</strong>: permanent magnets buried in V-shaped pockets inside
            the rotor laminations, plus air-filled flux barriers that make the rotor magnetically uneven. Torque comes from the magnets pulling on the
            stator field and from <strong>reluctance torque</strong>, the steel trying to align its easy flux path with that field. At highway cruise
            the motor runs at light load, where an induction machine spends current magnetizing its rotor and heating its bars; magnets provide that
            field for free, so range improves. Dual-motor cars kept an <strong>induction motor at the front</strong>, because a part-time motor that
            freewheels without drag suits induction. The Model 3 also moved its inverter to <strong>silicon carbide MOSFETs</strong>, which lose far
            less than silicon IGBTs, especially at partial load.
          </p>

          <h3>Plaid (2021): speed is power</h3>
          <p>
            Mechanical power is torque times angular speed, <code>P = T × ω</code>. Torque is set by rotor size and current, so the cheapest way to
            get more power from the same size is to spin faster. The Model S Plaid uses <strong>three motors</strong> (one front, two rear) with{" "}
            <strong>carbon-fiber-sleeved permanent-magnet rotors</strong> that run to about <strong>20,000 rpm</strong>, for{" "}
            <strong>1,020 hp</strong>. The sleeve matters because hoop stress grows with the square of speed: at 20,000 rpm the surface of a rotor
            140 mm across moves at about 147 m/s. Carbon fiber is far stronger for its weight than steel, non-magnetic and much less conductive than a
            metal sleeve, so it holds the rotor together without adding much eddy-current loss.
          </p>

          <h3>Cybertruck (2023): the electrical system moves</h3>
          <p>
            The Cybertruck changed the architecture around the motors: an <strong>800 V-class</strong> high-voltage system, which halves the current
            for the same power; a <strong>48 V</strong> low-voltage system instead of 12 V, a quarter of the current for the same power and so a
            lighter harness; and <strong>steer-by-wire</strong>, with no mechanical link from the steering wheel to the rack.
          </p>
        </Prose>

        <Figure caption="Left: an induction rotor, laminated steel with copper bars shorted by end rings. Right: an interior permanent magnet rotor with V-shaped buried magnets and flux barriers, the Model 3/Y rear-motor type. The dashed ring marks where a carbon-fiber sleeve sits on a high-speed PM rotor such as the Plaid's.">
          <RotorFigure />
        </Figure>

        <Prose>
          <h3>The second-generation Roadster: claims, not specifications</h3>
          <p>
            Tesla unveiled a second-generation Roadster in <strong>November 2017</strong> and announced these figures: 0-60 mph in 1.9 s, a 200 kWh
            battery, 620 miles of range, a top speed above 250 mph and three motors, later joined by a &ldquo;SpaceX package&rdquo; of cold-gas
            thrusters. Every one of them is an <strong>announced claim, not a shipped specification</strong>. The car was promised for 2020 and has
            been delayed repeatedly, so check Tesla&apos;s site for its current status before quoting any of these numbers. The claims are still worth
            testing with physics. Reaching 60 mph in 1.9 s averages about 1.44 g, at or beyond the grip limit of road tires, and the thrusters were
            pitched as a way past that limit. At 160-200 Wh/kg for a whole pack, 200 kWh would weigh roughly 1,000-1,250 kg, heavy for a roadster.
          </p>

          <h3>Beyond Tesla: where motors are going</h3>
          <ul>
            <li>
              <strong>Hairpin windings</strong>: rectangular copper bars bent like hairpins, pushed into the slots and welded, fill around 70 % of the
              slot versus roughly 40-50 % for round wire, cutting copper loss and conducting heat out better.
            </li>
            <li>
              <strong>Oil cooling</strong>: oil sprayed on the end windings and pumped through the rotor shaft removes heat where it is made, which
              raises continuous power.
            </li>
            <li>
              <strong>Axial-flux motors</strong>: disc-shaped rotors and stators, short and torque-dense; YASA, bought by Mercedes-Benz in 2021, is
              the best-known maker.
            </li>
            <li>
              <strong>Rare-earth-free magnets</strong>: Tesla said at its 2023 Investor Day that its next permanent-magnet motor would use no
              rare-earth elements, while BMW&apos;s fifth-generation eDrive uses an electrically excited rotor instead of magnets. Treat unshipped
              designs as claims.
            </li>
            <li>
              <strong>Integrated drive units</strong>: motor, inverter and reducer in one housing sharing one coolant loop.
            </li>
            <li>
              <strong>800 V with SiC</strong>: the Porsche Taycan (2019) and Hyundai&apos;s E-GMP cars use it to charge faster through thinner cables.
            </li>
          </ul>
        </Prose>

        <Callout kind="interview" title="What EV-company interviews ask">
          <ul>
            <li>Why induction at the front and a permanent-magnet motor at the rear?</li>
            <li>What sets base speed, and what happens to torque and power above it?</li>
            <li>What happens if a permanent-magnet motor&apos;s inverter fails at high speed?</li>
            <li>Why silicon carbide, and what does it cost you?</li>
            <li>How would you check a spec someone quotes you?</li>
          </ul>
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: the motor timeline and the torque-speed envelope">
        <Prose>
          <p>
            Step through the timeline from the 2008 Roadster to today. The second-generation Roadster sits above the line as a dashed diamond because
            it is a set of announced claims, not a shipped car.
          </p>
        </Prose>
        <MotorEvolutionTimeline />
        <Prose>
          <p>
            Then compare machine types. Hold the speed at 15,000 rpm and switch motors: the induction curve has already lost power, while the
            carbon-sleeved PM is still at its peak.
          </p>
        </Prose>
        <TorqueSpeedCurve />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Specific power across motor generations">
          <p>
            A drive-unit team compares four machines. Power figures A, B and D come from the cars; C&apos;s power and all four masses are round
            assumptions for practice (active stator and rotor only), not published Tesla data.
          </p>
          <table>
            <thead>
              <tr>
                <th>Machine</th>
                <th>Peak power</th>
                <th>Assumed active mass</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A: Roadster-era induction</td>
                <td>185 kW</td>
                <td>52 kg</td>
              </tr>
              <tr>
                <td>B: Model S Performance-era copper-rotor induction</td>
                <td>310 kW (416 hp)</td>
                <td>75 kg</td>
              </tr>
              <tr>
                <td>C: IPM-SynRM</td>
                <td>200 kW (assumed)</td>
                <td>40 kg</td>
              </tr>
              <tr>
                <td>D: carbon-sleeved PM, one motor&apos;s average share of the Plaid&apos;s 1,020 hp</td>
                <td>?</td>
                <td>35 kg</td>
              </tr>
            </tbody>
          </table>
          <p>
            (1) Convert 1,020 hp to kW and find D&apos;s average share. (2) Compute each machine&apos;s specific power in kW/kg. (3) By what factor did
            specific power grow from A to D? (4) If D makes its peak power from 6,000 rpm upward, what torque does that imply?
          </p>
          <CodeBlock
            lang="text"
            code={[
              "(1) 1,020 hp × 0.7457 kW/hp      = 760.6 kW total; ÷ 3 motors = 253.5 kW",
              "(2) A: 185 ÷ 52                  = 3.6 kW/kg",
              "    B: 310 ÷ 75                  = 4.1 kW/kg",
              "    C: 200 ÷ 40                  = 5.0 kW/kg",
              "    D: 253.5 ÷ 35                = 7.2 kW/kg",
              "(3) 7.2 ÷ 3.6                    ≈ 2.0×",
              "(4) ω = 6,000 × 2π ÷ 60          = 628.3 rad/s",
              "    T = P ÷ ω = 253,500 ÷ 628.3  ≈ 403 N·m",
            ].join("\n")}
          />
          <p>
            <strong>Answer:</strong> D averages about 253.5 kW per motor; specific power rises from about 3.6 to 7.2 kW/kg, roughly double, with
            about 403 N·m at a 6,000 rpm base speed. The gain comes from speed, because the sleeve lets the same torque spin faster and{" "}
            <code>P = T × ω</code>; from magnets that need no magnetizing current; and from better cooling and copper fill that let the same copper
            carry more current.
            The SiC inverter does not make the motor lighter, but it cuts the losses the pack must cover.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
