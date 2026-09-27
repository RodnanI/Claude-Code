"""Sunset cloud banks (lit from the sun side) and gold kasumi mist bands."""
import numpy as np
from scipy.ndimage import gaussian_filter, binary_erosion
from common import *
from sky import SUN

CLOUD_RAMP = [rgb(c) for c in ('#2a0c1c', '#3f1226', '#591a30', '#7a2436', '#a2343a',
                               '#c84a3c', '#e8743f', '#f8a24c', '#ffd27a', '#fff0c0')]


def cloud_sprite(w, h, seed, puff=1.0, core=None):
    """Union-of-ellipses cloud with normal-based shading toward the sun."""
    r = rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    m = np.zeros((h, w), bool)
    base = h * 0.78
    n = max(5, int(w / 7))
    for i in range(n):
        cx = r.uniform(0.08, 0.92) * w
        edge = 1 - abs(cx / w - 0.5) * 2              # taller in the middle
        ry = (0.25 + 0.75 * edge ** 0.6 * r.uniform(0.6, 1.0)) * h * 0.5 * puff
        rx = ry * r.uniform(1.2, 2.2)
        cy = base - ry * 0.55
        m |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
        if puff > 1 and edge > 0.3 and r.random() < 0.6:    # billowing second tier
            ry2 = ry * r.uniform(0.5, 0.75)
            m |= ((xx - cx - r.uniform(-4, 4)) / (ry2 * 1.4)) ** 2 + ((yy - cy + ry * 0.9) / ry2) ** 2 <= 1
    m &= yy <= base + 1
    if core:                                           # solid heart that hides the dragon's ends
        cx, cy, rx, ry = core
        m |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
        for i in range(int(rx / 4)):
            bx = cx + r.uniform(-rx, rx) * 0.9
            br = r.uniform(3, 7)
            m |= ((xx - bx) / (br * 1.6)) ** 2 + ((yy - (cy - ry * 0.7)) / br) ** 2 <= 1
        for i in range(int(rx / 2.5)):                 # billowing scalloped underside
            f = r.uniform(-0.95, 0.95)
            bx, br = cx + f * rx, r.uniform(2, 4.5)
            by = cy + ry * np.sqrt(1 - f * f) * 0.75
            m |= ((xx - bx) / (br * 1.5)) ** 2 + ((yy - by) / br) ** 2 <= 1
    # long thin wisps trailing from the bottom
    for i in range(3):
        y0 = int(base + 1 - i * 2)
        x0, x1 = int(r.uniform(-0.1, 0.2) * w), int(r.uniform(0.75, 1.1) * w)
        m[y0, max(x0, 0):min(x1, w)] = True
    return m


def shade_cloud(m, ox, oy, lift):
    h, w = m.shape
    s = gaussian_filter(m.astype(np.float32), 2.2)
    gy, gx = np.gradient(s)
    nrm = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
    nx, ny = -gx / nrm, -gy / nrm
    yy, xx = np.mgrid[0:h, 0:w]
    lx, ly = SUN[0] - (xx + ox), SUN[1] - (yy + oy)
    ll = np.sqrt(lx ** 2 + ly ** 2) + 1e-6
    lam = (nx * lx + ny * ly) / ll
    depth = np.clip(1 - s, 0, 1)
    under = np.clip((yy - h * 0.45) / (h * 0.5), 0, 1)     # undersides catch the low sun
    near = np.exp(-np.sqrt(lx ** 2 + ly ** 2) / 260.0)
    v = 0.22 + 0.30 * lam * depth * 2 + 0.25 * under + 0.35 * near + lift
    v = np.clip(v, 0, 1)
    edge = m & ~binary_erosion(m)
    rim = edge & (lam > 0.25)
    rgbv = ramp_color(CLOUD_RAMP, v, (xx + ox), (yy + oy), 2.4)
    rgbv[rim] = ramp_color(CLOUD_RAMP, np.clip(v[rim] + 0.28, 0, 1), (xx + ox)[rim], (yy + oy)[rim], 3)
    out = np.zeros((h, w, 4), np.float32)
    out[..., :3] = rgbv
    out[..., 3] = m * 255
    return out


# (x, y, w, h, seed, lift, layer, sway)  layer: 0 = behind island, 1 = in front of dragon
CLOUDS = [
    (300, 22, 150, 22, 3, -0.18, 0, 2),
    (-20, 30, 170, 26, 4, -0.22, 0, 3),
    (150, 44, 90, 14, 5, -0.12, 0, 2),
    (330, 96, 120, 16, 9, 0.05, 0, 2),
    (-30, 118, 150, 20, 6, 0.05, 0, 3),
    (388, 50, 112, 42, 21, -0.05, 1, 1),     # dragon emerges here
    (-24, 80, 128, 44, 22, 0.0, 1, 1),       # dragon dives here
]
_SPR = {}


def sprites():
    if not _SPR:
        for i, (x, y, w, h, seed, lift, layer, sway) in enumerate(CLOUDS):
            core = {21: (67, 31, 44, 12), 22: (64, 24, 64, 13)}.get(seed)
            m = cloud_sprite(w, h, seed, puff=1.25 if layer else 1.0, core=core)
            _SPR[i] = shade_cloud(m, x, y, lift)
    return _SPR


def draw_clouds(img, t, layer):
    spr = sprites()
    for i, (x, y, w, h, seed, lift, lay, sway) in enumerate(CLOUDS):
        if lay != layer:
            continue
        dx = int(round(sway * np.sin(ph(t, 1, seed * 1.7))))
        over(img, spr[i], x + dx, y)


GOLD = [rgb(c) for c in ('#b8604a', '#e0906a', '#f0b084', '#f8cc9c', '#fde2bc', '#fff4dc')]


def kasumi_sprite(w, h, seed, bumps=6):
    """Byobu-screen style gold mist band: flat bottom, scalloped top, hatch lines."""
    r = rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rad = h * 0.5
    band = (xx >= rad) & (xx <= w - rad) & (yy >= h * 0.35)
    band |= ((xx - rad) ** 2 + (yy - rad - h * 0.1) ** 2 <= rad ** 2 * 0.9)
    band |= ((xx - (w - rad)) ** 2 + (yy - rad - h * 0.1) ** 2 <= rad ** 2 * 0.9)
    for i in range(bumps):
        cx = r.uniform(0.15, 0.85) * w
        br = r.uniform(0.35, 0.6) * h
        band |= (xx - cx) ** 2 / 2.2 + (yy - h * 0.42) ** 2 <= br ** 2
    band &= yy < h
    out = np.zeros((h, w, 4), np.float32)
    inner = binary_erosion(band)
    edge = band & ~inner
    top = edge & (yy < h * 0.6)
    col = np.zeros((h, w, 3), np.float32)
    v = 0.55 + 0.1 * np.sin(xx * 0.09 + r.uniform(0, 6))
    col[:] = ramp_color(GOLD, v, xx.astype(int), yy.astype(int), 2)
    hatch = inner & (yy.astype(int) % 3 == 2) & (yy > h * 0.45)
    col[hatch] = GOLD[2]
    flecks = inner & (r.random((h, w)) < 0.05)                 # gold-leaf flecks
    col[flecks] = GOLD[4]
    col[edge] = GOLD[0]
    col[top & ~binary_erosion(band, iterations=1)] = GOLD[0]
    under_top = inner & ~binary_erosion(band, iterations=2) & (yy < h * 0.6)
    col[under_top] = GOLD[5]
    out[..., :3] = col
    fade = np.clip(1.0 - (yy - h * 0.45) / (h * 0.9), 0.45, 0.92)   # mist thins downward
    out[..., 3] = band * 255 * np.where(edge | under_top, 1.0, fade)
    return out, under_top


KASUMI = [(18, 146, 200, 16, 31), (150, 168, 190, 14, 32), (296, 172, 150, 13, 33)]
_KS = {}


def draw_kasumi(img, t, which):
    for i in which:
        x, y, w, h, seed = KASUMI[i]
        if i not in _KS:
            _KS[i] = kasumi_sprite(w, h, seed)
        spr, glint_band = _KS[i]
        s = spr.copy()
        # a slow glint travels along the gilded top edge
        gx = (t / N * (w + 60) * 1.0 + seed * 37) % (w + 60) - 30
        yy, xx = np.nonzero(glint_band)
        near = np.abs(xx - gx) < 6
        s[yy[near], xx[near], :3] = rgb('#fffbe6')
        dx = int(round(2 * np.sin(ph(t, 1, seed))))
        over(img, s, x + dx, y)
