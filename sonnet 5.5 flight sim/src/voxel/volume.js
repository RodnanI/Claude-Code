/** Dense voxel volume with a one-cell air border on every side so meshers never bounds check.
    Public coordinates are 0..n-1; storage is offset by one. Index order: x fastest, then z, then y. */
export class Volume {
  constructor(nx, ny, nz) {
    this.nx = nx; this.ny = ny; this.nz = nz;
    this.sx = 1;
    this.sz = nx + 2;
    this.sy = (nx + 2) * (nz + 2);
    this.data = new Uint8Array((nx + 2) * (ny + 2) * (nz + 2));
  }
  index(x, y, z) { return x + 1 + (z + 1) * this.sz + (y + 1) * this.sy; }
  get(x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= this.nx || y >= this.ny || z >= this.nz) return 0;
    return this.data[this.index(x, y, z)];
  }
  set(x, y, z, m) {
    if (x < 0 || y < 0 || z < 0 || x >= this.nx || y >= this.ny || z >= this.nz) return;
    this.data[this.index(x, y, z)] = m;
  }
  /** Fill an inclusive-exclusive index box, clipped to the volume. */
  fillBox(x0, y0, z0, x1, y1, z1, m) {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); z0 = Math.max(0, z0);
    x1 = Math.min(this.nx, x1); y1 = Math.min(this.ny, y1); z1 = Math.min(this.nz, z1);
    if (x1 <= x0) return;
    for (let y = y0; y < y1; y++) {
      for (let z = z0; z < z1; z++) {
        const i = this.index(x0, y, z);
        this.data.fill(m, i, i + (x1 - x0));
      }
    }
  }
  count() {
    let n = 0;
    const d = this.data;
    for (let i = 0; i < d.length; i++) if (d[i]) n++;
    return n;
  }
  clone() {
    const v = new Volume(this.nx, this.ny, this.nz);
    v.data.set(this.data);
    return v;
  }
}
