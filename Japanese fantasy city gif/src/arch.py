"""Japanese architecture primitives: curved tiled roofs, plaster walls, stone bases, torii."""
import numpy as np
from common import *

ROOF_SLATE = dict(body=('#24262c', '#2e3136', '#3a3d40'), eave='#121014', rim='#e89656', lit='#5e5650')
ROOF_COPPER = dict(body=('#1c3632', '#27483f', '#35604f'), eave='#0f1a18', rim='#f2b26e', lit='#6a9a7c')
ROOF_BROWN = dict(body=('#2a2024', '#35282a', '#443432'), eave='#140e10', rim='#e0864e', lit='#6a4e44')


def roof(L, cx, yt, yb, wt, wb, pal=ROOF_SLATE, curl=2, lit_right=True, ridge=True):
    """Concave hipped roof with upturned eave tips, vertical tile rows and sunlit rim."""
    x0, x1 = int(round(cx - wb / 2)), int(round(cx + wb / 2))
    half_t, half_b = wt / 2, wb / 2
    for x in range(x0, x1 + 1):
        dx = abs(x + 0.5 - cx)
        if dx <= half_t:
            top = yt
        else:
            f = min((dx - half_t) / max(half_b - half_t, 1), 1)
            top = yt + (yb - yt) * f ** 0.65
        e = min(dx / half_b, 1)
        bot = yb - curl * e ** 5
        top = min(top, bot - 1)
        ti, bi = int(round(top)), int(round(bot))
        for y in range(ti, bi + 1):
            if y == bi:
                c = pal['eave']
            elif y == ti:
                c = pal['rim'] if (x > cx) == lit_right or dx <= half_t else pal['body'][2]
            else:
                c = pal['body'][1] if (x - x0) % 2 else pal['body'][0]
                if (x > cx + half_b * 0.55) == lit_right and (x > cx) == lit_right and y < bi - 1:
                    c = pal['body'][2] if (x - x0) % 2 else pal['body'][1]
            L.px(x, y, c)
        if (dx > half_b - 1.2) and (x > cx) == lit_right:
            L.px(x, bi - 1, pal['rim'])          # glint on the upturned tip
    if ridge and wt > 3:
        L.rect(cx - wt / 2, yt - 1, cx + wt / 2 - 1, yt - 1, pal['eave'])
        L.rect(cx, yt - 1, cx + wt / 2 - 1, yt - 1, pal['rim'])


def gable(L, cx, yb, w, h, face='#b89c98', trim='#1a1416', rim='#f2b070', kara=False):
    """Triangular chidori-hafu or bell-curved kara-hafu dormer gable."""
    for x in range(int(cx - w / 2), int(cx + w / 2) + 1):
        dx = min(abs(x + 0.5 - cx) / (w / 2), 1.0)
        if kara:
            top = yb - h * (np.cos(dx * np.pi / 2) ** 0.8)
        else:
            top = yb - h * (1 - dx)
        ti = int(round(top))
        for y in range(ti, int(yb) + 1):
            c = face
            if y == ti:
                c = rim if x >= cx else trim
            elif y == ti + 1:
                c = trim
            L.px(x, y, c)


WALL = dict(face='#bca2a0', shade='#9c8488', lit='#ecd0bc', dark='#2a2024', win='#ffcf6c', winf='#3a2a26')


def wall(L, x0, y0, x1, y1, pal=WALL, windows=0, lit_right=True, sill=True, seed=0):
    L.rect(x0, y0, x1, y1, pal['face'])
    L.rect(x0, y0, x0, y1, pal['shade'])
    if lit_right:
        L.rect(x1, y0, x1, y1, pal['lit'])
    if sill:
        L.rect(x0, y1 - 1, x1, y1, pal['dark'])        # black wooden shitami panelling
    lights = []
    if windows:
        r = rng(seed)
        span = (x1 - x0 - 2) / windows
        for i in range(windows):
            wx = int(x0 + 2 + i * span + span / 2 - 1)
            wy = int(y0 + max(1, (y1 - y0 - 3) // 2 - 1))
            lit = r.random() < 0.75
            L.rect(wx - 1, wy - 1, wx + 2, wy + 2, pal['winf'])
            L.rect(wx, wy, wx + 1, wy + 1, pal['win'] if lit else '#4a3432')
            if lit:
                lights.append((wx + 0.5, wy + 0.5))
    return lights


def ishigaki(L, cx, yt, yb, wt, wb, seed=1):
    """Castle stone base with concave (fan) slopes and irregular stones."""
    r = rng(seed)
    stones = ['#4a3c40', '#5a4a4a', '#6c5854', '#7e6860']
    for y in range(int(yt), int(yb) + 1):
        f = (y - yt) / max(yb - yt, 1)
        hw = wt / 2 + (wb - wt) / 2 * f ** 2.2
        for x in range(int(cx - hw), int(cx + hw) + 1):
            u = (x - (cx - hw)) / (2 * hw)
            row = int((y - yt) // 2)
            joint = (x + row * 3 + (row % 2) * 2) % 5 == 0 or (y - int(yt)) % 2 == 1 and r.random() < 0.3
            k = min(3, int(u * 3.2 + r.random() * 0.8))
            L.px(x, y, '#2a2024' if joint else stones[k])
        L.px(cx + hw, y, '#e8a060')


def torii(L, cx, yb, h, w, col=('#5e1612', '#8c2218', '#c0341f', '#ff9a5c'), top='#1a1012', inner_rim=False):
    """Myojin torii: curved kasagi with black shimaki, nuki tie beam, gakuzuka strut."""
    dark, mid, light, rim = col
    pw = max(1, int(round(w * 0.08)))
    lx, rx = int(round(cx - w * 0.36)), int(round(cx + w * 0.36))
    ky = yb - h
    for px_ in (lx, rx):
        L.rect(px_ - pw // 2, ky + 2, px_ - pw // 2 + pw - 1, yb, mid)
        L.rect(px_ - pw // 2, ky + 2, px_ - pw // 2, yb, dark)
        if inner_rim:
            edge = px_ + (pw - 1 - pw // 2) if px_ < cx else px_ - pw // 2
            L.rect(edge, ky + 2, edge, yb, rim)
    # kasagi + shimaki with upswept ends
    kw = w * 0.62
    for x in range(int(cx - kw), int(cx + kw) + 1):
        e = abs(x - cx) / kw
        lift = int(round(max(h * 0.06, 1.5) * e ** 3))
        L.rect(x, ky - lift, x, ky - lift + max(1, h // 16), top)
        L.px(x, ky - lift + max(1, h // 16) + 1, mid if e < 0.95 else top)
    nuki_y = ky + max(3, int(h * 0.22))
    L.rect(cx - w * 0.47, nuki_y, cx + w * 0.47, nuki_y + max(0, h // 22), mid)
    L.rect(cx - w * 0.47, nuki_y + max(0, h // 22), cx + w * 0.47, nuki_y + max(0, h // 22), dark)
    L.rect(cx - max(0, pw // 2), ky + 2, cx + max(0, (pw - 1) // 2), nuki_y, mid)
