import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Sim-to-real gap",
      def: "Everything the simulator gets wrong about the world: friction, slip, motor lag, sensor noise, beam shape, latency, battery sag. Controllers tuned on perfect data fall into it.",
    },
    {
      term: "Domain randomization",
      def: "Varying physics and sensor parameters (friction, mass, latency, noise, start pose) across simulated runs so the controller cannot overfit to one perfect world.",
    },
    {
      term: "Latency budget",
      def: "The total delay from the world changing to the actuators responding: sensor cycle + filtering + control period + motor response. Distance traveled blind = speed × latency.",
    },
    {
      term: "Beam width",
      def: "The angular width of a range sensor's field of view. An HC-SR04's cone is roughly 30° wide in practice, so it reports the nearest object anywhere in the cone, not along a line.",
    },
    {
      term: "Read, estimate, decide, act",
      def: "A controller structure: copy sensor values, filter them into an estimate of the world, choose a behavior, then convert it to actuator commands. Each step is small and testable.",
    },
    {
      term: "URDF",
      def: "Unified Robot Description Format: the XML that describes a robot's links (visual, collision, inertia) and joints (fixed, continuous, revolute, prismatic) for ROS tools and simulators.",
    },
    {
      term: "Regression scenario",
      def: "A saved simulator test (arena, start pose, pass criteria such as no crash in 60 s) rerun after every change so a fixed bug stays fixed.",
    },
  ],
  scenario: {
    title: "Perfect in simulation, crashes on the real floor",
    context:
      "A team's wall-following controller passed 200 out of 200 runs in their simulator at 40 cm/s with a 15 cm front threshold. On the real robot, in the office hallway, it clips the wall at about one corner in three and has twice driven into the base of a whiteboard stand.",
    symptoms: [
      "The real robot starts its corner turn 6 to 9 cm later than the simulated robot does",
      "Logs show the front range updating only every 60 ms, with occasional 400 cm readings next to a wall angled at 45°",
      "At 20 cm/s the real robot almost never touches a wall",
      "The thin metal legs of the whiteboard stand are invisible to it until it is too late",
    ],
    hints: [
      "List everything between a wall appearing and the wheels reacting: ping cycle, filtering, control period, motor time constant.",
      "At 40 cm/s, how far does the robot travel in 150 to 200 ms? Then add the braking distance.",
      "What does a sonar report when a wall reflects the ping away from the sensor, and how does the code treat that number?",
    ],
    rootCause:
      "The simulator modeled instant, perfect rays and wheels that stop on command. On the robot the HC-SR04 measures only every 60 ms, a 3-sample median filter adds about another 60 ms, and the motors take about 80 ms to slow down: 150 to 200 ms of latency, so at 40 cm/s the robot covers 6 to 8 cm before it reacts and 3 to 4 cm more while braking. The 15 cm threshold left almost no margin. Angled walls sometimes returned no echo, the driver mapped the timeout to 400 cm, and the controller read that as open space. Thin legs inside the cone were simply missed.",
    fix:
      "They made the simulator pessimistic and random: 100 to 200 ms of sensor latency, ±1 cm noise, 5% dropped readings, a 25° beam for the front sensor and a first-order motor lag, re-drawn every run. The controller now sets its threshold from speed (v × 0.2 s + 5 cm braking + 8 cm clearance = 21 cm at 40 cm/s), slows to 20 cm/s near walls and treats a timeout as unknown, not free. After re-tuning in the harsher simulator, the real robot completed 50 laps without contact.",
    lesson:
      "A simulator is a hypothesis about the world. Model latency, noise and sensor geometry, randomize them, and derive margins from speed × latency instead of tuning thresholds on perfect data.",
  },
  interview: [
    {
      q: "What is the sim-to-real gap? Give three concrete sources.",
      a: "It is the difference between how a controller behaves in simulation and on hardware, caused by everything the model leaves out or gets wrong. First, actuation: simulated wheels reach the commanded speed instantly and never slip, while real gearmotors have a time constant of tens of milliseconds, a deadband at low duty and slip on smooth floors. Second, sensing: a simulated ultrasonic sensor is a perfect ray, while a real one is a 30° cone with noise, dropouts and specular reflections off angled walls. Third, timing: real sensors update at their own rates and the whole loop has latency, which the simulator usually ignores. I close the gap by modeling the worst of these, randomizing them, and validating on hardware early.",
      level: "screen",
    },
    {
      q: "Name three robotics simulators and say what each is best for.",
      a: "Gazebo is the default companion to ROS 2: it loads URDF and SDF models, simulates lidar, cameras and IMUs, and runs the same nodes you deploy, which makes it good for full-stack integration testing. MuJoCo, open-sourced by DeepMind in 2022, has fast and accurate contact dynamics and is the standard for reinforcement learning on legged robots and manipulators. NVIDIA Isaac Sim uses PhysX and RTX ray tracing for photorealistic sensors, so it is used for synthetic training data and large-scale parallel RL with Isaac Lab. For quick education or a single robot, Webots and PyBullet are lighter alternatives.",
      level: "screen",
    },
    {
      q: "What is URDF, and what goes into one?",
      a: "URDF, the Unified Robot Description Format, is an XML file that describes a robot as a tree of links connected by joints. Each link can have visual geometry, collision geometry and inertial properties; each joint has a type (fixed, continuous, revolute or prismatic), a parent and a child link, an origin with xyz and roll-pitch-yaw, and an axis. ROS tools such as robot_state_publisher use it to publish the TF tree, RViz uses it to draw the robot, and Gazebo uses it, often extended with SDF tags, to simulate it. People usually write it with xacro macros so the two wheels are one macro called twice.",
      level: "screen",
    },
    {
      q: "Your robot must stop before obstacles at 0.5 m/s. How do you choose the detection threshold?",
      a: "I would build a latency budget instead of guessing. Say the sensor updates every 60 ms, the filter adds 50 ms, the control period is 10 ms and the motors need 80 ms to respond: that is about 200 ms, during which the robot travels 0.5 × 0.2 = 10 cm. Braking from 0.5 m/s at 2 m/s² takes v²/2a = 6.25 cm. Adding 10 cm of clearance for noise and the robot's own shape gives a threshold of about 26 cm, and I would make it a function of speed so it shrinks when the robot is slow. Then I would verify it in a simulator with that latency modeled and on hardware with a soft obstacle.",
      level: "deep",
    },
    {
      q: "How would you use domain randomization so a controller trained or tuned in simulation works on hardware?",
      a: "I identify the parameters that differ between simulation and reality and are uncertain: friction, motor gain and time constant, mass, sensor noise, latency, dropout rate, sensor mounting angle and start pose. For each I pick a range that brackets the real value, for example 50 to 200 ms of latency, and draw new values every episode, so the controller has to work across the whole range rather than at one point. The ranges should come from measurements on the real robot where possible, because ranges that are too wide make the task impossible and ranges that are too narrow miss the real world. I then measure success as a distribution over hundreds of randomized runs and only move to hardware when the worst decile is acceptable.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "A robot drives at 40 cm/s and its sensing-to-motor latency is 150 ms. How far does it travel before it starts reacting to a new obstacle?",
      choices: ["0.6 cm", "6 cm", "15 cm", "60 cm"],
      answer: 1,
      explain:
        "Distance = speed × latency = 40 cm/s × 0.15 s = 6 cm, and braking distance comes on top. That is why thresholds should scale with speed rather than be tuned once.",
    },
    {
      q: "A thin pole sits 10° off the robot's heading, closer than the wall straight ahead. What does a real HC-SR04 most likely report?",
      choices: [
        "The distance to the wall, like a simulated ray that ignores anything off-axis",
        "The distance to the pole, because the pole is inside the beam",
        "Zero, because the two echoes arrive close together and cancel",
        "The average of the two distances, weighted by echo strength",
      ],
      answer: 1,
      explain:
        "The ultrasonic beam is a cone about 30° wide, and the first echo back wins. A simulated single ray straight ahead would miss the pole and report the wall.",
    },
    {
      q: "Which simulator, open-sourced by DeepMind in 2022, is known for fast contact dynamics in reinforcement learning research?",
      choices: ["Gazebo", "MuJoCo", "Webots", "RViz"],
      answer: 1,
      explain:
        "MuJoCo (Multi-Joint dynamics with Contact) is the standard for RL locomotion and manipulation benchmarks. RViz is a visualizer, not a simulator.",
    },
    {
      q: "In URDF, which joint type models a wheel that spins forever with no limits?",
      choices: ["fixed", "revolute", "continuous", "prismatic"],
      answer: 2,
      explain:
        "A continuous joint rotates about its axis without limits. A revolute joint has upper and lower limits (an elbow), and a prismatic joint slides (a linear actuator).",
    },
    {
      q: "Why randomize start poses, noise and latency across many simulated runs?",
      choices: [
        "To make the simulation run faster, because randomized runs can be spread across cores",
        "So the controller cannot overfit one perfect world, and fragile behaviors show up before hardware does",
        "Because simulators cannot be deterministic, so every run is already different anyway",
        "To reduce the number of test runs needed, since one randomized run stands in for every case",
      ],
      answer: 1,
      explain:
        "A controller that passes 100 of 100 randomized runs has been tested against a range of worlds that, ideally, includes the real one. One perfect run proves very little.",
    },
    {
      q: "The sonar times out with no echo. What should the controller assume?",
      choices: [
        "Free space for 4 m, the sensor's maximum range",
        "An obstacle at 0 cm, so it must brake immediately",
        "Unknown: slow down or stop until a valid reading arrives",
        "The previous reading is still valid forever, so keep driving on it",
      ],
      answer: 2,
      explain:
        "No echo can mean open space, an angled wall that reflected the ping away, a soft surface or a broken wire. Treating it as unknown costs a little speed; treating it as free can cost the robot.",
    },
  ],
};

export default data;
