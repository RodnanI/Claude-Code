# The Procession: animated ASCII wallpaper

Colossal stilt-legged shell creatures walk in a line across a flooded salt
flat at dusk. Each carries a fragment of a town on its back: a stepped
temple, a lantern tower, a village, a great tree, and a bell arch. They head
toward a ringed sun that fans out rays. The wet salt mirrors everything, and
footfalls send rings across the reflection. The whole image is drawn like an
engraving in coloured type: contour lines, hatching and lit windows, with no
filled cells.

## Open it

Double-click `index.html`. It is a single self-contained file (fonts,
engine and scene inlined) and works offline from `file://`. It needs a
browser with WebGL2 (current Chrome, Edge, Firefox or Safari).

| Key | Action |
| --- | --- |
| `H` | show or hide the control panel |
| `F` or double-click | full screen |
| `Space` | pause or resume |
| `S` | save a PNG of the current frame |
| `[` `]` | smaller or larger glyphs |

Moving the mouse briefly shows a small `[ controls ]` button. After two
seconds of inactivity the button and the cursor disappear. The wallpaper view
has no permanent UI.

Panel controls:
- **Scene:** palette (Dusk, Moonlit, Ember).
- **Characters:** glyph size, line height, font (JetBrains Mono, DejaVu Sans
  Mono, IBM Plex Mono, narrow Iosevka), glyph weight, edge contrast, ink
  density, texture mix, and depth type scale (larger glyphs in the near
  foreground).
- **World:** scene detail, atmosphere, camera drift, speed.
- **Light:** exposure, brightness, saturation.
- **Rendering:** quality (Live / High / Ultra), resolution, temporal stability,
  auto quality.
- **Buttons:** pause, full screen, hide, save PNG, reset.

The stats readout shows the measured grid size, glyphs drawn per frame,
scene samples and fps.

Glyph size defaults from the screen height: about 10 to 11 device pixels
on a 4K display, never below 8. Auto quality steps down from High to Live,
and then to 75% resolution, only if the GPU stays under about 24 fps.

## How it works (`src/engine.js`)

1. **Scene pass:** the scene's GLSL is evaluated 3 x 4 times per character
   cell (6 x 8 in Ultra), producing linear HDR colour plus a material id and
   depth.
2. **Glyph pass:** per cell, the sub-cell luminance pattern is matched against
   the measured ink coverage of every allowed glyph. Structured cells match on
   shape, with faint lines normalised so they become dim but crisp glyphs.
   Flat cells match on tone, with a fixed per-cell dither between the two best
   tone glyphs. Each material (sky, sun, stone, water, salt, windows, flags)
   has its own edge and tone glyph sets. The previous frame's glyph is kept
   unless a new one is clearly better, which suppresses shimmer.
3. **Depth-scaled type:** near content can switch to glyphs at twice the size
   on aligned 2 x 2 blocks, so nearer things are literally set in larger type
   without overlap.
4. **Compose:** the glyph atlas is sampled 1:1 and only glyph strokes are
   coloured over one flat background. No cell ever gets a fill.

## Measured numbers (default 4K, glyph size 10 px, High quality)

From `previews/procession-4k.png` (3840 x 2160, t = 14 s):

- Grid capacity: 640 x 197 = **126,080 cells** (6 x 11 px).
- Glyphs actually drawn in that frame: **45,292**, using 46 distinct glyphs.
- Scene samples evaluated per frame: 1,920 x 788 = **1,512,960**.
- Glyph size 8 px gives 768 x 240 cells (JetBrains Mono) or 960 x 240 cells
  (Iosevka) at 4K. These figures are computed from the glyph metrics; those
  settings were not rendered for this README.

Loop: 120 s, built from 15 gait cycles of 8 s. The ground scrolls exactly 80
periods of the hex crust per loop, and all other motion uses integer
frequencies or a variance-preserving cross-fade. Measured mean pixel
difference between t = 0 and t = 119.967 s is 2.99, against 2.29 for an
ordinary consecutive frame step and 6.77 between t = 0 and t = 60 s. The
seam therefore behaves like a normal frame, not a reset.

## Files

- `index.html`: the finished wallpaper (built, self-contained).
- `previews/`
  - `procession-4k.png`: native 4K frame.
  - `procession-overview-1080.png`: downscaled overview.
  - `procession-closeup-*.png`: 1:1 4K crops (temple, sun, foreground).
- `video/procession-720p-preview.mp4`: short motion preview (see limitations).
- `src/`: editable source.
  - `engine.js`, `ui.js`, `shell.html`, `fonts.js` (generated) and
    `fonts/*.woff2` (ASCII subsets).
  - `scenes/procession.js` is the scene. `scenes/test.js` is a hidden engine
    test.
  - `SCENE_API.md` explains how to write a new scene.
  - `explorations/` holds the unfinished concept prototypes built by parallel
    agents (cloud-sea pillars, orrery hall, glowworm grotto, inside planetary
    rings). They are kept for reference, are not in the build, and some do
    not run cleanly.
- `tools/build.py`: regenerates `src/fonts.js` and inlines everything into
  `index.html` (run `python3 tools/build.py`).
- `tools/render.mjs`: headless renderer for stills, 1:1 crops of a virtual
  4K frame, benchmarks, glyph-change heat maps and video piped to ffmpeg.
  It needs Node with Playwright and ffmpeg, for example
  `node tools/render.mjs --page index.html --scene procession --t 14 --w 3840 --h 2160 --out shot.png`.

## Limitations, stated plainly

- I had no GPU. Every frame was rendered with software WebGL (SwiftShader) in
  headless Chromium, at roughly 19 s per 4K frame. Real-time frame rates on
  actual graphics cards were not measured. The shader cost is moderate, but
  check the fps readout and lower Quality or Scene detail if needed.
- The video is a short 720p, 24 fps motion preview of 6 s. It is not the full
  120 s loop and not 4K, because a 4K full-loop render would take many hours
  in software. The HTML file is the real deliverable. On a machine with a GPU,
  `tools/render.mjs --video` can export the full loop at 4K.
- The image is deliberately low-key (a dusk engraving), so from across a room
  it reads darker than a filled image would. Raise Exposure or Brightness,
  or switch to the Moonlit palette, for a brighter wall.
- Only one scene was finished to full quality. The four other concepts stopped
  at prototype stage.
