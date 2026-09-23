# VoxelCraft: Opus 5 edition

Open `minecraft.html` in Chrome, Edge or Firefox. It is a single standalone file with no external requests.

## What changed from the original build

**Performance**
- Chunk geometry now lives in large per-region vertex buffers (16x16 chunks each). A region draws each layer with one `WEBGL_multi_draw` call instead of one draw call per 16³ section. In testing, a loaded world dropped from hundreds or thousands of draw calls per frame to about 10. If the extension is missing, a plain draw loop without per-section state changes is used instead.
- The shadow map is cached. It only redraws when the sun has moved noticeably, when the camera has moved more than a few blocks, or when nearby chunks change.
- The cave-culling visibility search uses typed arrays and is throttled while chunks stream in.
- Cloud meshes are cached per tile, so moving no longer rebuilds them.
- Shadow maps are no longer recreated on every resize, and several per-frame allocations were removed.

**Visuals**
- Water: layered wave normals, screen-space reflections with binary refinement, refraction with depth-based absorption, caustics on the ground under the water, shoreline foam, and a GGX sun glint.
- Volumetric-style clouds, drawn as a depth-tested sky pass, so you can fly above and through them.
- A round sun with a corona, star tints, and fog that takes its colour from the sky in each direction.
- Light passing through leaves when you look toward the sun, and colour grading.
- Up to 8 dynamic point lights, used by munitions, explosions, engines and a held torch.

**Vehicles** (Vehicles tab in the creative inventory, `/vehicle <type>`, or crafted)

| Vehicle | Weapons |
|---|---|
| Stormcrow interceptor jet | Plasma cannons; Hydra homing missiles with lock-on |
| Wraith flying-wing bomber | Plasma cannon; plasma bombs aimed with a CCIP bomb sight |
| Mantis VTOL gunship | Turret cutting laser that burns through blocks; rocket salvos |
| Viper hover bike | Twin blasters; charged fusion shot |
| Bastion hover tank | Coax blaster; arcing plasma cannon with a predicted-impact ring |

Press F to board or exit a vehicle and F5 to switch cameras. Each vehicle has its own HUD, and the key hints show for a few seconds after you board. The full control list is under Controls & Help.

## Editing

The sources are in `src/` (`shared/` runs in the workers and the main thread, `main/` runs on the main thread only). Rebuild the single file with:

```
node build.js
```
