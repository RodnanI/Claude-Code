// End-to-end smoke test of the built game in headless Chromium (software WebGL).
// Usage: node tests/browser/smoke.mjs [dist/fly-high.html] [outDir]
// Boots the game, walks menu -> hangar -> takeoff -> pause, and fails on console errors or missing UI.
import { loadPlaywright, launch, waitFor } from './harness.mjs';
import { PRESETS } from '../../src/settings/presets.js';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const file = resolve(process.argv[2] || 'dist/fly-high.html');
const out = resolve(process.argv[3] || 'out/smoke');
mkdirSync(out, { recursive: true });
const pw = loadPlaywright();
if (!pw) { console.log('SKIP: playwright is not installed'); process.exit(0); }

const errors = [];
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
await ctx.addInitScript((values) => { try { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); } catch { /* storage unavailable */ } }, { ...PRESETS[process.env.PRESET || 'low'], preset: process.env.PRESET || 'low', traffic: 12 });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const shot = async (name) => { await page.evaluate(() => window.__fh.pause()); await new Promise((r) => setTimeout(r, 500)); await page.screenshot({ path: `${out}/${name}.png`, timeout: 180000 }); await page.evaluate(() => window.__fh.resume()); };
const step = (name) => console.log('ok  ' + name);
const fail = (msg) => { console.log('FAIL ' + msg); errors.push(msg); };

await page.goto('file://' + file);
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 300000, poll: 500 });
step('boots to the menu');
await waitFor(page, () => window.__fh.frames > 3, { timeout: 120000 });
await shot('1-menu');
if (!(await page.$('#screen-menu.on'))) fail('menu screen is not visible');

await page.click('#screen-menu .btn.primary');
await waitFor(page, () => window.__fh.frames > 6, { timeout: 120000 });
if (!(await page.$('#screen-hangar.on'))) fail('hangar screen is not visible');
const cards = await page.$$('#screen-hangar .card');
if (cards.length < 3) fail(`expected at least 3 aircraft cards, found ${cards.length}`);
await page.locator('#screen-hangar .card', { hasText: 'Shrike' }).click();
await waitFor(page, () => window.__fh.game.preview && window.__fh.game.preview.spec.id === 'shrike', { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
await shot('2-hangar-shrike');
step('hangar previews the selected aircraft');
await page.locator('#screen-hangar .card', { hasText: 'Skylark' }).click();
await page.click('#screen-hangar .hangar-right .btn.primary');
await waitFor(page, () => window.__fh.game.state === 'flying', { timeout: 120000 });
step('takes off into the flying state');
await new Promise((r) => setTimeout(r, 2500));
await shot('3-flying-chase');
await page.keyboard.down('ShiftLeft');
await waitFor(page, () => window.__fh.game.ent.model.groundSpeed > 6, { timeout: 90000, poll: 500 }).catch(() => fail('aircraft never accelerated with full throttle'));
await page.keyboard.up('ShiftLeft');
step('throttle accelerates the aircraft');
await page.keyboard.press('KeyX');
await new Promise((r) => setTimeout(r, 1500));
await shot('4-flying-cockpit');
await page.keyboard.press('Escape');
await waitFor(page, () => window.__fh.game.state === 'paused', { timeout: 30000 }).catch(() => fail('Escape did not pause'));
await shot('5-paused');
step('pause works');
// settings from the pause menu: change a setting through the real control and see the store follow
await page.click('#screen-pause .btn:has-text("Settings")');
await waitFor(page, () => !!document.querySelector('.sheet .setting'), { timeout: 10000 });
await page.click('.tab:has-text("Cinematic")');
await shot('6-settings');
const before = await page.evaluate(() => window.__fh.store.get('filmGrain'));
await page.locator('.setting:has-text("Film grain") input[type=range]').fill('0.9');
const after = await page.evaluate(() => window.__fh.store.get('filmGrain'));
if (Math.abs(after - 0.9) > 1e-6 || before === after) fail(`film grain slider did not update the store (${before} -> ${after})`);
await page.keyboard.press('Escape');
await waitFor(page, () => !document.querySelector('.sheet'), { timeout: 5000 }).catch(() => fail('Escape did not close the settings'));
if (await page.evaluate(() => window.__fh.game.state) !== 'paused') fail('closing settings must not resume the game');
step('settings dialog edits the store and closes with Escape');
// map
await page.click('#screen-pause .btn:has-text("Island map")');
await waitFor(page, () => !!document.querySelector('.map-wrap canvas'), { timeout: 10000 });
await new Promise((r) => setTimeout(r, 3000));
await shot('7-map');
await page.keyboard.press('Escape');
step('island map opens and closes');
// F3 overlay
await page.keyboard.press('F3');
await new Promise((r) => setTimeout(r, 900));
if (!(await page.$('#stats.on'))) fail('F3 did not show the performance overlay');
await page.keyboard.press('F3');
// crash flow
await page.click('#screen-pause .btn:has-text("Resume")');
await waitFor(page, () => window.__fh.game.state === 'flying', { timeout: 30000 });
await page.evaluate(() => window.__fh.game.ent.model._crash('smoke test crash'));
await waitFor(page, () => !!document.querySelector('#screen-crash.on'), { timeout: 30000 }).catch(() => fail('crash screen never appeared'));
await shot('8-crash');
step('crash screen appears');
await page.click('#screen-crash .btn.primary');
await waitFor(page, () => window.__fh.game.state === 'flying' && !window.__fh.game.ent.model.crashed, { timeout: 60000 }).catch(() => fail('restart after a crash did not work'));
step('restart after a crash works');
const stats = await page.evaluate(() => JSON.stringify(window.__fh.stats()));
console.log('stats', stats);
await browser.close();
if (errors.length) { console.log('\n' + errors.length + ' problem(s):\n' + errors.slice(0, 12).join('\n')); process.exit(1); }
console.log('smoke test passed');
