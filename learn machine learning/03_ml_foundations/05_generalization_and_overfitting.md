# Generalization, Overfitting and Underfitting

The central fact of machine learning is that performance on training data tells you little, and performance on new data is what counts.

Run `06_overfitting_lab.py` with this file.

## An analogy

Three students prepare for an exam using past papers. Student A skims and learns nothing specific, so does badly on the past papers and the real exam; that is underfitting. Student B memorizes every past answer word for word, scores perfectly on the past papers and is lost when the questions change slightly; that is overfitting. Student C learns the underlying concepts and does well on both; that is generalization.

Your model is one of these students. You want student C, and you have to show that it is.

## Definitions

Training error is the error on the data the model learned from, and test (generalization) error is the error on new data from the same source. Underfitting means high training error, because the model is too simple for the pattern, like a straight line through a curve. Overfitting means low training error and much higher test error, because the model learned noise and quirks of the training set. The generalization gap is test error minus training error, and a big gap means overfitting.

## Model capacity

Capacity (or complexity) is how flexible a model is, meaning how many different shapes it can fit.

| Low capacity | High capacity |
|--------------|---------------|
| linear model with few features | polynomial of degree 15 |
| decision tree of depth 2 | decision tree of unlimited depth |
| small neural network | huge neural network |
| strong regularization | no regularization |

Too little capacity underfits. Too much capacity, relative to the amount of data, overfits. The lab shows this with polynomials: degree 1 underfits a curve, degree 3 fits it, degree 15 threads through every noisy point and goes wild between them.

## Bias and variance

A model's expected error splits into three parts:

```
expected error = bias^2 + variance + irreducible noise
```

Bias is error from wrong assumptions: a straight line cannot fit a curve however much data you give it, so high bias means underfitting. Variance is error from sensitivity to the particular training set: a flexible model trained on two different samples can come out very different, so high variance means overfitting. Irreducible noise is randomness in the target that no model can predict, and it sets a floor on the error.

More capacity usually lowers bias and raises variance. This is the bias-variance tradeoff, and the aim is the capacity where the two balance.

## Diagnosis

Compare training and validation error:

| Training error | Validation error | Diagnosis | What to do |
|----------------|------------------|-----------|------------|
| high | high (similar) | underfitting | more capacity, better features, train longer, less regularization |
| low | much higher | overfitting | more data, regularization, simpler model, early stopping, data augmentation |
| low | low (similar) | good | check the test set once, then ship |
| higher than validation | lower | suspicious | leakage, a bug, or validation data that is easier than training |

A learning curve (error against training set size) adds information: if the validation error is still dropping as you add data, more data will help. If both curves have flattened at a high error, more data will not help; you need a better model or features.

## Fixes for overfitting

1. More data. This is the most reliable fix and often the most expensive.
2. Regularization, which penalizes complexity in the loss. L2 (ridge, weight decay) adds `lambda * sum(w^2)` and pushes all weights toward small values; it is the usual default. L1 (lasso) adds `lambda * sum(|w|)` and pushes many weights to exactly zero, so it also selects features. Elastic net combines both. The strength `lambda` is a hyperparameter, called `alpha` in scikit-learn's Ridge and entering as `C = 1/lambda` in LogisticRegression, which catches people out.
3. A simpler model: fewer features, shallower trees, a smaller network.
4. Early stopping, which ends training when validation error stops improving.
5. Dropout in neural networks, which switches neurons off at random during training so no single path can memorize.
6. Data augmentation, which adds modified copies of the training data such as flipped images or paraphrased text.
7. Ensembles, which average many models so their individual quirks cancel (random forests, module 4).

## Fixes for underfitting

- Add features or better features (domain knowledge beats algorithms).
- Use a more flexible model.
- Reduce regularization.
- Train longer (neural networks).
- Look for bugs, since an underfitting model is often a broken one. If it cannot overfit 10 examples perfectly, something is wrong.

## Why we need three splits

The model learns from the training set. The validation set (or dev set) is for choosing hyperparameters and comparing models. The test set is used once, at the end, to estimate real-world performance.

Two splits are not enough because every time you pick the best of several options using the validation set, you overfit to the validation set a little. After 200 experiments, your validation score is optimistic. The test set, untouched, stays honest. If you use the test set to make decisions, it turns into a second validation set and you no longer have an honest estimate, so keep it sealed until the end.

Cross-validation (file 09 and module 5) makes better use of small datasets by rotating which part is held out for validation.

## Double descent

The classical picture says huge models must overfit, yet modern neural networks have far more parameters than training examples and still generalize. Researchers have observed double descent: as capacity grows, test error falls, rises (classical overfitting), then falls again once models get very large. The explanations point to the implicit regularization of gradient descent, which tends to find simple solutions among the many that fit the data.

For classical models and small data, the bias-variance tradeoff is the right guide. For large neural networks, a bigger model with more data and regularization usually wins, and you still validate on held-out data.

## No free lunch

No algorithm is best for every problem. Each model assumes something (linearity, smoothness, locality) and works when the assumption fits your data, which is why you try several, simplest first.

## Questions

1. Training accuracy 99%, validation accuracy 71%. Name the problem and what you would try, cheapest first.
2. Training error and validation error are both high and nearly equal. Will more data help?
3. You tuned 300 hyperparameter combinations on the validation set. Why is the best validation score now an overestimate?
4. What is the difference between L1 and L2 regularization in what they do to weights?
