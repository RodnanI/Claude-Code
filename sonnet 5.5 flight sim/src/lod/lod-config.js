import { NODE_CELLS, WORLD_HALF } from '../world/config.js';

/** Derives the LOD pyramid from quality settings. baseCell is the voxel size of level 0. */
export function makeLodConfig(s) {
  const baseCell = s.baseVoxel;
  const N = NODE_CELLS;
  let maxLevel = 0;
  while (N * baseCell * 2 ** maxLevel < WORLD_HALF) maxLevel++;
  return {
    N, baseCell, maxLevel,
    errorPx: s.lodErrorPx,
    viewDistance: s.viewDistance,
    sceneryMaxLevel: s.sceneryMaxLevel ?? 3,
    sceneryDensity: s.sceneryDensity ?? 1,
    ao: s.ao !== false,
    cell: (level) => baseCell * 2 ** level,
    size: (level) => N * baseCell * 2 ** level,
  };
}

export const nodeKey = (level, ix, iz) => (level * 65536 + (ix + 32768)) * 65536 + (iz + 32768);
