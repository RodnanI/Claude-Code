// Flight envelope report for one or all aircraft, run against the real flight model (no browser).
// Usage: node tools/flight-lab.mjs [plane|all] [--landing] [--quick]
// Prints mass, wing loading, stall speeds, trim and top speed at altitudes, climb, roll rate, takeoff and a soft landing.
import { AIRCRAFT } from '../src/generated/registry.js';
import { FlightModel, KT } from '../src/aircraft/flight/model.js';
import { solveTrim, startAirborne } from '../src/aircraft/flight/trim.js';
import { simulateTakeoff, stallSpeed } from '../src/aircraft/flight/takeoff.js';
import { climbRate, rollRate } from '../src/aircraft/flight/performance.js';
import { totalMass } from '../src/aircraft/base.js';

const arg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'all';
const quick = process.argv.includes('--quick');
const DT = 1 / 240;
const SKY = { h: () => -1e6, surface: () => 'GRASS' };
const flat = (name = 'RUNWAY') => ({ h: () => 0, surface: () => name });
const kt = (ms) => (ms * KT).toFixed(0);

function topSpeed(spec, alt) {
  let lo = 20, hi = spec.limits.vne * 1.4;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const t = solveTrim(spec, { ias: mid, alt, gear: 0 });
    if (t.saturated) hi = mid; else lo = mid;
  }
  return lo;
}

function rollTest(spec, ias) {
  const m = new FlightModel(spec, SKY);
  startAirborne(m, { x: 0, y: 3000, z: 0, heading: 0, ias, gear: 0 });
  m.input.roll = 1;
  let peak = 0;
  for (let i = 0; i < 3 * 240; i++) { m.step(DT); peak = Math.max(peak, Math.abs(m.omega[0])); }
  return { peak: peak * 57.3, bank: m.att.roll * 57.3, crashed: m.crashed };
}

function landing(spec, sink) {
  const vs0 = stallSpeed(spec, { flaps: 1 });
  const ias = vs0 * 1.3;
  const m = new FlightModel(spec, flat());
  startAirborne(m, { x: 0, y: 0.4 - m.gearBottom, z: 0, heading: Math.PI / 2, ias, flaps: 1 });
  m.vel[1] = -sink; m._preVy = -sink;
  m.input.throttle = 0;
  let stopAt = null;
  for (let i = 0; i < 60 * 240 && !m.crashed; i++) {
    if (m.onGround) { m.input.brake = 0.6; m.input.yaw = Math.max(-1, Math.min(1, (Math.PI / 2 - m.att.heading) * 2.5 + m.omega[1])); m.input.pitch = 0.05; }
    m.step(DT);
    if (m.onGround && m.groundSpeed < 1.5) { stopAt = m.pos[0]; break; }
  }
  return { crashed: m.crashed, reason: m.crashReason, stopAt, ias };
}

function steady(spec, kts, alt) {
  const m = new FlightModel(spec, SKY);
  const t = startAirborne(m, { x: 0, y: alt, z: 0, heading: 1, ias: kts / KT, gear: spec.gear.retractable ? 0 : 1 });
  let dh = 0, dv = 0;
  for (let i = 0; i < 60 * 240; i++) { m.step(DT); dh = Math.max(dh, Math.abs(m.pos[1] - alt)); dv = Math.max(dv, Math.abs(m.ias * KT - kts)); }
  return { sat: t.saturated, dh, dv, crashed: m.crashed, thr: t.throttle, elev: t.elevator, alpha: t.alpha * 57.3 };
}

function report(spec) {
  const W = totalMass(spec);
  console.log(`\n=== ${spec.id}  ${spec.name}  (${spec.propulsion.type}) ===`);
  console.log(`mass ${W.toFixed(0)} kg  wing ${spec.wing.area} m2  loading ${(W / spec.wing.area).toFixed(0)} kg/m2  span ${spec.wing.span} m  AR ${(spec.wing.span ** 2 / spec.wing.area).toFixed(1)}`);
  const p = spec.propulsion;
  const thr = p.type === 'jet' ? p.thrust + (p.afterburner || 0) : p.power * 0.8 / 40;
  console.log(`stall clean ${kt(stallSpeed(spec))} kt   flaps ${kt(stallSpeed(spec, { flaps: 1 }))} kt   vne ${kt(spec.limits.vne)} kt   ${p.type === 'jet' ? 'T/W ' + (thr / (W * 9.81)).toFixed(2) : 'hp ' + Math.round(p.power / 745.7)}`);
  for (const alt of [0, 3000, 8000]) console.log(`top speed ${String(alt).padStart(5)} m: ${kt(topSpeed(spec, alt))} kt IAS`);
  const vy = stallSpeed(spec) * 1.4;
  console.log(`climb at ${kt(vy)} kt: ${climbRate(spec, { ias: vy }).toFixed(1)} m/s   roll (analytic) ${rollRate(spec).toFixed(0)} deg/s`);
  const cruise = Math.max(stallSpeed(spec) * 1.5, Math.min(topSpeed(spec, 3000) * 0.75, spec.limits.vne * 0.8));
  const r = rollTest(spec, cruise);
  console.log(`roll test at ${kt(cruise)} kt: peak ${r.peak.toFixed(0)} deg/s, bank after 3 s ${r.bank.toFixed(0)}${r.crashed ? '  CRASHED' : ''}`);
  const tr = solveTrim(spec, { ias: cruise, alt: 3000, gear: 0 });
  console.log(`trim at ${kt(cruise)} kt / 3000 m: thr ${tr.throttle.toFixed(2)}  elev ${tr.elevator.toFixed(2)}  alpha ${(tr.alpha * 57.3).toFixed(1)} deg${tr.saturated ? '  SATURATED' : ''}`);
  const st = steady(spec, cruise * KT, 3000);
  console.log(`one minute hands off: altitude wander ${st.dh.toFixed(0)} m, speed wander ${st.dv.toFixed(1)} kt${st.crashed ? '  CRASHED' : ''}`);
  for (const surface of ['RUNWAY', 'GRASS']) {
    const s = simulateTakeoff(spec, { surface });
    console.log(`takeoff ${surface}: ${s.ok ? `roll ${s.roll.toFixed(0)} m, 50 ft at ${s.d50.toFixed(0)} m, liftoff ${kt(s.vLof)} kt` : 'FAILED ' + s.reason}`);
  }
  if (!quick) {
    for (const sink of [0.8, 2.2]) {
      const l = landing(spec, sink);
      console.log(`landing at ${kt(l.ias)} kt, sink ${sink} m/s: ${l.crashed ? 'CRASH ' + l.reason : `ok, stopped after ${l.stopAt === null ? '?' : l.stopAt.toFixed(0)} m`}`);
    }
  }
}

for (const spec of AIRCRAFT) if (arg === 'all' || spec.id === arg) report(spec);
