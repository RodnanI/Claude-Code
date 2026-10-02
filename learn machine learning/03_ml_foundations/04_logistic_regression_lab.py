"""
Logistic regression, built from scratch.

Despite the name it is a classifier, and it outputs a probability between 0 and 1.
It is also one neuron with a sigmoid activation, so it is the same thing as the last
layer of many neural networks.

Problem: will a website visitor buy something? Features: minutes on site, pages viewed.

Run it:  python 04_logistic_regression_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(3)


def sigmoid(z):
    return 1 / (1 + np.exp(-z))


# %% 1. Data generated from a known logistic model
n = 600
minutes = rng.uniform(0, 30, n)
pages = rng.poisson(3 + minutes / 5).astype(float)
true_logit = 0.25 * minutes + 0.5 * pages - 6
bought = (rng.random(n) < sigmoid(true_logit)).astype(float)    # labels are 0.0 or 1.0
X = np.column_stack([minutes, pages])
y = bought
print(f"{n} visitors, {y.mean():.0%} bought")

idx = rng.permutation(n)
tr, te = idx[:450], idx[450:]
mean, std = X[tr].mean(axis=0), X[tr].std(axis=0)
X_train, X_test = (X[tr] - mean) / std, (X[te] - mean) / std
y_train, y_test = y[tr], y[te]


# %% 2. Why not just use linear regression on 0/1 labels?
from sklearn.linear_model import LinearRegression

lin = LinearRegression().fit(X_train, y_train)
p_lin = lin.predict(X_test)
print(f"\nlinear regression 'probabilities' range from {p_lin.min():.2f} to {p_lin.max():.2f}")
print("Probabilities below 0 or above 1 are nonsense. The sigmoid fixes that:")
for z in [-6, -2, 0, 2, 6]:
    print(f"  sigmoid({z:+d}) = {sigmoid(z):.3f}")


# %% 3. The loss: binary cross-entropy (log loss)
# For one example:  loss = -[ y*log(p) + (1-y)*log(1-p) ]
#   if y=1, loss = -log(p):    p=0.9 -> 0.11 (small),  p=0.1 -> 2.30 (big)
#   if y=0, loss = -log(1-p):  symmetric
# Confident AND wrong is punished hard. This is the cross-entropy from the probability module.
def bce(y, p, eps=1e-12):
    p = np.clip(p, eps, 1 - eps)          # log(0) = -inf, so keep p away from exactly 0 and 1
    return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))


for p in [0.99, 0.9, 0.5, 0.1, 0.01]:
    print(f"true label 1, predicted {p:.2f} -> loss {bce(np.array([1.0]), np.array([p])):.2f}")


# %% 4. Train with gradient descent
# With sigmoid + cross-entropy, the gradient reduces to
#   dL/dw = X.T @ (p - y) / n        dL/db = mean(p - y)
# Same shape as linear regression. (Derivation: chain rule; the sigmoid derivative cancels out.)
class LogisticRegressionGD:
    def __init__(self, learning_rate=0.5, epochs=2000):
        self.learning_rate, self.epochs = learning_rate, epochs

    def fit(self, X, y):
        self.w_ = np.zeros(X.shape[1])
        self.b_ = 0.0
        self.losses_ = []
        for _ in range(self.epochs):
            p = sigmoid(X @ self.w_ + self.b_)
            self.losses_.append(bce(y, p))
            self.w_ -= self.learning_rate * X.T @ (p - y) / len(y)
            self.b_ -= self.learning_rate * np.mean(p - y)
        return self

    def predict_proba(self, X):
        return sigmoid(X @ self.w_ + self.b_)

    def predict(self, X, threshold=0.5):
        return (self.predict_proba(X) >= threshold).astype(float)


model = LogisticRegressionGD().fit(X_train, y_train)
print(f"\ntraining loss: start {model.losses_[0]:.3f} -> end {model.losses_[-1]:.3f}")

from sklearn.linear_model import LogisticRegression

sk = LogisticRegression(C=1e6).fit(X_train, y_train)    # huge C = almost no regularization, to match ours
print("ours:        w =", model.w_.round(3), " b =", round(model.b_, 3))
print("scikit-learn w =", sk.coef_[0].round(3), " b =", round(sk.intercept_[0], 3))


# %% 5. Evaluate
p_test = model.predict_proba(X_test)
accuracy = np.mean(model.predict(X_test) == y_test)
majority = max(y_train.mean(), 1 - y_train.mean())
print(f"\ntest accuracy {accuracy:.3f} vs majority-class baseline {majority:.3f}")
print(f"test log loss {bce(y_test, p_test):.3f}")

# The threshold is a BUSINESS decision, not a model decision.
print("\nthreshold  predicted_buyers  accuracy")
for t in [0.2, 0.35, 0.5, 0.65, 0.8]:
    preds = (p_test >= t).astype(float)
    print(f"  {t:<9} {int(preds.sum()):>10}        {np.mean(preds == y_test):.3f}")
# Low threshold: catch more buyers, more false alarms. High threshold: fewer, surer predictions.
# Which is better depends on what a mistake costs. Module 3's metrics file goes deep on this.


# %% 6. The decision boundary is a straight line
# p = 0.5 exactly where w1*x1 + w2*x2 + b = 0. Solve for x2 to draw it.
fig, ax = plt.subplots(figsize=(6, 5))
colors = np.where(y_test == 1, "#c8553d", "#2a9d8f")
ax.scatter(X_test[:, 0], X_test[:, 1], c=colors, s=18, alpha=0.8)
x1 = np.linspace(X_test[:, 0].min(), X_test[:, 0].max(), 50)
for t, style in [(0.5, "-"), (0.2, ":"), (0.8, "--")]:
    logit_t = np.log(t / (1 - t))                          # the logit where p == t
    x2 = (logit_t - model.b_ - model.w_[0] * x1) / model.w_[1]
    ax.plot(x1, x2, color="#2b2d42", linestyle=style, label=f"p = {t}")
ax.set_xlabel("minutes on site (standardized)")
ax.set_ylabel("pages viewed (standardized)")
ax.set_ylim(X_test[:, 1].min() - 0.5, X_test[:, 1].max() + 0.5)
ax.legend()
ax.set_title("rust = bought, teal = did not")
fig.savefig(OUT / "logistic_boundary.png", dpi=120)
print("\nsaved logistic_boundary.png")


# %% 7. More than two classes: softmax regression
# Replace sigmoid with softmax over K classes and binary cross-entropy with cross-entropy.
# scikit-learn does this automatically when y has more than two classes:
from sklearn.datasets import load_iris

iris = load_iris()
clf = LogisticRegression(max_iter=1000).fit(iris.data, iris.target)
probs = clf.predict_proba(iris.data[:1])
print(f"\niris flower 0: probabilities per class {probs.round(3)}, sum = {probs.sum():.1f}")
print("weights shape:", clf.coef_.shape, "-> one weight vector per class")

plt.show()

# %% Your turn
# 1. Set learning_rate=10, then 50. Does it still converge? Print model.losses_[:20] to see.
# 2. Interpret: what does a positive weight on pages mean, in words?
# 3. Add a feature that is pure noise. Does accuracy change? Does its weight go to zero?
