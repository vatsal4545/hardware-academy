import type { ComponentType } from "react";

export type ComponentCategory =
  | "passive"
  | "active"
  | "power"
  | "sensor"
  | "actuator"
  | "compute"
  | "semiconductor"
  | "ev"
  | "connector";

export const categoryLabels: Record<ComponentCategory, string> = {
  passive: "Passive",
  active: "Active",
  power: "Power",
  sensor: "Sensors",
  actuator: "Actuators",
  compute: "Compute",
  semiconductor: "Semiconductor",
  ev: "EV",
  connector: "Connectors",
};

export interface ComponentEntry {
  id: string;
  name: string;
  category: ComponentCategory;
  oneLiner: string;
  /** 3-6 short paragraphs */
  howItWorks: string[];
  /** 3-5 bullets */
  whereUsed: string[];
  /** 3-6 rows */
  keySpecs: { label: string; value: string }[];
  /** 2-4 bullets */
  failureModes: string[];
  interviewTip: string;
  /** lesson slug */
  relatedLesson?: string;
  /** inline SVG drawing of the part; animates when animate is true */
  Illustration: ComponentType<{ animate?: boolean }>;
}
