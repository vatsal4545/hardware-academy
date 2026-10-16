// Pack arithmetic for BatteryPackExplorer: series groups add voltage, parallel cells add capacity.

export type CellFormat = "18650" | "2170";

export interface CellSpec {
  id: CellFormat;
  label: string;
  diameterMm: number;
  lengthMm: number;
  capacityAh: number;
  nominalV: number;
  maxV: number;
  minV: number;
  massG: number;
}

/** Representative nickel-rich (NCA/NMC) cylindrical cells. Real cells vary by supplier and year. */
export const CELLS: Record<CellFormat, CellSpec> = {
  "18650": { id: "18650", label: "18650", diameterMm: 18, lengthMm: 65, capacityAh: 3.2, nominalV: 3.6, maxV: 4.2, minV: 3.0, massG: 47 },
  "2170": { id: "2170", label: "2170", diameterMm: 21, lengthMm: 70, capacityAh: 4.8, nominalV: 3.6, maxV: 4.2, minV: 3.0, massG: 68 },
};

/** Series groups per module in the drawing (the Model S layout: 16 modules of 6 groups = 96s). */
export const GROUPS_PER_MODULE = 6;

export type VoltageClass = "Low voltage" | "400 V class" | "800 V class";

export interface PackSpecs {
  cells: number;
  nominalV: number;
  maxV: number;
  minV: number;
  capacityAh: number;
  energyKWh: number;
  cellMassKg: number;
  cellWhPerKg: number;
  modules: number;
  voltageClass: VoltageClass;
}

export function packSpecs(series: number, parallel: number, cell: CellSpec): PackSpecs {
  const cells = series * parallel;
  const nominalV = series * cell.nominalV;
  const capacityAh = parallel * cell.capacityAh;
  const energyKWh = (nominalV * capacityAh) / 1000;
  const cellMassKg = (cells * cell.massG) / 1000;
  const cellWhPerKg = (cell.nominalV * cell.capacityAh) / (cell.massG / 1000);
  const voltageClass: VoltageClass = nominalV < 60 ? "Low voltage" : nominalV < 500 ? "400 V class" : "800 V class";
  return {
    cells,
    nominalV,
    maxV: series * cell.maxV,
    minV: series * cell.minV,
    capacityAh,
    energyKWh,
    cellMassKg,
    cellWhPerKg,
    modules: Math.ceil(series / GROUPS_PER_MODULE),
    voltageClass,
  };
}

export interface PackPreset {
  id: string;
  label: string;
  cell: CellFormat;
  series: number;
  parallel: number;
}

export const PACK_PRESETS: PackPreset[] = [
  { id: "practice", label: "Practice pack: 2170, 96s46p", cell: "2170", series: 96, parallel: 46 },
  { id: "model-s", label: "Model S 85 layout: 18650, 96s74p", cell: "18650", series: 96, parallel: 74 },
  { id: "800v", label: "Same cells as 800 V: 192s23p", cell: "2170", series: 192, parallel: 23 },
];
