// Meter every music track and sound effect through an analyser.
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
(async () => {
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'Andor.html') + '#scene=title');
  await page.waitForTimeout(500);
  const res = await page.evaluate(async () => {
    const A = window.__andor;
    const AS = A.AudioSys;
    AS.init();
    const an = AS.ctx.createAnalyser();
    an.fftSize = 2048;
    AS.comp.connect(an);
    const buf = new Float32Array(an.fftSize);
    const meter = async (ms) => {
      let peak = 0, sum = 0, n = 0, nan = false;
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        an.getFloatTimeDomainData(buf);
        for (const v of buf) {
          if (Number.isNaN(v)) nan = true;
          peak = Math.max(peak, Math.abs(v));
          sum += v * v;
          n++;
        }
        await new Promise((r) => setTimeout(r, 40));
      }
      return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4), nan };
    };
    const out = { state: AS.ctx.state, music: {}, sfx: {} };
    for (const name of Object.keys(A.TRACKS)) {
      A.Music.play(name, 0.05);
      await new Promise((r) => setTimeout(r, 400));
      out.music[name] = await meter(2500);
      A.Music.stop(0.05);
      await new Promise((r) => setTimeout(r, 300));
    }
    for (const name of Object.keys(A.SFX)) {
      A.Sfx.last = {};
      A.Sfx.play(name);
      out.sfx[name] = await meter(350);
      await new Promise((r) => setTimeout(r, 120));
    }
    return out;
  });
  console.log('context:', res.state);
  for (const [k, v] of Object.entries(res.music)) console.log('music', k.padEnd(8), JSON.stringify(v));
  const quiet = [], loud = [];
  for (const [k, v] of Object.entries(res.sfx)) {
    if (v.peak < 0.01) quiet.push(k);
    if (v.peak > 0.98) loud.push(k);
    if (v.nan) console.log('NaN in', k);
  }
  console.log('sfx count', Object.keys(res.sfx).length, 'silent:', quiet.join(',') || '-', 'clipping:', loud.join(',') || '-');
  console.log(Object.entries(res.sfx).map(([k, v]) => k + '=' + v.peak).join(' '));
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();
