"""The player: movement state machine, pixel-exact collision, and the scarf."""
import math
import random

import pygame

from fx import draw_glow
from settings import *


def approach(v, target, amount):
    return min(v + amount, target) if v < target else max(v - amount, target)


def sign(v):
    return (v > 0) - (v < 0)


class Player:
    def __init__(self, x, y):
        self.w, self.h = PLAYER_W, PLAYER_H
        self.t = 0.0
        self.blink = 2.0
        self.reset(x, y)

    def reset(self, x, y):
        self.x, self.y = int(x), int(y)
        self.rx = self.ry = 0.0
        self.vx = self.vy = 0.0
        self.facing = 1
        self.on_ground = True
        self.on_platform = False
        self.touch_wall = 0
        self.coyote = 0.0
        self.jump_buf = self.dash_buf = self.grap_buf = 0.0
        self.can_cut = False
        self.max_dashes = 1
        self.dashes = 1
        self.dashing = False
        self.dash_t = 0.0
        self.dash_dx = self.dash_dy = 0.0
        self.dash_cd = self.refill_cd = 0.0
        self.dash_jump_grace = 0.0
        self.post_dash = 0.0
        self.last_dash = (0, 0)
        self.sliding = False
        self.wall_coyote = 0.0
        self.last_wall = 0
        self.force_x = 0
        self.force_t = 0.0
        self.drop_t = 0.0
        self.anchor = None
        self.rope = 0.0
        self.rope_anim = 0.0
        self.whiff_t = 0.0
        self.whiff_dir = (0.0, 0.0)
        self.riding = None
        self.dead = False
        self.visible = True
        self.sx = self.sy = 1.0
        self.flash = 0.0
        self.run_anim = 0.0
        self.prev_y = self.y
        self.land_speed = 0.0
        self.ghost_t = 0.0
        self.trail_t = 0.0
        self.dust_t = 0.0
        self.slide_t = 0.0
        self.scarf = [[self.x + self.w / 2 - i * 2.0, self.y + 6 + i * 0.5] for i in range(7)]

    @property
    def cx(self):
        return self.x + self.rx + self.w / 2

    @property
    def cy(self):
        return self.y + self.ry + self.h / 2

    # ----------------------------------------------------------- collision
    def platform_at(self, sc, y):
        """One-way surface (tile or moving platform) exactly on pixel row y."""
        if self.drop_t > 0:
            return None
        if sc.level.oneway_at(self.x, y, self.w):
            return True
        for m in sc.movers:
            if m.y == y and self.x + self.w > m.x and self.x < m.x + m.w:
                return m
        return None

    def move_x(self, sc, amount):
        self.rx += amount
        move = int(math.floor(self.rx + 0.5))
        if not move:
            return False
        self.rx -= move
        step = 1 if move > 0 else -1
        lvl = sc.level
        while move:
            nx = self.x + step
            if lvl.collide(nx, self.y, self.w, self.h):
                if (self.dashing or self.post_dash > 0) and sc.smash(nx, self.y, self.w, self.h, self):
                    continue
                if self._nudge_x(lvl, nx):
                    continue
                self.vx = 0.0
                self.rx = 0.0
                return True
            self.x = nx
            move -= step
        return False

    def _nudge_x(self, lvl, nx):
        """Corner correction: pop over ledge lips while dashing or rising."""
        if self.dashing and self.dash_dy == 0:
            offsets = (-1, -2, -3, -4, 1, 2, 3, 4)
        elif self.vy < 0 and not self.dashing:
            offsets = (-1, -2)
        else:
            return False
        for off in offsets:
            if not lvl.collide(self.x, self.y + off, self.w, self.h) and not lvl.collide(nx, self.y + off, self.w, self.h):
                self.y += off
                return True
        return False

    def move_y(self, sc, amount):
        self.ry += amount
        move = int(math.floor(self.ry + 0.5))
        if not move:
            return False
        self.ry -= move
        step = 1 if move > 0 else -1
        lvl = sc.level
        while move:
            ny = self.y + step
            solid = lvl.collide(self.x, ny, self.w, self.h)
            if solid and (self.dashing or self.post_dash > 0) and sc.smash(self.x, ny, self.w, self.h, self):
                continue
            if solid or (step > 0 and self.platform_at(sc, self.y + self.h)):
                if step < 0:
                    if solid and self._nudge_ceiling(lvl, ny):
                        continue
                    if self.vy < -60 and not self.dashing:
                        sc.audio.play('bonk', 0.35)
                    self.can_cut = False
                else:
                    self.land_speed = max(self.land_speed, self.vy)
                self.vy = 0.0
                self.ry = 0.0
                return True
            self.y = ny
            move -= step
        return False

    def _nudge_ceiling(self, lvl, ny):
        pref = sign(self.vx) or 1
        for off in (1, 2, 3, 4):
            for s in (pref, -pref):
                nx = self.x + s * off
                if not lvl.collide(nx, self.y, self.w, self.h) and not lvl.collide(nx, ny, self.w, self.h):
                    self.x = nx
                    return True
        return False

    def carry(self, sc, dx, dy):
        vx = self.vx
        if dx:
            self.move_x(sc, dx)
            self.vx = vx
        if dy:
            self.move_y(sc, dy)

    # ------------------------------------------------------------- update
    def read_buffers(self, inp):
        if inp.pressed('jump'):
            self.jump_buf = JUMP_BUFFER
        if inp.pressed('dash'):
            self.dash_buf = DASH_BUFFER
        if inp.pressed('grapple'):
            self.grap_buf = 0.1

    def update(self, sc, inp, dt):
        if self.dead:
            return
        self.prev_y = self.y
        ix, iy = inp.ax(), inp.ay()
        self.read_buffers(inp)
        self.coyote -= dt
        self.jump_buf -= dt
        self.dash_buf -= dt
        self.grap_buf -= dt
        self.dash_cd -= dt
        self.refill_cd -= dt
        self.dash_jump_grace -= dt
        self.post_dash -= dt
        self.wall_coyote -= dt
        self.force_t -= dt
        self.drop_t -= dt
        self.flash -= dt
        self.trail_t -= dt
        self.whiff_t -= dt

        lvl = sc.level
        ground, plat = False, None
        if self.vy >= 0:
            if lvl.collide(self.x, self.y + 1, self.w, self.h):
                ground = True
            else:
                plat = self.platform_at(sc, self.y + self.h)
                ground = plat is not None
        self.on_platform = plat is not None
        self.riding = plat if (plat is not None and plat is not True) else None
        if ground:
            if not self.on_ground:
                self.landed(sc)
            self.coyote = COYOTE_TIME
            if self.refill_cd <= 0 and self.dashes < self.max_dashes:
                self.refill_dash(sc)
        self.on_ground = ground
        self.land_speed = 0.0

        self.touch_wall = 0
        if not ground:
            if lvl.collide(self.x + 1, self.y, self.w, self.h):
                self.touch_wall = 1
            elif lvl.collide(self.x - 1, self.y, self.w, self.h):
                self.touch_wall = -1
            if self.touch_wall:
                self.last_wall = self.touch_wall
                self.wall_coyote = WALL_COYOTE

        if self.anchor is not None:
            self.update_grapple(sc, inp, ix, iy, dt)
        elif self.dashing:
            self.update_dash(sc, inp, ix, iy, dt)
        else:
            self.update_normal(sc, inp, ix, iy, dt)
        if self.grap_buf > 0 and self.anchor is None and self.try_grapple(sc, ix, iy):
            self.grap_buf = 0.0

        self.move_x(sc, self.vx * dt)
        self.move_y(sc, self.vy * dt)
        if self.anchor is not None:
            self.constrain_rope(sc)
        if self.y > lvl.ph + 24 or lvl.hazard(self.x + 1, self.y + 1, self.w - 2, self.h - 2, self.vx, self.vy):
            self.die(sc)
            return
        self.animate(sc, dt)

    def update_normal(self, sc, inp, ix, iy, dt):
        ground = self.on_ground
        mx = self.force_x if self.force_t > 0 else ix
        mult = 1.0 if ground else AIR_MULT
        if abs(self.vx) > MAX_RUN and sign(self.vx) == mx:
            self.vx = approach(self.vx, MAX_RUN * mx, RUN_REDUCE * mult * dt)
        elif mx:
            accel = RUN_ACCEL * mult
            if ground and self.vx * mx < 0:
                accel *= TURN_MULT
                if abs(self.vx) > 90 and random.random() < 0.5:
                    sc.particles.dust(self.x + self.w / 2, self.y + self.h, 1, sc.dust_color, dirx=sign(self.vx))
            self.vx = approach(self.vx, MAX_RUN * mx, accel * dt)
        else:
            self.vx = approach(self.vx, 0.0, (RUN_DECEL if ground else RUN_ACCEL * AIR_MULT) * dt)
        if mx:
            self.facing = mx

        self.sliding = False
        max_fall = MAX_FALL
        if not ground and self.vy > 0 and ix and self.touch_wall == ix:
            self.sliding = True
            max_fall = WALL_SLIDE_MAX
            self.facing = ix
        elif iy > 0:
            max_fall = FAST_FALL

        if ground and self.vy >= 0:
            self.vy = 0.0
        else:
            g = GRAVITY
            if inp.held('jump') and abs(self.vy) < APEX_THRESHOLD:
                g *= APEX_GRAV_MULT
            elif self.vy > 0:
                g *= FALL_GRAV_MULT
            if self.vy > max_fall:
                self.vy = approach(self.vy, max_fall, 2400.0 * dt)
            else:
                self.vy = min(self.vy + g * dt, max_fall)

        if self.can_cut and self.vy < 0 and not inp.held('jump'):
            self.vy *= JUMP_CUT
            self.can_cut = False
        if self.vy >= 0:
            self.can_cut = False

        if self.jump_buf > 0:
            if ground or self.coyote > 0:
                if iy > 0 and ground and self.on_platform:
                    self.drop_t = 0.2
                    self.jump_buf = 0.0
                    self.vy = 60.0
                elif self.dash_jump_grace > 0 and self.last_dash[0] and self.last_dash[1] >= 0:
                    self.super_jump(sc, self.last_dash[1] > 0)
                else:
                    self.jump(sc, ix)
            else:
                d = self.wall_dir(sc)
                if d:
                    self.wall_jump(sc, d, ix)
        if self.dash_buf > 0 and self.dashes > 0 and self.dash_cd <= 0:
            self.start_dash(sc, ix, iy)

    def wall_dir(self, sc):
        lvl = sc.level
        if lvl.collide(self.x + WALL_GRACE, self.y, self.w, self.h):
            return 1
        if lvl.collide(self.x - WALL_GRACE, self.y, self.w, self.h):
            return -1
        return self.last_wall if self.wall_coyote > 0 else 0

    # -------------------------------------------------------------- moves
    def jump(self, sc, ix):
        self.jump_buf = self.coyote = 0.0
        self.vy = -JUMP_SPEED
        self.vx += JUMP_H_BOOST * ix
        if self.riding is not None:
            self.vx += self.riding.vx
            self.vy += min(0.0, self.riding.vy)
        self.can_cut = True
        self.on_ground = False
        self.sx, self.sy = 0.72, 1.32
        sc.particles.dust(self.x + self.w / 2, self.y + self.h, 5, sc.dust_color)
        sc.audio.play('jump')

    def wall_jump(self, sc, d, ix):
        self.jump_buf = self.wall_coyote = 0.0
        self.dashing = False
        self.vx = -d * WALL_JUMP_X
        self.vy = -WALL_JUMP_Y
        self.force_x, self.force_t = -d, WALL_JUMP_FORCE
        self.facing = -d
        self.can_cut = True
        self.sx, self.sy = 0.75, 1.28
        sc.particles.dust(self.x + (self.w if d > 0 else 0), self.y + self.h / 2, 5, sc.dust_color, dirx=-d)
        sc.audio.play('walljump')

    def super_jump(self, sc, hyper):
        d = self.last_dash[0] or self.facing
        self.dashing = False
        self.dash_jump_grace = self.jump_buf = self.coyote = 0.0
        self.vx = d * SUPER_X
        self.vy = -JUMP_SPEED
        if hyper:
            self.vx *= HYPER_X_MULT
            self.vy *= HYPER_Y_MULT
        if self.riding is not None:
            self.vx += self.riding.vx
        self.can_cut = True
        self.facing = d
        if self.on_ground:
            self.refill_dash(sc)
        self.on_ground = False
        self.trail_t = 0.3
        self.sx, self.sy = 1.38, 0.7
        sc.audio.play('super')
        sc.camera.shake(0.14)
        sc.camera.kick(d * 5, 0)
        sc.particles.burst(self.cx, self.y + self.h, 12, (PLAYER_BODY, SCARF_READY, sc.dust_color),
                           speed=(40, 150), life=(0.2, 0.45), angle=math.pi if d > 0 else 0.0, spread=1.3)

    def wall_bounce(self, sc, d):
        self.dashing = False
        self.jump_buf = 0.0
        self.vx = -d * WALLBOUNCE_X
        self.vy = -WALLBOUNCE_Y
        self.force_x, self.force_t = -d, 0.1
        self.facing = -d
        self.can_cut = True
        self.trail_t = 0.3
        self.sx, self.sy = 0.68, 1.42
        sc.audio.play('super')
        sc.camera.shake(0.16)
        sc.particles.dust(self.x + (self.w if d > 0 else 0), self.y + self.h / 2, 8, sc.dust_color, dirx=-d)

    def start_dash(self, sc, ix, iy):
        self.dash_buf = 0.0
        self.dashes -= 1
        dx, dy = float(ix), float(iy)
        if not ix and not iy:
            dx = float(self.facing)
        if dx and dy:
            dx *= 0.70710678
            dy *= 0.70710678
        self.dashing = True
        self.dash_t = DASH_TIME
        self.dash_dx, self.dash_dy = dx, dy
        self.last_dash = (sign(dx), sign(dy))
        self.dash_cd = DASH_COOLDOWN
        self.refill_cd = DASH_REFILL_COOLDOWN
        self.anchor = None
        self.sliding = False
        nvx, nvy = dx * DASH_SPEED, dy * DASH_SPEED
        if nvx and sign(self.vx) == sign(nvx) and abs(self.vx) > abs(nvx):
            nvx = self.vx
        self.vx, self.vy = nvx, nvy
        if dx:
            self.facing = sign(dx)
        self.can_cut = False
        self.ghost_t = 0.0
        self.flash = 0.05
        self.sx, self.sy = (1.3, 0.75) if not dy else ((0.72, 1.32) if not dx else (1.12, 0.9))
        sc.hitstop(DASH_FREEZE)
        sc.camera.kick(dx * 7, dy * 7)
        sc.camera.shake(0.1)
        sc.audio.play('dash')
        sc.particles.burst(self.cx, self.cy, 10, (SCARF_READY, (255, 200, 120), PLAYER_BODY), speed=(60, 170),
                           life=(0.2, 0.4), angle=math.atan2(-dy, -dx), spread=1.4, kind='spark')
        sc.particles.ring(self.cx, self.cy, 14, (255, 220, 180), 0.2)

    def update_dash(self, sc, inp, ix, iy, dt):
        self.dash_t -= dt
        self.post_dash = 0.08
        self.ghost_t -= dt
        if self.ghost_t <= 0:
            self.ghost_t = 0.028
            self.spawn_ghost(sc)
        if random.random() < 0.7:
            sc.particles.add(self.cx + random.uniform(-3, 3), self.cy + random.uniform(-4, 4),
                             -self.vx * 0.1, -self.vy * 0.1, 0.25, 2, (255, 210, 150), SCARF_READY)
        if self.jump_buf > 0:
            if (self.on_ground or self.coyote > 0) and self.dash_dy >= 0 and self.dash_dx:
                self.super_jump(sc, self.dash_dy > 0)
                return
            d = self.wall_dir(sc)
            if d and not self.on_ground:
                if not self.dash_dx and self.dash_dy < 0:
                    self.wall_bounce(sc, d)
                else:
                    self.wall_jump(sc, d, ix)
                return
        if self.dash_t <= 0:
            self.dashing = False
            self.dash_jump_grace = DASH_JUMP_GRACE
            if self.dash_dy <= 0:
                if abs(self.vx) <= DASH_SPEED + 1:
                    self.vx *= DASH_END_MULT
                self.vy *= DASH_END_MULT
                if self.vy < 0:
                    self.vy *= DASH_UP_END_MULT

    # ------------------------------------------------------------ grapple
    def try_grapple(self, sc, ix, iy):
        if not sc.anchors:
            return False
        cx, cy = self.cx, self.cy
        ax, ay = (ix, iy) if (ix or iy) else (self.facing, -1)
        n = math.hypot(ax, ay)
        ax, ay = ax / n, ay / n
        best, best_s = None, 1e9
        for a in sc.anchors:
            dx, dy = a.cx - cx, a.cy - cy
            d = math.hypot(dx, dy)
            if d > GRAPPLE_RANGE or d < 6:
                continue
            align = (dx * ax + dy * ay) / d
            if align < -0.3:
                continue
            s = d * (1.7 - align)
            if s < best_s and sc.level.line_clear(cx, cy, a.cx, a.cy):
                best, best_s = a, s
        if best is None:
            if self.whiff_t <= 0:
                self.whiff_t = 0.14
                self.whiff_dir = (ax, ay)
                sc.audio.play('whiff')
            return False
        self.anchor = best
        self.rope = max(GRAPPLE_MIN, min(GRAPPLE_MAX, math.hypot(best.cx - cx, best.cy - cy)))
        self.rope_anim = 0.0
        self.dashing = False
        self.can_cut = False
        self.force_t = 0.0
        best.pulse = 1.0
        sc.audio.play('grapple')
        sc.camera.shake(0.06)
        return True

    def update_grapple(self, sc, inp, ix, iy, dt):
        if not inp.held('grapple'):
            self.release(sc, False)
            self.update_normal(sc, inp, ix, iy, dt)
            return
        if self.jump_buf > 0:
            self.release(sc, True)
            return
        if self.dash_buf > 0 and self.dashes > 0 and self.dash_cd <= 0:
            self.anchor = None
            self.start_dash(sc, ix, iy)
            return
        self.rope_anim = min(1.0, self.rope_anim + dt / 0.07)
        self.sliding = False
        self.vy += GRAVITY * dt
        self.vx += ix * GRAPPLE_SWING_ACCEL * dt
        if iy:
            self.rope = max(GRAPPLE_MIN, min(GRAPPLE_MAX, self.rope + iy * GRAPPLE_REEL * dt))
        sp = math.hypot(self.vx, self.vy)
        if sp > GRAPPLE_MAX_SPEED:
            k = GRAPPLE_MAX_SPEED / sp
            self.vx *= k
            self.vy *= k
        if abs(self.vx) > 30:
            self.facing = sign(self.vx)

    def constrain_rope(self, sc):
        a = self.anchor
        dx, dy = self.cx - a.cx, self.cy - a.cy
        d = math.hypot(dx, dy)
        if d > self.rope and d > 0.001:
            nx, ny = dx / d, dy / d
            self.move_x(sc, a.cx + nx * self.rope - self.cx)
            self.move_y(sc, a.cy + ny * self.rope - self.cy)
            vr = self.vx * nx + self.vy * ny
            if vr > 0:
                self.vx -= vr * nx
                self.vy -= vr * ny

    def release(self, sc, jump):
        self.anchor = None
        self.refill_dash(sc)
        self.trail_t = 0.18
        if jump:
            self.jump_buf = 0.0
            self.vy = min(self.vy * 0.5, 0.0) - GRAPPLE_JUMP
            self.vx *= 1.1
            self.can_cut = True
            self.sx, self.sy = 0.75, 1.3
            sc.audio.play('jump')
        else:
            if math.hypot(self.vx, self.vy) > 160:
                self.vx *= 1.12
                if self.vy < 0:
                    self.vy *= 1.12
            sc.audio.play('release', 0.7)

    # ------------------------------------------------------ interactions
    def refill_dash(self, sc):
        if self.dashes < self.max_dashes:
            self.dashes = self.max_dashes
            self.flash = 0.1
            return True
        return False

    def spring(self, sc, d):
        self.dashing = False
        self.anchor = None
        self.refill_dash(sc)
        self.can_cut = False
        self.jump_buf = 0.0
        if d == 'up':
            self.vy = -SPRING_SPEED
            self.sx, self.sy = 0.65, 1.45
        elif d == 'down':
            self.vy = SPRING_SPEED * 0.6
        else:
            s = 1 if d == 'right' else -1
            self.vx, self.vy = s * SIDE_SPRING_X, -SIDE_SPRING_Y
            self.force_x, self.force_t = s, 0.16
            self.facing = s
            self.sx, self.sy = 1.4, 0.7
        self.on_ground = False
        self.trail_t = 0.2

    def bounce(self, sc):
        self.dashing = False
        self.vy = -STOMP_BOUNCE
        self.can_cut = True
        self.refill_dash(sc)
        self.sx, self.sy = 0.7, 1.35
        self.trail_t = 0.12

    def landed(self, sc):
        s = max(0.0, min(1.0, (self.land_speed - 60.0) / (MAX_FALL - 60.0)))
        if s > 0.05:
            self.sx, self.sy = 1.0 + 0.5 * s, 1.0 - 0.42 * s
            sc.particles.dust(self.x + self.w / 2, self.y + self.h, 2 + int(6 * s), sc.dust_color)
            sc.audio.play('land', 0.35 + 0.65 * s, variant=1 if s > 0.5 else 0)
            if self.land_speed > 420:
                sc.camera.shake(0.18)

    def die(self, sc):
        if self.dead:
            return
        self.dead = True
        self.anchor = None
        self.dashing = False
        sc.player_died(self)

    # ------------------------------------------------------------ visuals
    def spawn_ghost(self, sc, color=(255, 112, 64)):
        bw, bh = max(4, round(12 * self.sx)), max(4, round(13 * self.sy))
        img = pygame.Surface((bw + 2, bh + 2), pygame.SRCALPHA)
        pygame.draw.rect(img, color, (0, 0, bw + 2, bh + 2), border_radius=5)
        sc.particles.ghost(img, self.x + self.rx + self.w / 2 - bw / 2 - 1, self.y + self.ry + self.h - bh - 1)

    def animate(self, sc, dt):
        self.t += dt
        k = 1.0 - math.exp(-dt * 13.0)
        self.sx += (1.0 - self.sx) * k
        self.sy += (1.0 - self.sy) * k
        self.blink -= dt
        if self.blink < -0.12:
            self.blink = random.uniform(1.8, 4.5)
        if self.on_ground and abs(self.vx) > 30:
            self.run_anim += dt * abs(self.vx) / 14.0
            self.dust_t -= dt
            if self.dust_t <= 0:
                self.dust_t = 0.13
                sc.particles.dust(self.x + self.w / 2 - self.facing * 3, self.y + self.h, 1, sc.dust_color,
                                  dirx=-self.facing * 0.5, up=0.5)
        else:
            self.run_anim = 0.0
        if self.sliding:
            self.slide_t -= dt
            if self.slide_t <= 0:
                self.slide_t = 0.07
                sc.particles.dust(self.x + (self.w if self.facing > 0 else 0), self.y + 3, 1, sc.dust_color,
                                  dirx=-self.facing * 0.4, up=-0.4)
                sc.audio.play('slide', 0.6)
        if self.trail_t > 0 and not self.dashing:
            self.ghost_t -= dt
            if self.ghost_t <= 0:
                self.ghost_t = 0.04
                self.spawn_ghost(sc, (255, 170, 110))
        self.update_scarf()

    def update_scarf(self):
        pts = self.scarf
        bw, bh = 12 * self.sx, 13 * self.sy
        pts[0][0] = self.x + self.rx + self.w / 2 - self.facing * (bw / 2 - 1)
        pts[0][1] = self.y + self.ry + self.h - bh * 0.5 + 1
        wave = self.t * 14.0
        drift = -self.facing * 0.55
        for i in range(1, len(pts)):
            p, q = pts[i], pts[i - 1]
            p[0] += drift
            p[1] += 0.45 + math.sin(wave + i * 0.9) * 0.35
            dx, dy = p[0] - q[0], p[1] - q[1]
            d = math.hypot(dx, dy)
            if d > 2.6:
                p[0] = q[0] + dx / d * 2.6
                p[1] = q[1] + dy / d * 2.6

    def draw(self, surf, ox, oy):
        if self.dead or not self.visible:
            return
        if self.flash > 0:
            col = dark = (255, 255, 255)
        elif self.dashes > 0:
            col, dark = SCARF_READY, SCARF_READY_DARK
        else:
            col, dark = SCARF_EMPTY, SCARF_EMPTY_DARK
        pcx, pcy = self.cx - ox, self.cy - oy
        if self.anchor is not None:
            a = self.anchor
            ex = pcx + (a.cx - ox - pcx) * self.rope_anim
            ey = pcy + (a.cy - oy - pcy) * self.rope_anim
            pygame.draw.line(surf, OUTLINE, (pcx, pcy + 1), (ex, ey + 1), 2)
            pygame.draw.line(surf, (242, 222, 190), (pcx, pcy), (ex, ey))
        elif self.whiff_t > 0:
            ln = 40 * (1.0 - abs(self.whiff_t - 0.07) / 0.07)
            pygame.draw.line(surf, (170, 150, 130), (pcx, pcy),
                             (pcx + self.whiff_dir[0] * ln, pcy + self.whiff_dir[1] * ln))
        if self.dashes > 0:
            draw_glow(surf, pcx, pcy, 16, (255, 90, 40), 0.18)
        pts = self.scarf
        n = len(pts)
        for i in range(n - 1, -1, -1):
            pygame.draw.circle(surf, OUTLINE, (int(pts[i][0] - ox), int(pts[i][1] - oy)), int(3.0 - i * 0.28 + 1))
        for i in range(n - 1, -1, -1):
            pygame.draw.circle(surf, dark if i % 3 == 2 else col, (int(pts[i][0] - ox), int(pts[i][1] - oy)),
                               max(1, int(3.0 - i * 0.28)))
        bw, bh = max(6, round(12 * self.sx)), max(6, round(13 * self.sy))
        fx, fy = round(self.x + self.rx + self.w / 2 - ox), round(self.y + self.ry + self.h - oy)
        body = pygame.Rect(fx - bw // 2, fy - bh, bw, bh)
        if self.run_anim:
            ph = int(math.sin(self.run_anim * 2.2) * 2)
            surf.fill(OUTLINE, (fx - 4 + ph, fy - 1, 3, 2))
            surf.fill(OUTLINE, (fx + 1 - ph, fy - 1, 3, 2))
        pygame.draw.rect(surf, OUTLINE, body.inflate(2, 2), border_radius=5)
        pygame.draw.rect(surf, (255, 255, 255) if self.flash > 0 else PLAYER_BODY, body, border_radius=4)
        surf.fill(PLAYER_SHADE, (body.x + 2, body.bottom - 3, max(1, bw - 4), 2))
        band = body.y + bh // 2
        surf.fill(OUTLINE, (body.x - 1, band - 1, bw + 2, 5))
        surf.fill(col, (body.x, band, bw, 3))
        surf.fill(dark, (body.x, band + 2, bw, 1))
        ex, ey = fx + self.facing * 2, body.y + max(2, bh // 5)
        if self.vy < -120:
            ey -= 1
        elif self.vy > 160:
            ey += 1
        if self.dashing:
            surf.fill(OUTLINE, (ex - 4, ey + 1, 3, 1))
            surf.fill(OUTLINE, (ex + 1, ey + 1, 3, 1))
        elif self.blink < 0:
            surf.fill(OUTLINE, (ex - 3, ey + 1, 2, 1))
            surf.fill(OUTLINE, (ex + 1, ey + 1, 2, 1))
        else:
            surf.fill(OUTLINE, (ex - 3, ey, 2, 3))
            surf.fill(OUTLINE, (ex + 1, ey, 2, 3))
            surf.fill(CHEEK, (ex + (3 if self.facing > 0 else -5), ey + 2, 2, 1))
