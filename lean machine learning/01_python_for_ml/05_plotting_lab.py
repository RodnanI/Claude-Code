"""
Plotting with matplotlib.

You plot to understand data and to debug training. A loss curve tells you more
in two seconds than a table of numbers does in two minutes.

Run it:  python 05_plotting_lab.py
Plots are saved to outputs/ next to this file. If a window opens, close it to continue.
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(0)

# A small custom palette used across the course. Default colors are fine too.
INK, RUST, TEAL, MUSTARD, SAGE = "#2b2d42", "#c8553d", "#2a9d8f", "#e9c46a", "#8a9a5b"

# %% The pattern you will reuse everywhere:
#   fig, ax = plt.subplots()   -> a figure and an "axes" (one plot area)
#   ax.plot / ax.scatter / ax.hist ...
#   ax.set_xlabel, ax.set_title, ax.legend
#   fig.savefig(...)

# %% 1. Line plot: a fake training loss curve
epochs = np.arange(1, 51)
train_loss = 2.0 * np.exp(-epochs / 10) + 0.1 + rng.normal(0, 0.02, 50)
val_loss = 2.0 * np.exp(-epochs / 10) + 0.15 + 0.004 * np.maximum(epochs - 25, 0) ** 1.5 + rng.normal(0, 0.03, 50)

fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(epochs, train_loss, color=TEAL, label="train loss")
ax.plot(epochs, val_loss, color=RUST, label="validation loss")
best = epochs[np.argmin(val_loss)]
ax.axvline(best, color=INK, linestyle="--", linewidth=1, label=f"best epoch ({best})")
ax.set_xlabel("epoch")
ax.set_ylabel("loss")
ax.set_title("Validation loss turns up = overfitting starts")
ax.legend()
fig.tight_layout()
fig.savefig(OUT / "01_loss_curve.png", dpi=120)
print("saved 01_loss_curve.png")
# Reading it: training loss keeps falling, validation loss falls then rises.
# After the turning point the model memorizes training data instead of learning patterns.


# %% 2. Scatter plot: two features, colored by class
n = 100
class_a = rng.normal([2, 2], 0.8, size=(n, 2))
class_b = rng.normal([4, 4], 0.8, size=(n, 2))
fig, ax = plt.subplots(figsize=(5, 5))
ax.scatter(class_a[:, 0], class_a[:, 1], color=TEAL, alpha=0.7, label="class A", edgecolor="white")
ax.scatter(class_b[:, 0], class_b[:, 1], color=RUST, alpha=0.7, label="class B", edgecolor="white")
ax.set_xlabel("feature 1")
ax.set_ylabel("feature 2")
ax.set_title("Can a straight line separate them?")
ax.legend()
fig.tight_layout()
fig.savefig(OUT / "02_scatter.png", dpi=120)
print("saved 02_scatter.png")


# %% 3. Histogram: the shape of a distribution
incomes = rng.lognormal(mean=10.5, sigma=0.6, size=5000)   # skewed, like real incomes
fig, axes = plt.subplots(1, 2, figsize=(10, 4))             # two plots side by side
axes[0].hist(incomes, bins=60, color=MUSTARD, edgecolor=INK, linewidth=0.3)
axes[0].set_title("income: long right tail")
axes[1].hist(np.log(incomes), bins=60, color=SAGE, edgecolor=INK, linewidth=0.3)
axes[1].set_title("log(income): bell shaped")
for ax in axes:
    ax.set_ylabel("count")
fig.tight_layout()
fig.savefig(OUT / "03_histograms.png", dpi=120)
print("saved 03_histograms.png")
# Lesson: skewed features often behave better after a log transform.
# Mean income here is above the median, because the tail pulls it up:
print(f"mean income {incomes.mean():,.0f} vs median {np.median(incomes):,.0f}")


# %% 4. Bar chart: comparing models
models = ["baseline", "logistic", "random forest", "boosting"]
scores = [0.62, 0.81, 0.86, 0.88]
fig, ax = plt.subplots(figsize=(6, 3.5))
bars = ax.barh(models, scores, color=[INK, TEAL, SAGE, RUST])
ax.bar_label(bars, labels=[f"{s:.2f}" for s in scores], padding=3)
ax.set_xlim(0, 1)
ax.set_xlabel("accuracy")
ax.set_title("Always show the baseline")
fig.tight_layout()
fig.savefig(OUT / "04_model_comparison.png", dpi=120)
print("saved 04_model_comparison.png")


# %% 5. Image: arrays ARE images
image = np.zeros((8, 8))
image[1:7, 3:5] = 1.0        # a crude "1"
fig, ax = plt.subplots(figsize=(3, 3))
ax.imshow(image, cmap="Greys")
ax.set_title("an 8x8 array")
fig.savefig(OUT / "05_image.png", dpi=120)
print("saved 05_image.png")

plt.show()   # opens windows if your setup supports it. Harmless otherwise.

# %% Your turn
# 1. Plot y = x**2 and y = 2**x for x from 0 to 6 on the same axes. Which grows faster?
# 2. Make a 2x2 grid of histograms of rng.normal with scale 0.5, 1, 2 and 4. Share the x axis
#    (plt.subplots(2, 2, sharex=True)).
# 3. Add a title to every plot that states the conclusion, not just the topic.
#    "Validation loss turns up at epoch 25" beats "Loss curve". Managers read titles only.
