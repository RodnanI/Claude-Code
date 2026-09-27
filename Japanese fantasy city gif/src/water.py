"""River surface: scanline-wobble mirror reflection, sparse ripple dashes, sun glitter path, light streaks."""
import numpy as np
from common import *
from sky import SUN

DEEP = rgb('#140a10')
MIDW = rgb('#2c141c')
GLINT = [rgb(c) for c in ('#9a4a3a', '#d8743e', '#f6b060', '#ffe6a8', '#fffbe6')]


def hash2(a, b):
    v = np.sin(a * 12.9898 + b * 78.233) * 43758.5453
    return v - np.floor(v)


def water(img, t, lights):
    top = WATER_Y
    src = img.copy()
    xs = np.arange(W)
    for y in range(top, H):
        d = y - top + 1
        f = d / (H - top)
        amp = 0.2 + d * 0.05
        shift = int(round(amp * (np.sin(y * 0.42 + ph(t, 3)) + 0.35 * np.sin(y * 1.1 - ph(t, 5, 1.0)))))
        row = np.roll(src[top - d], shift, axis=0)
        k = 0.62 - 0.30 * f
        dark_band = (np.sin(y * 1.21 + ph(t, 2)) > 0.62) * 0.18
        base = MIDW * (1 - f) + DEEP * f
        out = row * (k - dark_band) + base * (1 - k + dark_band)
        # sparse ripple dashes: each (row, cell) twinkles on its own phase
        cell = 7 + int(f * 5)
        off = int(hash2(y, 3.0) * cell)
        seg = (xs + off) // cell
        pos = (xs + off) % cell
        hsh = hash2(seg, y)
        on = np.sin(ph(t, 2 + (seg % 3), hsh * TAU)) > 0.72
        length = 1 + (hsh * 3).astype(int) + int(f * 2)
        dash = on & (pos < length) & (hash2(seg * 1.7, y * 0.3) > 0.7)
        lum = np.clip(1 - f * 0.6 - np.abs(xs - SUN[0]) / 700, 0, 1)
        gi = np.clip((lum * 2.4).astype(int), 0, 2)
        out[dash] = out[dash] * 0.3 + np.array(GLINT)[gi[dash]] * 0.7
        # sun glitter column: denser near its axis, broken into horizontal dashes
        gw = 3 + d * 0.5
        dist = np.abs(xs - SUN[0] - 2 * np.sin(y * 0.4)) / gw
        gp = np.sin(ph(t, 3, hash2(seg, y + 50) * TAU))
        spark = (dist < 1) & (gp > 0.2 + 0.7 * dist) & (pos < 2 + (1 - dist) * 3) & (y % 2 == 0)
        out[spark] = GLINT[3]
        out[spark & (gp > 0.9) & (dist < 0.4)] = GLINT[4]
        img[y] = out
    # elongated wobbling streaks under bright lights near the bank
    for lx, ly, s in lights:
        if ly < 196 or ly > top:
            continue
        ry0 = int(2 * top - ly)
        for y in range(ry0 - 1, min(H, ry0 + 4 + int(3 * s))):
            if (y + step(t, 4, 3) + int(lx)) % 3 == 0:
                continue
            wx = int(round(lx + np.sin(y * 1.1 + ph(t, 4, lx)) * (0.6 + (y - top) * 0.04)))
            if 0 <= wx < W - 1:
                c = GLINT[3] if y < ry0 + 2 else GLINT[2]
                img[y, wx:wx + 2] = img[y, wx:wx + 2] * 0.5 + c * 0.5
