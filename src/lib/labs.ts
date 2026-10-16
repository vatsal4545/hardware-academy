import type { TrackId } from "./curriculum";

export type LabId = "robot-sim" | "pid" | "arm" | "trace-width";

export interface LabMeta {
  id: LabId;
  title: string;
  description: string;
  minutes: number;
  track: TrackId;
}

export const labs: LabMeta[] = [
  {
    id: "robot-sim",
    title: "Robot simulator",
    description:
      "Write a controller in JavaScript and watch a differential-drive robot run it with ultrasonic, line and encoder sensors.",
    minutes: 60,
    track: "robotics",
  },
  {
    id: "pid",
    title: "PID tuning lab",
    description: "Tune Kp, Ki and Kd on a motor model and read overshoot, settling time and steady-state error.",
    minutes: 25,
    track: "robotics",
  },
  {
    id: "arm",
    title: "2-link arm kinematics",
    description: "Drive a planar arm with joint sliders, then drag the target and watch inverse kinematics solve it.",
    minutes: 20,
    track: "robotics",
  },
  {
    id: "trace-width",
    title: "Trace width calculator",
    description: "Size a PCB trace for a current and temperature rise with the IPC-2221 formula.",
    minutes: 10,
    track: "pcb",
  },
];

export function labById(id: string): LabMeta | undefined {
  return labs.find((l) => l.id === id);
}
