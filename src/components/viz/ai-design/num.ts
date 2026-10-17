/**
 * Rounding helpers for numbers that end up in SVG attributes.
 *
 * Server and browser engines can differ in the last bits of sin, cos, atan2, sqrt, hypot and friends. Any such
 * value that reaches markup unrounded makes the hydrated page differ from the server HTML. Everything derived from
 * a transcendental or irrational function is therefore rounded before it is drawn: 2 decimals for coordinates,
 * 3 for opacities, 4 for unit-vector components. Plain +, -, * and / are exact IEEE operations and agree everywhere.
 */

/** 2 decimals: screen coordinates and lengths */
export const r2 = (v: number): number => Math.round(v * 100) / 100;

/** 3 decimals: opacities and model coordinates in millimetres */
export const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/** 4 decimals: components of unit normals */
export const r4 = (v: number): number => Math.round(v * 10000) / 10000;
