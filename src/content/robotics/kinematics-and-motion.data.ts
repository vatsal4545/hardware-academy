import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Differential drive",
      def: "Two independently driven wheels on one axle plus a caster. Body speed v = (vR + vL)/2 and turn rate ω = (vR − vL)/L, where L is the wheel base.",
    },
    {
      term: "Instantaneous center of curvature (ICC)",
      def: "The point on the axle line that the robot is rotating about at this instant. It sits R = v/ω from the robot center: at infinity when driving straight, at the center when spinning in place.",
    },
    {
      term: "Unicycle model",
      def: "ẋ = v·cos θ, ẏ = v·sin θ, θ̇ = ω. The kinematic model of any robot that can drive forward and turn but cannot slide sideways.",
    },
    {
      term: "Nonholonomic constraint",
      def: "A limit on velocity, not position: a differential-drive robot has zero sideways speed in its body frame, yet it can still reach any pose by maneuvering, as in parallel parking.",
    },
    {
      term: "Odometry",
      def: "Dead-reckoning pose estimate built by integrating wheel-encoder distances. Its error is never corrected by itself, so it grows with every meter driven.",
    },
    {
      term: "UMBmark",
      def: "The University of Michigan Benchmark (Borenstein and Feng, 1996): drive a 4 m square five times clockwise and five times counter-clockwise to measure and correct wheel-diameter and wheel-base errors.",
    },
    {
      term: "Inverse kinematics (IK)",
      def: "Finding joint angles that put the end effector at a target. A planar 2-link arm has two solutions, elbow up and elbow down, from the law of cosines.",
    },
    {
      term: "Kinematic singularity",
      def: "A pose where the Jacobian loses rank and the arm cannot move in some direction. For a 2-link arm, det J = l1·l2·sin θ2, so θ2 = 0° (stretched) and 180° (folded) are singular.",
    },
    {
      term: "Trapezoidal velocity profile",
      def: "Accelerate at a fixed limit, cruise at top speed, decelerate at the same limit. Keeps wheel torque and slip bounded; moves shorter than v²/a become triangles.",
    },
  ],
  scenario: {
    title: "Odometry is off by 1 m after one lap",
    context:
      "A lab's indoor delivery robot (65 mm wheels, 2048-count encoders, 280 mm wheel base from CAD) drives a 24 m rectangular loop (8 m × 4 m) through the corridor using pure odometry between two charging docks. Clockwise laps end with the robot about 1 m from the dock even though its pose estimate says it is exactly on the marker, so the docking routine times out. The team has already swapped both encoders and rewritten the odometry code twice.",
    symptoms: [
      "Commanding equal encoder counts for 8 m ends about 14 cm to the left of a tape line on the floor",
      "Each commanded 90° turn measures about 88° with a protractor on the floor",
      "Clockwise laps miss the dock by about 1 m, counter-clockwise laps by less than 10 cm",
      "New encoders and a code rewrite left the error unchanged and repeatable from lap to lap",
    ],
    hints: [
      "A path that curves while both encoders count the same means the wheels do not cover the same distance per tick.",
      "Turn angle comes from (ΔsR − ΔsL)/L. Which L does the floor see: the CAD dimension or the tire contact points?",
      "Why would one lap direction be ten times worse than the other? Look up how UMBmark separates two systematic errors.",
    ],
    rootCause:
      "Two systematic calibration errors, not noise. The right tire's effective rolling diameter was 0.12% larger than the left's (under 0.1 mm, from a different tire batch), so equal tick counts curved the path left. The effective wheel base was 2% (about 6 mm) wider than the 280 mm CAD value because the wide tires carry the load near their outer edges, so every 90° turn was really 88.2°. Driving clockwise, the left curve on the straights and the short right turns add up; counter-clockwise they mostly cancel, which is why one direction looked fine.",
    fix:
      "Run UMBmark: drive a 4 m × 4 m square five times in each direction, record the return positions, and solve for the wheel-diameter ratio and the effective wheel base. Put both correction factors into the odometry update (per-wheel distance per tick and a calibrated L). After calibration the lap error dropped from 1 m to about 6 cm in both directions. The team also fused the IMU gyro for heading and added a fiducial marker near each dock for an absolute fix.",
    lesson:
      "Most odometry error is systematic and measurable. Calibrate wheel diameters and the effective wheel base with a bidirectional square test before blaming encoders or code, and give dead reckoning an absolute reference to lean on.",
  },
  interview: [
    {
      q: "A differential-drive robot has a 12 cm wheel base. The left wheel runs at 15 cm/s and the right at 25 cm/s. What are v and ω, and what is it turning about?",
      a: "Linear speed is the average of the wheels, (25 + 15)/2 = 20 cm/s. Turn rate is the difference over the wheel base, (25 − 15)/12 ≈ 0.83 rad/s, counter-clockwise because the right wheel is faster. The instantaneous center of curvature is on the axle line R = v/ω = 24 cm to the left of the robot center. Equal wheel speeds would put R at infinity (straight line) and equal-and-opposite speeds would put it at the center (spin in place). Before sending such a command to motors I would also check saturation and scale both wheels together so the curvature is preserved.",
      level: "screen",
    },
    {
      q: "Why does wheel odometry drift, and what would you do about it?",
      a: "Odometry integrates wheel distances, so every small error is added up and nothing ever corrects it. Systematic errors come from unequal wheel diameters and an uncertain effective wheel base; non-systematic ones from slip, bumps and encoder quantization. Heading error is the dangerous one, because 1° of heading error becomes about 1.7 cm of sideways error for every meter driven afterwards. I would first calibrate the systematic part with a UMBmark square test in both directions, then fuse a gyro for heading, limit acceleration to reduce slip, and add absolute fixes such as markers, a map with lidar, or GNSS outdoors.",
      level: "screen",
    },
    {
      q: "What is the difference between the body frame and the world frame, and where do people mix them up?",
      a: "The world frame is fixed to the environment; the body frame rides on the robot with x forward and y to the left. Encoders, IMUs and range sensors report in the body frame, while maps, goals and other robots live in the world frame. A rotation by the heading θ converts between them, so a body speed v becomes (v·cos θ, v·sin θ) in the world. The classic bug is adding a sensor point to the map without rotating it by θ, which smears walls into arcs as the robot turns. ROS makes the convention explicit with the map, odom and base_link frames.",
      level: "screen",
    },
    {
      q: "Walk me through inverse kinematics for a planar two-link arm, including when it fails.",
      a: "With the base at the origin and the target at (x, y), the law of cosines gives cos θ2 = (x² + y² − l1² − l2²)/(2·l1·l2). If that value is outside −1 to 1 the target is out of reach. Otherwise θ2 = ±acos of it gives the elbow-down and elbow-up solutions, and θ1 = atan2(y, x) − atan2(l2·sin θ2, l1 + l2·cos θ2). The workspace is an annulus from |l1 − l2| to l1 + l2; on its edges the two solutions merge at a singularity where det J = l1·l2·sin θ2 = 0, so the arm cannot move radially and joint speeds blow up nearby. In practice I would also enforce joint limits, choose the solution closest to the current pose to avoid flips, and switch to damped least-squares IK for arms with more joints.",
      level: "deep",
    },
    {
      q: "The robot must stop exactly 1 m ahead without wheel slip. How do you generate the motion?",
      a: "I would plan a trapezoidal velocity profile: accelerate at a fixed limit, cruise, then decelerate at the same limit. With a_max = 0.5 m/s² and v_max = 0.3 m/s each ramp takes 0.6 s and 9 cm, the cruise covers the remaining 82 cm, and the move takes about 3.9 s. If the distance were shorter than v_max²/a_max = 18 cm the profile becomes a triangle with peak speed √(a·d). The wheel speed loops track the profile, and an outer loop on the remaining distance trims the final error. If the payload is fragile I would use an S-curve that also limits jerk.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "A robot with wheel base L = 10 cm has vL = 20 cm/s and vR = 30 cm/s. What is its turn rate ω?",
      choices: ["0.5 rad/s", "1.0 rad/s", "2.5 rad/s", "5.0 rad/s"],
      answer: 1,
      explain:
        "ω = (vR − vL)/L = (30 − 20)/10 = 1.0 rad/s. The linear speed is the average, 25 cm/s, so the robot circles an ICC that is R = v/ω = 25 cm to its left.",
    },
    {
      q: "What happens when vL = −vR?",
      choices: ["The robot drives straight", "The robot spins in place about the axle midpoint", "The robot pivots about its left wheel", "The robot stops"],
      answer: 1,
      explain:
        "Equal and opposite wheel speeds give v = 0 and ω = 2·vR/L, so R = 0: the ICC is the midpoint of the axle. Pivoting about one wheel needs that wheel stopped, which puts the ICC at that wheel (R = L/2).",
    },
    {
      q: "Why is a heading error more damaging to odometry than an equal-sized distance error?",
      choices: [
        "Heading is measured with fewer encoder ticks",
        "A heading error rotates every later step, so sideways error keeps growing with distance driven",
        "Distance errors always cancel out on average",
        "Encoders cannot measure heading at all",
      ],
      answer: 1,
      explain:
        "After a 1° heading error, every meter driven adds about 17 mm of sideways error (sin 1° ≈ 0.017), and the error keeps growing until something absolute corrects it. A 1% distance error only stretches the path by 1%.",
    },
    {
      q: "A planar arm has l1 = 120 mm and l2 = 90 mm with free joints. Which distances r from the base can its tip reach?",
      choices: ["0 ≤ r ≤ 210 mm", "30 ≤ r ≤ 210 mm", "90 ≤ r ≤ 120 mm", "r ≤ 120 mm"],
      answer: 1,
      explain:
        "The workspace is an annulus from |l1 − l2| = 30 mm (fully folded) to l1 + l2 = 210 mm (fully stretched). Joint limits and the table surface cut it down further on a real arm.",
    },
    {
      q: "At a singularity of a 2-link planar arm,",
      choices: [
        "θ2 is 0° or 180°, and the tip cannot move along the radial direction",
        "θ1 is 90°, and the gravity load on the shoulder peaks",
        "the two IK solutions are exactly 90° apart",
        "the encoders lose count",
      ],
      answer: 0,
      explain:
        "det J = l1·l2·sin θ2 is zero when the arm is fully stretched or folded. The elbow-up and elbow-down solutions merge there, and the joint speeds needed to move radially go to infinity as you approach it.",
    },
    {
      q: "Why does UMBmark drive the square both clockwise and counter-clockwise?",
      choices: [
        "To double the amount of data for averaging",
        "Wheel-diameter and wheel-base errors add up in one direction and partly cancel in the other, so the two runs separate them",
        "Motors behave differently when spinning backwards",
        "The gyro must be calibrated in both directions",
      ],
      answer: 1,
      explain:
        "A one-direction test can close almost perfectly while hiding two errors that cancel. With both directions you can solve for the wheel-diameter ratio (Ed) and the wheel-base error (Eb) separately and correct each one.",
    },
    {
      q: "A trapezoidal profile has a_max = 0.5 m/s² and v_max = 0.3 m/s. How far does the robot travel while accelerating?",
      choices: ["0.03 m", "0.09 m", "0.18 m", "0.60 m"],
      answer: 1,
      explain:
        "The ramp lasts t = v/a = 0.6 s and covers d = v²/(2a) = 0.09/1.0 = 0.09 m. Deceleration takes another 0.09 m, so any move shorter than 0.18 m never reaches cruise speed and becomes a triangular profile.",
    },
  ],
};

export default data;
