# image gen

Declarative 3D scenery for agents. You write a JSON file describing a scene;
one command renders it with a real path tracer.

```bash
./install.sh
.venv/bin/python render.py examples/liminal_panelblock.json -o out.png --preview
```

## Why it works this way

The renderer is Blender's Cycles, pulled in as a pip package (`bpy`) — no
Blender install, no GUI, no display server. That buys physically correct
refraction, global illumination, volumetric fog, spectral ocean waves and
OpenImageDenoise on day one, none of which is realistic to write from scratch
at competitive quality.

Everything above that is ours: the scene format, the validator, the procedural
generators, and the calibration layers that turn Blender's raw, interdependent
knobs into settings that mean something. A scene file never mentions Blender.

## The scene file

```json
{
  "render": { "resolution": "4k", "aspect_ratio": "21:9", "samples": 256 },
  "camera": { "location": [0, -26, 3.4], "look_at": [0, 30, 2], "focal_length_mm": 40 },
  "world":  { "sky": { "type": "physical", "sun_elevation_deg": 6 } },
  "objects": [
    { "type": "ocean", "size": 400, "wave_strength": 0.85 }
  ]
}
```

`docs/SCENE_REFERENCE.md` documents every field. It is generated from
`scenegen/schema.py`, so it cannot drift from what the validator accepts —
regenerate it with `render.py --write-docs`.

Object types: `terrain`, `ocean`, `facade`, `tree`, `rock`, `scatter`,
`import`, and the primitives `plane`, `cube`, `sphere`, `cylinder`, `cone`,
`torus`.

## Rendering

```bash
render.py scene.json --check                 # validate, no render, instant
render.py scene.json --draft                 # rasterised, seconds
render.py scene.json --preview               # path traced, 720p/24spp
render.py scene.json --resolution 4k --samples 512
render.py scene.json --save-blend out.blend  # open it in Blender to inspect
```

Resolution takes a preset (`480p`…`8k`) or explicit `WxH`. Presets set the
*long* edge, so `--resolution 4k --aspect 9:16` gives 2160×3840.

## Errors are the interface

Scene files are written by models, and a model can only fix what it is told
precisely. Every failure names the exact path, what was expected, and the
nearest legal spelling:

```
3 problems in scene file:
  - camera.location: required field is missing. [x, y, z] in metres. Z is up.
  - objects[1](ocean): unknown field 'wave_strengh'. Did you mean 'wave_strength', 'wave_height_m' or 'wave_scale'?
  - objects[1](ocean).spectrum: 'jonswop' is not valid. Choose from ['phillips', 'pierson_moskowitz', 'jonswap', 'tma']. Did you mean 'jonswap'?
```

Every problem in the file is reported at once, so a fix pass is one round trip
rather than one error at a time.

The compiler also warns about things that are legal but will ruin the image —
a camera buried inside terrain, fog thick enough to hide the whole scene,
caustics enabled at a sample count too low to resolve them.

## Water

`wave_strength` is one dial from glassy to storm. Behind it, the Ocean
modifier is a genuine spectral wave solver — a directional energy spectrum
inverse-FFTed into a heightfield — and three calibration layers make the dial
mean something:

- **Height** is solved for, not guessed. Blender's `wave_scale` is a bare
  multiplier whose effect depends on wind, spectrum, depth and seed, so the
  surface is evaluated once and the multiplier divided out. `wave_strength`
  maps to real metres, and `wave_height_m` asks for an exact figure.
- **Steepness is capped by the size of the water**, so a swimming pool gets
  centimetre ripples and open ocean gets nine-metre rollers from the same
  setting.
- **Choppiness is clamped against amplitude.** Crest sharpening displaces the
  surface horizontally in proportion to wave height, so tall waves plus high
  choppiness fold the mesh through itself into glass shards. The product is
  bounded.

Water is refractive (IOR 1.333) with a Volume Absorption term, which is what
makes depth tint the colour instead of the surface being uniformly green.
`clarity_m` sets how far you see down. Foam thresholds are measured from the
solver's own output rather than hardcoded, so `foam_amount` means "this
fraction of the surface shows whitecaps" at any sea state.

Caustics are off by default — they are the most expensive light paths in the
renderer. Turn on `ray_tracing.caustics_refractive`, set `blur_glossy` to 0,
and raise samples.

## Lighting

`sky: physical` is Blender's Nishita atmosphere, and by default a Sun lamp is
created to match it, because the sky texture's own sun disc samples poorly and
gives noisy shadows. That lamp's brightness is derived from a fit to the sky's
actual output — an extraterrestrial constant attenuated by Beer-Lambert
extinction through air mass `1/sin(elevation)` — so sun and sky stay in
correct proportion at every elevation, from harsh noon to a hazy 4° sunset.

The whole environment is then divided by a fixed constant so `strength: 1.0`
means correctly exposed daylight rather than five stops over. The sun-to-sky
*ratio*, which is what decides whether an image reads as real, is untouched.

Fog is a box sized to the scene, not a world volume. Cycles' world volume
fills all of space, so a sun at infinite distance is attenuated over an
infinite path and never arrives — every density above zero renders pure black.

## Performance

CPU-only here, 4 cores. Measured on this machine:

| what | time |
|---|---|
| 720×540, 72 samples, 2 facades (~500k faces) | 70 s |
| 640×360, 40 samples, terrain + 400 scattered trees | 14 s |
| 480×270, 32 samples, ocean | 5 s |

4K at 256 samples is roughly 30–90 minutes for a real scene. Use `--draft` for
composition, `--preview` for lighting, full quality once.

The expensive settings, in order: `samples`, `resolution`, refractive
caustics, fog density, and `ocean.resolution` — the last one grows as the
fourth power, so 32 is a million faces per tile.

## Layout

```
render.py              entry point
scenegen/
  schema.py            the scene contract; docs are generated from it
  validate.py          spec-driven validator
  build.py             orchestration
  settings.py          resolution, sampling, ray depth, tone mapping
  camera.py  lights.py  world.py  materials.py
  water.py             ocean, wave calibration, water shading
  generators/
    terrain.py  trees.py  rocks.py  architecture.py  scatter.py
    primitives.py  meshkit.py
examples/              scene files
docs/SCENE_REFERENCE.md
```
