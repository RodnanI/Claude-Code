"""
Linear regression with NumPy: many features, vectorized, scaled, evaluated.

Same idea as the pure Python file, but how it is actually written. Then we check
our from-scratch version against scikit-learn.

Run it:  python 03_linear_regression_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(7)
np.set_printoptions(precision=3, suppress=True)


# %% 1. Synthetic house prices (we know the true formula, so we can check our work)
n = 500
size_m2 = rng.uniform(30, 200, n)
bedrooms = np.clip(np.round(size_m2 / 35 + rng.normal(0, 0.7, n)), 1, 6)
age_years = rng.uniform(0, 80, n)
km_to_center = rng.exponential(6, n)
price_k = (1.8 * size_m2 + 12 * bedrooms - 0.6 * age_years - 4.0 * km_to_center + 60
           + rng.normal(0, 20, n))                      # price in thousands, plus noise

feature_names = ["size_m2", "bedrooms", "age_years", "km_to_center"]
X = np.column_stack([size_m2, bedrooms, age_years, km_to_center])
y = price_k
print("X shape:", X.shape, "| y shape:", y.shape)


# %% 2. Train / test split
idx = rng.permutation(n)
train_idx, test_idx = idx[:400], idx[400:]
X_train, X_test, y_train, y_test = X[train_idx], X[test_idx], y[train_idx], y[test_idx]


# %% 3. A from-scratch model with the fit / predict interface
class LinearRegressionGD:
    def __init__(self, learning_rate=0.01, epochs=1000):
        self.learning_rate = learning_rate
        self.epochs = epochs

    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.w_ = np.zeros(n_features)
        self.b_ = 0.0
        self.losses_ = []
        for _ in range(self.epochs):
            y_hat = X @ self.w_ + self.b_                  # (n, d) @ (d,) -> (n,)
            error = y_hat - y                              # (n,)
            self.losses_.append(np.mean(error ** 2))
            grad_w = 2 / n_samples * (X.T @ error)         # (d, n) @ (n,) -> (d,)  all gradients at once
            grad_b = 2 / n_samples * error.sum()
            self.w_ -= self.learning_rate * grad_w
            self.b_ -= self.learning_rate * grad_b
        return self

    def predict(self, X):
        return X @ self.w_ + self.b_


# %% 4. Without scaling: pain
with np.errstate(over="ignore", invalid="ignore"):
    raw = LinearRegressionGD(learning_rate=0.00002, epochs=1000).fit(X_train, y_train)
print(f"\nunscaled, lr=0.00002: final train MSE = {raw.losses_[-1]:.1f}  <- still bad after 1000 epochs")
with np.errstate(over="ignore", invalid="ignore"):
    raw_big = LinearRegressionGD(learning_rate=0.0001, epochs=1000).fit(X_train, y_train)
print(f"unscaled, lr=0.0001:  final train MSE = {raw_big.losses_[-1]}  <- diverged")
# size_m2 is in the hundreds, bedrooms is around 3. The loss surface is a long narrow valley
# (remember the 2D example in the math module). A learning rate small enough for the steep
# direction is painfully slow for the others.


# %% 5. With standardization: easy
mean, std = X_train.mean(axis=0), X_train.std(axis=0)      # TRAIN statistics only
X_train_s = (X_train - mean) / std
X_test_s = (X_test - mean) / std
model = LinearRegressionGD(learning_rate=0.1, epochs=500).fit(X_train_s, y_train)
print(f"scaled,   lr=0.1:     final train MSE = {model.losses_[-1]:.1f}")


# %% 6. Check against the exact solution and scikit-learn
X1 = np.column_stack([X_train_s, np.ones(len(X_train_s))])
exact, *_ = np.linalg.lstsq(X1, y_train, rcond=None)
from sklearn.linear_model import LinearRegression

sk = LinearRegression().fit(X_train_s, y_train)
print("\nweights (scaled features):")
print("  gradient descent:", model.w_, round(model.b_, 3))
print("  least squares:   ", exact[:-1], round(exact[-1], 3))
print("  scikit-learn:    ", sk.coef_, round(sk.intercept_, 3))


# %% 7. Evaluate on the TEST set
def regression_report(y_true, y_pred):
    errors = y_pred - y_true
    mse = np.mean(errors ** 2)
    ss_res = np.sum(errors ** 2)
    ss_tot = np.sum((y_true - y_true.mean()) ** 2)
    return {
        "MAE": np.mean(np.abs(errors)),          # average miss, in the target's units
        "RMSE": np.sqrt(mse),                    # like MAE but punishes big misses more
        "R2": 1 - ss_res / ss_tot,               # share of variance explained (1 = perfect, 0 = as good as predicting the mean)
    }


y_pred = model.predict(X_test_s)
baseline = np.full_like(y_test, y_train.mean())              # always predict the average price
print("\ntest set:")
for name, preds in [("baseline (mean)", baseline), ("linear model", y_pred)]:
    report = regression_report(y_test, preds)
    print(f"  {name:<16} " + "  ".join(f"{k}={v:.2f}" for k, v in report.items()))
# MAE around 15 means "typically off by about 15 thousand". The noise we added has std 20, so we
# cannot do much better: the remaining error is irreducible noise, not model failure.


# %% 8. Interpreting weights
# On scaled features, a weight means: change in price when that feature rises by ONE STANDARD
# DEVIATION. Dividing by std converts it back to "per original unit":
print("\nwhat the model learned (per original unit) vs the truth we used:")
truth = {"size_m2": 1.8, "bedrooms": 12, "age_years": -0.6, "km_to_center": -4.0}
for name, w_scaled, s in zip(feature_names, model.w_, std):
    print(f"  {name:<13} learned {w_scaled / s:+7.2f}  true {truth[name]:+6.2f}")
# Bedrooms has the biggest absolute miss. It is strongly correlated with size (bigger houses
# have more bedrooms), so the model struggles to separate their effects. That is
# multicollinearity. Change the seed at the top and watch the bedrooms weight swing.


# %% 9. Plots: loss curve and predicted vs actual
fig, axes = plt.subplots(1, 3, figsize=(15, 4))
axes[0].plot(model.losses_, color="#2a9d8f")
axes[0].set_yscale("log")
axes[0].set_title("training loss (log scale)")
axes[0].set_xlabel("epoch")
axes[1].scatter(y_test, y_pred, s=12, color="#c8553d", alpha=0.7)
lims = [y_test.min(), y_test.max()]
axes[1].plot(lims, lims, color="#2b2d42", linestyle="--")
axes[1].set_xlabel("actual price")
axes[1].set_ylabel("predicted price")
axes[1].set_title("points on the dashed line = perfect")
residuals = y_test - y_pred
axes[2].scatter(y_pred, residuals, s=12, color="#8a9a5b")
axes[2].axhline(0, color="#2b2d42")
axes[2].set_xlabel("predicted price")
axes[2].set_ylabel("residual (actual - predicted)")
axes[2].set_title("residuals: want a shapeless cloud")
fig.tight_layout()
fig.savefig(OUT / "linear_regression.png", dpi=120)
print("\nsaved linear_regression.png")
# If residuals show a curve or a funnel shape, the model is missing structure (a non-linear
# effect, a missing feature, or noise that grows with price).

plt.show()

# %% Your turn
# 1. Remove the standardization and find the largest learning rate that does not diverge.
# 2. Add a useless feature: rng.normal(size=n). What weight does it get? Does test RMSE change?
# 3. Make the true price depend on size_m2 ** 2 (edit the formula). Look at the residual plot.
#    Then add size_m2 ** 2 as a feature and look again. That is feature engineering.
