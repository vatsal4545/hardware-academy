import { categoryLabels, type ComponentEntry } from "../types";
import { entry as bjt } from "./bjt";
import { entry as bldcMotor } from "./bldc-motor";
import { entry as bms } from "./bms";
import { entry as buckConverter } from "./buck-converter";
import { entry as capacitorCeramic } from "./capacitor-ceramic";
import { entry as capacitorElectrolytic } from "./capacitor-electrolytic";
import { entry as crystal } from "./crystal";
import { entry as currentShunt } from "./current-shunt";
import { entry as dcBrushedMotor } from "./dc-brushed-motor";
import { entry as diode } from "./diode";
import { entry as ferriteBead } from "./ferrite-bead";
import { entry as fpga } from "./fpga";
import { entry as hBridgeDriver } from "./h-bridge-driver";
import { entry as hallSensor } from "./hall-sensor";
import { entry as igbt } from "./igbt";
import { entry as imu } from "./imu";
import { entry as inductor } from "./inductor";
import { entry as irLineSensor } from "./ir-line-sensor";
import { entry as jstConnector } from "./jst-connector";
import { entry as ldoRegulator } from "./ldo-regulator";
import { entry as led } from "./led";
import { entry as liIonCell } from "./li-ion-cell";
import { entry as lidar } from "./lidar";
import { entry as microcontroller } from "./microcontroller";
import { entry as mosfet } from "./mosfet";
import { entry as opAmp } from "./op-amp";
import { entry as pinHeader } from "./pin-header";
import { entry as resistor } from "./resistor";
import { entry as rotaryEncoder } from "./rotary-encoder";
import { entry as schottkyDiode } from "./schottky-diode";
import { entry as servo } from "./servo";
import { entry as sicMosfet } from "./sic-mosfet";
import { entry as stepperMotor } from "./stepper-motor";
import { entry as thermistor } from "./thermistor";
import { entry as tractionInverter } from "./traction-inverter";
import { entry as tvsDiode } from "./tvs-diode";
import { entry as ultrasonicSensor } from "./ultrasonic-sensor";
import { entry as waferAndDie } from "./wafer-and-die";
import { entry as zenerDiode } from "./zener-diode";

const categoryOrder = Object.keys(categoryLabels);

/** Every component entry, sorted by category (in `categoryLabels` order) and then by name. */
export const entries: ComponentEntry[] = [
  bjt,
  bldcMotor,
  bms,
  buckConverter,
  capacitorCeramic,
  capacitorElectrolytic,
  crystal,
  currentShunt,
  dcBrushedMotor,
  diode,
  ferriteBead,
  fpga,
  hBridgeDriver,
  hallSensor,
  igbt,
  imu,
  inductor,
  irLineSensor,
  jstConnector,
  ldoRegulator,
  led,
  liIonCell,
  lidar,
  microcontroller,
  mosfet,
  opAmp,
  pinHeader,
  resistor,
  rotaryEncoder,
  schottkyDiode,
  servo,
  sicMosfet,
  stepperMotor,
  thermistor,
  tractionInverter,
  tvsDiode,
  ultrasonicSensor,
  waferAndDie,
  zenerDiode,
].sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name, "en"));
