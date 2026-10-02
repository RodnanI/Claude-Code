# Setup Guide

Do this once and you can mostly forget it. A broken setup costs whole evenings of "module not found" errors.

## 1. Install Python

Install Python 3.11 or 3.12 from python.org (Windows: tick "Add python.exe to PATH" in the installer). Check it works:

```bash
python --version      # Windows
python3 --version     # Mac / Linux, sometimes plain "python" works too
```

Take 3.11 or 3.12 rather than the newest release, because big libraries like PyTorch trail new Python versions by a few months.

## 2. Virtual environments

A virtual environment is a private folder of packages for one project. Without one, every project shares the same packages and eventually two projects need different versions of the same library and everything breaks. Companies use them or an equivalent such as conda, poetry or uv.

```bash
cd "learn machine learning"          # quotes because the name has spaces
python -m venv .venv                # create it (once)

# activate it (every time you open a new terminal)
.venv\Scripts\activate              # Windows
source .venv/bin/activate           # Mac / Linux

pip install -r requirements.txt     # install everything this course uses
```

When it is active, your terminal prompt starts with `(.venv)`. If you see "ModuleNotFoundError: No module named numpy", 9 times out of 10 you forgot to activate.

### What `requirements.txt` is

A list of the packages a project needs. Most Python projects have one, or a `pyproject.toml`. On a new repo at work, you create an environment and install its requirements first.

### PyTorch note

`torch` is big. On a laptop without an NVIDIA GPU, install the CPU build to save space:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

On a Mac with Apple Silicon, the normal `pip install torch` gives you GPU acceleration through "MPS" for free.

## 3. An editor

Use **VS Code** (free) with the "Python" and "Jupyter" extensions from Microsoft. PyCharm Community is also fine.

Learn these in your editor in the first week:

- Select the interpreter: Ctrl+Shift+P (Cmd+Shift+P on Mac), "Python: Select Interpreter", pick the one inside `.venv`.
- Run a file: the play button, or `python file.py` in the terminal.
- Run a cell: every `.py` file in this course has `# %%` markers. VS Code shows "Run Cell" above them. This runs just that block in an interactive window, like a notebook.
- Go to definition: Ctrl+click on a function name. You will do this constantly when reading library code.
- The debugger: click left of a line number to set a breakpoint, then "Run and Debug". For anything complicated, stepping through line by line and inspecting variables beats `print`.

## 4. Jupyter notebooks

A notebook (`.ipynb`) mixes code cells, output and text. Data scientists use them all day.

```bash
pip install jupyter
jupyter lab
```

Their weakness is that cells can run in any order, so a notebook can show results you cannot reproduce by running it top to bottom. At work, notebooks are for exploration, and anything headed for production is moved into `.py` files. This course uses `.py` files with `# %%` cells for that reason: you get interactive running without the hidden state.

## 5. Free GPUs when you need them

You do not need a GPU for this course. When you want to train bigger things later:

Google Colab gives you a free notebook with a GPU in the browser; upload a `.py` file or paste cells. Kaggle Notebooks also offer free GPU hours.

## 6. Git

Every company uses git. Start with these commands:

```bash
git status                    # what changed
git add file.py               # stage a change
git commit -m "message"       # save a snapshot
git log --oneline             # history
git diff                      # see exact changes
git checkout -b my-branch     # make a branch for new work
git push                      # upload to GitHub
```

Never commit: API keys, passwords, `.venv/`, big datasets or model files. The `.gitignore` file in this folder already excludes the common ones.

## 7. API keys (for the LLM labs, later)

Some labs in `07_llms` can call Claude. You need an API key from console.anthropic.com. Never paste keys into code. Set an environment variable instead:

```bash
# Mac / Linux (put it in ~/.zshrc or ~/.bashrc to keep it)
export ANTHROPIC_API_KEY="sk-ant-..."

# Windows PowerShell
setx ANTHROPIC_API_KEY "sk-ant-..."     # then open a new terminal
```

Labs that use a key also run without one. They print what they would have sent instead.

## 8. Check everything

```bash
python 00_setup/02_check_environment.py
```

If something is missing, it prints the command that fixes it.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `python` not found on Windows | Reinstall Python with "Add to PATH" ticked, or use `py` instead of `python` |
| `ModuleNotFoundError` | Activate the venv. Then check your editor uses the venv interpreter |
| `pip` installs but import still fails | You have two Pythons. Use `python -m pip install ...` so pip matches the Python you run |
| Path errors because of spaces | Put quotes around paths: `cd "learn machine learning"` |
| Plots do not appear | They are saved to `outputs/` next to each script either way. Open the PNG |
| torch install is huge or fails | Use the CPU index URL above |
