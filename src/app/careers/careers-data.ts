export interface Role {
  id: string;
  title: string;
  entryTitles: string[];
  summary: string;
  dayToDay: string[];
  mustKnow: { topic: string; slug: string; track: string }[];
  tools: string[];
  interviewLoop: string[];
  portfolio: string[];
  resumeBullets: string[];
}

export const roles: Role[] = [
  {
    id: "hardware",
    title: "Hardware / Electrical Engineer",
    entryTitles: ["Junior Electrical Engineer", "Hardware Engineer I", "PCB Design Engineer", "Hardware Test Engineer"],
    summary:
      "Turns a requirement into a schematic, a layout, a built board and a bring-up report. Lives between the datasheet, the fab and the oscilloscope.",
    dayToDay: [
      "Select parts and draw schematics; review other people's schematics.",
      "Lay out boards, run DRC and DFM, order prototypes, write assembly notes.",
      "Bring boards up: power sequencing, rail checks, programming, peripheral tests.",
      "Debug field returns with a scope, logic analyzer and thermal camera; write up root causes.",
    ],
    mustKnow: [
      { topic: "Circuit fundamentals and dividers", slug: "circuit-fundamentals", track: "pcb" },
      { topic: "Capacitor dielectrics, ESR and derating", slug: "passive-components", track: "pcb" },
      { topic: "LDO vs buck, op-amp rules", slug: "active-components", track: "pcb" },
      { topic: "Stack-ups, vias, trace width", slug: "pcb-layout-and-stackup", track: "pcb" },
      { topic: "Return paths, decoupling, EMI", slug: "power-and-signal-integrity", track: "pcb" },
      { topic: "DFM and the fab process", slug: "dfm-and-manufacturing", track: "pcb" },
      { topic: "Systematic bring-up and debugging", slug: "bring-up-and-debugging", track: "pcb" },
      { topic: "MOSFETs as switches", slug: "transistors-bjt-mosfet", track: "semiconductors" },
    ],
    tools: ["KiCad or Altium", "LTspice or ngspice", "Oscilloscope, DMM, bench supply, logic analyzer", "Python for test scripts", "Git for design files"],
    interviewLoop: [
      "Phone screen: Ohm's law, dividers under load, why decoupling, LDO vs buck.",
      "Take-home or live: review a schematic and find the three planted errors.",
      "Onsite: design a 5 V to 3.3 V supply for a stated load, size a trace, explain a layout for a switching regulator.",
      "Debug scenario: a board draws too much current at power-on; walk through your method.",
    ],
    portfolio: [
      "The KiCad motor-driver board from lesson 18, with Gerbers, a BOM and a one-page bring-up log.",
      "A schematic-review write-up of a public reference design with the issues you found.",
    ],
    resumeBullets: [
      "Designed a 2-layer ESP32 motor-driver board in KiCad (TB6612FNG, 3.3 V LDO, reverse-polarity protection), passed fab DFM on the first submission and brought it up with a documented checklist.",
      "Diagnosed a brown-out reset caused by motor inrush on a shared ground return; fixed it with a 470 µF bulk capacitor and a star ground, verified on an oscilloscope.",
    ],
  },
  {
    id: "firmware",
    title: "Embedded Firmware Engineer",
    entryTitles: ["Embedded Software Engineer I", "Firmware Engineer", "IoT Engineer"],
    summary:
      "Writes the C/C++ that makes a microcontroller read sensors, drive actuators and talk to the world, on time, every loop.",
    dayToDay: [
      "Write drivers for I2C, SPI and UART peripherals from datasheets.",
      "Structure firmware around timers, interrupts and (sometimes) an RTOS.",
      "Profile and fix timing problems; keep control loops deterministic.",
      "Debug with serial logs, a logic analyzer and a debugger; ship OTA updates.",
    ],
    mustKnow: [
      { topic: "GPIO, ADC, PWM, I2C, SPI, UART, interrupts, RTOS", slug: "microcontrollers-and-firmware", track: "robotics" },
      { topic: "Sensors and filtering", slug: "sensors", track: "robotics" },
      { topic: "Motor drivers and PWM", slug: "actuators-and-drivers", track: "robotics" },
      { topic: "Discrete PID with anti-windup", slug: "control-systems-and-pid", track: "robotics" },
      { topic: "Board bring-up from the firmware side", slug: "bring-up-and-debugging", track: "pcb" },
    ],
    tools: ["C and C++", "Arduino, ESP-IDF, STM32Cube or Zephyr", "FreeRTOS", "Logic analyzer, JTAG/SWD debugger", "Python for tooling", "Git"],
    interviewLoop: [
      "Coding: bit manipulation, a ring buffer, a debounced button, a state machine.",
      "Peripherals: I2C vs SPI, what pull-ups do, how a timer makes PWM, what an interrupt must never do.",
      "System design: a sensor node that must run a year on a battery, or a 1 kHz control loop.",
      "Debugging story: a bug you found with a logic analyzer.",
    ],
    portfolio: [
      "The robot firmware from lesson 26: fixed-rate control loop, encoder interrupts, serial telemetry, with a README.",
      "A PID write-up with step-response plots from the lab, explaining each tuning decision.",
    ],
    resumeBullets: [
      "Implemented a 100 Hz control loop on an ESP32 with quadrature encoder interrupts, an ultrasonic driver and a PID speed controller, achieving under 10% overshoot and 1 s settling.",
      "Recovered a locked I2C bus in firmware with a clock-out routine and added 4.7 kΩ pull-ups, eliminating intermittent IMU drop-outs.",
    ],
  },
  {
    id: "robotics",
    title: "Robotics Software Engineer",
    entryTitles: ["Robotics Engineer", "Autonomy Engineer (junior)", "Controls Engineer", "Simulation Engineer"],
    summary:
      "Builds the sense-think-act stack: perception, planning and control, usually on ROS 2, usually tested in simulation first.",
    dayToDay: [
      "Write ROS 2 nodes in Python or C++ and wire them into launch files.",
      "Implement and tune controllers, odometry and navigation behaviors.",
      "Build and run simulations; measure the sim-to-real gap.",
      "Run field tests, log everything, triage failures.",
    ],
    mustKnow: [
      { topic: "Differential-drive kinematics and odometry", slug: "kinematics-and-motion", track: "robotics" },
      { topic: "PID and closed-loop control", slug: "control-systems-and-pid", track: "robotics" },
      { topic: "Behaviors, FSMs, planning", slug: "perception-and-navigation", track: "robotics" },
      { topic: "Simulation and the sim-to-real gap", slug: "simulate-before-you-build", track: "robotics" },
      { topic: "ROS 2 concepts and QoS", slug: "ros2-and-the-robotics-stack", track: "robotics" },
      { topic: "Sensor physics and fusion", slug: "sensors", track: "robotics" },
    ],
    tools: ["Python and C++", "ROS 2, Nav2, TF, RViz, rosbag", "Gazebo, Webots or Isaac Sim", "NumPy, OpenCV basics", "Linux, Docker, Git"],
    interviewLoop: [
      "Coding: implement odometry from encoder ticks, a PID class, or A* on a grid.",
      "Math: rotate a vector between frames, explain a singularity, derive differential-drive velocities.",
      "System design: a robot that follows a line and avoids obstacles; which nodes, which topics, which rates.",
      "Behavioral: a time a simulated controller failed on real hardware.",
    ],
    portfolio: [
      "The robot plus a video of it doing obstacle avoidance and line following, and the controllers you wrote in the simulator lab.",
      "A ROS 2 node graph for the robot with a short design note on rates and QoS.",
    ],
    resumeBullets: [
      "Built a differential-drive robot (ESP32, encoder gearmotors, ultrasonic and IR sensors) and validated obstacle-avoidance and line-following controllers in a browser simulator before deploying to hardware.",
      "Calibrated wheel diameter and track width with UMBmark, cutting odometry drift over a 10 m lap from 1 m to 12 cm.",
    ],
  },
  {
    id: "semiconductor",
    title: "Semiconductor Applications / Field / Product Engineer",
    entryTitles: ["Applications Engineer", "Field Applications Engineer (FAE)", "Product Engineer", "Test Engineer", "Technical Marketing Engineer"],
    summary:
      "Sits between a chip company and the engineers who use its parts: explains the device, debugs the customer's board, feeds problems back to design and test. Process and device R&D roles need a graduate degree and fab time; these customer-facing and test roles do not.",
    dayToDay: [
      "Answer customer questions about datasheets, operating regions and layout.",
      "Reproduce field failures on an evaluation board; drive failure analysis.",
      "Write application notes and reference designs; present to customers.",
      "Characterize parts in the lab; analyze test and yield data.",
    ],
    mustKnow: [
      { topic: "Bands, doping, carriers", slug: "doping-and-carriers", track: "semiconductors" },
      { topic: "Junctions and diode families", slug: "pn-junction-and-diodes", track: "semiconductors" },
      { topic: "MOSFET regions, Rds(on), gate charge", slug: "transistors-bjt-mosfet", track: "semiconductors" },
      { topic: "Packaging, θJA and reliability", slug: "packaging-and-testing", track: "semiconductors" },
      { topic: "Si vs SiC vs GaN, switching losses", slug: "power-semiconductors", track: "semiconductors" },
      { topic: "The value chain and the roles", slug: "semiconductor-industry-and-roles", track: "semiconductors" },
      { topic: "How wafers are made", slug: "wafer-fabrication", track: "semiconductors" },
    ],
    tools: ["Datasheets and SPICE models", "Oscilloscope, curve tracer, thermal chamber", "Python or MATLAB for data", "PowerPoint, honestly", "Lab notebooks and bug trackers"],
    interviewLoop: [
      "Device basics: explain a MOSFET's three regions, why Rds(on) rises with temperature, why a body diode exists.",
      "Application: a customer's MOSFET runs hot though it is on; what do you ask, what do you measure.",
      "Failure analysis: a part fails at high temperature in the field; lay out the FA flow.",
      "Communication: explain SiC to a non-engineer in two minutes.",
    ],
    portfolio: [
      "Three one-page device explainers (MOSFET switching, SiC vs Si losses, LDO vs buck) with your own diagrams.",
      "A failure-analysis write-up of a real or simulated board problem, structured as symptoms, hypotheses, measurements, root cause, corrective action.",
    ],
    resumeBullets: [
      "Analyzed conduction and switching losses for a 100 A, 10 kHz SiC MOSFET stage (10 mΩ, 1 mJ per cycle) and recommended a gate-resistor change that cut EMI emissions while holding efficiency above 98%.",
      "Wrote an application note on logic-level MOSFET selection for 3.3 V microcontrollers, with measured Rds(on) at 2.5 V and 4.5 V gate drive.",
    ],
  },
  {
    id: "ev",
    title: "EV Powertrain / Charging / Test Engineer",
    entryTitles: ["Powertrain Test Engineer", "Battery Test Engineer", "Charging Systems Engineer", "EVSE Applications Engineer", "Vehicle Integration Engineer"],
    summary:
      "Works on the pack, inverter, motor and charger, or on the charging sites they plug into. Heavy on high-voltage safety, test planning and data.",
    dayToDay: [
      "Plan and run dyno, pack and charger tests; analyze the data in Python or MATLAB.",
      "Validate BMS limits, thermal behavior and charging curves across temperatures.",
      "Work interoperability issues between vehicles and chargers (CCS, NACS, ISO 15118, OCPP).",
      "Design and commission charging sites: transformer sizing, load management, layouts.",
    ],
    mustKnow: [
      { topic: "The powertrain block diagram, 400 V vs 800 V, regen", slug: "ev-powertrain-architecture", track: "ev" },
      { topic: "Induction vs PM motors, field weakening", slug: "three-phase-motors", track: "ev" },
      { topic: "Inverters, PWM and FOC", slug: "inverters-pwm-and-foc", track: "ev" },
      { topic: "Cells, packs, BMS, charging curves", slug: "batteries-and-bms", track: "ev" },
      { topic: "The Tesla lineage and motor advances", slug: "tesla-roadster-and-motor-evolution", track: "ev" },
      { topic: "AC and DC charging, connectors, OCPP, site design", slug: "ev-charging-systems", track: "ev" },
      { topic: "Si vs SiC in traction inverters", slug: "power-semiconductors", track: "semiconductors" },
    ],
    tools: ["Python, pandas, MATLAB", "CAN tools (CANalyzer, SavvyCAN), OCPP simulators", "HV-safe multimeters, insulation testers, dynos, thermal chambers", "AutoCAD or site-design tools for EVSE", "ISO 15118 and SAE J1772/J3400 references"],
    interviewLoop: [
      "Fundamentals: how three phase currents make a rotating field, why Tesla moved to PM motors, why charging tapers past 80%.",
      "Numbers: cable current at 150 kW on 400 V vs 800 V, pack kWh from a 96s46p layout.",
      "Test planning: validate a BMS charge-current limit across −10 °C to 45 °C.",
      "Charging: design load management for eight 150 kW dispensers on a 600 kW service.",
    ],
    portfolio: [
      "An EV charging site design you have done, written up as requirements, loads, transformer, layout, compliance.",
      "A motor-and-inverter explainer with the three-phase and FOC visualizations from this site, in your own words.",
      "A charging-session analysis: SoC, power and temperature over time, with the taper explained.",
    ],
    resumeBullets: [
      "Designed EV charging sites with load-managed DC fast chargers, sizing transformers and switchgear for shared-power dispensers and ADA-compliant stall layouts.",
      "Modeled a 96s46p 2170 pack (79.6 kWh nominal) and its CC-CV charging taper versus temperature to set realistic charge-time expectations for site planning.",
    ],
  },
];

export const pitchTemplate = `I'm [name], a [current role] with a background in [strength]. Over the last two weeks I went deep on [two tracks], built a [robot / board / MCP CAD tool] and wrote up [one artifact]. I'm looking for a [target role] where I can [the thing the job does], and I'd start by [one specific contribution].`;

export const honestNote =
  "Fourteen days of this curriculum makes you conversant and gives you real artifacts. It does not replace a degree in device physics or years of board and fab experience, and it will not get you a process-engineer or senior-designer role. It does prepare you for junior hardware, embedded, robotics-software, applications, test and charging-systems roles, and for technical product roles next to those teams. Present the robot, the board and the write-ups as evidence; interviewers trust artifacts more than claims.";

export const resources = [
  { name: "KiCad", url: "https://www.kicad.org/", why: "Free, professional-grade schematic and layout tool used in the PCB track." },
  { name: "ROS 2 documentation", url: "https://docs.ros.org/", why: "The robotics stack most companies hire for." },
  { name: "Webots", url: "https://cyberbotics.com/", why: "Free robot simulator with sample robots; the next step after the browser lab." },
  { name: "build123d", url: "https://build123d.readthedocs.io/", why: "Code-CAD on OpenCascade, used in the MCP CAD tool lesson." },
  { name: "Model Context Protocol", url: "https://modelcontextprotocol.io/", why: "How tools are exposed to Claude." },
  { name: "IPC-2221 trace-width basics", url: "https://www.smps.us/pcb-calculator.html", why: "A second calculator to cross-check the lab." },
];
