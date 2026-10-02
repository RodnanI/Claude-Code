"""
OPTIONAL: real pretrained models with Hugging Face transformers.

The same pieces you built by hand, using production tools:
  1. a real tokenizer (GPT-2's byte-level BPE)
  2. a real model's next-token probabilities
  3. generation with sampling settings
  4. sentence embeddings and semantic similarity
  5. (with --chat) a small instruction-tuned model and its chat template

Setup (downloads about 450 MB the first time; --chat adds about 1 GB):
  pip install transformers
Run it:
  python 25_huggingface_lab.py
  python 25_huggingface_lab.py --chat
Models are cached in ~/.cache/huggingface. Any compatible model name from huggingface.co works
with --model, --embed-model and --chat-model.
"""

import argparse

import torch
import torch.nn.functional as F

try:
    from transformers import AutoModel, AutoModelForCausalLM, AutoTokenizer
except ImportError:
    raise SystemExit("This lab needs the transformers library: pip install transformers")


def tokenizer_tour(tokenizer):
    print("=== 1. A real tokenizer")
    text = "Machine learning models learn patterns. Tokenization is weird!"
    ids = tokenizer(text)["input_ids"]
    print(f"{len(text)} characters -> {len(ids)} tokens")
    print("tokens:", tokenizer.convert_ids_to_tokens(ids))
    # GPT-2 shows a leading space as a special character (often rendered as G with a dot above).
    print("ids:   ", ids)
    print("decoded back:", tokenizer.decode(ids))
    for word in ["learning", " learning", " Learning", "strawberry", " 12345"]:
        print(f"  {word!r:<14} -> {tokenizer.convert_ids_to_tokens(tokenizer(word)['input_ids'])}")


def next_token_probabilities(model, tokenizer, prompt="The capital of France is"):
    print("\n=== 2. Next-token probabilities from a real model")
    inputs = tokenizer(prompt, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits                 # (batch=1, T, vocab)
    probs = F.softmax(logits[0, -1], dim=-1)            # the LAST position predicts the next token
    top = torch.topk(probs, 8)
    print(f"prompt: {prompt!r}")
    for p, i in zip(top.values, top.indices):
        print(f"  {tokenizer.decode([int(i)])!r:<14} {p.item():.3f}")
    n_params = sum(p.numel() for p in model.parameters())
    print(f"model: {n_params / 1e6:.0f}M parameters, vocabulary {logits.shape[-1]:,}")


def generation(model, tokenizer, prompt="In machine learning, overfitting means"):
    print("\n=== 3. Generation with different decoding settings")
    inputs = tokenizer(prompt, return_tensors="pt")
    settings = {
        "greedy": {"do_sample": False},
        "temperature 0.7, top-p 0.9": {"do_sample": True, "temperature": 0.7, "top_p": 0.9},
        "temperature 1.3": {"do_sample": True, "temperature": 1.3, "top_k": 0},
    }
    for name, kwargs in settings.items():
        torch.manual_seed(0)
        out = model.generate(**inputs, max_new_tokens=35, pad_token_id=tokenizer.eos_token_id, **kwargs)
        text = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        print(f"[{name}] {prompt}{text!r}")
    # A small base model rambles and repeats: no instruction tuning, little capacity. That is the
    # "base model" behavior from file 01, in front of you.


def embeddings(embed_name):
    print(f"\n=== 4. Sentence embeddings ({embed_name})")
    tokenizer = AutoTokenizer.from_pretrained(embed_name)
    model = AutoModel.from_pretrained(embed_name)
    sentences = [
        "How do I reset my password?",
        "I forgot my login credentials.",
        "What is the refund policy for annual plans?",
        "Can I get my money back after cancelling?",
        "The best pizza in Naples is near the station.",
    ]
    batch = tokenizer(sentences, padding=True, truncation=True, return_tensors="pt")
    with torch.no_grad():
        hidden = model(**batch).last_hidden_state                       # (n, T, dim): one vector per token
    mask = batch["attention_mask"].unsqueeze(-1).float()
    vectors = (hidden * mask).sum(dim=1) / mask.sum(dim=1)               # mean pooling over real tokens
    vectors = F.normalize(vectors, dim=-1)
    sims = vectors @ vectors.T
    print(f"{len(sentences)} sentences -> vectors of {vectors.shape[1]} numbers")
    for i, s in enumerate(sentences):
        best = max((j for j in range(len(sentences)) if j != i), key=lambda j: sims[i, j].item())
        print(f"  {s[:45]:<46} closest: {sentences[best][:40]!r} ({sims[i, best]:.2f})")
    # The password questions match each other and so do the refund questions, with almost no shared
    # words. This is the engine of semantic search and RAG retrieval.


def chat(chat_name):
    print(f"\n=== 5. An instruction-tuned model and its chat template ({chat_name})")
    tokenizer = AutoTokenizer.from_pretrained(chat_name)
    model = AutoModelForCausalLM.from_pretrained(chat_name)
    messages = [
        {"role": "system", "content": "You are a concise tutor."},
        {"role": "user", "content": "In one sentence, what is a learning rate?"},
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    print("what the model actually receives (one flat string with special tokens):")
    print(prompt)
    inputs = tokenizer(prompt, return_tensors="pt")
    out = model.generate(**inputs, max_new_tokens=60, do_sample=False)
    print("reply:", tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="distilgpt2", help="a causal language model (base model)")
    parser.add_argument("--embed-model", default="sentence-transformers/all-MiniLM-L6-v2")
    parser.add_argument("--chat", action="store_true", help="also run a small instruction-tuned model")
    parser.add_argument("--chat-model", default="Qwen/Qwen2.5-0.5B-Instruct")
    args = parser.parse_args()

    tok = AutoTokenizer.from_pretrained(args.model)
    lm = AutoModelForCausalLM.from_pretrained(args.model)
    lm.eval()
    tokenizer_tour(tok)
    next_token_probabilities(lm, tok)
    generation(lm, tok)
    embeddings(args.embed_model)
    if args.chat:
        chat(args.chat_model)

# Your turn
# 1. Run section 2 with prompts where you know the answer. When is the model confidently wrong?
# 2. Add sentences to section 4 that share words but differ in meaning ("The bank raised rates" vs
#    "We sat on the river bank"). How close are they?
# 3. Use --model gpt2 (larger than distilgpt2). Does generation get better? What did it cost in memory?
