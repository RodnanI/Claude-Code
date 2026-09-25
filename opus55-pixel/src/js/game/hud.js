// ---------------------------------------------------------------------------
// HUD: brush-stroke health bar with a damage trail, segmented qi gauge, combo
// counter, boss bar, banners, tutorial hints and ink-brush chapter cards.
// ---------------------------------------------------------------------------
const Hud = {
  trail: 100, bossTrail: 1, bannerT: 0, bannerS: '', hintT: 0, hintS: '', card: null, comboShow: 0, comboN: 0,
  reset() { this.trail = G.player ? G.player.hp : 100; this.bossTrail = 1; this.bannerT = 0; this.hintT = 0; this.card = null; },
  banner(s, t = 100) { this.bannerS = s; this.bannerT = t; },
  hint(s, t = 330) { this.hintS = s; this.hintT = t; SFX.play('menu'); },
  chapterCard(ch, name) { this.card = { ch, name, t: 0 }; SFX.play('gong'); },
  update() {
    const p = G.player;
    if (p) this.trail = this.trail > p.hp ? Math.max(p.hp, this.trail - 0.4) : p.hp;
    if (G.boss) { const k = Math.max(0, G.boss.hp) / G.boss.maxHp; this.bossTrail = this.bossTrail > k ? Math.max(k, this.bossTrail - 0.003) : k; }
    if (this.bannerT > 0) this.bannerT--;
    if (this.hintT > 0) this.hintT--;
    if (this.card && ++this.card.t > 260) this.card = null;
    if (p && p.combo > 1) { this.comboN = p.combo; this.comboShow = 90; } else if (this.comboShow > 0) this.comboShow--;
  },
  draw(ctx) {
    const p = G.player;
    if (!p) return;
    // medallion
    const mx = 18, my = 18;
    discPx(ctx, mx, my, 13, '#1a1210'); ringPx(ctx, mx, my, 13, '#c8a050'); ringPx(ctx, mx, my, 11, '#6a1a12');
    ctx.drawImage(Portraits.get('lu'), 0, 0, 32, 32, mx - 12, my - 12, 24, 24);
    // hp: brush stroke
    brushBar(ctx, 34, 9, 118, 7, p.hp / p.maxHp, this.trail / p.maxHp, ['#5a0e08', '#b0231d', '#e04428', '#f47a52'], '#f2d8a0');
    // qi: four jade-gold segments
    const qx = 36, qy = 20, seg = 22;
    for (let i = 0; i < 4; i++) {
      const f = clamp((p.qi - i * 25) / 25, 0, 1), x = qx + i * (seg + 2);
      ctx.fillStyle = '#140e0c'; ctx.fillRect(x - 1, qy - 1, seg + 2, 5);
      ctx.fillStyle = '#3a2a14'; ctx.fillRect(x, qy, seg, 3);
      if (f > 0) {
        const full = p.qi >= 100;
        ctx.fillStyle = full ? ((G.time >> 3) & 1 ? '#fff0a0' : '#ffd060') : f >= 1 ? '#e8b83a' : '#a07a24';
        ctx.fillRect(x, qy, Math.round(seg * f), 3);
        ctx.fillStyle = '#fff6c8'; ctx.fillRect(x, qy, Math.round(seg * f), 1);
      }
    }
    if (p.qi >= 100) Font.draw(ctx, 'ULTIMATE READY', qx + 100, qy - 2, (G.time >> 4) & 1 ? '#fff0a0' : '#e8b83a', { outline: '#1a0e08' });
    // combo
    if (this.comboShow > 0) {
      const a = Math.min(1, this.comboShow / 20);
      Font.draw(ctx, String(this.comboN), VW - 16, 44, '#ffe08a', { align: 'right', scale: 3, outline: '#2a1206', alpha: a });
      Font.draw(ctx, 'HITS', VW - 16, 74, '#f6e8c8', { align: 'right', outline: '#2a1206', alpha: a });
    }
    // boss
    if (G.boss && G.boss.active && G.boss.hp > 0) this.drawBoss(ctx, G.boss);
    // banner
    if (this.bannerT > 0) {
      const a = Math.min(1, this.bannerT / 20, (100 - Math.min(100, this.bannerT)) / 10 + 0.2);
      inkStroke(ctx, VW / 2, 92, 220, 22, G.time, a * 0.9);
      Font.draw(ctx, this.bannerS, VW / 2, 86, '#f6e8c8', { align: 'center', outline: '#1a0e08', alpha: a });
    }
    // hint
    if (this.hintT > 0 && !Dialogue.active) {
      const a = Math.min(1, this.hintT / 30);
      const lines = Font.wrap(this.hintS, 300);
      const w = Math.max(...lines.map(l => Font.width(l))) + 16, h = lines.length * 11 + 8;
      ctx.save(); ctx.globalAlpha = a;
      ornateBox(ctx, Math.round(VW / 2 - w / 2), 30, w, h, 'rgba(14,10,9,0.8)');
      lines.forEach((l, i) => Font.draw(ctx, l, VW / 2, 35 + i * 11, '#efe3c8', { align: 'center' }));
      ctx.restore();
    }
    if (this.card) this.drawCard(ctx);
  },
  drawBoss(ctx, b) {
    const w = 300, x = (VW - w) / 2, y = 250;
    Font.draw(ctx, b.D.name, x, y - 12, '#f6e8c8', { outline: '#1a0e08' });
    Font.draw(ctx, b.D.title, x + w, y - 12, '#c8a050', { align: 'right', outline: '#1a0e08' });
    brushBar(ctx, x, y, w, 6, Math.max(0, b.hp) / b.maxHp, this.bossTrail, ['#3a0606', '#8a1410', '#c82418', '#ea5030'], '#e8c870');
    ctx.fillStyle = '#e8c870'; ctx.fillRect(Math.round(x + w / 2), y - 1, 1, 8);
  },
  drawCard(ctx) {
    const c = this.card, t = c.t;
    const a = t < 20 ? t / 20 : t > 220 ? (260 - t) / 40 : 1;
    const reveal = Math.min(1, t / 40);
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    inkStroke(ctx, VW / 2, VH / 2 - 4, 320 * reveal, 38, 7, 0.92);
    Font.draw(ctx, c.ch.toUpperCase(), VW / 2, VH / 2 - 28, '#d6a53a', { align: 'center', outline: '#140c0a' });
    if (t > 26) Font.draw(ctx, c.name, VW / 2, VH / 2 - 12, '#f6ecd6', { align: 'center', scale: 2, outline: '#140c0a' });
    if (t > 50) seal(ctx, VW / 2 + Font.width(c.name, 2) / 2 + 10, VH / 2 - 14, Math.min(1, (t - 50) / 10));
    ctx.restore();
  },
};

function brushBar(ctx, x, y, w, h, f, trail, cols, edge) {
  const ends = (i, len) => (i < 3 ? 3 - i : i > len - 5 ? i - (len - 5) : 0);
  // ink backing with ragged ends
  for (let i = -3; i < w + 5; i++) {
    const r = Math.round(hash2(i, 3, 17) * 1.6);
    ctx.fillStyle = '#120c0a';
    ctx.fillRect(x + i, y - 2 + r, 1, h + 4 - r - Math.round(hash2(i, 5, 17) * 1.4));
  }
  const fw = Math.round(w * clamp(f, 0, 1)), tw = Math.round(w * clamp(trail, 0, 1));
  if (tw > fw) { ctx.fillStyle = edge; ctx.fillRect(x + fw, y, tw - fw, h); }
  for (let i = 0; i < fw; i++) {
    const cut = ends(i, w);
    for (let j = cut; j < h - (i > w - 5 ? cut : 0); j++) {
      ctx.fillStyle = j === 0 ? cols[3] : j === h - 1 ? cols[0] : j === 1 ? cols[2] : ((i + j * 3) % 9 === 0 ? cols[1] : cols[2]);
      ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

// horizontal dry-brush ink stroke, used behind banners and chapter titles
function inkStroke(ctx, cx, cy, w, h, seed, a = 1) {
  if (w < 2) return;
  ctx.save(); ctx.globalAlpha *= a;
  const x0 = Math.round(cx - w / 2);
  for (let i = 0; i < w; i++) {
    const u = i / w;
    const thick = h * (u < 0.08 ? 0.5 + u * 6 : u > 0.85 ? Math.max(0.15, (1 - u) * 6.6) : 1) * (0.92 + 0.08 * Math.sin(i * 0.3 + seed));
    const top = cy - thick / 2 + Math.sin(u * 3 + seed) * 2;
    for (let j = 0; j < thick; j++) {
      const dry = u > 0.7 && hash2(Math.floor(j / 2), i >> 2, seed) > 1.25 - u;
      if (dry) continue;
      ctx.fillStyle = hash2(i, j, seed) > 0.96 ? '#2a201c' : '#0e0a09';
      ctx.fillRect(x0 + i, Math.round(top + j), 1, 1);
    }
  }
  ctx.restore();
}

// red seal stamp with a stylized swallow
function seal(ctx, x, y, k) {
  const s = Math.round(18 * (1.4 - 0.4 * k));
  x = Math.round(x - s / 2); y = Math.round(y - s / 2);
  ctx.fillStyle = '#b8261a'; ctx.fillRect(x, y, s, s);
  ctx.fillStyle = '#e8d8c0';
  const sc = s / 18;
  const px = (a, b, w = 1, h = 1) => ctx.fillRect(Math.round(x + a * sc), Math.round(y + b * sc), Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
  px(2, 2, 14, 1); px(2, 15, 14, 1); px(2, 2, 1, 14); px(15, 2, 1, 14);
  // swallow glyph
  px(5, 8, 8, 1); px(4, 7, 2, 1); px(12, 7, 2, 1); px(8, 6, 2, 3); px(8, 9, 1, 3); px(7, 11, 1, 2); px(10, 11, 1, 2);
  px(3, 6, 1, 1); px(14, 6, 1, 1);
  if (hash2(3, 3, 1) > 0) { ctx.fillStyle = '#d8402a'; ctx.fillRect(x + 1, y + s - 2, 2, 1); }
}
