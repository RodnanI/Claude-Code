HEROES.push({
  id: 'babel',
  name: 'Babel',
  title: 'Babel · Every page has already been written',
  kind: 'Digital archive and search',
  tech: 'A wall of random letters from an alphabet of twenty-nine symbols, slowly mutating. A candle-flickered lantern resolves them into sentences wherever it falls, with a decoherence band at the edge. Search files your sentence on a shelf and walks the lantern to it.',
  accent: null,
  fonts: 'family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Courier+Prime:wght@400;700',
  css: `
.h-babel{--bg:#0a0908;--fg:#ece5d8;--mut:rgba(236,229,216,.58);--line:rgba(236,229,216,.2);--panel:#0e0d0b;--ink:#ece5d8;font-family:"EB Garamond",Garamond,Georgia,serif}
:root[data-theme=light] .h-babel{--bg:#f2ede2;--fg:#17140f;--mut:rgba(23,20,15,.62);--line:rgba(23,20,15,.2);--panel:#f7f3ea;--ink:#17140f}
.h-babel .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:22px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-babel .ui a,.h-babel .ui button,.h-babel .ui form{pointer-events:auto}
.h-babel .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:16px}
.h-babel .logo{font:500 15px/1 "Courier Prime",monospace;letter-spacing:.42em;text-transform:uppercase}
.h-babel .links{display:flex;gap:30px;font-style:italic}
.h-babel .links a{opacity:.7;transition:opacity .2s}.h-babel .links a:hover{opacity:1}
.h-babel .tt{border:0;background:none;padding:6px 0;font:italic 400 16px/1 "EB Garamond",serif;display:flex;gap:8px;align-items:center}
.h-babel .tt b{font:700 12px/1 "Courier Prime",monospace;border:1px solid var(--line);padding:4px 6px}
.h-babel .tt .lt,:root[data-theme=light] .h-babel .tt .dk{display:none}
:root[data-theme=light] .h-babel .tt .lt{display:inline}
.h-babel .copy{align-self:center;max-width:min(600px,48vw)}
.h-babel .kick{margin:0 0 20px;font:400 12px/1.5 "Courier Prime",monospace;letter-spacing:.3em;text-transform:uppercase;color:var(--mut)}
.h-babel h1{margin:0 0 22px;font:400 clamp(48px,6.4vw,104px)/.95 "EB Garamond",Garamond,serif;letter-spacing:-.02em}
.h-babel h1 em{font-style:italic}
.h-babel .sub{margin:0 0 30px;max-width:40ch;font-size:clamp(17px,1.4vw,20px);line-height:1.5;color:var(--mut)}
.h-babel form{display:flex;align-items:center;width:min(100%,520px);height:58px;border:1px solid var(--fg);background:var(--panel)}
.h-babel form input{flex:1;min-width:0;height:100%;padding:0 18px;border:0;background:none;outline:none;font:400 15px/1 "Courier Prime",monospace;color:var(--fg)}
.h-babel form input::placeholder{color:var(--mut);opacity:1}
.h-babel form button{height:100%;padding:0 20px;border:0;border-left:1px solid var(--fg);background:var(--fg);color:var(--bg);font:400 13px/1 "Courier Prime",monospace;letter-spacing:.16em;text-transform:uppercase}
.h-babel .rand{display:inline-block;margin-top:14px;font-style:italic;font-size:17px;border-bottom:1px solid var(--line)}
.h-babel .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font:400 11px/1.5 "Courier Prime",monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.h-babel .loc b{color:var(--fg);font-weight:400}
@media (max-width:980px){.h-babel .links{display:none}}
@media (max-width:760px){
  .h-babel .ui{padding:14px 16px 12px}
  .h-babel .logo{letter-spacing:.3em;font-size:13px}
  .h-babel .copy{align-self:end;max-width:none;margin-bottom:12px}
  .h-babel .kick{font-size:10px;margin-bottom:12px}
  .h-babel h1{font-size:clamp(42px,12.5vw,54px);margin-bottom:12px}
  .h-babel .sub{font-size:16.5px;margin-bottom:18px}
  .h-babel form{height:52px}
  .h-babel form button{padding:0 14px}
  .h-babel .foot .hide{display:none}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">Babel</a>
    <nav class="links" aria-label="Primary"><a href="#">The galleries</a><a href="#">Catalogue</a><a href="#">Librarians</a></nav>
    <button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><b>A/a</b><span class="dk">By lamplight</span><span class="lt">By daylight</span></button>
  </header>
  <div class="copy">
    <p class="kick" data-mask="text">An archive of every possible book</p>
    <h1 data-mask="text">Every page<br>has already<br><em>been written.</em></h1>
    <p class="sub" data-mask="text">Four hundred and ten pages per volume, every combination of letters. Almost all of it is noise. Somewhere on these shelves is the sentence you have been trying to write.</p>
    <form autocomplete="off"><label class="sr" for="babel-q">Search the shelves</label><input id="babel-q" maxlength="54" spellcheck="false" placeholder="Search the shelves for a sentence"><button type="submit">Find</button></form>
    <a class="rand" href="#" data-ui>or open a volume at random</a>
  </div>
  <footer class="foot"><span class="loc" data-mask="text">hexagon <b>-</b></span><span class="hide" data-mask="text">The lamp follows your hand</span></footer>
</div>`,
  init: function (root, L, S) {
    const { clamp, lerp } = L;
    const A = S.ascii(root, { size: 14, mobile: 12, lh: 1.3, font: '"Courier Prime", "Courier New", Courier, monospace' });
    const P = S.pointer(root);
    const form = root.querySelector('form'), input = form.querySelector('input'), loc = root.querySelector('.loc b'), rand = root.querySelector('.rand');
    const maskEls = [...root.querySelectorAll('[data-mask], form, .rand, .logo, .links a, .tt')];
    const ALPHA = 'abcdefghijlmnopqrstuvxyz,. ';
    const AG = A.ramp(ALPHA);
    const TEXT = ('call me ishmael. it was the best of times, it was the worst of times. of making many books there is no end, and much study is a weariness of the flesh. ' +
      'happy families are all alike; every unhappy family is unhappy in its own way. we are such stuff as dreams are made on, and our little life is rounded with a sleep. ' +
      'it is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. there is no frigate like a book to take us lands away. ' +
      'in the beginning was the word. two roads diverged in a yellow wood, and sorry i could not travel both. once upon a midnight dreary, while i pondered, weak and weary. ' +
      'sing, o goddess, the anger of achilles son of peleus. stately, plump buck mulligan came from the stairhead. because i could not stop for death, he kindly stopped for me. ' +
      'mrs dalloway said she would buy the flowers herself. i celebrate myself, and sing myself. whan that aprille with his shoures soote. somewhere on these shelves is the sentence you have been trying to write. ');
    let noise = null, hidden = null, hot = null, mask = null, lamp = { x: 0, y: 0, r: 160, tx: 0, ty: 0 }, found = null, locT = 0, wander = 0;
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 30, floor: 0.05 }); };
    const setup = () => {
      noise = new Uint8Array(A.n); hidden = new Uint8Array(A.n); hot = new Uint8Array(A.n);
      for (let i = 0; i < A.n; i++) noise[i] = AG[(L.hash(i, 3) * AG.length) | 0];
      let p = (L.hash(A.cols, A.rows) * TEXT.length) | 0;
      for (let i = 0; i < A.n; i++) { hidden[i] = A.glyph(TEXT[p]); p = (p + 1) % TEXT.length; }
      lamp.r = A.w > 760 ? Math.min(190, A.w * 0.13) : Math.min(130, A.w * 0.32);
      if (!lamp.x) { lamp.x = lamp.tx = A.w * (A.w > 760 ? 0.72 : 0.5); lamp.y = lamp.ty = A.h * (A.w > 760 ? 0.5 : 0.32); }
      found = null;
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const shelve = (q) => {
      const s = q.toLowerCase().replace(/[^a-z,. ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 54);
      if (!s) return;
      const h = L.hashStr(s), wide = A.w > 760;
      const x0 = wide ? Math.round(A.cols * 0.56 + (h % Math.max(1, Math.round(A.cols * 0.4 - s.length)))) : Math.max(1, Math.round((A.cols - s.length) / 2));
      const y0 = wide ? 4 + ((h >>> 8) % Math.max(1, A.rows - 10)) : 4 + ((h >>> 8) % Math.max(1, Math.round(A.rows * 0.4)));
      const xs = clamp(x0, 0, Math.max(0, A.cols - s.length));
      hot.fill(0);
      for (let k = 0; k < s.length; k++) { const i = y0 * A.cols + xs + k; hidden[i] = A.glyph(s[k]); hot[i] = 1; }
      lamp.tx = (xs + s.length / 2) * A.cellW; lamp.ty = (y0 + 0.5) * A.cellH;
      found = { t: 7, addr: h };
    };
    S.on(form, 'submit', (e) => { e.preventDefault(); shelve(input.value); input.blur(); });
    S.on(rand, 'click', (e) => { e.preventDefault(); lamp.tx = A.w * (0.55 + Math.random() * 0.4); lamp.ty = A.h * (0.1 + Math.random() * 0.8); found = { t: 3, addr: (Math.random() * 1e9) | 0 }; hot.fill(0); });
    L.typePlaceholder(input, ['we are such stuff as dreams are made on', 'call me ishmael', 'the sentence i never finished', 'somewhere on these shelves'], S, 'Search the shelves for a sentence');

    S.loop((t, dt) => {
      if (!noise) return;
      P.decay(dt);
      const cols = A.cols, rows = A.rows, g = A.g, al = A.a, cw = A.cellW, ch = A.cellH, wide = A.w > 760;
      // the shelves are never still: a few letters change every frame
      for (let k = 0; k < A.n * 0.004; k++) { const i = (Math.random() * A.n) | 0; noise[i] = AG[(Math.random() * AG.length) | 0]; }
      if (found) { found.t -= dt; if (found.t <= 0) { found = null; hot.fill(0); } }
      if (found) { /* stay on the shelved sentence */ }
      else if (P.active && !P.ui && !P.idle(3000)) { lamp.tx = P.x; lamp.ty = P.y; }
      else { wander += dt * 0.08; lamp.tx = A.w * (wide ? 0.72 : 0.5) + Math.sin(wander * 1.3) * A.w * (wide ? 0.18 : 0.3); lamp.ty = A.h * (wide ? 0.5 : 0.3) + Math.sin(wander * 2.1 + 1) * A.h * (wide ? 0.3 : 0.18); }
      const k = Math.min(1, dt * (found ? 2.5 : 5));
      lamp.x = lerp(lamp.x, lamp.tx, k); lamp.y = lerp(lamp.y, lamp.ty, k);
      const flame = 1 + 0.04 * Math.sin(t * 11) + 0.03 * L.noise2(t * 3, 1), R = lamp.r * flame, tick = (t * 14) | 0;
      for (let y = 0, i = 0; y < rows; y++) {
        const dy = (y + 0.5) * ch - lamp.y;
        for (let x = 0; x < cols; x++, i++) {
          const d = Math.hypot((x + 0.5) * cw - lamp.x, dy), r = 1 - clamp((d - R * 0.55) / (R * 0.45), 0, 1);
          const meaning = r >= 1 || (r > 0.02 && L.hash(i, tick) < r * r);
          if (hot[i] && found) { g[i] = hidden[i]; al[i] = 1; continue; }
          g[i] = meaning ? hidden[i] : noise[i];
          al[i] = meaning ? 0.35 + 0.65 * r * flame * (1 - (d / (R * 1.4)) * 0.4) : 0.1 + 0.08 * Math.max(0, 1 - d / (R * 3.2));
        }
      }
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
      if ((locT -= dt) <= 0) {
        locT = 0.25;
        const cx = Math.floor(lamp.x / cw), cy = Math.floor(lamp.y / ch), h = found ? found.addr : L.hashStr(cx + ':' + cy + ':' + Math.floor(t / 4));
        loc.textContent = `${(h >>> 4).toString(16).slice(0, 4)} · wall ${1 + (h % 4)} · shelf ${1 + ((h >>> 3) % 5)} · vol ${1 + ((h >>> 6) % 32)} · page ${1 + ((h >>> 11) % 410)}`;
      }
    });
  },
});
