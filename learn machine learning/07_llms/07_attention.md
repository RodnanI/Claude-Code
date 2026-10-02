# Attention

Attention is the mechanism that lets each token gather information from other tokens, with the amount decided by content. It is the core of the transformer and the reason LLMs handle long-range context. Build it in `08_attention_lab.py` right after reading.

## The problem attention solves

The bigram model saw one character of context. Real meaning depends on much more:

- "The **bank** raised interest rates" vs "We sat on the river **bank**".
- "The trophy did not fit in the suitcase because **it** was too big." What is "it"?
- "This movie is **not** good."

Each token's representation must be updated using the *relevant* other tokens. Which ones are relevant depends on the content itself. A fixed window cannot do that. Attention can.

## Queries, keys and values

Every token produces three vectors from its current representation `x` (each by a learned matrix multiply):

| Vector | Question it answers |
|--------|---------------------|
| **query** `q = x Wq` | "what am I looking for?" |
| **key** `k = x Wk` | "what do I contain? match me against queries" |
| **value** `v = x Wv` | "what do I hand over if someone attends to me?" |

Think of a fuzzy search engine. Your query is compared with every document's key. Instead of returning the single best document, it returns a **weighted average of all documents' values**, weighted by how well each key matched.

## The formula

```
Attention(Q, K, V) = softmax( Q K^T / sqrt(d_k) ) V
```

With T tokens and head size d_k:

| Step | Shape | Meaning |
|------|-------|---------|
| `Q = X Wq`, `K = X Wk`, `V = X Wv` | (T, d_k) each | per-token queries, keys, values |
| `scores = Q K^T / sqrt(d_k)` | (T, T) | how well token i's query matches token j's key: dot products! |
| apply causal mask | (T, T) | forbid looking at future tokens (set those scores to minus infinity) |
| `weights = softmax(scores)` row by row | (T, T) | each row sums to 1: how token i splits its attention |
| `output = weights V` | (T, d_k) | each token gets a weighted mix of values |

That is all. Matrix multiplies, a scaling, a mask and a softmax.

### Why divide by sqrt(d_k)?

If query and key entries are random with variance 1, their dot product has variance d_k. With d_k = 128, scores are large, softmax becomes nearly one-hot, and gradients through it nearly vanish. Dividing by sqrt(d_k) brings the variance back to about 1. The lab measures this.

### The causal mask

A language model predicts the next token, so position t must not see positions after t, or it could simply read the answer. Setting future scores to minus infinity makes their softmax weight exactly 0. The mask is also what makes training efficient: one forward pass over a sequence of T tokens gives T valid next-token predictions at once, each using only its past.

Encoder models like BERT use no mask (every token sees every other), which suits understanding tasks such as classification but not left-to-right generation.

## Multi-head attention

One attention operation computes one kind of relationship. Transformers run several in parallel, each with its own smaller Wq, Wk, Wv (head size = model width / number of heads), then concatenate the results and mix them with an output matrix Wo.

```
heads = [Attention(X Wq_i, X Wk_i, X Wv_i) for i in 1..h]
output = concat(heads) Wo
```

Different heads learn different jobs. Researchers have found heads that attend to the previous token, heads that link pronouns to their nouns, and **induction heads** that implement "if [A][B] appeared earlier and I now see [A], predict [B]", a key mechanism behind in-context learning (learning from examples given in the prompt).

## Self-attention vs cross-attention

- **Self-attention**: queries, keys and values all come from the same sequence. Every decoder-only LLM uses only this.
- **Cross-attention**: queries come from one sequence, keys and values from another. The original transformer used it so the translation decoder could look at the source sentence. Some multimodal and speech models use it too.

## Attention does not know about order

Without extra information, attention treats input as a **set**: shuffle the tokens and each token's output is the same, just shuffled. "Dog bites man" and "man bites dog" would look alike (the lab shows this). So transformers inject **position information**:

- **Learned absolute position embeddings**: a vector per position, added to the token embedding (GPT-2, and our mini GPT).
- **Sinusoidal encodings**: fixed sine/cosine patterns (the original transformer).
- **RoPE (rotary position embeddings)**: rotates queries and keys by an angle depending on position, so attention scores depend on *relative* distance. Used by most modern LLMs (Llama, Qwen, Mistral and others) and extendable to longer contexts with tricks.
- **ALiBi**: adds a distance-based penalty to scores.

## The cost: quadratic in length

The score matrix is T x T. Doubling the context length quadruples attention compute and the memory to hold scores. A 100,000-token context means 10 billion scores per head per layer. This is why long context is expensive and why there is so much engineering around it:

- **FlashAttention**: computes exact attention without ever storing the full T x T matrix, by working in tiles that fit in fast GPU memory. Standard everywhere now.
- **KV cache**: during generation, keys and values of past tokens are stored and reused, so each new token computes only its own query against them (file 24).
- **Multi-query / grouped-query attention (MQA/GQA)**: several query heads share one key/value head, shrinking the KV cache.
- **Sliding window and sparse attention**: each token attends to a subset of positions.
- Alternative architectures (state space models like Mamba, linear attention, hybrids) aim for cost linear in length.

## A warning about "attention as explanation"

Attention weights are tempting to visualize as "what the model looked at". They are one ingredient among many (values, multiple heads, many layers, MLPs, residual streams). High attention to a word does not prove the word caused the output. Use them for intuition, not as proof.

## Check yourself

1. Write the shapes of Q, K^T, the scores and the output for 10 tokens and head size 64.
2. Why must the softmax be applied row by row, and what does each row sum to?
3. What would a GPT learn if you removed the causal mask during training?
4. Context grows from 8K to 128K tokens. By roughly what factor does the attention score computation grow?
5. Why does a transformer need position information at all?
