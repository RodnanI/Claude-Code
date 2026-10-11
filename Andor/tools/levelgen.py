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
    lv.put(272, 20, 'E')
    lv.meta['arena'] = dict(x=247, y=6, w=25, h=17, trigger=3, floor=21, seal=[[246, 18, 3], [270, 17, 4]])
    return lv


# ---------------------------------------------------------------------------
# CHAPTER II: THE SEA OF DUNES
def level_desert():
    lv = L(266, 26)
    H = 26
    G = 20  # main ground surface row
    # -- 1. Caravan camp --------------------------------------------------
    lv.bld(0, 27, G)
    lv.put(2, G - 1, '@')
    lv.put(6, G - 1, 'T')
    lv.put(11, G - 1, 'Q')
    lv.put(14, G - 1, '?')
    lv.put(16, G - 1, 'P')
    lv.put(4, G - 1, 'p')
    lv.fill(19, G - 1, 22, G - 1)
    lv.arc(18, 23, G - 3, 2)
    lv.put(25, G - 1, 's')
    # -- 2. Dune steps -----------------------------------------------------
    lv.bld(28, 33, G - 1)
    lv.bld(34, 38, G - 2)
    lv.bld(39, 44, G - 4)
    lv.put(42, G - 5, 'c')
    lv.bld(45, 49, G - 2)
    lv.bld(50, 58, G)
    lv.put(53, G - 1, 's')
    lv.put(47, 9, 'u')
    lv.arc(34, 38, G - 5, 2)
    lv.arc(45, 49, G - 5, 2)
    lv.put(57, G - 1, 'P')
    # -- 3. Quicksand flats ------------------------------------------------
    lv.bld(59, 92, G)
    for x0 in (62, 69, 76, 83):
        lv.fill(x0, G, x0 + 3, G + 1, 'q')
    for x0 in (66, 73, 80):
        lv.fill(x0, G - 2, x0 + 2, G - 1, '%')
    lv.put(74, G - 3, 'c')
    for x0 in (62, 69, 76, 83):
        lv.arc(x0, x0 + 3, G - 3, 1)
    lv.hint(58, G - 7, 62, G - 1, 'quicksand')
    lv.put(89, G - 1, 's')
    lv.put(80, 8, 'u')
    # -- 4. The ruined temple ---------------------------------------------
    lv.bld(93, 126, G)
    lv.fill(95, 9, 96, G - 1, '%')          # west wall
    lv.carve(95, G - 3, 96, G - 1)          # west door
    lv.fill(121, 9, 122, G - 1, '%')        # east wall
    lv.carve(121, 13, 122, 15)              # east door, raised
    lv.fill(95, 9, 122, 10, '%')            # roof
    lv.carve(106, 9, 109, 10)               # collapsed roof
    lv.zone(97, 11, 120, G - 1)
    lv.row(99, 103, 17, '=')
    lv.row(106, 109, 15, '=')
    lv.row(112, 115, 14, '=')
    lv.row(116, 120, 16, '=')
    lv.put(121, G - 2, 'D')                 # dart trap, head height, firing west
    lv.hint(97, G - 5, 101, G - 1, 'duck')
    lv.row(106, 108, G, 'C')                # crumbling floor over spikes
    lv.carve(106, G + 1, 108, H - 1)
    lv.row(106, 108, H - 1, '^')
    lv.put(101, 16, '?')
    lv.put(113, 13, 'P')
    lv.coins([(99, 16), (100, 16), (102, 16), (103, 16), (107, 14), (108, 14), (114, 13)])
    lv.put(116, G - 1, 'd')
    # relic 1: inside the west wall, behind a false face
    lv.fill(95, 11, 96, 14, 'F')
    lv.zone(95, 11, 96, 14)
    lv.put(96, 13, '*')
    lv.put(95, 13, 'o')
    # out the east door onto a broken lintel
    lv.row(123, 125, 16, '%')
    # -- 5. The oasis -------------------------------------------------------
    lv.bld(127, 142, G)
    lv.put(130, G - 1, 'K')
    lv.put(128, G - 1, 'p')
    lv.put(135, G - 1, 'p')
    lv.put(140, G - 1, 'p')
    lv.put(133, G - 1, 'h')
    lv.put(138, G - 1, 'Q')
    # -- 6. The sandstorm crossing ------------------------------------------
    lv.meta['storm'] = [[143, 202, 0.85]]
    lv.bld(143, 150, G)
    lv.put(155, G - 7, 'R')                 # gap 151-158
    lv.coins([(153, G - 4), (155, G - 3), (157, G - 4)])
    lv.bld(159, 166, G - 2)
    lv.put(163, G - 3, 'd')
    lv.bld(170, 174, G - 4)                 # gap 167-169
    lv.put(172, G - 5, 'c')
    lv.put(179, G - 11, 'R')                # gap 175-183
    lv.put(181, 7, 'u')
    lv.bld(184, 190, G - 1)
    lv.put(187, G - 2, 'd')
    # a chimney between two pillars of rock; the relic waits on the taller one
    lv.bld(191, 192, 8)
    lv.bld(196, 197, 5)
    lv.bld(193, 195, G - 1)
    lv.carve(191, G - 3, 192, G - 2)        # a crack into the chimney
    lv.coins([(194, 15), (194, 12), (194, 9)])
    lv.put(197, 4, '*')                     # relic 2
    lv.bld(198, 202, G - 1)
    lv.put(200, G - 2, 'h')
    lv.hint(190, 8, 195, G - 2, 'walljump')
    # -- 7. The canyon --------------------------------------------------------
    lv.bld(203, 206, G - 1)
    lv.bld(207, 209, G + 3)                 # drop to the canyon floor
    lv.row(207, 209, G + 3, '#')
    lv.bld(210, 222, G + 4)
    lv.put(213, G + 3, 's')
    lv.put(218, G + 3, 's')
    lv.row(211, 213, G - 1, 'C')
    lv.row(216, 218, G - 3, 'C')
    lv.bld(223, 226, G - 2)                 # climb out east
    lv.fill(221, G + 1, 222, G + 3, '#')
    lv.coins([(212, G - 2), (217, G - 4), (215, G + 2), (216, G + 2)])
    # relic 3: a cave in the canyon's west cliff, behind false rock
    lv.fill(204, G + 1, 206, G + 3, 'F')
    lv.zone(204, G + 1, 206, G + 3)
    lv.carve(204, G + 4, 206, G + 4)
    lv.row(204, 206, G + 4, '#')
    lv.put(204, G + 3, '*')
    lv.put(205, G + 3, 'O')
    # -- 8. The last flame ---------------------------------------------------
    lv.bld(227, 232, G)
    lv.put(229, G - 1, 'K')
    lv.put(231, G - 1, 'h')
    # -- 9. Al-Aqrab's nest -------------------------------------------------
    lv.bld(233, 265, G)
    lv.fill(232, 9, 234, G - 4)              # nest walls of piled rock, tunnels under
    lv.fill(262, 9, 264, G - 4)
    lv.row(231, 235, 8, '%')
    lv.row(261, 265, 8, '%')
    lv.row(238, 242, G - 5, '%')
    lv.row(254, 258, G - 5, '%')
    lv.put(248, G - 9, 'R')
    lv.put(256, G - 1, '2')
    lv.put(264, G - 1, 'E')
    lv.put(237, G - 1, 'Z')
    lv.put(259, G - 1, 'Z')
    lv.meta['arena'] = dict(x=233, y=6, w=30, h=G - 4, trigger=3, floor=G, seal=[[233, G - 3, 3], [262, G - 3, 3]])
    return lv


# ---------------------------------------------------------------------------
# CHAPTER III: THE TOMB OF KHEMET-RA (carved out of solid rock)
def level_tomb():
    W, H = 332, 30
    lv = L(W, H)
    lv.fill(0, 0, W - 1, H - 1, '#')
    lv.meta['interior'] = True
    # -- 1. The descent ---------------------------------------------------
    lv.carve(1, 2, 29, 14)
    lv.fill(1, 7, 6, 14)
    lv.fill(7, 9, 9, 14)
    lv.fill(10, 11, 12, 14)
    lv.fill(13, 13, 15, 14)
    lv.put(3, 6, '@')
    lv.put(5, 6, '?')
    lv.put(8, 4, 't')
    lv.put(18, 9, 't')
    lv.put(27, 9, 't')
    lv.put(11, 10, 'P')
    lv.put(22, 14, 'P')
    lv.row(19, 23, 10, '%')                 # painted lintel
    lv.coins([(20, 9), (21, 9), (22, 9)])
    lv.carve(20, 10, 22, 10)
    lv.row(19, 23, 11, '=')
    # -- 2. The dart corridor -----------------------------------------------
    lv.carve(30, 12, 56, 14)
    lv.put(57, 13, 'D')
    lv.hint(29, 11, 34, 14, 'duck')
    lv.coins([(36, 14), (40, 14), (44, 14), (48, 14)])
    lv.put(33, 11, 't')
    lv.put(45, 11, 't')
    lv.carve(51, 15, 53, 19)                # a shaft down out of the dart line
    lv.carve(51, 17, 57, 19)
    # -- 3. The pit of blades -------------------------------------------------
    lv.carve(58, 8, 97, 27)
    lv.fill(58, 20, 61, H - 1)              # entry ledge
    lv.fill(93, 20, 97, H - 1)              # far ledge
    lv.row(62, 92, 28, '^')
    lv.fill(62, 29, 92, 29)
    for x0, y in ((65, 20), (73, 19), (89, 20)):
        lv.row(x0, x0 + 2, y, '=')
    for x in (69, 77):
        lv.row(x - 1, x + 1, 13, '%')
        lv.put(x, 14, 'Y')
    lv.put(81, 12, 'R')
    lv.row(87, 89, 12, '=')                 # high ledge with relic 1: swing hard
    lv.put(88, 11, '*')
    lv.coins([(66, 19), (74, 18), (79, 16), (83, 16), (90, 19)])
    lv.put(59, 10, 't')
    lv.put(95, 10, 't')
    lv.put(74, 9, 't')
    lv.put(91, 19, 'h')
    lv.put(72, 9, 'b')
    # -- 4. The bat shaft -----------------------------------------------------
    lv.carve(98, 16, 102, 19)
    lv.carve(103, 16, 110, 27)
    lv.row(103, 105, 21, '=')
    lv.row(108, 110, 24, '=')
    lv.put(106, 17, 'b')
    lv.put(108, 20, 'b')
    lv.put(104, 25, 'b')
    lv.coins([(104, 20), (109, 23), (106, 26)])
    lv.put(110, 17, 't')
    # -- 5. Flame room ----------------------------------------------------------
    lv.carve(111, 21, 122, 27)
    lv.put(115, 27, 'K')
    lv.put(119, 27, 'h')
    lv.put(112, 23, 't')
    lv.put(121, 23, 't')
    # the crawlspace: a lesson in rolling
    lv.carve(123, 27, 127, 27)
    lv.hint(117, 24, 122, 27, 'roll')
    # -- 6. Hall of mummies -------------------------------------------------------
    lv.carve(128, 18, 167, 27)
    lv.put(135, 27, 'm')
    lv.put(149, 27, 'm')
    lv.put(160, 27, 'm')
    lv.put(141, 27, 'k')
    lv.put(155, 27, 'k')
    for x in (131, 144, 157, 165):
        lv.put(x, 27, 'S')
    lv.row(137, 141, 25, '=')
    lv.row(142, 145, 22, '=')
    lv.row(152, 155, 25, '=')
    lv.coins([(138, 24), (139, 24), (140, 24), (143, 21), (144, 21), (153, 24), (154, 24)])
    lv.put(146, 27, 'P')
    lv.put(162, 27, 'P')
    for x in (130, 140, 150, 160):
        lv.put(x, 20, 't')
    lv.carve(147, 14, 149, 17)              # alcove up to relic 2
    lv.row(147, 149, 19, '=')
    lv.put(148, 15, '*')
    lv.put(148, 17, 'o')
    lv.put(164, 27, 'j')
    lv.put(143, 19, 'r')
    # -- 7. Fire and moving stone over the spike trench -----------------------------
    lv.carve(168, 14, 202, 27)
    lv.carve(171, 28, 199, 28)
    lv.row(171, 199, 29, '^')
    for x0 in (178, 189):
        lv.fill(x0, 28, x0 + 2, 29)
        lv.put(x0 + 1, 27, 'f')
    lv.put(172, 25, 'M')
    lv.put(170, 25, 'x')
    lv.put(178, 25, 'x')
    lv.put(182, 24, 'M')
    lv.put(181, 24, 'x')
    lv.put(189, 24, 'x')
    lv.put(193, 25, 'M')
    lv.put(192, 25, 'x')
    lv.put(200, 25, 'x')
    lv.put(179, 14, 'r')
    lv.put(190, 14, 'r')
    lv.put(169, 18, 't')
    lv.put(185, 17, 't')
    lv.put(201, 18, 't')
    lv.coins([(175, 22), (185, 21), (196, 22)])
    # -- 8. The idol chamber ----------------------------------------------------------
    lv.carve(203, 14, 222, 27)
    lv.put(204, 27, 'K')
    lv.fill(208, 22, 211, 22)               # ledge where the boulder sleeps
    lv.put(209, 21, 'B')
    lv.put(215, 27, 'I')                    # the idol, waist high, impossible to miss
    lv.put(215, 15, 'U')
    lv.put(205, 18, 't')
    lv.put(220, 18, 't')
    lv.hint(211, 22, 216, 27, 'idol')
    # -- 9. The boulder run: downhill, pits too narrow to swallow it -----------------------
    lv.carve(223, 23, 240, 27)              # five tiles of headroom: jumps never clip
    lv.carve(241, 24, 256, 28)
    lv.carve(257, 24, 272, 28)
    lv.fill(257, 29, 272, 29)
    lv.carve(273, 24, 289, 28)
    # floors: 28, 29 (bottom row), so step the corridor down twice
    lv.fill(223, 28, 240, 29)
    for x0 in (230, 236, 247, 253, 262, 268, 279):
        lv.carve(x0, 28 if x0 < 241 else 29, x0 + 1, 29)
        lv.row(x0, x0 + 1, 29, '^')
    lv.coins([(226, 26), (234, 26), (244, 27), (251, 27), (259, 27), (266, 27), (276, 27), (283, 27)])
    # the escape: a slot under the wall that only a rolling body fits
    lv.carve(290, 28, 293, 28)
    lv.hint(282, 25, 289, 28, 'roll')
    # -- 10. The burial chamber -------------------------------------------------------------
    lv.carve(294, 22, 300, 28)
    lv.put(296, 28, 'K')
    lv.fill(294, 29, 331, 29)
    lv.carve(301, 13, 326, 28)
    lv.row(304, 307, 24, '=')
    lv.row(320, 323, 24, '=')
    lv.row(311, 316, 20, '=')
    lv.put(313, 16, 'R')
    lv.put(313, 26, '3')
    for x in (302, 309, 317, 325):
        lv.put(x, 28, 'S')
    lv.put(303, 16, 't')
    lv.put(324, 16, 't')
    lv.carve(327, 25, 330, 28)
    lv.put(329, 28, 'E')
    lv.meta['arena'] = dict(x=300, y=12, w=27, h=18, trigger=3, floor=29, seal=[[300, 26, 3], [327, 26, 3]])
    return lv


# ---------------------------------------------------------------------------
# CHAPTER IV: ANDOR, CITY OF BRASS (a lit cavern over an abyss)
def level_andor():
    W, H = 282, 30
    lv = L(W, H)
    # -- 1. Landing ledge --------------------------------------------------
    lv.bld(0, 26, 20)
    lv.row(0, 26, 20, '%')
    lv.put(2, 19, '@')
    lv.put(6, 19, '?')
    lv.put(4, 19, 'V')
    lv.put(11, 19, 'V')
    lv.put(17, 19, 'n')
    lv.hint(12, 14, 16, 19, 'shield')
    lv.put(23, 19, 'P')
    lv.fill(0, 0, 3, 8)                      # rubble from the fall
    lv.coins([(13, 16), (14, 15), (15, 16)])
    # -- 2. Brass bridges over the abyss --------------------------------------
    lv.put(30, 19, 'M')
    lv.put(27, 19, 'x')
    lv.put(40, 19, 'x')
    lv.bld(41, 44, 19)
    lv.row(41, 44, 19, '%')
    lv.put(42, 18, 'V')
    lv.put(48, 17, 'M')
    lv.put(45, 17, 'x')
    lv.put(57, 17, 'x')
    lv.put(52, 12, 'z')
    lv.put(62, 13, 'R')
    lv.bld(67, 76, 20)
    lv.row(67, 76, 20, '%')
    lv.put(71, 19, 'n')
    lv.coins([(31, 16), (35, 16), (49, 14), (53, 14), (60, 10), (64, 10)])
    # -- 3. The gear tower: lifts and rings --------------------------------------
    lv.bld(77, 79, 20)
    lv.fill(84, 4, 86, H - 1)                # the tower's spine
    lv.put(80, 19, 'N')
    lv.put(80, 6, 'x')
    lv.row(77, 79, 9, '=')
    lv.put(81, 4, 'R')
    lv.row(87, 91, 7, '=')
    lv.put(89, 6, '*')                       # relic 1, on the tower's shoulder
    lv.coins([(81, 15), (81, 12), (81, 9), (88, 6), (90, 6)])
    lv.put(83, 12, 'z')
    lv.fill(87, 13, 95, 13, '=')
    lv.put(96, 13, 'R')
    lv.bld(99, 112, 18)
    lv.row(99, 112, 18, '%')
    # -- 4. Flame -----------------------------------------------------------------
    lv.put(104, 17, 'K')
    lv.put(108, 17, 'h')
    lv.put(101, 17, 'V')
    lv.put(110, 17, 'V')
    # -- 5. The brass market (a hall of the dead city) ------------------------------
    lv.bld(113, 156, 8)
    lv.carve(113, 9, 155, 17)
    lv.zone(113, 9, 155, 17)
    lv.row(113, 156, 8, '%')
    lv.put(119, 17, 'n')
    lv.put(131, 17, 'f')
    lv.put(137, 17, 'j')
    lv.put(143, 17, 'f')
    lv.put(150, 17, 'n')
    lv.row(122, 127, 15, '=')
    lv.row(134, 139, 15, '=')
    lv.row(146, 150, 15, '=')
    lv.coins([(123, 14), (125, 14), (127, 14), (135, 14), (137, 14), (139, 14), (147, 14), (149, 14)])
    for x in (116, 128, 140, 152):
        lv.put(x, 9, 'l')
    lv.put(124, 17, 'P')
    lv.put(146, 17, 'P')
    lv.put(130, 13, '?')
    # relic 2: through the market's false back wall, into a vault
    lv.fill(156, 13, 156, 17, 'F')
    lv.bld(157, 161, 8)
    lv.fill(157, 13, 160, 17, 'F')
    lv.zone(156, 13, 160, 17)
    lv.put(159, 17, '*')
    lv.coins([(157, 16), (158, 16), (160, 16)])
    lv.carve(155, 18, 155, 18)
    # the market's exit: up and over through a roof hatch
    lv.row(151, 155, 12, '=')
    lv.carve(153, 8, 155, 8)
    lv.hint(146, 9, 155, 14, 'ledge')
    # -- 6. The great lift ------------------------------------------------------------
    lv.bld(162, 165, 8)
    lv.bld(172, 175, 3)
    lv.put(167, 7, 'N')                      # rides from the market roof down... and up
    lv.put(167, 27, 'x')
    lv.put(167, 2, 'x')
    lv.col(166, 10, 26, '}')
    lv.col(171, 12, 26, '{')
    lv.put(168, 16, 'z')
    lv.coins([(168, 12), (168, 18), (168, 24)])
    lv.row(162, 165, 8, '%')
    # -- 7. The ring gauntlet ---------------------------------------------------------
    lv.row(172, 175, 3, '%')
    lv.put(180, 5, 'R')
    lv.put(188, 6, 'R')
    lv.bld(193, 196, 11)
    lv.row(193, 196, 11, '%')
    lv.put(194, 10, 'h')
    lv.put(201, 6, 'R')
    lv.put(209, 7, 'R')
    lv.bld(214, 217, 12)
    lv.row(214, 217, 12, '%')
    lv.put(205, 11, 'z')
    lv.put(186, 11, 'z')
    lv.coins([(184, 8), (192, 8), (205, 9), (212, 9)])
    lv.bld(223, 225, 9)                     # far island, relic 3: dash to it
    lv.row(223, 225, 9, '%')
    lv.put(224, 8, '*')
    lv.put(221, 12, 'R')
    lv.bld(229, 237, 16)
    lv.row(229, 237, 16, '%')
    # -- 8. Flame ---------------------------------------------------------------------
    lv.put(233, 15, 'K')
    lv.put(236, 15, 'h')
    lv.put(231, 15, 'V')
    # -- 9. The Djinn's sanctum -------------------------------------------------------
    lv.bld(238, 281, 26)
    lv.row(238, 281, 26, '%')
    lv.fill(239, 8, 241, 22)
    lv.fill(277, 8, 279, 22)
    lv.carve(239, 23, 241, 25)
    lv.carve(277, 23, 279, 25)
    lv.row(245, 249, 21, '=')
    lv.row(267, 271, 21, '=')
    lv.row(254, 262, 17, '=')
    lv.put(250, 14, 'R')
    lv.put(266, 14, 'R')
    lv.put(258, 25, '4')
    lv.put(280, 25, 'E')
    lv.fill(229, 17, 237, 25)
    lv.row(229, 237, 26, '#')
    lv.meta['arena'] = dict(x=242, y=8, w=35, h=19, trigger=2, floor=26, seal=[[241, 23, 3], [277, 23, 3]])
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

    # moving platforms become walkable strips along their whole travel
    platfloor = set()
    stops = set(lv.find('x'))
    for (mx, my) in lv.find('M'):
        lo = mx
        while lo > 0 and (lo - 1, my) not in stops and g[my][lo - 1] not in '#%':
            lo -= 1
        hi = mx + 2
        while hi < W - 1 and (hi + 1, my) not in stops and g[my][hi + 1] not in '#%':
            hi += 1
        for tx in range(lo, hi + 1):
            platfloor.add((tx, my + 1))
    for (mx, my) in lv.find('N'):
        lo = my
        while lo > 0 and (mx, lo - 1) not in stops and g[lo - 1][mx] not in '#%':
            lo -= 1
        hi = my
        while hi < H - 1 and (mx, hi + 1) not in stops and g[hi + 1][mx] not in '#%':
            hi += 1
        for ty in range(lo, hi + 1):
            for tx in range(mx, mx + 3):
                platfloor.add((tx, ty + 1))

    def floor(x, y):
        return (0 <= x < W and 0 <= y < H and g[y][x] in '#%CGD=w-') or (x, y) in platfloor

    def body_ok(px, f, allow_spike=False, hgt=1.25):
        # px: left of the cell + offset (tile units), f: feet height (tile units, bottom edge)
        x0, x1 = px + 0.5 - 0.31, px + 0.5 + 0.31
        y0, y1 = f - hgt, f - 0.01
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
            # roll through low slots (a rolling body is 0.75 tiles tall)
            elif body_ok(x + d, y + 1, hgt=0.75) and floor(x + d, y + 1):
                xx = x + d
                while 0 <= xx < W and body_ok(xx, y + 1, hgt=0.75) and floor(xx, y + 1) and not body_ok(xx, y + 1):
                    xx += d
                if stand(xx, y):
                    nexts.append((xx, y))
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
        # rings: latch after a jump (or while falling past), swing, chain
        # onward to rings within a release's flight, land in a wide band
        start_rings = [(rx, ry) for (rx, ry) in rings if abs(rx - x) <= 6 and -6 <= y - ry <= 8]
        chain = list(start_rings)
        got = set(chain)
        while chain:
            rx, ry = chain.pop()
            for (ox, oy) in rings:
                if (ox, oy) not in got and abs(ox - rx) <= 12 and -4 <= oy - ry <= 5:
                    got.add((ox, oy))
                    chain.append((ox, oy))
        for (rx, ry) in got:
            for tx in range(rx - 9, rx + 10):
                for ty in range(ry - 3, ry + 10):
                    if stand(tx, ty):
                        nexts.append((tx, ty))
        for r in nexts:
            if r not in seen:
                seen.add(r)
                q.append(r)
    report = []
    for ch, what in (('E', 'exit'), ('*', 'relic'), ('I', 'idol'), ('K', 'flame'), ('?', 'scroll'), ('1', 'boss'), ('2', 'boss'), ('3', 'boss'), ('4', 'boss'), ('o', 'dinar')):
        for (x, y) in lv.find(ch):
            near = any((x + dx, y + dy) in seen for dx in range(-3, 4) for dy in range(-1, 5))
            if not near:
                report.append(f'  UNREACHABLE {what} at ({x},{y})')
    print(f'{name}: {len(seen)} standing cells reachable' + ('' if report else ', all key items reachable'))
    for r in report[:40]:
        print(r)
    if verbose:
        mx = max(seen)
        print('  furthest x', mx)
    return seen


LEVEL_FUNCS = [level_bazaar, level_desert, level_tomb, level_andor]

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
        dict(theme='desert', music='desert', ambience='desert', par=330, scrolls=[
            "A camel driver's prayer, stitched into a saddle: \"Let the wind be at my back, and the scorpion asleep beneath its stone.\"",
            "Carved over the temple door: HERE STOOD A CITY OF A HUNDRED WELLS. THE SAND DRANK THEM ALL.",
        ]),
        dict(theme='tomb', music='tomb', ambience='tomb', par=420, dark=0.9, playerLight=82, scrolls=[
            "A warning cut in four scripts: TOUCH NOT THE GOLDEN FACE. The fourth script is just a drawing of a very large ball.",
        ]),
        dict(theme='andor', music='andor', ambience='andor', par=420, dark=0.55, darkTint='#020806', playerLight=90, scrolls=[
            "A brass plate, still warm: WE BUILT A CITY THAT COULD NEVER FALL. WE FORGOT TO BUILD ONE THAT COULD EVER LEAVE.",
            "Engraved in emerald over a market stall: WHAT IS WRITTEN HERE BELONGS TO WHOEVER READS IT.",
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
