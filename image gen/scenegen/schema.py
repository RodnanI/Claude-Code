"""The scene file contract.

This module is the single source of truth for what may appear in a scene
file. docs/AUTHORING.md is generated from it, so the documentation cannot
drift away from the validator.

Conventions throughout:
  * Z is up. X is east, Y is north. Metres, kilograms, seconds.
  * Angles in the scene file are always degrees; radians only exist inside
    the compiler.
  * Any field documented as "null inherits" may be omitted or set to null,
    in which case the material preset or generator picks the value.
"""

from __future__ import annotations

from .validate import (
    anything, array, color, enum, flag, group, integer, mapping, num, one_of,
    tagged, text, vec2, vec3,
)

# --------------------------------------------------------------------------
# materials
# --------------------------------------------------------------------------

MATERIAL_PRESETS = [
    "matte", "plastic", "metal", "brushed_metal", "chrome", "mirror", "gold",
    "copper", "glass", "frosted_glass", "water", "ice", "concrete", "asphalt",
    "brick", "plaster", "wood", "bark", "grass", "foliage", "sand", "dirt",
    "rock", "snow", "fabric", "rubber", "ceramic", "emission",
]

TEXTURE = group({
    "type": enum(["none", "noise", "checker", "voronoi", "gradient", "bricks"],
                 default="none",
                 doc="Procedural pattern mixed into the base colour."),
    "scale": num(default=5.0, lo=0.001, hi=10000.0),
    "detail": num(default=2.0, lo=0.0, hi=16.0, doc="Octaves, for noise types."),
    "contrast": num(default=1.0, lo=0.0, hi=10.0),
    "color_a": color(default=None, doc="null inherits the material colour."),
    "color_b": color(default=None),
}, default={})

BUMP = group({
    "type": enum(["none", "noise", "voronoi", "waves"], default="none"),
    "scale": num(default=8.0, lo=0.001, hi=10000.0),
    "strength": num(default=0.2, lo=0.0, hi=1.0),
    "detail": num(default=3.0, lo=0.0, hi=16.0),
}, default={})

MATERIAL = group({
    "preset": enum(MATERIAL_PRESETS, default="matte",
                   doc="Starting point; the fields below override it."),
    "color": color(default=None, doc="Base colour. null inherits from preset."),
    "roughness": num(default=None, lo=0.0, hi=1.0),
    "metallic": num(default=None, lo=0.0, hi=1.0),
    "transmission": num(default=None, lo=0.0, hi=1.0,
                        doc="1.0 makes the surface transparent and refractive."),
    "ior": num(default=None, lo=1.0, hi=3.0,
               doc="Index of refraction. Water 1.33, glass 1.45-1.55."),
    "alpha": num(default=None, lo=0.0, hi=1.0,
                 doc="Straight opacity cutout; unlike transmission it does not refract."),
    "emission_color": color(default=None),
    "emission_strength": num(default=None, lo=0.0, hi=100000.0,
                             doc="Radiance multiplier; 0 disables emission."),
    "coat": num(default=None, lo=0.0, hi=1.0, doc="Clearcoat layer, e.g. car paint."),
    "subsurface": num(default=None, lo=0.0, hi=1.0),
    "absorption_color": color(default=None,
                              doc="Volume tint for transmissive materials; "
                                  "this is what makes deep water go blue-green."),
    "absorption_distance": num(default=None, lo=0.001, hi=10000.0,
                               doc="Metres of travel before absorption_color saturates."),
    "texture": TEXTURE,
    "bump": BUMP,
}, default={})

MATERIAL_REF = one_of([text(), MATERIAL], default={},
                      doc="Either a name from the top-level `materials` "
                          "library, or an inline material object.")

# --------------------------------------------------------------------------
# render settings
# --------------------------------------------------------------------------

RESOLUTION_PRESETS = ["480p", "720p", "1080p", "1440p", "4k", "8k"]

RAY_TRACING = group({
    "max_bounces": integer(default=12, lo=0, hi=1024,
                           doc="Total light path depth. Raise for glass-heavy scenes."),
    "diffuse_bounces": integer(default=4, lo=0, hi=1024),
    "glossy_bounces": integer(default=4, lo=0, hi=1024),
    "transmission_bounces": integer(default=12, lo=0, hi=1024,
                                    doc="Must be high for water and glass or "
                                        "thick volumes turn black."),
    "volume_bounces": integer(default=2, lo=0, hi=1024),
    "transparent_bounces": integer(default=8, lo=0, hi=1024),
    "caustics_reflective": flag(default=False,
                                doc="Light focused off shiny surfaces. Costly and noisy."),
    "caustics_refractive": flag(default=False,
                                doc="Light focused through water and glass -- the "
                                    "bright dancing bands on a pool floor. Enable "
                                    "for underwater or poolside shots and expect "
                                    "to raise `samples`."),
    "blur_glossy": num(default=1.0, lo=0.0, hi=10.0,
                       doc="Clamps fireflies by blurring indirect highlights. "
                           "Set 0 for physical accuracy, 1-2 for clean renders."),
    "clamp_indirect": num(default=10.0, lo=0.0, hi=1000.0,
                          doc="0 disables. Tames extreme fireflies."),
}, default={})

FILM = group({
    "exposure": num(default=0.0, lo=-10.0, hi=10.0, doc="Stops."),
    "view_transform": enum(["agx", "filmic", "standard"], default="agx",
                           doc="Tone mapping. 'agx' handles bright highlights "
                               "gracefully; 'standard' is raw clipped sRGB."),
    "look": enum(["none", "punchy", "greyscale", "high_contrast", "low_contrast"],
                 default="none"),
    "transparent_background": flag(default=False),
    "motion_blur": flag(default=False),
}, default={})

OUTPUT = group({
    "format": enum(["png", "jpeg", "webp", "exr"], default="png"),
    "color_depth": enum(["8", "16", "32"], default="8",
                        doc="16 keeps gradients smooth for later grading; "
                            "exr implies 32."),
    "quality": integer(default=90, lo=1, hi=100, doc="jpeg/webp only."),
}, default={})

RENDER = group({
    "engine": enum(["cycles", "eevee"], default="cycles",
                   doc="'cycles' is the path tracer: real refraction, caustics, "
                       "global illumination. 'eevee' is a rasteriser -- seconds "
                       "instead of minutes, but fakes transparency and light "
                       "bounce. Use eevee to check composition, cycles to ship."),
    "resolution": one_of([enum(RESOLUTION_PRESETS), vec2()], default="1080p",
                         doc="A preset name or an explicit [width, height] in "
                             "pixels. Presets set the long edge, so a preset "
                             "plus a portrait aspect_ratio gives a tall image."),
    "aspect_ratio": text(default=None,
                         doc="'16:9', '21:9', '4:3', '1:1', '9:16', '2.39:1'. "
                             "Applied to preset resolutions; ignored when "
                             "resolution is an explicit pixel pair."),
    "samples": integer(default=128, lo=1, hi=65536,
                       doc="Path-traced samples per pixel. 32-64 for drafts, "
                           "128-512 for finals, more for caustics or interiors."),
    "adaptive_threshold": num(default=0.01, lo=0.0, hi=1.0,
                              doc="Stops sampling converged pixels early. "
                                  "0 disables and renders every sample."),
    "denoise": flag(default=True,
                    doc="OpenImageDenoise. Lets a low sample count look clean."),
    "ray_tracing": RAY_TRACING,
    "film": FILM,
    "output": OUTPUT,
    "seed": integer(default=0, doc="Sampling seed; unrelated to generator seeds."),
    "threads": integer(default=0, lo=0, hi=1024, doc="0 = every core."),
}, default={})

# --------------------------------------------------------------------------
# camera
# --------------------------------------------------------------------------

DEPTH_OF_FIELD = group({
    "enabled": flag(default=False),
    "focus_distance": num(default=None, lo=0.0, hi=100000.0,
                          doc="Metres. null means focus on `focus_object`, or "
                              "on the camera's look_at target."),
    "focus_object": text(default=None, doc="id of an object to focus on."),
    "f_stop": num(default=2.8, lo=0.01, hi=1024.0,
                  doc="Lower is shallower. 1.4 dreamy, 8 mostly sharp."),
    "blades": integer(default=0, lo=0, hi=16, doc="0 = circular bokeh."),
}, default={})

CAMERA = group({
    "location": vec3(doc="[x, y, z] in metres. Z is up."),
    "look_at": vec3(default=None,
                    doc="Point the camera at this position. Preferred over "
                        "rotation_deg -- it is far easier to reason about."),
    "rotation_deg": vec3(default=None,
                         doc="Explicit Euler XYZ, used only when look_at is null."),
    "type": enum(["perspective", "orthographic", "panoramic"], default="perspective"),
    "focal_length_mm": num(default=50.0, lo=1.0, hi=5000.0,
                           doc="18 wide/dramatic, 35 natural, 50 neutral, "
                               "85+ compressed and distant."),
    "sensor_width_mm": num(default=36.0, lo=1.0, hi=200.0, doc="36 = full frame."),
    "ortho_scale": num(default=10.0, lo=0.001, hi=100000.0,
                       doc="Width of the view in metres, orthographic only."),
    "panoramic_type": enum(["equirectangular", "fisheye_equisolid"],
                           default="equirectangular"),
    "shift": vec2(default=[0.0, 0.0],
                  doc="Lens shift in sensor widths; [0, 0.1] keeps verticals "
                      "vertical when framing tall subjects."),
    "clip": vec2(default=[0.1, 100000.0], doc="[near, far] in metres."),
    "roll_deg": num(default=0.0, lo=-360.0, hi=360.0,
                    doc="Dutch angle, applied after look_at."),
    "depth_of_field": DEPTH_OF_FIELD,
})

# --------------------------------------------------------------------------
# world and lighting
# --------------------------------------------------------------------------

SKY = tagged("type", {
    "physical": {
        "sun_elevation_deg": num(default=25.0, lo=-90.0, hi=90.0,
                                 doc="Height of the sun. 2-8 gives golden hour, "
                                     "below 0 gives dusk."),
        "sun_rotation_deg": num(default=135.0, lo=-3600.0, hi=3600.0,
                                doc="Compass bearing of the sun."),
        "sun_intensity": num(default=1.0, lo=0.0, hi=1000.0),
        "sun_disc_deg": num(default=0.545, lo=0.0, hi=90.0,
                            doc="Angular diameter. Larger softens shadows."),
        "air_density": num(default=1.0, lo=0.0, hi=10.0, doc="Blue-sky scattering."),
        "dust_density": num(default=1.0, lo=0.0, hi=10.0,
                            doc="Haze. Raise for humid, hazy, or polluted air."),
        "ozone_density": num(default=1.0, lo=0.0, hi=10.0),
        "altitude_m": num(default=0.0, lo=0.0, hi=60000.0),
        "strength": num(default=1.0, lo=0.0, hi=1000.0),
        "sun_lamp": flag(default=True,
                         doc="Also create a Sun lamp matched to the sky's sun "
                             "angle. Strongly recommended: the sky texture's own "
                             "disc is sampled poorly and gives noisy shadows."),
        "sun_lamp_strength": num(default=1.0, lo=0.0, hi=1000.0,
                                 doc="Multiplier on the physically matched sun "
                                     "brightness. 1.0 reproduces the sky's own "
                                     "sun; below 1 flattens the light toward "
                                     "overcast, above 1 exaggerates contrast."),
    },
    "gradient": {
        "top": color(default="#5a86c4"),
        "bottom": color(default="#c9b89a"),
        "strength": num(default=1.0, lo=0.0, hi=1000.0),
    },
    "color": {
        "color": color(default="#404448"),
        "strength": num(default=1.0, lo=0.0, hi=1000.0),
    },
    "hdri": {
        "path": text(doc="Path to a .hdr or .exr environment map."),
        "rotation_deg": num(default=0.0, lo=-3600.0, hi=3600.0),
        "strength": num(default=1.0, lo=0.0, hi=1000.0),
    },
}, doc="How the environment is lit.")

FOG = group({
    "enabled": flag(default=False),
    "density": num(default=0.005, lo=0.0, hi=10.0,
                   doc="Per metre. 0.001 is a light haze over a valley, "
                       "0.05 is thick fog."),
    "color": color(default="#b8c4d0"),
    "anisotropy": num(default=0.0, lo=-0.99, hi=0.99,
                      doc="Positive scatters light forward, giving god rays "
                          "when the camera faces the sun."),
}, default={})

WORLD = group({
    "sky": SKY,
    "fog": FOG,
}, default={"sky": {"type": "physical"}})

LIGHT = tagged("type", {
    "sun": {
        "elevation_deg": num(default=45.0, lo=-90.0, hi=90.0),
        "rotation_deg": num(default=135.0, lo=-3600.0, hi=3600.0),
        "strength": num(default=3.0, lo=0.0, hi=10000.0, doc="Irradiance, W/m^2."),
        "angle_deg": num(default=0.526, lo=0.0, hi=180.0,
                         doc="Angular size; larger gives softer shadows."),
    },
    "area": {
        "location": vec3(),
        "look_at": vec3(default=None),
        "shape": enum(["square", "rectangle", "disk", "ellipse"], default="square"),
        "size": num(default=1.0, lo=0.001, hi=10000.0),
        "size_y": num(default=None, lo=0.001, hi=10000.0),
        "power_w": num(default=100.0, lo=0.0, hi=10_000_000.0),
        "spread_deg": num(default=180.0, lo=0.0, hi=180.0),
    },
    "point": {
        "location": vec3(),
        "radius": num(default=0.1, lo=0.0, hi=1000.0),
        "power_w": num(default=100.0, lo=0.0, hi=10_000_000.0),
    },
    "spot": {
        "location": vec3(),
        "look_at": vec3(default=[0.0, 0.0, 0.0]),
        "radius": num(default=0.1, lo=0.0, hi=1000.0),
        "power_w": num(default=500.0, lo=0.0, hi=10_000_000.0),
        "cone_deg": num(default=45.0, lo=0.0, hi=180.0),
        "blend": num(default=0.15, lo=0.0, hi=1.0, doc="Softness of the cone edge."),
    },
}, shared={
    "id": text(default=None),
    "color": color(default="#ffffff"),
    "shadow": flag(default=True),
})

# --------------------------------------------------------------------------
# objects
# --------------------------------------------------------------------------

TERRAIN_STYLES = ["hills", "mountains", "dunes", "plains", "cliffs", "island",
                  "canyon", "atoll"]
TREE_STYLES = ["pine", "oak", "birch", "palm", "dead", "shrub"]
ROCK_STYLES = ["boulder", "angular", "slab", "pebble", "spire"]

_OBJECT_SHARED = {
    "id": text(default=None, doc="Name it if something else must reference it."),
    "location": vec3(default=[0.0, 0.0, 0.0]),
    "rotation_deg": vec3(default=[0.0, 0.0, 0.0]),
    "scale": one_of([num(lo=0.0001, hi=100000.0), vec3()], default=[1.0, 1.0, 1.0],
                    doc="A single number scales uniformly."),
    "material": MATERIAL_REF,
    "shade_smooth": flag(default=None, doc="null lets each generator decide."),
    "visible": flag(default=True),
    "shadow_catcher": flag(default=False,
                           doc="Object is invisible but still receives shadows."),
}

_OBJECT_VARIANTS = {
    # ---- primitives -----------------------------------------------------
    "plane": {"size": num(default=10.0, lo=0.0001, hi=1_000_000.0),
              "subdivisions": integer(default=0, lo=0, hi=1000)},
    "cube": {"size": one_of([num(lo=0.0001, hi=100000.0), vec3()], default=2.0)},
    "sphere": {"radius": num(default=1.0, lo=0.0001, hi=100000.0),
               "segments": integer(default=48, lo=3, hi=1000),
               "rings": integer(default=24, lo=2, hi=1000)},
    "cylinder": {"radius": num(default=1.0, lo=0.0001, hi=100000.0),
                 "depth": num(default=2.0, lo=0.0001, hi=100000.0),
                 "vertices": integer(default=48, lo=3, hi=1000),
                 "caps": flag(default=True)},
    "cone": {"radius": num(default=1.0, lo=0.0, hi=100000.0),
             "radius_top": num(default=0.0, lo=0.0, hi=100000.0),
             "depth": num(default=2.0, lo=0.0001, hi=100000.0),
             "vertices": integer(default=48, lo=3, hi=1000)},
    "torus": {"major_radius": num(default=1.0, lo=0.0001, hi=100000.0),
              "minor_radius": num(default=0.25, lo=0.0001, hi=100000.0),
              "segments": integer(default=48, lo=3, hi=1000)},

    # ---- generated scenery ----------------------------------------------
    "terrain": {
        "style": enum(TERRAIN_STYLES, default="hills"),
        "size": one_of([num(lo=0.01, hi=1_000_000.0), vec2()], default=100.0,
                       doc="Metres across, or [x, y]."),
        "resolution": integer(default=192, lo=2, hi=2048,
                              doc="Grid subdivisions per side. 192 is a good "
                                  "default; 512+ is slow and memory hungry."),
        "height": num(default=12.0, lo=0.0, hi=100000.0,
                      doc="Peak-to-trough elevation in metres."),
        "seed": integer(default=0),
        "octaves": integer(default=None, lo=1, hi=12, doc="null follows the style."),
        "roughness": num(default=None, lo=0.0, hi=1.0),
        "warp": num(default=None, lo=0.0, hi=5.0,
                    doc="Domain warping. Bends ridges into organic shapes."),
        "sea_level": num(default=None, lo=-100000.0, hi=100000.0,
                         doc="Flatten everything below this Z, forming a shoreline."),
    },
    "ocean": {
        # See water.py -- `wave_strength` is the single dial the brief asked
        # for, and it drives scale, choppiness and foam together.
        "size": num(default=200.0, lo=0.1, hi=1_000_000.0),
        "resolution": integer(default=14, lo=1, hi=32,
                              doc="Ocean grid detail, and the setting most "
                                  "likely to blow up a render: the surface is "
                                  "resolution^2 cells per side, so face count "
                                  "grows as resolution^4. 8 is a draft "
                                  "(4k faces), 14 is a good default (38k), 20 "
                                  "is detailed (160k), 32 is 1M faces per "
                                  "tile. Large `size` values multiply this "
                                  "further by tiling."),
        "wave_strength": num(default=0.4, lo=0.0, hi=1.0,
                             doc="THE water dial. 0 is glass-flat, 0.2 a calm "
                                 "pool, 0.5 a working sea, 0.8 a gale, 1.0 a "
                                 "storm. Sets wave height, choppiness, wind and "
                                 "foam together unless you override them. "
                                 "Height is also capped by the size of the "
                                 "water, so a small pool stays plausible at "
                                 "any strength."),
        "wave_height_m": num(default=None, lo=0.0, hi=100.0,
                             doc="Ask for an exact peak-to-trough height in "
                                 "metres instead of letting wave_strength "
                                 "choose. The solver is calibrated to hit "
                                 "this, so it also overrides the size cap."),
        "wind_speed": num(default=None, lo=0.0, hi=200.0,
                          doc="m/s. Shapes the wavelength mix rather than the "
                              "height. null derives from wave_strength."),
        "wave_scale": num(default=None, lo=0.0, hi=100.0,
                          doc="Raw amplitude multiplier, an escape hatch. "
                              "Setting it disables wave-height calibration, "
                              "so wave_height_m stops being honoured."),
        "choppiness": num(default=None, lo=0.0, hi=4.0,
                          doc="Sharpens crests into peaks. null derives."),
        "smallest_wave_m": num(default=0.01, lo=0.0, hi=100.0,
                               doc="Cuts ripples below this size."),
        "direction_deg": num(default=0.0, lo=-3600.0, hi=3600.0),
        "alignment": num(default=0.0, lo=0.0, hi=1.0,
                         doc="0 is a confused chop from every direction; 1 "
                             "marches the waves along `direction_deg` like a "
                             "clean swell."),
        "depth_m": num(default=200.0, lo=0.01, hi=100000.0,
                       doc="Water depth fed to the wave model. Shallow water "
                           "produces shorter, steeper waves."),
        "spectrum": enum(["phillips", "pierson_moskowitz", "jonswap", "tma"],
                         default="jonswap",
                         doc="Wave energy model. 'jonswap' suits fetch-limited "
                             "seas and coasts, 'pierson_moskowitz' a fully "
                             "developed open ocean, 'tma' shallow water."),
        "fetch_km": num(default=120.0, lo=0.001, hi=10000.0,
                        doc="Distance the wind has blown over open water. "
                            "jonswap/tma only."),
        "foam": flag(default=None, doc="null enables it above wave_strength 0.35."),
        "foam_amount": num(default=None, lo=0.0, hi=1.0),
        "seed": integer(default=0),
        "time": num(default=8.0, lo=0.0, hi=100000.0,
                    doc="Seconds into the simulation. Change it to reroll the "
                        "wave pattern without changing the sea state."),
        "clarity_m": num(default=None, lo=0.01, hi=10000.0,
                         doc="How many metres you can see down. Small values "
                             "give murky green water, large give clear tropical "
                             "water. null derives from the material preset."),
    },
    "rock": {
        "style": enum(ROCK_STYLES, default="boulder"),
        "size": num(default=1.0, lo=0.001, hi=10000.0),
        "seed": integer(default=0),
        "detail": integer(default=3, lo=0, hi=6, doc="Subdivision level."),
        "erosion": num(default=0.5, lo=0.0, hi=1.0,
                       doc="0 is sharp and freshly fractured, 1 is weathered."),
    },
    "tree": {
        "style": enum(TREE_STYLES, default="pine"),
        "height": num(default=8.0, lo=0.05, hi=200.0),
        "seed": integer(default=0),
        "lean_deg": num(default=0.0, lo=-45.0, hi=45.0),
        "detail": enum(["low", "medium", "high"], default="medium",
                       doc="Polygon budget. Use 'low' for anything scattered "
                           "in the hundreds."),
        "trunk_material": MATERIAL_REF,
        "leaf_material": MATERIAL_REF,
        "bare": flag(default=False, doc="Drop the foliage."),
    },
    "scatter": {
        "generator": anything(doc="An object definition to replicate. Takes the "
                                  "same form as any entry in `objects`."),
        "count": integer(default=50, lo=0, hi=100000),
        "on": text(default=None,
                   doc="id of a terrain to sit on. Instances are dropped onto "
                       "its surface. null scatters across a flat area at "
                       "this object's location."),
        "area": one_of([num(lo=0.0, hi=1_000_000.0), vec2()], default=None,
                       doc="Extent to cover. null uses the whole target."),
        "seed": integer(default=0),
        "scale_range": vec2(default=[0.8, 1.25]),
        "align_to_normal": num(default=0.0, lo=0.0, hi=1.0,
                               doc="0 keeps instances upright, 1 tilts them to "
                                   "follow the slope."),
        "max_slope_deg": num(default=90.0, lo=0.0, hi=90.0,
                             doc="Skip placements steeper than this -- keeps "
                                 "trees off cliff faces."),
        "altitude_range": vec2(default=None,
                               doc="[min_z, max_z]; skip placements outside it. "
                                   "Use it to keep trees above the waterline."),
        "spacing": num(default=0.0, lo=0.0, hi=10000.0,
                       doc="Minimum metres between instances. 0 allows overlap."),
    },
    "facade": {
        "bays": integer(default=24, lo=1, hi=400,
                        doc="Apartment cells across the width (the Y axis)."),
        "floors": integer(default=24, lo=1, hi=400,
                          doc="Storeys up the height (the Z axis). Push both "
                              "of these past what the frame shows and let fog "
                              "hide the ends to make the building read as "
                              "endless."),
        "bay_width": num(default=3.2, lo=0.5, hi=50.0),
        "floor_height": num(default=2.8, lo=0.5, hi=50.0),
        "recess": num(default=0.35, lo=0.0, hi=5.0,
                      doc="How deep windows sit in the wall. Deeper recesses "
                          "throw stronger shadows and read as heavier concrete."),
        "seam": num(default=0.05, lo=0.0, hi=1.0,
                    doc="Width of the joint between precast panels."),
        "lit_fraction": num(default=0.06, lo=0.0, hi=1.0,
                            doc="Fraction of windows with a light on behind "
                                "them. Keep it low; a few lit windows in a "
                                "dead facade is far more unsettling than many."),
        "balcony_every": integer(default=3, lo=0, hi=100,
                                 doc="Place a recessed loggia every N bays. "
                                     "0 disables balconies entirely."),
        "weathering": num(default=0.5, lo=0.0, hi=1.0,
                          doc="Spread of shade between individual precast "
                              "panels. 0 makes the wall one flat colour; 0.5 "
                              "gives the patchwork of a real panel block."),
        "panel_dark": color(default=None,
                            doc="Darkest panel shade. null uses a grey-green "
                                "concrete."),
        "panel_light": color(default=None, doc="Lightest panel shade."),
        "seed": integer(default=0),
        "panel_material": MATERIAL_REF,
        "trim_material": MATERIAL_REF,
        "glass_material": MATERIAL_REF,
        "lit_material": MATERIAL_REF,
        "parapet_material": MATERIAL_REF,
    },
    "import": {
        "path": text(doc="A .glb, .gltf, .obj, .ply or .stl file to load."),
        "keep_materials": flag(default=True),
    },
}

OBJECT = tagged("type", _OBJECT_VARIANTS, shared=_OBJECT_SHARED,
                doc="Something to put in the scene.")

# `scatter.generator` holds a nested object. The spec is recursive, so the
# placeholder above is replaced once OBJECT exists.
_OBJECT_VARIANTS["scatter"]["generator"] = OBJECT

# --------------------------------------------------------------------------
# the whole file
# --------------------------------------------------------------------------

SCENE = {
    "name": text(default="scene", doc="Used for output filenames."),
    "description": text(default=None, doc="Free text. Ignored by the renderer."),
    "render": RENDER,
    "camera": CAMERA,
    "world": WORLD,
    "materials": mapping(MATERIAL, default={},
                         doc="Reusable named materials, referenced by name "
                             "from any object's `material` field."),
    "lights": array(LIGHT, default=[]),
    "objects": array(OBJECT, default=[]),
}
