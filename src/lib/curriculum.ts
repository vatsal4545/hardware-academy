export type TrackId = "semiconductors" | "pcb" | "robotics" | "ev" | "ai-design";

export interface Track {
  id: TrackId;
  name: string;
  tagline: string;
  color: string;
  days: string;
}

export interface LessonMeta {
  slug: string;
  track: TrackId;
  title: string;
  day: number;
  minutes: number;
  summary: string;
  objectives: string[];
}

export interface QuizQuestion {
  q: string;
  choices: string[];
  answer: number;
  explain: string;
}

export interface InterviewQuestion {
  q: string;
  a: string;
  level: "screen" | "deep";
}

export interface Scenario {
  title: string;
  context: string;
  symptoms: string[];
  hints: string[];
  rootCause: string;
  fix: string;
  lesson: string;
}

export interface KeyTerm {
  term: string;
  def: string;
  /** Beginner definition, 25 words or fewer, shown first by <Term>. */
  plain?: string;
}

export interface Formula {
  /** The expression as written, for example "V = I × R". */
  expr: string;
  /** One entry per symbol in expr. */
  parts: { symbol: string; meaning: string }[];
}

export interface LessonData {
  keyTerms: KeyTerm[];
  scenario: Scenario;
  interview: InterviewQuestion[];
  quiz: QuizQuestion[];
  /** Simple-first lessons (spec 2026-10-22): a lesson with a big idea gets the new layout. 2-4 sentences. */
  bigIdea?: string;
  /** Quick checks by id, 3 choices each, placed in the body with <ConceptStep check="id">. */
  checks?: Record<string, QuizQuestion>;
  /** "Remember this": 3-5 takeaways and the formulas worth memorising. */
  remember?: { takeaways: string[]; formulas?: Formula[] };
}

export interface DayPlan {
  day: number;
  title: string;
  focus: string;
  lessonSlugs: string[];
  labIds: string[];
}

export const tracks: Track[] = [
  {
    id: "semiconductors",
    name: "Semiconductors",
    tagline: "From atoms to chips: how silicon becomes logic and power.",
    color: "#a78bfa",
    days: "Days 1-3",
  },
  {
    id: "pcb",
    name: "PCB Design",
    tagline: "From schematic to a manufactured, debugged board.",
    color: "#34d399",
    days: "Days 4-6",
  },
  {
    id: "robotics",
    name: "Robotics",
    tagline: "Sense, think, act: build and simulate a smart robot.",
    color: "#22d3ee",
    days: "Days 7-10",
  },
  {
    id: "ev",
    name: "EV Powertrain",
    tagline: "Motors, inverters, batteries and the Tesla lineage.",
    color: "#fb923c",
    days: "Days 11-12",
  },
  {
    id: "ai-design",
    name: "AI-Assisted Design",
    tagline: "CAD kernels, design agents and a Claude CAD tool.",
    color: "#fbbf24",
    days: "Day 13",
  },
];

export const lessons: LessonMeta[] = [
  // Semiconductors
  {
    slug: "atoms-to-bands",
    track: "semiconductors",
    title: "From atoms to energy bands",
    day: 1,
    minutes: 40,
    summary: "Why silicon conducts a little, and what a band gap really is.",
    objectives: [
      "You can explain why silicon sits between a conductor and an insulator using energy bands.",
      "You can quote the band gaps of Si, Ge, GaAs, SiC and GaN and say what each is used for.",
      "You can explain why carrier density rises steeply with temperature and what that does to a circuit.",
    ],
  },
  {
    slug: "doping-and-carriers",
    track: "semiconductors",
    title: "Doping, electrons and holes",
    day: 1,
    minutes: 40,
    summary: "How a few parts per million of phosphorus or boron turn silicon into n-type or p-type material.",
    objectives: [
      "You can describe donors, acceptors, majority and minority carriers.",
      "You can compute conductivity and resistivity from doping and mobility.",
      "You can tell drift from diffusion and say when each dominates.",
    ],
  },
  {
    slug: "pn-junction-and-diodes",
    track: "semiconductors",
    title: "The p-n junction and diodes",
    day: 1,
    minutes: 50,
    summary: "The depletion region, the exponential I-V law, and the diode family you will meet on every board.",
    objectives: [
      "You can explain how the depletion region forms and why a silicon diode drops about 0.7 V.",
      "You can read Vf, If, Vr and trr off a datasheet and pick a rectifier, Schottky, Zener or LED.",
      "You can size a series resistor for an LED and test a diode with a multimeter.",
    ],
  },
  {
    slug: "transistors-bjt-mosfet",
    track: "semiconductors",
    title: "Transistors: BJT and MOSFET",
    day: 2,
    minutes: 55,
    summary: "How a gate voltage opens a channel, and why MOSFETs run the world.",
    objectives: [
      "You can describe BJT and MOSFET operation and their three regions.",
      "You can choose a logic-level MOSFET to switch a load from a 3.3 V microcontroller.",
      "You can explain Rds(on), gate charge, the body diode and why a 'hot but on' MOSFET happens.",
    ],
  },
  {
    slug: "cmos-logic-and-chips",
    track: "semiconductors",
    title: "CMOS logic: from gates to chips",
    day: 2,
    minutes: 50,
    summary: "The CMOS inverter, dynamic power, memory types and what a 3 nm node actually means.",
    objectives: [
      "You can draw a CMOS inverter and NAND gate and explain why CMOS burns almost no static power.",
      "You can compute dynamic power from P = αCV²f and explain DVFS.",
      "You can compare SRAM, DRAM and Flash and describe FinFET and gate-all-around transistors.",
    ],
  },
  {
    slug: "wafer-fabrication",
    track: "semiconductors",
    title: "How chips are made: wafer fabrication",
    day: 2,
    minutes: 55,
    summary: "Lithography, etch, implant, deposition and CMP, repeated hundreds of times.",
    objectives: [
      "You can walk through the unit processes of a fab in order and say what each does.",
      "You can explain DUV vs EUV lithography and FEOL vs BEOL.",
      "You can estimate dies per wafer and yield from defect density.",
    ],
  },
  {
    slug: "packaging-and-testing",
    track: "semiconductors",
    title: "Packaging and test",
    day: 3,
    minutes: 45,
    summary: "Wire bonds, flip chips, BGAs, chiplets and the thermal path to the outside world.",
    objectives: [
      "You can compare wire bond and flip-chip packaging and name common package types.",
      "You can compute junction temperature from θJA and power.",
      "You can explain why chiplets and advanced packaging matter now.",
    ],
  },
  {
    slug: "power-semiconductors",
    track: "semiconductors",
    title: "Power semiconductors: Si, SiC and GaN",
    day: 3,
    minutes: 45,
    summary: "Why electric vehicles moved to silicon carbide and chargers to gallium nitride.",
    objectives: [
      "You can compare IGBTs and MOSFETs and compute conduction and switching losses.",
      "You can explain why wide-bandgap materials allow thinner drift regions and higher temperatures.",
      "You can discuss the dv/dt and EMI tradeoffs of fast switching.",
    ],
  },
  {
    slug: "semiconductor-industry-and-roles",
    track: "semiconductors",
    title: "The industry map and the jobs",
    day: 3,
    minutes: 40,
    summary: "EDA, fabless, foundry, IDM, equipment and OSAT, and which roles a two-week learner can target.",
    objectives: [
      "You can describe the semiconductor value chain with the major companies at each step.",
      "You can explain what process, device, design, applications and test engineers do.",
      "You can structure a failure-analysis answer in an interview.",
    ],
  },
  // PCB design
  {
    slug: "circuit-fundamentals",
    track: "pcb",
    title: "Circuit fundamentals you actually use",
    day: 4,
    minutes: 45,
    summary: "Ohm's law, Kirchhoff's laws, dividers, time constants and the mistakes that bite on real boards.",
    objectives: [
      "You can apply Ohm's law, KVL and KCL to simple networks.",
      "You can design a voltage divider that does not get loaded down.",
      "You can explain RC time constants and reactance of capacitors and inductors.",
    ],
  },
  {
    slug: "passive-components",
    track: "pcb",
    title: "Passives: resistors, capacitors, inductors",
    day: 4,
    minutes: 45,
    summary: "Packages, tolerances, dielectrics, ESR, saturation, and the DC-bias trap in ceramic capacitors.",
    objectives: [
      "You can read a passive's package code, tolerance and rating.",
      "You can pick capacitor dielectrics for decoupling, timing and filtering.",
      "You can explain ESR, ESL and inductor saturation current.",
    ],
  },
  {
    slug: "active-components",
    track: "pcb",
    title: "Active components: regulators, op-amps, MCUs",
    day: 4,
    minutes: 50,
    summary: "LDOs vs bucks, op-amp rules, and what a microcontroller needs around it on a board.",
    objectives: [
      "You can choose between an LDO and a buck converter by computing the losses.",
      "You can apply the op-amp golden rules to gain and comparator circuits.",
      "You can list the support circuitry a microcontroller needs.",
    ],
  },
  {
    slug: "components-in-action",
    track: "pcb",
    title: "Components in action: one board, every law",
    day: 4,
    minutes: 55,
    summary:
      "Power up the robot's motor-driver board one part at a time and watch Ohm's law, Kirchhoff's laws, the RC time constant and the right-hand rule work on real values.",
    objectives: [
      "You can follow the current through a real board from the battery connector to the motor and say what each part does on the way.",
      "You can apply Ohm's law, KCL, KVL, the voltage divider, Thevenin's theorem, the RC time constant and V = L·di/dt to the parts of the motor-driver board with real numbers.",
      "You can use the right-hand rule to find the direction of the magnetic field around a trace and inside a motor winding, and say what reversing the current does.",
    ],
  },
  {
    slug: "schematic-capture",
    track: "pcb",
    title: "Schematic capture: drawing a circuit people can read",
    day: 5,
    minutes: 45,
    summary: "Symbols, reference designators, nets, ERC and the conventions that make a schematic reviewable.",
    objectives: [
      "You can draw a readable schematic with correct reference designators and net labels.",
      "You can run and interpret an electrical rules check.",
      "You can build a bill of materials with manufacturer part numbers.",
    ],
  },
  {
    slug: "pcb-layout-and-stackup",
    track: "pcb",
    title: "PCB layout and stack-up",
    day: 5,
    minutes: 60,
    summary: "Layers, copper weight, vias, trace width and placement strategy.",
    objectives: [
      "You can describe a 4-layer stack-up and when it beats 2 layers.",
      "You can size a trace for a given current with IPC-2221.",
      "You can plan placement and routing for a small mixed-signal board.",
    ],
  },
  {
    slug: "power-and-signal-integrity",
    track: "pcb",
    title: "Power integrity, signal integrity and EMI",
    day: 5,
    minutes: 50,
    summary: "Return paths, decoupling, impedance, crosstalk and keeping motor noise out of your ADC.",
    objectives: [
      "You can explain where return current flows and why plane splits hurt.",
      "You can place decoupling capacitors for a small loop area.",
      "You can recognize when a trace is a transmission line and what to do about it.",
    ],
  },
  {
    slug: "dfm-and-manufacturing",
    track: "pcb",
    title: "DFM and how boards get made",
    day: 6,
    minutes: 50,
    summary: "Fab capabilities, Gerbers, reflow profiles, tombstoning and what a DFM check catches.",
    objectives: [
      "You can list the files a fab and an assembler need and what each contains.",
      "You can describe the fabrication and SMT assembly process steps.",
      "You can explain common DFM violations and how to avoid them.",
    ],
  },
  {
    slug: "bring-up-and-debugging",
    track: "pcb",
    title: "Board bring-up and debugging",
    day: 6,
    minutes: 45,
    summary: "A bring-up plan, the right instruments, and a systematic way to find faults.",
    objectives: [
      "You can write a bring-up checklist for a new board.",
      "You can use a multimeter, oscilloscope, logic analyzer and thermal camera appropriately.",
      "You can debug systematically: observe, hypothesize, test one thing.",
    ],
  },
  {
    slug: "kicad-project-walkthrough",
    track: "pcb",
    title: "Practical: design the robot's motor-driver board in KiCad",
    day: 6,
    minutes: 60,
    summary: "A complete KiCad workflow from schematic to a fab order for the course robot's driver board.",
    objectives: [
      "You can take a design from schematic to Gerbers in KiCad.",
      "You can set up a stack-up and design rules and pass DRC.",
      "You can order a board and an assembly from a low-cost fab.",
    ],
  },
  // Robotics
  {
    slug: "anatomy-of-a-robot",
    track: "robotics",
    title: "Anatomy of a robot",
    day: 7,
    minutes: 40,
    summary: "Sense, think, act: the subsystems every robot has and why loop rate matters.",
    objectives: [
      "You can draw the block diagram of a mobile robot with its power domains.",
      "You can explain the sense-think-act loop and typical control rates.",
      "You can relate loop rate to how far a robot travels between decisions.",
    ],
  },
  {
    slug: "sensors",
    track: "robotics",
    title: "Sensors",
    day: 7,
    minutes: 55,
    summary: "Ultrasonic, infrared, encoders, IMUs and lidar: how each works and how it lies to you.",
    objectives: [
      "You can explain time-of-flight ranging and quadrature encoding.",
      "You can fuse a gyro and accelerometer with a complementary filter.",
      "You can filter a noisy sensor with an exponential moving average.",
    ],
  },
  {
    slug: "actuators-and-drivers",
    track: "robotics",
    title: "Actuators and motor drivers",
    day: 7,
    minutes: 55,
    summary: "Brushed, brushless, servo and stepper motors and the H-bridges that drive them.",
    objectives: [
      "You can explain how an H-bridge controls direction, speed, brake and coast.",
      "You can compare brushed DC, BLDC, servo and stepper motors for a job.",
      "You can size a motor and gear ratio for a small robot.",
    ],
  },
  {
    slug: "microcontrollers-and-firmware",
    track: "robotics",
    title: "Microcontrollers and firmware",
    day: 8,
    minutes: 55,
    summary: "GPIO, ADC, PWM, I2C, SPI, UART, interrupts and the shape of a control-loop firmware.",
    objectives: [
      "You can compare I2C, SPI and UART and choose one for a sensor.",
      "You can structure firmware with a fixed-rate control loop.",
      "You can explain interrupts vs polling and when an RTOS helps.",
    ],
  },
  {
    slug: "control-systems-and-pid",
    track: "robotics",
    title: "Control systems and PID",
    day: 8,
    minutes: 50,
    summary: "Closed-loop control from first principles, with a tuner you can play with.",
    objectives: [
      "You can explain what each PID term does and how to tune by hand.",
      "You can implement a discrete PID with anti-windup and derivative on measurement.",
      "You can diagnose oscillation and steady-state error.",
    ],
  },
  {
    slug: "kinematics-and-motion",
    track: "robotics",
    title: "Kinematics and motion",
    day: 8,
    minutes: 50,
    summary: "Differential-drive kinematics, odometry, and forward and inverse kinematics of a 2-link arm.",
    objectives: [
      "You can compute a differential-drive robot's velocity and turn rate from wheel speeds.",
      "You can integrate odometry and explain why it drifts.",
      "You can solve forward and inverse kinematics for a two-link arm.",
    ],
  },
  {
    slug: "perception-and-navigation",
    track: "robotics",
    title: "Perception and navigation",
    day: 9,
    minutes: 50,
    summary: "Reactive behaviors, Bug algorithms, state machines and the first step toward mapping.",
    objectives: [
      "You can design obstacle-avoidance, wall-following and line-following behaviors.",
      "You can arbitrate behaviors with a finite state machine.",
      "You can describe occupancy grids, SLAM and A* at a conceptual level.",
    ],
  },
  {
    slug: "build-your-smart-robot",
    track: "robotics",
    title: "Build your smart robot",
    day: 9,
    minutes: 75,
    summary: "A complete build: bill of materials, power architecture, wiring, firmware and bring-up.",
    objectives: [
      "You can assemble a differential-drive robot from an ESP32, a TB6612FNG and encoder gearmotors.",
      "You can design the power architecture with separate motor and logic rails.",
      "You can flash and test the firmware skeleton and extend it.",
    ],
  },
  {
    slug: "simulate-before-you-build",
    track: "robotics",
    title: "Simulate before you build",
    day: 10,
    minutes: 60,
    summary: "Write a controller in the browser simulator, then learn what the real world adds.",
    objectives: [
      "You can write and test a controller in the robot simulator lab.",
      "You can explain the sim-to-real gap and how to design around it.",
      "You can name the professional simulators and what each is for.",
    ],
  },
  {
    slug: "ros2-and-the-robotics-stack",
    track: "robotics",
    title: "ROS 2 and the robotics stack",
    day: 10,
    minutes: 45,
    summary: "Nodes, topics, services, actions, TF and how robotics teams are organized.",
    objectives: [
      "You can explain ROS 2 nodes, topics, services, actions and QoS.",
      "You can sketch a node graph for the course robot.",
      "You can present the robot as a portfolio project.",
    ],
  },
  // EV powertrain
  {
    slug: "ev-powertrain-architecture",
    track: "ev",
    title: "EV powertrain architecture",
    day: 11,
    minutes: 50,
    summary: "Pack, inverter, motor, reducer and the auxiliary systems, plus 400 V vs 800 V.",
    objectives: [
      "You can draw the EV powertrain block diagram and explain each block.",
      "You can explain regenerative braking and the limits on it.",
      "You can compare 400 V and 800 V architectures with numbers.",
    ],
  },
  {
    slug: "three-phase-motors",
    track: "ev",
    title: "Three-phase motors",
    day: 11,
    minutes: 60,
    summary: "Rotating fields, induction vs permanent-magnet machines, and why Tesla uses both.",
    objectives: [
      "You can explain how three phase currents create a rotating magnetic field.",
      "You can compare induction, permanent-magnet and reluctance motors.",
      "You can explain field weakening and demagnetization risk.",
    ],
  },
  {
    slug: "inverters-pwm-and-foc",
    track: "ev",
    title: "Inverters, PWM and field-oriented control",
    day: 11,
    minutes: 55,
    summary: "How six switches and a control loop turn DC into precisely controlled torque.",
    objectives: [
      "You can explain PWM sine synthesis and dead time in a three-phase bridge.",
      "You can describe the field-oriented control chain in plain words.",
      "You can explain what limits switching frequency and why SiC helps.",
    ],
  },
  {
    slug: "batteries-and-bms",
    track: "ev",
    title: "Batteries and the BMS",
    day: 12,
    minutes: 55,
    summary: "Cells, chemistries, pack topology, the battery management system and charging curves.",
    objectives: [
      "You can compute pack voltage, capacity and energy from a series-parallel layout.",
      "You can list what a BMS monitors and controls.",
      "You can explain CC-CV charging, C-rate and why charging tapers.",
    ],
  },
  {
    slug: "tesla-roadster-and-motor-evolution",
    track: "ev",
    title: "Tesla Roadster and motor evolution",
    day: 12,
    minutes: 55,
    summary: "From the 2008 Roadster's induction motor to carbon-sleeved rotors and the second-generation Roadster claims.",
    objectives: [
      "You can describe the 2008 Roadster's powertrain with numbers.",
      "You can trace Tesla's motor evolution and explain each change.",
      "You can discuss the second-generation Roadster claims critically.",
    ],
  },
  {
    slug: "ev-charging-systems",
    track: "ev",
    title: "EV charging systems",
    day: 12,
    minutes: 45,
    summary: "AC and DC charging, connectors, protocols and designing a charging site.",
    objectives: [
      "You can explain AC vs DC charging and where the power conversion happens.",
      "You can name the connector standards and the OCPP and ISO 15118 protocols.",
      "You can size a charging site's power with load management.",
    ],
  },
  // AI-assisted design
  {
    slug: "cad-kernels-and-parametric-design",
    track: "ai-design",
    title: "CAD kernels and parametric design",
    day: 13,
    minutes: 50,
    summary: "B-rep vs mesh, the kernels behind the tools, and why code-CAD suits AI.",
    objectives: [
      "You can compare mesh, B-rep and CSG representations.",
      "You can name the major CAD kernels and the tools built on them.",
      "You can write a small parametric part in code and export STEP.",
    ],
  },
  {
    slug: "ai-agents-for-hardware-design",
    track: "ai-design",
    title: "AI agents for hardware design",
    day: 13,
    minutes: 50,
    summary: "The systems-first, geometry-second pipeline with DFM checks at compile time.",
    objectives: [
      "You can describe a design-agent pipeline from requirements to manufacturable geometry.",
      "You can say what AI is good and bad at in engineering design.",
      "You can evaluate an AI-generated design with a rubric.",
    ],
  },
  {
    slug: "build-a-claude-cad-tool",
    track: "ai-design",
    title: "Build a Claude CAD tool with MCP",
    day: 13,
    minutes: 60,
    summary: "An MCP server that gives Claude a CAD kernel and a DFM checker.",
    objectives: [
      "You can explain what the Model Context Protocol is and how tools are exposed.",
      "You can build and run a Python MCP server over a code-CAD kernel.",
      "You can design tools that make AI output verifiable.",
    ],
  },
];

export const days: DayPlan[] = [
  { day: 1, title: "Silicon basics", focus: "Bands, doping and the p-n junction.", lessonSlugs: ["atoms-to-bands", "doping-and-carriers", "pn-junction-and-diodes"], labIds: [] },
  { day: 2, title: "Transistors to fabs", focus: "MOSFETs, CMOS logic and how wafers are made.", lessonSlugs: ["transistors-bjt-mosfet", "cmos-logic-and-chips", "wafer-fabrication"], labIds: [] },
  { day: 3, title: "Packaging, power and the industry", focus: "Packages, SiC and GaN, and where the jobs are.", lessonSlugs: ["packaging-and-testing", "power-semiconductors", "semiconductor-industry-and-roles"], labIds: [] },
  { day: 4, title: "Circuits and components", focus: "Fundamentals, passives and actives.", lessonSlugs: ["circuit-fundamentals", "passive-components", "active-components", "components-in-action"], labIds: [] },
  { day: 5, title: "Schematic to layout", focus: "Capture, stack-up, routing and integrity.", lessonSlugs: ["schematic-capture", "pcb-layout-and-stackup", "power-and-signal-integrity"], labIds: ["trace-width"] },
  { day: 6, title: "Manufacturing and bring-up", focus: "DFM, debugging and a real KiCad project.", lessonSlugs: ["dfm-and-manufacturing", "bring-up-and-debugging", "kicad-project-walkthrough"], labIds: [] },
  { day: 7, title: "Robot anatomy, sensors, actuators", focus: "What a robot is made of.", lessonSlugs: ["anatomy-of-a-robot", "sensors", "actuators-and-drivers"], labIds: [] },
  { day: 8, title: "Firmware, control, kinematics", focus: "Microcontrollers, PID and motion math.", lessonSlugs: ["microcontrollers-and-firmware", "control-systems-and-pid", "kinematics-and-motion"], labIds: ["pid", "arm"] },
  { day: 9, title: "Navigation and the build", focus: "Behaviors, state machines and building the robot.", lessonSlugs: ["perception-and-navigation", "build-your-smart-robot"], labIds: [] },
  { day: 10, title: "Simulation and ROS 2", focus: "Test controllers in the simulator, then the professional stack.", lessonSlugs: ["simulate-before-you-build", "ros2-and-the-robotics-stack"], labIds: ["robot-sim"] },
  { day: 11, title: "EV powertrain", focus: "Architecture, motors and inverters.", lessonSlugs: ["ev-powertrain-architecture", "three-phase-motors", "inverters-pwm-and-foc"], labIds: [] },
  { day: 12, title: "Batteries, Tesla, charging", focus: "Packs, the Roadster lineage and charging systems.", lessonSlugs: ["batteries-and-bms", "tesla-roadster-and-motor-evolution", "ev-charging-systems"], labIds: [] },
  { day: 13, title: "AI-assisted design", focus: "CAD kernels, design agents and a Claude tool.", lessonSlugs: ["cad-kernels-and-parametric-design", "ai-agents-for-hardware-design", "build-a-claude-cad-tool"], labIds: [] },
  { day: 14, title: "Interview marathon and capstone", focus: "Mock interview mode, careers page, capstone checklist.", lessonSlugs: [], labIds: [] },
];

export function trackById(id: TrackId): Track {
  const t = tracks.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown track: ${id}`);
  return t;
}

export function lessonsFor(track: TrackId): LessonMeta[] {
  return lessons.filter((l) => l.track === track);
}

export function lessonBySlug(slug: string): LessonMeta | undefined {
  return lessons.find((l) => l.slug === slug);
}

export function neighbors(slug: string): { prev?: LessonMeta; next?: LessonMeta } {
  const i = lessons.findIndex((l) => l.slug === slug);
  if (i < 0) return {};
  return { prev: i > 0 ? lessons[i - 1] : undefined, next: i < lessons.length - 1 ? lessons[i + 1] : undefined };
}

export function dayFor(day: number): DayPlan | undefined {
  return days.find((d) => d.day === day);
}

export function totalMinutesForDay(day: number): number {
  return lessons.filter((l) => l.day === day).reduce((sum, l) => sum + l.minutes, 0);
}
