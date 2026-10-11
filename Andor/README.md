# ANDOR: The Sands Remember

A pixel-art action adventure that runs from the night rooftops of 11th-century Isfahan, across the Sea of Dunes and through a pharaoh's trap-filled tomb, down to Andor, the lost City of Brass.

Isfahan, 1037. A black fever moves through the city of domes. The dying Hakim presses a map into the hands of his apprentice, Idris: somewhere beneath the sands lies the Emerald Tablet, and every cure the world has forgotten is written on it. The vizier wants the map. His guards are already on the stair.

## Play it

Open **`Andor.html`** in any modern browser. It is one self-contained file: no install, no server, no network. It works on desktop, tablet and phone, in landscape or portrait.

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Run | Arrows or A / D | Stick or D-pad | Drag on the left side |
| Jump (hold for height) | Space, Z or K | A | Jump button |
| Whip | X or J | X / Y | Whip button |
| Aim the whip | Hold Up or Down while whipping | Stick | Drag up or down |
| Roll / air tumble | C, L or Shift | B / bumpers | Roll button |
| Duck, drop through ledges | Down (plus Jump to drop) | Stick down | Drag down |
| Pause | Esc or P | Start | Top-right button |

On a phone held upright the game turns into a handheld: the view sits on top and a carved control deck sits below. Turn it sideways and the controls float over the full-screen view.

## The journey

1. **The Bazaar of Isfahan.** Escape across moonlit rooftops: awnings to bounce on, a covered bazaar full of the Watch, your first whip swing over a street, a wind-catcher tower to wall-jump up, laundry lines over the alleys. Duel **Captain Bahram** at the city gate.
2. **The Sea of Dunes.** Caravan camps, quicksand, a ruined temple with a dart trap, an oasis, a blinding sandstorm that pushes you back, a canyon. **Al-Aqrab, the Great Scorpion**, waits in its nest.
3. **The Tomb of Khemet-Ra.** Torchlight only. Darts, pendulum blades, bats, a hall of mummies, fire jets over moving stone, and a golden face on a pedestal. You know what happens when you take it. Then **Khemet-Ra, the Undying**.
4. **Andor, City of Brass.** A green-lit cavern over an abyss: brass sentinels that turn the whip, djinn wisps, lifts, a ring gauntlet, and **the Brass Djinn** rising from its lamp.

Every chapter hides three relics (some behind walls that are not walls), lore scrolls and emeralds. Between chapters, the caravanserai merchant sells upgrades for the dinars you find: extra hearts, a longer lash, a heavier grip, a lodestone charm, a relic-finding astrolabe needle, and the Simurgh feather that cheats death once per chapter. Results are ranked S to C, progress saves automatically, and finished chapters can be replayed from the chapter list.

## What is inside

- **Movement with real feel**: coyote time, jump buffering, variable jump height, wall slides and wall jumps, ledge grabs with climb-ups, step hopping, a ground roll with invulnerability and an air tumble, pogo bounces off foes and spikes with a downward lash.
- **The whip**: forward, upward and downward lashes with hit-stop and a visible crack; deflects darts and arrows; latches golden rings for pendulum swings you can pump, shorten and lengthen, then launch from.
- **Art**: every pixel is generated at load time from code. The cast shares one rigged skeleton (hand-pixeled heads and torsos, rasterised limbs and weapons, cached per pose), so guards, archers, bandits, mummies, jackal warriors and brass sentinels all animate cleanly. Tiles are painted in world space with seeded noise (adobe with storey windows, strata sandstone with drifted sand, carved limestone with hieroglyphs and lotus friezes, basalt banded in brass with emerald seams). Parallax skylines of domes, minarets and wind-catchers, dunes with a passing caravan, pyramids, tomb colossi, turning brass gears and sandfalls. Dithered banded lighting in the dark chapters, a heat shimmer over the dunes, a scarf that trails in the wind.
- **Music and sound, all synthesised**: Karplus-Strong oud and qanun, a breathy ney with glides and vibrato, darbuka, riq, daf and finger cymbals, drones. Melodies are written in real maqamat (Bayati, Hijaz, Saba, Rast, Nahawand) with true quarter tones, over traditional rhythms (maqsum, baladi, saidi, malfuf, wahda). Coins climb the Hijaz scale when you chain them.
- **Options**: music and sound volume, screen shake, reduced motion, touch button size, vibration, a speedrun timer. Three difficulties (Pilgrim, Adventurer, Legend).

## Project layout

```
Andor/
  Andor.html        the compiled, standalone game (generated)
  index.html        dev page that loads the sources separately (generated)
  build.js          bundles src/ into Andor.html and writes index.html
  src/
    00_core.js      maths, palette, seeded noise, pixel buffers, storage
    01_gfx.js       screen scaling, sprites, bitmap font, primitives
    02_input.js     keyboard, gamepad, pointer and on-screen controls
    03_rig.js       the shared humanoid rig, character skins, poses
    04_tiles.js     procedural tile painters for the four themes
    05_backgrounds.js  parallax backdrops
    06_level.js     level parsing, chunk prerendering, tile collision
    07_fx.js        camera, particles, lighting, weather, vignette
    08_player.js    the player controller
    09_art_props.js creatures and props
    10_entities.js  pickups, checkpoints, rings, traps, platforms, projectiles
    11_enemies.js   enemy AI
    12_audio.js     synthesis, maqam sequencer, sound effects, ambience
    13_ui.js        logo, panels, menus, HUD, touch controls
    14_story.js     chapters, story, relic names, hints, credits
    15_game.js      game state, scenes, saving, the main loop
    16_levels.js    level maps (generated by tools/levelgen.py)
    17_bosses.js    the four bosses
    99_main.js      boot and debug views
  tools/            level builder, checks and browser tests
```

## Building

```
node build.js
```

That writes `Andor.html` (about 400 KB) and the dev `index.html`. There are no dependencies.

## Editing levels

Levels are composed in `tools/levelgen.py` from a few primitives (buildings, carves, ledges, coin arcs, back-wall zones, hint zones) and written to `src/16_levels.js`.

```
python3 tools/levelgen.py            # regenerate src/16_levels.js
python3 tools/levelgen.py check      # reachability report for every chapter
python3 tools/levelgen.py preview    # quick PNG maps in tools/out/
```

The checker sweeps jumps along parabolas derived from the game's physics constants with the player's real hitbox, and models ledge grabs, rolls under low gaps, awning bounces, wall-jump shafts, ring swings and chains, and moving platforms. It reports any exit, relic, flame, scroll or boss that cannot be reached.

## Browser tools

These use Playwright with Chromium.

```
node tools/smoke.js out/              # play every chapter and boss with random input, report errors
node tools/autotest.js boulder out/   # closed-loop autopilot through the boulder chase
node tools/mobile.js out/             # phone portrait, phone landscape and tablet layouts
node tools/audiocheck.js              # meter every track and sound effect for silence or clipping
node tools/mapshot.js 2 map.png       # render a whole chapter with the game's own renderer
node tools/shot.js "level=1&x=60&y=18" shot.png
```

Debug URLs: `Andor.html#level=2` starts a chapter (add `&x=..&y=..` in tiles to place the hero, `&god` to ignore damage), `#sheet=skins` shows the character sheet, `#map=1` renders a full level.
