# Generalization, Overfitting and Underfitting

The single most important idea in machine learning: **performance on training data means almost nothing. Performance on new data is everything.**

Run `06_overfitting_lab.py` with this file.

## The student analogy

Three students prepare for an exam using past papers.

- **Student A** skims and learns nothing specific. Bad on past papers, bad on the real exam. **Underfitting.**
- **Student B** memorizes every past answer word for word. Perfect on past papers, lost when the questions change slightly. **Overfitting.**
- **Student C** learns the underlying concepts. Good on both. **Generalization.**

Your model is one of these students. Your job is to make it student C and to *prove* it is student C.

## Definitions

- **Training error**: error on the data the model learned from.
- **Test (generalization) error**: error on new data from the same source.
- **Underfitting**: high training error. The model is too simple to capture the pattern (a straight line through a curve).
- **Overfitting**: low training error, much higher test error. The model learned noise and quirks of the training set instead of the pattern.
- **Generalization gap**: test error minus training error. A big gap means overfitting.

## Model capacity

**Capacity** (or complexity) is how flexible a model is: how many different shapes it can fit.

| Low capacity | High capacity |
|--------------|---------------|
| linear model with few features | polynomial of degree 15 |
| decision tree of depth 2 | decision tree of unlimited depth |
| small neural network | huge neural network |
| strong regularization | no regularization |

Too little capacity underfits. Too much capacity, relative to the amount of data, overfits. The lab shows this with polynomials: degree 1 underfits a curve, degree 3 fits it, degree 15 threads through every noisy point and goes wild between them.

## Bias and variance

The classic decomposition of a model's expected error:

```
expected error = bias^2 + variance + irreducible noise
```

- **Bias**: error from wrong assumptions. A straight line cannot fit a curve no matter how much data you give it. High bias = underfitting.
- **Variance**: error from sensitivity to the particular training set. Train the same flexible model on two different samples and get wildly different models. High variance = overfitting.
- **Irreducible noise**: randomness in the target itself that no model can predict. Sets a floor on the error.

Increasing capacity usually lowers bias and raises variance. This is the **bias-variance tradeoff**. You want the sweet spot.

## How to diagnose

Compare training and validation error:

| Training error | Validation error | Diagnosis | What to do |
|----------------|------------------|-----------|------------|
| high | high (similar) | underfitting | more capacity, better features, train longer, less regularization |
| low | much higher | overfitting | more data, regularization, simpler model, early stopping, data augmentation |
| low | low (similar) | good | check the test set once, then ship |
| higher than validation | lower | suspicious | leakage, a bug, or validation data that is easier than training |

A **learning curve** (error vs training set size) adds information: if the validation error is still dropping as you add data, more data will help. If both curves have flattened at a high error, more data will not help; you need a better model or features.

## Fixes for overfitting

1. **More data.** The most reliable fix. Often the most expensive.
2. **Regularization.** Penalize complexity in the loss:
   - **L2 (ridge, weight decay)**: add `lambda * sum(w^2)`. Pushes all weights toward small values. Smooth, stable. The default.
   - **L1 (lasso)**: add `lambda * sum(|w|)`. Pushes many weights to exactly zero, so it also selects features.
   - Elastic net: both.
   - The strength `lambda` (called `alpha` in scikit-learn's Ridge, and `C = 1/lambda` in LogisticRegression, careful) is a hyperparameter.
3. **Simpler model**: fewer features, shallower trees, smaller network.
4. **Early stopping**: stop training when validation error stops improving.
5. **Dropout** (neural networks): randomly switch off neurons during training so no single path can memorize.
6. **Data augmentation**: create modified copies of training data (flipped images, paraphrased text).
7. **Ensembles**: average many models. Their individual quirks cancel out (random forests, module 4).

## Fixes for underfitting

- Add features or better features (domain knowledge beats algorithms).
- Use a more flexible model.
- Reduce regularization.
- Train longer (neural networks).
- Check for bugs: an underfitting model is often a broken model. Can it overfit 10 examples perfectly? If not, something is wrong.

## Why we need three splits

- **Training set**: the model learns from it.
- **Validation set** (or dev set): you use it to choose hyperparameters and compare models.
- **Test set**: touched once at the end to estimate real-world performance.

Why not just two? Every time you pick the best of several options using the validation set, you overfit to the validation set a little. After 200 experiments, your validation score is optimistic. The test set, untouched, stays honest. If you peek at the test set to make decisions, it becomes a second validation set and you no longer have an honest estimate. Treat it like a sealed envelope.

**Cross-validation** (module 3 file 09 and module 5) makes the most of small datasets by rotating which part is used for validation.

## Modern twist: deep learning and double descent

The classical picture says huge models must overfit. Yet modern neural networks have far more parameters than training examples and still generalize well. Researchers observed **double descent**: as capacity grows, test error goes down, then up (classical overfitting), then down again once models get very large. Explanations involve the implicit regularization of gradient descent and the fact that among all the ways to fit the data, training tends to find simple ones.

Practical takeaway: for classical models and small data, the bias-variance tradeoff is your guide. For large neural networks, "bigger model plus more data plus regularization" usually wins, and you still validate everything on held-out data.

## No free lunch

No single algorithm is best for every problem. Every model makes assumptions (linearity, smoothness, locality). It works when its assumptions match your data. That is why you try several, starting simple.

## Check yourself

1. Training accuracy 99%, validation accuracy 71%. Name the problem and what you would try, cheapest first.
2. Training error and validation error are both high and nearly equal. Will more data help?
3. You tuned 300 hyperparameter combinations on the validation set. Why is the best validation score now an overestimate?
4. What is the difference between L1 and L2 regularization in what they do to weights?
