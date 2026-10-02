"""
NumPy, the base of numerical Python.

pandas, scikit-learn and (in spirit) PyTorch are built on the ideas in this file.
Learn shapes, axis and broadcasting here and the later modules become easier.

Run it:  python 03_numpy_lab.py
"""

import time

import numpy as np

np.set_printoptions(precision=3, suppress=True)   # nicer printing


# %% 1. Why NumPy exists: speed
numbers = list(range(1_000_000))
start = time.perf_counter()
total_loop = sum(n * n for n in numbers)
loop_ms = (time.perf_counter() - start) * 1000

arr = np.arange(1_000_000, dtype=np.int64)
start = time.perf_counter()
total_np = int((arr * arr).sum())
np_ms = (time.perf_counter() - start) * 1000
print(f"python: {loop_ms:.1f} ms | numpy: {np_ms:.1f} ms | same answer: {total_loop == total_np}")
# NumPy runs the loop in compiled C code over a tight block of memory.
# Writing math on whole arrays instead of loops is called VECTORIZATION.
# Rule: if you write a Python for loop over the elements of an array, stop and look for the NumPy way.


# %% 2. Creating arrays
a = np.array([1.0, 2.0, 3.0])            # from a list
zeros = np.zeros((2, 3))                 # 2 rows, 3 columns of 0.0
ones = np.ones(4)
steps = np.arange(0, 10, 2)              # like range(): [0 2 4 6 8]
grid = np.linspace(0, 1, 5)              # 5 evenly spaced numbers from 0 to 1
rng = np.random.default_rng(seed=0)      # THE way to make random numbers. Always pass a seed.
noise = rng.normal(loc=0.0, scale=1.0, size=(3, 2))   # bell curve numbers
dice = rng.integers(1, 7, size=10)       # integers 1..6
print("linspace:", grid)
print("dice:", dice)


# %% 3. Shape, the attribute you check most in ML
# A dataset is a 2D array: one ROW per example, one COLUMN per feature.
# 5 houses, 3 features each: size (m2), bedrooms, age (years)
X = np.array([
    [ 70, 2, 30],
    [120, 4,  5],
    [ 55, 1, 50],
    [ 90, 3, 12],
    [150, 5,  2],
], dtype=float)
print("shape:", X.shape, "| ndim:", X.ndim, "| size:", X.size, "| dtype:", X.dtype)
n_samples, n_features = X.shape          # unpacking, as in the Python lesson


# %% 4. Indexing and slicing in 2D:  X[rows, columns]
print("first house:        ", X[0])          # row 0
print("all sizes:          ", X[:, 0])       # every row, column 0
print("houses 1-2, cols 0-1:\n", X[1:3, :2])
print("last column:        ", X[:, -1])
print("rows 0 and 4:\n", X[[0, 4]])         # "fancy indexing" with a list of indices

# Boolean masks: the cleanest way to filter
big = X[:, 0] > 80                       # array of True/False, one per row
print("is big:", big)
print("big houses:\n", X[big])
print("how many big:", big.sum())        # True counts as 1. Counting with sum is everywhere in ML.


# %% 5. Math and the axis argument
# Elementwise math happens on every number at once:
print("sizes in square feet:", X[:, 0] * 10.764)

# Aggregations collapse an axis:
#
#            axis=1 (across columns, one result per ROW)
#            ------>
#   axis=0 | [[ 70, 2, 30],
#   (down  | [120, 4,  5],
#   rows,  | ...
#   one result per COLUMN)
#          v
print("mean of each column (axis=0):", X.mean(axis=0))   # shape (3,)
print("sum of each row     (axis=1):", X.sum(axis=1))    # shape (5,)
print("overall max:", X.max())
# To remember: axis=0 means "the 0th dimension disappears". (5, 3) -> (3,)


# %% 6. Broadcasting: arrays of different shapes working together
# Standardization: make every column have mean 0 and standard deviation 1.
# Many models train badly when features have wildly different scales (size ~100, bedrooms ~3).
mean = X.mean(axis=0)     # shape (3,)
std = X.std(axis=0)       # shape (3,)
X_std = (X - mean) / std  # (5, 3) - (3,) works: the (3,) row is "stretched" over all 5 rows
print("standardized:\n", X_std)
print("column means now:", X_std.mean(axis=0).round(6), "| stds:", X_std.std(axis=0))

# Broadcasting rules: compare shapes from the RIGHT. Dimensions match if they are
# equal or one of them is 1. (5,3) with (3,) -> ok. (5,3) with (5,) -> ERROR.
# To subtract a per-row value you need shape (5, 1):
row_means = X.mean(axis=1, keepdims=True)    # shape (5, 1) instead of (5,)
print("row-centered shape:", (X - row_means).shape)
try:
    X - X.mean(axis=1)                       # (5,3) - (5,) fails
except ValueError as e:
    print("expected error:", e)


# %% 7. Reshaping and combining
v = np.arange(12)
M = v.reshape(3, 4)            # same 12 numbers, now 3x4
print("reshaped:\n", M)
print("reshape(-1, 6):", v.reshape(-1, 6).shape)    # -1 = "figure it out"
print("as a column:", v[:, None].shape)             # None (np.newaxis) adds an axis: (12,) -> (12, 1)
print("transpose shape:", M.T.shape)
print("stack rows:\n", np.vstack([M[0], M[2]]))
print("concatenate columns:", np.concatenate([M, M], axis=1).shape)


# %% 8. Matrix multiplication: the operation that runs all of deep learning
# A linear model predicts price = 2*size + 10*bedrooms - 1*age + 50
w = np.array([2.0, 10.0, -1.0])
b = 50.0
predictions = X @ w + b        # (5,3) @ (3,) -> (5,)  one prediction per house
print("predictions:", predictions)
# Rule: (n, d) @ (d, k) -> (n, k). The inner numbers must match.
W = rng.normal(size=(3, 4))    # a "layer" turning 3 features into 4
print("(5,3) @ (3,4) ->", (X @ W).shape)
# * is ELEMENTWISE, @ is matrix multiplication. Mixing them up is a classic bug.
print("elementwise:", np.array([1, 2, 3]) * np.array([4, 5, 6]),
      "| dot:", np.array([1, 2, 3]) @ np.array([4, 5, 6]))


# %% 9. Functions you will use every day
scores = np.array([0.1, 0.7, 0.2])
print("argmax (index of biggest):", scores.argmax())          # predicted class
print("argsort (descending):", np.argsort(-scores))           # ranking
print("where:", np.where(scores > 0.15, "yes", "no"))
labels = np.array(["cat", "dog", "cat", "bird", "cat"])
values, counts = np.unique(labels, return_counts=True)
print("unique:", dict(zip(values.tolist(), counts.tolist())))
print("clip:", np.clip(np.array([-5, 0.5, 9]), 0, 1))
print("cumsum:", np.cumsum([1, 2, 3, 4]))


# %% 10. The view trap
original = np.arange(5)
view = original[1:4]           # slicing makes a VIEW, not a copy
view[0] = 999
print("original changed!", original)
safe = original[1:4].copy()    # use .copy() when you need independence


# %% 11. dtypes and missing values
ints = np.array([1, 2, 3])
print("int dtype:", ints.dtype, "| float dtype:", (ints / 2).dtype)
f32 = np.ones(3, dtype=np.float32)       # deep learning uses float32 (half the memory of float64)
print("float32 bytes per number:", f32.itemsize)
data = np.array([1.0, np.nan, 3.0])      # NaN = "not a number", how missing values look
print("mean with NaN:", data.mean(), "| nanmean:", np.nanmean(data), "| isnan:", np.isnan(data))
# NaN spreads through math silently. A model with NaN loss is usually fed NaN data or diverging.


# %% 12. A train/test split from scratch
# Shuffle indices, then cut. This is all train_test_split does inside scikit-learn.
n = 10
y = np.arange(n) * 10
features = np.arange(n * 2).reshape(n, 2)
indices = rng.permutation(n)             # shuffled 0..9
cut = int(0.8 * n)
train_idx, test_idx = indices[:cut], indices[cut:]
X_train, X_test = features[train_idx], features[test_idx]
y_train, y_test = y[train_idx], y[test_idx]
print("train rows:", train_idx, "| test rows:", test_idx)
print("shapes:", X_train.shape, X_test.shape, y_train.shape, y_test.shape)

# Compute scaling statistics on the training data only, then apply them to the test data.
mu, sigma = X_train.mean(axis=0), X_train.std(axis=0)
X_train_s = (X_train - mu) / sigma
X_test_s = (X_test - mu) / sigma         # test uses TRAIN statistics. Why? See 03_ml_foundations.


# %% 13. Your turn
# 1. Make a (100, 4) array of random normal numbers. Compute the mean of each column.
# 2. Select only the rows where column 2 is positive. How many are there?
# 3. Multiply it by a (4, 2) matrix. What shape comes out?
# 4. Compute min-max scaling per column: (X - min) / (max - min), using axis=0.
# 5. Find the index of the row with the largest sum.
