"""
Exercises: Python and NumPy (do these after module 1).

How to work:
  1. Replace each `raise NotImplementedError` with your own code.
  2. Run:  python 01_python_numpy_exercises.py
  3. The checks print PASS / FAIL / TODO for every function. FAIL messages tell you what went wrong.
Stuck for more than 30 minutes on one function? Read its solution in solutions/, close the file,
and write it again from memory. Copying teaches nothing; rewriting does.
"""

import re

import numpy as np


def word_counts(text):
    """Return a dict {word: count}. Lowercase everything and ignore the punctuation . , ! ?
    Example: "The cat. The dog!" -> {"the": 2, "cat": 1, "dog": 1}"""
    raise NotImplementedError  # your code here


def top_k_words(counts, k):
    """Return the k most frequent (word, count) pairs, highest count first.
    Ties are broken alphabetically. Hint: sorted() with a key that returns a tuple."""
    raise NotImplementedError  # your code here


def normalize_list(values):
    """Min-max scale a Python list to the range 0..1 WITHOUT NumPy.
    If all values are equal, return a list of 0.0 (do not divide by zero)."""
    raise NotImplementedError  # your code here


def standardize_columns(X):
    """Return X with every column rescaled to mean 0 and standard deviation 1.
    Columns with standard deviation 0 become all zeros. Use axis= and broadcasting, no loops."""
    raise NotImplementedError  # your code here


def train_test_split_indices(n, test_fraction, seed):
    """Shuffle the indices 0..n-1 with np.random.default_rng(seed) and split them.
    Return (train_indices, test_indices), with round(n * test_fraction) test indices."""
    raise NotImplementedError  # your code here


def one_hot(labels, n_classes):
    """Turn an integer array of class labels into a (len(labels), n_classes) 0/1 matrix."""
    raise NotImplementedError  # your code here


def pairwise_distances(A, B):
    """Euclidean distance between every row of A (n, d) and every row of B (m, d): shape (n, m).
    No Python loops. Hint: A[:, None, :] - B[None, :, :] has shape (n, m, d)."""
    raise NotImplementedError  # your code here


def moving_average(x, window):
    """Average of each run of `window` consecutive values: length len(x) - window + 1.
    Hint: np.cumsum, or np.convolve with np.ones(window) / window."""
    raise NotImplementedError  # your code here


def row_with_max_sum(X):
    """Return the index (an int) of the row of X with the largest sum."""
    raise NotImplementedError  # your code here


def batch_indices(n_items, batch_size):
    """A GENERATOR that yields lists of indices: [0..batch_size-1], [batch_size..], ...
    The last batch may be smaller. Use the yield keyword."""
    raise NotImplementedError  # your code here


if __name__ == "__main__":
    import checks          # checks.py sits next to this file
    checks.run(globals(), "python_numpy")
