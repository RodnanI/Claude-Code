/* ============================================================
   art.js : procedural sprites (pins, balls, glows, reel symbols),
   the felt board + lacquer cabinet backdrops, and the engraved
   stroke-icon set used on charm tokens and tickets.
   ============================================================ */
const BW = 520, BH = 720, FR = 22, CW = BW + FR * 2, CH = BH + FR * 2;
const NPOCK = 9, PW = BW / NPOCK, DIV_TOP = 632;

const Art = (() => {
  const SPR = 3;
  const cache = new Map();
  const urls = new Map();
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function sprite(key, size, draw, spr = SPR) {
    let c = cache.get(key);
    if (c) return c;
    c = mk(size * spr, size * spr);
    const x = c.getContext('2d');
    x.scale(spr, spr); x.translate(size / 2, size / 2);
    draw(x, size);
    c.size = size; cache.set(key, c);
    return c;
  }
  function rgba(hex, a) {
    const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  /* ---------- shading helpers ---------- */
  function disc(x, r, c0, c1, c2, c3, ox = -0.38, oy = -0.42) {
    const g = x.createRadialGradient(r * ox, r * oy, r * 0.05, 0, 0, r);
    g.addColorStop(0, c0); g.addColorStop(0.38, c1); g.addColorStop(0.82, c2); g.addColorStop(1, c3);
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
  }
  function spec(x, r, a = 0.92) {
    x.fillStyle = `rgba(255,255,255,${a})`;
    x.beginPath(); x.ellipse(-r * 0.36, -r * 0.42, r * 0.27, r * 0.17, -0.6, 0, TAU); x.fill();
  }
  function ring(x, r, c, w) { x.strokeStyle = c; x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); }
  function poly(x, n, r, rot = 0) { x.beginPath(); for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); }
  function star(x, n, r1, r2, rot = -Math.PI / 2) { x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * TAU, r = i % 2 ? r2 : r1; i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); }
  function rrect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function cap(x, r, c0, c1, c2, c3) { disc(x, r, c0, c1, c2, c3); ring(x, r - 0.35, 'rgba(20,10,4,.55)', 0.7); }

  /* ---------- pins ---------- */
  const PIN_GLOW = {
    basic: '#ffd98a', copper: '#ff9a50', ruby: '#ff3b30', gold: '#ffcf1a', bumper: '#ff6a3d', prism: '#9ff5e8', clover: '#7dff6a',
    bomb: '#ff7b1c', split: '#6fffd2', bell: '#ffd36b', dice: '#fff3d0', gamble: '#ffcc44', sprout: '#a8ff70', warp: '#3fe8d0',
    magnet: '#ff4b4b', echo: '#fff0c8', seven: '#ff4a3a', rod: '#ffe84a',
  };
  const PIN_DRAW = {
    basic(x, r) { cap(x, r, '#fff6cf', '#e0b04e', '#8a5d1c', '#3a2506'); spec(x, r); },
    copper(x, r) { cap(x, r, '#ffe2cc', '#e2813e', '#8a3d12', '#3b1405'); ring(x, r * 0.56, 'rgba(70,25,6,.6)', 0.8); spec(x, r); },
    ruby(x, r) {
      const g = x.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#ffb3a6'); g.addColorStop(0.45, '#e3242b'); g.addColorStop(1, '#5e050c');
      poly(x, 8, r, Math.PI / 8); x.fillStyle = g; x.fill();
      x.strokeStyle = '#3d0306'; x.lineWidth = 0.8; x.stroke();
      poly(x, 8, r * 0.52, Math.PI / 8); x.fillStyle = 'rgba(255,120,105,.55)'; x.fill();
      x.strokeStyle = 'rgba(255,215,205,.4)'; x.lineWidth = 0.4;
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i / 8) * TAU; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); x.stroke(); }
      x.fillStyle = '#fff'; x.save(); x.translate(-r * 0.3, -r * 0.38); star(x, 4, r * 0.32, r * 0.08); x.fill(); x.restore();
    },
    gold(x, r) {
      cap(x, r, '#fffbe0', '#ffd34a', '#b07a12', '#4d3104'); ring(x, r * 0.74, 'rgba(110,70,0,.55)', 0.6);
      x.fillStyle = '#6b4404'; x.font = `${r * 1.2}px Bungee, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', 0, r * 0.1);
      spec(x, r, 0.8);
    },
    bumper(x, r) {
      disc(x, r, '#fff6e2', '#f0dfba', '#b59e75', '#4d3b22');
      ring(x, r - 0.7, '#d7ad55', 1.4);
      const rc = r * 0.7, g = x.createRadialGradient(-rc * 0.35, -rc * 0.4, rc * 0.1, 0, 0, rc);
      g.addColorStop(0, '#ff9c80'); g.addColorStop(0.5, '#e2341f'); g.addColorStop(1, '#6e0e05');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, rc, 0, TAU); x.fill();
      ring(x, rc, 'rgba(60,8,2,.7)', 0.8);
      x.fillStyle = '#fff3dc'; star(x, 5, rc * 0.58, rc * 0.25); x.fill();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(-rc * 0.38, -rc * 0.45, rc * 0.3, rc * 0.16, -0.6, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(80,60,30,.5)'; x.lineWidth = 0.6;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; x.beginPath(); x.moveTo(Math.cos(a) * (r * 0.78), Math.sin(a) * (r * 0.78)); x.lineTo(Math.cos(a) * (r * 0.9), Math.sin(a) * (r * 0.9)); x.stroke(); }
    },
    prism(x, r) {
      const cols = ['#d8fff6', '#68e3d2', '#ffeaa8', '#ff9f7a', '#8debc9', '#ffd0a0'];
      for (let i = 0; i < 6; i++) {
        const a0 = -Math.PI / 2 + (i / 6) * TAU, a1 = -Math.PI / 2 + ((i + 1) / 6) * TAU;
        x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); x.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); x.closePath();
        x.fillStyle = cols[i]; x.fill();
      }
      poly(x, 6, r, -Math.PI / 2); x.strokeStyle = '#0d4a45'; x.lineWidth = 0.9; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 0.4;
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i / 6) * TAU; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); x.stroke(); }
      poly(x, 6, r * 0.42, -Math.PI / 2); x.fillStyle = 'rgba(255,255,255,.55)'; x.fill();
    },
    clover(x, r) {
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2, cx = Math.cos(a) * r * 0.45, cy = Math.sin(a) * r * 0.45, lr = r * 0.52;
        const g = x.createRadialGradient(cx - lr * 0.3, cy - lr * 0.3, lr * 0.1, cx, cy, lr);
        g.addColorStop(0, '#c4f7a6'); g.addColorStop(0.55, '#44b23c'); g.addColorStop(1, '#14561a');
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, lr, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(10,50,12,.8)'; x.lineWidth = 0.6; x.stroke();
      }
      x.strokeStyle = 'rgba(225,255,210,.7)'; x.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); x.stroke(); }
      x.fillStyle = '#0e3d10'; x.beginPath(); x.arc(0, 0, r * 0.16, 0, TAU); x.fill();
    },
    bomb(x, r) {
      x.save(); x.rotate(0.75);
      x.fillStyle = '#c99a3a'; x.fillRect(-r * 0.22, -r * 1.12, r * 0.44, r * 0.34);
      x.restore();
      disc(x, r * 0.92, '#9aa0aa', '#3a3e45', '#15171b', '#050607');
      ring(x, r * 0.92, 'rgba(0,0,0,.8)', 0.6);
      x.strokeStyle = '#d8c79a'; x.lineWidth = 0.9; x.lineCap = 'round';
      x.beginPath(); x.moveTo(r * 0.62, -r * 0.62); x.quadraticCurveTo(r * 1.0, -r * 1.1, r * 0.75, -r * 1.3); x.stroke();
      spec(x, r * 0.92, 0.7);
    },
    split(x, r) {
      cap(x, r, '#e8fff8', '#6fe0c0', '#1f8f78', '#0b3d33');
      x.strokeStyle = '#fffaf0'; x.lineWidth = 1.1; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(0, r * 0.55); x.lineTo(0, 0); x.lineTo(-r * 0.45, -r * 0.45); x.moveTo(0, 0); x.lineTo(r * 0.45, -r * 0.45); x.stroke();
      x.beginPath(); x.moveTo(-r * 0.45, -r * 0.12); x.lineTo(-r * 0.45, -r * 0.45); x.lineTo(-r * 0.12, -r * 0.45); x.moveTo(r * 0.45, -r * 0.12); x.lineTo(r * 0.45, -r * 0.45); x.lineTo(r * 0.12, -r * 0.45); x.stroke();
    },
    bell(x, r) {
      cap(x, r, '#fff1c4', '#e7b84a', '#8f6114', '#3a2506');
      x.fillStyle = '#4a2f05';
      x.beginPath(); x.moveTo(-r * 0.5, r * 0.32); x.bezierCurveTo(-r * 0.5, -r * 0.2, -r * 0.35, -r * 0.55, 0, -r * 0.55); x.bezierCurveTo(r * 0.35, -r * 0.55, r * 0.5, -r * 0.2, r * 0.5, r * 0.32); x.lineTo(r * 0.62, r * 0.42); x.lineTo(-r * 0.62, r * 0.42); x.closePath(); x.fill();
      x.beginPath(); x.arc(0, r * 0.55, r * 0.14, 0, TAU); x.fill();
      spec(x, r, 0.7);
    },
    gamble(x, r) {
      x.save(); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.clip();
      disc(x, r, '#fff6cf', '#ffcf4a', '#a8700f', '#3d2504');
      x.fillStyle = '#1d1512'; x.beginPath(); x.moveTo(0, -r); x.lineTo(0, r); x.arc(0, 0, r, Math.PI / 2, -Math.PI / 2, true); x.fill();
      x.restore();
      ring(x, r - 0.4, 'rgba(255,220,140,.8)', 0.8);
      x.fillStyle = '#fff3d6'; x.font = `${r * 1.05}px Bungee, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', r * 0.02, r * 0.08);
    },
    warp(x, r) {
      cap(x, r, '#9ff2e6', '#1f8f86', '#0b3f3c', '#031615');
      x.fillStyle = 'rgba(0,10,10,.55)'; x.beginPath(); x.arc(0, 0, r * 0.62, 0, TAU); x.fill();
    },
    magnet(x, r) {
      cap(x, r, '#fff1e6', '#d9d2c8', '#8a8178', '#2a2620');
      x.lineCap = 'butt'; x.strokeStyle = '#d42a1e'; x.lineWidth = r * 0.36;
      x.beginPath(); x.arc(0, r * 0.05, r * 0.42, Math.PI, 0, false); x.stroke();
      x.strokeStyle = '#e8eef2'; x.beginPath(); x.moveTo(-r * 0.42, r * 0.05); x.lineTo(-r * 0.42, r * 0.5); x.moveTo(r * 0.42, r * 0.05); x.lineTo(r * 0.42, r * 0.5); x.stroke();
    },
    echo(x, r) {
      cap(x, r, '#fffdf4', '#efe2c4', '#a8946a', '#3d3220');
      x.strokeStyle = '#1f8c82'; x.lineWidth = 0.8;
      [0.25, 0.5, 0.75].forEach(k => { x.beginPath(); x.arc(0, 0, r * k, 0, TAU); x.stroke(); });
    },
    seven(x, r) {
      cap(x, r, '#fffdf2', '#f4e7c8', '#b49a6a', '#3d3220');
      x.font = `${r * 1.45}px Shrikhand, Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#e0261c'; x.fillText('7', 0, r * 0.12);
    },
    rod(x, r) {
      cap(x, r, '#f2f5f7', '#9aa5ad', '#4a5359', '#181c1f');
      x.fillStyle = '#ffd92e'; x.strokeStyle = '#5a4300'; x.lineWidth = 0.5;
      x.beginPath(); x.moveTo(r * 0.12, -r * 0.7); x.lineTo(-r * 0.4, r * 0.08); x.lineTo(-r * 0.02, r * 0.08); x.lineTo(-r * 0.15, r * 0.72); x.lineTo(r * 0.42, -r * 0.12); x.lineTo(r * 0.02, -r * 0.12); x.closePath(); x.fill(); x.stroke();
    },
    sprout(x, r, stage = 0) {
      cap(x, r, '#d9b38a', '#8a5a32', '#4a2c14', '#1d1006');
      const leaves = 1 + stage;
      for (let i = 0; i < leaves; i++) {
        const a = -Math.PI / 2 + (i - (leaves - 1) / 2) * 0.7, len = r * (0.75 + stage * 0.06);
        x.save(); x.rotate(a + Math.PI / 2);
        const g = x.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, '#2d7a20'); g.addColorStop(1, '#a8f07a');
        x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(r * 0.42, -len * 0.55, 0, -len); x.quadraticCurveTo(-r * 0.42, -len * 0.55, 0, 0); x.fill();
        x.restore();
      }
    },
  };
  function diceSprite(face, r) {
    return sprite('pin-dice-' + face, (r + 3) * 2, x => {
      x.save(); x.rotate(0.22);
      const g = x.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f1e6cf'); g.addColorStop(1, '#b9a57e');
      rrect(x, -r * 0.92, -r * 0.92, r * 1.84, r * 1.84, r * 0.4); x.fillStyle = g; x.fill();
      x.strokeStyle = 'rgba(60,40,20,.7)'; x.lineWidth = 0.6; x.stroke();
      const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[face];
      x.fillStyle = face === 1 ? '#d42a1e' : '#1d1512';
      for (const [a, b] of P) { x.beginPath(); x.arc(a * r * 0.45, b * r * 0.45, r * (face === 1 ? 0.26 : 0.16), 0, TAU); x.fill(); }
      x.restore();
    });
  }
  function pin(type, r, stage = 0) {
    if (type === 'dice') return diceSprite(1, r);
    const key = 'pin-' + type + (type === 'sprout' ? stage : '');
    return sprite(key, (r + 3) * 2 * (type === 'bomb' ? 1.25 : 1), x => (PIN_DRAW[type] || PIN_DRAW.basic)(x, r, stage));
  }

  /* ---------- balls ---------- */
  const BALL_DRAW = {
    steel: (x, r) => chrome(x, r, ['#ffffff', '#e9eef2', '#98a3ab', '#4a5359', '#1d2226']),
    gold: (x, r) => chrome(x, r, ['#fffdf0', '#fde7a0', '#e0ad3c', '#8a5d12', '#3d2806']),
    lead: (x, r) => { chrome(x, r, ['#c9ced3', '#7c838a', '#4f555b', '#2b2f33', '#101214'], 0.45); },
    ruby(x, r) {
      disc(x, r, '#ff8a76', '#d11b22', '#7a060c', '#3a0205', 0.1, 0.15);
      const g = x.createRadialGradient(r * 0.3, r * 0.38, 0, r * 0.3, r * 0.38, r * 0.7);
      g.addColorStop(0, 'rgba(255,200,170,.85)'); g.addColorStop(1, 'rgba(255,120,90,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
      spec(x, r); ring(x, r - 0.3, 'rgba(40,0,0,.6)', 0.6);
    },
    rubber(x, r) {
      disc(x, r, '#ffc2a2', '#f2652c', '#a8340f', '#4a1404');
      x.strokeStyle = 'rgba(80,20,4,.45)'; x.lineWidth = 0.8; x.beginPath(); x.ellipse(0, 0, r * 0.98, r * 0.42, 0.5, 0, TAU); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-r * 0.32, -r * 0.4, r * 0.38, r * 0.24, -0.6, 0, TAU); x.fill();
    },
    glass(x, r) {
      x.fillStyle = 'rgba(210,255,240,.13)'; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
      const g = x.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
      g.addColorStop(0, 'rgba(220,255,245,0)'); g.addColorStop(1, 'rgba(220,255,245,.45)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 0.9; x.beginPath(); x.arc(0, 0, r * 0.8, Math.PI * 1.1, Math.PI * 1.55); x.stroke();
      x.fillStyle = 'rgba(255,255,225,.85)'; x.beginPath(); x.ellipse(r * 0.35, r * 0.45, r * 0.25, r * 0.12, -0.6, 0, TAU); x.fill();
      spec(x, r); ring(x, r - 0.3, 'rgba(190,255,235,.65)', 0.6);
    },
    cluster(x, r) {
      [[0, -0.42], [-0.38, 0.24], [0.38, 0.24]].forEach(([a, b]) => { x.save(); x.translate(a * r, b * r); chrome(x, r * 0.58, ['#ffffff', '#f0e6d0', '#c2a26a', '#6a5028', '#2a1d0a']); x.restore(); });
    },
    clover(x, r) {
      disc(x, r, '#d8fbc2', '#52c24e', '#1c6b22', '#0a300f');
      x.strokeStyle = 'rgba(235,255,225,.6)'; x.lineWidth = 0.8; x.beginPath();
      for (let i = 0; i < 40; i++) { const t = i / 40, a = t * TAU * 1.6, rr = r * 0.15 + t * r * 0.7; i ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      x.stroke(); spec(x, r);
    },
    comet(x, r) {
      const g = x.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.28, '#fff0a0'); g.addColorStop(0.62, '#ff9a2a'); g.addColorStop(0.9, '#c2350c'); g.addColorStop(1, '#5a1405');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    },
    ghost(x, r) {
      const g = x.createRadialGradient(0, -r * 0.2, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(255,250,236,.9)'); g.addColorStop(0.7, 'rgba(240,232,214,.55)'); g.addColorStop(1, 'rgba(240,232,214,.12)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
      x.fillStyle = '#2a2420'; x.beginPath(); x.ellipse(-r * 0.3, -r * 0.08, r * 0.13, r * 0.2, 0, 0, TAU); x.ellipse(r * 0.3, -r * 0.08, r * 0.13, r * 0.2, 0, 0, TAU); x.fill();
    },
    eight(x, r) {
      disc(x, r, '#6a6a70', '#1f1f23', '#08080a', '#000');
      x.fillStyle = '#f6efe0'; x.beginPath(); x.arc(r * 0.08, -r * 0.05, r * 0.44, 0, TAU); x.fill();
      x.fillStyle = '#111'; x.font = `${r * 0.66}px Bungee, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('8', r * 0.09, 0);
      spec(x, r, 0.75);
    },
    echo(x, r) {
      disc(x, r, '#fffcf2', '#efe4c8', '#b4a074', '#4d4128');
      x.strokeStyle = 'rgba(31,140,130,.75)'; x.lineWidth = 0.8;
      [0.32, 0.62].forEach(k => { x.beginPath(); x.arc(0, 0, r * k, 0, TAU); x.stroke(); });
      spec(x, r);
    },
    pearl(x, r) {
      disc(x, r, '#ffffff', '#f6efe8', '#d9cec4', '#968b80');
      if (x.createConicGradient) {
        const g = x.createConicGradient(0.6, 0, 0);
        ['rgba(255,190,170,.28)', 'rgba(160,240,220,.28)', 'rgba(255,230,160,.28)', 'rgba(255,190,170,.28)'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
        x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
      }
      spec(x, r);
    },
    bomb(x, r) {
      disc(x, r, '#8a8f99', '#2a2d33', '#101114', '#000');
      x.fillStyle = '#c3261a'; x.fillRect(-r, -r * 0.16, r * 2, r * 0.32);
      x.save(); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.clip(); x.restore();
      x.strokeStyle = '#e8d8a8'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(r * 0.5, -r * 0.7); x.quadraticCurveTo(r * 0.9, -r * 1.05, r * 0.6, -r * 1.2); x.stroke();
      spec(x, r, 0.6);
    },
  };
  function chrome(x, r, c, specA = 0.95) {
    const g = x.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.04, 0, 0, r * 1.02);
    g.addColorStop(0, c[0]); g.addColorStop(0.18, c[1]); g.addColorStop(0.5, c[2]); g.addColorStop(0.8, c[3]); g.addColorStop(1, c[4]);
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.clip();
    const h = x.createLinearGradient(0, -r * 0.1, 0, r);
    h.addColorStop(0, 'rgba(8,16,12,0)'); h.addColorStop(0.12, 'rgba(8,16,12,.38)'); h.addColorStop(0.55, 'rgba(25,105,72,.22)'); h.addColorStop(1, 'rgba(70,170,120,.38)');
    x.fillStyle = h; x.fillRect(-r, -r * 0.06, r * 2, r * 2);
    x.restore();
    x.fillStyle = `rgba(255,255,255,${specA})`; x.beginPath(); x.ellipse(-r * 0.35, -r * 0.43, r * 0.3, r * 0.19, -0.55, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,236,200,.4)'; x.beginPath(); x.ellipse(r * 0.4, r * 0.5, r * 0.22, r * 0.09, -0.7, 0, TAU); x.fill();
    ring(x, r - 0.3, 'rgba(0,0,0,.45)', 0.6);
  }
  function ball(type, r = 8) { return sprite('ball-' + type + r, (r + 2) * 2, x => (BALL_DRAW[type] || BALL_DRAW.steel)(x, r)); }

  /* ---------- glow / particles ---------- */
  function glow(color) {
    return sprite('glow' + color, 64, x => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 32);
      g.addColorStop(0, rgba(color, 1)); g.addColorStop(0.22, rgba(color, 0.5)); g.addColorStop(0.55, rgba(color, 0.12)); g.addColorStop(1, rgba(color, 0));
      x.fillStyle = g; x.fillRect(-32, -32, 64, 64);
    }, 1);
  }
  function twinkle(color) {
    return sprite('tw' + color, 32, x => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 16); g.addColorStop(0, rgba(color, 0.9)); g.addColorStop(1, rgba(color, 0));
      x.fillStyle = g; x.fillRect(-16, -16, 32, 32);
      x.fillStyle = '#fff'; star(x, 4, 15, 1.6); x.fill();
    }, 2);
  }
  function shadow() {
    return sprite('shadow', 32, x => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 16); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(0.6, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(-16, -16, 32, 32);
    }, 2);
  }
  function coin() {
    return sprite('coin', 16, x => { disc(x, 7, '#fffbe0', '#ffd34a', '#b07a12', '#4d3104'); ring(x, 5, 'rgba(110,70,0,.6)', 0.7); spec(x, 7, 0.7); }, 4);
  }

  /* ---------- reel symbols (100 unit box) ---------- */
  const SYM_DRAW = {
    cherry(x) {
      x.lineCap = 'round'; x.strokeStyle = '#2f6b22'; x.lineWidth = 4.5;
      x.beginPath(); x.moveTo(-16, 8); x.quadraticCurveTo(-10, -22, 9, -34); x.stroke();
      x.beginPath(); x.moveTo(16, 14); x.quadraticCurveTo(14, -10, 9, -34); x.stroke();
      const lg = x.createLinearGradient(10, -44, 38, -26); lg.addColorStop(0, '#9be06a'); lg.addColorStop(1, '#2f7a24');
      x.fillStyle = lg; x.beginPath(); x.moveTo(9, -34); x.quadraticCurveTo(28, -50, 40, -31); x.quadraticCurveTo(24, -22, 9, -34); x.fill();
      x.strokeStyle = '#1d4a14'; x.lineWidth = 1.5; x.stroke();
      [[-17, 20], [16, 26]].forEach(([cx, cy]) => {
        x.save(); x.translate(cx, cy);
        disc(x, 17, '#ff9a8a', '#e01b23', '#8a0a10', '#4a0306');
        ring(x, 16.5, '#3a0204', 2);
        x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(-6, -7, 5, 3, -0.6, 0, TAU); x.fill();
        x.restore();
      });
    },
    bell(x) {
      const g = x.createLinearGradient(-34, 0, 34, 0);
      g.addColorStop(0, '#8a5a12'); g.addColorStop(0.32, '#ffe58f'); g.addColorStop(0.6, '#f2b632'); g.addColorStop(1, '#8a5a12');
      x.fillStyle = '#9a6a14'; x.beginPath(); x.arc(0, 32, 8, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(-28, 20); x.bezierCurveTo(-28, -10, -22, -32, 0, -32); x.bezierCurveTo(22, -32, 28, -10, 28, 20); x.lineTo(36, 28); x.lineTo(-36, 28); x.closePath();
      x.fillStyle = g; x.fill(); x.strokeStyle = '#5a3a08'; x.lineWidth = 2.5; x.stroke();
      x.fillStyle = '#c98d1c'; x.fillRect(-36, 22, 72, 6); x.strokeRect(-36, 22, 72, 6);
      x.fillStyle = g; x.beginPath(); x.arc(0, -36, 5.5, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(-18, 14); x.bezierCurveTo(-18, -6, -14, -22, -4, -26); x.bezierCurveTo(-11, -16, -12, -2, -12, 14); x.closePath(); x.fill();
    },
    clover(x) {
      x.strokeStyle = '#1f5a18'; x.lineWidth = 5; x.lineCap = 'round';
      x.beginPath(); x.moveTo(2, 6); x.quadraticCurveTo(12, 28, 26, 38); x.stroke();
      for (let i = 0; i < 4; i++) {
        x.save(); x.rotate(i * Math.PI / 2 + Math.PI / 4);
        const g = x.createLinearGradient(0, 0, 0, -36); g.addColorStop(0, '#1f7a24'); g.addColorStop(1, '#8ee068');
        x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-5, -9, -23, -13, -21, -27); x.bezierCurveTo(-19, -38, -6, -38, 0, -29); x.bezierCurveTo(6, -38, 19, -38, 21, -27); x.bezierCurveTo(23, -13, 5, -9, 0, 0); x.fill();
        x.strokeStyle = '#0f4512'; x.lineWidth = 1.8; x.stroke();
        x.strokeStyle = 'rgba(230,255,215,.6)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(0, -3); x.lineTo(0, -24); x.stroke();
        x.restore();
      }
    },
    bar(x) {
      rrect(x, -42, -19, 84, 38, 7); x.fillStyle = '#1c1410'; x.fill();
      x.strokeStyle = '#e8bd52'; x.lineWidth = 3.5; x.stroke();
      rrect(x, -36, -13, 72, 26, 4); x.strokeStyle = 'rgba(232,189,82,.45)'; x.lineWidth = 1.2; x.stroke();
      x.fillStyle = '#f6e7c4'; x.font = '25px Bungee, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('BAR', 0, 2);
    },
    diamond(x) {
      const F = [
        [[-32, -10], [-19, -27], [-6, -10], '#a6f5ea'], [[-19, -27], [19, -27], [6, -10], '#dafff8'], [[-19, -27], [6, -10], [-6, -10], '#dafff8'],
        [[19, -27], [32, -10], [6, -10], '#5fe0cf'], [[-32, -10], [-6, -10], [0, 34], '#2fb8a8'], [[-6, -10], [6, -10], [0, 34], '#86f2e2'], [[6, -10], [32, -10], [0, 34], '#13897e'],
      ];
      for (const f of F) { x.beginPath(); x.moveTo(f[0][0], f[0][1]); x.lineTo(f[1][0], f[1][1]); x.lineTo(f[2][0], f[2][1]); x.closePath(); x.fillStyle = f[3]; x.fill(); }
      x.beginPath(); x.moveTo(-32, -10); x.lineTo(-19, -27); x.lineTo(19, -27); x.lineTo(32, -10); x.lineTo(0, 34); x.closePath();
      x.strokeStyle = '#0b4f48'; x.lineWidth = 2.4; x.lineJoin = 'round'; x.stroke();
      x.save(); x.translate(22, -26); x.fillStyle = '#fff'; star(x, 4, 9, 1.8); x.fill(); x.restore();
    },
    seven(x) {
      x.font = '84px Shrikhand, Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#3a0604'; x.fillText('7', 4, 10);
      x.lineJoin = 'round'; x.strokeStyle = '#ffd25a'; x.lineWidth = 7; x.strokeText('7', 0, 6);
      const g = x.createLinearGradient(0, -36, 0, 40); g.addColorStop(0, '#ff7a55'); g.addColorStop(0.5, '#e3241a'); g.addColorStop(1, '#9a0e0a');
      x.fillStyle = g; x.fillText('7', 0, 6);
    },
    skull(x) {
      x.fillStyle = '#efe3c6'; x.strokeStyle = '#3a2a1a'; x.lineWidth = 2.5;
      x.beginPath(); x.arc(0, -8, 27, Math.PI * 0.82, Math.PI * 0.18); x.lineTo(16, 16); x.lineTo(16, 28); x.lineTo(-16, 28); x.lineTo(-16, 16); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#1d1410'; x.beginPath(); x.ellipse(-11, -6, 8, 9, 0, 0, TAU); x.ellipse(11, -6, 8, 9, 0, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(0, 6); x.lineTo(-4, 13); x.lineTo(4, 13); x.closePath(); x.fill();
      x.lineWidth = 2; x.beginPath(); for (let i = -10; i <= 10; i += 5) { x.moveTo(i, 20); x.lineTo(i, 28); } x.stroke();
    },
  };
  function sym(name) { return sprite('sym-' + name, 100, x => SYM_DRAW[name](x), 1.4); }

  /* ---------- board backdrop ---------- */
  function noiseTile() {
    return sprite('noise', 128, x => {
      const id = x.getImageData(0, 0, 128, 128);
      for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      x.putImageData(id, 0, 0);
    }, 1);
  }
  function boardBG(scale, pockets, opts = {}) {
    const c = mk(BW * scale, BH * scale), x = c.getContext('2d');
    x.scale(scale, scale);
    const g = x.createRadialGradient(BW / 2, BH * 0.42, 30, BW / 2, BH * 0.45, BH * 0.78);
    g.addColorStop(0, '#185a42'); g.addColorStop(0.55, '#0f4031'); g.addColorStop(1, '#06231a');
    x.fillStyle = g; x.fillRect(0, 0, BW, BH);
    // sunburst print
    x.save(); x.translate(BW / 2, -40);
    for (let i = 0; i < 48; i++) { const a0 = Math.PI * (i / 48); x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 1300, a0, a0 + Math.PI / 96); x.closePath(); x.fillStyle = 'rgba(255,236,190,.022)'; x.fill(); }
    x.restore();
    // deco fan
    x.strokeStyle = 'rgba(240,210,140,.075)'; x.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(BW / 2, 34, 36 + i * 22, 0.08, Math.PI - 0.08); x.stroke(); }
    // emblem
    x.save(); x.translate(BW / 2, 352);
    x.strokeStyle = 'rgba(240,210,140,.09)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, -118); x.lineTo(118, 0); x.lineTo(0, 118); x.lineTo(-118, 0); x.closePath(); x.stroke();
    x.lineWidth = 1; x.beginPath(); x.moveTo(0, -100); x.lineTo(100, 0); x.lineTo(0, 100); x.lineTo(-100, 0); x.closePath(); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(240,210,140,.085)';
    x.font = '46px Shrikhand, Georgia, serif'; x.fillText('Fever', 0, -6);
    x.font = '12px Bungee, Impact, sans-serif'; if ('letterSpacing' in x) x.letterSpacing = '6px'; x.fillText('PARLOR', 3, 30);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    x.font = '8px Bungee, Impact, sans-serif'; x.fillText('EST 1953', 0, 48);
    x.restore();
    // wall pinstripes
    x.strokeStyle = 'rgba(240,210,140,.07)'; x.lineWidth = 1;
    [6, 10, BW - 6, BW - 10].forEach(px => { x.beginPath(); x.moveTo(px, 60); x.lineTo(px, DIV_TOP - 40); x.stroke(); });
    // fine noise (device space so it stays crisp)
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 0.06; x.globalCompositeOperation = 'overlay';
    x.fillStyle = x.createPattern(noiseTile(), 'repeat'); x.fillRect(0, 0, c.width, c.height); x.restore();
    // pocket chevrons
    if (pockets) for (let i = 0; i < NPOCK; i++) {
      const p = pockets[i], cx = i * PW + PW / 2, col = p.fever ? 'rgba(255,90,60,.35)' : p.m >= 2 ? 'rgba(255,200,80,.28)' : 'rgba(240,220,170,.16)';
      x.fillStyle = col;
      for (let k = 0; k < 2; k++) { const y = DIV_TOP - 34 + k * 10; x.beginPath(); x.moveTo(cx - 7, y); x.lineTo(cx, y + 6); x.lineTo(cx + 7, y); x.lineTo(cx + 7, y + 3); x.lineTo(cx, y + 9); x.lineTo(cx - 7, y + 3); x.closePath(); x.fill(); }
    }
    // pocket tray
    const tg = x.createLinearGradient(0, DIV_TOP - 12, 0, BH);
    tg.addColorStop(0, 'rgba(0,0,0,0)'); tg.addColorStop(0.15, 'rgba(0,0,0,.35)'); tg.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = tg; x.fillRect(0, DIV_TOP - 12, BW, BH - DIV_TOP + 12);
    if (pockets) for (let i = 0; i < NPOCK; i++) drawPocket(x, i, pockets[i], opts);
    // dividers
    for (let k = 0; k <= NPOCK; k++) {
      const px = clamp(k * PW, 2.2, BW - 2.2);
      const dg = x.createLinearGradient(px - 2.4, 0, px + 2.4, 0);
      dg.addColorStop(0, '#6b4a16'); dg.addColorStop(0.45, '#f6dc94'); dg.addColorStop(1, '#7d5a1e');
      x.fillStyle = dg; x.fillRect(px - 2.2, DIV_TOP, 4.4, BH - DIV_TOP);
      if (k > 0 && k < NPOCK) { x.save(); x.translate(px, DIV_TOP); disc(x, 2.8, '#fff6cf', '#e0b04e', '#8a5d1c', '#3a2506'); x.restore(); }
    }
    // vignette + top shade
    const v = x.createRadialGradient(BW / 2, BH * 0.45, BH * 0.3, BW / 2, BH * 0.45, BH * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.42)');
    x.fillStyle = v; x.fillRect(0, 0, BW, BH);
    const tsh = x.createLinearGradient(0, 0, 0, 60); tsh.addColorStop(0, 'rgba(0,0,0,.55)'); tsh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = tsh; x.fillRect(0, 0, BW, 60);
    return c;
  }
  function drawPocket(x, i, p, opts) {
    const x0 = i * PW + 2.2, w = PW - 4.4, y0 = DIV_TOP + 3, h = BH - y0;
    const g = x.createLinearGradient(0, y0, 0, BH);
    if (p.fever) { g.addColorStop(0, '#5a0d08'); g.addColorStop(0.3, '#b8231a'); g.addColorStop(1, '#6e120c'); }
    else if (p.sealed) { g.addColorStop(0, '#2a2420'); g.addColorStop(1, '#151210'); }
    else { g.addColorStop(0, '#8f7c58'); g.addColorStop(0.25, '#efe1bf'); g.addColorStop(1, '#d4c095'); }
    x.fillStyle = g; x.fillRect(x0, y0, w, h);
    const sh = x.createLinearGradient(0, y0, 0, y0 + 22); sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.fillRect(x0, y0, w, 22);
    const cx = x0 + w / 2;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (p.sealed) {
      x.strokeStyle = 'rgba(255,90,60,.6)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(x0 + 8, y0 + 18); x.lineTo(x0 + w - 8, BH - 12); x.moveTo(x0 + w - 8, y0 + 18); x.lineTo(x0 + 8, BH - 12); x.stroke();
      return;
    }
    if (p.fever) {
      x.save(); x.translate(cx, BH - 46); x.scale(0.36, 0.36); SYM_DRAW.seven(x); x.restore();
      x.fillStyle = '#ffd25a'; x.font = '9px Bungee, Impact, sans-serif'; x.fillText('FEVER', cx, BH - 17);
      if (p.m > 1) { x.fillStyle = '#fff3d6'; x.font = '9px Bungee, Impact, sans-serif'; x.fillText('x' + fmtM(p.m), cx, y0 + 16); }
    } else {
      const mult = p.m + (opts.bonus || 0);
      x.fillStyle = mult >= 3 ? '#b3160e' : mult >= 2 ? '#c2410c' : mult < 1 ? '#5b5246' : '#7a2a12';
      const txt = 'x' + fmtM(mult);
      x.font = (txt.length > 4 ? 12 : 16) + 'px Bungee, Impact, sans-serif';
      x.fillText(txt, cx, BH - 34);
      if (p.gold) { x.save(); x.translate(cx, BH - 13); disc(x, 6.5, '#fffbe0', '#ffd34a', '#b07a12', '#4d3104'); x.fillStyle = '#6b4404'; x.font = '7px Bungee, Impact, sans-serif'; x.fillText('$' + p.gold, 0, 0.6); x.restore(); }
    }
  }
  function bulbPositions() {
    const pts = [], inset = 11, step = 25.5;
    const W = CW - inset * 2, H = CH - inset * 2;
    const nx = Math.round(W / step), ny = Math.round(H / step);
    for (let i = 0; i < nx; i++) pts.push({ x: inset + (i / nx) * W, y: inset });
    for (let i = 0; i < ny; i++) pts.push({ x: inset + W, y: inset + (i / ny) * H });
    for (let i = 0; i < nx; i++) pts.push({ x: inset + W - (i / nx) * W, y: inset + H });
    for (let i = 0; i < ny; i++) pts.push({ x: inset, y: inset + H - (i / ny) * H });
    return pts;
  }
  const BULBS = bulbPositions();
  function frame(scale) {
    const c = mk(CW * scale, CH * scale), x = c.getContext('2d');
    x.scale(scale, scale);
    rrect(x, 0, 0, CW, CH, 20);
    const g = x.createLinearGradient(0, 0, CW, CH);
    g.addColorStop(0, '#9a2a1c'); g.addColorStop(0.45, '#5e1010'); g.addColorStop(1, '#320707');
    x.fillStyle = g; x.fill();
    x.save(); rrect(x, 0, 0, CW, CH, 20); x.clip();
    const gl = x.createLinearGradient(0, 0, 0, CH); gl.addColorStop(0, 'rgba(255,220,200,.22)'); gl.addColorStop(0.08, 'rgba(255,220,200,0)'); gl.addColorStop(0.92, 'rgba(0,0,0,0)'); gl.addColorStop(1, 'rgba(0,0,0,.35)');
    x.fillStyle = gl; x.fillRect(0, 0, CW, CH);
    x.globalAlpha = 0.05; x.globalCompositeOperation = 'overlay'; x.fillStyle = x.createPattern(noiseTile(), 'repeat'); x.fillRect(0, 0, CW, CH);
    x.restore();
    rrect(x, 1, 1, CW - 2, CH - 2, 19); x.strokeStyle = 'rgba(255,200,170,.25)'; x.lineWidth = 1; x.stroke();
    const bg = x.createLinearGradient(0, FR - 6, 0, FR + BH + 6);
    bg.addColorStop(0, '#f6dc94'); bg.addColorStop(0.5, '#a97c2c'); bg.addColorStop(1, '#f0d088');
    rrect(x, FR - 5, FR - 5, BW + 10, BH + 10, 9); x.strokeStyle = bg; x.lineWidth = 4; x.stroke();
    rrect(x, FR - 1.5, FR - 1.5, BW + 3, BH + 3, 5); x.strokeStyle = 'rgba(0,0,0,.7)'; x.lineWidth = 3; x.stroke();
    for (const b of BULBS) {
      x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(b.x, b.y + 0.6, 4.6, 0, TAU); x.fill();
      x.fillStyle = '#2a0e08'; x.beginPath(); x.arc(b.x, b.y, 4.1, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(215,173,85,.75)'; x.lineWidth = 0.9; x.beginPath(); x.arc(b.x, b.y, 4.3, 0, TAU); x.stroke();
      x.globalAlpha = 0.3; x.drawImage(bulb('#6a4a2a'), b.x - 3.6, b.y - 3.6, 7.2, 7.2); x.globalAlpha = 1;
    }
    [[FR * 0.5, FR * 0.5], [CW - FR * 0.5, FR * 0.5], [FR * 0.5, CH - FR * 0.5], [CW - FR * 0.5, CH - FR * 0.5]].forEach(([a, b]) => { x.save(); x.translate(a, b); disc(x, 3.4, '#fff6cf', '#e0b04e', '#8a5d1c', '#3a2506'); x.restore(); });
    return c;
  }
  function bulb(color) {
    return sprite('bulb' + color, 12, x => {
      const g = x.createRadialGradient(-1, -1.2, 0.3, 0, 0, 3.6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, rgba(color, 1)); g.addColorStop(1, rgba(color, 0.55));
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, 3.5, 0, TAU); x.fill();
    }, 4);
  }

  /* ---------- engraved icons (24x24 stroke) ---------- */
  const ICON = {
    coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6" stroke-dasharray="1.6 1.6"/><path d="M10.6 9.6 12.4 8.5v7"/>',
    spool: '<path d="M6 4h12M6 20h12M8 4v16M16 4v16"/><path d="M8 8.5l8 2M8 12l8 2M8 15.5l8 2"/>',
    die: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/>',
    flame: '<path d="M12 2.5c1 3.6 5.2 5.6 5.2 10.4a5.2 5.2 0 0 1-10.4 0c0-2.3 1.2-3.8 2.3-4.8.2 1.7 1 2.7 2.2 2.7C11 8 11.4 5.4 12 2.5z"/><path d="M12 15.5c.8.6 1.2 1.3 1.2 2a1.2 1.2 0 0 1-2.4 0c0-.7.4-1.4 1.2-2z"/>',
    bumper: '<circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="5.4"/><path d="M12 9.4l.8 1.7 1.8.2-1.4 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.4-1.2 1.8-.2z" fill="currentColor"/>',
    edges: '<path d="M3 4v16M21 4v16"/><path d="M10 12H6.5m0 0 2-2m-2 2 2 2M14 12h3.5m0 0-2-2m2 2-2 2"/>',
    cup: '<path d="M4.5 5h15l-1.6 11.5a3 3 0 0 1-3 2.5H9.1a3 3 0 0 1-3-2.5z"/><path d="M8 9.5h8"/><path d="M12 13v2"/>',
    ticket: '<path d="M3 7.5A1.5 1.5 0 0 0 4.5 6h15A1.5 1.5 0 0 0 21 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 0-1.5 1.5h-15A1.5 1.5 0 0 0 3 16.5v-2a2.5 2.5 0 0 0 0-5z"/><path d="M14.5 7v2M14.5 11v2M14.5 15v2"/>',
    coins: '<ellipse cx="12" cy="6.5" rx="7" ry="2.6"/><path d="M5 6.5v3.8c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6.5"/><path d="M5 10.3v3.8c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-3.8"/><path d="M5 14.1v3.4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-3.4"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/>',
    lever: '<rect x="3.5" y="9" width="11" height="11" rx="2"/><path d="M6.5 13h5M6.5 16.5h5"/><path d="M14.5 13H18V6"/><circle cx="18" cy="4.3" r="1.9"/>',
    jar: '<path d="M8 3h8M9 3v2.5L6 8.5V18a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8.5l-3-3V3"/><path d="M6 12h12"/><path d="M10.5 16h3"/>',
    jar2: '<path d="M8 3h8M9 3v2.5L6 8.5V18a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8.5l-3-3V3"/><path d="M9.5 13.5l1.6 1.6L14.5 11"/>',
    brick: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19"/>',
    magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/><path d="M6 8h4M14 8h4"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z"/><path d="M12 10.5c0-3.5 2.5-5.5 6.5-5.5 0 3.5-2.5 5.5-6.5 5.5z"/><path d="M8 21h8"/>',
    shake: '<rect x="8" y="5" width="8" height="14" rx="2"/><path d="M4.5 8v8M19.5 8v8M2 10v4M22 10v4"/>',
    nail: '<ellipse cx="12" cy="5" rx="5.5" ry="2"/><path d="M12 7v11.5l-1.2 2.5h2.4L12 18.5"/>',
    snow: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/><path d="M9.5 4.5 12 6.5l2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
    pig: '<path d="M4 12.5a7 6 0 0 1 12.4-3.8L19 7.3v3.4l2 .9v3.2l-2 .5a7 6 0 0 1-3 2.9V20h-3v-1.5a8 8 0 0 1-3 0V20H7v-2.3a6 6 0 0 1-3-5.2z"/><circle cx="15.8" cy="11.2" r=".9" fill="currentColor"/><path d="M9 8h4"/>',
    chart: '<path d="M3.5 20.5h17"/><rect x="5" y="13" width="3" height="5"/><rect x="10.5" y="9" width="3" height="9"/><rect x="16" y="4.5" width="3" height="13.5"/>',
    seven: '<path d="M6 5h12l-7 15"/><path d="M9.5 12.5h6"/>',
    ballplus: '<circle cx="10" cy="13" r="7"/><path d="M19 2.5v6M16 5.5h6"/><path d="M7.4 10.6a3 3 0 0 1 2-1.4"/>',
    arrowdown: '<path d="M12 3v17M6 14l6 6 6-6"/><circle cx="12" cy="3" r="1" fill="currentColor"/>',
    chain: '<rect x="2.5" y="8.5" width="10.5" height="7" rx="3.5"/><rect x="11" y="8.5" width="10.5" height="7" rx="3.5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    circle: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3 2.4"/><circle cx="12" cy="12" r="2"/>',
    moneybag: '<path d="M9 3h6l-1.5 3.5h-3z"/><path d="M10.5 6.5C6 8 4 12 4 15.5 4 19 7 21 12 21s8-2 8-5.5c0-3.5-2-7.5-6.5-9"/><path d="M14 11.6c-.6-.8-1.4-1.1-2.2-1.1-1.1 0-2 .6-2 1.5 0 2 4.4 1 4.4 3 0 .9-.9 1.5-2.2 1.5-.9 0-1.8-.3-2.4-1M12 9.5v1M12 16.5v1"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/><path d="M9.5 18.5h5"/>',
    tear: '<path d="M12 3c3 4.5 6 7.7 6 11a6 6 0 0 1-12 0c0-3.3 3-6.5 6-11z"/><path d="M9 14.5a3 3 0 0 0 2.5 2.8"/>',
    bomb: '<circle cx="11" cy="14" r="7"/><path d="M15.5 8.5 18 6"/><path d="M18.5 5.5c.4-1.4 1.4-2 2.8-2M20.5 2v1M22.5 4.5h-1"/>',
    glass: '<path d="M7 3h10l-1 7a4 4 0 0 1-8 0z"/><path d="M12 14v6M8 21h8"/><path d="M8.3 7h7.4"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M12 3v2"/>',
    dice2: '<rect x="2.5" y="9" width="10" height="10" rx="2"/><rect x="11.5" y="4" width="10" height="10" rx="2" transform="rotate(14 16.5 9)"/><circle cx="7.5" cy="14" r="1" fill="currentColor"/><circle cx="14.6" cy="7.6" r="1" fill="currentColor"/><circle cx="18" cy="10.6" r="1" fill="currentColor"/>',
    cat: '<path d="M5 20c-1-2-1.5-4-1.5-6s.6-3.6 1.5-5L4 3l5 3a8 8 0 0 1 6 0l5-3-1 6c.9 1.4 1.5 3 1.5 5s-.5 4-1.5 6z"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/><path d="M11 16h2l-1 1z"/>',
    moonstar: '<path d="M14 4a7.5 7.5 0 1 0 6 10.6A8 8 0 0 1 14 4z"/><path d="M18 2.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/>',
    fin: '<path d="M2 18.5c3.5 0 5.5-1 7.5-3 2 2 4 3 7 3H22"/><path d="M9.5 15.5c0-5.2 2.2-9.4 7.5-12.5-1.2 4-1.2 8 0 12.5"/>',
    wish: '<path d="M12 21v-8M12 13 6.5 3M12 13l5.5-10"/><circle cx="6.5" cy="3" r="1.3"/><circle cx="17.5" cy="3" r="1.3"/><path d="M9.5 21h5"/>',
    hat: '<path d="M3 18c3 1.6 15 1.6 18 0"/><path d="M6 17.5V8c0-1 2.5-2 6-2s6 1 6 2v9.5"/><path d="M6 13.5c3 1 9 1 12 0"/>',
    paw: '<circle cx="6.8" cy="9.5" r="1.9"/><circle cx="10.6" cy="5.8" r="1.9"/><circle cx="15.2" cy="6.4" r="1.9"/><circle cx="18.2" cy="10.6" r="1.9"/><path d="M8 17c0-3 2-5 4.5-5S17 14 17 17c0 2-1.5 3-3 3-1 0-1.5-.5-2-.5s-1 .5-2 .5c-1.5 0-2-1-2-3z"/>',
    reel: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M8.8 5v14M15.2 5v14"/><path d="M2.5 12h19" stroke-dasharray="1.5 1.5"/>',
    hand: '<path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V10M10 9.5V4a1.5 1.5 0 0 1 3 0v5.5M13 9.5V5a1.5 1.5 0 0 1 3 0v6M16 10.5a1.5 1.5 0 0 1 3 0v3a8 8 0 0 1-8 8h-.5a6 6 0 0 1-5-2.8L3 14.6a1.5 1.5 0 0 1 2.4-1.8L7 14.5"/>',
    cells: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/><circle cx="8.5" cy="11" r="1.3" fill="currentColor"/><circle cx="15.5" cy="13" r="1.3" fill="currentColor"/>',
    rings: '<circle cx="12" cy="12" r="2"/><path d="M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    bolt: '<path d="M13 2 4.5 14H11l-1 8 8.5-12H12z"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    wind: '<path d="M3 8h10.5a3 3 0 1 0-3-3M3 12h15.5a3 3 0 1 1-3 3M3 16h7"/>',
    doll: '<circle cx="12" cy="6.5" r="3.5"/><path d="M8.5 7.5C6 10 5.5 13 5.5 15.5 5.5 19 8 21 12 21s6.5-2 6.5-5.5c0-2.5-.5-5.5-3-8"/><path d="M8 14.5h8"/><circle cx="12" cy="17.5" r="1"/>',
    weight: '<path d="M9 7.5a3 3 0 1 1 6 0"/><path d="M6.5 8.5h11L20 20.5H4z"/><path d="M10 14.5h4"/>',
    ouro: '<path d="M19.6 9A8 8 0 1 0 20 13"/><path d="M16.8 10.3 19.6 9l1 2.8"/><circle cx="12" cy="12" r="2"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 19h14"/>',
    prism: '<path d="M12 3 3 20h18z"/><path d="M12 3v17M7.5 11.5 12 20l4.5-8.5"/>',
    bull: '<path d="M3 5c0 3 2 4.5 4.5 4.5M21 5c0 3-2 4.5-4.5 4.5"/><path d="M7.5 9.5h9l-1 7a3.5 3.5 0 0 1-7 0z"/><circle cx="10" cy="12.5" r=".9" fill="currentColor"/><circle cx="14" cy="12.5" r=".9" fill="currentColor"/><path d="M10.5 17.5h3"/>',
    whale: '<path d="M2 14c0 4 4 6 9 6 6 0 10-3 11-9-2 1-3 1-4 0-1 2-3 3-6 3H2z"/><path d="M18 11c0-3 1-5 3-6-1 2-1 4 1 5"/><circle cx="7" cy="16.3" r=".9" fill="currentColor"/>',
    infinity: '<path d="M12 12c-2-2.7-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.3 6-4zm0 0c2 2.7 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.3-6 4z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    pliers: '<path d="M8.5 3l3 8M15.5 3l-3 8"/><path d="M11 11.5 7.5 21M13 11.5l3.5 9.5"/><circle cx="12" cy="11.2" r="1.3"/>',
    wrench: '<path d="M14.7 4.2a5 5 0 0 0-5.1 6.7L3.7 16.8a2 2 0 0 0 2.8 2.8l5.9-5.9a5 5 0 0 0 6.7-5.1l-3 3-3-1-1-3z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    chalk: '<path d="M6 8l6-4 6 4v8l-6 4-6-4z"/><path d="M6 8l6 4 6-4M12 12v8"/>',
    ingot: '<path d="M3 17h18l-3-8H6z"/><path d="M6 9l2-4h8l2 4"/><path d="M9.5 13h5"/>',
    oil: '<path d="M4 10h10l3 3h4l-2 2h-4l-3 5H5a1 1 0 0 1-1-1z"/><path d="M8 10V7h4v3"/><path d="M21 7.5c0 1.5-1 2-1 3"/>',
    cookie: '<path d="M20 12.5A8.5 8.5 0 1 1 11.5 4a3 3 0 0 0 4 4 3 3 0 0 0 4.5 4.5z"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="12" cy="16" r="1" fill="currentColor"/><circle cx="15.5" cy="13.5" r="1" fill="currentColor"/>',
    scratch: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15l3-4 2 2 4-5"/><circle cx="17" cy="15" r="1" fill="currentColor"/>',
    pot: '<path d="M5 9h14v6a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z"/><path d="M3 9h18M9 5c0 1 1 1 1 2M14 4c0 1 1 1.5 1 2.5"/>',
    mask: '<path d="M3 6c3 1 6 1 9 0 3 1 6 1 9 0v5c0 5-4 8-9 8s-9-3-9-8z"/><path d="M7 11c1-1 2-1 3 0M14 11c1-1 2-1 3 0M9 15c2 1.5 4 1.5 6 0"/>',
    coal: '<path d="M5 19l2-7 5-3 5 3 2 7z"/><path d="M9 13l3 2 3-2"/><path d="M12 2.5c1 1.5 2 2 2 3.5S12 8.5 12 8.5s-2-.5-2-2.5 1-2 2-3.5z"/>',
    clover: '<circle cx="9" cy="9" r="3.2"/><circle cx="15" cy="9" r="3.2"/><circle cx="9" cy="15" r="3.2"/><circle cx="15" cy="15" r="3.2"/><path d="M14 14c1.5 2.5 3 5 6 7"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
    vault: '<rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="12" cy="11.5" r="4"/><path d="M12 9.5v2l1.5 1M6 19v2M18 19v2"/>',
    thermo: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
    capsule: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M6.5 8.5c1.7-1.8 3.5-2.5 5.5-2.5"/>',
    cog: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.3"/>',
    mirror: '<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v5M9 21h6M9.5 6.5l2-2M10 10l4-4"/>',
    half: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    shelf: '<path d="M3 10h18M3 18h18M5 10v10M19 10v10"/><rect x="7" y="5" width="4" height="5"/><rect x="13" y="13" width="4" height="5"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5 20 18M8.5 16.5 20 6"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 20 3M16 7l3 3M18.5 4.5l2 2"/>',
    gem: '<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6M2 9h20"/>',
    skull: '<path d="M12 3a8 8 0 0 0-8 8c0 2.5 1 4 2.5 5v3h11v-3c1.5-1 2.5-2.5 2.5-5a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.6" fill="currentColor"/><circle cx="15" cy="11" r="1.6" fill="currentColor"/><path d="M10 19v-2M14 19v-2"/>',
    feather: '<path d="M20 4c-8 0-14 6-14 13v3"/><path d="M20 4c0 8-5 13-12 13"/><path d="M10 14h5"/>',
    anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 11h8"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    gift: '<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v8h14v-8M12 9v12M12 9c-1.5-3-5-4-5.5-2s3 2 5.5 2zm0 0c1.5-3 5-4 5.5-2s-3 2-5.5 2z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a2.5 2.5 0 0 0 3 4M16 6h3a2.5 2.5 0 0 1-3 4M12 13v4M8.5 20h7M9.5 17h5"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/><path d="M9 7.5h7"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><rect x="8" y="13" width="3" height="3" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    left: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    right: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    fast: '<path d="M4 6v12l7.5-6zM12.5 6v12L20 12z"/>',
  };
  function icon(key, cls = '') { return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[key] || ICON.star}</svg>`; }

  function toURL(key, c, size) {
    if (urls.has(key)) return urls.get(key);
    const o = mk(size, size), x = o.getContext('2d');
    const s = Math.min(size / c.width, size / c.height);
    x.imageSmoothingQuality = 'high';
    x.drawImage(c, (size - c.width * s) / 2, (size - c.height * s) / 2, c.width * s, c.height * s);
    const u = o.toDataURL(); urls.set(key, u); return u;
  }
  return {
    SPR, mk, rgba, sprite, pin, ball, glow, twinkle, shadow, coin, sym, boardBG, frame, bulb, BULBS, icon, ICON, PIN_GLOW, diceSprite, rrect, star, disc,
    pinURL: (t, r) => toURL('pin' + t, pin(t, r, t === 'sprout' ? 2 : 0), 96),
    ballURL: t => toURL('ball' + t, ball(t, 8), 64),
    symURL: s => toURL('sym' + s, sym(s), 96),
    SYM_DRAW,
  };
})();
