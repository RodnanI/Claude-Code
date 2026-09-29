import { defineRegion } from '../../region.js';
import { M } from '../../../voxel/palette.js';
import { SITES } from '../../layout.js';
import { newOut, snap } from '../_shared/zoning.js';
import { snapY } from '../_shared/urban.js';
import { FIELD_W, FIELD_D, FIELD_OX, FIELD_OZ } from '../../scatter/biomes.js';

/* Farmsteads scattered over the farmland around the four farm towns: a house, a barn, a silo, hay rolls and a shed round a dirt
   yard, a windbreak of trees on the weather side, and a couple of fruit trees by the house. Each stands at the corner of a field,
   where the hedgerows meet, turned to a random quarter. The countryside has people in it. */

const FARM_TOWNS = ['cutbank', 'saltmarsh', 'dunmore', 'portHalden'];
const R = 3900, STEP = 560;
const HOUSE_WALLS = ['FAC_SIDING_WHITE', 'FAC_PLASTER_CREAM', 'FAC_BRICK_RED', 'FAC_PLASTER_WHITE', 'FAC_SIDING_WHITE'];
const ROOFS = [M.ROOF_SHINGLE_GRAY, M.ROOF_SHINGLE_BROWN, M.ROOF_TIN_RUST, M.ROOF_SLATE];

const farms = (key) => {
  const S = SITES[key];
  return defineRegion({
    id: `feature/farms-${key}`,
    name: `${S.name} farms`,
    kind: 'feature',
    bounds: [S.x - R, S.z - R, S.x + R, S.z + R],
    maxHeight: 40,
    layout(ctx) {
      const out = newOut();
      const rng = ctx.rng('farms');
      const { biomes, terrain } = ctx.world;
      const o = { h: 0, m: 0 };
      // a few hundred scattered points: the exact terrain function is cheaper than filling cached tiles for all of them
      const macro = terrain.macro, macroWas = macro.enabled;
      macro.enabled = false;
      const others = Object.values(SITES).filter((q) => q.kind !== 'mountain');
      for (let gz = S.z - R + STEP / 2; gz < S.z + R; gz += STEP) {
        for (let gx = S.x - R + STEP / 2; gx < S.x + R; gx += STEP) {
          const px = gx + rng.range(-STEP * 0.36, STEP * 0.36), pz = gz + rng.range(-STEP * 0.36, STEP * 0.36);
          // snap to the nearest corner where field boundaries meet, and step a little into one of the four fields
          const cx = Math.round((px + FIELD_OX) / FIELD_W) * FIELD_W - FIELD_OX, cz = Math.round((pz + FIELD_OZ) / FIELD_D) * FIELD_D - FIELD_OZ;
          const sx = rng.chance(0.5) ? 1 : -1, sz = rng.chance(0.5) ? 1 : -1;
          const fx = cx + sx * 32, fz = cz + sz * 30;
          let near = 1e9;
          for (const q of others) near = Math.min(near, Math.hypot(fx - q.x, fz - q.z));
          if (near < 1700) continue;                       // not in a town, on an airfield or under the mountain
          const h = terrain.natural(fx, fz, 0, o);
          if (h < 4 || o.m < 0.12) continue;
          const farm = biomes.farmland(fx, fz, h, o.m);
          if (farm < 0.5 || rng.chance(0.12)) continue;
          const flat = Math.max(Math.abs(terrain.natural(fx + 40, fz, 0, {}) - h), Math.abs(terrain.natural(fx - 40, fz, 0, {}) - h), Math.abs(terrain.natural(fx, fz + 40, 0, {}) - h), Math.abs(terrain.natural(fx, fz - 40, 0, {}) - h));
          if (flat > 5) continue;
          const q = rng.int(0, 3), c = Math.cos((q * Math.PI) / 2), s = Math.sin((q * Math.PI) / 2);
          const at = (lx, lz) => [fx + lx * c - lz * s, fz + lx * s + lz * c];
          const put = (kind, lx, lz, w, d, hgt, rot, style, extra = {}) => {
            const [x, z] = at(lx, lz);
            out.structures.push(ctx.kit(kind, { x: snap(x), z: snap(z), y: snapY(ctx.heightAt(x, z)), w, d, h: hgt, rot: (rot + q) & 3, seed: rng.int(1, 1e6), style, ...extra }));
          };
          const prop = (type, lx, lz, scale) => { const [x, z] = at(lx, lz); out.props.push({ type, x, z, yaw: rng.range(0, 6.28), scale, variant: rng.int(0, 2) }); };
          const lot = (lx0, lz0, lx1, lz1, mat) => {
            const a = at(lx0, lz0), b = at(lx1, lz1);
            out.lots.push({ x0: Math.min(a[0], b[0]), z0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), z1: Math.max(a[1], b[1]), mat });
          };
          // the yard first, so buildings and trees stand on it
          lot(-26, -26, 46, 28, M.DIRT_ROAD);
          lot(-15, -14, 15, 14, M.LAWN);
          put('house', 0, 0, 11, 9, 0, 0, { fac: rng.pick(HOUSE_WALLS), roof: rng.pick(ROOFS), type: rng.pick(['gable', 'gable', 'cross', 'hip']) });
          put('barn', 28, -7, 18, 12, 0, 1, { roof: rng.pick([M.ROOF_TIN_RUST, M.ROOF_GREEN, M.ROOF_RED_METAL]) });
          if (rng.chance(0.6)) put('silo', 22, 16, 9, 9, 22, 0, undefined, { n: 1 + rng.int(0, 1), r: 3.1, h: 15 + rng.range(0, 6) });
          if (rng.chance(0.75)) put('hayrolls', 40, 12, 12, 4, 0, 0, undefined, { n: rng.int(3, 5) });
          if (rng.chance(0.55)) put('tinshack', -20, 14, 7, 5, 3.2, 1, undefined);
          // a windbreak of trees on the weather side, and fruit trees in the yard
          for (let i = 0; i < 7; i++) prop(rng.chance(0.25) ? 'poplar' : 'oak', -32 + rng.range(-2, 2), -24 + i * 8 + rng.range(-1.5, 1.5), rng.range(0.85, 1.25));
          for (let i = 0; i < 3; i++) prop('street-tree', rng.range(-14, 14), rng.range(-13, -8), rng.range(0.7, 0.95));
          for (let i = 0; i < 4; i++) prop('bush', rng.range(-11, 11), rng.range(6.5, 8), rng.range(0.8, 1.1));
        }
      }
      macro.enabled = macroWas;
      return out;
    },
  });
};

export default FARM_TOWNS.map(farms);
