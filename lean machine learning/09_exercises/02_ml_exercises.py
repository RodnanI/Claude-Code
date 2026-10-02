"""
Exercises: machine learning fundamentals (do these after modules 2 to 4).

How to work:
  1. Replace each `raise NotImplementedError` with your own code.
  2. Run:  python 02_ml_exercises.py
  3. The checks print PASS / FAIL / TODO for every function. FAIL messages tell you what went wrong.
Stuck for more than 30 minutes on one function? Read its solution in solutions/, close the file,
and write it again from memory. Copying teaches nothing; rewriting does.
"""

import numpy as np


def mse(y_true, y_pred):
    """Mean squared error."""
    raise NotImplementedError  # your code here


def mae(y_true, y_pred):
    """Mean absolute error."""
    raise NotImplementedError  # your code here


def accuracy(y_true, y_pred):
    """Share of predictions equal to the truth."""
    raise NotImplementedError  # your code here


def confusion_counts(y_true, y_pred):
    """Return {"tp": ..., "fp": ..., "fn": ..., "tn": ...} as plain ints. Positive class = 1."""
    raise NotImplementedError  # your code here


def precision_recall_f1(y_true, y_pred):
    """Return (precision, recall, f1). Any ratio with a zero denominator is 0.0."""
    raise NotImplementedError  # your code here


def linear_regression_gd(X, y, lr, epochs):
    """Fit y = X @ w + b with batch gradient descent on the mean squared error.
    Start from zeros. Return (w, b). Gradients: dw = 2/n X^T (y_hat - y), db = 2/n sum(y_hat - y)."""
    raise NotImplementedError  # your code here


def sigmoid(z):
    """1 / (1 + e^-z), elementwise."""
    raise NotImplementedError  # your code here


def log_loss(y_true, p):
    """Binary cross-entropy averaged over examples. Clip p to [1e-12, 1 - 1e-12] first."""
    raise NotImplementedError  # your code here


def knn_predict(X_train, y_train, X_test, k):
    """Predict each test row's class by majority vote of its k nearest training rows (Euclidean)."""
    raise NotImplementedError  # your code here


def kmeans_assign(X, centroids):
    """Return, for each row of X, the index of its nearest centroid."""
    raise NotImplementedError  # your code here


def kmeans_update(X, labels, k):
    """Return a (k, d) array: centroid j is the mean of the rows assigned to cluster j."""
    raise NotImplementedError  # your code here


def gini(labels):
    """Gini impurity of an array of integer class labels: 1 - sum of squared class proportions."""
    raise NotImplementedError  # your code here


def roc_auc(y_true, scores):
    """ROC AUC as the probability that a random positive scores higher than a random negative
    (ties count half). Compare all positive/negative pairs with broadcasting."""
    raise NotImplementedError  # your code here


if __name__ == "__main__":
    import checks          # checks.py sits next to this file
    checks.run(globals(), "ml")
