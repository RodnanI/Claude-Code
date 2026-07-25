#!/usr/bin/env python3
"""Entry point. Run with the interpreter from .venv (see install.sh)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scenegen.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
