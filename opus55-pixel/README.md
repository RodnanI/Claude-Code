# Returning Swallow (opus55-pixel)

A side-scrolling pixel platformer and sword-fighting game set in the murim, the martial world of ancient China. Everything ships as one standalone HTML file with no external assets: every sprite, tile, background, portrait, sound effect and piece of music is generated or hand-authored in code.

**Play:** open `dist/returning-swallow.html` in a desktop browser (Chrome, Edge or Firefox). Press any key on the title screen to start (browsers only allow audio after a key press).

## The story

Forty years after the Crimson Heaven Cult was driven into the western wastes, it returns in a single night and burns the White Crane Sect on Heaven's Crane Peak. Its last disciple, Lu Yan, dies on the steps of his hall holding the founder's sword, *Swallow's Return*.

He wakes at dawn on the morning of that same day.

With one day until moonrise, Lu Yan unmasks the assassin who was meant to open the gate, uncovers a traitor among the elders, and races down the mountain through the Sea of Whispering Bamboo and the lantern festival at Black Tide Ford to reach the Crimson Heaven Demon before the moon turns red.

| Chapter | Setting | Boss |
|---|---|---|
| I. The Morning Before the Fire | Heaven's Crane Peak at dawn | Mo Ying, the Faceless Blade |
| II. The Sea of Whispering Bamboo | Bamboo forest, streams, stake pits | Silver Needle Liu |
| III. Red Lanterns at Black Tide Ford | River town at dusk, rooftops, canal | Tie Fo, the Iron Buddha |
| IV. Under the Crimson Moon | Cult fortress under a blood moon | Xue Tianmo, the Crimson Heaven Demon (two phases) |

A burning prologue, an epilogue at sunrise and a credits screen with a rank based on your run frame the four chapters.

## Controls

| Action | WASD layout | Arrow layout |
|---|---|---|
| Move | A / D | Left / Right |
| Jump (press again in the air to double jump) | Space or K | Z |
| Attack (repeat for a four-hit combo) | J | X |
| Launcher | W + attack | Up + attack |
| Plunge | S + attack in the air | Down + attack in the air |
| Dash (brief invulnerability) | L or Shift | Shift |
| Guard (hold) / Parry (tap as a blade flashes) | U | C |
| Qi Wave (costs one qi segment) | I | V |
| Ultimate, Thousand Swallows Return (full qi) | O | B |
| Pause | Esc or P | Esc |

Gamepads work too (A jump, X attack, B/RB dash, Y qi wave, LB/LT guard, RT ultimate).

## Combat notes

- Enemy wind-ups flash a white glint. Tap guard just before the hit lands to parry: the attacker staggers, time slows, you gain qi and your next strike is a counter.
- Dash through attacks; attacking out of a dash gives a lunge.
- Air combos keep you aloft; the launcher starts juggles.
- Shrines of Rest heal you and become your respawn point.
- The Iron Buddha's golden bell shrugs off sword cuts; qi waves crack it.

## How it is made

- **Pixel rig** (`src/js/gfx/rig.js`): characters are skeletons posed from keyframes. Each limb is rasterized as a lit primitive into a material buffer, then post-processed into pixel art with depth separation lines, a rim light and material-tinted outlines. Frames are cached, so animations get many in-betweens without hand-drawing each frame.
- **Hand-authored details**: heads and dialogue portraits are drawn as character grids; costumes define materials, garments and weapons (jian, dao, spear, hook swords, war fan, club, bow, whisk).
- **Secondary motion**: ponytails, sashes, tassels, capes, beards and talismans are verlet ribbons.
- **Procedural world art**: ink-wash parallax backgrounds, a per-pixel terrain shader per chapter (temple stone, forest soil, cobbles and brick, lava-veined basalt), and generated props such as halls with bracket sets, sect gates, plum trees, bells, lanterns, braziers and stalls.
- **Audio**: all synthesized with WebAudio. Sword swishes, metallic parries, taiko and gongs are built from noise and oscillators; the music sequencer reads jianpu notation and plays Karplus-Strong guzheng and pipa, a bowed erhu and a dizi.

## Project layout

```
opus55-pixel/
  build.mjs            concatenates src/ into dist/returning-swallow.html (with a syntax check)
  dist/                the compiled, standalone game
  src/index.html       page template
  src/style.css
  src/js/core/         util, input, audio engine, music sequencer and score
  src/js/gfx/          palette, pixel font, rig, weapons, heads, costumes, poses,
                       effects, ribbons, lighting, painting helpers, terrain,
                       backgrounds, props, portraits
  src/js/world/        tile map and physics, camera, level data
  src/js/entities/     bodies, fighters, move frame data, player, enemies,
                       bosses, projectiles, pickups and breakables
  src/js/game/         combat, dialogue, HUD, story scripts, scenes, debug, main
  tools/               Playwright helpers used for screenshots and scripted playtests
```

## Building

```
node build.mjs
```

The build stitches the modules (in the order listed in `build.mjs`) into one script inside the HTML template and refuses to write output if the bundle has a syntax error.

Debug URL parameters for development: `?level=0..3` jumps to a chapter, `&x=<tile>&y=<tile>` starts at a position, `&god` makes you nearly invulnerable, `?sheet=hero` shows every animation of a costume, `?portraits` shows the portrait set and `?ending` plays the epilogue.
