"""
Probability and statistics lab. Read 05_probability_and_statistics.md first.
Most results here are checked by simulation. When unsure, simulate.

Run it:  python 06_probability_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(42)


# %% 1. Law of large numbers: averages settle down
flips = rng.integers(0, 2, size=100_000)            # 0 = tails, 1 = heads
running_mean = np.cumsum(flips) / np.arange(1, len(flips) + 1)
for n in [10, 100, 1_000, 100_000]:
    print(f"after {n:>7} flips: fraction of heads = {running_mean[n - 1]:.4f}")


# %% 2. Bayes: the medical test, by formula and by simulation
prevalence, sensitivity, false_positive_rate = 0.01, 0.90, 0.09
p_positive = sensitivity * prevalence + false_positive_rate * (1 - prevalence)
print(f"\nBayes formula: P(sick | positive) = {sensitivity * prevalence / p_positive:.3f}")

people = 1_000_000
sick = rng.random(people) < prevalence
positive = np.where(sick, rng.random(people) < sensitivity, rng.random(people) < false_positive_rate)
print(f"simulation:    P(sick | positive) = {sick[positive].mean():.3f}")
print(f"  {positive.sum():,} positives, of which only {(sick & positive).sum():,} are sick")


# %% 3. Maximum likelihood: which coin bias explains 7 heads out of 10?
heads, tails = 7, 3
candidates = np.linspace(0.01, 0.99, 99)
likelihood = candidates ** heads * (1 - candidates) ** tails
log_likelihood = heads * np.log(candidates) + tails * np.log(1 - candidates)
print(f"\nMLE by brute force: p = {candidates[likelihood.argmax()]:.2f} "
      f"(log version agrees: {candidates[log_likelihood.argmax()]:.2f})")


# %% 4. Why logs: underflow
probs = rng.uniform(0.01, 0.2, size=1000)      # e.g. probability of each token in a long text
print(f"\nproduct of 1000 probabilities: {np.prod(probs)}  <- underflowed to exactly 0")
print(f"sum of their logs:             {np.sum(np.log(probs)):.1f}  <- perfectly usable")


# %% 5. Softmax, temperature, and the max trick
def softmax(logits, temperature=1.0):
    z = np.asarray(logits, dtype=float) / temperature
    z = z - z.max()                  # stability: exp of big numbers overflows
    e = np.exp(z)
    return e / e.sum()


logits = np.array([2.0, 1.0, 0.5, -1.0])
for t in [0.5, 1.0, 2.0]:
    print(f"temperature {t}: {softmax(logits, t).round(3)}")
big = np.array([1000.0, 999.0])
with np.errstate(over="ignore", invalid="ignore"):
    naive = np.exp(big) / np.exp(big).sum()
print("naive softmax of [1000, 999]:", naive, "| stable:", softmax(big).round(4))


# %% 6. Entropy, cross-entropy, KL divergence, perplexity
def entropy(p):
    p = np.asarray(p, dtype=float)
    nonzero = p > 0
    return -np.sum(p[nonzero] * np.log(p[nonzero]))


def cross_entropy(p, q):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    nonzero = p > 0
    return -np.sum(p[nonzero] * np.log(q[nonzero]))


def kl_divergence(p, q):
    return cross_entropy(p, q) - entropy(p)


fair = [0.5, 0.5]
loaded = [0.9, 0.1]
print(f"\nentropy fair coin   {entropy(fair):.3f} nats (maximum uncertainty for 2 outcomes)")
print(f"entropy loaded coin {entropy(loaded):.3f} nats")
print(f"KL(fair || loaded)  {kl_divergence(fair, loaded):.3f}  KL(loaded || fair) {kl_divergence(loaded, fair):.3f}"
      "  <- not symmetric")

# Cross-entropy as a classification / LLM loss: the truth is one-hot.
vocab = ["the", "cat", "sat", "mat"]
prediction = np.array([0.1, 0.6, 0.2, 0.1])     # model's next-token probabilities
true_next = vocab.index("cat")
one_hot = np.eye(len(vocab))[true_next]
loss = cross_entropy(one_hot, prediction)
print(f"loss when the true token got p=0.6: {loss:.3f} = -log(0.6) = {-np.log(0.6):.3f}")

# Perplexity = exp(average loss). A model that assigns 1/20 to every true token has perplexity 20.
per_token_probs = np.full(50, 1 / 20)
print(f"perplexity of a 'uniform over 20' model: {np.exp(-np.log(per_token_probs).mean()):.1f}")


# %% 7. Central limit theorem: averages become bell shaped
skewed = rng.exponential(scale=1.0, size=(10_000, 30))   # very skewed raw data
averages = skewed.mean(axis=1)                            # 10,000 averages of 30 numbers each
fig, axes = plt.subplots(1, 2, figsize=(10, 3.5))
axes[0].hist(skewed[:, 0], bins=60, color="#c8553d")
axes[0].set_title("raw data: skewed")
axes[1].hist(averages, bins=60, color="#2a9d8f")
axes[1].set_title("averages of 30: bell curve")
fig.tight_layout()
fig.savefig(OUT / "prob_central_limit.png", dpi=120)
print("\nsaved prob_central_limit.png")
print(f"standard error predicted std/sqrt(n) = {1 / np.sqrt(30):.3f}, measured = {averages.std():.3f}")


# %% 8. How noisy is a test-set accuracy? (simulation)
true_accuracy = 0.85
for n_test in [100, 1_000, 10_000]:
    measured = rng.binomial(n_test, true_accuracy, size=5_000) / n_test   # 5000 imaginary test sets
    low, high = np.percentile(measured, [2.5, 97.5])
    print(f"test set of {n_test:>6}: measured accuracy ranges {low:.3f} to {high:.3f} (95% of the time)")


# %% 9. The bootstrap: a confidence interval for ANY metric
# Pretend these are per-example results of a model on 300 test examples (1 = correct).
correct = rng.random(300) < 0.83
boot = [rng.choice(correct, size=len(correct), replace=True).mean() for _ in range(5_000)]
low, high = np.percentile(boot, [2.5, 97.5])
print(f"\naccuracy {correct.mean():.3f}, bootstrap 95% CI [{low:.3f}, {high:.3f}]")
# Two models whose intervals overlap heavily are not clearly different. Compare them on the
# SAME examples with a paired test or paired bootstrap for a sharper answer.


# %% 10. A/B test with a permutation test
# Group A (old model): 10,000 users, 4.8% clicked. Group B (new model): 10,000 users, 5.3% clicked.
a = rng.random(10_000) < 0.048
b = rng.random(10_000) < 0.053
observed_gap = b.mean() - a.mean()
pooled = np.concatenate([a, b])
gaps = []
for _ in range(2_000):
    shuffled = rng.permutation(pooled)       # if labels A/B do not matter, shuffling them changes nothing
    gaps.append(shuffled[10_000:].mean() - shuffled[:10_000].mean())
p_value = np.mean(np.abs(gaps) >= abs(observed_gap))
print(f"\nA/B: A={a.mean():.4f}, B={b.mean():.4f}, gap={observed_gap:+.4f}, p-value ~ {p_value:.3f}")
if p_value < 0.05:
    print("p < 0.05: unlikely to be luck alone. Next question: is the gap worth shipping?")
else:
    print("p >= 0.05: this gap could easily be luck.")
# Plot twist: we KNOW B is truly better (5.3% vs 4.8%, we wrote it above). Yet with 10,000
# users per group this test detects it only about a third of the time. That is called LOW
# STATISTICAL POWER. Change the seed or the group sizes and rerun. Small real effects need
# big samples, which is why serious A/B tests compute the required sample size BEFORE starting.

plt.show()
