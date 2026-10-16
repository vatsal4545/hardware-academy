"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, polyline, vizColors } from "@/components/viz/shared";
import { RoundedArrow } from "@/components/viz/robotics/RoundedArrow";
import { StateMachine } from "@/components/viz/robotics/StateMachine";

// Bug2 figure geometry (SVG units). The obstacle polygon is crossed by the M-line from S to G.
const S = { x: 60, y: 240 };
const G = { x: 585, y: 70 };
const H = { x: 235.8, y: 183.1 }; // where the M-line first hits the obstacle
const L = { x: 417.6, y: 124.2 }; // where the boundary walk meets the M-line again, closer to G
const OBSTACLE: Array<[number, number]> = [
  [225, 118],
  [300, 78],
  [392, 92],
  [438, 150],
  [408, 214],
  [312, 236],
  [238, 196],
];
// Boundary-following path, offset about 9 px outside the obstacle, going over the top.
const BOUNDARY: Array<[number, number]> = [
  [H.x, H.y],
  [226.9, 184.6],
  [216, 113.6],
  [298.4, 68.6],
  [397, 83.3],
  [424.7, 118.6],
  [L.x, L.y],
];

function Bug2Figure() {
  const obstaclePath = `${polyline(OBSTACLE)} Z`;
  return (
    <SvgCanvas viewBox="0 0 640 300" title="Bug2: drive along the M-line, follow the obstacle boundary from the hit point, leave at the M-line closer to the goal">
      <rect x={0} y={0} width={640} height={300} rx={10} fill={vizColors.bg} />
      {/* M-line */}
      <line x1={S.x} y1={S.y} x2={G.x} y2={G.y} stroke={vizColors.muted} strokeWidth={1.5} strokeDasharray="7 6" />
      <Label x={300} y={148} size={12} color={vizColors.muted} rotate={-17.9}>
        M-line
      </Label>

      {/* obstacle */}
      <path d={obstaclePath} fill={vizColors.orange} fillOpacity={0.18} stroke={vizColors.orange} strokeWidth={2} />
      <Label x={352} y={206} size={13} color={vizColors.orange}>
        obstacle
      </Label>

      {/* robot path: M-line to H, boundary to L, M-line to G */}
      <path d={polyline([[S.x, S.y], [H.x, H.y]])} fill="none" stroke={vizColors.cyan} strokeWidth={3} />
      <path d={polyline(BOUNDARY)} fill="none" stroke={vizColors.cyan} strokeWidth={3} strokeLinejoin="round" />
      <path d={polyline([[L.x, L.y], [G.x, G.y]])} fill="none" stroke={vizColors.cyan} strokeWidth={3} />
      <RoundedArrow x1={130} y1={217.3} x2={160} y2={207.6} color={vizColors.cyan} width={3} head={11} />
      <RoundedArrow x1={330} y1={73.4} x2={360} y2={78} color={vizColors.cyan} width={3} head={11} />
      <RoundedArrow x1={480} y1={104} x2={510} y2={94.3} color={vizColors.cyan} width={3} head={11} />

      {/* points */}
      <circle cx={S.x} cy={S.y} r={7} fill={vizColors.green} />
      <Label x={S.x} y={S.y + 20} size={12} color={vizColors.green} bold>
        S (start)
      </Label>
      <circle cx={G.x} cy={G.y} r={8} fill="none" stroke={vizColors.amber} strokeWidth={3} />
      <circle cx={G.x} cy={G.y} r={3} fill={vizColors.amber} />
      <Label x={G.x} y={G.y - 20} size={12} color={vizColors.amber} bold>
        G (goal)
      </Label>
      <circle cx={H.x} cy={H.y} r={6} fill={vizColors.red} />
      <Label x={205} y={160} anchor="end" size={12} color={vizColors.red}>
        H: hit point
      </Label>
      <circle cx={L.x} cy={L.y} r={6} fill={vizColors.violet} />
      <Label x={450} y={152} anchor="start" size={12} color={vizColors.violet}>
        L: leave point
      </Label>

      {/* annotations */}
      <Label x={250} y={48} size={11} color={vizColors.text}>
        follow the boundary (wall following)
      </Label>
      <Label x={462} y={200} anchor="start" size={11} color={vizColors.muted}>
        leave only on the M-line,
      </Label>
      <Label x={462} y={216} anchor="start" size={11} color={vizColors.muted}>
        and only if |LG| is less than |HG|
      </Label>
    </SvgCanvas>
  );
}

const fsmCode = `// Robot simulator lab: line follower with obstacle avoidance as a state machine.
// sensors.line.left/right are 0 or 1, sensors.ultrasonic.front is in cm, sensors.t in s.
function control(sensors, memory) {
  const { line, ultrasonic, t } = sensors;
  if (memory.state === undefined) {
    memory.state = "FOLLOW";
    memory.since = t;
    memory.lastSide = 1;            // +1: line last seen on the left, -1: on the right
    memory.lastOnLine = t;
  }
  const go = (s) => { memory.state = s; memory.since = t; };
  const inState = t - memory.since;
  const onLine = line.left === 1 || line.right === 1;
  if (onLine) memory.lastOnLine = t;
  if (line.left && !line.right) memory.lastSide = 1;
  if (line.right && !line.left) memory.lastSide = -1;

  // 1. transitions (events and guards)
  switch (memory.state) {
    case "FOLLOW":
      if (ultrasonic.front < 20) go("AVOID");
      // short gaps are normal (sensors that straddle the line both read 0 when centered)
      else if (t - memory.lastOnLine > 0.3) go("RECOVER");
      break;
    case "AVOID":                                  // hysteresis: in at 20 cm, out at 30 cm
      if (ultrasonic.front > 30 && inState > 0.8) { memory.lastSide = 1; go("RECOVER"); }
      break;
    case "RECOVER":
      if (ultrasonic.front < 20) go("AVOID");
      else if (onLine) go("FOLLOW");
      else if (inState > 3) go("STOP");          // timeout: never search forever
      break;
  }

  // 2. actions (what each state does every tick)
  switch (memory.state) {
    case "FOLLOW": {
      const e = line.left - line.right;           // +1 line under the left sensor
      return { left: 0.5 - 0.35 * e, right: 0.5 + 0.35 * e };
    }
    case "AVOID":
      return { left: 0.6, right: 0.15 };          // arc right around the obstacle
    case "RECOVER":                                // arc toward the side the line was last seen
      return { left: 0.3 - 0.25 * memory.lastSide, right: 0.3 + 0.25 * memory.lastSide };
    default:
      return { left: 0, right: 0 };
  }
}`;

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From reflexes to maps">
        <Prose>
          <h3>Reactive behaviors: Braitenberg vehicles</h3>
          <p>
            In 1984 Valentino Braitenberg showed that a vehicle with two sensors wired almost directly to two motors can look
            purposeful. Connect each sensor to the motor on its own side so that more stimulus means less speed, and the vehicle turns
            toward the stimulus; cross the connections and it turns away. Obstacle avoidance on the course robot is the same idea with
            numbers. Convert each ultrasonic range into a proximity <code>p = max(0, 1 − d / 50 cm)</code>, then command{" "}
            <code>left = 0.6 − 0.8·pR</code> and <code>right = 0.6 − 0.8·pL</code>. An obstacle on the right slows the left wheel, so
            the robot turns left, away from it. There is no map and no memory, which makes it fast (a few multiplications at 100 Hz)
            and fragile: in a corner it can swing left and right forever.
          </p>

          <h3>Wall following</h3>
          <p>
            To follow a wall on the right at 25 cm, steer on the side-distance error: <code>turn = Kp·(d − 25)</code>, positive meaning
            toward the wall. With Kp = 0.02 per cm, being 10 cm too far gives a turn command of 0.2. Pure P control weaves, because
            the side sensor reads the robot&apos;s angle to the wall as extra distance; a D term on the error, or the 45° ray used to
            estimate the wall angle, damps it. Corners need a rule of their own: if the front range drops under 25 cm, turn left in
            place until it clears. That rule is already a second behavior, which is where arbitration comes in.
          </p>

          <h3>Line following</h3>
          <p>
            Two reflectance sensors such as the TCRT5000 sit side by side over a 19 mm strip of electrical tape, a few millimeters
            above the floor. Digital outputs give an error of −1, 0 or +1; analog outputs give a proportional error{" "}
            <code>e = (L − R)/(L + R)</code>,
            which allows a smooth PD law such as <code>turn = 0.6·e + 0.05·de/dt</code> around a base speed of 0.5. Slow the base
            speed as |e| grows so the robot does not overshoot curves. When both sensors lose the line the robot needs{" "}
            <strong>memory</strong>: the side where the line was last seen. Arc toward that side, widen the search after half a second,
            and stop after 3 s rather than wander off the table.
          </p>

          <h3>Bug algorithms: reaching a goal without a map</h3>
          <p>
            Lumelsky and Stepanov&apos;s Bug algorithms (1987) need only the goal position, odometry and a contact or range sensor.{" "}
            <strong>Bug0</strong> heads for the goal and follows any obstacle it hits until it can head for the goal again: simple,
            but some obstacle shapes trap it in a loop. <strong>Bug1</strong> circles each obstacle completely, remembers the boundary
            point closest to the goal, returns there and leaves; it always succeeds but can walk 1.5 times each obstacle&apos;s
            perimeter. <strong>Bug2</strong> draws the M-line from start to goal, follows the obstacle boundary from the hit point
            until it meets the M-line again at a point closer to the goal, then leaves along the M-line. It reaches the goal whenever
            the goal is reachable, and its paths are usually much shorter than Bug1&apos;s.
          </p>

          <h3>Arbitration: state machines and behavior trees</h3>
          <p>
            A robot running several behaviors must pick one each tick. A <strong>finite state machine</strong> (FSM) does it
            explicitly: states such as Idle, Follow, Avoid and Recover, the events that move between them, and the action each state
            runs. Two details make FSMs robust. <strong>Hysteresis</strong>: enter Avoid when the front range drops under 20 cm but
            leave only above 30 cm, so 1 cm of sensor noise around 20 cm cannot make the state chatter. <strong>Timeouts</strong>:
            every state that waits for something has a limit, so the robot can never wait forever.
          </p>
          <p>
            Rodney Brooks&apos;s subsumption architecture (1986) arbitrated by priority layers instead. Modern stacks use{" "}
            <strong>behavior trees</strong>: trees of Sequence, Fallback and action nodes ticked at 10-100 Hz, each returning SUCCESS,
            FAILURE or RUNNING. ROS 2&apos;s Nav2 runs its navigation logic on BehaviorTree.CPP because a tree stays readable with 50
            behaviors, where an FSM with 50 states and hundreds of transitions does not.
          </p>

          <h3>Maps, SLAM and planning in brief</h3>
          <p>
            An <strong>occupancy grid</strong> (Moravec and Elfes, 1985) splits the floor into cells, often 5 cm, each holding the
            probability that it is occupied; a 10 m × 10 m room is 40,000 cells. Each range reading raises the probability at the hit
            cell and lowers it along the beam, usually in log-odds so an update is an addition. <strong>SLAM</strong> (simultaneous
            localization and mapping) breaks the chicken-and-egg problem that you need a map to localize and a pose to map: particle
            filters such as GMapping and graph optimizers such as Cartographer and slam_toolbox estimate both, and a{" "}
            <strong>loop closure</strong> (recognizing a place seen before) removes the drift accumulated around the loop.
          </p>
          <p>
            Given a grid, <strong>Dijkstra</strong> expands cells in order of cost so far, g, and finds the shortest path.{" "}
            <strong>A*</strong> expands in order of <code>f = g + h</code>, where h estimates the remaining cost, for example the
            straight-line distance. If h never overestimates, A* is still optimal, and in open space it explores a narrow band toward
            the goal instead of a growing circle, often visiting ten times fewer cells on a 100 × 100 grid. Real planners also inflate
            obstacles by the robot&apos;s radius so the path keeps a safe clearance.
          </p>
        </Prose>
        <Figure caption="Bug2. The robot drives along the M-line, hits the obstacle at H, follows the boundary and leaves at L, the first point back on the M-line that is closer to the goal than H.">
          <Bug2Figure />
        </Figure>
        <Callout kind="interview" title="Interview angle">
          When asked to design robot behavior, draw the state machine first: states, events with thresholds, and a timeout on every
          waiting state. It shows you think about failure cases, not just the happy path.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: drive the state machine">
        <StateMachine />
        <Callout kind="info" title="Try this">
          Fire Start, then Obstacle, then Line found. The machine ignores Line found while avoiding, on purpose: rejoining the line
          before the obstacle is cleared would drive straight back into it. Priorities like this are what the transition table
          encodes.
        </Callout>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Design a line follower with obstacle avoidance, then run it in the simulator">
          <p>
            Design the state machine before writing code. Use four states, a 20 cm entry and 30 cm exit threshold for obstacles, and a
            3 s timeout on the search. Then implement it in the <a href="/labs/robot-sim">robot simulator lab</a>: load the line-track
            arena, paste your controller, and check that the robot recovers when it loses the line on a tight curve. Test Avoid in the
            open-room arena if your track has no obstacle on it.
          </p>
          <p>
            <strong>Worked answer: the design</strong>
          </p>
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Action every tick</th>
                <th>Leaves when</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>FOLLOW</td>
                <td>P on the line error: left = 0.5 − 0.35·e, right = 0.5 + 0.35·e</td>
                <td>front &lt; 20 cm → AVOID; both sensors off the line for 0.3 s → RECOVER</td>
              </tr>
              <tr>
                <td>AVOID</td>
                <td>Arc right: left 0.6, right 0.15</td>
                <td>front &gt; 30 cm for at least 0.8 s → RECOVER (line assumed on the left)</td>
              </tr>
              <tr>
                <td>RECOVER</td>
                <td>Arc toward the last-seen side</td>
                <td>line found → FOLLOW; front &lt; 20 cm → AVOID; 3 s without the line → STOP</td>
              </tr>
              <tr>
                <td>STOP</td>
                <td>Motors off</td>
                <td>Only a human restarts it</td>
              </tr>
            </tbody>
          </table>
          <p>
            <strong>Worked answer: the code</strong> (the lab calls <code>control(sensors, memory)</code> every tick and keeps{" "}
            <code>memory</code> between calls):
          </p>
          <CodeBlock lang="js" title="line-follow-fsm.js" code={fsmCode} />
          <p>
            Notice the structure: transitions first, actions second, and every piece of state (current state, entry time, last-seen
            side) lives in <code>memory</code>. If the robot oscillates on straight track, lower the 0.35 steering gain; if it loses
            the line on curves, lower the base speed before raising the gain.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
