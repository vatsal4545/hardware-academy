import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "FR-4, core and prepreg",
      def: "FR-4 is glass-woven epoxy laminate. A core is fully cured FR-4 with copper on both faces; prepreg is partly cured glass-epoxy sheet that melts and bonds the layers during lamination. A standard board is 1.6 mm thick.",
    },
    {
      term: "Copper weight",
      def: "Copper thickness quoted in ounces per square foot: 1 oz is 35 µm (1.37 mil), 0.5 oz is 17.5 µm and 2 oz is 70 µm. Outer layers are usually 1 oz finished and inner layers 0.5 oz.",
    },
    {
      term: "Stack-up",
      def: "The ordered list of copper and dielectric layers with their thicknesses. A 4-layer SIG/GND/PWR/SIG stack keeps a solid reference plane directly under each outer routing layer.",
    },
    {
      term: "Solder mask and silkscreen",
      def: "Mask is the roughly 20 µm epoxy coating (green by default) that keeps solder off everything except the pads. Silkscreen is the ink for designators and outlines, and it must stay off pads.",
    },
    {
      term: "HASL and ENIG",
      def: "Surface finishes. HASL is hot-air-levelled solder: cheap but uneven. ENIG is electroless nickel (3 to 6 µm) under a thin gold flash (0.05 to 0.1 µm): flat, long shelf life, suited to fine pitch and BGAs, at higher cost.",
    },
    {
      term: "IPC-2221 trace width",
      def: "A current-capacity rule: area = (I / (k · ΔT^0.44))^(1/0.725) in mil², with k = 0.048 outer and 0.024 inner. 3 A at a 10 °C rise needs about 54 mil (1.4 mm) in 1 oz outer copper.",
    },
    {
      term: "Via types",
      def: "A through via is drilled through every layer. A blind via joins an outer layer to an inner one, a buried via joins inner layers only, and a microvia is laser-drilled, about 0.1 mm, spanning one dielectric layer in HDI boards.",
    },
    {
      term: "Clearance and creepage",
      def: "Clearance is the shortest air gap between conductors; creepage is the shortest path along the surface. Both grow with voltage: IPC-2221B Table 6-1 (column B2, uncoated external conductors) allows 0.1 mm up to 30 V and 0.6 mm from 31 to 150 V, and mains needs millimetres.",
    },
    {
      term: "Thermal relief",
      def: "Narrow spokes that connect a pad to a copper pour so soldering heat is not drained away, which prevents cold joints and tombstoning. Pads that carry high current are connected solidly instead.",
    },
    {
      term: "Design rules (6/6 mil)",
      def: "The minimum trace width and spacing (6 mil is 0.15 mm), drill (0.3 mm) and annular ring (0.15 mm) your fab builds reliably. Set them before routing so the design-rule check enforces them.",
    },
  ],
  scenario: {
    title: "The board browns under the motor driver",
    context:
      "A 2-layer, 1 oz motor-driver board runs fine in light testing. At the first stall test, with both motors drawing about 3 A, the robot smells of hot varnish within a minute and the laminate under the driver turns brown. The motors also lose torque: the battery connector reads 7.2 V while the driver's VM pins read 6.8 V. The layout shows that the feed to the driver is a 10 mil (0.25 mm) trace, 50 mm long, because the autorouter treated it like any other net.",
    symptoms: [
      "A burnt-varnish smell and visibly brown laminate along the trace to the VM pins after a minute at 3 A.",
      "About 0.4 V is lost between the battery connector and the driver at 3 A, and the motors stall at lower torque than the datasheet promises.",
      "A thermal camera shows the trace at about 185 °C while the driver chip is only warm.",
      "The board passes ERC and DRC with no messages.",
    ],
    hints: [
      "How much current flows in the VM feed during a stall? Check the motor's stall current and the driver's rating.",
      "Use IPC-2221: what width does 3 A at a 10 °C rise need on a 1 oz outer layer?",
      "What power does a 50 mm, 10 mil, 1 oz trace dissipate at 3 A? The sheet resistance of 1 oz copper is about 0.5 mΩ per square.",
    ],
    rootCause:
      "A 10 mil, 1 oz outer trace has a cross-section of only 13.8 mil², and IPC-2221 predicts a temperature rise of about 160 °C at 3 A. Over 50 mm its resistance is about 97 mΩ, so it dissipates roughly 0.9 W and drops 0.29 V (more as it heats and its resistance climbs), enough to char FR-4, whose glass transition is near 135 to 150 °C. The autorouter used the default net width because no net class asked for a wider one, and DRC only checks minimum widths.",
    fix: "Widen the feed to 60 mil (1.5 mm), which IPC-2221 predicts will rise only about 8 °C at 3 A in 1 oz copper (54 mil is the calculated minimum), or use 2 oz copper at 27 mil, or better, draw the VM feed and the motor ground as copper polygons several millimetres wide with vias to a plane. Create a Motor net class at 1.5 mm or wider so the router cannot choose less, and remember that the driver's ground return carries the same 3 A.",
    lesson:
      "Trace width is a current rating, not a style choice. Size every power and motor net with IPC-2221, let net classes make the tools enforce it, and prefer pours for high current.",
  },
  interview: [
    {
      q: "Why would you choose a 4-layer board over a 2-layer board?",
      a: "A 4-layer stack of signal, ground, power and signal gives every signal a solid, unbroken ground plane next to it, which shrinks the loop area of every current and lowers EMI and crosstalk. It also makes power distribution easier, because a plane or large pour feeds the whole board at low impedance. With about 0.2 mm of prepreg between the top layer and the ground plane, a 0.35 mm trace becomes a 50 Ω line, which a 2-layer board with a 1.5 mm gap cannot do without a trace about 3 mm wide. The cost is a prototype that is several times more expensive and a stack-up you must specify, so I use 2 layers for simple low-speed boards and move to 4 once there is an MCU with fast edges, USB or a noisy motor driver next to analog.",
      level: "screen",
    },
    {
      q: "How do you size a trace for 3 A?",
      a: "I use IPC-2221, or IPC-2152 when accuracy matters, starting from a temperature-rise budget of 10 to 20 °C. For 3 A, a 10 °C rise and 1 oz copper on an outer layer the width is about 54 mil, 1.4 mm, and an inner layer needs about 2.6 times that. Going to 2 oz copper halves the width, and a copper pour is better still because it spreads the heat and costs no routing effort. Then I check the voltage drop, which for 50 mm of 1.4 mm trace is only about 18 mΩ, and the vias, since a 0.3 mm via carries on the order of 1 A, so a layer change needs several in parallel.",
      level: "screen",
    },
    {
      q: "What are through, blind, buried and micro vias, and when do you use each?",
      a: "A through via is drilled through the whole board and plated, the cheapest option and the default. A blind via joins an outer layer to one or more inner layers without reaching the other face, and a buried via joins inner layers only, so neither shows on both sides. A microvia is laser-drilled, about 0.1 mm across, and spans a single dielectric layer, which is how high-density boards escape fine-pitch BGAs. Blind, buried and micro vias need sequential lamination and cost much more, so I stay with through vias at a 0.3 mm drill and 0.6 mm pad unless pitch or density forces a change.",
      level: "screen",
    },
    {
      q: "HASL or ENIG, and why?",
      a: "HASL coats the pads with molten solder and levels them with hot air. It is cheap and robust, but the surface is uneven, which hurts fine-pitch parts below about 0.5 mm and BGAs. ENIG plates 3 to 6 µm of electroless nickel under a thin immersion gold flash of 0.05 to 0.1 µm, which is flat, keeps well on the shelf and suits fine pitch, at a higher cost and with a small risk of black-pad defects. For a prototype robot board with 0.65 mm pitch parts, lead-free HASL is usually fine, and I choose ENIG for fine pitch, BGAs or anything that needs flat pads.",
      level: "screen",
    },
    {
      q: "Walk me through your placement and routing order for a mixed-signal board with a motor driver.",
      a: "I start with the constraints: the board outline, mounting holes, connectors and keep-outs such as the antenna area. Then I place the power entry and the driver near the motor connectors so the high-current loops are short, the regulator close to the battery input, and the MCU with its decoupling capacitors at the pins, keeping analog and sensor parts on the far side from the noisy switching nodes. I route power and ground first with wide traces or pours, then the sensitive signals such as clocks and ADC inputs, then the rest, keeping signals over an unbroken plane. I finish with ground and power fills, stitching vias, silkscreen and a DRC pass, and then review the current loops and thermal paths once more.",
      level: "deep",
    },
    {
      q: "What is thermal relief, and when do you turn it off?",
      a: "Thermal relief connects a pad to a copper pour through a few narrow spokes, typically four spokes 0.25 to 0.3 mm wide. During soldering the pad then heats up quickly instead of dumping its heat into the whole pour, which prevents cold joints and tombstoning of small passives. The spokes add electrical and thermal resistance, so I switch relief off or use wide spokes on pads that carry high current, such as motor-driver supply pins and connectors. Under a QFN exposed pad, where heat has to leave the package, I use a solid connection with thermal vias, so I decide each case by asking whether the pad needs to solder easily or to conduct well.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "How thick is 1 oz of PCB copper?",
      choices: ["17.5 µm", "35 µm", "70 µm", "105 µm"],
      answer: 1,
      explain:
        "One ounce of copper spread over a square foot is 35 µm, or 1.37 mil. Half an ounce is 17.5 µm, which is typical for inner layers, and 2 oz is 70 µm.",
    },
    {
      q: "By IPC-2221, about how wide must a 1 oz outer-layer trace be to carry 3 A with a 10 °C temperature rise?",
      choices: ["10 mil (0.25 mm)", "25 mil (0.64 mm)", "54 mil (1.4 mm)", "250 mil (6.4 mm)"],
      answer: 2,
      explain:
        "The cross-section works out to about 74 mil², and dividing by 1.378 mil of copper thickness gives roughly 54 mil. A 10 mil trace at 3 A would rise about 160 °C.",
    },
    {
      q: "You move the same 3 A, 10 °C-rise trace from 1 oz to 2 oz copper. The required width becomes about:",
      choices: ["The same", "Half", "Double", "A quarter"],
      answer: 1,
      explain:
        "The IPC-2221 formula fixes the cross-sectional area, so doubling the thickness halves the width: about 27 mil instead of 54 mil. Internal layers, by contrast, need roughly 2.6 times the width.",
    },
    {
      q: "In a 4-layer SIG/GND/PWR/SIG stack-up, what does the ground plane directly under the top layer mainly give you?",
      choices: [
        "A cheaper board",
        "More copper for soldering",
        "Faster drilling",
        "A short return path under every top-layer signal, and a controlled impedance",
      ],
      answer: 3,
      explain:
        "The thin prepreg between L1 and the plane keeps the signal and its return current close together, which shrinks loop area, reduces EMI and crosstalk, and makes a 0.35 mm trace roughly 50 Ω.",
    },
    {
      q: "A blind via connects:",
      choices: [
        "An outer layer to an inner layer without reaching the other face",
        "Top to bottom through the whole board",
        "Two inner layers only",
        "Two pads on the same layer",
      ],
      answer: 0,
      explain:
        "A blind via starts on an outer layer and stops at an inner one. A buried via joins inner layers only, a through via goes all the way, and a microvia is a laser-drilled blind via across a single dielectric layer.",
    },
    {
      q: "Why does a pad on a large copper pour usually get thermal relief spokes?",
      choices: [
        "To lower the pad's current rating on purpose",
        "To increase clearance to neighbouring pads",
        "So soldering heat is not drained away, which prevents cold joints and tombstoning",
        "To save copper and reduce cost",
      ],
      answer: 2,
      explain:
        "A pad tied solidly to a big pour sinks heat so fast that solder may not melt properly, and a small part can stand on end. The price is extra resistance, so high-current pads are connected solidly instead.",
    },
    {
      q: "Which common finish is flat enough for fine-pitch BGAs and costs more than HASL?",
      choices: ["Lead-free HASL", "ENIG", "Bare copper with no finish", "Wave-soldered tin"],
      answer: 1,
      explain:
        "ENIG, electroless nickel under immersion gold, leaves a very flat pad and keeps well on the shelf. HASL leaves a domed surface that can defeat fine-pitch placement, and bare copper oxidises quickly.",
    },
  ],
};

export default data;
