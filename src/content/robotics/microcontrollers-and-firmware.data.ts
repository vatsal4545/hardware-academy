import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "GPIO",
      def: "General-purpose input/output pin: an input (floating, pull-up or pull-down), a push-pull output or an open-drain output. ESP32 GPIOs are 3.3 V only and not 5 V tolerant.",
    },
    {
      term: "Pull-up resistor",
      def: "A resistor to the supply that sets a line's idle level. I2C needs external pull-ups, typically 4.7 kΩ at 100 kHz or 2.2 kΩ at 400 kHz; the ESP32's internal ~45 kΩ ones are too weak for a bus.",
    },
    {
      term: "ADC resolution",
      def: "The number of output codes: a 12-bit ADC has 4,096, about 0.8 mV each over 3.3 V. Real accuracy is lower; the ESP32's ADC is nonlinear near both ends of its range.",
    },
    {
      term: "I2C",
      def: "A two-wire open-drain bus (SDA, SCL) with 7-bit addresses, 100 or 400 kHz clocks and an acknowledge bit after every byte. Many devices share the wires; one stuck device can hold the whole bus.",
    },
    {
      term: "SPI",
      def: "A four-wire full-duplex bus (SCLK, MOSI, MISO and one chip-select per device) clocked at up to tens of MHz. Faster and simpler than I2C, at the cost of more pins.",
    },
    {
      term: "UART",
      def: "Asynchronous serial with no clock wire; both ends agree on a baud rate. 115200 baud with 8N1 framing moves 11,520 bytes per second, point to point.",
    },
    {
      term: "Interrupt service routine (ISR)",
      def: "Code the CPU runs within microseconds of a hardware event such as an encoder edge. It must be short: update a volatile variable and return, with no prints, delays or bus traffic.",
    },
    {
      term: "RTOS",
      def: "A real-time operating system such as FreeRTOS, which the ESP32 runs under Arduino. Tasks have priorities, and vTaskDelayUntil() gives a fixed-rate loop that does not drift.",
    },
    {
      term: "Watchdog",
      def: "A timer that resets the MCU unless the firmware services it in time, recovering from hangs. A robot also needs a command watchdog that stops the motors when commands go stale.",
    },
    {
      term: "OTA update",
      def: "Over-the-air update: new firmware is written over Wi-Fi into a second app partition, then the MCU reboots into it and can roll back if the new image fails its checks.",
    },
  ],
  scenario: {
    title: "The IMU stops answering until the robot is power-cycled",
    context:
      "A robot reads an MPU-6050 IMU at address 0x68 over I2C at 400 kHz, through 30 cm of ribbon cable to the ESP32. When a second sensor was added, the breakout's pull-up resistors were removed, so the bus now relies on the ESP32's internal pull-ups. On the bench it runs for hours. On the robot, after a few minutes of driving or right after an ESP32 brownout reset, every IMU read fails and only unplugging the battery brings it back.",
    symptoms: [
      "Wire.endTransmission() returns 2 (NACK on address) or reads time out, and the accelerometer and gyro values freeze.",
      "A scope shows SDA held low continuously while SCL idles high.",
      "Before the lockups, the scope shows slow, rounded rising edges on SDA and SCL that take about 4 µs to reach the high level.",
      "Dropping the bus to 100 kHz makes failures rarer but does not stop the lockups after resets.",
    ],
    hints: [
      "What pulls an I2C line high, and how long does a weak pull-up take to charge 30 cm of cable?",
      "If the ESP32 resets in the middle of a byte the IMU is sending, what is the IMU still waiting for?",
      "How could the master give a stuck slave the clock pulses it is waiting for?",
    ],
    rootCause:
      "Two problems. First, I2C lines are open-drain: devices only pull low and the pull-up resistor pulls high. The ESP32's internal pull-ups are about 45 kΩ; with roughly 100 pF of cable and pin capacitance, the rise time 0.85·R·C is about 4 µs, far beyond the 300 ns limit for 400 kHz, so bits were misread, especially with motor noise on the cable. Second, when the ESP32 reset mid-transaction, the MPU-6050 was driving SDA low for a data bit. It kept waiting for the clocks of the unfinished byte and held SDA low indefinitely, so the master could never generate a START: a bus lockup that only a power cycle cleared.",
    fix:
      "Fit real pull-ups: 2.2 kΩ to 3.3 V gives 0.85 × 2.2 kΩ × 100 pF ≈ 190 ns, inside the 300 ns limit at 400 kHz. Keep one set per bus, shorten the cable and twist SDA and SCL each with a ground wire. Add bus-clear recovery: at boot and after any timeout, switch SCL to a GPIO, clock it up to 9 times until SDA reads high, send a STOP and re-initialize the I2C driver. Set a Wire timeout so a stuck bus cannot hang the control loop, and power the IMU from a switchable rail as a last resort.",
    lesson:
      "I2C is open-drain and stateful. Size the pull-ups for the wire you actually have, and write recovery code, because a reset at the wrong moment will eventually lock the bus.",
  },
  interview: [
    {
      q: "Compare I2C, SPI and UART. Which would you use for an IMU, a display and a GPS module?",
      a: "I2C uses two open-drain wires shared by many devices, each with a 7-bit address, at 100 or 400 kHz; it saves pins but is slow and can lock up. SPI uses four wires with a chip-select per device and runs at tens of MHz full duplex, which suits displays, SD cards and fast IMUs. UART is asynchronous point-to-point serial at an agreed baud rate such as 115200, typical for GPS modules, lidars and debug consoles. So I would put the IMU on I2C at 400 kHz unless I need kilohertz sample rates, the display on SPI and the GPS on a UART.",
      level: "screen",
    },
    {
      q: "Interrupts versus polling: when do you use each, and what must an ISR not do?",
      a: "I use interrupts for short, time-critical events that would be missed between polls, such as encoder edges or an echo pin changing, and polling for slow signals that are fine to read once per loop, such as a line sensor or the battery voltage. An ISR should update a volatile counter or timestamp and return within microseconds. It must not call delay(), print to Serial, allocate memory or wait on a bus, because it blocks everything else, including other interrupts. Shared multi-byte variables need an atomic copy in the main code, by briefly disabling interrupts or using a critical section.",
      level: "screen",
    },
    {
      q: "How do you structure the firmware for a robot with a 100 Hz control loop?",
      a: "I layer it: a hardware abstraction layer (the Arduino core or ESP-IDF drivers), device drivers for the motors, encoders, ultrasonic sensor and IMU, a control layer with PID and odometry, and a behavior layer with a state machine on top. The control step runs on a fixed schedule, either a FreeRTOS task using vTaskDelayUntil with a 10 ms period or a micros()-based loop that adds the period to the deadline so it never drifts. Everything in that step is non-blocking; ultrasonic pings, telemetry and Wi-Fi run at divided rates or in lower-priority tasks. I measure the step's execution time and count overruns, and I add a hardware watchdog plus a command timeout that stops the motors.",
      level: "deep",
    },
    {
      q: "An I2C device stops responding after a reset. How do you debug and recover?",
      a: "First I look at the bus with a scope or logic analyzer: if SDA is stuck low while SCL is high, a slave is holding the line, usually because a reset interrupted a transaction while it was sending a 0. I also check the rise times, because weak pull-ups and long wires cause bit errors that end in the same state. To recover, I reconfigure SCL as a GPIO and clock it up to nine times until the slave finishes its byte and releases SDA, then issue a STOP and re-initialize the driver. Prevention is correctly sized pull-ups, short wiring, a timeout on every transaction, running the bus clear at every boot, and a power switch on the sensor as a last resort.",
      level: "deep",
    },
    {
      q: "Why use an ESP32 for this robot rather than an Arduino Uno, and when would you pick an RP2040 or an STM32?",
      a: "The Uno's ATmega328P runs at 16 MHz with 2 KB of RAM, 10-bit ADCs and no wireless, which is tight for odometry, PID and telemetry together. The ESP32 has two 240 MHz cores, 520 KB of SRAM, Wi-Fi and Bluetooth, and hardware pulse counters for the encoders, for a few dollars. I would pick an RP2040 when I need deterministic custom I/O from its PIO state machines, and an STM32 when I need advanced motor-control timers and a mature debugging workflow. For a robot that streams telemetry over Wi-Fi, the ESP32 is the natural fit.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "An ESP32 LEDC timer runs from an 80 MHz clock. What is the highest PWM resolution available at 20 kHz?",
      choices: ["8 bits", "10 bits", "11 bits", "16 bits"],
      answer: 2,
      explain:
        "80 MHz / 20 kHz = 4,000 clock ticks per period, so the counter can resolve at most 4,000 steps. 2^11 = 2,048 fits and 2^12 = 4,096 does not, so 11 bits is the limit. Higher PWM frequency always costs resolution.",
    },
    {
      q: "An MPU-6050 has the 7-bit address 0x68. Which byte does the master send to start a write?",
      choices: ["0x34", "0x68", "0xD1", "0xD0"],
      answer: 3,
      explain:
        "The address is shifted left one bit and the R/W bit appended: (0x68 << 1) | 0 = 0xD0 for a write and 0xD1 for a read. Mixing up the 7-bit and 8-bit forms is a classic cause of 'device not found'.",
    },
    {
      q: "Why is loop() { work(); delay(10); } not a 100 Hz control loop?",
      choices: [
        "The period is 10 ms plus however long work() takes, and it drifts",
        "delay() is inaccurate by up to 50%",
        "delay() disables interrupts",
        "loop() is limited to 50 Hz on an ESP32",
      ],
      answer: 0,
      explain:
        "delay(10) waits 10 ms after work() finishes, so 3 ms of work gives a 13 ms period (77 Hz) that changes whenever the work does. Schedule against a deadline instead: add 10 ms to the deadline each cycle and wait until micros() passes it.",
    },
    {
      q: "Which ESP32 ADC cannot be used while Wi-Fi is running?",
      choices: ["ADC1", "ADC2", "Both", "Neither"],
      answer: 1,
      explain:
        "The Wi-Fi driver takes over ADC2, so ADC2 pins return errors while Wi-Fi is active. Put analog sensors such as line sensors and the battery divider on ADC1 pins (GPIO 32-39).",
    },
    {
      q: "At 115200 baud with 8N1 framing, how many bytes per second can a UART carry?",
      choices: ["7,200", "9,600", "11,520", "14,400"],
      answer: 2,
      explain:
        "Each byte takes 10 bit times: a start bit, 8 data bits and a stop bit, so 115,200 / 10 = 11,520 bytes per second. An 80-character telemetry line therefore takes about 7 ms to send, most of a 10 ms control period.",
    },
    {
      q: "What should an encoder interrupt service routine do?",
      choices: [
        "Compute the wheel speed and run the PID",
        "Print the count to Serial for debugging",
        "Wait for the next edge to confirm the direction",
        "Read the other channel, update a volatile count and return",
      ],
      answer: 3,
      explain:
        "An ISR should take microseconds: read channel B (or the full AB state), increment or decrement a volatile counter, and return. Speed calculation and control belong in the fixed-rate loop, which copies the count atomically.",
    },
  ],
};

export default data;
