// Site and session arithmetic for ChargingSessionFlow and the charging-site practice exercise.

export type ChargeMode = "ac" | "dc";

export interface SiteConfig {
  mode: ChargeMode;
  label: string;
  /** site power available to all ports after load management, kW */
  capKw: number;
  /** most one port can deliver, kW */
  portMaxKw: number;
  ports: number;
  requestMin: number;
  requestMax: number;
  requestStep: number;
  defaultRequest: number;
  defaultOthers: number;
  /** AC supply voltage used to convert power to pilot amps */
  acVolts: number;
}

export const SITES: Record<ChargeMode, SiteConfig> = {
  ac: {
    mode: "ac",
    label: "Workplace lot: 12 Level 2 ports (up to 80 A at 240 V) sharing a 60 kW load-managed panel",
    capKw: 60,
    portMaxKw: 19.2,
    ports: 12,
    requestMin: 1.4,
    requestMax: 19.2,
    requestStep: 0.1,
    defaultRequest: 11.5,
    defaultOthers: 36,
    acVolts: 240,
  },
  dc: {
    mode: "dc",
    label: "Highway site: 8 × 150 kW dispensers sharing 600 kW of power cabinets (2:1)",
    capKw: 600,
    portMaxKw: 150,
    ports: 8,
    requestMin: 50,
    requestMax: 350,
    requestStep: 10,
    defaultRequest: 250,
    defaultOthers: 450,
    acVolts: 480,
  },
};

export type PowerLimit = "vehicle" | "port" | "site";

export interface Grant {
  kw: number;
  limitedBy: PowerLimit;
  suspended: boolean;
  /** AC only: pilot current advertised to the car */
  pilotAmps?: number;
  pilotDuty?: number | null;
}

/** J1772 pilot: 6-51 A -> duty = A / 0.6; 51-80 A -> duty = A / 2.5 + 64. Below 6 A there is no valid duty. */
export function pilotDutyForAmps(amps: number): number | null {
  if (amps < 6 || amps > 80) return null;
  return amps <= 51 ? amps / 0.6 : amps / 2.5 + 64;
}

export function ampsForDuty(dutyPct: number): number {
  if (dutyPct < 10 || dutyPct > 96) return 0;
  return dutyPct <= 85 ? dutyPct * 0.6 : (dutyPct - 64) * 2.5;
}

/** Power the load manager grants this session: vehicle request, then port rating, then site headroom. */
export function grantedPower(site: SiteConfig, requestKw: number, othersKw: number): Grant {
  const headroom = Math.max(0, site.capKw - othersKw);
  let kw = requestKw;
  let limitedBy: PowerLimit = "vehicle";
  if (site.portMaxKw < kw) {
    kw = site.portMaxKw;
    limitedBy = "port";
  }
  if (headroom < kw) {
    kw = headroom;
    limitedBy = "site";
  }
  if (site.mode === "ac") {
    const amps = Math.min(80, (kw * 1000) / site.acVolts);
    const duty = pilotDutyForAmps(amps);
    if (duty === null) return { kw: 0, limitedBy, suspended: true, pilotAmps: amps, pilotDuty: null };
    return { kw, limitedBy, suspended: false, pilotAmps: amps, pilotDuty: duty };
  }
  return { kw, limitedBy, suspended: kw <= 0 };
}

export const STANDARD_TRANSFORMER_KVA = [75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3750, 5000];
export const STANDARD_BREAKER_A = [400, 600, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000];

export interface SiteSizing {
  nameplateKw: number;
  sharedKw: number;
  inputKva: number;
  transformerKva: number;
  /** charging plus auxiliary load at 480 V three-phase, times 125 % for a continuous load */
  continuousAmps480: number;
  mainBreakerA: number;
}

export function sizeSite(i: {
  dispensers: number;
  kwEach: number;
  shareRatio: number;
  efficiency: number;
  powerFactor: number;
  auxKva: number;
}): SiteSizing {
  const nameplateKw = i.dispensers * i.kwEach;
  const sharedKw = nameplateKw / i.shareRatio;
  const inputKva = sharedKw / i.efficiency / i.powerFactor + i.auxKva;
  const transformerKva = STANDARD_TRANSFORMER_KVA.find((k) => k >= inputKva) ?? STANDARD_TRANSFORMER_KVA[STANDARD_TRANSFORMER_KVA.length - 1];
  const continuousAmps480 = ((inputKva * 1000) / (Math.sqrt(3) * 480)) * 1.25;
  const mainBreakerA = STANDARD_BREAKER_A.find((a) => a >= continuousAmps480) ?? STANDARD_BREAKER_A[STANDARD_BREAKER_A.length - 1];
  return { nameplateKw, sharedKw, inputKva, transformerKva, continuousAmps480, mainBreakerA };
}
