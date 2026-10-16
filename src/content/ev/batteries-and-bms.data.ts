import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Series group and parallel count (96s46p)",
      def: "Cells wired in parallel form a group that shares one voltage and adds capacity; groups wired in series add voltage. 96s46p means 96 groups of 46 cells.",
    },
    {
      term: "C-rate",
      def: "Current relative to capacity. 1C fills or empties a cell in about an hour; a 250 kW charge into a 76 kWh pack is about 3.3C.",
    },
    {
      term: "CC-CV charging",
      def: "Constant current until a cell reaches its voltage ceiling (about 4.2 V for nickel-rich cells), then constant voltage while the current decays to a cutoff such as C/20.",
    },
    {
      term: "State of charge (SoC)",
      def: "Remaining charge as a percentage of usable capacity, estimated by coulomb counting and corrected with open-circuit-voltage readings after the pack rests.",
    },
    {
      term: "State of health (SoH)",
      def: "Capacity and resistance compared with a new pack. A common end-of-life rule of thumb for EV use is 70-80 % of original capacity.",
    },
    {
      term: "Passive balancing",
      def: "Switching a resistor across the highest-voltage groups to bleed their extra charge as heat until every group matches the lowest one.",
    },
    {
      term: "Lithium plating",
      def: "Metallic lithium deposited on the graphite anode instead of inserting into it, caused by charging too fast, too cold or too full. It permanently costs capacity and can grow dendrites.",
    },
    {
      term: "Thermal runaway",
      def: "A self-accelerating chain of heat-releasing reactions inside a cell that can vent flammable gas and spread to neighbouring cells unless the pack design stops it.",
    },
    {
      term: "Precharge",
      def: "Charging the inverter's DC-link capacitors through a resistor before the main contactor closes, so the contacts do not weld from inrush current.",
    },
    {
      term: "Isolation monitoring",
      def: "Continuous measurement of resistance between the high-voltage bus and the chassis; FMVSS 305 and UN ECE R100 ask for at least 100 Ω per volt on a DC bus.",
    },
  ],
  scenario: {
    title: "Module 7 balances every night",
    context:
      "A last-mile delivery fleet runs 40 identical electric vans. Each 96s pack is built from 16 modules, and each module has its own monitor board that balances its six series groups toward the lowest one. The fleet dashboard flags van 23: module 7's balancing resistors run six to eight hours every night, while every other module in the fleet balances for a few minutes a week. The van's usable range has dropped about 6 % in three months.",
    symptoms: [
      "Module 7's board logs hours of bleeding on groups 1-3 and 5-6 every night; group 4 is never bled.",
      "With balancing disabled for a 48-hour park, group 4 falls about 4 mV below its neighbours; every other group in the pack stays within 1 mV.",
      "Discharge ends when module 7 reaches the low-voltage limit, while the other modules still hold about 5 % charge.",
      "Module 7's board runs about 6 °C warmer than the others overnight. Cell temperatures and charging currents look normal.",
    ],
    hints: [
      "Passive balancing can only remove charge. Which group is everyone else in module 7 being bled down to match?",
      "Disable balancing and log each group's open-circuit voltage over a long park. A group that falls faster than its neighbours is losing charge inside the pack.",
      "Healthy cells self-discharge only a few percent a month. What leak current would need about six hours of 100 mA bleeding every night to cancel?",
    ],
    rootCause:
      "One of the 46 cells in module 7, group 4 has an internal micro-short, for example a metal particle that pierced the separator during manufacturing. It leaks about 25 mA continuously, so the whole parallel group loses about 0.6 Ah a day, many times faster than its neighbours. Module 7's board balances toward its lowest group, so it bleeds the other five groups at about 100 mA for roughly six hours every night to keep up, burning energy as heat and dragging the whole module below the rest of the pack. Discharge then ends early because module 7 hits the low-voltage limit first.",
    fix: "Take the van out of service and replace module 7; wire-bonded or welded cells are rarely repaired one at a time. Send the module for teardown (CT scan and per-cell self-discharge test) to confirm the shorted cell, and screen other modules from the same production lot. Add a BMS diagnostic that estimates each group's self-discharge from its balancing time and rest-voltage drift, and raises an alarm when any group exceeds a few times the pack median.",
    lesson:
      "Balancing activity is a sensor. A group that needs constant balancing is telling you it leaks, and micro-shorts can grow into hard shorts and thermal events, so trend balancing time instead of letting the balancer quietly hide the problem.",
  },
  interview: [
    {
      q: "How do you get pack voltage, capacity and energy from a series-parallel layout?",
      a: "Series groups add voltage and parallel cells add capacity, so pack voltage is s times the cell voltage, capacity is p times the cell amp-hours, and energy is their product. For 96s46p with 4.8 Ah, 3.6 V cells that is 345.6 V, 220.8 Ah and about 76.3 kWh. Full charge is 96 × 4.2 = 403 V and empty is about 96 × 3.0 = 288 V, so the inverter and charger must work across that whole window. The same 4,416 cells wired 192s23p give the same energy at twice the voltage and half the current, which is the 800 V trade.",
      level: "screen",
    },
    {
      q: "What does a battery management system monitor and control?",
      a: "It measures every series group's voltage to a few millivolts, temperatures across the pack and the pack current. From those it estimates state of charge and state of health and continuously publishes charge and discharge power limits to the inverter and charger. It balances the groups, sequences the precharge and main contactors, monitors insulation resistance between the high-voltage bus and the chassis, and opens the contactors on overvoltage, undervoltage, overcurrent, overtemperature, an isolation fault or a crash signal. It also asks the thermal system to heat or cool the pack.",
      level: "screen",
    },
    {
      q: "Why does DC fast charging taper, and what does preconditioning change?",
      a: "Charging is constant current until a cell reaches its voltage ceiling, about 4.2 V for nickel-rich cells, then constant voltage while the current decays, so the last 10-20 % is always slow. Well before that, the BMS lowers current as state of charge rises because the graphite anode is filling and its potential approaches that of lithium metal; pushed harder, lithium plates on the surface instead of inserting, which permanently costs capacity and can grow dendrites. Cold makes this much worse because resistance and diffusion times rise steeply, so a cold pack may be held to a fraction of its warm power. Preconditioning heats the pack on the way to the charger so the BMS allows high current from the moment you plug in. That is why the useful fast-charging window is roughly 10-80 %.",
      level: "deep",
    },
    {
      q: "Why is state of charge harder to estimate on an LFP pack than on an NMC pack, and what do you do about it?",
      a: "Coulomb counting integrates current but drifts with sensor offset and gain error, so it needs periodic correction from the open-circuit voltage after the pack rests. NMC's open-circuit voltage changes steadily with state of charge, but LFP sits on a plateau near 3.3 V across most of its range, so a few millivolts of error can mean many percent of state of charge. LFP systems therefore lean on the steep ends of the curve: a regular charge to 100 % recalibrates the estimate, which is why some makers recommend frequent full charges for LFP. Model-based estimators such as Kalman filters, with temperature and hysteresis models, carry the estimate in between.",
      level: "deep",
    },
    {
      q: "What is the difference between passive and active balancing, and which do EV packs use?",
      a: "Passive balancing switches a resistor across the highest groups and burns their excess charge as heat until they match the lowest, typically at tens to a couple of hundred milliamps. It is cheap and simple but only removes charge, so it cannot recover capacity from a weak group. Active balancing moves charge from high groups to low ones with inductors, capacitors or small DC-DC converters, which saves energy but costs parts, board area and complexity. Most EV packs use passive balancing because well-matched cells only need small, occasional corrections.",
      level: "screen",
    },
    {
      q: "How do you keep one cell's thermal runaway from destroying the whole pack?",
      a: "Start at the cell: a vent and current-interrupt device in the cap, and per-cell fusing such as the thin wire bonds Tesla uses, which open if one cell shorts. Then slow heat transfer between cells with spacing, mica or aerogel barriers and coolant, and give hot gas a defined vent path out of the pack and away from the cabin. The BMS watches for early signs such as a sudden voltage drop or temperature rise, opens the contactors and warns the occupants. Chemistry is the last lever: LFP releases far less oxygen and heat than NCA or NMC, which is one reason it is chosen for standard-range and stationary packs.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "A pack is wired 96s46p from 4.8 Ah, 3.6 V nominal cells. What is its nominal energy?",
      choices: ["17.3 kWh", "33.2 kWh", "76.3 kWh", "152.6 kWh"],
      answer: 2,
      explain:
        "Voltage is 96 × 3.6 = 345.6 V and capacity is 46 × 4.8 = 220.8 Ah, so energy is 345.6 × 220.8 ≈ 76,300 Wh. 17.3 is one cell's energy in watt-hours, and 152.6 kWh would need twice as many cells.",
    },
    {
      q: "Charging a 75 kWh pack at 150 kW is a C-rate of about",
      choices: ["1C", "2C", "3C", "4C"],
      answer: 1,
      explain: "C-rate is power (or current) relative to capacity: 150 kW ÷ 75 kWh = 2C, which would fill the pack in about half an hour if the charger could hold it.",
    },
    {
      q: "Why does DC fast charging slow down above roughly 80 % state of charge?",
      choices: [
        "The charging cable warms up over the session, so the charger cuts power to protect it",
        "The charger switches from DC to AC output once the pack is nearly full",
        "The pack's capacity grows as it fills, so each percent needs more energy",
        "Cells near their voltage ceiling and plating risk rises, so the BMS cuts current",
      ],
      answer: 3,
      explain:
        "Near full, cell terminal voltage reaches about 4.2 V and charging becomes constant voltage with decaying current; before that the BMS already trims current as the anode fills, to avoid plating metallic lithium. Cable heating can derate a session on a hot day, but it is not why every car tapers near full.",
    },
    {
      q: "What does passive balancing do?",
      choices: [
        "Bleeds charge from the highest groups through resistors until they match the lowest",
        "Moves charge from the strongest group to the weakest one through a small DC-DC converter",
        "Charges every group to exactly 4.2 V so that all of them finish at the same time",
        "Disconnects the weakest group from the pack until it recovers its lost charge",
      ],
      answer: 0,
      explain:
        "Passive balancing is a switched resistor per group that burns charge from the high groups as heat; moving charge between groups is active balancing. It cannot add charge to a weak group, which is why a leaking group keeps the balancer busy every night.",
    },
    {
      q: "Compared with NMC, an LFP cell has",
      choices: [
        "Higher nominal voltage and higher energy density, at a higher cost",
        "The same nominal voltage, and it can run without a BMS",
        "Lower voltage (about 3.2 V) and energy density, but longer life and more stability",
        "A steeper voltage-versus-charge curve, which makes state of charge easier to estimate",
      ],
      answer: 2,
      explain:
        "LFP runs about 3.2 V nominal and stores less energy per kilogram than nickel-rich cells (about 250 Wh/kg), but it lasts more cycles, holds its oxygen far better in abuse and uses no nickel or cobalt. Its flat voltage curve makes state of charge harder, not easier, to estimate.",
    },
    {
      q: "Why does the BMS close a precharge relay through a resistor before the main contactor?",
      choices: [
        "To warm the cells gently before the car is driven on a cold morning",
        "To charge the inverter's DC-link capacitors so the main contacts do not weld",
        "To measure the pack's internal resistance and update the state-of-health estimate",
        "To balance the series groups before high current flows through the pack",
      ],
      answer: 1,
      explain:
        "Discharged DC-link capacitors look like a short circuit at the instant of connection. Charging them through a resistor until they nearly match the pack voltage keeps the inrush small, so the main contactor then closes with almost no arc.",
    },
    {
      q: "How does a BMS correct the drift in coulomb counting?",
      choices: [
        "It reads open-circuit voltage after a rest and maps it to state of charge",
        "It counts the charge cycles completed and subtracts a fixed loss for each one",
        "It cannot; the error keeps accumulating for the whole life of the pack",
        "It compares the pack's temperature with the coolant temperature to infer charge",
      ],
      answer: 0,
      explain:
        "Integrated current drifts with sensor offset and gain error. After a rest the terminal voltage settles to the open-circuit voltage, which maps to state of charge through a lookup curve, so the BMS resets its count; Kalman filters blend the two continuously.",
    },
  ],
};

export default data;
