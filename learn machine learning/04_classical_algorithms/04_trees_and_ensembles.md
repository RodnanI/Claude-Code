# Trees and Ensembles

With business data (tables of customers, transactions, products, sensors), gradient boosted trees will probably be the model you use most. They win most tabular competitions and run much of production ML, including credit scoring, fraud, pricing, ranking and demand forecasting. Deep learning beats them on tabular data only in specific cases.

Run `05_ensembles_lab.py` after reading.

## Recap: one decision tree

A tree splits the data with yes/no questions on single features, choosing at each step the question that makes the groups purest (lowest Gini impurity or entropy for classification, lowest squared error for regression). Leaves predict the majority class or the mean.

A single tree is readable but has high variance: small changes in the data produce a very different tree, and deep trees memorize noise. Ensembles combine many trees to fix this.

## Ensembles

An ensemble combines many models into one. If the models make different mistakes, averaging cancels them out. There are two main families:

| | Bagging (random forests) | Boosting (gradient boosting) |
|---|---|---|
| how trees are built | independently, in parallel | one after another, each fixing the previous ones' errors |
| tree depth | deep (low bias, high variance) | shallow (high bias, low variance) |
| what it mainly reduces | variance | bias (and variance, with care) |
| overfits when you add trees? | no, just plateaus | yes, eventually; use early stopping |
| tuning needed | little | more, but rewards it |
| typical accuracy | very good | usually the best |

## Bagging and random forests

Bagging (bootstrap aggregating) works like this:

1. Draw a bootstrap sample: pick n rows from the training data at random, with replacement. Some rows appear twice and about 37% do not appear at all.
2. Train a deep tree on it.
3. Repeat a few hundred times.
4. Predict by majority vote (classification) or average (regression).

A random forest adds one more step: at each split, a tree may consider only a random subset of the features, often the square root of their number. This makes the trees differ more from each other, so their errors cancel better. The rows left out of each bootstrap sample (out-of-bag rows) also give a free validation estimate.

Random forests work well out of the box, with few hyperparameters, no scaling and little that can go wrong. They make a good second baseline after a linear model.

## Boosting and gradient boosting

Boosting builds trees one after another, and each new tree focuses on what the ensemble so far gets wrong. Gradient boosting for regression works like this:

1. Start with a constant prediction, the mean of y.
2. Compute the residuals, `y - current prediction`, which are the errors.
3. Fit a small tree to predict the residuals.
4. Add that tree's predictions, scaled by a learning rate (say 0.1), to the current prediction.
5. Repeat for hundreds or thousands of rounds.

The name comes from the fact that, for squared error, the residual is exactly the negative gradient of the loss with respect to the prediction. For other losses (log loss for classification, ranking losses) you fit the trees to the negative gradient instead of plain residuals. It is gradient descent in which each step is a tree and not a nudge to a weight vector. The lab builds it from scratch in 20 lines.

The learning rate, also called shrinkage, makes each tree contribute only a little. Smaller rates need more trees but generalize better.

## The libraries everyone uses

| Library | Known for |
|---------|-----------|
| XGBoost | released in 2014 and responsible for the boom in tabular boosting. Regularized and widely used |
| LightGBM (Microsoft) | very fast on big data because of histogram binning and leaf-wise tree growth |
| CatBoost (Yandex) | handles categorical features natively, with good defaults |

scikit-learn's `HistGradientBoostingClassifier/Regressor` is LightGBM-style and good enough for most work, with no extra install.

### Hyperparameters

| Hyperparameter | What it does | Typical start |
|----------------|--------------|---------------|
| `n_estimators` / `num_boost_round` / `max_iter` | number of trees | large (1000+) with early stopping |
| `learning_rate` | contribution of each tree | 0.03 to 0.1 |
| `max_depth` or `num_leaves` | complexity of each tree | depth 4-8, or 31 leaves |
| `min_child_samples` / `min_samples_leaf` | minimum data per leaf | 20 |
| `subsample` | fraction of rows per tree | 0.8 |
| `colsample_bytree` | fraction of features per tree | 0.8 |
| `reg_lambda`, `reg_alpha` | L2 / L1 regularization on leaf values | 0 to 10 |
| early stopping | stop when validation loss stops improving | 50-100 rounds of patience |

Set a modest learning rate, many trees and early stopping on a validation set, which gets you most of the way. Then tune depth or leaves and the minimum leaf size. A week spent squeezing out 0.1% is wasted when better features could give 5%.

## Feature importance

Trees can report which features they relied on most, in three ways. Impurity-based (gain) importance is the total impurity reduction from splits on each feature. It is fast and built in (`feature_importances_`), but it is computed on training data and biased toward features with many unique values such as IDs and continuous noise. Permutation importance shuffles one feature in the validation set and measures how far the score drops; it works with any model and is more trustworthy (`sklearn.inspection.permutation_importance`). SHAP values assign each feature a contribution to each individual prediction, using game theory, and are the usual way to explain tree models to stakeholders and regulators (the `shap` library).

All three share some caveats. Correlated features split the importance between them, so each looks less important than it is. Importance shows what the model uses, not what causes the outcome. And one feature with suspiciously large importance may be a leak (module 3).

## Where trees struggle

Trees cannot extrapolate: predictions are averages of training values, so a tree predicting house prices never exceeds the highest price it has seen. Linear models do extrapolate, sometimes wrongly. Trees also approximate a straight line with a staircase, needing many splits to do what one weight does. They have no notion of spatial or sequential structure, so raw images, audio and text call for deep learning or for embeddings fed to the trees. On very small datasets, regularized linear models can be more stable.

## Questions

1. Why does adding more trees to a random forest not cause overfitting, while adding more trees to gradient boosting eventually does?
2. Explain gradient boosting to a non-technical colleague in a few plain sentences.
3. A random forest gives a `customer_id` column high impurity importance. What is going on?
4. Your boosted model predicts sales; next year sales are higher than any value in training. What will happen?
