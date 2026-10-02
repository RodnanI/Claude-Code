"""
Decoding strategies: how a probability distribution becomes text.

An LLM outputs probabilities for the next token. HOW you pick from them changes the output
as much as the model does. API parameters like temperature, top_p and top_k are these
functions. Covered: greedy, temperature, top-k, top-p (nucleus), min-p, beam search,
repetition penalties, and sequence log-probabilities.

Run it:  python 11_sampling_lab.py
"""

import re
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

rng = np.random.default_rng(0)
COURSE_ROOT = Path(__file__).resolve().parent.parent


def softmax(logits):
    z = np.asarray(logits, dtype=float)
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()


def entropy(p):
    p = p[p > 0]
    return float(-(p * np.log(p)).sum())


# %% 1. One next-token distribution: after "The cat sat on the"
vocab = np.array(["mat", "floor", "sofa", "roof", "keyboard", "windowsill", "moon", "banana"])
logits = np.array([3.0, 2.2, 1.9, 1.0, 0.8, 0.6, -1.0, -2.5])
base = softmax(logits)
print("model probabilities:", {str(w): round(float(p), 3) for w, p in zip(vocab, base)})


# %% 2. The strategies
def greedy(logits):
    return int(np.argmax(logits))


def with_temperature(logits, t):
    return softmax(np.asarray(logits) / t)     # t < 1 sharpens, t > 1 flattens; t -> 0 becomes greedy


def top_k_filter(probs, k):
    keep = np.argsort(-probs)[:k]
    out = np.zeros_like(probs)
    out[keep] = probs[keep]
    return out / out.sum()


def top_p_filter(probs, p):
    """Nucleus sampling: keep the smallest set of most-likely tokens whose total mass >= p."""
    order = np.argsort(-probs)
    cumulative = np.cumsum(probs[order])
    cutoff = int(np.searchsorted(cumulative, p)) + 1
    out = np.zeros_like(probs)
    out[order[:cutoff]] = probs[order[:cutoff]]
    return out / out.sum()


def min_p_filter(probs, min_p):
    """Keep tokens whose probability is at least min_p times the top token's probability."""
    out = np.where(probs >= min_p * probs.max(), probs, 0.0)
    return out / out.sum()


print(f"\ngreedy picks: {str(vocab[greedy(logits)])!r} (always the same)")
print("\ntemperature   entropy   probabilities")
for t in [0.2, 0.7, 1.0, 1.5, 3.0]:
    p = with_temperature(logits, t)
    print(f"  {t:<10}  {entropy(p):.2f}      " + " ".join(f"{w}={q:.2f}" for w, q in zip(vocab[:5], p[:5])))

strategies = {
    "temperature 1.0": base,
    "temperature 0.5": with_temperature(logits, 0.5),
    "top-k 3": top_k_filter(base, 3),
    "top-p 0.9": top_p_filter(base, 0.9),
    "min-p 0.1": min_p_filter(base, 0.1),
}
print("\nshare of 10,000 samples")
print(f"{'strategy':<17}" + "".join(f"{w:>11}" for w in vocab))
for name, p in strategies.items():
    draws = rng.choice(len(vocab), size=10_000, p=p)
    freq = np.bincount(draws, minlength=len(vocab)) / 10_000
    print(f"{name:<17}" + "".join(f"{f:>11.3f}" for f in freq))
# "banana" and "moon" are possible with plain sampling: rare, weird tokens sneak in. Over a
# long generation, one weird token derails the text. Truncation (top-k, top-p, min-p) cuts the
# unreliable tail while keeping variety among sensible options.


# %% 3. Whole sequences: a word-level bigram model of this course's text
def load_words():
    files = sorted(COURSE_ROOT.glob("**/*.md"))
    text = " ".join(f.read_text(encoding="utf-8") for f in files).lower()
    words = [w for w in re.findall(r"[a-z]+", text) if len(w) > 1 or w in ("a", "i")]   # drop stray letters from formulas
    return words if len(words) > 5_000 else ("the model learns the data and the model predicts the next word " * 500).split()


words = load_words()
following = defaultdict(Counter)
for a, b in zip(words, words[1:]):
    following[a][b] += 1


def next_distribution(word):
    options = following.get(word)
    if not options:
        return np.array(["the"]), np.array([1.0])
    tokens = np.array(list(options))
    counts = np.array(list(options.values()), dtype=float)
    return tokens, counts / counts.sum()


def generate(start, n, mode="greedy", temperature=1.0, top_p=None, repetition_penalty=0.0, seed=0):
    r = np.random.default_rng(seed)
    out = [start]
    for _ in range(n):
        tokens, probs = next_distribution(out[-1])
        logits = np.log(probs)
        if repetition_penalty:
            seen = Counter(out)
            logits = logits - repetition_penalty * np.array([seen[t] for t in tokens])   # frequency penalty
        if mode == "greedy":
            out.append(str(tokens[np.argmax(logits)]))
            continue
        p = with_temperature(logits, temperature)
        if top_p:
            p = top_p_filter(p, top_p)
        out.append(str(tokens[r.choice(len(tokens), p=p)]))
    return " ".join(out)


print(f"\nword bigram model built from {len(words):,} words of course text")
print("greedy:              ", generate("the", 14))
print("greedy + penalty 1.0:", generate("the", 14, repetition_penalty=1.0))
print("sample t=1.0:        ", generate("the", 14, mode="sample"))
print("sample t=0.7 top-p .9:", generate("the", 14, mode="sample", temperature=0.7, top_p=0.9))
# Greedy decoding falls into loops: the most likely word after "the" leads to a word whose most
# likely successor leads back again. Penalties and sampling break the loop.


# %% 4. Beam search: keep the B best partial sequences instead of 1
def beam_search(start, length, beam_width=3):
    beams = [([start], 0.0)]                                  # (sequence, total log-probability)
    for _ in range(length):
        candidates = []
        for seq, score in beams:
            tokens, probs = next_distribution(seq[-1])
            top = np.argsort(-probs)[:beam_width]
            for i in top:
                candidates.append((seq + [str(tokens[i])], score + float(np.log(probs[i]))))
        beams = sorted(candidates, key=lambda c: c[1], reverse=True)[:beam_width]
    return beams


print("\nbeam search (width 3), best sequences and their log-probabilities:")
for seq, score in beam_search("the", 8):
    print(f"  {score:8.2f}  {' '.join(seq)}")
# Beam search finds high-probability sequences. That is right for translation or speech
# recognition (one correct answer), and wrong for open-ended writing, where the most probable
# text is bland and repetitive. Chat LLMs use sampling with temperature and top-p instead.


# %% 5. Log-probabilities score whole sequences
def sequence_logprob(sentence):
    toks = sentence.lower().split()
    total = 0.0
    for a, b in zip(toks, toks[1:]):
        count = following.get(a, Counter())[b]
        total += np.log((count + 0.1) / (sum(following.get(a, Counter()).values()) + 0.1 * 5000))
    return total


for s in ["the model learns from the training data", "data the training from learns model the"]:
    print(f"\nlog P({s!r}) = {sequence_logprob(s):.1f}")
# Many APIs can return per-token log-probabilities ("logprobs"). Uses: confidence estimates,
# ranking candidate answers, classification by comparing label probabilities, detecting when
# the model is unsure.

# %% Rules of thumb for API settings
# - Extraction, classification, code, factual answers: low temperature (0 to 0.3).
# - Brainstorming, creative writing: higher temperature (0.7 to 1.0), maybe top-p 0.9-0.95.
# - Change temperature OR top-p, not both at once, unless you have tested combinations.
# - Temperature 0 is not a guarantee of identical outputs in production (batching and hardware
#   nondeterminism), so never build logic that assumes it.
# - Many newer API models no longer accept sampling parameters at all. Current Claude models
#   (for example Claude Opus 5.5) reject temperature, top_p and top_k; you steer them with an
#   "effort" setting and with instructions instead. Open models you run yourself (Hugging Face,
#   vLLM, Ollama, llama.cpp) still expose every knob in this file. Always read the model's docs.
