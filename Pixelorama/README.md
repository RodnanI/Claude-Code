# Pixelorama Web

A pixel art and animation editor in one HTML file. Open `index.html` in a desktop browser (Chrome, Edge or Firefox). No install, no build step, no network: everything runs and saves locally.

## Basics

- Two mouse buttons, two tools, two colors. Click a tool to give it to the left button, right-click to give it to the right one. `Alt` + a tool key does the same from the keyboard.
- Layers with groups, blend modes, opacity and clipping masks. Frames with tags, onion skin, linked cels and per-frame duration.
- Smart shapes: draw a rough circle, box or line and press `Shift` before letting go (or just hold still). It becomes a clean shape you can still adjust.
- Snapping to grid, isometric lattice, guides, canvas center and thirds, selection edges, existing pixels, angles and radial spokes. Hold `Ctrl` to ignore it.
- Symmetry (mirror and radial), tile mode, rulers and guides, reference images.
- Saves `.pixo` projects. Exports PNG, spritesheets (rows, grid or one row per tag), animated GIF, APNG, video and ZIPs of frames. Autosaves to the browser.

`F1` runs a hands-on tour of the basics, `Shift+F1` a guided demo that builds a bouncing slime animation on screen.

## What is new in this build

The start screen has a "New in this build" grid. Every card opens a live example on generated sample art.

| Feature | Where | What it does |
| --- | --- | --- |
| Command palette | `Ctrl+K` or the search box in the menubar | Fuzzy search over every action, tool, layer, palette, theme and tag. Typed values become commands: `32x32` (new project, resize, scale), `#ff0044`, `400%`, `frame 12`, `10 fps`, `brush 4`. `Alt+Enter` sends tools and colors to the right button. |
| Layer effects | `Ctrl+Shift+F`, the `fx` badge on a layer, or right-click a layer | Auto-shade, outline, drop shadow, outer glow, color overlay, HSV, brightness and contrast, gradient map, posterize, desaturate, invert, pixelize and noise, stacked per layer or group. They are applied live, so the pixels underneath never change until you press Apply. An outline on a clipping base wraps the whole clipped group. Every effect dialog can also "Keep editable" instead of applying. |
| Auto-shade | Effects menu, or as a layer effect | Shades flat-colored sprites from a light direction you drag around a little sphere. It builds a height field from the silhouette and the color regions, then bands the result into hue-shifted tones (cool shadows, warm light) with optional dithering, reflected light on the far rim and selective outlining. Line art and pupils keep their ink. It can export a normal map strip for lit sprites in game engines (OpenGL convention). |
| Pixel critique | `Shift+C`, View menu, or the Critique button | Lints the current layer (or everything visible) and marks problems on the canvas: stray pixels, low-contrast noise pixels, doubled corners in 1px lines, jaggies (a step that breaks the rhythm, like 3-1-3), near-duplicate colors, semi-transparent pixels and pillow shading. Click an issue to zoom to it. Safe fixes are one click and one undo step. |
| Free rotation | Move tool | Drag the round handle above the box (or just outside a corner) to rotate floating pixels, `Shift` snaps to 15 degrees, `[` and `]` turn by 15, `{` and `}` by 1. RotSprite resampling keeps edges clean and never invents colors. Scaling works along the rotated axes. |
| Timelapse | File menu | Every change to a project is recorded while it is open. Play it back with a scrubber and export a GIF or APNG of how the piece was made. |
| Ramp studio | Edit menu, or the palette menu | Builds color ramps in OKLCH: even steps of perceived lightness, the base color kept inside its ramp, hue sliding toward cool shadows and warm light, with harmonies and a test sphere per ramp. |
| Recolor | Effects menu | A palette swap. Every color in use gets a row you can remap, or rotate all hues at once, or snap everything to the palette, across a cel, layer, frame or the whole project. |
| Tween | Animation menu | Generates in-betweens that move (and optionally scale) the start frame's content toward its position in the end frame, with easing. |
| Cel drag and drop | Timeline | Drag a cel onto another to swap them. `Ctrl` copies, `Alt` links. |
| Stabilizer | Pencil, eraser and shading options | The brush trails the pointer on a string, so hand wobble smooths out. |
| 3D sprite stack | Preview panel, 3D tab | Shows frames (or layers) as the slices of a spinning object. Drag to turn and tilt. |
| Share as link | File menu | Packs the whole project into the URL. Paste such a link onto the canvas or into the command palette to open it. Nothing is uploaded. |
| Video export | Export dialog | MP4 where the browser can record it, otherwise WebM. |

Smaller things: the checkerboard snaps to whole image pixels at every zoom, the status bar shows the color under the cursor, and close project moved to `Ctrl+Alt+W` because `Alt+W` gives the Magic Wand to the right button.

## Keys worth knowing

| Keys | Action |
| --- | --- |
| `Ctrl+K` | Command palette |
| `F2` | Shortcut index (searchable, stays open) |
| `?` | Full shortcut list, where any key can be rebound |
| `Shift+C` | Pixel critique |
| `Ctrl+Shift+F` | Layer effects of the current layer |
| `Space` + drag, middle mouse | Pan |
| `Alt` + click | Pick a color |
| `Alt` + wheel, `[` `]` | Brush size |
| `N`, `Shift+D`, `Enter`, `K` | New frame, duplicate frame, play, onion skin |
| `F4`, `Shift+F4` | Theme picker, next theme |

## URL options

Append these to the address after `#`, comma separated:

- `nointro` skips the opening animation, `nosplash` the start screen
- `tour` or `demo` start the tour or the guided demo
- `share=...` is what share links use

## How it is built

One file of plain HTML, CSS and JavaScript with no libraries. Rendering is Canvas 2D with per-frame composite caching. GIF, APNG, PNG and ZIP encoders are written in the file; compression uses the browser's `CompressionStream`. Projects autosave to IndexedDB.
