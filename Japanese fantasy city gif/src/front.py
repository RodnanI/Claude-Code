"""Waterfront: stone embankment, canal mouth, vermilion drum bridge, sakura, willow, great water torii."""
import numpy as np
from common import *
from arch import *

BR = dict(dark='#4a100e', mid='#7a1e18', light='#a8301f', rim='#ff9a5c', wood='#2a1414')
BX0, BX1, BCX = 158, 244, 201
SAKURA = [rgb(c) for c in ('#2e1020', '#4a1a2e', '#6e2640', '#943452', '#bc4e68', '#dc7a8c', '#f4aab4', '#ffdcdc')]


def deck_y(x):
    u = np.clip((x - BCX) / ((BX1 - BX0) / 2), -1, 1)
    return 220 - 19 * (1 - u * u) ** 0.75


def arch_y(x):
    u = (x - BCX) / 34.0
    return 226 - 17 * np.sqrt(max(0.0, 1 - u * u))


def embankment(L):
    r = rng(12)
    for x in range(0, W):
        if BX0 + 8 < x < BX1 - 8:
            continue
        for y in range(219, 227):
            row = (y - 219) // 2
            joint = (x + row * 5 + (row % 2) * 3) % 7 == 0 or (y - 219) % 2 == 1 and r.random() < 0.25
            c = '#221a1e' if joint else ['#3a2e32', '#463638', '#524042'][int(r.integers(0, 3))]
            L.px(x, y, c)
        L.px(x, 219, '#8a6a58' if (x // 3) % 2 else '#a07a60')
    for x0, s in ((BX0 + 8, 1), (BX1 - 8, -1)):          # canal walls receding under the bridge
        for k in range(10):
            L.rect(x0 + s * k, 219 + k // 3, x0 + s * k, 226, '#2e2428' if k % 2 else '#3a2e32')


def canal(L):
    """View under the arch: canal water receding to lit houses."""
    for x in range(BX0 + 9, BX1 - 8):
        top = int(arch_y(x))
        for y in range(top, 226):
            f = (y - 206) / 20
            L.px(x, y, '#1a1216' if y < 213 else ('#2a1c20' if (y + x // 4) % 3 else '#4a2a24'))
    for i, x in enumerate(range(BCX - 18, BCX + 20, 9)):  # far canal-side house glow
        L.rect(x, 208, x + 4, 211, '#c87838')
        L.rect(x + 1, 209, x + 3, 210, '#ffcc66')
        L.rect(x, 212, x + 4, 212, '#6a3a24')


def bridge(L):
    lights = []
    for x in range(BX0, BX1 + 1):
        dy = int(round(deck_y(x)))
        ay = arch_y(x) if abs(x - BCX) < 34 else 227
        bot = int(min(ay, 226))
        for y in range(dy, bot):
            if y <= dy + 1:
                c = BR['light'] if y == dy else BR['mid']
            elif y == dy + 2:
                c = BR['dark']
            else:
                on_arch = abs(x - BCX) < 34 and y >= bot - 2
                if (x - BX0) % 5 and not on_arch and not (abs(x - BCX) >= 34 and y > dy + 3):
                    continue                                        # open truss: town shows through
                c = BR['mid'] if on_arch and y == bot - 2 else BR['dark'] if on_arch else BR['wood']
            L.px(x, y, c)
        L.px(x, dy, BR['rim'] if x > BCX - 6 else BR['light'])
        # railing
        L.px(x, dy - 4, BR['light'])
        L.px(x, dy - 5, BR['rim'] if x > BCX else BR['mid'])
        if (x - BX0) % 6 == 0:
            L.rect(x, dy - 4, x, dy - 1, BR['mid'])
        if (x - BX0) % 5 == 0 and abs(x - BCX) < 34:
            L.rect(x, int(ay) - 1, x, 226, BR['dark'])             # pilings in the water
    for x in (BX0 + 1, BX0 + 31, BX1 - 31, BX1 - 1):              # giboshi on key posts
        dy = int(round(deck_y(x)))
        L.rect(x - 1, dy - 7, x + 1, dy - 5, '#b88a38')
        L.px(x, dy - 8, '#e8c060')
        L.px(x + 1, dy - 7, '#ffe8a0')
    return lights


def people(L):
    """Tiny townsfolk: a figure with a red wagasa on the crest, another with a lantern."""
    y = int(round(deck_y(BCX + 4)))
    L.rect(BCX + 3, y - 4, BCX + 4, y - 1, '#2a1a2a')
    L.px(BCX + 3, y - 5, '#e8c0a0')
    L.rect(BCX, y - 8, BCX + 7, y - 7, '#c8302a')                 # umbrella canopy
    L.rect(BCX + 1, y - 9, BCX + 6, y - 9, '#e84a3a')
    L.rect(BCX + 2, y - 9, BCX + 4, y - 9, '#ff9a6a')
    L.px(BCX + 7, y - 6, '#f0e0d0')
    x2 = BCX - 20
    y2 = int(round(deck_y(x2)))
    L.rect(x2, y2 - 4, x2 + 1, y2 - 1, '#3a2a3e')
    L.rect(x2, y2 - 5, x2 + 1, y2 - 5, '#1a1016')
    L.px(x2 + 1, y2 - 6, '#e8c0a0')
    return [(x2 + 3, y2 - 3)]


def stone_lantern(L, x, base):
    L.rect(x - 2, base - 1, x + 2, base, '#4a3c40')
    L.rect(x - 1, base - 4, x + 1, base - 2, '#5a4a4c')
    L.rect(x - 2, base - 7, x + 2, base - 5, '#3a2e32')
    L.rect(x - 1, base - 6, x + 1, base - 6, '#ffd070')
    L.rect(x - 3, base - 8, x + 3, base - 8, '#5a4a4c')
    L.px(x, base - 9, '#6a5a58')
    L.px(x + 3, base - 8, '#c88a60')
    return (x, base - 6)


def sakura(L):
    from scipy.ndimage import gaussian_filter, binary_erosion
    r = rng(21)
    trunk = [(30, 222), (32, 212), (29, 202), (33, 190), (38, 178), (44, 168)]
    for i in range(len(trunk) - 1):
        L.line([trunk[i], trunk[i + 1]], '#241214', int(round(5 - i * 0.8)))
    for pts in ([(33, 196), (48, 186), (62, 182), (78, 186), (88, 184)], [(34, 192), (18, 180), (4, 174)],
                [(38, 180), (30, 166), (22, 156)], [(44, 170), (58, 160), (66, 150)]):
        L.line(pts, '#241214', 2)
    L.line([(36, 206), (37, 188)], '#5a3432', 1)
    L.line([(49, 186), (62, 183)], '#6a3a34', 1)
    clusters = [(8, 160, 16, 11), (30, 150, 16, 12), (56, 152, 15, 11), (76, 170, 14, 9), (-6, 182, 14, 12),
                (22, 176, 14, 10), (50, 176, 12, 9), (88, 186, 10, 7), (4, 198, 10, 8), (64, 192, 10, 7)]
    mask = np.zeros((H, W), bool)
    for cx, cy, rx, ry in clusters:
        for _ in range(26):
            bx, by = cx + r.normal(0, rx * 0.55), cy + r.normal(0, ry * 0.5)
            br = r.uniform(2.2, 5.5)
            mask |= (XX - bx) ** 2 + ((YY - by) * 1.2) ** 2 <= br * br
    edge = mask & ~binary_erosion(mask)
    mask &= ~(edge & (r.random((H, W)) < 0.35))                    # ragged, fluffy rim
    halo = binary_erosion(~mask, iterations=1) == 0
    mask |= halo & ~mask & (r.random((H, W)) < 0.12) & (YY > 140)
    holes = mask & (r.random((H, W)) < 0.007)
    for y, x in zip(*np.nonzero(holes)):
        mask[y, x:x + 1 + (x % 2)] = False                               # sky and twigs peek through
    hgt = gaussian_filter(mask.astype(np.float32), 2.6)
    gy, gx = np.gradient(hgt)
    lam = np.clip((gx * -0.55 + gy * 0.85) * -6, -1, 1)             # light from upper right
    occl = gaussian_filter(mask.astype(np.float32), 6)
    v = 0.40 + 0.34 * lam + 0.10 * (1 - occl) - 0.12 * np.clip((YY - 160) / 50, 0, 1)
    v += (r.random((H, W)) - 0.5) * 0.16
    ys, xs = np.nonzero(mask)
    a = L.arr()
    a[ys, xs, :3] = ramp_color(SAKURA, np.clip(v[ys, xs], 0, 1), xs, ys, 2.0)
    a[ys, xs, 3] = 255
    rim = mask & ~binary_erosion(mask) & (lam > 0.15)
    ry_, rx_ = np.nonzero(rim)
    a[ry_, rx_, :3] = SAKURA[7] * 0.6 + SAKURA[6] * 0.4
    L.set_arr(a)


def willow(L):
    L.line([(258, 221), (259, 210), (262, 200), (266, 193)], '#2a1c16', 3)
    L.line([(261, 204), (252, 196)], '#2a1c16', 2)
    L.ell(247, 188, 278, 199, '#1e2e1e')
    L.ell(250, 187, 276, 195, '#2e4428')
    L.rect(262, 187, 274, 187, '#a8a050')


def build():
    L = Layer()
    embankment(L)
    canal(L)
    lights = bridge(L)
    lights += people(L)
    for x in (122, 300, 362):
        lights.append(stone_lantern(L, x, 219))
    willow(L)
    sakura(L)
    return L.arr(), lights


def giant_torii():
    """Itsukushima-style torii standing in the water, backlit with a sunlit inner rim."""
    L = Layer()
    cx, base, top = 422, 262, 108
    red, mid, lit, rim, blk = '#4e100c', '#6a1812', '#8c2418', '#ff9a58', '#140a0c'
    for px_, inner in ((386, 1), (458, -1)):
        L.rect(px_ - 4, top + 4, px_ + 4, base, mid)
        L.rect(px_ - 4, top + 4, px_ - 3, base, red)
        L.rect(px_ + 3, top + 4, px_ + 4, base, lit)
        edge = px_ + 4 if inner > 0 else px_ - 4
        L.rect(edge, top + 12, edge, base, rim)                       # inner edge glows from the sun
        L.rect(edge - inner, top + 30, edge - inner, 200, lit)
        for sx in (px_ - 12, px_ + 12):                               # sode-hashira support legs
            L.rect(sx - 2, 188, sx + 2, base, red)
            L.rect(sx + 1, 188, sx + 2, base, mid)
            L.rect(sx - 2, 186, sx + 2, 187, blk)
        L.rect(px_ - 15, 196, px_ + 15, 198, mid)                     # tie beams to supports
        L.rect(px_ - 15, 196, px_ + 15, 196, lit)
        L.rect(px_ - 15, 238, px_ + 15, 240, red)
    for x in range(cx - 64, cx + 65):                                  # kasagi + shimaki
        e = abs(x - cx) / 64
        lift = int(round(7 * e ** 3.2))
        L.rect(x, top - 4 - lift, x, top - 1 - lift, blk)
        L.rect(x, top - lift, x, top + 3 - lift, mid)
        L.px(x, top + 3 - lift, red)
        L.px(x, top - 5 - lift, '#3a2226' if x < cx else '#e0885a')
    ny = 132
    L.rect(cx - 54, ny, cx + 54, ny + 4, mid)
    L.rect(cx - 54, ny + 4, cx + 54, ny + 4, red)
    L.rect(cx - 30, ny + 5, cx + 30, ny + 5, rim)                     # underside catches the sun
    L.rect(cx - 5, top + 4, cx + 5, ny - 1, blk)                     # gakuzuka plaque
    L.rect(cx - 4, top + 6, cx + 4, ny - 3, '#2a1a14')
    L.rect(cx - 3, top + 7, cx + 3, ny - 4, '#8a6a3a')
    for k in range(top + 9, ny - 5, 3):
        L.rect(cx - 1, k, cx + 1, k, '#f0d080')
    return L.arr()
