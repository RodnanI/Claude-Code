# Probability and Statistics for Machine Learning

Models live in a world of uncertainty. A classifier outputs "82% likely spam". An LLM outputs a probability for every possible next token. And when your new model scores 0.4% better than the old one, statistics decides whether that is real or luck. This file covers what you need, in the order you need it.

Run `06_probability_lab.py` alongside.

## 1. Random variables and distributions

A **random variable** is a quantity whose value is uncertain: a coin flip, tomorrow's sales, the next word in a sentence. A **distribution** says how likely each value is.

| Distribution | Describes | Example in ML |
|--------------|-----------|---------------|
| Bernoulli(p) | one yes/no event with probability p | is this email spam? |
| Binomial(n, p) | number of yes in n tries | how many of 1000 test emails your model gets right |
| Categorical | one of K outcomes with probabilities summing to 1 | which digit is in the image, which token comes next |
| Uniform | every value in a range equally likely | random initialization, random search |
| Normal (Gaussian) | bell curve with mean mu and spread sigma | measurement noise, weight initialization, errors |

For discrete outcomes probabilities sum to 1. For continuous ones, the area under the density curve is 1.

## 2. Summaries: mean, variance, median

- **Mean (expected value)**: the average. For a distribution, `E[X] = sum of value * probability`.
- **Variance**: the average squared distance from the mean. **Standard deviation** is its square root, in the original units.
- **Median**: the middle value. Robust to outliers.
- **Percentiles**: p95 latency = 95% of requests are faster than this. Industry reports p50, p95 and p99 for latency, never just the mean.

When the mean and the median differ a lot, the data is skewed (incomes, prices, session lengths). Be suspicious of any report that only gives the mean of skewed data.

## 3. Conditional probability and independence

`P(A | B)` is "the probability of A, given that B happened".

```
P(A | B) = P(A and B) / P(B)
```

A and B are **independent** if knowing B tells you nothing about A: `P(A | B) = P(A)`.

Nearly all of supervised learning is estimating a conditional probability: `P(label | features)`. "Given these pixel values, how likely is it a cat?" "Given these previous tokens, how likely is each next token?" An LLM is a machine for computing `P(next token | all previous tokens)`.

## 4. Bayes' theorem and the base rate trap

```
P(A | B) = P(B | A) * P(A) / P(B)
```

The classic example, which also explains a real problem with classifiers:

- A disease affects 1% of people.
- A test catches 90% of sick people (P(positive | sick) = 0.9).
- It wrongly flags 9% of healthy people (P(positive | healthy) = 0.09).

You test positive. Chance you are sick?

```
P(positive) = 0.9 * 0.01 + 0.09 * 0.99 = 0.0981
P(sick | positive) = 0.9 * 0.01 / 0.0981 = 0.092
```

About **9%**. Most people guess 90%. The rare base rate dominates: there are so many healthy people that even a small false positive rate produces far more false alarms than true hits.

Why you care: fraud detection, rare disease screening, content moderation. When the positive class is rare, a model that looks accurate can still be wrong most of the time it raises an alarm. This is the **precision** problem in module 3.

## 5. Likelihood and maximum likelihood

**Probability**: the model is fixed, how likely is the data?
**Likelihood**: the data is fixed, how well does each possible model explain it?

You flip a coin 10 times and get 7 heads. Which p (probability of heads) best explains that? Try them all and compute the likelihood `p^7 * (1-p)^3`. It peaks at p = 0.7. That is **maximum likelihood estimation (MLE)**: choose the parameters that make the observed data most probable.

This is how most models are trained, even when nobody says so:

- Minimizing **mean squared error** is MLE if you assume the errors are Gaussian noise.
- Minimizing **cross-entropy (log loss)** is MLE for classification.
- Training an LLM is MLE: make the actual next tokens in the training text as probable as possible.

### Why everything uses logs

Multiplying thousands of probabilities (one per training example, or one per token) gives numbers too small for a computer to store: they round to exactly 0. Logs turn products into sums: `log(a * b) = log(a) + log(b)`. So we maximize the **log-likelihood**, or equivalently minimize the **negative log-likelihood (NLL)**. Same optimum, no underflow, nicer gradients. The lab shows the underflow happening.

## 6. Softmax: turning scores into probabilities

Models output raw scores called **logits**, any real numbers. Softmax turns them into a probability distribution:

```
softmax(z)_i = exp(z_i) / sum_j exp(z_j)
```

Bigger logits get exponentially more probability. Everything is positive and sums to 1. Dividing the logits by a **temperature** before softmax makes the distribution sharper (T < 1) or flatter (T > 1). That is the temperature setting in every LLM API.

Implementation detail that matters: subtract the max logit first (`z - z.max()`). It does not change the result but prevents `exp` from overflowing. Every serious library does this.

## 7. Entropy, cross-entropy and KL divergence

These three words come up constantly with LLMs. One idea underlies all of them: **surprise**. If an event has probability p, its surprise is `-log(p)`. Certain events (p = 1) have zero surprise. Rare events have large surprise.

- **Entropy** `H(p) = -sum p_i log p_i`: the average surprise of a distribution. A fair coin has high entropy (uncertain). A coin that always lands heads has zero.
- **Cross-entropy** `H(p, q) = -sum p_i log q_i`: the average surprise when reality follows p but you predicted q. If the true answer is class 3, p is all on class 3 and cross-entropy reduces to `-log q_3`: minus the log of the probability your model gave the right answer. **That is the loss function for classification and for LLM training.**
- **KL divergence** `KL(p || q) = H(p, q) - H(p)`: the extra surprise from using q instead of the truth p. Zero only when q equals p. Used in RLHF (keep the fine-tuned model close to the original), in distillation (make a small model match a big one) and in VAEs.

**Perplexity** is `exp(cross-entropy)`, the standard LLM metric. A perplexity of 20 means the model is, on average, as uncertain as if it were choosing uniformly among 20 tokens. Lower is better.

## 8. Sampling, the law of large numbers and the central limit theorem

- **Law of large numbers**: the average of many samples gets close to the true mean. Your test set accuracy approaches the true accuracy as the test set grows.
- **Central limit theorem**: averages of many samples follow a normal distribution, whatever the original distribution looked like. This is why error bars and confidence intervals work.
- **Standard error** of a mean: `std / sqrt(n)`. To halve your uncertainty you need 4 times the data.

Practical consequence: accuracy on a test set of 200 examples has a standard error of about 3 percentage points. A "2 point improvement" on 200 examples is noise. People get this wrong all the time, including in published papers.

## 9. Confidence intervals and the bootstrap

A **95% confidence interval** is a range built by a method that captures the true value 95% of the time. Report results as "accuracy 87.2% (95% CI 85.1 to 89.3)", not just "87.2%".

The **bootstrap** gets intervals for any metric without formulas: resample your test set with replacement thousands of times, recompute the metric each time, and take the 2.5th and 97.5th percentiles. Simple and widely used. The lab implements it in a few lines.

## 10. Hypothesis tests and A/B tests

Companies decide whether to ship a model with **A/B tests**: show the old model to group A and the new one to group B, then compare a business metric (clicks, revenue, retention).

- **Null hypothesis**: "there is no real difference".
- **p-value**: if there really were no difference, how often would we see a gap at least this big by chance? Small p (conventionally below 0.05) means "unlikely to be pure luck".
- **Statistical significance is not practical significance.** With millions of users, a 0.01% improvement can be "significant" and still not be worth the engineering cost.
- **Multiple comparisons**: test 20 random things and one will come out "significant" at p < 0.05 by luck. Comparing many models against one test set has the same problem.

## 11. Correlation is not causation

Ice cream sales correlate with drowning. Neither causes the other: summer causes both. Models learn correlations, not causes. A model that learns "patients who got the intensive treatment died more" might conclude treatment is harmful, when really the sickest patients were the ones treated. Questions about "what happens if we change X" need causal methods or experiments, not just a predictive model. Interviewers like to probe this.

**Simpson's paradox**: a trend can reverse when you split data into groups. Always check whether a result holds within important subgroups (country, device, customer segment).

## Cheat sheet

| Term | One line |
|------|----------|
| expected value | probability-weighted average |
| variance / std | spread around the mean |
| conditional probability | probability given something else is known |
| Bayes | flips a conditional, needs the base rate |
| likelihood | how well parameters explain fixed data |
| MLE | pick parameters that maximize likelihood |
| NLL | the loss version of MLE |
| logits | raw model scores before softmax |
| softmax | scores to probabilities |
| entropy | uncertainty of a distribution |
| cross-entropy | the classification and LLM loss |
| KL divergence | how different two distributions are |
| perplexity | exp(cross-entropy), "effective number of choices" |
| standard error | uncertainty of an average, shrinks with sqrt(n) |
| bootstrap | resampling to get confidence intervals |
| p-value | chance of a result this extreme if nothing is going on |

## Check yourself

1. A fraud model flags 1% of transactions. Fraud is 0.1% of transactions. At best, what fraction of flagged transactions can be fraud?
2. Your model assigns probability 0.25 to the correct next token. What is the cross-entropy loss for that token? What perplexity would the model have if it did this for every token?
3. Model A gets 81% and model B gets 83% on a test set of 300 examples. Can you say B is better? What would you do?
4. Why do we minimize negative log-likelihood instead of maximizing the raw likelihood?
