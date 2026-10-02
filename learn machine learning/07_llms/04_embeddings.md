# Embeddings: Meaning as Geometry

An **embedding** is a list of numbers (a vector) that represents something: a token, a word, a sentence, a document, an image, a user, a product. The vectors are learned so that **similar things end up close together**. Embeddings are how neural networks represent meaning, and they power semantic search, RAG, recommendations, clustering and deduplication. Lab: `05_embeddings_lab.py`.

## From one-hot to dense vectors

A tokenizer gives ids. The simplest vector for an id is **one-hot**: a vector as long as the vocabulary, all zeros except a 1 at that id. Two problems:

- Huge (100,000 numbers per token).
- Every word is equally different from every other. The cosine similarity of "cat" and "kitten" is 0, the same as "cat" and "tax".

A **dense embedding** gives each token a short vector of learned numbers (hundreds to thousands of dimensions), where geometry carries meaning: "cat" and "kitten" point in similar directions. In code, it is just a lookup table: `nn.Embedding(vocab_size, dim)` is a matrix whose row `i` is the vector of token `i`. It is the first layer of every LLM.

## Where the meaning comes from

> "You shall know a word by the company it keeps." (J. R. Firth, 1957)

This is the **distributional hypothesis**: words used in similar contexts have similar meanings. "Cat" and "dog" both appear near "fed", "pet", "slept", "vet". Any method that compresses context statistics will put them close together.

Three generations of methods:

1. **Count-based** (1990s onward): count which words appear near which, reweight the counts (PPMI), compress with SVD. This is what the lab does, and it works surprisingly well.
2. **Predictive** word vectors: **word2vec** (2013) trains a tiny network to predict a word from its neighbors or the reverse; **GloVe** (2014) fits vectors to global co-occurrence statistics. These made "king - man + woman is close to queen" famous. Analogy arithmetic works sometimes and is overhyped, but it shows directions in the space can carry meaning.
3. **Contextual embeddings** from transformers: inside an LLM, each token's vector is updated by every layer using the surrounding text. "Bank" in "river bank" and in "bank account" starts from the same input embedding but ends up with different vectors. This context-dependence is a large part of why transformers understand language so much better.

## Sentence and document embeddings

For search and RAG you need one vector per piece of text. **Embedding models** are transformers trained with **contrastive learning**: pull together pairs that belong together (a question and its answer, a title and its article, two paraphrases), push apart random pairs. The result: texts with similar meaning get similar vectors even when they share no words.

```
"How do I reset my password?"        \
"I forgot my login credentials"       >  close together
"Steps to recover account access"    /
"Best pizza in Naples"                  far away
```

Where you get them: open models (the `sentence-transformers` library and many models on Hugging Face) or embedding APIs from model providers. Typical sizes: 384 to 3072 dimensions.

## Measuring similarity

- **Cosine similarity**: angle only, ignores length. The default for text.
- **Dot product**: angle and length. Equal to cosine when vectors are normalized to length 1, which most embedding models do or recommend.
- **Euclidean distance**: straight-line distance. Ranks the same as cosine for normalized vectors.

Always use the metric the embedding model was trained for, and **always embed queries and documents with the same model**.

## What embeddings are used for

| Use | How |
|-----|-----|
| semantic search | embed the query, find the nearest document vectors |
| RAG | semantic search to pick context for an LLM (files 16, 17) |
| clustering / topic discovery | k-means or HDBSCAN on embeddings (module 4) |
| classification | embeddings as features for logistic regression or boosting. A strong, cheap baseline |
| deduplication | near-identical vectors = near-duplicate texts |
| recommendations | users and items embedded in the same space |
| anomaly detection | texts far from everything else |

## Vector search at scale

Comparing a query with every stored vector (exact kNN, module 4) is fine for thousands of items, too slow for hundreds of millions. **Approximate nearest neighbor (ANN)** indexes trade a little accuracy for huge speed: **HNSW** (a navigable graph, the most common), IVF (cluster then search nearby clusters), product quantization (compress vectors). Tools: FAISS (library), pgvector (Postgres extension), and dedicated vector databases such as Qdrant, Weaviate, Milvus, Pinecone, plus vector search built into Elasticsearch/OpenSearch. For most companies starting out, pgvector in an existing Postgres database is plenty.

## Pitfalls

- **Similar is not the same as relevant or true.** "The drug is safe" and "The drug is not safe" can be very close: embeddings capture topic more than logic or negation.
- **Domain mismatch**: a general embedding model may not know that two internal product codes mean the same thing. Evaluate on your own data; consider fine-tuning embeddings or hybrid search (file 16).
- **Changing the embedding model means re-embedding everything.** Plan for it.
- **Bias**: embeddings learned from human text absorb stereotypes (classic result: occupation words leaning toward gendered words). Matters when embeddings drive decisions about people.
- **Long texts get blurry**: one vector for a 50-page document averages away detail. That is why RAG splits documents into chunks.

## Check yourself

1. Why is the cosine similarity between any two different one-hot vectors zero?
2. Explain the distributional hypothesis with an example of your own.
3. How does a contextual embedding of "bank" differ from a word2vec embedding of "bank"?
4. Your semantic search returns documents about "refund policy" for the query "no refunds allowed?". Is that a failure? What could improve it?
