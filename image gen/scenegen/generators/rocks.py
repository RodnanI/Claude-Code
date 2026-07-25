"""Procedural rocks.

A sphere is displaced by 3D fractal noise, then shaped per style. The
`erosion` control interpolates between two different noise regimes rather than
just scaling one: fresh rock is dominated by high-frequency, high-amplitude
detail that reads as fracture faces, while weathered rock keeps only the low
frequencies, giving the rounded forms of something that has spent a long time
under water or wind.
"""

from __future__ import annotations

from mathutils import Vector, noise

from ..util import apply_transform, new_mesh_object, rng_for
from .meshkit import MeshBuilder

# style -> (z scale, xy scale, base frequency, amplitude, flat shaded)
STYLE = {
    "boulder": (0.82, 1.0, 1.6, 0.30, False),
    "angular": (0.90, 1.0, 1.1, 0.42, True),
    "slab":    (0.28, 1.15, 1.3, 0.22, False),
    "pebble":  (0.62, 1.0, 2.4, 0.18, False),
    "spire":   (2.60, 0.62, 1.4, 0.26, False),
}

# detail level -> (segments, rings)
RESOLUTION = {0: (8, 5), 1: (12, 7), 2: (16, 9), 3: (24, 13), 4: (32, 17),
              5: (48, 25), 6: (64, 33)}


def build_rock(spec: dict, library, warn):
    style = spec.get("style", "boulder")
    size = spec.get("size", 1.0)
    seed = spec.get("seed", 0)
    erosion = spec.get("erosion", 0.5)
    z_scale, xy_scale, base_freq, amplitude, flat = STYLE.get(
        style, STYLE["boulder"])

    segments, rings = RESOLUTION.get(
        max(0, min(spec.get("detail", 3), 6)), RESOLUTION[3])

    rand = rng_for("rock", style, seed, size)
    origin = Vector((rand.uniform(-100, 100), rand.uniform(-100, 100),
                     rand.uniform(-100, 100)))

    # Weathering: drop the frequency and the amplitude together.
    frequency = base_freq * (2.6 - 1.9 * erosion)
    strength = amplitude * (1.35 - 0.75 * erosion)
    octaves = 4 if erosion < 0.6 else 2

    def deform(unit: Vector) -> float:
        point = origin + unit * frequency
        value = noise.fractal(point, 1.0, 2.0, octaves)
        if style == "angular":
            # Quantising the field into bands turns smooth bulges into flat
            # facets meeting at ridges -- the look of fractured stone.
            value = round(value * 3.5) / 3.5
        return 1.0 + value * strength

    builder = MeshBuilder()
    builder.sphere((0.0, 0.0, 0.0), size * 0.5, segments, rings, 0,
                   scale=(xy_scale, xy_scale, z_scale),
                   smooth=not flat, deform=deform)

    mesh = builder.to_mesh(f"Rock_{style}")
    obj = new_mesh_object(spec.get("id") or f"Rock_{style}", mesh)
    apply_transform(obj, spec)

    smooth = spec.get("shade_smooth")
    if smooth is not None:
        for polygon in mesh.polygons:
            polygon.use_smooth = smooth

    fallback = {"preset": "rock",
                "bump": {"type": "noise", "scale": 25.0 / max(size, 0.05),
                         "strength": 0.25 + 0.3 * (1.0 - erosion)}}
    mesh.materials.append(library.resolve(spec.get("material"), fallback, "rock"))
    return obj
