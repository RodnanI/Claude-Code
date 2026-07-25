"""Generate the authoring reference from the schema.

Documentation written by hand drifts from the validator within a week. This
walks the spec and emits Markdown, so the reference an agent reads and the
rules the validator enforces are the same object.
"""

from __future__ import annotations

from .validate import REQUIRED


def _format_default(rule) -> str:
    default = rule.get("default")
    if default is REQUIRED:
        return "**required**"
    if default is None:
        return "`null`"
    if isinstance(default, bool):
        return f"`{str(default).lower()}`"
    if isinstance(default, dict):
        return "`{}`" if not default else f"`{default}`"
    if isinstance(default, (list, tuple)):
        return f"`{list(default)}`"
    return f"`{default!r}`"


def _format_type(rule) -> str:
    kind = rule["kind"]
    if kind == "enum":
        return " \\| ".join(f"`{c}`" for c in rule["choices"])
    if kind == "one_of":
        return " *or* ".join(_format_type(o) for o in rule["options"])
    if kind == "number":
        lo, hi = rule.get("lo"), rule.get("hi")
        if lo is not None and hi is not None:
            return f"number ({lo:g}–{hi:g})"
        return "number"
    if kind == "int":
        lo, hi = rule.get("lo"), rule.get("hi")
        if lo is not None and hi is not None:
            return f"integer ({lo:g}–{hi:g})"
        return "integer"
    return {"bool": "true/false", "str": "string", "vec3": "[x, y, z]",
            "vec2": "[a, b]", "color": "colour", "list": "list",
            "group": "object", "map": "object", "tagged": "object",
            "any": "object"}.get(kind, kind)


def _rows(fields: dict) -> list[str]:
    rows = ["| field | type | default | notes |",
            "| --- | --- | --- | --- |"]
    for name, rule in fields.items():
        doc = rule.get("doc", "").replace("\n", " ").strip()
        rows.append(f"| `{name}` | {_format_type(rule)} | "
                    f"{_format_default(rule)} | {doc} |")
    return rows


def _section(title: str, rule, level: int = 2) -> list[str]:
    out = [f"{'#' * level} {title}", ""]
    if rule.get("doc"):
        out += [rule["doc"], ""]

    kind = rule["kind"]
    if kind == "group":
        out += _rows(rule["fields"]) + [""]
        for name, sub in rule["fields"].items():
            if sub["kind"] in ("group", "tagged"):
                out += _section(f"{title}.{name}", sub, level + 1)
    elif kind == "tagged":
        if rule["shared"]:
            out += ["Fields shared by every variant:", ""] + _rows(rule["shared"]) + [""]
        for variant, fields in rule["variants"].items():
            out += [f"{'#' * (level + 1)} `{rule['tag']}: \"{variant}\"`", ""]
            out += _rows(fields) + [""]
    elif kind == "map":
        out += ["Keys are names you choose. Each value is:", ""]
        out += _section("value", rule["values"], level + 1)
    elif kind == "list":
        out += _section("item", rule["items"], level)
    return out


def generate(scene_spec: dict) -> str:
    """Render the whole scene spec as a Markdown reference."""
    lines = [
        "# Scene file reference",
        "",
        "*Generated from `scenegen/schema.py`. Do not edit by hand -- "
        "run `python render.py --write-docs` instead.*",
        "",
        "Z is up. Distances are metres, angles are degrees. Any field "
        "documented as *null inherits* may be omitted.",
        "",
    ]
    for name, rule in scene_spec.items():
        if rule["kind"] in ("group", "tagged", "map", "list"):
            lines += _section(f"`{name}`", rule)
        else:
            lines += [f"## `{name}`", "", *_rows({name: rule}), ""]
    return "\n".join(lines) + "\n"
