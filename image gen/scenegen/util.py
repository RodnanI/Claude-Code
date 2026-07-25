"""Small shared helpers: aiming, transforms, and deterministic randomness."""

from __future__ import annotations

import math
import random

import bpy
from mathutils import Matrix, Vector


def aim(obj, target, roll_deg: float = 0.0) -> None:
    """Rotate `obj` so its local -Z axis points at `target`.

    Cameras, sun lamps, spots and area lights all emit down -Z in Blender, so
    one function covers every case.
    """
    direction = Vector(target) - obj.location
    if direction.length < 1e-6:
        direction = Vector((0.0, 0.0, -1.0))
    basis = direction.to_track_quat("-Z", "Y").to_matrix().to_4x4()
    if roll_deg:
        basis = basis @ Matrix.Rotation(math.radians(roll_deg), 4, "Z")
    obj.rotation_euler = basis.to_euler()


def apply_transform(obj, spec: dict) -> None:
    """Apply the location/rotation/scale fields shared by every object."""
    obj.location = Vector(spec.get("location", (0.0, 0.0, 0.0)))
    obj.rotation_euler = tuple(
        math.radians(a) for a in spec.get("rotation_deg", (0.0, 0.0, 0.0)))

    scale = spec.get("scale", (1.0, 1.0, 1.0))
    if isinstance(scale, (int, float)):
        scale = (float(scale),) * 3
    obj.scale = Vector(scale)


def rng_for(*parts) -> random.Random:
    """A Random seeded reproducibly from arbitrary parts.

    Every generator draws from one of these, so the same scene file always
    produces the same geometry -- essential when an agent is iterating on a
    scene and needs the only change to be the one it made.
    """
    return random.Random(hash(parts) & 0xFFFF_FFFF)


def link(obj) -> None:
    bpy.context.collection.objects.link(obj)


def new_mesh_object(name: str, mesh) -> object:
    obj = bpy.data.objects.new(name, mesh)
    link(obj)
    return obj


def set_material(obj, material) -> None:
    if material is None:
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)


def shade_smooth(obj, smooth: bool) -> None:
    if not hasattr(obj.data, "polygons"):
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = smooth


def fbm(rand_offsets, x: float, y: float, octaves: int, lacunarity: float,
        gain: float) -> float:
    """Fractal Brownian motion over value noise, in the range -1..1 roughly.

    Written out rather than pulled from a library because the generators need
    exact reproducibility from an integer seed, and because it keeps the
    terrain code free of any dependency beyond the standard library.
    """
    total = 0.0
    amplitude = 1.0
    frequency = 1.0
    normaliser = 0.0
    for octave in range(octaves):
        ox, oy = rand_offsets[octave % len(rand_offsets)]
        total += amplitude * _value_noise(x * frequency + ox, y * frequency + oy)
        normaliser += amplitude
        amplitude *= gain
        frequency *= lacunarity
    return total / max(normaliser, 1e-6)


def _hash2(ix: int, iy: int) -> float:
    """Deterministic scalar hash in -1..1."""
    h = (ix * 374_761_393 + iy * 668_265_263) & 0xFFFF_FFFF
    h = (h ^ (h >> 13)) * 1_274_126_177 & 0xFFFF_FFFF
    h = h ^ (h >> 16)
    return (h / 0x7FFF_FFFF) - 1.0


def _smoothstep(t: float) -> float:
    return t * t * (3.0 - 2.0 * t)


def _value_noise(x: float, y: float) -> float:
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    ux, uy = _smoothstep(fx), _smoothstep(fy)

    n00 = _hash2(ix, iy)
    n10 = _hash2(ix + 1, iy)
    n01 = _hash2(ix, iy + 1)
    n11 = _hash2(ix + 1, iy + 1)

    top = n00 + (n10 - n00) * ux
    bottom = n01 + (n11 - n01) * ux
    return top + (bottom - top) * uy


def offsets_for(seed: int, count: int = 8):
    """Per-octave offsets so different seeds give genuinely different fields."""
    rand = random.Random(seed)
    return [(rand.uniform(-1000.0, 1000.0), rand.uniform(-1000.0, 1000.0))
            for _ in range(count)]
