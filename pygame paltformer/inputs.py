"""Keyboard + gamepad input mapped onto abstract actions with clean edges."""
import pygame

KEYS = {
    'left': (pygame.K_LEFT, pygame.K_a),
    'right': (pygame.K_RIGHT, pygame.K_d),
    'up': (pygame.K_UP, pygame.K_w),
    'down': (pygame.K_DOWN, pygame.K_s),
    'jump': (pygame.K_SPACE, pygame.K_z, pygame.K_k),
    'dash': (pygame.K_x, pygame.K_LSHIFT, pygame.K_RSHIFT, pygame.K_j),
    'grapple': (pygame.K_c, pygame.K_l, pygame.K_e),
    'pause': (pygame.K_ESCAPE, pygame.K_p),
    'confirm': (pygame.K_RETURN, pygame.K_KP_ENTER, pygame.K_SPACE, pygame.K_z),
    'back': (pygame.K_ESCAPE, pygame.K_BACKSPACE, pygame.K_x),
    'restart': (pygame.K_r,),
}
# Xbox-style layout as SDL reports it on most platforms.
PAD = {
    0: ('jump', 'confirm'), 1: ('dash', 'back'), 2: ('dash',), 3: ('grapple',),
    4: ('grapple',), 5: ('grapple',), 6: ('restart',), 7: ('pause',),
}

KEY_TO_ACTIONS = {}
for _action, _keys in KEYS.items():
    for _k in _keys:
        KEY_TO_ACTIONS.setdefault(_k, []).append(_action)

DEADZONE = 0.45


class Input:
    def __init__(self):
        self.down_keys = set()
        self.down_buttons = set()
        self.sticks = {}
        self.hats = {}
        self.joys = {}
        self.cur = set()
        self.prev = set()
        self._pressed = set()
        self._released = set()
        self._taps = set()
        self.device = 'keyboard'
        pygame.joystick.init()
        for i in range(pygame.joystick.get_count()):
            self._add_joy(i)

    def _add_joy(self, index):
        try:
            joy = pygame.joystick.Joystick(index)
            joy.init()
            self.joys[joy.get_instance_id()] = joy
        except pygame.error:
            pass

    def handle(self, e):
        t = e.type
        if t == pygame.KEYDOWN:
            self.down_keys.add(e.key)
            self._taps.update(KEY_TO_ACTIONS.get(e.key, ()))
            self.device = 'keyboard'
        elif t == pygame.KEYUP:
            self.down_keys.discard(e.key)
        elif t == pygame.JOYBUTTONDOWN:
            self.down_buttons.add((e.instance_id, e.button))
            self._taps.update(PAD.get(e.button, ()))
            self.device = 'pad'
        elif t == pygame.JOYBUTTONUP:
            self.down_buttons.discard((e.instance_id, e.button))
        elif t == pygame.JOYAXISMOTION and e.axis in (0, 1):
            joy = self.joys.get(e.instance_id)
            if joy is None:
                return
            x, y = joy.get_axis(0), joy.get_axis(1) if joy.get_numaxes() > 1 else 0.0
            dirs = set()
            if x < -DEADZONE: dirs.add('left')
            if x > DEADZONE: dirs.add('right')
            if y < -DEADZONE: dirs.add('up')
            if y > DEADZONE: dirs.add('down')
            if dirs:
                self.device = 'pad'
            self.sticks[e.instance_id] = dirs
        elif t == pygame.JOYHATMOTION:
            x, y = e.value
            dirs = set()
            if x < 0: dirs.add('left')
            if x > 0: dirs.add('right')
            if y > 0: dirs.add('up')
            if y < 0: dirs.add('down')
            if dirs:
                self.device = 'pad'
            self.hats[(e.instance_id, e.hat)] = dirs
        elif t == pygame.JOYDEVICEADDED:
            self._add_joy(e.device_index)
        elif t == pygame.JOYDEVICEREMOVED:
            self.joys.pop(e.instance_id, None)
            self.sticks.pop(e.instance_id, None)
            self.down_buttons = {b for b in self.down_buttons if b[0] != e.instance_id}
        elif t == pygame.WINDOWFOCUSLOST:
            self.down_keys.clear()

    def update(self):
        cur = set()
        for k in self.down_keys:
            cur.update(KEY_TO_ACTIONS.get(k, ()))
        for _, b in self.down_buttons:
            cur.update(PAD.get(b, ()))
        for dirs in self.sticks.values():
            cur |= dirs
        for dirs in self.hats.values():
            cur |= dirs
        self._pressed = (cur - self.prev) | self._taps
        self._released = self.prev - cur
        self.prev = cur
        self.cur = cur
        self._taps = set()

    def held(self, a):
        return a in self.cur

    def pressed(self, a):
        return a in self._pressed

    def released(self, a):
        return a in self._released

    def consume(self, a):
        self._pressed.discard(a)

    def ax(self):
        return ('right' in self.cur) - ('left' in self.cur)

    def ay(self):
        return ('down' in self.cur) - ('up' in self.cur)
