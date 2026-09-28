/** Sparse uniform grid over 2D rectangles. Items are anything with an [x0, z0, x1, z1] rect. */
export class SpatialGrid {
  constructor(cell = 128) {
    this.cell = cell;
    this.map = new Map();
    this.count = 0;
  }
  _key(ix, iz) { return ix * 131072 + iz; }
  insert(item, x0, z0, x1, z1) {
    const c = this.cell;
    const i0 = Math.floor(x0 / c), i1 = Math.floor(x1 / c), j0 = Math.floor(z0 / c), j1 = Math.floor(z1 / c);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = this._key(i, j);
        let a = this.map.get(k);
        if (!a) this.map.set(k, (a = []));
        a.push(item);
      }
    }
    this.count++;
  }
  /** Items in the cell containing the point (may include neighbors' overlapping items). */
  at(x, z) { return this.map.get(this._key(Math.floor(x / this.cell), Math.floor(z / this.cell))) || EMPTY; }
  /** Unique items overlapping a rectangle. */
  query(x0, z0, x1, z1, out = []) {
    const c = this.cell;
    const i0 = Math.floor(x0 / c), i1 = Math.floor(x1 / c), j0 = Math.floor(z0 / c), j1 = Math.floor(z1 / c);
    const seen = new Set();
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const a = this.map.get(this._key(i, j));
        if (!a) continue;
        for (let n = 0; n < a.length; n++) {
          const it = a[n];
          if (!seen.has(it)) { seen.add(it); out.push(it); }
        }
      }
    }
    return out;
  }
}
const EMPTY = Object.freeze([]);
