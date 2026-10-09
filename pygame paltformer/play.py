"""Gameplay scene: runs a level, its entities, camera, HUD and overlays."""
import math
import random

import pygame

import font
from camera import Camera
from entities import build_entities, Anchor, Mover, Breakable, Ember, Checkpoint
from fx import Particles, draw_glow
from level import Level, draw_backdrop
from levels import LEVELS
from player import Player
from settings import *


def fmt_time(t):
    m = int(t // 60)
    return f"{m}:{t - m * 60:05.2f}"


class PlayScene:
    PAUSE_ITEMS = ('RESUME', 'RESTART LEVEL', 'LEVEL SELECT', 'QUIT TO TITLE')

    def __init__(self, game, index, headless=False):
        self.game = game
        self.audio = game.audio
        self.index = index
        self.level = Level(LEVELS[index], index)
        self.pal = self.level.pal
        self.dust_color = self.pal['tile_top']
        self.entities = build_entities(self.level)
        self.entities.sort(key=lambda e: e.layer)
        self.anchors = [e for e in self.entities if isinstance(e, Anchor)]
        self.movers = [e for e in self.entities if isinstance(e, Mover)]
        self.breakables = [e for e in self.entities if isinstance(e, Breakable)]
        self.others = [e for e in self.entities if not isinstance(e, Mover)]
        self.ember_total = sum(1 for e in self.entities if isinstance(e, Ember))
        self.player = Player(*self.level.start)
        self.respawn = self.level.start
        self.checkpoint = None
        self.camera = Camera(self.level.pw, self.level.ph)
        self.camera.shake_scale = 1.0 if game.save['opt'].get('shake', True) else 0.0
        self.camera.snap(self.player)
        self.cam_max_y = max(0, self.level.ph - VIEW_H)
        self.particles = Particles()
        self.t = self.time = self.freeze = self.flash = 0.0
        self.deaths = self.embers = self.kills = self.combo = 0
        self.combo_t = 0.0
        self.state, self.state_t = 'play', 0.0
        self.banner = 2.6
        self.menu_sel = 0
        self.new_best = False
        self.iris = None
        self.lava_y = None
        if self.level.rising:
            self.lava_y = float(self.level.ph + 40)
            self.lava_wait = self.level.rising.get('delay', 2.0)
        if headless:
            return
        self.level.build_layer()
        self.backdrop = game.backdrop(self.level.world)
        self.iris_surf = pygame.Surface((VIEW_W, VIEW_H))
        self.iris_surf.set_colorkey((255, 0, 255))
        self.overlay = pygame.Surface((VIEW_W, VIEW_H))
        self.lava_glow = pygame.Surface((VIEW_W, 48))
        for h, col in ((48, (40, 10, 0)), (30, (72, 22, 4)), (14, (112, 38, 8))):
            self.lava_glow.fill(col, (0, 48 - h, VIEW_W, h))
        self.motes = [[random.uniform(0, VIEW_W), random.uniform(0, VIEW_H), random.uniform(0.3, 1.0),
                       random.uniform(0, 6.28)] for _ in range(46)]
        self.player.sx, self.player.sy = 0.3, 1.7
        self.start_iris('open', 0.6, self.player.cx - self.camera.ox, self.player.cy - self.camera.oy)
        self.audio.duck(1.0)

    # --------------------------------------------------------------- hooks
    def hitstop(self, t):
        self.freeze = max(self.freeze, t)

    def smash(self, x, y, w, h, p):
        hit = False
        for b in self.breakables:
            if b.alive and b.hits(x, y, w, h):
                b.smash(self, p)
                hit = True
        return hit

    def collect_ember(self, e):
        self.embers += 1
        self.combo = self.combo + 1 if self.combo_t > 0 else 0
        self.combo_t = 1.4
        self.audio.play('coin', variant=min(self.combo, 7))
        cx, cy = e.x + 5, e.y + 5
        self.particles.burst(cx, cy, 10, (EMBER, EMBER_HI, (255, 140, 40)), speed=(40, 120), life=(0.25, 0.5), size=(1, 2))
        self.particles.ring(cx, cy, 12, EMBER_HI, 0.25)

    def set_checkpoint(self, cp):
        for e in self.entities:
            if isinstance(e, Checkpoint):
                e.active = False
        cp.activate(self)
        self.checkpoint = cp
        self.respawn = cp.spawn

    def player_died(self, p):
        self.state, self.state_t = 'dead', 0.0
        self.deaths += 1
        self.game.save['deaths'] = self.game.save.get('deaths', 0) + 1
        cx, cy = p.cx, p.cy
        for i in range(12):
            a = i / 12 * math.tau
            self.particles.add(cx, cy, math.cos(a) * 170, math.sin(a) * 170, 0.7, 4,
                               SCARF_READY if i % 2 else PLAYER_BODY, None, 0, 3.5, 'orb')
        self.particles.ring(cx, cy, 30, (255, 255, 255), 0.4)
        self.particles.burst(cx, cy, 16, (SCARF_READY, PLAYER_BODY, (255, 200, 120)), speed=(80, 240),
                             life=(0.2, 0.5), kind='spark')
        self.camera.shake(0.55)
        self.freeze = 0.08
        self.flash = 0.08
        self.audio.play('death')

    def respawn_player(self):
        p = self.player
        p.reset(*self.respawn)
        for e in self.entities:
            e.reset(self)
        if self.lava_y is not None:
            self.lava_y = max(self.lava_y, self.respawn[1] + 170.0)
            self.lava_wait = 1.2
        self.camera.snap(p)
        self.state = 'play'
        p.sx, p.sy = 0.2, 1.8
        cx, cy = p.cx, p.cy
        for i in range(12):
            a = i / 12 * math.tau
            self.particles.add(cx + math.cos(a) * 40, cy + math.sin(a) * 40, -math.cos(a) * 160, -math.sin(a) * 160,
                               0.25, 3, SCARF_READY if i % 2 else PLAYER_BODY, None, 0, 0, 'orb')
        self.audio.play('respawn')
        self.start_iris('open', 0.32, cx - self.camera.ox, cy - self.camera.oy)

    def complete_level(self, ext):
        if self.state != 'play':
            return
        self.state, self.state_t = 'complete', 0.0
        p = self.player
        p.visible = False
        self.particles.burst(ext.cx, ext.cy, 40, (self.pal['accent'], EMBER_HI, PLAYER_BODY), speed=(60, 260),
                             life=(0.4, 1.0), grav=180, drag=1.5, size=(1, 3))
        self.particles.ring(ext.cx, ext.cy, 40, EMBER_HI, 0.5)
        self.camera.shake(0.3)
        self.freeze = 0.1
        self.flash = 0.1
        self.audio.play('complete')
        sv, key = self.game.save, str(self.index)
        best = sv['best'].get(key)
        self.new_best = best is None or self.time < best
        if self.new_best:
            sv['best'][key] = round(self.time, 2)
        sv['embers'][key] = max(sv['embers'].get(key, 0), self.embers)
        sv['cleared'] = max(sv.get('cleared', 0), self.index + 1)
        self.game.write_save()

    # -------------------------------------------------------------- update
    def start_iris(self, mode, dur, cx, cy, cb=None):
        self.iris = [mode, 0.0, dur, cx, cy, cb]

    def update_iris(self, dt):
        ir = self.iris
        if ir is None:
            return
        ir[1] = min(ir[2], ir[1] + dt)
        if ir[1] >= ir[2]:
            cb, ir[5] = ir[5], None
            if ir[0] == 'open':
                self.iris = None
            if cb:
                cb()

    def step(self, dt, inp):
        """One fixed physics tick; also used by the headless level checker."""
        p = self.player
        for m in self.movers:
            m.update(self, dt)
        if self.state == 'play':
            p.update(self, inp, dt)
        for e in self.others:
            if e.alive:
                e.update(self, dt)
        if self.state == 'play' and not p.dead:
            for e in self.others:
                if e.alive and e.touchable and e.overlaps(p):
                    e.touch(self, p)
                    if p.dead or self.state != 'play':
                        break
        if self.lava_y is not None and self.state == 'play':
            if self.lava_wait > 0:
                self.lava_wait -= dt
            else:
                self.lava_y -= self.level.rising['speed'] * dt
            if not p.dead and p.y + p.h > self.lava_y + 4:
                p.die(self)

    def update(self, dt):
        inp = self.game.input
        self.t += dt
        self.update_iris(dt)
        if self.state == 'paused':
            self.update_pause(inp)
            return
        if self.state == 'complete':
            self.update_complete(inp, dt)
        elif self.state == 'play' and self.iris is None:
            if inp.pressed('pause'):
                self.state, self.menu_sel = 'paused', 0
                self.audio.duck(0.35)
                self.audio.play('select')
                return
            if inp.pressed('restart'):
                self.player.die(self)
        if self.freeze > 0:
            self.freeze -= dt
            self.player.read_buffers(inp)
            self.camera.update_shake(dt)
            return
        self.step(dt, inp)
        p = self.player
        self.camera.update(dt, p)
        self.particles.update(dt)
        for a in self.anchors:
            a.hot = a is p.anchor or (not p.dead and math.hypot(a.cx - p.cx, a.cy - p.cy) < GRAPPLE_RANGE)
        vx, vy = self.pal['mote_dir']
        for m in self.motes:
            m[0] += (vx + math.sin(self.t * 1.3 + m[3]) * 6) * dt * m[2]
            m[1] += vy * dt * m[2]
        if self.lava_y is not None and random.random() < 0.5:
            self.particles.add(random.uniform(self.camera.x, self.camera.x + VIEW_W), self.lava_y,
                               random.uniform(-10, 10), random.uniform(-70, -20), random.uniform(0.6, 1.2),
                               2, LAVA_HI, LAVA_DARK, grav=-10)
        self.banner -= dt
        self.flash = max(0.0, self.flash - dt)
        self.combo_t -= dt
        if self.state == 'play':
            self.time += dt
        elif self.state == 'dead':
            self.state_t += dt
            if self.state_t > 0.5 and self.iris is None:
                self.start_iris('close', 0.28, p.cx - self.camera.ox, p.cy - self.camera.oy, self.respawn_player)

    def update_complete(self, inp, dt):
        self.state_t += dt
        if self.state_t > 0.9 and self.iris is None:
            if inp.pressed('jump') or inp.pressed('confirm'):
                self.audio.play('select')
                self.start_iris('close', 0.4, VIEW_W / 2, VIEW_H / 2, self.next_level)
            elif inp.pressed('restart'):
                self.audio.play('select')
                self.start_iris('close', 0.4, VIEW_W / 2, VIEW_H / 2,
                                lambda: self.game.change(PlayScene(self.game, self.index)))

    def next_level(self):
        if self.index + 1 < len(LEVELS):
            self.game.change(PlayScene(self.game, self.index + 1))
        else:
            from scenes import EndScene
            self.game.change(EndScene(self.game))

    def update_pause(self, inp):
        n = len(self.PAUSE_ITEMS)
        if inp.pressed('pause') or inp.pressed('back'):
            self.state = 'play'
            self.audio.duck(1.0)
            self.audio.play('back')
            return
        if inp.pressed('up'):
            self.menu_sel = (self.menu_sel - 1) % n
            self.audio.play('move')
        if inp.pressed('down'):
            self.menu_sel = (self.menu_sel + 1) % n
            self.audio.play('move')
        if inp.pressed('confirm') or inp.pressed('jump'):
            self.audio.play('select')
            self.audio.duck(1.0)
            choice = self.PAUSE_ITEMS[self.menu_sel]
            if choice == 'RESUME':
                self.state = 'play'
            elif choice == 'RESTART LEVEL':
                self.game.change(PlayScene(self.game, self.index))
            elif choice == 'LEVEL SELECT':
                from scenes import LevelSelectScene
                self.game.change(LevelSelectScene(self.game, self.index))
            else:
                from scenes import TitleScene
                self.game.change(TitleScene(self.game))

    # ---------------------------------------------------------------- draw
    def draw(self, surf):
        pal = self.pal
        cam = self.camera
        ox, oy = cam.ox, cam.oy
        surf.fill(pal['sky'])
        draw_backdrop(surf, self.backdrop, cam.x, cam.y, self.cam_max_y)
        self.draw_motes(surf, False)
        surf.blit(self.level.layer, (-ox, -oy))
        self.draw_lava_tiles(surf, ox, oy)
        for e in self.entities:
            if e.alive and e.visible(ox, oy):
                e.draw(surf, ox, oy, self.t)
        self.particles.draw_ghosts(surf, ox, oy)
        self.player.draw(surf, ox, oy)
        self.particles.draw(surf, ox, oy)
        self.draw_rising_lava(surf, oy)
        self.draw_motes(surf, True)
        if self.flash > 0:
            self.overlay.fill((255, 248, 236))
            self.overlay.set_alpha(int(150 * self.flash / 0.1))
            surf.blit(self.overlay, (0, 0))
        self.draw_hud(surf)
        if self.banner > 0:
            self.draw_banner(surf)
        if self.state == 'complete' and self.state_t > 0.5:
            self.draw_complete(surf)
        elif self.state == 'paused':
            self.draw_pause(surf)
        self.draw_iris(surf)

    def draw_motes(self, surf, near):
        cam, col, sky = self.camera, self.pal['mote'], self.pal['sky']
        dim = tuple((a + b) // 2 for a, b in zip(col, sky))
        for x, y, z, ph in self.motes:
            if (z > 0.78) != near:
                continue
            sx = (x - cam.x * z * 0.5) % VIEW_W
            sy = (y - cam.y * z * 0.5) % VIEW_H
            s = 2 if near else 1
            surf.fill(col if (z > 0.55 and math.sin(self.t * 3 + ph) > -0.6) else dim, (int(sx), int(sy), s, s))

    def draw_lava_tiles(self, surf, ox, oy):
        lvl = self.level
        c0, c1 = max(0, ox // TILE), min(lvl.cols - 1, (ox + VIEW_W) // TILE)
        r0, r1 = max(0, oy // TILE), min(lvl.nrows - 1, (oy + VIEW_H) // TILE)
        for r in range(r0, r1 + 1):
            row = lvl.lava[r]
            for c in range(c0, c1 + 1):
                if not row[c]:
                    continue
                x, y = c * TILE - ox, r * TILE - oy
                if lvl.is_lava(c, r - 1):
                    surf.fill(LAVA, (x, y, TILE, TILE))
                    if (c * 7 + r * 3 + int(self.t * 2)) % 9 == 0:
                        surf.fill(LAVA_DARK, (x + 4, y + 6, 5, 3))
                    continue
                for i in range(0, TILE, 2):
                    hgt = int(4 + math.sin((c * TILE + i) * 0.35 + self.t * 4) * 1.5)
                    surf.fill(LAVA_HI, (x + i, y + hgt, 2, 2))
                    surf.fill(LAVA, (x + i, y + hgt + 2, 2, TILE - hgt - 2))
                draw_glow(surf, x + 8, y + 4, 18, LAVA, 0.2)

    def draw_rising_lava(self, surf, oy):
        if self.lava_y is None:
            return
        y = int(self.lava_y - oy)
        if y > VIEW_H + 40:
            return
        surf.blit(self.lava_glow, (0, y - 44), special_flags=pygame.BLEND_RGB_ADD)
        if y > VIEW_H:
            return
        for x in range(0, VIEW_W, 3):
            hgt = int(math.sin(x * 0.06 + self.t * 3) * 2.5 + math.sin(x * 0.17 - self.t * 4.3) * 1.5)
            surf.fill(LAVA_HI, (x, y + hgt - 1, 3, 3))
            surf.fill(LAVA, (x, y + hgt + 2, 3, max(0, VIEW_H - y - hgt - 2)))
        if y + 16 < VIEW_H:
            surf.fill(LAVA_DARK, (0, y + 16, VIEW_W, VIEW_H - y - 16))

    def draw_hud(self, surf):
        font.draw(surf, fmt_time(self.time), 8, 7, UI_TEXT, shadow=UI_SHADOW)
        txt = f"{self.embers}/{self.ember_total}"
        full = self.ember_total and self.embers == self.ember_total
        w = font.draw(surf, txt, VIEW_W - 8, 7, EMBER if full else UI_TEXT, align='right', shadow=UI_SHADOW)
        ix = VIEW_W - 14 - w
        pygame.draw.polygon(surf, UI_SHADOW, [(ix, 6), (ix + 4, 11), (ix, 16), (ix - 4, 11)])
        pygame.draw.polygon(surf, EMBER, [(ix, 6), (ix + 3, 10), (ix, 14), (ix - 3, 10)])
        dtxt = str(self.deaths)
        w2 = font.draw(surf, dtxt, ix - 12, 7, UI_DIM, align='right', shadow=UI_SHADOW)
        sx = ix - 22 - w2
        surf.fill(UI_DIM, (sx, 7, 7, 5))
        surf.fill(UI_DIM, (sx + 1, 12, 5, 2))
        surf.fill(UI_SHADOW, (sx + 1, 9, 2, 2))
        surf.fill(UI_SHADOW, (sx + 4, 9, 2, 2))

    def draw_banner(self, surf):
        k = min(1.0, self.banner / 0.35, (2.6 - self.banner) / 0.35)
        k = 1 - (1 - max(0.0, k)) ** 3
        y = int(VIEW_H * 0.26 + (1 - k) * 30)
        if k < 0.05:
            return
        font.draw(surf, self.pal['name'], VIEW_W // 2, y - 14, self.pal['accent'], align='center', shadow=UI_SHADOW)
        font.draw_outlined(surf, f"{self.index + 1}  {self.level.name}", VIEW_W // 2, y, UI_TEXT, UI_SHADOW,
                           scale=2, align='center')

    def _panel(self, surf, w, h, y_off=0.0, alpha=150):
        self.overlay.fill((12, 7, 7))
        self.overlay.set_alpha(alpha)
        surf.blit(self.overlay, (0, 0))
        x, y = VIEW_W // 2 - w // 2, int(VIEW_H // 2 - h // 2 + y_off)
        surf.fill(UI_SHADOW, (x - 2, y - 2, w + 4, h + 4))
        surf.fill(self.pal['sky'], (x, y, w, h))
        pygame.draw.rect(surf, self.pal['accent'], (x, y, w, h), 1)
        surf.fill(self.pal['accent'], (x, y, w, 3))
        return x, y

    def draw_complete(self, surf):
        k = min(1.0, (self.state_t - 0.5) / 0.35)
        k = 1 - (1 - k) ** 3
        x, y = self._panel(surf, 230, 128, (1 - k) * 40, int(140 * k))
        cx = VIEW_W // 2
        font.draw_outlined(surf, "LEVEL CLEAR", cx, y + 12, self.pal['accent'], UI_SHADOW, scale=2, align='center')
        best = self.game.save['best'].get(str(self.index))
        rows = [("TIME", fmt_time(self.time), UI_GOOD if self.new_best else UI_TEXT),
                ("BEST", fmt_time(best) if best is not None else "-", UI_DIM),
                ("DEATHS", str(self.deaths), UI_TEXT),
                ("EMBERS", f"{self.embers}/{self.ember_total}", EMBER if self.embers == self.ember_total else UI_TEXT)]
        for i, (a, b, col) in enumerate(rows):
            yy = y + 40 + i * 13
            font.draw(surf, a, x + 30, yy, UI_DIM)
            font.draw(surf, b, x + 200, yy, col, align='right')
        if self.new_best and int(self.t * 4) % 2:
            font.draw(surf, "NEW BEST!", cx, y + 30, UI_GOOD, align='center')
        if self.state_t > 0.9 and int(self.t * 2.5) % 2 == 0:
            font.draw(surf, "JUMP: NEXT     R: RETRY", cx, y + 112, UI_TEXT, align='center')

    def draw_pause(self, surf):
        x, y = self._panel(surf, 200, 100)
        font.draw_outlined(surf, "PAUSED", VIEW_W // 2, y + 10, UI_TEXT, UI_SHADOW, scale=2, align='center')
        for i, item in enumerate(self.PAUSE_ITEMS):
            sel = i == self.menu_sel
            yy = y + 36 + i * 14
            font.draw(surf, item, VIEW_W // 2, yy, self.pal['accent'] if sel else UI_DIM, align='center')
            if sel:
                bob = int(math.sin(self.t * 8) * 2)
                font.draw(surf, ">", VIEW_W // 2 - font.width(item) // 2 - 10 + bob, yy, self.pal['accent'])

    def draw_iris(self, surf):
        ir = self.iris
        if ir is None:
            return
        mode, t, dur, cx, cy, _ = ir
        k = t / dur
        k = k * k * (3 - 2 * k)
        r = math.hypot(VIEW_W, VIEW_H) * (k if mode == 'open' else 1 - k)
        self.iris_surf.fill((14, 8, 8))
        if r > 0.5:
            pygame.draw.circle(self.iris_surf, (255, 0, 255), (int(cx), int(cy)), int(r))
        surf.blit(self.iris_surf, (0, 0))
