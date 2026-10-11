"""Andor level builder.

Levels are composed with a few primitives (buildings, carves, platforms,
stamps of ASCII) and written to src/16_levels.js. Run:
    python3 tools/levelgen.py            # write the JS
    python3 tools/levelgen.py preview    # also write tools/out/levelN.png previews
    python3 tools/levelgen.py check      # reachability report
The legend lives at the top of src/16_levels.js.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class L:
    def __init__(self, W, H, **meta):
        self.W, self.H = W, H
        self.g = [['.'] * W for _ in range(H)]
        self.back = []
        self.hints = []
        self.meta = meta

    def inb(self, x, y):
        return 0 <= x < self.W and 0 <= y < self.H

    def put(self, x, y, ch):
        if self.inb(x, y):
            self.g[y][x] = ch

    def fill(self, x0, y0, x1, y1, ch='#'):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for x in range(min(x0, x1), max(x0, x1) + 1):
                self.put(x, y, ch)

    def carve(self, x0, y0, x1, y1):
        self.fill(x0, y0, x1, y1, '.')

    def bld(self, x0, x1, top, ch='#'):
        self.fill(x0, top, x1, self.H - 1, ch)

    def row(self, x0, x1, y, ch):
        self.fill(x0, y, x1, y, ch)

    def col(self, x, y0, y1, ch):
        self.fill(x, y0, x, y1, ch)

    def stamp(self, x, y, rows):
        """ASCII block. Space leaves the cell untouched; everything else is written."""
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch != ' ':
                    self.put(x + i, y + j, ch)

    def coins(self, pts, ch='o'):
        for (x, y) in pts:
            self.put(x, y, ch)

    def arc(self, x0, x1, y, h, ch='o'):
        n = x1 - x0
        for i in range(n + 1):
            t = i / max(1, n)
            self.put(x0 + i, round(y - 4 * h * t * (1 - t)), ch)

    def zone(self, x0, y0, x1, y1, v=1):
        self.back.append([x0, y0, x1 - x0 + 1, y1 - y0 + 1] + ([v] if v != 1 else []))

    def hint(self, x0, y0, x1, y1, key):
        self.hints.append([x0, y0, x1 - x0 + 1, y1 - y0 + 1, key])

    def rows(self):
        return [''.join(r) for r in self.g]

    def find(self, ch):
        return [(x, y) for y in range(self.H) for x in range(self.W) if self.g[y][x] == ch]


# ---------------------------------------------------------------------------
# CHAPTER I: THE BAZAAR OF ISFAHAN (night rooftops)
def level_bazaar():
    lv = L(274, 26)
    H = 26
    # -- 1. The Hakim's house --------------------------------------------
    lv.bld(0, 11, 9)
    lv.row(0, 11, 9, '%')
    lv.carve(1, 10, 10, 16)
    lv.carve(11, 14, 11, 16)
    lv.zone(1, 10, 10, 16)
    lv.put(2, 16, '@')
    lv.put(5, 16, '?')
    lv.put(8, 16, 'P')
    lv.put(3, 10, 'l')
    lv.put(8, 10, 'l')
    lv.row(1, 4, 14, '=')            # bookshelf ledge with a dinar
    lv.put(2, 13, 'o')
    lv.hint(1, 10, 6, 16, 'move')
    lv.hint(7, 10, 10, 16, 'whip')
    lv.bld(12, 25, 17)
    lv.row(13, 17, 17, '%')
    lv.fill(18, 16, 19, 16)
    lv.arc(16, 21, 15, 2)
    # -- 2. First alley, a guard, the awning bounce -----------------------
    lv.bld(29, 39, 17)               # pit 26-28
    lv.put(34, 16, 'g')
    lv.put(38, 16, 'P')
    lv.bld(40, 45, 15)
    lv.bld(46, 47, 17)
    lv.row(46, 47, 16, 'w')
    lv.bld(48, 61, 11)
    lv.row(48, 61, 11, '%')
    lv.coins([(50, 10), (52, 10), (54, 10), (56, 10), (58, 10)])
    lv.hint(43, 9, 47, 15, 'awning')
    # -- 3. High roofs, the archer's minaret -----------------------------
    lv.bld(66, 92, 13)               # pit 62-65
    lv.fill(78, 5, 81, 12)           # the minaret, with an arch underneath
    lv.row(77, 82, 5, '%')
    lv.carve(79, 11, 80, 12)
    lv.row(74, 77, 10, '=')
    lv.row(74, 77, 7, '=')
    lv.put(81, 4, 'a')
    lv.put(78, 4, '*')               # relic 1, on the archer's perch
    lv.coins([(75, 9), (76, 9), (75, 6), (76, 6)])
    lv.put(71, 12, 'g')
    lv.put(86, 12, 'P')
    lv.put(89, 12, 'P')
    lv.bld(93, 95, 15)               # steps down to the bazaar
    lv.bld(96, 98, 17)
    # -- 4. The covered bazaar -------------------------------------------
    lv.bld(99, 136, 9)
    lv.row(99, 136, 9, '%')
    lv.carve(99, 10, 135, 16)
    lv.zone(100, 10, 135, 16)
    for x in range(102, 134, 6):
        lv.put(x, 10, 'l')
    lv.row(104, 109, 14, '=')
    lv.row(115, 120, 13, '=')
    lv.row(126, 131, 14, '=')
    lv.row(131, 134, 12, '=')
    lv.coins([(105, 13), (106, 13), (107, 13), (108, 13), (116, 12), (117, 12), (118, 12), (119, 12), (127, 13), (128, 13), (129, 13)])
    lv.put(103, 16, 'P')
    lv.put(110, 16, 'g')
    lv.put(123, 16, 'g')
    lv.put(125, 16, 'P')
    lv.put(118, 16, 'Q')
    lv.put(113, 12, '?')
    lv.carve(132, 9, 134, 9)         # a hatch in the roof, up from the ledges
    # secret: a false wall at the hall's east end hides a stash
    lv.bld(137, 141, 9)
    lv.fill(136, 14, 140, 16, 'F')
    lv.zone(137, 14, 140, 16)
    lv.put(139, 16, '*')             # relic 2
    lv.coins([(138, 15), (140, 15)])
    lv.hint(130, 11, 135, 16, 'hatch')
    # -- 5. Courtyard flame and the first ring ---------------------------
    lv.bld(142, 150, 9)
    lv.row(142, 150, 9, '%')
    lv.put(145, 8, 'K')
    lv.put(148, 8, 'h')
    lv.put(156, 3, 'R')              # wide street below (151-161): swing it
    lv.hint(146, 2, 151, 8, 'ring')
    lv.coins([(153, 5), (154, 4), (158, 4), (159, 5)])
    lv.bld(162, 170, 12)
    lv.row(162, 170, 12, '%')
    lv.put(167, 11, 'P')
    # -- 6. The wind-catcher: a wall-jump shaft ---------------------------
    lv.bld(171, 172, 2)
    lv.bld(176, 177, 5)
    lv.carve(173, 2, 175, 11)
    lv.zone(173, 2, 175, 11)
    lv.bld(173, 175, 12)             # shaft floor
    lv.carve(171, 10, 172, 11)       # door in from the roof
    lv.coins([(174, 9), (174, 7), (174, 5), (174, 3)])
    lv.hint(170, 3, 175, 11, 'walljump')
    lv.bld(178, 196, 6)
    lv.row(178, 196, 6, '%')
    lv.put(184, 5, 'a')
    lv.put(190, 5, 'g')
    lv.put(193, 5, 'P')
    lv.arc(179, 183, 4, 2)
    # -- 7. Laundry lines and crumbling roofs -----------------------------
    lv.row(199, 203, 8, '-')
    lv.row(207, 209, 10, 'C')
    lv.row(213, 217, 9, '-')
    lv.put(221, 4, 'R')
    lv.row(225, 228, 8, 'C')
    lv.row(213, 217, 3, '-')         # high line with relic 3, swing up to it
    lv.put(215, 2, '*')
    lv.put(210, 1, 'R')
    lv.coins([(200, 7), (201, 7), (202, 7), (214, 8), (215, 8), (216, 8), (226, 7), (227, 7)])
    lv.hint(204, 4, 212, 9, 'dash')
    lv.bld(231, 240, 9)
    lv.put(233, 8, 'a')
    lv.row(235, 237, 8, '^')
    lv.put(239, 8, '?')
    # -- 8. A last flame before the gate ---------------------------------
    lv.bld(241, 244, 15)
    lv.put(242, 14, 'K')
    lv.bld(245, 273, 21)
    # -- 9. The city gate: Captain Bahram ---------------------------------
    lv.fill(246, 9, 247, 17)         # arena gatehouse over the door
    lv.row(245, 248, 8, '%')
    lv.fill(270, 6, 271, 16)         # the gate towers
    lv.row(269, 272, 5, '%')
    lv.row(248, 252, 9, '%')
    lv.row(265, 269, 9, '%')
    lv.row(248, 249, 20, 'w')
    lv.row(268, 269, 20, 'w')
    lv.row(255, 262, 16, '=')
    lv.put(258, 11, 'R')
    lv.put(262, 20, '1')
    lv.zone(248, 10, 269, 20)
    lv.put(272, 20, 'E')
    lv.meta['arena'] = dict(x=247, y=6, w=25, h=16, trigger=3, floor=21, seal=[[246, 18, 3], [270, 17, 4]])
    return lv


def write_js(levels):
    out = []
    out.append('// ANDOR :: level maps (generated by tools/levelgen.py; edit there).')
    out.append('// Legend ---------------------------------------------------------------------')
    out.append('//  #  solid           %  ornamental solid    =  ledge (one-way)   w  awning (bouncy)')
    out.append('//  ^ v { }  spikes (up, down, left, right)   q  quicksand   F  false wall (secret)')
    out.append('//  C  crumbling block G  gate (opened by L lever)   D  dart trap (in a wall)')
    out.append('//  @  start   E exit   K checkpoint flame   R whip ring   P pot   ? lore scroll')
    out.append('//  o  dinar   O emerald (10)   $ ruby (25)   h pomegranate   * relic')
    out.append('//  t  torch   l lantern   M/N moving platform (horiz/vert)  x platform stop')
    out.append('//  Y  swinging blade   f fire jet   r falling rock   B boulder   & boulder trigger')
    out.append('//  g guard  a archer  d bandit  s scorpion  c cobra  u vulture  b bat')
    out.append('//  m mummy  k scarabs  j jackal warrior  n brass sentinel  z djinn wisp')
    out.append('//  1-4 bosses   Q camel   Z skull')
    out.append('')
    out.append('const LEVELS = [')
    for lv in levels:
        meta = dict(lv.meta)
        meta['map'] = lv.rows()
        meta['back'] = lv.back
        meta['hints'] = lv.hints
        out.append('  ' + json.dumps(meta, indent=None, separators=(', ', ': ')).replace('"map": [', '"map": [\n    ').replace('", "', '",\n    "') + ',')
    out.append('];')
    open(os.path.join(ROOT, 'src', '16_levels.js'), 'w').write('\n'.join(out) + '\n')


COLORS = {
    '#': (176, 120, 70), '%': (63, 181, 163), '=': (139, 90, 52), '-': (216, 196, 154), 'w': (192, 57, 43), '^': (200, 200, 210), 'v': (200, 200, 210),
    '{': (200, 200, 210), '}': (200, 200, 210), 'q': (230, 192, 132), 'F': (120, 90, 60), 'C': (150, 110, 70), 'G': (90, 90, 90),
    '@': (255, 255, 255), 'E': (255, 240, 120), 'K': (255, 140, 40), 'R': (255, 210, 60), 'o': (250, 200, 50), 'O': (40, 200, 100),
    '$': (230, 40, 40), 'h': (220, 50, 60), '*': (255, 255, 0), '?': (240, 230, 200), 'P': (60, 160, 150),
}


def preview(lv, path, s=4):
    from PIL import Image, ImageDraw
    im = Image.new('RGB', (lv.W * s, lv.H * s), (20, 26, 30))
    d = ImageDraw.Draw(im)
    for (x0, y0, w, h, *_) in lv.back:
        d.rectangle([x0 * s, y0 * s, (x0 + w) * s - 1, (y0 + h) * s - 1], fill=(60, 44, 32))
    for y in range(lv.H):
        for x in range(lv.W):
            ch = lv.g[y][x]
            if ch == '.':
                continue
            c = COLORS.get(ch, (240, 60, 240))
            if ch.isalpha() and ch not in 'qFCGwPEKRQZhO':
                c = (255, 70, 70) if ch.islower() else (255, 120, 255)
            if ch in '=w-':
                d.rectangle([x * s, y * s, x * s + s - 1, y * s + 1], fill=c)
            else:
                d.rectangle([x * s, y * s, x * s + s - 1, y * s + s - 1], fill=c)
    for i in range(0, lv.W, 10):
        d.line([i * s, 0, i * s, 2], fill=(255, 255, 255))
    im.save(path)


# ---------------------------------------------------------------------------
# Approximate reachability: BFS over standing cells. Jumps are swept along
# parabolas derived from the game's constants (run 6.75 tiles/s, gravity
# 62.5 tiles/s^2, peak 3.6 tiles) with the player's real hitbox, plus an air
# dash, ledge grabs, awning bounces, wall-jump shafts and ring swings.
import math

def check(lv, name, verbose=False):
    W, H = lv.W, lv.H
    g = lv.g
    SOL = set('#%CGD')

    def solid(x, y):
        if x < 0 or x >= W:
            return True
        if y < 0 or y >= H:
            return False
        return g[y][x] in SOL

    def spike(x, y):
        return 0 <= x < W and 0 <= y < H and g[y][x] in '^v{}'

    def floor(x, y):
        return 0 <= x < W and 0 <= y < H and g[y][x] in '#%CGD=w-'

    def body_ok(px, f, allow_spike=False):
        # px: left of the cell + offset (tile units), f: feet height (tile units, bottom edge)
        x0, x1 = px + 0.5 - 0.31, px + 0.5 + 0.31
        y0, y1 = f - 1.25, f - 0.01
        for ty in range(math.floor(y0), math.floor(y1) + 1):
            for tx in range(math.floor(x0), math.floor(x1) + 1):
                if solid(tx, ty):
                    return False
                if not allow_spike and spike(tx, ty):
                    return False
        return True

    def stand(x, y):
        return 0 <= x < W and 0 <= y < H and body_ok(x, y + 1) and floor(x, y + 1) and not solid(x, y)

    def land_below(x, y):
        while y < H:
            if not body_ok(x, y + 1):
                return None
            if floor(x, y + 1) and body_ok(x, y + 1):
                return (x, y)
            y += 1
        return None

    RUN, G, PEAK = 6.75, 62.5, 3.6

    def arc_ok(x0, y0, x1, y1, peak=PEAK, dash=2.8):
        rise = y0 - y1
        dx = x1 - x0
        for hp in (max(rise, 0) + 0.35, max(rise, 0) + 1.3, peak):
            if hp > peak + 0.01 or hp < rise + 0.15:
                continue
            tr = math.sqrt(2 * hp / G)
            tf = math.sqrt(max(0.0, 2 * (hp - rise) / G))
            reach = RUN * (tr + tf)
            if abs(dx) > reach + dash:
                continue
            tp = tr / (tr + tf) if tr + tf > 0 else 0.5
            n = max(8, int(abs(dx) * 4) + 8)
            ok = True
            for i in range(1, n + 1):
                u = i / n
                if tp > 0 and u <= tp:
                    z = hp * (1 - ((tp - u) / tp) ** 2)
                else:
                    z = hp - (hp - rise) * ((u - tp) / (1 - tp)) ** 2 if tp < 1 else hp
                px = x0 + dx * u
                f = (y0 + 1) - z
                if not body_ok(px, f):
                    ok = False
                    break
            if ok:
                return True
        return False

    rings = lv.find('R')
    awn = set(lv.find('w'))
    start = lv.find('@')[0]
    seen = {start}
    q = [start]
    while q:
        x, y = q.pop()
        nexts = []
        for d in (-1, 1):
            if body_ok(x + d, y + 1):
                r = land_below(x + d, y)
                if r:
                    nexts.append(r)
        peak = PEAK
        if (x, y + 1) in awn:
            peak = 6.6
        for ty in range(max(0, y - 7), min(H, y + 14)):
            for tx in range(max(0, x - 12), min(W, x + 13)):
                if (tx, ty) == (x, y) or not stand(tx, ty):
                    continue
                if (tx, ty) in seen:
                    continue
                if arc_ok(x, y, tx, ty, peak):
                    nexts.append((tx, ty))
                # ledge grab: up to ~4.4 tiles, ending against the ledge
                elif 0 < y - ty <= 4 and abs(tx - x) <= 2 and solid(tx, ty + 1) and arc_ok(x, y, tx - (1 if tx > x else -1 if tx < x else 0), ty + 1, PEAK):
                    nexts.append((tx, ty))
        # wall-jump shafts: walls on both sides 1-3 apart let you climb
        for d in (-1, 1):
            if solid(x + d, y) and solid(x + d, y - 1):
                for w in range(1, 4):
                    if solid(x - d * w, y - 1) or solid(x - d * w, y - 2):
                        lo, hi = min(x, x - d * (w - 1)), max(x, x - d * (w - 1))
                        yy = y
                        while yy > 0 and not solid(x, yy - 2):
                            yy -= 1
                            for xx in range(lo - 1, hi + 2):
                                for oy in (0, -1, -2):
                                    if stand(xx, yy + oy):
                                        nexts.append((xx, yy + oy))
                            # over the top of either wall
                            for e in (x + d * 2, x - d * (w + 1), x + d * 3, x - d * (w + 2)):
                                for oy in range(-2, 3):
                                    if stand(e, yy + oy):
                                        nexts.append((e, yy + oy))
                        break
        # rings: in reach (after a jump), swing and land in a wide band
        for (rx, ry) in rings:
            if abs(rx - x) <= 6 and 1 < y - ry <= 8:
                for tx in range(rx - 9, rx + 10):
                    for ty in range(ry - 3, ry + 10):
                        if stand(tx, ty):
                            nexts.append((tx, ty))
        for r in nexts:
            if r not in seen:
                seen.add(r)
                q.append(r)
    report = []
    for ch, what in (('E', 'exit'), ('*', 'relic'), ('K', 'flame'), ('?', 'scroll'), ('1', 'boss'), ('2', 'boss'), ('3', 'boss'), ('4', 'boss'), ('o', 'dinar')):
        for (x, y) in lv.find(ch):
            near = any((x + dx, y + dy) in seen for dx in range(-3, 4) for dy in range(-1, 4))
            if not near:
                report.append(f'  UNREACHABLE {what} at ({x},{y})')
    print(f'{name}: {len(seen)} standing cells reachable' + ('' if report else ', all key items reachable'))
    for r in report[:40]:
        print(r)
    if verbose:
        mx = max(seen)
        print('  furthest x', mx)
    return seen


LEVEL_FUNCS = [level_bazaar]

if __name__ == '__main__':
    levels = []
    for i, f in enumerate(LEVEL_FUNCS):
        lv = f()
        lv.meta.setdefault('theme', ['bazaar', 'desert', 'tomb', 'andor'][i])
        levels.append(lv)
    meta = [
        dict(theme='bazaar', music='bazaar', ambience='bazaar', par=300, scrolls=[
            "A merchant's ledger: \"Saffron, three dinars. Rosewater, two. A map to Andor: NOT FOR SALE, not to the vizier, not at any price.\"",
            "Chalked inside a stall: The Watch searches the roofs by night. Their captain fights like a lion, but he guards his left side.",
            "Scratched beneath the archer's post: \"Bahram drills his men at the city gate. Nobody leaves Isfahan tonight. Nobody.\"",
        ]),
    ]
    for lv, m in zip(levels, meta):
        for k, v in m.items():
            lv.meta.setdefault(k, v)
    # chapters not yet authored reuse the first map so the game stays runnable
    while len(levels) < 4:
        cp = L(levels[0].W, levels[0].H)
        cp.g = [r[:] for r in levels[0].g]
        cp.back = levels[0].back
        cp.hints = levels[0].hints
        cp.meta = dict(levels[0].meta)
        cp.meta['theme'] = ['bazaar', 'desert', 'tomb', 'andor'][len(levels)]
        levels.append(cp)
    write_js(levels)
    print('wrote src/16_levels.js')
    if 'preview' in sys.argv:
        os.makedirs(os.path.join(ROOT, 'tools', 'out'), exist_ok=True)
        for i, lv in enumerate(levels[:len(LEVEL_FUNCS)]):
            preview(lv, os.path.join(ROOT, 'tools', 'out', f'level{i}.png'))
    if 'check' in sys.argv:
        for i, lv in enumerate(levels[:len(LEVEL_FUNCS)]):
            check(lv, f'level {i}')
