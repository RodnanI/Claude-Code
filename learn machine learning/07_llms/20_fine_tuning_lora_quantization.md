# Fine-Tuning, LoRA and Quantization

Prompting and RAG change what you send to a model. Fine-tuning changes the model itself by continuing its training on your examples, LoRA makes that cheap, and quantization shrinks models so they run on less hardware. They come up constantly when teams work with open-weight models. The lab is `21_lora_and_quantization_lab.py`.

## When to fine-tune

Go up this ladder and stop at the first rung that meets your quality bar:

1. A better prompt (file 15)
2. Few-shot examples in the prompt
3. Retrieval (RAG) for knowledge (file 16)
4. Tools for live data and exact computation (file 18)
5. Fine-tuning
6. Training from scratch, which is almost never justified because it needs huge data and budget

Fine-tuning works well for a consistent format, style or tone across millions of calls, and for narrow, high-volume tasks such as classification, extraction and routing, where a fine-tuned small model can match a big one at a fraction of the cost and latency. It also suits distillation, where a small model imitates a big model's outputs on your task, domain language that prompts cannot teach (unusual jargon, formats, codes), and behaviors that are hard to describe but easy to demonstrate.

It works badly for adding factual knowledge, because models learn facts from fine-tuning slowly and unreliably and then cannot cite them or forget them on update, so use RAG. It is also a poor fit for fast-changing information, which you would have to retrain on constantly, and for a task the base model fundamentally cannot do, since fine-tuning sharpens existing abilities more than it creates new ones. Teams without an evaluation set should not do it either: if you cannot measure better, you cannot fine-tune responsibly.

## Kinds of fine-tuning

| Kind | Data | Changes |
|------|------|---------|
| continued pretraining | lots of raw domain text | domain vocabulary and knowledge style |
| supervised fine-tuning (SFT) | (prompt, ideal response) pairs in the chat format | task behavior, format, tone |
| preference tuning (DPO and variants) | (prompt, better response, worse response) | preferences: helpfulness, style, safety |
| reinforcement fine-tuning | prompts + a grader that scores outputs | performance on checkable tasks |

Most company projects are SFT, sometimes followed by DPO.

## Data

The data decides whether the project works. A few hundred to a few thousand excellent, diverse examples beat 100,000 sloppy ones. Inputs should look like real traffic, messy cases included. If two labelers would write different answers, the model learns noise. Hold out an evaluation set before you start and deduplicate it against the training data. Compare against the base model with your best prompt, since fine-tuning that does not beat a good prompt is wasted effort. Use the model's chat template, because formatting mismatches between training and inference quietly hurt quality.

## Why full fine-tuning is expensive: memory math

Training with AdamW in mixed precision needs roughly 16 bytes per parameter before counting activations: bf16 weights (2), bf16 gradients (2), fp32 master weights (4) and Adam's first and second moments (4 + 4).

A 7B-parameter model needs 7e9 x 16 bytes = 112 GB, more than any single common GPU, and a 70B model needs over a terabyte. That is why parameter-efficient methods exist.

## LoRA: low-rank adaptation

The change a fine-tune makes to a big weight matrix tends to be low rank, meaning it can be described with far fewer numbers than the matrix has (module 2, SVD).

So freeze the original weights `W` (d_out x d_in) and learn only a small update made of two thin matrices:

```
W_new = W + (alpha / r) * B @ A          A: r x d_in,  B: d_out x r,  r is small (4 to 64)
```

`B` starts at zero, so training begins exactly at the original model. Only A and B are trained, which cuts the trainable parameters from `d_in * d_out` to `r * (d_in + d_out)`. A 4096 x 4096 attention matrix has 16.8M weights, and a rank-16 LoRA adds 131K, about 0.8%. Gradients and optimizer state are needed only for A and B, so memory drops sharply. After training you can merge (`W + scale * B @ A`) for no extra inference cost, or keep the adapters separate and swap them, so that one base model in memory serves many customers or tasks, each with its own adapter of a few megabytes. Because the original weights are untouched, removing the adapter restores the original model exactly, which full fine-tuning cannot offer.

A typical setup applies LoRA to the attention projections, often to all linear layers, with rank 8-64, alpha about twice the rank, and a learning rate higher than for full fine-tuning, around 1e-4 to 3e-4.

QLoRA goes further by storing the frozen base model in 4-bit precision and training 16-bit LoRA adapters on top. It made fine-tuning models with tens of billions of parameters possible on a single GPU.

## Catastrophic forgetting

Training hard on a narrow task can degrade general abilities. LoRA (the base is frozen), lower learning rates, fewer epochs and mixing some general data back in all reduce the effect, and you should evaluate general capabilities as well as the target task. The lab measures forgetting directly.

## Quantization

Store weights with fewer bits:

| Format | Bits | Memory for 7B | Typical quality impact |
|--------|------|---------------|------------------------|
| fp32 | 32 | 28 GB | reference |
| bf16 / fp16 | 16 | 14 GB | none (the normal serving precision) |
| int8 / fp8 | 8 | 7 GB | usually negligible |
| int4 | 4 | 3.5 GB | small for most tasks, noticeable on some (math, long reasoning, small models) |

The lab implements the basic method, which maps each group of floats onto a small integer grid using a scale (and sometimes a zero point): `q = round(w / scale)`, so `w` is about `q * scale`. Granularity matters: one scale per tensor is crude, while one per row (per-channel) or per small group of weights (group-wise, e.g. 128 weights) is much more accurate. Outliers also matter, because a few huge weights or activations force a big scale and crush the precision of everything else, and much quantization research is about handling them. Post-training quantization methods (GPTQ, AWQ and others) choose the rounding cleverly using a little calibration data. You will meet GGUF (llama.cpp, Ollama), bitsandbytes and AWQ or GPTQ checkpoints on Hugging Face. Weights are the most common thing to quantize, followed by activations and the KV cache (file 24).

Quantization decides whether a model fits on a laptop, one GPU or eight. Memory bandwidth often limits generation speed, so smaller weights also give faster tokens.

## Tools

The Hugging Face libraries cover most of it: `transformers` for models, `peft` for LoRA and related methods, `trl` for SFT and DPO trainers, and `datasets`. Unsloth and Axolotl are popular fine-tuning frameworks with good defaults, and cloud and model providers offer managed fine-tuning for some of their models.

## Running a fine-tuning project

1. Write down the goal and the metric, and build the evaluation set first.
2. Establish baselines: the base model with the best prompt, and perhaps a bigger model.
3. Prepare and clean the training data in the chat format, and deduplicate it against the eval data.
4. Train LoRA with sensible defaults while watching training and validation loss.
5. Evaluate on the task set, on a general capability set to catch forgetting, and on safety behaviors.
6. Compare cost, latency and quality against the baselines, and ship only if it wins.
7. Version the data, config, adapter and evaluation results together.

## Questions

1. Your team wants to fine-tune a model on the company wiki so it "knows" the policies. What do you recommend instead and why?
2. How many trainable parameters does a rank-8 LoRA add to a 4096 x 11008 matrix?
3. Why does LoRA's B matrix start at zero?
4. Estimate the memory needed just to hold a 13B model's weights in bf16 and in 4-bit.
5. Why does per-channel quantization beat per-tensor quantization when a matrix has outliers?
