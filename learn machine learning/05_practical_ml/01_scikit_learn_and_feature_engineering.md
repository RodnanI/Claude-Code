# scikit-learn and Feature Engineering

You have built models from scratch, so you know what is inside them. At work you will not write your own logistic regression; you will use scikit-learn, LightGBM, XGBoost and PyTorch, and your contribution lies in preparing data, structuring the workflow and evaluating. This file covers the library and the craft of features.

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

There are two kinds of objects. Estimators (models) have `fit` and `predict`, as in `LogisticRegression` and `RandomForestClassifier`. Transformers have `fit` and `transform`, plus `fit_transform`, as in `StandardScaler`, `OneHotEncoder` and `SimpleImputer`; they learn something from training data, such as a mean or a list of categories, and apply it to any data.

`fit` should only ever see training data, while `transform` and `predict` can see anything.

### Pipelines

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

Pipelines matter for three reasons. They prevent leakage, because cross-validation refits every step inside each fold. They give you one object to deploy, with preprocessing and model together, which avoids the common and expensive bug of forgetting to scale in production. And grid search can tune preprocessing choices and model hyperparameters together (`model__C`, `scale__with_mean`).

### ColumnTransformer

Real tables mix numbers and categories, and each needs its own treatment:

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

`handle_unknown="ignore"` matters because production will send a category you never saw in training, such as a new country or plan. Without it the pipeline crashes.

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

Set `scoring` explicitly, because the default (accuracy) is wrong for most real problems. For larger tuning jobs, Optuna and Ray Tune are the usual libraries.

### Saving models

```python
import joblib
joblib.dump(pipe, "model.joblib")
pipe = joblib.load("model.joblib")
```

Load with the same library versions you saved with, and record them next to the model. Also, joblib and pickle files can execute code when loaded, so never load a model file from an untrusted source. The `safetensors` format exists for deep learning for this reason.

### Common pitfalls

In `LogisticRegression(C=...)`, C is the inverse of regularization strength, so a small C means strong regularization. Leaving out `random_state` makes results change between runs. `score()` is accuracy. `class_weight="balanced"` helps imbalanced problems for many models but distorts predicted probabilities, so recalibrate if you need them calibrated. Training on pandas DataFrames and serving NumPy arrays changes column order without any warning, so keep one format, preferably DataFrames with named columns.

## Part 2: Feature engineering

A feature is any input the model gets. Feature engineering turns raw data into inputs that make the pattern easier to learn, and on tabular problems it is often worth more than any change of model.

### Numeric features

- Scaling: standardization, `(x - mean) / std`, suits linear models, kNN, SVMs and neural nets, while trees do not need it. `RobustScaler` uses the median and IQR when outliers exist.
- Log transform: use `np.log1p(x)` on skewed positive values such as income, prices and counts. It makes linear relationships more likely and tames outliers.
- Clipping (winsorizing): cap values at, say, the 1st and 99th percentile.
- Ratios and differences, such as `price_per_m2 = price / size` or `spend_change = spend_this_month - spend_last_month`. Models, linear ones especially, rarely find these on their own.
- Binning: turn age into age groups. It loses information but helps linear models and explanations.

### Categorical features

| Method | How | When |
|--------|-----|------|
| one-hot | one 0/1 column per category | few categories (up to ~50); the usual default |
| ordinal | map to 0, 1, 2 in a meaningful order | ordered categories (small < medium < large), and tree models |
| target encoding | replace category with the average label for that category, computed out-of-fold | many categories (zip codes, product IDs). Leakage risk: must be done inside CV (`sklearn.preprocessing.TargetEncoder` does this) |
| frequency encoding | replace category with how often it appears | high cardinality, quick win |
| hashing | hash category into a fixed number of columns | huge, open-ended category sets |
| native support | CatBoost, LightGBM, HistGradientBoosting handle categories directly | tree models |

Group rare categories into "other". Clean spelling variants first ("UK", "uk ", "United Kingdom").

### Missing values

First ask why the value is missing. A sensor that failed at random is different from a customer who refused to answer, which itself carries information.

For simple imputation, use the median for numbers and the most frequent value or a constant "missing" for categories. A missing indicator, a 0/1 column asking "was this missing?" (`SimpleImputer(add_indicator=True)`), is often predictive. HistGradientBoosting, LightGBM and XGBoost learn which way missing values should go at each split. For linear models, do not fill with 0 or -999 blindly, because that creates fake extreme values.

### Dates and times

Extract parts such as hour, day of week, month, is_weekend and is_holiday. Time since an event, such as days since signup or since the last purchase, is often the strongest feature in customer problems. Hour 23 and hour 0 are neighbors but far apart as numbers, so for linear and neural models encode them with `sin(2*pi*hour/24)` and `cos(2*pi*hour/24)`. Time zones and daylight saving cause silent bugs, so store UTC and convert deliberately.

### Aggregations

The best features in industry are usually aggregates of behavior over time windows, such as logins in the last 7, 30 and 90 days, average order value over the last 3 months, failed payments in the last year, or the last 30 days against the 30 before. They must be computed as of the prediction time (point-in-time correctness, module 3), and getting that right is a large part of why companies build feature stores.

### Text features

Bag of words or TF-IDF (term frequency times inverse document frequency) with n-grams, plus a linear model, makes a strong and cheap baseline. Embeddings from a pretrained model (module 7) give one dense vector per text that captures meaning, and any model can take them as input.

### Imbalanced classes

Use a suitable metric (PR AUC, recall at a fixed precision, cost). Try `class_weight="balanced"` or tune the decision threshold; threshold tuning alone often solves the imbalance problem. Resample (undersample the majority, oversample the minority, SMOTE) only inside cross-validation folds and never before splitting, and compare honestly, since the benefit is often smaller than people expect.

### Feature selection

Remove leaky features first, as this is the most valuable selection you can make. Then remove IDs, constants and near-duplicates, and use L1 regularization or permutation importance to find dead weight. Do not overdo it, since gradient boosting tolerates many useless features and fewer features mainly help speed, maintenance and explanation.

### Domain knowledge

Spend an hour with people who know the business. A remark like "customers who call support twice in a week usually cancel" gives you a feature no algorithm would, and it can beat a week of hyperparameter tuning.

## Questions

1. Why does a pipeline prevent leakage during cross-validation?
2. A `country` column has 180 values, most of them rare. How would you encode it for logistic regression? For LightGBM?
3. You add a "days since last purchase" feature and AUC jumps from 0.71 to 0.93. What do you check before celebrating?
4. Why encode hour of day with sine and cosine?
