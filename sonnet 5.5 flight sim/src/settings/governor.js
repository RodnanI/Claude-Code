import { PRESETS, PRESET_ORDER } from './presets.js';

/**
 * Frame-time governor for Auto mode. It trades render scale and detail falloff first, then view distance,
 * with hysteresis so it never oscillates. It never touches voxel size or worker count (those flush the world).
 */
export class Governor {
  constructor({ targetFps = 60, floor = 'potato', ceiling = 'ultra' } = {}) {
    this.target = 1000 / targetFps;
    this.floor = PRESETS[floor];
    this.ceiling = PRESETS[ceiling];
    this.slow = 0;
    this.fast = 0;
    this.cooldown = 0;
    this.enabled = true;
  }

  setTarget(fps) { this.target = 1000 / fps; }

  /** Call once per frame with the smoothed frame time in ms. Returns a partial settings object or null. */
  step(frameMs, s, dtMs) {
    if (!this.enabled) return null;
    if (this.cooldown > 0) { this.cooldown -= dtMs; return null; }
    if (frameMs > this.target * 1.22) { this.slow += dtMs; this.fast = 0; }
    else if (frameMs < this.target * 0.72) { this.fast += dtMs; this.slow = 0; }
    else { this.slow = Math.max(0, this.slow - dtMs); this.fast = Math.max(0, this.fast - dtMs); }
    if (this.slow > 1800) {
      this.slow = 0; this.cooldown = 2500;
      if (s.resolutionScale > this.floor.resolutionScale + 0.001) return { resolutionScale: Math.max(this.floor.resolutionScale, +(s.resolutionScale - 0.1).toFixed(2)) };
      if (s.lodErrorPx < this.floor.lodErrorPx) return { lodErrorPx: Math.min(this.floor.lodErrorPx, +(s.lodErrorPx * 1.25).toFixed(2)) };
      if (s.viewDistance > this.floor.viewDistance) return { viewDistance: Math.max(this.floor.viewDistance, Math.round((s.viewDistance * 0.85) / 1000) * 1000) };
      if (s.shadows > 0) return { shadows: s.shadows - 1 };
      return null;
    }
    if (this.fast > 6000) {
      this.fast = 0; this.cooldown = 5000;
      if (s.viewDistance < this.ceiling.viewDistance) return { viewDistance: Math.min(this.ceiling.viewDistance, Math.round((s.viewDistance * 1.15) / 1000) * 1000) };
      if (s.lodErrorPx > this.ceiling.lodErrorPx) return { lodErrorPx: Math.max(this.ceiling.lodErrorPx, +(s.lodErrorPx / 1.2).toFixed(2)) };
      if (s.resolutionScale < 1) return { resolutionScale: Math.min(1, +(s.resolutionScale + 0.05).toFixed(2)) };
    }
    return null;
  }
}
export { PRESET_ORDER };
