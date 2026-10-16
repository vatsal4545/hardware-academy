import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const BX = 112;
const BY = 52;
const BODY = 96;
const PITCH = 7.6;
const PINS = Array.from({ length: 12 }, (_, i) => 4.5 + i * PITCH);

// Which pins "talk" in the animation, and when (seconds offset into the 2.4 s loop).
const ACTIVE = new Set(["L2", "L3", "L9", "T4", "T5", "T10", "R1", "R6", "R7", "B3", "B8", "B9"]);

function pinKey(side: string, i: number): string {
  return `${side}${i}`;
}

function McuIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  const pins = (side: "L" | "R" | "T" | "B") =>
    PINS.map((o, i) => {
      const horizontal = side === "L" || side === "R";
      const x = side === "L" ? BX - 12 : side === "R" ? BX + BODY : BX + o - 1.7;
      const y = side === "T" ? BY - 12 : side === "B" ? BY + BODY : BY + o - 1.7;
      const key = pinKey(side, i);
      return (
        <rect key={key} x={x} y={y} width={horizontal ? 12 : 3.4} height={horizontal ? 3.4 : 12} rx={0.8} fill={part.metal}>
          {ACTIVE.has(key) && <Anim on={on} name="fill" values={`${part.metal};${vizColors.cyan};${part.metal}`} keyTimes="0;0.15;0.45" dur={2.4} begin={-(i % 6) * 0.35} />}
        </rect>
      );
    });
  return (
    <PartCanvas title="48-pin LQFP microcontroller with pins on all four sides, a pin-1 dot and a part marking; pins light up in turn as data moves in and out">
      {pins("L")}
      {pins("R")}
      {pins("T")}
      {pins("B")}
      <rect x={BX} y={BY} width={BODY} height={BODY} rx={4} fill={part.epoxy} stroke={part.epoxyHi} />
      <rect x={BX + 4} y={BY + 4} width={BODY - 8} height={8} rx={3} fill="#ffffff" opacity={0.06} />
      <circle cx={BX + 10} cy={BY + 10} r={3.2} fill="#46506a" />
      <Mark x={BX + BODY / 2} y={BY + 38} size={11.5} color="#ffffff">
        STM32F103
      </Mark>
      <Mark x={BX + BODY / 2} y={BY + 54} size={10}>
        C8T6
      </Mark>
      <Mark x={BX + BODY / 2} y={BY + 70} size={9}>
        Cortex-M3 72 MHz
      </Mark>
      <Note x={BX - 20} y={BY + BODY / 2} anchor="end" size={10}>
        UART
      </Note>
      <Note x={BX + BODY + 20} y={BY + BODY / 2} anchor="start" size={10}>
        PWM
      </Note>
      <Note x={BX + BODY / 2} y={BY - 22} size={10}>
        I2C / SPI
      </Note>
      <Note x={BX + BODY / 2} y={BY + BODY + 22} size={10}>
        ADC and GPIO
      </Note>
      <Note x={20} y={26} anchor="start" color={part.ink} size={11}>
        LQFP-48
      </Note>
      <Note x={300} y={26} anchor="end" size={10}>
        CPU + flash + RAM
      </Note>
      <Note x={300} y={40} anchor="end" size={10}>
        + peripherals
      </Note>
      <Note x={20} y={184} anchor="start" size={10}>
        0.5 mm pitch, 64 KB flash
      </Note>
      <Note x={300} y={184} anchor="end" size={10}>
        SWD debug on 2 pins
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "microcontroller",
  name: "Microcontroller",
  category: "compute",
  oneLiner: "A whole small computer on one chip, with CPU, flash, RAM and peripherals, programmed to read sensors and drive outputs.",
  howItWorks: [
    "A microcontroller (MCU) integrates a CPU core (Arm Cortex-M, AVR, RISC-V or Xtensa), flash for the program (32 KB to 2 MB), SRAM (2-512 KB) and peripherals on one die: GPIO, ADC, timers and PWM, UART, I2C, SPI, CAN, and often USB or a radio. An ESP32 adds Wi-Fi and Bluetooth with dual 240 MHz cores, and an STM32F103 is a 72 MHz Cortex-M3 with 64-128 KB of flash.",
    "It runs firmware from reset: set up clocks, configure pins and peripherals, then loop. Peripherals do work in hardware. A timer generates 20 kHz PWM, an ADC converts at 12 bits and 1 MSPS, and DMA moves the results to memory, all without CPU involvement, so the core can spend its cycles on the control loop.",
    "Each GPIO pin can be an input, an output (push-pull sources or sinks 8-25 mA, so a pin can drive an LED but not a motor), an analog input, or an alternate function such as UART TX. Logic levels follow the supply: 3.3 V or 1.8 V on modern parts, 5 V on classic AVR.",
    "Power is 3.3 V at 10-100 mA when active (an ESP32 peaks near 350 mA with the radio on) and microamps in deep sleep. A minimal board needs a supply, 100 nF decoupling on every VDD pin plus a 4.7-10 µF bulk capacitor, a reset pull-up, boot-mode straps and a clock (internal RC or a crystal). Arm parts debug over SWD with two wires plus reset.",
    "Packages range from through-hole DIP-28 (ATmega328P) through LQFP-48/64/100 at 0.5 mm pitch to QFN and BGA, and many designs use a pre-certified module such as the ESP32-WROOM instead of the bare chip.",
  ],
  whereUsed: [
    "The brain of the course robot: sampling encoders, running the PID loop at 1 kHz and talking I2C to sensors.",
    "Motor control: generating PWM and commutation for brushed, BLDC and stepper drivers.",
    "Battery management: measuring cell voltages and balancing, as with a BQ769xx monitor plus an MCU.",
    "Appliances, toys, wearables and IoT sensors (ESP32), and automotive ECUs on CAN and LIN.",
    "Support controllers inside larger systems: keyboards, chargers, USB hubs and power supplies.",
  ],
  keySpecs: [
    { label: "Core and clock", value: "ATmega328P AVR 16 MHz; STM32F103 Cortex-M3 72 MHz; ESP32 dual 240 MHz" },
    { label: "Memory", value: "ATmega328P 32 KB / 2 KB; STM32F103 64-128 KB / 20 KB; ESP32 4 MB external / 520 KB" },
    { label: "Supply", value: "1.8-3.6 V (STM32); 2.7-5.5 V (ATmega328P)" },
    { label: "GPIO drive", value: "8-25 mA per pin, with a total package limit" },
    { label: "Peripherals", value: "12-bit ADC, 4-16 timers, 2-3 each of UART, SPI and I2C; USB or CAN on some" },
    { label: "Packages", value: "DIP-28, LQFP-48/64/100, QFN-32, ESP32-WROOM module" },
  ],
  failureModes: [
    "Brown-out and unstable supply: a droop below the minimum VDD (3.0 V for an ESP32-WROOM module) during radio transmit or a motor start causes a reset loop. A stiffer supply and local decoupling fix it.",
    "Over-voltage on pins: a 5 V sensor output into a 3.3 V pin, with no level shifter or series resistor, forward-biases the input protection diodes and damages the pin over time.",
    "Firmware hangs: with no watchdog, an unbounded loop or a stuck interrupt freezes the system silently. Use the hardware watchdog and a fault handler that records why it stopped.",
    "Floating inputs and wrong boot straps: unconnected pins pick up noise and draw current, and a boot-mode pin held in the wrong state at reset makes the chip start in its bootloader.",
  ],
  interviewTip:
    "Interviewer asks: \"What does a microcontroller need on a custom board to run reliably?\" A good answer: a clean supply with a 100 nF ceramic at every VDD/VSS pair plus bulk capacitance; a filtered analog supply (VDDA) if the ADC matters; a reset circuit (pull-up and 100 nF); a defined boot configuration; a clock source (a crystal with correct load capacitors, or the internal RC); a debug header (SWD); pull-ups for open-drain buses (4.7 kΩ on I2C); and protection on exposed pins. Mention the brown-out threshold and a watchdog.",
  relatedLesson: "microcontrollers-and-firmware",
  Illustration: McuIllustration,
};
