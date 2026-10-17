"use client";

import { useState, type KeyboardEvent } from "react";
import { PlayPause, Segmented, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";
import { RoundedArrow, r2 } from "./RoundedArrow";

type Reliability = "best_effort" | "reliable";
type ItemId = "camera" | "image" | "detector" | "detections" | "planner" | "cmdvel" | "driver";

interface Item {
  id: ItemId;
  kind: "node" | "topic";
  name: string;
  x: number;
  y: number;
  w: number;
  type?: string;
  lines: string[];
}

const ITEMS: Item[] = [
  {
    id: "camera",
    kind: "node",
    name: "/camera",
    x: 85,
    y: 70,
    w: 104,
    lines: [
      "Camera driver node (for example usb_cam or v4l2_camera).",
      "Publishes /camera/image_raw: sensor_msgs/msg/Image at 30 Hz, 640 × 480 rgb8, 921,600 bytes per message (about 28 MB/s).",
      "QoS: the sensor-data profile, BEST_EFFORT with KEEP_LAST 5, because a late frame is worthless and a dropped one is fine.",
      "Parameters: image_width 640, image_height 480, framerate 30.",
    ],
  },
  {
    id: "image",
    kind: "topic",
    name: "/camera/image_raw",
    x: 190,
    y: 182,
    w: 136,
    type: "sensor_msgs/msg/Image",
    lines: [
      "Topic of type sensor_msgs/msg/Image.",
      "Fields: header (stamp, frame_id = camera_optical_frame), height, width, encoding, is_bigendian, step, data[].",
      "Inspect it with: ros2 topic info -v /camera/image_raw (shows every endpoint's QoS) and ros2 topic hz /camera/image_raw.",
    ],
  },
  {
    id: "detector",
    kind: "node",
    name: "/detector",
    x: 295,
    y: 70,
    w: 108,
    lines: [
      "Object detector node, for example a YOLO model running on a Jetson Orin.",
      "Subscribes to /camera/image_raw (sensor_msgs/msg/Image).",
      "Publishes /detections: vision_msgs/msg/Detection2DArray at about 10 Hz, RELIABLE, KEEP_LAST 10.",
      "Parameters: model_path, confidence_threshold 0.5, device cuda:0.",
    ],
  },
  {
    id: "detections",
    kind: "topic",
    name: "/detections",
    x: 400,
    y: 182,
    w: 120,
    type: "vision_msgs/msg/Detection2DArray",
    lines: [
      "Topic of type vision_msgs/msg/Detection2DArray.",
      "Fields: header, detections[], each with a bbox (center x, y, theta, size_x, size_y) and results[] (class id and score).",
      "Small messages: a few hundred bytes at 10 Hz, so RELIABLE delivery is cheap here.",
    ],
  },
  {
    id: "planner",
    kind: "node",
    name: "/planner",
    x: 505,
    y: 70,
    w: 104,
    lines: [
      "Planner node: turns detections and odometry into a velocity command, for example stop when a person is within 1 m, otherwise drive to the goal.",
      "Subscribes to /detections (vision_msgs/msg/Detection2DArray) and /odom (nav_msgs/msg/Odometry).",
      "Publishes /cmd_vel: geometry_msgs/msg/Twist at 20 Hz on a timer. In a full stack this is Nav2's controller server.",
    ],
  },
  {
    id: "cmdvel",
    kind: "topic",
    name: "/cmd_vel",
    x: 610,
    y: 182,
    w: 104,
    type: "geometry_msgs/msg/Twist",
    lines: [
      "Topic of type geometry_msgs/msg/Twist.",
      "Fields: linear (x, y, z) in m/s and angular (x, y, z) in rad/s. A differential drive uses only linear.x and angular.z.",
      "Try it: ros2 topic pub /cmd_vel geometry_msgs/msg/Twist \"{linear: {x: 0.1}, angular: {z: 0.5}}\"",
    ],
  },
  {
    id: "driver",
    kind: "node",
    name: "/motor_driver",
    x: 705,
    y: 70,
    w: 128,
    lines: [
      "Motor driver node: converts Twist to wheel speeds, vL = v − ω·L/2 and vR = v + ω·L/2 (lesson 24), and runs the wheel speed loops.",
      "Subscribes to /cmd_vel (geometry_msgs/msg/Twist). On the course robot this is the ESP32 running micro-ROS.",
      "Publishes /odom (nav_msgs/msg/Odometry, 50 Hz) and broadcasts the odom → base_link transform on /tf.",
    ],
  },
];

const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, Item>;
const NODE_H = 40;
const TOPIC_H = 30;

/** Edge endpoints: node bottom → topic upper-left, topic upper-right → next node bottom. */
function pubEdge(node: Item, topic: Item) {
  return { x1: node.x, y1: node.y + NODE_H / 2, x2: topic.x - topic.w / 2 + 18, y2: topic.y - TOPIC_H / 2 };
}
function subEdge(topic: Item, node: Item) {
  return { x1: topic.x + topic.w / 2 - 18, y1: topic.y - TOPIC_H / 2, x2: node.x, y2: node.y + NODE_H / 2 };
}

const LINKS = [
  { pub: ITEM.camera, topic: ITEM.image, sub: ITEM.detector },
  { pub: ITEM.detector, topic: ITEM.detections, sub: ITEM.planner },
  { pub: ITEM.planner, topic: ITEM.cmdvel, sub: ITEM.driver },
];

const CAMERA_RATE = 4; // messages per second on screen (the real camera runs at 30 Hz)
const PLANNER_RATE = 2.5;
const LEG = 0.45; // seconds per edge on screen
const DETECT_DELAY = 0.15;
const LOSS = 0.2;

/** Deterministic integer hash → [0, 1); the same on every JavaScript engine. */
function hash01(k: number): number {
  let h = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

interface Dot {
  key: string;
  x: number;
  y: number;
  color: string;
  dropped?: boolean;
}

function lerp(e: { x1: number; y1: number; x2: number; y2: number }, u: number) {
  return { x: r2(e.x1 + (e.x2 - e.x1) * u), y: r2(e.y1 + (e.y2 - e.y1) * u) };
}

export function RosGraph() {
  const { t, playing, toggle, reset } = useViz();
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [focused, setFocused] = useState<ItemId | null>(null);
  const [subQos, setSubQos] = useState<Reliability>("best_effort");
  const [pubReliable, setPubReliable] = useState(false);
  const [lossy, setLossy] = useState(false);

  const pubQos: Reliability = pubReliable ? "reliable" : "best_effort";
  const compatible = !(subQos === "reliable" && pubQos === "best_effort");
  const deliveredReliably = pubQos === "reliable" && subQos === "reliable";

  // ----- camera → detector link, the one whose QoS you control -----
  const dots: Dot[] = [];
  const published = Math.floor(t * CAMERA_RATE) + 1;
  let delivered = 0;
  let dropped = 0;
  let retransmitted = 0;
  const arrivals: number[] = []; // times images reach the detector
  const e1 = pubEdge(ITEM.camera, ITEM.image);
  const e2 = subEdge(ITEM.image, ITEM.detector);
  for (let k = 0; k < published; k++) {
    const t0 = k / CAMERA_RATE;
    const age = t - t0;
    const lost = lossy && hash01(k) < LOSS;
    const legTwo = lost && deliveredReliably ? LEG * 2.2 : LEG; // a retransmission takes extra round trips
    const arrival = t0 + LEG + legTwo;
    if (compatible) {
      if (lost && !deliveredReliably) {
        if (t >= t0 + LEG * 1.5) dropped++;
      } else {
        if (t >= arrival) delivered++;
        if (lost) retransmitted += t >= t0 + LEG ? 1 : 0;
        arrivals.push(arrival + DETECT_DELAY);
      }
    }
    if (age < 0 || age > LEG + legTwo + 0.3) continue;
    if (age <= LEG) {
      dots.push({ key: `img-${k}`, ...lerp(e1, age / LEG), color: vizColors.cyan });
    } else if (!compatible) {
      if (age < LEG + 0.3) dots.push({ key: `img-${k}`, ...lerp(e1, 1), color: vizColors.red });
    } else if (lost && !deliveredReliably) {
      const u = Math.min(0.5, (age - LEG) / LEG);
      if (age < LEG * 1.5 + 0.3) dots.push({ key: `img-${k}`, ...lerp(e2, u), color: vizColors.red, dropped: u >= 0.5 });
    } else if (age <= LEG + legTwo) {
      dots.push({ key: `img-${k}`, ...lerp(e2, (age - LEG) / legTwo), color: lost ? vizColors.amber : vizColors.cyan });
    }
  }

  // ----- detector → planner: one detection per image that arrived -----
  const d1 = pubEdge(ITEM.detector, ITEM.detections);
  const d2 = subEdge(ITEM.detections, ITEM.planner);
  arrivals.forEach((a, i) => {
    const age = t - a;
    if (age < 0 || age > 2 * LEG) return;
    const pos = age <= LEG ? lerp(d1, age / LEG) : lerp(d2, (age - LEG) / LEG);
    dots.push({ key: `det-${i}`, ...pos, color: vizColors.violet });
  });

  // ----- planner → motor driver: a timer, whether or not detections arrive -----
  const p1 = pubEdge(ITEM.planner, ITEM.cmdvel);
  const p2 = subEdge(ITEM.cmdvel, ITEM.driver);
  const plannerSent = Math.floor(t * PLANNER_RATE) + 1;
  for (let k = Math.max(0, plannerSent - 4); k < plannerSent; k++) {
    const age = t - k / PLANNER_RATE;
    if (age < 0 || age > 2 * LEG) continue;
    const pos = age <= LEG ? lerp(p1, age / LEG) : lerp(p2, (age - LEG) / LEG);
    dots.push({ key: `cmd-${k}`, ...pos, color: compatible ? vizColors.green : vizColors.muted });
  }

  const sel = selected ? ITEM[selected] : null;
  const onKey = (id: ItemId) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(id);
    }
  };
  const qosText = `${pubQos === "reliable" ? "RELIABLE" : "BEST_EFFORT"} offered → ${subQos === "reliable" ? "RELIABLE" : "BEST_EFFORT"} requested`;

  return (
    <VizFrame
      title="A ROS 2 node graph"
      description="Messages flow from the camera to the motors. Click a node or a topic for its message types, then change the detector's QoS and watch the graph break the way real ones do."
      controls={
        <>
          <Segmented
            label="/detector subscription reliability"
            options={[
              { value: "best_effort", label: "Best effort (sensor data)" },
              { value: "reliable", label: "Reliable (default)" },
            ]}
            value={subQos}
            onChange={setSubQos}
          />
          <div className="space-y-2">
            <Toggle label="Camera publishes with reliable QoS" checked={pubReliable} onChange={setPubReliable} />
            <Toggle label="Lossy Wi-Fi link (20% packet loss)" checked={lossy} onChange={setLossy} />
          </div>
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer={
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1" aria-live="polite">
            {sel ? (
              <>
                <p className="font-semibold text-text">
                  {sel.name} <span className="font-normal text-muted">({sel.kind})</span>
                </p>
                {sel.lines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </>
            ) : (
              <p>Click or tab to a node (rounded) or a topic (square) to see what it publishes, subscribes to and its message types.</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="font-mono text-xs text-text">
              images published {published} · delivered {delivered} · dropped {dropped} · retransmitted {retransmitted}
            </p>
            {compatible ? (
              <p>
                {deliveredReliably && lossy
                  ? "Both ends RELIABLE: lost packets are retransmitted, so every image arrives, but late ones arrive much later (amber)."
                  : lossy
                    ? "BEST_EFFORT on a lossy link: lost images are simply gone (red). For a 30 Hz camera that is usually what you want."
                    : "Connected: the QoS profiles are compatible and images flow."}
              </p>
            ) : (
              <p className="text-red-300">
                Incompatible QoS: the /detector subscription requests RELIABLE but /camera offers BEST_EFFORT, so DDS never matches them.
                No images arrive, no detections are published, and the planner keeps sending stale commands. ros2 topic info -v
                /camera/image_raw shows the mismatch.
              </p>
            )}
          </div>
        </div>
      }
    >
      <SvgCanvas viewBox="0 0 780 250" title="ROS 2 graph: /camera, /detector, /planner and /motor_driver nodes linked by topics" role="group">
        <rect x={0} y={0} width={780} height={250} rx={10} fill={vizColors.bg} />

        {/* edges */}
        {LINKS.map(({ pub, topic, sub }) => {
          const a = pubEdge(pub, topic);
          const b = subEdge(topic, sub);
          const broken = topic.id === "image" && !compatible;
          return (
            <g key={topic.id}>
              <RoundedArrow {...a} color={vizColors.muted} width={1.5} />
              <RoundedArrow {...b} color={broken ? vizColors.red : vizColors.muted} width={broken ? 2 : 1.5} dashed={broken} />
              {broken && (
                <g stroke={vizColors.red} strokeWidth={3} strokeLinecap="round">
                  <line x1={r2((b.x1 + b.x2) / 2 - 7)} y1={r2((b.y1 + b.y2) / 2 - 7)} x2={r2((b.x1 + b.x2) / 2 + 7)} y2={r2((b.y1 + b.y2) / 2 + 7)} />
                  <line x1={r2((b.x1 + b.x2) / 2 - 7)} y1={r2((b.y1 + b.y2) / 2 + 7)} x2={r2((b.x1 + b.x2) / 2 + 7)} y2={r2((b.y1 + b.y2) / 2 - 7)} />
                </g>
              )}
            </g>
          );
        })}
        <Label x={190} y={226} size={10} color={compatible ? vizColors.muted : vizColors.red} mono>
          {qosText}
        </Label>

        {/* nodes and topics */}
        {ITEMS.map((it) => {
          const isSel = selected === it.id;
          const isFocused = focused === it.id;
          const h = it.kind === "node" ? NODE_H : TOPIC_H;
          return (
            <g
              key={it.id}
              role="button"
              tabIndex={0}
              aria-label={`${it.name} ${it.kind}`}
              aria-pressed={isSel}
              onClick={() => setSelected(it.id)}
              onKeyDown={onKey(it.id)}
              onFocus={() => setFocused(it.id)}
              onBlur={() => setFocused((f) => (f === it.id ? null : f))}
              style={{ cursor: "pointer", outline: "none" }}
            >
              {isFocused && (
                <rect
                  data-testid={`focus-ring-${it.id}`}
                  x={it.x - it.w / 2 - 5}
                  y={it.y - h / 2 - 5}
                  width={it.w + 10}
                  height={h + 10}
                  rx={it.kind === "node" ? h / 2 + 5 : 7}
                  fill="none"
                  stroke={vizColors.text}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              )}
              <rect
                x={it.x - it.w / 2}
                y={it.y - h / 2}
                width={it.w}
                height={h}
                rx={it.kind === "node" ? h / 2 : 4}
                fill={it.kind === "node" ? vizColors.violet : vizColors.cyan}
                fillOpacity={isSel ? 0.35 : 0.14}
                stroke={it.kind === "node" ? vizColors.violet : vizColors.cyan}
                strokeWidth={isSel ? 3 : 1.5}
              />
              <Label x={it.x} y={it.y} size={12} bold={it.kind === "node"} mono={it.kind === "topic"}>
                {it.name}
              </Label>
            </g>
          );
        })}

        {/* messages */}
        {dots.map((d) =>
          d.dropped ? (
            <g key={d.key} stroke={vizColors.red} strokeWidth={2}>
              <line x1={d.x - 5} y1={d.y - 5} x2={d.x + 5} y2={d.y + 5} />
              <line x1={d.x - 5} y1={d.y + 5} x2={d.x + 5} y2={d.y - 5} />
            </g>
          ) : (
            <circle key={d.key} cx={d.x} cy={d.y} r={5} fill={d.color} stroke={vizColors.bg} strokeWidth={1.5} />
          ),
        )}

        <Label x={16} y={20} anchor="start" size={10} color={vizColors.muted}>
          rounded = node · square = topic · dots = messages (slowed down: the real camera publishes 30 per second)
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
