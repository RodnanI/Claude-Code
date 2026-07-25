"""Ocean and water surfaces.

Blender's Ocean modifier is a real spectral wave solver: it builds a
directional wave-energy spectrum, inverse-FFTs it into a heightfield, and
offsets points horizontally by the Jacobian to sharpen crests. That gives
genuinely correct-looking water -- the wave shapes are the ones the chosen
spectrum predicts for the given wind, depth and fetch, not a sum of sine
waves.

The scene file exposes one dial, `wave_strength`, from glassy to storm. It
drives wind speed, amplitude, choppiness and foam together, because in real
water those are not independent: you do not get a two-metre swell in a dead
calm. Every derived value can still be overridden individually.
"""

from __future__ import annotations

import math

import bpy

from .materials import PRESETS
from .util import apply_transform, new_mesh_object

_SPECTRA = {
    "phillips": "PHILLIPS",
    "pierson_moskowitz": "PIERSON_MOSKOWITZ",
    "jonswap": "JONSWAP",
    "tma": "TEXEL_MARSEN_ARSLOE",
}

FOAM_LAYER = "foam"

# Beyond this, one FFT domain is tiled rather than enlarged: a 2 km ocean at a
# single domain size would need an absurd resolution to keep wavelengths
# believable, whereas tiling keeps detail and costs nothing.
MAX_DOMAIN_M = 250.0


# Peak-to-trough height, in metres, that `wave_strength` 1.0 aims for on open
# water. Roughly a severe storm sea; anchored to the Beaufort scale so that
# 0.2 is a light breeze, 0.5 a moderate sea with whitecaps forming, and 0.8 a
# gale.
STORM_HEIGHT_M = 9.0

# Waves cannot be arbitrarily tall relative to the water they sit on: a swell
# steeper than roughly this ratio of the domain breaks. It is what keeps a
# swimming pool from being handed nine-metre rollers.
MAX_STEEPNESS = 0.045


def derive_sea_state(spec: dict, domain: float) -> dict:
    """Turn `wave_strength` into physical wave parameters."""
    strength = spec.get("wave_strength", 0.4)

    wind = spec.get("wind_speed")
    if wind is None:
        wind = 1.5 + 28.0 * (strength ** 1.5)

    # Amplitude is expressed as a target height in metres and hit exactly by
    # calibration below. Blender's `wave_scale` is a bare multiplier whose
    # effect depends on the spectrum, so deriving it directly from
    # `wave_strength` would make the same setting mean different things in
    # different scenes.
    height = spec.get("wave_height_m")
    if height is None:
        height = min(STORM_HEIGHT_M * (strength ** 2.2), domain * MAX_STEEPNESS)

    choppiness = spec.get("choppiness")
    if choppiness is None:
        # Above ~1.8 the horizontal displacement folds the surface through
        # itself, so the ceiling stays below that.
        choppiness = 0.25 + 1.45 * strength

    foam = spec.get("foam")
    if foam is None:
        foam = strength >= 0.35  # whitecaps start around force 4

    foam_amount = spec.get("foam_amount")
    if foam_amount is None:
        foam_amount = max(0.0, (strength - 0.3)) * 1.1

    return {"wind": wind, "height": height, "choppiness": choppiness,
            "scale": spec.get("wave_scale"), "foam": bool(foam),
            "foam_amount": min(foam_amount, 1.0), "strength": strength}


def build_ocean(spec: dict, library, warn):
    """Create an ocean surface object from a validated `ocean` spec."""
    extent = spec.get("size", 200.0)
    state = derive_sea_state(spec, min(extent, MAX_DOMAIN_M))

    # Start from a unit plane; the modifier replaces its geometry entirely.
    mesh = bpy.data.meshes.new("Ocean")
    mesh.from_pydata([(-0.5, -0.5, 0.0), (0.5, -0.5, 0.0),
                      (0.5, 0.5, 0.0), (-0.5, 0.5, 0.0)], [], [(0, 1, 2, 3)])
    mesh.update()
    obj = new_mesh_object(spec.get("id") or "Ocean", mesh)
    apply_transform(obj, spec)

    domain = min(extent, MAX_DOMAIN_M)
    repeat = max(1, int(round(extent / domain)))
    if repeat > 1:
        warn(f"ocean is {extent:g} m across, so one {domain:g} m wave domain "
             f"is tiled {repeat}x{repeat}. The pattern repeats; keep the "
             f"horizon distant or lower `size` if that shows.")

    mod = obj.modifiers.new("Ocean", "OCEAN")
    mod.geometry_mode = "GENERATE"
    # spatial_size is an integer number of metres in Blender's RNA.
    mod.spatial_size = max(1, int(round(domain)))
    mod.repeat_x = repeat
    mod.repeat_y = repeat
    mod.size = 1.0

    # The generated grid is resolution^2 cells per side, so face count grows
    # as resolution^4. `resolution` is used at render time and
    # `viewport_resolution` by the dependency graph; scatter and the foam
    # calibration below read the latter, so both must match.
    resolution = spec.get("resolution", 16)
    mod.resolution = resolution
    mod.viewport_resolution = resolution

    mod.wind_velocity = state["wind"]
    mod.wave_scale = 1.0
    mod.choppiness = state["choppiness"]
    mod.wave_scale_min = spec.get("smallest_wave_m", 0.01)
    mod.wave_direction = math.radians(spec.get("direction_deg", 0.0))
    mod.wave_alignment = max(0.0, min(spec.get("alignment", 0.0), 1.0))
    mod.depth = spec.get("depth_m", 200.0)
    mod.time = spec.get("time", 8.0)
    mod.random_seed = spec.get("seed", 0)
    mod.use_normals = True

    spectrum = _SPECTRA.get(spec.get("spectrum", "jonswap"), "JONSWAP")
    mod.spectrum = spectrum
    if spectrum in ("JONSWAP", "TEXEL_MARSEN_ARSLOE"):
        mod.fetch_jonswap = spec.get("fetch_km", 120.0)  # Blender wants km
        # Blender's peak-sharpening term returns NaN for the whole heightfield
        # at values above roughly 0.1, so it is pinned off. The spectrum still
        # responds to wind and fetch, which is where the useful control is.
        mod.sharpen_peak_jonswap = 0.0

    _calibrate_height(obj, mod, state, warn)
    _limit_choppiness(mod, spec, warn)

    foam_range = None
    if state["foam"]:
        mod.use_foam = True
        mod.foam_coverage = _foam_coverage(state["foam_amount"])
        mod.foam_layer_name = FOAM_LAYER
        foam_range = _calibrate_foam(obj, mod, state["foam_amount"], warn)

    obj.data.materials.append(
        build_water_material(spec, library, state, foam_range, warn))
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def _foam_coverage(amount: float) -> float:
    """Map 0-1 onto the modifier's foam control.

    Blender's `foam_coverage` acts as an offset added to the surface's folding
    term, not as a threshold: below about 0.22 the result clamps to zero
    everywhere, and above it the whole surface lifts together while the
    wave-driven variation rides on top. A high value therefore gives the most
    usable signal, and the shader ramp below is what actually decides where
    foam appears.
    """
    return 0.50 + 0.25 * max(0.0, min(amount, 1.0))


def _evaluate_single_tile(obj, mod):
    """Yield the evaluated mesh of one wave tile.

    Calibration only ever needs one tile -- every tile is identical -- and
    evaluating the full repeated grid can mean a million faces for nothing.
    """
    repeat_x, repeat_y = mod.repeat_x, mod.repeat_y
    mod.repeat_x = mod.repeat_y = 1
    try:
        bpy.context.view_layer.update()
        depsgraph = bpy.context.evaluated_depsgraph_get()
        evaluated = obj.evaluated_get(depsgraph)
        return evaluated, evaluated.to_mesh()
    finally:
        mod.repeat_x, mod.repeat_y = repeat_x, repeat_y


def _calibrate_height(obj, mod, state, warn) -> None:
    """Solve for the `wave_scale` that gives the requested wave height.

    Blender's wave_scale is a bare multiplier on the spectrum, and the height
    it produces depends on wind, spectrum, depth and seed in ways that are not
    worth modelling. Since the response is exactly linear in wave_scale,
    measuring the surface once at scale 1.0 and dividing gives the requested
    height precisely, for any combination of the other settings.
    """
    if state["scale"] is not None:
        mod.wave_scale = state["scale"]  # author asked for a raw multiplier
        return

    target = state["height"]
    if target <= 1e-4:
        mod.wave_scale = 0.0
        return

    try:
        evaluated, mesh = _evaluate_single_tile(obj, mod)
        heights = [vertex.co.z for vertex in mesh.vertices]
        evaluated.to_mesh_clear()
    except Exception as error:
        warn(f"could not calibrate wave height ({error}); using the raw "
             f"wave scale.")
        mod.wave_scale = 1.0
        return

    if not heights or any(h != h for h in heights):  # NaN check
        warn("the wave solver produced an invalid surface; falling back to a "
             "flat wave scale. Try a different `spectrum` or `seed`.")
        mod.wave_scale = 1.0
        return

    measured = max(heights) - min(heights)
    if measured < 1e-6:
        mod.wave_scale = 1.0
        return

    mod.wave_scale = target / measured


# Choppiness displaces the surface horizontally in proportion to the wave
# amplitude, so tall waves and high choppiness together fold the mesh through
# itself into glassy shards. Measured against renders, the product of
# wave_scale and choppiness starts to visibly break down past about this.
MAX_FOLD = 2.0


def _limit_choppiness(mod, spec, warn) -> None:
    """Keep crest sharpening below the point where the surface self-intersects."""
    ceiling = MAX_FOLD / max(1.0, mod.wave_scale)
    if mod.choppiness <= ceiling:
        return

    if spec.get("choppiness") is not None:
        warn(f"choppiness {mod.choppiness:g} at this wave height folds the "
             f"surface through itself; clamping to {ceiling:.2f}. Lower "
             f"`wave_height_m` or `wave_strength` to allow sharper crests.")
    mod.choppiness = ceiling


def _calibrate_foam(obj, mod, amount: float, warn):
    """Measure the foam attribute and pick ramp stops that suit it.

    The absolute foam values depend on wind, choppiness, resolution and
    coverage all at once, and the spread around the mean is small. Rather than
    hardcode thresholds that only work for one sea state, evaluate the surface
    once and place the ramp at measured percentiles, so `foam_amount` means
    "this fraction of the surface shows whitecaps" for any settings.
    """
    values = []
    try:
        evaluated, mesh = _evaluate_single_tile(obj, mod)
        attribute = mesh.color_attributes.get(FOAM_LAYER)
        if attribute is not None:
            values = [datum.color[0] for datum in attribute.data]
        evaluated.to_mesh_clear()
    except Exception as error:
        warn(f"could not calibrate ocean foam ({error}); using default "
             f"thresholds.")

    if len(values) < 16:
        return (0.30, 0.42)

    values.sort()

    def quantile(q):
        return values[max(0, min(len(values) - 1, int(len(values) * q)))]

    # `amount` sets how much of the surface goes white. The numbers are small
    # deliberately: foam is opaque white against near-black water, so even a
    # partial mix reads as solid whitecap, and anything above ~15% coverage
    # turns the sea into a snowfield.
    covered = 0.01 + 0.14 * max(0.0, min(amount, 1.0))
    low = quantile(1.0 - covered)
    high = quantile(1.0 - covered * 0.15)
    if high - low < 1e-4:
        high = low + 1e-3
    return (low, high)


def build_water_material(spec: dict, library, state: dict, foam_range, warn):
    """Water shader: refractive surface, absorbing volume, optional foam.

    Three things have to be right for water to read as water:
      * IOR 1.333, so the surface bends light by the correct amount;
      * a Volume Absorption term, so depth tints the colour instead of the
        surface being uniformly green;
      * foam driven by the modifier's own Jacobian output, so whitecaps land
        exactly where the solver says the surface is folding.
    """
    override = spec.get("material")
    if override not in (None, {}, ""):
        # The author supplied a material; honour it and skip the built-in one.
        return library.resolve(override, name="water")

    preset = PRESETS["water"]
    mat = bpy.data.materials.new("Water")
    mat.use_nodes = True
    nt = mat.node_tree
    output = nt.nodes["Material Output"]
    water = nt.nodes["Principled BSDF"]

    water.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    water.inputs["Roughness"].default_value = 0.0
    water.inputs["Transmission Weight"].default_value = 1.0
    water.inputs["IOR"].default_value = preset["ior"]

    clarity = spec.get("clarity_m") or preset["_volume"]["distance"]
    absorb = nt.nodes.new("ShaderNodeVolumeAbsorption")
    absorb.inputs["Color"].default_value = (*preset["_volume"]["color"], 1.0)
    absorb.inputs["Density"].default_value = 1.0 / max(clarity, 1e-4)
    nt.links.new(absorb.outputs["Volume"], output.inputs["Volume"])

    if not state["foam"] or foam_range is None:
        return mat

    foam = nt.nodes.new("ShaderNodeBsdfPrincipled")
    foam.inputs["Base Color"].default_value = (0.85, 0.88, 0.90, 1.0)
    foam.inputs["Roughness"].default_value = 0.85
    foam.location = (-100, -400)

    attribute = nt.nodes.new("ShaderNodeVertexColor")
    attribute.layer_name = FOAM_LAYER
    attribute.location = (-700, -150)

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = foam_range[0]
    ramp.color_ramp.elements[1].position = foam_range[1]
    ramp.location = (-500, -150)
    nt.links.new(attribute.outputs["Color"], ramp.inputs["Fac"])

    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.location = (250, 0)
    nt.links.new(ramp.outputs["Color"], mix.inputs[0])
    nt.links.new(water.outputs["BSDF"], mix.inputs[1])
    nt.links.new(foam.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], output.inputs["Surface"])
    output.location = (500, 0)
    return mat
