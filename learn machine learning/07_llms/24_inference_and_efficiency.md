# Inference, Serving and Efficiency

Training happens once, while inference (running the model to produce outputs) happens millions of times, so in production it dominates cost and decides the user experience. This file explains where the time and money go and how to reduce both. Whether you call APIs or host open models, these ideas explain latency numbers, pricing and design choices.

## Two phases of every request

1. Prefill: the whole prompt is processed in one parallel pass that fills the KV cache (below). This is mostly matrix multiplication, so it is compute-bound. Its duration drives time to first token (TTFT) and grows with prompt length.
2. Decode: output tokens are generated one at a time, each needing a full forward pass for one new token. Every step must read all the model weights from memory to do very little math, so decode is memory-bandwidth-bound. It drives tokens per second.

A rough upper bound for single-stream decode speed is `memory bandwidth / bytes of weights`. A 7B model in bf16 is 14 GB, and a GPU with about 3.3 TB/s of bandwidth can read it at most about 235 times per second, so one stream gets at most about 235 tokens/s before any overhead. This is why quantization (fewer bytes) speeds up generation, and why servers batch many users together, reading the weights once for many sequences.

## The KV cache

In attention, every new token needs the keys and values of all previous tokens. Recomputing them at every step would be wasteful, so they are stored: the **KV cache**.

Size per token = `2 (K and V) x layers x KV heads x head size x bytes`.

Take a 7B-class model with 32 layers and 32 KV heads of size 128, in bf16: 2 x 32 x 32 x 128 x 2 bytes = 524 KB per token. A 4,000-token conversation needs about 2 GB of cache for that one sequence. With long contexts and many concurrent users, the KV cache and not the weights becomes the main memory problem.

Several techniques reduce it. Grouped-query attention (GQA) has many query heads share a few KV heads, say 8 instead of 32, making the cache 4x smaller, and it is standard in modern models. KV cache quantization stores the cache in 8 or 4 bits. PagedAttention (from vLLM) manages cache memory in pages like an operating system, so fragmentation does not waste it. Prefix caching computes the KV cache once when many requests share a prefix, such as the same system prompt or document, and reuses it; this is what makes API prompt caching cheaper and faster. Sliding-window attention keeps only the most recent N tokens in some layers.

## Batching

A GPU serving one user at a time is mostly idle during decode, so servers batch requests. Static batching waits for a batch and runs it to completion, which is simple but wasteful because short requests wait for long ones. Continuous (in-flight) batching lets requests join and leave the batch at every step, which gives much higher throughput and is standard in modern serving engines.

Bigger batches raise throughput, meaning tokens per second across all users and so a lower cost per token, but can raise latency for each user. Product requirements decide the balance.

## Making each token cheaper

Quantization (file 20) uses 8-bit or 4-bit weights, with fp8 compute on recent GPUs. FlashAttention computes exact attention in fast on-chip memory tiles and avoids the giant T x T matrix. Kernel fusion and compilation (`torch.compile`, TensorRT) produce fewer, bigger GPU operations. Speculative decoding has a small, fast draft model propose several tokens, and the big model checks them all in one parallel pass and keeps those it agrees with; when the draft is often right, generation runs 2-3x faster with mathematically the same output distribution. Mixture of experts runs only a few experts per token, so compute per token is small relative to the total parameters, though all experts must sit in memory. Distillation trains a smaller model to imitate the big one on your task.

## Serving software you will meet

| Tool | Typical use |
|------|-------------|
| vLLM | high-throughput GPU serving of open models (PagedAttention, continuous batching) |
| SGLang | fast GPU serving, strong at structured generation and prefix reuse |
| TensorRT-LLM | NVIDIA-optimized serving |
| Hugging Face TGI | serving in the Hugging Face ecosystem |
| llama.cpp / Ollama | running quantized models on laptops and CPUs (GGUF format) |
| MLX | running models efficiently on Apple Silicon |

Most expose an HTTP API similar to the commercial ones, so application code changes little between hosted and self-hosted models.

## Hosted API vs self-hosting

| | Hosted API | Self-hosted open model |
|---|---|---|
| capability | usually the frontier | good and improving, typically behind the best closed models |
| ops work | none | GPUs, scaling, monitoring, upgrades, on-call |
| cost | per token, zero when idle | per GPU-hour, paid even when idle; cheaper only at high, steady utilization |
| data control | provider's terms (often strong, check them) | full control |
| customization | prompts, some fine-tuning | anything, including weights |
| latency | network + provider queue | controllable, can be very low on dedicated hardware |

Many companies do both, using APIs for complex, low-volume tasks and small self-hosted or fine-tuned models for high-volume simple ones.

## Cost levers for API users

In rough order of impact:

1. Pick the smallest model that passes your eval, at the lowest effort or thinking level that passes.
2. Shorten prompts with fewer retrieved chunks, compact instructions and no repeated boilerplate.
3. Cache stable prefixes (prompt caching).
4. Cap and shape outputs with `max_tokens`, concise formats and structured outputs instead of prose.
5. Use the batch API for anything not interactive, at about half price.
6. Route requests: a cheap model first, escalating hard cases to a stronger one.
7. Cache whole responses for repeated identical questions.

## Latency

Users feel TTFT most. For a chat interface, aim for a first token within a second or two and stream the rest. Background jobs do not care about TTFT, so optimize their cost. For agents, total time is the sum of many calls plus tool time, so every step's latency matters.

## Questions

1. Why is decode memory-bound while prefill is compute-bound?
2. Compute the KV cache size for 8,000 tokens with 40 layers, 8 KV heads of size 128, bf16.
3. How does prefix caching on the server relate to prompt caching discounts in an API?
4. Your self-hosted model sits at 15% GPU utilization most of the day. What does that mean for its cost per token compared with an API?
5. Explain speculative decoding to a colleague in a few sentences.
