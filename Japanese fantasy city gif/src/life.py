"""Small animated life: lanterns, koinobori, smoke, willow, petals, cranes, boats, river lanterns, fireflies."""
import numpy as np
from common import *
from front import deck_y, BX0, BX1

WARM = rgb('#ff9a40')


def put(img, x, y, c):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < W and 0 <= y < H:
        img[y, x] = rgb(c) if isinstance(c, str) else c


def blend(img, x, y, c, a):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < W and 0 <= y < H:
        img[y, x] = img[y, x] * (1 - a) + (rgb(c) if isinstance(c, str) else c) * a


def chochin(img, x, y, t, kind='red', small=False, glow=True):
    """Hanging paper lantern with swing and flicker."""
    sw = int(round(0.7 * np.sin(ph(t, 2, x * 0.37))))
    f = 0.8 + 0.2 * np.sin(ph(t, 5, x * 1.3)) * np.sin(ph(t, 3, y))
    x += sw
    body, hi = (('#c8302a', '#ff8a50') if kind == 'red' else ('#e8d4b0', '#fff4d8'))
    put(img, x, y, '#1a1012')
    h = 2 if small else 3
    for k in range(1, h + 1):
        put(img, x, y + k, hi if k == 1 + h // 2 else body)
        if not small:
            put(img, x + 1, y + k, '#ffd070' if k == 2 else body)
    put(img, x, y + h + 1, '#1a1012')
    if glow:
        add_glow(img, x + 0.5, y + 2, 6 if not small else 4, WARM, k=f, bands=(0.26, 0.13, 0.05))


STRINGS = [((86, 203), (156, 203), 4, 9), ((250, 205), (336, 204), 5, 11), ((-2, 205), (60, 206), 3, 7)]


def lantern_strings(img, t):
    for (x0, y0), (x1, y1), sag, n in STRINGS:
        pts = []
        for k in range(0, int(x1 - x0) + 1):
            f = k / (x1 - x0)
            pts.append((x0 + k, y0 + (y1 - y0) * f + sag * 4 * f * (1 - f)))
        for px_, py_ in pts:
            put(img, px_, py_, '#2a1a18')
        for i in range(n):
            f = (i + 0.5) / n
            lx = x0 + (x1 - x0) * f
            ly = y0 + (y1 - y0) * f + sag * 4 * f * (1 - f)
            sw = int(round(0.6 * np.sin(ph(t, 2, i * 0.9 + x0))))
            c = ['#d8382a', '#f0dcb0', '#e86a2a'][i % 3]
            put(img, lx + sw, ly + 1, c)
            put(img, lx + sw, ly + 2, c)
            put(img, lx + sw, ly + 1, '#ffe0a0' if (i + step(t, 7, 5)) % 5 else c)
            add_glow(img, lx + sw, ly + 2, 4, WARM, k=0.85, bands=(0.22, 0.08))


KOI = [(172, 18, 5, ('#241e22', '#3e3438', '#e8d8c8')), (178, 15, 4, ('#c8302a', '#e85a3a', '#ffe0c0')),
       (183, 12, 3, ('#2a7a7a', '#48a0a0', '#e0f0e0'))]


def koinobori(img, t, px_=348, top=165):
    put(img, px_, top - 1, '#f0c040')
    put(img, px_, top - 2, '#fff0a0')
    spin = step(t, 2, 2)                                    # yaguruma pinwheel
    for k in (1, 2):
        for dx, dy in ((((k, 0), (-k, 0), (0, k), (0, -k)), ((k, k), (-k, -k), (k, -k), (-k, k)))[spin]):
            put(img, px_ + dx, top + 1 + dy, '#e8c050' if k == 1 else '#b88a30')
    for k in range(16):                                      # five-colour fukinagashi streamer
        amp = 0.18 * k
        yy = top + 5 + amp * np.sin(k * 0.55 - ph(t, 8))
        for j, c in enumerate(('#2a5a8a', '#c8302a', '#e8c040', '#f0ece0', '#2a7a4a')):
            if j < 3 or k < 14:
                put(img, px_ + 1 + k, yy + j * 0.5, c) if j % 2 == 0 else None
    for y0, ln, wd, (c0, c1, c2) in KOI:
        for k in range(ln + 2):
            amp = 0.22 * k
            cy = y0 + amp * np.sin(k * 0.45 - ph(t, 8, 1.0 + y0))
            half = wd / 2 * (1 - (k / (ln + 2)) ** 2 * 0.6)
            if k >= ln:                                          # forked tail fin
                put(img, px_ + 1 + k, cy - half, c1)
                put(img, px_ + 1 + k, cy + half, c1)
                continue
            for j in range(int(-half), int(half) + 1):
                c = c0 if (k + j) % 2 else c1
                if j == int(half):
                    c = c2
                if k == 0:
                    c = '#f0e8d8'
                put(img, px_ + 1 + k, cy + j, c)
            if k == 2:
                put(img, px_ + 3, cy - half + 1, '#ffffff')
                put(img, px_ + 4, cy - half + 1, '#101010')


SMOKE = [(134, 197), (282, 199), (58, 204)]


def smoke(img, t):
    for si, (sx, sy) in enumerate(SMOKE):
        for i in range(7):
            age = (t + i * N / 7 + si * 11) % N
            f = age / N
            x = sx + f * 22 + 2.5 * np.sin(f * 7 + i)
            y = sy - f * 34
            r = 1.2 + f * 4.5
            a = 0.30 * (1 - f) * min(1, f * 8)
            for dy in range(-int(r), int(r) + 1):
                for dx in range(-int(r), int(r) + 1):
                    if dx * dx + dy * dy <= r * r and BAYER[int(y + dy) % H, int(x + dx) % W] < 0.7:
                        blend(img, x + dx, y + dy, '#e8c0a8', a)


def willow(img, t):
    r = rng(31)
    for i in range(22):
        x0 = 246 + i * 1.45 + r.uniform(-0.5, 0.5)
        y0 = 190 + abs(x0 - 262) * 0.28 + r.uniform(0, 2)
        ln = int(r.uniform(14, 28))
        for k in range(ln):
            f = k / ln
            sway = 2.2 * f ** 1.6 * np.sin(ph(t, 2, x0 * 0.21)) + 0.6 * f * np.sin(ph(t, 5, x0))
            c = '#2e4428' if (k + i) % 3 else '#4a6a3a'
            if k % 4 == 1 and x0 > 258:
                c = '#9a9848'
            put(img, x0 + sway, y0 + k, c)


def petals(img, t):
    r = rng(77)
    cols = [rgb(c) for c in ('#b04a62', '#e88a9a', '#ffd4dc', '#fff2f2')]
    for i in range(120):
        birth = r.uniform(0, N)
        life = r.uniform(70, N)
        x0, y0 = r.uniform(-30, 95), r.uniform(128, 205)
        vx, vy = r.uniform(1.0, 2.3), r.uniform(0.18, 0.55)
        land = r.uniform(WATER_Y + 2, H - 1)
        p1, p2 = r.uniform(0, TAU, 2)
        near = r.random() < 0.12
        age = (t - birth) % N
        if age > life:
            continue
        x = x0 + vx * age * (1.5 if near else 1) + 3 * np.sin(age * 0.09 + p1)
        y = y0 + vy * age + 2.5 * np.sin(age * 0.13 + p2)
        if y > land and y > WATER_Y or x > W + 2:
            continue
        spin = np.sin(age * 0.35 + p1)
        c = cols[3] if spin > 0.6 else cols[2] if spin > -0.2 else cols[1]
        put(img, x, y, c)
        if near or abs(spin) < 0.3:
            put(img, x + 1, y + (1 if spin > 0 else 0), cols[1] if near else c)
        if near:
            put(img, x, y + 1, cols[0])


def crane(img, x, y, frame):
    body = [(-4, 0, '#d83a2a'), (-3, 0, '#1a1012'), (-2, 0, '#1a1012'), (-1, 0, '#f0e6dc'), (0, 0, '#f6eee6'),
            (1, 0, '#f0e6dc'), (2, 0, '#1a1012'), (3, 0, '#3a2a2a'), (4, 1, '#3a2a2a')]
    wings = [[(-1, -1), (0, -1), (0, -2), (1, -3), (2, -4, 1)],
             [(-1, -1), (0, -1), (1, -1), (2, -2), (3, -2, 1)],
             [(-1, 1), (0, 1), (0, 2), (1, 3, 1)],
             [(-1, 1), (0, 1), (1, 1), (2, 1, 1)]][frame]
    for dx, dy, c in body:
        put(img, x + dx, y + dy, c)
    for w in wings:
        put(img, x + w[0], y + w[1], '#1a1012' if len(w) > 2 else '#f6eee6')


def cranes(img, t):
    flock = [(0, 0), (6, -4), (7, 4), (13, -7), (14, 8), (21, -10)]
    for i, (ox, oy) in enumerate(flock):
        x = 492 + ox - 548.0 * t / N
        y = 34 + oy * 0.8 + 1.5 * np.sin(ph(t, 2, i))
        fr = (step(t, 2, 4) + i * 2) % 4
        crane(img, x, y, [0, 1, 3, 2][fr])


def boats(img, t):
    # moored yakatabune pleasure boat: lacquered hull, glowing shoji cabin, eave lanterns
    if 'yakata' not in _BOAT:
        _BOAT['yakata'] = yakatabune()
    dy = int(round(0.8 * np.sin(ph(t, 3, 0.4))))
    spr = _BOAT['yakata']
    over(img, spr, 66, 226 + dy)
    for k, lx in enumerate(range(76, 110, 5)):
        sw = int(round(0.5 * np.sin(ph(t, 3, k))))
        put(img, lx + sw, 232 + dy, '#d8382a')
        put(img, lx + sw, 233 + dy, '#ff8a50' if (k + step(t, 9, 4)) % 4 else '#ffe0a0')
        add_glow(img, lx + sw, 233 + dy, 5, WARM, k=0.7, bands=(0.22, 0.09))
    for k in range(8):                                           # shimmer of its light on the water
        wx = 72 + (k * 5 + step(t, 5, 38) * 3) % 38
        blend(img, wx, 241 + dy + k % 4, '#ffcf6c', 0.45)
    # small sampan with a fisherman in a kasa hat and a stern lantern
    dy = int(round(0.9 * np.sin(ph(t, 3, 2.1))))
    sx, sy = 318, 253 + dy
    for x in range(sx, sx + 16):
        e = min(x - sx, sx + 15 - x)
        put(img, x, sy + (0 if e > 2 else -1 if e == 0 else 0), '#3a2420')
        put(img, x, sy + 1, '#1e1212')
    put(img, sx + 8, sy - 1, '#2a2030')
    put(img, sx + 8, sy - 2, '#2a2030')
    for dx in (-1, 0, 1):
        put(img, sx + 8 + dx, sy - 3, '#c89a52')
    put(img, sx + 8, sy - 4, '#e8c070')
    put(img, sx + 15, sy - 5, '#3a2420')
    put(img, sx + 15, sy - 4, '#3a2420')
    put(img, sx + 16, sy - 4, '#ffd070')
    add_glow(img, sx + 16, sy - 4, 6, WARM, k=0.9, bands=(0.28, 0.12, 0.05))
    pole = 3 * np.sin(ph(t, 3, 2.1))
    for k in range(9):
        put(img, sx + 5 - k * 0.3 + pole * k / 9, sy - 2 + k * 0.9, '#6a4a3a')


_BOAT = {}


def yakatabune():
    from arch import roof, ROOF_BROWN
    L = Layer(52, 20)
    for x in range(2, 48):
        lift = 2 if x < 5 else 1 if x < 8 else 0
        L.px(x, 12 - lift, '#9a3020')
        L.rect(x, 13 - lift, x, 14, '#2a1614')
        L.px(x, 15, '#140a0a')
    L.rect(9, 7, 42, 11, '#ffcf6c')
    L.rect(9, 9, 42, 9, '#d89040')
    for x in range(9, 43, 5):
        L.rect(x, 6, x, 11, '#2a1a18')
    L.rect(9, 11, 42, 11, '#b86a30')
    roof(L, 26, 2, 6, 26, 40, ROOF_BROWN, curl=1)
    return L.arr()


LANES = [(234, 0.4, 2, [9, 41]), (243, 0.6, 2, [30]), (252, 0.8, 3, [70]), (263, 1.2, 3, [20, 112])]


def river_lanterns(img, t):
    for y0, v, s, offs in LANES:
        P = v * N
        for o in offs:
            base = (o + v * t) % P
            for k in range(-1, int(W / P) + 2):
                x = base + k * P
                if not -4 < x < W + 4:
                    continue
                if 380 < x < 466 and y0 > 258:
                    continue
                bob = np.sin(ph(t, 2, x * 0.2))
                y = y0 + int(round(bob * 0.6))
                f = 0.8 + 0.2 * np.sin(ph(t, 6, x * 0.7))
                add_glow(img, x + s / 2, y, 5 + s, WARM, k=0.8 * f, bands=(0.25, 0.1, 0.04), y_squash=0.6)
                for dx in range(s):
                    put(img, x + dx, y - s, '#3a2a22')
                    for dy in range(s - 1):
                        put(img, x + dx, y - s + 1 + dy, '#fff0b0' if dx == s // 2 else '#ffcf6c')
                    put(img, x + dx, y, '#6a3a24')
                for k2 in range(1, 4):                               # reflection flicker
                    if (k2 + step(t, 3, 2)) % 2:
                        blend(img, x + (s - 1) / 2 + np.sin(ph(t, 4, k2 + x)) * 0.7, y + k2, '#ffb050', 0.55)


RIPPLE_BASES = [374, 386, 398, 446, 458, 470]


def torii_water(img, t, torii_arr):
    # reflection of the pillar bases, then expanding rings where they meet the water
    for y in range(263, H):
        d = y - 262
        sx = int(round(0.8 * np.sin(y * 1.3 + ph(t, 4))))
        src = torii_arr[262 - d]
        a = src[:, 3] > 0
        xs = np.nonzero(a)[0]
        for x in xs:
            if 0 <= x + sx < W:
                img[y, x + sx] = img[y, x + sx] * 0.45 + src[x, :3] * 0.4
    for i, bx in enumerate(RIPPLE_BASES):
        for k in range(2):
            f = ((t / N) * 5 + i * 0.37 + k * 0.5) % 1.0
            rx, ry = 3 + f * 9, 0.8 + f * 2
            for j in range(40):
                ang = j / 40 * TAU
                x, y = bx + rx * np.cos(ang), 262 + ry * np.sin(ang)
                if BAYER[int(y) % H, int(x) % W] < 1.1 - f:
                    blend(img, x, y, '#ffc27a', 0.85 * (1 - f * 0.8))


FLIES = rng(55)
FLY = [(FLIES.uniform(230, 290), FLIES.uniform(196, 222), FLIES.uniform(0, TAU, 3)) for _ in range(8)] + \
      [(FLIES.uniform(0, 100), FLIES.uniform(196, 224), FLIES.uniform(0, TAU, 3)) for _ in range(7)]


def fireflies(img, t):
    for cx, cy, (p1, p2, p3) in FLY:
        x = cx + 7 * np.sin(ph(t, 1, p1)) + 3 * np.sin(ph(t, 3, p2))
        y = cy + 4 * np.sin(ph(t, 2, p2)) + 1.5 * np.sin(ph(t, 5, p3))
        b = np.sin(ph(t, 3, p3))
        if b > 0.1:
            add_glow(img, x, y, 3, rgb('#d8f070'), k=b, bands=(0.35, 0.12))
            put(img, x, y, '#f8ffc0' if b > 0.6 else '#c8e070')


REEDS = rng(90)
REED = [(REEDS.uniform(-2, 34), REEDS.uniform(12, 34), REEDS.uniform(-0.02, 0.03), REEDS.uniform(0, TAU)) for _ in range(16)] + \
       [(REEDS.uniform(468, 482), REEDS.uniform(10, 26), REEDS.uniform(-0.03, 0.0), REEDS.uniform(0, TAU)) for _ in range(6)]
PADS = [(20, 262, 5), (38, 266, 6), (56, 258, 4), (6, 254, 4), (72, 265, 5)]


def foreground(img, t):
    """Lotus pads and swaying reeds framing the lower corners."""
    for i, (px_, py_, rw) in enumerate(PADS):
        dy = int(round(0.6 * np.sin(ph(t, 2, i * 1.3))))
        for dx in range(-rw, rw + 1):
            hh = 1 if abs(dx) < rw - 1 else 0
            for k in range(-hh, hh + 1):
                put(img, px_ + dx, py_ + dy + k, '#1e3024' if k >= 0 else '#35523a')
        put(img, px_ + 1, py_ + dy, '#0e1a12')                       # notch
        put(img, px_ + rw - 1, py_ + dy - 1, '#8a9a58')
        if i in (1, 3):                                               # lotus blossom
            put(img, px_ - 1, py_ + dy - 2, '#e88a9a')
            put(img, px_, py_ + dy - 3, '#ffd4dc')
            put(img, px_ + 1, py_ + dy - 2, '#e88a9a')
            put(img, px_, py_ + dy - 2, '#fff2f2')
    for i, (x0, ln, bend, p) in enumerate(REED):
        sway = 1.8 * np.sin(ph(t, 2, x0 * 0.13 + p)) + 0.5 * np.sin(ph(t, 5, p))
        for k in range(int(ln)):
            f = k / ln
            x = x0 + bend * k * k + sway * f * f
            put(img, x, H - 1 - k, '#120a0e' if (i % 4 or f < 0.5) else '#c8703a')
        if i % 5 == 0:                                                # cattail head
            x = x0 + bend * ln * ln + sway
            for k in range(3):
                put(img, x, H - 1 - ln - k, '#3a2018')
            put(img, x + 1, H - ln - 2, '#a0583a')


def sparkle(img, x, y, a):
    """Four-point glint; a in 0..1."""
    if a <= 0:
        return
    put(img, x, y, '#fffbe8')
    if a > 0.4:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            blend(img, x + dx, y + dy, '#fff0c0', 0.9)
    if a > 0.8:
        for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            blend(img, x + dx, y + dy, '#ffd890', 0.6)


def glints(img, t, island_dy, bells):
    from island import ICX
    for i, sx in enumerate((ICX - 5, ICX + 9)):                      # golden shachihoko
        a = (np.sin(ph(t, 2, i * 2.6)) - 0.86) / 0.14
        sparkle(img, sx, 5 + island_dy, a)
    for i, (bx, by) in enumerate(bells):                             # pagoda wind bells
        a = (np.sin(ph(t, 3, i * 1.9)) - 0.9) / 0.1
        sparkle(img, bx, by + 1, a * 0.7)


SKYL = rng(64)
SKY_LANTERNS = [(SKYL.uniform(110, 372), SKYL.uniform(198, 214), SKYL.uniform(0.22, 0.42), SKYL.uniform(0.04, 0.2),
                 SKYL.uniform(0, N), SKYL.uniform(0.6, 1.0) * N, SKYL.uniform(0, TAU)) for _ in range(22)]


def sky_lanterns(img, t):
    for x0, y0, vy, vx, birth, life, p in SKY_LANTERNS:
        age = (t - birth) % N
        if age > life:
            continue
        f = age / life
        alpha = min(1.0, f * 8) * min(1.0, (1 - f) * 3.5)
        x = x0 + vx * age + 1.5 * np.sin(age * 0.05 + p)
        y = y0 - vy * age
        if BAYER[int(y) % H, int(x) % W] > alpha:
            continue
        add_glow(img, x, y, 3, WARM, k=0.8 * alpha, bands=(0.3, 0.1))
        put(img, x, y, '#ffe0a0')
        put(img, x, y + 1, '#ff8a3a')


def shooting_star(img, t):
    t0 = int(0.37 * N)
    k = t - t0
    if not 0 <= k < 9:
        return
    hx, hy = 188 - k * 7.0, 8 + k * 3.1
    for j in range(14):
        a = (1 - j / 14) * (1 - k / 9) ** 0.5
        blend(img, hx + j * 1.0, hy - j * 0.44, '#fff4d8', a)
    put(img, hx, hy, '#ffffff')
