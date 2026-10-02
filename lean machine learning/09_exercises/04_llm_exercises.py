"""
Exercises: language models, attention, sampling and RAG plumbing (do these after module 7).

How to work:
  1. Replace each `raise NotImplementedError` with your own code.
  2. Run:  python 04_llm_exercises.py
  3. The checks print PASS / FAIL / TODO for every function. FAIL messages tell you what went wrong.
Stuck for more than 30 minutes on one function? Read its solution in solutions/, close the file,
and write it again from memory. Copying teaches nothing; rewriting does.
"""

import numpy as np


def build_vocab(text):
    """Character vocabulary. Return (stoi, itos): stoi maps each distinct character to an id,
    in sorted order starting at 0; itos maps ids back to characters."""
    raise NotImplementedError  # your code here


def encode(text, stoi):
    """Text -> list of ids."""
    raise NotImplementedError  # your code here


def decode(ids, itos):
    """List of ids -> text."""
    raise NotImplementedError  # your code here


def bigram_counts(ids, vocab_size):
    """(vocab_size, vocab_size) array where [a, b] counts how often id b follows id a."""
    raise NotImplementedError  # your code here


def apply_temperature(logits, temperature):
    """Divide logits by the temperature, then softmax (stable). Return probabilities."""
    raise NotImplementedError  # your code here


def top_k_filter(probs, k):
    """Keep the k largest probabilities, zero the rest, renormalize to sum to 1."""
    raise NotImplementedError  # your code here


def top_p_filter(probs, p):
    """Nucleus filtering: keep the smallest set of most likely tokens whose total probability
    is at least p (always at least one token), zero the rest, renormalize."""
    raise NotImplementedError  # your code here


def causal_mask(T):
    """Boolean (T, T) array: True where query position i may attend to key position j (j <= i)."""
    raise NotImplementedError  # your code here


def attention(Q, K, V, causal):
    """Scaled dot-product attention: softmax(Q K^T / sqrt(d)) V, row-wise softmax.
    If causal, positions may not attend to the future (use -inf before the softmax)."""
    raise NotImplementedError  # your code here


def cosine_similarity_matrix(A):
    """(n, n) matrix of cosine similarities between the rows of A."""
    raise NotImplementedError  # your code here


def chunk_text(text, size, overlap):
    """Split text into chunks of at most `size` characters, each starting `size - overlap`
    characters after the previous one. Stop once a chunk reaches the end of the text."""
    raise NotImplementedError  # your code here


def merge_pair(ids, pair, new_id):
    """BPE merge: replace every non-overlapping occurrence of `pair` (left to right) with new_id."""
    raise NotImplementedError  # your code here


def perplexity(true_token_probs):
    """exp of the mean negative log probability the model gave to each true next token."""
    raise NotImplementedError  # your code here


def lora_param_count(d_in, d_out, r):
    """Trainable parameters of a rank-r LoRA adapter on a d_out x d_in weight matrix."""
    raise NotImplementedError  # your code here


def kv_cache_bytes(layers, kv_heads, head_dim, seq_len, bytes_per_value):
    """Bytes of KV cache for one sequence: keys AND values, for every layer, head and position."""
    raise NotImplementedError  # your code here


if __name__ == "__main__":
    import checks          # checks.py sits next to this file
    checks.run(globals(), "llm")
