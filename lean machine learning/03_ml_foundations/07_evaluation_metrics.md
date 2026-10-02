# Evaluation Metrics

"You get what you measure." Pick the wrong metric and you will build a model that is excellent at the wrong thing. In a company, choosing the metric is often a negotiation with product managers and the business, and it is one of the most valuable things you can get right.

Run `08_metrics_lab.py` with this file. It implements every metric below from scratch.

## Regression metrics

| Metric | Formula (in words) | Use when |
|--------|-------------------|----------|
| **MAE** (mean absolute error) | average of absolute misses | you want an interpretable "typical error" in real units; robust to outliers |
| **MSE** (mean squared error) | average of squared misses | as a training loss; big misses are much worse than small ones |
| **RMSE** | square root of MSE | like MSE but in real units. Always >= MAE. A big gap between them means a few huge misses |
| **R squared** | 1 - (model's squared error / squared error of predicting the mean) | comparing across problems. 1 is perfect, 0 is "no better than the average", negative is worse than the average |
| **MAPE** | average of absolute percentage misses | business people love percentages. Breaks when true values are near zero and punishes over-prediction and under-prediction unequally |

Blunt rule: report MAE to humans, train on MSE (or MAE if outliers dominate), and look at the distribution of errors, not just one number.

## Classification: start from the confusion matrix

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

If 1% of transactions are fraud, a model that says "legit" every single time gets **99% accuracy** and catches zero fraud. This is the **accuracy paradox**. With imbalanced classes, accuracy is close to useless. Most interesting business problems are imbalanced: fraud, churn, disease, defects, clicks.

### Precision and recall

```
precision = TP / (TP + FP)    "when the model raises an alarm, how often is it right?"
recall    = TP / (TP + FN)    "of all the real fraud, how much did the model catch?"
```

Recall is also called **sensitivity** or **true positive rate (TPR)**.

They trade off against each other through the **threshold**. Lower the threshold: more alarms, recall goes up, precision goes down. Raise it: fewer but surer alarms.

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

The harmonic mean: high only when both are high. Useful as a single number when you have no cost information. **F-beta** weights recall beta times as much as precision (F2 for recall-heavy problems).

### Other names you will hear

- **Specificity** (true negative rate): TN / (TN + FP).
- **False positive rate (FPR)**: FP / (FP + TN) = 1 - specificity.
- **Type I error** = false positive. **Type II error** = false negative. Statisticians say these.

## Threshold-free metrics

### ROC curve and AUC

Sweep the threshold from 1 down to 0 and plot TPR (y) against FPR (x). That is the **ROC curve**. The area under it, **ROC AUC**, has a lovely meaning:

> AUC = the probability that a randomly chosen positive gets a higher score than a randomly chosen negative.

0.5 is random guessing, 1.0 is perfect ranking. AUC measures how well the model *ranks*, ignoring the threshold. Weakness: with heavy imbalance, AUC can look great while precision is terrible, because FPR divides by the huge number of negatives.

### Precision-recall curve and average precision

Plot precision against recall across thresholds. The area (**average precision, AP**, or PR AUC) focuses on the positive class and is more honest for rare positives. A random model's AP equals the positive rate (say 0.01), not 0.5, so the numbers look smaller. Do not panic.

## Probability quality

- **Log loss** (cross-entropy): punishes confident wrong probabilities. Used when probabilities themselves matter.
- **Calibration**: when the model says 70%, does it happen 70% of the time? Check with a **reliability diagram** (bin predictions, compare average prediction with actual rate in each bin). Many models rank well but are poorly calibrated (boosted trees and neural nets are often overconfident). Fix with Platt scaling or isotonic regression. Calibration matters when probabilities feed decisions: pricing, risk, expected value calculations.
- **Brier score**: mean squared error between probability and the 0/1 outcome.

## Multi-class averages

With several classes you compute precision and recall per class, then average:

- **macro average**: plain average over classes. Treats rare classes as equally important.
- **weighted average**: weighted by class frequency.
- **micro average**: pool all TP, FP, FN first. For single-label problems, micro-F1 equals accuracy.

`sklearn.metrics.classification_report` prints all of them. Learn to read it.

## Ranking and retrieval metrics

Search engines, recommender systems and the retrieval step of RAG (module 7) produce ranked lists. They use:

- **Precision@k**: of the top k results, how many are relevant.
- **Recall@k**: of all relevant items, how many made the top k. The key RAG retrieval metric: if the right document is not in the top k, the LLM never sees it.
- **MRR** (mean reciprocal rank): 1 / position of the first relevant result, averaged over queries.
- **NDCG**: rewards putting the most relevant items highest, with graded relevance.

## Choosing the threshold with money

The best threshold minimizes expected cost:

```
total cost = FP * cost_of_false_alarm + FN * cost_of_miss
```

If a missed fraud costs 200 dollars and a manual review of a false alarm costs 5 dollars, you should accept many false alarms. The lab finds the best threshold for given costs. This is how you talk to a business: in money, not in F1.

## Offline versus online metrics

- **Offline metrics**: computed on a held-out dataset (everything above).
- **Online metrics**: what happens in production: revenue, click-through rate, user retention, support tickets, time saved.

They do not always agree. A recommender with better offline NDCG can lose money online if it recommends things people already wanted to buy anyway. The final judge is usually an A/B test on an online metric.

**Goodhart's law**: "when a measure becomes a target, it ceases to be a good measure." Optimize clicks and you get clickbait. Optimize a benchmark and you get a model that is good at the benchmark only. Always ask what the metric is a proxy for.

## How a professional reports results

- Compare against a **baseline** (and the current production model if there is one).
- Give **uncertainty**: confidence interval or results across several seeds or folds.
- Break results down by **slices**: country, device, new vs returning users, rare classes. A model that is better on average but much worse for one important segment may not be shippable.
- State the **threshold** and what it means in operational terms ("flags 2% of transactions, catches 70% of fraud, 1 in 4 flags is real fraud").

## Check yourself

1. 10,000 emails, 500 are spam. The model flags 400, of which 300 are spam. Compute precision, recall and accuracy.
2. Why can ROC AUC be 0.95 while precision at every useful threshold is below 20%?
3. Your model's RMSE is 3 times its MAE. What does that suggest about its errors?
4. A missed defect costs 1,000 dollars and an unnecessary inspection costs 20 dollars. Should the threshold be above or below 0.5? Roughly where?
