// Starts a flight in the built game and takes a screenshot. Used for visual checks of presets, time of day and views.
// Usage: node tools/flight-shot.mjs out.png [preset=medium] [plane=skylark] [start=airport-09R] [view=chase|cockpit|orbit] [hour=10.5] [airborne=0|1] [agl=350] [w=1280] [h=720]
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { PRESETS } from '../src/settings/presets.js';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [out = 'out/flight.png', preset = 'medium', plane = 'skylark', start = 'airport-09R', view = 'chase', hour = '10.5', airborne = '0', agl = '350', w = '1280', h = '720', settle = '2500'] = process.argv.slice(2);
const pw = loadPlaywright();
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
await ctx.addInitScript((values) => { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); }, { ...PRESETS[preset], preset, timeOfDay: +hour, traffic: 60 });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await page.goto('file://' + resolve('dist/fly-high.html'));
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 400000, poll: 500 });
await page.evaluate(([plane, start, view, airborne, agl]) => {
  const g = window.__fh.game;
  g.startFlight({ planeId: plane, startId: start, airborne: airborne === '1' });
  if (airborne === '1') { const m = g.ent.model; g.ent.placeAirborne({ x: m.pos[0], y: g.ground.h(m.pos[0], m.pos[2]) + +agl, z: m.pos[2], headingDeg: m.att.heading * 57.2958, ias: g.cruiseFor(g.ent.spec), gear: g.ent.spec.gear.retractable ? 0 : 1 }); }
  g.rig.setMode(view);
}, [plane, start, view, airborne, agl]);
await waitFor(page, () => window.__fh.nodes.settled, { timeout: 400000, poll: 700 }).catch(() => errs.push('terrain never settled'));
await new Promise((r) => setTimeout(r, +settle));
await page.evaluate(() => window.__fh.pause());
await new Promise((r) => setTimeout(r, 700));
mkdirSync(dirname(resolve(out)), { recursive: true });
await page.screenshot({ path: resolve(out), timeout: 300000 });
console.log(out, JSON.stringify(await page.evaluate(() => { const s = window.__fh.stats(); return { fps: +s.fps.toFixed(1), draws: s.draws, tris: s.tris, loaded: s.loaded }; })));
if (errs.length) console.log('ERRORS', errs.slice(0, 6));
await browser.close();
