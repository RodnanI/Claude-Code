# How Large Language Models Work

Read this first. Each other file in the module zooms in on one box of the diagram below.

## The one-sentence version

An LLM is a neural network that takes a sequence of tokens and outputs a probability for every possible next token. To generate text, you pick a token from that distribution, append it and run the network again, repeatedly.

```
"The cat sat on the"  ->  model  ->  mat: 0.41, floor: 0.12, couch: 0.09, ... (one number per vocabulary entry)
pick "mat", append, repeat with "The cat sat on the mat"
```

This loop is called autoregressive generation, and everything an LLM does, from answering questions to writing code to calling tools, goes through it.

## One forward pass, step by step

```
text                 "The cat sat"
  | tokenizer        (file 02, lab 03)
token ids            [464, 3797, 3332]
  | embedding lookup (file 04, lab 05)
vectors              3 vectors of, say, 4096 numbers each
  | + position information
  | N transformer blocks, each: attention (tokens exchange information) + MLP (file 07-09, labs 08, 10)
final vectors        3 vectors of 4096 numbers
  | unembedding / LM head: a matrix multiply to vocabulary size
logits               3 x 100,000 scores (one row per position)
  | softmax on the LAST position
next-token probabilities
  | sampling: temperature, top-k, top-p (lab 11)
next token           " on"
```

During training the model predicts the next token at every position at once, which makes training on huge text efficient. During generation only the last position's prediction is used.

## Why next-token prediction works so well

Predicting the next word of a physics textbook well helps if you model physics, continuing a Python file helps if you model what the code does, and continuing a conversation helps if you model what the person wants. On enough varied text, next-token prediction pushes the network to learn grammar, facts, styles and reasoning patterns, because each of them reduces prediction error. Whether that counts as understanding is a philosophical dispute. In practice the models are very capable and also fail in odd ways.

## How a model is made: training stages

1. Pretraining: self-supervised next-token prediction on trillions of tokens of web pages, books, code and papers, which costs millions of dollars or far more in GPU time. The result is a base model, a very good text continuer that does not follow instructions. Ask it a question and it may continue with five more questions, because that is what internet text often looks like.
2. Supervised fine-tuning (SFT), also called instruction tuning: training on curated prompts with ideal responses, which teaches the assistant format and instruction following.
3. Preference tuning: humans or AI judges compare pairs of responses. RLHF (reinforcement learning from human feedback) trains a reward model on those preferences and optimizes the LLM against it, while DPO (direct preference optimization) skips the separate reward model. This shapes helpfulness, tone and safety.
4. Reinforcement learning on checkable tasks: for math, code and other problems with verifiable answers, the model is rewarded for correct final results. This produced reasoning models that write out long chains of thought before answering.

The result is an instruct or chat model, which is what you talk to in a product. File 12 covers training in depth.

## The numbers people throw around

| Term | Meaning | Typical values |
|------|---------|----------------|
| parameters | number of learned weights | 1B (small), 7-70B (mid), hundreds of billions to trillions (frontier, often mixture-of-experts) |
| training tokens | how much text it was trained on | trillions; small open models are often trained on 10T+ |
| context window | max tokens the model can consider at once (prompt + output) | 8K to 1M+ |
| vocabulary size | number of distinct tokens | 32K to 256K |
| layers / hidden size | depth / width of the transformer | e.g. 32 layers, 4096 wide for a 7B model |
| tokens per second | generation speed | tens to hundreds per user |

### Memory arithmetic

Weights take `parameters x bytes per parameter`:

| Precision | Bytes per parameter | 7B model | 70B model |
|-----------|--------------------|----------|-----------|
| fp32 | 4 | 28 GB | 280 GB |
| bf16 / fp16 | 2 | 14 GB | 140 GB |
| int8 | 1 | 7 GB | 70 GB |
| 4-bit | 0.5 | 3.5 GB | 35 GB |

Inference needs extra memory for the KV cache, the stored attention keys and values for the context (file 24). Training needs roughly 4 to 8 times more than the weights alone, for gradients, optimizer state and activations. This arithmetic decides which GPUs a project needs, and interviewers often ask it.

## The chat format

When you send a conversation to a chat model, it is flattened into a single token sequence with special marker tokens, roughly:

```
<system>You are a helpful assistant.</system>
<user>What is 2+2?</user>
<assistant>
```

The model continues from there. The exact markers are the model's chat template, and "system prompt", "user turn" and "assistant turn" are conventions learned during fine-tuning, not separate inputs. This is also why prompt injection is possible: instructions hidden in a document the model reads are just more tokens in the same stream.

## Weaknesses

Know these before you build anything.

- Hallucination: the output is fluent and confident but wrong, because the model generates plausible text and plausible is not the same as true. Retrieval with sources (RAG), tools, verification, requested citations and evaluation all help.
- Knowledge cutoff: the model knows nothing after its training data ends, unless the prompt or a tool supplies it.
- No memory between calls: each API call starts fresh, and "memory" features work by putting stored text back into the prompt.
- Character-level and arithmetic quirks: the model sees tokens, not letters, so counting letters or manipulating exact digits can fail. A calculator or code execution fixes this.
- Prompt sensitivity: small wording changes can change outputs, so evaluate on many examples and not one.
- Non-determinism: sampling is random, and even at temperature 0 serving infrastructure can produce small variations.
- Security: prompt injection, data leaking through prompts, and over-trusting outputs that trigger actions.
- Cost and latency: big models are slow and expensive per token, and long prompts cost money on every call.

## Reasoning models and test-time compute

Newer models can think before answering. They generate intermediate reasoning tokens, sometimes hidden and sometimes summarized, check their work and try alternatives. Spending more tokens on thinking (test-time compute) improves accuracy on hard math, coding and planning problems, at the cost of latency and money. Many APIs expose a setting for how much thinking to allow, and choosing the model and thinking budget for a task is now a routine engineering decision.

## Open versus closed models

Closed (proprietary) models are accessed through an API: Claude (Anthropic), GPT (OpenAI) and Gemini (Google). They are usually the most capable, you pay per token, and the provider runs the hardware. Open-weight models, such as Llama (Meta), Mistral, Qwen (Alibaba), DeepSeek and Gemma (Google), let you download the weights and run, inspect and fine-tune them yourself while paying for the hardware. Hugging Face hosts them, and Ollama and llama.cpp run them on laptops.

Companies choose based on capability, cost, latency, data privacy and how much customization they need, and many use both.

## What LLM work looks like in industry

| Layer | What people do | Who |
|-------|----------------|-----|
| applications | call model APIs, write prompts, build RAG and agents, evaluate, ship features | most jobs: "AI engineer", ML engineer, software engineer |
| adaptation | fine-tune open models, build evaluation sets, distill big models into small ones, optimize inference | ML engineers, applied scientists |
| foundation models | pretrain and post-train frontier models, research | a small number of labs and big tech teams |

Most jobs are in the first layer. The fundamentals in this course are what let you debug and evaluate those systems instead of only demoing them.

## The rest of this module

| File | Topic |
|------|-------|
| 02, 03 | tokenization, and a BPE tokenizer you train yourself |
| 04, 05 | embeddings, and word vectors learned from counts |
| 06 | a bigram language model: counting vs a neural net, sampling, perplexity |
| 07, 08 | attention, built step by step in NumPy |
| 09, 10 | the transformer, and a mini GPT you train on this course's own text |
| 11 | sampling: greedy, temperature, top-k, top-p |
| 12 | how LLMs are trained at scale: pretraining, scaling laws, SFT, RLHF, DPO, RL |
| 13, 14 | using LLM APIs, with a working lab |
| 15 | prompt engineering |
| 16, 17 | RAG, built from scratch over this course |
| 18, 19 | agents and tool use, with an agent loop you can run |
| 20, 21 | fine-tuning, LoRA and quantization, with LoRA built from scratch |
| 22, 23 | evaluating LLMs, with an eval harness |
| 24 | inference, serving and efficiency |
| 25 | optional: Hugging Face transformers |
