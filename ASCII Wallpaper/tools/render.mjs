#!/usr/bin/env node
// Offline renderer for the ASCII wallpaper (headless Chromium, software WebGL2).
//
// Stills:
//   node tools/render.mjs --scene procession --t 12 --w 3840 --h 2160 --out shot.png [--set glyphPx=11,detail=1]
//   node tools/render.mjs --scene procession --times 0,10,20 --out frames/f.png      (writes f-0.png, f-1.png ...)
// Video (pipes raw frames into ffmpeg):
//   node tools/render.mjs --scene procession --video out.mp4 --fps 30 --from 0 --dur 60 --w 1920 --h 1080 [--crf 16] [--codec x264|x265]
// Options:
//   --page index.html|src/shell.html (default: src/shell.html)   --json stats.json
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (e) {
  // fall back to a globally installed copy
  const { execSync } = await import('node:child_process');
  const g = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(path.join(g, 'playwright', 'index.mjs')));
}

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1';
    args[k] = v;
  }
}
const W = +(args.w || 1920);
const H = +(args.h || 1080);
const page = path.resolve(ROOT, args.page || 'src/shell.html');
const overrides = {};
if (args.set)
  for (const kv of args.set.split(',')) {
    const [k, v] = kv.split('=');
    overrides[k] = isNaN(+v) ? v : +v;
  }

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog'],
});
const ctx = await browser.newContext({ viewport: { width: Math.min(W, 1920), height: Math.min(H, 1080) } });
const pg = await ctx.newPage();
pg.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 4000));
});
pg.on('pageerror', (e) => console.error('[pageerror]', e.message));
const url = `file://${page}?capture=1&w=${W}&h=${H}` + (args.scene ? `&scene=${args.scene}` : '');
await pg.goto(url);
await pg.waitForFunction(() => window.__asciiReady === true || window.__asciiError, null, { timeout: 120000 });
const perr = await pg.evaluate(() => window.__asciiError);
if (perr) { console.error('page failed:', perr.slice(0, 2000)); await browser.close(); process.exit(1); }
if (Object.keys(overrides).length) await pg.evaluate((o) => window.__ascii.set(o), overrides);

function writePNG(file, rgba, w, h) {
  // readPixels is bottom-up; PNG rows are top-down
  const zlib = awaitZlib;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, (h - 1 - y) * w * 4, (h - y) * w * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(
    file,
    Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))])
  );
}
const awaitZlib = await import('node:zlib');

async function grab(t, warm) {
  const t0 = Date.now();
  const stats = await pg.evaluate(([t, warm]) => window.__ascii.renderAt(t, warm), [t, warm]);
  const b64 = await pg.evaluate(async () => {
    const px = window.__ascii.pixels();
    const blob = new Blob([px]);
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result.slice(r.result.indexOf(',') + 1));
      r.readAsDataURL(blob);
    });
  });
  return { rgba: Buffer.from(b64, 'base64'), stats: { ...stats, ms: Date.now() - t0 } };
}

const allStats = [];
if (args.changes) {
  // Glyph change analysis: render n consecutive frames dt apart and count, per
  // cell, how often the glyph index changes. Separates real motion (coherent
  // regions) from shimmer (scattered single-cell flips). Writes a heat map.
  const [t0, dt, n] = args.changes.split(',').map(Number);
  const r = await pg.evaluate(([t0, dt, n]) => {
    const e = window.__ascii.engine, gl = e.gl;
    const read = () => {
      const f = e.cellFbo[1 - e.cur];
      const buf = new Uint8Array(e.cols * e.rows * 4);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, f);
      gl.readBuffer(gl.COLOR_ATTACHMENT1);
      gl.readPixels(0, 0, e.cols, e.rows, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      const g = new Uint8Array(e.cols * e.rows);
      for (let i = 0; i < g.length; i++) g[i] = buf[i * 4];
      return g;
    };
    window.__ascii.renderAt(t0, 6, 1 / dt);
    let prev = read();
    const cnt = new Uint16Array(prev.length);
    const perFrame = [];
    for (let i = 1; i <= n; i++) {
      e.render(t0 + i * dt);
      const cur = read();
      let c = 0, lit = 0;
      for (let k = 0; k < cur.length; k++) { if (cur[k] || prev[k]) lit++; if (cur[k] !== prev[k]) { cnt[k]++; c++; } }
      perFrame.push(c / Math.max(lit, 1));
      prev = cur;
    }
    return { cols: e.cols, rows: e.rows, cnt: Array.from(cnt), perFrame };
  }, [t0, dt, n]);
  const mean = r.perFrame.reduce((a, b) => a + b, 0) / r.perFrame.length;
  // isolated flips: changed cells whose 4 neighbours did not change in the window
  let iso = 0, changed = 0;
  for (let y = 0; y < r.rows; y++) for (let x = 0; x < r.cols; x++) {
    const v = r.cnt[y * r.cols + x];
    if (!v) continue;
    changed++;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => r.cnt[Math.min(r.rows - 1, Math.max(0, y + dy)) * r.cols + Math.min(r.cols - 1, Math.max(0, x + dx))]);
    if (nb.every((q) => q === 0)) iso++;
  }
  console.log(JSON.stringify({ meanChangedPerFrame: +mean.toFixed(4), cellsEverChanged: changed, isolatedFlipCells: iso, frames: n }));
  if (args.out) {
    const sc = 3, w = r.cols * sc, h = r.rows * sc;
    const img = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = r.cnt[(r.rows - 1 - Math.floor(y / sc)) * r.cols + Math.floor(x / sc)] / n;
      const o = ((h - 1 - y) * w + x) * 4; // writePNG flips rows
      img[o] = Math.min(255, v * 2 * 255); img[o + 1] = Math.min(255, v * 255); img[o + 2] = 40; img[o + 3] = 255;
    }
    writePNG(args.out, img, w, h);
  }
} else if (args.bench) {
  // time N frames of the full pipeline (scene + glyph + compose), forcing GPU completion each frame
  const n = +(args.bench) > 1 ? +args.bench : 5;
  const r = await pg.evaluate(([n, t]) => {
    const e = window.__ascii.engine, gl = e.gl, px = new Uint8Array(4);
    e.render(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { e.render(t + i / 30); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    return { msPerFrame: (performance.now() - t0) / n, stats: e.measure() };
  }, [n, +(args.t || 0)]);
  console.log(JSON.stringify({ msPerFrame: Math.round(r.msPerFrame), cols: r.stats.cols, rows: r.stats.rows, samples: r.stats.samples, drawn: r.stats.nonSpace }));
} else if (args.video) {
  const fps = +(args.fps || 30);
  const from = +(args.from || 0);
  const dur = +(args.dur || 10);
  const n = Math.round(dur * fps);
  const codec = args.codec || 'x264';
  const crf = args.crf || (codec === 'x265' ? '18' : '16');
  const ff = ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-', '-vf', 'vflip'];
  if (codec === 'x265') ff.push('-c:v', 'libx265', '-preset', args.preset || 'slow', '-crf', crf, '-pix_fmt', args.pix || 'yuv420p', '-tag:v', 'hvc1');
  else if (codec === 'png') ff.push('-c:v', 'png');
  else ff.push('-c:v', 'libx264', '-preset', args.preset || 'slow', '-crf', crf, '-pix_fmt', args.pix || 'yuv420p', '-tune', 'animation');
  if (args.maxrate) ff.push('-maxrate', args.maxrate, '-bufsize', args.maxrate);
  ff.push('-movflags', '+faststart', args.video);
  const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  // warm the temporal stability buffer with the frames before the start
  await pg.evaluate(([t]) => window.__ascii.renderAt(t, 8), [from - 1 / fps]);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    await pg.evaluate((t) => window.__ascii.render(t), t);
    const b64 = await pg.evaluate(async () => {
      const px = window.__ascii.pixels();
      return await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result.slice(r.result.indexOf(',') + 1));
        r.readAsDataURL(new Blob([px]));
      });
    });
    const buf = Buffer.from(b64, 'base64');
    if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once('drain', r));
    if (i % 30 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.error(`frame ${i}/${n}  ${(el / (i + 1)).toFixed(2)} s/frame  eta ${((el / (i + 1)) * (n - i - 1) / 60).toFixed(1)} min`);
    }
  }
  proc.stdin.end();
  await new Promise((r) => proc.on('close', r));
} else {
  const times = (args.times || args.t || '0').split(',').map(Number);
  const out = args.out || 'shot.png';
  for (let i = 0; i < times.length; i++) {
    const { rgba, stats } = await grab(times[i], +(args.warm || 6));
    const file = times.length > 1 ? out.replace(/\.png$/, `-${i}.png`) : out;
    writePNG(file, rgba, W, H);
    allStats.push({ t: times[i], file, ...stats });
    console.log(JSON.stringify({ t: times[i], file, cols: stats.cols, rows: stats.rows, cells: stats.cells, drawn: stats.nonSpace, visible: stats.visible, distinct: stats.distinct, ms: stats.ms }));
  }
  if (args.json) fs.writeFileSync(args.json, JSON.stringify(allStats, null, 1));
}
await browser.close();
