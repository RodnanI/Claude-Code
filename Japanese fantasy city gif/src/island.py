"""The floating island: rock underside, copper-roofed castle, pines, shrine, waterfalls."""
import numpy as np
from common import *
from arch import *

ICX, ITOP = 281, 66
ROCK = ['#1c0f16', '#2a161e', '#3a1e26', '#4e282c', '#663432', '#824436', '#a45a3e']


def rock_mass(L, cx, top, hw0, depth, seed, spikes=7):
    r = rng(seed)
    ph1, ph2 = r.uniform(0, 6, 2)
    rows = []
    for y in range(top, top + depth):
        f = (y - top) / depth
        hw = hw0 * (1 - f) ** 1.25 + 5 * np.sin(f * 9 + ph1) * (1 - f)
        xl = cx - hw * (1 + 0.10 * np.sin(y * 0.7 + ph1) + 0.05 * r.standard_normal())
        xr = cx + hw * (1 + 0.10 * np.sin(y * 0.53 + ph2) + 0.05 * r.standard_normal())
        rows.append((y, xl, xr))
    for i in range(spikes):
        f0 = r.uniform(0.25, 0.7)
        y0 = top + int(f0 * depth)
        _, xl, xr = rows[y0 - top]
        sx = r.uniform(min(xl + 3, (xl + xr) / 2), max(xr - 3, (xl + xr) / 2))
        ln = r.uniform(5, 14) * (1 - f0 + 0.3)
        for k in range(int(ln)):
            wk = 2.2 * (1 - k / ln)
            rows.append((y0 + k, sx - wk, sx + wk))
    for y, xl, xr in rows:
        for x in range(int(np.floor(xl)), int(np.ceil(xr)) + 1):
            u = min(max((x - xl) / max(xr - xl, 1), 0), 1)
            f = (y - top) / depth
            strata = ((y + 0.18 * (x - cx)) // 3) % 2
            v = 0.12 + 0.55 * u ** 1.6 - 0.18 * f + 0.07 * strata + 0.05 * r.standard_normal()
            k = int(np.clip(v * len(ROCK), 0, len(ROCK) - 1))
            L.px(x, y, ROCK[k])
        L.px(np.ceil(xr), y, '#e0885a' if (y - top) < depth * 0.55 else '#a85a40')
        L.px(np.floor(xl), y, '#140a10')
    for i in range(int(hw0 / 3)):                   # cracks
        x, y = r.uniform(cx - hw0 * 0.6, cx + hw0 * 0.6), r.uniform(top + 3, top + depth * 0.6)
        for k in range(int(r.uniform(3, 7))):
            L.px(x, y + k, '#140a10')
            x += r.choice([-1, 0, 0, 1])


def pine(L, x, y, s=1.0, lean=1, seed=0):
    """Cloud-pruned Japanese black pine with flat foliage pads."""
    r = rng(seed)
    pts = [(x, y)]
    for k in range(int(9 * s)):
        pts.append((pts[-1][0] + lean * r.choice([0, 1, 1]) * 0.8, pts[-1][1] - 1))
    L.line(pts, '#2a1818', 2 if s > 1.1 else 1)
    pads = [(pts[-1][0], pts[-1][1], 7 * s, 2.2 * s)]
    for i in range(int(2 + s * 2)):
        j = int(r.uniform(0.3, 0.95) * len(pts))
        pads.append((pts[j][0] + r.choice([-1, 1]) * r.uniform(2, 6) * s, pts[j][1], r.uniform(3.5, 6) * s, r.uniform(1.4, 2.2) * s))
    for px_, py_, rx, ry in pads:
        L.ell(px_ - rx, py_ - ry, px_ + rx, py_ + ry, '#1a2c26')
        L.ell(px_ - rx + 1, py_ - ry, px_ + rx - 1, py_ + ry - 1, '#26402f')
        L.rect(px_ - rx + 2, py_ - ry, px_ + rx - 2, py_ - ry, '#3e5e40')
        L.rect(px_ + rx * 0.3, py_ - ry, px_ + rx - 1, py_ - ry, '#c8b060')


def castle(L, cx):
    lights = []
    ishigaki(L, cx, 57, 65, 42, 54)
    lights += wall(L, cx - 18, 49, cx + 18, 57, windows=5, seed=1)
    roof(L, cx, 44, 48, 32, 50, ROOF_COPPER, curl=2)
    gable(L, cx - 9, 46, 11, 5)
    gable(L, cx + 9, 46, 11, 5)
    lights += wall(L, cx - 14, 38, cx + 14, 43, windows=4, seed=2)
    roof(L, cx, 33, 37, 22, 40, ROOF_COPPER, curl=2)
    gable(L, cx, 35, 12, 4, kara=True)
    lights += wall(L, cx - 10, 28, cx + 10, 32, windows=3, seed=3)
    roof(L, cx, 23, 27, 14, 32, ROOF_COPPER, curl=2)
    gable(L, cx, 25, 10, 5)
    lights += wall(L, cx - 7, 17, cx + 7, 22, windows=2, seed=4, sill=False)
    L.rect(cx - 8, 21, cx + 8, 21, '#6a1c18')                       # top-floor balcony rail
    for x in range(int(cx - 8), int(cx + 9), 2):
        L.px(x, 20, '#8c2a1c')
    roof(L, cx, 13, 16, 12, 26, ROOF_COPPER, curl=2, ridge=False)
    gable(L, cx, 13, 13, 5)
    L.rect(cx - 7, 8, cx + 7, 8, '#0f1a18')
    for sx in (cx - 7, cx + 7):                                     # golden shachihoko
        L.rect(sx - 1, 6, sx, 8, '#c8902c')
        L.px(sx, 5, '#f0c848')
        L.px(sx + (1 if sx > cx else -1), 5, '#ffe890')
        L.px(sx - 1, 7, '#fff0b0')
    return lights


def build():
    L = Layer()
    rock_mass(L, ICX, ITOP - 1, 62, 64, seed=5, spikes=9)
    r = rng(8)
    for i in range(14):                                               # hanging roots
        x = r.uniform(ICX - 50, ICX + 50)
        y = ITOP + 2 + abs(x - ICX) * 0.1 + r.uniform(0, 12)
        ln = r.uniform(4, 13)
        pts = [(x + np.sin(k * 0.8 + i) * 0.7, y + k) for k in range(int(ln))]
        L.line(pts, '#241a14')
        if r.random() < 0.6:
            L.px(pts[-1][0], pts[-1][1], '#3e5a36')
    for x in range(ICX - 63, ICX + 64):                               # grass lip
        e = abs(x - ICX) / 63
        L.rect(x, ITOP - 2, x, ITOP, '#26402c')
        L.px(x, ITOP - 2 - (1 if (x * 7) % 5 == 0 else 0), '#3e5e38' if x < ICX + 20 else '#8a9048')
        if (x * 13) % 7 == 0:
            L.px(x, ITOP + 1, '#26402c')                                # overhanging tufts
    L.rect(ICX - 45, ITOP - 3, ICX + 45, ITOP - 3, '#2e4a30')
    lights = castle(L, ICX + 2)
    pine(L, ICX - 52, ITOP - 2, 1.3, -1, seed=3)
    pine(L, ICX + 52, ITOP - 2, 1.2, 1, seed=4)
    pine(L, ICX + 30, ITOP - 3, 0.8, 1, seed=6)
    torii(L, ICX - 38, ITOP - 3, 9, 10)
    L.rect(ICX - 33, ITOP - 8, ICX - 27, ITOP - 3, '#b89c98')             # small shrine
    roof(L, ICX - 30, ITOP - 12, ITOP - 9, 4, 11, ROOF_BROWN, curl=1)
    L.rect(ICX - 31, ITOP - 6, ICX - 29, ITOP - 3, '#ffcf6c')
    lights.append((ICX - 30, ITOP - 5))
    for lx in (ICX - 22, ICX + 27):                                     # stone lanterns
        L.rect(lx - 1, ITOP - 4, lx + 1, ITOP - 4, '#6a5a58')
        L.px(lx, ITOP - 5, '#ffe08a')
        L.rect(lx - 1, ITOP - 6, lx + 1, ITOP - 6, '#4a3c40')
        L.px(lx, ITOP - 3, '#4a3c40')
        lights.append((lx, ITOP - 5))
    return L.arr(), lights


CRYSTALS = [(ICX - 20, ITOP + 18), (ICX + 12, ITOP + 26), (ICX - 4, ITOP + 40), (ICX + 30, ITOP + 12)]
FALLS = [(ICX - 60, ITOP - 1, 4, 60, 0.0), (ICX + 57, ITOP, 3, 52, 2.1)]
PEBBLES = [(214, 96, 11, 7, 41), (356, 84, 9, 6, 42), (346, 120, 7, 5, 43), (196, 44, 5, 4, 44)]
_CACHE = {}


def pebble(w, h, seed):
    L = Layer(w + 8, h + 12)
    rock_mass(L, (w + 8) // 2, 4, w / 2, h + 4, seed, spikes=1)
    L.rect(2, 2, w + 5, 3, '#26402c')
    L.rect(4, 2, w + 3, 2, '#5a7040')
    if seed % 2:
        pine(L, (w + 8) // 2, 3, 0.55, 1, seed)
    return L.arr()


def island_dy(t):
    return int(round(1.45 * np.sin(ph(t, 1, 0.6))))


def draw_island(img, t):
    if 'isl' not in _CACHE:
        _CACHE['isl'] = build()
        _CACHE['peb'] = [pebble(w, h, s) for x, y, w, h, s in PEBBLES]
    spr, lights = _CACHE['isl']
    dy = island_dy(t)
    for i, (x, y, w, h, s) in enumerate(PEBBLES):
        pdy = int(round(2.2 * np.sin(ph(t, 1, s * 1.3))))
        over(img, _CACHE['peb'][i], x - 4, y - 4 + pdy)
    falls(img, t, dy)
    over(img, spr, 0, dy)
    for i, (x, y) in enumerate(CRYSTALS):                              # pulsing spirit crystals
        y += dy
        p = 0.5 + 0.5 * np.sin(ph(t, 2, i * 1.9))
        add_glow(img, x, y + 1, 7, rgb('#50e0a0'), k=0.35 + 0.5 * p, bands=(0.35, 0.18, 0.08))
        for k, c in enumerate(('#2a6a5a', '#5ac8a0', '#c8ffe8', '#5ac8a0', '#2a6a5a')):
            img[y + k - 1, x] = rgb(c)
        img[y + 1, x - 1] = img[y + 1, x + 1] = rgb('#3a9a7a')
    lights_out = []
    for i, (x, y) in enumerate(lights):
        f = 0.75 + 0.25 * np.sin(ph(t, 3 + i % 3, i * 2.3))
        lights_out.append((x, y + dy, f))
    return lights_out


FALL_COL = [rgb(c) for c in ('#c88a80', '#eab89a', '#fad8b8', '#fff6e4')]


def falls(img, t, dy):
    for (x0, y0, w, ln, p) in FALLS:
        y0 += dy
        for y in range(y0, y0 + ln):
            f = (y - y0) / ln
            spread = int(f * 4)
            for x in range(x0 - spread // 2, x0 + w + spread // 2):
                if f > 0.35 and BAYER[y % H, x % W] < (f - 0.35) * 1.7:
                    continue                                           # dissolves into spray
                s = (y / 12.0 - 33 * t / N + (x - x0) * 0.37 + p) % 1.0
                k = 3 if s < 0.12 else 2 if s < 0.45 else 1 if s < 0.8 else 0
                img[y, x] = FALL_COL[k] * 0.85 + img[y, x] * 0.15
        for k in range(3):                                             # mist puffs at the tail
            a = ph(t, 2, k * 2.1 + p)
            add_glow(img, x0 + w // 2 + int(3 * np.sin(a)), y0 + ln - 8 + k * 3, 3 + k,
                     rgb('#f8d8c0'), k=0.3, bands=(0.35, 0.15))
