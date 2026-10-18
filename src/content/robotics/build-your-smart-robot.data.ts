import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "TB6612FNG",
      def: "Toshiba dual MOSFET H-bridge: 1.2 A continuous (3.2 A peak) per channel, 4.5-13.5 V motor supply, 2.7-5.5 V logic. Far less voltage drop than the old L298N.",
    },
    {
      term: "Buck converter",
      def: "A switching regulator that steps a voltage down efficiently (85-95%). Here it turns the 6.0-8.4 V pack into the 5 V logic rail.",
    },
    {
      term: "Brownout",
      def: "A supply dip below the level a chip needs. The ESP32's brownout detector resets the chip, and esp_reset_reason() reports ESP_RST_BROWNOUT after reboot.",
    },
    {
      term: "Common ground",
      def: "The shared 0 V reference for every module. Logic levels mean nothing without it; motor return current should still take its own path back to the pack.",
    },
    {
      term: "Voltage divider level shift",
      def: "Two resistors that scale a signal: 1 kΩ in series and 2 kΩ to ground turn the HC-SR04's 5 V echo into 3.33 V for a 3.3 V ESP32 input.",
    },
    {
      term: "Quadrature encoder",
      def: "Two pulse trains 90° apart (A and B). Counting edges of A gives distance; the state of B at each edge gives direction.",
    },
    {
      term: "Bulk capacitor",
      def: "A large electrolytic (here 470 µF at the driver, 220 µF on 5 V) that supplies short current spikes so the rail does not sag.",
    },
    {
      term: "2S Li-ion pack",
      def: "Two cells in series: 8.4 V full, 7.4 V nominal, 6.0 V empty. Needs a balance charger and an over-discharge cutoff.",
    },
    {
      term: "LEDC",
      def: "The ESP32's PWM peripheral: up to 16 channels, configurable frequency and resolution. Used here at 20 kHz, 10-bit for motors and 50 Hz, 14-bit for the servo.",
    },
  ],
  scenario: {
    title: "Works on USB, resets on battery",
    context:
      "A student finishes the course robot. On the bench, with the ESP32 powered from the laptop's USB port and the pack switched on for the motors, it avoids boxes for half an hour while streaming telemetry over Wi-Fi. For the first real run they move the 5 V jumper so the buck powers the ESP32, unplug USB and put the robot on the floor. It drives for a second or two, stops, and starts its boot sequence again, over and over.",
    symptoms: [
      "After each reboot the firmware logs esp_reset_reason() = ESP_RST_BROWNOUT",
      "On USB power the same firmware runs for 30 minutes without a single reset",
      "A scope on the 5 V rail shows dips to about 3.9 V lasting 2 ms each time both motors start",
      "Resets get more frequent as the pack discharges and almost stop when Wi-Fi telemetry is turned off",
    ],
    hints: [
      "Add up the worst-case current on the 5 V rail at the instant the motors start: Wi-Fi burst, servo, sonar, line sensors.",
      "What happens to the pack voltage, and so to the buck's input, when two motors start through spring battery contacts and thin leads?",
      "On USB, which supply was powering the ESP32? Was it shared with anything that draws current spikes?",
    ],
    rootCause:
      "The tiny buck module, sold as '3 A max' but good for about 1 A in practice and fitted with only 22 µF of output capacitance, could not ride through the simultaneous peaks. Motor start-up pulled about 1.5 A from the pack through spring holders and thin leads (about 0.3 Ω in total), sagging the buck's input by roughly 0.5 V. At the same moment the servo swept (up to 0.65 A) and Wi-Fi transmitted (about 0.4 A peaks); the buck hit its current limit, the 5 V rail fell to 3.9 V, the 3.3 V LDO dropped out and the ESP32's brownout detector reset the chip. On USB the laptop supplied the ESP32 separately, which hid the problem.",
    fix:
      "Fit a 3 A synchronous buck, add 470 µF at the TB6612 VM pin and 220 µF on the 5 V rail next to the ESP32, and use short 22 AWG leads from a holder with solid contacts. In firmware, ramp motor PWM over 200 ms instead of stepping it, and never start a servo sweep while the motors accelerate. After the changes the 5 V rail dipped by less than 0.1 V and the robot ran a 40-minute session with no resets.",
    lesson:
      "Size the logic supply for the worst simultaneous peaks, not the average current, and test on the power source the robot will actually use. A brownout reset is a power-integrity bug, not a firmware bug.",
  },
  interview: [
    {
      q: "Why do you power the motors and the microcontroller from separate rails, and what must they still share?",
      a: "Motors draw large, fast current spikes at start-up and reversal, and their brushes inject noise, so a motor on the same regulated rail as the microcontroller can drag it below its brownout threshold. On this robot the motors run from the pack through the TB6612's VM pin, while a buck makes a clean 5 V rail and the ESP32's LDO makes 3.3 V. The rails must share ground, because every logic level is measured relative to it; without a common ground the driver's PWM input floats. I would also route the motor return current straight back to the pack so it does not flow through the ESP32's ground wire, and put bulk capacitors at the driver.",
      level: "screen",
    },
    {
      q: "The HC-SR04 is a 5 V part and the ESP32 is a 3.3 V part. How do you connect them?",
      a: "The trigger input works with 3.3 V because its threshold is below that, so TRIG goes straight to a GPIO. The echo output swings to 5 V and ESP32 pins are not 5 V tolerant, so I would put a divider in it: 1 kΩ in series and 2 kΩ to ground gives 5 × 2/3 = 3.33 V. Alternatives are a level-shifter chip or the HC-SR04P variant that runs at 3.3 V. I would also measure the echo with an interrupt rather than a blocking pulseIn, so a missing echo cannot stall the control loop for 38 ms.",
      level: "screen",
    },
    {
      q: "Why does this firmware cap the PWM duty at about 70%?",
      a: "The N20 motors are rated 6 V but the 2S pack is 8.4 V when full, and the average voltage a motor sees is roughly duty times supply. Capping duty at 6.0 V divided by the measured pack voltage, 71% on a full pack, keeps the motor at its rated voltage, which protects the brushes and the plastic gearbox and keeps top speed consistent as the pack drains. Because the cap is computed from the battery reading every tick, the robot behaves the same at 8.4 V and at 7.0 V. It is a cheap form of supply compensation that also makes the PID gains valid over the whole discharge.",
      level: "screen",
    },
    {
      q: "Walk me through bringing up a new robot board for the first time.",
      a: "I start unpowered: visual inspection, then continuity checks for shorts between each rail and ground. Next I set any adjustable regulator with nothing connected to its output, because many buck modules ship set to 12 V or more. First power comes from a bench supply with a current limit, around 300 mA, and I check every rail and the idle current against my estimate. Then I flash firmware with the motor driver held in standby and bring up one subsystem at a time: serial logs, motors with the wheels off the ground, encoders, each sensor against a known reference. Only after that do I enable closed-loop behaviors, at low speed, with a hand near the power switch, and I log everything so a failure can be replayed.",
      level: "deep",
    },
    {
      q: "How do you read two quadrature encoders on an ESP32 without missing counts?",
      a: "First estimate the rate: 1050 pulses per wheel turn at 100 rpm is 1750 Hz per channel, which an interrupt on the rising edge of channel A handles easily; the ISR reads channel B to get the direction. The ISR must be short and marked IRAM_ATTR, the counters volatile, and the main loop must read and clear them inside a critical section so it never sees a half-updated value. For higher rates, or to count all four edges, I would use the ESP32's PCNT pulse-counter peripheral, which counts in hardware with a glitch filter and no CPU load. And I would keep the encoder wires away from the motor leads, because PWM noise on an encoder line shows up as phantom counts.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "The HC-SR04 echo (5 V) goes through 1 kΩ in series with 2 kΩ to ground. What voltage reaches the ESP32 pin?",
      choices: ["1.67 V", "2.50 V", "3.33 V", "5.00 V"],
      answer: 2,
      explain:
        "The divider outputs 5 V × 2 kΩ / (1 kΩ + 2 kΩ) = 3.33 V, a valid high level that stays within the ESP32's 3.6 V absolute maximum.",
    },
    {
      q: "Why must the ESP32, the TB6612 and every sensor share a ground?",
      choices: [
        "To halve the total current drawn, since the return currents of the two rails cancel",
        "Logic levels are voltages measured against ground; without a shared reference the inputs float",
        "Because the pack has only one negative terminal, and there is nowhere else to connect them",
        "To cancel motor noise, because the brushes' sparks are shorted out by the common wire",
      ],
      answer: 1,
      explain:
        "A 3.3 V high only means something relative to the receiver's ground. Separate rails are fine, separate grounds are not: the PWM and direction inputs would float and the motors would twitch or do nothing.",
    },
    {
      q: "The motors are rated 6 V and the pack reads 8.4 V. What PWM duty cap keeps the average motor voltage at 6 V?",
      choices: ["50%", "60%", "71%", "100%"],
      answer: 2,
      explain:
        "Average voltage ≈ duty × supply, so duty = 6.0 / 8.4 ≈ 0.71. Computing the cap from the measured pack voltage each tick keeps behavior consistent as the pack drains toward 7 V.",
    },
    {
      q: "Which pins should the analog line sensors use on an ESP32 that also runs Wi-Fi?",
      choices: ["ADC1 pins (GPIO 32 to 39)", "ADC2 pins (GPIO 0, 2, 4, 12 to 15, 25 to 27)", "Any GPIO", "Only GPIO 0"],
      answer: 0,
      explain:
        "The Wi-Fi driver uses ADC2, so analogRead on ADC2 pins fails while Wi-Fi is on. GPIO 36 and 39 are ADC1 input-only pins, ideal for sensors.",
    },
    {
      q: "With 1050 pulses per wheel turn on channel A, how often does that channel pulse when the wheel turns at 100 rpm?",
      choices: ["175 Hz", "1750 Hz", "17.5 kHz", "105 kHz"],
      answer: 1,
      explain:
        "100 rpm is 1.667 rev/s, and 1.667 × 1050 = 1750 pulses per second. An interrupt per pulse costs a few microseconds each, well under 1% of one core.",
    },
    {
      q: "Why is the TB6612's STBY pin held low until setup() has configured the PWM pins?",
      choices: [
        "To save power while the ESP32 boots, since the driver's quiescent current is large",
        "So the H-bridges cannot drive the motors while the GPIOs are undefined during boot",
        "Because STBY selects the PWM frequency, and it must be set before the timers start",
        "To reset the encoders to zero before the first speed measurement",
      ],
      answer: 1,
      explain:
        "During reset and boot, GPIOs float or toggle (GPIO 14 even outputs PWM at boot). Holding STBY low with a pull-down keeps the outputs off until firmware has put every control pin in a known state.",
    },
    {
      q: "A Li-ion cell in the robot is hot and starting to swell. What do you do?",
      choices: [
        "Keep driving until the pack is empty, since a discharged cell cannot catch fire",
        "Disconnect it and move it to a non-flammable surface outdoors, away from people",
        "Put it in a freezer to cool it, then charge it slowly to reseat the electrolyte",
        "Puncture it to release the gas before the case splits on its own",
      ],
      answer: 1,
      explain:
        "Swelling means internal gas generation and a risk of thermal runaway. Remove the load or charger, isolate the cell on sand or concrete outdoors, and never puncture or reuse it.",
    },
  ],
};

export default data;
