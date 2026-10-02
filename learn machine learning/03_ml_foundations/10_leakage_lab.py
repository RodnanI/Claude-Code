"""
Data leakage lab: four ways to fool yourself, and the fix for each.
Read 09_data_splits_and_leakage.md first.

Run it:  python 10_leakage_lab.py   (takes about 10 seconds)
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold, KFold, StratifiedKFold, TimeSeriesSplit, cross_val_score
from sklearn.pipeline import make_pipeline

rng = np.random.default_rng(0)


# %% 1. Feature selection leakage: making pure noise look predictive
# 200 examples, 5,000 features of PURE NOISE, random labels. Nothing here can be predicted.
# The honest answer is 50% accuracy.
X = rng.normal(size=(200, 5000))
y = rng.integers(0, 2, 200)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)

# WRONG: pick the 20 features most correlated with y using ALL the data, then cross-validate.
X_selected = SelectKBest(f_classif, k=20).fit_transform(X, y)
wrong = cross_val_score(LogisticRegression(max_iter=1000), X_selected, y, cv=cv).mean()

# RIGHT: selection happens inside the pipeline, so each fold selects using its training part only.
pipeline = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression(max_iter=1000))
right = cross_val_score(pipeline, X, y, cv=cv).mean()

print("1. FEATURE SELECTION LEAKAGE (data is pure noise)")
print(f"   selection before CV: accuracy {wrong:.1%}   <- fake")
print(f"   selection inside CV: accuracy {right:.1%}   <- honest")
# With 5,000 random features, some correlate with random labels by pure chance. Selecting them
# using the validation rows too guarantees those rows look predictable. This exact mistake has
# appeared in published medical research (search: "the wrong way to do cross-validation").


# %% 2. Target leakage: a feature that only exists because of the outcome
n = 3000
tenure = rng.uniform(1, 60, n)                     # months as a customer
support_tickets = rng.poisson(2, n)
monthly_fee = rng.uniform(10, 80, n)
logit = -1.0 - 0.05 * tenure + 0.4 * support_tickets + 0.02 * monthly_fee
churned = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
# Leaky feature: number of calls to the "cancellation department". Customers call it BECAUSE
# they are leaving, so it is mostly nonzero for churners. At prediction time (a month earlier)
# it does not exist yet.
cancel_calls = np.where(churned == 1, rng.poisson(1.5, n), rng.poisson(0.05, n))

X_honest = np.column_stack([tenure, support_tickets, monthly_fee])
X_leaky = np.column_stack([tenure, support_tickets, monthly_fee, cancel_calls])
train, test = np.arange(2000), np.arange(2000, n)
model_honest = RandomForestClassifier(n_estimators=200, random_state=0).fit(X_honest[train], churned[train])
model_leaky = RandomForestClassifier(n_estimators=200, random_state=0).fit(X_leaky[train], churned[train])
auc_honest = roc_auc_score(churned[test], model_honest.predict_proba(X_honest[test])[:, 1])
auc_leaky = roc_auc_score(churned[test], model_leaky.predict_proba(X_leaky[test])[:, 1])

# Production: the prediction is made BEFORE anyone calls cancellations, so the feature is 0.
X_production = X_leaky[test].copy()
X_production[:, 3] = 0
auc_production = roc_auc_score(churned[test], model_leaky.predict_proba(X_production)[:, 1])
importance = {name: round(float(v), 2) for name, v in zip(["tenure", "tickets", "fee", "cancel_calls"], model_leaky.feature_importances_)}

print("\n2. TARGET LEAKAGE")
print(f"   honest model test AUC:           {auc_honest:.3f}")
print(f"   leaky model test AUC:            {auc_leaky:.3f}   <- looks amazing")
print(f"   leaky model in production:       {auc_production:.3f}   <- the 0.92 was never real")
print(f"   leaky model feature importances: {importance}")
# The giveaway: one feature dominates importance. Always ask why.


# %% 3. Group leakage: the model recognizes patients, not disease
# 100 patients, 10 scans each. Each patient has a personal "signature" (anatomy, scanner, etc.).
# The diagnosis is per patient and only weakly visible in the scans.
n_patients, scans_each, n_features = 100, 10, 30
diagnosis = rng.integers(0, 2, n_patients)
signature = rng.normal(0, 1, (n_patients, n_features))
rows, labels, groups = [], [], []
for p in range(n_patients):
    for _ in range(scans_each):
        weak_signal = 0.15 * diagnosis[p] * np.ones(n_features)
        rows.append(signature[p] + weak_signal + rng.normal(0, 0.3, n_features))
        labels.append(diagnosis[p])
        groups.append(p)
X_scans, y_scans, groups = np.array(rows), np.array(labels), np.array(groups)

forest = RandomForestClassifier(n_estimators=200, random_state=0)
random_split = cross_val_score(forest, X_scans, y_scans, cv=KFold(5, shuffle=True, random_state=0)).mean()
group_split = cross_val_score(forest, X_scans, y_scans, cv=GroupKFold(5), groups=groups).mean()
print("\n3. GROUP LEAKAGE (several scans per patient)")
print(f"   random split:  accuracy {random_split:.1%}   <- the model memorized each patient")
print(f"   grouped split: accuracy {group_split:.1%}   <- performance on NEW patients")


# %% 4. Temporal leakage: random splits on time series
# A random walk (like a stock price or daily sales trend). Feature: just the day number.
days = np.arange(1000)
values = np.cumsum(rng.normal(0, 1, 1000))
X_time = days.reshape(-1, 1)
regressor = RandomForestRegressor(n_estimators=100, random_state=0)
random_r2 = cross_val_score(regressor, X_time, values, cv=KFold(5, shuffle=True, random_state=0), scoring="r2").mean()
time_r2 = cross_val_score(regressor, X_time, values, cv=TimeSeriesSplit(5), scoring="r2").mean()
print("\n4. TEMPORAL LEAKAGE (forecasting a random walk)")
print(f"   random split R2:     {random_r2:.3f}   <- 'predicts' day 500 from days 499 and 501")
print(f"   time-ordered R2:     {time_r2:.3f}   <- real forecasting. Random walks are unpredictable")


print("""
Summary: every 'great' number above was produced by a mistake, not by a good model.
When a result looks too good, assume leakage until you have proven otherwise.""")
