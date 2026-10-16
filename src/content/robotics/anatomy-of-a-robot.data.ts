import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Sense-think-act loop",
      def: "The cycle every robot repeats: read the sensors, decide on an action, drive the actuators, then start again. The course robot runs it 100 times a second.",
    },
    {
      term: "Control loop rate",
      def: "How many times per second the loop runs. Travel per decision is speed divided by rate: 0.5 m/s at 20 Hz is 25 mm per cycle, at 100 Hz it is 5 mm.",
    },
    {
      term: "Degree of freedom (DOF)",
      def: "One independent way a body can move or a joint can turn. A rigid body in space has 6; a differential-drive robot's pose has 3 (x, y, heading) but only 2 inputs.",
    },
    {
      term: "Power domain",
      def: "A group of parts fed from one supply rail. The course robot has three: the raw 6.0-8.4 V motor domain, a 5 V buck domain and a 3.3 V logic domain, all sharing one ground.",
    },
    {
      term: "Proprioceptive sensor",
      def: "A sensor that measures the robot itself, such as a wheel encoder, IMU or motor-current sense. Exteroceptive sensors (ultrasonic, lidar, camera) measure the world around it.",
    },
    {
      term: "Nonholonomic constraint",
      def: "A limit on the directions a robot can move at any instant. A differential-drive robot cannot slide sideways, so reaching a pose beside it takes several maneuvers.",
    },
    {
      term: "Latency",
      def: "Delay between an event and the robot's response: up to one loop period to notice it, plus compute time, plus actuator response. At 0.5 m/s every 10 ms of latency is 5 mm of travel.",
    },
    {
      term: "Brownout",
      def: "A supply dip below the voltage a chip needs to run reliably. The ESP32's brownout detector resets the chip, which is why motor current spikes must be kept off the logic rail.",
    },
  ],
  scenario: {
    title: "Line follower drives straight through its stop line at speed",
    context:
      "A team's line-following robot stops cleanly on a 19 mm strip of black electrical tape at 0.2 m/s. For the competition they raise cruise speed to 0.6 m/s and add an HC-SR04 read with pulseIn() inside loop() so the robot also stops for obstacles. On the practice track it now sails past the stop line on about half the runs, and when it does stop it ends up 6-10 cm beyond the tape.",
    symptoms: [
      "At 0.2 m/s the robot stops on the tape every time; at 0.6 m/s it misses the line on roughly half the runs.",
      "When it does stop, it ends 60-100 mm past the tape instead of on it.",
      "A loop-timing printout shows the period jumping between 10 ms and about 48 ms; the long cycles happen when nothing is in front of the ultrasonic sensor.",
      "Commenting out the ultrasonic read makes the misses disappear, even at 0.6 m/s.",
    ],
    hints: [
      "Work out how far the robot travels per loop cycle at 0.6 m/s for a 10 ms loop and for a 48 ms loop, and compare both with the 19 mm tape.",
      "What does pulseIn() do while the HC-SR04 holds its echo pin high and no echo comes back?",
      "Even with a perfect sensor, how far does a 0.6 m/s robot roll while braking at about 3 m/s²?",
    ],
    rootCause:
      "pulseIn() blocks until the echo pin falls. With no obstacle in range the HC-SR04 holds ECHO high for about 38 ms before giving up, so every such cycle stretched the 10 ms loop to about 48 ms (about 21 Hz). At 0.6 m/s that is 29 mm of travel between line-sensor reads, wider than the 19 mm tape, so consecutive samples could land on either side of it and never see it. When a sample did land on the tape, the stop command took effect up to a cycle later, and the robot then needed v²/2a = 0.36/6 = 0.06 m, another 60 mm, to brake.",
    fix:
      "Take the blocking call out of the control loop: trigger the HC-SR04 every 50 ms from a small state machine and time the echo with a pin-change interrupt (or the ESP32's RMT or MCPWM capture), so the 100 Hz loop reads the line sensors every 10 ms, 6 mm of travel at 0.6 m/s. Log the loop period and count overruns. Slow to 0.3 m/s where a stop line is expected, which cuts braking distance to 15 mm, and use the driver's short brake instead of coasting.",
    lesson:
      "Speed divided by loop rate is the spatial resolution of every decision a robot makes. Measure the real loop period instead of assuming it, keep blocking calls out of the fast loop, and budget braking distance on top of sampling delay.",
  },
  interview: [
    {
      q: "What is the sense-think-act loop, and how does it show up on a small mobile robot?",
      a: "It is the cycle every robot repeats: read the sensors, decide what to do, command the actuators, and start again. On a small ESP32 robot it is literally the body of a fixed-rate loop: read the encoders and line sensors, run the controller and behavior logic, and write PWM duty cycles to the motor driver. It runs at a fixed rate, typically 100 Hz to 1 kHz for wheel control, because the controller math assumes a constant time step. Slower loops sit on top of it, such as a 10-20 Hz behavior state machine or path planner.",
      level: "screen",
    },
    {
      q: "Why do robots separate motor power from logic power?",
      a: "Motors draw large, fast-changing currents: a small gearmotor can pull more than an amp at stall and roughly twice that when it is reversed at full speed. Those spikes, flowing through the battery's internal resistance and the wiring, make the supply sag and ring, and a microcontroller on the same rail can brown out and reset. So the motors run from the raw pack through the driver, and the logic gets its own regulated rail, for example a buck to 5 V and an LDO to 3.3 V, with bulk capacitance at the driver. The grounds still have to be common so signals share a reference, ideally joined at one star point near the battery.",
      level: "screen",
    },
    {
      q: "Your robot drives at 1 m/s and its control loop runs at 50 Hz. Is that enough, and how would you choose a loop rate?",
      a: "At 1 m/s and 50 Hz the robot moves 20 mm between decisions, and it can react up to one period late plus actuator delay, so anything narrower than about 20 mm can be missed entirely. I would start from the smallest feature or error I must resolve, say a 19 mm tape line or ±5 mm of position, and pick a rate that keeps travel per cycle well below it, here 200 Hz or more. I would also check it against the dynamics: a loop should run roughly 10-20 times faster than the bandwidth it controls, so a wheel-speed loop with a few hertz of bandwidth is comfortable at 100-200 Hz. Finally I would measure the real period and its worst-case jitter on the hardware, because one blocking call can quietly cut the rate in half.",
      level: "deep",
    },
    {
      q: "What is a degree of freedom? How many does a differential-drive robot have, and how many does a robot arm need?",
      a: "A degree of freedom is one independent way something can move. A differential-drive robot on the floor has a 3-DOF pose, x, y and heading, but only two inputs, the wheel speeds, so it cannot move sideways; that is a nonholonomic constraint. To place a tool at any position and orientation in 3D space an arm needs six joints, three for position and three for orientation, like a UR5e. Seven-joint arms such as the Franka or KUKA iiwa add a redundant joint so they can reach around obstacles while holding the same tool pose.",
      level: "screen",
    },
    {
      q: "How would you split work between a microcontroller and a single-board computer on a robot?",
      a: "I give the microcontroller everything with hard timing: PWM generation, encoder counting, the 100 Hz to 1 kHz motor and balance loops, and safety such as current limits and a watchdog. The single-board computer, say a Raspberry Pi or a Jetson, runs the heavy soft-real-time work: camera and lidar processing, mapping and planning at 5-30 Hz, and networking. They talk over UART, USB or SPI, or through micro-ROS on a ROS 2 robot, with the computer sending velocity setpoints and the microcontroller streaming odometry back. The microcontroller must also fail safe on its own: if no command has arrived for about 200 ms it ramps the motors to zero.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "A robot drives at 0.5 m/s and its control loop runs at 20 Hz. How far does it travel between two decisions?",
      choices: ["2.5 mm", "10 mm", "25 mm", "100 mm"],
      answer: 2,
      explain:
        "Travel per cycle is speed divided by rate: 0.5 m/s ÷ 20 Hz = 0.025 m = 25 mm. That is wider than a 19 mm strip of electrical tape, so a line sensor sampled at 20 Hz can step right over a stop line without ever seeing it.",
    },
    {
      q: "Which of these is a proprioceptive sensor?",
      choices: ["A 2D lidar", "An HC-SR04 ultrasonic sensor", "A camera", "A wheel encoder"],
      answer: 3,
      explain:
        "Proprioceptive sensors measure the robot itself: wheel rotation, joint angles, motor current, the IMU's rotation rate. Lidar, ultrasonic sensors and cameras are exteroceptive; they measure the world. A robot needs both, because encoders cannot see a wall and a lidar cannot tell you that a wheel is slipping.",
    },
    {
      q: "Why does the course robot feed its motors from the pack through the driver, but its ESP32 through a buck converter and an LDO?",
      choices: [
        "Motor current spikes would brown out the logic if both shared one unregulated rail",
        "The ESP32 needs more current than the motors",
        "The TB6612FNG cannot accept more than 5 V on its motor supply",
        "Buck converters cannot supply motors at all",
      ],
      answer: 0,
      explain:
        "Stalls and reversals pull amps within milliseconds and sag the pack voltage. A regulated, separate logic rail keeps the ESP32 above its brownout threshold while the motors take what they need. The TB6612FNG's motor supply is rated up to 13.5 V, so the 6.0-8.4 V pack is fine for it.",
    },
    {
      q: "How many joints does a robot arm need to put its tool at any position and orientation within its workspace?",
      choices: ["3", "6", "7", "12"],
      answer: 1,
      explain:
        "Position in 3D takes three degrees of freedom and orientation takes three more, so general placement needs six joints, as on a UR5e. A seventh joint makes the arm redundant: it can hold the same tool pose with different elbow positions, which helps it reach around obstacles.",
    },
    {
      q: "What is a typical rate for the wheel-speed control loop of a small mobile robot?",
      choices: ["1 Hz", "10 Hz", "100 Hz to 1 kHz", "1 MHz"],
      answer: 2,
      explain:
        "Wheel-speed and balance loops usually run at 100 Hz-1 kHz: 10-20 times faster than the mechanical response, yet slow enough to leave CPU time and to collect several encoder counts per cycle. Motor current loops run faster (10-40 kHz) and planners slower (1-50 Hz).",
    },
    {
      q: "A robot with a 100 Hz loop drives at 0.6 m/s and stops 60 mm past its stop line. Which change helps most?",
      choices: [
        "Raise the loop rate to 1 kHz",
        "Switch to a faster microcontroller",
        "Add a second ultrasonic sensor",
        "Slow down before the line or brake harder",
      ],
      answer: 3,
      explain:
        "At 100 Hz the robot moves only 6 mm per cycle, so sampling is not the problem. Braking from 0.6 m/s at about 3 m/s² takes v²/2a = 60 mm, so the overshoot is braking distance. Halving the speed to 0.3 m/s cuts it to 15 mm, because braking distance grows with the square of speed.",
    },
  ],
};

export default data;
