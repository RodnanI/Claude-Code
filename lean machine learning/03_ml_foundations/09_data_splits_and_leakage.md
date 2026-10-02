# Data Splits and Data Leakage

Data leakage is the most dangerous bug in machine learning, because it produces no error message. It produces **great results**. You celebrate, you ship, and the model collapses in production. Experienced practitioners are paranoid about it. You should be too.

Run `10_leakage_lab.py` to watch leakage fake excellent results out of pure noise.

## What leakage is

**Leakage = the model gets information during training or evaluation that it will not have when making real predictions.**

Two broad families:

1. **Target leakage**: a feature secretly contains the answer.
2. **Train-test contamination**: information from the evaluation data bleeds into training, so the evaluation is no longer a fair test.

## Target leakage

Classic examples:

| Goal | Leaky feature | Why it leaks |
|------|---------------|--------------|
| predict churn | `cancellation_reason` | only filled in after the customer already churned |
| predict fraud | `chargeback_filed` | happens weeks after the fraud, because of the fraud |
| predict pneumonia | `took_antibiotics` | the treatment happens because of the diagnosis |
| predict loan default | `collections_calls_count` | collections only call people who already defaulted |
| predict hospital readmission | `discharge_summary` text mentioning follow-up for complications | written with knowledge of the outcome |

**The one question that catches most target leakage:**

> For each feature: would I actually know this value at the exact moment I need to make the prediction?

If the answer is "no" or "not always", the feature must go, or be recomputed using only data available at prediction time.

Timestamps help. If you know *when* each feature value was recorded and *when* the prediction is made, you can enforce "only use data from before the prediction time". This is called **point-in-time correctness**, and feature stores at big companies exist partly to guarantee it.

## Train-test contamination

### Preprocessing on the full dataset

Wrong:

```python
X_scaled = scaler.fit_transform(X)          # uses statistics of ALL rows, including test rows
X_train, X_test = split(X_scaled)
```

Right:

```python
X_train, X_test = split(X)
scaler.fit(X_train)                          # learn statistics from training data only
X_train_s, X_test_s = scaler.transform(X_train), scaler.transform(X_test)
```

For scaling the damage is small. For anything that looks at the label, it is huge:

- **Feature selection** on all data (picking features that correlate with the label) can make pure noise look predictive. The lab shows accuracy jumping from 50% to well above it on random data.
- **Target encoding** (replacing a category with the average label of that category) computed on all data directly copies label information into features.
- **Oversampling** (duplicating or synthesizing minority examples, like SMOTE) before splitting puts copies of the same example on both sides.
- **Imputation, PCA, vocabulary building**: smaller effects, same principle.

**The fix: scikit-learn Pipelines.** Put every preprocessing step inside a `Pipeline` and run cross-validation on the whole pipeline. Each fold then fits preprocessing only on its own training part. Module 5 makes this a habit.

### Duplicates and near-duplicates

If the same example (or almost the same: a resized image, a reposted article, the same customer under two IDs) is in both train and test, the model just recognizes it. Deduplicate before splitting.

### Group leakage

Many datasets have several rows per entity: several scans per patient, several sessions per user, several photos per product, several chunks per document. If rows from the same entity land in both train and test, the model can learn to recognize the *entity* instead of the pattern. It looks great on your test set and fails on new patients or new users.

**Fix: split by group**, so each entity is entirely in train or entirely in test (`GroupKFold`, `GroupShuffleSplit`).

### Temporal leakage

If the data has a time order and you will predict the future in production, you must evaluate by predicting the future:

- **Never randomly split time series.** A random split lets the model train on Wednesday and Friday and "predict" Thursday, which is interpolation, not forecasting.
- **Split by time**: train on January to June, validate on July, test on August. `TimeSeriesSplit` does rolling versions of this.
- **Leave a gap** between train and test if labels take time to become known (a loan default is only known months later).
- **Check feature windows**: a "30 day average spend" must use the 30 days *before* the prediction date, not centered around it.

### Leakage through your own decisions

Every time you look at test results and change something, information leaks from the test set into your choices. Use validation data (or cross-validation) for all decisions and touch the test set once. In LLM land the same problem appears as **benchmark contamination**: test questions that ended up in the pretraining data, so scores reflect memory instead of ability.

## Splitting strategies

| Strategy | Use when |
|----------|----------|
| random split | rows are independent, no time order, no groups |
| **stratified** split | classification, especially imbalanced: keeps the class ratio equal in every split (`stratify=y`) |
| **group** split | several rows per entity (users, patients, documents) |
| **time** split | the model will predict the future |
| group + time | both, which is common in real products |

### Cross-validation

With **k-fold cross-validation**, the data is cut into k parts (folds). Train on k-1 folds, validate on the remaining one, rotate k times, average the scores. Every example is used for validation exactly once.

- Typical k: 5 or 10.
- Gives a mean and a spread, so you see how stable the score is.
- Use the stratified, group or time-series versions when the situation calls for it.
- Costs k times the training. For big deep learning models people usually use a single validation split instead.

**Nested cross-validation** (an inner loop for tuning, an outer loop for evaluation) gives an honest estimate when you tune heavily on small data.

### How much data in each split?

No magic numbers. Common starting points: 70/15/15 or 80/10/10 for moderate data; with millions of rows, 98/1/1 is fine because 1% is still plenty. The test set must be big enough that its score is not noise (recall the standard error from module 2) and must look like production data.

## Red flags that scream "leakage"

- Results are far better than published work or than what domain experts expect.
- One feature dominates feature importance, and it is not obviously causal.
- Validation score is higher than training score.
- Near-perfect scores on a hard problem (99% on predicting human behavior is almost always a bug).
- The model degrades sharply as soon as it meets live data.

When you see these, do not celebrate. Investigate.

## Leakage checklist (print this)

1. For every feature: is it available at prediction time, with the value it would have then?
2. Did I split before any preprocessing that learns from data?
3. Is all preprocessing inside a pipeline that is refit per fold?
4. Did I remove duplicates and near-duplicates across splits?
5. Can the same user, patient, document or product appear in train and test?
6. If time matters, does every training example come before every test example?
7. Have I made decisions by looking at the test set?
8. Does the test set look like the data the model will see in production?

## Check yourself

1. You predict next month's sales. You randomly split three years of daily data and get excellent results. What is wrong and how do you fix it?
2. A colleague selects the 50 best features using the whole dataset, then runs 5-fold cross-validation. Why is the score optimistic?
3. A skin cancer model scores 98% AUC. You notice many test images come from the same patients as training images. What do you do?
4. Is `customer_lifetime_value` a safe feature for predicting whether a new customer will churn in their first month?
