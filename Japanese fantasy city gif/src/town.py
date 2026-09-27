"""Forested hills, five-storey pagoda, hilltop shrine with senbon torii, and three rows of town."""
import numpy as np
from common import *
from arch import *

FOREST = ['#120e14', '#16201c', '#1c2a22', '#253628', '#34462e']
ROOF_FAR = dict(body=('#6a383a', '#733e3e', '#7e4642'), eave='#4e2a2e', rim='#f2a462', lit='#9a5a48')
ROOF_MID = dict(body=('#3a2a2e', '#443234', '#523c3a'), eave='#221418', rim='#ec9a58', lit='#7a5448')
BELLS = []
NOREN = ['#b8322a', '#e8dcc8', '#27474e', '#d8a040', '#6a2a4a']


def left_hill(x):
    return 181 + np.clip(np.abs(x - 84) - 30, 0, None) ** 1.5 * 0.035


def right_hill(x):
    return 178 + np.clip(np.abs(x - 438) - 12, 0, None) ** 1.5 * 0.048


def hill(L, prof, x0, x1, seed):
    r = rng(seed)
    xs = np.arange(x0, x1)
    top = prof(xs.astype(float))
    for x, t in zip(xs, top):
        for y in range(int(t), 222):
            L.px(x, y, FOREST[int(r.integers(0, 2))])
    for i in range(int((x1 - x0) * 0.9)):              # tree crowns along the ridge and slopes
        x = r.uniform(x0, x1)
        t = prof(np.array([x]))[0]
        y = min(t - 1 + r.uniform(0, 30) ** 1.3 * 0.4, 216)
        rad = r.uniform(2, 4.5)
        L.ell(x - rad, y - rad, x + rad, y + rad * 0.8, FOREST[2])
        L.ell(x - rad + 1, y - rad, x + rad - 1, y + rad * 0.3, FOREST[3])
        L.px(x + rad * 0.5, y - rad + 1, FOREST[4])
        L.px(x + rad * 0.2, y - rad, '#c89a52' if y < t + 6 else FOREST[4])


def pagoda(L, cx, base):
    lights = []
    L.rect(cx - 13, base - 2, cx + 13, base, '#4a3c40')
    L.rect(cx - 13, base - 2, cx + 13, base - 2, '#8a6a5a')
    y = base - 2
    for i in range(5):
        bw = 20 - i * 2.2
        L.rect(cx - bw / 2, y - 6, cx + bw / 2, y, '#6a1c16')
        L.rect(cx + bw / 2 - 1, y - 6, cx + bw / 2, y, '#b8442a')
        L.rect(cx - bw / 2, y - 6, cx - bw / 2, y, '#3a0e0c')
        for k in range(int(cx - bw / 2) + 2, int(cx + bw / 2) - 1, 3):  # lattice panels
            L.rect(k, y - 5, k, y - 1, '#4a1410')
        if i == 0:
            L.rect(cx - 2, y - 5, cx + 1, y, '#ffc860')
            lights.append((cx, y - 3))
        roof(L, cx, y - 11, y - 6, bw * 0.55, bw + 20 - i * 1.2, ROOF_SLATE, curl=3)
        for s in (-1, 1):                               # wind bells under the eave tips
            L.px(cx + s * (bw + 18 - i * 1.2) / 2, y - 5, '#d8a040')
            BELLS.append((cx + s * (bw + 18 - i * 1.2) / 2, y - 5))
        y -= 11
    L.rect(cx, y - 22, cx, y, '#8a6a3a')
    for k in range(9):                                   # sorin rings
        L.rect(cx - 1, y - 3 - k * 2, cx + 1, y - 3 - k * 2, '#c8963c' if k % 2 else '#e8b850')
    L.rect(cx - 1, y - 23, cx + 1, y - 21, '#f0c858')
    L.px(cx, y - 25, '#fff0a0')
    L.px(cx + 1, y - 22, '#fff6c0')
    return lights


def shrine(L, cx, base):
    L.rect(cx - 10, base - 7, cx + 10, base, '#6a1c16')
    L.rect(cx - 8, base - 6, cx + 8, base - 1, '#ffc060')
    for k in range(int(cx) - 8, int(cx) + 9, 3):
        L.rect(k, base - 6, k, base - 1, '#8a3a1c')
    L.rect(cx + 9, base - 7, cx + 10, base, '#c04a2a')
    roof(L, cx, base - 18, base - 7, 14, 32, ROOF_COPPER, curl=3)
    gable(L, cx, base - 9, 10, 4, face='#6a1c16', kara=True)
    for s in (-1, 1):                                    # chigi crossed finials
        L.line([(cx + s * 6, base - 18), (cx + s * 8, base - 22)], '#1a1012')
    L.rect(cx - 6, base - 19, cx + 6, base - 19, '#1a1012')
    return [(cx, base - 4)]


def senbon(L, pts):
    """Tunnel of vermilion torii climbing the hill, far ones first."""
    lights = []
    for i, (x, y) in enumerate(pts):
        s = 0.8 + 0.5 * (i / len(pts))
        L.line([(x - 5 * s, y + 1), (x + 5 * s, y + 1)], '#6a5048')          # stone steps
        torii(L, x, y, 10 * s, 11 * s, col=('#4a100c', '#9a2a1a', '#c8402a', '#ff9a5c'))
        if i % 3 == 1:
            L.px(x + 6, y - 2, '#ffd070')
            lights.append((x + 6, y - 2))
    return lights


def lookout(L, x, base):
    """Hinomi-yagura fire lookout with bell."""
    for s in (-1, 1):
        L.line([(x + s * 6, base), (x + s * 3, base - 34)], '#2a1a1a')
    for k in range(base - 32, base, 3):
        f = (base - k) / 34
        L.line([(x - 6 + 3 * f, k), (x + 6 - 3 * f, k)], '#3a2424')
    L.rect(x - 5, base - 36, x + 5, base - 35, '#3a2424')
    L.rect(x - 4, base - 37, x + 4, base - 37, '#6a4a3a')
    roof(L, x, base - 43, base - 39, 2, 12, ROOF_MID, curl=1)
    L.rect(x - 4, base - 38, x + 4, base - 38, '#2a1a1a')
    L.rect(x, base - 39, x + 1, base - 37, '#c89040')      # hansho bell
    return [(x, base - 37)]


def house(L, x, base, w, h, depth, r, lanterns, lights):
    pal = [ROOF_FAR, ROOF_MID, ROOF_SLATE][depth]
    wood = [('#7a4644', '#8a524c'), ('#402624', '#4e302c'), ('#2a1a18', '#3a2420')][depth]
    plaster = ['#9a605a', '#76564c', '#6a4c42'][depth]
    rh = [2, 3, 4][depth] + int(r.integers(0, 2))
    x1 = x + w - 1
    two = h >= 12 and depth > 0
    g = int(h * 0.55) if two else h
    L.rect(x, base - h, x1, base, wood[0])
    if two:
        L.rect(x, base - h, x1, base - g, plaster)
        L.rect(x1, base - h, x1, base - g, '#c8906a' if depth == 2 else '#a07060')
    if depth == 0:
        for k in range(int(r.integers(0, 3))):
            L.px(r.integers(x + 1, x1), r.integers(base - h + 1, base - 1), '#ffd890')
    else:
        lit = r.random() < 0.55
        dx0, dx1 = x + 1, x1 - 1
        if lit:
            L.rect(dx0, base - g + 2, dx1, base - 1, '#e8983e')
            L.rect(dx0, base - g + 2, dx1, base - g + 2, '#ffd27a')
            lights.append(((dx0 + dx1) / 2, base - g / 2, 1 + depth))
        for k in range(dx0, dx1 + 1, 2):                    # koshi lattice
            L.rect(k, base - g + 2, k, base - 1, wood[1] if not lit else '#5a2a1c')
        if depth == 2 and r.random() < 0.6:                 # noren curtain
            nc = NOREN[int(r.integers(0, len(NOREN)))]
            nx = int(r.integers(dx0, max(dx0 + 1, dx1 - 5)))
            L.rect(nx, base - g + 2, nx + 5, base - g + 4, nc)
            L.rect(nx + 2, base - g + 2, nx + 2, base - g + 4, '#1a1012')
        if two:
            L.rect(x - 1, base - g, x1 + 1, base - g + 1, pal['body'][0])
            L.rect(x - 1, base - g, x1 + 1, base - g, pal['rim'])
            if r.random() < 0.65:                             # mushiko window upstairs
                wy = base - h + 2
                L.rect(x + 2, wy, x1 - 2, wy + 2, '#ffc860' if r.random() < 0.6 else '#3a2a2a')
                for k in range(x + 3, x1 - 1, 2):
                    L.rect(k, wy, k, wy + 2, plaster)
                lights.append(((x + x1) / 2, wy + 1, 1))
        if depth == 2 and r.random() < 0.55:
            lanterns.append((x1 - 1, base - g + 1, 'red' if r.random() < 0.7 else 'white'))
        if depth == 2 and r.random() < 0.3:                  # vertical kanban sign
            L.rect(x + 1, base - h - 3, x + 3, base - g - 1, '#e8d8b8')
            for k in range(base - h - 2, base - g - 1, 2):
                L.px(x + 2, k, '#2a1a1a')
    roof(L, x + w / 2, base - h - rh, base - h, max(w - 6, 2), w + 3, pal, curl=1 + depth // 2)


def kura(L, x, base, w, h, depth):
    """Storehouse: pale plaster, namako tile-grid base, iron-shuttered window, heavy roof."""
    x1 = x + w - 1
    wallc = ['#b88a7c', '#9a7a74', '#8a6e68'][depth]
    L.rect(x, base - h, x1, base, wallc)
    L.rect(x1, base - h, x1, base, '#e8c0a0')
    L.rect(x, base - h, x, base, '#6a5250')
    g = max(2, h // 3)
    for yy in range(base - g, base + 1):
        for xx in range(x, x1 + 1):
            L.px(xx, yy, '#8a7a78' if (xx + yy) % 3 == 0 or (xx - yy) % 3 == 0 else '#1e1618')
    L.rect(x + w // 2 - 1, base - h + 2, x + w // 2 + 1, base - h + 4, '#2a2024')
    L.px(x + w // 2 + 1, base - h + 2, '#6a5a58')
    pal = [ROOF_FAR, ROOF_MID, ROOF_SLATE][depth]
    roof(L, x + w / 2, base - h - 4, base - h, max(w - 4, 2), w + 3, pal, curl=1)


def small_tree(L, x, base, r):
    kind = r.random()
    if kind < 0.5:                                          # pine
        L.line([(x, base), (x + 1, base - 6)], '#2a1818')
        for k, (dx, dy, rw) in enumerate(((1, -7, 4), (-2, -4, 3), (3, -3, 3))):
            L.ell(x + dx - rw, base + dy - 1.5, x + dx + rw, base + dy + 1, '#1a2c26')
            L.rect(x + dx - rw + 1, base + dy - 1, x + dx + rw - 1, base + dy - 1, '#34503a')
            L.px(x + dx + rw - 1, base + dy - 1, '#c8b060')
    else:                                                   # autumn-red maple
        L.line([(x, base), (x, base - 5)], '#2a1818')
        L.ell(x - 5, base - 12, x + 5, base - 4, '#6a1a1a')
        L.ell(x - 4, base - 12, x + 4, base - 6, '#9a2a1e')
        L.rect(x, base - 12, x + 3, base - 12, '#e86a3a')
        L.px(x + 3, base - 10, '#ff9a5a')


def row(L, x0, x1, base, depth, seed, skip=(), lanterns=None, lights=None):
    r = rng(seed)
    x = x0
    while x < x1:
        w = int(r.integers([6, 11, 14][depth], [12, 19, 25][depth]))
        h = int(r.integers([5, 8, 12][depth], [10, 16, 22][depth]))
        pick = r.random()
        if not any(a <= x + w and x <= b for a, b in skip):
            yb = base + int(r.integers(-1, 2))
            if depth > 0 and pick < 0.12:
                small_tree(L, x + w // 2, yb, r)
            elif depth > 0 and pick < 0.27:
                kura(L, x, yb, max(8, w - 4), max(9, h - 3), depth)
            elif depth == 2 and pick < 0.38:
                house(L, x, yb, w, h + 8, depth, r, lanterns, lights)       # three-storey inn
                L.rect(x - 1, yb - h + 1, x + w, yb - h + 1, '#5a1c16')     # balcony rail
                for k in range(x, x + w, 2):
                    L.px(k, yb - h, '#8a2a1c')
                if lanterns is not None:
                    lanterns.append((x + 2, yb - h + 2, 'white'))
            else:
                house(L, x, yb, w, h, depth, r, lanterns, lights)
        x += w + int(r.integers(-2, 2))


def chimney(L, x, top, base):
    L.rect(x - 1, top, x + 1, base, '#3a2a28')
    L.rect(x + 1, top, x + 1, base, '#a06a4a')
    L.rect(x - 2, top, x + 2, top, '#241a1a')


def build():
    L = Layer()
    lanterns, lights = [], []
    row(L, 128, 350, 204, 0, 101, lanterns=lanterns, lights=lights)
    hill(L, left_hill, 0, 230, 7)
    hill(L, right_hill, 292, 480, 8)
    lights += [(x, y, 1) for x, y in pagoda(L, 86, 181)]
    path = [(436 - i * 7.0, 180 + i * 4.0) for i in range(6)]
    lights += [(x, y, 1) for x, y in senbon(L, path)]
    lights += [(x, y, 2) for x, y in shrine(L, 438, 178)]
    row(L, 100, 400, 213, 1, 102, skip=[(210, 250)], lanterns=lanterns, lights=lights)
    L.rect(203, 196, 249, 213, '#3a1a1a')                    # temple hall
    for k in range(205, 249, 4):
        L.rect(k, 199, k + 2, 212, '#e89040')
        L.rect(k + 3, 197, k + 3, 213, '#6a1c16')
    lights.append((226, 205, 3))
    roof(L, 226, 180, 197, 26, 64, ROOF_COPPER, curl=4)
    gable(L, 226, 188, 16, 6, face='#a8704a', kara=True)
    L.rect(225, 184, 227, 185, '#e8b850')
    L.px(226, 183, '#fff0a0')
    lights += [(x, y, 1) for x, y in lookout(L, 306, 213)]
    L.rect(348, 166, 348, 214, '#3a2a24')                   # koinobori pole
    chimney(L, 134, 198, 212)
    chimney(L, 282, 200, 212)
    row(L, -4, 162, 221, 2, 103, lanterns=lanterns, lights=lights)
    row(L, 246, 480, 221, 2, 104, skip=[(386, 396), (450, 460)], lanterns=lanterns, lights=lights)
    return L.arr(), lanterns, lights


_C = {}


def get():
    if not _C:
        _C['v'] = build()
    return _C['v']
