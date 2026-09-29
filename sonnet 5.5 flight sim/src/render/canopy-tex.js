import { Rng } from '../core/rng.js';

/**
 * A tileable pattern of tree crowns for the ground shader. Forest floor fragments far from the camera (where no tree
 * models are drawn) take a canopy from it: sunlit domes with dark gaps between them, lit from the real sun, so a forest seen
 * from a kilometer is a forest and not a flat dark green sheet. Grassland takes the same pattern at a small scale and a high
 * threshold as scattered shrubs.
 *
 * Texel layout, RGBA8, 4-neighbour tileable: r = crown height (0 in the gaps, 1 on the top of the tallest crown),
 * g and b = the surface normal's x and z, biased, a = a random tone per crown. Mipmapped, so distance filters it to a
 * plain average with no shimmer and no fade code in the shader.
 */
export function buildCanopyTexels(S = 256, G = 17, seed = 0x5eed) {
  const rng = new Rng(seed);
  const cellPx = S / G;
  const crowns = [];
  for (let gz = 0; gz < G; gz++) {
    for (let gx = 0; gx < G; gx++) {
      crowns.push({
        cx: (gx + 0.5 + rng.range(-0.34, 0.34)) * cellPx,
        cz: (gz + 0.5 + rng.range(-0.34, 0.34)) * cellPx,
        r: cellPx * rng.range(0.52, 0.86),
        h: rng.range(0.62, 1),
        tone: rng.next(),
      });
    }
  }
  const H = new Float32Array(S * S), T = new Float32Array(S * S);
  const wrap = (d) => (d > S / 2 ? d - S : d < -S / 2 ? d + S : d);
  for (let z = 0; z < S; z++) {
    const gz0 = Math.floor(z / cellPx);
    for (let x = 0; x < S; x++) {
      const gx0 = Math.floor(x / cellPx);
      let best = 0, tone = 0.5;
      for (let oz = -1; oz <= 1; oz++) {
        for (let ox = -1; ox <= 1; ox++) {
          const c = crowns[(((gz0 + oz) % G + G) % G) * G + (((gx0 + ox) % G + G) % G)];
          const dx = wrap(x + 0.5 - c.cx), dz = wrap(z + 0.5 - c.cz);
          const q = (dx * dx + dz * dz) / (c.r * c.r);
          if (q >= 1) continue;
          // a dome with a slightly flattened top, and a ragged rim so no crown is a perfect circle
          const rag = 1 + 0.16 * Math.sin(Math.atan2(dz, dx) * 5 + c.tone * 40) * Math.sin(Math.atan2(dz, dx) * 3 - c.tone * 17);
          const qq = q * rag * rag;
          if (qq >= 1) continue;
          const h = c.h * Math.sqrt(1 - qq * qq * 0.5 - qq * 0.5);
          if (h > best) { best = h; tone = c.tone; }
        }
      }
      H[z * S + x] = best; T[z * S + x] = tone;
    }
  }
  // leaf-scale grain so a crown is not a smooth ball
  for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) {
    const i = z * S + x;
    if (H[i] <= 0) continue;
    let s = ((x * 73856093) ^ (z * 19349663)) >>> 0; s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0;
    H[i] = Math.max(0.02, H[i] * (0.93 + 0.07 * ((s & 1023) / 1023)));
  }
  const out = new Uint8Array(S * S * 4);
  const hAmp = 5.2;
  for (let z = 0; z < S; z++) {
    for (let x = 0; x < S; x++) {
      const i = z * S + x;
      const xl = z * S + ((x + S - 1) % S), xr = z * S + ((x + 1) % S), zu = ((z + S - 1) % S) * S + x, zd = ((z + 1) % S) * S + x;
      let gx = (H[xr] - H[xl]) * hAmp * 0.5, gz = (H[zd] - H[zu]) * hAmp * 0.5;
      const gl = Math.hypot(gx, gz);
      if (gl > 2.4) { gx *= 2.4 / gl; gz *= 2.4 / gl; }
      const inv = 1 / Math.sqrt(1 + gx * gx + gz * gz);
      const o = i * 4;
      out[o] = Math.round(H[i] * 255);
      out[o + 1] = Math.round((-gx * inv * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((-gz * inv * 0.5 + 0.5) * 255);
      out[o + 3] = Math.round(T[i] * 255);
    }
  }
  return out;
}
