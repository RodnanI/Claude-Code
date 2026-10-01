// Fires a weapon from an aircraft frozen in the air and photographs what it does to the island.
// Usage: node tools/blast-shot.mjs <out prefix> [preset] [plane] [weaponIndex] [x z agl heading] [camera: dist elev az]
//   node tools/blast-shot.mjs out/b low shrike 3 2400 -1900 260 90
// Needs dist/fly-high.html (npm run build). Writes <prefix>-0-before.png, -1-flight.png, -2-blast.png, -3-after.png.
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { PRESETS } from '../src/settings/presets.js';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [prefix = 'out/blast', preset = 'low', plane = 'shrike', widx = '3', sx, sz, sagl, shd] = process.argv.slice(2);
const cam = process.argv.slice(10).map(Number);
const pw = loadPlaywright();
if (!pw) { console.log('SKIP: playwright is not installed'); process.exit(0); }
mkdirSync(dirname(resolve(prefix)), { recursive: true });
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript((values) => { try { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); } catch { /* none */ } }, { ...PRESETS[preset], preset, traffic: 20 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto('file://' + resolve('dist/fly-high.html'));
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 300000, poll: 500 });
const shot = async (name) => { console.log(name, JSON.stringify(await page.evaluate(() => { const g = window.__fh.game; return { state: g.state, hud: g.hud.visible, ov: !!g.camOverride, mode: g.rig.mode, crashed: g.ent && g.ent.model.crashed, reason: g.ent && g.ent.model.crashReason, blasts: g.weapons.stats.blasts, shots: g.weapons.shots.length, time: g.time }; }))); await page.evaluate(() => window.__fh.pause()); await new Promise((r) => setTimeout(r, 400)); await page.screenshot({ path: `${prefix}-${name}.png`, timeout: 180000 }); await page.evaluate(() => window.__fh.resume()); console.log('wrote', `${prefix}-${name}.png`); };
const frames = (n) => page.evaluate((n) => { window.__f0 = window.__fh.frames; return new Promise((res) => { const t = setInterval(() => { if (window.__fh.frames >= window.__f0 + n) { clearInterval(t); res(); } }, 50); }); }, n);

const scene = { pitch: +(process.env.PITCH ?? -12), plane, widx: +widx, x: sx !== undefined ? +sx : 2400, z: sz !== undefined ? +sz : -1900, agl: sagl !== undefined ? +sagl : 260, hd: shd !== undefined ? +shd : 90, cam };
await page.evaluate(async (S) => {
  const g = window.__fh.game;
  g.app = window.__fh.app;
  window.__fh.app.hideAll();
  g.startFlight({ planeId: S.plane, startId: 'airport-09R', airborne: true });
  const e = g.ent;
  const gh = g.ground.h(S.x, S.z);
  const ias = g.cruiseFor(e.spec) * 1.1;
  e.placeAirborne({ x: S.x, y: gh + S.agl, z: S.z, headingDeg: S.hd, ias });
  e.model.setState({ x: S.x, y: gh + S.agl, z: S.z, heading: (S.hd * Math.PI) / 180, pitch: (S.pitch * Math.PI) / 180, speed: ias });
  e.model.updateChannels(); e._snap();
  // freeze the airframe in the air: the weapons, the effects and the world keep running
  e.step = () => {};
  g.weapons.loadout.sel = S.widx;
  g.rig.setMode('near');
}, scene);
await frames(40);
await shot('0-before');
const info = await page.evaluate(() => { const g = window.__fh.game, w = g.weapons.loadout.current; return { weapon: w.def.name, left: g.weapons.loadout.remaining(), designation: g.weapons.designation, trigger: null }; });
console.log(JSON.stringify(info));
await page.evaluate(() => { const g = window.__fh.game; g.weapons.trigger(g.ent, true, 0.016, true); });
await frames(14);
await shot('1-flight');
// wait for the first blast
await waitFor(page, () => window.__fh.game.weapons.stats.blasts > 0, { timeout: 240000, poll: 400 }).catch(() => console.log('no blast within the time limit'));
const bl = await page.evaluate(() => ({ list: window.__fh.game.nodes && window.__fh.game.constructor ? 0 : 0, blasts: window.__fh.game.weapons.stats.blasts }));
// look at the place where it went off
const ovr = await page.evaluate((c) => {
  const g = window.__fh.game;
  const d = g.world.damage;
  const b = d.list[d.list.length - 1] || { x: g.ent.pos[0], y: g.ent.pos[1], z: g.ent.pos[2], r: 20 };
  const dist = (c[0] || b.r * 4 + 30), el = ((c[1] || 18) * Math.PI) / 180, az = ((c[2] || 200) * Math.PI) / 180;
  const cx = b.x + Math.sin(az) * Math.cos(el) * dist, cz = b.z - Math.cos(az) * Math.cos(el) * dist, cy = Math.max(b.y + Math.sin(el) * dist, g.ground.h(cx, cz) + 3);
  g.camOverride = { x: cx, y: cy, z: cz, fx: b.x - cx, fy: b.y + b.r * 0.4 - cy, fz: b.z - cz, fov: 62 };
  g.hud.visible = false;
  return { ov: g.camOverride, hud: g.hud.visible, n: d.list.length, b };
}, cam);
console.log(JSON.stringify(ovr));
await frames(6);
await shot('2-blast');
await frames(40);
await shot('3-after');
await frames(120);
await shot('4-later');
console.log('blasts', bl.blasts, 'errors', errors.length ? errors.slice(0, 6).join('\n') : 'none');
await browser.close();
