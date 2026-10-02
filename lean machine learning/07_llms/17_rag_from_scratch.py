"""
RAG from scratch, over this course's own lessons. Read 16_rag.md first.

  1. load every markdown lesson and chunk it by headings
  2. BM25 keyword search, implemented from the formula
  3. "dense" vector search with LSA embeddings (TF-IDF + SVD, no downloads needed)
  4. hybrid search with reciprocal rank fusion
  5. evaluate retrieval with recall@k on labeled questions
  6. build a grounded prompt with numbered sources, and answer it with Claude if you have a key

Run it:
  python 17_rag_from_scratch.py                         evaluation + demo questions
  python 17_rag_from_scratch.py "how do I pick a threshold?"   ask your own question
  python 17_rag_from_scratch.py --live "question"        force calling the API (needs credentials)
"""

import argparse
import math
import os
import re
from collections import Counter
from pathlib import Path

import numpy as np

COURSE_ROOT = Path(__file__).resolve().parent.parent
MODEL = "claude-opus-5-5"


# %% 1. Load and chunk
def load_chunks(max_chars=1200, overlap=150):
    chunks = []
    for path in sorted(COURSE_ROOT.glob("**/*.md")):
        text = path.read_text(encoding="utf-8")
        title = text.splitlines()[0].lstrip("# ").strip() if text else path.stem
        sections = re.split(r"\n(?=## )", text)                 # split at level-2 headings
        for section in sections:
            heading = section.splitlines()[0].lstrip("# ").strip() if section.strip() else ""
            start = 0
            while start < len(section):                           # long sections: sliding windows
                piece = section[start:start + max_chars]
                chunks.append({"source": str(path.relative_to(COURSE_ROOT)), "title": title,
                               "heading": heading, "text": piece})
                if start + max_chars >= len(section):
                    break
                start += max_chars - overlap
    return chunks


STOPWORDS = set("""a an the and or but if of to in on at by for with from as is are was were be been being it its
this that these those you your i we they he she them our their what which who how why when where do does did
not no can could should would will just than then so such into about over also more most very only same other""".split())


def tokenize(text):
    return [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOPWORDS and len(w) > 1]


chunks = load_chunks()
docs = [tokenize(c["title"] + " " + c["heading"] + " " + c["text"]) for c in chunks]
print(f"{len(chunks)} chunks from {len({c['source'] for c in chunks})} lessons")


# %% 2. BM25: the classic keyword ranking function
class BM25:
    def __init__(self, docs, k1=1.5, b=0.75):
        self.docs, self.k1, self.b = docs, k1, b
        self.tf = [Counter(d) for d in docs]
        self.lengths = np.array([len(d) for d in docs])
        self.avg_len = self.lengths.mean()
        df = Counter(term for d in docs for term in set(d))
        n = len(docs)
        # Rare terms are informative ("leakage"), common ones are not ("model").
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def scores(self, query_tokens):
        out = np.zeros(len(self.docs))
        for i, tf in enumerate(self.tf):
            norm = self.k1 * (1 - self.b + self.b * self.lengths[i] / self.avg_len)   # long docs get discounted
            for t in query_tokens:
                if t in tf:
                    out[i] += self.idf[t] * tf[t] * (self.k1 + 1) / (tf[t] + norm)  # saturating term frequency
        return out


bm25 = BM25(docs)


# %% 3. Dense retrieval with LSA embeddings (TF-IDF matrix compressed by SVD)
# Real systems use a neural embedding model. LSA is its classical ancestor: same pipeline shape,
# no download, and it already matches some synonyms because related words share contexts.
vocab_counts = Counter(t for d in docs for t in set(d))
vocab = {t: i for i, t in enumerate(sorted(t for t, c in vocab_counts.items() if c >= 2))}
idf = np.array([math.log(len(docs) / vocab_counts[t]) for t in sorted(vocab)], dtype=np.float32)


def tfidf(tokens):
    v = np.zeros(len(vocab), dtype=np.float32)
    for t, c in Counter(tokens).items():
        if t in vocab:
            v[vocab[t]] = 1 + math.log(c)
    return v * idf


M = np.stack([tfidf(d) for d in docs])
U, S, Vt = np.linalg.svd(M, full_matrices=False)
K = 150
projection = Vt[:K].T                                          # vocab -> K-dimensional "embedding"


def embed(tokens):
    v = tfidf(tokens) @ projection
    return v / (np.linalg.norm(v) + 1e-9)


chunk_vectors = M @ projection
chunk_vectors /= np.linalg.norm(chunk_vectors, axis=1, keepdims=True) + 1e-9


def dense_scores(query_tokens):
    return chunk_vectors @ embed(query_tokens)                  # cosine similarity


# %% 4. Hybrid search: reciprocal rank fusion
def rank(scores):
    return np.argsort(-scores)


def hybrid(query_tokens, k=60):
    fused = np.zeros(len(chunks))
    for scores in (bm25.scores(query_tokens), dense_scores(query_tokens)):
        for position, idx in enumerate(rank(scores)[:100]):
            fused[idx] += 1 / (k + position + 1)
    return fused


def search(query, method="hybrid", top_k=5):
    q = tokenize(query)
    scores = {"bm25": bm25.scores, "dense": dense_scores, "hybrid": hybrid}[method](q)
    return [int(i) for i in rank(scores)[:top_k]]


# %% 5. Evaluate retrieval: did the right lesson make the top k?
# Questions are phrased differently from the lessons on purpose, like real user questions.
labeled = [
    ("my model scores great offline but collapses after deployment, information from the future?", "09_data_splits_and_leakage.md"),
    ("why divide by the square root of the head size", "07_attention.md"),
    ("how does boosting fix the mistakes of earlier trees", "04_trees_and_ensembles.md"),
    ("probability of disease after a positive test result", "05_probability_and_statistics.md"),
    ("why are some languages more expensive to process with tokens", "02_tokenization.md"),
    ("loss becomes nan during training what should I check", "04_training_deep_networks.md"),
    ("precision recall tradeoff and choosing a threshold with costs", "07_evaluation_metrics.md"),
    ("checking a response was cut off because of the output limit", "13_llm_apis.md"),
    ("separating instructions from untrusted data in a prompt", "15_prompt_engineering.md"),
    ("one hot vectors versus dense learned vectors for words", "04_embeddings.md"),
]
labeled = [(q, f) for q, f in labeled if any(c["source"].endswith(f) for c in chunks)]
print(f"\nretrieval recall@k on {len(labeled)} labeled questions (did a chunk from the right lesson appear?)")
print(f"{'method':<8}" + "".join(f"  recall@{k}" for k in (1, 3, 5)))
for method in ["bm25", "dense", "hybrid"]:
    row = []
    for k in (1, 3, 5):
        hits = [any(chunks[i]["source"].endswith(f) for i in search(q, method, k)) for q, f in labeled]
        row.append(np.mean(hits))
    print(f"{method:<8}" + "".join(f"  {r:>8.2f}" for r in row))
# Read this table like an engineer: which method misses which question, and why? Print the
# results for a missed question and look at what was retrieved instead. The usual culprit is
# VOCABULARY MISMATCH: the user's words ("trainable parameters") differ from the document's words
# ("only A and B are trained"). Fixes: hybrid search, a real embedding model, a reranker, query
# rewriting, and chunk headers that name the topic.


# %% 6. Build a grounded prompt and (optionally) generate an answer
def build_prompt(question, chunk_ids):
    sources = "\n\n".join(
        f"[{n}] ({chunks[i]['source']}, \"{chunks[i]['heading']}\")\n{chunks[i]['text'].strip()}"
        for n, i in enumerate(chunk_ids, start=1)
    )
    return ("Answer the question using only the numbered sources below. Cite sources like [2] after each "
            "claim. If the sources do not contain the answer, say so instead of guessing.\n\n"
            f"<sources>\n{sources}\n</sources>\n\n<question>\n{question}\n</question>")


def answer(question, live):
    ids = search(question, "hybrid", top_k=4)
    print(f"\nQUESTION: {question}")
    for n, i in enumerate(ids, start=1):
        print(f"  [{n}] {chunks[i]['source']}  ->  {chunks[i]['heading'][:60]}")
    prompt = build_prompt(question, ids)
    has_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
    if not (has_key or live):
        print(f"  (no API key: this {len(prompt):,}-character prompt would be sent. First lines:)")
        print("  " + "\n  ".join(prompt.splitlines()[:6]))
        return
    import anthropic
    client = anthropic.Anthropic()
    response = client.beta.messages.create(
        model=MODEL, max_tokens=1024, messages=[{"role": "user", "content": prompt}],
        output_config={"effort": "low"},
        betas=["server-side-fallback-2026-07-01"], fallbacks="default",   # retry declines on a fallback model
    )
    if response.stop_reason == "refusal":
        print("  The model declined this request.")
        return
    print("ANSWER:", "".join(b.text for b in response.content if b.type == "text"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("question", nargs="?", help="your own question about the course")
    parser.add_argument("--live", action="store_true", help="call the API even without ANTHROPIC_API_KEY set")
    args = parser.parse_args()
    questions = [args.question] if args.question else [
        "What is data leakage and how do I prevent it?",
        "How does LoRA reduce the number of trainable parameters?",
    ]
    for q in questions:
        answer(q, args.live)

# Your turn
# 1. Change max_chars to 400 and 3000. How does recall@3 change? Why?
# 2. Add 5 labeled questions of your own, including one whose answer is NOT in the course.
#    What should a good system do with it?
# 3. Replace LSA with a real embedding model (e.g. the sentence-transformers library) and compare.
