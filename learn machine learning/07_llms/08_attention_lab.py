"""
Attention, step by step, in NumPy. Read 07_attention.md first.

  1. single-head causal self-attention with every intermediate printed
  2. why we scale by sqrt(d)
  3. a hand-designed head that copies the previous token (attention is a programmable lookup)
  4. attention ignores word order unless you add positions
  5. multi-head attention with the real reshapes
  6. check against PyTorch
  7. the quadratic cost

Run it:  python 08_attention_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(0)
np.set_printoptions(precision=2, suppress=True, linewidth=120)


def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)


def attention(X, Wq, Wk, Wv, causal=True):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    scores = Q @ K.T / np.sqrt(K.shape[-1])
    if causal:
        T = len(X)
        future = np.triu(np.ones((T, T), dtype=bool), k=1)    # True above the diagonal
        scores = np.where(future, -np.inf, scores)
    weights = softmax(scores, axis=-1)
    return weights @ V, weights


# %% 1. Single-head causal self-attention, every step visible
tokens = ["the", "cat", "sat", "on", "the", "mat"]
T, C, d = len(tokens), 8, 4                    # 6 tokens, embedding size 8, head size 4
vocab = sorted(set(tokens))
embedding_table = rng.normal(size=(len(vocab), C))
X = embedding_table[[vocab.index(t) for t in tokens]]          # (T, C)
Wq, Wk, Wv = (rng.normal(size=(C, d)) for _ in range(3))

Q, K, V = X @ Wq, X @ Wk, X @ Wv
print("X", X.shape, "-> Q", Q.shape, "K", K.shape, "V", V.shape)
scores = Q @ K.T / np.sqrt(d)
print("\nscores = Q K^T / sqrt(d), shape", scores.shape, "(row = query token, column = key token)\n", scores)
mask = np.triu(np.ones((T, T), dtype=bool), k=1)
masked = np.where(mask, -np.inf, scores)
print("\nafter the causal mask (future = -inf):\n", masked)
weights = softmax(masked)
print("\nattention weights (each row sums to 1):")
print("        " + "".join(f"{t:>7}" for t in tokens))
for t, row in zip(tokens, weights):
    print(f"{t:>7} " + "".join(f"{w:7.2f}" for w in row))
out = weights @ V
print("\noutput shape:", out.shape, "| row sums:", weights.sum(axis=1))
# Row 0 ("the") can only attend to itself. Row 5 ("mat") mixes all six tokens.
# The weights are random because Wq, Wk, Wv are random. Training is what makes them meaningful.


# %% 2. Why divide by sqrt(d)
print("\naverage largest attention weight (random q and k, 16 tokens):")
for dim in [4, 64, 512]:
    q = rng.normal(size=(200, 16, dim))
    k = rng.normal(size=(200, 16, dim))
    raw = np.einsum("bid,bjd->bij", q, k)
    unscaled = softmax(raw).max(axis=-1).mean()
    scaled = softmax(raw / np.sqrt(dim)).max(axis=-1).mean()
    print(f"  d={dim:<4} without scaling {unscaled:.2f}   with scaling {scaled:.2f}")
# Without scaling, large d makes softmax nearly one-hot (max weight near 1): a hard, saturated
# choice whose gradients vanish. Scaling keeps the softmax in a trainable range.


# %% 3. A hand-built "previous token" head
# Give each position a one-hot position code. Keys say "I am position j". Queries say "I want
# position i-1", scaled up so the softmax is sharp. Values carry the token embedding.
P = np.eye(T)
K_hand = P
Q_hand = 20 * np.roll(P, 1, axis=0)        # row i is one-hot at i-1 (row 0 wraps; the mask handles it)
Q_hand[0] = 0                              # position 0 has no previous token: attend uniformly (to itself)
scores_hand = np.where(mask, -np.inf, Q_hand @ K_hand.T)
weights_hand = softmax(scores_hand)
print("\nhand-designed previous-token head:")
print("        " + "".join(f"{t:>7}" for t in tokens))
for t, row in zip(tokens, weights_hand):
    print(f"{t:>7} " + "".join(f"{w:7.2f}" for w in row))
copied = weights_hand @ X                  # values = token embeddings
for i in range(1, T):
    closest = vocab[int(np.argmin(np.linalg.norm(embedding_table - copied[i], axis=1)))]
    print(f"  position {i} ({tokens[i]!r}) now carries the embedding of {closest!r}")
# Attention is a programmable, content-based lookup. Training discovers circuits like this one
# by itself. Combine a previous-token head with a head that searches for earlier matches and you
# get an "induction head": [A][B] ... [A] -> predict [B].


# %% 4. Without positions, word order is invisible
words = {"dog": rng.normal(size=C), "bites": rng.normal(size=C), "man": rng.normal(size=C)}
s1 = np.array([words[w] for w in ["dog", "bites", "man"]])
s2 = np.array([words[w] for w in ["man", "bites", "dog"]])
o1, _ = attention(s1, Wq, Wk, Wv, causal=False)
o2, _ = attention(s2, Wq, Wk, Wv, causal=False)
print(f"\nno positions: output for 'dog' identical in both sentences? {np.allclose(o1[0], o2[2])}")
pos = rng.normal(size=(3, C))                      # learned position embeddings, added to tokens
o1p, _ = attention(s1 + pos, Wq, Wk, Wv, causal=False)
o2p, _ = attention(s2 + pos, Wq, Wk, Wv, causal=False)
print(f"with positions: output for 'dog' identical? {np.allclose(o1p[0], o2p[2])}")


# %% 5. Multi-head attention, with the reshapes real code uses
def multi_head_attention(X, Wq, Wk, Wv, Wo, n_heads):
    T, C = X.shape
    hs = C // n_heads                                              # head size
    def split(M):                                                  # (T, C) -> (heads, T, hs)
        return M.reshape(T, n_heads, hs).transpose(1, 0, 2)
    Q, K, V = split(X @ Wq), split(X @ Wk), split(X @ Wv)
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(hs)               # (heads, T, T)
    future = np.triu(np.ones((T, T), dtype=bool), k=1)
    weights = softmax(np.where(future, -np.inf, scores))
    heads = weights @ V                                            # (heads, T, hs)
    concat = heads.transpose(1, 0, 2).reshape(T, C)               # back to (T, C)
    return concat @ Wo, weights


C_big, n_heads = 16, 4
Xb = rng.normal(size=(T, C_big))
Wq_b, Wk_b, Wv_b, Wo_b = (rng.normal(size=(C_big, C_big)) / np.sqrt(C_big) for _ in range(4))
mha_out, mha_weights = multi_head_attention(Xb, Wq_b, Wk_b, Wv_b, Wo_b, n_heads)
print(f"\nmulti-head: input {Xb.shape}, {n_heads} heads of size {C_big // n_heads}, "
      f"weights {mha_weights.shape}, output {mha_out.shape}")
# Real code adds a batch dimension: (B, T, C) -> (B, heads, T, hs). Same idea.

fig, axes = plt.subplots(1, n_heads + 1, figsize=(16, 3.6))
axes[0].imshow(weights_hand, cmap="Oranges", vmin=0, vmax=1)
axes[0].set_title("hand-built: previous token")
for h in range(n_heads):
    axes[h + 1].imshow(mha_weights[h], cmap="Oranges", vmin=0, vmax=1)
    axes[h + 1].set_title(f"random head {h}")
for ax in axes:
    ax.set_xticks(range(T), tokens, rotation=90, fontsize=8)
    ax.set_yticks(range(T), tokens, fontsize=8)
fig.tight_layout()
fig.savefig(OUT / "attention_heads.png", dpi=120)
print("saved attention_heads.png")


# %% 6. Check against PyTorch's built-in implementation
try:
    import torch
    import torch.nn.functional as F
    ours, _ = attention(X, Wq, Wk, Wv, causal=True)
    q_t, k_t, v_t = (torch.tensor(M) for M in (X @ Wq, X @ Wk, X @ Wv))
    theirs = F.scaled_dot_product_attention(q_t[None], k_t[None], v_t[None], is_causal=True)[0].numpy()
    print(f"\nmatches torch.nn.functional.scaled_dot_product_attention: {np.allclose(ours, theirs)}")
except ImportError:
    print("\n(PyTorch not installed: skipping the comparison)")


# %% 7. The quadratic cost
print("\ncontext length -> attention scores per head per layer (and memory at 2 bytes each)")
for T_ctx in [1_024, 8_192, 131_072, 1_048_576]:
    n = T_ctx ** 2
    print(f"  {T_ctx:>9,} tokens -> {n:>22,} scores ({n * 2 / 1e9:>10,.1f} GB)")
# Nobody materializes these matrices at long context: FlashAttention computes the same result in
# tiles without storing them. The compute still grows with the square of the length.

plt.show()
