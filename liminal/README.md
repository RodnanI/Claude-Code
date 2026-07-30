# LIMINAL

A first-person walking simulator about liminal spaces, in one standalone HTML file.

`index.html` is the whole engine: main menu, level browser, desktop/mobile input, an
in-game settings panel and a WebGL 2 renderer. Every space you can walk around in is a
separate `level.*.js` file sitting next to it. Drop a new one into the folder and it shows
up in the level list.

Nothing is loaded from disk at runtime except the level scripts. Geometry, textures,
lighting and audio are all generated in the browser when a level loads — there is not a
single image or sound file in this project.

```
liminal/
├── index.html            the main file — engine, UI, everything
├── level.backrooms.js    Level 0  · The Lobby
├── level.school.js       Level 5  · After Hours
├── level.carpark.js      Level 12 · The Car Park
├── level.concourse.js    Level 21 · The Concourse
├── level.poolrooms.js    Level 37 · The Poolrooms
├── level.stacks.js       Level 76 · The Stacks
├── level.spillway.js     Level 94 · The Spillway
├── level.atrium.js       Level 188 · The Atrium
└── levels.json           optional manifest (see "Discovery")
```

The Stacks, the Spillway and the Atrium are the big ones — thirty-metre racking,
a hundred-and-twenty-metre dam face, and twenty stacked galleries. They keep a
human-scale object in shot at all times (a handrail, a ladder, a personnel door)
because a huge thing with nothing next to it just looks like a wall.

## Running it

Open `index.html`. That is the whole install.

It works straight off the filesystem (`file://`), and it works served over http:

```bash
python3 -m http.server 8000     # then open http://localhost:8000/
```

Serving it is slightly better, because over http the levels are discovered from the
directory itself rather than from a list of known filenames.

Requires **WebGL 2** — any browser from the last few years, desktop or phone.

## Controls

| | Desktop | Mobile |
|---|---|---|
| Move | `W` `A` `S` `D` | left stick |
| Look | mouse (click to capture) | drag anywhere on the right |
| Run | hold `Shift` | `RUN` |
| Crouch | `C` or `Ctrl` | `CROUCH` (latches) |
| Jump | `Space` | `JUMP` |
| Torch | `F` | `LIGHT` |
| Pause / settings | `Esc` | `MENU` |
| Performance overlay | `Tab` | Settings → Display |

Pick Desktop or Mobile explicitly on the main menu if the auto-detection guesses wrong.

## Settings

Everything is behind `Esc`, applies live, and persists in `localStorage`. On first run a
preset is chosen from your device's core count and memory.

- **Display** — resolution scale, FOV, brightness, frame cap, overlay, crosshair
- **Quality** — preset, texture resolution, anisotropic filtering, surface detail, light
  occlusion steps, lights per cluster, view distance, ambient occlusion, specular
- **Effects** — bloom, FXAA, film grain, VHS artefacts, chromatic aberration, vignette,
  fog density, light flicker, head bob
- **Controls** — input mode, sensitivity, invert Y, sprint toggle, walk speed
- **Audio** — master / ambience / effects, mute, mute-on-blur

Texture resolution, surface detail and ambient occlusion are baked while a level loads, so
changing them shows a **Rebuild level** button rather than taking effect mid-walk.

## Discovery

The level browser finds `level.*.js` files three ways, and merges the results:

1. **Directory index** — fetches `./` and scrapes it for `level*.js` hrefs. Works with
   `python -m http.server`, nginx autoindex, and anything else that lists a directory.
2. **`levels.json`** — an explicit manifest, for servers that don't list directories.
3. **Known filenames** — a built-in candidate list, tried only if 1 and 2 found nothing.
   This is what makes `file://` work, since local pages can't fetch anything.

There is also **Load file…** in the level browser, which reads a `.js` level off your disk
and registers it immediately. Handy while writing one.

The file input deliberately carries no `accept` filter. iOS resolves `accept` through
UTIs and has none for a bare `.js` extension, so `accept=".js"` greys out every file in
the picker on iPhone and iPad. The extension is checked after you pick instead.

## Writing a level

A level file calls `LIMINAL.registerLevel()` at load time. Everything is optional except
`id` and `build`.

```js
LIMINAL.registerLevel({
  id:'carpark',
  name:'Level 12',
  subtitle:'The Car Park',
  accent:'#8ea0b6',                 // themes the UI while it's selected
  badge:'new',
  tags:['concrete','sodium light'],
  size:'80 × 80 m',
  lighting:'sodium · sparse',
  defaultSeed:12,
  description:'…',
  preview(g,w,h){ /* paint the browser thumbnail on a 2D context */ },
  build(W,ctx){ /* make the world */ }
});
```

`build(W, ctx)` runs once per load. `ctx` carries `{rng, seed, TX, settings}`; `W` is the
builder:

### Declaring things

```js
const mat = W.material('carpet',{
  draw(c,size,rng,TX){ /* paint a tiling texture on a 2D context */ },
  tile:0.34,          // texture repeats per world metre
  bump:0.85,          // derive a normal map from the painted luminance
  specular:0.3, shininess:64, fresnel:0,
  emissive:[0,0,0],   // multiplied by the texture; >1 blooms
  blend:false, alpha:1,
  scroll:[0,0], wave:0   // animated UV / normal wobble, for water
});

W.spawn(x,y,z,yaw);
W.light({x,y,z, r,g,b, radius, intensity, flicker:0..1, shadow:true});
W.goal({x,y,z, r, title, text});          // walk into it to finish the level
W.setStepMaterial((x,z,y)=>'carpet');     // 'carpet' | 'tile' | 'concrete' | 'water' | 'metal'
W.environment({fogColor,fogDensity,ambient,exposure,lift,gain,sat,bloomThresh,aoStrength});
W.ambience({hum,humFreq,drone,water,tone,reverb,drips,eventGap});
```

### Making geometry

All coordinates are world metres, Y is up. Surfaces are tessellated automatically so
baked occlusion has something to shade.

```js
W.box(x,y,z, sx,sy,sz, mat, opt)      // from the minimum corner; also becomes collision
W.floor(x0,z0,x1,z1, y, mat, opt)     // faces up
W.ceiling(x0,z0,x1,z1, y, mat, opt)   // faces down
W.wall(x0,z0,x1,z1, y0,y1, mat, opt)  // vertical, normal to the left of travel
W.slab(x0,z0,x1,z1, y, mat, opt)      // floor + a metre of collision beneath it
W.quad(a,b,c,d, mat, opt)             // four [x,y,z] corners, CCW from the front
W.solid(x,y,z, sx,sy,sz)              // collision and light occlusion, no geometry
```

`opt` takes `{uvScale, uvOffset:[u,v], uvMode:'world'|'local', tint:[r,g,b], tess, double,
solid:false, skip:'+y-z'}`. `tess` is the subdivision step in metres, defaulting to 1.1 —
worth raising on anything large and flat, since every surface is capped at 32×32 subquads
and a 100 m wall left on the default silently spends all of them. `uvMode:'world'` (the default) projects UVs from world position
so tiling stays continuous across separate surfaces; `'local'` runs them along the quad.
`tint` is per-vertex and ranges 0–2.

Anything you pass to `W.box` or `W.solid` becomes both collision *and* an occluder in the
voxel volume the renderer ray-marches for light. Decorative geometry that shouldn't block
either — trim, fixtures, signage — wants `solid:false`.

### Painting textures

Textures are painted onto a square 2D canvas at whatever resolution the quality settings
ask for, so draw in terms of `size`. `LIMINAL.tex` (also handed to you as `TX`) has the
tools:

`fbm` `vnoise` `ihash` for tiling noise, `pixels` for a per-pixel pass, `fill`, `grain`,
`grid`, `streaks`, `stains`, `blot`, `wrap`, `normalFrom`, `rgba`.

Anything you draw must tile seamlessly, or you get a visible grid of repeats across every
wall. `fbm` and `vnoise` are periodic; `stains`, `streaks` and `blot` wrap themselves. For
anything else, wrap it yourself with `TX.wrap(ctx, () => { … })`.

## How the renderer works

Forward rendering, one pass, WebGL 2.

Geometry is batched into 16 m chunks, each carrying a precomputed list of the lights that
can reach it, and culled per frame against the frustum and the fog distance. Lighting is
per-fragment from up to 16 point lights per chunk.

Shadowing is a ray-march through a half-metre occupancy volume of the whole level, held in
a 3D texture. It is cheap because attenuation is checked first — in a maze most lights in a
chunk's list contribute nothing and are skipped before the march. This is what stops light
crossing walls, which matters more than shadow quality when every room has a ceiling light.

Ambient occlusion is baked per vertex at load time by sampling the same volume over a short
hemisphere — contact shadowing for corners and under props, nothing wider.

Post: bright-pass and separable blur for bloom, then one composite pass doing FXAA, ACES
tone mapping, the sRGB transfer, colour grading, chromatic aberration, vignette, VHS
scanlines and wobble, grain and dithering.

Audio is Web Audio all the way down — filtered noise beds, oscillator stacks for mains hum,
a procedurally generated impulse response for reverb, and footsteps synthesised per surface
material.
