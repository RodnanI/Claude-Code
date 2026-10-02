# scikit-learn and Feature Engineering

You have built models from scratch, so you know what is inside them. At work you will not write your own logistic regression. You will use scikit-learn (and LightGBM, XGBoost, PyTorch), and your value comes from **how you prepare data, structure the workflow and evaluate**. This file covers both halves: the library and the craft of features.

Labs: `02_sklearn_workflow_lab.py`, then the big one, `03_end_to_end_churn_project.py`.

## Part 1: scikit-learn

### The API in one screen

Everything in scikit-learn follows the same pattern you built in module 1:

```python
model = SomeModel(hyperparameter=value)   # 1. configure (hyperparameters go in the constructor)
model.fit(X_train, y_train)               # 2. learn (learned attributes end with _, like coef_)
model.predict(X_new)                      # 3. use
model.predict_proba(X_new)                # probabilities (classifiers)
model.score(X_test, y_test)               # default metric (accuracy or R2). Usually not the one you want
```

Two kinds of objects:

- **Estimators / models**: `fit` + `predict`. `LogisticRegression`, `RandomForestClassifier`.
- **Transformers**: `fit` + `transform` (+ `fit_transform`). `StandardScaler`, `OneHotEncoder`, `SimpleImputer`. They learn something from training data (a mean, a list of categories) and apply it to any data.

Golden rule: **`fit` only ever sees training data.** `transform` and `predict` can see anything.

### Pipelines: the most important tool in the library

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

pipe = Pipeline([
    ("scale", StandardScaler()),
    ("model", LogisticRegression()),
])
pipe.fit(X_train, y_train)      # fits the scaler on train, transforms, fits the model
pipe.predict(X_test)            # transforms test with TRAIN statistics, then predicts
```

Why pipelines matter so much:

1. **No leakage**: cross-validation refits every step inside each fold automatically.
2. **One object to deploy**: preprocessing and model travel together. No "we forgot to scale in production" bugs. This is a real, common, expensive bug.
3. **Tunable**: grid search can tune preprocessing choices and model hyperparameters together (`model__C`, `scale__with_mean`).

### ColumnTransformer: different columns, different treatment

Real tables mix numbers and categories:

```python
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

numeric = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
categorical = Pipeline([("impute", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore"))])
preprocess = ColumnTransformer([
    ("num", numeric, ["age", "income", "tenure"]),
    ("cat", categorical, ["country", "plan"]),
])
full = Pipeline([("prep", preprocess), ("model", LogisticRegression(max_iter=1000))])
```

`handle_unknown="ignore"` matters: production will send a category you never saw in training (a new country, a new plan). Without it the pipeline crashes.

### Model selection tools

| Tool | Use |
|------|-----|
| `train_test_split(X, y, test_size=0.2, stratify=y, random_state=0)` | the first split |
| `cross_val_score(pipe, X, y, cv=5, scoring="roc_auc")` | one metric, k folds |
| `cross_validate(..., scoring=["roc_auc", "average_precision"])` | several metrics plus timing |
| `StratifiedKFold`, `GroupKFold`, `TimeSeriesSplit` | the right kind of folds (module 3) |
| `GridSearchCV(pipe, param_grid, cv=5, scoring=...)` | try every combination |
| `RandomizedSearchCV(pipe, param_distributions, n_iter=30)` | try random combinations. Usually better than grid search for the same budget |
| `cross_val_predict` | out-of-fold predictions for every training row (great for threshold tuning) |

Always set `scoring` explicitly. The default (accuracy) is wrong for most real problems. Bigger libraries for tuning: Optuna (very popular), Ray Tune.

### Saving models

```python
import joblib
joblib.dump(pipe, "model.joblib")
pipe = joblib.load("model.joblib")
```

Two warnings:

- Load with the **same library versions** you saved with. Record them next to the model.
- joblib and pickle files can **execute code when loaded**. Never load a model file from an untrusted source. (For deep learning, the `safetensors` format exists for this reason.)

### Pitfalls that bite everyone once

- `LogisticRegression(C=...)`: C is the *inverse* of regularization strength. Small C = strong regularization.
- Forgetting `random_state` and wondering why results change.
- Forgetting that `score()` is accuracy.
- `class_weight="balanced"` helps imbalanced problems for many models, but it distorts predicted probabilities. If you need calibrated probabilities, recalibrate.
- Passing pandas DataFrames in training and NumPy arrays in production (column order silently changes). Keep one format, preferably DataFrames with named columns.

## Part 2: Feature engineering

A **feature** is any input the model gets. Feature engineering is turning raw data into inputs that make the pattern easy to learn. On tabular problems it is often worth more than any model change.

### Numeric features

- **Scaling**: standardization `(x - mean) / std` for linear models, kNN, SVMs, neural nets. Trees do not need it. `RobustScaler` uses median and IQR when outliers exist.
- **Log transform** for skewed positive values (income, prices, counts): `np.log1p(x)`. Makes linear relationships more likely and tames outliers.
- **Clipping (winsorizing)**: cap values at, say, the 1st and 99th percentile.
- **Ratios and differences**: `price_per_m2 = price / size`, `spend_change = spend_this_month - spend_last_month`. Models (especially linear ones) do not invent these on their own easily.
- **Binning**: turn age into age groups. Loses information; useful for linear models and for explaining.

### Categorical features

| Method | How | When |
|--------|-----|------|
| one-hot | one 0/1 column per category | few categories (up to ~50). The default |
| ordinal | map to 0, 1, 2 in a meaningful order | ordered categories (small < medium < large), and tree models |
| target encoding | replace category with the average label for that category, computed out-of-fold | many categories (zip codes, product IDs). Leakage risk: must be done inside CV (`sklearn.preprocessing.TargetEncoder` does this) |
| frequency encoding | replace category with how often it appears | high cardinality, quick win |
| hashing | hash category into a fixed number of columns | huge, open-ended category sets |
| native support | CatBoost, LightGBM, HistGradientBoosting handle categories directly | tree models |

Group rare categories into "other". Clean spelling variants first ("UK", "uk ", "United Kingdom").

### Missing values

First ask **why** it is missing. Missing because a sensor failed at random is different from missing because the customer refused to answer (which itself carries information).

- **Simple imputation**: median for numbers, most frequent or a constant "missing" for categories.
- **Missing indicators**: add a 0/1 column "was this missing?" (`SimpleImputer(add_indicator=True)`). Often predictive.
- **Model-native handling**: HistGradientBoosting, LightGBM and XGBoost learn which way missing values should go at each split.
- **Do not** fill with 0 or -999 blindly for linear models: it creates fake extreme values.

### Dates and times

- Extract parts: hour, day of week, month, is_weekend, is_holiday.
- **Time since** something: days since signup, days since last purchase. Often the strongest features in customer problems.
- **Cyclical encoding**: hour 23 and hour 0 are neighbors, but as numbers they are far apart. Encode with `sin(2*pi*hour/24)` and `cos(2*pi*hour/24)` for models that care (linear, neural).
- Time zones and daylight saving: a classic source of silent bugs. Store UTC, convert deliberately.

### Aggregations: where the real power is

The best features in industry are usually **aggregates of behavior over time windows**:

- number of logins in the last 7, 30, 90 days
- average order value over the last 3 months
- number of failed payments in the last year
- trend: last 30 days vs the 30 before

They must be computed **as of the prediction time** (point-in-time correctness, module 3). Getting this right is a big part of why companies build feature stores.

### Text features

- Bag of words and **TF-IDF** (term frequency times inverse document frequency) with n-grams, plus a linear model: a strong, cheap baseline.
- **Embeddings** from a pretrained model (module 7): one dense vector per text that captures meaning. Feed them to any model.

### Imbalanced classes

- Use the right metric (PR AUC, recall at a fixed precision, cost).
- Try `class_weight="balanced"` or tune the decision threshold. Threshold tuning alone often solves the "imbalance problem".
- Resampling (undersampling the majority, oversampling the minority, SMOTE) only inside cross-validation folds, never before splitting. Its benefits are often smaller than people expect; compare honestly.

### Feature selection

- Remove leaky features (the most important selection you will ever do).
- Remove IDs, constants, near-duplicates.
- L1 regularization or permutation importance to find dead weight.
- Do not obsess. Gradient boosting tolerates many useless features. Fewer features mainly help with speed, maintenance and explanation.

### Domain knowledge beats everything

Spend an hour with the people who know the business. "Customers who call support twice in a week usually cancel" is a feature idea no algorithm will give you, and it will beat a week of hyperparameter tuning.

## Check yourself

1. Why does a pipeline prevent leakage during cross-validation?
2. A `country` column has 180 values, most of them rare. How would you encode it for logistic regression? For LightGBM?
3. You add a "days since last purchase" feature and AUC jumps from 0.71 to 0.93. What do you check before celebrating?
4. Why encode hour of day with sine and cosine?
