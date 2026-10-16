"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { HBridge } from "@/components/viz/robotics/HBridge";
import { ServoPwm } from "@/components/viz/robotics/ServoPwm";
import { StepperSteps } from "@/components/viz/robotics/StepperSteps";

const RAMP_CALC = `Robot: m = 0.5 kg, two driven wheels, wheel diameter 44 mm -> r = 0.022 m
Ramp:  theta = 10 degrees, sin = 0.174, cos = 0.985
Assume rolling resistance Crr = 0.02 (small rubber wheels on a hard floor)
       and an acceleration of 0.5 m/s^2 while on the ramp

Slope force    F_g = m g sin(theta)    = 0.5 x 9.81 x 0.174      = 0.85 N
Rolling        F_r = Crr m g cos(theta) = 0.02 x 0.5 x 9.81 x 0.985 = 0.10 N
Acceleration   F_a = m a                = 0.5 x 0.5               = 0.25 N
Total          F                                                    = 1.20 N

Wheel torque, both wheels   T = F r = 1.20 x 0.022 = 0.0264 N m
Per motor                   0.0264 / 2  = 0.0132 N m = 13.2 mN m  (about 0.13 kg cm)

Sizing rule: run at no more than about 25 % of stall torque
Required stall torque per motor >= 0.0132 / 0.25 = 0.053 N m (about 0.54 kg cm)

Check speed: 100 rpm x pi x 44 mm = 13.8 m/min = 0.23 m/s no-load
Mechanical power on the ramp: P = F v = 1.20 N x 0.2 m/s = 0.24 W in total`;

function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(cx + r * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(cy + r * Math.sin((a * Math.PI) / 180)).toFixed(1)}`;
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

function MotorCutaway() {
  const c = { x: 196, y: 196 };
  const k = { x: 574, y: 196 };
  return (
    <SvgCanvas viewBox="0 0 760 392" title="Brushed DC motor cutaway: magnets, armature windings, commutator and brushes">
      <Label x={c.x} y={16} size={12} bold>
        End view through the motor
      </Label>
      <Label x={k.x} y={16} size={12} bold>
        Commutator end
      </Label>

      {/* can and magnets */}
      <circle cx={c.x} cy={c.y} r={160} fill="none" stroke={vizColors.muted} strokeWidth={10} />
      <path d={sector(c.x, c.y, 122, 152, 125, 235)} fill={vizColors.red} opacity={0.85} />
      <path d={sector(c.x, c.y, 122, 152, -55, 55)} fill={vizColors.blue} opacity={0.85} />
      <Label x={c.x - 137} y={c.y} size={16} bold color={vizColors.bg}>
        N
      </Label>
      <Label x={c.x + 137} y={c.y} size={16} bold color={vizColors.bg}>
        S
      </Label>
      {[-62, 62].map((dy) => (
        <Arrow key={dy} x1={c.x - 112} y1={c.y + dy} x2={c.x + 112} y2={c.y + dy} color={vizColors.violet} width={1.5} head={7} dashed />
      ))}

      {/* armature: three poles with windings */}
      {[90, 210, 330].map((a) => (
        <g key={a} transform={`rotate(${a} ${c.x} ${c.y})`}>
          <rect x={c.x + 20} y={c.y - 12} width={74} height={24} fill={vizColors.grid} stroke={vizColors.muted} />
          <path d={sector(c.x, c.y, 92, 112, -38, 38)} fill={vizColors.grid} stroke={vizColors.muted} />
          <rect x={c.x + 34} y={c.y - 30} width={48} height={14} rx={4} fill={vizColors.copper} />
          <rect x={c.x + 34} y={c.y + 16} width={48} height={14} rx={4} fill={vizColors.copper} />
        </g>
      ))}
      <circle cx={c.x} cy={c.y} r={16} fill={vizColors.silk} stroke={vizColors.muted} strokeWidth={2} />
      <path d={`M${c.x + 30} ${c.y - 84} A90 90 0 0 0 ${c.x - 30} ${c.y - 84}`} fill="none" stroke={vizColors.amber} strokeWidth={2.5} />
      <polygon points={`${c.x - 30},${c.y - 84} ${c.x - 18},${c.y - 92} ${c.x - 20},${c.y - 78}`} fill={vizColors.amber} />

      {/* callouts, left figure */}
      <g stroke={vizColors.muted} strokeWidth={1}>
        <line x1={c.x - 112} y1={c.y - 79} x2={c.x - 140} y2={c.y - 140} />
        <line x1={c.x + 23} y1={c.y + 76} x2={c.x + 66} y2={c.y + 176} />
        <line x1={c.x - 6} y1={c.y + 60} x2={c.x - 60} y2={c.y + 176} />
        <line x1={c.x + 103} y1={c.y - 123} x2={c.x + 114} y2={c.y - 142} />
      </g>
      <Label x={14} y={c.y - 150} size={11} anchor="start" color={vizColors.text}>
        permanent magnet
      </Label>
      <Label x={c.x + 70} y={c.y + 188} size={11} anchor="middle" color={vizColors.text}>
        copper winding
      </Label>
      <Label x={c.x - 60} y={c.y + 188} size={11} anchor="middle" color={vizColors.text}>
        armature pole
      </Label>
      <Label x={c.x + 116} y={c.y - 150} size={11} anchor="start" color={vizColors.text}>
        steel can
      </Label>
      <Label x={c.x} y={c.y - 100} size={10.5} color={vizColors.amber}>
        rotation
      </Label>

      {/* commutator and brushes */}
      {[0, 120, 240].map((a) => (
        <path key={a} d={sector(k.x, k.y, 18, 48, a - 54, a + 54)} fill={vizColors.copper} stroke={vizColors.bg} strokeWidth={2} />
      ))}
      <circle cx={k.x} cy={k.y} r={14} fill={vizColors.silk} stroke={vizColors.muted} strokeWidth={2} />
      <rect x={k.x - 92} y={k.y - 15} width={42} height={30} rx={3} fill={vizColors.muted} />
      <rect x={k.x + 50} y={k.y - 15} width={42} height={30} rx={3} fill={vizColors.muted} />
      <polyline
        points={`${k.x - 92},${k.y} ${k.x - 98},${k.y - 8} ${k.x - 104},${k.y + 8} ${k.x - 110},${k.y - 8} ${k.x - 116},${k.y + 8} ${k.x - 122},${k.y}`}
        fill="none"
        stroke={vizColors.text}
        strokeWidth={1.5}
      />
      <polyline
        points={`${k.x + 92},${k.y} ${k.x + 98},${k.y - 8} ${k.x + 104},${k.y + 8} ${k.x + 110},${k.y - 8} ${k.x + 116},${k.y + 8} ${k.x + 122},${k.y}`}
        fill="none"
        stroke={vizColors.text}
        strokeWidth={1.5}
      />
      <line x1={k.x - 122} y1={k.y} x2={k.x - 150} y2={k.y} stroke={vizColors.red} strokeWidth={2.5} />
      <line x1={k.x + 122} y1={k.y} x2={k.x + 150} y2={k.y} stroke={vizColors.blue} strokeWidth={2.5} />
      <Label x={k.x - 162} y={k.y} size={16} bold color={vizColors.red}>
        +
      </Label>
      <Label x={k.x + 162} y={k.y} size={16} bold color={vizColors.blue}>
        −
      </Label>
      <g stroke={vizColors.muted} strokeWidth={1}>
        <line x1={k.x} y1={k.y - 48} x2={k.x} y2={k.y - 96} />
        <line x1={k.x - 71} y1={k.y + 15} x2={k.x - 90} y2={k.y + 70} />
        <line x1={k.x + 110} y1={k.y + 8} x2={k.x + 120} y2={k.y + 70} />
      </g>
      <Label x={k.x} y={k.y - 108} size={11} color={vizColors.text}>
        commutator: 3 copper segments on the shaft
      </Label>
      <Label x={k.x - 90} y={k.y + 82} size={11} color={vizColors.text}>
        carbon brush
      </Label>
      <Label x={k.x + 120} y={k.y + 82} size={11} color={vizColors.text}>
        spring
      </Label>
      <Label x={k.x} y={k.y + 128} size={10.5} color={vizColors.muted}>
        As the shaft turns, each brush slides onto the next segment,
      </Label>
      <Label x={k.x} y={k.y + 144} size={10.5} color={vizColors.muted}>
        flipping coil currents so the torque never changes sign.
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Turning electricity into motion">
        <Prose>
          <p>
            An actuator turns an electrical command into force or motion. Small robots use four kinds: brushed DC
            gearmotors for wheels, brushless motors for propellers and high-power joints, hobby servos for angles, and
            steppers for open-loop positioning. Every one needs a driver, because a microcontroller pin can supply
            about 20 mA and a stalled N20 wants more than an amp.
          </p>

          <h3>Brushed DC motors</h3>
          <p>
            A brushed motor has permanent magnets on the stator and coils on the rotor. The <strong>commutator</strong>,
            a split copper ring on the shaft, and two spring-loaded <strong>brushes</strong> reverse the current in
            each coil as it turns, so the torque always points the same way. Two equations describe the motor:
          </p>
          <ul>
            <li>Torque is proportional to current: T = Kt·I.</li>
            <li>
              A spinning motor is also a generator. Its <strong>back-EMF</strong> E = Ke·ω opposes the supply, so V =
              I·R + Ke·ω.
            </li>
          </ul>
          <p>
            In SI units Kt equals Ke. Hobby datasheets often give Kv in rpm per volt instead, and Kt ≈ 9.55/Kv N·m/A. At
            zero speed there is no back-EMF, so the <strong>stall current</strong> is V/R: a 6 V motor with 4 Ω windings
            draws 1.5 A at stall, and the same surge at every start. As the motor speeds up, back-EMF rises and current
            falls. Torque falls linearly from stall torque at zero speed to nothing at no-load speed, so mechanical
            power P = T·ω peaks at half of each: P_max = T_stall·ω₀/4.
          </p>
        </Prose>

        <Figure caption="Brushed DC motor: magnets on the stator (dashed arrows show the field from N to S), a three-pole armature on the shaft, and the commutator and brushes that switch each coil's current as it turns.">
          <MotorCutaway />
        </Figure>

        <Prose>
          <h3>Gearmotors, brushless motors, servos and steppers</h3>
          <p>
            The course robot&apos;s <strong>N20 gearmotors</strong> pair a 12 mm brushed motor spinning thousands of rpm
            with a small metal gearbox. A 50:1 ratio divides speed by 50 and multiplies torque by 50 times the
            gearbox efficiency, often 60-80% for several spur stages.
          </p>
          <p>
            <strong>Brushless (BLDC) motors</strong> put the coils on the stator and the magnets on the rotor, so there
            are no brushes to wear and efficiency reaches 85-90%. An electronic speed controller (ESC) commutates them
            using Hall sensors, back-EMF zero crossings or field-oriented control. Drones, e-bikes and quasi-direct-drive
            robot legs use them.
          </p>
          <p>
            A <strong>hobby servo</strong> is a DC motor, gearbox, potentiometer and control board in one case. It reads
            one pulse every 20 ms (50 Hz): 1 ms is one end of travel, 1.5 ms the centre and 2 ms the other end, though
            many, including the SG90, need about 0.5-2.5 ms for a full 180°. An SG90 gives about 1.8 kg·cm and turns 60°
            in 0.1 s at 4.8 V.
          </p>
          <p>
            A <strong>stepper</strong> moves in fixed increments as its two coils are energized in sequence: 200 steps
            per revolution (1.8°) for a typical NEMA 17. Half-stepping gives 400 positions, and{" "}
            <strong>microstepping</strong> drives sine and cosine currents to reach 3,200 at 1/16. Drivers such as the
            A4988 (up to 1/16, 35 V) and the Trinamic TMC2209 (up to 1/256, near-silent) regulate coil current by
            chopping. Steppers hold position without feedback but lose torque as speed rises and skip steps silently
            when overloaded.
          </p>

          <h3>The H-bridge</h3>
          <p>
            A DC motor reverses when its current reverses, which takes four switches arranged in an H. Closing the
            high-side switch on one side and the low-side switch on the other drives current one way; the opposite
            diagonal reverses it. Closing both low-side switches shorts the motor, and its back-EMF drives a current
            that opposes rotation: a <strong>brake</strong>. Opening all four lets it <strong>coast</strong>. Closing both
            switches on the same side is <strong>shoot-through</strong>, a short across the battery that can destroy
            MOSFETs in microseconds, so drivers insert <strong>dead time</strong>, a moment with both switches off, at
            every transition.
          </p>
          <p>
            Speed comes from <strong>PWM</strong>. Switching at about 20 kHz, above hearing, lets the motor&apos;s
            inductance smooth the current, and the average voltage is duty × supply. During the off part of each cycle
            the current keeps circulating, either through the low-side switches (slow decay, which the TB6612FNG uses)
            or through diodes back to the supply (fast decay). That is why every bridge needs <strong>flyback</strong>{" "}
            paths: an inductor&apos;s current cannot stop instantly, and without one, L·di/dt becomes a spike of tens of
            volts.
          </p>

          <h3>Driver ICs</h3>
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Switches</th>
                <th>Motor supply</th>
                <th>Current per channel</th>
                <th>Loss at 1 A</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>L298N</td>
                <td>Bipolar Darlington</td>
                <td>up to 46 V</td>
                <td>2 A</td>
                <td>about 2 V drop, 2 W</td>
              </tr>
              <tr>
                <td>TB6612FNG</td>
                <td>MOSFET</td>
                <td>2.5-13.5 V</td>
                <td>1.2 A (3.2 A peak)</td>
                <td>about 0.5 V, 0.5 W</td>
              </tr>
              <tr>
                <td>DRV8833</td>
                <td>MOSFET</td>
                <td>2.7-10.8 V</td>
                <td>1.5 A RMS (2 A peak)</td>
                <td>about 0.36 V, 0.36 W</td>
              </tr>
            </tbody>
          </table>
          <p>
            The L298N fills old tutorials, but on a 7.4 V pack it hands the motor only about 5.4 V. Many drivers also
            sense current, through a shunt resistor or an internal current mirror, so firmware can detect a stall or
            limit torque.
          </p>

          <h3>Torque, speed and sizing wheels</h3>
          <p>
            A wheel of radius r turns motor torque into force, F = T/r, and wheel speed into ground speed, v = ω·r. A
            gear ratio N multiplies torque by N times its efficiency and divides speed by N. To size a drive, add up the
            forces (slope m·g·sinθ, rolling resistance and m·a for acceleration), multiply by the wheel radius, divide
            by the number of driven wheels, then choose a motor and ratio that deliver that torque at no more than
            about 25% of stall torque while still reaching your top speed.
          </p>
        </Prose>

        <Callout kind="warning" title="Never reverse at full speed in one step">
          A motor spinning forward and suddenly driven in reverse sees the supply plus its own back-EMF, nearly twice
          the stall current. Ramp the duty cycle and pass through zero or brake first.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: drive a bridge, a servo and a stepper">
        <HBridge />
        <Prose>
          <p>
            Run it forward and press Brake: the motor stops in a fraction of a second. Run it forward again and press
            Coast: it takes several times longer. Finally, click Q2 while Q1 is on.
          </p>
        </Prose>
        <ServoPwm />
        <StepperSteps />
        <Prose>
          <p>
            Step through full-step mode and watch the rotor jump 90° electrical at a time, with both coils at 71%. Then
            switch to 1/16: the same motion becomes 16 small steps that trace a sine and a cosine.
          </p>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Size the drive for a 500 g robot on a 10° ramp">
          <p>
            The course robot weighs 500 g, has two driven 44 mm wheels and must climb a 10° ramp while accelerating at
            0.5 m/s². What torque does each motor need, and what stall torque should you shop for?
          </p>
          <CodeBlock lang="text" title="worked answer" code={RAMP_CALC} />
          <p>
            <strong>Answer.</strong> About 13 mN·m per motor, so look for a stall torque of at least 0.05 N·m (0.54
            kg·cm). Many 6 V N20 gearmotors in the 100 rpm class list 1-2 kg·cm at stall, a comfortable margin. Note that
            gravity is 70% of the load: a 20° ramp needs about 70% more torque, because the total force rises from 1.2 N to
            2.0 N.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
