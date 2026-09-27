"""Jade sky dragon chasing a flaming pearl along a spline track, rasterised in body space."""
import numpy as np
from scipy.spatial import cKDTree
from common import *

TRACK = [(560, 52), (500, 62), (452, 76), (412, 96), (372, 122), (322, 142), (264, 148), (214, 134),
         (170, 108), (128, 94), (86, 98), (50, 103), (10, 105), (-40, 106), (-120, 108)]
LEN = 128
BODY = dict(hi='#6aae84', lt='#4a9474', md='#357a60', dk='#235a48', sh='#163c32', ol='#0c1612',
            bel='#e8c064', bel2='#c8923e', belk='#8a5a2a', fin='#d8482a', fin2='#ff8a3a', fin3='#ffc870',
            horn='#f0e2c0', horn2='#b8a07a', rim='#ffc070')
C = {k: rgb(v) for k, v in BODY.items()}


def catmull(pts, n=40):
    p = np.array(pts, np.float32)
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for s in np.linspace(0, 1, n, endpoint=False):
            s2, s3 = s * s, s * s * s
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (-p0 + 3 * p1 - 3 * p2 + p3) * s3))
    out = np.array(out)
    seg = np.sqrt((np.diff(out, axis=0) ** 2).sum(1))
    return out, np.concatenate([[0], np.cumsum(seg)])


PTS, ARC = catmull(TRACK)
EMERGE = float(np.interp(-432, -PTS[:, 0], ARC))          # arc length where the head clears the right cloud
DIVE = float(np.interp(-70, -PTS[:, 0], ARC))              # arc length where the left cloud swallows it
SPAN = DIVE + LEN - EMERGE
SPEED = SPAN / N


def at(s):
    return np.stack([np.interp(s, ARC, PTS[:, 0]), np.interp(s, ARC, PTS[:, 1])], -1)


def frame_at(s, t):
    """Centre, forward tangent and dorsal normal at arc positions s (with swimming undulation)."""
    c = at(s)
    c2 = at(s + 1.0)
    T = c2 - c
    T /= np.linalg.norm(T, axis=-1, keepdims=True) + 1e-6
    n = np.stack([-T[..., 1], T[..., 0]], -1)      # dorsal side: up when flying left
    return c, T, n


def radius(u):
    r = np.interp(u, [0, 6, 28, 60, LEN - 16, LEN], [4.4, 5.0, 6.0, 5.7, 2.4, 1.0])
    return r


def head_profile(a):
    top = np.interp(a, [0, 2, 5, 8, 11, 15, 17, 18.5, 19.5], [5.5, 6.8, 6.2, 4.6, 3.6, 3.1, 3.4, 2.6, 1.0])
    bot = np.interp(a, [0, 3, 7, 11, 15, 19.5], [-5.6, -6.0, -4.8, -3.8, -3.0, -1.5])
    return top, bot


def draw(img, t, s_head):
    u = np.arange(-20.5, LEN + 0.01, 0.5)
    s = s_head - u
    c, T, n = frame_at(s, t)
    und = 2.6 * np.sin(u * TAU / 64 - ph(t, 5)) * np.clip(u / 30, 0, 1)
    c = c + n * und[:, None]
    lo = np.floor(c.min(0) - 16).astype(int)
    hi = np.ceil(c.max(0) + 16).astype(int)
    x0, y0 = max(lo[0], 0), max(lo[1], 0)
    x1, y1 = min(hi[0], W - 1), min(hi[1], H - 1)
    if x1 <= x0 or y1 <= y0:
        return None
    gy, gx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
    P = np.stack([gx.ravel(), gy.ravel()], -1).astype(np.float32)
    _, idx = cKDTree(c).query(P)
    d = P - c[idx]
    v = (d * n[idx]).sum(1)
    along = (d * T[idx]).sum(1)
    uu = u[idx] - along
    r = radius(np.clip(uu, 0, LEN))
    a = -uu
    ht, hb = head_profile(np.clip(a, 0, 19.5))
    body = (uu >= 0) & (np.abs(v) <= r) & (uu <= LEN)
    head = (uu < 0) & (a <= 19.5) & (v <= ht) & (v >= hb)
    inside = body | head
    col = np.zeros((len(P), 3), np.float32)
    q = np.where(uu >= 0, v / np.maximum(r, 0.5), v / 6.5)
    scale = ((uu + (np.floor(v * 0.9) % 2) * 1.5) % 3.0) < 1.0
    col[:] = C['md']
    col[q > 0.15] = C['lt']
    col[(q > 0.15) & scale] = C['md']
    col[(q <= 0.15) & scale] = C['dk']
    col[q > 0.62] = C['dk']
    col[q > 0.8] = C['sh']
    belly = (q < -0.34) & (uu > 3)
    col[belly] = C['bel']
    col[belly & ((uu % 3.0) < 0.9)] = C['belk']
    col[belly & (q < -0.8)] = C['bel2']
    # head colouring: lighter snout, open mouth, eye
    hm = head & (a > 10) & (v > -2.2) & (v < 0.2) & (v < ht - 1.2)
    col[head] = C['lt']
    col[head & (v > 1.2) & (a > 10)] = C['hi']                    # sunlit snout ridge
    col[head & (v > 3.8) & (a < 10) & (a > 4)] = C['dk']                    # heavy brow
    col[head & (v < -2.6)] = C['bel']
    col[hm] = rgb('#6a1010')
    col[hm & ((v > -0.3) | (v < -1.8)) & (np.floor(a) % 2 == 0)] = rgb('#fff4e0')   # fangs
    ring = head & (np.abs(a - 8.0) < 1.9) & (np.abs(v - 2.7) < 1.5)
    col[ring] = C['ol']
    eye = head & (np.abs(a - 8.0) < 1.2) & (np.abs(v - 2.7) < 0.8)
    col[eye] = rgb('#fff070')
    col[eye & (a < 7.6)] = rgb('#2a0808')
    col[head & (np.abs(a - 18.0) < 0.6) & (np.abs(v - 1.8) < 0.5)] = C['ol']  # nostril
    # outline: dark on top/left, sunlit rim underneath
    edge = inside & ((np.abs(v) > r - 0.85) & body | head & ((v > ht - 0.8) | (v < hb + 0.8) | (a > 18.8)))
    col[edge] = C['ol']
    col[edge & (v < 0) & (uu > 4)] = C['rim']
    sub = img[y0:y1 + 1, x0:x1 + 1].reshape(-1, 3)
    sub[inside] = col[inside]
    img[y0:y1 + 1, x0:x1 + 1] = sub.reshape(y1 - y0 + 1, x1 - x0 + 1, 3)
    return c, T, n, u


def to_px(img, x, y, col):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < W and 0 <= y < H:
        img[y, x] = col


def poly(img, pts, col):
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        k = int(max(abs(bx - ax), abs(by - ay)) * 1.5) + 1
        for f in np.linspace(0, 1, k):
            to_px(img, ax + (bx - ax) * f, ay + (by - ay) * f, col)


def extras(img, t, s_head, behind):
    """Limbs (far side drawn behind the body), fins, horns, mane, whiskers, tail tuft."""
    def local(uq, vq, aq=0.0):
        c, T, n = frame_at(np.array([s_head - uq]), t)
        und = 2.6 * np.sin(uq * TAU / 64 - ph(t, 5)) * np.clip(uq / 30, 0, 1)
        return c[0] + n[0] * (vq + und) + T[0] * aq, T[0], n[0]
    for k, lu in enumerate((24, 30, 84, 90)):
        far = k % 2 == 1
        if far != behind:
            continue
        pad = np.sin(ph(t, 6, k * 1.3 + (0 if k < 2 else 2.0)))
        b, T, n = local(lu, -3.0)
        j = b - n * 4.5 - T * (2 + pad * 1.5)
        f = j - n * 3 + T * (2.5 + pad)
        colr = C['sh'] if far else C['md']
        poly(img, [b, j, f], colr)
        poly(img, [b + T * 0.8, j + T * 0.8], C['dk'] if far else C['lt'])
        for cl in (-1, 0, 1):
            to_px(img, *(f + T * 1.2 + n * cl * 0.9), C['horn2'] if far else C['horn'])
    if behind:
        return
    for uq in np.arange(10, LEN - 12, 5.0):                          # dorsal fins
        r = radius(uq)
        b, T, n = local(uq, r - 0.5)
        tip = b + n * (2.6 + r * 0.25) - T * 2.2
        poly(img, [b, tip], C['fin'])
        to_px(img, *tip, C['fin3'])
    hb, T, n = local(-4.0, 6.0)                                      # antler horns
    h1 = hb + n * 4 - T * 7
    h2 = h1 + n * 2.5 - T * 7
    poly(img, [hb - n * 0.9, h1 - n * 0.9, h2 - n * 0.9], C['horn2'])
    poly(img, [hb, h1, h2], C['horn'])
    poly(img, [h1 + T * 0.5, h1 + n * 4.5 + T * 1.0], C['horn'])
    to_px(img, *h2, rgb('#fffbe8'))
    to_px(img, *(h1 + n * 4.5 + T * 1.0), rgb('#fffbe8'))
    for k in range(4):                                               # cheek frills
        cb, T2, n2 = local(-1.0 + k * 1.2, -3.5 - k * 0.3)
        poly(img, [cb, cb - n2 * 2.5 - T2 * 2.5], rgb('#f6e2a8') if k % 2 else C['fin2'])
    for k in range(11):                                              # bushy flame mane
        uq = -2 + k * 2.6
        fl = 5.0 + 2.5 * np.sin(ph(t, 7, k * 1.7)) - k * 0.2
        b, T, n = local(uq, radius(max(uq, 0)) - 1.0 + (1.2 if uq < 0 else 0))
        tip = b + n * fl - T * (4.5 + k * 0.2)
        poly(img, [b, tip], C['fin'] if k % 2 else C['fin2'])
        poly(img, [b - T, tip - T * 1.2 - n * 0.6], C['fin2'] if k % 2 else C['fin'])
        to_px(img, *tip, C['fin3'])
    for side, off in ((1, 0.8), (-1, -1.2)):                         # long whiskers trailing back
        pts = []
        for k in range(26):
            uq = -19.0 + k * 1.8
            wv = off + side * 0.08 * k + 1.6 * np.sin(k * 0.35 - ph(t, 4, side)) * (k / 25)
            b, _, _ = local(uq, wv - (0.12 * k if side < 0 else -0.05 * k))
            pts.append(b)
        poly(img, pts, rgb('#f6e2a8'))
    bb, T, n = local(-9.0, -5.0)                                     # beard
    poly(img, [bb, bb - n * 3 + T * 1.5], C['fin2'])
    tb, T, n = local(LEN - 1, 0)                                     # tail tuft
    for k in range(5):
        ang = (k - 2) * 0.45 + 0.35 * np.sin(ph(t, 6, k))
        dvec = -T * np.cos(ang) + n * np.sin(ang)
        ln = 7 + 2 * np.sin(ph(t, 5, k * 2))
        poly(img, [tb, tb + dvec * ln], C['fin'] if k % 2 else C['fin2'])
        to_px(img, *(tb + dvec * ln), C['fin3'])


def pearl(img, t, s_head):
    s = s_head + 32 + 2 * np.sin(ph(t, 3))
    p = at(np.array([s]))[0] + np.array([0, -4 + 2.5 * np.sin(ph(t, 4))])
    add_glow(img, p[0], p[1], 10, rgb('#ffb060'), k=0.6, bands=(0.4, 0.22, 0.1))
    for k in range(4):                                               # flame tongues licking backward
        ang = ph(t, 8, k * 1.6)
        q = p + np.array([3 + k * 1.3, -1 + 1.5 * np.sin(ang)])
        to_px(img, *q, rgb('#ff8a3a') if k % 2 else rgb('#ffc870'))
    x, y = int(round(p[0])), int(round(p[1]))
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            dd = dx * dx + dy * dy
            if dd <= 5:
                to_px(img, x + dx, y + dy, rgb('#c83a24') if dd >= 4 else rgb('#fff0c0') if dd <= 1 else rgb('#ffb050'))
    to_px(img, x - 1, y - 1, rgb('#ffffff'))


def draw_dragon(img, t):
    base = EMERGE + SPEED * t
    for s_head in (base, base - SPAN, base + SPAN):
        if s_head - LEN > DIVE + 30 or s_head < EMERGE - 60:
            continue
        pearl(img, t, s_head)
        extras(img, t, s_head, behind=True)
        draw(img, t, s_head)
        extras(img, t, s_head, behind=False)
