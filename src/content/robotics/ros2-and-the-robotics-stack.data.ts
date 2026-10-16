import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Node",
      def: "A ROS 2 process or component with one job, such as a camera driver or a planner, written with rclcpp (C++) or rclpy (Python).",
    },
    {
      term: "Topic",
      def: "A named, typed, many-to-many message stream. /cmd_vel carries geometry_msgs/msg/Twist; publishers never know who is listening.",
    },
    {
      term: "Service",
      def: "A request-response call between nodes, for short operations such as enabling motors or resetting odometry.",
    },
    {
      term: "Action",
      def: "A long-running goal with feedback and cancellation, built on topics and services. Nav2's NavigateToPose is the classic example.",
    },
    {
      term: "QoS profile",
      def: "Per-endpoint delivery rules: reliability (RELIABLE or BEST_EFFORT), durability (VOLATILE or TRANSIENT_LOCAL), history depth, deadline. Publishers offer, subscribers request, and incompatible pairs never connect.",
    },
    {
      term: "DDS",
      def: "Data Distribution Service, the OMG publish-subscribe standard under ROS 2 (Fast DDS by default, Cyclone DDS as an alternative). Handles discovery, transport and QoS.",
    },
    {
      term: "TF2",
      def: "The ROS 2 library that keeps a time-stamped tree of coordinate frames, so any node can ask where one frame was relative to another at a given time.",
    },
    {
      term: "REP 105 frames",
      def: "The convention map → odom → base_link: odometry publishes odom → base_link (smooth, drifts), localization publishes map → odom (corrects drift, may jump).",
    },
    {
      term: "micro-ROS",
      def: "ROS 2 for microcontrollers such as the ESP32: an XRCE-DDS client on the chip and a micro-ROS agent on a computer that bridges it into the ROS 2 graph.",
    },
    {
      term: "Nav2",
      def: "The ROS 2 navigation stack: AMCL localization, costmaps, planners, controllers and recovery behaviors, orchestrated by behavior trees.",
    },
  ],
  scenario: {
    title: "The publisher works, the subscriber never hears it",
    context:
      "A new team member writes a C++ node that subscribes to /camera/image_raw to count people in the hallway. The camera driver is clearly running: ros2 topic hz reports 30 Hz and RViz shows the live image. The new node builds, starts, logs that it has subscribed, and then its callback never fires, not once, for an entire afternoon of debugging.",
    symptoms: [
      "ros2 topic list shows /camera/image_raw and ros2 topic hz reports 30 Hz",
      "RViz and ros2 topic echo display the images normally",
      "The new node's callback counter stays at zero, with no errors and no crashes",
      "A single warning at startup says a new publisher on /camera/image_raw is offering incompatible QoS and that no messages will be received from it",
    ],
    hints: [
      "ros2 topic echo and RViz adapt their QoS to the publisher they find. Does a hand-written subscription?",
      "Run ros2 topic info -v /camera/image_raw and compare the Reliability line of the publisher with that of your subscription.",
      "Which QoS profile do camera drivers usually publish with, and which profile does rclcpp use when you pass a plain history depth of 10?",
    ],
    rootCause:
      "A QoS incompatibility. The camera driver publishes with the sensor-data profile (BEST_EFFORT, KEEP_LAST 5) because a late frame is useless. The new node called create_subscription with a plain depth of 10, which selects the default profile: RELIABLE. A RELIABLE request cannot be satisfied by a BEST_EFFORT offer, so DDS never matched the two endpoints and no sample was ever delivered. The command-line tools worked because they choose a QoS compatible with the publisher.",
    fix:
      "Subscribe with rclcpp::SensorDataQoS(), or expose reliability as a QoS override parameter, and add a startup check that warns loudly when a subscription still has zero matched publishers after 2 s. The team also added a QoS column to their interface document for every topic and a launch test that runs ros2 topic info -v on the critical topics.",
    lesson:
      "QoS is part of a topic's interface, just like its message type. When a subscriber hears nothing, run ros2 topic info -v before debugging anything else.",
  },
  interview: [
    {
      q: "Explain topics, services and actions, with an example of when you would use each.",
      a: "A topic is a typed, many-to-many stream for continuous data: a lidar publishes sensor_msgs/msg/LaserScan on /scan at 10 Hz and any node can subscribe. A service is a request-response call for short operations, such as enabling the motors or resetting odometry, where the caller waits for an answer. An action is for long-running goals that need feedback and cancellation, like Nav2's NavigateToPose: you send a goal, receive the distance remaining as feedback, and can cancel it if a person steps in front. Under the hood actions are built from topics and services. Choosing wrong hurts: a 30-second navigation done as a service blocks the caller and cannot be cancelled cleanly.",
      level: "screen",
    },
    {
      q: "What does TF do, and what are the map, odom and base_link frames?",
      a: "TF keeps a time-stamped tree of coordinate frames so any node can ask where one frame was relative to another at a given time, with interpolation. By REP 105, base_link is fixed to the robot, odom is a world frame in which the robot's pose is smooth and continuous but drifts, and map is a world frame that is globally correct but can jump when localization corrects itself. Wheel odometry or an EKF publishes odom to base_link; AMCL or SLAM publishes map to odom, which absorbs the drift without making the odometry discontinuous. robot_state_publisher publishes the fixed sensor frames from the URDF. Local control uses odom because it never jumps; global planning uses map.",
      level: "screen",
    },
    {
      q: "How would you present a hobby robot in an interview so that it counts as real experience?",
      a: "I would lead with a 60 to 90 second video of the robot doing its job, then walk through a block diagram and the decisions behind it, such as why the TB6612 and why a separate 5 V rail. The strongest part is measured numbers and failures: the brownout I found with a scope and fixed with a bigger buck and bulk capacitance, and how a UMBmark square test cut odometry error from 41 cm to 6 cm. I would show that I tested in simulation first and what changed on hardware. Interviewers care less about the robot's features than about how I debugged, measured and documented it.",
      level: "screen",
    },
    {
      q: "A subscriber receives nothing even though the topic is publishing. How do you debug it?",
      a: "First I confirm what DDS sees: ros2 topic info -v on the topic lists every publisher and subscription with its QoS, so I check that both endpoints appear and that reliability, durability and deadline are compatible; a RELIABLE subscriber never matches a BEST_EFFORT publisher. If the subscription is missing, I check names and namespaces, remappings and the exact message type. If the publisher is invisible, I check ROS_DOMAIN_ID, the RMW implementation on each machine, and whether multicast discovery is blocked by the network or a firewall, which is common on Wi-Fi and in Docker. Finally I look for an executor problem: a callback group that is never spun, or a single-threaded executor blocked by a long callback.",
      level: "deep",
    },
    {
      q: "How would you connect a microcontroller-based robot like the course robot to a ROS 2 system?",
      a: "I would run micro-ROS on the ESP32: an XRCE-DDS client publishes /odom and range data and subscribes to /cmd_vel, and a micro-ROS agent on the laptop bridges it over serial or Wi-Fi UDP into the normal DDS graph. Hard real-time work, the 100 Hz wheel speed loops and encoder interrupts, stays on the microcontroller, and only setpoints and state cross the link, at 20 to 50 Hz. I would timestamp messages after syncing the clock with the agent, use best effort for high-rate sensor data and reliable for commands, and add a /cmd_vel watchdog that stops the motors if no command arrives for 300 ms. On a larger robot I would instead write a ros2_control hardware interface so the standard diff_drive_controller does the kinematics.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Which communication pattern fits 'drive to the kitchen, report progress, and let me cancel'?",
      choices: ["Topic", "Service", "Action", "Parameter"],
      answer: 2,
      explain:
        "Actions are built for long-running goals with feedback and cancellation; Nav2's NavigateToPose is exactly this. A service would block until done and cannot report progress.",
    },
    {
      q: "A subscription requests RELIABLE and the only publisher offers BEST_EFFORT. What happens?",
      choices: [
        "Messages arrive with retransmission",
        "Messages arrive, but some may be lost",
        "The endpoints never match, so no messages arrive",
        "The publisher is upgraded to RELIABLE automatically",
      ],
      answer: 2,
      explain:
        "QoS matching is request-versus-offer, and a BEST_EFFORT offer cannot satisfy a RELIABLE request. DDS logs an incompatible-QoS event and delivers nothing; the reverse pair (RELIABLE publisher, BEST_EFFORT subscriber) works.",
    },
    {
      q: "Under REP 105, which transform does wheel odometry publish?",
      choices: ["map → odom", "odom → base_link", "base_link → sonar_link", "map → base_link"],
      answer: 1,
      explain:
        "Odometry is continuous but drifts, so it owns odom → base_link. Localization publishes map → odom to absorb the drift, and robot_state_publisher publishes the fixed sensor frames.",
    },
    {
      q: "What does TRANSIENT_LOCAL durability give a subscriber that joins late?",
      choices: [
        "Nothing until the next message is published",
        "The last messages the publisher kept, delivered on connection",
        "Every message ever published since boot",
        "Lower latency",
      ],
      answer: 1,
      explain:
        "A TRANSIENT_LOCAL publisher keeps its last messages (up to its history depth) and replays them to new subscribers. That is why /map and /robot_description use it: a node started later still gets the map.",
    },
    {
      q: "What is micro-ROS?",
      choices: [
        "A smaller ROS 2 distribution for Raspberry Pi",
        "ROS 2 for microcontrollers, using an XRCE-DDS client on the chip and an agent on a computer",
        "A ROS 2 simulator",
        "A ROS 1 to ROS 2 bridge",
      ],
      answer: 1,
      explain:
        "Microcontrollers cannot run full DDS, so micro-ROS uses the lightweight XRCE-DDS protocol over serial, UDP or similar, and the agent translates to DDS. The ESP32 is a supported target.",
    },
    {
      q: "For a differential-drive robot, which fields of the geometry_msgs/msg/Twist on /cmd_vel matter?",
      choices: ["linear.x and angular.z", "linear.x and linear.y", "angular.x and angular.y", "All six"],
      answer: 0,
      explain:
        "A differential drive can only move forward and turn about its vertical axis, so it uses linear.x (m/s) and angular.z (rad/s); the motor driver turns them into wheel speeds with vL = v − ω·L/2 and vR = v + ω·L/2.",
    },
    {
      q: "Which tool records topics to a file so you can replay a field failure at your desk?",
      choices: ["rviz2", "ros2 bag", "colcon", "rqt_graph"],
      answer: 1,
      explain:
        "ros2 bag record captures selected topics (to MCAP files by default in recent releases) and ros2 bag play republishes them with their original timing. RViz visualizes, colcon builds and rqt_graph draws the node graph.",
    },
  ],
};

export default data;
