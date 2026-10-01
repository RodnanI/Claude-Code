// Flies every aircraft of the built game: starts it from the hangar path, cycles the camera with X through far chase, close chase,
// cockpit and orbit, looks back, fires its weapon and checks the console for errors. One screenshot per aircraft and view.
// Usage: node tests/browser/fleet.mjs [dist/fly-high.html] [outDir]     env: PLANES=skylark,shrike  PRESET=low  SHOTS=0
import { loadPlaywright, launch, waitFor } from './harness.mjs';
import { PRESETS } from '../../src/settings/presets.js';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const file = resolve(process.argv[2] || 'dist/fly-high.html');
const out = resolve(process.argv[3] || 'out/fleet');
mkdirSync(out, { recursive: true });
const pw = loadPlaywright();
if (!pw) { console.log('SKIP: playwright is not installed'); process.exit(0); }
const only = process.env.PLANES ? new Set(process.env.PLANES.split(',')) : null;
const shots = process.env.SHOTS !== '0';

const errors = [];
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript((values) => { try { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); } catch { /* storage unavailable */ } }, { ...PRESETS[process.env.PRESET || 'low'], preset: process.env.PRESET || 'low', traffic: 4 });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const shot = async (name) => {
  if (!shots) return;
  await page.evaluate(() => window.__fh.pause());
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 180000 });
  await page.evaluate(() => window.__fh.resume());
};
const fail = (msg) => { console.log('FAIL ' + msg); errors.push(msg); };
const frames = (n) => page.evaluate(async (n) => { const f0 = window.__fh.frames; while (window.__fh.frames < f0 + n) await new Promise((r) => setTimeout(r, 40)); }, n);

await page.goto('file://' + file);
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 300000, poll: 500 });
await waitFor(page, () => window.__fh.frames > 3, { timeout: 120000 });
const ids = await page.evaluate(() => window.__fh.game.planes.map((p) => p.id));
console.log('aircraft in the build:', ids.length, ids.join(' '));
if (ids.length < 12) fail(`expected at least 12 aircraft, found ${ids.length}`);

for (const id of ids) {
  if (only && !only.has(id)) continue;
  const t0 = Date.now();
  await page.evaluate((id) => { const a = window.__fh.app; a.sel.plane = id; a.sel.airborne = true; a.sel.livery = 'default'; a.fly(); }, id);
  await waitFor(page, (id) => window.__fh.game.state === 'flying' && window.__fh.game.ent && window.__fh.game.ent.spec.id === id, { timeout: 240000, poll: 250, arg: id }).catch(() => fail(`${id}: never reached the flying state`));
  await page.evaluate(() => window.__fh.game.rig.skipIntro());
  await page.evaluate(() => window.__fh.game.rig.setMode('chase'));
  await frames(40);
  const modes = [];
  for (const expect of ['chase', 'near', 'cockpit', 'orbit']) {
    modes.push(await page.evaluate(() => window.__fh.game.rig.mode));
    if (expect !== 'orbit') await shot(`${id}-${expect}`);
    await page.keyboard.press('KeyX');
    await frames(30);
  }
  if (modes.join() !== 'chase,near,cockpit,orbit') fail(`${id}: X cycled ${modes.join(',')} instead of chase,near,cockpit,orbit`);
  await page.evaluate(() => window.__fh.game.rig.setMode('chase'));
  // the weapon: hold J and see something leave
  const before = await page.evaluate(() => { const w = window.__fh.game.weapons; return { n: w.loadout ? w.loadout.list.length : 0, left: w.loadout ? w.loadout.remaining() : 0 }; });
  if (before.n) {
    await page.keyboard.down('KeyJ');
    await frames(45);
    await page.keyboard.up('KeyJ');
    await frames(60);
    const after = await page.evaluate(() => { const w = window.__fh.game.weapons; return { left: w.loadout.remaining(), name: w.loadout.current.def.name }; });
    if (after.left >= before.left) fail(`${id}: firing ${after.name} used no rounds (${before.left} before, ${after.left} after)`);
    await shot(`${id}-fire`);
    await page.keyboard.press('KeyK');
    await frames(5);
  }
  const state = await page.evaluate(() => { const m = window.__fh.game.ent.model; return { crashed: !!m.crashed, speed: Math.round(m.groundSpeed) }; });
  if (state.crashed) fail(`${id}: crashed while cruising and shooting`);
  console.log(`ok  ${id.padEnd(11)} ${((Date.now() - t0) / 1000).toFixed(1)}s  weapons ${before.n}  speed ${state.speed} m/s`);
  await page.keyboard.press('Escape');
  await waitFor(page, () => window.__fh.game.state === 'paused', { timeout: 30000 }).catch(() => fail(`${id}: Escape did not pause`));
  await page.evaluate(() => { window.__fh.game.toMenu(); window.__fh.app.showHangar(); });
  await frames(5);
}
await browser.close();
if (errors.length) { console.log('\n' + errors.length + ' problem(s):\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('fleet test passed');
