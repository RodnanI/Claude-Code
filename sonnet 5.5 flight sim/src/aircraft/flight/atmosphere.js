/** International Standard Atmosphere (troposphere and lower stratosphere). Altitude in meters above sea level. */
export const RHO0 = 1.225;
export const G = 9.80665;

export function isa(h) {
  if (h < 0) h = 0;
  let T, p;
  if (h <= 11000) {
    T = 288.15 - 0.0065 * h;
    p = 101325 * Math.pow(T / 288.15, 5.25588);
  } else {
    T = 216.65;
    p = 22632 * Math.exp(-(h - 11000) / 6341.6);
  }
  return { T, p, rho: p / (287.05 * T), a: Math.sqrt(1.4 * 287.05 * T) };
}

export const densityRatio = (h) => isa(h).rho / RHO0;
