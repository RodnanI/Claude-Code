import test from 'node:test';
import assert from 'node:assert/strict';
import { Recipe, meshRecipe, rasterize, loftTest } from '../../src/voxel/recipe.js';
import { clipToHull } from '../../src/aircraft/builders/parts.js';
import { prop, fairedStrut, sitter } from '../../src/aircraft/builders/detail.js';
import { wingDef, wingSurface, surfaceSeams } from '../../src/aircraft/builders/surfaces.js';
import { ModelKit } from '../../src/aircraft/model-kit.js';
import { M } from '../../src/voxel/palette.js';
import { Rng } from '../../src/core/rng.js';

const tris = (r, cell, extra = {}) => { const m = meshRecipe(r, { cell, anchor: [0, 0, 0], ...extra }); return m ? m.indexCount / 3 : 0; };

test('a propeller blade is never thinner than a voxel, whatever the voxel size', () => {
  for (const cell of [0.03125, 0.04, 0.05, 0.0625, 0.1]) {
    const r = new Recipe(); prop(r, 0.9, 2, { chord: 0.16 });
    const R = rasterize(r, { cell, anchor: [0, 0, 0] });
    let n = 0;
    for (const v of R.vol.data) if (v === M.AC_PROP) n++;
    assert.ok(n >= 12, `only ${n} blade voxels at ${cell}`);
  }
});

test('a faired strut survives every coarse level', () => {
  const r = new Recipe();
  fairedStrut(r, [0.1, -0.4, 0.4], [0.12, 1.07, 2.7], { chord: 0.2, thick: 0.05 });
  for (const cell of [0.04, 0.08, 0.16, 0.32, 0.64]) assert.ok(tris(r, cell, { conservative: cell >= 0.2 }) > 0, `empty at ${cell}`);
});

test('the loft test keeps its exact answers with the fast paths', () => {
  const rng = new Rng(77);
  const st = [
    { a: -3, c1: 0.1, c2: 0, r1: 0.3, r2: 0.2, n: 2.4 }, { a: 0, c1: 0.2, c2: 0.05, r1: 0.7, r2: 0.55, n: 2.8 },
    { a: 2, c1: 0.0, c2: 0, r1: 0.5, r2: 0.5 }, { a: 3.5, c1: -0.1, c2: 0, r1: 0.2, r2: 0.25, n: 3.4 },
  ];
  for (const e of [0, -0.05, 0.03]) {
    const t = loftTest(st, 'x', e);
    // the plain formula, station search and all, with a pow for every voxel
    const ref = (x, y, z) => {
      const S = st.slice().sort((p, q) => p.a - q.a);
      if (x < S[0].a - e || x > S[S.length - 1].a + e) return false;
      let i = 0;
      while (i < S.length - 2 && x > S[i + 1].a) i++;
      const s0 = S[i], s1 = S[i + 1], k = Math.min(1, Math.max(0, (x - s0.a) / (s1.a - s0.a)));
      const L = (p, q) => p + (q - p) * k;
      const r1 = L(s0.r1, s1.r1) + e, r2 = L(s0.r2, s1.r2) + e, n = L(s0.n ?? 2, s1.n ?? 2);
      if (r1 <= 0 || r2 <= 0) return false;
      return Math.pow(Math.abs(y - L(s0.c1, s1.c1)) / r1, n) + Math.pow(Math.abs(z - L(s0.c2, s1.c2)) / r2, n) <= 1;
    };
    for (let i = 0; i < 4000; i++) {
      const x = -3.4 + rng.next() * 7.2, y = -1 + rng.next() * 2, z = -1 + rng.next() * 2;
      assert.equal(t(x, y, z), ref(x, y, z), `loft test differs at ${x}, ${y}, ${z} (e ${e})`);
    }
  }
});

test('clipping to a hull removes exactly what a test of every voxel removes', () => {
  const hull = [
    { a: 3.5, c1: 0, c2: 0, r1: 0.4, r2: 0.43, n: 2.4 }, { a: 1.4, c1: 0.15, c2: 0, r1: 0.72, r2: 0.56, n: 2.6 },
    { a: -1.9, c1: 0.2, c2: 0, r1: 0.6, r2: 0.44, n: 2.4 }, { a: -4.6, c1: 0.4, c2: 0, r1: 0.16, r2: 0.09 },
  ];
  for (const bounds of [[-2, -0.8, -0.8, 2, 0.2, 0.8], [-6, -2, -2, 5, 2, 2], [4, -1, -1, 6, 1, 1]]) {
    const inside = loftTest(hull, 'x', -0.09);
    const make = (fast) => {
      const r = new Recipe();
      r.box(...bounds, M.AC_GRAY);
      if (fast) clipToHull(r, hull, 'x', 0.09, bounds);
      else r.fn(bounds[0], bounds[1], bounds[2], bounds[3], bounds[4], bounds[5], (x, y, z) => (inside(x, y, z) ? 0 : -1));
      return rasterize(r, { cell: 0.04, anchor: [0, 0, 0] });
    };
    const A = make(false), B = make(true);
    assert.ok(A && B, 'both rasterize');
    assert.equal(A.vol.data.length, B.vol.data.length);
    let diff = 0;
    for (let i = 0; i < A.vol.data.length; i++) if ((A.vol.data[i] !== 0) !== (B.vol.data[i] !== 0)) diff++;
    assert.equal(diff, 0, `${diff} voxels differ for bounds ${bounds}`);
  }
});

test('a cut-out surface and its seams keep both pieces at every level', () => {
  const k = new ModelKit();
  const body = k.part('body');
  const W = wingDef([0.5, 1.0, 0], 5.0, 1.6, 1.2, 0.0, 0.25, 0.15, 0.11, 1);
  body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, 1, M.AC_WHITE);
  const al = wingSurface(k, body, 'aileronR', W, { z0: 3.0, z1: 4.9, frac: 0.3, mat: M.AC_WHITE });
  for (const r of [body, al]) surfaceSeams(r, W, { z0: 3.0, z1: 4.9, frac: 0.3 });
  for (const cell of [0.04, 0.08, 0.16, 0.32]) {
    assert.ok(tris(al, cell, { conservative: cell >= 0.2 }) > 0, `the surface is empty at ${cell}`);
    assert.ok(tris(body, cell, { conservative: cell >= 0.2 }) > 0, `the wing is empty at ${cell}`);
  }
});

test('a seated person fits in a light aircraft seat', () => {
  const r = new Recipe();
  sitter(r, 0.3, -0.27, -0.3, { floor: -0.4, feetX: 0.95, cap: M.AC_RED });
  const R = rasterize(r, { cell: 0.02, anchor: [0, 0, 0] });
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let y = 0; y < R.vol.ny; y++) for (let z = 0; z < R.vol.nz; z++) for (let x = 0; x < R.vol.nx; x++) {
    if (!R.vol.get(x, y, z)) continue;
    const p = [(x + R.i0 + 0.5) * 0.02, (y + R.j0 + 0.5) * 0.02, (z + R.k0 + 0.5) * 0.02];
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  }
  assert.ok(lo[1] > -0.5 && hi[1] < 0.75, `the figure spans ${lo[1].toFixed(2)} to ${hi[1].toFixed(2)} in height`);
  assert.ok(lo[2] > -0.7 && hi[2] < 0.1, `the figure stays within a seat width of its center (${lo[2].toFixed(2)} to ${hi[2].toFixed(2)})`);
  assert.ok(lo[0] > -0.1 && hi[0] < 1.2, `the figure stays between the seat back and the panel (${lo[0].toFixed(2)} to ${hi[0].toFixed(2)})`);
});
