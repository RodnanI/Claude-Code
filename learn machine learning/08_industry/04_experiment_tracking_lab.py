"""
Experiment tracking from scratch: what MLflow / Weights & Biases do, in 60 lines.

Every run records parameters, metrics, code version, data fingerprint, library versions,
seed and duration. You can then compare runs, pick the best and reproduce it exactly.
Without this, there is no answer to "which settings gave us 97.3% last month?".

Run it:  python 04_experiment_tracking_lab.py   (under a minute)
"""

import hashlib
import itertools
import json
import platform
import subprocess
import time
import uuid
from pathlib import Path

import numpy as np
import sklearn
from sklearn.datasets import load_digits
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
RUNS_FILE = OUT / "runs.jsonl"


# %% 1. A minimal tracker
def git_commit():
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True,
                              cwd=Path(__file__).parent, timeout=5).stdout.strip() or "not a git repo"
    except (OSError, subprocess.SubprocessError):
        return "git unavailable"


def fingerprint(*arrays):
    """A short hash of the exact training data. Same hash = same data."""
    h = hashlib.sha256()
    for a in arrays:
        h.update(np.ascontiguousarray(a).tobytes())
    return h.hexdigest()[:12]


class Run:
    def __init__(self, experiment, params, data_hash, seed):
        self.record = {
            "run_id": uuid.uuid4().hex[:8], "experiment": experiment, "params": params, "metrics": {},
            "data_hash": data_hash, "seed": seed, "git_commit": git_commit(),
            "versions": {"python": platform.python_version(), "sklearn": sklearn.__version__, "numpy": np.__version__},
            "started": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        self._start = time.perf_counter()

    def log_metric(self, name, value):
        self.record["metrics"][name] = float(value)      # full precision: rounding breaks exact comparisons

    def end(self):
        self.record["duration_s"] = round(time.perf_counter() - self._start, 2)
        with open(RUNS_FILE, "a") as f:                      # append-only log: never overwrite history
            f.write(json.dumps(self.record) + "\n")
        return self.record


def load_runs(experiment):
    if not RUNS_FILE.exists():
        return []
    runs = [json.loads(line) for line in RUNS_FILE.read_text().splitlines()]
    return [r for r in runs if r["experiment"] == experiment]


# %% 2. An experiment: a small hyperparameter sweep
digits = load_digits()
X, y = digits.data, digits.target
SEED = 0
data_hash = fingerprint(X, y)
cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=SEED)
experiment = f"digits-hgb-{time.strftime('%Y%m%d-%H%M%S')}"

grid = {"learning_rate": [0.05, 0.2], "max_leaf_nodes": [8, 31], "max_iter": [100, 200]}
print(f"experiment {experiment}: {np.prod([len(v) for v in grid.values()])} runs, data hash {data_hash}")
for values in itertools.product(*grid.values()):
    params = dict(zip(grid, values))
    run = Run(experiment, params, data_hash, SEED)
    model = HistGradientBoostingClassifier(random_state=SEED, **params)
    scores = cross_val_score(model, X, y, cv=cv, scoring="accuracy")
    run.log_metric("cv_accuracy_mean", scores.mean())
    run.log_metric("cv_accuracy_std", scores.std())
    record = run.end()
    print(f"  run {record['run_id']}  {params}  acc {scores.mean():.4f}  ({record['duration_s']}s)")


# %% 3. Compare runs: the leaderboard
runs = sorted(load_runs(experiment), key=lambda r: r["metrics"]["cv_accuracy_mean"], reverse=True)
print("\nleaderboard:")
for r in runs[:5]:
    m = r["metrics"]
    print(f"  {m['cv_accuracy_mean']:.4f} +- {m['cv_accuracy_std']:.4f}  {r['params']}  run {r['run_id']}")
best = runs[0]
spread = runs[0]["metrics"]["cv_accuracy_mean"] - runs[-1]["metrics"]["cv_accuracy_mean"]
print(f"best minus worst: {spread:.4f}. Compare that to the std across folds before getting excited.")


# %% 4. Reproduce the best run from its record alone
assert best["data_hash"] == fingerprint(X, y), "data changed since the run: results are not comparable"
again = cross_val_score(HistGradientBoostingClassifier(random_state=best["seed"], **best["params"]), X, y,
                        cv=StratifiedKFold(n_splits=3, shuffle=True, random_state=best["seed"])).mean()
print(f"\nreproduced run {best['run_id']}: {again:.5f} vs logged {best['metrics']['cv_accuracy_mean']:.5f} "
      f"-> {'identical' if abs(again - best['metrics']['cv_accuracy_mean']) < 1e-9 else 'DIFFERENT (find out why!)'}")
print(f"all runs are in {RUNS_FILE.name}; open it, every line is one run")

# %% The same thing with MLflow (pip install mlflow), for reference:
#   import mlflow
#   mlflow.set_experiment("digits-hgb")
#   with mlflow.start_run():
#       mlflow.log_params(params)
#       mlflow.log_metric("cv_accuracy_mean", scores.mean())
#       mlflow.sklearn.log_model(model, "model")
#   then run `mlflow ui` and compare runs in the browser.

# Your turn
# 1. Add a "notes" field to Run so you can record WHY you ran an experiment. Future you will thank you.
# 2. Change one value in X (X[0, 0] += 1) and rerun section 4. What does the data hash catch?
# 3. Log a confusion matrix as an artifact file per run (save it to outputs/ and store the path).
