# Choosing an Algorithm (and the Ones Not Covered in Labs)

Beginners obsess over picking the algorithm. Practitioners know the order of what matters: **problem framing, then data quality, then features, then evaluation, then algorithm.** Still, you need a map. Here it is.

## Models you have built so far, in one table

| Model | Learns | Needs scaling | Handles non-linear | Interpretable | Training cost | Prediction cost |
|-------|--------|---------------|-------------------|---------------|---------------|-----------------|
| linear / logistic regression | one weight per feature | yes | only via engineered features | yes (weights) | very low | very low |
| kNN | nothing, stores data | yes | yes | somewhat (show neighbors) | none | high (scans data) |
| Naive Bayes | per-class feature probabilities | no | limited | yes | very low | very low |
| decision tree | a set of if/else rules | no | yes | yes, if shallow | low | very low |
| random forest | many deep trees | no | yes | via importance / SHAP | medium | medium |
| gradient boosting | many shallow trees in sequence | no | yes | via importance / SHAP | medium | low |
| neural network (module 6) | layers of weights | yes | yes | hard | high | low to high |

## Models you should know by name

### Support vector machines (SVM)

An SVM finds the boundary between classes with the **widest margin**: the street between the classes is made as wide as possible, and only the points on the edge of the street (the **support vectors**) define it. With the **kernel trick**, an SVM can draw curved boundaries by implicitly mapping data into a higher-dimensional space where a straight boundary works. The RBF (Gaussian) kernel is the common choice.

Where they stand today: excellent on small to medium datasets with many features (text classification in the 2000s, bioinformatics). They scale poorly beyond about 100,000 examples, need feature scaling, and output scores rather than probabilities. In industry they have mostly been replaced by boosting for tabular data and neural networks for text and images, but they still show up in interviews and older systems.

### Regularized linear models

- **Ridge** (L2), **Lasso** (L1), **Elastic Net** (both). Linear regression with the penalties from module 3. Lasso doubles as feature selection.
- Logistic regression in scikit-learn is regularized by default (`C=1.0`). Remember: smaller C means *stronger* regularization.

Linear models are underrated. They are fast, stable, explainable to regulators and executives, and with good features they are often within a few points of fancy models. Many banks still run logistic regression scorecards for exactly these reasons.

### Clustering beyond k-means

- **DBSCAN / HDBSCAN**: clusters are dense regions; finds odd shapes and labels outliers as noise. No need to choose k.
- **Gaussian mixture models**: soft clustering; each point gets a probability of belonging to each cluster.
- **Hierarchical (agglomerative) clustering**: builds a tree of merges; you cut it at the level you want.

### Anomaly detection

- **Isolation Forest**: random trees isolate anomalies in few splits, because anomalies are few and different. The usual first choice.
- **One-class SVM**, **Local Outlier Factor**: alternatives.
- Simple statistics (z-scores, percentiles, rolling averages) often beat all of them for monitoring metrics. Try them first.

### Dimensionality reduction beyond PCA

- **t-SNE** and **UMAP**: non-linear, great for 2D pictures of embeddings. Distances between clusters in the picture are not meaningful.
- **Autoencoders** (module 6): neural networks that compress and rebuild data.

### Recommender systems

- **Collaborative filtering**: "users who liked X also liked Y". Matrix factorization learns a vector for every user and item so that their dot product predicts the rating (the low-rank idea from module 2).
- **Two-tower models**: one neural network embeds users, another embeds items; recommend items whose embeddings are closest to the user's. This is how large platforms do candidate retrieval, followed by a ranking model (often boosted trees or a neural ranker).

### Time series forecasting

- Classical statistics: **exponential smoothing**, **ARIMA**, seasonal decomposition. Strong for few series with clear patterns.
- **Boosted trees with lag features** (sales 1, 7 and 28 days ago, rolling means, calendar features). Dominant in practice and in forecasting competitions.
- Deep learning and pretrained "foundation" forecasting models exist and are improving; evaluate them against the simple baselines, which are hard to beat.
- The most important baseline: **seasonal naive** ("same as last week"). Many fancy forecasts lose to it.

## A decision flow for a new problem

1. **Is it really an ML problem?** Could a rule, a SQL query or a lookup table do it?
2. **What kind?** Regression, classification, ranking, clustering, generation?
3. **What data?**
   - Tabular: start with a dumb baseline, then logistic or linear regression, then gradient boosting (HistGradientBoosting, LightGBM, XGBoost or CatBoost). Random forest as a sanity check.
   - Text: TF-IDF plus logistic regression as a baseline; then embeddings from a pretrained model plus a simple classifier; then fine-tuning or an LLM with good prompts. Measure which is good enough for the cost.
   - Images, audio: fine-tune a pretrained deep network. Never train from scratch unless you have a very good reason and a lot of data.
   - Time series: seasonal naive baseline, then boosted trees with lag features.
4. **Constraints?** Latency (milliseconds per prediction?), cost, interpretability, regulation, how often it must be retrained, who maintains it.
5. **Evaluate properly** (module 3): right split, right metric, honest test.

## The rules that actually matter

- **Always start with a baseline.** Most common class, mean, last value, a simple rule. You cannot claim a model works without it.
- **Simple and good beats complex and slightly better.** Every extra point of accuracy must pay for its complexity in maintenance, compute and explainability.
- **Better data beats better algorithms.** Cleaning labels, adding a strong feature or getting more relevant data usually helps more than switching models.
- **For tabular data, try gradient boosting before neural networks.**
- **For unstructured data, start from a pretrained model.**

## Check yourself

1. You have 2,000 rows of customer data with 15 features and need an explainable model for a credit decision. What do you try first and why?
2. You need to group 50,000 support tickets by topic without labels. Outline an approach.
3. Why do SVMs struggle with 10 million examples?
4. A forecast model beats last year's model but loses to "same as last week". What do you conclude?
