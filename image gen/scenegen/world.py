"""Environment lighting: sky models, HDRIs and atmospheric fog."""

from __future__ import annotations

import math
import os

import bpy
from mathutils import Vector


# Blender's Nishita sky is physically scaled: its sun disc alone delivers
# 100-150 W/m^2 to a surface facing it, and the sky dome another 3-8. Rendered
# at those magnitudes every daylight scene sits five stops over a sensible
# exposure and AgX desaturates it into pale mush. Dividing the whole
# environment by this constant makes `strength: 1.0` mean "correctly exposed
# daylight" while leaving the sun-to-sky ratio -- which is what actually
# decides whether an image reads as real -- completely untouched.
DAYLIGHT_SCALE = 1.0 / 32.0

# Fitted to measured Nishita sun-disc irradiance across elevations: an
# extraterrestrial value attenuated by Beer-Lambert extinction through an air
# mass of 1/sin(elevation). Reproduces the measurements to within a few
# percent from 8 degrees up, which is the range that matters.
SOLAR_CONSTANT = 164.0
ATMOSPHERIC_DEPTH = 0.079


def matched_sun_energy(elevation_deg: float) -> float:
    """Irradiance of a Sun lamp equivalent to the sky texture's own sun."""
    elevation = math.radians(max(elevation_deg, 1.0))
    air_mass = 1.0 / math.sin(elevation)
    direct = SOLAR_CONSTANT * math.exp(-ATMOSPHERIC_DEPTH * air_mass)
    # A Sun lamp's `energy` is irradiance measured perpendicular to the beam,
    # whereas the figure above is what lands on level ground, so divide the
    # cosine back out.
    return direct / math.sin(elevation)


def _clear(nt):
    for node in list(nt.nodes):
        nt.nodes.remove(node)
    return nt.nodes.new("ShaderNodeOutputWorld")


def _background(nt, strength):
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    return bg


def build_world(spec: dict, warn) -> None:
    """Replace the scene world with the one described by `spec`."""
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    output = _clear(nt)

    sky = spec.get("sky") or {"type": "physical"}
    kind = sky.get("type", "physical")

    if kind == "physical":
        bg = _build_physical(nt, sky)
    elif kind == "gradient":
        bg = _build_gradient(nt, sky)
    elif kind == "color":
        bg = _background(nt, sky.get("strength", 1.0))
        bg.inputs["Color"].default_value = (*sky.get("color", (0.25, 0.27, 0.28)), 1.0)
    elif kind == "hdri":
        bg = _build_hdri(nt, sky, warn)
    else:
        bg = _background(nt, 1.0)

    nt.links.new(bg.outputs["Background"], output.inputs["Surface"])


def _build_physical(nt, sky):
    """Nishita physical sky -- real Rayleigh and Mie scattering.

    The sun disc is disabled whenever a matched Sun lamp is created, because
    otherwise the scene is lit twice. A Sun lamp is also sampled directly,
    which is why it gives clean shadows where the sky texture's own disc gives
    a noisy mess at low sample counts.
    """
    tex = nt.nodes.new("ShaderNodeTexSky")
    tex.sky_type = "NISHITA"
    tex.sun_elevation = math.radians(sky.get("sun_elevation_deg", 25.0))
    tex.sun_rotation = math.radians(sky.get("sun_rotation_deg", 135.0))
    tex.sun_intensity = sky.get("sun_intensity", 1.0)
    tex.sun_size = math.radians(sky.get("sun_disc_deg", 0.545))
    tex.air_density = sky.get("air_density", 1.0)
    tex.dust_density = sky.get("dust_density", 1.0)
    tex.ozone_density = sky.get("ozone_density", 1.0)
    tex.altitude = sky.get("altitude_m", 0.0)
    tex.sun_disc = not sky.get("sun_lamp", True)

    bg = _background(nt, sky.get("strength", 1.0) * DAYLIGHT_SCALE)
    nt.links.new(tex.outputs["Color"], bg.inputs["Color"])
    return bg


def _build_gradient(nt, sky):
    """A two-colour vertical gradient, driven by the view direction's Z."""
    coord = nt.nodes.new("ShaderNodeTexCoord")
    separate = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Generated"], separate.inputs["Vector"])

    remap = nt.nodes.new("ShaderNodeMapRange")
    remap.inputs["From Min"].default_value = -0.35
    remap.inputs["From Max"].default_value = 0.55
    remap.clamp = True
    nt.links.new(separate.outputs["Z"], remap.inputs["Value"])

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*sky.get("bottom", (0.6, 0.5, 0.4)), 1.0)
    ramp.color_ramp.elements[1].color = (*sky.get("top", (0.1, 0.2, 0.5)), 1.0)
    nt.links.new(remap.outputs["Result"], ramp.inputs["Fac"])

    bg = _background(nt, sky.get("strength", 1.0))
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    return bg


def _build_hdri(nt, sky, warn):
    path = sky.get("path") or ""
    bg = _background(nt, sky.get("strength", 1.0))

    if not path or not os.path.isfile(path):
        warn(f"HDRI not found at {path!r}; falling back to a flat grey sky.")
        bg.inputs["Color"].default_value = (0.18, 0.19, 0.21, 1.0)
        return bg

    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(path)

    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Rotation"].default_value = (
        0.0, 0.0, math.radians(sky.get("rotation_deg", 0.0)))
    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    return bg


def build_fog_volume(fog: dict, warn):
    """Atmospheric scattering inside a box that encloses the scene.

    Fog must be bounded. Cycles' world volume fills all of space, so light
    from a sun lamp -- which is infinitely distant -- is attenuated over an
    infinite path and never arrives: the render comes out pure black at any
    density above zero. A box sized to the scene gives a finite optical depth
    and behaves the way an atmosphere should.
    """
    if not fog.get("enabled") or fog.get("density", 0.0) <= 0.0:
        return None

    bounds = _scene_bounds()
    if bounds is None:
        warn("fog is enabled but the scene is empty; skipping it.")
        return None

    centre, extent = bounds
    density = fog.get("density", 0.005)

    # Optical depth across the box. Past about 6 the far side is invisible,
    # which is legitimate for thick fog but usually a mistake.
    depth = density * max(extent)
    if depth > 8.0:
        warn(f"world.fog.density {density:g} over a {max(extent):.0f} m scene "
             f"gives an optical depth of {depth:.0f}; nothing distant will be "
             f"visible. Try {2.0 / max(extent):.4f} or lower.")

    mesh = bpy.data.meshes.new("FogVolume")
    half = [e * 0.5 for e in extent]
    corners = [(sx * half[0], sy * half[1], sz * half[2])
               for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    mesh.from_pydata(corners, [], [
        (0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
        (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)])
    mesh.update()

    obj = bpy.data.objects.new("FogVolume", mesh)
    obj.location = centre
    bpy.context.collection.objects.link(obj)

    mat = bpy.data.materials.new("Fog")
    mat.use_nodes = True
    nt = mat.node_tree
    output = nt.nodes["Material Output"]
    # A volume-only material: the surface shader is removed entirely so the
    # box itself is invisible and only its interior scatters.
    nt.nodes.remove(nt.nodes["Principled BSDF"])

    scatter = nt.nodes.new("ShaderNodeVolumeScatter")
    scatter.inputs["Color"].default_value = (*fog.get("color", (0.5, 0.55, 0.6)), 1.0)
    scatter.inputs["Density"].default_value = density
    scatter.inputs["Anisotropy"].default_value = fog.get("anisotropy", 0.0)
    nt.links.new(scatter.outputs["Volume"], output.inputs["Volume"])

    mesh.materials.append(mat)
    return obj


def _scene_bounds():
    """A generous box around every renderable object and the camera."""
    points = []
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and not obj.hide_render:
            points += [obj.matrix_world @ Vector(c) for c in obj.bound_box]
        elif obj.type == "CAMERA":
            points.append(obj.matrix_world.translation)

    if not points:
        return None

    lo = Vector((min(p.x for p in points), min(p.y for p in points),
                 min(p.z for p in points)))
    hi = Vector((max(p.x for p in points), max(p.y for p in points),
                 max(p.z for p in points)))

    centre = (lo + hi) * 0.5
    # Pad generously so the fog does not visibly stop at the horizon, and give
    # it real height so the sky is seen through atmosphere rather than through
    # a thin slab.
    extent = [max((hi[i] - lo[i]) * 1.6, 20.0) for i in range(3)]
    extent[2] = max(extent[2], 60.0)
    centre.z += extent[2] * 0.15
    return centre, extent


def sun_lamp_from_sky(sky: dict):
    """Create the Sun lamp that matches a physical sky's sun, if asked for."""
    if sky.get("type") != "physical" or not sky.get("sun_lamp", True):
        return None

    elevation_deg = sky.get("sun_elevation_deg", 25.0)
    elevation = math.radians(elevation_deg)
    rotation = math.radians(sky.get("sun_rotation_deg", 135.0))

    data = bpy.data.lights.new("SkySun", type="SUN")
    data.energy = (matched_sun_energy(elevation_deg)
                   * sky.get("sun_intensity", 1.0)
                   * sky.get("sun_lamp_strength", 1.0)
                   * sky.get("strength", 1.0)
                   * DAYLIGHT_SCALE)
    data.angle = math.radians(sky.get("sun_disc_deg", 0.545))

    obj = bpy.data.objects.new("SkySun", data)
    bpy.context.collection.objects.link(obj)
    # A Sun lamp with no rotation points straight down (-Z). Tilting by
    # (90 - elevation) about X lays it on the horizon, then Z spins it to the
    # right compass bearing -- matching how the sky texture places its sun.
    obj.rotation_euler = (math.pi / 2.0 - elevation, 0.0, rotation)
    return obj
