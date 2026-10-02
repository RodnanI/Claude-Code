"""
SOLUTIONS for 02_ml_exercises.py. Try the exercises first.
"""

import numpy as np


def mse(y_true, y_pred):
    """Mean squared error."""
    return float(np.mean((y_true - y_pred) ** 2))


def mae(y_true, y_pred):
    """Mean absolute error."""
    return float(np.mean(np.abs(y_true - y_pred)))


def accuracy(y_true, y_pred):
    """Share of predictions equal to the truth."""
    return float(np.mean(y_true == y_pred))


def confusion_counts(y_true, y_pred):
    """Return {"tp": ..., "fp": ..., "fn": ..., "tn": ...} as plain ints. Positive class = 1."""
    return {
        "tp": int(np.sum((y_pred == 1) & (y_true == 1))),
        "fp": int(np.sum((y_pred == 1) & (y_true == 0))),
        "fn": int(np.sum((y_pred == 0) & (y_true == 1))),
        "tn": int(np.sum((y_pred == 0) & (y_true == 0))),
    }


def precision_recall_f1(y_true, y_pred):
    """Return (precision, recall, f1). Any ratio with a zero denominator is 0.0."""
    c = confusion_counts(y_true, y_pred)
    precision = c["tp"] / (c["tp"] + c["fp"]) if c["tp"] + c["fp"] else 0.0
    recall = c["tp"] / (c["tp"] + c["fn"]) if c["tp"] + c["fn"] else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1


def linear_regression_gd(X, y, lr, epochs):
    """Fit y = X @ w + b with batch gradient descent on the mean squared error.
    Start from zeros. Return (w, b). Gradients: dw = 2/n X^T (y_hat - y), db = 2/n sum(y_hat - y)."""
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(epochs):
        error = X @ w + b - y
        w -= lr * 2 / n * (X.T @ error)
        b -= lr * 2 / n * error.sum()
    return w, b


def sigmoid(z):
    """1 / (1 + e^-z), elementwise."""
    return 1 / (1 + np.exp(-z))


def log_loss(y_true, p):
    """Binary cross-entropy averaged over examples. Clip p to [1e-12, 1 - 1e-12] first."""
    p = np.clip(p, 1e-12, 1 - 1e-12)
    return float(-np.mean(y_true * np.log(p) + (1 - y_true) * np.log(1 - p)))


def knn_predict(X_train, y_train, X_test, k):
    """Predict each test row's class by majority vote of its k nearest training rows (Euclidean)."""
    d = ((X_test[:, None, :] - X_train[None, :, :]) ** 2).sum(axis=2)
    nearest = np.argsort(d, axis=1)[:, :k]
    return np.array([np.bincount(y_train[row]).argmax() for row in nearest])


def kmeans_assign(X, centroids):
    """Return, for each row of X, the index of its nearest centroid."""
    d = ((X[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)
    return d.argmin(axis=1)


def kmeans_update(X, labels, k):
    """Return a (k, d) array: centroid j is the mean of the rows assigned to cluster j."""
    return np.array([X[labels == j].mean(axis=0) for j in range(k)])


def gini(labels):
    """Gini impurity of an array of integer class labels: 1 - sum of squared class proportions."""
    p = np.bincount(labels) / len(labels)
    return float(1 - np.sum(p ** 2))


def roc_auc(y_true, scores):
    """ROC AUC as the probability that a random positive scores higher than a random negative
    (ties count half). Compare all positive/negative pairs with broadcasting."""
    pos, neg = scores[y_true == 1], scores[y_true == 0]
    greater = (pos[:, None] > neg[None, :]).mean()
    ties = (pos[:, None] == neg[None, :]).mean()
    return float(greater + 0.5 * ties)


if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import checks
    checks.run(globals(), "ml")
