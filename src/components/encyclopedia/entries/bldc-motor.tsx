import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Leader, Note, PartCanvas, Spin, part, round, useAnimate } from "../shared";

const CX = 160;
const CY = 100;
const SPIN = 4;
const POLES = 14;
const TEETH = 12;
const PHASES = [vizColors.red, vizColors.green, vizColors.blue] as const;

function polar(r: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  return `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
}

/** One magnet: an annular sector between radii `ri` and `ro`, spanning `a0`..`a1` degrees. */
function sector(ri: number, ro: number, a0: number, a1: number): string {
  return `M${polar(ri, a0)} L${polar(ro, a0)} A${ro} ${ro} 0 0 1 ${polar(ro, a1)} L${polar(ri, a1)} A${ri} ${ri} 0 0 0 ${polar(ri, a0)} Z`;
}

const MAGNETS = Array.from({ length: POLES }, (_, i) => ({ d: sector(58, 67, (i * 360) / POLES + 1, ((i + 1) * 360) / POLES - 1), north: i % 2 === 0 }));

const TEETH_GEOM = Array.from({ length: TEETH }, (_, i) => {
  const deg = (i * 360) / TEETH;
  const a = (deg * Math.PI) / 180;
  return { i, x1: round(CX + 24 * Math.cos(a)), y1: round(CY + 24 * Math.sin(a)), x2: round(CX + 50 * Math.cos(a)), y2: round(CY + 50 * Math.sin(a)), color: PHASES[i % 3] };
});

function BldcIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Outrunner brushless motor cross-section: fourteen permanent magnets on the spinning bell around twelve fixed stator coils, driven in three colour-coded phases whose glow travels round the stator">
      <Spin cx={CX} cy={CY} on={on} dur={SPIN}>
        <circle cx={CX} cy={CY} r={72} fill="none" stroke="#69758d" strokeWidth={6} />
        {MAGNETS.map((m, i) => (
          <path key={i} d={m.d} fill={m.north ? "#e0525a" : "#4f86e0"} />
        ))}
      </Spin>
      <circle cx={CX} cy={CY} r={56} fill="#161c28" />
      {TEETH_GEOM.map((t) => (
        <g key={t.i}>
          <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#4a5266" strokeWidth={13} strokeLinecap="butt" />
          <line x1={t.x1 + (t.x2 - t.x1) * 0.12} y1={t.y1 + (t.y2 - t.y1) * 0.12} x2={t.x1 + (t.x2 - t.x1) * 0.92} y2={t.y1 + (t.y2 - t.y1) * 0.92} stroke={t.color} strokeWidth={9} strokeLinecap="round" opacity={0.75}>
            <Anim on={on} name="opacity" values="0.3;1;0.3" dur={SPIN} begin={(t.i / TEETH) * SPIN - 1.5 * SPIN} />
          </line>
        </g>
      ))}
      <circle cx={CX} cy={CY} r={13} fill={part.metal} stroke={part.metalLo} />
      <circle cx={CX} cy={CY} r={5} fill="#2b303c" />
      <Note x={20} y={22} anchor="start" color={part.ink} size={10.5}>
        outrunner, 12N14P
      </Note>
      <Note x={300} y={64} anchor="end" size={10}>
        rotor magnets
      </Note>
      <Leader from={[240, 62]} to={[round(CX + 62 * Math.cos(-0.52)), round(CY + 62 * Math.sin(-0.52))]} />
      <Note x={300} y={146} anchor="end" size={10}>
        stator coils
      </Note>
      <Leader from={[246, 144]} to={[round(CX + 40 * Math.cos(0.7)), round(CY + 40 * Math.sin(0.7))]} />
      <g>
        {[
          { c: PHASES[0], t: "A", x: 88 },
          { c: PHASES[1], t: "B", x: 164 },
          { c: PHASES[2], t: "C", x: 240 },
        ].map((p) => (
          <g key={p.t}>
            <circle cx={p.x - 10} cy={190} r={4.5} fill={p.c} />
            <Label x={p.x} y={190} size={10.5} bold anchor="start">
              {`phase ${p.t}`}
            </Label>
          </g>
        ))}
      </g>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "bldc-motor",
  name: "BLDC motor",
  category: "actuator",
  oneLiner: "A brushless DC motor: a permanent-magnet rotor, three-phase stator windings and an electronic controller replace brushes and commutator.",
  howItWorks: [
    "A BLDC motor reverses the roles in a brushed motor: the permanent magnets sit on the rotor and the copper windings are fixed on the stator. A controller switches current through three phases (A, B, C) so the stator makes a rotating magnetic field that the rotor magnets chase. With no brushes there are no sparks and no brush wear.",
    "Six-step commutation uses three Hall sensors (or back-EMF sensing) to find which of six rotor sectors, each 60° electrical, the rotor is in, and energises two of the three phases through a six-MOSFET inverter. Field-oriented control (FOC) instead drives sinusoidal currents and controls the torque-producing current Iq and the flux current Id separately, for smooth, quiet, efficient running.",
    "Electrical frequency is pole pairs × rpm / 60, so a 14-pole (7 pole-pair) outrunner at 6000 rpm needs 700 Hz drive. The speed constant Kv (rpm per volt) sets the speed: a 920 Kv drone motor on 11.1 V spins about 10 000 rpm unloaded. Torque per amp is Kt = 9.55 / Kv, which is 0.0104 N·m/A for 920 Kv.",
    "An inrunner has the rotor inside the stator and spins fast with modest torque (RC cars, 3000 Kv and up). An outrunner's rotor bell wraps around the stator and gives high torque at low speed (drones, gimbals, e-bike hub motors). The controller is an ESC: 30 A for a drone, an open-source FOC board such as SimpleFOC or ODrive at 24-48 V for robots, and a 400-800 V inverter for an EV, where a sinusoidally driven BLDC is a PMSM.",
  ],
  whereUsed: [
    "Quadcopters and drones: 2205-2306 stator-size outrunners at 2000-2800 Kv with 30 A ESCs.",
    "Robot joints and gimbals: frameless BLDC motors with FOC drive and encoders.",
    "Cooling fans, hard-drive spindles, washing machines, vacuum cleaners and cordless tools, for efficiency and long life.",
    "E-bike hub motors of 250-750 W at 36-48 V, direct drive or geared.",
    "EV traction: the permanent-magnet synchronous machines in many cars are larger relatives driven by an inverter.",
  ],
  keySpecs: [
    { label: "Voltage", value: "7.4-14.8 V (drone), 24-48 V (robot, e-bike), 400-800 V (EV)" },
    { label: "Kv rating", value: "100-3000 rpm/V (drone motors 700-2800 Kv)" },
    { label: "Slots and poles", value: "12N14P is the common outrunner layout" },
    { label: "Efficiency", value: "85-95% at peak" },
    { label: "Power density", value: "1-5 kW/kg (3-6 kW/kg in EV traction)" },
    { label: "Commutation", value: "Hall sensors 120° apart, sensorless back-EMF, or FOC with an encoder" },
  ],
  failureModes: [
    "Loss of synchronism (desync): when commutation timing no longer tracks the rotor, torque collapses. In a drone the motor stutters and can cut out in flight. Causes include wrong timing, noise, a weak ESC, too-fast acceleration or a bent shaft.",
    "Demagnetisation: neodymium magnets lose strength above their temperature grade (N about 80 °C, H about 120 °C, SH about 150 °C) or under a strong opposing field from too much negative Id, permanently lowering Kt.",
    "Bearing failure: with no brushes, bearings are the wear item. Inverter common-mode voltage drives bearing currents that flute and pit the races in drives.",
    "Overheated windings: continuous current above rating heats the copper, and lacquer insulation fails at 155-180 °C, giving a winding short. Swapped Hall or phase wires make the motor run rough and hot.",
  ],
  interviewTip:
    "Interviewer asks: \"What is the difference between a BLDC and a PMSM, and between six-step and FOC?\" A good answer: both are permanent-magnet three-phase synchronous machines. 'BLDC' conventionally has trapezoidal back-EMF and six-step (block) commutation from Hall sensors, while 'PMSM' has sinusoidal back-EMF and FOC. FOC controls Iq (torque) and Id (flux, including field weakening) in the rotor frame using Clarke and Park transforms with encoder feedback. It gives smooth torque, a few percent better efficiency and speeds above base speed. Six-step is simpler and runs on a cheap MCU, but it has torque ripple and noise.",
  relatedLesson: "three-phase-motors",
  Illustration: BldcIllustration,
};
