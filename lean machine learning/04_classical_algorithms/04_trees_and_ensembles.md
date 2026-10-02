# Trees and Ensembles: the Kings of Tabular Data

If you work with business data (tables of customers, transactions, products, sensors), gradient boosted trees will probably be your most-used model. They win most tabular competitions and run a huge share of production ML: credit scoring, fraud, pricing, ranking, demand forecasting. Deep learning only beats them on tabular data in specific situations.

Run `05_ensembles_lab.py` after reading.

## Recap: one decision tree

A tree splits the data with yes/no questions on single features, choosing at each step the question that makes the groups purest (lowest Gini impurity or entropy for classification, lowest squared error for regression). Leaves predict the majority class or the mean.

Single trees are readable but **high-variance**: small changes in the data produce a completely different tree, and deep trees memorize noise. Ensembles fix this by combining many trees.

## Ensembles: the wisdom of crowds

An **ensemble** combines many models into one. If the models make *different* mistakes, averaging cancels the mistakes out. Two main families:

| | Bagging (random forests) | Boosting (gradient boosting) |
|---|---|---|
| how trees are built | independently, in parallel | one after another, each fixing the previous ones' errors |
| tree depth | deep (low bias, high variance) | shallow (high bias, low variance) |
| what it mainly reduces | variance | bias (and variance, with care) |
| overfits when you add trees? | no, just plateaus | yes, eventually; use early stopping |
| tuning needed | little | more, but rewards it |
| typical accuracy | very good | usually the best |

## Bagging and random forests

**Bagging** (bootstrap aggregating):

1. Draw a **bootstrap sample**: pick n rows from the training data at random, *with replacement*. Some rows appear twice, about 37% do not appear at all.
2. Train a deep tree on it.
3. Repeat a few hundred times.
4. Predict by majority vote (classification) or average (regression).

A **random forest** adds one more trick: at each split, each tree may only consider a random subset of the features (often the square root of the number of features). This makes the trees more different from each other, so their errors cancel better.

Bonus: the rows left out of each bootstrap sample (out-of-bag rows) give a free validation estimate.

Random forests are the ultimate "works out of the box" model: few hyperparameters, hard to break, no scaling needed. Great second baseline after a linear model.

## Boosting and gradient boosting

**Boosting** builds trees sequentially. Each new tree focuses on what the ensemble so far gets wrong.

**Gradient boosting** for regression is easy to understand:

1. Start with a constant prediction, the mean of y.
2. Compute the **residuals**: `y - current prediction`. These are the errors.
3. Fit a small tree to predict the residuals.
4. Add that tree's predictions, scaled by a **learning rate** (say 0.1), to the current prediction.
5. Repeat for hundreds or thousands of rounds.

Why "gradient"? For squared error, the residual is exactly the negative gradient of the loss with respect to the prediction. For other losses (log loss for classification, ranking losses), you fit the trees to the negative gradient instead of plain residuals. It is gradient descent, but each step is a tree instead of a nudge to a weight vector. The lab builds this from scratch in 20 lines.

The learning rate (also called **shrinkage**) makes each tree contribute only a little. Smaller learning rates need more trees but generalize better.

## The libraries everyone uses

| Library | Known for |
|---------|-----------|
| **XGBoost** | the one that started the tabular revolution (2014). Regularized, robust, everywhere |
| **LightGBM** (Microsoft) | very fast on big data: histogram binning and leaf-wise tree growth |
| **CatBoost** (Yandex) | handles categorical features natively and well, good defaults |

scikit-learn's `HistGradientBoostingClassifier/Regressor` is LightGBM-style and good enough for most work, with no extra install.

### The hyperparameters that matter

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

Blunt advice: set a modest learning rate, many trees, and **early stopping** on a validation set. That alone gets you most of the way. Then tune depth/leaves and the minimum leaf size. Do not spend a week squeezing out 0.1% when better features would give you 5%.

## Feature importance (and its traps)

Trees can tell you which features they used most. Three kinds of importance:

1. **Impurity-based (gain) importance**: total impurity reduction from splits on each feature. Fast, built in (`feature_importances_`), and **biased**: it favors features with many unique values (IDs, continuous noise) and is computed on training data.
2. **Permutation importance**: shuffle one feature in the validation set and measure how much the score drops. Model-agnostic and honest. Use `sklearn.inspection.permutation_importance`.
3. **SHAP values**: game-theory based contribution of each feature to each individual prediction. The industry standard for explaining tree models to stakeholders and regulators (the `shap` library).

Caveats for all of them:

- Correlated features split the importance between them, so each looks less important than it is.
- Importance means "the model uses it", not "it causes the outcome".
- A single feature with suspiciously huge importance is a leakage alarm (module 3).

## Where trees struggle

- **Extrapolation**: predictions are averages of training values, so they can never go beyond the training range. A tree predicting house prices will not predict a price higher than any it has seen. Linear models extrapolate (sometimes wrongly, but they do).
- **Smooth relationships**: a tree approximates a straight line with a staircase. It needs many splits to do what one weight does.
- **Raw images, audio and text**: no notion of spatial or sequential structure. Use deep learning or feed trees with embeddings.
- **Very small datasets**: linear models with regularization can be more stable.

## Check yourself

1. Why does adding more trees to a random forest not cause overfitting, while adding more trees to gradient boosting eventually does?
2. Explain gradient boosting to a non-technical colleague in a few plain sentences.
3. A random forest gives a `customer_id` column high impurity importance. What is going on?
4. Your boosted model predicts sales; next year sales are higher than any value in training. What will happen?
