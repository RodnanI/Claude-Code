"""Menus: title, level select, options and the ending."""
import math
import random

import pygame

import font
from fx import Particles, draw_glow
from level import Level, draw_backdrop
from levels import LEVELS, EMBER_COUNTS
from play import PlayScene, fmt_time
from player import Player
from settings import *

CONTROLS = "ARROWS/WASD MOVE   Z/SPACE JUMP   X/SHIFT DASH   C GRAPPLE"


class MenuBase:
    world = 0

    def __init__(self, game):
        self.game = game
        self.audio = game.audio
        self.t = 0.0
        self.sel = 0
        self.scroll = random.uniform(0, 600)
        self.motes = [[random.uniform(0, VIEW_W), random.uniform(0, VIEW_H), random.uniform(0.3, 1.0)]
                      for _ in range(40)]

    def nav(self, n, horizontal=False):
        inp = self.game.input
        a, b = ('left', 'right') if horizontal else ('up', 'down')
        if inp.pressed(a):
            self.sel = (self.sel - 1) % n
            self.audio.play('move')
        if inp.pressed(b):
            self.sel = (self.sel + 1) % n
            self.audio.play('move')

    def tick(self, dt):
        self.t += dt
        self.scroll += 16 * dt
        vx, vy = WORLDS[self.world]['mote_dir']
        for m in self.motes:
            m[0] = (m[0] + vx * dt * m[2]) % VIEW_W
            m[1] = (m[1] + vy * dt * m[2]) % VIEW_H

    def draw_bg(self, surf):
        pal = WORLDS[self.world]
        surf.fill(pal['sky'])
        draw_backdrop(surf, self.game.backdrop(self.world), self.scroll, 0, 0)
        for x, y, z in self.motes:
            s = 2 if z > 0.75 else 1
            surf.fill(pal['mote'], (int(x), int(y), s, s))

    def items_menu(self, surf, items, y, pal, spacing=15):
        for i, item in enumerate(items):
            sel = i == self.sel
            col = pal['accent'] if sel else UI_DIM
            yy = y + i * spacing
            font.draw(surf, item, VIEW_W // 2, yy, col, align='center', shadow=UI_SHADOW)
            if sel:
                bob = int(math.sin(self.t * 8) * 2)
                half = font.width(item) // 2
                font.draw(surf, ">", VIEW_W // 2 - half - 12 + bob, yy, col)
                font.draw(surf, "<", VIEW_W // 2 + half + 7 - bob, yy, col)


class TitleScene(MenuBase):
    def __init__(self, game):
        super().__init__(game)
        rows = ['.' * 30] * 13 + ['######.....................###', '#######.......########......##',
                                  '#' * 30, '#' * 30]
        self.ground = Level({'name': 'title', 'world': 0, 'map': rows}, 0)
        self.ground.build_layer()
        self.hero = Player(15 * TILE - 2, 14 * TILE - PLAYER_H)
        self.base_y = self.hero.y
        self.hop = 3.0
        self.vy = 0.0
        self.particles = Particles()
        self.audio.duck(1.0)

    def items(self):
        return ['CONTINUE' if self.game.save.get('cleared', 0) else 'PLAY', 'LEVELS', 'OPTIONS', 'QUIT']

    def update(self, dt):
        self.tick(dt)
        inp = self.game.input
        h = self.hero
        h.t += dt
        h.blink -= dt
        if h.blink < -0.12:
            h.blink = random.uniform(1.8, 4.5)
        self.hop -= dt
        if self.hop <= 0 and h.y == self.base_y:
            self.hop = random.uniform(2.5, 5.0)
            self.vy = -260.0
            h.sx, h.sy = 0.75, 1.3
        if self.vy or h.y != self.base_y:
            self.vy += GRAVITY * dt
            h.y = min(self.base_y, h.y + int(round(self.vy * dt)))
            if h.y >= self.base_y and self.vy > 0:
                h.y, self.vy = self.base_y, 0.0
                h.sx, h.sy = 1.3, 0.75
                self.particles.dust(h.x + 5, h.y + h.h, 4, WORLDS[0]['tile_top'])
        k = 1.0 - math.exp(-dt * 13.0)
        h.sx += (1 - h.sx) * k
        h.sy += (1 - h.sy) * k
        h.update_scarf()
        self.particles.update(dt)
        items = self.items()
        self.nav(len(items))
        if inp.pressed('confirm') or inp.pressed('jump'):
            self.audio.play('select')
            choice = items[self.sel]
            if choice in ('PLAY', 'CONTINUE'):
                self.game.change(PlayScene(self.game, min(self.game.save.get('cleared', 0), len(LEVELS) - 1)))
            elif choice == 'LEVELS':
                self.game.change(LevelSelectScene(self.game))
            elif choice == 'OPTIONS':
                self.game.change(OptionsScene(self.game, lambda: TitleScene(self.game)))
            else:
                self.game.running = False

    def draw(self, surf):
        pal = WORLDS[0]
        self.draw_bg(surf)
        surf.blit(self.ground.layer, (0, 0))
        self.particles.draw(surf, 0, 0)
        self.hero.draw(surf, 0, 0)
        word = "UPDRAFT"
        x0 = VIEW_W // 2 - font.width(word, 6) // 2
        for i, ch in enumerate(word):
            x = x0 + i * 36
            y = 30 + int(math.sin(self.t * 2.4 + i * 0.6) * 3)
            font.draw(surf, ch, x, y + 5, UI_SHADOW, scale=6)
            font.draw(surf, ch, x, y + 3, SCARF_READY_DARK, scale=6)
            font.draw(surf, ch, x, y, UI_TEXT, scale=6)
        draw_glow(surf, VIEW_W // 2, 56, 90, pal['accent'], 0.12)
        font.draw(surf, "A TINY EMBER'S CLIMB TO THE SKY", VIEW_W // 2, 86, pal['accent'], align='center',
                  shadow=UI_SHADOW)
        self.items_menu(surf, self.items(), 116, pal)
        font.draw(surf, CONTROLS, VIEW_W // 2, VIEW_H - 14, UI_DIM, align='center', shadow=UI_SHADOW)


class LevelSelectScene(MenuBase):
    def __init__(self, game, sel=0):
        super().__init__(game)
        self.sel = sel

    def update(self, dt):
        self.world = LEVELS[self.sel].get('world', 0)
        self.tick(dt)
        inp = self.game.input
        n = len(LEVELS)
        old = self.sel
        if inp.pressed('left'):
            self.sel = (self.sel - 1) % n
        if inp.pressed('right'):
            self.sel = (self.sel + 1) % n
        if inp.pressed('up'):
            self.sel = (self.sel - 3) % n
        if inp.pressed('down'):
            self.sel = (self.sel + 3) % n
        if self.sel != old:
            self.audio.play('move')
        if inp.pressed('confirm') or inp.pressed('jump'):
            self.audio.play('select')
            self.game.change(PlayScene(self.game, self.sel))
        elif inp.pressed('back'):
            self.audio.play('back')
            self.game.change(TitleScene(self.game))

    def draw(self, surf):
        self.draw_bg(surf)
        sv = self.game.save
        n = len(LEVELS)
        rows = (n + 2) // 3
        cw, gap = 144, 8
        ch = min(54, (VIEW_H - 66) // rows - gap)
        x0 = VIEW_W // 2 - (3 * cw + 2 * gap) // 2
        font.draw_outlined(surf, "SELECT LEVEL", VIEW_W // 2, 10, UI_TEXT, UI_SHADOW, scale=2, align='center')
        for i, data in enumerate(LEVELS):
            pal = WORLDS[data.get('world', 0)]
            sel = i == self.sel
            x = x0 + (i % 3) * (cw + gap)
            y = 34 + (i // 3) * (ch + gap) - (int(abs(math.sin(self.t * 5)) * 2) if sel else 0)
            surf.fill(UI_SHADOW, (x - 1, y - 1, cw + 2, ch + 2))
            surf.fill(pal['sky'], (x, y, cw, ch))
            surf.fill(pal['tile'], (x, y + ch - 6, cw, 6))
            surf.fill(pal['tile_top'], (x, y + ch - 7, cw, 2))
            if sel:
                pygame.draw.rect(surf, pal['accent'], (x - 1, y - 1, cw + 2, ch + 2), 1)
            key = str(i)
            done = key in sv['best']
            font.draw(surf, str(i + 1), x + 6, y + 6, pal['accent'] if sel else pal['text'], scale=2, shadow=UI_SHADOW)
            font.draw(surf, data['name'], x + 28, y + 6, UI_TEXT if sel else UI_DIM)
            best = sv['best'].get(key)
            font.draw(surf, fmt_time(best) if done else "NEW", x + 28, y + 17, UI_GOOD if done else pal['accent'])
            got, total = sv['embers'].get(key, 0), EMBER_COUNTS[i]
            font.draw(surf, f"{got}/{total}", x + cw - 6, y + 17, EMBER if got == total and total else UI_DIM,
                      align='right')
        tot_e = sum(sv['embers'].get(str(i), 0) for i in range(n))
        font.draw(surf, f"EMBERS {tot_e}/{sum(EMBER_COUNTS)}     DEATHS {sv.get('deaths', 0)}",
                  VIEW_W // 2, VIEW_H - 14, UI_DIM, align='center', shadow=UI_SHADOW)


class OptionsScene(MenuBase):
    def __init__(self, game, back):
        super().__init__(game)
        self.back = back

    def labels(self):
        o = self.game.save['opt']
        onoff = lambda v: 'ON' if v else 'OFF'
        return [f"MUSIC  {onoff(o['music'])}", f"SOUND  {onoff(o['sfx'])}",
                f"SCREEN SHAKE  {onoff(o['shake'])}", "TOGGLE FULLSCREEN", "BACK"]

    def update(self, dt):
        self.tick(dt)
        inp = self.game.input
        self.nav(5)
        o = self.game.save['opt']
        hit = inp.pressed('confirm') or inp.pressed('jump') or inp.pressed('left') or inp.pressed('right')
        if inp.pressed('back'):
            self.audio.play('back')
            self.game.change(self.back())
            return
        if not hit:
            return
        if self.sel == 0:
            o['music'] = not o['music']
        elif self.sel == 1:
            o['sfx'] = not o['sfx']
        elif self.sel == 2:
            o['shake'] = not o['shake']
        elif self.sel == 3 and not (inp.pressed('left') or inp.pressed('right')):
            pygame.display.toggle_fullscreen()
        elif self.sel == 4 and not (inp.pressed('left') or inp.pressed('right')):
            self.audio.play('back')
            self.game.change(self.back())
            return
        self.game.apply_options()
        self.game.write_save()
        self.audio.play('select')

    def draw(self, surf):
        self.draw_bg(surf)
        font.draw_outlined(surf, "OPTIONS", VIEW_W // 2, 50, UI_TEXT, UI_SHADOW, scale=2, align='center')
        self.items_menu(surf, self.labels(), 100, WORLDS[0], 18)
        font.draw(surf, "M MUTES MUSIC   F11 FULLSCREEN   R QUICK RESPAWN", VIEW_W // 2, VIEW_H - 14, UI_DIM,
                  align='center', shadow=UI_SHADOW)


class EndScene(MenuBase):
    world = 2

    def __init__(self, game):
        super().__init__(game)
        self.particles = Particles()
        self.boom = 0.4

    def update(self, dt):
        self.tick(dt)
        self.boom -= dt
        if self.boom <= 0:
            self.boom = random.uniform(0.25, 0.7)
            x, y = random.uniform(60, VIEW_W - 60), random.uniform(40, 150)
            cols = random.choice(((SCARF_READY, EMBER_HI), (CRYSTAL, CRYSTAL_HI), (EMBER, PLAYER_BODY)))
            self.particles.burst(x, y, 34, cols, speed=(40, 160), life=(0.6, 1.3), grav=90, drag=1.2, size=(1, 3))
            self.particles.ring(x, y, 26, cols[1], 0.4)
            self.audio.play('stomp', 0.35)
        self.particles.update(dt)
        inp = self.game.input
        if self.t > 1.5 and (inp.pressed('confirm') or inp.pressed('jump') or inp.pressed('back')):
            self.audio.play('select')
            self.game.change(TitleScene(self.game))

    def draw(self, surf):
        self.draw_bg(surf)
        self.particles.draw(surf, 0, 0)
        sv = self.game.save
        n = len(LEVELS)
        total = sum(sv['best'].get(str(i), 0) for i in range(n))
        emb = sum(sv['embers'].get(str(i), 0) for i in range(n))
        font.draw_outlined(surf, "YOU REACHED THE SKY", VIEW_W // 2, 60, UI_TEXT, UI_SHADOW, scale=2, align='center')
        lines = [("SUM OF BEST TIMES", fmt_time(total)), ("EMBERS", f"{emb}/{sum(EMBER_COUNTS)}"),
                 ("DEATHS", str(sv.get('deaths', 0)))]
        for i, (a, b) in enumerate(lines):
            font.draw(surf, a, VIEW_W // 2 - 100, 100 + i * 14, UI_DIM, shadow=UI_SHADOW)
            font.draw(surf, b, VIEW_W // 2 + 100, 100 + i * 14, UI_TEXT, align='right', shadow=UI_SHADOW)
        font.draw(surf, "THANKS FOR PLAYING", VIEW_W // 2, 170, WORLDS[2]['accent'], align='center', shadow=UI_SHADOW)
        if self.t > 1.5 and int(self.t * 2) % 2 == 0:
            font.draw(surf, "PRESS JUMP", VIEW_W // 2, 200, UI_TEXT, align='center', shadow=UI_SHADOW)
