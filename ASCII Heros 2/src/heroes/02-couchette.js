HEROES.push({
  id: 'couchette',
  name: 'Couchette',
  title: 'Couchette · Night trains across Europe',
  kind: 'Night train booking',
  tech: 'A working split-flap wall: every tile can only advance around its drum, flips cascade in staggered waves, the cursor spins tiles, and the booking form rewrites the board. Optional synthesized clatter.',
  accent: '#ffb000',
  fonts: 'family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500',
  css: `
.h-couchette{--bg:#0a0a0a;--fg:#efe9dc;--mut:rgba(239,233,220,.55);--line:rgba(239,233,220,.14);--panel:#111;--tile:#1a1a1a;--tile2:#141414;--glyph:#f1ebde;--split:#030303;--acc:#ffb000;color-scheme:dark;font-family:"Barlow",system-ui,sans-serif}
:root[data-theme=light] .h-couchette{--bg:#e6e3dc;--fg:#151515;--mut:rgba(21,21,21,.6);--line:rgba(21,21,21,.16);--panel:#efece6;--tile:#fdfcf8;--tile2:#f2efe8;--glyph:#141414;--split:#c4bfb4;color-scheme:light}
.h-couchette .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto minmax(0,1fr) auto}
.h-couchette .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px clamp(16px,3vw,40px) 14px;font:600 13px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.14em;text-transform:uppercase}
.h-couchette .logo{display:flex;align-items:baseline;gap:12px;font:700 24px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.1em}
.h-couchette .logo small{font:500 12px/1 "Barlow Condensed",sans-serif;letter-spacing:.18em;color:var(--mut)}
.h-couchette .links{display:flex;gap:28px}
.h-couchette .links a{opacity:.7;transition:opacity .2s}
.h-couchette .links a:hover{opacity:1}
.h-couchette .tools{display:flex;gap:8px}
.h-couchette .tools button{height:30px;padding:0 12px;border:1px solid var(--line);border-radius:3px;background:none;font:600 12px/1 "Barlow Condensed",sans-serif;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:8px;transition:border-color .2s}
.h-couchette .tools button:hover{border-color:var(--fg)}
.h-couchette .tools i{width:7px;height:7px;border-radius:50%;border:1px solid currentColor}
.h-couchette .snd[aria-pressed=true] i{background:var(--acc);border-color:var(--acc)}
:root[data-theme=light] .h-couchette .tt i{background:currentColor}
.h-couchette .tt .lt,:root[data-theme=light] .h-couchette .tt .dk{display:none}
:root[data-theme=light] .h-couchette .tt .lt{display:inline}
.h-couchette .board{position:relative;display:flex;flex-direction:column;min-height:0;margin:0 clamp(10px,2.4vw,32px)}
.h-couchette .bh{display:flex;justify-content:space-between;align-items:center;padding:10px 2px 10px;border-top:2px solid var(--fg);font:600 12px/1 "Barlow Condensed",sans-serif;letter-spacing:.24em;text-transform:uppercase}
.h-couchette .bh b{font-weight:700;color:var(--acc);letter-spacing:.12em}
:root[data-theme=light] .h-couchette .bh b{color:var(--fg)}
.h-couchette .bh .clock{font:700 15px/1 "Barlow Condensed",sans-serif;letter-spacing:.1em;font-variant-numeric:tabular-nums}
.h-couchette .wallbox{position:relative;flex:1;min-height:0}
.h-couchette .wall{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.h-couchette .panel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px 48px;align-items:end;padding:18px clamp(16px,3vw,40px) 20px}
.h-couchette .sub{margin:0;max-width:40ch;font-size:clamp(15px,1.25vw,18px);line-height:1.45;color:var(--mut)}
.h-couchette .sub b{color:var(--fg);font-weight:500}
.h-couchette .book{display:flex;align-items:stretch;width:min(860px,62vw);border:1px solid var(--line);border-radius:4px;background:var(--panel);overflow:hidden}
.h-couchette .f{position:relative;flex:1 1 0;display:flex;flex-direction:column;justify-content:center;gap:7px;padding:12px 34px 12px 18px;border-right:1px solid var(--line);min-width:0}
.h-couchette .f span{font:600 11px/1 "Barlow Condensed",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--mut)}
.h-couchette .f select{appearance:none;-webkit-appearance:none;background:none;border:0;outline:none;padding:0;margin:0;font:700 21px/1.1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--fg);cursor:pointer;width:100%;text-overflow:ellipsis}
.h-couchette .f select option{color:initial;text-transform:none}
.h-couchette .f::after{content:"";position:absolute;right:16px;bottom:18px;width:6px;height:6px;border-right:1.5px solid var(--mut);border-bottom:1.5px solid var(--mut);transform:rotate(45deg);pointer-events:none}
.h-couchette .f:focus-within{background:rgba(255,176,0,.08)}
.h-couchette .go{flex:none;display:flex;align-items:center;gap:12px;padding:0 24px;border:0;background:var(--acc);color:#111;font:700 15px/1 "Barlow Condensed",sans-serif;letter-spacing:.14em;text-transform:uppercase;transition:filter .2s}
.h-couchette .go:hover{filter:brightness(1.08)}
.h-couchette .go b{font-size:20px;transition:transform .25s}
.h-couchette .go:hover b{transform:translateX(4px)}
@media (max-width:1100px){.h-couchette .links{display:none}.h-couchette .panel{grid-template-columns:1fr}.h-couchette .book{width:100%}}
@media (max-width:640px){
  .h-couchette .nav{padding:12px 14px 10px}
  .h-couchette .logo{font-size:20px}.h-couchette .logo small{display:none}
  .h-couchette .tools button{height:34px;padding:0 10px}
  .h-couchette .tools .lbl{display:none}
  .h-couchette .bh{font-size:10.5px;letter-spacing:.16em;padding:8px 2px}
  .h-couchette .panel{padding:12px 12px 12px;gap:12px}
  .h-couchette .sub{font-size:14px}
  .h-couchette .book{display:grid;grid-template-columns:1fr 1fr}
  .h-couchette .f{padding:10px 30px 10px 12px;border-bottom:1px solid var(--line)}
  .h-couchette .f:nth-child(2n){border-right:0}
  .h-couchette .f select{font-size:18px}
  .h-couchette .f::after{right:12px;bottom:16px}
  .h-couchette .go{grid-column:1/-1;justify-content:center;height:48px}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">COUCHETTE<small>Night trains &middot; est. 1957</small></a>
    <nav class="links" aria-label="Primary"><a href="#">Routes</a><a href="#">Cabins</a><a href="#">Rail passes</a><a href="#">Help</a></nav>
    <div class="tools">
      <button class="snd" type="button" aria-pressed="false" aria-label="Board sound"><i></i><span class="lbl">Sound</span></button>
      <button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><i></i><span class="lbl"><span class="dk">Night</span><span class="lt">Day</span></span></button>
    </div>
  </header>
  <div class="board">
    <div class="bh"><span><b>D&eacute;parts</b> &middot; Departures &middot; Abfahrt</span><span class="clock">--:--</span></div>
    <div class="wallbox"><canvas class="wall" aria-hidden="true"></canvas></div>
  </div>
  <section class="panel">
    <h1 class="sr" aria-live="polite">Fall asleep in Paris. Wake up in Vienna.</h1>
    <p class="sub">Night trains across fourteen countries. <b>A real bed, a door that locks,</b> and breakfast somewhere you didn't fall asleep.</p>
    <form class="book" autocomplete="off">
      <label class="f"><span>From</span><select name="from"></select></label>
      <label class="f"><span>To</span><select name="to"></select></label>
      <label class="f"><span>Night of</span><select name="date"></select></label>
      <label class="f"><span>Cabin</span><select name="cabin"><option>Couchette</option><option selected>Sleeper</option><option>Deluxe</option></select></label>
      <button class="go" type="submit">Find a berth <b>&rarr;</b></button>
    </form>
  </section>
</div>`,
  init: function (root, L, S) {
    const canvas = root.querySelector('.wall'), box = root.querySelector('.wallbox'), ctx = canvas.getContext('2d');
    const form = root.querySelector('.book'), selFrom = form.from, selTo = form.to, selDate = form.date, h1 = root.querySelector('h1'), clock = root.querySelector('.clock'), snd = root.querySelector('.snd');
    const P = S.pointer(root);
    const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:-'/+&", D = DRUM.length, FLIP = 0.055;
    const idx = (c) => Math.max(0, DRUM.indexOf(c));
    const CITY = { PARIS: 'PARIS EST', AMSTERDAM: 'AMSTERDAM C', BERLIN: 'BERLIN HBF', VIENNA: 'WIEN HBF', ZURICH: 'ZURICH HB', PRAGUE: 'PRAHA HL.N.', ROME: 'ROMA TERMINI', BARCELONA: 'BARCELONA S', BRUSSELS: 'BRUXELLES MIDI', HAMBURG: 'HAMBURG HBF', MUNICH: 'MUNCHEN HBF', VENICE: 'VENEZIA S.L.', BUDAPEST: 'BUDAPEST KEL.', COPENHAGEN: 'KOBENHAVN H', STOCKHOLM: 'STOCKHOLM C', KRAKOW: 'KRAKOW GL.' };
    const NAMES = Object.keys(CITY);
    const fill = (sel, v) => { sel.innerHTML = NAMES.map((n) => `<option value="${n}"${n === v ? ' selected' : ''}>${n[0] + n.slice(1).toLowerCase()}</option>`).join(''); };
    fill(selFrom, 'PARIS'); fill(selTo, 'VIENNA');
    { const d = new Date(), wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      selDate.innerHTML = Array.from({ length: 14 }, (_, k) => { const x = new Date(d.getTime() + k * 864e5); return `<option>${k ? wd[x.getDay()] + ' ' + x.getDate() + ' ' + mo[x.getMonth()] : 'Tonight'}</option>`; }).join(''); }

    let cols = 0, rows = 0, tw = 0, th = 0, gap = 0, ox = 0, oy = 0, dpr = 1, tiles = [], atlas = null, atlasA = null, allDirty = true;
    let from = 'PARIS', to = 'VIENNA', message = null, lastUser = -1e9, cycleT = 9, clicks = 0;

    /* ---------- glyph atlases: one finished tile per drum character ---------- */
    const build = () => {
      const cs = getComputedStyle(root), v = (n) => cs.getPropertyValue(n).trim();
      const mk = (bg1, bg2, fg) => {
        const c = document.createElement('canvas'); c.width = D * tw; c.height = th;
        const x = c.getContext('2d'), r = Math.max(2, tw * 0.07), half = th / 2;
        x.font = `700 ${Math.round(th * 0.76)}px "Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        for (let k = 0; k < D; k++) {
          const X = k * tw;
          x.save();
          x.beginPath(); x.roundRect ? x.roundRect(X + 0.5, 0.5, tw - 1, th - 1, r) : x.rect(X, 0, tw, th); x.clip();
          x.fillStyle = bg1; x.fillRect(X, 0, tw, half);
          x.fillStyle = bg2; x.fillRect(X, half, tw, half);
          const ch = DRUM[k];
          if (ch !== ' ') {
            x.fillStyle = fg;
            const w = x.measureText(ch).width, sx = Math.min(1, (tw * 0.8) / Math.max(1, w));
            x.save(); x.translate(X + tw / 2, half + th * 0.035); x.scale(sx, 1); x.fillText(ch, 0, 0); x.restore();
          }
          x.fillStyle = v('--split'); x.fillRect(X, Math.round(half) - Math.max(1, dpr * 0.75), tw, Math.max(1, dpr * 1.5));
          x.fillRect(X, half - th * 0.07, Math.max(2, dpr * 2), th * 0.14); x.fillRect(X + tw - Math.max(2, dpr * 2), half - th * 0.07, Math.max(2, dpr * 2), th * 0.14);
          x.restore();
        }
        return c;
      };
      atlas = mk(v('--tile'), v('--tile2'), v('--glyph'));
      atlasA = mk('#ffb000', '#f2a600', '#111111');
      allDirty = true;
    };

    const layout = () => {
      const W = box.clientWidth, H = box.clientHeight;
      if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      let h = Math.max(30, Math.min(66, H / 8.6));
      let w = Math.round(h * 0.64);
      const g0 = Math.max(2, Math.round(h * 0.07));
      const fitW = Math.floor((W + g0) / 15) - g0;
      if (w > fitW) { w = fitW; h = w / 0.64; }
      const gp = Math.max(2, Math.round(h * 0.07));
      cols = Math.max(8, Math.floor((W + gp) / (w + gp)));
      rows = Math.max(4, Math.floor((H + gp) / (h + gp)));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      tw = Math.round(w * dpr); th = Math.round(h * dpr); gap = Math.round(gp * dpr);
      ox = Math.round((canvas.width - (cols * (tw + gap) - gap)) / 2); oy = Math.round((canvas.height - (rows * (th + gap) - gap)) / 2);
      const old = tiles;
      tiles = Array.from({ length: cols * rows }, () => ({ cur: 0, tgt: 0, nx: 0, p: 0, delay: 0, spin: 0, acc: false, cool: 0, dirty: true }));
      if (old.length) for (const t of tiles) t.cur = (Math.random() * D) | 0;
      build();
      compose(true);
    };

    /* ---------- what the board should say ---------- */
    const wrap = (s, n) => { const out = []; let line = ''; for (const w of s.split(' ')) { if (!line) line = w; else if ((line + ' ' + w).length <= n) line += ' ' + w; else { out.push(line); line = w; } } if (line) out.push(line); return out; };
    const pad = (s, n) => (s.length > n ? s.slice(0, n) : s + ' '.repeat(n - s.length));
    const departures = () => {
      const h = L.hashStr(from + to), list = [to];
      for (let k = 0; list.length < 5 && k < 40; k++) { const c = NAMES[(h + k * 7) % NAMES.length]; if (c !== from && !list.includes(c)) list.push(c); }
      let m = 19 * 60 + 12 + (h % 40);
      return list.map((c, k) => { m += 14 + ((h >>> (k * 3)) % 47); const hh = String(Math.floor(m / 60) % 24).padStart(2, '0'), mm = String(m % 60).padStart(2, '0'); return { time: hh + ':' + mm, dest: CITY[c], train: 'CX ' + (300 + ((h >>> k) % 600)), pl: String(1 + ((h >>> (k + 2)) % 9)) }; }).sort((a, b) => (a.time < b.time ? -1 : 1));
    };
    const compose = (instant) => {
      if (!cols) return;
      const grid = Array.from({ length: rows }, () => ' '.repeat(cols).split('')), acc = Array.from({ length: rows }, () => new Array(cols).fill(false));
      const put = (r, c, s, a) => { for (let k = 0; k < s.length && c + k < cols; k++) if (r >= 0 && r < rows && c + k >= 0) { grid[r][c + k] = s[k]; if (a) acc[r][c + k] = true; } };
      const narrow = cols < 24, left = narrow ? 0 : 1;
      const lines = message ? message.flatMap((m) => wrap(m, cols - left * 2)) : [...wrap(`FALL ASLEEP IN ${from}.`, cols - left * 2), ...wrap(`WAKE UP IN ${to}.`, cols - left * 2)];
      let r = rows >= 10 ? 1 : 0;
      for (const ln of lines) put(r++, left, ln);
      r++;
      const deps = departures(), room = rows - r;
      for (let k = 0; k < Math.min(deps.length, room - (rows >= 10 ? 1 : 0)); k++, r++) {
        const d = deps[k];
        if (cols >= 27) { put(r, left, d.time); put(r, left + 6, pad(d.dest, cols - left * 2 - 16)); put(r, cols - left - 9, d.train); put(r, cols - left - 1, d.pl, true); }
        else { put(r, left, d.time); put(r, left + 6, pad(d.dest, cols - left * 2 - 8)); put(r, cols - left - 1, d.pl, true); }
      }
      h1.textContent = message ? message.join(' ') : `Fall asleep in ${from[0] + from.slice(1).toLowerCase()}. Wake up in ${to[0] + to.slice(1).toLowerCase()}.`;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const t = tiles[y * cols + x], g = idx(grid[y][x]);
        if (t.tgt !== g || instant) {
          t.tgt = g;
          t.delay = instant ? x * 0.012 + y * 0.03 + Math.random() * 0.25 : x * 0.028 + y * 0.055 + Math.random() * 0.14;
        }
        if (t.acc !== acc[y][x]) { t.acc = acc[y][x]; t.dirty = true; }
      }
    };

    /* ---------- optional clatter: filtered noise clicks, throttled ---------- */
    let ac = null, noise = null, sound = false;
    const click = (when, gain) => {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 2600; f.Q.value = 1.4;
      g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
      s.connect(f).connect(g).connect(ac.destination); s.start(when); s.stop(when + 0.04);
    };
    S.on(snd, 'click', () => {
      sound = !sound; snd.setAttribute('aria-pressed', String(sound));
      if (sound && !ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC(); noise = ac.createBuffer(1, Math.round(ac.sampleRate * 0.03), ac.sampleRate);
        const d = noise.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 3);
      }
      if (ac && ac.state === 'suspended') ac.resume();
    });
    S.add(() => { if (ac) ac.close(); });

    /* ---------- input ---------- */
    const user = () => { lastUser = performance.now(); };
    S.on(selFrom, 'change', () => { from = selFrom.value; if (from === to) { to = NAMES[(NAMES.indexOf(to) + 3) % NAMES.length]; selTo.value = to; } message = null; user(); compose(); });
    S.on(selTo, 'change', () => { to = selTo.value; if (to === from) { from = NAMES[(NAMES.indexOf(from) + 5) % NAMES.length]; selFrom.value = from; } message = null; user(); compose(); });
    S.on(form, 'submit', (e) => {
      e.preventDefault(); user();
      const h = L.hashStr(from + to + selDate.value + form.cabin.value);
      message = ['SEARCHING...'];
      compose();
      S.timeout(() => { message = [`${2 + (h % 7)} BERTHS LEFT`, `FROM EUR ${59 + (h % 90)}`]; compose(); }, 1600);
      S.timeout(() => { message = null; compose(); }, 7600);
    });
    S.on(window, 'ascii:theme', () => { build(); render(); });
    S.observe(box, layout);
    if (document.fonts) { document.fonts.load('700 40px "Barlow Condensed"').then(() => { if (cols) build(); }).catch(() => {}); S.timeout(() => cols && build(), 1500); }

    const tick = () => { const d = new Date(); clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    tick(); S.interval(tick, 5000);

    /* ---------- draw ---------- */
    const render = () => {
      if (!atlas) return;
      const half = th / 2;
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        if (!t.dirty && !allDirty) continue;
        t.dirty = false;
        const X = ox + (i % cols) * (tw + gap), Y = oy + Math.floor(i / cols) * (th + gap), at = t.acc ? atlasA : atlas;
        ctx.clearRect(X - 1, Y - 1, tw + 2, th + 2);
        if (t.p <= 0) { ctx.drawImage(at, t.cur * tw, 0, tw, th, X, Y, tw, th); continue; }
        ctx.drawImage(at, t.nx * tw, 0, tw, half, X, Y, tw, half);
        ctx.drawImage(at, t.cur * tw, half, tw, half, X, Y + half, tw, half);
        const k = Math.cos(t.p * Math.PI);
        if (k > 0) {
          const hh = Math.max(1, half * k);
          ctx.drawImage(at, t.cur * tw, 0, tw, half, X, Y + half - hh, tw, hh);
          ctx.fillStyle = `rgba(0,0,0,${0.45 * (1 - k)})`; ctx.fillRect(X, Y + half - hh, tw, hh);
        } else {
          const hh = Math.max(1, half * -k);
          ctx.drawImage(at, t.nx * tw, half, tw, half, X, Y + half, tw, hh);
          ctx.fillStyle = `rgba(0,0,0,${0.4 * (1 + k)})`; ctx.fillRect(X, Y + half, tw, hh);
        }
      }
      allDirty = false;
    };

    S.loop((t, dt) => {
      if (!cols) return;
      // cursor: tiles under the pointer make one full revolution
      if (P.active && !P.ui) {
        const r = box.getBoundingClientRect(), hr = root.getBoundingClientRect();
        const mx = (P.x - (r.left - hr.left)) * dpr - ox, my = (P.y - (r.top - hr.top)) * dpr - oy;
        const cx = Math.floor(mx / (tw + gap)), cy = Math.floor(my / (th + gap)), sp = Math.hypot(P.vx, P.vy);
        if (sp > 40) for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
          if (x < 0 || y < 0 || x >= cols || y >= rows || (Math.abs(x - cx) + Math.abs(y - cy) > 1 && sp < 900)) continue;
          const tl = tiles[y * cols + x];
          if (tl.cool > t || tl.spin || tl.p > 0 || tl.cur !== tl.tgt) continue;
          tl.spin = 1; tl.cool = t + 3; tl.delay = (Math.abs(x - cx) + Math.abs(y - cy)) * 0.05;
        }
      }
      P.decay(dt);
      for (const tp of P.taps.splice(0)) { lastUser = performance.now(); }
      // idle: rotate the city pair every so often
      if (!message && performance.now() - lastUser > 18000 && (cycleT -= dt) <= 0) {
        cycleT = 10;
        const a = NAMES[(Math.random() * NAMES.length) | 0];
        let b = NAMES[(Math.random() * NAMES.length) | 0];
        if (b === a) b = NAMES[(NAMES.indexOf(a) + 4) % NAMES.length];
        from = a; to = b; selFrom.value = a; selTo.value = b; compose();
      }
      let flips = 0;
      for (const tl of tiles) {
        if (tl.p === 0 && tl.cur === tl.tgt && !tl.spin) continue;
        if (tl.delay > 0) { tl.delay -= dt; continue; }
        if (tl.p === 0) { tl.nx = (tl.cur + 1) % D; tl.p = 1e-4; }
        tl.p += dt / FLIP;
        tl.dirty = true;
        if (tl.p >= 1) { tl.cur = tl.nx; tl.p = 0; flips++; if (tl.cur === tl.tgt && tl.spin) tl.spin--; }
      }
      render();
      if (sound && ac && flips) {
        const n = Math.min(4, Math.ceil(flips / 6)), now = ac.currentTime;
        for (let k = 0; k < n; k++) click(now + Math.random() * 0.016, Math.min(0.06, 0.018 + flips * 0.0012));
      }
      clicks += flips;
    });
  },
});
