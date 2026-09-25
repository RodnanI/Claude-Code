// ---------------------------------------------------------------------------
// Dialogue box: lacquer-black panel with gold double border and lattice
// corners, a framed portrait, a name tab and typewriter text with voice
// blips. Thoughts (text in parentheses) render in pale jade.
// ---------------------------------------------------------------------------
const SPEAKERS = {
  lu: { name: 'Lu Yan', port: 'lu', pitch: 440, side: 'l' },
  qin: { name: 'Qin Shuang', port: 'qin', pitch: 620, side: 'r' },
  bai: { name: 'Master Bai Heyun', port: 'bai', pitch: 300, side: 'r' },
  moying: { name: 'Mo Ying', port: 'moying', pitch: 250, side: 'r' },
  liu: { name: 'Silver Needle Liu', port: 'liu', pitch: 700, side: 'r' },
  tiefo: { name: 'Tie Fo', port: 'tiefo', pitch: 200, side: 'r' },
  demon: { name: 'Xue Tianmo', port: 'demon', pitch: 230, side: 'r' },
  guwen: { name: 'Elder Gu Wen', port: 'guwen', pitch: 360, side: 'r' },
  cult: { name: 'Masked Cultist', port: null, pitch: 280, side: 'r' },
  bandit: { name: 'Black Wind Bandit', port: null, pitch: 330, side: 'r' },
  villager: { name: 'Villager', port: null, pitch: 520, side: 'r' },
};

const Dialogue = {
  active: false, who: null, lines: [], n: 0, t: 0, done: false, blink: 0,
  open(who, text) {
    this.active = true; this.who = SPEAKERS[who] || { name: who, pitch: 400, side: 'r' };
    this.thought = text.startsWith('(');
    this.lines = Font.wrap(text, this.who.port ? 356 : 430);
    this.total = this.lines.join('').length; this.n = 0; this.t = 0; this.done = false;
    Input.flush();
  },
  update() {
    if (!this.active) return;
    this.t++; this.blink++;
    if (!this.done) {
      const sp = Input.held('attack') || Input.held('jump') ? 3 : 1;
      const prev = this.n;
      this.n = Math.min(this.total, this.n + sp * 0.75);
      if (Math.floor(this.n) !== Math.floor(prev) && Math.floor(this.n) % 2 === 0) SFX.play('text', { pitch: this.who.pitch * (0.9 + Math.random() * 0.2) });
      if (this.n >= this.total) this.done = true;
      if (this.t > 6 && Input.hit('confirm')) { this.n = this.total; this.done = true; }
    } else if (Input.hit('confirm')) { this.active = false; SFX.play('menu'); }
  },
  draw(ctx) {
    if (!this.active) return;
    const W = this.who, hasP = !!W.port, left = !hasP || W.side === 'l';
    const bx = 10, by = 192, bw = 460, bh = 72;
    ornateBox(ctx, bx, by, bw, bh);
    const px = left ? bx + 6 : bx + bw - 70, tx = hasP && left ? bx + 78 : bx + 12;
    if (hasP) {
      ctx.fillStyle = '#1c1210'; ctx.fillRect(px, by + 4, 64, 64);
      if (left) ctx.drawImage(Portraits.get(W.port), px, by + 4, 64, 64);
      else { ctx.save(); ctx.translate(px + 64, by + 4); ctx.scale(-1, 1); ctx.drawImage(Portraits.get(W.port), 0, 0, 64, 64); ctx.restore(); }
      ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 1; ctx.strokeRect(px - 0.5, by + 3.5, 65, 65);
    }
    // name tab
    const nw = Font.width(W.name) + 14, nx = hasP && left ? bx + 78 : hasP ? bx + bw - 76 - nw : bx + 10;
    ctx.fillStyle = '#7a1a12'; ctx.fillRect(nx, by - 9, nw, 12);
    ctx.fillStyle = '#b8301e'; ctx.fillRect(nx + 1, by - 8, nw - 2, 1);
    ctx.fillStyle = '#d6a53a'; ctx.fillRect(nx, by - 10, nw, 1); ctx.fillRect(nx - 1, by - 9, 1, 11); ctx.fillRect(nx + nw, by - 9, 1, 11);
    Font.draw(ctx, W.name, nx + 7, by - 8, '#f6e8c8', { shadow: '#3a0a06' });
    // text
    let left_ = Math.floor(this.n);
    const color = this.thought ? '#b9d8c2' : '#efe3c8';
    this.lines.forEach((ln, i) => {
      if (left_ <= 0) return;
      const s = ln.slice(0, left_);
      left_ -= ln.length;
      Font.draw(ctx, s, tx, by + 9 + i * 11, color, { shadow: '#000000' });
    });
    if (this.done && (this.blink >> 4) & 1) {
      const ax = bx + bw - (hasP && !left ? 82 : 14), ay = by + bh - 10;
      ctx.fillStyle = '#d6a53a';
      ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1);
    }
  },
};

function ornateBox(ctx, x, y, w, h, fill = 'rgba(14,10,9,0.93)') {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#c8a050';
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  ctx.fillStyle = '#6a1a12';
  ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillRect(x + 2, y + h - 3, w - 4, 1); ctx.fillRect(x + 2, y + 2, 1, h - 4); ctx.fillRect(x + w - 3, y + 2, 1, h - 4);
  // lattice corners
  ctx.fillStyle = '#e8c870';
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) {
    for (let i = 0; i < 6; i++) { ctx.fillRect(cx + sx * i, cy + sy * 4, 1, 1); ctx.fillRect(cx + sx * 4, cy + sy * i, 1, 1); }
    ctx.fillRect(cx + sx * 2, cy + sy * 2, 1, 1);
  }
}
