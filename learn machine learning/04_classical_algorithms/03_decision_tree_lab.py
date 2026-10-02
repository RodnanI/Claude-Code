"""
Decision tree classifier, from scratch. The tree is stored as nested dicts.

A decision tree is a set of if/else statements learned from data. At each step it asks
the yes/no question about one feature that best separates the classes.
Random forests and gradient boosting, the best tools for tabular data in industry, are
built from trees, so one tree shows you the parts.

Run it:  python 03_decision_tree_lab.py   (a few seconds)
"""

import numpy as np
from sklearn.datasets import load_breast_cancer, load_iris
from sklearn.tree import DecisionTreeClassifier, export_text

rng = np.random.default_rng(0)


# %% 1. Impurity: how mixed is a group of labels?
def gini(y, n_classes):
    """Gini impurity = 1 - sum(p_k^2). 0 = pure (one class). Higher = more mixed.
    It is the probability that two random picks from the group have different labels."""
    if len(y) == 0:
        return 0.0
    p = np.bincount(y, minlength=n_classes) / len(y)
    return 1.0 - np.sum(p ** 2)


print("gini of [0,0,0,0]:", gini(np.array([0, 0, 0, 0]), 2))
print("gini of [0,0,1,1]:", gini(np.array([0, 0, 1, 1]), 2))
print("gini of [0,1,2,0,1,2]:", round(gini(np.array([0, 1, 2, 0, 1, 2]), 3), 3))


# %% 2. The tree
class DecisionTree:
    def __init__(self, max_depth=3, min_samples_split=2, max_thresholds=64):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.max_thresholds = max_thresholds

    def fit(self, X, y):
        self.n_classes_ = int(y.max()) + 1
        self.root_ = self._grow(X, y, depth=0)
        return self

    def _best_split(self, X, y):
        """Try every feature and many thresholds. Keep the split that reduces impurity most."""
        parent = gini(y, self.n_classes_)
        best = {"gain": 0.0}
        for j in range(X.shape[1]):
            values = np.unique(X[:, j])
            if len(values) < 2:
                continue
            thresholds = (values[:-1] + values[1:]) / 2              # midpoints between values
            if len(thresholds) > self.max_thresholds:
                # Too many candidates: test quantiles instead. LightGBM and scikit-learn's
                # HistGradientBoosting use this "histogram" trick to be fast on big data.
                thresholds = np.unique(np.quantile(X[:, j], np.linspace(0, 1, self.max_thresholds + 2)[1:-1]))
            for t in thresholds:
                left = X[:, j] <= t
                n_left = int(left.sum())
                if n_left == 0 or n_left == len(y):
                    continue
                n_right = len(y) - n_left
                child = (n_left * gini(y[left], self.n_classes_) + n_right * gini(y[~left], self.n_classes_)) / len(y)
                if parent - child > best["gain"]:
                    best = {"gain": parent - child, "feature": j, "threshold": float(t)}
        return best

    def _grow(self, X, y, depth):
        counts = np.bincount(y, minlength=self.n_classes_)
        node = {"counts": counts.tolist(), "prediction": int(counts.argmax())}
        if depth >= self.max_depth or len(y) < self.min_samples_split or gini(y, self.n_classes_) == 0:
            return node                                              # stop: leaf
        split = self._best_split(X, y)
        if split["gain"] <= 0:
            return node
        left = X[:, split["feature"]] <= split["threshold"]
        node["feature"] = split["feature"]
        node["threshold"] = split["threshold"]
        node["left"] = self._grow(X[left], y[left], depth + 1)       # recursion: a tree of trees
        node["right"] = self._grow(X[~left], y[~left], depth + 1)
        return node

    def predict(self, X):
        predictions = []
        for x in X:
            node = self.root_
            while "feature" in node:                                 # walk down until a leaf
                node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
            predictions.append(node["prediction"])
        return np.array(predictions)


def print_tree(node, feature_names, class_names, indent=""):
    """Print the learned tree as the Python code it really is."""
    if "feature" in node:
        name, t = feature_names[node["feature"]], node["threshold"]
        print(f"{indent}if {name} <= {t:.2f}:")
        print_tree(node["left"], feature_names, class_names, indent + "    ")
        print(f"{indent}else:")
        print_tree(node["right"], feature_names, class_names, indent + "    ")
    else:
        print(f"{indent}return '{class_names[node['prediction']]}'   # training samples per class: {node['counts']}")


# %% 3. Iris: a tree you can read
iris = load_iris()
names = [n.replace(" (cm)", "").replace(" ", "_") for n in iris.feature_names]
tree = DecisionTree(max_depth=3).fit(iris.data, iris.target)
print("\nlearned tree for iris:\n")
print_tree(tree.root_, names, list(iris.target_names))
print(f"\ntraining accuracy: {np.mean(tree.predict(iris.data) == iris.target):.3f}")

sk_tree = DecisionTreeClassifier(max_depth=3, random_state=0).fit(iris.data, iris.target)
print("\nscikit-learn's version of the same tree:")
print(export_text(sk_tree, feature_names=names))
# The first split differs: petal_length <= 2.45 and petal_width <= 0.80 both isolate setosa
# perfectly, a tie, so the choice is arbitrary. The rest is identical.
# Also notice a split whose two leaves BOTH predict virginica. It made the groups purer, which
# is what gini rewards, without changing any prediction. Pruning would remove it.


# %% 4. Depth controls overfitting (breast cancer data: 569 tumors, 30 features)
cancer = load_breast_cancer()
idx = rng.permutation(len(cancer.target))
train, test = idx[:400], idx[400:]
Xtr, Xte, ytr, yte = cancer.data[train], cancer.data[test], cancer.target[train], cancer.target[test]
print("depth   train acc   test acc   leaves")


def count_leaves(node):
    return 1 if "feature" not in node else count_leaves(node["left"]) + count_leaves(node["right"])


for depth in [1, 2, 3, 4, 6, 8, 12]:
    t = DecisionTree(max_depth=depth).fit(Xtr, ytr)
    print(f"{depth:>5}   {np.mean(t.predict(Xtr) == ytr):>9.3f}   {np.mean(t.predict(Xte) == yte):>8.3f}   {count_leaves(t.root_):>6}")
# Deep trees reach 100% training accuracy by carving out a leaf for every odd example.
# Test accuracy stops improving or drops. One tree is high-variance: retrain it on slightly
# different data and the structure can change completely. Ensembles fix exactly this (next files).


# %% Strengths and weaknesses (memorize for interviews)
# + no feature scaling needed (only the ORDER of values matters for a threshold)
# + handles non-linear patterns and feature interactions naturally
# + readable when shallow
# + handles mixed feature types; some implementations handle missing values natively
# - a single tree overfits easily and is unstable
# - piecewise constant predictions: cannot extrapolate beyond the training range
# - greedy: picks the best split NOW, not the best tree overall

# %% Your turn
# 1. Replace gini with entropy: -sum(p * log2(p)). Do the splits change on iris?
# 2. Add min_samples_leaf: refuse splits that create a leaf with fewer than 5 samples.
#    What happens to test accuracy at depth 12?
# 3. Turn it into a REGRESSION tree: leaves predict the mean of y, and splits minimize the
#    variance (squared error) of the children instead of gini.
