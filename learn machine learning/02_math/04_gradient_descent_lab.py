"""
Gradient descent lab. Read 03_calculus_and_gradient_descent.md first.

Run it:  python 04_gradient_descent_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)


# %% 1. Numerical derivatives: the definition, in code
def f(x):
    return x ** 2 - 4 * x + 5          # a bowl with its bottom at x = 2


def f_prime(x):
    return 2 * x - 4                   # derivative from the power rule


def numerical_derivative(func, x, h=1e-5):
    return (func(x + h) - func(x - h)) / (2 * h)    # "central difference": more accurate than one side


for x in [0.0, 2.0, 5.0]:
    print(f"x={x}: exact {f_prime(x):+.4f}  numerical {numerical_derivative(f, x):+.4f}")
# Numerical derivatives are how you CHECK gradient code ("gradient checking").
# They are too slow to train with: one extra function call per parameter.


# %% 2. Chain rule check: y = sin(x^2), dy/dx = cos(x^2) * 2x
x = 1.3
exact = np.cos(x ** 2) * 2 * x
numeric = numerical_derivative(lambda t: np.sin(t ** 2), x)
print(f"\nchain rule: exact {exact:.6f}, numerical {numeric:.6f}")


# %% 3. Gradient descent in 1D, with four learning rates
def gradient_descent_1d(start, learning_rate, steps=25):
    x = start
    path = [x]
    for _ in range(steps):
        x = x - learning_rate * f_prime(x)
        path.append(x)
    return np.array(path)


print("\nminimize f(x) = x^2 - 4x + 5 starting at x = 8 (answer: x = 2)")
paths = {}
for lr in [0.01, 0.3, 0.95, 1.05]:
    path = gradient_descent_1d(8.0, lr)
    paths[lr] = path
    print(f"  lr={lr:<5} final x = {path[-1]:>12.4f}   f(x) = {f(path[-1]):>12.4f}")
# 0.01: too small, still far away after 25 steps
# 0.3:  converges quickly
# 0.95: overshoots back and forth, slowly settles
# 1.05: each step overshoots more than the last. Diverges.

fig, axes = plt.subplots(1, 4, figsize=(15, 3.5), sharey=False)
grid = np.linspace(-6, 10, 200)
for ax, (lr, path) in zip(axes, paths.items()):
    shown = path[np.abs(path) < 12]
    ax.plot(grid, f(grid), color="#2b2d42", linewidth=1)
    ax.plot(shown, f(shown), marker="o", markersize=4, color="#c8553d", linewidth=0.8)
    ax.set_title(f"learning rate {lr}")
    ax.set_ylim(-2, 70)
fig.tight_layout()
fig.savefig(OUT / "gd_learning_rates.png", dpi=120)
print("saved gd_learning_rates.png")


# %% 4. Gradient descent in 2D
# L(w1, w2) = (w1 - 3)^2 + 10 * (w2 + 1)^2. The minimum is at (3, -1).
# The factor 10 makes the valley narrow in one direction, like badly scaled features.
def loss2d(w):
    return (w[0] - 3) ** 2 + 10 * (w[1] + 1) ** 2


def grad2d(w):
    return np.array([2 * (w[0] - 3), 20 * (w[1] + 1)])    # partial derivatives


def run(lr, steps=60):
    w = np.array([-4.0, 2.0])
    history = [w.copy()]
    for _ in range(steps):
        w = w - lr * grad2d(w)
        history.append(w.copy())
    return np.array(history)


fig, ax = plt.subplots(figsize=(7, 5))
w1, w2 = np.meshgrid(np.linspace(-5, 6, 200), np.linspace(-3, 3, 200))
ax.contour(w1, w2, (w1 - 3) ** 2 + 10 * (w2 + 1) ** 2, levels=25, cmap="copper", linewidths=0.6)
for lr, color in [(0.02, "#2a9d8f"), (0.09, "#c8553d")]:
    hist = run(lr)
    ax.plot(hist[:, 0], hist[:, 1], marker=".", color=color, label=f"lr={lr}, final loss {loss2d(hist[-1]):.4f}")
    print(f"\n2D lr={lr}: ended at {hist[-1].round(3)} with loss {loss2d(hist[-1]):.5f}")
ax.plot(3, -1, marker="*", markersize=15, color="#2b2d42")
ax.legend()
ax.set_title("Zig-zag across a narrow valley")
fig.savefig(OUT / "gd_2d_path.png", dpi=120)
print("saved gd_2d_path.png")
# The small learning rate is safe in the steep direction but crawls along the shallow one.
# The bigger one zig-zags across the steep direction. Try lr=0.11: it diverges, because the
# STEEPEST direction sets the speed limit for every direction. This is exactly why we SCALE
# features (module 3) and why optimizers like momentum and Adam exist (module 6).


# %% 5. Stochastic gradient descent: noisy steps still get there
# Find the number w that minimizes the average squared distance to a dataset.
# Calculus says the answer is the mean. Let's see SGD discover that, one example at a time.
rng = np.random.default_rng(0)
data = rng.normal(loc=7.0, scale=2.0, size=1000)
w = 0.0
lr = 0.01
for epoch in range(3):
    for x_i in rng.permutation(data):
        gradient = 2 * (w - x_i)            # derivative of (w - x_i)^2 for ONE example
        w -= lr * gradient
    print(f"epoch {epoch + 1}: w = {w:.3f}")
print(f"true mean of the data: {data.mean():.3f}")
# SGD wanders around the answer because each step uses one noisy example.
# Smaller learning rates or bigger batches reduce the wandering.

plt.show()
