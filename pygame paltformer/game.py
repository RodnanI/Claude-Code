"""Window, main loop, save data and scene switching."""
import json

import pygame

from settings import TITLE, VIEW_W, VIEW_H, FPS, DT, SAVE_PATH

DEFAULT_SAVE = {'best': {}, 'embers': {}, 'deaths': 0, 'cleared': 0,
                'opt': {'music': True, 'sfx': True, 'shake': True}}


class Game:
    def __init__(self):
        pygame.mixer.pre_init(22050, -16, 1, 512)
        pygame.init()
        pygame.display.set_caption(TITLE)
        self.screen = pygame.display.set_mode((VIEW_W, VIEW_H), pygame.SCALED | pygame.RESIZABLE)
        self.clock = pygame.time.Clock()
        from audio import Audio
        from inputs import Input
        self.input = Input()
        self.save = self.load_save()
        self.audio = Audio()
        self.apply_options()
        self._backdrops = {}
        self.running = True
        from scenes import TitleScene
        self.scene = TitleScene(self)

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
