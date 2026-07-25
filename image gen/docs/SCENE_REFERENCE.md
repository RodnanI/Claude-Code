# Scene file reference

*Generated from `scenegen/schema.py`. Do not edit by hand -- run `python render.py --write-docs` instead.*

Z is up. Distances are metres, angles are degrees. Any field documented as *null inherits* may be omitted.

## `name`

| field | type | default | notes |
| --- | --- | --- | --- |
| `name` | string | `'scene'` | Used for output filenames. |

## `description`

| field | type | default | notes |
| --- | --- | --- | --- |
| `description` | string | `null` | Free text. Ignored by the renderer. |

## `render`

| field | type | default | notes |
| --- | --- | --- | --- |
| `engine` | `cycles` \| `eevee` | `'cycles'` | 'cycles' is the path tracer: real refraction, caustics, global illumination. 'eevee' is a rasteriser -- seconds instead of minutes, but fakes transparency and light bounce. Use eevee to check composition, cycles to ship. |
| `resolution` | `480p` \| `720p` \| `1080p` \| `1440p` \| `4k` \| `8k` *or* [a, b] | `'1080p'` | A preset name or an explicit [width, height] in pixels. Presets set the long edge, so a preset plus a portrait aspect_ratio gives a tall image. |
| `aspect_ratio` | string | `null` | '16:9', '21:9', '4:3', '1:1', '9:16', '2.39:1'. Applied to preset resolutions; ignored when resolution is an explicit pixel pair. |
| `samples` | integer (1–65536) | `128` | Path-traced samples per pixel. 32-64 for drafts, 128-512 for finals, more for caustics or interiors. |
| `adaptive_threshold` | number (0–1) | `0.01` | Stops sampling converged pixels early. 0 disables and renders every sample. |
| `denoise` | true/false | `true` | OpenImageDenoise. Lets a low sample count look clean. |
| `ray_tracing` | object | `{}` |  |
| `film` | object | `{}` |  |
| `output` | object | `{}` |  |
| `seed` | integer | `0` | Sampling seed; unrelated to generator seeds. |
| `threads` | integer (0–1024) | `0` | 0 = every core. |

### `render`.ray_tracing

| field | type | default | notes |
| --- | --- | --- | --- |
| `max_bounces` | integer (0–1024) | `12` | Total light path depth. Raise for glass-heavy scenes. |
| `diffuse_bounces` | integer (0–1024) | `4` |  |
| `glossy_bounces` | integer (0–1024) | `4` |  |
| `transmission_bounces` | integer (0–1024) | `12` | Must be high for water and glass or thick volumes turn black. |
| `volume_bounces` | integer (0–1024) | `2` |  |
| `transparent_bounces` | integer (0–1024) | `8` |  |
| `caustics_reflective` | true/false | `false` | Light focused off shiny surfaces. Costly and noisy. |
| `caustics_refractive` | true/false | `false` | Light focused through water and glass -- the bright dancing bands on a pool floor. Enable for underwater or poolside shots and expect to raise `samples`. |
| `blur_glossy` | number (0–10) | `1.0` | Clamps fireflies by blurring indirect highlights. Set 0 for physical accuracy, 1-2 for clean renders. |
| `clamp_indirect` | number (0–1000) | `10.0` | 0 disables. Tames extreme fireflies. |

### `render`.film

| field | type | default | notes |
| --- | --- | --- | --- |
| `exposure` | number (-10–10) | `0.0` | Stops. |
| `view_transform` | `agx` \| `filmic` \| `standard` | `'agx'` | Tone mapping. 'agx' handles bright highlights gracefully; 'standard' is raw clipped sRGB. |
| `look` | `none` \| `punchy` \| `greyscale` \| `high_contrast` \| `low_contrast` | `'none'` |  |
| `transparent_background` | true/false | `false` |  |
| `motion_blur` | true/false | `false` |  |

### `render`.output

| field | type | default | notes |
| --- | --- | --- | --- |
| `format` | `png` \| `jpeg` \| `webp` \| `exr` | `'png'` |  |
| `color_depth` | `8` \| `16` \| `32` | `'8'` | 16 keeps gradients smooth for later grading; exr implies 32. |
| `quality` | integer (1–100) | `90` | jpeg/webp only. |

## `camera`

| field | type | default | notes |
| --- | --- | --- | --- |
| `location` | [x, y, z] | **required** | [x, y, z] in metres. Z is up. |
| `look_at` | [x, y, z] | `null` | Point the camera at this position. Preferred over rotation_deg -- it is far easier to reason about. |
| `rotation_deg` | [x, y, z] | `null` | Explicit Euler XYZ, used only when look_at is null. |
| `type` | `perspective` \| `orthographic` \| `panoramic` | `'perspective'` |  |
| `focal_length_mm` | number (1–5000) | `50.0` | 18 wide/dramatic, 35 natural, 50 neutral, 85+ compressed and distant. |
| `sensor_width_mm` | number (1–200) | `36.0` | 36 = full frame. |
| `ortho_scale` | number (0.001–100000) | `10.0` | Width of the view in metres, orthographic only. |
| `panoramic_type` | `equirectangular` \| `fisheye_equisolid` | `'equirectangular'` |  |
| `shift` | [a, b] | `[0.0, 0.0]` | Lens shift in sensor widths; [0, 0.1] keeps verticals vertical when framing tall subjects. |
| `clip` | [a, b] | `[0.1, 100000.0]` | [near, far] in metres. |
| `roll_deg` | number (-360–360) | `0.0` | Dutch angle, applied after look_at. |
| `depth_of_field` | object | `{}` |  |

### `camera`.depth_of_field

| field | type | default | notes |
| --- | --- | --- | --- |
| `enabled` | true/false | `false` |  |
| `focus_distance` | number (0–100000) | `null` | Metres. null means focus on `focus_object`, or on the camera's look_at target. |
| `focus_object` | string | `null` | id of an object to focus on. |
| `f_stop` | number (0.01–1024) | `2.8` | Lower is shallower. 1.4 dreamy, 8 mostly sharp. |
| `blades` | integer (0–16) | `0` | 0 = circular bokeh. |

## `world`

| field | type | default | notes |
| --- | --- | --- | --- |
| `sky` | object | **required** | How the environment is lit. |
| `fog` | object | `{}` |  |

### `world`.sky

How the environment is lit.

#### `type: "physical"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `sun_elevation_deg` | number (-90–90) | `25.0` | Height of the sun. 2-8 gives golden hour, below 0 gives dusk. |
| `sun_rotation_deg` | number (-3600–3600) | `135.0` | Compass bearing of the sun. |
| `sun_intensity` | number (0–1000) | `1.0` |  |
| `sun_disc_deg` | number (0–90) | `0.545` | Angular diameter. Larger softens shadows. |
| `air_density` | number (0–10) | `1.0` | Blue-sky scattering. |
| `dust_density` | number (0–10) | `1.0` | Haze. Raise for humid, hazy, or polluted air. |
| `ozone_density` | number (0–10) | `1.0` |  |
| `altitude_m` | number (0–60000) | `0.0` |  |
| `strength` | number (0–1000) | `1.0` |  |
| `sun_lamp` | true/false | `true` | Also create a Sun lamp matched to the sky's sun angle. Strongly recommended: the sky texture's own disc is sampled poorly and gives noisy shadows. |
| `sun_lamp_strength` | number (0–1000) | `1.0` | Multiplier on the physically matched sun brightness. 1.0 reproduces the sky's own sun; below 1 flattens the light toward overcast, above 1 exaggerates contrast. |

#### `type: "gradient"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `top` | colour | `'#5a86c4'` |  |
| `bottom` | colour | `'#c9b89a'` |  |
| `strength` | number (0–1000) | `1.0` |  |

#### `type: "color"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `color` | colour | `'#404448'` |  |
| `strength` | number (0–1000) | `1.0` |  |

#### `type: "hdri"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `path` | string | **required** | Path to a .hdr or .exr environment map. |
| `rotation_deg` | number (-3600–3600) | `0.0` |  |
| `strength` | number (0–1000) | `1.0` |  |

### `world`.fog

| field | type | default | notes |
| --- | --- | --- | --- |
| `enabled` | true/false | `false` |  |
| `density` | number (0–10) | `0.005` | Per metre. 0.001 is a light haze over a valley, 0.05 is thick fog. |
| `color` | colour | `'#b8c4d0'` |  |
| `anisotropy` | number (-0.99–0.99) | `0.0` | Positive scatters light forward, giving god rays when the camera faces the sun. |

## `materials`

Reusable named materials, referenced by name from any object's `material` field.

Keys are names you choose. Each value is:

### value

| field | type | default | notes |
| --- | --- | --- | --- |
| `preset` | `matte` \| `plastic` \| `metal` \| `brushed_metal` \| `chrome` \| `mirror` \| `gold` \| `copper` \| `glass` \| `frosted_glass` \| `water` \| `ice` \| `concrete` \| `asphalt` \| `brick` \| `plaster` \| `wood` \| `bark` \| `grass` \| `foliage` \| `sand` \| `dirt` \| `rock` \| `snow` \| `fabric` \| `rubber` \| `ceramic` \| `emission` | `'matte'` | Starting point; the fields below override it. |
| `color` | colour | `null` | Base colour. null inherits from preset. |
| `roughness` | number (0–1) | `null` |  |
| `metallic` | number (0–1) | `null` |  |
| `transmission` | number (0–1) | `null` | 1.0 makes the surface transparent and refractive. |
| `ior` | number (1–3) | `null` | Index of refraction. Water 1.33, glass 1.45-1.55. |
| `alpha` | number (0–1) | `null` | Straight opacity cutout; unlike transmission it does not refract. |
| `emission_color` | colour | `null` |  |
| `emission_strength` | number (0–100000) | `null` | Radiance multiplier; 0 disables emission. |
| `coat` | number (0–1) | `null` | Clearcoat layer, e.g. car paint. |
| `subsurface` | number (0–1) | `null` |  |
| `absorption_color` | colour | `null` | Volume tint for transmissive materials; this is what makes deep water go blue-green. |
| `absorption_distance` | number (0.001–10000) | `null` | Metres of travel before absorption_color saturates. |
| `texture` | object | `{}` |  |
| `bump` | object | `{}` |  |

#### value.texture

| field | type | default | notes |
| --- | --- | --- | --- |
| `type` | `none` \| `noise` \| `checker` \| `voronoi` \| `gradient` \| `bricks` | `'none'` | Procedural pattern mixed into the base colour. |
| `scale` | number (0.001–10000) | `5.0` |  |
| `detail` | number (0–16) | `2.0` | Octaves, for noise types. |
| `contrast` | number (0–10) | `1.0` |  |
| `color_a` | colour | `null` | null inherits the material colour. |
| `color_b` | colour | `null` |  |

#### value.bump

| field | type | default | notes |
| --- | --- | --- | --- |
| `type` | `none` \| `noise` \| `voronoi` \| `waves` | `'none'` |  |
| `scale` | number (0.001–10000) | `8.0` |  |
| `strength` | number (0–1) | `0.2` |  |
| `detail` | number (0–16) | `3.0` |  |

## `lights`

## item

Fields shared by every variant:

| field | type | default | notes |
| --- | --- | --- | --- |
| `id` | string | `null` |  |
| `color` | colour | `'#ffffff'` |  |
| `shadow` | true/false | `true` |  |

### `type: "sun"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `elevation_deg` | number (-90–90) | `45.0` |  |
| `rotation_deg` | number (-3600–3600) | `135.0` |  |
| `strength` | number (0–10000) | `3.0` | Irradiance, W/m^2. |
| `angle_deg` | number (0–180) | `0.526` | Angular size; larger gives softer shadows. |

### `type: "area"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `location` | [x, y, z] | **required** |  |
| `look_at` | [x, y, z] | `null` |  |
| `shape` | `square` \| `rectangle` \| `disk` \| `ellipse` | `'square'` |  |
| `size` | number (0.001–10000) | `1.0` |  |
| `size_y` | number (0.001–10000) | `null` |  |
| `power_w` | number (0–1e+07) | `100.0` |  |
| `spread_deg` | number (0–180) | `180.0` |  |

### `type: "point"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `location` | [x, y, z] | **required** |  |
| `radius` | number (0–1000) | `0.1` |  |
| `power_w` | number (0–1e+07) | `100.0` |  |

### `type: "spot"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `location` | [x, y, z] | **required** |  |
| `look_at` | [x, y, z] | `[0.0, 0.0, 0.0]` |  |
| `radius` | number (0–1000) | `0.1` |  |
| `power_w` | number (0–1e+07) | `500.0` |  |
| `cone_deg` | number (0–180) | `45.0` |  |
| `blend` | number (0–1) | `0.15` | Softness of the cone edge. |

## `objects`

## item

Something to put in the scene.

Fields shared by every variant:

| field | type | default | notes |
| --- | --- | --- | --- |
| `id` | string | `null` | Name it if something else must reference it. |
| `location` | [x, y, z] | `[0.0, 0.0, 0.0]` |  |
| `rotation_deg` | [x, y, z] | `[0.0, 0.0, 0.0]` |  |
| `scale` | number (0.0001–100000) *or* [x, y, z] | `[1.0, 1.0, 1.0]` | A single number scales uniformly. |
| `material` | string *or* object | `{}` | Either a name from the top-level `materials` library, or an inline material object. |
| `shade_smooth` | true/false | `null` | null lets each generator decide. |
| `visible` | true/false | `true` |  |
| `shadow_catcher` | true/false | `false` | Object is invisible but still receives shadows. |

### `type: "plane"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `size` | number (0.0001–1e+06) | `10.0` |  |
| `subdivisions` | integer (0–1000) | `0` |  |

### `type: "cube"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `size` | number (0.0001–100000) *or* [x, y, z] | `2.0` |  |

### `type: "sphere"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `radius` | number (0.0001–100000) | `1.0` |  |
| `segments` | integer (3–1000) | `48` |  |
| `rings` | integer (2–1000) | `24` |  |

### `type: "cylinder"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `radius` | number (0.0001–100000) | `1.0` |  |
| `depth` | number (0.0001–100000) | `2.0` |  |
| `vertices` | integer (3–1000) | `48` |  |
| `caps` | true/false | `true` |  |

### `type: "cone"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `radius` | number (0–100000) | `1.0` |  |
| `radius_top` | number (0–100000) | `0.0` |  |
| `depth` | number (0.0001–100000) | `2.0` |  |
| `vertices` | integer (3–1000) | `48` |  |

### `type: "torus"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `major_radius` | number (0.0001–100000) | `1.0` |  |
| `minor_radius` | number (0.0001–100000) | `0.25` |  |
| `segments` | integer (3–1000) | `48` |  |

### `type: "terrain"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `style` | `hills` \| `mountains` \| `dunes` \| `plains` \| `cliffs` \| `island` \| `canyon` \| `atoll` | `'hills'` |  |
| `size` | number (0.01–1e+06) *or* [a, b] | `100.0` | Metres across, or [x, y]. |
| `resolution` | integer (2–2048) | `192` | Grid subdivisions per side. 192 is a good default; 512+ is slow and memory hungry. |
| `height` | number (0–100000) | `12.0` | Peak-to-trough elevation in metres. |
| `seed` | integer | `0` |  |
| `octaves` | integer (1–12) | `null` | null follows the style. |
| `roughness` | number (0–1) | `null` |  |
| `warp` | number (0–5) | `null` | Domain warping. Bends ridges into organic shapes. |
| `sea_level` | number (-100000–100000) | `null` | Flatten everything below this Z, forming a shoreline. |

### `type: "ocean"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `size` | number (0.1–1e+06) | `200.0` |  |
| `resolution` | integer (1–32) | `14` | Ocean grid detail, and the setting most likely to blow up a render: the surface is resolution^2 cells per side, so face count grows as resolution^4. 8 is a draft (4k faces), 14 is a good default (38k), 20 is detailed (160k), 32 is 1M faces per tile. Large `size` values multiply this further by tiling. |
| `wave_strength` | number (0–1) | `0.4` | THE water dial. 0 is glass-flat, 0.2 a calm pool, 0.5 a working sea, 0.8 a gale, 1.0 a storm. Sets wave height, choppiness, wind and foam together unless you override them. Height is also capped by the size of the water, so a small pool stays plausible at any strength. |
| `wave_height_m` | number (0–100) | `null` | Ask for an exact peak-to-trough height in metres instead of letting wave_strength choose. The solver is calibrated to hit this, so it also overrides the size cap. |
| `wind_speed` | number (0–200) | `null` | m/s. Shapes the wavelength mix rather than the height. null derives from wave_strength. |
| `wave_scale` | number (0–100) | `null` | Raw amplitude multiplier, an escape hatch. Setting it disables wave-height calibration, so wave_height_m stops being honoured. |
| `choppiness` | number (0–4) | `null` | Sharpens crests into peaks. null derives. |
| `smallest_wave_m` | number (0–100) | `0.01` | Cuts ripples below this size. |
| `direction_deg` | number (-3600–3600) | `0.0` |  |
| `alignment` | number (0–1) | `0.0` | 0 is a confused chop from every direction; 1 marches the waves along `direction_deg` like a clean swell. |
| `depth_m` | number (0.01–100000) | `200.0` | Water depth fed to the wave model. Shallow water produces shorter, steeper waves. |
| `spectrum` | `phillips` \| `pierson_moskowitz` \| `jonswap` \| `tma` | `'jonswap'` | Wave energy model. 'jonswap' suits fetch-limited seas and coasts, 'pierson_moskowitz' a fully developed open ocean, 'tma' shallow water. |
| `fetch_km` | number (0.001–10000) | `120.0` | Distance the wind has blown over open water. jonswap/tma only. |
| `foam` | true/false | `null` | null enables it above wave_strength 0.35. |
| `foam_amount` | number (0–1) | `null` |  |
| `seed` | integer | `0` |  |
| `time` | number (0–100000) | `8.0` | Seconds into the simulation. Change it to reroll the wave pattern without changing the sea state. |
| `clarity_m` | number (0.01–10000) | `null` | How many metres you can see down. Small values give murky green water, large give clear tropical water. null derives from the material preset. |

### `type: "rock"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `style` | `boulder` \| `angular` \| `slab` \| `pebble` \| `spire` | `'boulder'` |  |
| `size` | number (0.001–10000) | `1.0` |  |
| `seed` | integer | `0` |  |
| `detail` | integer (0–6) | `3` | Subdivision level. |
| `erosion` | number (0–1) | `0.5` | 0 is sharp and freshly fractured, 1 is weathered. |

### `type: "tree"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `style` | `pine` \| `oak` \| `birch` \| `palm` \| `dead` \| `shrub` | `'pine'` |  |
| `height` | number (0.05–200) | `8.0` |  |
| `seed` | integer | `0` |  |
| `lean_deg` | number (-45–45) | `0.0` |  |
| `detail` | `low` \| `medium` \| `high` | `'medium'` | Polygon budget. Use 'low' for anything scattered in the hundreds. |
| `trunk_material` | string *or* object | `{}` | Either a name from the top-level `materials` library, or an inline material object. |
| `leaf_material` | string *or* object | `{}` | Either a name from the top-level `materials` library, or an inline material object. |
| `bare` | true/false | `false` | Drop the foliage. |

### `type: "scatter"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `generator` | object | **required** | Something to put in the scene. |
| `count` | integer (0–100000) | `50` |  |
| `on` | string | `null` | id of a terrain to sit on. Instances are dropped onto its surface. null scatters across a flat area at this object's location. |
| `area` | number (0–1e+06) *or* [a, b] | `null` | Extent to cover. null uses the whole target. |
| `seed` | integer | `0` |  |
| `scale_range` | [a, b] | `[0.8, 1.25]` |  |
| `align_to_normal` | number (0–1) | `0.0` | 0 keeps instances upright, 1 tilts them to follow the slope. |
| `max_slope_deg` | number (0–90) | `90.0` | Skip placements steeper than this -- keeps trees off cliff faces. |
| `altitude_range` | [a, b] | `null` | [min_z, max_z]; skip placements outside it. Use it to keep trees above the waterline. |
| `spacing` | number (0–10000) | `0.0` | Minimum metres between instances. 0 allows overlap. |

### `type: "facade"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `bays` | integer (1–400) | `24` | Apartment cells across the width (the Y axis). |
| `floors` | integer (1–400) | `24` | Storeys up the height (the Z axis). Push both of these past what the frame shows and let fog hide the ends to make the building read as endless. |
| `bay_width` | number (0.5–50) | `3.2` |  |
| `floor_height` | number (0.5–50) | `2.8` |  |
| `recess` | number (0–5) | `0.35` | How deep windows sit in the wall. Deeper recesses throw stronger shadows and read as heavier concrete. |
| `seam` | number (0–1) | `0.05` | Width of the joint between precast panels. |
| `lit_fraction` | number (0–1) | `0.06` | Fraction of windows with a light on behind them. Keep it low; a few lit windows in a dead facade is far more unsettling than many. |
| `balcony_every` | integer (0–100) | `3` | Place a recessed loggia every N bays. 0 disables balconies entirely. |
| `weathering` | number (0–1) | `0.5` | Spread of shade between individual precast panels. 0 makes the wall one flat colour; 0.5 gives the patchwork of a real panel block. |
| `panel_dark` | colour | `null` | Darkest panel shade. null uses a grey-green concrete. |
| `panel_light` | colour | `null` | Lightest panel shade. |
| `seed` | integer | `0` |  |
| `panel_material` | string *or* object | `{}` | Either a name from the top-level `materials` library, or an inline material object. |
| `trim_material` | string *or* object | `{}` | Either a name from the top-level `materials` library, or an inline material object. |
| `glass_material` | string *or* object | `{}` | Either a name from the top-level `materials` library, or an inline material object. |
| `lit_material` | string *or* object | `{}` | Either a name from the top-level `materials` library, or an inline material object. |
| `parapet_material` | string *or* object | `{}` | Either a name from the top-level `materials` library, or an inline material object. |

### `type: "import"`

| field | type | default | notes |
| --- | --- | --- | --- |
| `path` | string | **required** | A .glb, .gltf, .obj, .ply or .stl file to load. |
| `keep_materials` | true/false | `true` |  |

