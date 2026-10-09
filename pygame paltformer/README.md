# UPDRAFT

A precision platformer built in pygame. You are a tiny ember with a scarf, climbing out of a magma cave, through overgrown ruins and up a mountain of bone until you reach the sky.

No asset files. Every tile, sprite, background, sound effect and the music loop is generated in code at startup.

## Run it

```
pip install -r requirements.txt
python main.py
```

Needs Python 3.8+ and pygame 2.1+ (pygame-ce works too). The window scales the 480x270 pixel canvas to fit your screen. F11 toggles fullscreen.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move / aim | Arrows or WASD | Left stick or D-pad |
| Jump | Z, Space or K | A |
| Dash | X, Shift or J | B or X |
| Grapple (hold) | C, L or E | Y, LB or RB |
| Quick respawn | R | Back |
| Pause | Esc or P | Start |
| Mute music | M | |

## Movement

The controller is built to be forgiving where it should be and exact everywhere else.

- **Coyote time and jump buffering.** Jumps still register a few frames after you run off a ledge or a few frames before you land.
- **Variable jump height with apex hang.** Tap for a hop, hold for full height. Gravity softens at the top of the arc while jump is held.
- **Fast fall.** Hold down in the air.
- **Wall slide and wall jump.** Works up to 3 pixels away from the wall. Chimneys up to 5 tiles wide can be climbed; a single wall cannot.
- **8-way dash.** A short freeze frame, afterimages, and it refills when you touch the ground. Your scarf turns grey when the dash is spent.
- **Super jump.** Dash along the ground and jump during the dash for a long, fast leap. Refills your dash.
- **Hyper jump.** Dash diagonally down into the floor, then jump. Lower and even faster.
- **Wallbounce.** Dash straight up next to a wall and jump for a huge vertical launch.
- **Grapple.** Hold grapple near a glowing ring to swing. Left and right pump the swing, up and down reel the rope. Letting go flings you and refills your dash; jumping off gives an extra kick.
- **Corner correction.** Clipping a ceiling edge or a ledge lip by a few pixels nudges you around it instead of stopping you dead.
- **Stomps.** Land on a walker or a wasp to bounce (hold jump for height). Dashing through them also kills them. Both refill your dash.

## World

| # | Level | World | Introduces |
| --- | --- | --- | --- |
| 1 | Kindling | Ember Depths | running, jumping, one-way ledges, spikes |
| 2 | Flue | Ember Depths | wall jumps, crumbling rock, magma pools |
| 3 | Flashpoint | Ember Depths | dash, dash crystals, breakable walls and floors |
| 4 | Meltdown | Ember Depths | a rising magma chase |
| 5 | Overgrowth | Moss Ruins | springs, walkers, moving platforms, elevators |
| 6 | Swingset | Moss Ruins | the grapple |
| 7 | Hornet Halls | Moss Ruins | wasps, kill chains |
| 8 | Ribcage | Bone Peaks | super jumps, everything combined |
| 9 | Windward Spire | Bone Peaks | a six storey tower |
| 10 | Updraft | Bone Peaks | the finale magma chase to the summit |

Every level has embers to collect, checkpoints, and a speedrun timer. Best times, ember counts and total deaths are saved to `save.json` next to the game. Every level is unlocked from the level select screen.

All ten levels were verified completable by a search-based solver that drives the real player physics.

## Making levels

Levels live in `levels.py` as plain text maps, one character per 16px tile. The legend is at the top of `level.py`:

```
#  rock            -  one-way ledge     +  background wall    x  spikes (face away from the rock)
~  magma           P  start             E  exit portal        c  ember
d  dash crystal    S  spring            k  checkpoint         o  grapple ring
B  breakable       C  crumbling rock    w  walker             f  wasp
h  moving platform (a run of h is one platform)   v  elevator   :  invisible platform/wasp stopper
```

Add `'rising': {'speed': 16, 'delay': 4.0}` to a level for a magma chase.

## Files

| File | What it does |
| --- | --- |
| `main.py` | entry point |
| `game.py` | window, main loop, save data |
| `settings.py` | every movement constant and the palettes |
| `player.py` | the movement state machine and pixel-exact collision |
| `entities.py` | springs, crystals, rings, platforms, crumbling and breakable rock, enemies |
| `level.py` | map parsing, autotiled tile art, parallax backdrops |
| `play.py` | the gameplay scene: camera, HUD, deaths, checkpoints, transitions |
| `scenes.py` | title, level select, options, ending |
| `audio.py` | sound effect and music synthesis |
| `fx.py`, `camera.py`, `font.py`, `inputs.py` | particles, screen shake, bitmap font, input |
