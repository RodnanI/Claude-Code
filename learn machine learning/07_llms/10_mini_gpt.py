"""
A complete GPT, trained from scratch on this course's own lessons. Read 09_transformer_architecture.md.

It has every piece of a real LLM: token and position embeddings, causal multi-head
self-attention, MLP blocks, residual connections, LayerNorm, weight tying, AdamW,
warmup and cosine learning rate schedule, gradient clipping, train and validation loss,
checkpointing, and sampling with temperature and top-k.
It works on characters and is tiny, so it trains on a laptop CPU in a few minutes.

Inspired by Andrej Karpathy's nanoGPT and his video "Let's build GPT: from scratch, in code".

Run it:
  python 10_mini_gpt.py                          train with the default config, then generate
  python 10_mini_gpt.py --steps 300              quick smoke test
  python 10_mini_gpt.py --generate "Overfitting" load the saved checkpoint and continue a prompt
"""

import argparse
import math
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F

COURSE_ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
CHECKPOINT = OUT / "mini_gpt.pt"

# A config is just a dict. Bigger values = better text, slower training.
# With a GPU try: n_embd 384, n_layer 6, n_head 6, block_size 256, batch_size 64, max_steps 5000.
CONFIG = {
    "block_size": 64,        # context length in characters
    "n_embd": 96,            # model width C
    "n_head": 4,             # attention heads (head size = 96 / 4 = 24)
    "n_layer": 3,            # transformer blocks
    "dropout": 0.1,
    "batch_size": 32,
    "max_steps": 2000,
    "lr": 2e-3,              # peak learning rate (small models tolerate high rates)
    "min_lr": 2e-4,
    "warmup_steps": 100,
    "weight_decay": 0.05,
    "eval_every": 250,
    "eval_batches": 20,
}


# %% The model
class CausalSelfAttention(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        C = cfg["n_embd"]
        self.n_head = cfg["n_head"]
        self.qkv = nn.Linear(C, 3 * C)              # queries, keys, values for all heads in one matmul
        self.proj = nn.Linear(C, C)                 # output projection Wo
        self.attn_drop = nn.Dropout(cfg["dropout"])
        self.resid_drop = nn.Dropout(cfg["dropout"])
        T = cfg["block_size"]
        self.register_buffer("mask", torch.tril(torch.ones(T, T)).view(1, 1, T, T))   # lower triangle = allowed

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)                       # each (B, T, C)
        hs = C // self.n_head
        q = q.view(B, T, self.n_head, hs).transpose(1, 2)           # (B, heads, T, hs)
        k = k.view(B, T, self.n_head, hs).transpose(1, 2)
        v = v.view(B, T, self.n_head, hs).transpose(1, 2)
        att = (q @ k.transpose(-2, -1)) / math.sqrt(hs)             # (B, heads, T, T)
        att = att.masked_fill(self.mask[:, :, :T, :T] == 0, float("-inf"))
        att = self.attn_drop(F.softmax(att, dim=-1))
        y = att @ v                                                  # (B, heads, T, hs)
        y = y.transpose(1, 2).contiguous().view(B, T, C)            # concatenate heads
        # Production code calls F.scaled_dot_product_attention(q, k, v, is_causal=True) instead:
        # same math, fused and much faster (FlashAttention on GPUs).
        return self.resid_drop(self.proj(y))


class MLP(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        C = cfg["n_embd"]
        self.net = nn.Sequential(nn.Linear(C, 4 * C), nn.GELU(), nn.Linear(4 * C, C), nn.Dropout(cfg["dropout"]))

    def forward(self, x):
        return self.net(x)


class Block(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.ln1 = nn.LayerNorm(cfg["n_embd"])
        self.attn = CausalSelfAttention(cfg)
        self.ln2 = nn.LayerNorm(cfg["n_embd"])
        self.mlp = MLP(cfg)

    def forward(self, x):
        x = x + self.attn(self.ln1(x))     # communicate (pre-norm, residual)
        x = x + self.mlp(self.ln2(x))      # compute
        return x


class GPT(nn.Module):
    def __init__(self, cfg, vocab_size):
        super().__init__()
        self.cfg = cfg
        C = cfg["n_embd"]
        self.tok_emb = nn.Embedding(vocab_size, C)
        self.pos_emb = nn.Embedding(cfg["block_size"], C)
        self.drop = nn.Dropout(cfg["dropout"])
        self.blocks = nn.ModuleList([Block(cfg) for _ in range(cfg["n_layer"])])
        self.ln_f = nn.LayerNorm(C)
        self.head = nn.Linear(C, vocab_size, bias=False)
        self.head.weight = self.tok_emb.weight          # weight tying
        self.apply(self._init_weights)

    @staticmethod
    def _init_weights(module):
        if isinstance(module, (nn.Linear, nn.Embedding)):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
        if isinstance(module, nn.Linear) and module.bias is not None:
            nn.init.zeros_(module.bias)

    def forward(self, idx, targets=None):
        B, T = idx.shape
        positions = torch.arange(T, device=idx.device)
        x = self.drop(self.tok_emb(idx) + self.pos_emb(positions))   # (B, T, C)
        for block in self.blocks:
            x = block(x)
        logits = self.head(self.ln_f(x))                              # (B, T, vocab)
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
        return logits, loss

    @torch.no_grad()
    def generate(self, idx, max_new_tokens, temperature=1.0, top_k=None):
        for _ in range(max_new_tokens):
            idx_cond = idx[:, -self.cfg["block_size"]:]               # crop to the context window
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :] / temperature                   # only the LAST position predicts
            if top_k is not None:
                kth = torch.topk(logits, min(top_k, logits.size(-1))).values[:, [-1]]
                logits[logits < kth] = float("-inf")                  # keep only the k most likely
            probs = F.softmax(logits, dim=-1)
            next_id = torch.multinomial(probs, num_samples=1)         # sample
            idx = torch.cat([idx, next_id], dim=1)                    # append and repeat
        return idx


# %% Data
def load_corpus():
    files = sorted(COURSE_ROOT.glob("**/*.md"))
    text = "\n\n".join(f.read_text(encoding="utf-8") for f in files)
    if len(text) < 50_000:
        raise SystemExit("Not enough training text found. Run this from inside the course folder.")
    return text


def lr_at(step, cfg):
    if step < cfg["warmup_steps"]:
        return cfg["lr"] * (step + 1) / cfg["warmup_steps"]
    progress = (step - cfg["warmup_steps"]) / max(1, cfg["max_steps"] - cfg["warmup_steps"])
    return cfg["min_lr"] + 0.5 * (cfg["lr"] - cfg["min_lr"]) * (1 + math.cos(math.pi * min(1.0, progress)))


def pick_device():
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


# %% Training
def train(cfg):
    torch.manual_seed(1337)
    device = pick_device()
    text = load_corpus()
    chars = sorted(set(text))
    stoi = {c: i for i, c in enumerate(chars)}
    data = torch.tensor([stoi[c] for c in text], dtype=torch.long)
    n = int(0.9 * len(data))
    splits = {"train": data[:n], "val": data[n:]}
    print(f"corpus: {len(text):,} characters, vocabulary {len(chars)}, device {device}")

    def get_batch(split):
        d = splits[split]
        ix = torch.randint(len(d) - cfg["block_size"] - 1, (cfg["batch_size"],))
        x = torch.stack([d[i:i + cfg["block_size"]] for i in ix])
        y = torch.stack([d[i + 1:i + cfg["block_size"] + 1] for i in ix])    # shifted by one
        return x.to(device), y.to(device)

    model = GPT(cfg, len(chars)).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"model: {n_params:,} parameters")

    @torch.no_grad()
    def estimate_loss():
        model.eval()
        result = {}
        for split in ("train", "val"):
            losses = [model(*get_batch(split))[1].item() for _ in range(cfg["eval_batches"])]
            result[split] = sum(losses) / len(losses)
        model.train()
        return result

    print(f"loss before training: {estimate_loss()['val']:.3f} (expected about ln({len(chars)}) = {math.log(len(chars)):.3f})")
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg["lr"], betas=(0.9, 0.95), weight_decay=cfg["weight_decay"])
    start = time.time()
    for step in range(cfg["max_steps"] + 1):
        for group in optimizer.param_groups:
            group["lr"] = lr_at(step, cfg)
        if step % cfg["eval_every"] == 0 or step == cfg["max_steps"]:
            losses = estimate_loss()
            print(f"step {step:>5} | train loss {losses['train']:.3f} | val loss {losses['val']:.3f} | "
                  f"lr {lr_at(step, cfg):.1e} | {time.time() - start:5.0f}s")
        if step == cfg["max_steps"]:
            break
        x, y = get_batch("train")
        _, loss = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)     # gradient clipping
        optimizer.step()

    torch.save({"model": model.state_dict(), "config": cfg, "chars": chars}, CHECKPOINT)
    print(f"saved checkpoint to {CHECKPOINT}")
    return model, chars, device


# %% Generation
def generate_text(model, chars, device, prompt="\n", n=400, temperature=0.8, top_k=20):
    stoi = {c: i for i, c in enumerate(chars)}
    prompt = "".join(c for c in prompt if c in stoi) or "\n"          # drop characters never seen in training
    idx = torch.tensor([[stoi[c] for c in prompt]], dtype=torch.long, device=device)
    model.eval()
    out = model.generate(idx, n, temperature=temperature, top_k=top_k)[0].tolist()
    return "".join(chars[i] for i in out)


def load_checkpoint():
    if not CHECKPOINT.exists():
        raise SystemExit("No checkpoint yet. Train first: python 10_mini_gpt.py")
    ckpt = torch.load(CHECKPOINT, map_location="cpu", weights_only=False)
    device = pick_device()
    model = GPT(ckpt["config"], len(ckpt["chars"])).to(device)
    model.load_state_dict(ckpt["model"])
    return model, ckpt["chars"], device


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, help="override max_steps")
    parser.add_argument("--generate", type=str, help="skip training, continue this prompt from the checkpoint")
    parser.add_argument("--temperature", type=float, default=0.8)
    args = parser.parse_args()

    if args.generate is not None:
        model, chars, device = load_checkpoint()
        print(generate_text(model, chars, device, prompt=args.generate, temperature=args.temperature))
    else:
        cfg = dict(CONFIG)
        if args.steps:
            cfg["max_steps"] = args.steps
        model, chars, device = train(cfg)
        for prompt in ["\n## ", "The learning rate"]:
            print(f"\n----- generated from {prompt.strip()!r} (temperature {args.temperature}) -----")
            print(generate_text(model, chars, device, prompt=prompt, temperature=args.temperature))

# Your turn
# 1. Compare temperature 0.3, 0.8 and 1.5 with --generate. Which is the most "readable"? The most varied?
# 2. Remove the position embedding (use only tok_emb). How much worse is the validation loss? Why?
# 3. Double n_layer, then double n_embd instead. Which helps more per extra second of training?
# 4. Watch train vs val loss with a big model and many steps. When does it start to overfit this
#    small corpus? What would you change?
