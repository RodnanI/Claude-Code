"""Smoothed follow camera with look-ahead, trauma shake and directional kicks."""
import math
import random

from settings import VIEW_W, VIEW_H


class Camera:
    def __init__(self, level_w, level_h):
        self.lw, self.lh = level_w, level_h
        self.x = self.y = 0.0
        self.look_x = 0.0
        self.look_y = 0.0
        self.trauma = 0.0
        self.kick_x = self.kick_y = 0.0
        self.shake_x = self.shake_y = 0.0
        self.shake_scale = 1.0
        self.t = 0.0

    def _clamp(self, x, y):
        if self.lw <= VIEW_W:
            x = (self.lw - VIEW_W) / 2
        else:
            x = max(0.0, min(self.lw - VIEW_W, x))
        if self.lh <= VIEW_H:
            y = (self.lh - VIEW_H) / 2
        else:
            y = max(0.0, min(self.lh - VIEW_H, y))
        return x, y

    def target(self, p):
        return (p.x + p.w / 2 + self.look_x - VIEW_W / 2,
                p.y + p.h / 2 + self.look_y - VIEW_H / 2 - 12)

    def snap(self, p):
        self.look_x = p.facing * 28
        self.look_y = 0.0
        self.x, self.y = self._clamp(*self.target(p))

    def shake(self, amount):
        self.trauma = min(1.0, self.trauma + amount)

    def kick(self, dx, dy):
        self.kick_x += dx
        self.kick_y += dy

    def update(self, dt, p):
        self.t += dt
        want_x = max(-56.0, min(56.0, p.facing * 28 + p.vx * 0.12))
        self.look_x += (want_x - self.look_x) * (1 - math.exp(-dt * 3.0))
        want_y = 0.0
        if p.vy > 200:
            want_y = min(60.0, (p.vy - 200) * 0.35)
        self.look_y += (want_y - self.look_y) * (1 - math.exp(-dt * 4.0))
        tx, ty = self._clamp(*self.target(p))
        self.x += (tx - self.x) * (1 - math.exp(-dt * 7.0))
        self.y += (ty - self.y) * (1 - math.exp(-dt * 6.0))
        self.x, self.y = self._clamp(self.x, self.y)
        self.update_shake(dt)

    def update_shake(self, dt):
        self.trauma = max(0.0, self.trauma - dt * 1.7)
        k = self.trauma * self.trauma * 7.0 * self.shake_scale
        if k > 0.05:
            self.shake_x = (random.random() * 2 - 1) * k
            self.shake_y = (random.random() * 2 - 1) * k
        else:
            self.shake_x = self.shake_y = 0.0
        decay = math.exp(-dt * 16.0)
        self.kick_x *= decay
        self.kick_y *= decay

    @property
    def ox(self):
        return int(round(self.x + self.shake_x + self.kick_x * self.shake_scale))

    @property
    def oy(self):
        return int(round(self.y + self.shake_y + self.kick_y * self.shake_scale))
