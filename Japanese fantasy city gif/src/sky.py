"""Sky, sun, crescent moon, stars, distant ranges and the great mountain."""
import numpy as np
from common import *

SKY = ['#140810', '#1f0b16', '#2d0e1e', '#3e1225', '#541729', '#6d1c2b', '#88242d', '#a42e2d',
       '#be3c2e', '#d4512f', '#e46a34', '#ee863c', '#f4a348', '#f8bf5e', '#fbd67f', '#fde6a6', '#fef2cc']
SKY_RGB = [rgb(c) for c in SKY]
SUN = (422, 156, 16)
MOON = (446, 30, 7)


def sky_value(x, y):
    sx, sy, _ = SUN
    base = np.clip(y / 205.0, 0, 1) ** 1.15 * 0.93
    d = np.sqrt((x - sx) ** 2 + ((y - sy) * 1.9) ** 2)
    return np.clip(base + 0.20 * np.exp(-d / 60.0) + 0.06 * np.exp(-d / 160.0), 0, 1)


def sky_layer():
    v = sky_value(XX.astype(np.float32), YY.astype(np.float32))
    return ramp_color(SKY_RGB, v, XX, YY, sharp=2.2)


def ridge(x, seed, amp, base, octaves=((0.013, 1.0), (0.031, 0.5), (0.07, 0.25), (0.16, 0.12))):
    r = rng(seed)
    y = np.full_like(x, base, dtype=np.float32)
    for f, a in octaves:
        y += amp * a * np.sin(x * f * TAU / 6.0 + r.uniform(0, TAU))
    return y


def fill_cols(img, top, bottom, colfn):
    """Fill each column from top[x] down to bottom with colfn(x, y) -> rgb array."""
    for x in range(W):
        t = int(np.ceil(top[x]))
        if t < bottom:
            ys = np.arange(max(t, 0), bottom)
            img[ys, x] = colfn(np.full_like(ys, x), ys, t)


def sun_moon(img):
    sx, sy, r = SUN
    add_glow(img, sx, sy, 46, rgb('#ffcf80'), k=0.55, bands=(0.30, 0.18, 0.10, 0.05))
    d = np.sqrt((XX - sx) ** 2 + (YY - sy) ** 2)
    disc = d <= r + 0.3
    img[disc] = rgb('#ffe9a8')
    img[disc & (d <= r - 2)] = rgb('#fff4cc')
    img[disc & (d <= r - 6) & (YY < sy + 4)] = rgb('#fffbea')
    img[disc & (d > r - 1.2) & (YY > sy + 4)] = rgb('#ffd27c')
    # thin evening cloud streaks cutting across the lower sun
    for yy, x0, x1, c, hi in ((sy + 6, sx - 30, sx + 22, '#c9553a', '#ffd990'),
                              (sy + 10, sx - 14, sx + 34, '#b8452f', '#ffc26c'),
                              (sy - 3, sx + 5, sx + 30, '#e07a45', '#fff1c0')):
        for x in range(x0, x1):
            taper = min(x - x0, x1 - x) / 6.0
            if taper < 1 and BAYER[yy, x] > taper:
                continue
            img[yy, x] = rgb(c)
            if abs(x - sx) < r + 4:
                img[yy - 1, x] = rgb(hi)
    mx, my, mr = MOON
    add_glow(img, mx, my, 16, rgb('#f7c890'), k=0.35, bands=(0.35, 0.18, 0.08))
    dm = np.sqrt((XX - mx) ** 2 + (YY - my) ** 2)
    dk = np.sqrt((XX - mx - 2.6) ** 2 + (YY - my + 3.2) ** 2)
    moon = dm <= mr
    img[moon] = img[moon] * 0.72 + rgb('#4a2030') * 0.28     # earthshine on the dark limb
    lit = moon & (dk > mr - 0.4)
    img[lit] = rgb('#fbe3a8')
    img[lit & (dk > mr + 1.6)] = rgb('#fff6d6')


STAR_R = rng(7)
STARS = [(int(x), int(y), STAR_R.uniform(0.3, 1), int(STAR_R.integers(1, 4)), STAR_R.uniform(0, TAU))
         for x, y in zip(STAR_R.uniform(2, W - 2, 150), STAR_R.uniform(1, 78, 150) ** 1.0)]
STAR_COL = [rgb(c) for c in ('#4a1a2e', '#7a3444', '#b8606a', '#f0b8a0', '#fff0d8')]


def stars(img, t):
    for x, y, b, k, p in STARS:
        v = sky_value(np.float32(x), np.float32(y))
        if v > 0.33 or (x - MOON[0]) ** 2 + (y - MOON[1]) ** 2 < 150:
            continue
        lum = b * (0.65 + 0.35 * np.sin(ph(t, k, p))) * (1 - v / 0.36)
        i = int(np.clip(lum * 5, 0, 4))
        if i == 0:
            continue
        img[y, x] = np.maximum(img[y, x], STAR_COL[i])
        if b > 0.93 and lum > 0.72:          # rare bright stars flare into a cross
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                img[y + dy, x + dx] = np.maximum(img[y + dy, x + dx], STAR_COL[2])


FUJI = (168, 84)


def fuji_top(x):
    px, py = FUJI
    base, hw, k = 186, 175.0, 0.85
    d = np.clip(np.abs(x - px) / hw, 0, 1)
    d = np.maximum(d - 4 / hw, 0) * hw / (hw - 4)      # flat crater rim
    e = 1 - d * (1 + k) / (d + k)
    y = base - (base - py) * e
    y += (np.abs(x - px) < 4) * (np.sin(x * 2.1) > 0.3)   # notched summit
    return y


def mountains(img):
    x = np.arange(W, dtype=np.float32)
    far = ridge(x, 11, 7, 168)
    fill_cols(img, far, H, lambda xs, ys, t: np.where(
        (ys - t < 1)[:, None], rgb('#f4b068'), rgb('#e39458')))
    mid = ridge(x, 12, 9, 179, ((0.02, 1), (0.05, .5), (0.11, .25), (0.23, .12)))
    fill_cols(img, mid, H, lambda xs, ys, t: np.where(
        (ys - t < 1)[:, None], rgb('#e8905a'), rgb('#c2684a')))
    px, py = FUJI
    top = fuji_top(x)
    body = [rgb(c) for c in ('#5e2e3c', '#723844', '#88444a', '#a05650', '#bc6c58')]
    snow = [rgb(c) for c in ('#b98890', '#d0a0a0', '#e6bcae', '#f6d8bc', '#fff0d4')]
    for xi in range(W):
        t = int(np.ceil(top[xi]))
        if t >= 186:
            continue
        for y in range(t, 190):
            dx, dy = xi - px, y - py
            a = np.arctan2(dx, dy + 6)
            streak = (a * 23 + np.sin(y * 0.13) * 0.8) % 1.0
            # light comes from the right (sun side); left flank sits in shade
            side = 0.5 + 0.5 * np.tanh(dx / 30.0)
            shade = 0.18 + 0.55 * side - 0.10 * (streak < 0.22) + 0.12 * (0.55 < streak < 0.62)
            snowline = py + 38 + 6 * np.sin(xi * 0.19) + 16 * max(0, np.cos(a * 23 * TAU / 2)) ** 3
            haze = np.clip((y - 132) / 60.0, 0, 1)
            if y < snowline:
                c = ramp_color(snow, np.clip(shade + 0.15, 0, 1), xi, y, 2.5)
            else:
                c = ramp_color(body, shade, xi, y, 2.5)
            c = c * (1 - haze * 0.5) + rgb('#e8945c') * haze * 0.5
            if y - t < 1 and dx > 2:
                c = rgb('#fff2c8') if y < snowline else rgb('#f6b070')   # sunlit rim
            img[y, xi] = c
    return img


def static_back():
    img = sky_layer()
    sun_moon(img)
    mountains(img)
    return img
