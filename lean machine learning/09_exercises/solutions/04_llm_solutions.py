"""
SOLUTIONS for 04_llm_exercises.py. Try the exercises first.
"""

import numpy as np


def build_vocab(text):
    """Character vocabulary. Return (stoi, itos): stoi maps each distinct character to an id,
    in sorted order starting at 0; itos maps ids back to characters."""
    chars = sorted(set(text))
    stoi = {c: i for i, c in enumerate(chars)}
    return stoi, {i: c for c, i in stoi.items()}


def encode(text, stoi):
    """Text -> list of ids."""
    return [stoi[c] for c in text]


def decode(ids, itos):
    """List of ids -> text."""
    return "".join(itos[i] for i in ids)


def bigram_counts(ids, vocab_size):
    """(vocab_size, vocab_size) array where [a, b] counts how often id b follows id a."""
    counts = np.zeros((vocab_size, vocab_size))
    for a, b in zip(ids, ids[1:]):
        counts[a, b] += 1
    return counts


def apply_temperature(logits, temperature):
    """Divide logits by the temperature, then softmax (stable). Return probabilities."""
    z = np.asarray(logits, dtype=float) / temperature
    e = np.exp(z - z.max())
    return e / e.sum()


def top_k_filter(probs, k):
    """Keep the k largest probabilities, zero the rest, renormalize to sum to 1."""
    keep = np.argsort(-probs)[:k]
    out = np.zeros_like(probs, dtype=float)
    out[keep] = probs[keep]
    return out / out.sum()


def top_p_filter(probs, p):
    """Nucleus filtering: keep the smallest set of most likely tokens whose total probability
    is at least p (always at least one token), zero the rest, renormalize."""
    order = np.argsort(-probs)
    cutoff = int(np.searchsorted(np.cumsum(probs[order]), p)) + 1
    out = np.zeros_like(probs, dtype=float)
    out[order[:cutoff]] = probs[order[:cutoff]]
    return out / out.sum()


def causal_mask(T):
    """Boolean (T, T) array: True where query position i may attend to key position j (j <= i)."""
    return np.tril(np.ones((T, T), dtype=bool))


def attention(Q, K, V, causal):
    """Scaled dot-product attention: softmax(Q K^T / sqrt(d)) V, row-wise softmax.
    If causal, positions may not attend to the future (use -inf before the softmax)."""
    scores = Q @ K.T / np.sqrt(K.shape[1])
    if causal:
        scores = np.where(causal_mask(len(Q)), scores, -np.inf)
    w = np.exp(scores - scores.max(axis=1, keepdims=True))
    w /= w.sum(axis=1, keepdims=True)
    return w @ V


def cosine_similarity_matrix(A):
    """(n, n) matrix of cosine similarities between the rows of A."""
    unit = A / np.linalg.norm(A, axis=1, keepdims=True)
    return unit @ unit.T


def chunk_text(text, size, overlap):
    """Split text into chunks of at most `size` characters, each starting `size - overlap`
    characters after the previous one. Stop once a chunk reaches the end of the text."""
    chunks, start = [], 0
    while True:
        chunks.append(text[start:start + size])
        if start + size >= len(text):
            return chunks
        start += size - overlap


def merge_pair(ids, pair, new_id):
    """BPE merge: replace every non-overlapping occurrence of `pair` (left to right) with new_id."""
    out, i = [], 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == pair:
            out.append(new_id)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return out


def perplexity(true_token_probs):
    """exp of the mean negative log probability the model gave to each true next token."""
    return float(np.exp(-np.mean(np.log(true_token_probs))))


def lora_param_count(d_in, d_out, r):
    """Trainable parameters of a rank-r LoRA adapter on a d_out x d_in weight matrix."""
    return r * (d_in + d_out)


def kv_cache_bytes(layers, kv_heads, head_dim, seq_len, bytes_per_value):
    """Bytes of KV cache for one sequence: keys AND values, for every layer, head and position."""
    return 2 * layers * kv_heads * head_dim * seq_len * bytes_per_value


if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import checks
    checks.run(globals(), "llm")
