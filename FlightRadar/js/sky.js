/* SQUAWK sky view: polar plot of aircraft above the observer, compass mode, experimental AR camera */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo, F = SQ.fmt, T = SQ.tracker, $ = SQ.$;
  let raf = 0, cv = null, compass = false, heading = 0, orientOk = false, ar = null, hdgOffset = 0;
  const ori = { a: 0, b: 90, g: 0, abs: false, ios: null };

  function observer() {
    const h = S.home;
    if (h) return { lat: h.lat, lon: h.lon, gps: h.src === 'gps' };
    const c = SQ.map.map.getCenter();
    return { lat: c.lat, lon: c.lng, gps: false };
  }
  /* azimuth/elevation with earth curvature (4/3 radius for refraction) */
  function look(o, ac) {
    const dKm = G.distKm(o.lat, o.lon, ac.rlat, ac.rlon);
    const h = (ac.gnd ? 0 : ac.ralt || 0) * 0.3048 / 1000;
    const drop = (dKm * dKm) / (2 * G.R_KM * 4 / 3);
    return { az: G.bearing(o.lat, o.lon, ac.rlat, ac.rlon), el: Math.atan2(h - drop, Math.max(0.05, dKm)) * G.DEG, d: dKm };
  }
  function visibleSky(o, maxKm) {
    const out = [];
    for (const ac of T.list.values()) {
      if (ac.rlat == null || ac.gnd) continue;
      if (Math.abs(ac.rlat - o.lat) > 2.5) continue;
      const l = look(o, ac);
      if (l.d > (maxKm || 250) || l.el < 0.3) continue;
      out.push({ ac, ...l });
    }
    return out.sort((a, b) => b.el - a.el);
  }

  /* ---------------- polar plot ---------------- */
  function drawPlot() {
    raf = requestAnimationFrame(drawPlot);
    if (!cv || !cv.isConnected) { cancelAnimationFrame(raf); raf = 0; return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = w;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'), Tk = SQ.charts.tok();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = w / 2 - 18;
    const rot = compass ? -(heading + hdgOffset) * G.RAD : 0;
    const amber = getComputedStyle(document.documentElement).getPropertyValue('--amber').trim();
    ctx.strokeStyle = Tk.line2; ctx.lineWidth = 1;
    for (const e of [0, 30, 60]) { ctx.beginPath(); ctx.arc(cx, cy, R * (1 - e / 90), 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = Tk.ink3; ctx.font = '9px ' + Tk.mono; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('30°', cx + 4, cy - R * (2 / 3) + 8); ctx.fillText('60°', cx + 4, cy - R / 3 + 8);
    for (let d = 0; d < 360; d += 10) {
      const a = d * G.RAD + rot, l = d % 90 === 0 ? 10 : d % 30 === 0 ? 6 : 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); ctx.lineTo(cx + Math.sin(a) * (R - l), cy - Math.cos(a) * (R - l)); ctx.stroke();
    }
    ctx.font = '700 11px ' + Tk.mono;
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([n, d]) => { const a = d * G.RAD + rot; ctx.fillStyle = n === 'N' ? amber : Tk.ink2; ctx.fillText(n, cx + Math.sin(a) * (R + 10), cy - Math.cos(a) * (R + 10)); });
    const o = observer(), list = visibleSky(o, 250);
    ctx.textAlign = 'left';
    for (const s of list) {
      const r = R * (1 - s.el / 90), a = s.az * G.RAD + rot;
      const x = cx + Math.sin(a) * r, y = cy - Math.cos(a) * r;
      const col = SQ.color.forAc(s.ac, S.colorMode);
      const spr = SQ.icons.sprite(s.ac.shape, col.key, col.rgb, s.ac.hex === T.selected ? 's' : 'n');
      const k = U.clamp(0.55 + s.el / 60, 0.55, 1.1), ta = (s.ac.rtrk || 0) * G.RAD + rot;
      ctx.setTransform(Math.cos(ta) * k * dpr, Math.sin(ta) * k * dpr, -Math.sin(ta) * k * dpr, Math.cos(ta) * k * dpr, x * dpr, y * dpr);
      ctx.drawImage(spr.c, -spr.half, -spr.half, spr.size, spr.size);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (s.el > 8 || list.length < 25) { ctx.fillStyle = Tk.ink; ctx.font = '700 10px ' + Tk.mono; ctx.fillText(s.ac.flight || s.ac.hex.toUpperCase(), x + 10, y - 5); ctx.fillStyle = Tk.ink3; ctx.font = '9px ' + Tk.mono; ctx.fillText(Math.round(s.el) + '° ' + F.altShort(s.ac.ralt), x + 10, y + 6); }
      s.x = x; s.y = y;
    }
    cv._list = list;
  }
  function listHtml(list) {
    if (!list.length) return '<p class="empty-note">Nothing above your horizon within 250 km right now.</p>';
    return list.slice(0, 25).map((s) => `<button class="rec" data-sel="${s.ac.hex}"><span>${F.compass(s.az)} ${Math.round(s.el)}°</span><b>${F.esc(s.ac.flight || s.ac.reg || s.ac.hex.toUpperCase())} <span class="muted small">${F.esc(s.ac.type || '')}</span></b><em>${F.dist(s.d / 1.852)}</em></button>`).join('');
  }

  /* ---------------- device orientation ---------------- */
  function onOrient(e) {
    if (e.alpha == null && e.webkitCompassHeading == null) return;
    orientOk = true;
    if (e.webkitCompassHeading != null) { ori.ios = e.webkitCompassHeading; ori.a = 360 - e.webkitCompassHeading; ori.abs = true; }
    else { ori.a = e.alpha; ori.abs = e.absolute || e.type === 'deviceorientationabsolute'; }
    ori.b = e.beta || 0; ori.g = e.gamma || 0;
    heading = ori.ios != null ? ori.ios : U.norm360(360 - ori.a);
  }
  async function enableOrientation() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') throw new Error('denied');
      }
      if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOrient);
      else window.addEventListener('deviceorientation', onOrient);
      return true;
    } catch (e) { SQ.ui.toast('Motion sensors unavailable or denied', 'warn'); return false; }
  }

  /* ---------------- AR camera ---------------- */
  function basis() {
    const r = G.RAD, cZ = Math.cos(ori.a * r), sZ = Math.sin(ori.a * r), cX = Math.cos(ori.b * r), sX = Math.sin(ori.b * r), cY = Math.cos(ori.g * r), sY = Math.sin(ori.g * r);
    let right = [cZ * cY - sZ * sX * sY, cY * sZ + cZ * sX * sY, -cX * sY];
    let up = [-cX * sZ, cZ * cX, sX];
    const fwd = [-(cY * sZ * sX + cZ * sY), -(sZ * sY - cZ * cY * sX), -(cX * cY)];
    const th = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * r;
    if (th) { const R2 = right, U2 = up; right = R2.map((v, i) => Math.cos(th) * v - Math.sin(th) * U2[i]); up = R2.map((v, i) => Math.sin(th) * v + Math.cos(th) * U2[i]); }
    /* heading calibration: rotate the whole frame about the vertical axis */
    if (hdgOffset) {
      const a = -hdgOffset * r, rotz = (v) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
      return { right: rotz(right), up: rotz(up), fwd: rotz(fwd) };
    }
    return { right, up, fwd };
  }
  async function startAR() {
    if (!orientOk && !(await enableOrientation())) return;
    const wrap = SQ.h('div', { class: 'skyar' }, `<video playsinline muted autoplay></video><canvas></canvas>
      <div class="bar2"><span id="arInfo">Point your phone at the sky</span><button class="btn" id="arClose">Close</button></div>
      <div style="position:absolute;left:14px;right:14px;bottom:calc(16px + var(--sab));color:#fff;font:11px var(--mono);display:flex;gap:10px;align-items:center">Heading trim <input type="range" min="-40" max="40" value="${hdgOffset}" id="arTrim" style="flex:1;accent-color:#ffb000"><span id="arTrimV">${hdgOffset}°</span></div>`);
    document.body.appendChild(wrap);
    const video = wrap.querySelector('video'), c = wrap.querySelector('canvas');
    $('#arClose').onclick = stopAR;
    $('#arTrim').oninput = (e) => { hdgOffset = +e.target.value; $('#arTrimV').textContent = hdgOffset + '°'; };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
      ar = { wrap, stream, c, raf: 0 };
    } catch (e) {
      ar = { wrap, stream: null, c, raf: 0 };
      $('#arInfo').textContent = 'Camera unavailable: showing overlay only';
    }
    c.addEventListener('click', (e) => {
      const hit = (ar.hits || []).find((h) => Math.hypot(h.x - e.clientX, h.y - e.clientY) < 30);
      if (hit) { stopAR(); T.select(hit.hex, { from: 'ar' }); SQ.map.flyToAc(T.get(hit.hex)); }
    });
    const loop = () => {
      if (!ar) return;
      ar.raf = requestAnimationFrame(loop);
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const B = basis(), focal = (Math.max(W, H) / 2) / Math.tan(32 * G.RAD);
      const o = observer(), list = visibleSky(o, 120);
      ar.hits = [];
      let shown = 0;
      for (const s of list) {
        const ce = Math.cos(s.el * G.RAD), v = [Math.sin(s.az * G.RAD) * ce, Math.cos(s.az * G.RAD) * ce, Math.sin(s.el * G.RAD)];
        const z = v[0] * B.fwd[0] + v[1] * B.fwd[1] + v[2] * B.fwd[2];
        if (z <= 0.05) continue;
        const x = W / 2 + ((v[0] * B.right[0] + v[1] * B.right[1] + v[2] * B.right[2]) / z) * focal;
        const y = H / 2 - ((v[0] * B.up[0] + v[1] * B.up[1] + v[2] * B.up[2]) / z) * focal;
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        shown++;
        const col = SQ.color.css(SQ.color.forAc(s.ac, S.colorMode).rgb);
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 10, y - 10); ctx.lineTo(x + 26, y - 26); ctx.lineTo(x + 110, y - 26); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x + 26, y - 62, 150, 34);
        ctx.fillStyle = '#fff'; ctx.font = '700 13px "B612 Mono", monospace'; ctx.fillText(s.ac.flight || s.ac.hex.toUpperCase(), x + 32, y - 46);
        ctx.font = '11px "B612 Mono", monospace'; ctx.fillStyle = '#ffd06a';
        ctx.fillText((s.ac.type || '') + ' ' + F.altShort(s.ac.ralt) + ' ' + F.dist(s.d / 1.852), x + 32, y - 32);
        ar.hits.push({ x, y, hex: s.ac.hex });
      }
      $('#arInfo').textContent = list.length ? shown + ' of ' + list.length + ' aircraft in frame · heading ' + Math.round(U.norm360(heading + hdgOffset)) + '°' : 'No aircraft above the horizon nearby';
    };
    loop();
  }
  function stopAR() {
    if (!ar) return;
    cancelAnimationFrame(ar.raf);
    if (ar.stream) ar.stream.getTracks().forEach((t) => t.stop());
    ar.wrap.remove();
    ar = null;
  }

  SQ.panels = SQ.panels || {};
  SQ.panels.sky = {
    title: 'Sky view',
    render(b) {
      const o = observer();
      b.innerHTML = `<div class="sec"><p class="small muted" style="margin-top:0">${o.gps ? 'What is above you right now. Center is straight up, the edge is the horizon.' : 'Using the map center as observer. Set your location for an accurate sky.'}</p>
        <div class="skywrap"><canvas class="skycv" id="skyCv"></canvas></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
          ${o.gps ? '' : '<button class="btn pri" data-act="skyloc"><svg><use href="#i-locate"/></svg>Use my location</button>'}
          <button class="btn ${compass ? 'on' : ''}" data-act="skycompass">Compass</button>
          <button class="btn" data-act="skyar">AR camera (beta)</button>
        </div></div>
        <div class="sec"><h3>Above the horizon <small id="skyN"></small></h3><div id="skyList"></div></div>`;
      cv = $('#skyCv', b);
      cv.addEventListener('click', (e) => {
        const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        const hit = (cv._list || []).find((s) => Math.hypot(s.x - x, s.y - y) < 16);
        if (hit) { T.select(hit.ac.hex, { from: 'sky' }); SQ.map.flyToAc(hit.ac); }
      });
      if (!raf) drawPlot();
      this.update(b);
    },
    update(b) {
      const list = visibleSky(observer(), 250), el = $('#skyList', b);
      if (el) { el.innerHTML = listHtml(list); $('#skyN', b).textContent = list.length + ' aircraft'; }
    },
    close() { cancelAnimationFrame(raf); raf = 0; cv = null; }
  };
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'skyloc') SQ.ui.locate();
    else if (t.dataset.act === 'skycompass') {
      if (!compass && !orientOk && !(await enableOrientation())) return;
      compass = !compass;
      t.classList.toggle('on', compass);
    } else if (t.dataset.act === 'skyar') startAR();
  });
  SQ.on('setting:home', () => { if (SQ.ui.panel === 'sky') SQ.ui.rerender(); });
})();
