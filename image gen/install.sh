#!/usr/bin/env bash
# Provision the render environment.
#
# Blender ships as a Python module ("bpy"), so the whole engine installs with
# pip. No system Blender, no GUI, no display server required. The wheel is
# large (~520 MB download, ~1.4 GB installed) because it contains all of
# Blender: Cycles, OpenImageDenoise, Mantaflow, OSL, the works.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="${HERE}/.venv"
PY_MIN=11

python3 -c 'import sys; sys.exit(0 if sys.version_info[:2] == (3, 11) else 1)' || {
    echo "error: bpy 4.2 wheels are built for CPython 3.11; found $(python3 --version)" >&2
    echo "       install python3.11 and re-run, or adjust BPY_VERSION below." >&2
    exit 1
}

if [ ! -d "${VENV}" ]; then
    echo "==> creating venv at ${VENV}"
    python3 -m venv "${VENV}"
fi

echo "==> installing bpy (this downloads ~520 MB, be patient)"
"${VENV}/bin/pip" install --upgrade pip >/dev/null
"${VENV}/bin/pip" install "bpy==4.2.0"

echo "==> verifying"
"${VENV}/bin/python" - <<'PY'
import bpy
print(f"    Blender {bpy.app.version_string}")
assert hasattr(bpy.types, "OceanModifier"), "ocean modifier missing"
assert hasattr(bpy.types, "FluidModifier"), "mantaflow missing"
print("    cycles + ocean + fluid: ok")
PY

cat <<EOF

Ready. Render a scene with:

    "${VENV}/bin/python" "${HERE}/render.py" "${HERE}/examples/ocean_storm.json" -o /tmp/out.png --preview

Drop --preview for full quality.
EOF
