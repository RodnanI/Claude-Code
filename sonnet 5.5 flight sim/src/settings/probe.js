import { PRESET_ORDER } from './presets.js';

/** Picks a starting preset from whatever the browser reveals. Conservative on purpose: Auto can climb later. */
export function probeHardware(info = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;
  const ua = nav.userAgent || '';
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua) || (nav.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const renderer = (info.renderer || '').toLowerCase();
  const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
  const px = typeof screen !== 'undefined' ? screen.width * screen.height * dpr * dpr : 2e6;
  let score = 2;
  const why = [];
  if (/swiftshader|llvmpipe|software|softpipe|basic render/.test(renderer)) { score = 0; why.push('software renderer'); }
  else if (/rtx|rx 6|rx 7|radeon pro w|apple m[2-9]|m[2-9] (pro|max|ultra)|gtx 1080|gtx 1070|titan/.test(renderer)) { score = 4; why.push('high end GPU'); }
  else if (/gtx|rx 5|rx 4|apple m1|radeon rx|arc a|quadro/.test(renderer)) { score = 3; why.push('capable discrete GPU'); }
  else if (/mali|adreno|powervr|apple gpu|videocore/.test(renderer)) { score = mobile ? 1 : 2; why.push('mobile GPU'); }
  else if (/intel/.test(renderer)) { score = /iris xe|arc/.test(renderer) ? 2 : 1; why.push('integrated Intel GPU'); }
  if (mobile) { score = Math.min(score, 1); why.push('mobile device'); }
  if (cores <= 2) { score = Math.min(score, 1); why.push('few cores'); }
  if (mem <= 2) { score = Math.min(score, 1); why.push('low memory'); }
  if (px > 8e6 && score < 4) { score = Math.max(0, score - 1); why.push('very large display'); }
  const tier = PRESET_ORDER[Math.max(0, Math.min(PRESET_ORDER.indexOf('ultra'), score + 1))];
  return { tier, score, cores, mem, mobile, why };
}
