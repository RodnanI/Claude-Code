"""
k-Nearest Neighbors (kNN), from scratch.

The simplest real classifier: to label a new point, find the k most similar training
points and let them vote. No training at all, the model IS the data.

Why it matters beyond itself: vector search in RAG systems (module 7) is nearest-neighbor
search over embeddings. Same idea, billions of points, clever indexes.

Run it:  python 01_knn_lab.py
"""

import numpy as np
from sklearn.datasets import load_wine
from sklearn.neighbors import KNeighborsClassifier

rng = np.random.default_rng(0)


# %% 1. Data: 178 wines, 13 chemical measurements, 3 grape varieties
wine = load_wine()
X, y = wine.data, wine.target
print("features:", wine.feature_names)
print("std of each feature:", ", ".join(f"{name[:12]}={sd:.2f}" for name, sd in zip(wine.feature_names, X.std(axis=0))))
# Look at the scales: 'proline' varies by hundreds, 'hue' by about 0.2.
# Distances will be dominated by proline unless we scale. Keep that in mind.

idx = rng.permutation(len(y))
train, val = idx[:120], idx[120:]
X_train, X_val, y_train, y_val = X[train], X[val], y[train], y[val]


# %% 2. The algorithm
class KNNClassifier:
    def __init__(self, k=5):
        self.k = k

    def fit(self, X, y):
        self.X_, self.y_ = X, y          # "training" = remembering the data
        return self

    def predict(self, X):
        # All pairwise squared distances at once with broadcasting:
        # (n_test, 1, d) - (1, n_train, d) -> (n_test, n_train, d) -> sum over d -> (n_test, n_train)
        distances = ((X[:, None, :] - self.X_[None, :, :]) ** 2).sum(axis=2)
        nearest = np.argsort(distances, axis=1)[:, : self.k]        # indices of the k closest
        neighbor_labels = self.y_[nearest]                          # (n_test, k)
        # majority vote per row
        return np.array([np.bincount(row).argmax() for row in neighbor_labels])


def accuracy(a, b):
    return np.mean(a == b)


# %% 3. Without scaling vs with scaling
raw = KNNClassifier(k=5).fit(X_train, y_train)
print(f"\nk=5, raw features:          val accuracy {accuracy(raw.predict(X_val), y_val):.3f}")

mean, std = X_train.mean(axis=0), X_train.std(axis=0)
X_train_s, X_val_s = (X_train - mean) / std, (X_val - mean) / std
scaled = KNNClassifier(k=5).fit(X_train_s, y_train)
print(f"k=5, standardized features: val accuracy {accuracy(scaled.predict(X_val_s), y_val):.3f}")
# Any algorithm based on distances (kNN, k-means, SVMs with RBF kernels, PCA) needs scaling.
# Tree-based models do not care about scale. Know which is which.


# %% 4. Choosing k: small k overfits, large k underfits
print("\n  k   train acc   val acc")
for k in [1, 3, 5, 9, 15, 31, 61, 119]:
    m = KNNClassifier(k=k).fit(X_train_s, y_train)
    print(f"{k:>3}   {accuracy(m.predict(X_train_s), y_train):>9.3f}   {accuracy(m.predict(X_val_s), y_val):>7.3f}")
# k=1: each training point is its own nearest neighbor -> 100% train accuracy (memorized).
# k=119: every prediction is the majority class of the whole training set -> underfit.


# %% 5. Check against scikit-learn
sk = KNeighborsClassifier(n_neighbors=5).fit(X_train_s, y_train)
same = np.mean(sk.predict(X_val_s) == scaled.predict(X_val_s))
print(f"\nagreement with scikit-learn: {same:.0%}")


# %% 6. The curse of dimensionality
# In high dimensions, random points are all roughly the same distance apart, so "nearest"
# loses meaning. Watch the ratio between the nearest and farthest distance approach 1.
print("\ndims   nearest/farthest distance ratio (random points)")
for d in [2, 10, 100, 1000, 10000]:
    points = rng.random((500, d))
    query = rng.random(d)
    dist = np.sqrt(((points - query) ** 2).sum(axis=1))
    print(f"{d:>5}   {dist.min() / dist.max():.3f}")
# This is why kNN on raw high-dimensional data (like pixels) works poorly, and why we first
# map data into a learned, meaningful lower-dimensional space (embeddings) before searching.


# %% Notes for your career
# - kNN does no work at training time and all of it at prediction time: predicting needs a
#   distance to EVERY training point. Fine for thousands of points, hopeless for billions.
# - Vector databases (FAISS, pgvector, Pinecone, Weaviate, Qdrant...) solve this with
#   Approximate Nearest Neighbor (ANN) indexes like HNSW: slightly inexact, massively faster.
# - kNN is a decent baseline and a great tool for "find similar items" features.

# %% Your turn
# 1. Use distance-weighted voting: closer neighbors count more (weight = 1 / distance).
# 2. Try Manhattan distance (sum of absolute differences). Does accuracy change?
# 3. Standardize using the mean and std of ALL data instead of train only. Does the
#    validation accuracy change? Why is it still wrong even if it does not?
