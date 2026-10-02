# How Large Language Models Work: the Big Picture

Read this first. Every other file in this module zooms into one box of the picture below.

## The one-sentence version

An LLM is a neural network that takes a sequence of tokens and outputs **a probability for every possible next token**. Generating text means: pick a token from that distribution, append it, and run the network again. Over and over.

```
"The cat sat on the"  ->  model  ->  mat: 0.41, floor: 0.12, couch: 0.09, ... (one number per vocabulary entry)
pick "mat", append, repeat with "The cat sat on the mat"
```

This loop is called **autoregressive generation**. Everything an LLM does, from answering questions to writing code to calling tools, is this loop.

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

During training the model predicts the next token at **every position simultaneously**, which is why training on huge text is efficient. During generation only the last position's prediction is used.

## Why predicting the next token produces "intelligence"

To predict the next word of a physics textbook well, it helps to model physics. To continue a Python file, it helps to model what the code does. To continue a conversation, it helps to model what the person wants. Next-token prediction on enough diverse text forces the network to learn grammar, facts, styles, reasoning patterns and much more, because all of them reduce prediction error. Whether this is "understanding" is a philosophical fight. Practically, it is extremely capable and also fails in strange ways. Hold both facts.

## How a model is made: training stages

1. **Pretraining.** Self-supervised next-token prediction on trillions of tokens of web pages, books, code, papers. Costs millions of dollars or far more in GPU time. The result is a **base model**: a superb text continuer that does not follow instructions. Ask it a question and it may continue with five more questions, because that is what text on the internet often looks like.
2. **Supervised fine-tuning (SFT)**, also called instruction tuning. Train on curated examples of prompts and ideal responses. The model learns the assistant format and to follow instructions.
3. **Preference tuning.** Humans (or AI judges) compare pairs of responses. **RLHF** (reinforcement learning from human feedback) trains a reward model on those preferences and optimizes the LLM against it; **DPO** (direct preference optimization) skips the separate reward model. This shapes helpfulness, tone and safety.
4. **Reinforcement learning on checkable tasks.** For math, code and other problems with verifiable answers, the model is rewarded for correct final results. This produced **reasoning models** that write out long chains of thinking before answering.

The result is an **instruct** or **chat** model: what you talk to in a product. File 12 covers training in depth.

## The numbers people throw around

| Term | Meaning | Typical values |
|------|---------|----------------|
| parameters | number of learned weights | 1B (small), 7-70B (mid), hundreds of billions to trillions (frontier, often mixture-of-experts) |
| training tokens | how much text it was trained on | trillions; small open models are often trained on 10T+ |
| context window | max tokens the model can consider at once (prompt + output) | 8K to 1M+ |
| vocabulary size | number of distinct tokens | 32K to 256K |
| layers / hidden size | depth / width of the transformer | e.g. 32 layers, 4096 wide for a 7B model |
| tokens per second | generation speed | tens to hundreds per user |

### Memory math you should be able to do in your head

Weights take `parameters x bytes per parameter`:

| Precision | Bytes per parameter | 7B model | 70B model |
|-----------|--------------------|----------|-----------|
| fp32 | 4 | 28 GB | 280 GB |
| bf16 / fp16 | 2 | 14 GB | 140 GB |
| int8 | 1 | 7 GB | 70 GB |
| 4-bit | 0.5 | 3.5 GB | 35 GB |

Inference needs extra memory for the **KV cache** (stored attention keys and values for the context, file 24). Training needs roughly 4 to 8 times more than the weights alone (gradients, optimizer state, activations). This arithmetic decides which GPUs a project needs and is a standard interview question.

## The chat format is an illusion over one token stream

When you send a conversation to a chat model, it is flattened into a single token sequence with special marker tokens, roughly:

```
<system>You are a helpful assistant.</system>
<user>What is 2+2?</user>
<assistant>
```

The model continues from there. The exact markers are the model's **chat template**. "System prompt", "user turn", "assistant turn" are conventions learned during fine-tuning, not separate inputs. This is also why **prompt injection** is possible: instructions hidden in a document the model reads are just more tokens in the same stream.

## What LLMs are bad at (know these before you build anything)

- **Hallucination**: fluent, confident, wrong. The model generates plausible text, and plausible is not the same as true. Mitigations: retrieval with sources (RAG), tools, verification, asking for citations, evaluation.
- **Knowledge cutoff**: knows nothing after its training data ends, unless you provide it in the prompt or through tools.
- **No memory between calls**: each API call starts fresh. "Memory" features work by putting stored text back into the prompt.
- **Character-level and arithmetic quirks**: the model sees tokens, not letters, so counting letters in a word or exact digit manipulation can fail. Tools (a calculator, code execution) fix this.
- **Prompt sensitivity**: small wording changes can change outputs. Evaluate on many examples, not one.
- **Non-determinism**: sampling is random; even at temperature 0, serving infrastructure can produce small variations.
- **Security**: prompt injection, data leakage through prompts, over-trusting outputs that trigger actions.
- **Cost and latency**: big models are slow and expensive per token; long prompts cost money on every call.

## Reasoning models and test-time compute

Newer models can "think" before answering: they generate intermediate reasoning tokens (sometimes hidden, sometimes summarized), check their work, and try alternatives. Spending more tokens on thinking (**test-time compute**) improves accuracy on hard math, coding and planning problems, at the cost of latency and money. Many APIs expose a setting for how much thinking to allow. Choosing the right model and thinking budget for a task is now a routine engineering decision.

## Open versus closed models

- **Closed / proprietary** (accessed through an API): Claude (Anthropic), GPT (OpenAI), Gemini (Google). Usually the most capable; you pay per token; the provider runs the hardware.
- **Open-weight** (you download the weights): Llama (Meta), Mistral, Qwen (Alibaba), DeepSeek, Gemma (Google) and many more. You can run, inspect and fine-tune them yourself; you pay for the hardware. Hugging Face is where they live; Ollama and llama.cpp run them on laptops.

Companies choose based on capability, cost, latency, data privacy requirements and how much customization they need. Many use both.

## What LLM work looks like in industry

| Layer | What people do | Who |
|-------|----------------|-----|
| applications | call model APIs, write prompts, build RAG and agents, evaluate, ship features | most jobs: "AI engineer", ML engineer, software engineer |
| adaptation | fine-tune open models, build evaluation sets, distill big models into small ones, optimize inference | ML engineers, applied scientists |
| foundation models | pretrain and post-train frontier models, research | a small number of labs and big tech teams |

If you are starting your career, the first layer is where most of the jobs are. The fundamentals in this course are what separate people who can debug and evaluate those systems from people who can only demo them.

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
