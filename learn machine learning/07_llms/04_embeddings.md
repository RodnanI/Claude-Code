# Embeddings

An embedding is a vector of numbers that represents something: a token, word, sentence, document, image, user or product. The vectors are learned so that similar things end up close together. This is how neural networks represent meaning, and embeddings drive semantic search, RAG, recommendations, clustering and deduplication. The lab is `05_embeddings_lab.py`.

## From one-hot to dense vectors

A tokenizer gives ids. The simplest vector for an id is a one-hot vector, as long as the vocabulary and all zeros except a 1 at that id. It has two problems: it is huge, at 100,000 numbers per token, and every word is equally different from every other, so the cosine similarity of "cat" and "kitten" is 0, the same as "cat" and "tax".

A dense embedding gives each token a short vector of learned numbers (hundreds to thousands of dimensions), where geometry carries meaning: "cat" and "kitten" point in similar directions. In code, it is just a lookup table: `nn.Embedding(vocab_size, dim)` is a matrix whose row `i` is the vector of token `i`. It is the first layer of every LLM.

## Where the meaning comes from

> "You shall know a word by the company it keeps." (J. R. Firth, 1957)

This is the distributional hypothesis: words used in similar contexts have similar meanings. "Cat" and "dog" both appear near "fed", "pet", "slept" and "vet", so any method that compresses context statistics puts them close together.

There have been three generations of methods. Count-based methods (1990s onward) count which words appear near which, reweight the counts (PPMI) and compress with SVD; this is what the lab does, and it works better than you might expect. Predictive word vectors came next: word2vec (2013) trains a tiny network to predict a word from its neighbors or the reverse, and GloVe (2014) fits vectors to global co-occurrence statistics. They made "king - man + woman is close to queen" famous. Analogy arithmetic only sometimes works and is overhyped, but it shows that directions in the space can carry meaning. Contextual embeddings from transformers are the third: inside an LLM, every layer updates each token's vector using the surrounding text. "Bank" in "river bank" and in "bank account" starts from the same input embedding and ends with different vectors, and this context dependence is a large part of why transformers handle language so much better.

## Sentence and document embeddings

For search and RAG you need one vector per piece of text. Embedding models are transformers trained with contrastive learning, which pulls together pairs that belong together (a question and its answer, a title and its article, two paraphrases) and pushes apart random pairs. As a result, texts with similar meaning get similar vectors even when they share no words.

```
"How do I reset my password?"        \
"I forgot my login credentials"       >  close together
"Steps to recover account access"    /
"Best pizza in Naples"                  far away
```

Where you get them: open models (the `sentence-transformers` library and many models on Hugging Face) or embedding APIs from model providers. Typical sizes: 384 to 3072 dimensions.

## Measuring similarity

Cosine similarity uses the angle only and ignores length; it is the default for text. The dot product uses angle and length and equals cosine when vectors are normalized to length 1, which most embedding models do or recommend. Euclidean distance is the straight-line distance and ranks the same as cosine for normalized vectors.

Use the metric the embedding model was trained for, and embed queries and documents with the same model.

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

Comparing a query with every stored vector (exact kNN, module 4) is fine for thousands of items and too slow for hundreds of millions. Approximate nearest neighbor (ANN) indexes trade a little accuracy for large speed gains. HNSW, a navigable graph, is the most common; IVF clusters the vectors and searches nearby clusters; product quantization compresses the vectors. The tools include FAISS (a library), pgvector (a Postgres extension), dedicated vector databases such as Qdrant, Weaviate, Milvus and Pinecone, and the vector search built into Elasticsearch and OpenSearch. For most companies starting out, pgvector in an existing Postgres database is plenty.

## Pitfalls

Similar is not the same as relevant or true: "The drug is safe" and "The drug is not safe" can be very close, because embeddings capture topic more than logic or negation. A general embedding model may not know that two internal product codes mean the same thing, so evaluate on your own data and consider fine-tuning the embeddings or using hybrid search (file 16). Changing the embedding model means re-embedding everything, so plan for that. Embeddings learned from human text absorb stereotypes, a classic result being occupation words leaning toward gendered words, which matters when embeddings drive decisions about people. And one vector for a 50-page document averages away the detail, which is why RAG splits documents into chunks.

## Questions

1. Why is the cosine similarity between any two different one-hot vectors zero?
2. Explain the distributional hypothesis with an example of your own.
3. How does a contextual embedding of "bank" differ from a word2vec embedding of "bank"?
4. Your semantic search returns documents about "refund policy" for the query "no refunds allowed?". Is that a failure? What could improve it?
