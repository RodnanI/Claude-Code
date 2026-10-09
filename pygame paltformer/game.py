"""Window, main loop, save data and scene switching."""
import json

import pygame

from settings import (TITLE, VIEW_W, VIEW_H, FPS, DT, SAVE_PATH, GHOST_PATH, OUTLINE, PLAYER_BODY,
                      SCARF_READY, SCARF_READY_DARK)

DEFAULT_SAVE = {'best': {}, 'embers': {}, 'deaths': 0, 'cleared': 0,
                'opt': {'music': True, 'sfx': True, 'shake': True, 'ghost': True}}


class Game:
    def __init__(self):
        pygame.mixer.pre_init(22050, -16, 1, 512)
        pygame.init()
        pygame.display.set_caption(TITLE)
        pygame.display.set_icon(self.make_icon())
        self.screen = pygame.display.set_mode((VIEW_W, VIEW_H), pygame.SCALED | pygame.RESIZABLE)
        self.clock = pygame.time.Clock()
        from audio import Audio
        from inputs import Input
        self.input = Input()
        self.save = self.load_save()
        self.ghosts = self.load_json(GHOST_PATH) or {}
        self.audio = Audio()
        self.apply_options()
        self._backdrops = {}
        self.running = True
        from scenes import TitleScene
        self.scene = TitleScene(self)

    @staticmethod
    def make_icon():
        icon = pygame.Surface((32, 32), pygame.SRCALPHA)
        for i, (x, y) in enumerate(((5, 19), (3, 22), (2, 25))):
            pygame.draw.circle(icon, OUTLINE, (x, y), 4 - i)
            pygame.draw.circle(icon, SCARF_READY, (x, y), 3 - i)
        pygame.draw.rect(icon, OUTLINE, (6, 5, 22, 25), border_radius=8)
        pygame.draw.rect(icon, PLAYER_BODY, (8, 7, 18, 21), border_radius=7)
        icon.fill(OUTLINE, (7, 16, 20, 7))
        icon.fill(SCARF_READY, (8, 17, 18, 4))
        icon.fill(SCARF_READY_DARK, (8, 20, 18, 1))
        icon.fill(OUTLINE, (15, 10, 3, 4))
        icon.fill(OUTLINE, (21, 10, 3, 4))
        return icon

    def load_save(self):
        data = json.loads(json.dumps(DEFAULT_SAVE))
        try:
            with open(SAVE_PATH) as f:
                loaded = json.load(f)
            for k, v in loaded.items():
                if isinstance(v, dict) and isinstance(data.get(k), dict):
                    data[k].update(v)
                else:
                    data[k] = v
        except (OSError, ValueError):
            pass
        return data

    @staticmethod
    def load_json(path):
        try:
            with open(path) as f:
                return json.load(f)
        except (OSError, ValueError):
            return None

    def save_ghost(self, index, frames):
        self.ghosts[str(index)] = frames
        try:
            with open(GHOST_PATH, 'w') as f:
                json.dump(self.ghosts, f, separators=(',', ':'))
        except OSError:
            pass

    def write_save(self):
        try:
            with open(SAVE_PATH, 'w') as f:
                json.dump(self.save, f, indent=1)
        except OSError:
            pass

    def apply_options(self):
        o = self.save['opt']
        self.audio.sfx_on = o['sfx']
        self.audio.set_music(o['music'])
        cam = getattr(getattr(self, 'scene', None), 'camera', None)
        if cam is not None:
            cam.shake_scale = 1.0 if o['shake'] else 0.0

    def backdrop(self, world):
        if world not in self._backdrops:
            from level import make_backdrop
            self._backdrops[world] = make_backdrop(world)
        return self._backdrops[world]

    def change(self, scene):
        self.scene = scene

    def run(self):
        while self.running:
            for e in pygame.event.get():
                if e.type == pygame.QUIT:
                    self.running = False
                elif e.type == pygame.KEYDOWN and e.key == pygame.K_F11:
                    pygame.display.toggle_fullscreen()
                elif e.type == pygame.KEYDOWN and e.key == pygame.K_m:
                    self.save['opt']['music'] = not self.save['opt']['music']
                    self.apply_options()
                self.input.handle(e)
            self.input.update()
            self.scene.update(DT)
            self.scene.draw(self.screen)
            pygame.display.flip()
            self.clock.tick(FPS)
        self.write_save()
        pygame.quit()
