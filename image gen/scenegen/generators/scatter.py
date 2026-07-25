"""Distributing generated objects across a surface.

The generator object is built exactly once and every instance reuses its mesh
datablock, so a thousand trees cost one tree's worth of vertex memory. Height
and slope come from ray-casting the target surface rather than from
re-evaluating the terrain function, which means scatter works on any object --
including an ocean, whose geometry only exists after its modifier runs.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Quaternion, Vector

from ..util import rng_for


def build_scatter(spec: dict, target, build_one, warn):
    """Scatter instances over `target` (an object, or None for flat ground).

    `build_one` compiles the nested generator spec into a single object; it is
    called once and the result becomes the shared template.
    """
    generator_spec = spec.get("generator")
    if not isinstance(generator_spec, dict) or "type" not in generator_spec:
        warn("scatter.generator must be an object definition with a `type`; "
             "skipping this scatter.")
        return []

    count = spec.get("count", 50)
    if count <= 0:
        return []

    template = build_one(generator_spec)
    if template is None:
        return []

    origin = Vector(spec.get("location", (0.0, 0.0, 0.0)))
    extent = _extent(spec, target, origin, warn)
    rand = rng_for("scatter", spec.get("seed", 0), count, id(generator_spec))

    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = target.evaluated_get(depsgraph) if target is not None else None
    ray_height, ray_depth = _ray_bounds(target)

    max_slope = math.radians(spec.get("max_slope_deg", 90.0))
    altitude = spec.get("altitude_range")
    spacing = spec.get("spacing", 0.0)
    scale_lo, scale_hi = spec.get("scale_range", (0.8, 1.25))
    align = spec.get("align_to_normal", 0.0)

    placed: list[Vector] = []
    instances = []
    # Rejection sampling; the budget stops a spacing constraint that cannot be
    # satisfied from spinning forever.
    attempts = 0
    budget = count * 40

    while len(instances) < count and attempts < budget:
        attempts += 1
        x = origin.x + rand.uniform(-extent[0] * 0.5, extent[0] * 0.5)
        y = origin.y + rand.uniform(-extent[1] * 0.5, extent[1] * 0.5)

        if evaluated is not None:
            hit = _drop(evaluated, x, y, ray_height, ray_depth)
            if hit is None:
                continue
            point, normal = hit
        else:
            point, normal = Vector((x, y, origin.z)), Vector((0.0, 0.0, 1.0))

        if normal.angle(Vector((0.0, 0.0, 1.0)), 0.0) > max_slope:
            continue
        if altitude is not None and not (altitude[0] <= point.z <= altitude[1]):
            continue
        if spacing > 0.0 and any(
                (point - other).length < spacing for other in placed):
            continue

        placed.append(point)
        instances.append(_instance(template, point, normal, align, rand,
                                   scale_lo, scale_hi, len(instances)))

    if len(instances) < count:
        warn(f"scatter placed {len(instances)} of {count} requested instances "
             f"(constraints rejected the rest).")

    # The template itself must not appear; its mesh lives on through the
    # instances, which hold their own references to the datablock.
    bpy.data.objects.remove(template, do_unlink=True)
    return instances


def _extent(spec, target, origin, warn):
    area = spec.get("area")
    if area is not None:
        return (area, area) if isinstance(area, (int, float)) else tuple(area)

    if target is None:
        warn("scatter has no `on` target and no `area`; covering 50 x 50 m.")
        return (50.0, 50.0)

    # Fall back to the target's world-space bounding box.
    corners = [target.matrix_world @ Vector(c) for c in target.bound_box]
    xs = [c.x for c in corners]
    ys = [c.y for c in corners]
    return (max(xs) - min(xs), max(ys) - min(ys))


def _ray_bounds(target):
    """A start height and cast distance that safely straddle the target."""
    if target is None:
        return 0.0, 0.0
    corners = [target.matrix_world @ Vector(c) for c in target.bound_box]
    zs = [c.z for c in corners]
    span = max(zs) - min(zs)
    return max(zs) + span + 10.0, span * 2.0 + 100.0


def _drop(evaluated, x, y, ray_height, ray_depth):
    """Cast straight down onto the surface. Returns (world point, world normal)."""
    to_local = evaluated.matrix_world.inverted()
    origin = to_local @ Vector((x, y, ray_height))
    direction = (to_local.to_3x3() @ Vector((0.0, 0.0, -1.0))).normalized()

    hit, location, normal, _ = evaluated.ray_cast(origin, direction, distance=ray_depth)
    if not hit:
        return None
    world_point = evaluated.matrix_world @ location
    world_normal = (evaluated.matrix_world.to_3x3() @ normal).normalized()
    return world_point, world_normal


def _instance(template, point, normal, align, rand, scale_lo, scale_hi, index):
    obj = bpy.data.objects.new(f"{template.name}_{index:04d}", template.data)
    bpy.context.collection.objects.link(obj)
    obj.location = point

    up = Vector((0.0, 0.0, 1.0))
    # Blending the surface normal toward vertical lets trees stay upright on a
    # slope (align 0) or lie against it like scree (align 1).
    blended = (up.lerp(normal, max(0.0, min(align, 1.0)))).normalized()
    # Spin about the instance's own axis first, then tilt it onto the surface,
    # so the random yaw is not skewed by the tilt.
    spin = Quaternion((0.0, 0.0, 1.0), rand.uniform(0.0, 2.0 * math.pi))
    obj.rotation_euler = (up.rotation_difference(blended) @ spin).to_euler()

    factor = rand.uniform(scale_lo, scale_hi)
    obj.scale = Vector(template.scale) * factor
    return obj
