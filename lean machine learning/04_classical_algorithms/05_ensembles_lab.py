"""
Ensembles lab: gradient boosting from scratch, bagging, and the real libraries compared.
Read 04_trees_and_ensembles.md first.

Run it:  python 05_ensembles_lab.py   (under a minute)
"""

import time
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from sklearn.datasets import make_classification
from sklearn.ensemble import (GradientBoostingClassifier, HistGradientBoostingClassifier,
                              RandomForestClassifier)
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(0)


# %% 1. Gradient boosting from scratch (regression, 1 feature)
x = np.sort(rng.uniform(0, 10, 300))
y = np.sin(x) + 0.3 * x + rng.normal(0, 0.3, 300)
x_val = rng.uniform(0, 10, 500)
y_val = np.sin(x_val) + 0.3 * x_val + rng.normal(0, 0.3, 500)


def fit_stump(x, target):
    """Best single split: threshold t, value left of t, value right of t (minimizes squared error)."""
    best = (np.inf, None, None, None)
    for t in (x[:-1] + x[1:]) / 2:
        left = x <= t
        lv, rv = target[left].mean(), target[~left].mean()
        sse = ((target[left] - lv) ** 2).sum() + ((target[~left] - rv) ** 2).sum()
        if sse < best[0]:
            best = (sse, t, lv, rv)
    return best[1:]


def stump_predict(stump, x):
    t, lv, rv = stump
    return np.where(x <= t, lv, rv)


learning_rate = 0.1
base = y.mean()                               # step 1: start from the mean
pred_train = np.full_like(y, base)
pred_val = np.full_like(y_val, base)
stumps = []
print("round   train MSE   val MSE")
for round_ in range(1, 301):
    residuals = y - pred_train                # step 2: what is still wrong?
    stump = fit_stump(x, residuals)           # step 3: a tiny tree that predicts the errors
    stumps.append(stump)
    pred_train += learning_rate * stump_predict(stump, x)       # step 4: small correction
    pred_val += learning_rate * stump_predict(stump, x_val)
    if round_ in (1, 5, 20, 50, 100, 300):
        print(f"{round_:>5}   {np.mean((y - pred_train) ** 2):>9.4f}   {np.mean((y_val - pred_val) ** 2):>7.4f}")
print("(noise variance is 0.09, the best possible MSE on new data)")
# Each stump is a terrible model alone: one split, two values. Three hundred of them, each
# fixing the leftover errors of the others, build a good curve.

grid = np.linspace(0, 10, 500)
fig, ax = plt.subplots(figsize=(8, 4))
ax.scatter(x, y, s=8, color="#8a9a5b", alpha=0.6, label="training data")
for n_rounds, color in [(5, "#e9c46a"), (30, "#2a9d8f"), (300, "#c8553d")]:
    curve = base + learning_rate * sum(stump_predict(s, grid) for s in stumps[:n_rounds])
    ax.plot(grid, curve, color=color, label=f"{n_rounds} stumps")
ax.legend()
ax.set_title("Gradient boosting: each round fixes leftover error")
fig.savefig(OUT / "boosting_from_scratch.png", dpi=120)
print("saved boosting_from_scratch.png")


# %% 2. Bagging: averaging unstable trees
single_preds, val_preds = [], []
for i in range(100):
    boot = rng.integers(0, len(x), len(x))                         # bootstrap: sample WITH replacement
    tree = DecisionTreeRegressor(random_state=i).fit(x[boot, None], y[boot])   # deep, overfitting tree
    single_preds.append(tree.predict(grid[:, None]))
    val_preds.append(tree.predict(x_val[:, None]))
val_preds = np.array(val_preds)
single_mse = np.mean([(np.mean((y_val - p) ** 2)) for p in val_preds])
bagged_mse = np.mean((y_val - val_preds.mean(axis=0)) ** 2)
print(f"\nbagging: average single deep tree val MSE {single_mse:.3f} -> average of 100 trees {bagged_mse:.3f}")
print(f"spread of single-tree predictions at x=5: std {np.array(single_preds)[:, 250].std():.3f}")
# Each deep tree memorizes its own bootstrap sample, noise included. Their mistakes differ, so
# averaging cancels much of the noise. Same bias, less variance.


# %% 3. The real libraries on a harder tabular problem
X, y_cls = make_classification(n_samples=6000, n_features=30, n_informative=12, n_redundant=6,
                               n_clusters_per_class=3, flip_y=0.03, class_sep=0.8, shuffle=False,
                               random_state=0)   # shuffle=False: columns 0-11 are the informative ones
models = {
    "logistic regression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)),
    "single tree (depth 8)": DecisionTreeClassifier(max_depth=8, random_state=0),
    "random forest": RandomForestClassifier(n_estimators=300, n_jobs=-1, random_state=0),
    "gradient boosting": GradientBoostingClassifier(n_estimators=100, random_state=0),   # classic, slow
    "hist gradient boosting": HistGradientBoostingClassifier(max_iter=300, random_state=0),
}
print("\nmodel                     ROC AUC (5-fold)      fit time")
for name, model in models.items():
    start = time.perf_counter()
    scores = cross_validate(model, X, y_cls, cv=StratifiedKFold(5, shuffle=True, random_state=0), scoring="roc_auc")
    elapsed = time.perf_counter() - start
    print(f"{name:<24}  {scores['test_score'].mean():.4f} +- {scores['test_score'].std():.4f}   {elapsed:6.1f}s")
# Typical ranking: boosting >= random forest > single tree; logistic regression depends on how
# linear the problem is. The classic GradientBoostingClassifier is slow even with only 100 trees.
# HistGradientBoosting bins every feature into at most 255 buckets first, so finding splits is
# cheap: top accuracy at a fraction of the time. Histograms are why LightGBM won.


# %% 4. Early stopping: let validation data decide the number of trees
hgb = HistGradientBoostingClassifier(max_iter=2000, learning_rate=0.1, early_stopping=True,
                                     validation_fraction=0.15, n_iter_no_change=30, random_state=0)
X_tr, X_te, y_tr, y_te = train_test_split(X, y_cls, test_size=0.25, random_state=0, stratify=y_cls)
hgb.fit(X_tr, y_tr)
print(f"\nearly stopping: asked for up to 2000 trees, stopped after {hgb.n_iter_}. "
      f"test accuracy {hgb.score(X_te, y_te):.3f}")


# %% 5. Feature importance trap: a useless ID column
X_id = np.column_stack([X_tr[:, :5], rng.permutation(len(X_tr))])        # 5 informative features + a random "ID"
X_id_te = np.column_stack([X_te[:, :5], rng.permutation(len(X_te))])
forest = RandomForestClassifier(n_estimators=200, n_jobs=-1, random_state=0).fit(X_id, y_tr)
perm = permutation_importance(forest, X_id_te, y_te, n_repeats=10, random_state=0)
print("\nfeature     impurity importance   permutation importance (on test data)")
for i, label in enumerate([f"real_{i}" for i in range(5)] + ["random_ID"]):
    print(f"{label:<10}  {forest.feature_importances_[i]:>19.3f}   {perm.importances_mean[i]:>22.3f}")
# The random ID gets real-looking impurity importance (it has many unique values to split on
# and trees overfit to it), but permutation importance on held-out data correctly says ~0.

plt.show()
