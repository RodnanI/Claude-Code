/* Master table of the island. Every position on the map originates here; nothing else hard-codes a site.
   Axes: +x east, +z south (north is -z). Units are meters. */

export const SITES = {
  meridian:   { name: 'Meridian', kind: 'metropolis', x: 4300, z: -8000, elev: 14 },
  portHalden: { name: 'Port Halden', kind: 'city', x: 5600, z: 9300, elev: 9 },
  ironford:   { name: 'Ironford', kind: 'city', x: -6400, z: -5600, elev: 46 },
  dunmore:    { name: 'Dunmore', kind: 'town', x: -1900, z: -9100, elev: 7 },
  pinecrest:  { name: 'Pinecrest', kind: 'town', x: -9800, z: -1200, elev: 150 },
  saltmarsh:  { name: 'Saltmarsh', kind: 'town', x: 13400, z: 5000, elev: 6 },
  cutbank:    { name: 'Cutbank', kind: 'town', x: 1800, z: 600, elev: 62 },
  airport:    { name: 'Meridian International', kind: 'airfield', x: 10200, z: -1800, elev: 28, heading: 90 },
  fortTalon:  { name: 'Fort Talon Air Base', kind: 'airfield', x: -10800, z: 5200, elev: 96, heading: 70 },
  hollow:     { name: "Hollerin' Hollow Strip", kind: 'airfield', x: -800, z: 3400, elev: 88, heading: 350 },
  corvus:     { name: 'Mount Corvus', kind: 'mountain', x: -5200, z: 2200, peak: 1560 },
};

/** Land is the smooth union of these ellipses, then bays are subtracted. rx, rz in meters. */
export const LAND_BLOBS = [
  { x: 0, z: 0, rx: 13200, rz: 9600 },
  { x: 6200, z: -5800, rx: 5600, rz: 4200 },
  { x: 5600, z: 8200, rx: 4700, rz: 3400 },
  { x: -9600, z: 2600, rx: 5200, rz: 5600 },
  { x: 11600, z: 2200, rx: 3600, rz: 5400 },
];
export const BAYS = [
  { x: 800, z: -10600, rx: 3200, rz: 2600 },
  { x: -3000, z: 9800, rx: 3000, rz: 2500 },
];

export const RIVERS = [
  { id: 'corvus-north', w0: 12, w1: 34, pts: [[-5600, 600], [-5200, -900], [-4300, -2300], [-3600, -3800], [-2500, -5400], [-1900, -7000], [-1700, -8900]] },
  { id: 'corvus-east', w0: 10, w1: 30, pts: [[-4300, 3000], [-2900, 3900], [-1400, 5200], [400, 6200], [1900, 7800], [2600, 9800]] },
  { id: 'lake-outflow', w0: 8, w1: 22, pts: [[-8900, -800], [-8000, -2600], [-7400, -4200], [-7900, -6100], [-7600, -8600]] },
];

export const LAKES = [
  { id: 'pinecrest-lake', x: -9000, z: -1700, rx: 1100, rz: 700, depth: 9 },
  { id: 'cutbank-pond', x: 2800, z: 1900, rx: 260, rz: 200, depth: 4 },
];

/** Highway routes between site keys. */
export const ROUTES = [
  ['meridian', 'airport', 'highway'],
  ['meridian', 'portHalden', 'highway'],
  ['meridian', 'ironford', 'highway'],
  ['meridian', 'dunmore', 'road'],
  ['meridian', 'cutbank', 'road'],
  ['ironford', 'pinecrest', 'road'],
  ['ironford', 'dunmore', 'road'],
  ['pinecrest', 'fortTalon', 'road'],
  ['portHalden', 'saltmarsh', 'road'],
  ['portHalden', 'cutbank', 'road'],
  ['airport', 'saltmarsh', 'road'],
  ['cutbank', 'hollow', 'lane'],
  ['ironford', 'fortTalon', 'road'],
];

/** Start areas offered by the menu. Spawn points are provided by the airfield region files. */
export const START_AREAS = ['airport', 'fortTalon', 'hollow'];
