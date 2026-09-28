export const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Rolling average and percentile over a fixed window, allocation free after construction. */
export class Rolling {
  constructor(n = 120) {
    this.n = n;
    this.buf = new Float64Array(n);
    this.i = 0;
    this.count = 0;
    this.sum = 0;
  }
  push(v) {
    if (this.count === this.n) this.sum -= this.buf[this.i];
    else this.count++;
    this.buf[this.i] = v;
    this.sum += v;
    this.i = (this.i + 1) % this.n;
  }
  get avg() { return this.count ? this.sum / this.count : 0; }
  get max() {
    let m = 0;
    for (let i = 0; i < this.count; i++) if (this.buf[i] > m) m = this.buf[i];
    return m;
  }
  percentile(p) {
    if (!this.count) return 0;
    const a = Array.from(this.buf.subarray(0, this.count)).sort((x, y) => x - y);
    return a[Math.min(a.length - 1, Math.floor(a.length * p))];
  }
}

export class Stopwatch {
  constructor() { this.t = now(); }
  lap() { const n = now(); const d = n - this.t; this.t = n; return d; }
}
