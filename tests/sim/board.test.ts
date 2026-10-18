import { describe, it, expect } from "vitest";
import {
  BOARD_DEFAULTS,
  boardModel,
  decouplingStation,
  dividerStation,
  enStation,
  fetStation,
  kclStation,
  ledStation,
  ldoStation,
  traceResistance,
  windingStation,
} from "@/lib/sim/board";

const stalled = { ...BOARD_DEFAULTS, iMotorL: 1.5, iMotorR: 1.5 };
const fullPack = { ...BOARD_DEFAULTS, vPack: 8.4 };

describe("board model: power in (Ohm's law on the FET and the copper)", () => {
  it("adds the motors and the regulator's input current into the pack current", () => {
    expect(fetStation(BOARD_DEFAULTS).iPack).toBeCloseTo(1.155, 6);
    expect(fetStation(stalled).iPack).toBeCloseTo(3.155, 6);
  });
  it("50 mΩ at 3.155 A drops 0.158 V and makes 0.498 W", () => {
    const s = fetStation(stalled);
    expect(s.vFet).toBeCloseTo(0.15775, 5);
    expect(s.pFet).toBeCloseTo(0.4977, 3);
  });
  it("a 13 mm, 1.5 mm, 1 oz trace is about 4.2 mΩ", () => {
    expect(traceResistance(13, 1.5)).toBeCloseTo(0.00416, 5);
    expect(fetStation(stalled).vTrace).toBeCloseTo(0.0131, 3);
  });
});

describe("board model: KCL at the VM node", () => {
  it("the pack current is the sum of the branch currents", () => {
    const s = kclStation(BOARD_DEFAULTS);
    expect(s.iMotors).toBeCloseTo(1.0, 9);
    expect(s.iLdoIn).toBeCloseTo(0.155, 9);
    expect(s.iPack).toBeCloseTo(s.iMotors + s.iLdoIn, 12);
  });
  it("a 1.5 A, 10 µs start step droops 100 µF by 0.15 V", () => {
    expect(kclStation(BOARD_DEFAULTS).droopV).toBeCloseTo(0.15, 6);
  });
});

describe("board model: the regulator's heat", () => {
  it("8.4 V to 3.3 V at 150 mA is 0.807 W with the 5 mA ground current, 73 °C junction", () => {
    const s = ldoStation(fullPack);
    expect(s.pLdo).toBeCloseTo(0.807, 3);
    expect(s.tj).toBeCloseTo(73.4, 1);
    expect(s.verdict).toBe("fine");
  });
  it("400 mA of Wi-Fi at a full pack sits on the 150 °C shutdown line, 450 mA trips it; a buck would waste a tenth", () => {
    const edge = ldoStation({ ...fullPack, iLogic: 0.4 });
    expect(edge.pLdo).toBeCloseTo(2.082, 3);
    expect(edge.tj).toBeCloseTo(149.9, 1);
    expect(edge.verdict).toBe("hot");
    const s = ldoStation({ ...fullPack, iLogic: 0.45 });
    expect(s.tj).toBeGreaterThan(150);
    expect(s.verdict).toBe("shutdown");
    expect(s.pBuck).toBeCloseTo(3.3 * 0.45 * (1 / 0.9 - 1), 6);
  });
  it("is 'hot' between 100 and 150 °C", () => {
    expect(ldoStation({ ...fullPack, iLogic: 0.25 }).verdict).toBe("hot");
  });
});

describe("board model: KVL around the LED", () => {
  it("red LED through 1 kΩ on 3.3 V: 1.3 mA, and the loop sums to zero", () => {
    const s = ledStation(BOARD_DEFAULTS);
    expect(s.iLed).toBeCloseTo(0.0013, 9);
    expect(s.kvl.rise - s.kvl.dropR - s.kvl.dropLed).toBeCloseTo(0, 12);
    expect(s.verdict).toBe("ok");
  });
  it("a blue LED leaves 0.3 V across the resistor: 0.3 mA, dim", () => {
    const s = ledStation({ ...BOARD_DEFAULTS, ledColor: "blue" });
    expect(s.iLed).toBeCloseTo(0.0003, 9);
    expect(s.verdict).toBe("dim");
  });
  it("220 Ω with a red LED asks 5.9 mA, still fine; 47 Ω would be too much", () => {
    expect(ledStation({ ...BOARD_DEFAULTS, ledR: 220 }).iLed).toBeCloseTo(0.00591, 5);
    expect(ledStation({ ...BOARD_DEFAULTS, ledR: 47 }).verdict).toBe("too much");
  });
});

describe("board model: the battery divider and Thevenin", () => {
  it("8.4 V across 100 k over 47 k gives 2.686 V behind 32 kΩ, 57 µA, 3333 counts", () => {
    const s = dividerStation(fullPack);
    expect(s.vOut).toBeCloseTo(2.6857, 4);
    expect(s.rth).toBeCloseTo(31972.8, 0);
    expect(s.iDiv * 1e6).toBeCloseTo(57.1, 1);
    expect(s.counts).toBe(3333);
    expect(s.verdict).toBe("ok");
    expect(s.rechargeMs).toBeCloseTo(3.2, 1);
  });
  it("without C9 the sampling capacitor needs 2.65 µs to settle and the verdict is 'loaded'", () => {
    const s = dividerStation({ ...fullPack, dividerCap: false });
    expect(s.settleUs).toBeCloseTo(2.65, 2);
    expect(s.verdict).toBe("loaded");
  });
});

describe("board model: the EN time constant", () => {
  it("10 kΩ and 1 µF: τ = 10 ms, 75% at 13.9 ms, curve ends near 3.3 V", () => {
    const s = enStation(BOARD_DEFAULTS);
    expect(s.tau).toBeCloseTo(0.01, 12);
    expect(s.tBoot * 1e3).toBeCloseTo(13.86, 2);
    expect(s.samples).toHaveLength(41);
    expect(s.samples[0]).toBe(0);
    expect(s.samples[40]).toBeCloseTo(3.3 * (1 - Math.exp(-5)), 5);
  });
  it("scales with the capacitor", () => {
    expect(enStation({ ...BOARD_DEFAULTS, enC: 100e-9 }).tBoot * 1e3).toBeCloseTo(1.386, 3);
    expect(enStation({ ...BOARD_DEFAULTS, enC: 10e-6 }).tBoot * 1e3).toBeCloseTo(138.6, 1);
  });
});

describe("board model: decoupling, V = L·di/dt", () => {
  it("2 mm is 2.5 nH and 62.5 mV; 10 mm is 10.5 nH and 263 mV", () => {
    const near = decouplingStation(BOARD_DEFAULTS);
    expect(near.loopH).toBeCloseTo(2.5e-9, 15);
    expect(near.vDip).toBeCloseTo(0.0625, 6);
    expect(near.verdict).toBe("ok");
    const far = decouplingStation({ ...BOARD_DEFAULTS, decouplingMm: 10 });
    expect(far.vDip).toBeCloseTo(0.2625, 6);
    expect(far.verdict).toBe("marginal");
    expect(decouplingStation({ ...BOARD_DEFAULTS, decouplingMm: 30 }).verdict).toBe("bad");
  });
});

describe("board model: the motor winding", () => {
  it("0.5 A gives 20 µT at 5 mm from the trace, 89 mA of ripple at 60% duty, 4.44 V average", () => {
    const s = windingStation(BOARD_DEFAULTS);
    expect(s.bTraceUt).toBeCloseTo(20, 6);
    expect(s.earthRatio).toBeCloseTo(0.4, 6);
    expect(s.rippleA).toBeCloseTo(0.0888, 4);
    expect(s.vAvg).toBeCloseTo(4.44, 6);
    expect(s.direction).toBe("forward");
  });
  it("flyback: 1 A falling in 100 ns through 1 mH wants 10 kV; the body diode clamps at VM + 0.7", () => {
    const s = windingStation(BOARD_DEFAULTS);
    expect(s.flybackV).toBeCloseTo(10000, 6);
    expect(s.clampV).toBeCloseTo(8.1, 6);
  });
  it("reverse flips the direction and nothing else", () => {
    const f = windingStation(BOARD_DEFAULTS);
    const r = windingStation({ ...BOARD_DEFAULTS, forward: false });
    expect(r.direction).toBe("reverse");
    expect(r.bTraceUt).toBe(f.bTraceUt);
  });
});

describe("boardModel", () => {
  it("bundles the eight stations", () => {
    const m = boardModel(BOARD_DEFAULTS);
    expect(Object.keys(m).sort()).toEqual(["decoupling", "divider", "en", "fet", "kcl", "ldo", "led", "winding"]);
    expect(m.fet.iPack).toBe(m.kcl.iPack);
  });
});
