"""Level parsing, tile collision, pre-rendered tile art and parallax backdrops.

Map legend
  #  solid rock            -  one-way platform     +  background wall (decor)
  x  spikes (auto-facing)  ~  lava                 P  player start
  E  exit portal           c  ember (collectible)  d  dash crystal
  S  spring (auto-facing)  k  checkpoint           o  grapple anchor
  B  dash-breakable block  C  crumbling block      w  walker   f  flyer
  h  horizontal mover      v  vertical mover       :  mover bumper (invisible)
"""
import math
import random

import pygame

import font
from settings import (TILE, VIEW_H, PLAYER_W, PLAYER_H, WORLDS, SPIKE, SPIKE_DARK)

SPAWN_CHARS = set('EcdSkowfhv')


def hash2(c, r, salt=0):
    h = (c * 73856093) ^ (r * 19349663) ^ (salt * 83492791)
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return h ^ (h >> 16)


class Level:
    def __init__(self, data, index):
        self.index = index
        self.name = data['name']
        self.world = data.get('world', 0)
        self.pal = WORLDS[self.world]
        self.outline = tuple(v // 3 for v in self.pal['tile_dark'])
        rows = data['map']
        w = max(len(r) for r in rows)
        self.rows = rows = [r.ljust(w, '.') for r in rows]
        self.cols, self.nrows = w, len(rows)
        self.pw, self.ph = w * TILE, len(rows) * TILE
        grid = lambda: [[False] * w for _ in rows]
        self.solid, self.static, self.oneway, self.bumper, self.lava = grid(), grid(), grid(), grid(), grid()
        self.spike = {}
        self.objects = []
        self.start = (TILE, TILE)
        for r, line in enumerate(rows):
            for c, ch in enumerate(line):
                if ch == '#':
                    self.solid[r][c] = self.static[r][c] = True
                elif ch in 'BC':
                    self.solid[r][c] = True
                    self.objects.append((ch, c, r))
                elif ch == '-':
                    self.oneway[r][c] = True
                elif ch == ':':
                    self.bumper[r][c] = True
                elif ch == '~':
                    self.lava[r][c] = True
                elif ch == 'P':
                    self.start = self.foot_pos(c, r)
                elif ch in SPAWN_CHARS:
                    self.objects.append((ch, c, r))
        for r, line in enumerate(rows):
            for c, ch in enumerate(line):
                if ch == 'x':
                    self.spike[(c, r)] = self._spike(c, r)
        self.hints = data.get('hints', [])
        self.rising = data.get('rising')
        self.layer = None

    @staticmethod
    def foot_pos(c, r):
        return c * TILE + (TILE - PLAYER_W) // 2, r * TILE + TILE - PLAYER_H

    # ------------------------------------------------------------ collision
    def is_solid(self, c, r):
        if c < 0 or c >= self.cols:
            return True
        if r < 0 or r >= self.nrows:
            return False
        return self.solid[r][c]

    def collide(self, x, y, w, h):
        solid = self.solid
        cols, nrows = self.cols, self.nrows
        for r in range(y // TILE, (y + h - 1) // TILE + 1):
            if r < 0 or r >= nrows:
                if any(c < 0 or c >= cols for c in (x // TILE, (x + w - 1) // TILE)):
                    return True
                continue
            row = solid[r]
            for c in range(x // TILE, (x + w - 1) // TILE + 1):
                if c < 0 or c >= cols or row[c]:
                    return True
        return False

    def cells_in(self, x, y, w, h):
        for r in range(y // TILE, (y + h - 1) // TILE + 1):
            for c in range(x // TILE, (x + w - 1) // TILE + 1):
                yield c, r

    def oneway_at(self, x, y, w):
        """A one-way surface sits exactly on pixel row y somewhere under [x, x+w)."""
        if y % TILE:
            return False
        r = y // TILE
        if r < 0 or r >= self.nrows:
            return False
        row = self.oneway[r]
        for c in range(max(0, x // TILE), min(self.cols - 1, (x + w - 1) // TILE) + 1):
            if row[c]:
                return True
        return False

    def is_lava(self, c, r):
        return 0 <= c < self.cols and 0 <= r < self.nrows and self.lava[r][c]

    def hazard(self, x, y, w, h, vx, vy):
        for c, r in self.cells_in(x, y, w, h):
            s = self.spike.get((c, r))
            if s:
                (sx, sy, sw, sh), d = s
                if x < sx + sw and x + w > sx and y < sy + sh and y + h > sy:
                    if ((d == 'up' and vy >= 0) or (d == 'down' and vy <= 0) or
                            (d == 'left' and vx >= 0) or (d == 'right' and vx <= 0)):
                        return True
            if self.is_lava(c, r):
                top = r * TILE + (0 if self.is_lava(c, r - 1) else 5)
                if y + h > top:
                    return True
        return False

    def line_clear(self, x0, y0, x1, y1):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / 4))
        for i in range(1, n):
            t = i / n
            c = int((x0 + (x1 - x0) * t) // TILE)
            r = int((y0 + (y1 - y0) * t) // TILE)
            if 0 <= c < self.cols and 0 <= r < self.nrows and self.solid[r][c]:
                return False
        return True

    def _spike(self, c, r):
        if self.is_solid(c, r + 1) and r + 1 < self.nrows:
            d = 'up'
        elif self.is_solid(c, r - 1) and r > 0:
            d = 'down'
        elif self.is_solid(c - 1, r):
            d = 'right'
        elif self.is_solid(c + 1, r):
            d = 'left'
        else:
            d = 'up'
        x, y = c * TILE, r * TILE
        rect = {'up': (x + 2, y + 10, 12, 6), 'down': (x + 2, y, 12, 6),
                'right': (x, y + 2, 6, 12), 'left': (x + 10, y + 2, 6, 12)}[d]
        return rect, d

    # ------------------------------------------------------------------ art
    def _art_solid(self, c, r):
        if c < 0 or c >= self.cols or r < 0 or r >= self.nrows:
            return True
        return self.static[r][c]

    def _free_char(self, c, r):
        return 0 <= c < self.cols and 0 <= r < self.nrows and self.rows[r][c] in '.+'

    def build_layer(self):
        surf = pygame.Surface((self.pw, self.ph), pygame.SRCALPHA)
        rng = random.Random(self.index * 7919 + 17)
        for r in range(self.nrows):
            for c in range(self.cols):
                if self.rows[r][c] == '+':
                    self._bg_tile(surf, c, r)
        for hc, hr, text in self.hints:
            font.draw(surf, text, hc * TILE + TILE // 2, hr * TILE + 4, self.pal['text'], align='center')
        for r in range(self.nrows):
            for c in range(self.cols):
                if self.static[r][c]:
                    tile_art(surf, self, c, r)
        for r in range(self.nrows):
            for c in range(self.cols):
                if self.static[r][c]:
                    self._decorate(surf, c, r, rng)
                elif self.oneway[r][c]:
                    self._plank(surf, c, r)
        for (c, r), (_, d) in self.spike.items():
            self._spikes(surf, c, r, d)
        self.layer = surf

    def _bg_tile(self, surf, c, r):
        x, y = c * TILE, r * TILE
        line = self.pal['bgwall_line']
        surf.fill(self.pal['bgwall'], (x, y, TILE, TILE))
        surf.fill(line, (x, y + 7, TILE, 1))
        surf.fill(line, (x, y + 15, TILE, 1))
        off = 4 if r % 2 else 12
        surf.fill(line, (x + off, y, 1, 7))
        surf.fill(line, (x + (off + 8) % 16, y + 8, 1, 7))

    def _decorate(self, surf, c, r, rng):
        pal, ol = self.pal, self.outline
        style = pal['style']
        x, y = c * TILE, r * TILE
        if not self._art_solid(c, r - 1) and self._free_char(c, r - 1):
            roll = rng.random()
            if style == 'cave':
                if roll < 0.16:
                    a = x + rng.randint(2, 9)
                    h = rng.randint(4, 7)
                    pts = [(a, y), (a + 2, y - h), (a + 4, y)]
                    pygame.draw.polygon(surf, pal['vein'], pts)
                    pygame.draw.polygon(surf, ol, pts, 1)
                elif roll < 0.42:
                    a = x + rng.randint(1, 11)
                    surf.fill(ol, (a - 1, y - 3, 5, 3))
                    surf.fill(pal['tile_edge'], (a, y - 2, 3, 2))
            elif style == 'ruins':
                if roll < 0.62:
                    for _ in range(rng.randint(2, 5)):
                        gx, gh = x + rng.randint(0, 15), rng.randint(2, 5)
                        surf.fill(pal['tile_top'], (gx, y - gh, 1, gh))
                    if roll < 0.12:
                        surf.fill(pal['accent'], (x + rng.randint(2, 12), y - 6, 2, 2))
            else:
                if roll < 0.25:
                    a, w = x + rng.randint(0, 8), rng.randint(4, 8)
                    surf.fill(pal['tile_top'], (a, y - 2, w, 2))
                    surf.fill(pal['tile_top'], (a + 1, y - 3, w - 2, 1))
                elif roll < 0.36:
                    a = x + rng.randint(3, 12)
                    pygame.draw.line(surf, pal['tile_dark'], (a, y - 1), (a + rng.choice((-2, 2)), y - 6))
        if not self._art_solid(c, r + 1) and self._free_char(c, r + 1):
            roll = rng.random()
            yb = y + TILE
            if style == 'cave' and roll < 0.3:
                a, h = x + rng.randint(1, 9), rng.randint(4, 11)
                pts = [(a, yb - 1), (a + 6, yb - 1), (a + 3, yb + h)]
                pygame.draw.polygon(surf, pal['tile'], pts)
                pygame.draw.polygon(surf, ol, pts, 1)
            elif style == 'ruins' and roll < 0.4:
                vx, length = x + rng.randint(2, 13), rng.randint(5, 22)
                for yy in range(length):
                    surf.fill(pal['vein'], (vx + int(math.sin(yy * 0.45) * 1.2), yb + yy, 1, 1))
                    if yy % 4 == 2:
                        surf.fill(pal['tile_top'], (vx + 1, yb + yy, 2, 1))
            elif style == 'peaks' and roll < 0.3:
                a, h = x + rng.randint(2, 12), rng.randint(3, 8)
                pygame.draw.polygon(surf, pal['tile_top'], [(a, yb - 1), (a + 3, yb - 1), (a + 1, yb + h)])

    def _plank(self, surf, c, r):
        pal, ol = self.pal, self.outline
        x, y = c * TILE, r * TILE
        surf.fill(ol, (x, y, TILE, 6))
        surf.fill(pal['plank'], (x, y + 1, TILE, 4))
        surf.fill(pal['plank_hi'], (x, y + 1, TILE, 1))
        surf.fill(ol, (x + 7, y + 2, 1, 3))
        if not (c > 0 and self.oneway[r][c - 1]):
            surf.fill(ol, (x, y + 5, 3, 4))
            surf.fill(pal['plank'], (x + 1, y + 5, 1, 3))
        if not (c + 1 < self.cols and self.oneway[r][c + 1]):
            surf.fill(ol, (x + TILE - 3, y + 5, 3, 4))
            surf.fill(pal['plank'], (x + TILE - 2, y + 5, 1, 3))

    def _spikes(self, surf, c, r, d):
        x, y = c * TILE, r * TILE
        T = TILE
        for i in range(4):
            a = i * 4
            if d == 'up':
                pts = [(x + a, y + T - 1), (x + a + 2, y + T - 8), (x + a + 3, y + T - 1)]
            elif d == 'down':
                pts = [(x + a, y), (x + a + 2, y + 7), (x + a + 3, y)]
            elif d == 'right':
                pts = [(x, y + a), (x + 7, y + a + 2), (x, y + a + 3)]
            else:
                pts = [(x + T - 1, y + a), (x + T - 8, y + a + 2), (x + T - 1, y + a + 3)]
            pygame.draw.polygon(surf, SPIKE, pts)
            pygame.draw.polygon(surf, SPIKE_DARK, pts, 1)


def tile_art(surf, lvl, c, r, solid_fn=None, ox=0, oy=0):
    """Draw one autotiled rock tile. solid_fn decides which neighbours count."""
    pal = lvl.pal
    ol = lvl.outline
    T = TILE
    sf = solid_fn or lvl._art_solid
    x, y = c * T - ox, r * T - oy
    up, down, left, right = sf(c, r - 1), sf(c, r + 1), sf(c - 1, r), sf(c + 1, r)
    h = hash2(c, r, lvl.index)
    surf.fill(pal['tile'], (x, y, T, T))
    style = pal['style']
    dark = pal['tile_dark']
    if style == 'cave':
        for i in range(3):
            hh = h >> (i * 7)
            surf.fill(dark, (x + 1 + hh % 13, y + 4 + (hh >> 4) % 10, 2 + (hh >> 9) % 2, 1))
        if up and down and left and right and h % 5 == 0:
            vx = x + 4 + h % 8
            pygame.draw.lines(surf, pal['vein'], False,
                              [(vx, y), (vx + 2, y + 5), (vx - 1, y + 10), (vx + 1, y + 15)])
    elif style == 'ruins':
        surf.fill(dark, (x, y + 7, T, 1))
        surf.fill(dark, (x, y + 15, T, 1))
        off = 4 if r % 2 else 12
        surf.fill(dark, (x + off, y, 1, 7))
        surf.fill(dark, (x + (off + 8) % 16, y + 8, 1, 7))
        if h % 4 == 0:
            surf.fill(pal['vein'], (x + 2 + h % 11, y + 2 + (h >> 5) % 11, 2, 2))
    else:
        for k in range(2):
            surf.fill(dark, (x, y + 4 + k * 7 + (h >> (k * 3)) % 3, T, 1))
        if h % 6 == 0:
            surf.fill(pal['vein'], (x + 2 + h % 11, y + 3 + (h >> 6) % 10, 2, 1))
    if not up:
        surf.fill(ol, (x, y, T, 1))
        surf.fill(pal['tile_top'], (x, y + 1, T, 3))
        surf.fill(pal['tile_edge'], (x, y + 4, T, 1))
        for i in range(T):
            hv = hash2(c * T + i, r, 3)
            if hv % 5 == 0:
                surf.fill(pal['tile_top'], (x + i, y + 4, 1, 1 + hv % 3))
    if not down:
        surf.fill(dark, (x, y + T - 3, T, 2))
        surf.fill(ol, (x, y + T - 1, T, 1))
    if not left:
        surf.fill(ol, (x, y, 1, T))
        surf.fill(pal['tile_edge'], (x + 1, y + (4 if not up else 0), 1, T - (4 if not up else 0) - (1 if not down else 0)))
    if not right:
        surf.fill(ol, (x + T - 1, y, 1, T))
        surf.fill(dark, (x + T - 2, y + (4 if not up else 0), 1, T - (4 if not up else 0) - (1 if not down else 0)))
    clear = (0, 0, 0, 0)
    if not up and not left:
        surf.set_at((x, y), clear)
        surf.set_at((x + 1, y + 1), ol)
    if not up and not right:
        surf.set_at((x + T - 1, y), clear)
        surf.set_at((x + T - 2, y + 1), ol)
    if not down and not left:
        surf.set_at((x, y + T - 1), clear)
        surf.set_at((x + 1, y + T - 2), ol)
    if not down and not right:
        surf.set_at((x + T - 1, y + T - 1), clear)
        surf.set_at((x + T - 2, y + T - 2), ol)


# ------------------------------------------------------------------ backdrops
def _poly_wrap(surf, color, pts, w):
    for shift in (-w, 0, w):
        pygame.draw.polygon(surf, color, [(px + shift, py) for px, py in pts])


def _ridge(rng, w, base, amps):
    terms = [(a, k, rng.uniform(0, math.tau)) for k, a in amps]
    return lambda x: base - sum(a * math.sin(math.tau * k * x / w + ph) for a, k, ph in terms)


def make_backdrop(world):
    pal = WORLDS[world]
    rng = random.Random(world * 101 + 7)
    style = pal['style']
    W, H = 640, VIEW_H + 140
    layers = []
    far = pygame.Surface((W, H), pygame.SRCALPHA)
    mid = pygame.Surface((W, H), pygame.SRCALPHA)
    bands = pal['bands']
    for i, col in enumerate(bands):
        hgt = (len(bands) - i) * 24
        far.fill(col, (0, H - hgt, W, hgt))
    if style == 'cave':
        for _ in range(16):
            x, w, h = rng.uniform(0, W), rng.uniform(26, 80), rng.uniform(60, 190)
            _poly_wrap(far, pal['far'], [(x - w / 2, 0), (x + w / 2, 0), (x + w * 0.18, h * 0.55),
                                         (x + 2, h), (x - w * 0.2, h * 0.5)], W)
        for _ in range(11):
            x, w, h = rng.uniform(0, W), rng.uniform(30, 90), rng.uniform(50, 150)
            _poly_wrap(far, pal['far'], [(x - w / 2, H), (x - w * 0.1, H - h * 0.6), (x, H - h),
                                         (x + w * 0.15, H - h * 0.55), (x + w / 2, H)], W)
        for _ in range(8):
            x, w, h = rng.uniform(0, W), rng.uniform(50, 120), rng.uniform(90, 230)
            _poly_wrap(mid, pal['mid'], [(x - w / 2, 0), (x + w / 2, 0), (x + w * 0.12, h * 0.6),
                                         (x - 3, h), (x - w * 0.22, h * 0.45)], W)
        for _ in range(5):
            x, length = rng.uniform(0, W), rng.randint(40, 150)
            for yy in range(0, length, 4):
                mid.fill(pal['mid'], (int(x) - 1, yy, 3, 3))
            mid.fill(pal['mid'], (int(x) - 4, length, 9, 6))
    elif style == 'ruins':
        for _ in range(12):
            x, w, h = rng.uniform(0, W), rng.uniform(24, 60), rng.uniform(70, 220)
            top = H - h
            pts = [(x, H), (x, top)]
            for k in range(int(w // 8) + 1):
                px = x + min(w, k * 8)
                pts += [(px, top), (px, top - (6 if k % 2 == 0 else 0))]
            pts += [(x + w, top), (x + w, H)]
            _poly_wrap(far, pal['far'], pts, W)
            for k in range(rng.randint(1, 3)):
                wy = int(top + 16 + k * 26)
                for shift in (-W, 0, W):
                    far.fill(pal['bands'][0], (int(x + w / 2 - 3 + shift), wy, 6, 10))
        for _ in range(6):
            x, w, h = rng.uniform(0, W), rng.uniform(28, 46), rng.uniform(120, 300)
            top = H - h
            pts = [(x, H), (x, top + 10), (x + w * 0.3, top), (x + w * 0.55, top + 14),
                   (x + w * 0.8, top + 4), (x + w, top + 12), (x + w, H)]
            _poly_wrap(mid, pal['mid'], pts, W)
            for k in range(rng.randint(2, 5)):
                vx, length = x + rng.uniform(4, w - 4), rng.randint(20, 90)
                for shift in (-W, 0, W):
                    pygame.draw.line(mid, pal['far'], (vx + shift, top + 12), (vx + shift, top + 12 + length))
    else:
        sun = pygame.Surface((W, H), pygame.SRCALPHA)
        cx, cy = 430, 86
        dim = tuple(int(v * 0.55) for v in pal['sun'])
        pygame.draw.circle(sun, tuple(int(v * 0.35) for v in pal['sun']), (cx, cy), 58)
        pygame.draw.circle(sun, dim, (cx, cy), 46)
        pygame.draw.circle(sun, pal['sun'], (cx, cy), 36)
        layers.append((sun, 0.02, 0.03))
        ridge = _ridge(rng, W, H - 150, [(1, 30), (2, 22), (3, 14), (5, 8), (9, 4)])
        rim = tuple(int(a + (b - a) * 0.45) for a, b in zip(pal['far'], pal['tile_top']))
        pts = [(0, H)] + [(x, ridge(x)) for x in range(0, W + 1, 8)] + [(W, H)]
        pygame.draw.polygon(far, rim, pts)
        pygame.draw.polygon(far, pal['far'], [(x, y + 5 if 0 < i < len(pts) - 1 else y) for i, (x, y) in enumerate(pts)])
        ridge2 = _ridge(rng, W, H - 70, [(1, 26), (2, 18), (4, 10), (7, 5)])
        rim2 = tuple(int(a + (b - a) * 0.35) for a, b in zip(pal['mid'], pal['tile_top']))
        pts = [(0, H)] + [(x, ridge2(x)) for x in range(0, W + 1, 8)] + [(W, H)]
        pygame.draw.polygon(mid, rim2, pts)
        pygame.draw.polygon(mid, pal['mid'], [(x, y + 4 if 0 < i < len(pts) - 1 else y) for i, (x, y) in enumerate(pts)])
        for _ in range(4):
            x, s = rng.uniform(0, W), rng.uniform(40, 80)
            base = ridge2(x % W) + 10
            for k in range(5):
                rx = x + (k - 2) * s * 0.28
                for shift in (-W, 0, W):
                    rect = pygame.Rect(0, 0, int(s * 0.5), int(s * (1.3 - abs(k - 2) * 0.18)))
                    rect.midbottom = (int(rx + shift), int(base + rect.h * 0.5))
                    pygame.draw.arc(mid, rim2, rect, 0, math.pi, 4)
    layers.append((far, 0.12, 0.08))
    layers.append((mid, 0.3, 0.18))
    return layers


def draw_backdrop(surf, layers, cam_x, cam_y, cam_max_y):
    for img, fx, fy in layers:
        w, h = img.get_size()
        x = -(int(cam_x * fx) % w)
        y = (VIEW_H - h) + int((cam_max_y - cam_y) * fy)
        y = max(VIEW_H - h, min(0, y))
        surf.blit(img, (x, y))
        surf.blit(img, (x + w, y))
