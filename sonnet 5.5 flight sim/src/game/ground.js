import { materialName } from '../voxel/palette.js';

/**
 * Ground query object for the flight model: terrain height (water surface counts as ground) and, a few times a second,
 * the surface material name under a wheel.
 */
export function makeGround(world) {
  const out = {};
  return {
    h: (x, z) => world.heightAt(x, z, 0),
    surface: (x, z) => {
      world.sampleSurface(x, z, 1, out);
      if (!Number.isNaN(out.water) && out.water > out.bed + 0.05) return 'WATER';
      return materialName(out.mat);
    },
  };
}
