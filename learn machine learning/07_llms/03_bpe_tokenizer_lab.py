"""
Build a byte-level BPE tokenizer from scratch and train it on THIS COURSE's text.
Read 02_tokenization.md first.

Same algorithm family as GPT tokenizers: bytes -> learned merges, with regex
pre-tokenization so merges stay inside words. Inspired by Andrej Karpathy's minbpe
(github.com/karpathy/minbpe) and his video "Let's build the GPT Tokenizer".

Run it:  python 03_bpe_tokenizer_lab.py   (about 10-20 seconds)
"""

import re
import time
from collections import Counter
from pathlib import Path

COURSE_ROOT = Path(__file__).resolve().parent.parent

# %% 1. Training text: every markdown lesson in this course
FALLBACK = """Machine learning is learning a function from examples instead of writing it by hand.
A model has parameters. Training adjusts the parameters to reduce the loss on training data.
Language models predict the next token. Tokens are pieces of text such as words or parts of words."""


def load_course_text(min_chars=20_000):
    files = sorted(COURSE_ROOT.glob("**/*.md"))
    text = "\n\n".join(f.read_text(encoding="utf-8") for f in files)
    if len(text) < min_chars:
        print("(course markdown not found, using a small fallback text)")
        return FALLBACK * 50
    print(f"loaded {len(files)} markdown files from the course, {len(text):,} characters")
    return text


text = load_course_text()
split_at = int(len(text) * 0.9)
train_text, heldout_text = text[:split_at], text[split_at:]


# %% 2. Pre-tokenization: split into chunks that merges may not cross
# Simplified version of the GPT-2 pattern: contractions, words with an optional leading space,
# numbers up to 3 digits, punctuation runs, whitespace.
SPLIT = re.compile(r"'(?:s|t|re|ve|m|ll|d)| ?[^\W\d_]+| ?\d{1,3}| ?[^\s\w]+|\s+(?!\S)|\s+")
print(SPLIT.findall("Hello world, it's 2026! Tokens: 12345."))


# %% 3. The BPE tokenizer
def merge_chunk(ids, pair, new_id):
    """Replace every occurrence of `pair` in the tuple `ids` with `new_id`."""
    out, i = [], 0
    while i < len(ids):
        if i < len(ids) - 1 and ids[i] == pair[0] and ids[i + 1] == pair[1]:
            out.append(new_id)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return tuple(out)


class BPETokenizer:
    def train(self, text, vocab_size, verbose_every=0):
        assert vocab_size > 256
        # Count each distinct chunk once, with its frequency. Much faster than scanning raw text.
        chunks = Counter(tuple(chunk.encode("utf-8")) for chunk in SPLIT.findall(text))
        self.merges = {}                                   # (id_a, id_b) -> new id, in learned order
        self.vocab = {i: bytes([i]) for i in range(256)}   # id -> the bytes it stands for
        for new_id in range(256, vocab_size):
            pair_counts = Counter()
            for chunk, freq in chunks.items():
                for pair in zip(chunk, chunk[1:]):
                    pair_counts[pair] += freq
            if not pair_counts:
                break
            best = max(pair_counts, key=pair_counts.get)   # most frequent adjacent pair
            self.merges[best] = new_id
            self.vocab[new_id] = self.vocab[best[0]] + self.vocab[best[1]]
            new_chunks = Counter()
            for chunk, freq in chunks.items():
                new_chunks[merge_chunk(chunk, best, new_id)] += freq
            chunks = new_chunks
            if verbose_every and (new_id - 256) % verbose_every == 0:
                print(f"  merge {new_id - 255:>4}: {self.show(best[0])!r} + {self.show(best[1])!r} "
                      f"-> {self.show(new_id)!r}  (seen {pair_counts[best]:,} times)")
        self._cache = {}
        return self

    def show(self, token_id):
        return self.vocab[token_id].decode("utf-8", errors="replace")

    def _encode_chunk(self, chunk_bytes):
        ids = tuple(chunk_bytes)
        while len(ids) >= 2:
            # Apply the EARLIEST learned merge available. Order matters: later merges were
            # learned on top of earlier ones.
            pairs = set(zip(ids, ids[1:]))
            pair = min(pairs, key=lambda p: self.merges.get(p, float("inf")))
            if pair not in self.merges:
                break
            ids = merge_chunk(ids, pair, self.merges[pair])
        return ids

    def encode(self, text):
        ids = []
        for chunk in SPLIT.findall(text):
            if chunk not in self._cache:
                self._cache[chunk] = self._encode_chunk(chunk.encode("utf-8"))
            ids.extend(self._cache[chunk])
        return ids

    def decode(self, ids):
        return b"".join(self.vocab[i] for i in ids).decode("utf-8", errors="replace")


# %% 4. Train
start = time.perf_counter()
print("\nfirst merges learned:")
tok = BPETokenizer().train(train_text, vocab_size=256 + 400, verbose_every=40)
print(f"trained {len(tok.merges)} merges in {time.perf_counter() - start:.1f}s; vocabulary size {len(tok.vocab)}")
longest = sorted(tok.vocab.values(), key=len, reverse=True)[:12]
print("longest tokens:", [t.decode("utf-8", errors="replace") for t in longest])


# %% 5. Encode and decode
sentence = "Machine learning models learn patterns from training data."
ids = tok.encode(sentence)
print(f"\n{sentence!r}")
print("token ids:", ids)
print("pieces:   ", "|".join(tok.show(i) for i in ids))
print("round trip ok:", tok.decode(ids) == sentence)
for word in ["learning", " learning", " Learning", " LEARNING"]:
    print(f"  {word!r:<13} -> {tok.encode(word)}")
# Same word, four different token sequences. The model must learn they are related.


# %% 6. Compression: how many bytes does one token cover?
for name, sample in [("training text", train_text[:200_000]), ("held-out text", heldout_text)]:
    n_bytes = len(sample.encode("utf-8"))
    n_tokens = len(tok.encode(sample))
    print(f"{name:<14}: {n_bytes:,} bytes -> {n_tokens:,} tokens = {n_bytes / n_tokens:.2f} bytes per token")


# %% 7. Same meaning, different languages, different cost
samples = {
    "English": "The model learns to predict the next word in a sentence.",
    "Spanish": "El modelo aprende a predecir la siguiente palabra en una frase.",
    "German": "Das Modell lernt, das nächste Wort in einem Satz vorherzusagen.",
    "Japanese": "モデルは文の次の単語を予測することを学びます。",
    "Python": "def predict(x):\n    return model(x).argmax(dim=-1)",
    "Russian": "Модель учится предсказывать следующее слово в предложении.",
}
print("\nlanguage   characters  tokens  tokens per character")
for lang, s in samples.items():
    n_tok = len(tok.encode(s))
    print(f"{lang:<10} {len(s):>10}  {n_tok:>6}  {n_tok / len(s):>8.2f}")
    assert tok.decode(tok.encode(s)) == s, "round trip failed"
# Our tokenizer learned merges from English course text. Spanish and German reuse some English
# pieces. Russian (2 bytes per character in UTF-8) and Japanese (3 bytes per character) fall back
# to raw bytes, so they cost several tokens per character. Real tokenizers train on many languages to soften this, but the
# imbalance still exists, and it shows up on API bills.

# %% Your turn
# 1. Train with vocab_size 256 + 2000. How do bytes-per-token and the longest tokens change?
# 2. Remove pre-tokenization (treat the whole text as one chunk). What strange merges appear?
# 3. Add a special token "<|endoftext|>" with id len(vocab) that encode() emits for that exact
#    string instead of splitting it.
