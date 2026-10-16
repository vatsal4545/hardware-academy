"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { ArmKinematics } from "@/components/viz/robotics/ArmKinematics";
import { DiffDriveKinematics } from "@/components/viz/robotics/DiffDriveKinematics";
import { RoundedArrow as Arrow, r2 } from "@/components/viz/robotics/RoundedArrow";

// Geometry for the static figure (SVG units, y down). Heading 25° counter-clockwise from world x.
const FIG = (() => {
  const theta = (25 * Math.PI) / 180;
  const c = { x: 330, y: 250 };
  const h = { x: Math.cos(theta), y: -Math.sin(theta) }; // forward
  const n = { x: -Math.sin(theta), y: -Math.cos(theta) }; // left
  const half = 52; // L/2
  const vL = 50;
  const vR = 100;
  const r = (half * (vR + vL)) / (vR - vL); // 156: R = (L/2)(vR + vL)/(vR − vL)
  const add = (p: { x: number; y: number }, d: { x: number; y: number }, k: number) => ({ x: r2(p.x + d.x * k), y: r2(p.y + d.y * k) });
  const wl = add(c, n, half);
  const wr = add(c, n, -half);
  return {
    theta,
    c,
    h,
    n,
    wl,
    wr,
    tipL: add(wl, h, vL),
    tipR: add(wr, h, vR),
    icc: add(c, n, r),
    r,
    xTip: add(c, h, 100),
    yTip: add(c, n, 78),
    dimL: add(wl, h, -82),
    dimR: add(wr, h, -82),
    add,
  };
})();

function DiffDriveFigure() {
  const { c, h, n, wl, wr, tipL, tipR, icc, r, theta, xTip, yTip, dimL, dimR, add } = FIG;
  const deg = (theta * 180) / Math.PI;
  // arc of the circle the robot center follows around the ICC (angles in SVG space, increasing = clockwise on screen)
  const a0 = Math.atan2(c.y - icc.y, c.x - icc.x);
  const onPath = (a: number) => ({ x: icc.x + r * Math.cos(a), y: icc.y + r * Math.sin(a) });
  const p0 = onPath(a0 + 0.5);
  const p1 = onPath(a0 - 0.75);
  // ω: a 270° arc around the ICC, counter-clockwise on screen, with an arrowhead at its end
  const rw = 22;
  const w0 = { x: r2(icc.x + rw), y: icc.y };
  const wEnd = { x: r2(icc.x + rw * Math.cos(-4.4)), y: r2(icc.y + rw * Math.sin(-4.4)) };
  const wHeadFrom = { x: r2(icc.x + rw * Math.cos(-4.1)), y: r2(icc.y + rw * Math.sin(-4.1)) };
  const tick = (p: { x: number; y: number }) => {
    const a = add(p, h, 7);
    const b = add(p, h, -7);
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={vizColors.text} strokeWidth={1} />;
  };
  const rLabel = add(add(c, n, 122), h, -16);
  const yLabel = add(yTip, h, -22);
  const thetaLabel = { x: r2(c.x + 86 * Math.cos(theta / 2)), y: r2(c.y - 86 * Math.sin(theta / 2)) };
  return (
    <SvgCanvas viewBox="0 0 640 400" title="Differential-drive geometry: wheel speeds, wheel base, heading and the instantaneous center of curvature">
      <rect x={0} y={0} width={640} height={400} fill={vizColors.bg} rx={10} />
      {/* world frame */}
      <Arrow x1={36} y1={370} x2={116} y2={370} color={vizColors.muted} width={1.5} />
      <Arrow x1={36} y1={370} x2={36} y2={290} color={vizColors.muted} width={1.5} />
      <Label x={124} y={370} anchor="start" size={12} color={vizColors.muted}>
        x world
      </Label>
      <Label x={36} y={278} size={12} color={vizColors.muted}>
        y world
      </Label>

      {/* the circle the robot center follows */}
      <path
        d={`M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A ${r} ${r} 0 0 0 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`}
        fill="none"
        stroke={vizColors.cyan}
        strokeWidth={1.5}
        strokeDasharray="6 5"
        opacity={0.75}
      />

      {/* axle line through both wheels to the ICC, and the line through the speed-arrow tips */}
      <line x1={wr.x} y1={wr.y} x2={icc.x} y2={icc.y} stroke={vizColors.violet} strokeWidth={1.2} strokeDasharray="4 4" />
      <line x1={tipR.x} y1={tipR.y} x2={icc.x} y2={icc.y} stroke={vizColors.violet} strokeWidth={1} opacity={0.7} />

      {/* heading reference and θ */}
      <line x1={c.x} y1={c.y} x2={c.x + 128} y2={c.y} stroke={vizColors.muted} strokeDasharray="3 4" />
      <path
        d={`M ${c.x + 72} ${c.y} A 72 72 0 0 0 ${(c.x + 72 * Math.cos(theta)).toFixed(1)} ${(c.y - 72 * Math.sin(theta)).toFixed(1)}`}
        fill="none"
        stroke={vizColors.amber}
        strokeWidth={1.5}
      />
      <Label x={thetaLabel.x} y={thetaLabel.y} size={13} color={vizColors.amber}>
        θ
      </Label>

      {/* robot body and wheels */}
      <g transform={`translate(${c.x} ${c.y}) rotate(${-deg})`}>
        <rect x={-60} y={-64} width={120} height={128} rx={24} fill={vizColors.grid} fillOpacity={0.5} stroke={vizColors.cyan} strokeWidth={2} />
        <rect x={-22} y={-59} width={44} height={14} rx={4} fill={vizColors.muted} />
        <rect x={-22} y={45} width={44} height={14} rx={4} fill={vizColors.muted} />
        <circle cx={-46} cy={0} r={7} fill={vizColors.bg} stroke={vizColors.muted} />
      </g>

      {/* body frame */}
      <Arrow x1={c.x} y1={c.y} x2={xTip.x} y2={xTip.y} color={vizColors.cyan} width={2} />
      <Arrow x1={c.x} y1={c.y} x2={yTip.x} y2={yTip.y} color={vizColors.cyan} width={1.5} />
      <Label x={xTip.x + 10} y={xTip.y - 12} anchor="start" size={12} color={vizColors.cyan}>
        x body
      </Label>
      <Label x={yLabel.x} y={yLabel.y} anchor="end" size={12} color={vizColors.cyan}>
        y body
      </Label>
      <circle cx={c.x} cy={c.y} r={4} fill={vizColors.cyan} />

      {/* wheel speed arrows */}
      <Arrow x1={wl.x} y1={wl.y} x2={tipL.x} y2={tipL.y} color={vizColors.green} width={3} />
      <Arrow x1={wr.x} y1={wr.y} x2={tipR.x} y2={tipR.y} color={vizColors.orange} width={3} />
      <Label x={tipL.x + 8} y={tipL.y - 12} anchor="start" size={13} color={vizColors.green} bold>
        vL
      </Label>
      <Label x={tipR.x + 10} y={tipR.y + 6} anchor="start" size={13} color={vizColors.orange} bold>
        vR
      </Label>

      {/* wheel base dimension, drawn behind the robot */}
      <line x1={dimL.x} y1={dimL.y} x2={dimR.x} y2={dimR.y} stroke={vizColors.text} strokeWidth={1} />
      {tick(dimL)}
      {tick(dimR)}
      <Label x={(dimL.x + dimR.x) / 2 - 14} y={(dimL.y + dimR.y) / 2 + 6} size={13}>
        L
      </Label>

      {/* ICC and ω */}
      <circle cx={icc.x} cy={icc.y} r={6} fill={vizColors.violet} />
      <path d={`M ${w0.x.toFixed(1)} ${w0.y.toFixed(1)} A ${rw} ${rw} 0 1 0 ${wEnd.x.toFixed(1)} ${wEnd.y.toFixed(1)}`} fill="none" stroke={vizColors.violet} strokeWidth={1.5} />
      <Arrow x1={wHeadFrom.x} y1={wHeadFrom.y} x2={wEnd.x} y2={wEnd.y} color={vizColors.violet} width={1.5} head={7} />
      <Label x={icc.x - 30} y={icc.y + 4} anchor="end" size={13} color={vizColors.violet} bold>
        ICC
      </Label>
      <Label x={icc.x + 32} y={icc.y - 14} anchor="start" size={14} color={vizColors.violet}>
        ω
      </Label>
      <Label x={rLabel.x} y={rLabel.y} size={13} color={vizColors.violet}>
        R
      </Label>

      {/* equations */}
      <rect x={452} y={24} width={172} height={150} rx={8} fill={vizColors.grid} fillOpacity={0.45} stroke={vizColors.grid} />
      <Label x={466} y={50} anchor="start" size={13} mono>
        v = (vR + vL) / 2
      </Label>
      <Label x={466} y={80} anchor="start" size={13} mono>
        ω = (vR − vL) / L
      </Label>
      <Label x={466} y={110} anchor="start" size={13} mono>
        R = v / ω
      </Label>
      <Label x={466} y={140} anchor="start" size={11} color={vizColors.muted}>
        vR = 2·vL here, so the ICC
      </Label>
      <Label x={466} y={156} anchor="start" size={11} color={vizColors.muted}>
        sits 1.5·L from the center
      </Label>
    </SvgCanvas>
  );
}

const odometryCode = `// Called every 10 ms with the encoder tick deltas since the last call.
const float MM_PER_TICK = PI * 43.0f / 1050.0f;  // 0.12866 mm per tick
const float WHEEL_BASE  = 120.0f;                 // mm, calibrate with UMBmark

float x = 0, y = 0, theta = 0;                    // pose in the world frame

void updateOdometry(long dTicksL, long dTicksR) {
  float dsL = dTicksL * MM_PER_TICK;
  float dsR = dTicksR * MM_PER_TICK;
  float ds  = 0.5f * (dsR + dsL);
  float dth = (dsR - dsL) / WHEEL_BASE;
  x += ds * cosf(theta + 0.5f * dth);             // mid-step heading
  y += ds * sinf(theta + 0.5f * dth);
  theta = atan2f(sinf(theta + dth), cosf(theta + dth));  // wrap to (-π, π]
}`;

const odometryAnswer = `distance per tick = π × 43 mm / 1050          = 0.12866 mm
ΔsL = 140 × 0.12866 = 18.01 mm    ΔsR = 160 × 0.12866 = 20.59 mm
Δs  = (20.59 + 18.01) / 2                    = 19.30 mm
Δθ  = (20.59 − 18.01) / 120                  = 0.02144 rad = 1.23°

(a) x = 19.30 · cos(0.01072) = 19.30 mm
    y = 19.30 · sin(0.01072) =  0.21 mm
    θ = 1.23°
(b) v = 19.30 mm / 0.1 s = 19.3 cm/s
    ω = 0.02144 rad / 0.1 s = 0.214 rad/s
    R = v / ω = 90 cm (to the left)
(c) true Δθ = 2.573 / 125 = 0.02058 rad, so odometry over-counts 0.049° per step
    after 100 steps (10 s, 1.9 m of travel): heading off by 4.9°, position off by about 7.3 cm`;

const ikAnswer = `x² + y² = 60² + 150² = 26 100
cos θ2 = (26 100 − 120² − 90²) / (2 · 120 · 90) = 3 600 / 21 600 = 0.1667
θ2 = ±80.4°
atan2(150, 60) = 68.2°
elbow up   (θ2 = −80.4°): θ1 = 68.2° − atan2(90·sin(−80.4°), 120 + 90·cos(−80.4°)) = 68.2° + 33.3° = 101.5°
elbow down (θ2 = +80.4°): θ1 = 68.2° − 33.3° = 34.9°`;

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From wheel speeds to motion">
        <Prose>
          <h3>Two frames and the unicycle model</h3>
          <p>
            Every mobile robot lives in two coordinate frames. The <strong>world frame</strong> is fixed to the floor: x east, y north,
            angles counter-clockwise. The <strong>body frame</strong> rides on the robot with its origin at the middle of the wheel axle,
            x pointing forward and y to the left (the ROS convention in REP 103). The pose is three numbers, (x, y, θ), where θ is the
            heading measured from the world x-axis. Sensors report in the body frame; maps and goals live in the world frame, and a
            rotation by θ converts between them.
          </p>
          <p>
            A wheeled robot that cannot slide sideways obeys the <strong>unicycle model</strong>: <code>ẋ = v·cos θ</code>,{" "}
            <code>ẏ = v·sin θ</code>, <code>θ̇ = ω</code>. Its velocity in the body frame is always (v, 0). Zero sideways speed is a{" "}
            <strong>nonholonomic constraint</strong>: it limits how the robot can move at each instant, not where it can end up, which is
            why a car can still parallel park.
          </p>

          <h3>Differential drive: wheel speeds to v and ω</h3>
          <p>
            The course robot steers by running its two wheels at different speeds. With left and right wheel ground speeds vL and vR and
            a wheel base L between the wheel contact points:
          </p>
          <ul>
            <li>
              <code>v = (vR + vL) / 2</code>: body speed is the average of the wheels.
            </li>
            <li>
              <code>ω = (vR − vL) / L</code>: turn rate is the difference divided by the wheel base.
            </li>
            <li>
              <code>R = v / ω</code>: distance from the robot center to the <strong>instantaneous center of curvature</strong> (ICC),
              which always lies on the axle line.
            </li>
          </ul>
          <p>
            With L = 12 cm, vL = 15 cm/s and vR = 25 cm/s, the robot moves at 20 cm/s and turns at 0.83 rad/s (48°/s) around an ICC 24
            cm to its left. Equal speeds put the ICC at infinity (a straight line); equal and opposite speeds put it at the center (spin
            in place); stopping one wheel puts it on that wheel (R = L/2). A planner that wants a given (v, ω) sends{" "}
            <code>vR = v + ω·L/2</code> and <code>vL = v − ω·L/2</code>; if either exceeds the motor&apos;s top speed, scale both by the
            same factor so the curvature survives. Wheel speed comes from motor speed: an N20 gearmotor at 100 rpm on a 43 mm wheel gives
            100/60 × π × 0.043 m = 0.225 m/s.
          </p>

          <h3>Odometry and why it drifts</h3>
          <p>
            Odometry turns encoder ticks into a pose. Every control period (10 ms at 100 Hz) convert the tick deltas into wheel
            distances ΔsL and ΔsR, then update: <code>Δs = (ΔsR + ΔsL)/2</code>, <code>Δθ = (ΔsR − ΔsL)/L</code>,{" "}
            <code>x += Δs·cos(θ + Δθ/2)</code>, <code>y += Δs·sin(θ + Δθ/2)</code>, <code>θ += Δθ</code>. Using the mid-step heading
            keeps integration error negligible at 100 Hz. The real problem is that nothing ever corrects the running sum.
          </p>
          <p>
            <strong>Systematic</strong> errors repeat every run: unequal wheel diameters, and an effective wheel base that differs from
            the drawing because tires touch the floor across a patch, not a line. <strong>Non-systematic</strong> errors are random:
            slip, bumps, carpet seams, tick quantization. Heading errors hurt most because they turn every later meter into sideways
            error: 1° of heading error costs 17 mm per meter driven. On a 12 cm wheel base, a right wheel just 0.5% larger than the
            left curves a &quot;straight&quot; line with a 24 m radius, 8 cm off course after 2 m.
          </p>
          <p>
            Borenstein and Feng&apos;s <strong>UMBmark</strong> (University of Michigan, 1996) measures the systematic part: drive a 4 m
            × 4 m square five times clockwise and five times counter-clockwise and record where the robot stops. Both directions are
            needed because a wheel-diameter error and a wheel-base error add up in one direction and cancel in the other. Their
            correction factors cut return error roughly tenfold; after that, fuse a gyro for heading and add absolute fixes such as
            floor markers, a map or GNSS.
          </p>

          <h3>Driving to a goal</h3>
          <p>
            The simplest go-to-goal controller steers on heading error. Compute the bearing α = atan2(yg − y, xg − x), the error{" "}
            <code>e = α − θ</code> wrapped into −π…π with atan2(sin e, cos e), then command <code>ω = Kθ·e</code> and{" "}
            <code>v = min(vmax, Kρ·ρ)·max(0, cos e)</code>, where ρ is the distance to the goal. The cos e factor keeps the robot from
            driving away while it turns toward a goal behind it. Start with Kθ = 2 s⁻¹ and Kρ = 0.5 s⁻¹ and stop inside 2 cm, or it
            will circle the goal forever.
          </p>

          <h3>Smooth motion: trapezoidal profiles</h3>
          <p>
            Jumping straight to full speed spikes motor current and slips the wheels. A <strong>trapezoidal profile</strong> accelerates
            at a fixed limit, cruises, then decelerates. For a 1 m move with amax = 0.5 m/s² and vmax = 0.3 m/s, each ramp lasts 0.6 s
            and covers 9 cm, the cruise covers the other 82 cm, and the move takes 3.9 s. Moves shorter than vmax²/amax = 18 cm never
            reach cruise speed and become triangles. Industrial arms use S-curves that also limit jerk.
          </p>

          <h3>Arms: forward and inverse kinematics</h3>
          <p>
            A planar arm with links l1 and l2, shoulder angle θ1 and elbow angle θ2 (relative to link 1) has forward kinematics{" "}
            <code>x = l1·cos θ1 + l2·cos(θ1 + θ2)</code> and <code>y = l1·sin θ1 + l2·sin(θ1 + θ2)</code>. Inverse kinematics runs the
            other way. The law of cosines on the base, elbow and tip triangle gives{" "}
            <code>cos θ2 = (x² + y² − l1² − l2²) / (2·l1·l2)</code>. Outside −1…1 the target is unreachable; inside, θ2 = ±acos(…)
            gives two solutions, elbow down (θ2 &gt; 0) and elbow up (θ2 &lt; 0), and{" "}
            <code>θ1 = atan2(y, x) − atan2(l2·sin θ2, l1 + l2·cos θ2)</code>. With l1 = 120 mm and l2 = 90 mm, the target (150, 103.9)
            mm gives cos θ2 = 0.5, so θ2 = ±60° and θ1 = 60° (elbow up) or 9.4° (elbow down).
          </p>
          <p>
            That arm&apos;s <strong>workspace</strong> is an annulus from |l1 − l2| = 30 mm to l1 + l2 = 210 mm. On its edges the arm is
            fully stretched or folded, the two solutions merge, and the Jacobian determinant l1·l2·sin θ2 drops to zero: a{" "}
            <strong>singularity</strong>, where the tip cannot move radially and the joint speeds needed nearby blow up. Six-axis arms
            such as the Universal Robots UR5e (850 mm reach) have closed-form IK for their wrist geometry and plan around singular poses;
            general arms use numerical IK such as damped least squares.
          </p>
        </Prose>
        <Figure caption="Differential-drive geometry. The line through the tips of the wheel speed arrows (drawn to scale, vR = 2·vL) meets the axle line at the ICC; the robot center follows the dashed circle of radius R = v/ω.">
          <DiffDriveFigure />
        </Figure>
        <Callout kind="tip" title="Rule of thumb">
          Calibrate before you tune. A controller cannot fix a pose estimate that is wrong by a wheel-size error; run a square test
          both ways first, then tune gains.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: drive the robot, then move the arm">
        <DiffDriveKinematics />
        <Callout kind="info" title="Try this">
          Switch to the square test, set the right wheel to +0.5% and the wheel base error to +3%, and run it counter-clockwise: the
          robot closes the square within half a centimeter. Now run it clockwise: it misses by about 24 cm. That asymmetry is exactly
          what UMBmark exploits to separate the two errors.
        </Callout>
        <ArmKinematics />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Update odometry from encoder ticks">
          <p>
            The course robot has 43 mm wheels, encoders that give 1050 ticks per wheel revolution (7 pulses per motor turn × a 150:1
            gearbox) and a 120 mm wheel base. It starts at (0, 0, 0°). In one 100 ms window the left encoder counts 140 ticks and the
            right encoder 160.
          </p>
          <ol>
            <li>Compute the new pose (x, y, θ).</li>
            <li>Compute v, ω and the turn radius R.</li>
            <li>
              The real effective wheel base is 125 mm, not 120. If the robot holds these wheel speeds for 10 s, how far off is the
              odometry heading?
            </li>
          </ol>
          <CodeBlock lang="cpp" title="odometry.cpp" code={odometryCode} />
          <p>
            <strong>Answer</strong>
          </p>
          <CodeBlock lang="text" code={odometryAnswer} />
          <p>
            Part (c) is the whole story of odometry drift: a 4% wheel-base error is invisible in one step and costs 5° in ten seconds.
          </p>
        </Exercise>
        <Exercise title="Solve IK by hand, then check it in the viz">
          <p>
            For the arm above (l1 = 120 mm, l2 = 90 mm), find both joint solutions for the target (60, 150) mm. Then drag the target there
            and toggle the elbow to check your numbers.
          </p>
          <CodeBlock lang="text" code={ikAnswer} />
        </Exercise>
      </Section>
    </>
  );
}
