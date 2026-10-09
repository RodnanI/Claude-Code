"""Everything in a level that is not rock: pickups, springs, platforms and foes."""
import math
import random

import pygame

from fx import draw_glow
from level import Level, tile_art, hash2
from settings import (TILE, VIEW_W, VIEW_H, GRAVITY, MAX_FALL, SPRING_SPEED, PLATFORM_SPEED,
                      CRYSTAL_RESPAWN, CRUMBLE_DELAY, CRUMBLE_RESPAWN, OUTLINE, PLAYER_BODY,
                      CRYSTAL, CRYSTAL_DARK, CRYSTAL_HI, EMBER, EMBER_HI, EMBER_DARK,
                      SPRING_BASE, SPRING_COIL, SPRING_PAD, WALKER_BODY, WALKER_EYE,
                      WALKER_PUPIL, FLYER_BODY, FLYER_STRIPE, FLYER_WING, SCARF_READY)


def _bumper(lvl, c, r):
    return 0 <= c < lvl.cols and 0 <= r < lvl.nrows and lvl.bumper[r][c]


class Entity:
    touchable = True
    layer = 1

    def __init__(self, x, y, w, h):
        self.x, self.y, self.w, self.h = x, y, w, h
        self.alive = True

    def overlaps(self, p):
        return p.x < self.x + self.w and p.x + p.w > self.x and p.y < self.y + self.h and p.y + p.h > self.y

    def visible(self, ox, oy, pad=40):
        return (self.x + self.w > ox - pad and self.x < ox + VIEW_W + pad and
                self.y + self.h > oy - pad and self.y < oy + VIEW_H + pad)

    def update(self, sc, dt):
        pass

    def touch(self, sc, p):
        pass

    def reset(self, sc):
        pass

    def draw(self, surf, ox, oy, t):
        pass


def _diamond(surf, cx, cy, w, h, fill, outline=OUTLINE):
    pygame.draw.polygon(surf, outline, [(cx, cy - h - 1), (cx + w + 1, cy), (cx, cy + h + 1), (cx - w - 1, cy)])
    pygame.draw.polygon(surf, fill, [(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)])


# ---------------------------------------------------------------- pickups
class Ember(Entity):
    def __init__(self, c, r):
        super().__init__(c * TILE + 3, r * TILE + 3, 10, 10)
        self.phase = random.uniform(0, math.tau)

    def touch(self, sc, p):
        self.alive = False
        sc.collect_ember(self)

    def draw(self, surf, ox, oy, t):
        cx = int(self.x + 5 - ox)
        cy = int(self.y + 5 - oy + math.sin(t * 3 + self.phase) * 2)
        draw_glow(surf, cx, cy, 11, EMBER, 0.3)
        w = max(1, int(4 * abs(math.cos(t * 2.2 + self.phase)) + 0.5))
        _diamond(surf, cx, cy, w, 5, EMBER)
        if w > 1:
            pygame.draw.polygon(surf, EMBER_DARK, [(cx, cy), (cx + w, cy), (cx, cy + 5)])
        surf.fill(EMBER_HI, (cx - (w > 2), cy - 3, 1 + (w > 2), 2))


class Crystal(Entity):
    def __init__(self, c, r):
        super().__init__(c * TILE + 2, r * TILE + 2, 12, 12)
        self.timer = 0.0
        self.phase = random.uniform(0, math.tau)

    def update(self, sc, dt):
        if self.timer > 0:
            self.timer -= dt
            if self.timer <= 0:
                sc.particles.burst(self.x + 6, self.y + 6, 8, (CRYSTAL, CRYSTAL_HI), speed=(20, 60), life=(0.2, 0.4))

    def touch(self, sc, p):
        if self.timer <= 0 and p.refill_dash(sc):
            self.timer = CRYSTAL_RESPAWN
            cx, cy = self.x + 6, self.y + 6
            sc.particles.burst(cx, cy, 14, (CRYSTAL, CRYSTAL_HI, CRYSTAL_DARK), speed=(60, 170),
                               life=(0.3, 0.6), size=(2, 4), grav=320, kind='chunk')
            sc.particles.ring(cx, cy, 18, CRYSTAL_HI, 0.3)
            sc.audio.play('refill')
            sc.hitstop(0.035)
            sc.camera.shake(0.12)

    def reset(self, sc):
        self.timer = 0.0

    def draw(self, surf, ox, oy, t):
        cx = int(self.x + 6 - ox)
        cy = int(self.y + 6 - oy + math.sin(t * 2.5 + self.phase) * 1.5)
        if self.timer > 0:
            pts = [(cx, cy - 7), (cx + 4, cy), (cx, cy + 7), (cx - 4, cy)]
            if self.timer < 0.5:
                if int(t * 20) % 2:
                    pygame.draw.polygon(surf, CRYSTAL_DARK, pts, 1)
            else:
                for px, py in pts:
                    surf.fill(CRYSTAL_DARK, (px, py, 1, 1))
            return
        draw_glow(surf, cx, cy, 15, CRYSTAL, 0.35)
        w = 2 + int(3 * abs(math.cos(t * 1.8 + self.phase)))
        _diamond(surf, cx, cy, w, 7, CRYSTAL)
        pygame.draw.polygon(surf, CRYSTAL_DARK, [(cx, cy), (cx + w, cy), (cx, cy + 7)])
        surf.fill(CRYSTAL_HI, (cx - 1, cy - 4, 1, 3))


# ---------------------------------------------------------------- springs
_spring_cache = {}


def _spring_img(ext, d):
    key = (ext, d)
    img = _spring_cache.get(key)
    if img is None:
        img = pygame.Surface((16, 16), pygame.SRCALPHA)
        img.fill(OUTLINE, (1, 12, 14, 4))
        img.fill(SPRING_BASE, (2, 13, 12, 2))
        top = 12 - ext
        for i in range(ext):
            x = 4 if i % 2 == 0 else 9
            pygame.draw.line(img, SPRING_COIL, (x, 12 - i), (x + 3, 12 - i))
        img.fill(OUTLINE, (0, top - 3, 16, 4))
        img.fill(SPRING_PAD, (1, top - 2, 14, 2))
        img.fill((255, 170, 140), (2, top - 2, 12, 1))
        img = {'up': img, 'down': pygame.transform.rotate(img, 180),
               'right': pygame.transform.rotate(img, -90), 'left': pygame.transform.rotate(img, 90)}[d]
        _spring_cache[key] = img
    return img


class Spring(Entity):
    def __init__(self, c, r, lvl):
        x, y = c * TILE, r * TILE
        if lvl.is_solid(c, r + 1):
            d = 'up'
        elif lvl.is_solid(c - 1, r):
            d = 'right'
        elif lvl.is_solid(c + 1, r):
            d = 'left'
        elif lvl.is_solid(c, r - 1):
            d = 'down'
        else:
            d = 'up'
        box = {'up': (x + 1, y + 9, 14, 7), 'down': (x + 1, y, 14, 7),
               'right': (x, y + 1, 7, 14), 'left': (x + 9, y + 1, 7, 14)}[d]
        super().__init__(*box)
        self.dir, self.ax, self.ay = d, x, y
        self.anim = 0.0
        self.cool = 0.0

    def update(self, sc, dt):
        self.anim = max(0.0, self.anim - dt * 3.5)
        self.cool -= dt

    def touch(self, sc, p):
        if self.cool > 0 or (self.dir == 'up' and p.vy < -SPRING_SPEED * 0.6):
            return
        p.spring(sc, self.dir)
        self.anim, self.cool = 1.0, 0.15
        sc.audio.play('spring')
        sc.camera.shake(0.12)
        sc.particles.burst(self.x + self.w / 2, self.y + self.h / 2, 8, (SPRING_COIL, (255, 255, 255)),
                           speed=(40, 120), life=(0.15, 0.35))

    def draw(self, surf, ox, oy, t):
        ext = 3 + int(6 * math.sin(self.anim * math.pi)) if self.anim > 0 else 3
        surf.blit(_spring_img(ext, self.dir), (self.ax - ox, self.ay - oy))


# ---------------------------------------------------------- checkpoint/exit
class Checkpoint(Entity):
    def __init__(self, c, r, lvl):
        super().__init__(c * TILE, r * TILE - TILE, TILE, TILE * 2)
        self.c, self.r, self.pal = c, r, lvl.pal
        self.active = False
        self.raise_t = 0.0

    @property
    def spawn(self):
        return Level.foot_pos(self.c, self.r)

    def touch(self, sc, p):
        if not self.active:
            sc.set_checkpoint(self)

    def activate(self, sc):
        self.active = True
        self.raise_t = 0.0
        sc.particles.burst(self.x + 8, self.y + 8, 26, (self.pal['accent'], EMBER, PLAYER_BODY),
                           speed=(60, 190), life=(0.4, 0.9), grav=260, drag=2.0, size=(1, 3))
        sc.particles.ring(self.x + 8, self.y + 10, 22, self.pal['accent'], 0.35)
        sc.audio.play('checkpoint')

    def update(self, sc, dt):
        if self.active:
            self.raise_t = min(1.0, self.raise_t + dt * 3.0)

    def draw(self, surf, ox, oy, t):
        px, base = int(self.x + 4 - ox), int(self.y + 32 - oy)
        top = base - 26
        surf.fill(OUTLINE, (px - 1, top - 1, 4, 27))
        surf.fill((206, 194, 178), (px, top, 2, 26))
        surf.fill(OUTLINE, (px - 4, base - 4, 10, 4))
        surf.fill(self.pal['detail'], (px - 3, base - 3, 8, 3))
        if self.active:
            col = self.pal['accent']
            fy = top + int((1 - self.raise_t) * 15)
            draw_glow(surf, px + 7, fy + 4, 16, col, 0.25)
            for i in range(10):
                yy = fy + int(math.sin(t * 8 - i * 0.6) * 1.5)
                h = max(1, 8 - int(i * 0.55))
                surf.fill(OUTLINE, (px + 2 + i, yy - 1, 1, h + 2))
                surf.fill(col if i % 4 != 3 else EMBER_HI, (px + 2 + i, yy, 1, h))
        else:
            pts = [(px + 2, top + 2), (px + 6, top + 3), (px + 4, top + 11), (px + 2, top + 10)]
            pygame.draw.polygon(surf, (96, 88, 84), pts)
            pygame.draw.polygon(surf, OUTLINE, pts, 1)


class Exit(Entity):
    def __init__(self, c, r, lvl):
        super().__init__(c * TILE + 2, r * TILE - 14, 12, 30)
        self.cx, self.cy = c * TILE + 8, r * TILE - 2
        self.pal = lvl.pal
        self.spawn_t = 0.0

    def update(self, sc, dt):
        self.spawn_t -= dt
        if self.spawn_t <= 0:
            self.spawn_t = 0.05
            a = random.uniform(0, math.tau)
            rr = random.uniform(14, 22)
            sc.particles.add(self.cx + math.cos(a) * rr, self.cy + math.sin(a) * rr * 1.3,
                             -math.cos(a) * 40, -math.sin(a) * 52, 0.45, 2, (255, 255, 255), self.pal['accent'])

    def touch(self, sc, p):
        sc.complete_level(self)

    def draw(self, surf, ox, oy, t):
        cx, cy = int(self.cx - ox), int(self.cy - oy)
        acc = self.pal['accent']
        draw_glow(surf, cx, cy, 30, acc, 0.35)
        pygame.draw.ellipse(surf, OUTLINE, (cx - 8, cy - 13, 16, 26))
        pygame.draw.ellipse(surf, acc, (cx - 6, cy - 11, 12, 22), 1)
        r = 2 + int(abs(math.sin(t * 5)) * 2)
        pygame.draw.circle(surf, EMBER_HI, (cx, cy), r)
        for i in range(14):
            a = t * 2.2 + i * math.tau / 14
            x, y = cx + math.cos(a) * 11, cy + math.sin(a) * 16
            surf.fill(EMBER_HI if i % 2 else acc, (int(x) - 1, int(y) - 1, 3, 3))


class Anchor(Entity):
    touchable = False

    def __init__(self, c, r):
        super().__init__(c * TILE + 3, r * TILE + 3, 10, 10)
        self.cx, self.cy = c * TILE + 8, r * TILE + 8
        self.pulse = 0.0
        self.hot = False

    def update(self, sc, dt):
        self.pulse = max(0.0, self.pulse - dt * 3)

    def draw(self, surf, ox, oy, t):
        cx, cy = int(self.cx - ox), int(self.cy - oy)
        col = (255, 228, 168) if self.hot else (160, 142, 126)
        if self.hot:
            draw_glow(surf, cx, cy, 12 + int(self.pulse * 10), EMBER, 0.3)
        for dx, dy in ((-7, 0), (6, 0), (0, -7), (0, 6)):
            surf.fill(OUTLINE, (cx + dx, cy + dy, 2, 2))
        pygame.draw.circle(surf, OUTLINE, (cx, cy), 6)
        pygame.draw.circle(surf, col, (cx, cy), 5, 2)
        surf.fill(col, (cx - 1, cy - 1, 2, 2))


# ---------------------------------------------------------- dynamic rock
class Crumble(Entity):
    touchable = False
    layer = 0

    def __init__(self, cells, lvl):
        cells = sorted(cells)
        c0, r = cells[0]
        super().__init__(c0 * TILE, r * TILE, len(cells) * TILE, TILE)
        self.cells, self.lvl = cells, lvl
        self.state = 'idle'
        self.timer = 0.0
        self.img = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
        cs = set(cells)
        for c, rr in cells:
            tile_art(self.img, lvl, c, rr, lambda a, b: (a, b) in cs, self.x, self.y)
            x, h = c * TILE - self.x, hash2(c, rr, 9)
            pygame.draw.lines(self.img, lvl.outline, False, [(x + 3 + h % 4, 5), (x + 7, 8 + h % 3), (x + 6 + h % 5, 13)])
            pygame.draw.line(self.img, lvl.outline, (x + 7, 8), (x + 12, 7 + (h >> 3) % 4))

    def _triggered(self, p):
        if p.dead:
            return False
        if p.on_ground and p.y + p.h == self.y and p.x + p.w > self.x and p.x < self.x + self.w:
            return True
        if p.sliding and p.y + p.h > self.y and p.y < self.y + self.h:
            return (p.x + p.w == self.x and p.facing > 0) or (p.x == self.x + self.w and p.facing < 0)
        return False

    def update(self, sc, dt):
        if self.state == 'idle':
            if self._triggered(sc.player):
                self.state, self.timer = 'shake', CRUMBLE_DELAY
                sc.audio.play('crumble', 0.7)
        elif self.state == 'shake':
            self.timer -= dt
            if self.timer <= 0:
                self.state, self.timer = 'gone', CRUMBLE_RESPAWN
                pal = self.lvl.pal
                for c, r in self.cells:
                    self.lvl.solid[r][c] = False
                    sc.particles.debris(c * TILE + 8, r * TILE + 8, 4, (pal['tile'], pal['tile_dark'], pal['tile_top']), 0.5)
        elif self.state == 'gone':
            self.timer -= dt
            p = sc.player
            blocked = (not p.dead and p.x < self.x + self.w + 2 and p.x + p.w > self.x - 2 and
                       p.y < self.y + self.h + 2 and p.y + p.h > self.y - 2)
            if self.timer <= 0 and not blocked:
                self.restore()
                sc.particles.burst(self.x + self.w / 2, self.y + 8, 8, (self.lvl.pal['tile_top'],),
                                   speed=(20, 50), life=(0.2, 0.4))

    def restore(self):
        self.state = 'idle'
        for c, r in self.cells:
            self.lvl.solid[r][c] = True

    def reset(self, sc):
        self.restore()

    def draw(self, surf, ox, oy, t):
        if self.state == 'gone':
            if self.timer < 0.45 and int(t * 16) % 2 == 0:
                pygame.draw.rect(surf, self.lvl.pal['tile_dark'], (self.x - ox, self.y - oy, self.w, self.h), 1)
            return
        dx = dy = 0
        if self.state == 'shake':
            dx, dy = random.randint(-1, 1), random.randint(0, 1)
        surf.blit(self.img, (self.x - ox + dx, self.y - oy + dy))


class Breakable(Entity):
    touchable = False
    layer = 0

    def __init__(self, cells, lvl):
        xs, ys = [c for c, _ in cells], [r for _, r in cells]
        c0, r0 = min(xs), min(ys)
        super().__init__(c0 * TILE, r0 * TILE, (max(xs) - c0 + 1) * TILE, (max(ys) - r0 + 1) * TILE)
        self.cells, self.lvl = set(cells), lvl
        self.img = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
        pal, ol = lvl.pal, lvl.outline
        for c, r in cells:
            x, y = c * TILE - self.x, r * TILE - self.y
            self.img.fill(ol, (x, y, TILE, TILE))
            self.img.fill(pal['tile_dark'], (x + 1, y + 1, TILE - 2, TILE - 2))
            self.img.fill(pal['tile'], (x + 2, y + 2, TILE - 4, TILE - 4))
            self.img.fill(pal['tile_edge'], (x + 2, y + 2, TILE - 4, 1))
            h = hash2(c, r, 5)
            pygame.draw.lines(self.img, pal['vein'], False,
                              [(x + 3, y + 4 + h % 3), (x + 7, y + 8), (x + 12, y + 5 + (h >> 2) % 4)])
            pygame.draw.lines(self.img, pal['vein'], False, [(x + 7, y + 8), (x + 6, y + 13)])

    def hits(self, x, y, w, h):
        cells = self.cells
        for r in range(y // TILE, (y + h - 1) // TILE + 1):
            for c in range(x // TILE, (x + w - 1) // TILE + 1):
                if (c, r) in cells:
                    return True
        return False

    def smash(self, sc, p):
        self.alive = False
        pal = self.lvl.pal
        for c, r in self.cells:
            self.lvl.solid[r][c] = False
            sc.particles.debris(c * TILE + 8, r * TILE + 8, 6, (pal['tile'], pal['tile_dark'], pal['vein']), 1.0)
        sc.particles.ring(self.x + self.w / 2, self.y + self.h / 2, 26, pal['vein'], 0.3)
        sc.audio.play('break')
        sc.hitstop(0.05)
        sc.camera.shake(0.35)
        sc.camera.kick(p.dash_dx * 4, p.dash_dy * 4)

    def draw(self, surf, ox, oy, t):
        surf.blit(self.img, (self.x - ox, self.y - oy))
        k = 0.12 + 0.08 * math.sin(t * 4 + self.x * 0.1)
        for c, r in self.cells:
            draw_glow(surf, c * TILE + 8 - ox, r * TILE + 8 - oy, 9, self.lvl.pal['vein'], k)


class Mover(Entity):
    touchable = False
    layer = 0

    def __init__(self, c, r, n, axis, lvl):
        super().__init__(c * TILE, r * TILE, n * TILE, 8)
        self.axis, self.lvl = axis, lvl
        self.dir = 1 if axis == 'h' else -1
        self.rem = 0.0
        self.vx = self.vy = 0.0
        self.home = (self.x, self.y, self.dir)

    def _blocked(self, nx, ny):
        lvl = self.lvl
        if ny < 0 or ny + self.h > lvl.ph:
            return True
        for r in range(ny // TILE, (ny + self.h - 1) // TILE + 1):
            for c in range(nx // TILE, (nx + self.w - 1) // TILE + 1):
                if lvl.is_solid(c, r) or _bumper(lvl, c, r):
                    return True
        return False

    def rides(self, p):
        return not p.dead and p.vy >= 0 and p.y + p.h == self.y and p.x + p.w > self.x and p.x < self.x + self.w

    def update(self, sc, dt):
        self.rem += PLATFORM_SPEED * dt
        steps = int(self.rem)
        self.rem -= steps
        p = sc.player
        for _ in range(steps):
            dx = self.dir if self.axis == 'h' else 0
            dy = self.dir if self.axis == 'v' else 0
            if self._blocked(self.x + dx, self.y + dy):
                self.dir = -self.dir
                break
            riding = self.rides(p)
            self.x += dx
            self.y += dy
            if riding:
                p.carry(sc, dx, dy)
        self.vx = self.dir * PLATFORM_SPEED if self.axis == 'h' else 0.0
        self.vy = self.dir * PLATFORM_SPEED if self.axis == 'v' else 0.0

    def reset(self, sc):
        self.x, self.y, self.dir = self.home
        self.rem = 0.0

    def draw(self, surf, ox, oy, t):
        x, y = self.x - ox, self.y - oy
        pal, ol = self.lvl.pal, self.lvl.outline
        surf.fill(ol, (x, y, self.w, 8))
        surf.fill(pal['plank'], (x + 1, y + 1, self.w - 2, 6))
        surf.fill(pal['plank_hi'], (x + 1, y + 1, self.w - 2, 1))
        for i in range(self.w // 8):
            surf.fill(ol, (x + 3 + i * 8, y + 4, 2, 1))
        for gx in (x + 4, x + self.w - 5):
            pygame.draw.circle(surf, ol, (gx, y + 8), 3)
            a = t * 6 * self.dir
            surf.fill(pal['plank_hi'], (gx + int(math.cos(a) * 2), y + 8 + int(math.sin(a) * 2), 1, 1))


# -------------------------------------------------------------------- foes
class Enemy(Entity):
    colors = (WALKER_BODY, WALKER_EYE)

    def touch(self, sc, p):
        if p.dashing or p.post_dash > 0:
            self.kill(sc, p, True)
        elif p.vy > 0 and p.prev_y + p.h <= self.y + 6:
            self.kill(sc, p, False)
            p.bounce(sc)
        else:
            p.die(sc)

    def kill(self, sc, p, by_dash):
        self.alive = False
        cx, cy = self.x + self.w / 2, self.y + self.h / 2
        sc.particles.burst(cx, cy, 16, self.colors + (SCARF_READY,), speed=(60, 200), life=(0.3, 0.6),
                           size=(2, 4), grav=420, kind='chunk')
        sc.particles.ring(cx, cy, 16, (255, 255, 255), 0.25)
        sc.audio.play('enemy' if by_dash else 'stomp')
        sc.hitstop(0.05)
        sc.camera.shake(0.25)
        p.refill_dash(sc)
        sc.kills += 1

    def reset(self, sc):
        self.alive = True
        self.x, self.y = self.home
        self.rx = 0.0
        self.vx = self.home_vx
        self.vy = 0.0


class Walker(Enemy):
    def __init__(self, c, r, lvl):
        super().__init__(c * TILE + 1, r * TILE + 4, 14, 12)
        self.lvl = lvl
        self.home = (self.x, self.y)
        self.vx = self.home_vx = -40.0
        self.vy = 0.0
        self.rx = self.ry = 0.0
        self.squish = 0.0
        self.anim = random.uniform(0, 6)

    def _ground(self, px, py):
        lvl = self.lvl
        c, r = px // TILE, py // TILE
        return lvl.is_solid(c, r) or (py % TILE == 0 and 0 <= r < lvl.nrows and 0 <= c < lvl.cols and lvl.oneway[r][c])

    def update(self, sc, dt):
        lvl = self.lvl
        self.anim += dt * 9
        self.squish = max(0.0, self.squish - dt * 5)
        on_ground = lvl.collide(self.x, self.y + 1, self.w, self.h) or lvl.oneway_at(self.x, self.y + self.h, self.w)
        self.rx += self.vx * dt
        mx = int(self.rx)
        self.rx -= mx
        step = 1 if mx > 0 else -1
        for _ in range(abs(mx)):
            nx = self.x + step
            foot = nx + self.w - 1 if step > 0 else nx
            if lvl.collide(nx, self.y, self.w, self.h) or (on_ground and not self._ground(foot, self.y + self.h)):
                self.vx, self.squish = -self.vx, 1.0
                break
            self.x = nx
        if on_ground and self.vy >= 0:
            self.vy = 0.0
            return
        self.vy = min(self.vy + GRAVITY * dt, MAX_FALL)
        self.ry += self.vy * dt
        my = int(self.ry)
        self.ry -= my
        for _ in range(abs(my)):
            if lvl.collide(self.x, self.y + 1, self.w, self.h) or lvl.oneway_at(self.x, self.y + self.h, self.w):
                self.vy = self.ry = 0.0
                break
            self.y += 1
        if self.y > lvl.ph:
            self.alive = False

    def draw(self, surf, ox, oy, t):
        x, y = int(self.x - ox), int(self.y - oy)
        sq = self.squish
        w, h = int(self.w + sq * 3), int(self.h - 2 - sq * 2)
        bx, by = x + (self.w - w) // 2, y + self.h - 2 - h
        for i, lx in enumerate((bx + 2, bx + w - 4)):
            off = int(math.sin(self.anim + i * math.pi) * 1.5)
            surf.fill(OUTLINE, (lx, y + self.h - 3 - max(0, off), 2, 3))
        body = pygame.Rect(bx, by, w, h)
        pygame.draw.rect(surf, OUTLINE, body.inflate(2, 2), border_radius=5)
        pygame.draw.rect(surf, WALKER_BODY, body, border_radius=4)
        surf.fill((70, 56, 58), (bx + 2, by + 1, w - 4, 1))
        d = 1 if self.vx > 0 else -1
        ex, ey = bx + w // 2 + d * 2, by + 3
        surf.fill(WALKER_EYE, (ex - 2, ey, 5, 4))
        surf.fill(WALKER_PUPIL, (ex + (1 if d > 0 else -1), ey + 1, 2, 2))
        surf.fill(OUTLINE, (ex - 3, ey - 1, 7, 1))


class Flyer(Enemy):
    colors = (FLYER_BODY, FLYER_STRIPE)

    def __init__(self, c, r, lvl):
        super().__init__(c * TILE + 2, r * TILE + 3, 12, 10)
        self.lvl = lvl
        self.home = (self.x, self.y)
        self.base_y = self.y
        self.vx = self.home_vx = 45.0
        self.vy = 0.0
        self.rx = 0.0
        self.t = random.uniform(0, 6)

    def _blocked(self, nx):
        lvl = self.lvl
        for r in range((self.base_y - 6) // TILE, (self.base_y + 6 + self.h - 1) // TILE + 1):
            for c in range(nx // TILE, (nx + self.w - 1) // TILE + 1):
                if lvl.is_solid(c, r) or _bumper(lvl, c, r):
                    return True
        return False

    def update(self, sc, dt):
        self.t += dt
        self.rx += self.vx * dt
        mx = int(self.rx)
        self.rx -= mx
        step = 1 if mx > 0 else -1
        for _ in range(abs(mx)):
            if self._blocked(self.x + step):
                self.vx = -self.vx
                break
            self.x += step
        self.y = self.base_y + round(math.sin(self.t * 3) * 6)

    def reset(self, sc):
        super().reset(sc)
        self.y = self.base_y

    def draw(self, surf, ox, oy, t):
        x, y = int(self.x - ox), int(self.y - oy)
        d = 1 if self.vx > 0 else -1
        wy = y - 3 if int(t * 30) % 2 else y - 1
        surf.fill(OUTLINE, (x + 2, wy - 1, 8, 4))
        surf.fill(FLYER_WING, (x + 3, wy, 6, 2))
        body = pygame.Rect(x, y + 1, 12, 8)
        pygame.draw.ellipse(surf, OUTLINE, body.inflate(2, 2))
        pygame.draw.ellipse(surf, FLYER_BODY, body)
        surf.fill(FLYER_STRIPE, (x + 4, y + 2, 2, 6))
        surf.fill(FLYER_STRIPE, (x + 7, y + 2, 1, 6))
        sx = x - 2 if d > 0 else x + 12
        pygame.draw.polygon(surf, OUTLINE, [(sx, y + 4), (sx + (2 if d < 0 else -1) * 1, y + 5), (sx, y + 6)])
        surf.fill(OUTLINE, (x + (8 if d > 0 else 2), y + 3, 2, 2))


# ---------------------------------------------------------------- factory
def build_entities(lvl):
    ents = []
    objs = lvl.objects
    bcells = {(c, r) for ch, c, r in objs if ch == 'B'}
    while bcells:
        stack, group = [bcells.pop()], []
        while stack:
            c, r = stack.pop()
            group.append((c, r))
            for n in ((c + 1, r), (c - 1, r), (c, r + 1), (c, r - 1)):
                if n in bcells:
                    bcells.remove(n)
                    stack.append(n)
        ents.append(Breakable(group, lvl))
    for ch, cls in (('C', None), ('h', 'h'), ('v', 'v')):
        cells = sorted((r, c) for k, c, r in objs if k == ch)
        run = []
        for r, c in cells + [(-9, -9)]:
            if run and (r != run[-1][1] or c != run[-1][0] + 1):
                if ch == 'C':
                    ents.append(Crumble(run, lvl))
                else:
                    ents.append(Mover(run[0][0], run[0][1], len(run), cls, lvl))
                run = []
            run.append((c, r))
    for ch, c, r in objs:
        if ch == 'c':
            ents.append(Ember(c, r))
        elif ch == 'd':
            ents.append(Crystal(c, r))
        elif ch == 'S':
            ents.append(Spring(c, r, lvl))
        elif ch == 'k':
            ents.append(Checkpoint(c, r, lvl))
        elif ch == 'E':
            ents.append(Exit(c, r, lvl))
        elif ch == 'o':
            ents.append(Anchor(c, r))
        elif ch == 'w':
            ents.append(Walker(c, r, lvl))
        elif ch == 'f':
            ents.append(Flyer(c, r, lvl))
    return ents
