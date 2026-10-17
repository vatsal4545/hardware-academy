import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "P&ID",
      def: "Piping and instrumentation diagram: the refrigerant or process loop drawn as a graph of components, lines, valves and sensors using ISA-5.1 symbols. It fixes line sizes and safety devices before any 3D exists.",
    },
    {
      term: "Single-line diagram",
      def: "The electrical power path of a system drawn as one line per circuit: supply, breaker, contactor, drive, motors and controls. Wiring diagrams add every conductor with gauge and colour.",
    },
    {
      term: "DFM (design for manufacturing)",
      def: "Rules that a single part can actually be made: bend radius, wall thickness, hole-to-edge distance, flange length. A checker reads the geometry and returns pass or fail with measured values.",
    },
    {
      term: "DFA (design for assembly)",
      def: "Rules that parts can be put together: a free insertion path, tool access to every fastener, a valid order, few reorientations. DFM can pass while DFA fails.",
    },
    {
      term: "Compile-time check",
      def: "A rule-based checker run on generated geometry the way a compiler runs on source: fast, deterministic, and returning machine-readable diagnostics an agent can read and act on.",
    },
    {
      term: "Layout versus schematic",
      def: "An automatic comparison of the geometry's connectivity with the schematic's netlist. A mismatch means a pipe or wire in 3D is missing, extra or connected to the wrong port.",
    },
    {
      term: "COP and the Carnot limit",
      def: "Coefficient of performance is heat delivered divided by electrical input. The Carnot COP, T_hot / (T_hot − T_cold) in kelvin, is the ceiling; real heat pumps reach roughly 35 to 55% of it.",
    },
    {
      term: "Minimum circuit ampacity (MCA)",
      def: "The smallest conductor current rating for an appliance: 125% of the largest motor-compressor current plus other loads. Wire ampacity must be at least the MCA.",
    },
    {
      term: "Verification layers",
      def: "Rule checks, simulation, and human review with physical test. Each covers what the others cannot see, and a design earns trust by passing all three.",
    },
    {
      term: "Agentic loop",
      def: "An agent generates an artifact, runs a check, reads the diagnostics and revises, repeating until the checks pass or a limit is hit. It only works when the feedback is fast, specific and trustworthy.",
    },
  ],
  scenario: {
    title: "The bracket passes every DFM check and cannot be assembled",
    context:
      "A design agent generates the fan-motor bracket for a heat-pump outdoor unit. The compile-time checker reports 41 rules and zero violations: 3 mm aluminium, two R6 bends, M6 clearance holes 12 mm from the edge, wall and flange rules satisfied. Fifty brackets are cut and bent. On the line, the first unit stalls: two of the four M6 screws that fix the bracket to the coil end plate sit behind the coil, and a socket with extension needs 40 mm of straight access on the screw axis while only 12 mm is free. The operators remove the coil, fit the bracket and refit the coil, adding about 20 minutes per unit.",
    symptoms: [
      "DFM report: 41 rules checked, 0 violations, 0 warnings",
      "Two of the four M6 screws cannot be reached with a socket and extension because the coil blocks the screw axis",
      "Operators must remove and refit the coil to install the bracket, adding about 20 minutes per unit",
    ],
    hints: [
      "DFM asks whether a part can be made. Which question asks whether it can be assembled?",
      "Which pipeline stage first looks at the bracket together with the coil, and does it verify access or only derive an order?",
      "What would a tool-access check need as input: the part, the tool envelope, and which other parts are already in place?",
    ],
    rootCause:
      "DFM and DFA are different questions. The DFM rules examined one part at a time and asked whether the shop could cut and bend it. The failure belongs to the assembly: the order parts go on, and whether a tool can follow a straight path to each screw with the other parts already in place. The pipeline had no DFA check, and its assembly-order stage derived a sequence without verifying tool paths, so the clash stayed invisible until a person held a socket wrench.",
    fix: "Add DFA to the compile-time checks. For every fastener, sweep a tool envelope (an M6 socket plus extension needs a straight 40 mm on the axis and a 20 mm radius) along the screw axis against the parts already placed in the planned order, and fail the build on any collision. Make the assembly order a verified output: the sequencer must prove that every part has a free insertion path in reverse. The agent can then repair it as geometry (a 25 mm access hole in the end plate) or as sequence (fit the bracket before the coil), and the checker confirms either fix.",
    lesson:
      "A part can be perfectly manufacturable and still impossible to assemble: DFM checks one part, DFA checks the sequence. Whatever the pipeline does not check, it silently assumes.",
  },
  interview: [
    {
      q: "Walk me through a systems-first AI design pipeline for a heat pump.",
      a: "I start with requirements that carry units and test conditions, then generate the systems level: a P&ID for the refrigerant loop and a single-line and wiring diagram, both as graphs. Next come real components matched to each duty, and an end-to-end simulation that returns heat output, COP and current. Only then does the agent write geometry through a CAD kernel, followed by DFM and DFA checks that return diagnostics, and finally subassemblies and an assembly order. Each stage has a machine check, and failures loop back to the cheapest stage that can fix them, so an undersized compressor returns to component selection instead of surviving into 3D.",
      level: "screen",
    },
    {
      q: "What is the difference between DFM and DFA, and why do you need both?",
      a: "DFM asks whether a single part can be manufactured: bend radius, wall thickness, hole-to-edge distance and flange length against the shop's capabilities. DFA asks whether parts can be assembled: a free insertion path, tool access to every fastener, a valid order and few reorientations. They fail independently, which is why a bracket can pass every DFM rule and still be impossible to install behind a coil. I want both as compile-time checks, because anything the pipeline does not check it silently assumes.",
      level: "screen",
    },
    {
      q: "Where is AI good in hardware design, and where does it fail?",
      a: "It is good at search across large catalogs, at boilerplate such as BOMs, wire lists and parametric variants, and at keeping names, units and identifiers consistent across schematic, BOM and 3D. It is weak at tolerances and fits, at tacit shop knowledge such as what a press brake can hold, at physics nobody simulated, and at mirrored or left-right geometry. It also invents plausible part numbers and datasheet values. So I use it where results can be checked mechanically and keep a human on the decisions that depend on judgement.",
      level: "screen",
    },
    {
      q: "How does an EV charging site-design engine map onto the heat-pump pipeline?",
      a: "The stages are the same with different artifacts. Requirements are stalls, kW per stall and the utility service, which become a single-line diagram and a load calculation. Components are the transformer, switchboard, conductors and chargers, and the simulation checks voltage drop and load management. Geometry is the stall layout and trench routes, and the code checkers (NEC 625 and accessibility rules) play the role of DFM. The loops are also the same: an overloaded service returns to component selection, and a failed clearance returns to the layout.",
      level: "screen",
    },
    {
      q: "How would you evaluate an AI-generated design before it goes to manufacturing?",
      a: "I would score it against a fixed rubric in three layers. Rule checks cover traceability, schematic completeness, real parts, layout versus schematic, DFM and DFA. Simulation covers the energy balance, performance against the spec, a COP that sits at a plausible fraction of Carnot, and electrical sizing against the minimum circuit ampacity. Human review covers what was never modelled, such as vibration, defrost and refrigerant charge limits, a prototype test plan and a named engineer who signs. I also require reproducible source, because every change should be a reviewable diff. Anything unknown counts as a fail until it is checked.",
      level: "deep",
    },
    {
      q: "Why run the checks at compile time, and what does that buy you with an LLM in the loop?",
      a: "A compile-time check gives fast, deterministic feedback with exact numbers, such as a hole rim 4.9 mm from the edge against 6.5 mm required. An agent can read that, fix the geometry and rerun in seconds, which is the loop that makes generation converge instead of guess. Errors found early are cheap, since a wrong line size costs seconds in a simulator and a recall in the field. The limit is that a checker only knows the rules someone wrote, so a green report proves those rules and nothing more. I treat it as one verification layer next to simulation and human review.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Why does the pipeline generate the P&ID and wiring before any 3D geometry?",
      choices: [
        "3D tools cannot import schematics",
        "Schematics are cheaper to print",
        "The systems level fixes capacities and port positions with checkable physics, so geometry becomes packing and routing against hard requirements",
        "DFM rules only apply to schematics",
      ],
      answer: 2,
      explain:
        "A schematic is a small graph whose physics can be simulated in seconds. Once line sizes, ports and component duties are fixed, the geometric stage has requirements instead of freedom. A wrong line size costs seconds in a simulator and a recall in the field.",
    },
    {
      q: "The simulation shows 8.1 kW of heat against a 10 kW requirement. Where should the loop return?",
      choices: [
        "To component selection: choose a larger compressor and re-simulate",
        "To the geometry stage: make the enclosure bigger",
        "To the DFM rules: loosen them",
        "Nowhere: ship it and fix it in the field",
      ],
      answer: 0,
      explain:
        "Heat output is set by the compressor and heat exchangers, so the fix lives at the component level. No geometry existed yet, which is the payoff of systems first: nothing downstream has to be redone.",
    },
    {
      q: "Which check is a DFA check rather than a DFM check?",
      choices: [
        "Bend radius is at least 2 × the tube OD",
        "A socket and extension can reach every M6 screw with the other parts already in place",
        "Wall thickness is at least 1.5 mm",
        "A hole rim is at least one diameter from the plate edge",
      ],
      answer: 1,
      explain:
        "DFM examines whether one part can be made. DFA examines whether parts can be put together: insertion paths, tool access and order. The other three are single-part manufacturing rules.",
    },
    {
      q: "Which task is an LLM agent most reliable at in this pipeline?",
      choices: [
        "Choosing machining tolerances for a press fit",
        "Judging what the shop's press brake can hold",
        "Simulating physics that was never put in the model",
        "Searching catalogs and keeping names, units and IDs consistent across schematic, BOM and 3D",
      ],
      answer: 3,
      explain:
        "Search and consistency are mechanical, high-volume and checkable by lookup. Tolerances, tacit shop knowledge and unmodelled physics are where models guess, so those need rules, data or a human.",
    },
    {
      q: "An AI design passes every rule check and the simulation. What is still missing before release?",
      choices: [
        "Human review and physical test, because rules and simulation only cover what someone encoded or modelled",
        "Nothing: two layers are enough",
        "A larger language model",
        "A prettier render",
      ],
      answer: 0,
      explain:
        "Rule checks are blind to unwritten rules and simulations to unmodelled physics such as vibration, defrost or charge limits. A prototype, certification and a named reviewer cover the remainder.",
    },
    {
      q: "A report claims COP 6.8 at 7 °C outdoor air and 35 °C supply, where the Carnot limit is 11.0. What should you conclude?",
      choices: [
        "Excellent: a record-setting unit",
        "Too low: it should be close to 11",
        "It is fine as long as the geometry passes DFM",
        "Implausible: 6.8 is 62% of Carnot, above the 35 to 55% real units reach, so check the simulation inputs",
      ],
      answer: 3,
      explain:
        "COP is bounded by the Carnot limit T_hot / (T_hot − T_cold) = 308.15 / 28 = 11.0, and real machines reach roughly 35 to 55% of it. A figure at 62% usually means a wrong boundary condition or a missing loss, not a breakthrough.",
    },
    {
      q: "A simulation reports condenser 9.5 kW, evaporator 7.5 kW and compressor input 2.4 kW. Does the energy balance close within 3%?",
      choices: [
        "Yes: the mismatch is about 4%, which is rounding error",
        "No: 7.5 + 2.4 = 9.9 kW against 9.5 kW is a 4.2% mismatch, over the 3% limit",
        "No: the mismatch is about 12%",
        "It cannot be judged without the COP",
      ],
      answer: 1,
      explain:
        "Heat rejected must equal heat absorbed plus work in. Here 9.9 kW goes in and 9.5 kW comes out, a 0.4 kW gap, or 4.2% of the condenser figure. A gap that size points to a modelling error such as a wrong enthalpy or an unmodelled loss.",
    },
  ],
};

export default data;
