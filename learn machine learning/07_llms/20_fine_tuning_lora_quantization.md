# Fine-Tuning, LoRA and Quantization

Prompting and RAG change what you send to a model. **Fine-tuning** changes the model itself by continuing its training on your examples. **LoRA** makes fine-tuning cheap. **Quantization** makes models small enough to run on less hardware. These three ideas come up constantly when teams work with open-weight models. Lab: `21_lora_and_quantization_lab.py`.

## When to fine-tune (and when not to)

Climb this ladder and stop at the first rung that meets your quality bar:

1. Better prompt (file 15)
2. Few-shot examples in the prompt
3. Retrieval (RAG) for knowledge (file 16)
4. Tools for live data and exact computation (file 18)
5. **Fine-tuning**
6. Training from scratch (almost never; needs huge data and budget)

Fine-tuning is good for:

- **consistent format, style or tone** across millions of calls
- **narrow, high-volume tasks** (classification, extraction, routing) where a fine-tuned small model matches a big model at a fraction of the cost and latency
- **distillation**: teaching a small model to imitate a big model's outputs on your task
- **domain language** that prompts cannot teach (unusual jargon, formats, codes)
- behaviors that are hard to describe but easy to demonstrate

Fine-tuning is bad for:

- **adding factual knowledge**. Models learn facts from fine-tuning slowly and unreliably, and then cannot cite them or forget them on update. Use RAG.
- **fast-changing information**. You would retrain constantly.
- fixing a task the base model fundamentally cannot do. Fine-tuning sharpens existing abilities more than it creates new ones.
- small teams without an evaluation set. If you cannot measure "better", you cannot fine-tune responsibly.

## Kinds of fine-tuning

| Kind | Data | Changes |
|------|------|---------|
| continued pretraining | lots of raw domain text | domain vocabulary and knowledge style |
| supervised fine-tuning (SFT) | (prompt, ideal response) pairs in the chat format | task behavior, format, tone |
| preference tuning (DPO and variants) | (prompt, better response, worse response) | preferences: helpfulness, style, safety |
| reinforcement fine-tuning | prompts + a grader that scores outputs | performance on checkable tasks |

Most company projects are SFT, sometimes followed by DPO.

## Data: the part that decides success

- **Quality over quantity**: a few hundred to a few thousand excellent, diverse examples beat 100,000 sloppy ones.
- **Match production**: inputs should look like real traffic, including the messy cases.
- **Consistent outputs**: if two labelers would write different answers, the model learns noise.
- **Hold out an evaluation set** before you start, and deduplicate against training data.
- **Compare against the baseline**: the base model with your best prompt. Fine-tuning that does not beat a good prompt is wasted effort.
- **Use the model's chat template**. Formatting mismatches between training and inference silently hurt quality.

## Why full fine-tuning is expensive: memory math

Training with AdamW in mixed precision needs roughly **16 bytes per parameter** before counting activations: bf16 weights (2) + bf16 gradients (2) + fp32 master weights (4) + Adam first and second moments (4 + 4).

A 7B-parameter model: 7e9 x 16 bytes = **112 GB**, more than any single common GPU. A 70B model: over a terabyte. Hence parameter-efficient methods.

## LoRA: low-rank adaptation

Observation: the *change* a fine-tune makes to a big weight matrix tends to be **low rank**: it can be described with far fewer numbers than the matrix has (module 2, SVD).

So freeze the original weights `W` (d_out x d_in) and learn only a small update made of two thin matrices:

```
W_new = W + (alpha / r) * B @ A          A: r x d_in,  B: d_out x r,  r is small (4 to 64)
```

- `B` starts at zero, so training starts exactly from the original model.
- Only A and B are trained, so the number of trainable parameters drops from `d_in * d_out` to `r * (d_in + d_out)`.
- Example: a 4096 x 4096 attention matrix has 16.8M weights; a rank-16 LoRA adds 131K, about **0.8%**.
- Gradients and optimizer state are needed only for A and B, so memory drops dramatically.
- After training you can **merge** (`W + scale * B @ A`) for zero extra inference cost, or keep adapters separate and **swap** them: one base model in memory serving many customers or tasks, each with its own few-megabyte adapter.
- Because the original weights are untouched, removing the adapter restores the original model exactly. Full fine-tuning offers no such undo.

Typical setup: apply LoRA to the attention projections (often all linear layers), rank 8-64, alpha about 2x rank, learning rate higher than for full fine-tuning (around 1e-4 to 3e-4).

**QLoRA** goes further: store the frozen base model in 4-bit precision and train LoRA adapters in 16-bit on top. This made fine-tuning tens-of-billions-parameter models possible on a single GPU.

## Catastrophic forgetting

Training hard on a narrow task can degrade general abilities. Mitigations: LoRA (the base is frozen), lower learning rates, fewer epochs, mixing some general data back in, and **evaluating general capabilities, not just the target task**. The lab measures forgetting directly.

## Quantization

Store weights with fewer bits:

| Format | Bits | Memory for 7B | Typical quality impact |
|--------|------|---------------|------------------------|
| fp32 | 32 | 28 GB | reference |
| bf16 / fp16 | 16 | 14 GB | none (the normal serving precision) |
| int8 / fp8 | 8 | 7 GB | usually negligible |
| int4 | 4 | 3.5 GB | small for most tasks, noticeable on some (math, long reasoning, small models) |

How it works (the lab implements it): map each group of floats onto a small integer grid using a **scale** (and sometimes a zero point): `q = round(w / scale)`, `w is about q * scale`. Key ideas:

- **Granularity**: one scale per tensor is crude; one per row (per-channel) or per small group of weights (group-wise, e.g. 128 weights) is much more accurate.
- **Outliers**: a few huge weights or activations force a big scale, crushing the precision of everything else. Much quantization research is about handling outliers.
- **Post-training quantization** methods (GPTQ, AWQ and others) choose rounding cleverly using a little calibration data. Formats you will meet: GGUF (llama.cpp, Ollama), bitsandbytes, AWQ/GPTQ checkpoints on Hugging Face.
- **What gets quantized**: weights (most common), activations, and the KV cache (file 24).

Why it matters: quantization decides whether a model fits on a laptop, one GPU or eight, and memory bandwidth often limits generation speed, so smaller weights also mean faster tokens.

## Tools

- Hugging Face `transformers` (models), `peft` (LoRA and friends), `trl` (SFT and DPO trainers), `datasets`.
- Unsloth and Axolotl: popular fine-tuning frameworks with good defaults.
- Managed fine-tuning offered by cloud and model providers, for some of their models.

## A responsible fine-tuning project

1. Write down the goal and the metric. Build the evaluation set first.
2. Establish baselines: base model with the best prompt, maybe a bigger model.
3. Prepare and clean training data in the chat format; deduplicate against eval data.
4. Train LoRA with sensible defaults; watch training and validation loss.
5. Evaluate on the task set **and** a general capability set (to catch forgetting) **and** safety behaviors.
6. Compare cost, latency and quality against the baselines. Ship only if it wins.
7. Version data, config, adapter and evaluation results together.

## Check yourself

1. Your team wants to fine-tune a model on the company wiki so it "knows" the policies. What do you recommend instead and why?
2. How many trainable parameters does a rank-8 LoRA add to a 4096 x 11008 matrix?
3. Why does LoRA's B matrix start at zero?
4. Estimate the memory needed just to hold a 13B model's weights in bf16 and in 4-bit.
5. Why does per-channel quantization beat per-tensor quantization when a matrix has outliers?
