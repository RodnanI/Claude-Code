/* SQUAWK bootstrap */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, T = SQ.tracker;

  function loadScript(src) {
    return new Promise((res) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res;
      s.onerror = () => { console.warn('[SQ] failed to load', src); res(); };
      document.head.appendChild(s);
    });
  }

  function fatal(msg) {
    document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:#040504;color:#ffb000;font:14px 'B612 Mono',monospace;padding:30px;text-align:center"><div><b style="font-size:20px;letter-spacing:.3em">SQUAWK</b><p style="color:#c9b98f;max-width:480px;line-height:1.6">${msg}</p></div></div>`);
  }

  function deepLink() {
    const m = location.hash.match(/\/(~?[0-9a-f]{6})\b/i);
    if (!m) return;
    const hex = m[1].toLowerCase();
    const trySelect = async () => {
      let ac = T.get(hex);
      if (!ac && SQ.feed.active !== 'sim') { await SQ.feed.lookup('hex', hex); ac = T.get(hex); }
      if (ac) { T.select(hex, { from: 'link' }); SQ.map.flyToAc(ac); }
      else SQ.ui.toast('Aircraft ' + hex.toUpperCase() + ' from the link is not currently tracked', 'warn');
    };
    SQ.feed.firstData.then(() => setTimeout(trySelect, 600));
  }

  function boot() {
    if (!window.maplibregl) { fatal('The map engine failed to load. Check that the vendor folder is present next to index.html.'); return; }
    let webgl = false;
    try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { /* no webgl */ }
    if (!webgl) { fatal('This browser or device has WebGL disabled, which the 3D map needs. Enable hardware acceleration and reload.'); return; }

    SQ.dataReady = Promise.all(['data/airports.js', 'data/types.js', 'data/operators.js'].map(loadScript)).then(() => {
      T.reclassify();
      if (SQ.map.layersReady) SQ.map.setAirports();
      SQ.emit('data:ready');
    });

    document.documentElement.dataset.theme = S.style === 'chart' ? 'light' : 'dark';
    document.documentElement.dataset.map = S.style;
    if (document.fonts && document.fonts.load) { document.fonts.load('700 11px "B612 Mono"'); document.fonts.load('400 10px "B612 Mono"'); }

    SQ.intro.play();
    const map = SQ.map.init();
    const target = SQ.map.startView.zoom;
    if (SQ.intro.active) {
      map.jumpTo({ zoom: Math.max(2, target - 0.9) });
      SQ.on('intro:reveal', () => map.easeTo({ zoom: target, duration: 2600, easing: (t) => 1 - Math.pow(1 - t, 3) }));
    }
    SQ.render.init();
    SQ.ui.init();
    SQ.detail.init();
    SQ.panelsInit();
    SQ.feed.start();
    deepLink();
    if (S.home && S.home.src === 'gps') document.getElementById('cLocate').classList.add('on');

    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
    SQ.intro.done.then(() => {
      if (!SQ.ls.get('helped')) {
        SQ.ls.set('helped', true);
        const tip = SQ.isMobile() ? ['Tap any aircraft for route, photo and profile. Two fingers to tilt and rotate.', null] : ['Tip: press <b>?</b> for shortcuts. Click any aircraft for route, photo and profile.', { label: 'Shortcuts', fn: SQ.ui.help }];
        setTimeout(() => SQ.ui.toast(tip[0], '', tip[1], 8000), 1200);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
