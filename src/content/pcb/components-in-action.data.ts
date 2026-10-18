import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Ohm's law",
      def: "Voltage across a resistor equals current times resistance, V = I · R. On this board it is the 0.15 V lost across the 50 mΩ reverse-protection FET at 3 A, and the voltage R3 drops to set the LED current.",
    },
    {
      term: "Kirchhoff's current law (KCL)",
      def: "The currents into a node sum to the currents out, because charge cannot pile up at a point. At the VM node the pack current equals the two motor currents plus the regulator's input current.",
    },
    {
      term: "Kirchhoff's voltage law (KVL)",
      def: "Around any closed loop the voltage rises equal the voltage drops. Around the LED loop, 3.3 V from the pin equals the drop across R3 plus the LED's forward voltage.",
    },
    {
      term: "Power dissipation",
      def: "Electrical power turned into heat, P = V · I = I² · R. The AMS1117 dropping 5.1 V at 150 mA makes 0.77 W; at 60 °C/W that is a 46 °C rise of its junction.",
    },
    {
      term: "Voltage divider",
      def: "Two series resistors tapped in the middle: Vout = Vin · R2 / (R1 + R2). The battery monitor's 100 kΩ over 47 kΩ turns 8.4 V into 2.69 V for the 3.3 V ADC.",
    },
    {
      term: "Thevenin equivalent",
      def: "Any linear network seen from two terminals behaves like one source in series with one resistance. The divider looks like 2.69 V behind R1 ∥ R2 = 32 kΩ, which is why the ADC needs a capacitor at the pin.",
    },
    {
      term: "RC time constant (τ)",
      def: "τ = R · C is the time for a capacitor charging through a resistor to get 63% of the way. EN's 10 kΩ and 1 µF give 10 ms, and the 75% threshold arrives at 1.39 τ, about 14 ms.",
    },
    {
      term: "Decoupling and V = L · di/dt",
      def: "Every loop of trace is an inductor, about 1 nH per millimetre, and an inductor fights a change in current with V = L · di/dt. A 50 mA step in 2 ns through 10 nH dips the pin by 250 mV; a capacitor a millimetre away shrinks the loop to 1.5 nH.",
    },
    {
      term: "Right-hand grip rule",
      def: "Thumb along the current in a wire and the fingers curl along the magnetic field; fingers along the current in a coil and the thumb points along the field inside, to the north end. Reversing the H-bridge reverses the field.",
    },
    {
      term: "Flyback (inductive kick)",
      def: "When the current in a winding is interrupted, the inductor forces V = L · di/dt across whatever is in its way: 1 A stopped in 100 ns through 1 mH would be 10 kV. The MOSFETs' body diodes give the current a path, so the pin only goes 0.7 V beyond the rail.",
    },
    {
      term: "Reverse-polarity P-FET",
      def: "A P-channel MOSFET in the positive lead with its gate pulled to ground. The right way round it turns on and acts as a 50 mΩ resistor; backwards, its gate sees no voltage below its source and its body diode blocks.",
    },
    {
      term: "Bulk capacitor",
      def: "A large capacitor near a load that supplies its sudden demands so the rail does not sag: 100 µF on VM gives 1.5 A for 10 µs with only 0.15 V of droop, ΔV = I · Δt / C.",
    },
  ],
  scenario: {
    title: "Telemetry says the pack is at 7.0 V while the meter says 7.9 V",
    context:
      "Rev B of the motor-driver board carries the battery-monitor divider, 100 kΩ over 47 kΩ, straight into an ADC pin, and the firmware converts counts back to volts with the 147/47 ratio. On the bench a multimeter reads 7.90 V at the connector. The firmware reports 7.0 to 7.3 V, and the number jumps by 0.2 V between consecutive samples. Swapping the ESP32 module changes nothing. The 100 nF capacitor marked C9 on the drawing was left off the first build to save a part.",
    symptoms: [
      "The reported pack voltage is 8 to 12% low, and the error grows when the firmware samples the two line sensors just before it.",
      "Readings jump by about 0.2 V from sample to sample, far more than the resistors' 1% tolerance can explain.",
      "Probing the divider's midpoint with a 10 MΩ multimeter shows the expected 2.53 V, steady.",
      "Fitting a 100 nF capacitor from the ADC pin to ground makes the reading settle at 7.88 V.",
    ],
    hints: [
      "What does the ADC pin see when it looks back into the divider? Reduce the divider to its Thevenin equivalent.",
      "A successive-approximation ADC charges a small internal capacitor from the pin for a short window before it converts. How long does that take through 32 kΩ?",
      "Why would sampling another channel first make this reading worse?",
    ],
    rootCause:
      "Seen from the ADC pin, the divider is a 2.53 V source behind R1 ∥ R2 = 32 kΩ, three times the 10 kΩ rule for an ADC input. Each conversion connects the ADC's small sampling capacitor to the pin for a short window, and through 32 kΩ that capacitor does not reach the source voltage before the conversion starts, so the result reads low. The capacitor still holds charge from the channel converted just before, which is why the error depends on the line sensors and why consecutive samples disagree.",
    fix: "Fit C9, 100 nF from the ADC pin to ground. It holds about ten thousand times the sampling capacitor's charge, so the sample takes what it needs from C9 with a negligible droop, and the divider recharges C9 between samples with a time constant of 32 kΩ × 100 nF = 3.2 ms, far shorter than the 100 ms telemetry period. Lower-value resistors, 10 kΩ over 4.7 kΩ, would also work but would draw 0.57 mA from the pack all the time.",
    lesson:
      "A divider is a voltage source with the parallel resistance in series. If the thing it feeds needs charge quickly, give it a local capacitor or a stiffer divider.",
  },
  interview: [
    {
      q: "Walk me through what happens electrically when the robot's motor-driver board is switched on.",
      a: "The pack reaches J1 and Q1's gate is held at ground by R1, so the P-FET turns on and VM rises through its 50 mΩ channel. The bulk capacitors charge, the AMS1117 brings 3V3 up, and the driver stays idle because its STBY pin is pulled low. EN rises through R2 into C8 with a 10 ms time constant, so the ESP32 is released about 14 ms after the rail, once it is stable. The firmware then sets the pins, enables STBY, and the H-bridges start steering current into the windings. Every step is a law in action: Ohm at Q1, Kirchhoff at the VM node, RC on EN.",
      level: "screen",
    },
    {
      q: "Where would you apply Kirchhoff's current law on this board, and why does it matter for choosing parts?",
      a: "At the VM node, where the pack current splits into the two motor channels and the regulator. Whatever each branch draws, the sum comes through the connector, the fuse, Q1 and the first stretch of trace, so those parts are rated for the sum, not for one branch. Two stalled N20 motors are about 3 A together, which is why the JST XH pins, a 3 A fuse and a 1.5 mm trace were chosen. If I later add a branch, say a 5 V buck for a servo, the same node tells me the connector budget just shrank.",
      level: "screen",
    },
    {
      q: "Why does the status LED need a resistor, and how do you choose its value?",
      a: "An LED is a diode: above its forward voltage the current rises very steeply, so without a resistor the pin or the LED would set the current by accident. Kirchhoff's voltage law around the loop gives 3.3 V = I · R + Vf, so R = (3.3 − Vf) / I. For a red LED at 2.0 V and 1.3 mA that is 1 kΩ, and the resistor dissipates only 1.7 mW. A blue LED drops about 3.0 V, which leaves 0.3 V for the resistor and barely 0.3 mA through 1 kΩ, so it needs about 60 Ω for 5 mA or a higher supply. I also keep the current well under the 20 mA a GPIO pin can source.",
      level: "screen",
    },
    {
      q: "State the right-hand rule and give one place on a motor board where it matters.",
      a: "Point the thumb of your right hand along the current in a wire and your fingers curl the way the magnetic field circles it; for a coil, curl the fingers along the current and the thumb points along the field inside, toward the coil's north end. In the motor, the H-bridge sets which way the current flows through the winding, so reversing AIN1 and AIN2 reverses the field and the torque. The same rule explains why the motor traces radiate: the current loop from the driver to the connector and back makes a field proportional to its area, which is why the loop is kept short and over a ground plane.",
      level: "screen",
    },
    {
      q: "A linear regulator drops 8.4 V to 3.3 V at 150 mA. Do the thermal maths, and tell me at what current you would switch to a buck.",
      a: "The heat is (Vin − Vout) · I plus the ground current's share: 5.1 V × 0.15 A is 0.77 W, plus 8.4 V × 5 mA, about 0.81 W in total. At 60 °C/W for a SOT-223 on a modest pad that is a 48 °C rise, so about 73 °C in a 25 °C room, which is fine. The budget runs out near 400 mA, where 2.1 W puts the junction at the 150 °C shutdown line, and sooner in a warm enclosure. I would switch to a buck, or add one as a pre-regulator, once the sustained current passes about 250 mA, because the junction would then sit above 100 °C and Wi-Fi bursts would push it further. A buck at 90% efficiency wastes about a tenth of that power.",
      level: "deep",
    },
    {
      q: "The ADC reads a 100 kΩ over 47 kΩ battery divider and the result is low and noisy. Diagnose it with Thevenin and fix it.",
      a: "Seen from the pin, the divider is a source of Vpack × 47 / 147 behind R1 ∥ R2 = 32 kΩ. A successive-approximation ADC connects a small sampling capacitor to the pin for a short window, and through 32 kΩ that capacitor cannot reach the source voltage before the conversion starts, so the result reads low, and it depends on whatever the previous channel left on the capacitor, which is the noise. The fix is a 100 nF capacitor from the pin to ground: it holds thousands of times the sampling charge, so each sample takes a negligible bite, and the divider refills it with a 3.2 ms time constant between readings. Smaller resistors, 10 kΩ over 4.7 kΩ, would also work but would draw 0.57 mA from the pack all the time. I would also average a few samples in firmware and check the ESP32's attenuation setting.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Both motors stall at 1.5 A each while the logic draws 150 mA through the regulator. What current does the battery connector carry?",
      choices: ["1.50 A", "3.00 A", "3.15 A", "3.30 A"],
      answer: 2,
      explain:
        "Kirchhoff's current law: the pack supplies every branch, so 1.5 + 1.5 + 0.15 A, plus the regulator's own 5 mA, is about 3.15 A. 3.00 A forgets the logic rail, 1.50 A counts one motor, and 3.30 A has no source.",
    },
    {
      q: "A red LED with a 2.0 V forward drop sits in series with 1 kΩ on the 3.3 V rail. You swap in a blue LED with a 3.0 V drop and keep the resistor. What happens to the current?",
      choices: [
        "It rises from 1.3 mA to 3.0 mA, because the higher forward voltage pulls more current",
        "It falls from 1.3 mA to 0.3 mA, because only 0.3 V is left across the resistor",
        "It stays at 1.3 mA, because the resistor, not the LED, sets the current",
        "It drops to zero, because a 3.0 V LED cannot turn on from a 3.3 V rail",
      ],
      answer: 1,
      explain:
        "Around the loop 3.3 V = I · R + Vf, so I = (3.3 − 3.0) / 1 kΩ = 0.3 mA, a quarter of the red LED's 1.3 mA and too dim to see in daylight. The LED does turn on, since 3.3 V exceeds its 3.0 V, but the resistor only sets the current together with the voltage left over for it.",
    },
    {
      q: "The reverse-polarity FET has 50 mΩ of on-resistance and carries 3 A. How much power does it dissipate?",
      choices: ["0.15 W", "0.45 W", "1.50 W", "4.50 W"],
      answer: 1,
      explain:
        "P = I² · R = 9 A² × 0.05 Ω = 0.45 W, or equally V · I with the 0.15 V drop: 0.15 V × 3 A. 0.15 W is the drop in volts mistaken for watts, and the larger figures multiply by the wrong power of the current.",
    },
    {
      q: "The battery divider is 100 kΩ over 47 kΩ. What resistance does the ADC pin see looking back into it, and what does the 10 kΩ rule say?",
      choices: [
        "147 kΩ, the two in series, so the divider is fine as it is",
        "47 kΩ, the bottom resistor, within the rule once the firmware averages",
        "32 kΩ, the two in parallel, above the rule, so add 100 nF at the pin",
        "68 kΩ, the difference, below the rule because the resistors are large",
      ],
      answer: 2,
      explain:
        "Thevenin: with the pack treated as a short, the pin sees R1 and R2 in parallel, 100 k × 47 k / 147 k = 32 kΩ, behind a source of Vpack × 47 / 147. That is three times the 10 kΩ an ADC input likes, so either use smaller resistors or put 100 nF at the pin to hand over each sample's charge.",
    },
    {
      q: "EN is pulled up through 10 kΩ with 1 µF to ground. About how long after 3V3 appears does EN reach 75% of the rail?",
      choices: ["1.4 ms", "10 ms", "50 ms", "14 ms"],
      answer: 3,
      explain:
        "τ = R · C = 10 kΩ × 1 µF = 10 ms, and reaching 75% takes τ · ln 4 = 1.39 τ, about 14 ms. 10 ms is τ itself (63%), 50 ms is 5τ (99%), and 1.4 ms is the answer for 100 nF.",
    },
    {
      q: "A decoupling capacitor sits 10 mm of thin trace away from the pin it serves, and the chip pulls a 50 mA step in 2 ns. Taking about 1 nH per millimetre, how far does the pin voltage dip?",
      choices: ["3 mV", "25 mV", "250 mV", "2.5 V"],
      answer: 2,
      explain:
        "V = L · di/dt: 10 nH × 0.05 A / 2 ns = 0.25 V, nearly 8% of a 3.3 V rail. 25 mV is the answer for 1 mm, which is the point of putting the capacitor at the pin; 2.5 V would need 100 nH.",
    },
    {
      q: "Current flows through a motor winding and makes a magnetic field. You reverse the H-bridge so the current flows the other way. By the right-hand rule, what happens to the field?",
      choices: [
        "Its direction flips and its strength stays the same",
        "It disappears, because a reversed current cancels its own field",
        "Its direction stays the same but it becomes weaker",
        "It rotates by a quarter turn, because the fingers point sideways",
      ],
      answer: 0,
      explain:
        "Curl the fingers of your right hand along the current and the thumb gives the field inside the coil; reverse the current and the thumb points the other way. The strength depends on the number of turns and the amount of current, which have not changed, so only the direction flips, and with it the torque.",
    },
    {
      q: "The AMS1117 makes 3.3 V from an 8.4 V pack while supplying 150 mA. Ignoring its own 5 mA, how much heat does it make, and how far does its junction rise at 60 °C/W?",
      choices: ["0.50 W and 30 °C", "0.77 W and 46 °C", "1.26 W and 76 °C", "2.52 W and 150 °C"],
      answer: 1,
      explain:
        "P = (Vin − Vout) · I = 5.1 V × 0.15 A = 0.765 W, and 0.765 W × 60 °C/W is a 46 °C rise, so about 71 °C in a 25 °C room. 1.26 W is the input power 8.4 V × 0.15 A, and 0.50 W is the output power; the heat is the difference.",
    },
  ],
};

export default data;
