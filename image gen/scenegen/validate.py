"""A tiny spec-driven validator.

The point of this module is error messages. Scene files are written by
language models, and a model can only fix what it is told precisely. So every
failure reports a full path ("objects[2].water.wave_scale"), what was
expected, what arrived, and -- for misspelled keys -- the nearest legal name.

Rules are plain dicts so the spec in schema.py stays readable and can be
dumped as documentation. No third-party dependencies; the render venv holds
bpy and nothing else.
"""

from __future__ import annotations

import difflib
import math
import re

REQUIRED = object()  # sentinel: field has no default and must be supplied


class SceneError(Exception):
    """Raised when a scene file cannot be understood. Carries every problem."""

    def __init__(self, problems: list[str]):
        self.problems = problems
        count = len(problems)
        head = f"{count} problem{'s' if count != 1 else ''} in scene file:"
        super().__init__("\n".join([head] + [f"  - {p}" for p in problems]))


# --------------------------------------------------------------------------
# colour handling
#
# Two accepted spellings, because they suit different authors:
#   "#3a7bd5" / "skyblue"  -> sRGB, gamma-decoded to linear for us
#   [0.1, 0.4, 0.9]        -> already linear, passed through untouched
# Renderers work in linear light; hex codes come from a gamma-encoded world.
# Silently mixing the two is the classic way to get washed-out output.
# --------------------------------------------------------------------------

NAMED_COLORS = {
    "black": "#000000", "white": "#ffffff", "grey": "#808080", "gray": "#808080",
    "red": "#d13438", "green": "#3a8b3a", "blue": "#3a6bd5", "yellow": "#e8c547",
    "orange": "#e07b39", "purple": "#8b5cf6", "pink": "#e8a0bf", "brown": "#6b4a2f",
    "cyan": "#3ac5d5", "magenta": "#d53ac5", "skyblue": "#7ec0ee", "navy": "#1b2a4a",
    "sand": "#c2b280", "sandstone": "#d8c9a3", "concrete": "#9a9a94",
    "grass": "#4a7c30", "moss": "#5a6b3a", "slate": "#4a5259",
    "rust": "#8b4513", "gold": "#d4af37", "silver": "#c0c0c0", "copper": "#b87333",
    "seafoam": "#8fd4c1", "deepsea": "#0b2a3d", "ice": "#cfe8f0", "snow": "#f2f6fa",
    "charcoal": "#2b2b2b", "cream": "#f0e6d2", "terracotta": "#c76b4a",
}

_HEX_RE = re.compile(r"^#?([0-9a-fA-F]{6})$")


def _join_or(names) -> str:
    """'a', 'a' or 'b', 'a', 'b' or 'c' -- readable suggestion lists."""
    quoted = [repr(n) for n in names]
    if len(quoted) <= 1:
        return "".join(quoted)
    return ", ".join(quoted[:-1]) + " or " + quoted[-1]


def _srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def parse_color(value, path: str, problems: list[str]) -> tuple[float, float, float]:
    """Return a linear RGB triple, or (0.5, 0.5, 0.5) after logging a problem."""
    if isinstance(value, str):
        key = value.strip().lower()
        hexcode = NAMED_COLORS.get(key, key)
        m = _HEX_RE.match(hexcode)
        if not m:
            near = difflib.get_close_matches(key, NAMED_COLORS, n=3, cutoff=0.6)
            hint = f" Did you mean {' or '.join(near)}?" if near else ""
            problems.append(
                f"{path}: {value!r} is not a colour. Use '#rrggbb', a linear "
                f"[r, g, b] triple, or a named colour.{hint}"
            )
            return (0.5, 0.5, 0.5)
        h = m.group(1)
        srgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
        return tuple(_srgb_to_linear(c) for c in srgb)

    if isinstance(value, (list, tuple)) and len(value) in (3, 4):
        out = []
        for i, c in enumerate(value[:3]):
            if not isinstance(c, (int, float)) or isinstance(c, bool):
                problems.append(f"{path}[{i}]: expected a number, got {c!r}")
                return (0.5, 0.5, 0.5)
            out.append(float(c))
        return tuple(out)

    problems.append(
        f"{path}: expected a colour ('#rrggbb', named colour, or [r, g, b] "
        f"in linear 0-1), got {type(value).__name__}"
    )
    return (0.5, 0.5, 0.5)


# --------------------------------------------------------------------------
# rule constructors -- sugar so schema.py reads like a table
# --------------------------------------------------------------------------

def num(default=REQUIRED, lo=None, hi=None, doc=""):
    return {"kind": "number", "default": default, "lo": lo, "hi": hi, "doc": doc}


def integer(default=REQUIRED, lo=None, hi=None, doc=""):
    return {"kind": "int", "default": default, "lo": lo, "hi": hi, "doc": doc}


def flag(default=REQUIRED, doc=""):
    return {"kind": "bool", "default": default, "doc": doc}


def text(default=REQUIRED, doc=""):
    return {"kind": "str", "default": default, "doc": doc}


def enum(choices, default=REQUIRED, doc=""):
    return {"kind": "enum", "choices": list(choices), "default": default, "doc": doc}


def vec3(default=REQUIRED, doc=""):
    return {"kind": "vec3", "default": default, "doc": doc}


def vec2(default=REQUIRED, doc=""):
    return {"kind": "vec2", "default": default, "doc": doc}


def color(default=REQUIRED, doc=""):
    return {"kind": "color", "default": default, "doc": doc}


def group(fields, default=REQUIRED, doc=""):
    return {"kind": "group", "fields": fields, "default": default, "doc": doc}


def array(items, default=REQUIRED, doc=""):
    return {"kind": "list", "items": items, "default": default, "doc": doc}


def tagged(tag, variants, shared=None, doc=""):
    """A discriminated union: `tag` selects which variant spec applies."""
    return {"kind": "tagged", "tag": tag, "variants": variants,
            "shared": shared or {}, "default": REQUIRED, "doc": doc}


def anything(default=REQUIRED, doc=""):
    return {"kind": "any", "default": default, "doc": doc}


def one_of(options, default=REQUIRED, doc=""):
    """Accept whichever of several rules matches -- e.g. "4k" or [3840, 2160]."""
    return {"kind": "one_of", "options": list(options), "default": default, "doc": doc}


def mapping(values, default=REQUIRED, doc=""):
    """An open dict with author-chosen keys, every value matching `values`."""
    return {"kind": "map", "values": values, "default": default, "doc": doc}


# --------------------------------------------------------------------------
# the checker
# --------------------------------------------------------------------------

def _is_number(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _check_range(v, rule, path, problems) -> float:
    lo, hi = rule.get("lo"), rule.get("hi")
    if lo is not None and v < lo:
        problems.append(f"{path}: {v} is below the minimum of {lo}")
        return float(lo)
    if hi is not None and v > hi:
        problems.append(f"{path}: {v} is above the maximum of {hi}")
        return float(hi)
    return float(v)


def _fixed_vector(value, n, path, problems, fallback):
    if not isinstance(value, (list, tuple)):
        problems.append(
            f"{path}: expected a list of {n} numbers, got {type(value).__name__}")
        return fallback
    if len(value) != n:
        problems.append(f"{path}: expected {n} numbers, got {len(value)}")
        return fallback
    out = []
    for i, c in enumerate(value):
        if not _is_number(c):
            problems.append(f"{path}[{i}]: expected a number, got {c!r}")
            return fallback
        if not math.isfinite(float(c)):
            problems.append(f"{path}[{i}]: {c} is not a finite number")
            return fallback
        out.append(float(c))
    return tuple(out)


def check(value, rule, path, problems):
    """Validate `value` against `rule`, returning a normalised value."""
    kind = rule["kind"]

    # An explicit null on an optional field means "leave it alone" -- for
    # material fields that is "keep whatever the preset chose".
    if value is None and rule.get("default", REQUIRED) is None:
        return None

    if kind == "any":
        return value

    if kind == "one_of":
        for option in rule["options"]:
            trial = []
            result = check(value, option, path, trial)
            if not trial:
                return result
        wanted = " or ".join(_describe(o) for o in rule["options"])
        problems.append(f"{path}: expected {wanted}, got {value!r}")
        return _default_of(rule["options"][0])

    if kind == "map":
        if not isinstance(value, dict):
            problems.append(f"{path}: expected an object, got {type(value).__name__}")
            return {}
        return {k: check(v, rule["values"], f"{path}.{k}", problems)
                for k, v in value.items()}

    if kind in ("number", "int"):
        if not _is_number(value):
            problems.append(
                f"{path}: expected a number, got {type(value).__name__} ({value!r})")
            return rule.get("lo") or 0
        if not math.isfinite(float(value)):
            problems.append(f"{path}: {value} is not a finite number")
            return rule.get("lo") or 0
        v = _check_range(value, rule, path, problems)
        if kind == "int":
            if float(value) != int(value):
                problems.append(f"{path}: expected a whole number, got {value}")
            return int(round(v))
        return v

    if kind == "bool":
        if not isinstance(value, bool):
            problems.append(f"{path}: expected true or false, got {value!r}")
            return False
        return value

    if kind == "str":
        if not isinstance(value, str):
            problems.append(f"{path}: expected a string, got {type(value).__name__}")
            return ""
        return value

    if kind == "enum":
        choices = rule["choices"]
        if not isinstance(value, str):
            problems.append(
                f"{path}: expected one of {choices}, got {type(value).__name__}")
            return choices[0]
        key = value.strip().lower().replace("-", "_").replace(" ", "_")
        if key not in choices:
            near = difflib.get_close_matches(key, choices, n=2, cutoff=0.5)
            hint = f" Did you mean {_join_or(near)}?" if near else ""
            problems.append(
                f"{path}: {value!r} is not valid. Choose from {choices}.{hint}")
            return choices[0]
        return key

    if kind == "vec3":
        return _fixed_vector(value, 3, path, problems, (0.0, 0.0, 0.0))

    if kind == "vec2":
        return _fixed_vector(value, 2, path, problems, (0.0, 0.0))

    if kind == "color":
        return parse_color(value, path, problems)

    if kind == "list":
        if not isinstance(value, list):
            problems.append(f"{path}: expected a list, got {type(value).__name__}")
            return []
        return [check(v, rule["items"], f"{path}[{i}]", problems)
                for i, v in enumerate(value)]

    if kind == "group":
        return check_fields(value, rule["fields"], path, problems)

    if kind == "tagged":
        return _check_tagged(value, rule, path, problems)

    raise AssertionError(f"unknown rule kind {kind!r}")


def _check_tagged(value, rule, path, problems):
    tag, variants = rule["tag"], rule["variants"]
    if not isinstance(value, dict):
        problems.append(f"{path}: expected an object, got {type(value).__name__}")
        return {}
    if tag not in value:
        problems.append(
            f"{path}: missing required field {tag!r}. "
            f"Choose one of {sorted(variants)}.")
        return {}
    name = value[tag]
    if not isinstance(name, str) or name.strip().lower() not in variants:
        near = difflib.get_close_matches(
            str(name).lower(), sorted(variants), n=3, cutoff=0.4)
        hint = f" Did you mean {_join_or(near)}?" if near else ""
        problems.append(
            f"{path}.{tag}: {name!r} is not a known type. "
            f"Available: {sorted(variants)}.{hint}")
        return {}
    name = name.strip().lower()
    fields = dict(rule["shared"])
    fields.update(variants[name])
    result = check_fields(
        {k: v for k, v in value.items() if k != tag}, fields,
        f"{path}({name})", problems)
    result[tag] = name
    return result


def check_fields(value, fields, path, problems):
    """Validate a dict against a {name: rule} table, filling in defaults."""
    if not isinstance(value, dict):
        problems.append(f"{path}: expected an object, got {type(value).__name__}")
        return {k: _default_of(r) for k, r in fields.items()}

    out = {}
    for key in value:
        if key not in fields:
            near = difflib.get_close_matches(key, sorted(fields), n=3, cutoff=0.5)
            hint = (f" Did you mean {_join_or(near)}?"
                    if near else f" Valid fields: {sorted(fields)}")
            problems.append(f"{path}: unknown field {key!r}.{hint}")

    for name, rule in fields.items():
        sub = f"{path}.{name}" if path else name
        if name in value:
            out[name] = check(value[name], rule, sub, problems)
        elif rule.get("default") is REQUIRED:
            problems.append(f"{sub}: required field is missing. {rule.get('doc', '')}".rstrip())
            out[name] = _default_of(rule)
        else:
            out[name] = _default_of(rule)
    return out


def _describe(rule) -> str:
    """A short human phrase for a rule, used in one_of failure messages."""
    kind = rule["kind"]
    if kind == "enum":
        return "one of " + repr(rule["choices"])
    if kind == "vec2":
        return "a [width, height] pair"
    if kind == "vec3":
        return "an [x, y, z] triple"
    return {"number": "a number", "int": "a whole number", "bool": "true or false",
            "str": "a string", "color": "a colour", "list": "a list",
            "group": "an object", "map": "an object"}.get(kind, kind)


def _default_of(rule):
    """Materialise a rule's default, recursing into groups."""
    d = rule.get("default")
    if d is REQUIRED:
        kind = rule["kind"]
        if kind == "group":
            return {k: _default_of(r) for k, r in rule["fields"].items()}
        if kind == "one_of":
            return _default_of(rule["options"][0])
        return {"number": 0.0, "int": 0, "bool": False, "str": "",
                "vec3": (0.0, 0.0, 0.0), "vec2": (0.0, 0.0),
                "color": (0.5, 0.5, 0.5), "list": [], "tagged": {},
                "map": {}, "any": None}.get(kind, None)

    # A declared default of null means "unset" -- material fields inherit from
    # their preset, generator fields from their style. It must survive as None
    # rather than being coerced into a concrete value below.
    if d is None:
        return None
    if rule["kind"] == "group" and isinstance(d, dict):
        # merge the declared default over the field defaults
        return check_fields(d, rule["fields"], "", [])
    if rule["kind"] == "color" and not isinstance(d, tuple):
        return parse_color(d, "", [])
    if rule["kind"] in ("vec3", "vec2") and isinstance(d, (list, tuple)):
        return tuple(float(x) for x in d)
    return d
