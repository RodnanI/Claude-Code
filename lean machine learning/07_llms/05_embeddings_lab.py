"""
Learn word embeddings from nothing but co-occurrence counts, then use them for search.
Read 04_embeddings.md first.

Recipe (count-based embeddings, the ancestor of word2vec):
  1. count which words appear near which (a co-occurrence matrix)
  2. reweight counts with PPMI (how much MORE often than chance two words co-occur)
  3. compress with SVD (module 2) into short dense vectors

The corpus is generated from templates so you can see exactly what the model can and
cannot learn. Nobody tells it that "cat" and "dog" are both animals.

Run it:  python 05_embeddings_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(0)


# %% 1. A synthetic corpus
categories = {
    "animal": ["cat", "dog", "horse", "rabbit", "cow", "sheep", "goat", "mouse"],
    "food": ["pizza", "pasta", "bread", "cheese", "apple", "soup", "rice", "cake"],
    "vehicle": ["car", "bus", "truck", "bike", "train", "boat", "van", "taxi"],
    "city": ["paris", "london", "berlin", "madrid", "rome", "tokyo", "lisbon", "vienna"],
    "job": ["doctor", "teacher", "pilot", "chef", "farmer", "nurse", "lawyer", "artist"],
}
templates = {
    "animal": ["the {} ate grass in the field", "a {} slept near the barn", "the farmer fed the {}",
               "my {} ran across the yard", "the {} drank water from the river"],
    "food": ["i ate {} for dinner", "the {} tasted delicious", "she cooked {} in the kitchen",
             "we bought fresh {} at the market", "the chef served warm {}"],
    "vehicle": ["he drove the {} to work", "the {} stopped at the station", "we took the {} downtown",
                "the {} needs new tires", "a red {} parked outside"],
    "city": ["she flew to {} last summer", "{} is a beautiful city", "we visited museums in {}",
             "the train arrived in {} at noon", "he lives in {} with his family"],
    "job": ["the {} went to work early", "my sister is a {}", "the {} earned a good salary",
            "she wants to become a {}", "the {} talked to the clients"],
}
mixed = ["the {job} drove the {vehicle} to {city}", "the {job} ate {food}", "the {animal} chased the {vehicle}"]

sentences = []
for _ in range(4000):
    if rng.random() < 0.8:
        cat = rng.choice(list(categories))
        sentences.append(rng.choice(templates[cat]).format(rng.choice(categories[cat])))
    else:
        t = rng.choice(mixed)
        sentences.append(t.format(**{c: rng.choice(w) for c, w in categories.items()}))
print(f"{len(sentences)} sentences, e.g.:", sentences[:3])


# %% 2. Vocabulary and co-occurrence counts (window of 2 words on each side)
tokens = [s.split() for s in sentences]
vocab = sorted({w for sent in tokens for w in sent})
index = {w: i for i, w in enumerate(vocab)}
V = len(vocab)
counts = np.zeros((V, V))
WINDOW = 2
for sent in tokens:
    for i, w in enumerate(sent):
        for j in range(max(0, i - WINDOW), min(len(sent), i + WINDOW + 1)):
            if i != j:
                counts[index[w], index[sent[j]]] += 1
print(f"vocabulary {V} words, co-occurrence matrix {counts.shape}")


# %% 3. PPMI: positive pointwise mutual information
# PMI(w, c) = log( P(w, c) / (P(w) P(c)) ): how much more often w and c meet than if independent.
# Frequent filler words ("the") co-occur with everything, so raw counts overrate them. PMI fixes that.
total = counts.sum()
p_wc = counts / total
p_w = counts.sum(axis=1, keepdims=True) / total
p_c = counts.sum(axis=0, keepdims=True) / total
with np.errstate(divide="ignore"):
    pmi = np.log(p_wc / (p_w * p_c))
ppmi = np.maximum(pmi, 0)          # keep only "more than chance"; negative and -inf become 0


# %% 4. SVD: compress each word's 100-plus-number PPMI row into 16 numbers
U, S, Vt = np.linalg.svd(ppmi)
DIM = 16
emb = U[:, :DIM] * np.sqrt(S[:DIM])
emb = emb / np.linalg.norm(emb, axis=1, keepdims=True)    # unit length, so dot product = cosine


def nearest(word, k=5):
    sims = emb @ emb[index[word]]
    order = np.argsort(-sims)
    return [(vocab[i], round(float(sims[i]), 2)) for i in order[1:k + 1]]


print("\nnearest neighbors (cosine similarity):")
for w in ["cat", "pizza", "train", "paris", "doctor", "delicious"]:
    print(f"  {w:<10} -> {nearest(w)}")
# Words of the same category cluster together, purely from shared contexts.
# "train" is the least tight member of its group: it ALSO appears in "the train arrived in <city>",
# a context no other vehicle has. One vector per word must average over all of a word's uses.
# Contextual (transformer) embeddings fix this by giving each occurrence its own vector.


# %% 5. One-hot vectors know nothing
one_hot = np.eye(V)
print(f"\none-hot cosine(cat, dog) = {one_hot[index['cat']] @ one_hot[index['dog']]:.0f}, "
      f"learned cosine(cat, dog) = {emb[index['cat']] @ emb[index['dog']]:.2f}, "
      f"learned cosine(cat, taxi) = {emb[index['cat']] @ emb[index['taxi']]:.2f}")


# %% 6. Picture the space (PCA of the category words to 2D)
words = [w for ws in categories.values() for w in ws]
vecs = emb[[index[w] for w in words]]
centered = vecs - vecs.mean(axis=0)
_, _, Vt2 = np.linalg.svd(centered, full_matrices=False)
xy = centered @ Vt2[:2].T
palette = ["#c8553d", "#2a9d8f", "#e9c46a", "#2b2d42", "#8a9a5b"]
fig, ax = plt.subplots(figsize=(8, 6))
for (cat, ws), color in zip(categories.items(), palette):
    idx = [words.index(w) for w in ws]
    ax.scatter(xy[idx, 0], xy[idx, 1], color=color, label=cat, s=40)
    for i in idx:
        ax.annotate(words[i], xy[i], fontsize=8, xytext=(3, 3), textcoords="offset points")
ax.legend()
ax.set_title("Word embeddings learned from co-occurrence counts (PCA to 2D)")
fig.savefig(OUT / "embeddings_2d.png", dpi=120)
print("saved embeddings_2d.png")


# %% 7. Tiny semantic search: a sentence vector = average of its word vectors
STOP = {"the", "a", "i", "we", "he", "she", "my", "to", "in", "at", "for", "of", "is", "with", "from", "and"}


def embed_sentence(text):
    vs = [emb[index[w]] for w in text.split() if w in index and w not in STOP]
    v = np.mean(vs, axis=0)
    return v / np.linalg.norm(v)


documents = sorted(set(sentences))
doc_matrix = np.array([embed_sentence(d) for d in documents])
for query in ["cooked rice", "the rabbit slept", "flew to rome", "the nurse earned salary"]:
    scores = doc_matrix @ embed_sentence(query)
    top = np.argsort(-scores)[:3]
    print(f"\nquery: {query!r}")
    for i in top:
        print(f"   {scores[i]:.2f}  {documents[i]}")
# Averaging word vectors is a crude sentence embedding (it ignores word order completely), but
# it already finds related sentences that share NO exact words with the query.
# Notice the ties: our templates use every word of a category in identical contexts, so they got
# nearly identical vectors. Real text is messier and real embedding models (transformers trained
# for exactly this job) separate meanings far better.

plt.show()

# %% Your turn
# 1. Use raw counts instead of PPMI before the SVD. Do the neighbors get worse? Why?
# 2. Change DIM to 2, then 50. What happens to neighbor quality?
# 3. Add a new category (sports or colors) with its own templates. Does it form its own cluster?
