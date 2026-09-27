"""Shared constants and pixel helpers for the Japanese fantasy city renderer."""
import numpy as np
from PIL import Image, ImageDraw

W, H = 480, 270          # native pixel-art resolution
N = 200                  # frames per loop (every animation is periodic in N)
WATER_Y = 226            # far-bank waterline
TAU = 2 * np.pi

B4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16
BAYER = np.tile(B4, (H // 4 + 1, W // 4 + 1))[:H, :W]
YY, XX = np.mgrid[0:H, 0:W]


def rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def rng(seed):
    return np.random.default_rng(seed)


def ph(t, k=1, p=0.0):
    """Phase of a periodic signal: k cycles per loop, offset p (radians)."""
    return TAU * k * t / N + p


class Layer:
    """RGBA sprite layer drawn with hard-edged PIL primitives (no anti-aliasing)."""

    def __init__(self, w=W, h=H):
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
        self.w, self.h = w, h

    def poly(self, pts, c):
        self.d.polygon([(round(x), round(y)) for x, y in pts], fill=c)

    def rect(self, x0, y0, x1, y1, c):  # inclusive
        if x1 >= x0 and y1 >= y0:
            self.d.rectangle([round(x0), round(y0), round(x1), round(y1)], fill=c)

    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.d.point((x, y), fill=c)

    def line(self, pts, c, w=1):
        self.d.line([(round(x), round(y)) for x, y in pts], fill=c, width=w)

    def ell(self, x0, y0, x1, y1, c):
        self.d.ellipse([round(x0), round(y0), round(x1), round(y1)], fill=c)

    def arr(self):
        return np.asarray(self.im).astype(np.float32)

    def set_arr(self, a):
        self.im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
        self.d = ImageDraw.Draw(self.im)


def over(dst, src, dx=0, dy=0):
    """Composite RGBA float array src onto RGB float dst at integer offset."""
    h, w = src.shape[:2]
    x0, y0 = max(dx, 0), max(dy, 0)
    x1, y1 = min(dx + w, dst.shape[1]), min(dy + h, dst.shape[0])
    if x1 <= x0 or y1 <= y0:
        return
    s = src[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
    a = s[..., 3:4] / 255.0
    d = dst[y0:y1, x0:x1]
    d[:] = d * (1 - a) + s[..., :3] * a


def ramp_color(stops, v, x, y, sharp=1.8):
    """Dithered lookup in a list of colors for scalar v in [0,1] (arrays ok)."""
    n = len(stops) - 1
    p = np.clip(v, 0, 0.99999) * n
    i = np.floor(p).astype(int)
    f = np.clip((p - i - 0.5) * sharp + 0.5, 0, 1)
    i = i + (f > B4[y % 4, x % 4])
    return np.asarray(stops, np.float32)[np.clip(i, 0, n)]


def add_glow(img, x, y, r, col, k=1.0, bands=(0.28, 0.16, 0.08), y_squash=1.0):
    """Banded pixel-art halo: concentric steps instead of smooth falloff."""
    x, y = int(round(x)), int(round(y))
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    d = np.sqrt(xx * xx + (yy / y_squash) ** 2) / r
    nb = len(bands)
    lvl = np.zeros_like(d)
    for i, b in reversed(list(enumerate(bands))):
        edge = (i + 1) / nb
        jitter = (B4[(yy + y) % 4, (xx + x) % 4] - 0.5) * (0.9 / nb)
        lvl = np.where((d + jitter) < edge, b, lvl)
    x0, y0 = x - r, y - r
    sx0, sy0 = max(0, -x0), max(0, -y0)
    ex, ey = min(2 * r + 1, img.shape[1] - x0), min(2 * r + 1, img.shape[0] - y0)
    if ex <= sx0 or ey <= sy0:
        return
    reg = img[y0 + sy0:y0 + ey, x0 + sx0:x0 + ex]
    reg += (lvl[sy0:ey, sx0:ex] * k)[..., None] * col[None, None, :]


def step(t, per, m):
    """Integer counter mod m that advances about every `per` frames yet wraps exactly at N."""
    cycles = m * max(1, round(N / (per * m)))
    return int(t * cycles / N) % m
