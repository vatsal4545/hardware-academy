import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "HV contactor",
      def: "A sealed relay rated for hundreds of volts DC that connects the pack to the HV bus. Packs use one per pole (main positive and main negative), so one welded contact cannot leave the bus live.",
    },
    {
      term: "Precharge circuit",
      def: "A contactor in series with a resistor that charges the inverter's DC-link capacitors to about 95% of pack voltage before the main contactor closes, so the main contacts never see a multi-kA inrush.",
    },
    {
      term: "DC link",
      def: "The HV bus inside the inverter, stiffened by a film capacitor bank of a few hundred µF to about 1 mF that supplies the switching ripple current.",
    },
    {
      term: "Single-speed reducer",
      def: "A fixed gear train of about 9:1 (9.04:1 in the Model 3 rear unit) between the motor and the differential. It trades motor speed for wheel torque with no clutch and no shifts.",
    },
    {
      term: "DC-DC converter",
      def: "An isolated converter of roughly 2-3.5 kW that steps the HV bus down to the 12 V (or 48 V) low-voltage network. It does the job of an engine's alternator.",
    },
    {
      term: "On-board charger (OBC)",
      def: "The car's own AC-to-DC charger, typically 7-11 kW, used on AC outlets and wallboxes. DC fast charging bypasses it through separate DC charge contactors.",
    },
    {
      term: "Regenerative braking",
      def: "Running the motor as a generator so the inverter pushes current back into the pack. Its strength is capped by the BMS charge-power limit, by motor and inverter limits, and by stability on the driven axle.",
    },
    {
      term: "Charge power limit",
      def: "The maximum power the BMS allows into the pack at the present cell temperature and state of charge. It falls to a few kW when cells are cold or full, which is what limits regen.",
    },
    {
      term: "Integrated drive unit",
      def: "Motor, inverter and reducer in one housing (a 3-in-1 e-axle). Short busbars replace three-phase cables, and one oil and coolant circuit serves all three.",
    },
  ],
  scenario: {
    title: "Regen vanishes on a −15 °C morning",
    context:
      "A parcel fleet in Minneapolis runs 40 single-motor vans with 75 kWh, 400 V packs. They sleep outdoors at −15 °C and are charged to 100% overnight. On cold mornings drivers say one-pedal driving does almost nothing for the first 20-30 minutes, and they have to brake hard at the first stop sign. Two drivers have filed brake-fault tickets. By the afternoon the same vans regenerate normally.",
    symptoms: [
      "The power meter shows regen capped at about 5 kW instead of the usual 60-80 kW, with a 'regenerative braking limited' message.",
      "Full regen returns gradually over 20-40 minutes of driving, or right away if the van was preconditioned while still plugged in.",
      "A van that leaves the depot at 100% state of charge shows the same cap on a warm September day.",
      "Motor and inverter diagnostics are clean, and drive torque on the same cold morning is only mildly reduced.",
    ],
    hints: [
      "Regen is just current flowing into the battery. Which controller decides how much current the pack may accept right now?",
      "What happens at a graphite anode when you push lithium into it fast at −15 °C?",
      "Why would a full battery behave like a cold one?",
    ],
    rootCause:
      "Nothing is wrong with the motor or the inverter. Regen is charging, and the BMS publishes a charge-power limit that depends on cell temperature and state of charge. At −15 °C lithium ions diffuse into graphite so slowly that high charge current plates metallic lithium on the anode, which permanently costs capacity and can grow dendrites. The BMS therefore cuts the charge limit to a few kW, the vehicle controller clamps regen torque to that limit, and lifting off the pedal gives almost no deceleration. A 100% pack hits the same wall for a different reason: the cells are already at maximum voltage, so there is no headroom to accept charge.",
    fix:
      "Precondition: schedule departure times so the depot power, not the pack, warms the cells to about 15-20 °C before the van leaves (heat pump, PTC heater, or inverter 'stall heating' that runs deliberately inefficient motor currents). Stop overnight charging at 90% so the first descent has regen headroom. In software, blend the friction brakes automatically so pedal-release deceleration stays constant when regen is limited, and show the limit clearly on the display so drivers are not surprised.",
    lesson:
      "Regen is limited by what the battery can accept, not by what the motor can generate. The BMS charge limit gates the whole regen path, so friction brakes must be sized and blended to take over at any moment.",
  },
  interview: [
    {
      q: "Walk me through the high-voltage path of an EV from the pack to the wheels.",
      a: "The cells connect through a main fuse, often a pyrotechnic fuse the airbag controller can fire, and two main contactors to the HV bus. A precharge contactor and resistor first charge the inverter's DC-link capacitors so the main contactor closes without an inrush. The inverter turns the DC bus into three-phase AC with six switches and, by controlling motor current, controls torque. The motor drives a single-speed reducer of about 9:1, then the differential and half-shafts. The DC-DC converter, on-board charger, DC fast-charge contactors and the electric compressor and heaters hang off the same bus, and the vehicle controller turns pedal position into a torque request within the limits the BMS and inverter publish.",
      level: "screen",
    },
    {
      q: "Why do almost all EVs use a single-speed reducer instead of a gearbox?",
      a: "An electric motor makes full torque from zero speed and stays efficient up to 16,000-20,000 rpm, so it does not need gears to stay in a narrow power band the way an engine does. One ratio of about 9:1 gives strong launch torque and still reaches top speed within the motor's speed limit. Dropping the gearbox removes a clutch, shift actuators, mass and losses, and a fixed gear stage runs at about 97-98% efficiency. Two-speed units exist, such as the rear unit of the Porsche Taycan, but they target top speed and launch, not everyday efficiency.",
      level: "screen",
    },
    {
      q: "Compare 400 V and 800 V architectures. What do you gain and what does it cost?",
      a: "For the same power, doubling the voltage halves the current: 150 kW is 375 A at 400 V but 187.5 A at 800 V, so I²R loss in cables, connectors and contactors falls by a factor of four, or you can halve the copper for the same loss. The headline benefit is charging, because DC chargers and cables top out around 500 A, which caps a 400 V car near 200 kW while an 800 V car can use a full 350 kW unit. The cost is that every HV part must handle peaks near 1,000 V: inverter switches move from 650 V to 1,200 V devices, which is efficient mainly with SiC MOSFETs, and connectors, insulation and creepage distances grow. You also need a way to charge at older 400 V stations, either a separate DC-DC booster or reusing the motor and inverter as a boost converter, as Hyundai's E-GMP platform does. So 800 V pays off in large, fast-charging, high-power cars, while 400 V stays cheaper for compact ones.",
      level: "deep",
    },
    {
      q: "What limits regenerative braking, and how is it blended with friction brakes?",
      a: "The battery comes first: the BMS charge-power limit collapses when cells are cold, because of lithium plating risk, and when they are nearly full, because there is no voltage headroom. Then come motor and inverter current limits, the fade of regen at very low speed where back-EMF vanishes, and stability, since regen only acts on the driven axle and too much on a rear-drive car on ice can lock the rear wheels. The brake controller asks how much regen torque is available right now, uses it first, and fills the rest of the driver's demand with hydraulic pressure, which is why EVs use brake-by-wire or a decoupled pedal. A good blend keeps total deceleration constant even when available regen changes in the middle of a stop.",
      level: "deep",
    },
    {
      q: "Why does an EV need a precharge circuit?",
      a: "The inverter's DC-link capacitor bank, a few hundred microfarads to about a millifarad, looks like a short circuit when it is empty. Closing the main contactor straight onto a 400 V pack would drive an inrush of thousands of amps limited only by milliohms, which welds contacts and stresses the capacitors. Instead the BMS closes the negative contactor and a precharge contactor in series with a resistor, waits a few hundred milliseconds until the bus reaches about 95% of pack voltage, then closes the main positive contactor and opens the precharge path. If the bus voltage does not rise on schedule, that also flags a short or leak on the HV bus before full power is applied.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "A drive pulls 150 kW from a 400 V bus. About how much DC current flows in the HV cables?",
      choices: ["37.5 A", "187.5 A", "375 A", "600 A"],
      answer: 2,
      explain: "I = P / V = 150,000 W / 400 V = 375 A. At 800 V the same power needs only 187.5 A, which is the core argument for 800 V systems.",
    },
    {
      q: "You move from 400 V to 800 V at the same power and keep the same cable. The cable's I²R loss",
      choices: ["Falls to one quarter", "Halves", "Falls to one eighth", "Stays the same, because power is unchanged"],
      answer: 0,
      explain: "Current halves and conduction loss scales with current squared: (1/2)² = 1/4. Equivalently, you could keep the loss constant and use half the copper cross-section.",
    },
    {
      q: "Why does the BMS close a precharge contactor and resistor before the main positive contactor?",
      choices: [
        "To warm the cells before driving",
        "To test the 12 V battery",
        "To synchronize the motor with the inverter",
        "To limit the inrush current into the empty DC-link capacitors",
      ],
      answer: 3,
      explain: "An empty capacitor bank looks like a short. The resistor charges it to about 95% of pack voltage in a few hundred milliseconds, so the main contactor closes with almost no voltage across it and does not weld.",
    },
    {
      q: "On a −15 °C morning regen is capped at a few kW. Which block is setting that limit?",
      choices: [
        "The motor, because cold magnets are weaker",
        "The inverter, because cold switches are slower",
        "The BMS charge-power limit, to avoid lithium plating",
        "The reducer, because the oil is viscous",
      ],
      answer: 2,
      explain: "Regen is battery charging. At low temperature lithium cannot enter the graphite anode fast enough, so high charge current plates metallic lithium. The BMS lowers its charge limit and the vehicle controller clamps regen torque to it. (NdFeB magnets are actually slightly stronger when cold.)",
    },
    {
      q: "Which component replaces the alternator of a combustion car?",
      choices: ["The DC-DC converter", "The on-board charger", "The precharge resistor", "The traction inverter"],
      answer: 0,
      explain: "The DC-DC converter steps the HV bus down to the 12 V or 48 V network that runs ECUs, lights, pumps and contactor coils, and keeps the low-voltage battery charged. It is typically 2-3.5 kW.",
    },
    {
      q: "Why do 800 V cars use 1,200 V-rated inverter switches?",
      choices: [
        "Because 800 V is an RMS value and its peak is 1,131 V",
        "Because SiC MOSFETs are only made in 1,200 V ratings",
        "Because the motor's back-EMF is always 1,200 V",
        "Because a full pack reaches about 850-900 V and switching overshoot adds more, so 650 V or 900 V parts lack margin",
      ],
      answer: 3,
      explain: "The bus is DC, so 800 V is not an RMS value. A nominal 800 V pack reaches roughly 850-900 V when full, fast switching adds L·di/dt overshoot, and designers keep devices below about 70-80% of rating. The next standard class is 1,200 V, and 1,200 V SiC keeps switching losses low.",
    },
    {
      q: "Pack 98%, inverter 98%, motor 95% and reducer 97.5% efficient. About what fraction of the pack's energy reaches the wheels?",
      choices: ["97%", "89%", "75%", "35%"],
      answer: 1,
      explain: "Efficiencies in a chain multiply: 0.98 × 0.98 × 0.95 × 0.975 ≈ 0.89. The motor is the largest single loss, which is why motor efficiency maps get so much attention.",
    },
  ],
};

export default data;
