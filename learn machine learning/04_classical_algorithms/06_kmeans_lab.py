"""
k-means clustering, from scratch. Unsupervised learning: no labels at all.

Goal: split data into k groups so that points in a group are close to the group's center.
Uses in industry: customer segmentation, grouping documents or support tickets by topic,
compressing colors in images, building vocabularies of "visual words", and choosing
diverse examples from huge datasets.

Run it:  python 06_kmeans_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from sklearn.cluster import KMeans
from sklearn.datasets import make_moons

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(4)
COLORS = np.array(["#c8553d", "#2a9d8f", "#e9c46a", "#2b2d42", "#8a9a5b", "#d4a5a5"])


# %% 1. Data: customers described by (annual spend in thousands, visits per month)
centers = np.array([[2, 2], [8, 3], [5, 8], [9, 9]])
X = np.vstack([rng.normal(c, 0.9, size=(120, 2)) for c in centers])
print("data shape:", X.shape, "(no labels: we only have the features)")


# %% 2. The algorithm (Lloyd's algorithm)
def kmeans(X, k, n_iters=100, seed=0):
    r = np.random.default_rng(seed)
    centroids = X[r.choice(len(X), k, replace=False)]          # 1. start at k random points
    for it in range(n_iters):
        # 2. ASSIGN each point to its nearest centroid
        distances = ((X[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)   # (n, k)
        labels = distances.argmin(axis=1)
        # 3. UPDATE each centroid to the mean of its points (keep it if a cluster is empty)
        new_centroids = np.array([X[labels == j].mean(axis=0) if np.any(labels == j) else centroids[j]
                                  for j in range(k)])
        if np.allclose(new_centroids, centroids):              # 4. stop when nothing moves
            break
        centroids = new_centroids
    inertia = ((X - centroids[labels]) ** 2).sum()            # total squared distance to centers
    return labels, centroids, inertia, it + 1


labels, centroids, inertia, iters = kmeans(X, k=4)
print(f"converged in {iters} iterations, inertia {inertia:.1f}")
print("centroids found:\n", centroids.round(2))


# %% 3. Bad starts: k-means only finds a LOCAL optimum
print("\nsame data, different random starts:")
for seed in range(6):
    _, _, inertia_s, _ = kmeans(X, k=4, seed=seed)
    print(f"  seed {seed}: inertia {inertia_s:.1f}")
# Some starts get stuck with two centroids in one blob and one centroid covering two blobs.
# Fixes used in practice: run several times and keep the best (sklearn's n_init), and smarter
# starting points (k-means++: pick initial centers far apart). sklearn does both by default.


# %% 4. Choosing k: the elbow method
print("\n k   inertia")
inertias = []
for k in range(1, 9):
    best = min(kmeans(X, k, seed=s)[2] for s in range(5))
    inertias.append(best)
    print(f"{k:>2}   {best:>8.1f}")
# Inertia always drops as k grows (k = n gives 0). Look for the "elbow" where adding
# clusters stops helping much: here at k = 4. In business, k is often chosen by what
# the marketing team can act on, not by a curve. Be honest about that.


# %% 5. scikit-learn
sk = KMeans(n_clusters=4, n_init=10, random_state=0).fit(X)
print(f"\nscikit-learn inertia: {sk.inertia_:.1f} (ours, best of 6 seeds: {min(kmeans(X, 4, seed=s)[2] for s in range(6)):.1f})")


# %% 6. Where k-means fails: non-round clusters
X_moons, _ = make_moons(n_samples=400, noise=0.06, random_state=0)
moon_labels, _, _, _ = kmeans(X_moons, k=2)
# k-means assumes round, similar-sized blobs (it splits space with straight lines between
# centroids). Two interleaved half-moons get cut in the wrong place.
# Density-based methods like DBSCAN or HDBSCAN handle such shapes and also flag outliers.

fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
axes[0].scatter(X[:, 0], X[:, 1], c=COLORS[labels], s=10)
axes[0].scatter(centroids[:, 0], centroids[:, 1], c="black", marker="X", s=150)
axes[0].set_title("k-means, k=4")
axes[1].plot(range(1, 9), inertias, marker="o", color="#2b2d42")
axes[1].set(title="elbow method", xlabel="k", ylabel="inertia")
axes[2].scatter(X_moons[:, 0], X_moons[:, 1], c=COLORS[moon_labels], s=10)
axes[2].set_title("k-means on moons: wrong cut")
fig.tight_layout()
fig.savefig(OUT / "kmeans.png", dpi=120)
print("\nsaved kmeans.png")

plt.show()

# %% Your turn
# 1. Scale matters here too: multiply the first feature by 100 and rerun. What happens?
# 2. Implement k-means++ initialization: pick the first center at random, then pick each next
#    center with probability proportional to its squared distance from the nearest chosen center.
# 3. Cluster the 64-pixel digit images (sklearn.datasets.load_digits) with k=10. How well do
#    clusters match the true digits? (Compare with the labels you did not use.)
