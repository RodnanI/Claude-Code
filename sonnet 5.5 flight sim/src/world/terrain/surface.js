import { Noise } from '../../core/noise.js';
import { hash2, hashUnit } from '../../core/util.js';
import { M, waterMatForDepth, PALETTE_FLAGS, FL } from '../../voxel/palette.js';
import { SEA_LEVEL } from '../config.js';

/** Surface material selection and subsurface (wall) material. `paint` sources are asked first. */
export function createSurface(seed, biomes, paint) {
  const nS = new Noise(seed ^ 0xa0a), nR = new Noise(seed ^ 0xb0b), nD = new Noise(seed ^ 0xc0c);

  function natural(x, z, h, slope, cell, s) {
    const m = s ? s.m : 1;
    const hb = s ? s.bed : h;
    // beaches
    if (hb < 1.7 + 0.5 * nS.n2(x / 90, z / 90) && m < 0.075) return hb < 0.7 ? M.SAND_WET : M.SAND;
    // altitude bands
    const snowLine = 1010 + 70 * nS.n2(x / 320 + 2, z / 320);
    if (h > snowLine) return slope > 1.25 ? M.ROCK_DARK : M.SNOW;
    if (h > snowLine - 90 && nS.n2(x / 60, z / 60) > 0.15 - (h - (snowLine - 90)) / 300) return slope > 1.1 ? M.ROCK : M.SNOW;
    if (slope > 0.95) return nR.n2(x / 40, z / 40) > 0 ? M.ROCK : M.ROCK_DARK;
    if (h > 760) return slope > 0.6 ? M.ROCK : (nR.n2(x / 55, z / 55) > 0.2 ? M.SCREE : M.ALPINE);
    if (slope > 0.62) return nR.n2(x / 30, z / 30) > -0.1 ? M.ROCK_WARM : M.DIRT;
    const farm = biomes.farmland(x, z, h, m);
    if (farm > 0.5) {
      const gx = Math.floor((x + 7000) / 210), gz = Math.floor((z + 5000) / 160);
      const r = hashUnit(hash2(gx, gz, seed));
      const lx = x + 7000 - gx * 210, lz = z + 5000 - gz * 160;
      // hedge line along each field edge, crop rows inside (direction varies per field)
      if (cell <= 4 && (lx < 1.6 || lz < 1.6)) return cell <= 1.5 ? M.HEDGE : M.FOREST_FLOOR;
      const dir = hash2(gx, gz, seed + 9) & 1;
      const rows = cell <= 2 ? Math.floor((dir ? lx : lz) / 2.5) & 1 : 0;
      if (r < 0.22) return rows ? M.FARM_WHEAT_B : M.FARM_WHEAT;
      if (r < 0.44) return rows ? M.FARM_GREEN_B : M.FARM_GREEN;
      if (r < 0.6) return rows ? M.FARM_PLOW_B : M.FARM_PLOW;
      if (r < 0.72) return rows ? M.FARM_YELLOW_B : M.FARM_YELLOW;
      if (r < 0.86) return rows ? M.FARM_STUBBLE_B : M.FARM_STUBBLE;
      return M.MEADOW;
    }
    const forest = biomes.forest(x, z, h, m, farm);
    if (forest > 0.5) return h > 380 ? M.PINE_FLOOR : M.FOREST_FLOOR;
    const wet = biomes.moisture(x, z);
    const dt = nD.n2(x / 120, z / 120);
    if (dt > 0.62 && slope > 0.25) return M.DIRT;
    if (h > 520) return M.ALPINE;
    if (wet > 0.62) return M.GRASS_LUSH;
    if (wet < 0.36) return M.GRASS_DRY;
    return dt > 0.2 ? M.MEADOW : M.GRASS;
  }

  return {
    /**
     * Material for a column. s is the terrain sample (m, bed, water, hydro) when available.
     * Paint sources (roads, airfields, districts) win over natural biomes but never over open sea.
     */
    at(x, z, h, slope, cell, s) {
      const hb = s ? s.bed : h;
      if (s && !Number.isNaN(s.water) || (!s && hb < SEA_LEVEL)) {
        const isOcean = !s || s.hydro === 0;
        if (isOcean) return waterMatForDepth(-(s ? s.bed : h));
        const p = paint ? paint(x, z, cell, h) : 0;
        if (p) return p;
        return s.hydro === 1 ? M.WATER_RIVER : M.WATER_LAKE;
      }
      if (paint) {
        const p = paint(x, z, cell, h);
        if (p) return p;
      }
      return natural(x, z, h, slope, cell, s);
    },
    sub(mat, h, slope) {
      switch (mat) {
        case M.SAND: case M.SAND_WET: return M.SAND_WET;
        case M.SNOW: case M.ICE: case M.ALPINE: case M.SCREE: return M.ROCK;
        case M.ROCK: case M.ROCK_DARK: case M.ROCK_WARM: return mat;
        case M.ASPHALT: case M.ASPHALT_WORN: case M.ROAD_LINE_W: case M.ROAD_LINE_Y: case M.SIDEWALK: case M.CURB: return M.CONCRETE_DARK;
        case M.RUNWAY: case M.RUNWAY_MARK: case M.TAXI_LINE: case M.APRON: case M.CONCRETE: return M.CONCRETE;
        default:
          if (PALETTE_FLAGS[mat] & FL.WATER) return mat;
          return slope > 0.5 ? M.ROCK_WARM : M.DIRT;
      }
    },
  };
}
