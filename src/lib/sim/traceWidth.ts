// IPC-2221 trace width estimate.
// Cross-sectional area A (mil²) = (I / (k · ΔT^0.44))^(1/0.725)
// k = 0.048 for external layers, 0.024 for internal layers.
// Width (mil) = A / (thickness in oz · 1.378), since 1 oz copper is 1.378 mil thick.

export interface TraceWidthInput {
  currentA: number;
  tempRiseC: number;
  copperOz: number;
  layer: "external" | "internal";
}

export interface TraceWidthResult {
  areaMil2: number;
  widthMil: number;
  widthMm: number;
}

export function traceWidth(i: TraceWidthInput): TraceWidthResult {
  if (i.currentA <= 0 || i.tempRiseC <= 0 || i.copperOz <= 0) {
    return { areaMil2: 0, widthMil: 0, widthMm: 0 };
  }
  const k = i.layer === "external" ? 0.048 : 0.024;
  const areaMil2 = Math.pow(i.currentA / (k * Math.pow(i.tempRiseC, 0.44)), 1 / 0.725);
  const widthMil = areaMil2 / (i.copperOz * 1.378);
  return { areaMil2, widthMil, widthMm: widthMil * 0.0254 };
}
