"""Explicit light sources.

Sun strength is irradiance in W/m^2; the others are radiant power in watts,
matching Blender's own units. That means a 100 W area light behaves roughly
like a 100 W bulb of that size, and doubling an area light's dimensions
without changing its power keeps total output constant while softening the
shadows.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Vector

from .util import aim


def build_light(spec: dict, index: int, warn):
    kind = spec.get("type", "sun")
    name = spec.get("id") or f"{kind}_{index}"

    if kind == "sun":
        obj = _sun(spec, name)
    elif kind == "area":
        obj = _area(spec, name)
    elif kind == "point":
        obj = _point(spec, name)
    elif kind == "spot":
        obj = _spot(spec, name)
    else:
        warn(f"unknown light type {kind!r}; skipping.")
        return None

    obj.data.color = spec.get("color", (1.0, 1.0, 1.0))
    if not spec.get("shadow", True):
        obj.data.use_shadow = False
    return obj


def _make(name, light_type):
    data = bpy.data.lights.new(name, type=light_type)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return obj


def _sun(spec, name):
    obj = _make(name, "SUN")
    obj.data.energy = spec.get("strength", 3.0)
    obj.data.angle = math.radians(spec.get("angle_deg", 0.526))
    elevation = math.radians(spec.get("elevation_deg", 45.0))
    rotation = math.radians(spec.get("rotation_deg", 135.0))
    # Same convention as the sky's matched sun: tilt off straight-down by the
    # complement of the elevation, then spin to the compass bearing.
    obj.rotation_euler = (math.pi / 2.0 - elevation, 0.0, rotation)
    return obj


def _area(spec, name):
    obj = _make(name, "AREA")
    data = obj.data
    shape = spec.get("shape", "square")
    data.shape = {"square": "SQUARE", "rectangle": "RECTANGLE",
                  "disk": "DISK", "ellipse": "ELLIPSE"}[shape]
    data.size = spec.get("size", 1.0)
    size_y = spec.get("size_y")
    if size_y is not None and data.shape in ("RECTANGLE", "ELLIPSE"):
        data.size_y = size_y
    data.energy = spec.get("power_w", 100.0)
    if hasattr(data, "spread"):
        data.spread = math.radians(spec.get("spread_deg", 180.0))

    obj.location = Vector(spec.get("location", (0.0, 0.0, 5.0)))
    target = spec.get("look_at")
    aim(obj, Vector(target) if target is not None else Vector((0.0, 0.0, 0.0)))
    return obj


def _point(spec, name):
    obj = _make(name, "POINT")
    obj.data.energy = spec.get("power_w", 100.0)
    obj.data.shadow_soft_size = spec.get("radius", 0.1)
    obj.location = Vector(spec.get("location", (0.0, 0.0, 3.0)))
    return obj


def _spot(spec, name):
    obj = _make(name, "SPOT")
    data = obj.data
    data.energy = spec.get("power_w", 500.0)
    data.shadow_soft_size = spec.get("radius", 0.1)
    data.spot_size = math.radians(spec.get("cone_deg", 45.0))
    data.spot_blend = spec.get("blend", 0.15)
    obj.location = Vector(spec.get("location", (0.0, 0.0, 5.0)))
    aim(obj, Vector(spec.get("look_at", (0.0, 0.0, 0.0))))
    return obj
