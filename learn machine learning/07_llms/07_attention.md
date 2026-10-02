# Attention

Attention lets each token gather information from other tokens, with the amounts decided by content. It is the core of the transformer and the reason LLMs handle long-range context. Build it in `08_attention_lab.py` right after reading.

## The problem attention solves

The bigram model saw one character of context, but meaning depends on more. Compare "The bank raised interest rates" with "We sat on the river bank". In "The trophy did not fit in the suitcase because it was too big", what does "it" refer to? And "This movie is not good" turns on one word.

Each token's representation has to be updated using the other tokens that are relevant to it, and which ones are relevant depends on the content. A fixed window cannot do that, but attention can.

## Queries, keys and values

Every token produces three vectors from its current representation `x` (each by a learned matrix multiply):

| Vector | Question it answers |
|--------|---------------------|
| query `q = x Wq` | "what am I looking for?" |
| key `k = x Wk` | "what do I contain? match me against queries" |
| value `v = x Wv` | "what do I hand over if someone attends to me?" |

It works like a fuzzy search engine. Your query is compared with every document's key, and instead of returning the single best document, the engine returns a weighted average of all the documents' values, weighted by how well each key matched.

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

The whole mechanism is matrix multiplies, a scaling, a mask and a softmax.

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

Different heads learn different jobs. Researchers have found heads that attend to the previous token, heads that link pronouns to their nouns, and induction heads that implement "if [A][B] appeared earlier and I now see [A], predict [B]", a key mechanism behind in-context learning (learning from examples in the prompt).

## Self-attention vs cross-attention

In self-attention, queries, keys and values all come from the same sequence, and decoder-only LLMs use only this. In cross-attention, queries come from one sequence and keys and values from another. The original transformer used it so the translation decoder could look at the source sentence, and some multimodal and speech models use it too.

## Attention does not know about order

Without extra information, attention treats its input as a set: shuffle the tokens and each token's output is the same, just shuffled. "Dog bites man" and "man bites dog" would look alike, as the lab shows. Transformers therefore add position information, in one of several ways.

- Learned absolute position embeddings give each position a vector that is added to the token embedding (GPT-2 and the mini GPT).
- Sinusoidal encodings use fixed sine and cosine patterns (the original transformer).
- RoPE (rotary position embeddings) rotates queries and keys by an angle that depends on position, so attention scores depend on relative distance. Most modern LLMs (Llama, Qwen, Mistral and others) use it, and it can be extended to longer contexts.
- ALiBi adds a distance-based penalty to the scores.

## The cost: quadratic in length

The score matrix is T x T, so doubling the context length quadruples attention compute and the memory needed for scores. A 100,000-token context means 10 billion scores per head per layer. Long context is expensive for this reason, and a lot of engineering goes into reducing the cost.

FlashAttention computes exact attention without storing the full T x T matrix, working in tiles that fit in fast GPU memory, and is standard now. The KV cache stores the keys and values of past tokens during generation so each new token computes only its own query against them (file 24). Multi-query and grouped-query attention (MQA, GQA) let several query heads share one key/value head, which shrinks the KV cache. Sliding window and sparse attention have each token attend to a subset of positions. Alternative architectures such as state space models like Mamba, linear attention and hybrids aim for cost linear in length.

## Attention is not an explanation

It is tempting to visualize attention weights as what the model looked at, but they are one ingredient among many, alongside values, multiple heads, many layers, MLPs and the residual stream. High attention to a word does not show that the word caused the output, so use the weights for intuition and not as proof.

## Questions

1. Write the shapes of Q, K^T, the scores and the output for 10 tokens and head size 64.
2. Why must the softmax be applied row by row, and what does each row sum to?
3. What would a GPT learn if you removed the causal mask during training?
4. Context grows from 8K to 128K tokens. By roughly what factor does the attention score computation grow?
5. Why does a transformer need position information at all?
