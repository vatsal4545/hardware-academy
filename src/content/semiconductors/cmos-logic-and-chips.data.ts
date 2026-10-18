import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "CMOS",
      def: "Complementary MOS: every gate has an NMOS pull-down network and a mirror-image PMOS pull-up network, so in a steady state one of them is always off and only leakage flows.",
    },
    {
      term: "Dynamic power (P = αCV²f)",
      def: "Power spent charging and discharging capacitance: activity factor × switched capacitance × supply voltage squared × clock frequency. C = 1 nF, 1 V, 3 GHz and α = 0.1 give 0.3 W.",
    },
    {
      term: "Activity factor (α)",
      def: "The fraction of a chip's capacitance that switches each clock cycle: about 0.05-0.2 for typical logic and 1 for the clock tree.",
    },
    {
      term: "DVFS",
      def: "Dynamic voltage and frequency scaling: lowering V and f together when full speed is not needed. Because f roughly tracks V, power falls roughly as V³: 10% lower V and f saves about 27%.",
    },
    {
      term: "Flip-flop",
      def: "A sequential element of about 20 transistors that captures its input on a clock edge and holds it for a cycle. The slowest logic path between two flip-flops sets the maximum clock frequency.",
    },
    {
      term: "SRAM (6T)",
      def: "Static RAM: two cross-coupled inverters plus two access transistors per bit. Fast (around 1 ns) and needs no refresh, but large, so it is used for caches and registers.",
    },
    {
      term: "DRAM (1T1C)",
      def: "Dynamic RAM: one transistor and one capacitor per bit. Dense and cheap, but the charge leaks, so every row must be refreshed every 64 ms.",
    },
    {
      term: "Flash (floating gate)",
      def: "Non-volatile memory that stores charge on an isolated gate or charge-trap layer to shift a transistor's threshold. Written by tunneling at 15-20 V, which limits endurance to roughly 1,000-100,000 cycles.",
    },
    {
      term: "FinFET and gate-all-around (GAA)",
      def: "3-D transistor shapes that let the gate surround the channel on three sides (FinFET, from Intel 22 nm in 2011) or all four (GAA nanosheets, from Samsung 3 nm in 2022), cutting leakage at short gate lengths.",
    },
    {
      term: "Thermal design power (TDP)",
      def: "The sustained power a chip's cooling is designed to remove: about 15-45 W for laptop processors, 65-250 W for desktop CPUs and 700-1,000 W for datacenter GPUs.",
    },
  ],
  scenario: {
    title: "The chip overheats after a 10% voltage bump",
    context:
      "An edge-AI camera runs its neural accelerator at 1.0 GHz from a 0.80 V core rail. A handful of units showed rare bit errors at 85 °C, so a firmware update raised the core rail by 10%, to 0.88 V, across the whole fleet. The thermal design assumed 10 W of chip power (8 W dynamic, 2 W leakage) with 5 °C/W from junction to the 50 °C air inside a sealed enclosure: a 100 °C junction against a 105 °C throttle point.",
    symptoms: [
      "Within ten minutes of start-up, units in sealed enclosures hit the 105 °C throttle point and the accelerator clock drops from 1.0 GHz to 700 MHz",
      "The dashboard frame rate falls from 30 to about 21 fps",
      "Core-rail current is up about 14% even though the workload and clock frequency are unchanged",
      "Units on an open bench at 25 °C never throttle",
    ],
    hints: [
      "How does dynamic power scale with supply voltage at a fixed clock?",
      "What does leakage do when both voltage and temperature rise?",
      "How much thermal margin did the original design have?",
    ],
    rootCause:
      "Dynamic power goes as V²: 1.10² = 1.21, so 8 W became 9.7 W at the same 1 GHz clock. Leakage grows with both voltage and temperature and went from about 2 W to 2.8 W. Total power rose from 10 W to about 12.5 W, and at 5 °C/W from a 50 °C enclosure the junction moved from 100 °C to about 112 °C, past a throttle point the original design cleared by only 5 °C.",
    fix: "Roll back the blanket +10% and fix the real problem: use adaptive voltage scaling so only slow parts, identified by on-die ring oscillators, get extra voltage, or add the higher voltage only to the top frequency bin of the DVFS table. If the voltage really is needed, budget for it: improve the heatsink from 5 to 4 °C/W, or lower the clock 10%, which brings dynamic power back to about 8.7 W.",
    lesson:
      "Voltage is the most expensive knob in CMOS: dynamic power scales with V², roughly V³ once frequency follows, and leakage climbs with both voltage and temperature.",
  },
  interview: [
    {
      q: "Why does a CMOS gate draw almost no static current?",
      a: "Every CMOS gate has a PMOS pull-up network to VDD and a complementary NMOS pull-down network to ground, driven by the same inputs. For any steady input combination exactly one network conducts, so there is never a DC path from supply to ground. Current flows only while the output switches, to charge or discharge the load capacitance, plus a brief short-circuit pulse while both networks are partly on. The static power that remains is leakage, which in modern nodes can still be a significant share of the total, especially when hot.",
      level: "screen",
    },
    {
      q: "Draw a CMOS NAND gate and explain why designers prefer NAND to NOR.",
      a: "A two-input NAND has two NMOS in series from the output to ground and two PMOS in parallel from VDD to the output, so the output goes low only when both inputs are high. A NOR is the mirror image, with the PMOS in series and the NMOS in parallel. Series transistors add resistance, and PMOS devices are already two to three times weaker than NMOS because holes are less mobile, so a NOR needs very wide PMOS to match speeds. NAND puts the series stack on the faster NMOS side, and since NAND alone is functionally complete, standard-cell libraries lean on it.",
      level: "screen",
    },
    {
      q: "Where does power go in a modern SoC, and what techniques reduce it?",
      a: "Dynamic power is αCV²f, the cost of charging capacitance, plus a small short-circuit term, and static power is leakage, which rises steeply with temperature and with lower threshold voltages. The biggest lever is voltage because of the square, so DVFS lowers voltage and frequency together and adaptive voltage scaling trims each part to its own silicon. Clock gating stops the clock to idle blocks, cutting α, and power gating disconnects idle blocks entirely with header switches to remove their leakage. On top of that, designers use multi-threshold cell libraries, putting low-Vt fast cells only on critical paths and high-Vt low-leakage cells everywhere else.",
      level: "deep",
    },
    {
      q: "Compare SRAM, DRAM and Flash: cell structure, speed, density and volatility.",
      a: "SRAM stores a bit in two cross-coupled inverters with two access transistors, six transistors in all, so it is fast, about a nanosecond, and needs no refresh, but it is large, about 0.02 µm² per bit at the 3-5 nm nodes. DRAM uses one transistor and one capacitor per bit, which makes it several times denser and cheaper per bit, but the charge leaks, so every row is refreshed every 64 ms and access takes tens of nanoseconds. Flash stores charge on a floating gate or charge-trap layer, so it keeps data for years without power and stacks over 200 layers in 3D NAND, but reads take tens of microseconds, writes need 15-20 V tunneling and each cell survives only thousands of program-erase cycles. That is why a computer uses SRAM for caches, DRAM for main memory and Flash for storage.",
      level: "deep",
    },
    {
      q: "What does '3 nm' mean, and how did transistors change from planar to FinFET to gate-all-around?",
      a: "Until the late 1990s a node name matched the gate length, but now it is a generation label: TSMC's 3 nm process has a contacted gate pitch around 45-50 nm and no feature that is 3 nm wide. The real story is density and electrostatics. A planar gate controls the channel only from the top, so below about 30 nm the drain's field leaked into the channel and the transistor could not turn fully off. FinFETs, from Intel's 22 nm process in 2011, wrap the gate around a thin fin on three sides, and gate-all-around nanosheets, from Samsung's 3 nm in 2022 and TSMC N2 and Intel 18A in 2025, wrap it on all four sides to keep leakage down as gates shrink further.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "In a CMOS inverter with its input high, which statement is true?",
      choices: [
        "PMOS on, NMOS off, output high",
        "NMOS on, PMOS off, output low",
        "Both transistors on, output near VDD/2",
        "Both transistors off, output floating",
      ],
      answer: 1,
      explain:
        "A high input gives the NMOS a positive Vgs, so it conducts, and leaves the PMOS with Vgs ≈ 0, so it is off. The output is pulled to ground, and because one device is always off, no static current flows.",
    },
    {
      q: "A chip has C = 1 nF of switched capacitance, V = 1 V, f = 3 GHz and α = 0.1. What is its dynamic power?",
      choices: ["3 W", "30 W", "0.3 W", "0.03 W"],
      answer: 2,
      explain:
        "P = αCV²f = 0.1 × 10⁻⁹ F × 1 V² × 3 × 10⁹ Hz = 0.3 W. Real processors have hundreds of nanofarads of switched capacitance, which is how they reach tens to hundreds of watts.",
    },
    {
      q: "Raising VDD by 10% at the same clock frequency raises dynamic power by about:",
      choices: ["10%", "21%", "33%", "100%"],
      answer: 1,
      explain:
        "Dynamic power goes as V², so 1.1² = 1.21, an increase of 21%. Leakage rises too, and if frequency is raised along with voltage the total grows roughly as V³: 1.1³ = 1.33.",
    },
    {
      q: "Which memory must be refreshed periodically to keep its data?",
      choices: ["SRAM", "Flash", "DRAM", "Processor registers"],
      answer: 2,
      explain:
        "DRAM stores each bit as charge on a tiny capacitor that leaks, so every row is read and rewritten every 64 ms. SRAM holds data in cross-coupled inverters as long as it is powered, and Flash keeps it for years without power.",
    },
    {
      q: "How are the transistors arranged in a 2-input CMOS NAND gate?",
      choices: [
        "NMOS in series to ground, PMOS in parallel to VDD",
        "NMOS in parallel to ground, PMOS in series to VDD",
        "All four in series between VDD and ground",
        "All four in parallel",
      ],
      answer: 0,
      explain:
        "The output must be low only when A and B are both high, so the pull-down needs both NMOS on: series. The pull-up must conduct if either input is low: parallel PMOS. NOR is the mirror image.",
    },
    {
      q: "What does the name of TSMC's '3 nm' process tell you?",
      choices: [
        "The physical gate length of every transistor is 3 nm, measured along the channel",
        "The tightest metal pitch is 3 nm, the smallest line that EUV lithography can print",
        "The fins are 3 nm wide, about half the width of the fins on the 5 nm node",
        "It is a generation label: no feature is 3 nm, and the gate pitch is around 45-50 nm",
      ],
      answer: 3,
      explain:
        "Node names stopped matching any physical dimension in the late 1990s. Gate pitch is around 45-50 nm and the tightest metal pitch around 23 nm; the meaningful comparison is transistor density, roughly 1.6× per full node.",
    },
    {
      q: "Why did the industry move from planar transistors to FinFETs and then to gate-all-around?",
      choices: [
        "To lower the cost of each wafer, because fins and nanosheets need fewer lithography and etch steps than planar",
        "To give the gate control of the channel from more sides, so short transistors can still turn fully off",
        "To allow higher supply voltages, since a gate that wraps the channel withstands more drain stress",
        "To remove the need for a gate oxide, since the gate touches the channel on several sides",
      ],
      answer: 1,
      explain:
        "Below about 30 nm a planar gate, touching the channel only from above, loses control to the drain field and leakage soars. Wrapping the gate around a fin (three sides) and then around stacked nanosheets (four sides) restores control. Each step makes wafers more expensive, not less.",
    },
  ],
};

export default data;
