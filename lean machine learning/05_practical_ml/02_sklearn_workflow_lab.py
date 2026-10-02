"""
The professional scikit-learn workflow, step by step, on a real dataset.

Dataset: 569 breast tumor biopsies, 30 measurements each, label malignant or benign.
(Bundled with scikit-learn, no download.)

Workflow: split -> baseline -> pipeline -> cross-validation -> tuning -> ONE test evaluation
-> save -> load -> predict.

Run it:  python 02_sklearn_workflow_lab.py   (a few seconds)
"""

import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from scipy.stats import loguniform, randint
from sklearn.datasets import load_breast_cancer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import (GridSearchCV, RandomizedSearchCV, StratifiedKFold,
                                     cross_validate, train_test_split)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
pd.set_option("display.width", 120)


# %% 1. Load as a DataFrame and look
data = load_breast_cancer(as_frame=True)
X, y = data.data, data.target            # in this dataset target 1 = benign, 0 = malignant
y = 1 - y                                # flip so that 1 = malignant, the class we want to catch
print(X.shape, "| malignant rate:", f"{y.mean():.1%}")
print(X.iloc[:, :5].describe().round(2))


# %% 2. Split ONCE, stratified, and put the test set away
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scoring = ["roc_auc", "average_precision", "recall"]


def report_cv(name, model):
    res = cross_validate(model, X_train, y_train, cv=cv, scoring=scoring)
    summary = "  ".join(f"{m}={res['test_' + m].mean():.3f}+-{res['test_' + m].std():.3f}" for m in scoring)
    print(f"{name:<22} {summary}")


# %% 3. Baseline
print("\ncross-validation on the training set:")
report_cv("baseline (prior)", DummyClassifier(strategy="prior"))


# %% 4. A pipeline and its cross-validated score
logreg = Pipeline([
    ("scale", StandardScaler()),
    ("model", LogisticRegression(max_iter=5000)),
])
report_cv("logistic regression", logreg)


# %% 5. Grid search over regularization strength and class weights
grid = GridSearchCV(
    logreg,
    param_grid={"model__C": [0.01, 0.1, 1, 10, 100], "model__class_weight": [None, "balanced"]},
    cv=cv, scoring="roc_auc",
)
grid.fit(X_train, y_train)
print(f"\ngrid search best: {grid.best_params_}  CV ROC AUC {grid.best_score_:.4f}")
results = pd.DataFrame(grid.cv_results_)[["param_model__C", "param_model__class_weight", "mean_test_score", "std_test_score"]]
results["param_model__class_weight"] = results["param_model__class_weight"].fillna("None")
print(results.sort_values("mean_test_score", ascending=False).head(5).to_string(index=False))


# %% 6. Randomized search for gradient boosting
search = RandomizedSearchCV(
    HistGradientBoostingClassifier(random_state=0),
    param_distributions={
        "learning_rate": loguniform(0.01, 0.3),          # sample on a log scale: 0.01 is as likely as 0.1
        "max_leaf_nodes": randint(8, 64),
        "min_samples_leaf": randint(5, 50),
        "l2_regularization": loguniform(1e-3, 10),
    },
    n_iter=20, cv=cv, scoring="roc_auc", random_state=0, n_jobs=-1,
)
start = time.perf_counter()
search.fit(X_train, y_train)
print(f"\nrandom search ({time.perf_counter() - start:.1f}s) best CV ROC AUC {search.best_score_:.4f}")
print("best params:", {k: (round(float(v), 4) if isinstance(v, float) else int(v)) for k, v in search.best_params_.items()})
# On this small, clean dataset the linear model is as good as boosting. That happens a lot.
# Prefer the simpler model when scores are equal: it is faster, steadier and easier to explain.


# %% 7. Pick the model using CV results, THEN touch the test set once
final = grid.best_estimator_                              # already refit on all training data
proba = final.predict_proba(X_test)[:, 1]
pred = (proba >= 0.5).astype(int)
print(f"\nTEST ROC AUC {roc_auc_score(y_test, proba):.4f}")
print("confusion matrix [[TN FP] [FN TP]]:\n", confusion_matrix(y_test, pred))
print(classification_report(y_test, pred, target_names=["benign", "malignant"], digits=3))
# In a medical screening setting, a false negative (missed malignancy) is far worse than a
# false positive (an extra test). You would lower the threshold to raise recall. Try it.


# %% 8. Save the model WITH its metadata
model_path = OUT / "cancer_model.joblib"
joblib.dump(final, model_path)
metadata = {
    "model": "StandardScaler + LogisticRegression",
    "params": {k: v for k, v in grid.best_params_.items()},
    "features": list(X.columns),
    "positive_class": "malignant",
    "threshold": 0.5,
    "cv_roc_auc": round(grid.best_score_, 4),
    "test_roc_auc": round(roc_auc_score(y_test, proba), 4),
    "versions": {"sklearn": sklearn.__version__, "numpy": np.__version__, "pandas": pd.__version__},
}
(OUT / "cancer_model.json").write_text(json.dumps(metadata, indent=2))
print(f"saved {model_path.name} and cancer_model.json")


# %% 9. Load it back, as a production service would, and predict one new case
loaded = joblib.load(model_path)
new_case = X_test.iloc[[0]]                       # double brackets keep it a DataFrame (1 row)
print(f"\nloaded model -> P(malignant) for one new case: {loaded.predict_proba(new_case)[0, 1]:.3f}")
assert np.allclose(loaded.predict_proba(X_test), final.predict_proba(X_test))

# %% Your turn
# 1. Add a ("pca", PCA(n_components=10)) step between the scaler and the model. Tune
#    n_components in the grid (pca__n_components). Does it help?
# 2. Find the threshold that gives recall >= 0.98 on cross-validated predictions
#    (sklearn.model_selection.cross_val_predict with method="predict_proba"). What precision
#    do you get at that threshold on the test set?
