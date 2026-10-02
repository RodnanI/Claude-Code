"""
Monitoring a model in production: data drift, prediction drift, concept drift.
Read 02_mlops_and_deployment.md (monitoring section) first.

Story: a model scores loan applicants. It was trained on January data. We watch 10 weeks of
production traffic in which things gradually change:
  - weeks 3+: applicants get younger (a marketing campaign targets students)  -> DATA drift
  - weeks 5+: a new device type "tablet" appears                               -> DATA drift (categorical)
  - weeks 7+: the link between income and default weakens (economic shock)     -> CONCEPT drift
Can monitoring tell these apart? Drift metrics alone cannot, and you need labels too.

Run it:  python 05_drift_monitoring_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from scipy.stats import ks_2samp
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(0)
DEVICES = ["desktop", "phone", "tablet"]


def make_week(n, week):
    age_shift = -1.5 * max(0, week - 2)                         # younger applicants from week 3
    age = np.clip(rng.normal(42 + age_shift, 11, n), 18, 80)
    income = rng.lognormal(10.6, 0.5, n)
    p_tablet = 0.25 if week >= 5 else 0.0
    device = rng.choice(DEVICES, n, p=[0.5 - p_tablet / 2, 0.5 - p_tablet / 2, p_tablet])
    income_effect = 1.6 if week < 7 else 0.4                     # concept drift from week 7
    logit = 1.0 - income_effect * (np.log(income) - 10.6) / 0.5 - 0.03 * (age - 42) + 0.3 * (device == "phone")
    default = (rng.random(n) < 1 / (1 + np.exp(-(logit - 2.0)))).astype(int)
    return {"age": age, "income": income, "device": device, "default": default}


def features(d):
    return np.column_stack([d["age"], np.log(d["income"]), d["device"] == "phone", d["device"] == "tablet"]).astype(float)


reference = make_week(20_000, week=0)
model = LogisticRegression(max_iter=1000).fit(features(reference), reference["default"])
ref_scores = model.predict_proba(features(reference))[:, 1]
print(f"reference: default rate {reference['default'].mean():.1%}, "
      f"training AUC {roc_auc_score(reference['default'], ref_scores):.3f}")


# %% Drift metrics, from scratch
def psi(expected, actual, bins=10):
    """Population Stability Index. Rule of thumb: < 0.1 stable, 0.1-0.2 moderate, > 0.2 significant."""
    edges = np.quantile(expected, np.linspace(0, 1, bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    e = np.histogram(expected, edges)[0] / len(expected)
    a = np.histogram(actual, edges)[0] / len(actual)
    e, a = np.clip(e, 1e-4, None), np.clip(a, 1e-4, None)          # avoid log(0)
    return float(np.sum((a - e) * np.log(a / e)))


def psi_categorical(expected, actual, categories):
    e = np.array([np.mean(expected == c) for c in categories])
    a = np.array([np.mean(actual == c) for c in categories])
    e, a = np.clip(e, 1e-4, None), np.clip(a, 1e-4, None)
    return float(np.sum((a - e) * np.log(a / e)))


def ks_statistic(x, y):
    """Largest gap between the two empirical cumulative distributions."""
    grid = np.sort(np.concatenate([x, y]))
    cdf_x = np.searchsorted(np.sort(x), grid, side="right") / len(x)
    cdf_y = np.searchsorted(np.sort(y), grid, side="right") / len(y)
    return float(np.max(np.abs(cdf_x - cdf_y)))


week1 = make_week(3000, 1)
print(f"KS check: ours {ks_statistic(reference['age'], week1['age']):.4f} "
      f"vs scipy {ks_2samp(reference['age'], week1['age']).statistic:.4f}")


def flag(value, moderate=0.1, high=0.2):
    return "!!" if value > high else "! " if value > moderate else "  "


# %% Weekly monitoring report
print("\nweek  PSI age    PSI income  PSI device  PSI score   default rate  AUC     status")
history = []
for week in range(1, 11):
    w = make_week(3000, week)
    scores = model.predict_proba(features(w))[:, 1]
    row = {
        "week": week,
        "age": psi(reference["age"], w["age"]),
        "income": psi(reference["income"], w["income"]),
        "device": psi_categorical(reference["device"], w["device"], DEVICES),
        "score": psi(ref_scores, scores),                         # prediction drift
        "rate": w["default"].mean(),
        "auc": roc_auc_score(w["default"], scores),               # needs labels (often weeks late!)
    }
    history.append(row)
    status = []
    if max(row["age"], row["income"], row["device"]) > 0.2:
        status.append("input drift")
    if row["auc"] < 0.70:
        status.append("PERFORMANCE DROP")
    print(f"{week:>4}  {row['age']:.3f} {flag(row['age'])}  {row['income']:.3f} {flag(row['income'])}    "
          f"{row['device']:.3f} {flag(row['device'])}   {row['score']:.3f} {flag(row['score'])}   "
          f"{row['rate']:>8.1%}     {row['auc']:.3f}   {', '.join(status) or 'ok'}")
# Read the table:
#  - Weeks 3-6: input drift grows (age crosses the alarm line at week 6, the new device at week 5),
#    yet AUC holds up. The model still works on the new population. Drift is a reason to LOOK,
#    not automatically to retrain. Prediction drift (PSI score) stays small because the model
#    barely relies on age or device.
#  - Weeks 7+: income looks perfectly stable (PSI ~0), yet AUC collapses. The world changed how
#    income relates to default. Input-drift monitoring is blind to this: only labels reveal it.
#  - Labels for loans arrive months later in reality, so you would see week 7's problem late.
#    That is why teams monitor proxies (early repayment behavior, score distribution shifts,
#    complaint rates) and keep a human eye on unusual changes.

fig, axes = plt.subplots(1, 2, figsize=(12, 4))
weeks = [h["week"] for h in history]
for key, color in [("age", "#c8553d"), ("device", "#e9c46a"), ("income", "#2a9d8f"), ("score", "#2b2d42")]:
    axes[0].plot(weeks, [h[key] for h in history], marker="o", color=color, label=f"PSI {key}")
axes[0].axhline(0.2, color="grey", linestyle="--", linewidth=1)
axes[0].set(title="input and prediction drift", xlabel="week")
axes[0].legend()
axes[1].plot(weeks, [h["auc"] for h in history], marker="o", color="#2b2d42")
axes[1].axvline(6.5, color="#c8553d", linestyle=":", label="concept drift starts")
axes[1].set(title="model performance (needs labels)", xlabel="week", ylabel="ROC AUC")
axes[1].legend()
fig.tight_layout()
fig.savefig(OUT / "drift_monitoring.png", dpi=120)
print("\nsaved drift_monitoring.png")

# Your turn
# 1. Retrain the model on weeks 7-8 data and evaluate it on weeks 9-10. Does AUC recover?
# 2. Make the age drift sudden (all at week 3) instead of gradual. How does PSI behave?
# 3. Decide alert rules you would actually deploy: which metric, which threshold, who gets paged?
