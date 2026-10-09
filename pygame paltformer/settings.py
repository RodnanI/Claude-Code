"""Global tuning, palettes and constants for UPDRAFT.

All movement values are in pixels and seconds. The simulation runs at a fixed
60 steps per second, so every number here maps 1:1 to how the game feels.
"""
import os

TITLE = "UPDRAFT"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAVE_PATH = os.path.join(BASE_DIR, "save.json")
GHOST_PATH = os.path.join(BASE_DIR, "ghosts.json")

VIEW_W, VIEW_H = 480, 270
TILE = 16
FPS = 60
DT = 1.0 / FPS

# ---------------------------------------------------------------- player feel
PLAYER_W, PLAYER_H = 10, 14

GRAVITY = 1500.0
APEX_THRESHOLD = 70.0       # |vy| below this while holding jump = floaty apex
APEX_GRAV_MULT = 0.5
FALL_GRAV_MULT = 1.12
MAX_FALL = 330.0
FAST_FALL = 470.0
JUMP_SPEED = 400.0
JUMP_H_BOOST = 32.0
JUMP_CUT = 0.42
COYOTE_TIME = 0.10
JUMP_BUFFER = 0.12

MAX_RUN = 160.0
RUN_ACCEL = 1900.0
RUN_DECEL = 2300.0
RUN_REDUCE = 650.0          # how fast speed above MAX_RUN bleeds off
AIR_MULT = 0.65
TURN_MULT = 1.6

WALL_SLIDE_MAX = 80.0
WALL_JUMP_X = 230.0
WALL_JUMP_Y = 390.0
WALL_JUMP_FORCE = 0.16
WALL_COYOTE = 0.08
WALL_GRACE = 3              # wall jumps work this many px away from a wall

DASH_SPEED = 440.0
DASH_TIME = 0.14
DASH_FREEZE = 0.05
DASH_END_MULT = 0.62
DASH_UP_END_MULT = 0.75
DASH_COOLDOWN = 0.18
DASH_REFILL_COOLDOWN = 0.10
DASH_BUFFER = 0.08
DASH_JUMP_GRACE = 0.07

SUPER_X = 370.0             # dash + jump on the ground
HYPER_X_MULT = 1.25         # diagonal-down dash + jump
HYPER_Y_MULT = 0.55
WALLBOUNCE_Y = 540.0        # up-dash + jump next to a wall
WALLBOUNCE_X = 110.0

SPRING_SPEED = 610.0
SIDE_SPRING_X = 400.0
SIDE_SPRING_Y = 220.0
STOMP_BOUNCE = 470.0

GRAPPLE_RANGE = 125.0
GRAPPLE_SWING_ACCEL = 560.0
GRAPPLE_REEL = 110.0
GRAPPLE_MIN = 22.0
GRAPPLE_MAX = 140.0
GRAPPLE_JUMP = 300.0
GRAPPLE_MAX_SPEED = 560.0

PLATFORM_SPEED = 70.0
CRYSTAL_RESPAWN = 2.5
CRUMBLE_DELAY = 0.45
CRUMBLE_RESPAWN = 2.4

# --------------------------------------------------------------------- colors
OUTLINE = (20, 12, 12)
PLAYER_BODY = (252, 238, 214)
PLAYER_SHADE = (214, 186, 156)
SCARF_READY = (255, 74, 46)
SCARF_READY_DARK = (168, 34, 26)
SCARF_EMPTY = (104, 92, 90)
SCARF_EMPTY_DARK = (62, 54, 54)
CHEEK = (255, 150, 120)

CRYSTAL = (178, 255, 92)
CRYSTAL_DARK = (52, 112, 30)
CRYSTAL_HI = (240, 255, 214)
EMBER = (255, 200, 72)
EMBER_HI = (255, 248, 200)
EMBER_DARK = (176, 96, 26)
SPIKE = (234, 224, 206)
SPIKE_DARK = (112, 100, 90)
LAVA = (255, 96, 32)
LAVA_HI = (255, 206, 96)
LAVA_DARK = (184, 40, 20)
SPRING_BASE = (64, 56, 54)
SPRING_COIL = (196, 192, 180)
SPRING_PAD = (255, 74, 46)
WALKER_BODY = (46, 36, 38)
WALKER_EYE = (255, 232, 204)
WALKER_PUPIL = (255, 60, 40)
FLYER_BODY = (238, 182, 58)
FLYER_STRIPE = (44, 32, 30)
FLYER_WING = (255, 250, 232)

UI_TEXT = (255, 240, 220)
UI_SHADOW = (24, 12, 12)
UI_DIM = (150, 128, 118)
UI_ACCENT = (255, 120, 50)
UI_GOOD = (178, 255, 92)

WORLDS = [
    dict(
        name="EMBER DEPTHS", style="cave",
        sky=(20, 11, 10), far=(38, 18, 15), mid=(58, 26, 19),
        bands=[(46, 20, 14), (70, 28, 15), (102, 40, 17)],
        tile=(86, 41, 30), tile_dark=(54, 25, 20), tile_edge=(150, 74, 46),
        tile_top=(236, 150, 78), detail=(110, 52, 36), vein=(255, 110, 40),
        accent=(255, 120, 50), plank=(120, 70, 44), plank_hi=(184, 114, 66),
        text=(132, 70, 50), mote=(255, 160, 80), mote_dir=(6, -22),
        bgwall=(44, 21, 17), bgwall_line=(34, 16, 13),
    ),
    dict(
        name="MOSS RUINS", style="ruins",
        sky=(13, 17, 12), far=(24, 32, 21), mid=(34, 46, 29),
        bands=[(17, 23, 15), (21, 28, 18), (26, 34, 22)],
        tile=(66, 74, 52), tile_dark=(40, 46, 33), tile_edge=(118, 130, 84),
        tile_top=(170, 200, 92), detail=(86, 96, 66), vein=(150, 182, 80),
        accent=(236, 208, 96), plank=(104, 82, 52), plank_hi=(160, 130, 84),
        text=(96, 116, 72), mote=(210, 230, 130), mote_dir=(10, 14),
        bgwall=(30, 37, 26), bgwall_line=(23, 29, 20),
    ),
    dict(
        name="BONE PEAKS", style="peaks",
        sky=(30, 25, 23), far=(50, 43, 39), mid=(72, 64, 57),
        bands=[(36, 30, 28), (42, 36, 33), (48, 41, 37)],
        tile=(122, 112, 98), tile_dark=(80, 72, 63), tile_edge=(178, 166, 148),
        tile_top=(242, 236, 224), detail=(140, 128, 112), vein=(214, 104, 78),
        accent=(232, 92, 70), plank=(110, 86, 64), plank_hi=(168, 136, 104),
        text=(150, 138, 122), mote=(250, 246, 238), mote_dir=(-34, 18),
        bgwall=(60, 53, 48), bgwall_line=(52, 46, 41), sun=(214, 168, 120),
    ),
]
