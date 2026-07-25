"""Heightfield terrain.

Each style is a different way of shaping the same fractal noise field. The
useful trick throughout is that the styles differ in *how noise is folded*,
not in how much of it there is: ridged terrain is |noise| inverted, dunes are
noise phase-modulating a sine, cliffs are noise quantised into terraces. That
keeps one cheap noise implementation serving eight quite distinct looks.
"""

from __future__ import annotations

import math

import bpy

from ..util import apply_transform, fbm, new_mesh_object, offsets_for, shade_smooth

# style -> (octaves, roughness/gain, domain warp, base frequency)
STYLE_DEFAULTS = {
    "plains":    (3, 0.45, 0.15, 2.5),
    "hills":     (4, 0.50, 0.30, 3.0),
    "mountains": (6, 0.55, 0.45, 2.2),
    "dunes":     (3, 0.45, 0.25, 2.0),
    "cliffs":    (5, 0.55, 0.35, 2.4),
    "island":    (5, 0.50, 0.40, 2.6),
    "canyon":    (5, 0.52, 0.30, 2.0),
    "atoll":     (4, 0.48, 0.35, 3.2),
}


def _ridged(offsets, x, y, octaves, gain):
    """Inverted absolute noise -- sharp crests, smooth valleys."""
    value = fbm(offsets, x, y, octaves, 2.0, gain)
    return 1.0 - abs(value) * 2.0


def _smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / max(edge1 - edge0, 1e-9)))
    return t * t * (3.0 - 2.0 * t)


def _height(style, offsets, warp_offsets, nx, ny, octaves, gain, warp, freq):
    """Return a height in roughly -1..1 for normalised coords in -0.5..0.5."""
    x, y = nx * freq, ny * freq

    if warp > 0.0:
        # Domain warping: displace the sample point by another noise field.
        # This is what turns obviously-fractal blobs into ridges that bend and
        # branch the way eroded ground does.
        x += warp * fbm(warp_offsets, x, y, 3, 2.0, 0.5)
        y += warp * fbm(warp_offsets, x + 5.2, y + 1.3, 3, 2.0, 0.5)

    radius = math.hypot(nx, ny) * 2.0  # 0 at centre, 1 at the edge midpoint

    if style == "mountains":
        h = _ridged(offsets, x, y, octaves, gain)
        return math.copysign(abs(h) ** 1.35, h)

    if style == "dunes":
        # Noise modulates the phase of a travelling wave, giving the long
        # parallel crests and sharp lee slopes of a dune field.
        ripple = math.sin(x * 1.8 + fbm(offsets, x * 0.5, y * 0.5, 3, 2.0, gain) * 3.2)
        return 0.65 * math.copysign(abs(ripple) ** 0.7, ripple) + \
            0.35 * fbm(offsets, x, y, octaves, 2.0, gain)

    if style == "cliffs":
        h = fbm(offsets, x, y, octaves, 2.0, gain)
        steps = 6.0
        terraced = math.floor(h * steps) / steps
        # Blend terraces with the raw field so the risers are not razor sharp.
        return terraced * 0.75 + h * 0.25

    if style == "island":
        h = fbm(offsets, x, y, octaves, 2.0, gain) * 0.5 + 0.5
        falloff = 1.0 - _smoothstep(0.35, 0.95, radius)
        return (h * falloff) * 2.0 - 0.65

    if style == "atoll":
        h = fbm(offsets, x, y, octaves, 2.0, gain)
        ring = math.exp(-((radius - 0.55) ** 2) / 0.012)
        return ring * 1.4 + h * 0.35 - 0.55

    if style == "canyon":
        plateau = fbm(offsets, x, y, octaves, 2.0, gain) * 0.35 + 0.5
        # A meandering incision: distance from a noise-perturbed centre line.
        meander = fbm(warp_offsets, y * 0.6, 0.0, 3, 2.0, 0.5) * 0.35
        incision = abs(nx - meander)
        cut = 1.0 - _smoothstep(0.02, 0.16, incision)
        return plateau - cut * 1.5

    if style == "plains":
        return fbm(offsets, x, y, octaves, 2.0, gain) * 0.6

    return fbm(offsets, x, y, octaves, 2.0, gain)


def build_terrain(spec: dict, warn):
    """Build a terrain mesh. Returns the object."""
    style = spec.get("style", "hills")
    d_octaves, d_gain, d_warp, freq = STYLE_DEFAULTS.get(
        style, STYLE_DEFAULTS["hills"])

    octaves = spec.get("octaves") or d_octaves
    gain = spec.get("roughness")
    gain = d_gain if gain is None else 0.3 + gain * 0.4
    warp = spec.get("warp")
    warp = d_warp if warp is None else warp

    size = spec.get("size", 100.0)
    size_x, size_y = (size, size) if isinstance(size, (int, float)) else size

    resolution = spec.get("resolution", 192)
    height = spec.get("height", 12.0)
    seed = spec.get("seed", 0)
    sea_level = spec.get("sea_level")

    offsets = offsets_for(seed, 12)
    warp_offsets = offsets_for(seed + 7919, 12)

    if resolution > 512:
        warn(f"terrain resolution {resolution} means "
             f"{(resolution + 1) ** 2:,} vertices; this will be slow to build.")

    vertices = []
    step = 1.0 / resolution
    for j in range(resolution + 1):
        ny = j * step - 0.5
        for i in range(resolution + 1):
            nx = i * step - 0.5
            z = _height(style, offsets, warp_offsets, nx, ny,
                        octaves, gain, warp, freq) * height
            if sea_level is not None and z < sea_level:
                z = sea_level
            vertices.append((nx * size_x, ny * size_y, z))

    faces = []
    row = resolution + 1
    for j in range(resolution):
        for i in range(resolution):
            a = j * row + i
            faces.append((a, a + 1, a + row + 1, a + row))

    mesh = bpy.data.meshes.new("Terrain")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.validate()

    obj = new_mesh_object(spec.get("id") or f"Terrain_{style}", mesh)
    apply_transform(obj, spec)
    shade_smooth(obj, True if spec.get("shade_smooth") is None
                 else spec["shade_smooth"])
    return obj
