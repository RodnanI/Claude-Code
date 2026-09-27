"""Compose every frame, build one global palette, and write delta-optimised looping GIFs."""
import io
import os
import struct
import sys
import time
import numpy as np
from PIL import Image
from common import *
import sky, clouds, island, dragon, town, front, water, life

BACK = sky.static_back()
TOWN, TOWN_LANTERNS, TOWN_LIGHTS = town.get()
FRONT, FRONT_LIGHTS = front.build()
TORII = front.giant_torii()


def frame(t):
    img = BACK.copy()
    sky.stars(img, t)
    life.shooting_star(img, t)
    life.cranes(img, t)
    clouds.draw_clouds(img, t, 0)
    clouds.draw_kasumi(img, t, [0, 1, 2])
    isl = island.draw_island(img, t)
    dragon.draw_dragon(img, t)
    clouds.draw_clouds(img, t, 1)
    for x, y, f in isl:
        add_glow(img, x, y, 4, rgb('#ffb050'), k=f, bands=(0.3, 0.12))
    over(img, TOWN)
    life.smoke(img, t)
    life.koinobori(img, t)
    for i, (x, y, s) in enumerate(TOWN_LIGHTS):
        f = 0.8 + 0.2 * np.sin(ph(t, 2 + i % 4, i * 1.7))
        add_glow(img, x, y, 2 + 2 * s, rgb('#ff9a40'), k=f, bands=(0.2, 0.09, 0.035))
    for x, y, kind in TOWN_LANTERNS:
        life.chochin(img, x, y, t, kind)
    life.glints(img, t, island.island_dy(t), town.BELLS)
    life.sky_lanterns(img, t)
    over(img, FRONT)
    life.willow(img, t)
    life.lantern_strings(img, t)
    for i, (x, y) in enumerate(FRONT_LIGHTS):
        add_glow(img, x, y, 7, rgb('#ff9a40'), k=0.85 + 0.15 * np.sin(ph(t, 4, i)), bands=(0.3, 0.14, 0.05))
    life.fireflies(img, t)
    streaks = [(x, y, s) for x, y, s in TOWN_LIGHTS] + [(x, y, 2) for x, y in FRONT_LIGHTS]
    water.water(img, t, streaks)
    life.river_lanterns(img, t)
    life.boats(img, t)
    life.torii_water(img, t, TORII)
    over(img, TORII)
    life.foreground(img, t)
    life.petals(img, t)
    return np.clip(img, 0, 255).astype(np.uint8)


def protected_colours():
    """Accent hues that are rare in pixel count but must survive quantisation exactly."""
    import front
    hexes = ['#b04a62', '#e88a9a', '#ffd4dc', '#fff2f2', '#241e22', '#3e3438', '#e8d8c8', '#c8302a', '#e85a3a',
             '#ffe0c0', '#2a7a7a', '#48a0a0', '#e0f0e0', '#2a5a8a', '#e8c040', '#f0ece0', '#2a7a4a', '#2a6a5a',
             '#5ac8a0', '#c8ffe8', '#3a9a7a', '#f6e2a8', '#fff070', '#6a1010', '#fff4e0', '#d8f070', '#f8ffc0',
             '#c8e070', '#35523a', '#1e3024', '#d83a2a', '#f6eee6', '#ff8a3a', '#ffc870', '#ffe0a0']
    cols = [rgb(h) for h in hexes] + list(front.SAKURA) + list(dragon.C.values())
    return np.unique(np.array(cols, np.float32), axis=0)


def build_palette(frames, k=255, iters=12):
    """Global palette: weighted k-means with pinned accent colours, free centres snapped to real colours."""
    codes = (frames[..., 0].astype(np.uint32) << 16) | (frames[..., 1].astype(np.uint32) << 8) | frames[..., 2]
    uniq, inv, cnt = np.unique(codes.ravel(), return_inverse=True, return_counts=True)
    cols = np.stack([(uniq >> 16) & 255, (uniq >> 8) & 255, uniq & 255], -1).astype(np.float32)
    print(f'unique colours: {len(uniq)}')
    wts = np.array([0.9, 1.2, 0.8], np.float32)
    if len(uniq) <= k:
        return cols.astype(np.uint8), inv.reshape(codes.shape).astype(np.uint8)
    prot = protected_colours()
    npr = len(prot)
    near_prot = np.min((((cols[:, None] - prot[None]) * wts) ** 2).sum(-1), 1) < 150
    order = [i for i in np.argsort(-cnt) if not near_prot[i]][:k - npr]
    cen = np.concatenate([prot, cols[order]]).copy()
    w = cnt.astype(np.float32)

    def assign(c):
        lab = np.empty(len(cols), np.int64)
        for s in range(0, len(cols), 20000):
            d = (((cols[s:s + 20000, None, :] - c[None]) * wts) ** 2).sum(-1)
            lab[s:s + 20000] = d.argmin(1)
        return lab
    for _ in range(iters):
        lab = assign(cen)
        for j in range(npr, k):
            m = lab == j
            if m.any():
                cen[j] = (cols[m] * w[m, None]).sum(0) / w[m].sum()
    lab = assign(cen)
    for j in range(npr, k):                         # snap to the most frequent member colour
        m = np.nonzero(lab == j)[0]
        if len(m):
            cen[j] = cols[m[np.argmax(cnt[m])]]
    lab = assign(cen)
    return cen.astype(np.uint8), lab[inv].reshape(codes.shape).astype(np.uint8)


def lzw_blocks(idx, palette):
    """Let Pillow LZW-encode one indexed image and lift out its raw image-data block."""
    im = Image.fromarray(idx, 'P')
    pal = np.zeros((256, 3), np.uint8)
    pal[:len(palette)] = palette
    im.putpalette(pal.ravel().tolist())
    buf = io.BytesIO()
    im.save(buf, 'GIF', optimize=False, interlace=False)
    b = buf.getvalue()
    p = 13 + (3 << ((b[10] & 7) + 1) if b[10] & 0x80 else 0)
    while b[p] == 0x21:                             # skip extension blocks
        p += 2
        while b[p]:
            p += b[p] + 1
        p += 1
    assert b[p] == 0x2C
    flags = b[p + 9]
    p += 10 + ((3 << ((flags & 7) + 1)) if flags & 0x80 else 0)
    start = p
    p += 1
    while b[p]:
        p += b[p] + 1
    return b[start:p + 1]


def write_gif(path, idx, palette, delay_cs, scale=1):
    n, h, w = idx.shape
    pal = np.zeros((256, 3), np.uint8)
    pal[:len(palette)] = palette
    out = io.BytesIO()
    out.write(b'GIF89a' + struct.pack('<HHBBB', w * scale, h * scale, 0xF7, 0, 0) + pal.tobytes())
    out.write(b'\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00')
    prev = None
    for i in range(n):
        cur = idx[i]
        if prev is None:
            x0, y0, x1, y1 = 0, 0, w, h
            sub = cur
        else:
            diff = cur != prev
            if not diff.any():
                diff[0, 0] = True
            ys, xs = np.nonzero(diff)
            x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            sub = np.where(diff[y0:y1, x0:x1], cur[y0:y1, x0:x1], 255).astype(np.uint8)
        if scale > 1:
            sub = np.repeat(np.repeat(sub, scale, 0), scale, 1)
        out.write(struct.pack('<BBBBHBB', 0x21, 0xF9, 4, (1 << 2) | 1, delay_cs, 255, 0))
        out.write(struct.pack('<BHHHHB', 0x2C, x0 * scale, y0 * scale, sub.shape[1], sub.shape[0], 0))
        out.write(lzw_blocks(sub, palette))
        prev = cur
    out.write(b'\x3B')
    with open(path, 'wb') as f:
        f.write(out.getvalue())
    return os.path.getsize(path)


if __name__ == '__main__':
    outdir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    t0 = time.time()
    frames = np.stack([frame(t) for t in range(N)])
    print(f'rendered {N} frames in {time.time() - t0:.1f}s')
    palette, idx = build_palette(frames)
    for scale, name in ((1, 'japanese_fantasy_city_1x.gif'), (2, 'japanese_fantasy_city.gif')):
        size = write_gif(os.path.join(outdir, name), idx, palette, 5, scale)
        print(f'{name}: {size / 1e6:.2f} MB')
