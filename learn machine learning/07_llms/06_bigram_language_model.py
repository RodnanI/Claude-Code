"""
Your first language model: predict the next character from the current one (a "bigram" model).

Two ways to build the same model:
  A. count how often each character follows each other character, normalize to probabilities
  B. train a tiny neural network with gradient descent to predict the next character
They end up with (almost) the same probabilities. That is the key insight of this file:
a neural language model is a smarter, generalizing way of estimating these probabilities.

You will also: sample text, measure loss and perplexity, and see why one character of
context is not enough, which motivates attention and transformers.

Inspired by Andrej Karpathy's "makemore" series. Trains on this course's own lessons.

Run it:  python 06_bigram_language_model.py   (about 10 seconds)
"""

import re
from pathlib import Path

import numpy as np

COURSE_ROOT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(0)


# %% 1. Data: the course text, simplified to lowercase letters and a little punctuation
def load_text():
    files = sorted(COURSE_ROOT.glob("**/*.md"))
    text = "\n".join(f.read_text(encoding="utf-8") for f in files)
    if len(text) < 20_000:
        text = "the model learns to predict the next character of the text. " * 2000
    text = text.lower()
    text = re.sub(r"[^a-z .,'\n]", " ", text)       # everything else becomes a space
    text = re.sub(r" +", " ", text)                   # collapse runs of spaces
    return re.sub(r"\n\s*\n+", "\n", text)


text = load_text()
chars = sorted(set(text))
stoi = {c: i for i, c in enumerate(chars)}         # string to integer
itos = {i: c for c, i in stoi.items()}             # integer to string
V = len(chars)
data = np.array([stoi[c] for c in text])
split = int(0.9 * len(data))
train, heldout = data[:split], data[split:]
print(f"{len(text):,} characters, vocabulary of {V}: {''.join(chars)!r}")


# %% 2. Model A: counting
counts = np.zeros((V, V))
np.add.at(counts, (train[:-1], train[1:]), 1)      # counts[a, b] = how often b follows a
probs_count = (counts + 1) / (counts + 1).sum(axis=1, keepdims=True)   # +1 = Laplace smoothing


def show_next(c, probs, k=4):
    row = probs[stoi[c]]
    top = np.argsort(-row)[:k]
    return ", ".join(f"{itos[i]!r} {row[i]:.2f}" for i in top)


for c in ["q", "t", " ", "."]:
    print(f"after {c!r}: {show_next(c, probs_count)}")


# %% 3. Sampling: generate text one character at a time
def sample(probs, n=300, start=" ", seed=1):
    r = np.random.default_rng(seed)
    out = [stoi[start]]
    for _ in range(n):
        out.append(r.choice(V, p=probs[out[-1]]))   # draw the next char from the distribution
    return "".join(itos[i] for i in out)


print("\nsample from the counting model:\n", sample(probs_count))
# English-ish letter patterns ("th", "the", "ing"), but no words and no meaning.
# One character of context is all this model has.


# %% 4. How good is it? Average negative log-likelihood (the loss) and perplexity
def evaluate(probs, seq):
    nll = -np.mean(np.log(probs[seq[:-1], seq[1:]]))
    return nll, np.exp(nll)


nll, ppl = evaluate(probs_count, heldout)
print(f"\nheld-out loss {nll:.3f} nats/char, perplexity {ppl:.1f}")
print(f"uniform guessing would be loss {np.log(V):.3f}, perplexity {V}")
# Perplexity ~ "the model is as unsure as if choosing uniformly among this many characters".


# %% 5. Model B: the same thing as a neural network
# Input: the current character as a one-hot vector (length V). One linear layer W (V x V),
# no bias, then softmax. Note: one_hot @ W just selects row W[a]. That IS an embedding lookup.
x, y = train[:-1][:200_000], train[1:][:200_000]
X_onehot = np.eye(V, dtype=np.float32)[x]          # (n, V)
W = rng.normal(0, 0.1, size=(V, V)).astype(np.float32)
lr = 50.0                                           # big, because gradients are averaged over 200k examples
for step in range(201):
    logits = X_onehot @ W                           # (n, V)
    logits -= logits.max(axis=1, keepdims=True)
    p = np.exp(logits)
    p /= p.sum(axis=1, keepdims=True)
    loss = -np.mean(np.log(p[np.arange(len(y)), y]))
    dlogits = p
    dlogits[np.arange(len(y)), y] -= 1              # softmax + cross-entropy gradient: p - onehot
    dW = X_onehot.T @ dlogits / len(y)
    W -= lr * dW
    if step % 50 == 0:
        print(f"neural step {step:>3}: training loss {loss:.4f}")

probs_neural = np.exp(W - W.max(axis=1, keepdims=True))
probs_neural /= probs_neural.sum(axis=1, keepdims=True)
nll_n, ppl_n = evaluate(probs_neural, heldout)
print(f"neural model held-out loss {nll_n:.3f} (counting model: {nll:.3f})")
print(f"largest difference between the two probability tables: {np.abs(probs_neural - probs_count).max():.3f}")
for c in ["q", "t"]:
    print(f"  after {c!r}: neural [{show_next(c, probs_neural)}]  counts [{show_next(c, probs_count)}]")
# Gradient descent rediscovered the counts: common characters match to two decimals. Rare ones
# (like 'q') differ more: they appear in few examples, so their rows get tiny gradients and train
# slowly, and the +1 smoothing shifts the counting model's rare rows too.
# In a bigram model the neural net buys nothing.
# Its power appears when the context is long: counting tables need one row per possible context
# (V^n rows for n characters of context: 31^10 is more than 800 trillion), almost all never seen.
# A neural network shares what it learns across similar contexts instead of memorizing each.


# %% 6. The road from here to GPT
# - Bengio et al. (2003): embed each of the last few tokens, concatenate, feed an MLP. Generalizes
#   across contexts, but the context length is fixed and small.
# - RNNs / LSTMs: a running hidden state carries context forward, one step at a time.
# - Transformers: every position looks at every earlier position directly, through ATTENTION.
#   Next files: 07_attention.md and 08_attention_lab.py, then a full GPT in 10_mini_gpt.py.

# %% Your turn
# 1. Remove the +1 smoothing. What happens to the held-out loss and why? (hint: log(0))
# 2. Build a TRIGRAM counting model: counts of shape (V, V, V), next char given the last two.
#    How much does held-out perplexity improve? How many of the V*V contexts were never seen?
# 3. Sample with a "temperature": raise the probabilities to the power 1/T and renormalize.
#    Compare T = 0.5 and T = 1.5.
