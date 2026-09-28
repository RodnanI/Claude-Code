/** Tiny synchronous event emitter. */
export class Emitter {
  constructor() { this._h = new Map(); }
  on(type, fn) {
    let list = this._h.get(type);
    if (!list) this._h.set(type, (list = []));
    list.push(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) {
    const list = this._h.get(type);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
  emit(type, a, b, c) {
    const list = this._h.get(type);
    if (!list) return;
    for (const fn of list.slice()) fn(a, b, c);
  }
}
