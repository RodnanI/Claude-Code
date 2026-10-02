"""
Metrics from scratch, checked against scikit-learn. Read 07_evaluation_metrics.md first.

Scenario: a fraud model scores 20,000 transactions. 2% are fraud.

Run it:  python 08_metrics_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from sklearn import metrics as skm

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(11)


# %% 1. Simulated labels and model scores
n = 20_000
y = (rng.random(n) < 0.02).astype(int)                     # 1 = fraud
logit = np.where(y == 1, rng.normal(1.0, 1.2, n), rng.normal(-2.5, 1.2, n))
score = 1 / (1 + np.exp(-logit))                           # the model's probability of fraud
print(f"{n} transactions, {y.sum()} fraud ({y.mean():.1%})")


# %% 2. The accuracy paradox
always_legit = np.zeros(n, dtype=int)
print(f"\n'always legit' model accuracy: {np.mean(always_legit == y):.1%}  (catches 0 fraud)")


# %% 3. Confusion matrix, precision, recall, F1 from scratch
def confusion(y_true, y_pred):
    tp = int(np.sum((y_pred == 1) & (y_true == 1)))
    fp = int(np.sum((y_pred == 1) & (y_true == 0)))
    fn = int(np.sum((y_pred == 0) & (y_true == 1)))
    tn = int(np.sum((y_pred == 0) & (y_true == 0)))
    return tp, fp, fn, tn


def precision_recall_f1(y_true, y_pred):
    tp, fp, fn, _ = confusion(y_true, y_pred)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1


y_pred = (score >= 0.5).astype(int)
tp, fp, fn, tn = confusion(y, y_pred)
print(f"\nthreshold 0.5 -> TP={tp} FP={fp} FN={fn} TN={tn}")
p, r, f = precision_recall_f1(y, y_pred)
print(f"ours:    precision={p:.3f} recall={r:.3f} F1={f:.3f} accuracy={(tp + tn) / n:.3f}")
print(f"sklearn: precision={skm.precision_score(y, y_pred):.3f} recall={skm.recall_score(y, y_pred):.3f} "
      f"F1={skm.f1_score(y, y_pred):.3f}")


# %% 4. ROC curve and AUC from scratch
def roc_curve_scratch(y_true, scores):
    order = np.argsort(-scores)                     # highest score first
    y_sorted = y_true[order]
    tps = np.cumsum(y_sorted)                       # true positives if we cut after each position
    fps = np.cumsum(1 - y_sorted)
    tpr = np.concatenate([[0], tps / y_true.sum()])
    fpr = np.concatenate([[0], fps / (len(y_true) - y_true.sum())])
    return fpr, tpr


def auc_trapezoid(x, y_vals):
    return float(np.sum((x[1:] - x[:-1]) * (y_vals[1:] + y_vals[:-1]) / 2))


def auc_by_ranking(y_true, scores):
    """AUC = probability a random positive outscores a random negative. Ties count half.
    Compares every (positive, negative) pair: 386 x 19,614 = 7.6 million comparisons, fine for NumPy."""
    pos, neg = scores[y_true == 1], scores[y_true == 0]
    greater = (pos[:, None] > neg[None, :]).mean()
    ties = (pos[:, None] == neg[None, :]).mean()
    return greater + 0.5 * ties


fpr, tpr = roc_curve_scratch(y, score)
print(f"\nROC AUC: trapezoid={auc_trapezoid(fpr, tpr):.4f}  ranking={auc_by_ranking(y, score):.4f}  "
      f"sklearn={skm.roc_auc_score(y, score):.4f}")
print(f"average precision (PR AUC): {skm.average_precision_score(y, score):.4f} "
      f"(random model would get {y.mean():.3f})")


# %% 5. Threshold sweep: the precision / recall trade-off
print("\nthreshold  flagged  precision  recall    F1")
for t in [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9]:
    pred = (score >= t).astype(int)
    p, r, f = precision_recall_f1(y, pred)
    print(f"  {t:<8} {pred.sum():>7}   {p:>8.3f}  {r:>6.3f}  {f:>5.3f}")


# %% 6. Pick the threshold with money
COST_MISSED_FRAUD = 200      # dollars lost when fraud gets through
COST_REVIEW = 5              # dollars for a human to review a flagged transaction (TP or FP)
thresholds = np.linspace(0.01, 0.99, 99)
costs = []
for t in thresholds:
    tp, fp, fn, tn = confusion(y, (score >= t).astype(int))
    costs.append(fn * COST_MISSED_FRAUD + (tp + fp) * COST_REVIEW)
best_t = thresholds[int(np.argmin(costs))]
tp, fp, fn, tn = confusion(y, (score >= best_t).astype(int))
print(f"\ncheapest threshold: {best_t:.2f}, total cost ${min(costs):,.0f} "
      f"(vs ${costs[49]:,.0f} at 0.5, vs ${y.sum() * COST_MISSED_FRAUD:,.0f} with no model)")
print(f"  at that threshold: review {tp + fp} transactions, catch {tp} of {y.sum()} frauds")
# The money-optimal threshold is below 0.5 because missing fraud is 40x more expensive than a
# review. With perfectly calibrated probabilities, theory says: flag anything above 5/200 = 0.025.
# Our scores are badly calibrated (next section), so the best cut in score units lands elsewhere.
# Lesson: pick thresholds empirically on validation data. "0.5" is a default, not a decision.


# %% 7. Calibration: do the probabilities mean what they say?
bins = np.linspace(0, 1, 11)
which = np.digitize(score, bins[1:-1])
print("\ncalibration (predicted vs actual fraud rate per bin):")
for b in range(10):
    mask = which == b
    if mask.sum() >= 20:
        print(f"  scores {bins[b]:.1f}-{bins[b + 1]:.1f}: predicted {score[mask].mean():.3f}  "
              f"actual {y[mask].mean():.3f}  (n={mask.sum()})")
print(f"Brier score: {np.mean((score - y) ** 2):.4f}")
# Our fake model is badly calibrated: it says 0.5 when reality is much lower, because fraud is
# rare. Ranking (AUC) can be excellent while probabilities are off. Calibrate if probabilities
# drive decisions (sklearn.calibration.CalibratedClassifierCV).


# %% 8. Regression metrics and the outlier effect
y_true_r = rng.normal(50, 10, 1000)
y_pred_r = y_true_r + rng.normal(0, 3, 1000)
y_pred_bad = y_pred_r.copy()
y_pred_bad[:5] += 200                                  # five catastrophic misses
for name, pred in [("normal errors", y_pred_r), ("with 5 huge misses", y_pred_bad)]:
    mae = np.mean(np.abs(pred - y_true_r))
    rmse = np.sqrt(np.mean((pred - y_true_r) ** 2))
    print(f"\n{name:<20} MAE={mae:6.2f}  RMSE={rmse:6.2f}  RMSE/MAE={rmse / mae:.1f}")


# %% 9. Ranking metrics for search and RAG retrieval
# For 4 queries: the ranked result ids, and which ids are actually relevant.
results = {
    "q1": (["d3", "d7", "d1", "d9", "d2"], {"d1", "d2"}),
    "q2": (["d4", "d5", "d6", "d8", "d0"], {"d4"}),
    "q3": (["d2", "d9", "d8", "d1", "d3"], {"d6"}),
    "q4": (["d1", "d6", "d3", "d4", "d5"], {"d6", "d3", "d5"}),
}
k = 3
precisions, recalls, reciprocal_ranks = [], [], []
for ranked, relevant in results.values():
    top_k = ranked[:k]
    hits = sum(doc in relevant for doc in top_k)
    precisions.append(hits / k)
    recalls.append(hits / len(relevant))
    first_hit = next((i + 1 for i, doc in enumerate(ranked) if doc in relevant), None)
    reciprocal_ranks.append(1 / first_hit if first_hit else 0.0)
print(f"\nprecision@{k}={np.mean(precisions):.3f}  recall@{k}={np.mean(recalls):.3f}  MRR={np.mean(reciprocal_ranks):.3f}")


# %% 10. Plots
fig, axes = plt.subplots(1, 3, figsize=(15, 4.2))
axes[0].plot(fpr, tpr, color="#c8553d")
axes[0].plot([0, 1], [0, 1], color="#2b2d42", linestyle="--", linewidth=1)
axes[0].set(xlabel="false positive rate", ylabel="true positive rate (recall)", title="ROC curve")
prec, rec, _ = skm.precision_recall_curve(y, score)
axes[1].plot(rec, prec, color="#2a9d8f")
axes[1].axhline(y.mean(), color="#2b2d42", linestyle="--", linewidth=1)
axes[1].set(xlabel="recall", ylabel="precision", title="precision-recall curve")
axes[2].plot(thresholds, costs, color="#e9c46a")
axes[2].axvline(best_t, color="#2b2d42", linestyle="--", linewidth=1)
axes[2].set(xlabel="threshold", ylabel="total cost ($)", title="cost vs threshold")
fig.tight_layout()
fig.savefig(OUT / "metrics_curves.png", dpi=120)
print("\nsaved metrics_curves.png")

print("\nscikit-learn's summary (learn to read this):")
print(skm.classification_report(y, (score >= best_t).astype(int), target_names=["legit", "fraud"], digits=3))

plt.show()
