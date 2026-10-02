# Choosing an Algorithm

Beginners fixate on the choice of algorithm, but it matters less than problem framing, data quality, features and evaluation, in that order. You still need a map, and this file gives one, including the methods the labs skip.

## Models built so far

| Model | Learns | Needs scaling | Handles non-linear | Interpretable | Training cost | Prediction cost |
|-------|--------|---------------|-------------------|---------------|---------------|-----------------|
| linear / logistic regression | one weight per feature | yes | only via engineered features | yes (weights) | very low | very low |
| kNN | nothing, stores data | yes | yes | somewhat (show neighbors) | none | high (scans data) |
| Naive Bayes | per-class feature probabilities | no | limited | yes | very low | very low |
| decision tree | a set of if/else rules | no | yes | yes, if shallow | low | very low |
| random forest | many deep trees | no | yes | via importance / SHAP | medium | medium |
| gradient boosting | many shallow trees in sequence | no | yes | via importance / SHAP | medium | low |
| neural network (module 6) | layers of weights | yes | yes | hard | high | low to high |

## Models to know by name

### Support vector machines (SVM)

An SVM finds the boundary between classes with the widest margin, so the street between the classes is as wide as possible and only the points on its edge, the support vectors, define it. With the kernel trick it can draw curved boundaries by implicitly mapping the data into a higher-dimensional space where a straight boundary works; the RBF (Gaussian) kernel is the usual choice.

SVMs did well on small to medium datasets with many features, such as text classification in the 2000s and bioinformatics. They scale poorly beyond about 100,000 examples, need feature scaling, and output scores instead of probabilities. Industry has mostly replaced them with boosting for tabular data and neural networks for text and images, but they still appear in interviews and older systems.

### Regularized linear models

Ridge (L2), Lasso (L1) and Elastic Net (both) are linear regression with the penalties from module 3, and Lasso doubles as feature selection. Logistic regression in scikit-learn is regularized by default (`C=1.0`), and a smaller C means stronger regularization.

Linear models are underrated. They are fast, stable and easy to explain to regulators and executives, and with good features they often land within a few points of fancier models. Many banks still run logistic regression scorecards for these reasons.

### Clustering beyond k-means

DBSCAN and HDBSCAN treat clusters as dense regions, find odd shapes, label outliers as noise and do not need k chosen in advance. Gaussian mixture models do soft clustering, giving each point a probability of belonging to each cluster. Hierarchical (agglomerative) clustering builds a tree of merges that you cut at the level you want.

### Anomaly detection

Isolation Forest is the usual first choice: random trees isolate anomalies in few splits because anomalies are few and different. One-class SVM and Local Outlier Factor are alternatives. For monitoring metrics, simple statistics such as z-scores, percentiles and rolling averages often beat all of them, so try those first.

### Dimensionality reduction beyond PCA

t-SNE and UMAP are non-linear and good for 2D pictures of embeddings, though distances between clusters in the picture mean little. Autoencoders (module 6) are neural networks that compress and rebuild data.

### Recommender systems

Collaborative filtering rests on the idea that users who liked X also liked Y. Matrix factorization learns a vector for every user and item so that their dot product predicts the rating, which is the low-rank idea from module 2. Two-tower models use one neural network to embed users and another to embed items, then recommend the items closest to the user. Large platforms use this for candidate retrieval and follow it with a ranking model, often boosted trees or a neural ranker.

### Time series forecasting

Classical statistics (exponential smoothing, ARIMA, seasonal decomposition) works well for a few series with clear patterns. Boosted trees with lag features, such as sales 1, 7 and 28 days ago, rolling means and calendar features, dominate in practice and in forecasting competitions. Deep learning and pretrained foundation forecasting models exist and are improving, but compare them with the simple baselines, which are hard to beat. The baseline that matters most is seasonal naive, meaning "same as last week", and many sophisticated forecasts lose to it.

## Approaching a new problem

1. Is it really an ML problem? Could a rule, a SQL query or a lookup table do it?
2. What kind? Regression, classification, ranking, clustering, generation?
3. What data?
   - Tabular: start with a dumb baseline, then logistic or linear regression, then gradient boosting (HistGradientBoosting, LightGBM, XGBoost or CatBoost). Random forest as a sanity check.
   - Text: TF-IDF plus logistic regression as a baseline; then embeddings from a pretrained model plus a simple classifier; then fine-tuning or an LLM with good prompts. Measure which is good enough for the cost.
   - Images, audio: fine-tune a pretrained deep network. Never train from scratch unless you have a very good reason and a lot of data.
   - Time series: seasonal naive baseline, then boosted trees with lag features.
4. Constraints? Latency (milliseconds per prediction?), cost, interpretability, regulation, how often it must be retrained, who maintains it.
5. Evaluate properly (module 3): right split, right metric, honest test.

## Rules of thumb

Start with a baseline (most common class, mean, last value, a simple rule), since you cannot claim a model works without one. Prefer a simple, good model to a complex one that is slightly better, because each extra point of accuracy has to pay for its maintenance, compute and explainability. Better data usually helps more than a better algorithm, so clean labels, add a strong feature or collect more relevant data before switching models. For tabular data, try gradient boosting before neural networks, and for unstructured data start from a pretrained model.

## Questions

1. You have 2,000 rows of customer data with 15 features and need an explainable model for a credit decision. What do you try first and why?
2. You need to group 50,000 support tickets by topic without labels. Outline an approach.
3. Why do SVMs struggle with 10 million examples?
4. A forecast model beats last year's model but loses to "same as last week". What do you conclude?
