# Data Splits and Data Leakage

Data leakage is a dangerous bug because it produces no error message, only great results. You celebrate, you ship, and the model collapses in production. Experienced practitioners check for it habitually, and you should too.

Run `10_leakage_lab.py` to watch leakage fake excellent results out of pure noise.

## What leakage is

Leakage means the model gets information during training or evaluation that it will not have when making real predictions. It comes in two kinds. In target leakage, a feature secretly contains the answer. In train-test contamination, information from the evaluation data reaches training, so the evaluation is no longer a fair test.

## Target leakage

Classic examples:

| Goal | Leaky feature | Why it leaks |
|------|---------------|--------------|
| predict churn | `cancellation_reason` | only filled in after the customer already churned |
| predict fraud | `chargeback_filed` | happens weeks after the fraud, because of the fraud |
| predict pneumonia | `took_antibiotics` | the treatment happens because of the diagnosis |
| predict loan default | `collections_calls_count` | collections only call people who already defaulted |
| predict hospital readmission | `discharge_summary` text mentioning follow-up for complications | written with knowledge of the outcome |

One question catches most target leakage. For each feature, would you actually know this value at the moment you need to make the prediction? If the answer is no, or not always, drop the feature or recompute it from data available at prediction time.

Timestamps help. If you know when each feature value was recorded and when the prediction is made, you can enforce that only earlier data is used. This is called point-in-time correctness, and feature stores at large companies exist partly to guarantee it.

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

For scaling the damage is small. For anything that looks at the label it is large. Feature selection on all the data, picking features that correlate with the label, can make pure noise look predictive, and the lab shows accuracy rising from 50% to well above it on random data. Target encoding, which replaces a category with its average label, copies label information into the features when computed on all the data. Oversampling (duplicating or synthesizing minority examples, as SMOTE does) before the split puts copies of one example on both sides. Imputation, PCA and vocabulary building have smaller effects but follow the same principle.

The fix is a scikit-learn `Pipeline`. Put every preprocessing step inside it and cross-validate the whole pipeline, so each fold fits preprocessing only on its own training part. Module 5 makes this routine.

### Duplicates and near-duplicates

If the same example, or nearly the same one (a resized image, a reposted article, a customer with two IDs), is in both train and test, the model simply recognizes it. Deduplicate before splitting.

### Group leakage

Many datasets have several rows per entity: several scans per patient, several sessions per user, several photos per product, several chunks per document. If rows from the same entity land in both train and test, the model can learn to recognize the entity instead of the pattern. It looks great on your test set and fails on new patients or new users. Split by group so each entity is entirely in train or entirely in test (`GroupKFold`, `GroupShuffleSplit`).

### Temporal leakage

If the data has a time order and production will predict the future, evaluate by predicting the future. Do not split time series randomly: a random split lets the model train on Wednesday and Friday and "predict" Thursday, which is interpolation and not forecasting. Split by time instead, for example training on January to June, validating on July and testing on August; `TimeSeriesSplit` does rolling versions of this. Leave a gap between train and test if labels take time to become known, as with a loan default that shows only months later. Check the feature windows too, since a 30 day average spend must use the 30 days before the prediction date and not a window centered on it.

### Leakage through your own decisions

Every time you look at test results and change something, information leaks from the test set into your choices. Use validation data (or cross-validation) for all decisions and touch the test set once. LLMs have the same problem under the name benchmark contamination: test questions that ended up in the pretraining data, so scores reflect memory instead of ability.

## Splitting strategies

| Strategy | Use when |
|----------|----------|
| random split | rows are independent, no time order, no groups |
| stratified split | classification, especially imbalanced: keeps the class ratio equal in every split (`stratify=y`) |
| group split | several rows per entity (users, patients, documents) |
| time split | the model will predict the future |
| group + time | both, which is common in real products |

### Cross-validation

In k-fold cross-validation the data is cut into k parts (folds). You train on k-1 folds, validate on the remaining one, rotate k times and average the scores, so every example is used for validation exactly once. A typical k is 5 or 10. You get a mean and a spread, which shows how stable the score is. Use the stratified, group or time-series versions when the data calls for them. The cost is k times the training, so big deep learning models usually get a single validation split instead.

Nested cross-validation, with an inner loop for tuning and an outer loop for evaluation, gives an honest estimate when you tune heavily on small data.

### How much data in each split?

There are no magic numbers. Common starting points are 70/15/15 or 80/10/10 for moderate data, and with millions of rows 98/1/1 is fine because 1% is still plenty. The test set must be big enough that its score is not noise (recall the standard error from module 2) and must look like production data.

## Signs of leakage

Suspect leakage when results are far better than published work or than domain experts expect, when one feature dominates the feature importances without an obvious causal reason, when the validation score is higher than the training score, when a hard problem gets a near-perfect score (99% at predicting human behavior is almost always a bug), or when the model degrades sharply on live data. In any of these cases, investigate before celebrating.

## Leakage checklist

1. For every feature: is it available at prediction time, with the value it would have then?
2. Did I split before any preprocessing that learns from data?
3. Is all preprocessing inside a pipeline that is refit per fold?
4. Did I remove duplicates and near-duplicates across splits?
5. Can the same user, patient, document or product appear in train and test?
6. If time matters, does every training example come before every test example?
7. Have I made decisions by looking at the test set?
8. Does the test set look like the data the model will see in production?

## Questions

1. You predict next month's sales. You randomly split three years of daily data and get excellent results. What is wrong and how do you fix it?
2. A colleague selects the 50 best features using the whole dataset, then runs 5-fold cross-validation. Why is the score optimistic?
3. A skin cancer model scores 98% AUC. You notice many test images come from the same patients as training images. What do you do?
4. Is `customer_lifetime_value` a safe feature for predicting whether a new customer will churn in their first month?
