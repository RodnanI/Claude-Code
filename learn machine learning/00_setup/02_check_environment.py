"""
Check that your environment is ready for this course.

Run it:
    python 02_check_environment.py

It prints which libraries are installed, their versions and whether PyTorch
can see a GPU. It changes nothing on your system.
"""

import importlib
import platform
import sys

# A dictionary of dictionaries: you already know these. The keys are the
# names you use in `import`, which are not always the names you pip install.
REQUIRED = {
    "numpy": {"pip": "numpy", "why": "fast arrays, the base of everything"},
    "pandas": {"pip": "pandas", "why": "tables of data (DataFrames)"},
    "matplotlib": {"pip": "matplotlib", "why": "plots"},
    "sklearn": {"pip": "scikit-learn", "why": "classical machine learning"},
    "torch": {"pip": "torch", "why": "deep learning and the LLM labs"},
}

OPTIONAL = {
    "anthropic": {"pip": "anthropic", "why": "calling Claude (LLM API, RAG, agent labs)"},
    "transformers": {"pip": "transformers", "why": "Hugging Face lab (optional)"},
}


def check_packages(packages, required):
    """Try to import every package. Return the pip names of missing ones."""
    missing = []
    for import_name, info in packages.items():
        try:
            module = importlib.import_module(import_name)
            version = getattr(module, "__version__", "?")
            print(f"  ok       {info['pip']:<14} {version:<14} {info['why']}")
        except ImportError:
            label = "MISSING " if required else "not used"
            print(f"  {label} {info['pip']:<14} {'-':<14} {info['why']}")
            missing.append(info["pip"])
    return missing


def check_torch_device():
    """Say which hardware PyTorch would train on."""
    try:
        import torch
    except ImportError:
        return
    if torch.cuda.is_available():
        print(f"  PyTorch device: cuda ({torch.cuda.get_device_name(0)})")
    elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        print("  PyTorch device: mps (Apple Silicon GPU)")
    else:
        print("  PyTorch device: cpu (fine for every lab in this course)")


def main():
    print(f"Python {platform.python_version()} on {platform.system()}")
    if sys.version_info < (3, 10):
        print("  WARNING: use Python 3.10 or newer. Some labs will not run on older versions.")
    print(f"Interpreter: {sys.executable}")
    if ".venv" not in sys.executable and "venv" not in sys.executable:
        print("  Note: this does not look like a virtual environment. See 01_setup_guide.md.")

    print("\nRequired packages:")
    missing = check_packages(REQUIRED, required=True)
    print("\nOptional packages:")
    check_packages(OPTIONAL, required=False)

    print("\nHardware:")
    check_torch_device()

    if missing:
        print("\nInstall what is missing with:")
        print(f"  python -m pip install {' '.join(missing)}")
    else:
        print("\nAll required packages found. Go to 01_python_for_ml.")


if __name__ == "__main__":
    main()
