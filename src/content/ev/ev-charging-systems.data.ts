import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "EVSE",
      def: "Electric vehicle supply equipment: the wall box or post that switches and protects AC power and signals the current limit over the control pilot. For AC charging it is not itself a charger.",
    },
    {
      term: "On-board charger (OBC)",
      def: "The AC-to-DC converter inside the car used for AC charging, commonly 7-11.5 kW. Its rating caps Level 2 charging speed.",
    },
    {
      term: "Control pilot",
      def: "The J1772 signal wire: a 1 kHz, ±12 V square wave whose duty cycle advertises the current limit and whose voltage level shows the car's state (9 V connected, 6 V ready).",
    },
    {
      term: "CCS (Combined Charging System)",
      def: "A connector that adds two DC pins below a J1772 (CCS1) or Type 2 (CCS2) AC inlet, with DIN SPEC 70121 or ISO 15118 carried as powerline communication.",
    },
    {
      term: "NACS / SAE J3400",
      def: "Tesla's compact connector, opened as the North American Charging Standard in 2022 and standardized by SAE as J3400; the same pins carry AC and DC.",
    },
    {
      term: "ISO 15118",
      def: "The car-to-charger communication standard, including Plug & Charge certificate authentication and, in ISO 15118-20, bidirectional power transfer.",
    },
    {
      term: "OCPP",
      def: "Open Charge Point Protocol: JSON messages over a WebSocket between a charger and its management backend (CSMS) for authorization, transactions, metering, status and smart charging.",
    },
    {
      term: "Power sharing (load management)",
      def: "Dividing a fixed site power among chargers in real time so the service is sized for the managed cap rather than the nameplate sum, as NEC 625.42 allows.",
    },
    {
      term: "Liquid-cooled cable",
      def: "A DC charging cable with coolant channels around its conductors, so 500 A or more fits in a cable thin and light enough to handle.",
    },
    {
      term: "V2G / V2H",
      def: "Vehicle-to-grid and vehicle-to-home: exporting power from the car's battery through a bidirectional charger, under utility interconnection rules.",
    },
  ],
  scenario: {
    title: "Afternoon sessions stuck at 50 kW",
    context:
      "A highway site in California's Central Valley has four 150 kW dispensers with liquid-cooled cables, sharing power cabinets under a load-management cap that is rarely reached. In July, drivers start complaining: morning sessions run at 130-150 kW, but between 1 pm and 6 pm the same cars charge at about 50 kW. The load manager shows plenty of headroom and the utility reports no voltage problems.",
    symptoms: [
      "Afternoon sessions on all four dispensers settle near 50 kW (about 125 A into a 400 V pack) within a few minutes of starting.",
      "An 800 V car on the same dispenser in the afternoon gets about 100 kW, which is the same 125 A, not the same power.",
      "OCPP MeterValues show the Temperature measurand at location Cable climbing to its configured limit just before each current drop; cabinet module temperatures stay normal.",
      "Afternoon ambient is 41-44 °C and the dispensers face west in full sun.",
    ],
    hints: [
      "What is constant across cars: power or current? Which parts of the power path are limited by current rather than power?",
      "Heat in a cable goes as I²R. In a liquid-cooled cable, what carries that heat away, and how well does it work at 44 °C?",
      "Open a dispenser and inspect the cable's coolant loop: coolant level, pump flow and the radiator that dumps the heat to the air.",
    ],
    rootCause:
      "The cables' coolant loops could not reject heat. Each dispenser cools its cable with a small pump and radiator; the radiators were matted with dust and cottonwood fluff and sat in direct afternoon sun, so at 41-44 °C ambient the coolant ran hot. The connector's pin temperature sensors reached their limit and the dispenser cut the current to about 125 A, roughly 50 kW into a 400 V pack. The cabinets and the grid had headroom; the bottleneck was I²R heating in the last few metres of copper.",
    fix: "Clean the radiators and filters, check coolant level and pump flow, and put the radiators on the monthly preventive-maintenance checklist, more often in pollen season. Add shade canopies or re-orient the dispensers so the radiators are out of the afternoon sun and have clear airflow. Alarm on OCPP derate events and cable-temperature readings so operations sees the trend before drivers do. For new sites, specify dispensers by their derating curve at the local design ambient (for example 50 °C), not only by nameplate power.",
    lesson:
      "Nameplate power is a cool-day number. On a hot day a charger delivers what its thermal path allows, and the cable and connector, carrying hundreds of amps, are often the first limit, so shade, airflow and maintenance access are part of the site's thermal design.",
  },
  interview: [
    {
      q: "What is the difference between AC and DC charging?",
      a: "Batteries charge on DC, so the question is where the conversion happens. With AC charging the wall box only switches and protects, and the car's on-board charger rectifies the AC, so power is limited to roughly 7-19 kW by what is practical to carry in the car. With DC fast charging the station rectifies and converts, delivering 50-350 kW straight to the battery through the car's DC contactors, while the car's BMS tells the charger how much current to supply. That is why DC chargers are large, expensive, liquid-cooled cabinets and AC chargers are relatively simple boxes.",
      level: "screen",
    },
    {
      q: "What do OCPP and ISO 15118 each do?",
      a: "They cover different links. ISO 15118, like the older DIN SPEC 70121, runs between the car and the charger as powerline communication on the pilot wire: limits, the current-demand loop, Plug & Charge certificates and, in ISO 15118-20, bidirectional power. OCPP runs between the charger and the operator's backend over a WebSocket: authorization, transaction start and stop, meter values for billing, status, firmware updates and smart-charging profiles that cap power. A good mental model is that ISO 15118 decides how this car charges, and OCPP lets an operator run and bill a whole fleet of chargers.",
      level: "screen",
    },
    {
      q: "Size the electrical service for eight 150 kW dispensers with 2:1 power sharing.",
      a: "Nameplate is 1.2 MW, but with 2:1 sharing the cabinets deliver at most 600 kW, so I size from the managed cap, which NEC 625.42 allows when an automatic load management system enforces it. At 95 % efficiency and 0.99 power factor that is about 638 kVA, plus about 15 kVA of lighting and controls, roughly 653 kVA, so a 750 kVA transformer. At 480 V that is about 785 A, and 125 % for a continuous load gives about 982 A, so a 1,000 A main. I would also ask about the utility's demand charges, leave conduit and pad space for growth, and lay out the accessible stalls and cable reach before the electrical design is frozen.",
      level: "deep",
    },
    {
      q: "Why does a DC fast charger derate on a hot day, and what would you do about it at the site level?",
      a: "Everything in the power path is thermally limited: the power modules' semiconductors, the magnetics, and especially the cable and connector, whose heating goes as current squared. A liquid-cooled cable dumps its heat through a small radiator, so high ambient, direct sun or a clogged radiator raises the coolant temperature until the connector's pin sensors force a lower current. You can spot a cable limit because cars with different pack voltages derate to the same current rather than the same power. At the site level I would add shade and clear airflow, put radiator cleaning on the maintenance plan, alarm on OCPP cable-temperature and derate events, and specify equipment by its derating curve at the local design ambient.",
      level: "deep",
    },
    {
      q: "How does a J1772 EVSE tell the car how much current it may draw?",
      a: "Through the control pilot, a 1 kHz, ±12 V square wave generated by the EVSE. The duty cycle sets the limit: between 10 % and 85 % duty, amps = duty × 0.6, so 50 % means 30 A, and 85-96 % covers 51-80 A. The car signals its state by loading the pilot with resistors, 9 V for connected and 6 V for ready, and the EVSE only closes its relay once it sees 6 V. A 5 % duty cycle is special: it means digital communication is required, which is how DC fast charging sessions begin.",
      level: "screen",
    },
    {
      q: "What is NACS (SAE J3400), and why did it spread so quickly?",
      a: "It is Tesla's connector, opened as the North American Charging Standard in November 2022 and standardized by SAE as J3400. It is small, carries AC and DC on the same pins, and came with the largest fast-charging network in North America, so automakers gained access to that network by adopting it. Most announced a switch for new models, with adapters bridging CCS1 cars in the meantime. For site designers it means planning for both connectors for years, often on the same dispenser.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "A Level 2 EVSE allows 32 A at 240 V. About how much power can the car draw?",
      choices: ["1.4 kW", "7.7 kW", "19.2 kW", "50 kW"],
      answer: 1,
      explain:
        "P = V × I = 240 V × 32 A = 7,680 W, about 7.7 kW. 1.4 kW is Level 1 (120 V × 12 A), and 19.2 kW is the Level 2 maximum at 80 A.",
    },
    {
      q: "During DC fast charging, where is AC converted to DC?",
      choices: ["In the car's on-board charger", "In the charging station's power modules", "In the battery cells", "In the utility transformer"],
      answer: 1,
      explain:
        "A DC fast charger rectifies grid AC and converts it to the DC voltage and current the car requests, delivering it straight to the battery and bypassing the on-board charger. The utility transformer only changes AC voltage.",
    },
    {
      q: "OCPP is the protocol between",
      choices: [
        "the car and the charger",
        "the charger and the operator's backend (CSMS)",
        "the battery cells and the BMS",
        "the utility meter and the transformer",
      ],
      answer: 1,
      explain:
        "OCPP carries authorization, transactions, meter values, status and charging profiles between a charger and its backend. The car-to-charger conversation is ISO 15118 or DIN SPEC 70121 over powerline communication.",
    },
    {
      q: "Plug & Charge, where the car authenticates itself with a certificate, is defined in",
      choices: ["OCPP 1.6", "ISO 15118", "The J1772 pilot duty cycle", "IEC 62196-2"],
      answer: 1,
      explain:
        "ISO 15118 defines Plug & Charge: the car stores a contract certificate and proves its identity inside the charging session, so no card or app is needed. OCPP can relay certificate data to the backend, but the mechanism belongs to ISO 15118.",
    },
    {
      q: "A J1772 pilot runs at 50 % duty cycle. What current may the car draw?",
      choices: ["12 A", "30 A", "50 A", "80 A"],
      answer: 1,
      explain: "Between 10 % and 85 % duty, amps = duty × 0.6, so 50 × 0.6 = 30 A. A 96 % duty cycle would mean the 80 A maximum.",
    },
    {
      q: "Eight 150 kW dispensers share power cabinets at a 2:1 ratio. Around what charging power should the service be sized?",
      choices: ["150 kW", "600 kW", "1,200 kW", "2,400 kW"],
      answer: 1,
      explain:
        "8 × 150 kW = 1,200 kW of nameplate, halved by 2:1 sharing to 600 kW of cabinet output. Add conversion losses and auxiliaries (about 653 kVA) and pick the next standard transformer, 750 kVA.",
    },
    {
      q: "On a 44 °C afternoon a 150 kW dispenser delivers about 50 kW, and an 800 V car on it draws the same current as a 400 V car. What is the most likely limit?",
      choices: ["The utility transformer", "The cable and connector thermal limit", "The car's on-board charger", "The OCPP backend"],
      answer: 1,
      explain:
        "A limit that holds current constant across pack voltages points to I²R heating in the cable and connector. Hot ambient, direct sun or a clogged coolant radiator push the pin temperature sensors to their limit, and the dispenser cuts current to protect them.",
    },
  ],
};

export default data;
