// The leads between the board and the device under test. Resistances in milliohms; the values are simulated, chosen
// so that a 10 mΩ standard plus 40 mΩ of leads and contacts reads about 50 mΩ two-wire, as in the beginner guide.
import { between, gaussian } from "./random";
import { CHANNELS, type Channel, type ChannelContact, type Wiring } from "./types";

/** One banana lead from the adapter to its clip jaw. */
export const LEAD_MILLIOHM = 10;

/** One jaw's contact resistance: low and steady on bare metal, high and erratic on the wrapper or oxide. */
export function contactMilliohm(seed: number, channel: Channel, contact: ChannelContact): number {
  const key = `contact:${channel}:${contact.made}`;
  return contact.bite === "bare" ? between(seed, key, 4, 10) : between(seed, key, 50, 400);
}

type Contacts = Partial<Record<Channel, ChannelContact>>;

/**
 * Extra resistance the sense pair picks up when a sense jaw sits on the force wire: the force jaw's contact and its
 * lead now sit inside the sensed path.
 */
export function senseOffsetMilliohm(seed: number, channels: Contacts): number {
  let extra = 0;
  const pairs: Array<[Channel, Channel]> = [
    ["S+", "F+"],
    ["S-", "F-"],
  ];
  for (const [sense, force] of pairs) {
    const s = channels[sense];
    const f = channels[force];
    if (s?.onForceWire && f) extra += contactMilliohm(seed, force, f) + LEAD_MILLIOHM;
  }
  return extra;
}

/** Wrapper or oxide bites make readings jump from one connection to the next. */
export function jumpMilliohm(seed: number, channels: Contacts): number {
  let jump = 0;
  for (const [channel, c] of Object.entries(channels) as Array<[Channel, ChannelContact]>) {
    if (c.bite === "wrapper") jump += gaussian(seed, `jump:${channel}:${c.made}`, 0, 15);
  }
  return jump;
}

/** Even a good four-wire hookup leaves a small error that changes with each reconnection. */
export function residualMilliohm(seed: number, channels: Contacts): number {
  const made = CHANNELS.map((ch) => channels[ch]?.made ?? 0).join(".");
  return gaussian(seed, `residual:${made}`, 0, 0.08);
}

/** How the sense jaws are placed: both on the terminals, both on the force wires, or one of each. */
export function wiringOf(channels: Contacts): Wiring {
  const plus = channels["S+"]?.onForceWire ?? false;
  const minus = channels["S-"]?.onForceWire ?? false;
  if (!plus && !minus) return "4-wire";
  if (plus && minus) return "2-wire";
  return "mixed";
}
