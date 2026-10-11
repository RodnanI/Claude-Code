// ANDOR :: level: parsing, chunk prerendering, tile collision.

const TILE_CHARS = {
  '#': T.SOLID, '%': T.ALT, '=': T.ONEWAY, '-': T.ROPE, w: T.AWNING, '^': T.SPIKE_U, v: T.SPIKE_D, '{': T.SPIKE_L, '}': T.SPIKE_R,
  q: T.QUICK, F: T.FAKE, C: T.CRUMBLE, G: T.GATE,
};
const CHUNK = 32;

// Pixel buffer addressed in world pixels (offset by the chunk origin).
class OffBuf extends PixBuf {
  constructor(w, h, ox, oy) {
    super(w, h);
    this.ox = ox;
    this.oy = oy;
  }
  set(x, y, c) {
    x = (x | 0) - this.ox;
    y = (y | 0) - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = c;
  }
  get(x, y) {
    x = (x | 0) - this.ox;
    y = (y | 0) - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }
}

class Level {
  constructor(def) {
    this.def = def;
    this.theme = THEMES[def.theme];
    const rows = def.map;
    this.h = rows.length;
    this.w = Math.max(...rows.map((r) => r.length));
    this.pw = this.w * TILE;
    this.ph = this.h * TILE;
    this.tiles = new Uint8Array(this.w * this.h);
    this.back = new Uint8Array(this.w * this.h);
    this.spawns = [];
    for (let y = 0; y < this.h; y++) {
      const r = rows[y];
      for (let x = 0; x < this.w; x++) {
        const ch = r[x] || '.';
        const t = TILE_CHARS[ch];
        if (t !== undefined) this.tiles[y * this.w + x] = t;
        if ((t === undefined || t === T.CRUMBLE || t === T.GATE) && ch !== '.' && ch !== ' ') this.spawns.push({ ch, x, y });
      }
    }
    if (def.interior) this.back.fill(1);
    for (const z of def.back || []) {
      const [x, y, w, h, v = 1] = z;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.back[yy * this.w + xx] = v;
    }
    this.fakeTiles = [];
    // horizon for parallax: the feet of the start position, else near the bottom
    const st = this.spawns.find((s) => s.ch === '@');
    this.horizon = def.horizon !== undefined ? def.horizon * TILE : st ? (st.y + 1) * TILE : this.ph - 3 * TILE;
  }
  tileAt(tx, ty) {
    if (tx < 0 || tx >= this.w) return T.SOLID;
    if (ty >= this.h) return T.EMPTY;
    if (ty < 0) ty = 0;
    return this.tiles[ty * this.w + tx];
  }
  setTile(tx, ty, t) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;
    this.tiles[ty * this.w + tx] = t;
  }
  solidAt(tx, ty) {
    const t = this.tileAt(tx, ty);
    return t === T.SOLID || t === T.ALT || t === T.FAKE;
  }
  isSolidPx(x, y) {
    return isSolidT(this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)));
  }
  // Any solid tile overlapping the rect?
  rectSolid(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidT(this.tileAt(tx, ty))) return true;
    return false;
  }
  rectTileType(x, y, w, h, fn) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (fn(this.tileAt(tx, ty), tx, ty)) return true;
    return false;
  }

  // Paint the static world into chunk canvases.
  prerender() {
    const th = this.theme;
    PAINT.level = this;
    this.chunks = [];
    this.cw = Math.ceil(this.w / CHUNK);
    this.chh = Math.ceil(this.h / CHUNK);
    const shadow = C('#000000');
    const noDepth = th.name === 'bazaar';
    // how deep each solid tile sits inside the rock (0 = exposed edge)
    const depth = new Uint8Array(this.w * this.h);
    for (let ty = 0; ty < this.h; ty++)
      for (let tx = 0; tx < this.w; tx++) {
        const t = this.tiles[ty * this.w + tx];
        if (t !== T.SOLID && t !== T.ALT) continue;
        let d = 4;
        for (let r = 1; r <= 3 && d === 4; r++)
          for (let yy = -r; yy <= r && d === 4; yy++)
            for (let xx = -r; xx <= r; xx++) {
              const nt = this.tileAt(tx + xx, ty + yy);
              if (!(nt === T.SOLID || nt === T.ALT || nt === T.FAKE || nt === T.CRUMBLE || nt === T.GATE) && ty + yy < this.h) {
                d = r;
                break;
              }
            }
        depth[ty * this.w + tx] = d === 4 ? 4 : d;
      }
    for (let cy = 0; cy < this.chh; cy++)
      for (let cx = 0; cx < this.cw; cx++) {
        const tx0 = cx * CHUNK, ty0 = cy * CHUNK;
        const tw = Math.min(CHUNK, this.w - tx0), tht = Math.min(CHUNK, this.h - ty0);
        const ox = tx0 * TILE, oy = ty0 * TILE;
        const back = new OffBuf(tw * TILE, tht * TILE, ox, oy);
        const front = new OffBuf(tw * TILE, tht * TILE, ox, oy);
        // paint one extra tile of margin for front so shadows across chunk edges work
        for (let ty = ty0; ty < ty0 + tht; ty++)
          for (let tx = tx0; tx < tx0 + tw; tx++) {
            const i = ty * this.w + tx;
            if (th.deep && depth[i] >= 4 && this.tiles[i] === T.SOLID) {
              th.deep(front, tx * TILE, ty * TILE, tx, ty);
              continue;
            }
            if (this.back[i]) th.back(back, tx * TILE, ty * TILE, tx, ty);
            this.paintTile(front, tx, ty);
          }
        // composite with a soft drop shadow onto the back wall
        const W = back.w, H = back.h;
        const fd = front.d, bd = back.d;
        const shadowAt = (x, y) => {
          // sample the front layer at an offset; outside the chunk, ask the tile map
          if (x >= 0 && y >= 0 && x < W && y < H) return fd[y * W + x] >>> 24 > 0;
          const t = this.tileAt(Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE));
          return t === T.SOLID || t === T.ALT || t === T.FAKE;
        };
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const f = fd[i];
            if (f >>> 24) {
              const dep = noDepth ? 0 : depth[((y + oy) >> 4) * this.w + ((x + ox) >> 4)];
              if (dep > 1) {
                const k = dep === 2 ? 0.86 : dep === 3 ? 0.74 : 0.64;
                const dd = dep >= 3 && bayer(x, y) > 0.5 ? k + 0.05 : k;
                bd[i] = packRgb(((f & 255) * dd) | 0, (((f >> 8) & 255) * dd) | 0, (((f >> 16) & 255) * (dd + 0.03)) | 0, 255);
              } else bd[i] = f;
              continue;
            }
            const b = bd[i];
            if (!(b >>> 24)) continue;
            if (shadowAt(x - 3, y - 3) || shadowAt(x - 1, y - 2)) {
              const r = (b & 255) * 0.62, g = ((b >> 8) & 255) * 0.62, bl = ((b >> 16) & 255) * 0.66;
              bd[i] = packRgb(r | 0, g | 0, bl | 0, 255);
            }
          }
        this.chunks.push({ x: ox, y: oy, c: back.toCanvas() });
      }
    // Fake walls get their own canvases so they can fade when entered.
    for (const s of this.fakeTiles) {
      const pb = new OffBuf(TILE, TILE, s.x * TILE, s.y * TILE);
      th.solid(pb, s.x * TILE, s.y * TILE, s.x, s.y, nb(this, s.x, s.y));
      s.c = pb.toCanvas();
    }
    void shadow;
  }
  paintTile(pb, tx, ty) {
    const t = this.tileAt(tx, ty);
    const th = this.theme;
    const px = tx * TILE, py = ty * TILE;
    switch (t) {
      case T.SOLID:
        th.solid(pb, px, py, tx, ty, nb(this, tx, ty));
        break;
      case T.ALT:
        th.alt(pb, px, py, tx, ty, nb(this, tx, ty));
        break;
      case T.ONEWAY:
      case T.ROPE:
      case T.AWNING: {
        const n = nb(this, tx, ty);
        n.lw = this.tileAt(tx - 1, ty) === t || n.l;
        n.rw = this.tileAt(tx + 1, ty) === t || n.r;
        (t === T.AWNING ? th.awning : t === T.ROPE ? th.rope || th.oneway : th.oneway)(pb, px, py, tx, ty, n);
        break;
      }
      case T.SPIKE_U:
        paintSpikes(pb, px, py, 'u', th.spike);
        break;
      case T.SPIKE_D:
        paintSpikes(pb, px, py, 'd', th.spike);
        break;
      case T.SPIKE_L:
        paintSpikes(pb, px, py, 'l', th.spike);
        break;
      case T.SPIKE_R:
        paintSpikes(pb, px, py, 'r', th.spike);
        break;
      case T.QUICK:
        paintQuicksand(pb, px, py, tx, ty, null, this.tileAt(tx, ty - 1) !== T.QUICK);
        break;
      case T.FAKE:
        this.fakeTiles.push({ x: tx, y: ty, a: 1 });
        break;
    }
  }
  drawChunks(g, cam, vw, vh) {
    for (const ch of this.chunks) {
      const x = ch.x - cam.x, y = ch.y - cam.y;
      if (x > vw || y > vh || x + ch.c.width < 0 || y + ch.c.height < 0) continue;
      g.drawImage(ch.c, Math.round(x), Math.round(y));
    }
  }
  drawFakes(g, cam, player, dt, vw = Screen.vw, vh = Screen.vh) {
    for (const f of this.fakeTiles) {
      const near = player && Math.abs(player.cx - (f.x * TILE + 8)) < 40 && Math.abs(player.cy - (f.y * TILE + 8)) < 36 && this.def.fakeRegion !== false;
      const inside = player && player.x < f.x * TILE + 16 + 24 && player.x + player.w > f.x * TILE - 24 && player.y < f.y * TILE + 16 + 20 && player.y + player.h > f.y * TILE - 20;
      f.a = approach(f.a, inside && near ? 0.15 : 1, dt * 3);
      const x = f.x * TILE - cam.x, y = f.y * TILE - cam.y;
      if (x < -16 || y < -16 || x > vw || y > vh) continue;
      g.globalAlpha = f.a;
      g.drawImage(f.c, Math.round(x), Math.round(y));
      g.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Physics body moved through the tile grid. Entities extend this.
class Body {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.hitWall = 0;
    this.hitCeil = false;
    this.dropThrough = 0;
    this.groundType = T.EMPTY;
  }
  get cx() {
    return this.x + this.w / 2;
  }
  get cy() {
    return this.y + this.h / 2;
  }
  get bottom() {
    return this.y + this.h;
  }
  moveX(level, dx) {
    this.hitWall = 0;
    if (!dx) return;
    this.x += dx;
    const y0 = Math.floor(this.y / TILE), y1 = Math.floor((this.y + this.h - 0.01) / TILE);
    if (dx > 0) {
      const tx = Math.floor((this.x + this.w - 0.001) / TILE);
      for (let ty = y0; ty <= y1; ty++)
        if (isSolidT(level.tileAt(tx, ty))) {
          this.x = tx * TILE - this.w;
          this.hitWall = 1;
          break;
        }
    } else {
      const tx = Math.floor(this.x / TILE);
      for (let ty = y0; ty <= y1; ty++)
        if (isSolidT(level.tileAt(tx, ty))) {
          this.x = (tx + 1) * TILE;
          this.hitWall = -1;
          break;
        }
    }
  }
  moveY(level, dy) {
    this.hitCeil = false;
    const wasGround = this.onGround;
    this.onGround = false;
    if (!dy) {
      this.onGround = wasGround && this.checkGround(level);
      return;
    }
    const prevBottom = this.y + this.h;
    this.y += dy;
    const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.01) / TILE);
    if (dy > 0) {
      const ty = Math.floor((this.y + this.h - 0.001) / TILE);
      for (let tx = x0; tx <= x1; tx++) {
        const t = level.tileAt(tx, ty);
        if (isSolidT(t) || (isOneWayT(t) && !this.dropThrough && prevBottom <= ty * TILE + 0.5)) {
          this.y = ty * TILE - this.h;
          this.onGround = true;
          this.groundType = t;
          this.vy = 0;
          break;
        }
      }
    } else {
      const ty = Math.floor(this.y / TILE);
      for (let tx = x0; tx <= x1; tx++)
        if (isSolidT(level.tileAt(tx, ty))) {
          this.y = (ty + 1) * TILE;
          this.hitCeil = true;
          if (this.vy < 0) this.vy = 0;
          break;
        }
    }
  }
  checkGround(level) {
    const ty = Math.floor((this.y + this.h + 0.5) / TILE);
    if ((this.y + this.h) % TILE > 0.6 && (this.y + this.h) % TILE < 15.4) return false;
    const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.01) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      const t = level.tileAt(tx, ty);
      if (isSolidT(t) || (isOneWayT(t) && !this.dropThrough)) {
        this.groundType = t;
        return true;
      }
    }
    return false;
  }
}
