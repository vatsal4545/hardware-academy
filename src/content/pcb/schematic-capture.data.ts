import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Reference designator",
      def: "The prefix-plus-number name of each part, which ties the schematic, the BOM and the board silkscreen together: R resistor, C capacitor, L inductor, D diode or LED, Q transistor, U integrated circuit, J connector, Y crystal, SW switch, F fuse, TP test point.",
    },
    {
      term: "Net and net label",
      def: "A net is every pin and wire that is electrically one node. A label gives it a name so it can cross the page or sheet without a drawn wire; two labels with the same name are the same net, and a typo makes two separate nets.",
    },
    {
      term: "Power symbol and PWR_FLAG",
      def: "A named symbol such as +3V3 or GND that joins every symbol of the same name, so supplies need no wires. PWR_FLAG tells the ERC that a power net is driven from off-board, such as a connector or battery.",
    },
    {
      term: "Hierarchical sheet",
      def: "A schematic page drawn as a block with its own pins inside a parent sheet. It splits a design into readable pieces such as power, MCU and motor driver, each small enough to review on one screen.",
    },
    {
      term: "Net class",
      def: "A named group of nets that share layout rules, for example Power at 0.5 mm, Motor at 1.5 mm and Signal at 0.2 mm. Assigning classes in the schematic means the router and DRC apply the right width and clearance without per-net fiddling.",
    },
    {
      term: "ERC (electrical rules check)",
      def: "An automatic connectivity check: unconnected pins, undriven power inputs, outputs wired together, duplicate designators, single-pin nets. It cannot know your intent, so a missing pull-up or a wrong value passes cleanly.",
    },
    {
      term: "No-connect flag",
      def: "A cross placed on a pin to say it is intentionally open. It silences the ERC for that pin, so use it only after reading the datasheet: an input marked no-connect is a floating input.",
    },
    {
      term: "BOM and MPN",
      def: "The bill of materials lists every part with designators, quantity, value, footprint, manufacturer, manufacturer part number (MPN) and supplier number. The MPN is the exact orderable part; a value like '100 nF' alone is not enough to buy or place anything.",
    },
  ],
  scenario: {
    title: "The motor driver works on the bench and cuts out in the field",
    context:
      "A first batch of 20 motor-driver boards passes bench testing: both motors spin from the lab supply, the firmware ramps them smoothly and the robot drives around the lab floor. After delivery, field units stall at random. The wheels stop for 50 to 300 ms, usually when the robot accelerates or crosses a cable duct, and then resume with no reset and no brown-out message. The design review was signed off, and the ERC report had 41 messages that the team dismissed as cosmetic warnings.",
    symptoms: [
      "Motors cut out for 50 to 300 ms at random and then resume, with no MCU reset and a steady 3V3 rail.",
      "The dropouts correlate with motor start-up current and with moving the motor cable.",
      "On the bench the fault almost never appears, and touching the driver's STBY pin with a finger switches the driver on or off.",
      "The ERC log contains 'Pin not connected (U3, STBY)' among the 41 dismissed messages.",
    ],
    hints: [
      "What does the STBY pin of a TB6612FNG do, and what is it connected to on this board?",
      "A CMOS input with nothing attached has no defined voltage. What decides whether the driver is enabled or in standby?",
      "Why would a motor starting, or a moved cable, change that voltage while a quiet bench does not?",
    ],
    rootCause:
      "The driver's STBY (standby) pin was never wired: no GPIO, no pull-up, no pull-down. A floating CMOS input sits near its switching threshold, so stray capacitance, leakage and noise decide whether the driver is enabled. On the quiet bench the pin happened to float high, and a probe or a hand nearby held it there. In the field, motor start-up current and cable movement coupled enough noise onto the pin to drop the driver into standby for tens of milliseconds. ERC had reported it, but the message was dismissed with the other 40.",
    fix: "Wire STBY to a GPIO with a 100 kΩ pull-down, so the driver stays off until firmware enables it (or tie it to 3V3 through 10 kΩ if the motors must always be armed). Fix the process as well: treat every ERC message as a defect until it is fixed or waived with a written reason, mark intentionally open pins with a no-connect flag only after reading the datasheet, and review every IC pin by pin against its datasheet.",
    lesson:
      "An unconnected input is a design error, not a warning. Give every pin a defined state in every phase of operation, and never dismiss an ERC message without a written reason.",
  },
  interview: [
    {
      q: "What does an ERC check, and what can it not catch?",
      a: "An electrical rules check analyses connectivity against a pin-type matrix. It finds unconnected pins, power inputs that no power output drives, two outputs wired together, duplicate reference designators, labels that join only one pin, and sheet-pin mismatches. It cannot know your intent, so a missing pull-up, a wrong resistor value, a mirrored connector pinout or a regulator that cannot supply the load all pass cleanly. I treat a clean ERC as the minimum bar, then review the design pin by pin against the datasheets, and I either fix every message or write down why it is waived.",
      level: "screen",
    },
    {
      q: "How do you make a schematic readable for a reviewer?",
      a: "I follow signal flow, with inputs on the left and outputs on the right, positive supplies at the top and grounds at the bottom, and I never draw a ground symbol pointing up. Each page covers one function, and I split large designs into hierarchical sheets such as power, MCU and motor driver. Nets get meaningful names like MOTA_PWM instead of auto-generated ones, and decoupling capacitors are drawn right next to the IC pin they serve. Every part carries a reference designator, a value with the critical specs, and a footprint, and I add short notes for non-obvious choices such as why a pull-down is 100 kΩ.",
      level: "screen",
    },
    {
      q: "What goes into a BOM, and why is a value alone not enough?",
      a: "A useful BOM groups identical parts and lists reference designators, quantity, value, footprint, manufacturer, manufacturer part number and a supplier part number, plus flags for parts that are not populated. A value such as 100 nF does not say the dielectric, voltage rating or package, and those decide whether the part works, so the MPN and a full description are the ground truth. I also list approved alternates, check stock and lifecycle status, and confirm that alternates are footprint compatible. A clean BOM lets the assembler order and place everything without calling me.",
      level: "screen",
    },
    {
      q: "What is the difference between a local label, a global label and a power symbol?",
      a: "A local label joins nets of the same name within one sheet only. A global label joins every net of that name across all sheets, which is convenient but harder to trace on a large project. A hierarchical label ties a net to a pin on the sheet symbol in the parent page, so connections between sheets are explicit. Power symbols such as +3V3 and GND behave like global labels for supplies, so I never draw supply wires by hand. The risk with any label is a typo, which silently makes two separate nets, and ERC reports it only as a single-pin-net warning.",
      level: "screen",
    },
    {
      q: "Walk me through how you review a colleague's schematic before layout.",
      a: "I start with power: I list every rail, what produces it and the worst-case load, and check each regulator for dropout, dissipation and capacitor requirements. Then I go through every IC pin by pin against the datasheet and its reference design, checking that each input has a defined state, unused pins are handled, strap and boot pins are at the right level and absolute maximum ratings are respected. I check interfaces for level compatibility, pull-ups on open-drain buses and protection at connectors, and I confirm that connector pinouts are not mirrored. Finally I check decoupling, footprints against the land patterns, test points and the BOM, and I confirm the ERC log has no unexplained messages.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Which reference designator prefix names an integrated circuit?",
      choices: ["Q", "J", "U", "Y"],
      answer: 2,
      explain:
        "U is the convention for integrated circuits. Q is a transistor, J a connector (jack) and Y a crystal. Consistent prefixes let anyone map a schematic symbol to a silkscreen label and a BOM line.",
    },
    {
      q: "The TB6612FNG's STBY pin has no wire, label or no-connect flag in the schematic. What does the ERC report?",
      choices: [
        "Nothing, because unconnected inputs are legal",
        "Pin not connected",
        "Duplicate reference designator",
        "Missing power flag",
      ],
      answer: 1,
      explain:
        "ERC flags any pin that is neither wired nor marked with a no-connect flag. A dangling STBY is exactly the kind of message that must be fixed, not dismissed, because a floating enable input behaves unpredictably.",
    },
    {
      q: "Which of these mistakes can an electrical rules check NOT detect?",
      choices: [
        "Two outputs wired together",
        "A power input pin that no source drives",
        "A missing 10 kΩ pull-up on a reset line",
        "A ground pin that is not connected",
      ],
      answer: 2,
      explain:
        "A reset net with only a switch and a capacitor on it is electrically legal, so ERC stays silent. Missing pull-ups, wrong values and mirrored connectors are design errors that only a datasheet-driven review finds.",
    },
    {
      q: "What does a PWR_FLAG symbol tell the ERC?",
      choices: [
        "The net is driven from off-board, so power inputs on it count as powered",
        "The net carries high current",
        "The track should be widened",
        "The net is the ground return",
      ],
      answer: 0,
      explain:
        "ERC expects every power input to be driven by a power output pin. A net fed from a connector or battery has no such pin, so PWR_FLAG declares that the net is legitimately powered and silences a false error.",
    },
    {
      q: "Which BOM column best guarantees that the assembler orders the right capacitor?",
      choices: ["Value", "Footprint", "Reference designator", "Manufacturer part number"],
      answer: 3,
      explain:
        "A value such as 100 nF omits dielectric, voltage rating and tolerance. The MPN identifies one exact orderable part, for example GRM155R71C104KA88D for a 100 nF, 16 V, X7R 0402.",
    },
    {
      q: "By the usual convention, where do positive supplies and ground go on a schematic page?",
      choices: [
        "Supplies at the bottom, ground at the top",
        "Both at the left edge",
        "Supplies at the top, ground at the bottom",
        "The position does not matter",
      ],
      answer: 2,
      explain:
        "Supplies at the top, ground at the bottom and signals flowing left to right make a page readable at a glance and make errors, such as a ground symbol pointing up, easy to spot.",
    },
    {
      q: "A net is labelled STBY on one sheet and STNDBY on another. What happens in KiCad?",
      choices: [
        "They connect because the first letters match",
        "They stay two separate nets, and ERC can only flag single-pin nets",
        "KiCad merges them automatically",
        "The netlist export fails",
      ],
      answer: 1,
      explain:
        "Labels connect only when the names match exactly. A typo silently creates two nets, each with a single pin, which ERC reports as a warning that is easy to wave through.",
    },
  ],
};

export default data;
