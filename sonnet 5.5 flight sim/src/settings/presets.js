/* Quality presets and the derivation from settings to per-system configuration.
   Add a preset by adding a key here; the UI and tests pick it up. Order runs from cheapest to most demanding. */

export const PRESET_ORDER = ['potato', 'low', 'medium', 'high', 'ultra', 'overkill'];

export const PRESET_LABELS = {
  potato: 'Potato', low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra', overkill: 'Overkill',
};

/** Graphics keys controlled by presets. Anything not listed here is a user setting outside presets. */
export const PRESETS = {
  potato:   { baseVoxel: 4,    viewDistance: 6000,  lodErrorPx: 10,   resolutionScale: 0.6,  shadows: 0, shadowSize: 1024, shadowDistance: 300,  msaa: 0, water: 0, clouds: 0, sceneryRange: 0,    traffic: 0,   voxelEdges: 0,    ao: false, macro: false, workers: 1, gpuBudgetMB: 96 },
  low:      { baseVoxel: 2,    viewDistance: 10000, lodErrorPx: 6,    resolutionScale: 0.75, shadows: 0, shadowSize: 1024, shadowDistance: 400,  msaa: 0, water: 0, clouds: 1, sceneryRange: 250,  traffic: 10,  voxelEdges: 0,    ao: true,  macro: false, workers: 2, gpuBudgetMB: 192 },
  medium:   { baseVoxel: 1,    viewDistance: 16000, lodErrorPx: 4,    resolutionScale: 0.9,  shadows: 1, shadowSize: 1024, shadowDistance: 500,  msaa: 0, water: 1, clouds: 1, sceneryRange: 600,  traffic: 30,  voxelEdges: 0.35, ao: true,  macro: true,  workers: 3, gpuBudgetMB: 384 },
  high:     { baseVoxel: 0.5,  viewDistance: 24000, lodErrorPx: 3,    resolutionScale: 1.0,  shadows: 2, shadowSize: 2048, shadowDistance: 800,  msaa: 2, water: 2, clouds: 2, sceneryRange: 1200, traffic: 70,  voxelEdges: 0.6,  ao: true,  macro: true,  workers: 4, gpuBudgetMB: 768 },
  ultra:    { baseVoxel: 0.5,  viewDistance: 36000, lodErrorPx: 2,    resolutionScale: 1.0,  shadows: 3, shadowSize: 2048, shadowDistance: 1400, msaa: 4, water: 2, clouds: 2, sceneryRange: 2400, traffic: 140, voxelEdges: 1,    ao: true,  macro: true,  workers: 6, gpuBudgetMB: 1536 },
  overkill: { baseVoxel: 0.25, viewDistance: 60000, lodErrorPx: 1.25, resolutionScale: 1.25, shadows: 4, shadowSize: 4096, shadowDistance: 3000, msaa: 8, water: 2, clouds: 2, sceneryRange: 5000, traffic: 260, voxelEdges: 1,    ao: true,  macro: true,  workers: 8, gpuBudgetMB: 3072 },
};

export const PRESET_KEYS = Object.keys(PRESETS.potato);

const REF_PROJ = 935; // projection scale at 1080p with a 60 degree vertical fov

/** Translate user-facing settings into the configuration each subsystem consumes. */
export function derive(s) {
  const range = s.sceneryRange | 0;
  let sceneryMaxLevel = -1;
  if (range > 0) sceneryMaxLevel = Math.max(0, Math.min(6, Math.floor(Math.log2((range * s.lodErrorPx) / (REF_PROJ * s.baseVoxel)))));
  return {
    lod: {
      baseVoxel: s.baseVoxel,
      lodErrorPx: s.lodErrorPx,
      viewDistance: s.viewDistance,
      sceneryMaxLevel: range > 0 ? sceneryMaxLevel : -1,
      sceneryDensity: range > 0 ? Math.min(1.6, 0.35 + 0.25 * Math.log2(1 + range / 250)) : 0,
      ao: !!s.ao,
      workers: s.workers,
      gpuBudgetMB: s.gpuBudgetMB,
    },
    render: {
      shadows: s.shadows | 0,
      shadowSize: s.shadowSize,
      shadowDistance: s.shadowDistance,
      water: s.water | 0,
      clouds: s.clouds | 0,
      cloudOctaves: s.clouds >= 2 ? (s.baseVoxel <= 0.25 ? 5 : 4) : 3,
      voxelEdges: s.voxelEdges,
      ao: !!s.ao,
      macro: !!s.macro,
      shadowMaxLevel: Math.min(6, Math.max(3, Math.round(Math.log2(Math.max(1, s.shadowDistance / (64 * s.baseVoxel)))) + 1)),
    },
    traffic: { maxVehicles: s.traffic | 0 },
    resolutionScale: s.resolutionScale,
    msaa: s.msaa | 0,
  };
}
