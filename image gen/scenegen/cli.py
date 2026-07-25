"""Command line interface."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

EXTENSIONS = {"png": ".png", "jpeg": ".jpg", "webp": ".webp", "exr": ".exr"}

# Quality presets, applied over whatever the scene file asks for.
PROFILES = {
    "preview": {"engine": "cycles", "samples": 24, "resolution": "720p",
                "denoise": True},
    "draft": {"engine": "eevee", "samples": 16, "resolution": "720p"},
    "final": {},
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="render.py",
        description="Render a 3D scene described by a JSON scene file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""examples:
  render.py scenes/cove.json -o out/cove.png
  render.py scenes/cove.json --preview          # fast look, path traced
  render.py scenes/cove.json --draft            # fastest, rasterised
  render.py scenes/cove.json --check            # validate without rendering
  render.py scenes/cove.json --resolution 4k --samples 512
""")

    parser.add_argument("scene", nargs="?", help="path to a .json scene file")
    parser.add_argument("-o", "--out", help="output image path")

    quality = parser.add_mutually_exclusive_group()
    quality.add_argument("--preview", action="store_true",
                         help="720p at 24 samples, still path traced")
    quality.add_argument("--draft", action="store_true",
                         help="rasterised; seconds, but fakes refraction")

    parser.add_argument("--resolution",
                        help="override: a preset (720p, 1080p, 4k...) or WxH")
    parser.add_argument("--aspect", help="override aspect ratio, e.g. 21:9")
    parser.add_argument("--samples", type=int, help="override sample count")
    parser.add_argument("--engine", choices=["cycles", "eevee"])
    parser.add_argument("--threads", type=int, help="0 uses every core")

    parser.add_argument("--check", action="store_true",
                        help="validate the scene file and exit")
    parser.add_argument("--save-blend", metavar="PATH",
                        help="also write a .blend of the compiled scene")
    parser.add_argument("--write-docs", action="store_true",
                        help="regenerate docs/SCENE_REFERENCE.md and exit")
    parser.add_argument("-q", "--quiet", action="store_true")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="show Blender's own render progress")
    return parser


def _apply_overrides(data: dict, args) -> None:
    """Merge CLI overrides into the raw scene dict before validation."""
    render = data.setdefault("render", {})

    if args.preview:
        render.update(PROFILES["preview"])
    elif args.draft:
        render.update(PROFILES["draft"])

    if args.resolution:
        value = args.resolution.lower()
        if "x" in value and value not in ("4k", "8k"):
            try:
                width, height = value.split("x")
                render["resolution"] = [int(width), int(height)]
            except ValueError:
                render["resolution"] = value
        else:
            render["resolution"] = value
    if args.aspect:
        render["aspect_ratio"] = args.aspect
    if args.samples is not None:
        render["samples"] = args.samples
    if args.engine:
        render["engine"] = args.engine
    if args.threads is not None:
        render["threads"] = args.threads


def _default_output(data: dict, scene_path: str) -> str:
    name = data.get("name") or os.path.splitext(os.path.basename(scene_path))[0]
    fmt = ((data.get("render") or {}).get("output") or {}).get("format", "png")
    return os.path.join(ROOT, "renders", f"{name}{EXTENSIONS.get(fmt, '.png')}")


def _load(path: str) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        raise SystemExit(f"error: no scene file at {path}")
    except json.JSONDecodeError as error:
        raise SystemExit(
            f"error: {path} is not valid JSON\n"
            f"  line {error.lineno}, column {error.colno}: {error.msg}")


def _write_docs() -> int:
    from .docgen import generate
    from .schema import SCENE

    target = os.path.join(ROOT, "docs", "SCENE_REFERENCE.md")
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "w", encoding="utf-8") as handle:
        handle.write(generate(SCENE))
    print(f"wrote {target}")
    return 0


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)

    if args.write_docs:
        return _write_docs()
    if not args.scene:
        build_parser().print_help()
        return 2

    data = _load(args.scene)
    _apply_overrides(data, args)

    # Validation touches only the schema, never Blender, so --check stays
    # instant and works without the render venv.
    from .validate import SceneError

    if args.check:
        from .schema import SCENE
        from .validate import check_fields

        problems: list[str] = []
        check_fields(data, SCENE, "", problems)
        if problems:
            print(str(SceneError(problems)), file=sys.stderr)
            return 1
        print(f"{args.scene}: valid")
        return 0

    say = (lambda *a: None) if args.quiet else print

    from .build import Warnings, compile_scene, render_to, save_blend

    warnings = Warnings(echo=None if args.quiet else print)
    try:
        info = compile_scene(data, warnings)
    except SceneError as error:
        print(str(error), file=sys.stderr)
        return 1

    say(f"scene    {info['name']}")
    say(f"objects  {info['objects']} (built in {info['build_seconds']:.1f}s)")
    say(f"output   {info['width']}x{info['height']}, {info['engine']}, "
        f"{info['samples']} samples")

    if args.save_blend:
        say(f"blend    {save_blend(args.save_blend)}")

    out = args.out or _default_output(data, args.scene)
    started = time.time()
    render_to(out, info, verbose=args.verbose)
    elapsed = time.time() - started

    say(f"rendered {out} in {elapsed:.1f}s")
    if warnings.messages and args.quiet:
        for message in warnings.messages:
            print(f"warning: {message}", file=sys.stderr)
    return 0
