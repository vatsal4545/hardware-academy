import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Back-EMF",
      def: "The voltage a spinning motor generates, proportional to speed (E = Ke·ω). It opposes the supply, so current is highest at stall and falls as the motor speeds up.",
    },
    {
      term: "Stall current",
      def: "Current at zero speed, limited only by winding resistance: I = V/R. A 6 V motor with 4 Ω windings stalls at 1.5 A; reversing it at full speed briefly draws close to twice that.",
    },
    {
      term: "Kv and Kt",
      def: "Kv is speed per volt (rpm/V); Kt is torque per amp (N·m/A). In SI units Kt equals the back-EMF constant Ke, and Kt ≈ 9.55/Kv when Kv is in rpm/V.",
    },
    {
      term: "H-bridge",
      def: "Four switches around a motor. Closing a diagonal pair drives it forward or backward, closing both low-side switches shorts it to brake, and opening all four lets it coast.",
    },
    {
      term: "Shoot-through",
      def: "Both switches in one leg of a bridge conducting at once, shorting the supply to ground. It can destroy MOSFETs in microseconds; drivers use interlocks and dead time to prevent it.",
    },
    {
      term: "Dead time",
      def: "A short gap, typically 100 ns to a few microseconds, during which both switches of a leg are off, so one is fully off before the other turns on.",
    },
    {
      term: "Microstepping",
      def: "Driving a stepper's two coils with sine and cosine currents in small increments. At 1/16 a 200-step motor's 1.8° step becomes 0.1125°, smoother and quieter.",
    },
    {
      term: "Flyback (freewheeling) diode",
      def: "A diode that gives an inductor's current a path when a switch opens, clamping the L·di/dt spike. MOSFET bridges use their body diodes or added Schottky diodes.",
    },
    {
      term: "PWM",
      def: "Pulse-width modulation: switching the supply on and off at a fixed frequency, typically about 20 kHz for motors, so the average voltage is duty × supply. 60% of 7.4 V averages 4.4 V.",
    },
  ],
  scenario: {
    title: "ESP32 resets every time the robot reverses",
    context:
      "A robot's ESP32 and TB6612FNG share a 2S Li-ion pack: the driver's motor supply comes straight from the pack and the ESP32 runs from a small 5 V buck converter. The obstacle-avoidance code flips both motors from full forward to full reverse in one step when it sees a wall. About one reversal in three, the robot freezes for half a second and the serial monitor prints a reboot banner.",
    symptoms: [
      "The serial log shows 'Brownout detector was triggered' followed by the ESP32 boot banner, only right after a reversal command.",
      "Gentle speed changes never cause a reset, and the problem gets worse as the battery runs down.",
      "A scope on the 5 V rail shows a dip to about 3.3 V lasting roughly 2 ms at each reversal, plus ringing spikes on the motor supply.",
      "Unplugging one motor makes the resets rare.",
    ],
    hints: [
      "When a motor spinning forward is suddenly driven in reverse, the back-EMF adds to the supply instead of opposing it. What does that do to the current?",
      "Where does the motor's stored kinetic and magnetic energy go when it is reversed hard, and what absorbs it if there is no bulk capacitor at the driver?",
      "Trace the return path of the motor current. Does it share any wire with the ESP32's ground?",
    ],
    rootCause:
      "Plugging a spinning motor into reverse puts the supply plus the back-EMF across the winding, so each motor briefly draws close to twice its stall current, about 3 A for the pair. The partly discharged pack's internal resistance and thin shared wiring turned that into a deep sag, the buck dropped out of regulation, and the ESP32's brownout detector reset the chip. With no bulk capacitor at the driver, the inductive kick and regenerated energy also made the motor supply ring, and motor return current flowing through the ESP32's ground wire shifted its ground reference.",
    fix:
      "Ramp the PWM in firmware, for example by at most 5% duty per 10 ms cycle, and pass through brake or zero before reversing. Add a 470 µF low-ESR electrolytic plus a 100 nF ceramic at the driver's VM pin, and run separate short ground returns to a star point at the pack. Give the logic rail headroom: a buck with a wider input range, an LC filter, or its own cell. Keep the driver's internal diodes and add a TVS or Schottky clamp on VM if spikes remain.",
    lesson:
      "Motor transients are a power-integrity problem that firmware can make worse or better. Limit di/dt in software, store charge where the current flows, and keep motor return current out of the logic ground.",
  },
  interview: [
    {
      q: "How does an H-bridge control a DC motor's direction and speed? What are brake and coast?",
      a: "An H-bridge puts four switches around the motor: two high-side switches to the supply and two low-side switches to ground. Turning on one high-side switch and the opposite low-side switch drives current through the motor one way, and the other diagonal pair reverses it. Speed comes from pulse-width modulation at around 20 kHz, so the motor sees duty times supply on average. Brake turns on both low-side switches, shorting the motor so its back-EMF drives a current that opposes rotation and stops it quickly; coast turns everything off and lets it spin down on friction.",
      level: "screen",
    },
    {
      q: "Why would you choose a TB6612FNG over an L298N for a 7.4 V robot?",
      a: "The L298N uses bipolar Darlington switches that drop about 2 V in total at 1 A, so on a 7.4 V pack the motor sees roughly 5.4 V and the chip burns about 2 W per amp. The TB6612FNG uses MOSFETs with about 0.5 Ω total on-resistance, dropping about 0.5 V at 1 A, so the motor gets more voltage and the board stays cool without a heatsink. It is rated 1.2 A continuous and 3.2 A peak per channel, which suits N20 gearmotors, accepts 3.3 V logic and switches at up to 100 kHz. The L298N only wins when you need its 46 V rating or 2 A continuous.",
      level: "screen",
    },
    {
      q: "Walk me through sizing a motor and gear ratio for a small wheeled robot.",
      a: "I start from the requirements: mass, wheel radius, top speed, the worst slope and the acceleration I want. The force at the wheels is m·g·sinθ for the slope plus rolling resistance plus m·a, and the torque per motor is that force times the wheel radius divided by the number of driven wheels. Top speed divided by the wheel circumference gives the wheel rpm I need. Then I pick a motor and ratio so the operating point sits at about 20-30% of stall torque, which leaves margin for acceleration and keeps efficiency reasonable, with a no-load speed about 20-30% above my top speed. Finally I check the running current against the driver's continuous rating and the stall current against its peak rating.",
      level: "deep",
    },
    {
      q: "What is shoot-through in a half-bridge, and how is it prevented?",
      a: "Shoot-through is both switches in one leg conducting at once, which shorts the supply through two on-resistances; from a stiff battery that can be tens of amps, enough to destroy MOSFETs in microseconds. It happens if the logic commands it, or during transitions, because MOSFETs turn off more slowly than they turn on. Drivers prevent it with interlocks that never allow both inputs of a leg on, and with dead time, a gap of roughly 100 ns to a few microseconds where both switches are off while the inductive current freewheels through the body diodes. Integrated drivers like the TB6612FNG handle this internally; with discrete gate drivers you set the dead time yourself and verify it on a scope.",
      level: "deep",
    },
    {
      q: "When would you pick a stepper, a hobby servo or a DC gearmotor with an encoder?",
      a: "A stepper gives precise open-loop positioning and strong holding torque at low speed, which is why 3D printers use NEMA 17s, but it loses torque as speed rises and silently skips steps if overloaded. A hobby servo is the simplest way to hold an angle within about 180°, such as panning a sensor, because you only send a 1-2 ms pulse every 20 ms. A DC gearmotor with an encoder and a PID loop is best for continuous rotation and efficient driving, as on wheels. On the course robot that means an SG90 for the sensor pan and encoder gearmotors for the wheels.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "A brushed DC motor has 4 Ω windings and runs from 6 V. What is its stall current?",
      choices: ["0.67 A", "1.5 A", "6 A", "24 A"],
      answer: 1,
      explain:
        "At stall there is no back-EMF, so only the winding resistance limits current: I = V/R = 6/4 = 1.5 A. The same surge flows at every start, which is why drivers and supplies must be sized for it.",
    },
    {
      q: "Which H-bridge state stops a spinning motor fastest?",
      choices: ["All four switches off (coast)", "One high-side switch on", "Both switches in the left leg on", "Both low-side switches on (brake)"],
      answer: 3,
      explain:
        "Shorting the motor through both low-side switches lets its back-EMF drive a current that produces opposing torque, so it stops in a fraction of the coast time. Both switches in one leg on is shoot-through, a short circuit across the supply.",
    },
    {
      q: "A servo receives a 1.5 ms pulse every 20 ms. What is the duty cycle?",
      choices: ["0.75%", "1.5%", "7.5%", "15%"],
      answer: 2,
      explain:
        "1.5 ms / 20 ms = 0.075 = 7.5%. Hobby servos read the pulse width rather than the duty cycle: roughly 1-2 ms inside a 50 Hz frame, with 1.5 ms at the centre.",
    },
    {
      q: "A 200-step stepper is driven at 1/16 microstepping. How many microsteps make one revolution?",
      choices: ["200", "800", "1,600", "3,200"],
      answer: 3,
      explain:
        "200 full steps × 16 = 3,200 microsteps per revolution, 0.1125° each. Microstepping makes motion smoother and quieter, but the torque per microstep is small, so real positioning accuracy is coarser than the step size suggests.",
    },
    {
      q: "An L298N drops about 2 V at 1 A. Roughly what voltage reaches the motor from a 7.4 V pack at full duty?",
      choices: ["3.7 V", "5.4 V", "6.9 V", "7.4 V"],
      answer: 1,
      explain:
        "7.4 − 2 = 5.4 V, and 2 V × 1 A = 2 W becomes heat in the driver. A MOSFET driver like the TB6612FNG drops about 0.5 V at 1 A and delivers about 6.9 V.",
    },
    {
      q: "A motor makes 0.002 N·m through a 50:1 gearbox that is 70% efficient. What torque reaches the wheel?",
      choices: ["0.07 N·m", "0.1 N·m", "1.4 N·m", "3.5 N·m"],
      answer: 0,
      explain:
        "Output torque = motor torque × ratio × efficiency = 0.002 × 50 × 0.7 = 0.07 N·m, while the speed falls by 50×. Gearing trades speed for torque, minus friction losses.",
    },
  ],
};

export default data;
