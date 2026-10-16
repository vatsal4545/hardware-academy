"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { RosGraph } from "@/components/viz/robotics/RosGraph";
import { RoundedArrow } from "@/components/viz/robotics/RoundedArrow";

interface Frame {
  id: string;
  x: number;
  y: number;
  color: string;
  xyz?: string;
}

const FRAMES: Frame[] = [
  { id: "map", x: 300, y: 40, color: vizColors.amber },
  { id: "odom", x: 300, y: 115, color: vizColors.green },
  { id: "base_link", x: 300, y: 190, color: vizColors.cyan },
  { id: "left_wheel", x: 66, y: 300, color: vizColors.blue, xyz: "0, 0.06, 0" },
  { id: "right_wheel", x: 180, y: 300, color: vizColors.blue, xyz: "0, -0.06, 0" },
  { id: "sonar_link", x: 300, y: 300, color: vizColors.violet, xyz: "0.07, 0, 0.08" },
  { id: "line_sensors", x: 420, y: 300, color: vizColors.violet, xyz: "0.05, 0, -0.015" },
  { id: "imu_link", x: 536, y: 300, color: vizColors.violet, xyz: "0, 0, 0.03" },
  { id: "camera_link", x: 648, y: 300, color: vizColors.violet, xyz: "0.06, 0, 0.12" },
  { id: "camera_optical", x: 648, y: 372, color: vizColors.violet },
];

const F = Object.fromEntries(FRAMES.map((f) => [f.id, f])) as Record<string, Frame>;
const BOX_W = 104;
const BOX_H = 28;

function edge(parent: string, child: string, color: string) {
  const p = F[parent];
  const c = F[child];
  return <RoundedArrow key={`${parent}-${child}`} x1={p.x} y1={p.y + BOX_H / 2} x2={c.x} y2={c.y - BOX_H / 2 - 1} color={color} width={1.5} head={8} />;
}

function TfTreeFigure() {
  return (
    <SvgCanvas viewBox="0 0 720 400" title="TF tree for the course robot: map to odom to base_link, then wheels and sensors">
      <rect x={0} y={0} width={720} height={400} rx={10} fill={vizColors.bg} />
      {edge("map", "odom", vizColors.amber)}
      {edge("odom", "base_link", vizColors.green)}
      {["left_wheel", "right_wheel"].map((c) => edge("base_link", c, vizColors.blue))}
      {["sonar_link", "line_sensors", "imu_link", "camera_link"].map((c) => edge("base_link", c, vizColors.violet))}
      {edge("camera_link", "camera_optical", vizColors.violet)}

      {FRAMES.map((f) => (
        <g key={f.id}>
          <rect x={f.x - BOX_W / 2} y={f.y - BOX_H / 2} width={BOX_W} height={BOX_H} rx={6} fill={f.color} fillOpacity={0.16} stroke={f.color} strokeWidth={1.5} />
          <Label x={f.x} y={f.y} size={11} mono>
            {f.id}
          </Label>
          {f.xyz && (
            <Label x={f.x} y={f.y + 24} size={9} color={vizColors.muted} mono>
              {f.xyz}
            </Label>
          )}
        </g>
      ))}

      <Label x={330} y={78} anchor="start" size={11} color={vizColors.amber}>
        map → odom: AMCL or SLAM, 10-20 Hz. Globally right, but it can jump.
      </Label>
      <Label x={330} y={153} anchor="start" size={11} color={vizColors.green}>
        odom → base_link: wheel odometry or an EKF, 50 Hz. Smooth, but drifts.
      </Label>
      <Label x={20} y={348} anchor="start" size={10} color={vizColors.blue}>
        wheels: robot_state_publisher, from /joint_states
      </Label>
      <Label x={580} y={348} anchor="end" size={10} color={vizColors.violet}>
        sensors: fixed URDF joints, published once on /tf_static
      </Label>
      <Label x={20} y={376} anchor="start" size={10} color={vizColors.muted}>
        offsets in meters (x forward, y left, z up: REP 103)
      </Label>
    </SvgCanvas>
  );
}

const installCode = `# Ubuntu 24.04 with ROS 2 Jazzy (add the ROS 2 apt repository first, as in docs.ros.org)
sudo apt install ros-jazzy-desktop
source /opt/ros/jazzy/setup.bash

# macOS or Windows: run it in a container instead
docker run -it --rm osrf/ros:jazzy-desktop

# smoke test, in two terminals
ros2 run demo_nodes_cpp talker
ros2 run demo_nodes_py listener

# look at the graph and the QoS of every endpoint
ros2 node list
ros2 topic list
ros2 topic info -v /chatter

# reproduce this lesson's scenario: a QoS mismatch
ros2 topic pub /test std_msgs/msg/String "{data: hello}" --qos-reliability best_effort
ros2 topic echo /test --qos-reliability reliable     # silence, plus an incompatible-QoS warning
ros2 topic echo /test --qos-reliability best_effort  # messages arrive`;

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="How professional robots are wired together in software">
        <Prose>
          <h3>What ROS 2 is</h3>
          <p>
            ROS 2 (Robot Operating System 2) is not an operating system. It is middleware plus a toolbox: you split a robot&apos;s
            software into <strong>nodes</strong>, each with one job, and they talk over a publish-subscribe bus built on DDS. A
            long-term-support release ships every two years in May; Humble Hawksbill (2022) is supported to 2027 and Jazzy Jalisco
            (2024, on Ubuntu 24.04) to 2029. Nodes are written in C++ with rclcpp or Python with rclpy and driven from the{" "}
            <code>ros2</code> command line.
          </p>

          <h3>Topics, services, actions, parameters and launch files</h3>
          <ul>
            <li>
              <strong>Topics</strong>: named, typed, many-to-many streams for continuous data. <code>/cmd_vel</code> carries
              geometry_msgs/msg/Twist (linear.x in m/s, angular.z in rad/s); <code>/scan</code> carries sensor_msgs/msg/LaserScan.
            </li>
            <li>
              <strong>Services</strong>: request and response, like a function call across the network, for short operations such as
              enabling the motors.
            </li>
            <li>
              <strong>Actions</strong>: long-running goals with feedback and cancellation, built from topics and services. Nav2&apos;s
              NavigateToPose streams the distance remaining and can be cancelled when a person steps in front.
            </li>
            <li>
              <strong>Parameters</strong>: typed per-node settings such as <code>wheel_base: 0.12</code>, loaded from YAML at launch or
              changed live with <code>ros2 param set</code>.
            </li>
            <li>
              <strong>Launch files</strong>: Python, XML or YAML files that start a set of nodes with their parameters, remappings and
              namespaces, so one command brings up the whole robot.
            </li>
          </ul>

          <h3>DDS and quality of service</h3>
          <p>
            Underneath, the RMW layer maps ROS 2 onto a DDS implementation: eProsima Fast DDS by default, or Eclipse Cyclone DDS; Zenoh
            is a newer non-DDS option. Discovery is automatic over UDP multicast, and <code>ROS_DOMAIN_ID</code> keeps two robots on
            one network apart. Every endpoint carries a <strong>QoS profile</strong>: reliability (RELIABLE retransmits lost samples,
            BEST_EFFORT does not), durability (VOLATILE, or TRANSIENT_LOCAL, which replays the last messages to late joiners and is
            used for maps), history depth (KEEP_LAST 10), plus deadline and liveliness. Publishers offer, subscribers request, and a
            connection forms only when the offer satisfies the request. Camera and lidar drivers usually publish with the sensor-data
            profile, BEST_EFFORT with depth 5, so a subscriber left on the RELIABLE default receives nothing, with one warning as the
            only clue.
          </p>

          <h3>TF, URDF, RViz and bags</h3>
          <p>
            <strong>TF2</strong> keeps a time-stamped tree of coordinate frames. By REP 105 the chain is map → odom → base_link:
            odometry publishes odom → base_link (smooth, drifts), localization publishes map → odom (corrects drift, may jump), and
            robot_state_publisher reads the URDF to publish base_link → sensor frames. Any node can then ask where the sonar was in
            the map frame at 12.304 s and get an interpolated answer. <strong>RViz2</strong> draws it all live: robot model, frames,
            scans, maps, planned paths. <code>ros2 bag record</code> captures topics to MCAP files so a field failure can be replayed
            at your desk.
          </p>

          <h3>The big packages</h3>
          <ul>
            <li>
              <strong>Nav2</strong>: AMCL localization, costmaps that inflate obstacles, global planners (NavFn, Smac), local
              controllers (DWB, Regulated Pure Pursuit, MPPI) and recovery behaviors, orchestrated by behavior trees.
            </li>
            <li>
              <strong>MoveIt 2</strong>: motion planning for arms: inverse kinematics, collision checking, OMPL planners and
              trajectory execution.
            </li>
            <li>
              <strong>ros2_control</strong>: a hardware abstraction with standard controllers such as diff_drive_controller.
            </li>
            <li>
              <strong>micro-ROS</strong>: ROS 2 on microcontrollers such as the ESP32 over XRCE-DDS, with an agent on a computer that
              bridges serial or Wi-Fi into the graph. That is how the course robot would publish <code>/odom</code> and obey{" "}
              <code>/cmd_vel</code>.
            </li>
          </ul>

          <h3>How robotics teams are organized</h3>
          <p>
            Robotics companies usually split work into perception, localization and mapping, planning and controls, manipulation,
            embedded firmware, electrical, mechanical, simulation and test, and infrastructure for fleets, logs and CI. Startups hire
            generalists who cover several of these; larger companies such as Boston Dynamics, Amazon Robotics or Agility Robotics hire
            specialists. Firmware and controls meet at the motor driver, perception and planning meet at the costmap, and everyone
            meets in the logs.
          </p>

          <h3>Presenting the robot as a portfolio project</h3>
          <p>
            A reviewer gives a project about two minutes, so lead with a 60 to 90 second video of the robot finishing a lap with
            telemetry overlaid. Then a README with a block diagram, the bill of materials and cost, the schematic or KiCad board, the
            firmware and simulator code, and measured results: &quot;a UMBmark square test cut return error from 41 cm to 6 cm&quot;,
            &quot;bulk capacitance cut the 5 V dip from 1.1 V to 0.08 V&quot;. Add a section on what went wrong; it is the part
            interviewers ask about.
          </p>

          <h3>Roles and interview expectations</h3>
          <p>
            Embedded robotics interviews probe interrupts, PWM and H-bridges, encoders, PID tuning, power integrity and bring-up.
            Robotics software interviews probe C++ and Python, ROS 2 (QoS, TF, executors and callback groups), coordinate frames,
            state estimation such as Kalman filters, and planning such as A* and sampling-based planners. Expect a live or take-home
            exercise: A* on a grid, a PID class with anti-windup, or transforming points between frames.
          </p>
        </Prose>
        <Figure caption="TF tree for the course robot. Each frame has exactly one parent. Odometry and localization publish the top two links at runtime; the sensor offsets come from the URDF and never change.">
          <TfTreeFigure />
        </Figure>
      </Section>

      <Section id="viz" title="Interactive: a node graph you can break">
        <RosGraph />
        <Callout kind="info" title="Try this">
          Switch the detector&apos;s subscription to Reliable: the camera still publishes, but nothing reaches the detector and the
          whole pipeline downstream goes quiet. Then turn on the camera&apos;s reliable QoS and the lossy link to see what reliability
          costs: every image arrives, but the retransmitted ones arrive late.
        </Callout>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Sketch the node graph for your robot, then install ROS 2">
          <p>
            Assume the ESP32 runs micro-ROS over Wi-Fi and a laptop runs everything else. List the nodes, the topics with their message
            types and rates, and the QoS you would choose for each. Then install ROS 2 and reproduce this lesson&apos;s QoS bug on
            purpose.
          </p>
          <p>
            <strong>Worked answer: the node graph</strong>
          </p>
          <table>
            <thead>
              <tr>
                <th>Node</th>
                <th>Runs on</th>
                <th>Publishes</th>
                <th>Subscribes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>/robot_base (micro-ROS)</td>
                <td>ESP32</td>
                <td>
                  /odom (nav_msgs/msg/Odometry, 20 Hz, best effort), /range (sensor_msgs/msg/Range, 16 Hz, sensor data), /battery
                  (sensor_msgs/msg/BatteryState, 1 Hz, reliable)
                </td>
                <td>/cmd_vel (geometry_msgs/msg/Twist, reliable), with a 300 ms watchdog</td>
              </tr>
              <tr>
                <td>/micro_ros_agent</td>
                <td>laptop</td>
                <td>Bridges XRCE-DDS over Wi-Fi UDP into DDS</td>
                <td>none</td>
              </tr>
              <tr>
                <td>/robot_state_publisher</td>
                <td>laptop</td>
                <td>/tf_static and /robot_description (transient local)</td>
                <td>/joint_states</td>
              </tr>
              <tr>
                <td>/odom_to_tf</td>
                <td>laptop</td>
                <td>/tf (odom → base_link)</td>
                <td>/odom</td>
              </tr>
              <tr>
                <td>/behavior (your state machine)</td>
                <td>laptop</td>
                <td>/cmd_vel (10 Hz)</td>
                <td>/range, /odom</td>
              </tr>
              <tr>
                <td>/teleop_twist_keyboard and rviz2</td>
                <td>laptop</td>
                <td>/cmd_vel when you drive by hand</td>
                <td>/tf, /odom, /range</td>
              </tr>
            </tbody>
          </table>
          <p>
            The design choices to defend in an interview: the speed loops and encoder interrupts stay on the ESP32, only setpoints and
            state cross Wi-Fi; sensor streams are best effort because a late reading is worthless; commands are reliable and guarded by
            a watchdog so a dropped link stops the robot.
          </p>
          <p>
            <strong>Install and the QoS experiment</strong>
          </p>
          <CodeBlock lang="bash" title="terminal" code={installCode} />
        </Exercise>
      </Section>
    </>
  );
}
