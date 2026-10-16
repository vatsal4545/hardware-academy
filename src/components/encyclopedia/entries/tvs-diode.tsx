import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

// A 60 V surge on a 12 V rail: the raw spike (orange) and what the TVS lets through (green, clipped at 19.9 V).
const SPIKE = "M158 128 H196 L199 38 C206 60 222 108 240 128 H302";
const CLAMPED = "M158 128 H196 L199 113 H231 C235 118 238 124 242 128 H302";

function TvsIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="SMBJ12A TVS diode in an SMB package with a cathode band, and a plot of a 60 volt surge on a 12 volt rail being clamped to 19.9 volts">
      <rect x={28} y={69} width={22} height={34} rx={2} fill={part.metal} />
      <rect x={114} y={69} width={22} height={34} rx={2} fill={part.metal} />
      <rect x={42} y={58} width={80} height={56} rx={4} fill={part.epoxy} stroke={part.epoxyHi} />
      <rect x={46} y={61} width={72} height={6} rx={3} fill="#ffffff" opacity={0.08} />
      <rect x={104} y={58} width={9} height={56} fill={part.metalHi} opacity={0.85} />
      <Mark x={72} y={80} size={11} color="#ffffff">
        SMBJ12A
      </Mark>
      <Mark x={72} y={97} size={9.5}>
        600 W
      </Mark>
      <rect x={42} y={58} width={80} height={56} rx={4} fill={vizColors.orange} opacity={0}>
        <Anim on={on} name="opacity" values="0;0;0.65;0;0" keyTimes="0;0.26;0.3;0.55;1" dur={3} />
      </rect>
      <Note x={82} y={40} color={part.ink} size={10.5}>
        SMB package
      </Note>
      <Mark x={20} y={140} anchor="start" size={9.5}>
        stand-off 12 V
      </Mark>
      <Mark x={20} y={155} anchor="start" size={9.5}>
        VBR 13.3-14.7 V
      </Mark>
      <Mark x={20} y={170} anchor="start" size={9.5}>
        VC 19.9 V at 30 A
      </Mark>
      <line x1={152} y1={128} x2={304} y2={128} stroke={vizColors.muted} strokeWidth={1} opacity={0.5} />
      <path d={SPIKE} stroke={vizColors.orange} strokeWidth={2.2} fill="none" strokeLinejoin="round" opacity={0.55} strokeDasharray="5 3" />
      <path d={CLAMPED} stroke={vizColors.green} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" pathLength={100} strokeDasharray={on ? 100 : undefined} strokeDashoffset={on ? 100 : undefined}>
        <Anim on={on} name="stroke-dashoffset" values="100;0;0;100" keyTimes="0;0.5;0.9;1" dur={3} />
      </path>
      <Note x={228} y={34} color={vizColors.orange} size={10}>
        60 V surge
      </Note>
      <Note x={272} y={100} color={vizColors.green} size={10}>
        clamped
      </Note>
      <Note x={272} y={112} color={vizColors.green} size={10}>
        19.9 V
      </Note>
      <Note x={180} y={142} size={10}>
        12 V rail
      </Note>
      <Note x={232} y={176} size={10.5}>
        reacts in about 1 ns
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "tvs-diode",
  name: "TVS diode",
  category: "active",
  oneLiner: "A clamp diode that idles until a voltage spike arrives, then conducts hard in nanoseconds to divert the surge around the circuit it protects.",
  howItWorks: [
    "A TVS (transient-voltage suppressor) is a large-area avalanche diode connected from a line to ground (unidirectional) or between two lines (bidirectional). Below its stand-off voltage VRWM it draws only nanoamps of leakage. At the breakdown voltage VBR it avalanches and clamps the line at VC while diverting the surge current Ipp to ground.",
    "Choose VRWM just above the highest normal operating voltage. A 12 V rail uses an SMBJ12A: VRWM 12 V, VBR 13.3-14.7 V, and a clamp of VC = 19.9 V at 30.2 A (600 W peak). A 60 V surge on that rail is cut to under 20 V, which a 36 V-rated regulator input survives, where without the TVS it would not.",
    "Response is about 1 ps inside the junction and about 1 ns in practice once lead inductance is included, against 25-100 ns for a varistor (MOV) and microseconds for a gas discharge tube. For fast ESD (IEC 61000-4-2, 8 kV contact, a 1 ns edge), low-capacitance TVS arrays of 0.3-3 pF protect USB and HDMI lines without degrading the signal.",
    "Ratings are peak pulse power for a 10/1000 µs surge: SMAJ is 400 W, SMBJ 600 W, SMCJ 1500 W, and the 5 kW and 15 kW series cover automotive load dump. Place the TVS at the connector with a short, wide ground return: an 8 kV ESD pulse ramps about 30 A in 1 ns, so each nanohenry of trace adds about 30 V on top of the clamp.",
  ],
  whereUsed: [
    "USB, Ethernet, HDMI and connector pins, using ESD arrays at the port.",
    "12 V and 24 V automotive supply inputs, using SM8S or SMCJ parts to clamp load-dump pulses of up to roughly 100 V.",
    "CAN, RS-485 and sensor lines in industrial and robotic systems where long cables pick up spikes.",
    "Motor-driver supply rails, to clamp back-EMF spikes when a motor regenerates or a connector is unplugged live.",
    "Battery and charger connectors, against hot-plug surges and inductive spikes.",
  ],
  keySpecs: [
    { label: "Stand-off voltage VRWM", value: "3.3 V to 440 V (for example 5 V, 12 V, 24 V)" },
    { label: "Breakdown voltage VBR", value: "About 1.1-1.2 times VRWM (14 V nominal for a 12 V part)" },
    { label: "Clamping voltage VC", value: "About 1.6 times VRWM at rated Ipp (19.9 V for the SMBJ12A)" },
    { label: "Peak pulse power", value: "400 W (SMAJ) to 15 kW (15KPA) at 10/1000 µs" },
    { label: "Capacitance", value: "0.3-3 pF (ESD arrays) up to several nF (large TVS)" },
    { label: "Response time", value: "About 1 ns in practice (1 ps intrinsic)" },
  ],
  failureModes: [
    "Failing short is the designed end-of-life mode for large TVS parts, so a series fuse blows. But repeated surges beyond the power rating degrade the clamp and raise leakage, and an open failure leaves the circuit silently unprotected.",
    "A stand-off voltage that is too low: a 12 V TVS on a 14.4 V charging rail conducts continuously and overheats. Use the rail's real maximum.",
    "Capacitance ruins fast signals: a 100 pF TVS on a USB 2.0 or HDMI line closes the eye diagram. Choose a low-capacitance array under 1 pF.",
    "Placement and ground inductance: a TVS far from the connector, or with a long ground path, clamps at a much higher voltage than the datasheet suggests.",
  ],
  interviewTip:
    "Interviewer asks: \"How do you protect a 12 V automotive input from load dump?\" A good answer: a unidirectional TVS (SM8S or SMCJ class) with VRWM above the highest steady voltage (24-28 V if jump-start is required) and a clamp below the downstream rating (a 36 V regulator input), plus a series fuse or PTC, reverse-polarity protection, and a series element so the TVS has something to work against. Give numbers: load dump up to about 87 V for 400 ms, so size from the 10/1000 µs rating and the datasheet pulse-derating curve.",
  relatedLesson: "power-and-signal-integrity",
  Illustration: TvsIllustration,
};
