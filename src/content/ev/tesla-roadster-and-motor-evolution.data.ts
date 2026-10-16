import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Induction motor",
      def: "AC motor whose rotor currents are induced by the stator's rotating field through slip. It has no magnets; Tesla used it in the Roadster, the Model S and the Model 3/Y front axle.",
    },
    {
      term: "Slip",
      def: "The small difference, typically a few percent, between the speed of the stator field and the rotor in an induction motor. Without slip no rotor current is induced and there is no torque.",
    },
    {
      term: "IPM-SynRM",
      def: "Interior permanent magnet synchronous reluctance motor: magnets buried in the rotor plus flux barriers, so torque comes from both the magnets and reluctance. Used as the Model 3/Y rear motor.",
    },
    {
      term: "Reluctance torque",
      def: "Torque produced because a magnetically uneven rotor tries to align its easy flux path with the stator field.",
    },
    {
      term: "Back-EMF",
      def: "The voltage a spinning motor generates, proportional to speed and field strength. When it approaches what the inverter can produce from the DC bus, the field must be weakened.",
    },
    {
      term: "Field weakening",
      def: "Driving current that opposes the rotor field so the motor can run above base speed; torque falls roughly as 1/speed while power stays roughly constant.",
    },
    {
      term: "Carbon-fiber sleeve",
      def: "A composite band wound around a high-speed permanent-magnet rotor to hold magnets and laminations against hoop stress, as on the Model S Plaid's motors at about 20,000 rpm.",
    },
    {
      term: "Hairpin winding",
      def: "A stator winding made of rectangular copper bars that are inserted and welded, filling around 70 % of the slot versus roughly 40-50 % for round wire.",
    },
    {
      term: "Axial-flux motor",
      def: "A motor whose flux runs parallel to the shaft between disc-shaped rotors and stators, making it short and torque-dense; YASA is the best-known maker.",
    },
    {
      term: "Specific power",
      def: "Power per unit mass in kW/kg. It rises with rotor speed, better cooling and stronger magnetic loading.",
    },
  ],
  scenario: {
    title: "Design review: the front motor that cost 4 % of highway range",
    context:
      "An EV startup is reviewing its dual-motor crossover before design freeze. To share parts, the team fitted the same 150 kW interior permanent magnet motor to both axles. The rear motor drives the car while cruising; the front motor is commanded to zero torque and only joins in for hard acceleration, low grip or towing. Prototype range at a steady 70 mph comes in 4 % below target, and the drive-unit team has to explain why.",
    symptoms: [
      "Coast-down tests show about 600 W more drag at 70 mph than the rear-drive prototype, and the gap grows faster than linearly with speed.",
      "The front inverter draws current at high speed even when the front torque command is zero.",
      "The front stator warms up on long highway runs although the motor produces no torque.",
      "City-speed range is within 1 % of target; almost all of the shortfall is at highway speed.",
    ],
    hints: [
      "A spinning permanent magnet is a rotating field whether or not the inverter is switching. What does a moving field do to the stator steel?",
      "With a 9:1 reduction and a 0.35 m tire, 70 mph turns the front motor at about 7,700 rpm. How does its back-EMF compare with the battery voltage at high speed?",
      "What would an unpowered induction rotor do in the same place?",
    ],
    rootCause:
      "The front rotor's magnets keep sweeping flux through the stator steel at every speed, so hysteresis and eddy-current losses act as a constant drag, about 600 W at 70 mph on this design, and eddy loss grows with the square of frequency. Near the top of the speed range, where the motor's back-EMF approaches the DC bus voltage, the inverter must also inject field-weakening current to stop the motor generating uncontrolled current into the battery, which costs copper and switching losses even at zero torque. On a car that needs roughly 15-18 kW to cruise at 70 mph, 600 W of parasitic load is about 4 % of highway range.",
    fix: "Fit an induction motor (or an electrically excited synchronous motor) to the front axle. With its inverter off it has no rotor field, so it freewheels with only bearing and windage drag and cannot back-feed the battery after a fault. Keep the permanent-magnet motor at the rear, where it works nearly all the time and its efficiency pays off. If parts sharing must win, add a disconnect clutch to decouple the front motor while cruising, and price in the clutch's mass, cost and engagement time.",
    lesson:
      "Choose a motor for its duty cycle. A permanent-magnet machine is the efficient choice for the motor that is always working, but its magnets never switch off, so a part-time motor is often better as induction; that is the logic behind Tesla's dual-motor Model 3 and Model Y pairing a magnet rear motor with an induction front motor.",
  },
  interview: [
    {
      q: "Why did the 2008 Roadster and the first Model S use induction motors?",
      a: "An induction motor has no magnets: the rotor is laminated steel with conducting bars shorted by end rings, and the stator field induces the rotor current through slip. That avoided rare-earth cost and supply risk and any demagnetization limit, and the rotor is very robust at high speed. With the inverter off there is no rotor field, so a fault at speed cannot generate uncontrolled voltage and the motor freewheels with little drag. Tesla made it efficient enough with copper rotor bars, liquid cooling and careful inverter control.",
      level: "screen",
    },
    {
      q: "What is an IPM-SynRM, and why did Tesla use one for the Model 3's rear motor?",
      a: "It is an interior permanent magnet motor whose rotor also has flux barriers, so it makes magnet torque plus reluctance torque from the steel trying to align with the stator field. The magnets supply the rotor field without any magnetizing current, so efficiency is high at light load, which is where a car spends most of its highway driving. The reluctance contribution lets designers use less magnet and gives a wide field-weakening range for power at high speed. The costs are magnet supply risk, a demagnetization limit at high temperature, and drag from the magnets when the motor spins unpowered.",
      level: "screen",
    },
    {
      q: "Why does the Model S Plaid's rotor need a carbon-fiber sleeve, and how does that raise power?",
      a: "Power is torque times speed, and torque is set by rotor size and current, so spinning faster is the cheapest way to get more power from the same size of machine. Centrifugal hoop stress grows with the square of speed; at about 20,000 rpm the surface of a rotor 140 mm across moves at roughly 147 m/s, enough to tear magnets and thin steel bridges loose. A carbon-fiber sleeve wound under tension pre-loads the rotor so it stays together, and because it is non-magnetic and far less conductive than metal it adds little eddy-current loss. The trade-offs are heat, since the sleeve insulates the rotor while the magnets must stay below their demagnetization temperature, and a slightly larger magnetic gap.",
      level: "deep",
    },
    {
      q: "How would you sanity-check the second-generation Roadster's announced numbers?",
      a: "First label them correctly: they are claims from the November 2017 announcement, the car was promised for 2020 and has been delayed repeatedly, so I would check Tesla's site for its current status before quoting them. Then test them with physics. 0-60 mph in 1.9 s means reaching 26.8 m/s in 1.9 s, an average of about 14 m/s² or 1.44 g, at or beyond the grip limit of road tires. A 200 kWh pack at 160-200 Wh/kg would weigh 1,000-1,250 kg, and 620 miles from 200 kWh implies about 320 Wh per mile, plausible for a fast, heavy car. So the range claim is physically consistent, while the acceleration claim depends on tires, the launch surface and the proposed thrusters.",
      level: "deep",
    },
    {
      q: "What is field weakening, and why does it give a motor a constant-power region?",
      a: "A motor's back-EMF rises with speed, and once it reaches what the inverter can produce from the DC bus, no more current can be pushed in to make torque. The controller then drives current that opposes the rotor field: negative d-axis current in a permanent-magnet machine, or less magnetizing current in an induction machine, which keeps the back-EMF within the bus voltage. Torque then falls roughly as 1/speed, so power stays roughly constant until losses, current limits or breakdown torque take over. That wide constant-power band is why a single fixed gear can cover a car's whole speed range.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "What kind of motor drove the 2008 Tesla Roadster?",
      choices: ["Brushed DC motor", "Axial-flux permanent magnet motor", "Switched reluctance motor", "Three-phase AC induction motor"],
      answer: 3,
      explain:
        "The Roadster used a three-phase AC induction motor of about 185 kW. Tesla kept induction for the Model S and only adopted a permanent-magnet rear motor with the Model 3 in 2017.",
    },
    {
      q: "The 2008 Roadster's 53 kWh pack was built from",
      choices: [
        "6,831 cylindrical 18650 cells",
        "96 large prismatic cells in one module",
        "4,416 cylindrical cells of the 2170 format",
        "16 pouch-cell modules of LFP chemistry",
      ],
      answer: 0,
      explain:
        "It used 6,831 18650 cells, the laptop-battery format. The 2170 arrived with the Model 3, whose Long Range pack holds 4,416 of them, and the 4680 came later still.",
    },
    {
      q: "Why are the Model S Plaid's permanent-magnet rotors wrapped in a carbon-fiber sleeve?",
      choices: [
        "To insulate the stator windings electrically from the spinning rotor",
        "To store extra energy like a flywheel for hard launches",
        "To hold the rotor together against hoop stress at about 20,000 rpm",
        "To damp vibration and make the motor quieter at low speed",
      ],
      answer: 2,
      explain:
        "Hoop stress grows with the square of speed. The sleeve pre-loads the magnets and laminations so they survive about 20,000 rpm, and since power is torque times speed, a faster rotor makes more power from the same size of machine.",
    },
    {
      q: "Which statement about the second-generation Roadster's 0-60 mph time of 1.9 s is accurate?",
      choices: [
        "It is a measured result from cars delivered to customers",
        "It is a November 2017 claim, and the car has been delayed repeatedly",
        "It was certified by the EPA during the car's range testing",
        "It is the 0-60 time of the original 2008 Roadster in its Sport version",
      ],
      answer: 1,
      explain:
        "1.9 s, 200 kWh, 620 miles and more than 250 mph were all announced claims in November 2017. The car was promised for 2020 and has slipped repeatedly, so check Tesla's site for its status rather than treating the numbers as specifications.",
    },
    {
      q: "Why is an induction motor a good choice for a part-time front motor?",
      choices: [
        "It has the highest peak efficiency of any traction motor type",
        "It can run straight from the battery's DC without needing an inverter",
        "Its rare-earth magnets give it more torque at low speed",
        "With no rotor field when unpowered, it freewheels with little drag",
      ],
      answer: 3,
      explain:
        "An induction rotor's field exists only while the stator drives current, so an idle front motor costs almost nothing. A permanent-magnet rotor keeps sweeping flux through the stator steel, causing iron losses whenever the car moves; and an induction motor has no magnets at all and still needs an inverter.",
    },
    {
      q: "What does a hairpin stator winding improve?",
      choices: [
        "Slot fill and heat transfer, so copper loss falls",
        "The magnets' temperature limit and resistance to demagnetization",
        "The motor's top speed, by cutting rotor mass",
        "The battery's energy density, by lowering pack mass",
      ],
      answer: 0,
      explain:
        "Rectangular hairpin conductors fill around 70 % of the slot versus roughly 40-50 % for round wire, which lowers resistance and conducts heat into the stator better, so continuous power rises. The price is higher AC loss from skin and proximity effects at high frequency.",
    },
    {
      q: "The Model 3's traction inverter switches with",
      choices: ["Gallium nitride (GaN) transistors", "Silicon carbide (SiC) MOSFETs", "Silicon IGBTs, like the Model S", "Mechanical relays at low frequency"],
      answer: 1,
      explain:
        "Silicon carbide MOSFETs switch faster and lose less at partial load than the silicon IGBTs of earlier inverters, cutting losses where a car spends most of its time and adding range from the same pack.",
    },
  ],
};

export default data;
