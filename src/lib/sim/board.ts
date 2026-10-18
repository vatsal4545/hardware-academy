/**
 * Physics of the course robot's motor-driver board (the KiCad lesson's board, "Rev B" with a battery divider), for the
 * components-in-action lesson. Pure functions: one BoardInputs object in, SI numbers out, no rounding here. Only the EN
 * curve uses a transcendental function (exp) and its samples are rounded to 1e-6 so server and client markup agree.
 * Figures come from the course lessons and the parts' datasheets; each is named once in BOARD.
 */

export type LedColor = "red" | "green" | "blue";

export interface BoardInputs {
  /** pack voltage, 6.0 to 8.4 V for the 2S Li-ion pack */
  vPack: number;
  /** left motor current, A */
  iMotorL: number;
  /** right motor current, A */
  iMotorR: number;
  /** current drawn from the 3.3 V rail by the ESP32, sensors and driver logic, A */
  iLogic: number;
  ledColor: LedColor;
  /** R3, ohms */
  ledR: number;
  /** C8, farads */
  enC: number;
  /** distance from the decoupling capacitor to the pin, mm */
  decouplingMm: number;
  /** PWM duty on the left motor, 0 to 1 */
  duty: number;
  /** left motor direction */
  forward: boolean;
  /** C9 fitted at the ADC pin */
  dividerCap: boolean;
}

export const BOARD = {
  /** Q1 AO3401A with the full pack on its gate (datasheet: 50 mΩ max at −10 V, 65 mΩ at −4.5 V) */
  rdsOn: 0.05,
  /** the VM trace from Q1 to the TB6612FNG: route length and the KiCad lesson's 1.5 mm Motor net class, 1 oz copper */
  vmTraceMm: 13,
  vmTraceWidthMm: 1.5,
  copperRho: 1.68e-8, // Ω·m
  ozThicknessM: 35e-6,
  /** AMS1117-3.3 (Advanced Monolithic Systems datasheet): ground current about 5 mA; θJA 60 °C/W on a modest pad */
  ldoVout: 3.3,
  ldoIq: 0.005,
  ldoThetaJa: 60,
  ambientC: 25,
  shutdownC: 150,
  hotC: 100,
  buckEfficiency: 0.9,
  /** LED forward voltages at a few mA: red and yellow about 2.0 V, green 2.2 V, blue and white about 3.0 V */
  ledVf: { red: 2.0, green: 2.2, blue: 3.0 } as Record<LedColor, number>,
  /** an ESP32 pin at its default drive strength (ESP-IDF drive capability 2) is good for about 20 mA */
  gpioMaxA: 0.02,
  ledDimA: 0.001,
  /** battery divider (the robot firmware's 147/47 ratio) and the ADC it feeds */
  divR1: 100e3,
  divR2: 47e3,
  divC: 100e-9,
  adcCounts: 4095,
  adcVref: 3.3,
  /** a typical SAR input: a few picofarads sampled briefly; 12-bit settling takes ln(4096) ≈ 8.3 time constants */
  adcSampleF: 10e-12,
  adcSettleTaus: 8.3,
  adcRuleOhm: 10e3,
  /** EN (CHIP_PU): R2 10 kΩ to 3V3, C8 to ground; the ESP32 datasheet puts the high threshold at 0.75 × VDD */
  enR: 10e3,
  enThreshold: 0.75,
  ln4: 1.3862943611198906,
  /** decoupling: about 1 nH per mm of thin trace plus the capacitor's own ESL; a 50 mA step in 2 ns (integrity lesson) */
  nhPerMm: 1,
  capEslH: 0.5e-9,
  stepA: 0.05,
  stepS: 2e-9,
  railTolerance: 0.1,
  /** N20 motor winding: 4 Ω (actuators lesson) and about 1 mH, typical for a 12 mm brushed motor; 20 kHz PWM */
  motorR: 4,
  motorL: 1e-3,
  pwmHz: 20e3,
  /** µ0 / 2π: the field a distance r from a long straight wire is (µ0 / 2π) · I / r */
  mu0Over2Pi: 2e-7,
  fieldAtM: 0.005,
  earthFieldT: 50e-6,
  /** flyback example: the current falls from 1 A to zero in 100 ns */
  flybackDiA: 1,
  flybackDtS: 100e-9,
  diodeDropV: 0.7,
  /** TB6612FNG: about 0.5 V at 1 A per channel, modelled as 0.5 Ω */
  driverOhm: 0.5,
  /** start-up step used for the bulk-capacitor droop figure */
  startStepA: 1.5,
  startStepS: 10e-6,
  bulkF: 100e-6,
} as const;

export const BOARD_DEFAULTS: BoardInputs = {
  vPack: 7.4,
  iMotorL: 0.5,
  iMotorR: 0.5,
  iLogic: 0.15,
  ledColor: "red",
  ledR: 1000,
  enC: 1e-6,
  decouplingMm: 2,
  duty: 0.6,
  forward: true,
  dividerCap: true,
};

/** Resistance of a copper trace, ohms. */
export function traceResistance(lengthMm: number, widthMm: number, ozCopper = 1): number {
  return (BOARD.copperRho * lengthMm * 1e-3) / (widthMm * 1e-3 * BOARD.ozThicknessM * ozCopper);
}

/** Station 2: the currents that meet at the VM node. */
export function kclStation(i: BoardInputs) {
  const iMotors = i.iMotorL + i.iMotorR;
  const iLdoIn = i.iLogic + BOARD.ldoIq;
  return { iMotors, iLdoIn, iPack: iMotors + iLdoIn, droopV: (BOARD.startStepA * BOARD.startStepS) / BOARD.bulkF };
}

/** Station 1: the pack current (the same sum as the KCL station, so the two readouts agree to the last bit) through Q1 and along the VM trace. */
export function fetStation(i: BoardInputs) {
  const { iPack } = kclStation(i);
  const rTrace = traceResistance(BOARD.vmTraceMm, BOARD.vmTraceWidthMm);
  return { iPack, vFet: iPack * BOARD.rdsOn, pFet: iPack * iPack * BOARD.rdsOn, rTrace, vTrace: iPack * rTrace };
}

export type LdoVerdict = "fine" | "hot" | "shutdown";

/** Station 3: the regulator turns the voltage difference into heat. */
export function ldoStation(i: BoardInputs) {
  const pLdo = (i.vPack - BOARD.ldoVout) * i.iLogic + i.vPack * BOARD.ldoIq;
  const tj = BOARD.ambientC + BOARD.ldoThetaJa * pLdo;
  const verdict: LdoVerdict = tj >= BOARD.shutdownC ? "shutdown" : tj >= BOARD.hotC ? "hot" : "fine";
  const pBuck = BOARD.ldoVout * i.iLogic * (1 / BOARD.buckEfficiency - 1);
  return { pLdo, tj, verdict, pBuck };
}

export type LedVerdict = "dim" | "ok" | "too much";

/** Station 4: KVL around GPIO, R3, D1 and ground. */
export function ledStation(i: BoardInputs) {
  const vf = BOARD.ledVf[i.ledColor];
  const iLed = Math.max(0, (BOARD.ldoVout - vf) / i.ledR);
  const verdict: LedVerdict = iLed > BOARD.gpioMaxA ? "too much" : iLed < BOARD.ledDimA ? "dim" : "ok";
  return {
    vf,
    iLed,
    pR: iLed * iLed * i.ledR,
    verdict,
    kvl: { rise: BOARD.ldoVout, dropR: iLed * i.ledR, dropLed: iLed > 0 ? vf : BOARD.ldoVout },
  };
}

export type DividerVerdict = "ok" | "loaded";

/** Station 5: the battery divider as the ADC sees it. */
export function dividerStation(i: BoardInputs) {
  const vOut = (i.vPack * BOARD.divR2) / (BOARD.divR1 + BOARD.divR2);
  const rth = (BOARD.divR1 * BOARD.divR2) / (BOARD.divR1 + BOARD.divR2);
  const iDiv = i.vPack / (BOARD.divR1 + BOARD.divR2);
  const counts = Math.round((vOut / BOARD.adcVref) * BOARD.adcCounts);
  const settleUs = BOARD.adcSettleTaus * rth * BOARD.adcSampleF * 1e6;
  const rechargeMs = rth * BOARD.divC * 1e3;
  const verdict: DividerVerdict = i.dividerCap || rth <= BOARD.adcRuleOhm ? "ok" : "loaded";
  return { vOut, rth, iDiv, counts, settleUs, rechargeMs, verdict };
}

const EN_SAMPLES = 40;

/** Station 6: EN charges through R2 into C8. The curve is sampled in units of τ, so it is the same shape for every C8. */
export function enStation(i: BoardInputs) {
  const tau = BOARD.enR * i.enC;
  const vdd = BOARD.ldoVout;
  const samples = Array.from({ length: EN_SAMPLES + 1 }, (_, k) => {
    const v = vdd * (1 - Math.exp(-(5 * k) / EN_SAMPLES));
    return Math.round(v * 1e6) / 1e6 + 0;
  });
  return { tau, tBoot: tau * BOARD.ln4, threshold: vdd * BOARD.enThreshold, samples };
}

export type DecouplingVerdict = "ok" | "marginal" | "bad";

/** Station 7: the loop from pin to capacitor and back is an inductor; a current step across it is a voltage dip. */
export function decouplingStation(i: BoardInputs) {
  const loopH = BOARD.nhPerMm * 1e-9 * i.decouplingMm + BOARD.capEslH;
  const vDip = (loopH * BOARD.stepA) / BOARD.stepS;
  const budget = BOARD.ldoVout * BOARD.railTolerance;
  const verdict: DecouplingVerdict = vDip <= budget / 2 ? "ok" : vDip <= budget ? "marginal" : "bad";
  return { loopH, vDip, budget, verdict };
}

/** The VM node the bridge switches: the pack minus Q1's on-state drop. One expression, so every reading of VM agrees to the last bit. */
function vmVoltage(i: BoardInputs): number {
  return i.vPack - fetStation(i).vFet;
}

/**
 * Station 8: current in the winding makes a field, ripple and, when switched off, a flyback the body diodes catch. The
 * bridge switches VM, not the pack, so the average voltage, the ripple and the clamp all start from VM: the multimeter on
 * M1A reads duty × VM, and the station shows the same number.
 */
export function windingStation(i: BoardInputs) {
  const iAvg = i.iMotorL;
  const vm = vmVoltage(i);
  const bTraceT = (BOARD.mu0Over2Pi * iAvg) / BOARD.fieldAtM;
  return {
    iAvg,
    vAvg: i.duty * vm,
    rippleA: (vm * i.duty * (1 - i.duty)) / (BOARD.motorL * BOARD.pwmHz),
    bTraceUt: bTraceT * 1e6,
    earthRatio: bTraceT / BOARD.earthFieldT,
    flybackV: (BOARD.motorL * BOARD.flybackDiA) / BOARD.flybackDtS,
    clampV: vm + BOARD.diodeDropV,
    pDriver: 2 * iAvg * iAvg * BOARD.driverOhm,
    direction: i.forward ? ("forward" as const) : ("reverse" as const),
  };
}

/* ---------- test points for the virtual multimeter ---------- */

/** The pads a learner can put the meter's probes on, in the order the readout lists them. */
export const TEST_POINT_IDS = ["GND", "VBAT", "VM", "U3_IN", "3V3", "EN", "IO13", "D1_A", "D1_K", "VBAT_SENSE", "M1A", "M1B"] as const;
export type TestPointId = (typeof TEST_POINT_IDS)[number];

/**
 * DC voltage of every test point above ground, taken from the station functions so the meter and the panels agree to the
 * last bit. EN is read after it has settled (5τ and more after power-up). The LED loop runs IO13 → R3 → D1 → ground as
 * the LED station draws it, so the anode sits at Vf and the cathode on ground. The motor terminals are PWM duty averages,
 * which is what a meter on its DC range shows: the driven side at duty × VM, the other side held at ground by the bridge.
 * U3_IN is the regulator's input pin on the VM net (its SOT-223 tab is the output, not an input: AMS1117 datasheet).
 */
export function nodeVoltages(i: BoardInputs): Record<TestPointId, number> {
  const vm = vmVoltage(i);
  const vMotor = i.duty * vm;
  return {
    GND: 0,
    VBAT: i.vPack,
    VM: vm,
    U3_IN: vm,
    "3V3": BOARD.ldoVout,
    EN: BOARD.ldoVout,
    IO13: BOARD.ldoVout,
    D1_A: BOARD.ldoVout - ledStation(i).kvl.dropR,
    D1_K: 0,
    VBAT_SENSE: dividerStation(i).vOut,
    M1A: i.forward ? vMotor : 0,
    M1B: i.forward ? 0 : vMotor,
  };
}

export function boardModel(i: BoardInputs) {
  return {
    fet: fetStation(i),
    kcl: kclStation(i),
    ldo: ldoStation(i),
    led: ledStation(i),
    divider: dividerStation(i),
    en: enStation(i),
    decoupling: decouplingStation(i),
    winding: windingStation(i),
  };
}

export type BoardModel = ReturnType<typeof boardModel>;
