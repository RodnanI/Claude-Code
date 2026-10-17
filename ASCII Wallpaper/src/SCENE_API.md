# Writing a scene for the ASCII wallpaper engine

The engine (`src/engine.js`) turns any procedural image into dense, colour,
character-only art. A scene is ONE file `src/scenes/<id>.js` that registers a
GLSL function. You never draw glyphs yourself: you return light, and the engine
chooses glyphs whose stroke shapes match the sub-cell structure of your image.

## Pipeline (what happens to your output)

1. `sceneColor(p, mat, depth)` is evaluated for every **sub-cell sample**.
   High quality = 3 x 4 samples per character cell, so at 4K (~640 x 196
   cells) your function runs ~1.5 million times per frame. At 1080p ~300k.
2. Per cell, the 12 sample luminances are matched against every allowed
   glyph's 3x4 ink-coverage pattern. A bright diagonal edge becomes `/`, a
   bright thin horizontal band at the bottom becomes `_`, a uniform mid tone
   becomes `+` or `=` and so on. **Sub-cell structure is what makes glyph
   choice expressive**, so give surfaces real detail at the scale of 1/3 to
   1 cell (contours, striations, ridges, rims, sparkles).
3. Glyph colour = brightness-weighted average colour of the cell, tone
   mapped. Black (0) = no glyph. There are no cell backgrounds, ever.

Consequences for scene design:
* Luminance drives BOTH glyph density and glyph brightness. Contrast is your
  main tool. Large uniformly bright areas become a monotone carpet of `#`/`%`;
  avoid them, break bright areas with texture, edges, and shading.
* Darkness reads as empty background. Quiet areas are fine if intentional.
* Very thin bright lines (thinner than a cell) still register: the engine
  picks glyphs like `|`, `/`, `-`, `_`, `.` for them. Line art works well.
* Depth comes from: size/scale of detail, contrast falloff with distance
  (atmosphere), overlap, parallax, and hue shift. Not from blur or glow.
* Do not add glow halos, bloom or large soft fog fills: the user explicitly
  wants light and atmosphere expressed through characters. Sparse dim
  "particle" fog made of small structures is OK; a big smooth gradient wash
  becomes a field of uniform glyphs and looks cheap. Keep the sky/background
  mostly dark with sparse structured detail.

## Registration

```js
ASCII.registerScene({
  id: 'myscene',            // must match the file name
  name: 'My Scene',         // shown in the UI
  tagline: 'short phrase',
  loop: 120,                // seconds; the animation MUST be seamless at uTime = loop
  bg: '#0b0a09',            // flat page background (dark), sRGB hex
  palettes: [               // >= 1; colours become vec3 uniforms in LINEAR rgb
    { name: 'Dawn', colors: { uSun: '#ffcf8a', uShadow: '#1d3b38' }, look: { exposure: 1.1 } },
  ],
  uniforms: { uFoo: 0.5 },  // optional extra float/vec uniforms (declared for you)
  glyphSets: {              // optional per material id (0..15): edge + tone sets
    1: { edge: ' .,-_/\\|()', tone: ' .:-=+*' },
  },
  exclude: '',              // glyphs never to use in this scene
  look: { exposure: 1, cover: 1, sharp: 1, brightness: 1, saturation: 1, colGamma: 1, flat: 1 }, // multipliers
  defaults: { detail: 1, atmosphere: 0.5, camera: 0.5 },  // UI defaults (optional)
  glsl: `
    vec3 sceneColor(vec2 p, out float mat, out float depth) { ... }
  `,
});
```

## GLSL contract

```glsl
vec3 sceneColor(vec2 p, out float mat, out float depth);
```
* `p`: screen position, origin at screen centre, **y up**, `p.y` in [-1, 1],
  `p.x` in [-aspect, aspect] (aspect = canvas w/h, ~1.78 for 16:9).
  Compose for 16:9 but make sure 4:3, 21:9 and portrait still look intended.
* return: **linear HDR radiance** (0 = black; ~1 = bright; > 1 allowed, rolls off).
* `mat`: material id 0..15 selects glyph sets (default 0 = engine default
  sets). `mat = 16 + (charCode - 32)` FORCES that exact glyph in the cell
  (e.g. engraved numerals, signage, text). The brightest sample in a cell
  decides the material.
* `depth`: 0 near .. 1 far (stored; reserved for engine effects; fill it in).

Uniforms always available:
`uTime` (s, 0..uLoop), `uLoop`, `uPhase` (= uTime/uLoop, 0..1),
`uDetail` (0..1, UI "Scene detail": scale octaves / counts / complexity),
`uAtmos` (0..1, UI "Atmosphere": haze/mist/particle density),
`uCamAmt` (0..1, UI "Camera drift": amplitude of camera motion),
`uSeed`, `uPxSize` (one device pixel in `p` units), `uCellPx` (cell size px),
`uCanvasPx`, plus your palette and custom uniforms.

Library (already included): `PI, TAU, sat, remap, rot(a) -> mat2, luma`,
hashes `hash11, hash12, hash22, hash33, hashi(ivecN)`, value noise
`vnoise(vec2|vec3 [, ivecN period])`, gradient noise `gnoise(vec3 [, ivec3 period])`
(~[-1,1]), `vnoise4(vec4 p, int periodW)`, `fbm(vec2|vec3, int octaves)`,
SDFs `sdSphere, sdBox(vec3|vec2), sdTorus, sdCapsule, sdSegment, smin, smax`.

## Seamless loop rules (mandatory)

Everything must be exactly periodic in `uLoop`:
* Use `uPhase * TAU * k` with INTEGER k for oscillations/rotations.
* Translating textures: scroll by an integer number of noise periods per loop
  (use the periodic noise variants with an integer period along the scroll
  axis), or move objects along closed paths.
* Evolving noise: `vnoise4(vec4(pos, uPhase * P), P)` with integer P, or a
  periodic axis of `gnoise(..., ivec3(0, 0, P))` driven by `uPhase * P`.
* Particles/agents: derive position from `fract(seed + uPhase * k)` (k integer).
* Never use uTime directly in a non-periodic way.
Verify by rendering t = 0 and t = loop - 1/30 (they must be near identical) and
t = 0.5 * loop.

## Rendering and checking your work

Run from `src/` (paths are relative to `src/`):
```
node ../tools/render.mjs --scene <id> --t 10 --w 1920 --h 1080 --out <scratch>/a.png
node ../tools/render.mjs --scene <id> --times 0,15,30,45 --w 1280 --h 720 --out <scratch>/seq.png
node ../tools/render.mjs --scene <id> --bench 5 --w 1920 --h 1080      # ms per frame
node ../tools/render.mjs --scene <id> --t 10 --w 3840 --h 2160 --out <scratch>/4k.png
node ../tools/render.mjs --scene <id> --t 10 --set glyphPx=9,detail=0.5 --out ...
```
The stats line prints grid size, glyphs drawn and "visible" (clearly lit).
Look at the PNGs with the Read tool. Always inspect magnified crops too:
```
python3 -c "from PIL import Image; im=Image.open('a.png'); im.crop((x,y,x+480,y+270)).resize((1440,810),Image.NEAREST).save('crop.png')"
```
Motion check: render frames 1/30 s apart (`--times 10,10.0333,10.0667`) and
a few seconds apart, compare. Shimmer = glyphs changing without the scene
moving: reduce sub-cell aliasing (smoother high-frequency detail).

Performance budget (software WebGL here is ~200x slower than a real GPU):
`--bench` at 1920x1080 should stay under ~1500 ms/frame. Raymarching is fine
but keep step counts sane, use bounding volumes, early outs, and analytic
intersections where possible. Scale cost with `uDetail`.

## Do not
* edit engine.js, ui.js, shell.html, tools/ (ask the coordinator instead),
* use glow/bloom/large fog fills or rely on colour fields to do the work,
* make the screen mostly empty, or uniformly noisy,
* use blue-to-purple gradient palettes or generic "neon" looks.
