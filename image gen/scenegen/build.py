"""Scene compilation: validated JSON in, populated Blender scene out."""

from __future__ import annotations

import contextlib
import os
import sys
import time

import bpy
from mathutils import Vector

from . import camera as camera_mod
from . import lights, settings, water, world
from .generators import (build_facade, build_primitive, build_rock,
                         build_scatter, build_terrain, build_tree)
from .materials import MaterialLibrary
from .schema import SCENE
from .validate import SceneError, check_fields

PRIMITIVES = {"plane", "cube", "sphere", "cylinder", "cone", "torus"}


class Warnings:
    """Collects non-fatal problems so they can be reported together."""

    def __init__(self, echo=None):
        self.messages: list[str] = []
        self._echo = echo

    def __call__(self, message: str) -> None:
        self.messages.append(message)
        if self._echo:
            self._echo(f"warning: {message}")


def validate(data: dict) -> dict:
    """Validate a raw scene dict, raising SceneError with every problem found."""
    if not isinstance(data, dict):
        raise SceneError([f"the scene file must contain an object, "
                          f"got {type(data).__name__}"])
    problems: list[str] = []
    result = check_fields(data, SCENE, "", problems)
    if problems:
        raise SceneError(problems)
    return result


def reset() -> None:
    """Start from a genuinely empty file.

    bpy keeps one global Blender session alive for the whole process, so
    without this a second render in the same process would inherit the first
    scene's objects.
    """
    bpy.ops.wm.read_factory_settings(use_empty=True)


def compile_scene(data: dict, warn) -> dict:
    """Build the whole scene. Returns a summary dict."""
    scene = validate(data)
    reset()

    started = time.time()
    width, height = settings.apply(scene["render"], warn)

    world.build_world(scene["world"], warn)
    sun = world.sun_lamp_from_sky(scene["world"].get("sky") or {})

    library = MaterialLibrary(scene.get("materials") or {})

    for index, light_spec in enumerate(scene.get("lights") or []):
        lights.build_light(light_spec, index, warn)

    registry: dict[str, object] = {}
    object_count = 0
    for index, obj_spec in enumerate(scene.get("objects") or []):
        made = _build_object(obj_spec, index, library, registry, warn)
        object_count += len(made) if isinstance(made, list) else (1 if made else 0)

    if not scene.get("lights") and sun is None and \
            (scene["world"].get("sky") or {}).get("type") == "color":
        warn("the scene has no lights and a flat colour sky; it may render "
             "almost black. Add a light or use a 'physical' sky.")

    camera_mod.build_camera(scene["camera"], registry, warn)

    # Fog is a box sized to the finished scene, so it has to come after every
    # object and the camera exist.
    world.build_fog_volume(scene["world"].get("fog") or {}, warn)

    # Modifier results (the ocean surface above all) only exist after the
    # dependency graph has been evaluated.
    bpy.context.view_layer.update()
    _check_camera_clear(warn)

    return {
        "name": scene.get("name") or "scene",
        "width": width,
        "height": height,
        "objects": object_count,
        "engine": scene["render"].get("engine", "cycles"),
        "samples": scene["render"].get("samples", 128),
        "build_seconds": time.time() - started,
        "render": scene["render"],
    }


def _build_object(spec: dict, index: int, library, registry, warn):
    kind = spec.get("type")

    def build_one(nested: dict):
        """Compile a nested object spec (used by scatter for its template)."""
        return _build_object(nested, index, library, registry, warn)

    if kind in PRIMITIVES:
        obj = build_primitive(spec, library, warn)
    elif kind == "terrain":
        obj = build_terrain(spec, warn)
        _apply_surface_material(obj, spec, library, {"preset": "grass"})
    elif kind == "ocean":
        obj = water.build_ocean(spec, library, warn)
    elif kind == "facade":
        obj = build_facade(spec, library, warn)
    elif kind == "rock":
        obj = build_rock(spec, library, warn)
    elif kind == "tree":
        obj = build_tree(spec, library, warn)
    elif kind == "import":
        obj = _import_file(spec, library, warn)
    elif kind == "scatter":
        target = None
        target_id = spec.get("on")
        if target_id:
            target = registry.get(target_id)
            if target is None:
                warn(f"scatter.on refers to {target_id!r}, which is not a "
                     f"known object id. Objects are built in file order, so "
                     f"the target must appear earlier in `objects`. "
                     f"Scattering on a flat plane instead.")
        instances = build_scatter(spec, target, build_one, warn)
        if spec.get("id"):
            registry[spec["id"]] = instances[0] if instances else None
        return instances
    else:
        warn(f"objects[{index}]: unsupported type {kind!r}; skipping.")
        return None

    if obj is None:
        return None

    if spec.get("id"):
        registry[spec["id"]] = obj
    if not spec.get("visible", True):
        obj.hide_render = True
    if spec.get("shadow_catcher"):
        obj.is_shadow_catcher = True
    return obj


def _check_camera_clear(warn) -> None:
    """Warn when the camera has ended up buried inside geometry.

    Placing a camera below a mountain or under the sea surface is the single
    most common way to get a black or muddy render, and it is invisible from
    the scene file alone. Casting straight up and inspecting the facing of
    whatever is hit answers it directly: hitting the *back* of a surface means
    the camera is underneath it.
    """
    scene = bpy.context.scene
    camera = scene.camera
    if camera is None:
        return

    depsgraph = bpy.context.evaluated_depsgraph_get()
    up = Vector((0.0, 0.0, 1.0))

    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render or obj.name == "FogVolume":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        to_local = evaluated.matrix_world.inverted()
        origin = to_local @ camera.matrix_world.translation
        direction = (to_local.to_3x3() @ up).normalized()

        hit, _, normal, _ = evaluated.ray_cast(origin, direction, distance=1e6)
        if not hit:
            continue
        world_normal = (evaluated.matrix_world.to_3x3() @ normal).normalized()
        if world_normal.dot(up) > 0.1:
            warn(f"the camera is underneath {obj.name!r}. Raise "
                 f"`camera.location` or move it outside that object, or the "
                 f"render will be black.")
            return


def _apply_surface_material(obj, spec, library, fallback):
    material = library.resolve(spec.get("material"), fallback, spec["type"])
    obj.data.materials.clear()
    obj.data.materials.append(material)


_IMPORTERS = [
    ((".glb", ".gltf"), lambda p: bpy.ops.import_scene.gltf(filepath=p)),
    ((".obj",), lambda p: bpy.ops.wm.obj_import(filepath=p)),
    ((".ply",), lambda p: bpy.ops.wm.ply_import(filepath=p)),
    ((".stl",), lambda p: bpy.ops.wm.stl_import(filepath=p)),
    ((".fbx",), lambda p: bpy.ops.import_scene.fbx(filepath=p)),
]


def _import_file(spec, library, warn):
    path = spec.get("path") or ""
    if not os.path.isfile(path):
        warn(f"import: no file at {path!r}; skipping.")
        return None

    extension = os.path.splitext(path)[1].lower()
    importer = next((fn for extensions, fn in _IMPORTERS
                     if extension in extensions), None)
    if importer is None:
        warn(f"import: {extension!r} is not a supported format. "
             f"Use .glb, .gltf, .obj, .ply, .stl or .fbx.")
        return None

    before = set(bpy.data.objects)
    try:
        importer(path)
    except Exception as error:  # importers raise all sorts of things
        warn(f"import of {path!r} failed: {error}")
        return None

    imported = [o for o in bpy.data.objects if o not in before]
    if not imported:
        warn(f"import of {path!r} produced no objects.")
        return None

    # Everything imported is parented to the first mesh so that the scene
    # file's transform moves the whole thing as a unit.
    root = imported[0]
    for other in imported[1:]:
        if other.parent is None:
            other.parent = root
            other.matrix_parent_inverse = root.matrix_world.inverted()

    from .util import apply_transform
    apply_transform(root, spec)

    if not spec.get("keep_materials", True):
        material = library.resolve(spec.get("material"), {"preset": "matte"},
                                   "imported")
        for obj in imported:
            if hasattr(obj.data, "materials"):
                obj.data.materials.clear()
                obj.data.materials.append(material)
    return root


@contextlib.contextmanager
def _muffled(enabled: bool):
    """Silence Cycles' per-sample chatter.

    Blender writes progress from C, straight to file descriptor 1, so
    redirecting sys.stdout is not enough -- the descriptor itself has to be
    pointed elsewhere for the duration of the render.
    """
    if not enabled:
        yield
        return

    sys.stdout.flush()
    saved = os.dup(1)
    devnull = os.open(os.devnull, os.O_WRONLY)
    try:
        os.dup2(devnull, 1)
        yield
    finally:
        os.dup2(saved, 1)
        os.close(saved)
        os.close(devnull)


def render_to(path: str, info: dict, verbose: bool = False) -> str:
    """Render the current scene to `path`. Returns the actual output path."""
    directory = os.path.dirname(os.path.abspath(path))
    if directory:
        os.makedirs(directory, exist_ok=True)

    bpy.context.scene.render.filepath = path
    with _muffled(not verbose):
        bpy.ops.render.render(write_still=True)
    return path


def save_blend(path: str) -> str:
    """Write the compiled scene as a .blend for inspection in the Blender GUI."""
    path = os.path.abspath(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=path)
    return path
