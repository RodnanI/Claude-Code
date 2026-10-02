# Evaluation Metrics

Pick the wrong metric and you will build a model that is excellent at the wrong thing. In a company the metric is often negotiated with product managers and the business, and getting it right is worth a lot.

Run `08_metrics_lab.py` with this file. It implements every metric below from scratch.

## Regression metrics

| Metric | Formula (in words) | Use when |
|--------|-------------------|----------|
| **MAE** (mean absolute error) | average of absolute misses | you want an interpretable "typical error" in real units; robust to outliers |
| **MSE** (mean squared error) | average of squared misses | as a training loss; big misses are much worse than small ones |
| **RMSE** | square root of MSE | like MSE but in real units. Always >= MAE. A big gap between them means a few huge misses |
| **R squared** | 1 - (model's squared error / squared error of predicting the mean) | comparing across problems. 1 is perfect, 0 is "no better than the average", negative is worse than the average |
| **MAPE** | average of absolute percentage misses | business people love percentages. Breaks when true values are near zero and punishes over-prediction and under-prediction unequally |

A reasonable default is to report MAE to humans, train on MSE (or MAE if outliers dominate), and look at the whole distribution of errors, not one number.

## Classification and the confusion matrix

For binary classification, every prediction falls into one of four boxes. Example: a fraud detector, where "positive" means "fraud".

|                     | actually fraud | actually legit |
|---------------------|----------------|----------------|
| **predicted fraud** | TP (true positive) | FP (false positive, false alarm) |
| **predicted legit** | FN (false negative, missed fraud) | TN (true negative) |

Every classification metric is a ratio of these four numbers.

### Accuracy and why it lies

```
accuracy = (TP + TN) / everything
```

If 1% of transactions are fraud, a model that says "legit" every time gets 99% accuracy and catches no fraud. This is the accuracy paradox, and with imbalanced classes accuracy is nearly useless. Many business problems are imbalanced, including fraud, churn, disease, defects and clicks.

### Precision and recall

```
precision = TP / (TP + FP)    "when the model raises an alarm, how often is it right?"
recall    = TP / (TP + FN)    "of all the real fraud, how much did the model catch?"
```

Recall is also called sensitivity or true positive rate (TPR).

The two trade off through the threshold. A lower threshold gives more alarms, so recall rises and precision falls. A higher one gives fewer but surer alarms.

Which matters more depends on the cost of each mistake:

| Problem | Worse mistake | Favor |
|---------|---------------|-------|
| cancer screening | missing a cancer (FN) | recall |
| spam filter | hiding a real email (FP) | precision |
| fraud blocking | depends on the cost of a blocked good customer vs a fraud loss | compute it |
| content moderation queue for humans | missing harmful content (FN), but reviewers are limited | recall at a fixed review budget |

### F1 score

```
F1 = 2 * precision * recall / (precision + recall)
```

This is the harmonic mean, which is high only when both are high, and it is a usable single number when you have no cost information. F-beta weights recall beta times as much as precision (F2 for recall-heavy problems).

### Other names

Specificity (true negative rate) is TN / (TN + FP). The false positive rate (FPR) is FP / (FP + TN), which is 1 - specificity. Statisticians call a false positive a Type I error and a false negative a Type II error.

## Threshold-free metrics

### ROC curve and AUC

Sweep the threshold from 1 down to 0 and plot TPR (y) against FPR (x). That is the ROC curve. The area under it, ROC AUC, has a direct meaning:

> AUC = the probability that a randomly chosen positive gets a higher score than a randomly chosen negative.

0.5 is random guessing and 1.0 is perfect ranking. AUC measures how well the model ranks, whatever the threshold. With heavy imbalance it can look great while precision is poor, because FPR divides by the huge number of negatives.

### Precision-recall curve and average precision

Plot precision against recall across thresholds. The area under it (average precision, AP, or PR AUC) focuses on the positive class and is more informative for rare positives. A random model's AP equals the positive rate (say 0.01), not 0.5, so the numbers look small.

## Probability quality

Log loss (cross-entropy) punishes confident wrong probabilities and is the one to use when the probabilities themselves matter. Calibration asks whether events the model rates at 70% happen 70% of the time. Check it with a reliability diagram, which bins the predictions and compares the average prediction with the actual rate in each bin. Many models rank well but are poorly calibrated, and boosted trees and neural nets are often overconfident. Platt scaling or isotonic regression fixes this, and it matters whenever probabilities feed decisions such as pricing, risk or expected value. The Brier score is the mean squared error between the probability and the 0/1 outcome.

## Multi-class averages

With several classes you compute precision and recall per class, then average. The macro average is a plain average over classes, so rare classes count as much as common ones. The weighted average weights by class frequency. The micro average pools all TP, FP and FN first, and for single-label problems micro-F1 equals accuracy. `sklearn.metrics.classification_report` prints all of them.

## Ranking and retrieval metrics

Search engines, recommender systems and the retrieval step of RAG (module 7) produce ranked lists. Precision@k is the share of the top k results that are relevant. Recall@k is the share of all relevant items that made the top k, and it is the main retrieval metric for RAG, because a document outside the top k never reaches the LLM. MRR (mean reciprocal rank) is 1 divided by the position of the first relevant result, averaged over queries. NDCG rewards putting the most relevant items highest and allows graded relevance.

## Choosing the threshold with money

The best threshold minimizes expected cost:

```
total cost = FP * cost_of_false_alarm + FN * cost_of_miss
```

If a missed fraud costs 200 dollars and a manual review of a false alarm costs 5 dollars, you should accept many false alarms. The lab finds the best threshold for given costs. Businesses think in money, so present results that way instead of as F1.

## Offline versus online metrics

Offline metrics are computed on a held-out dataset, as above. Online metrics measure what happens in production: revenue, click-through rate, retention, support tickets, time saved. The two do not always agree. A recommender with better offline NDCG can lose money online if it only suggests things people would have bought anyway, so the final judge is usually an A/B test on an online metric.

Goodhart's law says that when a measure becomes a target it stops being a good measure. Optimize clicks and you get clickbait; optimize a benchmark and you get a model that is good at the benchmark. Ask what the metric stands in for.

## Reporting results

Compare against a baseline, and against the current production model if there is one. Give the uncertainty, as a confidence interval or as results across several seeds or folds. Break results down by slice (country, device, new against returning users, rare classes), because a model that is better on average but much worse for one important segment may not be shippable. State the threshold and what it means operationally, for example "flags 2% of transactions, catches 70% of fraud, and 1 in 4 flags is real fraud".

## Questions

1. 10,000 emails, 500 are spam. The model flags 400, of which 300 are spam. Compute precision, recall and accuracy.
2. Why can ROC AUC be 0.95 while precision at every useful threshold is below 20%?
3. Your model's RMSE is 3 times its MAE. What does that suggest about its errors?
4. A missed defect costs 1,000 dollars and an unnecessary inspection costs 20 dollars. Should the threshold be above or below 0.5? Roughly where?
