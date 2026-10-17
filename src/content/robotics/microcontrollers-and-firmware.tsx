"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { I2cTransaction } from "@/components/viz/robotics/I2cTransaction";
import { McuPeripheralMap } from "@/components/viz/robotics/McuPeripheralMap";

const LOOP_CODE = `#include <Arduino.h>

constexpr uint32_t LOOP_US = 10000;         // 100 Hz control period
constexpr uint32_t CMD_TIMEOUT_MS = 200;    // stop the motors if commands go stale

// motorsBegin(), readEncoders(), setMotors() and friends are your drivers;
// pidLeft and pidRight are the Pid controllers written in the next lesson.

uint32_t nextTick = 0;
uint32_t cycle = 0;
uint32_t overruns = 0;
uint32_t worstUs = 0;
uint32_t lastCommandMs = 0;
float targetLeft = 0.0f, targetRight = 0.0f;  // wheel speed setpoints, mm/s

void setup() {
  Serial.begin(115200);
  motorsBegin();     // LEDC PWM at 20 kHz, direction pins, STBY high
  encodersBegin();   // PCNT units in quadrature mode
  sensorsBegin();    // line sensors on ADC1, ultrasonic state machine
  nextTick = micros() + LOOP_US;
}

void controlStep(float dt) {
  readEncoders();                            // copy and clear the PCNT counters
  readLineSensors();                         // ADC1, non-blocking
  updateOdometry(dt);
  bool stale = millis() - lastCommandMs > CMD_TIMEOUT_MS;
  float left = stale ? 0.0f : pidLeft.update(targetLeft, speedLeft(), dt);
  float right = stale ? 0.0f : pidRight.update(targetRight, speedRight(), dt);
  setMotors(left, right);                    // -1..1 duty to the TB6612FNG
}

void loop() {
  // Not time yet? The signed difference stays correct when micros() wraps (every ~71 min).
  if ((int32_t)(micros() - nextTick) < 0) return;
  uint32_t start = micros();
  nextTick += LOOP_US;                       // schedule from the deadline, not from "now": no drift

  controlStep(LOOP_US * 1e-6f);
  if (cycle % 5 == 0) ultrasonicService();   // 20 Hz: trigger or collect an echo, never block
  if (cycle % 10 == 0) runBehavior();        // 10 Hz state machine sets targetLeft / targetRight
  if (cycle % 10 == 5) sendTelemetry();      // 10 Hz, in a different cycle from the behavior
  cycle++;

  uint32_t used = micros() - start;
  if (used > worstUs) worstUs = used;        // report this in telemetry
  if ((int32_t)(micros() - nextTick) >= 0) { // already late for the next tick
    overruns++;
    nextTick = micros() + LOOP_US;           // resync instead of running a burst of late cycles
  }
}`;

const RTOS_CODE = `// The same schedule as a FreeRTOS task, pinned away from the Wi-Fi core.
void controlTask(void*) {
  TickType_t last = xTaskGetTickCount();
  for (;;) {
    controlStep(0.01f);
    vTaskDelayUntil(&last, pdMS_TO_TICKS(10));   // wakes every 10 ms, measured from the last wake-up
  }
}

void setup() {
  // ... same initialization as above ...
  xTaskCreatePinnedToCore(controlTask, "control", 4096, nullptr, 5, nullptr, 1);  // priority 5, core 1
}`;

const LAYERS = [
  { name: "Behavior", detail: "state machine: follow line · avoid · recover", rate: "10-20 Hz", color: vizColors.violet },
  { name: "Control", detail: "PID per wheel · odometry · motor mixing", rate: "100 Hz, fixed", color: vizColors.cyan },
  { name: "Device drivers", detail: "Motor · Encoder · Ultrasonic · LineSensor · Imu", rate: "non-blocking", color: vizColors.green },
  { name: "Hardware abstraction", detail: "Arduino core / ESP-IDF: gpio · ledc · pcnt · adc · i2c · uart", rate: "", color: vizColors.amber },
  { name: "ESP32 hardware", detail: "two cores · peripherals · pins", rate: "", color: vizColors.muted },
];

const SIDE = [
  { name: "Telemetry", detail: "serial or Wi-Fi, 10 Hz, low priority" },
  { name: "Configuration", detail: "PID gains, calibration in NVS" },
  { name: "Watchdogs", detail: "hardware WDT + 200 ms command timeout" },
  { name: "OTA updates", detail: "two app partitions, rollback" },
  { name: "FreeRTOS", detail: "tasks, priorities, vTaskDelayUntil" },
];

function FirmwareLayers() {
  return (
    <SvgCanvas viewBox="0 0 760 372" title="Firmware layers of the course robot, from hardware up to behavior, with services beside the stack">
      <Arrow x1={30} y1={344} x2={30} y2={24} color={vizColors.green} width={2} />
      <Arrow x1={48} y1={24} x2={48} y2={344} color={vizColors.violet} width={2} />
      <Label x={20} y={184} size={10.5} color={vizColors.green} rotate={-90}>
        sensor data flows up
      </Label>
      <Label x={60} y={184} size={10.5} color={vizColors.violet} rotate={90}>
        commands flow down
      </Label>
      {LAYERS.map((l, i) => {
        const y = 16 + i * 70;
        return (
          <g key={l.name}>
            <rect x={78} y={y} width={440} height={58} rx={8} fill={l.color} fillOpacity={0.1} stroke={l.color} strokeWidth={1.5} />
            <Label x={94} y={y + 20} size={13} anchor="start" bold>
              {l.name}
            </Label>
            <Label x={94} y={y + 40} size={11} anchor="start" color={vizColors.muted}>
              {l.detail}
            </Label>
            {l.rate && (
              <Label x={506} y={y + 20} size={11} anchor="end" color={l.color} bold>
                {l.rate}
              </Label>
            )}
          </g>
        );
      })}
      <Label x={640} y={10} size={11} color={vizColors.muted}>
        beside the stack
      </Label>
      {SIDE.map((s, i) => {
        const y = 22 + i * 70;
        return (
          <g key={s.name}>
            <rect x={540} y={y} width={208} height={50} rx={8} fill={vizColors.bg} stroke={vizColors.muted} strokeDasharray="4 3" />
            <Label x={644} y={y + 17} size={12} bold>
              {s.name}
            </Label>
            <Label x={644} y={y + 35} size={10} color={vizColors.muted}>
              {s.detail}
            </Label>
          </g>
        );
      })}
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Inside the microcontroller, and the shape of good firmware">
        <Prose>
          <p>
            A microcontroller (MCU) is a computer on one chip: a CPU core, flash for the program, SRAM for data, a clock,
            and hardware peripherals that do timing-critical work on their own. The peripherals are the point. A PWM
            timer toggles a pin 20,000 times a second while the CPU does something else, and a pulse counter tallies
            encoder edges without a single interrupt.
          </p>

          <h3>Choosing an MCU</h3>
          <table>
            <thead>
              <tr>
                <th>Chip</th>
                <th>Core and clock</th>
                <th>RAM</th>
                <th>ADC</th>
                <th>Known for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ATmega328P (Arduino Uno)</td>
                <td>8-bit AVR, 16 MHz</td>
                <td>2 KB</td>
                <td>10-bit, about 10 k samples/s</td>
                <td>5 V logic, simplest to learn</td>
              </tr>
              <tr>
                <td>ESP32 (WROOM-32)</td>
                <td>2 × Xtensa LX6, 240 MHz</td>
                <td>520 KB</td>
                <td>12-bit, nonlinear at the ends</td>
                <td>Wi-Fi, Bluetooth, pulse counters</td>
              </tr>
              <tr>
                <td>RP2040 (Raspberry Pi Pico)</td>
                <td>2 × Cortex-M0+, 133 MHz</td>
                <td>264 KB</td>
                <td>12-bit, 500 k samples/s</td>
                <td>PIO state machines for custom I/O</td>
              </tr>
              <tr>
                <td>STM32F411</td>
                <td>Cortex-M4F, 100 MHz</td>
                <td>128 KB</td>
                <td>12-bit, 2.4 M samples/s</td>
                <td>Motor-control timers, mature debugging</td>
              </tr>
            </tbody>
          </table>
          <p>
            The course robot uses the ESP32 for its headroom and Wi-Fi telemetry. Its pins are 3.3 V and not 5 V
            tolerant, GPIO 34-39 are input-only, and the strapping pins (GPIO 0, 2, 5, 12 and 15) must sit at the right
            levels during boot.
          </p>

          <h3>GPIO, ADC and PWM</h3>
          <p>
            A GPIO pin can be an input (floating, pulled up or pulled down), a push-pull output that drives both high and
            low, or an open-drain output that only pulls low. A floating input reads noise, so switches and
            open-collector sensors need a pull-up; the ESP32&apos;s internal ones are about 45 kΩ, fine for a button and
            too weak for a bus.
          </p>
          <p>
            An ADC converts a voltage into a number, and resolution sets the step: 12 bits gives 4,096 codes, 0.8 mV each
            over 3.3 V. Sample rate matters too: the Uno needs about 104 µs per conversion, roughly 9,600 samples per
            second, while the RP2040 manages 500,000. Accuracy is another matter. The ESP32&apos;s ADC is nonlinear near
            both ends of its range, and ADC2 is unavailable while Wi-Fi runs, so analog sensors belong on ADC1.
          </p>
          <p>
            PWM comes from hardware timers that count clock ticks and flip a pin at a compare value, so resolution and
            frequency trade off: an 80 MHz clock at 20 kHz leaves 4,000 ticks per period, at most 11 bits. The
            ESP32&apos;s LEDC block has 16 channels; MCPWM adds dead time and fault inputs for half-bridges.
          </p>

          <h3>Serial buses: I2C, SPI and UART</h3>
          <ul>
            <li>
              <strong>I2C</strong> uses two open-drain wires, SDA and SCL, with pull-up resistors (typically 4.7 kΩ at
              100 kHz, 2.2 kΩ at 400 kHz). Each device has a 7-bit address (the MPU-6050 is 0x68) and acknowledges every
              byte. The pull-up and the bus capacitance set the rise time, about 0.85·R·C, which must stay under 300 ns
              at 400 kHz: a 2.2 kΩ pull-up allows about 160 pF of wiring. Two wires serve dozens of sensors, but the bus
              is slow and one confused device can hold it.
            </li>
            <li>
              <strong>SPI</strong> uses a clock, two data lines (MOSI and MISO) and a chip-select per device. It is full
              duplex at tens of MHz, ideal for displays, SD cards and fast IMUs.
            </li>
            <li>
              <strong>UART</strong> has no clock: both ends agree on a baud rate. 115200 baud with 8N1 framing moves
              11,520 bytes per second, point to point; GPS modules, lidars and your debug console use it.
            </li>
          </ul>

          <h3>Interrupts, timers and scheduling</h3>
          <p>
            Polling reads a signal whenever the loop gets to it; an <strong>interrupt</strong> runs a short routine
            within microseconds of a hardware event. Use interrupts for edges you cannot miss, such as encoder channels
            or an echo pin, and keep each ISR to a few lines: update a volatile counter and return. Never print, delay or
            touch a bus inside one, and copy multi-byte shared variables atomically in the main code.
          </p>
          <p>
            A <strong>superloop</strong>, Arduino&apos;s loop(), runs tasks one after another and is easy to reason
            about, but any blocking call (delay(), pulseIn(), a full Serial buffer) stalls everything. An{" "}
            <strong>RTOS</strong> such as FreeRTOS, which the ESP32&apos;s Arduino core already runs, gives tasks
            priorities, so a 100 Hz control task can preempt telemetry. vTaskDelayUntil() or a hardware timer keeps the
            period fixed instead of drifting.
          </p>

          <h3>Firmware structure, debugging and OTA</h3>
          <p>
            Good robot firmware is layered (see the figure): a hardware abstraction layer, device drivers that hide each
            part&apos;s quirks, a fixed-rate control layer and a behavior layer on top. Telemetry and logging sit beside
            the stack, never inside the control step. Two safety nets are mandatory: the hardware watchdog, which resets
            a hung MCU, and a command timeout that stops the motors if no fresh command arrives within about 200 ms.
          </p>
          <p>
            Serial prints are the first debugging tool and the most intrusive: an 80-character line takes about 7 ms at
            115200 baud. Toggling a spare GPIO around the control step and watching it on a scope or a $10 logic
            analyzer shows the real loop period and jitter, and the same analyzer decodes I2C, SPI and UART traffic.
            For breakpoints, the ESP32 supports JTAG with OpenOCD and GDB. Over-the-air (OTA) updates write new
            firmware to a second app partition and reboot into it, rolling back if it fails; stop the motors before an
            update starts.
          </p>
        </Prose>

        <Figure caption="Firmware layers: data flows up from the hardware, commands flow down, and services such as telemetry and OTA sit beside the control path, not inside it.">
          <FirmwareLayers />
        </Figure>

        <Callout kind="interview" title="Interview angle">
          When asked how you would structure robot firmware, say the words fixed rate, non-blocking, layered and
          watchdog, then show the loop: read sensors, estimate, decide, actuate, measure the time it took.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: the ESP32's peripherals and an I2C transaction">
        <McuPeripheralMap />
        <I2cTransaction />
        <Prose>
          <p>
            Switch on &quot;No device at 0x68&quot; and watch the ninth clock: nobody pulls SDA low, the pull-up holds it
            high, and the master gives up with a STOP. That is the 2 that Wire.endTransmission() returns.
          </p>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Write a 100 Hz control-loop skeleton">
          <p>
            Write an Arduino loop() for the ESP32 that runs the control step every 10 ms without drift, runs the
            ultrasonic sensor at 20 Hz and telemetry and behavior at 10 Hz, stops the motors when commands go stale, and
            measures its own timing.
          </p>
          <CodeBlock lang="cpp" title="control_loop.ino" code={LOOP_CODE} />
          <p>
            <strong>Why it works.</strong> The deadline advances by exactly 10 ms each cycle (nextTick += LOOP_US), so
            the average rate is 100 Hz however long each cycle takes; writing nextTick = micros() + LOOP_US instead would
            add every cycle&apos;s lateness to the period. Slow jobs run at divided rates in different cycles, nothing
            blocks, and the loop reports its worst-case time and overruns so you can prove it meets its budget. The same
            schedule as a FreeRTOS task:
          </p>
          <CodeBlock lang="cpp" title="control_task.cpp" code={RTOS_CODE} />
        </Exercise>
      </Section>
    </>
  );
}
