# The Transformer Architecture (GPT Style)

You now have all the parts: embeddings, attention, MLPs, residual connections, layer normalization, softmax and cross-entropy. A GPT stacks them in a fixed order. This file is the blueprint, and `10_mini_gpt.py` is the working version, with about 150 lines of model code.

## The whole model on one screen

```
token ids                         (B, T)          B sequences of T tokens
  token embedding  + position embedding
x                                 (B, T, C)       C = model width ("d_model", "hidden size")
  repeat N times (a "block" or "layer"):
      x = x + Attention(LayerNorm(x))     tokens exchange information ("communicate")
      x = x + MLP(LayerNorm(x))           each token is processed on its own ("compute")
  final LayerNorm
  LM head: Linear(C -> vocab_size)
logits                            (B, T, vocab)   a score for every possible next token, at every position
  cross-entropy against the targets = the same tokens shifted left by one
```

### The residual stream

Each layer computes `x = x + something(x)`. The vector `x` for each token flows straight through the network, and every attention layer and MLP reads from it and adds its result back. Interpretability researchers call this the residual stream, and the plain addition also keeps gradients flowing through dozens of layers (module 6).

### The MLP (feed-forward) block

```
MLP(x) = Linear(4C -> C)( GELU( Linear(C -> 4C)(x) ) )
```

It is applied to each token separately: it expands to 4 times the width, applies a non-linearity and projects back. About two thirds of a block's parameters are here, and research suggests much of a model's factual knowledge is stored in these layers.

### Pre-norm

Modern transformers normalize before each sub-layer (`x + f(LayerNorm(x))`). The original 2017 design normalized after, and pre-norm trains more stably at depth.

## Training objective

Feed a sequence, predict the next token at every position, average the cross-entropy:

```
input:   [The] [cat] [sat] [on]  [the]
target:  [cat] [sat] [on]  [the] [mat]
```

Because of the causal mask, one forward pass on T tokens yields T training examples. This is called teacher forcing: during training the model always sees the true previous tokens and never its own guesses.

## Weight tying

The input embedding matrix (vocab x C) and the LM head (C x vocab) do mirror-image jobs: token to vector, vector to token scores. Many models share one matrix for both, saving vocab x C parameters. The mini GPT does this.

## Counting parameters

Per block, ignoring small biases and norms:

- attention: Wq, Wk, Wv, Wo, each C x C: `4C^2`
- MLP: C x 4C and 4C x C: `8C^2`
- total: about `12 C^2` per block

Plus embeddings: `vocab x C` (and position embeddings, if learned).

Take GPT-2 small, with C = 768, 12 blocks and vocab 50,257. The blocks hold 12 x 12 x 768^2 = 85M parameters, the token embeddings 50,257 x 768 = 38.6M and the position embeddings 1,024 x 768 = 0.8M, for about 124M in total. The same method gives the parameter count of any GPT from its config.

## Compute rules of thumb

- Forward pass: about `2 x parameters` floating point operations (FLOPs) per token.
- Training (forward plus backward): about `6 x parameters x training tokens` FLOPs.

Example: a 7B model trained on 2 trillion tokens needs about 6 x 7e9 x 2e12 = 8.4e22 FLOPs. A GPU sustaining 400 TFLOP/s (4e14 per second) would take 2.1e8 seconds, about 6.7 years, on its own, which is why runs use thousands of GPUs for weeks. Labs plan training runs with this arithmetic, and interviewers ask about it.

## Three families of transformers

| Family | Attention | Examples | Good for |
|--------|-----------|----------|----------|
| encoder-only | bidirectional (no mask) | BERT, RoBERTa, many embedding models | classification, embeddings, extraction |
| decoder-only | causal | GPT series, Claude, Llama, Mistral, Qwen | generation; with scale, nearly everything |
| encoder-decoder | encoder bidirectional, decoder causal + cross-attention | original Transformer, T5, Whisper (speech) | translation, summarization, speech-to-text |

Decoder-only models won because they use one simple architecture and one objective, and they scale easily.

## What modern LLMs change

The 2017 blueprint is still recognizable in 2026 models, with some common upgrades (often called the Llama recipe):

| Upgrade | Replaces | Why |
|---------|----------|-----|
| RMSNorm | LayerNorm | simpler, slightly faster, works as well |
| RoPE | learned position embeddings | relative positions, longer-context extensions |
| SwiGLU MLP | GELU MLP | a gated MLP that trains better for the same compute |
| grouped-query attention (GQA) | full multi-head K/V | much smaller KV cache at inference |
| no bias terms | biases in linear layers | simpler, stable |
| bigger vocabularies | ~50K | multilingual and code efficiency |
| mixture of experts (MoE) | one MLP per block | many expert MLPs plus a router that sends each token to a few of them: huge parameter count, modest compute per token |

## The mini GPT you are about to train

`10_mini_gpt.py` trains a character-level GPT on the markdown lessons of this course. The default config is 3 blocks, width 96, 4 heads and a context of 64 characters, which comes to roughly 0.35M parameters and trains in a few minutes on a laptop CPU.

The loss at step 0 should be about ln(vocab size), since all characters are equally likely, so check that. After a few hundred steps, common words and spacing appear. After a couple of thousand, it writes English-looking sentences full of course vocabulary ("the model", "learning rate", "training data") that mean very little.

The gap between text that looks like the training text and text that says true, useful things is what scale (more parameters, data and compute) and post-training (SFT, RLHF) close. The architecture stays the same, with many orders of magnitude more of everything.

## Questions

1. Write the shape of the tensor after each step of the forward pass for B=8, T=64, C=96, vocab=80.
2. Count the parameters of a GPT with C=1024, 24 blocks, vocab 50,000 (ignore biases and norms, include tied embeddings once).
3. Why can one forward pass over 64 tokens give 64 training examples?
4. What does a mixture-of-experts layer change about the cost of a forward pass compared with a dense model of the same total parameter count?
