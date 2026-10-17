"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Segmented, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";

export interface Peripheral {
  id: string;
  name: string;
  sub: string;
  robot: boolean;
  what: string;
  use: string;
  watch: string;
}

export const ESP32_PERIPHERALS: Peripheral[] = [
  {
    id: "gpio",
    name: "GPIO",
    sub: "34 pins, 3.3 V",
    robot: true,
    what: "34 general-purpose pins, routed to almost any peripheral through the GPIO matrix. Inputs can enable internal pull-ups or pull-downs of about 45 kΩ; outputs are push-pull or open-drain and should stay under about 20 mA each.",
    use: "TB6612FNG direction pins (AIN1, AIN2, BIN1, BIN2) and STBY, the HC-SR04 trigger, and the line sensors' digital outputs.",
    watch: "3.3 V only, not 5 V tolerant. GPIO 34-39 are input-only with no pull-ups, GPIO 6-11 belong to the flash chip, and strapping pins 0, 2, 5, 12 and 15 must sit at the right level during boot.",
  },
  {
    id: "adc",
    name: "ADC",
    sub: "2 × 12-bit SAR",
    robot: true,
    what: "Two successive-approximation ADCs with 12-bit results (4,096 codes) on 18 channels. Attenuation settings extend the input range; at 11 dB the recommended span is about 0.15-2.45 V.",
    use: "The TCRT5000 analog outputs and the battery monitor (a 100 kΩ / 33 kΩ divider turns 8.4 V into 2.08 V), all on ADC1 pins.",
    watch: "ADC2 is unavailable while Wi-Fi runs, and readings are nonlinear near both ends of the range. Calibrate, and average several samples.",
  },
  {
    id: "ledc",
    name: "LEDC PWM",
    sub: "16 channels",
    robot: true,
    what: "PWM generator with 16 channels whose frequency and resolution you choose, fed by an 80 MHz clock. They trade off: at 20 kHz there are 4,000 ticks per period, so at most 11 bits.",
    use: "PWMA and PWMB for the TB6612FNG at 20 kHz with 10-bit duty, and the SG90 servo at 50 Hz with 16-bit duty (1.5 ms = 4,915 counts).",
    watch: "Channels that share a timer share its frequency, so keep the 50 Hz servo channel on a different timer from the 20 kHz motor channels.",
  },
  {
    id: "mcpwm",
    name: "MCPWM",
    sub: "2 motor-control units",
    robot: false,
    what: "Motor-control PWM: two units, each with three operators that produce complementary outputs with hardware dead time, plus fault inputs that shut the outputs off and capture inputs that timestamp edges.",
    use: "Not needed with the TB6612FNG, which handles dead time internally. You would use it for discrete half-bridges or a BLDC stage, and its capture unit can time the HC-SR04 echo precisely.",
    watch: "Dead time is set in clock ticks. Check it on a scope before connecting a power stage.",
  },
  {
    id: "pcnt",
    name: "PCNT",
    sub: "8 pulse counters",
    robot: true,
    what: "Pulse counter: 8 units with 16-bit signed counters. Each unit has two channels that can decode quadrature in hardware, and a glitch filter ignores pulses shorter than a set number of clock cycles.",
    use: "Both wheel encoders. The counters run with zero CPU load and never miss an edge, so the 100 Hz loop only reads and clears them.",
    watch: "The counter is 16-bit: at 1,400 counts per wheel turn it wraps after about 23 turns in one direction, so read it every cycle and accumulate in software.",
  },
  {
    id: "i2c",
    name: "I2C",
    sub: "2 controllers",
    robot: true,
    what: "Two I2C controllers for 100 kHz and 400 kHz buses on any pins through the GPIO matrix. The Arduino core defaults to SDA on GPIO 21 and SCL on GPIO 22.",
    use: "An MPU-6050 IMU at 0x68 (an upgrade) and an SSD1306 OLED status display at 0x3C on the same two wires.",
    watch: "Needs external pull-ups of 2.2-4.7 kΩ to 3.3 V; the internal ~45 kΩ ones are far too weak. Add timeouts and a bus-clear routine for lockups.",
  },
  {
    id: "spi",
    name: "SPI",
    sub: "4 hosts, 2 free",
    robot: false,
    what: "Four SPI controllers. SPI0 and SPI1 talk to the flash, leaving SPI2 (HSPI) and SPI3 (VSPI) for you at up to 80 MHz on their native pins.",
    use: "Free on the course robot. Typical upgrades are a microSD card for logging, a TFT display, or a fast SPI IMU.",
    watch: "Every device needs its own chip-select line, and long jumper wires limit the clock to a few MHz.",
  },
  {
    id: "uart",
    name: "UART",
    sub: "3 ports",
    robot: true,
    what: "Three UARTs with hardware FIFOs. UART0 is wired to the DevKitC's USB-serial chip for flashing and the console.",
    use: "The debug console and telemetry at 115200 baud. A lidar such as the RPLIDAR A1 would take a second UART at 115200.",
    watch: "At 115200 baud a byte takes 87 µs, so an 80-character print costs about 7 ms once the transmit buffer is full: enough to wreck a 10 ms loop.",
  },
  {
    id: "rmt",
    name: "RMT",
    sub: "8 pulse channels",
    robot: false,
    what: "Remote-control transceiver: generates or measures pulse trains in hardware with 12.5 ns resolution. Built for infrared remotes, widely used for WS2812 LEDs.",
    use: "Optional: a WS2812 status LED, or measuring the HC-SR04 echo pulse without blocking the CPU.",
    watch: "Channels share a small pulse memory, so long pulse trains need more memory blocks or refills.",
  },
  {
    id: "timers",
    name: "Timers",
    sub: "4 × 64-bit",
    robot: true,
    what: "Four 64-bit general-purpose timers with 16-bit prescalers, plus the esp_timer microsecond API and FreeRTOS's 1 kHz tick.",
    use: "The 100 Hz control tick: a hardware timer or vTaskDelayUntil wakes the control task every 10 ms.",
    watch: "Do not run the control step inside a timer ISR. Have the ISR notify a task and do the work there.",
  },
  {
    id: "cpu",
    name: "CPU cores",
    sub: "2 × Xtensa LX6, 240 MHz",
    robot: true,
    what: "Two 32-bit cores at up to 240 MHz with a single-precision floating-point unit.",
    use: "Arduino's loop runs on core 1 while the Wi-Fi stack runs on core 0. Pin the control task to core 1 so radio bursts cannot delay it.",
    watch: "Double-precision math is done in software and is much slower; use float in control code.",
  },
  {
    id: "mem",
    name: "Memory",
    sub: "520 KB SRAM, 4 MB flash",
    robot: true,
    what: "520 KB of on-chip SRAM, ROM with the bootloader, and 4 MB of external flash on the WROOM-32 module.",
    use: "Two app partitions for OTA updates, plus NVS (non-volatile storage) for saved PID gains and calibration values.",
    watch: "Functions called from ISRs should carry IRAM_ATTR so they run from RAM, not from flash.",
  },
  {
    id: "radio",
    name: "Wi-Fi + Bluetooth",
    sub: "2.4 GHz, BLE 4.2",
    robot: true,
    what: "802.11 b/g/n Wi-Fi and Bluetooth 4.2 (classic and BLE) sharing one 2.4 GHz radio.",
    use: "Telemetry to a laptop dashboard at 10 Hz, OTA firmware updates, and an optional ESP-NOW or BLE remote.",
    watch: "Transmit bursts draw about 240 mA with short peaks above that, and Wi-Fi takes over ADC2.",
  },
];

interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const LEFT = ["gpio", "adc", "ledc", "mcpwm", "pcnt"];
const RIGHT = ["i2c", "spi", "uart", "rmt", "timers"];
const INSIDE = ["cpu", "mem", "radio"];
const BOXES: Box[] = [
  ...LEFT.map((id, i) => ({ id, x: 16, y: 34 + i * 66, w: 158, h: 52 })),
  ...RIGHT.map((id, i) => ({ id, x: 546, y: 34 + i * 66, w: 158, h: 52 })),
  ...INSIDE.map((id, i) => ({ id, x: 236, y: 82 + i * 82, w: 248, h: 60 })),
];

const byId = (id: string) => ESP32_PERIPHERALS.find((p) => p.id === id) as Peripheral;

export function McuPeripheralMap() {
  const [selected, setSelected] = useState("pcnt");
  const [filter, setFilter] = useState<"all" | "robot">("all");
  const selectId = useId();
  const sel = byId(selected);

  const onKey = (id: string) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(id);
    }
  };

  return (
    <VizFrame
      title="ESP32 peripheral map"
      description="Click a block to see what it does, how the course robot uses it, and the trap to avoid. Green dots mark peripherals the robot uses."
      controls={
        <>
          <div className="text-sm">
            <label htmlFor={selectId} className="mb-1 block text-muted">
              Peripheral
            </label>
            <select
              id={selectId}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-text focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {ESP32_PERIPHERALS.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${p.name} (${p.sub})${p.robot ? ", used by the robot" : ""}`}
                </option>
              ))}
            </select>
          </div>
          <Segmented
            label="Highlight"
            options={[
              { value: "all", label: "All peripherals" },
              { value: "robot", label: "Used by the robot" },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </>
      }
    >
      <SvgCanvas
        viewBox="0 0 720 370"
        title="Clickable block diagram of the ESP32's cores, memory, radio and peripherals"
        role="group"
      >
        <rect x={204} y={22} width={312} height={336} rx={14} fill={vizColors.bg} stroke={vizColors.muted} strokeWidth={2} />
        <Label x={360} y={44} size={13} bold>
          ESP32 (WROOM-32 module)
        </Label>
        <Label x={360} y={62} size={10.5} color={vizColors.muted}>
          peripherals reach any pin through the GPIO matrix
        </Label>
        {LEFT.map((id, i) => (
          <line key={id} x1={174} x2={204} y1={60 + i * 66} y2={60 + i * 66} stroke={vizColors.grid} strokeWidth={3} />
        ))}
        {RIGHT.map((id, i) => (
          <line key={id} x1={516} x2={546} y1={60 + i * 66} y2={60 + i * 66} stroke={vizColors.grid} strokeWidth={3} />
        ))}

        {BOXES.map((b) => {
          const p = byId(b.id);
          const active = b.id === selected;
          const dim = filter === "robot" && !p.robot;
          return (
            <g
              key={b.id}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${p.name}: ${p.sub}${p.robot ? ", used by the robot" : ""}`}
              onClick={() => setSelected(b.id)}
              onKeyDown={onKey(b.id)}
              style={{ cursor: "pointer" }}
              opacity={dim ? 0.3 : 1}
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={8}
                fill={active ? vizColors.cyan : vizColors.grid}
                fillOpacity={active ? 0.2 : 0.55}
                stroke={active ? vizColors.cyan : vizColors.muted}
                strokeWidth={active ? 2.5 : 1}
              />
              <Label x={b.x + b.w / 2} y={b.y + b.h / 2 - 8} size={12.5} bold>
                {p.name}
              </Label>
              <Label x={b.x + b.w / 2} y={b.y + b.h / 2 + 10} size={10.5} color={vizColors.muted}>
                {p.sub}
              </Label>
              {p.robot && <circle cx={b.x + b.w - 10} cy={b.y + 10} r={4} fill={vizColors.green} />}
            </g>
          );
        })}
      </SvgCanvas>
      <div className="mt-3 rounded-lg border border-border bg-surface-2/40 p-4 text-sm" aria-live="polite">
        <p className="font-semibold text-text">
          {sel.name} <span className="font-normal text-muted">· {sel.sub}</span>
          {sel.robot && <span className="ml-2 rounded-full bg-green-400/15 px-2 py-0.5 text-xs text-green-300">used by the robot</span>}
        </p>
        <dl className="mt-2 grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">What it does</dt>
            <dd className="mt-0.5">{sel.what}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">On the course robot</dt>
            <dd className="mt-0.5">{sel.use}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Watch out</dt>
            <dd className="mt-0.5">{sel.watch}</dd>
          </div>
        </dl>
      </div>
    </VizFrame>
  );
}
