"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { RoundedArrow } from "@/components/viz/robotics/RoundedArrow";
import { WiringDiagram } from "@/components/viz/robotics/WiringDiagram";

function Box({ x, y, w, h, title, lines = [], color = vizColors.muted }: { x: number; y: number; w: number; h: number; title: string; lines?: string[]; color?: string }) {
  const top = y + h / 2 - (lines.length * 13) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={vizColors.grid} fillOpacity={0.55} stroke={color} strokeWidth={1.5} />
      <Label x={x + w / 2} y={top} size={12} bold>
        {title}
      </Label>
      {lines.map((l, i) => (
        <Label key={l} x={x + w / 2} y={top + 14 + i * 13} size={10} color={vizColors.muted}>
          {l}
        </Label>
      ))}
    </g>
  );
}

function Ground({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={vizColors.muted} strokeWidth={1.5}>
      <line x1={x} y1={y} x2={x} y2={y + 10} />
      <line x1={x - 9} y1={y + 10} x2={x + 9} y2={y + 10} />
      <line x1={x - 6} y1={y + 14} x2={x + 6} y2={y + 14} />
      <line x1={x - 3} y1={y + 18} x2={x + 3} y2={y + 18} />
    </g>
  );
}

function Cap({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 10} stroke={vizColors.text} strokeWidth={1.2} />
      <line x1={x - 8} y1={y + 10} x2={x + 8} y2={y + 10} stroke={vizColors.text} strokeWidth={2} />
      <path d={`M ${x - 8} ${y + 16} Q ${x} ${y + 12} ${x + 8} ${y + 16}`} fill="none" stroke={vizColors.text} strokeWidth={2} />
      <line x1={x} y1={y + 14} x2={x} y2={y + 22} stroke={vizColors.text} strokeWidth={1.2} />
      {label && (
        <Label x={x + 12} y={y + 13} anchor="start" size={10} color={vizColors.muted}>
          {label}
        </Label>
      )}
    </g>
  );
}

function PowerFigure() {
  return (
    <SvgCanvas viewBox="0 0 720 360" title="Power architecture and wiring overview: pack, switch and fuse, motor branch through the TB6612, logic branch through the 5 V buck and the ESP32's 3.3 V regulator">
      <rect x={0} y={0} width={720} height={360} rx={10} fill={vizColors.bg} />

      <Box x={16} y={150} w={112} h={60} title="2S 18650 pack" lines={["6.0-8.4 V", "7.4 V nominal"]} color={vizColors.orange} />
      <Box x={160} y={150} w={100} h={60} title="Switch" lines={["+ 3 A fuse"]} color={vizColors.orange} />
      <line x1={128} y1={180} x2={160} y2={180} stroke={vizColors.orange} strokeWidth={3} />

      {/* motor branch */}
      <path d="M 260 165 L 290 165 L 290 62 L 400 62" fill="none" stroke={vizColors.orange} strokeWidth={3} />
      <Label x={392} y={48} anchor="end" size={11} color={vizColors.orange}>
        VM, up to 2 A peaks
      </Label>
      <Cap x={340} y={62} label="470 µF" />
      <Box x={400} y={32} w={120} h={60} title="TB6612FNG" lines={["2 × H-bridge", "1.2 A per channel"]} color={vizColors.violet} />
      <Box x={570} y={14} w={130} h={36} title="Left N20 motor" color={vizColors.blue} />
      <Box x={570} y={74} w={130} h={36} title="Right N20 motor" color={vizColors.blue} />
      <RoundedArrow x1={520} y1={52} x2={568} y2={32} color={vizColors.blue} width={2} />
      <RoundedArrow x1={520} y1={72} x2={568} y2={92} color={vizColors.blue} width={2} />

      {/* logic branch */}
      <path d="M 260 195 L 300 195" fill="none" stroke={vizColors.orange} strokeWidth={3} />
      <Box x={300} y={168} w={104} h={56} title="5 V buck" lines={["3 A, ~90% efficient"]} color={vizColors.red} />
      <path d="M 404 196 L 460 196" fill="none" stroke={vizColors.red} strokeWidth={3} />
      <Label x={432} y={182} size={11} color={vizColors.red}>
        5 V, ≤ 1 A
      </Label>
      <Cap x={442} y={196} />
      <Label x={440} y={238} size={10} color={vizColors.muted}>
        220 µF
      </Label>
      <Box x={460} y={160} w={124} h={72} title="ESP32 DevKitC" lines={["5V pin → AMS1117", "LDO → 3.3 V"]} color={vizColors.cyan} />
      <path d="M 414 196 L 414 300 L 460 300" fill="none" stroke={vizColors.red} strokeWidth={2.5} />
      <Box x={460} y={280} w={124} h={40} title="SG90 + HC-SR04" lines={["5 V loads"]} color={vizColors.red} />
      <path d="M 584 196 L 606 196" fill="none" stroke={vizColors.amber} strokeWidth={3} />
      <Box x={606} y={150} w={102} h={92} title="3.3 V loads" lines={["driver logic", "2 encoders", "2 line sensors", "≈ 0.15 A"]} color={vizColors.amber} />

      {/* signal bundles */}
      <RoundedArrow x1={492} y1={158} x2={492} y2={94} color={vizColors.violet} width={4} head={10} />
      <Label x={486} y={128} anchor="end" size={10} color={vizColors.violet}>
        7 control lines
      </Label>
      <path d="M 640 110 L 640 132 L 560 132 L 560 156" fill="none" stroke={vizColors.green} strokeWidth={4} />
      <RoundedArrow x1={560} y1={140} x2={560} y2={158} color={vizColors.green} width={4} head={10} />
      <Label x={552} y={146} anchor="end" size={10} color={vizColors.green}>
        4 encoder lines
      </Label>

      {/* grounds */}
      <Ground x={72} y={210} />
      <Ground x={352} y={224} />
      <Ground x={522} y={320} />
      <Ground x={657} y={242} />
      <Ground x={415} y={92} />
      <Label x={16} y={300} anchor="start" size={11} color={vizColors.muted}>
        Every ground symbol is one net, joined at a star point at the pack minus.
      </Label>
      <Label x={16} y={318} anchor="start" size={11} color={vizColors.muted}>
        Motor return current goes straight back to the pack, not through the ESP32.
      </Label>
      <Label x={16} y={340} anchor="start" size={11} color={vizColors.orange}>
        Never feed the ESP32&apos;s 5V pin from the buck and USB at the same time.
      </Label>
    </SvgCanvas>
  );
}

const sketch = String.raw`// Hardware Academy course robot
// ESP32 DevKitC + TB6612FNG + 2x N20 encoder gearmotors + HC-SR04 on an SG90 + 2x TCRT5000.
// Arduino-ESP32 core 3.x (ledcAttach / ledcWrite take a pin). On core 2.x use ledcSetup + ledcAttachPin.
// Serial commands at 115200 baud: g = obstacle avoidance, l = line following, s = stop.

#include <Arduino.h>
#include <esp_system.h>

// ---------- Pin map (matches the wiring diagram) ----------
constexpr uint8_t PIN_PWMA = 25, PIN_AIN1 = 26, PIN_AIN2 = 27;  // left motor
constexpr uint8_t PIN_PWMB = 13, PIN_BIN1 = 4, PIN_BIN2 = 16;   // right motor
constexpr uint8_t PIN_STBY = 17;                                // 10k pull-down to GND
constexpr uint8_t PIN_ENC_LA = 18, PIN_ENC_LB = 19;
constexpr uint8_t PIN_ENC_RA = 32, PIN_ENC_RB = 33;
constexpr uint8_t PIN_TRIG = 14, PIN_ECHO = 34;                 // ECHO through 1k/2k divider
constexpr uint8_t PIN_SERVO = 23;
constexpr uint8_t PIN_LINE_L = 36, PIN_LINE_R = 39;             // ADC1, safe with Wi-Fi on
constexpr uint8_t PIN_VBAT = 35;                                // 100k/47k divider from the pack

// ---------- Robot constants ----------
constexpr float WHEEL_DIAMETER_MM = 43.0f;
constexpr float TICKS_PER_REV = 1050.0f;          // 7 pulses per motor turn x 150:1 (rising edges of A)
constexpr float MM_PER_TICK = PI * WHEEL_DIAMETER_MM / TICKS_PER_REV;  // 0.1287 mm
constexpr float WHEEL_BASE_MM = 120.0f;           // calibrate with a square test
constexpr float MAX_SPEED_MM_S = 225.0f;          // 100 rpm x pi x 43 mm / 60 at 6 V
constexpr float MOTOR_RATED_V = 6.0f;
constexpr float VBAT_DIVIDER = 147.0f / 47.0f;
constexpr float VBAT_CUTOFF = 6.4f;               // 3.2 V per cell
constexpr uint32_t PWM_FREQ = 20000;              // 20 kHz: above hearing
constexpr uint8_t PWM_BITS = 10;                  // duty 0..1023
constexpr uint32_t LOOP_US = 10000;               // 100 Hz control loop
constexpr uint32_t PING_MS = 60;                  // HC-SR04 needs ~60 ms between pings
constexpr uint32_t TELEMETRY_MS = 100;            // 10 Hz
constexpr int LINE_THRESHOLD = 2000;              // 12-bit ADC: calibrate on your floor and tape

// ---------- Motor: one TB6612 channel ----------
class Motor {
 public:
  Motor(uint8_t pwm, uint8_t in1, uint8_t in2, bool reversed)
      : pwm_(pwm), in1_(in1), in2_(in2), reversed_(reversed) {}

  void begin() {
    pinMode(in1_, OUTPUT);
    pinMode(in2_, OUTPUT);
    ledcAttach(pwm_, PWM_FREQ, PWM_BITS);
    set(0.0f, 1.0f);
  }

  // cmd in -1..1; maxDuty (0..1) limits the average motor voltage to its rating
  void set(float cmd, float maxDuty) {
    cmd = constrain(cmd, -1.0f, 1.0f);
    if (reversed_) cmd = -cmd;
    const uint32_t duty = (uint32_t)(fabsf(cmd) * maxDuty * ((1 << PWM_BITS) - 1));
    if (duty == 0) {                                // IN1 = IN2 = LOW: coast
      digitalWrite(in1_, LOW);
      digitalWrite(in2_, LOW);
    } else {
      digitalWrite(in1_, cmd > 0 ? HIGH : LOW);
      digitalWrite(in2_, cmd > 0 ? LOW : HIGH);
    }
    ledcWrite(pwm_, duty);
  }

 private:
  uint8_t pwm_, in1_, in2_;
  bool reversed_;
};

Motor leftMotor(PIN_PWMA, PIN_AIN1, PIN_AIN2, false);
Motor rightMotor(PIN_PWMB, PIN_BIN1, PIN_BIN2, true);  // mounted mirrored

// ---------- Encoders: interrupt on A, direction from B ----------
volatile int32_t ticksL = 0, ticksR = 0;
portMUX_TYPE encMux = portMUX_INITIALIZER_UNLOCKED;

void IRAM_ATTR isrLeft() {
  portENTER_CRITICAL_ISR(&encMux);
  ticksL += digitalRead(PIN_ENC_LB) ? -1 : 1;
  portEXIT_CRITICAL_ISR(&encMux);
}

void IRAM_ATTR isrRight() {
  portENTER_CRITICAL_ISR(&encMux);
  ticksR += digitalRead(PIN_ENC_RB) ? 1 : -1;      // mirrored motor counts the other way
  portEXIT_CRITICAL_ISR(&encMux);
}

void readTicks(int32_t &l, int32_t &r) {
  portENTER_CRITICAL(&encMux);
  l = ticksL;
  r = ticksR;
  portEXIT_CRITICAL(&encMux);
}

// ---------- Ultrasonic: non-blocking echo timing ----------
volatile uint32_t echoStartUs = 0, echoWidthUs = 0;
volatile bool echoReady = false;
float distanceCm = -1.0f;                           // -1 = unknown
uint32_t lastEchoMs = 0;

void IRAM_ATTR isrEcho() {
  const uint32_t now = micros();
  if (digitalRead(PIN_ECHO)) {
    echoStartUs = now;
  } else {
    echoWidthUs = now - echoStartUs;
    echoReady = true;
  }
}

void startPing() {
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
}

void updateDistance() {
  if (echoReady) {
    echoReady = false;
    const uint32_t w = echoWidthUs;
    distanceCm = (w > 0 && w < 23200) ? w / 58.0f : 400.0f;  // 58 us per cm; no echo = beyond 4 m
    lastEchoMs = millis();
  }
  if (millis() - lastEchoMs > 250) distanceCm = -1.0f;      // sensor silent: unknown, not free
}

// ---------- Servo on LEDC: 50 Hz, 14-bit ----------
void servoWriteDeg(float deg) {
  deg = constrain(deg, 0.0f, 180.0f);
  const float us = 500.0f + deg * (1900.0f / 180.0f);       // 0.5 to 2.4 ms
  ledcWrite(PIN_SERVO, (uint32_t)(us / 20000.0f * 16383.0f));
}

// ---------- Line sensors and battery ----------
int lineRawL = 0, lineRawR = 0;
bool onLineL = false, onLineR = false;
float vbat = 8.0f;

void readSensors() {
  lineRawL = analogRead(PIN_LINE_L);                         // higher over black tape
  lineRawR = analogRead(PIN_LINE_R);
  onLineL = lineRawL > LINE_THRESHOLD;
  onLineR = lineRawR > LINE_THRESHOLD;
  const float v = analogReadMilliVolts(PIN_VBAT) / 1000.0f * VBAT_DIVIDER;
  vbat = 0.95f * vbat + 0.05f * v;                           // low-pass: motor current makes it noisy
}

// ---------- Odometry and wheel speed ----------
float poseX = 0, poseY = 0, poseTh = 0;                      // mm, mm, rad
float speedL = 0, speedR = 0;                                // mm/s
int32_t lastTicksL = 0, lastTicksR = 0;

void updateOdometry(float dt) {
  int32_t l, r;
  readTicks(l, r);
  const float dsL = (l - lastTicksL) * MM_PER_TICK;
  const float dsR = (r - lastTicksR) * MM_PER_TICK;
  lastTicksL = l;
  lastTicksR = r;
  speedL = 0.7f * speedL + 0.3f * (dsL / dt);                // ~17 ticks per 10 ms at full speed
  speedR = 0.7f * speedR + 0.3f * (dsR / dt);
  const float ds = 0.5f * (dsL + dsR);
  const float dth = (dsR - dsL) / WHEEL_BASE_MM;
  poseX += ds * cosf(poseTh + 0.5f * dth);
  poseY += ds * sinf(poseTh + 0.5f * dth);
  poseTh = atan2f(sinf(poseTh + dth), cosf(poseTh + dth));
}

// ---------- Per-wheel speed loop: feedforward + PI ----------
struct SpeedPI {
  float kp = 0.002f;                                         // command per mm/s of error
  float ki = 0.010f;                                         // command per (mm/s x s)
  float integral = 0;
  float update(float target, float measured, float dt) {
    if (target == 0.0f) { integral = 0; return 0.0f; }       // stop means stop
    const float err = target - measured;
    integral = constrain(integral + err * dt, -40.0f, 40.0f);  // anti-windup: |ki x integral| <= 0.4
    return target / MAX_SPEED_MM_S + kp * err + ki * integral;
  }
};
SpeedPI piL, piR;

// ---------- Behaviors ----------
enum class Mode { STOPPED, AVOID, LINE };
enum class AvoidState { CRUISE, LOOK, TURN };
Mode mode = Mode::STOPPED;
AvoidState avoidState = AvoidState::CRUISE;
uint32_t stateSinceMs = 0;
float lookLeftCm = 0, lookRightCm = 0, turnStartTh = 0, turnTarget = 0;
float lastLineSide = 1;                                      // +1: line last seen on the left
uint32_t lineSeenMs = 0;

void setAvoidState(AvoidState s) {
  avoidState = s;
  stateSinceMs = millis();
}

// Each behavior writes target wheel speeds in mm/s.
void obstacleAvoid(float &vL, float &vR) {
  const uint32_t inState = millis() - stateSinceMs;
  switch (avoidState) {
    case AvoidState::CRUISE: {
      servoWriteDeg(90);
      if (distanceCm < 0.0f) {                               // sonar silent: never drive blind
        vL = vR = 0;
        return;
      }
      if (distanceCm < 25.0f) {                              // obstacle: stop and look around
        setAvoidState(AvoidState::LOOK);
        vL = vR = 0;
        return;
      }
      const float k = constrain((distanceCm - 25.0f) / 55.0f, 0.3f, 1.0f);  // slow down near things
      vL = vR = 160.0f * k;
      return;
    }
    case AvoidState::LOOK:                                   // stop, look left, look right
      vL = vR = 0;
      if (inState < 450) {
        servoWriteDeg(160);
        lookLeftCm = distanceCm;                             // last reading before 450 ms wins
      } else if (inState < 900) {
        servoWriteDeg(20);
        lookRightCm = distanceCm;
      } else {
        servoWriteDeg(90);
        turnStartTh = poseTh;
        turnTarget = (lookLeftCm >= lookRightCm ? 1.0f : -1.0f) * HALF_PI;   // + = turn left
        setAvoidState(AvoidState::TURN);
      }
      return;
    case AvoidState::TURN: {
      const float turned = atan2f(sinf(poseTh - turnStartTh), cosf(poseTh - turnStartTh));
      if (fabsf(turned) >= 0.95f * fabsf(turnTarget) || inState > 2500) {   // done, or timed out
        setAvoidState(AvoidState::CRUISE);
        vL = vR = 0;
        return;
      }
      const float s = turnTarget > 0 ? 1.0f : -1.0f;
      vL = -s * 90.0f;                                       // spin in place
      vR = s * 90.0f;
      return;
    }
  }
}

void lineFollow(float &vL, float &vR) {
  // The sensors sit side by side about 14 mm apart: both over 19 mm tape when centered.
  if (onLineL && !onLineR) lastLineSide = 1;
  if (onLineR && !onLineL) lastLineSide = -1;
  if (onLineL || onLineR) {
    lineSeenMs = millis();
    const float e = (onLineL ? 1.0f : 0.0f) - (onLineR ? 1.0f : 0.0f);  // +1: steer left
    vL = 120.0f - 70.0f * e;
    vR = 120.0f + 70.0f * e;
  } else if (millis() - lineSeenMs < 3000) {
    vL = -60.0f * lastLineSide;                              // spin toward the last-seen side
    vR = 60.0f * lastLineSide;
  } else {
    vL = vR = 0;                                             // give up after 3 s
  }
  if (distanceCm >= 0.0f && distanceCm < 15.0f) vL = vR = 0;  // never drive into something
}

// ---------- 100 Hz control step ----------
float cmdL = 0, cmdR = 0;

void controlStep(float dt) {
  updateOdometry(dt);
  readSensors();
  if (vbat < VBAT_CUTOFF && mode != Mode::STOPPED) {
    mode = Mode::STOPPED;
    Serial.println("battery low: stopped");
  }
  float vL = 0, vR = 0;
  if (mode == Mode::AVOID) obstacleAvoid(vL, vR);
  if (mode == Mode::LINE) lineFollow(vL, vR);
  cmdL = piL.update(vL, speedL, dt);
  cmdR = piR.update(vR, speedR, dt);
  const float maxDuty = min(1.0f, MOTOR_RATED_V / max(vbat, 1.0f));  // 71% on a full pack
  leftMotor.set(cmdL, maxDuty);
  rightMotor.set(cmdR, maxDuty);
}

// ---------- Serial commands and telemetry ----------
void handleSerial() {
  while (Serial.available()) {
    switch (Serial.read()) {
      case 'g': mode = Mode::AVOID; setAvoidState(AvoidState::CRUISE); break;
      case 'l': mode = Mode::LINE; lineSeenMs = millis(); break;
      case 's': mode = Mode::STOPPED; break;
      default: break;
    }
  }
}

void printTelemetry() {
  int32_t l, r;
  readTicks(l, r);
  // CSV: t_ms,mode,vbat,ticksL,ticksR,speedL,speedR,x_mm,y_mm,theta_deg,dist_cm,lineL,lineR,cmdL,cmdR
  Serial.printf("%lu,%d,%.2f,%ld,%ld,%.0f,%.0f,%.0f,%.0f,%.1f,%.1f,%d,%d,%.2f,%.2f\n",
                (unsigned long)millis(), (int)mode, vbat, (long)l, (long)r, speedL, speedR,
                poseX, poseY, poseTh * RAD_TO_DEG, distanceCm, lineRawL, lineRawR, cmdL, cmdR);
}

// ---------- setup and loop ----------
uint32_t lastLoopUs = 0, lastPingMs = 0, lastTelemetryMs = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_STBY, OUTPUT);
  digitalWrite(PIN_STBY, LOW);                               // driver off until everything is set up

  leftMotor.begin();
  rightMotor.begin();

  pinMode(PIN_ENC_LA, INPUT_PULLUP);
  pinMode(PIN_ENC_LB, INPUT_PULLUP);
  pinMode(PIN_ENC_RA, INPUT_PULLUP);
  pinMode(PIN_ENC_RB, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_LA), isrLeft, RISING);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_RA), isrRight, RISING);

  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_ECHO, INPUT);                                  // GPIO 34 is input-only, no pull-up
  attachInterrupt(digitalPinToInterrupt(PIN_ECHO), isrEcho, CHANGE);

  ledcAttach(PIN_SERVO, 50, 14);
  servoWriteDeg(90);

  vbat = analogReadMilliVolts(PIN_VBAT) / 1000.0f * VBAT_DIVIDER;
  Serial.printf("reset reason: %s, battery %.2f V\n",
                esp_reset_reason() == ESP_RST_BROWNOUT ? "BROWNOUT" : "normal", vbat);

  digitalWrite(PIN_STBY, HIGH);                              // H-bridges live, duty still zero
  lastLoopUs = micros();
  Serial.println("ready: g = obstacle avoid, l = line follow, s = stop");
}

void loop() {
  handleSerial();
  updateDistance();
  const uint32_t nowMs = millis();
  if (nowMs - lastPingMs >= PING_MS) {
    lastPingMs = nowMs;
    startPing();
  }
  if (micros() - lastLoopUs >= LOOP_US) {                    // fixed 100 Hz, no delay() anywhere
    lastLoopUs += LOOP_US;
    controlStep(LOOP_US / 1e6f);
  }
  if (nowMs - lastTelemetryMs >= TELEMETRY_MS) {
    lastTelemetryMs = nowMs;
    printTelemetry();
  }
}`;

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="What you are building">
        <Prose>
          <p>
            The course robot is a 2-wheel differential-drive platform about 15 cm across: an ESP32 for the brain, a TB6612FNG
            dual H-bridge for the muscles, two N20 gearmotors with magnetic encoders for odometry, an HC-SR04 ultrasonic ranger on an
            SG90 servo so it can look left and right, and two TCRT5000 reflectance sensors for line following. It runs from two 18650
            Li-ion cells. Every part is a commodity module, the total is about $55, and the firmware below runs obstacle avoidance
            and line following out of the box. It is also the robot the simulator lab models, so behaviors you prototype there carry
            over.
          </p>

          <h3>Bill of materials</h3>
          <table>
            <thead>
              <tr>
                <th>Part</th>
                <th>Qty</th>
                <th>Approx. price</th>
                <th>Why this one</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ESP32 DevKitC (ESP32-WROOM-32E)</td>
                <td>1</td>
                <td>$8</td>
                <td>Dual-core 240 MHz, Wi-Fi and Bluetooth, 16 PWM channels, PCNT encoder counters. 3.3 V logic, not 5 V tolerant.</td>
              </tr>
              <tr>
                <td>TB6612FNG dual motor driver breakout</td>
                <td>1</td>
                <td>$4</td>
                <td>MOSFET bridges: 1.2 A continuous per channel, about 0.5 V drop at 1 A versus about 2 V for an L298N.</td>
              </tr>
              <tr>
                <td>N20 gearmotor, 6 V, 100 rpm, with magnetic encoder</td>
                <td>2</td>
                <td>$10 for the pair</td>
                <td>150:1 gearbox, 7 encoder pulses per motor turn, so 1050 per wheel turn per channel.</td>
              </tr>
              <tr>
                <td>HC-SR04 ultrasonic ranger</td>
                <td>1</td>
                <td>$2</td>
                <td>2 to 400 cm, 5 V supply. The datasheet quotes a 15° measuring angle; in practice the beam is roughly 30° wide.</td>
              </tr>
              <tr>
                <td>SG90 micro servo with sonar bracket</td>
                <td>1</td>
                <td>$3</td>
                <td>Pans the sonar 140° so the robot can choose the open side.</td>
              </tr>
              <tr>
                <td>TCRT5000 reflectance module</td>
                <td>2</td>
                <td>$2</td>
                <td>IR LED plus phototransistor; use the analog output for a proportional reading.</td>
              </tr>
              <tr>
                <td>2 × 18650 cells (protected) with 2S holder, plus 5 V 3 A buck module</td>
                <td>1 set</td>
                <td>$10</td>
                <td>7.4 V nominal pack; the buck makes the logic rail.</td>
              </tr>
              <tr>
                <td>Chassis plate, 43 mm wheels, ball caster, motor brackets, standoffs</td>
                <td>1 set</td>
                <td>$10</td>
                <td>Acrylic kit or a 3D-printed plate; 120 mm between wheel centers.</td>
              </tr>
              <tr>
                <td>Rocker switch, 3 A fuse, 470 µF and 220 µF capacitors, resistors (1 k, 2 k, 10 k, 47 k, 100 k), wire, headers</td>
                <td>1 set</td>
                <td>$5</td>
                <td>The parts that make it reliable instead of flaky.</td>
              </tr>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td></td>
                <td>
                  <strong>about $54</strong>
                </td>
                <td>Plus a 2S balance charger (about $15) if you do not have one.</td>
              </tr>
            </tbody>
          </table>

          <h3>Power architecture</h3>
          <p>
            Two rails, one ground. The <strong>motor branch</strong> runs straight from the pack (6.0 to 8.4 V) through the switch and
            a 3 A fuse into the TB6612&apos;s VM pin, with a 470 µF capacitor at the driver to absorb start-up spikes of up to 2 A. The{" "}
            <strong>logic branch</strong> goes through a 5 V buck converter into the ESP32&apos;s 5V pin; the board&apos;s AMS1117
            regulator then makes 3.3 V for the chip, the driver&apos;s logic, the encoders and the line sensors. The servo and the
            sonar hang off 5 V. Budget the 5 V rail for the worst moment, not the average: ESP32 Wi-Fi bursts of about 0.4 A, a
            stalled servo at about 0.65 A and the sonar together approach 1 A, which is why the buck is a 3 A part. All grounds join
            at one point at the pack&apos;s negative terminal.
          </p>
          <p>
            Two firmware rules protect the hardware. The N20s are 6 V motors on a pack that reaches 8.4 V, so the PWM duty is capped
            at 6.0 V divided by the measured pack voltage (71% when full). And a 100 kΩ / 47 kΩ divider lets the ESP32 read the pack,
            so the firmware stops the motors at 6.4 V (3.2 V per cell) before the cells are damaged.
          </p>

          <h3>Pin map</h3>
          <table>
            <thead>
              <tr>
                <th>Signal</th>
                <th>ESP32 pin</th>
                <th>Connects to</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Left motor PWM, AIN1, AIN2</td>
                <td>GPIO 25, 26, 27</td>
                <td>TB6612 PWMA, AIN1, AIN2</td>
                <td>20 kHz, 10-bit LEDC</td>
              </tr>
              <tr>
                <td>Right motor PWM, BIN1, BIN2</td>
                <td>GPIO 13, 4, 16</td>
                <td>TB6612 PWMB, BIN1, BIN2</td>
                <td>Right motor mirrored: sign flipped in firmware</td>
              </tr>
              <tr>
                <td>Driver standby</td>
                <td>GPIO 17</td>
                <td>TB6612 STBY</td>
                <td>10 kΩ pull-down: motors off during boot</td>
              </tr>
              <tr>
                <td>Left encoder A, B</td>
                <td>GPIO 18, 19</td>
                <td>Left motor C1, C2</td>
                <td>Interrupt on A rising; encoder powered at 3.3 V</td>
              </tr>
              <tr>
                <td>Right encoder A, B</td>
                <td>GPIO 32, 33</td>
                <td>Right motor C1, C2</td>
                <td>Internal pull-ups enabled</td>
              </tr>
              <tr>
                <td>Sonar trigger</td>
                <td>GPIO 14</td>
                <td>HC-SR04 Trig</td>
                <td>3.3 V is enough to trigger</td>
              </tr>
              <tr>
                <td>Sonar echo</td>
                <td>GPIO 34</td>
                <td>HC-SR04 Echo via 1 kΩ / 2 kΩ</td>
                <td>Divider makes 3.33 V; input-only pin</td>
              </tr>
              <tr>
                <td>Servo signal</td>
                <td>GPIO 23</td>
                <td>SG90 orange wire</td>
                <td>50 Hz, 0.5 to 2.4 ms</td>
              </tr>
              <tr>
                <td>Line sensors left, right</td>
                <td>GPIO 36 (VP), 39 (VN)</td>
                <td>TCRT5000 AO</td>
                <td>ADC1: still readable with Wi-Fi on</td>
              </tr>
              <tr>
                <td>Battery sense</td>
                <td>GPIO 35</td>
                <td>100 kΩ / 47 kΩ divider after the switch</td>
                <td>2.69 V at 8.4 V</td>
              </tr>
              <tr>
                <td>Spare: I²C for an IMU</td>
                <td>GPIO 21 (SDA), 22 (SCL)</td>
                <td>MPU-6050 or BNO055</td>
                <td>Kept free for the upgrade</td>
              </tr>
            </tbody>
          </table>

          <h3>Mechanical assembly</h3>
          <ol>
            <li>Bolt the motor brackets to the plate so the shafts are coaxial; aim for 120 mm between tire centers and measure it.</li>
            <li>Press the wheels onto the D-shafts and fit the ball caster at the rear so the plate sits level.</li>
            <li>Mount the 2S holder low and between the wheels: the pack is the heaviest part and belongs over the drive axle.</li>
            <li>Stand the ESP32 and the TB6612 on a half-size breadboard or perfboard on standoffs; twist each pair of motor leads.</li>
            <li>Mount the servo at the front with the sonar about 8 cm above the floor so it does not see the floor.</li>
            <li>Mount the two TCRT5000 boards side by side about 14 mm apart, 3 to 5 mm above the floor, ahead of the axle.</li>
            <li>Label every wire, strain-relieve the pack leads, and keep encoder wires away from motor leads.</li>
          </ol>
        </Prose>
        <Figure caption="Power architecture and wiring overview. The motor branch takes raw pack voltage; the logic branch is regulated twice (buck to 5 V, LDO to 3.3 V). Bulk capacitors sit where the current spikes are.">
          <PowerFigure />
        </Figure>
      </Section>

      <Section id="viz" title="Interactive: trace every wire">
        <WiringDiagram />
      </Section>

      <Section id="firmware" title="Firmware: the full sketch">
        <Prose>
          <p>
            The sketch is one file with no libraries beyond the Arduino-ESP32 core. Its shape is the one you will reuse on every robot:
            interrupts collect fast events (encoder edges, the sonar echo), a fixed 100 Hz control step reads sensors, updates
            odometry, runs the active behavior and closes a speed loop per wheel, and telemetry goes out as CSV at 10 Hz so you can
            plot it. Nothing calls <code>delay()</code> or a blocking <code>pulseIn()</code>, so a missing echo can never stall the
            motors. Upload it with the Arduino IDE or PlatformIO (board: ESP32 Dev Module), open the serial monitor at 115200 baud and
            type <code>g</code> to start obstacle avoidance, <code>l</code> for line following, <code>s</code> to stop.
          </p>
        </Prose>
        <CodeBlock lang="cpp" title="robot.ino" code={sketch} />
      </Section>

      <Section id="bring-up" title="Bring-up, safety and upgrades">
        <Prose>
          <h3>Bring-up tests, in order</h3>
          <ol>
            <li>Unpowered: check for shorts between pack +, 5 V, 3.3 V and GND with a multimeter.</li>
            <li>Set the buck to 5.0 V with nothing on its output. Many modules ship at 12 V or more, which kills an ESP32 instantly.</li>
            <li>
              First power from a bench supply at 7.4 V with a 300 mA limit and the motors unplugged: expect 5.0 V, 3.3 V and roughly 80 to
              100 mA.
            </li>
            <li>Flash over USB with the 5 V jumper removed, so only USB powers the ESP32, and watch the &quot;ready&quot; line.</li>
            <li>Wheels off the ground: command each motor forward. Wrong direction: swap its leads. Counts going down: swap A and B.</li>
            <li>Sonar against a box at 20 cm and at 100 cm: readings within about 1 cm.</li>
            <li>Line sensors over tape and over floor: set LINE_THRESHOLD halfway between the two raw readings.</li>
            <li>Push the robot 1 m along a tape measure: expect about 7,770 ticks per wheel; correct the wheel diameter, then run a square test for the wheel base.</li>
            <li>Lower the bench supply to 6.3 V: the motors must stop and the log must say so.</li>
            <li>First autonomous run in a cardboard pen, at low speed, with a hand near the switch.</li>
          </ol>
        </Prose>
        <Callout kind="warning" title="Li-ion safety">
          <ul>
            <li>Use protected cells or a 2S protection board, and charge only with a 2S balance charger (CC/CV to 8.4 V). Never charge unattended.</li>
            <li>The whole steel can of an 18650 is the negative terminal. A torn wrapper near the positive cap is a dead short waiting to happen.</li>
            <li>Keep the firmware cutoff at 3.2 V per cell, store cells at about 3.7 V, and treat any &quot;9900 mAh&quot; 18650 as fake: real cells top out near 3500 mAh.</li>
            <li>A cell that is hot, swelling or smells sweet gets disconnected and moved outdoors onto concrete or sand.</li>
          </ul>
        </Callout>
        <Prose>
          <h3>Upgrades</h3>
          <ul>
            <li>
              <strong>ESP32-CAM</strong> (OV2640, about $8): stream video to a PC for object detection, or follow a line with a
              camera instead of two sensors.
            </li>
            <li>
              <strong>Lidar</strong>: a 360° unit such as the RPLIDAR A1 or LDROBOT LD06 (about $80 to $100, 12 m range) turns
              the robot into a mapping platform; a VL53L1X time-of-flight sensor is a cheap narrow-beam upgrade for the sonar.
            </li>
            <li>
              <strong>IMU</strong>: an MPU-6050 or BNO055 on GPIO 21 and 22 gives a gyro heading to fuse with odometry.
            </li>
            <li>
              <strong>micro-ROS</strong>: run a micro-ROS client on the ESP32 over Wi-Fi, publish odometry and range, subscribe to{" "}
              <code>/cmd_vel</code>, and drive the robot from ROS 2 tools on a laptop (lesson 28).
            </li>
            <li>
              <strong>Custom PCB</strong>: replace the breadboard with the motor-driver board from the KiCad walkthrough.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Build it: the checklist">
          <p>
            Build the robot and work down this checklist. Each line has a measurement that proves it is done; write your number next
            to the expected one and keep the sheet in your project notes.
          </p>
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Done when</th>
                <th>Expected value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Buck set</td>
                <td>Output measured with no load</td>
                <td>5.00 ± 0.05 V</td>
              </tr>
              <tr>
                <td>Logic rails</td>
                <td>3V3 pin measured with everything connected</td>
                <td>3.28 to 3.35 V</td>
              </tr>
              <tr>
                <td>Idle current</td>
                <td>Bench supply at 7.4 V, motors stopped, Wi-Fi off</td>
                <td>about 80 to 100 mA</td>
              </tr>
              <tr>
                <td>Encoders</td>
                <td>One wheel turned by hand exactly once</td>
                <td>1050 ± 5 ticks, positive when rolling forward</td>
              </tr>
              <tr>
                <td>Distance per tick</td>
                <td>Robot pushed 1.000 m</td>
                <td>about 7,770 ticks (0.1287 mm per tick)</td>
              </tr>
              <tr>
                <td>Top speed</td>
                <td>Both motors at the duty cap, wheels on the floor</td>
                <td>about 200 to 225 mm/s</td>
              </tr>
              <tr>
                <td>Sonar</td>
                <td>Box at 50 cm</td>
                <td>49 to 51 cm</td>
              </tr>
              <tr>
                <td>Battery cutoff</td>
                <td>Bench supply lowered to 6.3 V</td>
                <td>Motors stop, log prints &quot;battery low&quot;</td>
              </tr>
              <tr>
                <td>Autonomy</td>
                <td>Obstacle avoidance in a 1.5 m × 1.5 m pen with three boxes</td>
                <td>5 minutes without touching a box</td>
              </tr>
            </tbody>
          </table>
          <p>
            <strong>Worked answer: where the expected numbers come from.</strong> One wheel turn is 7 pulses per motor turn × 150 = 1050
            ticks. The wheel circumference is π × 43 mm = 135.1 mm, so 1 m is 1000 / 0.1287 ≈ 7,770 ticks. Top speed is 100 rpm ×
            135.1 mm / 60 s = 225 mm/s at the motor&apos;s rated 6 V, a little less under load. Idle current: about 100 mA at 3.3 V
            (ESP32 plus the two IR LEDs) is 0.5 W, which the buck delivers from 7.4 V at about 85% efficiency, so roughly 80 mA from the
            pack, plus a few milliamps for the servo and sonar. If a measurement is off by more than 10%, stop and find out why before
            moving on: every later step depends on the earlier ones.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
