"""Particles, additive glows and dash afterimages."""
import math
import random

import pygame

_glow_cache = {}


def glow_sprite(radius, color, bands=5, strength=0.42):
    """Banded radial glow meant for additive blending (keeps the pixel-art look)."""
    radius = max(2, int(radius))
    key = (radius, color, bands, strength)
    surf = _glow_cache.get(key)
    if surf is None:
        surf = pygame.Surface((radius * 2 + 1, radius * 2 + 1))
        surf.fill((0, 0, 0))
        for i in range(bands):
            k = (i + 1) / bands
            r = int(radius * (1.0 - i / bands))
            c = tuple(min(255, int(ch * strength * k * k)) for ch in color)
            pygame.draw.circle(surf, c, (radius, radius), max(1, r))
        if len(_glow_cache) > 300:
            _glow_cache.clear()
        _glow_cache[key] = surf
    return surf


def draw_glow(surf, x, y, radius, color, strength=0.42):
    g = glow_sprite(radius, color, strength=strength)
    r = g.get_width() // 2
    surf.blit(g, (int(x) - r, int(y) - r), special_flags=pygame.BLEND_RGB_ADD)


def lerp_color(a, b, t):
    return (int(a[0] + (b[0] - a[0]) * t), int(a[1] + (b[1] - a[1]) * t), int(a[2] + (b[2] - a[2]) * t))


class Particle:
    __slots__ = ('x', 'y', 'vx', 'vy', 'life', 'max_life', 'size', 'color', 'color2',
                 'grav', 'drag', 'kind', 'shrink', 'spin')


class Particles:
    def __init__(self):
        self.items = []
        self.ghosts = []

    def clear(self):
        self.items.clear()
        self.ghosts.clear()

    def add(self, x, y, vx, vy, life, size, color, color2=None, grav=0.0, drag=0.0,
            kind='dot', shrink=True):
        p = Particle()
        p.x, p.y, p.vx, p.vy = x, y, vx, vy
        p.life = p.max_life = max(0.01, life)
        p.size, p.color, p.color2 = size, color, color2
        p.grav, p.drag, p.kind, p.shrink = grav, drag, kind, shrink
        p.spin = random.uniform(0, math.tau)
        self.items.append(p)
        return p

    # -------------------------------------------------------------- emitters
    def burst(self, x, y, n, colors, speed=(40, 120), life=(0.25, 0.55), size=(1, 3),
              grav=0.0, drag=3.0, kind='dot', angle=None, spread=math.tau, color2=None):
        for _ in range(n):
            a = (angle if angle is not None else 0.0) + random.uniform(-spread / 2, spread / 2)
            sp = random.uniform(*speed)
            self.add(x, y, math.cos(a) * sp, math.sin(a) * sp, random.uniform(*life),
                     random.uniform(*size), random.choice(colors), color2, grav, drag, kind)

    def dust(self, x, y, n, color, dirx=0.0, up=1.0):
        for _ in range(n):
            self.add(x + random.uniform(-3, 3), y - random.uniform(0, 2),
                     dirx * random.uniform(20, 70) + random.uniform(-30, 30),
                     -random.uniform(5, 35) * up, random.uniform(0.25, 0.5),
                     random.uniform(1.5, 3.5), color, None, -20.0, 4.0, 'circle')

    def ring(self, x, y, radius, color, life=0.35):
        self.add(x, y, 0, 0, life, radius, color, None, 0, 0, 'ring')

    def debris(self, x, y, n, colors, power=1.0):
        for _ in range(n):
            a = random.uniform(-math.pi, 0)
            sp = random.uniform(60, 190) * power
            self.add(x + random.uniform(-6, 6), y + random.uniform(-6, 6),
                     math.cos(a) * sp, math.sin(a) * sp, random.uniform(0.5, 0.9),
                     random.uniform(2, 4), random.choice(colors), None, 700.0, 0.5, 'chunk', False)

    def ghost(self, surf_img, x, y, life=0.22):
        self.ghosts.append([surf_img, x, y, life, life])

    # ---------------------------------------------------------------- update
    def update(self, dt):
        alive = []
        for p in self.items:
            p.life -= dt
            if p.life <= 0:
                continue
            if p.drag:
                f = max(0.0, 1.0 - p.drag * dt)
                p.vx *= f
                p.vy *= f
            p.vy += p.grav * dt
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.spin += dt * 8
            alive.append(p)
        self.items = alive
        for g in self.ghosts:
            g[3] -= dt
        self.ghosts = [g for g in self.ghosts if g[3] > 0]

    def draw_ghosts(self, surf, ox, oy):
        for img, x, y, life, mx in self.ghosts:
            img.set_alpha(int(170 * life / mx))
            surf.blit(img, (int(x - ox), int(y - oy)))

    def draw(self, surf, ox, oy):
        circle, line, fill = pygame.draw.circle, pygame.draw.line, surf.fill
        for p in self.items:
            t = p.life / p.max_life
            c = p.color if p.color2 is None else lerp_color(p.color2, p.color, t)
            x, y = int(p.x - ox), int(p.y - oy)
            if x < -40 or y < -40 or x > 520 or y > 310:
                continue
            k = p.kind
            if k == 'dot':
                s = max(1, int(p.size * t + 0.5) if p.shrink else int(p.size))
                fill(c, (x - s // 2, y - s // 2, s, s))
            elif k == 'circle':
                r = p.size * t if p.shrink else p.size
                if r >= 0.5:
                    circle(surf, c, (x, y), max(1, int(r)))
            elif k == 'spark':
                line(surf, c, (x, y), (int(x - p.vx * 0.03), int(y - p.vy * 0.03)))
            elif k == 'ring':
                r = int(p.size * (1.0 - t * t)) + 2
                circle(surf, c, (x, y), r, max(1, int(3 * t + 0.5)))
            elif k == 'orb':
                r = max(1, int(p.size * (0.4 + 0.6 * t)))
                circle(surf, (20, 12, 12), (x, y), r + 1)
                circle(surf, c, (x, y), r)
            elif k == 'chunk':
                s = int(p.size)
                w = max(1, int(abs(math.cos(p.spin)) * s + 0.5))
                fill(c, (x - w // 2, y - s // 2, w, s))
            elif k == 'glow':
                draw_glow(surf, x, y, p.size * t, c)
