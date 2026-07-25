"""Procedural trees.

Every style builds into one mesh with two material slots -- 0 for bark, 1 for
foliage -- so a scattered forest can share vertex data. Shapes are deliberately
built from a handful of tubes, cones and spheres: at the distances scenery
trees are usually seen, silhouette and proportion carry the read, and a
botanically faithful branch model would cost far more than it returns.
"""

from __future__ import annotations

import math

from ..util import apply_transform, new_mesh_object, rng_for
from .meshkit import MeshBuilder

BARK, LEAF = 0, 1

# detail level -> (radial segments, foliage count, sphere rings)
DETAIL = {"low": (6, 3, 5), "medium": (10, 5, 7), "high": (16, 8, 11)}


def build_tree(spec: dict, library, warn):
    style = spec.get("style", "pine")
    height = spec.get("height", 8.0)
    seed = spec.get("seed", 0)
    segments, foliage_count, rings = DETAIL.get(
        spec.get("detail", "medium"), DETAIL["medium"])
    rand = rng_for("tree", style, seed, height)

    builder = MeshBuilder()
    bare = spec.get("bare", False) or style == "dead"

    if style == "pine":
        _pine(builder, height, rand, segments, foliage_count, bare)
    elif style == "oak":
        _oak(builder, height, rand, segments, foliage_count, rings, bare)
    elif style == "birch":
        _birch(builder, height, rand, segments, foliage_count, rings, bare)
    elif style == "palm":
        _palm(builder, height, rand, segments, bare)
    elif style == "shrub":
        _shrub(builder, height, rand, segments, rings, bare)
    else:
        _dead(builder, height, rand, segments)

    mesh = builder.to_mesh(f"Tree_{style}")
    obj = new_mesh_object(spec.get("id") or f"Tree_{style}", mesh)

    lean = spec.get("lean_deg", 0.0)
    if lean:
        rotation = list(spec.get("rotation_deg", (0.0, 0.0, 0.0)))
        rotation[0] += lean * math.cos(rand.uniform(0, 2 * math.pi))
        rotation[1] += lean * math.sin(rand.uniform(0, 2 * math.pi))
        spec = {**spec, "rotation_deg": tuple(rotation)}
    apply_transform(obj, spec)

    trunk_default = {"preset": "bark", "bump": {"type": "noise", "scale": 40.0,
                                                "strength": 0.35}}
    leaf_default = {"preset": "foliage"}
    mesh.materials.append(
        library.resolve(spec.get("trunk_material"), trunk_default, "bark"))
    mesh.materials.append(
        library.resolve(spec.get("leaf_material"), leaf_default, "foliage"))
    return obj


def _jitter(rand, amount):
    return rand.uniform(-amount, amount)


def _pine(builder, height, rand, segments, count, bare):
    builder.tube((0, 0, 0), (0, 0, height * 0.95),
                 height * 0.045, height * 0.012, segments, BARK)
    if bare:
        return
    count = max(3, count + 1)
    start, top = height * 0.22, height * 1.0
    for i in range(count):
        t = i / (count - 1)
        base_z = start + (top - start) * t * 0.82
        # Skirts overlap so the silhouette stays continuous rather than
        # reading as separate stacked cones.
        radius = height * 0.30 * (1.0 - t) ** 0.85 + height * 0.02
        length = height * 0.30 * (1.0 - t * 0.55)
        builder.cone((_jitter(rand, height * 0.01), _jitter(rand, height * 0.01),
                      base_z),
                     (0, 0, base_z + length), radius, segments, LEAF)


def _oak(builder, height, rand, segments, count, rings, bare):
    trunk_top = height * 0.45
    builder.tube((0, 0, 0), (0, 0, trunk_top),
                 height * 0.075, height * 0.045, segments, BARK)

    branch_count = max(3, count)
    for i in range(branch_count):
        angle = 2 * math.pi * i / branch_count + _jitter(rand, 0.4)
        reach = height * rand.uniform(0.18, 0.30)
        tip = (math.cos(angle) * reach, math.sin(angle) * reach,
               trunk_top + height * rand.uniform(0.12, 0.24))
        builder.tube((0, 0, trunk_top * 0.85), tip,
                     height * 0.030, height * 0.012, max(5, segments // 2), BARK)
        if not bare:
            builder.sphere(tip, height * rand.uniform(0.16, 0.23),
                           segments, rings, LEAF,
                           scale=(1.0, 1.0, rand.uniform(0.7, 0.95)))

    if not bare:
        builder.sphere((0, 0, trunk_top + height * 0.24), height * 0.26,
                       segments, rings, LEAF, scale=(1.1, 1.1, 0.85))


def _birch(builder, height, rand, segments, count, rings, bare):
    trunk_top = height * 0.62
    builder.tube((0, 0, 0), (_jitter(rand, height * 0.03), 0, trunk_top),
                 height * 0.035, height * 0.020, segments, BARK)
    for i in range(max(3, count - 1)):
        angle = 2 * math.pi * i / max(3, count - 1) + _jitter(rand, 0.5)
        reach = height * rand.uniform(0.10, 0.18)
        tip = (math.cos(angle) * reach, math.sin(angle) * reach,
               trunk_top + height * rand.uniform(0.14, 0.30))
        builder.tube((0, 0, trunk_top * 0.8), tip,
                     height * 0.016, height * 0.006, max(5, segments // 2), BARK)
        if not bare:
            # Vertically stretched clumps give birch its light, upright crown.
            builder.sphere(tip, height * rand.uniform(0.11, 0.16),
                           segments, rings, LEAF, scale=(0.85, 0.85, 1.45))


def _palm(builder, height, rand, segments, bare):
    """A trunk swept along a shallow arc, then a crown of drooping fronds."""
    lean = rand.uniform(0.10, 0.22) * height
    direction = rand.uniform(0.0, 2 * math.pi)
    pieces = 8
    previous = (0.0, 0.0, 0.0)
    for i in range(1, pieces + 1):
        t = i / pieces
        bend = lean * t * t
        point = (math.cos(direction) * bend, math.sin(direction) * bend,
                 height * 0.88 * t)
        builder.tube(previous, point,
                     height * 0.035 * (1.0 - 0.45 * (t - 1.0 / pieces)),
                     height * 0.035 * (1.0 - 0.45 * t), segments, BARK,
                     cap_start=False, cap_end=False)
        previous = point

    if bare:
        return
    fronds = rand.randint(8, 12)
    for i in range(fronds):
        angle = 2 * math.pi * i / fronds + _jitter(rand, 0.25)
        reach = height * rand.uniform(0.32, 0.46)
        rise = height * rand.uniform(0.06, 0.16)
        tip = (previous[0] + math.cos(angle) * reach,
               previous[1] + math.sin(angle) * reach,
               previous[2] + rise)
        builder.blade(previous, tip, height * 0.075, LEAF,
                      droop=height * rand.uniform(0.18, 0.32))


def _shrub(builder, height, rand, segments, rings, bare):
    builder.tube((0, 0, 0), (0, 0, height * 0.30),
                 height * 0.05, height * 0.03, max(5, segments // 2), BARK)
    if bare:
        return
    for _ in range(rand.randint(3, 6)):
        centre = (_jitter(rand, height * 0.28), _jitter(rand, height * 0.28),
                  height * rand.uniform(0.35, 0.72))
        builder.sphere(centre, height * rand.uniform(0.22, 0.34),
                       segments, rings, LEAF,
                       scale=(1.0, 1.0, rand.uniform(0.65, 0.9)))


def _dead(builder, height, rand, segments):
    trunk_top = height * 0.72
    builder.tube((0, 0, 0), (_jitter(rand, height * 0.05), 0, trunk_top),
                 height * 0.06, height * 0.015, segments, BARK)
    for i in range(rand.randint(4, 7)):
        angle = rand.uniform(0, 2 * math.pi)
        origin_z = trunk_top * rand.uniform(0.35, 0.95)
        reach = height * rand.uniform(0.12, 0.28)
        tip = (math.cos(angle) * reach, math.sin(angle) * reach,
               origin_z + height * rand.uniform(0.02, 0.18))
        builder.tube((0, 0, origin_z), tip,
                     height * 0.018, height * 0.004,
                     max(4, segments // 2), BARK)
        # A second-order twig on some branches, for a believable dead silhouette.
        if rand.random() < 0.55:
            twig = (tip[0] * rand.uniform(1.2, 1.6), tip[1] * rand.uniform(1.2, 1.6),
                    tip[2] + height * rand.uniform(0.02, 0.12))
            builder.tube(tip, twig, height * 0.008, height * 0.002,
                         max(4, segments // 3), BARK)
