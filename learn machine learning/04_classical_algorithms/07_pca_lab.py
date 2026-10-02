"""
PCA (principal component analysis), from scratch.

PCA finds the directions in which data varies most and describes each point using only
the few most important ones. It is used to visualize high-dimensional data in 2D, compress
features, remove noise and speed up other models.

The directions are eigenvectors of the covariance matrix (module 2), and libraries compute
them with SVD.

Run it:  python 07_pca_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)


# %% 1. Data: 1,797 handwritten digits, each an 8x8 image = 64 features
digits = load_digits()
X, y = digits.data, digits.target
print("data shape:", X.shape)


# %% 2. PCA in five lines
X_centered = X - X.mean(axis=0)                       # 1. center every feature at 0
cov = X_centered.T @ X_centered / (len(X) - 1)        # 2. covariance matrix (64 x 64)
eigenvalues, eigenvectors = np.linalg.eigh(cov)       # 3. eigen-decomposition (ascending order)
order = np.argsort(eigenvalues)[::-1]                 # 4. sort by variance, largest first
eigenvalues, components = eigenvalues[order], eigenvectors[:, order]
X_2d = X_centered @ components[:, :2]                 # 5. project onto the top 2 directions

explained = eigenvalues / eigenvalues.sum()
print("variance explained by the first 5 components:", explained[:5].round(3))
for target in [0.5, 0.8, 0.9, 0.95, 0.99]:
    k = int(np.searchsorted(np.cumsum(explained), target)) + 1
    print(f"  {target:.0%} of the variance needs {k:>2} of 64 components")


# %% 3. Check against scikit-learn (which uses SVD, more stable and faster)
sk = PCA(n_components=10).fit(X)
print("\nscikit-learn explained variance ratio:", sk.explained_variance_ratio_[:5].round(3))
# Component signs can differ (v and -v are the same direction), so compare variances, not vectors.


# %% 4. Reconstruction: compress, then decompress
fig, axes = plt.subplots(2, 6, figsize=(12, 4.5))
for col, k in enumerate([1, 5, 10, 20, 40, 64]):
    codes = X_centered @ components[:, :k]                         # 64 numbers -> k numbers
    rebuilt = codes @ components[:, :k].T + X.mean(axis=0)         # k numbers -> 64 numbers
    error = np.mean((X - rebuilt) ** 2)
    for row, i in enumerate([0, 7]):
        axes[row, col].imshow(rebuilt[i].reshape(8, 8), cmap="Greys")
        axes[row, col].axis("off")
    axes[0, col].set_title(f"{k} comps\nMSE {error:.1f}")
fig.suptitle("Digits rebuilt from k principal components")
fig.tight_layout()
fig.savefig(OUT / "pca_reconstruction.png", dpi=120)
print("\nsaved pca_reconstruction.png")


# %% 5. Visualize 64 dimensions in 2
palette = ["#c8553d", "#2a9d8f", "#e9c46a", "#2b2d42", "#8a9a5b",
           "#d4a5a5", "#6b4226", "#f4a261", "#3d5a40", "#9c6644"]
fig, ax = plt.subplots(figsize=(7, 6))
for digit in range(10):
    pts = X_2d[y == digit]
    ax.scatter(pts[:, 0], pts[:, 1], s=8, color=palette[digit], label=str(digit), alpha=0.7)
ax.legend(markerscale=2, ncol=2)
ax.set(xlabel="principal component 1", ylabel="principal component 2",
       title="Digits projected to 2D. PCA never saw the labels")
fig.savefig(OUT / "pca_digits_2d.png", dpi=120)
print("saved pca_digits_2d.png")
# Some digits separate nicely (0, 4, 6), others overlap. 2 components keep only about 29% of the
# variance. Non-linear methods (t-SNE, UMAP) often separate clusters better for visualization,
# but their distances and cluster sizes are not meaningful. Do not over-interpret them.


# %% 6. The first components as images: what directions did PCA find?
fig, axes = plt.subplots(1, 5, figsize=(10, 2.5))
for i, ax in enumerate(axes):
    ax.imshow(components[:, i].reshape(8, 8), cmap="copper")
    ax.set_title(f"component {i + 1}")
    ax.axis("off")
fig.tight_layout()
fig.savefig(OUT / "pca_components.png", dpi=120)
print("saved pca_components.png")

plt.show()

# %% Notes
# - Scale features before PCA if they have different units, or the largest-unit feature
#   dominates the first component (pixels here share a unit, so we skip it).
# - Fit PCA on TRAINING data only, then transform validation and test. It is preprocessing
#   that learns from data, so it belongs inside a pipeline (leakage lesson).
# - Embeddings from LLMs have hundreds or thousands of dimensions. PCA is a quick way to
#   look at them in 2D or to shrink them before storage.

# %% Your turn
# 1. Train a logistic regression on the raw 64 features and on 10 PCA components. Compare
#    accuracy and training time.
# 2. Add random noise to the images, keep 15 components, reconstruct. Is the noise reduced?
