import { h } from './dom.js';
import { SITES } from '../world/layout.js';
import { SEA_LEVEL } from '../world/config.js';

const RES = 384;
const HALF = 17500;   // the map covers the island with a margin

/**
 * Island map. The terrain is shaded in slices between frames (the first opening shows it filling in), then cached.
 * Roads come from the highway list and the airfields and towns from the site table.
 */
export class IslandMap {
  constructor(game, onClose) {
    this.game = game;
    this.canvas = h('canvas', { width: RES * 2, height: RES * 2 });
    this.ctx = this.canvas.getContext('2d');
    this.base = document.createElement('canvas');
    this.base.width = RES; this.base.height = RES;
    this.row = 0;
    this.done = false;
    this.root = h('div', { class: 'map-wrap', onclick: (e) => { if (e.target === this.root) onClose(); } },
      this.canvas, h('div', { class: 'map-bar' }, h('span', { class: 'label' }, 'Island map    North is up'), h('button', { class: 'btn small', onclick: onClose }, 'Close (M)')));
    this.img = this.base.getContext('2d').createImageData(RES, RES);
    this.raf = 0;
  }

  _shade(rows) {
    const t = this.game.world.terrain, d = this.img.data, cell = (HALF * 2) / RES, probe = {};
    const end = Math.min(RES, this.row + rows);
    for (let j = this.row; j < end; j++) {
      for (let i = 0; i < RES; i++) {
        const x = -HALF + (i + 0.5) * cell, z = -HALF + (j + 0.5) * cell;
        const h0 = t.heightAt(x, z, cell * 0.5);
        const hx = t.heightAt(x + cell, z, cell * 0.5) - t.heightAt(x - cell, z, cell * 0.5);
        const hz = t.heightAt(x, z + cell, cell * 0.5) - t.heightAt(x, z - cell, cell * 0.5);
        const light = Math.max(0, Math.min(1.6, 0.8 + (-hx * 0.7 + -hz * 0.7) / (cell * 2) * 2.4));
        let r, g, b;
        if (h0 <= SEA_LEVEL + 0.05) { t.sample(x, z, cell * 0.5, probe); const dep = Math.min(1, Math.max(0, -probe.bed) / 60); r = 52 - 26 * dep; g = 96 - 40 * dep; b = 116 - 42 * dep; }
        else if (h0 < 3) { r = 190; g = 176; b = 128; }
        else if (h0 < 300) { const k = h0 / 300; r = 86 + 30 * k; g = 118 - 8 * k; b = 62; }
        else if (h0 < 800) { const k = (h0 - 300) / 500; r = 116 + 40 * k; g = 110 + 20 * k; b = 72 + 30 * k; }
        else { const k = Math.min(1, (h0 - 800) / 600); r = 150 + 90 * k; g = 142 + 98 * k; b = 110 + 130 * k; }
        const o = (j * RES + i) * 4;
        d[o] = Math.min(255, r * light); d[o + 1] = Math.min(255, g * light); d[o + 2] = Math.min(255, b * light); d[o + 3] = 255;
      }
    }
    this.row = end;
    this.base.getContext('2d').putImageData(this.img, 0, 0);
    if (this.row >= RES) this.done = true;
  }

  open() {
    const step = () => {
      if (!this.done) this._shade(6);
      this.draw();
      this.raf = requestAnimationFrame(step);
    };
    cancelAnimationFrame(this.raf);
    step();
  }

  close() { cancelAnimationFrame(this.raf); }

  draw() {
    const c = this.ctx, W = this.canvas.width, s = W / (HALF * 2);
    const X = (x) => (x + HALF) * s, Z = (z) => (z + HALF) * s;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.base, 0, 0, W, W);
    const world = this.game.world;
    // roads
    c.lineCap = 'round';
    if (world.highway) for (const seg of world.highway.segments) {
      c.strokeStyle = seg.kind === 'highway' ? 'rgba(242,194,48,0.95)' : 'rgba(236,227,207,0.7)';
      c.lineWidth = seg.kind === 'highway' ? 3 : 1.8;
      c.beginPath(); c.moveTo(X(seg.ax), Z(seg.az)); c.lineTo(X(seg.bx), Z(seg.bz)); c.stroke();
    }
    c.font = '700 22px "Bahnschrift", "Arial Narrow", Arial, sans-serif'; c.textBaseline = 'middle';
    for (const k of Object.keys(SITES)) {
      const p = SITES[k], x = X(p.x), z = Z(p.z);
      const big = p.kind === 'metropolis' ? 15 : p.kind === 'city' ? 11 : p.kind === 'town' ? 7 : 0;
      if (p.kind === 'airfield') { c.fillStyle = '#15120e'; c.fillRect(x - 12, z - 12, 24, 24); c.fillStyle = '#ff5a1f'; c.fillRect(x - 9, z - 9, 18, 18); c.fillStyle = '#15120e'; c.fillRect(x - 2, z - 9, 4, 18); }
      else if (p.kind === 'mountain') { c.fillStyle = '#15120e'; c.beginPath(); c.moveTo(x, z - 14); c.lineTo(x + 14, z + 10); c.lineTo(x - 14, z + 10); c.closePath(); c.fill(); c.fillStyle = '#ece3cf'; c.beginPath(); c.moveTo(x, z - 9); c.lineTo(x + 8, z + 6); c.lineTo(x - 8, z + 6); c.closePath(); c.fill(); }
      else { c.fillStyle = '#15120e'; c.fillRect(x - big - 2, z - big - 2, big * 2 + 4, big * 2 + 4); c.fillStyle = '#ece3cf'; c.fillRect(x - big, z - big, big * 2, big * 2); }
      c.fillStyle = 'rgba(21,18,14,0.85)'; const w = c.measureText(p.name).width;
      const left = x + w + 40 > W;
      c.fillRect(left ? x - 16 - w - 12 : x + 16, z - 13, w + 12, 26);
      c.fillStyle = '#ece3cf'; c.textAlign = 'left'; c.fillText(p.name, left ? x - 10 - w - 12 : x + 22, z + 1);
    }
    const ent = this.game.ent;
    if (ent) {
      const m = ent.model, x = X(m.pos[0]), z = Z(m.pos[2]), hd = m.att.heading;
      c.save(); c.translate(x, z); c.rotate(hd);
      c.fillStyle = '#15120e'; c.beginPath(); c.moveTo(0, -20); c.lineTo(14, 14); c.lineTo(0, 8); c.lineTo(-14, 14); c.closePath(); c.fill();
      c.fillStyle = '#ff5a1f'; c.beginPath(); c.moveTo(0, -16); c.lineTo(10, 10); c.lineTo(0, 5); c.lineTo(-10, 10); c.closePath(); c.fill();
      c.restore();
    }
  }
}

