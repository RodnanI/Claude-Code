# Inference, Serving and Efficiency

Training happens once. **Inference** (running the model to produce outputs) happens millions of times, so in production it dominates cost and decides user experience. This file explains where the time and money go and the tricks used to cut both. Whether you call APIs or host open models, these ideas explain latency numbers, pricing and design choices.

## Two phases of every request

1. **Prefill**: the whole prompt is processed in one parallel pass, filling the KV cache (below). Lots of matrix multiplication, so it is **compute-bound**. Its duration drives **time to first token (TTFT)**, and it grows with prompt length.
2. **Decode**: output tokens are generated one at a time, each requiring a full forward pass for just one new token. Each step must read all the model weights from memory to do very little math, so decode is **memory-bandwidth-bound**. It drives **tokens per second**.

A rough upper bound for single-stream decode speed: `memory bandwidth / bytes of weights`. A 7B model in bf16 is 14 GB; a GPU with about 3.3 TB/s of bandwidth can read it at most ~235 times per second, so at most ~235 tokens/s for one stream, before any overhead. This is why quantization (fewer bytes) speeds up generation, and why batching many users together (reading the weights once for many sequences) is how servers get efficient.

## The KV cache

In attention, every new token needs the keys and values of all previous tokens. Recomputing them at every step would be wasteful, so they are stored: the **KV cache**.

Size per token = `2 (K and V) x layers x KV heads x head size x bytes`.

Example, a 7B-class model with 32 layers, 32 KV heads of size 128, in bf16: 2 x 32 x 32 x 128 x 2 bytes = **524 KB per token**. A 4,000-token conversation needs about 2 GB of cache for that one sequence. Long contexts and many concurrent users make the KV cache, not the weights, the main memory problem.

Fixes you will hear about:

- **Grouped-query attention (GQA)**: many query heads share a few KV heads (say 8 instead of 32), so the cache is 4x smaller. Standard in modern models.
- **KV cache quantization**: store the cache in 8 or 4 bits.
- **PagedAttention** (from vLLM): manage cache memory in pages, like an operating system, so it is not wasted on fragmentation.
- **Prefix caching**: if many requests share a prefix (the same system prompt or document), compute its KV cache once and reuse it. This is what makes API **prompt caching** cheaper and faster.
- **Sliding-window attention**: some layers only keep the most recent N tokens.

## Batching

A GPU serving one user at a time is mostly idle during decode. Servers batch requests:

- **Static batching**: wait for a batch, run it to completion. Simple, wasteful (short requests wait for long ones).
- **Continuous (in-flight) batching**: requests join and leave the batch at every step. Much higher throughput. Standard in modern serving engines.

The tradeoff: bigger batches raise **throughput** (tokens per second across all users, so lower cost per token) but can raise **latency** for each user. Product requirements decide the balance.

## Making each token cheaper

- **Quantization** (file 20): 8-bit or 4-bit weights; fp8 compute on recent GPUs.
- **FlashAttention**: exact attention computed in fast on-chip memory tiles, avoiding the giant T x T matrix.
- **Kernel fusion and compilation** (`torch.compile`, TensorRT): fewer, bigger GPU operations.
- **Speculative decoding**: a small fast "draft" model proposes several tokens; the big model checks them all in one parallel pass and keeps the ones it agrees with. When the draft is often right, generation runs 2-3x faster with mathematically the same output distribution.
- **Mixture of experts**: only a few experts run per token, so compute per token is small relative to total parameters; but all experts must sit in memory.
- **Distillation**: train a smaller model to imitate the big one on your task.

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

Plenty of companies do both: APIs for complex, low-volume tasks; small self-hosted or fine-tuned models for high-volume simple tasks.

## Cost levers for API users (in rough order of impact)

1. Pick the smallest model that passes your eval, and the lowest effort or thinking level that does.
2. Shorten prompts: fewer retrieved chunks, compact instructions, no repeated boilerplate.
3. Cache stable prefixes (prompt caching).
4. Cap and shape outputs: `max_tokens`, concise formats, structured outputs instead of prose.
5. Batch API for anything not interactive (about half price).
6. Route: cheap model first, escalate hard cases to a stronger model.
7. Cache whole responses for repeated identical questions.

## Latency budget for a product

Users feel TTFT most. For a chat interface, aim for a first token within a second or two and stream the rest. For background jobs, nobody cares about TTFT; optimize cost. For agents, the total time is the sum of many calls plus tool time, so every step's latency matters.

## Check yourself

1. Why is decode memory-bound while prefill is compute-bound?
2. Compute the KV cache size for 8,000 tokens with 40 layers, 8 KV heads of size 128, bf16.
3. How does prefix caching on the server relate to prompt caching discounts in an API?
4. Your self-hosted model sits at 15% GPU utilization most of the day. What does that mean for its cost per token compared with an API?
5. Explain speculative decoding to a colleague in a few sentences.
