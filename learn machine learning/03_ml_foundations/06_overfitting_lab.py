"""
Overfitting, underfitting, regularization, learning curves and bias vs variance.
Read 05_generalization_and_overfitting.md first.

Setup: the true pattern is a sine wave, and we see only 20 noisy points of it.
We fit polynomials of increasing degree and check how they do on new points.

Run it:  python 06_overfitting_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(1)
NOISE = 0.25


def true_function(x):
    return np.sin(2 * np.pi * x)


def make_data(n):
    x = rng.uniform(0, 1, n)
    return x, true_function(x) + rng.normal(0, NOISE, n)


def poly_features(x, degree):
    """Columns 1, x, x^2, ..., x^degree. x is mapped to [-1, 1] to keep numbers sane."""
    z = 2 * x - 1
    return np.column_stack([z ** k for k in range(degree + 1)])


def fit_poly(x, y, degree, l2=0.0):
    """Least squares, optionally with an L2 (ridge) penalty on every weight except the constant."""
    A = poly_features(x, degree)
    penalty = l2 * np.eye(degree + 1)
    penalty[0, 0] = 0.0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y) if l2 > 0 else np.linalg.lstsq(A, y, rcond=None)[0]


def mse(x, y, w):
    return np.mean((poly_features(x, len(w) - 1) @ w - y) ** 2)


x_train, y_train = make_data(20)
x_val, y_val = make_data(500)


# %% 1. Training error keeps falling. Validation error does not.
print("degree   train MSE   val MSE")
for degree in [0, 1, 2, 3, 4, 5, 7, 9, 12, 15, 19]:
    w = fit_poly(x_train, y_train, degree)
    print(f"{degree:>6}   {mse(x_train, y_train, w):>9.4f}   {mse(x_val, y_val, w):>9.4g}")
print(f"(noise variance is {NOISE ** 2:.4f}: no model can beat that on new data)")
# Degree 19 with 20 points fits every training point exactly: training error ~ 0.
# It has memorized the noise. Its validation error is huge.


# %% 2. Picture it
grid = np.linspace(0, 1, 400)
fig, axes = plt.subplots(1, 3, figsize=(15, 4), sharey=True)
for ax, degree, label in zip(axes, [1, 4, 15], ["underfit", "good fit", "overfit"]):
    w = fit_poly(x_train, y_train, degree)
    ax.plot(grid, true_function(grid), color="#8a9a5b", linewidth=2, label="truth")
    ax.plot(grid, poly_features(grid, degree) @ w, color="#c8553d", label=f"degree {degree}")
    ax.scatter(x_train, y_train, color="#2b2d42", s=20, zorder=3, label="training data")
    ax.set_ylim(-2, 2)
    ax.set_title(f"degree {degree}: {label}")
    ax.legend(loc="lower left")
fig.tight_layout()
fig.savefig(OUT / "overfitting_polynomials.png", dpi=120)
print("\nsaved overfitting_polynomials.png")


# %% 3. Regularization tames the degree 15 model
print("\ndegree 15 with L2 penalty:")
print("   lambda   train MSE   val MSE   size of weights")
for l2 in [0.0, 1e-6, 1e-4, 1e-2, 1e-1, 1.0, 10.0]:
    w = fit_poly(x_train, y_train, 15, l2=l2)
    print(f"{l2:>9g}   {mse(x_train, y_train, w):>9.4f}   {mse(x_val, y_val, w):>9.4g}   {np.abs(w).sum():>12.4g}")
# Too little penalty: overfits. Too much: underfits (weights forced near zero, a flat line).
# The right lambda is chosen on VALIDATION data. It is a hyperparameter.


# %% 4. Learning curve: more data shrinks the gap
print("\ndegree 9 model, growing training set:")
print("  n_train   train MSE   val MSE")
for n in [12, 20, 50, 100, 500, 2000]:
    xs, ys = make_data(n)
    w = fit_poly(xs, ys, 9)
    print(f"  {n:>7}   {mse(xs, ys, w):>9.4f}   {mse(x_val, y_val, w):>9.4g}")
# With enough data, even a flexible model cannot memorize, so it is forced to learn the pattern.


# %% 5. Bias and variance, measured directly
# Train each model on 200 DIFFERENT training sets and look at its prediction at x = 0.75.
x0 = np.array([0.75])
print(f"\nprediction at x=0.75 across 200 training sets (truth = {true_function(0.75):.3f}):")
print("  degree   average prediction   bias^2    variance")
for degree in [1, 3, 9]:
    preds = []
    for _ in range(200):
        xs, ys = make_data(20)
        w = fit_poly(xs, ys, degree)
        preds.append((poly_features(x0, degree) @ w)[0])
    preds = np.array(preds)
    bias_sq = (preds.mean() - true_function(0.75)) ** 2
    print(f"  {degree:>6}   {preds.mean():>18.3f}   {bias_sq:>6.3f}   {preds.var():>9.3f}")
# Degree 1: consistently wrong (high bias, low variance).
# Degree 9: right on average but jumps around between training sets (low bias, high variance).
# Degree 3: both small. That is the sweet spot.
# Try degree 12: the variance explodes. Each training set produces a wildly different curve.

plt.show()

# %% Your turn
# 1. Change NOISE to 0.05 and rerun. Which degree is best now? Why does less noise allow
#    a more flexible model?
# 2. Use 100 training points instead of 20 in section 1. How does the table change?
