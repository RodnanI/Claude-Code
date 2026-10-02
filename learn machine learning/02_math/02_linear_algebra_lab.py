"""
Linear algebra lab. Read 01_linear_algebra.md first.

Run it:  python 02_linear_algebra_lab.py
"""

import time
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(0)
np.set_printoptions(precision=3, suppress=True)


# %% 1. Dot product by hand vs NumPy
def dot(a, b):
    assert len(a) == len(b), "vectors must have the same length"
    return sum(x * y for x, y in zip(a, b))


a, b = [1, 2, 3], [4, 5, 6]
print("dot by hand:", dot(a, b), "| numpy:", np.array(a) @ np.array(b))


# %% 2. Matrix multiplication by hand: every output cell is a dot product
def matmul(A, B):
    n, d = len(A), len(A[0])
    d2, k = len(B), len(B[0])
    assert d == d2, f"shape mismatch: ({n},{d}) @ ({d2},{k})"
    columns_of_B = [[B[r][c] for r in range(d2)] for c in range(k)]
    return [[dot(A[i], columns_of_B[j]) for j in range(k)] for i in range(n)]


A = rng.normal(size=(120, 80))
B = rng.normal(size=(80, 60))
start = time.perf_counter()
C_slow = matmul(A.tolist(), B.tolist())
slow = time.perf_counter() - start
start = time.perf_counter()
C_fast = A @ B
fast = time.perf_counter() - start
print(f"matmul by hand {slow * 1000:.0f} ms, numpy {fast * 1000:.2f} ms, "
      f"same result: {np.allclose(C_slow, C_fast)}")


# %% 3. Cosine similarity with hand-made "embeddings"
# Pretend each word is described by 4 numbers: [animal, food, big, cute].
# Real embeddings have hundreds of dimensions learned from data, but the geometry is the same.
words = {
    "kitten": np.array([0.9, 0.0, 0.1, 0.95]),
    "puppy":  np.array([0.9, 0.0, 0.2, 0.9]),
    "whale":  np.array([0.9, 0.1, 1.0, 0.3]),
    "pizza":  np.array([0.0, 1.0, 0.3, 0.1]),
    "cupcake": np.array([0.0, 0.9, 0.1, 0.8]),
}


def cosine(u, v):
    return u @ v / (np.linalg.norm(u) * np.linalg.norm(v))


print("\ncosine similarity:")
names = list(words)
for i, w1 in enumerate(names):
    for w2 in names[i + 1:]:
        print(f"  {w1:<8} {w2:<8} {cosine(words[w1], words[w2]):.2f}")
# kitten-puppy is near 1. kitten-cupcake is moderate (both cute). kitten-pizza is low.


# %% 4. A matrix is a transformation
square = np.array([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], dtype=float)  # corners, rows = points
angle = np.radians(30)
rotate = np.array([[np.cos(angle), -np.sin(angle)],
                   [np.sin(angle),  np.cos(angle)]])
stretch = np.array([[2.0, 0.0],
                    [0.0, 0.5]])
shear = np.array([[1.0, 0.8],
                  [0.0, 1.0]])
fig, ax = plt.subplots(figsize=(6, 5))
for M, name, color in [(np.eye(2), "original", "#2b2d42"), (rotate, "rotate 30", "#c8553d"),
                       (stretch, "stretch", "#2a9d8f"), (shear, "shear", "#e9c46a")]:
    moved = square @ M.T          # rows are points, so multiply by the transpose
    ax.plot(moved[:, 0], moved[:, 1], marker="o", label=name, color=color)
ax.set_aspect("equal")
ax.legend()
ax.set_title("Matrices move points")
fig.savefig(OUT / "linalg_transformations.png", dpi=120)
print("\nsaved linalg_transformations.png")


# %% 5. Linear regression with the normal equation
# Make data where we KNOW the true answer, then check we can recover it.
n = 200
X = rng.normal(size=(n, 3))
true_w = np.array([3.0, -2.0, 0.5])
true_b = 4.0
y = X @ true_w + true_b + rng.normal(0, 0.3, size=n)   # add noise, like real life

X1 = np.column_stack([X, np.ones(n)])       # a column of ones lets the bias be learned as a weight
w_normal = np.linalg.inv(X1.T @ X1) @ X1.T @ y              # textbook formula
w_lstsq, *_ = np.linalg.lstsq(X1, y, rcond=None)              # what you should actually use
print("\ntrue weights + bias:   ", np.append(true_w, true_b))
print("normal equation:       ", w_normal)
print("lstsq:                 ", w_lstsq)
# Close but not exact: noise means we can only estimate the truth. More data -> closer.


# %% 6. Rank and redundant features
X_redundant = np.column_stack([X, 2 * X[:, 0]])   # 4th column = 2 x 1st column
print("\nrank of X:", np.linalg.matrix_rank(X), "of", X.shape[1], "columns")
print("rank with redundant column:", np.linalg.matrix_rank(X_redundant), "of", X_redundant.shape[1])
print(f"condition number: {np.linalg.cond(X):.1f} vs {np.linalg.cond(X_redundant):.1e}")
# A huge condition number means "numerically unstable": tiny data changes cause huge weight changes.


# %% 7. Eigenvectors of a covariance matrix = directions of most variation (PCA preview)
cov_true = np.array([[3.0, 1.8],
                     [1.8, 1.5]])
data = rng.multivariate_normal([0, 0], cov_true, size=500)
C = np.cov(data, rowvar=False)               # 2x2 covariance estimated from data
eigenvalues, eigenvectors = np.linalg.eigh(C)   # eigh: for symmetric matrices, ascending order
order = np.argsort(eigenvalues)[::-1]
eigenvalues, eigenvectors = eigenvalues[order], eigenvectors[:, order]
print("\neigenvalues (variance along each direction):", eigenvalues)
print("share of variance in first direction:", f"{eigenvalues[0] / eigenvalues.sum():.0%}")
fig, ax = plt.subplots(figsize=(5, 5))
ax.scatter(data[:, 0], data[:, 1], s=6, alpha=0.4, color="#8a9a5b")
for value, vec, color in zip(eigenvalues, eigenvectors.T, ["#c8553d", "#2b2d42"]):
    ax.arrow(0, 0, *(vec * 2 * np.sqrt(value)), width=0.05, color=color)
ax.set_aspect("equal")
ax.set_title("Eigenvectors point along the spread")
fig.savefig(OUT / "linalg_eigenvectors.png", dpi=120)
print("saved linalg_eigenvectors.png")


# %% 8. SVD: compress a matrix by keeping its most important directions
size = 64
yy, xx = np.mgrid[0:size, 0:size] / size
image = (np.sin(6 * xx) * np.cos(4 * yy) + ((xx - 0.5) ** 2 + (yy - 0.5) ** 2 < 0.08)
         + 0.1 * rng.normal(size=(size, size)))
U, S, Vt = np.linalg.svd(image, full_matrices=False)
fig, axes = plt.subplots(1, 4, figsize=(12, 3))
for ax, rank in zip(axes, [1, 3, 10, size]):
    approx = U[:, :rank] @ np.diag(S[:rank]) @ Vt[:rank]
    error = np.linalg.norm(image - approx) / np.linalg.norm(image)
    numbers_stored = rank * (2 * size + 1)
    ax.imshow(approx, cmap="copper")
    ax.set_title(f"rank {rank}: {numbers_stored} numbers\nerror {error:.0%}")
    ax.axis("off")
    print(f"rank {rank:>2}: stores {numbers_stored:>5} numbers instead of {size * size}, relative error {error:.1%}")
fig.tight_layout()
fig.savefig(OUT / "linalg_svd_compression.png", dpi=120)
print("saved linalg_svd_compression.png")
# A few singular values hold most of the structure. The rest is mostly noise.
# Full rank (64) stores MORE numbers than the original: low rank only pays off when rank is small.
# LoRA (module 7) uses the same idea: a weight UPDATE of size 4096x4096 is stored as
# two thin matrices 4096xr and rx4096 with r around 8 or 16.

plt.show()
