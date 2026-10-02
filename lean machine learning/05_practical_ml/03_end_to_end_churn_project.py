"""
END-TO-END PROJECT: predict which subscribers will cancel in the next 60 days.

This is what a real ML task at a company looks like, compressed into one file:
messy data, a hidden leakage trap, baselines, pipelines, model comparison, a decision
threshold chosen with money, an honest test, explanations, slices, and a saved model
with a model card.

Read it top to bottom like a story. Then rebuild it yourself without looking.

Run it:  python 03_end_to_end_churn_project.py   (under a minute)
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
pd.set_option("display.width", 140)
pd.set_option("display.max_columns", 20)
SNAPSHOT = pd.Timestamp("2026-01-01")      # the date on which we make predictions


# %% 0. The business problem (always write this down first)
# StreamBox, a fictional video streaming service, loses subscribers every month.
# The retention team can send a discount offer:
OFFER_COST = 15.0        # dollars per customer who receives the offer
SAVE_RATE = 0.30         # 30% of would-be churners who get the offer decide to stay
CUSTOMER_VALUE = 120.0   # future profit from a customer who stays
# Decision the model drives: WHO gets the offer. Success = campaign profit, not accuracy.
# Back-of-envelope: targeting a true churner earns 0.30 * 120 = 36 dollars on average and
# costs 15. So target a customer if P(churn) * 36 > 15, i.e. P(churn) > 0.42, IF the model's
# probabilities are calibrated. We will check this empirically.


# %% 1. The raw data (generated here so the project is self-contained; pretend it came from SQL)
def make_raw_data(n=8000, seed=7):
    rng = np.random.default_rng(seed)
    signup = SNAPSHOT - pd.to_timedelta(rng.integers(30, 3 * 365, n), unit="D")
    tenure = (SNAPSHOT - signup).days.to_numpy() / 30.44
    plan = rng.choice(["basic", "standard", "premium"], n, p=[0.5, 0.35, 0.15])
    used_discount = rng.random(n) < 0.25
    fee = pd.Series(plan).map({"basic": 9.99, "standard": 15.99, "premium": 22.99}).to_numpy()
    fee = np.round(fee * np.where(used_discount, 0.7, 1.0), 2)
    country = rng.choice(["US", "UK", "DE", "FR", "NL", "BR"], n, p=[0.35, 0.15, 0.15, 0.12, 0.08, 0.15])
    age = np.clip(rng.normal(38, 12, n), 18, 85).round()
    payment = rng.choice(["card", "paypal", "bank_transfer", "gift_card"], n, p=[0.55, 0.25, 0.12, 0.08])
    devices = rng.integers(1, 6, n)
    logins = np.round(rng.gamma(2.0, 2.0, n) * (1 + 0.15 * devices), 1)
    tickets = rng.poisson(0.8, n)
    late = rng.poisson(np.where(payment == "gift_card", 0.6, 0.15))
    days_since_login = np.round(rng.exponential(3 + 20 / (1 + logins)))

    logit = (-1.6 + 0.8 * (plan == "basic") - 0.5 * (plan == "premium") - 0.04 * tenure
             + 0.45 * tickets - 0.18 * logins + 0.06 * days_since_login + 0.5 * late
             + 0.6 * used_discount + 0.4 * (payment == "gift_card") + 0.3 * (country == "BR")
             - 0.01 * (age - 38))
    churned = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)

    df = pd.DataFrame({
        "customer_id": [f"C{100000 + i}" for i in range(n)],
        "signup_date": signup.strftime("%Y-%m-%d"),
        "plan": plan, "monthly_fee": fee, "used_discount": used_discount, "country": country,
        "age": age, "payment_method": payment, "num_devices": devices,
        "avg_weekly_logins": logins, "days_since_last_login": days_since_login,
        "support_tickets_90d": tickets, "late_payments_12m": late,
        # Filled in when a customer cancels (exit survey). You will see why this is a problem.
        "cancellation_survey_score": np.where((churned == 1) & (rng.random(n) < 0.7),
                                              rng.integers(1, 6, n), np.nan),
        "churned": churned,
    })
    # Real-world mess:
    messy = rng.random(n)
    df.loc[messy < 0.05, "plan"] = df.loc[messy < 0.05, "plan"].str.upper()
    df.loc[(messy >= 0.05) & (messy < 0.10), "plan"] = df.loc[(messy >= 0.05) & (messy < 0.10), "plan"] + " "
    df.loc[rng.random(n) < 0.06, "payment_method"] = df["payment_method"].str.capitalize()
    df.loc[rng.random(n) < 0.03, "country"] = np.nan
    df.loc[rng.random(n) < 0.08, "age"] = np.nan
    df.loc[rng.random(n) < 0.05, "avg_weekly_logins"] = np.nan        # tracking outage
    bug = rng.random(n) < 0.005
    df.loc[bug, "monthly_fee"] = df.loc[bug, "monthly_fee"] * 100     # decimal point dropped
    dupes = df.sample(frac=0.01, random_state=seed)
    return pd.concat([df, dupes], ignore_index=True)


make_raw_data().to_csv(OUT / "churn_raw.csv", index=False)
df = pd.read_csv(OUT / "churn_raw.csv")
print("RAW DATA")
print(df.head(3).T)


# %% 2. First look
print(f"\nshape: {df.shape}")
print(f"churn rate: {df['churned'].mean():.1%}")
print("\nshare missing per column:")
print(df.isna().mean().round(3)[lambda s: s > 0])
print("\nnumeric summary:")
print(df.describe().T[["mean", "min", "50%", "max"]].round(2))
# Things a careful person notices here:
#   - monthly_fee max is in the thousands: impossible for a ~10-25 dollar product
#   - cancellation_survey_score is missing for most rows. Why? Who fills it in?
#   - age and avg_weekly_logins have gaps


# %% 3. Cleaning
before = len(df)
df = df.drop_duplicates()
print(f"\nremoved {before - len(df)} duplicate rows")

print("plan values before cleaning:", sorted(df["plan"].unique()))
for col in ["plan", "payment_method"]:
    df[col] = df[col].str.strip().str.lower()
print("plan values after cleaning: ", sorted(df["plan"].unique()))

bug = df["monthly_fee"] > 100
print(f"fixing {bug.sum()} fees above 100 (known decimal bug, confirmed with the billing team)")
df.loc[bug, "monthly_fee"] = (df.loc[bug, "monthly_fee"] / 100).round(2)
df["signup_date"] = pd.to_datetime(df["signup_date"])


# %% 4. LEAKAGE AUDIT: would we know this at prediction time?
print("\nchurn rate by whether the exit survey is filled in:")
print(df.groupby(df["cancellation_survey_score"].notna())["churned"].agg(["mean", "count"]))
# Survey filled -> 100% churn. The survey happens AT cancellation, after the moment we need to
# predict. A model would learn "survey exists = churn" and look brilliant offline, then be
# useless in production where nobody has filled it in yet. DROP IT.
df = df.drop(columns=["cancellation_survey_score"])
# customer_id is an identifier, not a behavior. Keep it aside for outputs, never as a feature.


# %% 5. Feature engineering
df["tenure_months"] = ((SNAPSHOT - df["signup_date"]).dt.days / 30.44).round(1)
df["logins_per_device"] = df["avg_weekly_logins"] / df["num_devices"]
df["inactive_14d"] = (df["days_since_last_login"] > 14).astype(int)
df["used_discount"] = df["used_discount"].astype(int)

NUMERIC = ["tenure_months", "monthly_fee", "age", "avg_weekly_logins", "days_since_last_login",
           "support_tickets_90d", "late_payments_12m", "num_devices", "logins_per_device",
           "used_discount", "inactive_14d"]
CATEGORICAL = ["plan", "country", "payment_method"]
FEATURES = NUMERIC + CATEGORICAL
X, y = df[FEATURES], df["churned"]
ids = df["customer_id"]


# %% 6. Split. Test set goes in the vault.
X_train, X_test, y_train, y_test, ids_train, ids_test = train_test_split(
    X, y, ids, test_size=0.2, stratify=y, random_state=0)
print(f"\ntrain {len(X_train)} rows, test {len(X_test)} rows, churn rate {y_train.mean():.1%} / {y_test.mean():.1%}")
# In a real company you would split by TIME (train on customers snapshotted in earlier months,
# test on the latest month), because that is how the model will be used. This dataset has a
# single snapshot, so a stratified random split is the honest option.


# %% 7. Preprocessing pipeline
numeric_pipe = Pipeline([
    ("impute", SimpleImputer(strategy="median", add_indicator=True)),   # + "was missing" flags
    ("scale", StandardScaler()),
])
categorical_pipe = Pipeline([
    ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
    ("onehot", OneHotEncoder(handle_unknown="ignore")),
])
preprocess = ColumnTransformer([("num", numeric_pipe, NUMERIC), ("cat", categorical_pipe, CATEGORICAL)])


def make_model(estimator):
    return Pipeline([("prep", preprocess), ("model", estimator)])


# %% 8. Baselines, then real models, all with the same cross-validation
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
rule_score = X_train["days_since_last_login"]           # rule: "the longer inactive, the riskier"
print("\nCROSS-VALIDATED RESULTS (training set)        ROC AUC    PR AUC")
print(f"  {'baseline: predict churn rate':<40} {0.5:>8.3f}  {y_train.mean():>8.3f}")
print(f"  {'baseline: rule on days since login':<40} {roc_auc_score(y_train, rule_score):>8.3f}  "
      f"{average_precision_score(y_train, rule_score):>8.3f}")

candidates = {
    "logistic regression": LogisticRegression(max_iter=2000),
    "random forest": RandomForestClassifier(n_estimators=300, min_samples_leaf=5, n_jobs=-1, random_state=0),
    "hist gradient boosting": HistGradientBoostingClassifier(learning_rate=0.05, max_iter=300,
                                                             early_stopping=True, random_state=0),
}
cv_results = {}
for name, estimator in candidates.items():
    res = cross_validate(make_model(estimator), X_train, y_train, cv=cv,
                         scoring=["roc_auc", "average_precision"], n_jobs=-1)
    cv_results[name] = res["test_average_precision"].mean()
    print(f"  {name:<40} {res['test_roc_auc'].mean():>8.3f}  {res['test_average_precision'].mean():>8.3f}")
best_name = max(cv_results, key=cv_results.get)
print(f"chosen model (best PR AUC): {best_name}")
# Logistic regression is often close to the winner on data like this, because the true pattern
# is mostly additive. If the scores are within noise, the simpler model is the better choice.


# %% 9. Choose the decision threshold with MONEY, using out-of-fold predictions
model = make_model(candidates[best_name])
oof = cross_val_predict(model, X_train, y_train, cv=cv, method="predict_proba", n_jobs=-1)[:, 1]


def campaign_profit(y_true, proba, threshold):
    target = proba >= threshold
    saved_value = np.sum(target & (y_true == 1)) * SAVE_RATE * CUSTOMER_VALUE
    return saved_value - target.sum() * OFFER_COST


thresholds = np.round(np.arange(0.05, 0.91, 0.01), 2)
profits = [campaign_profit(y_train.to_numpy(), oof, t) for t in thresholds]
best_t = float(thresholds[int(np.argmax(profits))])
print(f"\nprofit-maximizing threshold on out-of-fold predictions: {best_t:.2f} "
      f"(theory with calibrated probabilities: {OFFER_COST / (SAVE_RATE * CUSTOMER_VALUE):.2f})")


# %% 10. The one and only test evaluation
model.fit(X_train, y_train)
proba_test = model.predict_proba(X_test)[:, 1]
pred_test = (proba_test >= best_t).astype(int)
yt = y_test.to_numpy()
everyone = campaign_profit(yt, proba_test, 0.0)
model_profit = campaign_profit(yt, proba_test, best_t)
print("\nTEST SET")
print(f"  ROC AUC {roc_auc_score(yt, proba_test):.3f} | PR AUC {average_precision_score(yt, proba_test):.3f}")
print(f"  at threshold {best_t:.2f}: target {pred_test.sum()} of {len(yt)} customers, "
      f"precision {precision_score(yt, pred_test):.2f}, recall {recall_score(yt, pred_test):.2f}")
print(f"  campaign profit: model ${model_profit:,.0f} | target everyone ${everyone:,.0f} | target nobody $0")
per_10k = model_profit / len(yt) * 10_000
print(f"  -> about ${per_10k:,.0f} per 10,000 customers per campaign. THIS is the number for your manager.")


# %% 11. What drives the predictions? (permutation importance on the TEST set)
perm = permutation_importance(model, X_test, y_test, scoring="average_precision", n_repeats=5,
                              random_state=0, n_jobs=-1)
importance = pd.Series(perm.importances_mean, index=FEATURES).sort_values(ascending=False)
print("\ndrop in PR AUC when each feature is shuffled:")
print(importance.round(4).to_string())
# Importance = "the model relies on it", not "it causes churn". Do not tell the business that
# support tickets CAUSE churn. Maybe unhappy customers both file tickets and leave.


# %% 12. Slices: does it work for every segment?
slice_df = X_test.assign(churned=yt, proba=proba_test)
rows = []
for col in ["plan", "country"]:
    for value, g in slice_df.groupby(col, dropna=False):
        if g["churned"].nunique() == 2:
            rows.append({"slice": f"{col}={value}", "n": len(g), "churn_rate": g["churned"].mean(),
                         "roc_auc": roc_auc_score(g["churned"], g["proba"])})
print("\nperformance by slice:")
print(pd.DataFrame(rows).round(3).to_string(index=False))
# Look for segments where the model is much worse, or where few examples make results unreliable.


# %% 13. Save the model, its metadata, and a model card
joblib.dump(model, OUT / "churn_model.joblib")
metadata = {
    "model": best_name,
    "features": FEATURES,
    "threshold": best_t,
    "snapshot_date": str(SNAPSHOT.date()),
    "label": "cancelled within 60 days of snapshot",
    "test_metrics": {"roc_auc": round(roc_auc_score(yt, proba_test), 4),
                     "pr_auc": round(average_precision_score(yt, proba_test), 4),
                     "profit_per_10k_customers": round(per_10k, 2)},
    "versions": {"sklearn": sklearn.__version__, "pandas": pd.__version__, "numpy": np.__version__},
}
(OUT / "churn_model.json").write_text(json.dumps(metadata, indent=2))

card = f"""# Model card: StreamBox churn model

**Purpose**: rank subscribers by risk of cancelling within 60 days so the retention team can send offers.
**Not for**: pricing decisions, or any decision about individual customers without human review.

**Data**: {len(df):,} subscribers at snapshot {SNAPSHOT.date()}, after removing duplicates.
**Removed for leakage**: cancellation_survey_score (filled in only after cancelling).
**Model**: {best_name}, scikit-learn pipeline with imputation, scaling and one-hot encoding.
**Decision threshold**: {best_t:.2f}, chosen to maximize campaign profit
(offer cost ${OFFER_COST:.0f}, save rate {SAVE_RATE:.0%}, customer value ${CUSTOMER_VALUE:.0f}).

**Test results**: ROC AUC {metadata['test_metrics']['roc_auc']}, PR AUC {metadata['test_metrics']['pr_auc']},
estimated profit ${per_10k:,.0f} per 10,000 customers per campaign.

**Known limitations**:
- Random split on a single snapshot; performance on future months may differ. Validate on a time split.
- Profit estimate depends on the assumed save rate, which must be measured with an A/B test.
- Small segments (see slice table) have unreliable metrics.

**Monitoring plan**: weekly check of input distributions (drift) and monthly check of precision
on customers whose outcome is now known. Retrain when performance drops below the agreed level.
"""
(OUT / "churn_model_card.md").write_text(card)
print("\nsaved churn_model.joblib, churn_model.json and churn_model_card.md in outputs/")

# Scoring list for the retention team: highest risk first.
scored = pd.DataFrame({"customer_id": ids_test, "churn_probability": proba_test.round(3)})
scored = scored[scored["churn_probability"] >= best_t].sort_values("churn_probability", ascending=False)
scored.to_csv(OUT / "customers_to_target.csv", index=False)
print(f"wrote {len(scored)} customers to customers_to_target.csv")

# %% Your turn (in order of difficulty)
# 1. Put cancellation_survey_score back in and rerun. Watch the "amazing" results. Then explain,
#    in two sentences a manager would understand, why you removed it.
# 2. Replace the profit assumptions (save rate 10%, offer cost $30). How do threshold and profit move?
# 3. Calibrate the chosen model (sklearn.calibration.CalibratedClassifierCV). Does the best
#    threshold move closer to the theoretical 0.42?
# 4. Add a feature: fee_increase_risk = 1 if used_discount (discounts expire). Does it help?
