"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { RoundedArrow, r2 } from "@/components/viz/ev/EvAShapes";
import { Motor3D } from "@/components/viz/ev/Motor3D";
import { PHASES, ThreePhaseField } from "@/components/viz/ev/ThreePhaseField";

// Static snapshot at ωt = 0: iA = +Im, iB = −Im/2, iC = −Im/2.
const SNAPSHOT = [1, -0.5, -0.5];
const CX = 170;
const CY = 168;
const pt = (r: number, a: number) => ({ x: r2(CX + r * Math.cos(a)), y: r2(CY - r * Math.sin(a)) });

function StatorFieldFigure() {
  const unit = 62;
  // Tip-to-tail sum on the right, in the order B, A, C so the sum arrow does not sit on top of A.
  const order = [1, 0, 2];
  const p0 = { x: 404, y: 172 };
  const tips = order.reduce<Array<{ x: number; y: number }>>(
    (acc, k) => {
      const last = acc[acc.length - 1];
      const ph = PHASES[k];
      return [...acc, { x: r2(last.x + SNAPSHOT[k] * 132 * Math.cos(ph.axis)), y: r2(last.y - SNAPSHOT[k] * 132 * Math.sin(ph.axis)) }];
    },
    [p0],
  );
  return (
    <SvgCanvas
      viewBox="0 0 720 350"
      title="Stator with three windings 120 degrees apart at the instant phase A carries peak current, and the vector sum of the three winding fields"
    >
      <rect x={0} y={0} width={720} height={350} fill={vizColors.bg} rx={10} />

      {/* stator ring */}
      <circle cx={CX} cy={CY} r={122} fill="none" stroke="#273244" strokeWidth={40} />
      <circle cx={CX} cy={CY} r={142} fill="none" stroke={vizColors.muted} strokeWidth={1} />
      <circle cx={CX} cy={CY} r={102} fill="none" stroke={vizColors.muted} strokeWidth={1} />

      {/* flux: across the bore along the resultant, back through the yoke */}
      {[-46, 46].map((dy) => (
        <RoundedArrow key={dy} x1={CX - 80} y1={CY + dy} x2={CX + 80} y2={CY + dy} color={vizColors.violet} width={1.5} dashed />
      ))}
      <path
        d={`M ${pt(132, 0.25).x} ${pt(132, 0.25).y} A 132 132 0 0 0 ${pt(132, Math.PI - 0.25).x} ${pt(132, Math.PI - 0.25).y}`}
        fill="none"
        stroke={vizColors.violet}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <path
        d={`M ${pt(132, -0.25).x} ${pt(132, -0.25).y} A 132 132 0 0 1 ${pt(132, Math.PI + 0.25).x} ${pt(132, Math.PI + 0.25).y}`}
        fill="none"
        stroke={vizColors.violet}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <RoundedArrow x1={pt(132, Math.PI / 2 + 0.05).x} y1={pt(132, Math.PI / 2 + 0.05).y} x2={pt(132, Math.PI / 2 + 0.2).x} y2={pt(132, Math.PI / 2 + 0.2).y} color={vizColors.violet} width={1.5} />
      <RoundedArrow x1={pt(132, -Math.PI / 2 - 0.05).x} y1={pt(132, -Math.PI / 2 - 0.05).y} x2={pt(132, -Math.PI / 2 - 0.2).x} y2={pt(132, -Math.PI / 2 - 0.2).y} color={vizColors.violet} width={1.5} />

      {/* coil sides with the current direction at this instant */}
      {PHASES.map((ph, k) =>
        [1, -1].map((side) => {
          const a = ph.axis + (side * Math.PI) / 2;
          const c = pt(116, a);
          const l = pt(152, a);
          const out = side * SNAPSHOT[k] > 0;
          return (
            <g key={`${ph.name}${side}`}>
              <circle cx={c.x} cy={c.y} r={11} fill={ph.color} fillOpacity={0.15 + 0.5 * Math.abs(SNAPSHOT[k])} stroke={ph.color} strokeWidth={1.5} />
              {out ? (
                <circle cx={c.x} cy={c.y} r={3} fill={vizColors.text} />
              ) : (
                <g stroke={vizColors.text} strokeWidth={2}>
                  <line x1={c.x - 4} y1={c.y - 4} x2={c.x + 4} y2={c.y + 4} />
                  <line x1={c.x - 4} y1={c.y + 4} x2={c.x + 4} y2={c.y - 4} />
                </g>
              )}
              <Label x={l.x} y={l.y} size={12} bold color={ph.color}>
                {side === 1 ? ph.name : `${ph.name}′`}
              </Label>
            </g>
          );
        }),
      )}

      {/* winding axes, the resultant, then each phase's contribution on top */}
      {PHASES.map((ph) => {
        const end = pt(96, ph.axis);
        return <line key={ph.name} x1={CX} y1={CY} x2={end.x} y2={end.y} stroke={ph.color} strokeDasharray="2 4" opacity={0.7} />;
      })}
      <RoundedArrow x1={CX} y1={CY} x2={CX + 1.5 * unit} y2={CY} color={vizColors.text} width={5} head={13} />
      {PHASES.map((ph, k) => {
        const len = SNAPSHOT[k] * unit;
        return <RoundedArrow key={ph.name} x1={CX} y1={CY} x2={CX + len * Math.cos(ph.axis)} y2={CY - len * Math.sin(ph.axis)} color={ph.color} width={2.5} />;
      })}
      <circle cx={CX} cy={CY} r={4} fill={vizColors.muted} />
      <Label x={14} y={340} anchor="start" size={11} color={vizColors.muted}>
        • current out of the page, × into it
      </Label>

      {/* vector sum */}
      <Label x={540} y={30} size={13} bold>
        At ωt = 0
      </Label>
      <Label x={540} y={52} size={12} mono color={vizColors.muted}>
        iA = +Im   iB = −Im/2   iC = −Im/2
      </Label>
      {order.map((k, j) => (
        <RoundedArrow key={PHASES[k].name} x1={tips[j].x} y1={tips[j].y} x2={tips[j + 1].x} y2={tips[j + 1].y} color={PHASES[k].color} width={3} />
      ))}
      <RoundedArrow x1={p0.x} y1={p0.y} x2={tips[3].x} y2={tips[3].y} color={vizColors.text} width={4} head={12} />
      <Label x={(p0.x + tips[3].x) / 2} y={p0.y - 16} size={12} bold>
        Sum: 1.5 × Im along 0°
      </Label>
      <Label x={(tips[0].x + tips[1].x) / 2 - 8} y={(tips[0].y + tips[1].y) / 2 + 12} size={11} anchor="end" color={PHASES[1].color}>
        B: 0.5 along 300°
      </Label>
      <Label x={(tips[1].x + tips[2].x) / 2} y={tips[1].y + 18} size={11} color={PHASES[0].color}>
        A: 1.0 along 0°
      </Label>
      <Label x={(tips[2].x + tips[3].x) / 2 + 12} y={(tips[2].y + tips[3].y) / 2 + 10} size={11} anchor="start" color={PHASES[2].color}>
        C: 0.5 along 60°
      </Label>
      <Label x={540} y={300} size={11} color={vizColors.muted}>
        Advance ωt and the sum keeps its length
      </Label>
      <Label x={540} y={316} size={11} color={vizColors.muted}>
        and turns with it: a rotating field.
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="How three currents make a motor turn">
        <Prose>
          <h3>A field that turns by itself</h3>
          <p>
            Put three identical windings in a stator, 120° apart, and drive them with three currents that are also 120°
            apart in time: iA = Im·cos ωt, iB = Im·cos(ωt − 120°), iC = Im·cos(ωt + 120°). Each winding&apos;s field only
            grows and shrinks along its own axis. Add the three vectors, though, and the pulsating parts cancel: the sum
            always has length 1.5·Im and points at angle ωt. A rotating magnetic field appears with no moving parts. Nikola
            Tesla patented the polyphase induction motor built on this idea in 1888, and Galileo Ferraris found it
            independently. Swap any two phases and the field turns the other way, which is all reverse gear is in an EV.
          </p>

          <h3>Poles and synchronous speed</h3>
          <p>
            Wind the stator so the pattern repeats and you get more poles. A machine with p poles has p/2 pole pairs, and
            its field advances one pole pair per electrical cycle, so it turns at the synchronous speed
            n<sub>s</sub> = 120·f/p rpm. A 2-pole motor on 60 Hz mains turns 3,600 rpm, a 4-pole motor on 50 Hz 1,500 rpm.
            A traction inverter makes whatever frequency it needs: a 4-pole motor at 400 Hz turns 12,000 rpm, and an 8-pole
            motor at 18,000 rpm needs 1,200 Hz. More poles mean shorter end turns and thinner back iron, but a higher
            electrical frequency for the same speed, which raises iron loss and asks more of the inverter.
          </p>

          <h3>Induction motors: torque from slip</h3>
          <p>
            An induction rotor is a squirrel cage: aluminum or copper bars in a laminated steel core, shorted by end rings,
            with no magnets and no electrical connection. If it turns slower than the field, the field sweeps through the
            bars, induces currents, and those currents push the rotor along. The lag is the slip,
            {" "}s = (n<sub>s</sub> − n)/n<sub>s</sub>, typically 1-5% at rated load; at zero slip nothing is induced and
            there is no torque. Rotor
            currents run at the slip frequency s·f, a few hertz, and the rotor copper loss equals slip times the air-gap
            power, so the rotor runs hot and is hard to cool. The stator must also supply magnetizing current, which costs
            efficiency at light load. In exchange you get a rugged motor with no rare earths and no back-EMF when
            unpowered. The 2008 Tesla Roadster used a 4-pole induction motor of about 185 kW that spun to 14,000 rpm, and
            the Model S (2012) and Model X (2015) used copper-rotor induction motors.
          </p>

          <h3>Permanent-magnet synchronous motors</h3>
          <p>
            Replace the cage with neodymium-iron-boron (NdFeB) magnets and the rotor needs no induced current: it locks to
            the field and turns at exactly synchronous speed. With no magnetizing current and almost no rotor copper loss,
            PM motors reach 95-97% peak efficiency and stay efficient at light load. In a surface PM motor torque is simply
            <strong> T = Kt·Iq</strong>, where Iq is the stator current component 90° ahead of the magnet axis and Kt = 1.5 ×
            pole pairs × magnet flux linkage. Four pole pairs and 0.05 Wb give Kt = 0.3 N·m/A, so 400 A makes 120 N·m.
          </p>
          <p>
            The magnets bring three costs. They need rare earths, with dysprosium or terbium added for heat resistance.
            They can be demagnetized: NdFeB coercivity falls about 0.5-0.6% per °C, so a hot magnet hit by a strong reverse
            field loses flux for good. And they always generate back-EMF in proportion to speed. Above base speed the
            back-EMF approaches what the inverter can produce from the DC bus, so the controller injects negative d-axis
            current to oppose the magnets. This field weakening holds power roughly constant up to top speed, at the price
            of extra current and reverse field on the magnets.
          </p>

          <h3>Synchronous reluctance and Tesla&apos;s hybrid</h3>
          <p>
            A synchronous reluctance motor has no magnets and no cage, just a steel rotor cut with flux barriers so it is
            far easier to magnetize along one axis than the other. The rotor turns to align its easy axis with the field,
            giving reluctance torque proportional to (Ld − Lq)·Id·Iq. It is cheap and runs cool but has a poor power factor.
            Tesla&apos;s Model 3 (2017) combined the two in an interior-PM synchronous reluctance motor: NdFeB magnets
            buried in the flux barriers, so magnet torque and reluctance torque add and fewer magnets are needed. In
            dual-motor Model 3s the rear motor is this PM machine and the front is induction, because an induction motor
            that is switched off spins with no magnet drag.
          </p>

          <h3>Efficiency maps, cooling and windings</h3>
          <p>
            Motor makers plot efficiency as contours over the torque-speed plane. A PM motor&apos;s map has a 96-97% island
            at mid speed and moderate torque, falling off at high torque, where copper loss grows with current squared, and
            at high speed, where iron loss and field-weakening current grow. Drive cycles spend most of their time at low
            torque, which is exactly where PM beats induction. Heat sets continuous power, so modern drive units spray oil,
            which does not conduct, straight onto the end windings and pump it through a hollow rotor shaft. Many stators
            now use hairpin windings: rectangular copper bars bent like hairpins, pushed into the slots and laser-welded.
            They fill about 70% of the slot against roughly 45% for round wire, cutting resistance and improving heat
            transfer, but they suffer more AC loss at high frequency, so designers split them into four to eight thin
            layers per slot. BorgWarner&apos;s HVH motors, originally Remy&apos;s High Voltage Hairpin line, are an early
            example.
          </p>
        </Prose>

        <Figure caption="A 2-pole stator at the instant phase A carries its peak current. Each winding pushes flux along its own axis; tip to tail, the three contributions add to 1.5 × Im along phase A's axis.">
          <StatorFieldFigure />
        </Figure>

        <Callout kind="warning" title="A spinning PM motor is a generator">
          Tow a PM-motor car fast with the inverter off and the back-EMF can exceed the bus voltage, pushing uncontrolled
          current through the diodes into the pack. Drives use an active short circuit, all three low-side switches on, as
          their safe state.
        </Callout>
        <Callout kind="interview">
          Be ready to derive n<sub>s</sub> = 120·f/p: f electrical cycles per second, divided by p/2 pole pairs, times 60
          seconds per minute.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: spin up the field">
        <ThreePhaseField />
        <Callout kind="info" title="Try this">
          With the induction rotor, set slip to 0 and the bar currents vanish: no slip, no torque. Raise it to 10% and the
          green mark visibly falls behind the field. Switch to PM synchronous and the rotor locks on.
        </Callout>
        <Motor3D />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Synchronous speed at 400 Hz">
          <p>
            A 4-pole traction motor is fed at 400 Hz. The car has a 9:1 reducer and 0.67 m diameter tires.
          </p>
          <ol>
            <li>What is the synchronous speed?</li>
            <li>If it is an induction motor running at 3% slip, how fast does the rotor turn, and at what frequency do its rotor currents flow?</li>
            <li>For a PM motor at synchronous speed, how fast is the car going?</li>
            <li>What frequency would an 8-pole motor need for the same shaft speed?</li>
          </ol>
          <CodeBlock
            lang="text"
            code={[
              "1) n_s = 120 × f / p = 120 × 400 / 4 = 12,000 rpm",
              "   (400 electrical rev/s ÷ 2 pole pairs = 200 rev/s × 60 = 12,000 rpm)",
              "",
              "2) n = n_s × (1 − s) = 12,000 × 0.97 = 11,640 rpm",
              "   f_rotor = s × f = 0.03 × 400 = 12 Hz",
              "",
              "3) wheel = 12,000 / 9 = 1,333 rpm = 22.2 rev/s",
              "   v = 22.2 × π × 0.67 m = 46.8 m/s ≈ 168 km/h",
              "",
              "4) f = n × p / 120 = 12,000 × 8 / 120 = 800 Hz",
            ].join("\n")}
          />
          <p>
            <strong>Answer:</strong> 12,000 rpm synchronous. The induction rotor turns at 11,640 rpm with 12 Hz currents in
            its bars; the PM rotor turns at exactly 12,000 rpm, which through 9:1 and a 0.67 m tire is about 168 km/h. An
            8-pole motor would need 800 Hz for the same speed, so its inverter must also switch faster to keep enough PWM
            pulses per electrical cycle.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
