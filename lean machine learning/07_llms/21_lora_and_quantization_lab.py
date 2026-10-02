"""
LoRA and quantization from scratch in PyTorch. Read 20_fine_tuning_lora_quantization.md first.

Setup: a small network plays the role of a "pretrained model" that solves task A. Task B is a
modified version of task A: the true change is LOW RANK (rank 2), like the changes fine-tuning
usually makes. We compare:
  - doing nothing
  - full fine-tuning (every weight trainable)
  - LoRA (base frozen, tiny trainable adapters)
and measure forgetting of task A. Then we quantize weights to 8 and 4 bits by hand.

Run it:  python 21_lora_and_quantization_lab.py   (under a minute)
"""

import copy
import math

import torch
import torch.nn as nn

torch.manual_seed(0)
D_IN, HIDDEN = 32, 256


# %% 1. The "pretrained" model (task A) and the target task B
def make_network():
    net = nn.Sequential(nn.Linear(D_IN, HIDDEN), nn.Tanh(), nn.Linear(HIDDEN, HIDDEN), nn.Tanh(), nn.Linear(HIDDEN, 1))
    for layer in net:
        if isinstance(layer, nn.Linear):
            nn.init.normal_(layer.weight, std=1.5 / math.sqrt(layer.in_features))
            nn.init.normal_(layer.bias, std=0.1)
    return net


pretrained = make_network()                          # pretend someone trained this on task A
task_b_teacher = copy.deepcopy(pretrained)
with torch.no_grad():                                 # task B = task A with a rank-2 change in the middle layer
    u = torch.randn(HIDDEN, 2)
    v = torch.randn(2, HIDDEN)
    task_b_teacher[2].weight += 0.6 * (u @ v) / math.sqrt(HIDDEN)

X_test = torch.randn(4000, D_IN)
with torch.no_grad():
    y_test_A, y_test_B = pretrained(X_test), task_b_teacher(X_test)


def mse(model, y):
    with torch.no_grad():
        return nn.functional.mse_loss(model(X_test), y).item()


def train(model, steps=1500, lr=1e-3):
    params = [p for p in model.parameters() if p.requires_grad]
    opt = torch.optim.Adam(params, lr=lr)
    for _ in range(steps):
        x = torch.randn(256, D_IN)                     # fresh task-B examples every step
        with torch.no_grad():
            y = task_b_teacher(x)
        loss = nn.functional.mse_loss(model(x), y)
        opt.zero_grad()
        loss.backward()
        opt.step()
    return model


def n_trainable(model):
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


total_params = sum(p.numel() for p in pretrained.parameters())
print(f"pretrained model: {total_params:,} parameters")
print(f"variance of task B targets: {y_test_B.var().item():.3f} (MSE of always predicting the mean)\n")
print(f"{'approach':<28}{'trainable':>10}{'task B MSE':>12}{'task A MSE':>12}")
print(f"{'pretrained, no tuning':<28}{0:>10,}{mse(pretrained, y_test_B):>12.4f}{mse(pretrained, y_test_A):>12.4f}")


# %% 2. Full fine-tuning
full = train(copy.deepcopy(pretrained))
print(f"{'full fine-tuning':<28}{n_trainable(full):>10,}{mse(full, y_test_B):>12.4f}{mse(full, y_test_A):>12.4f}")


# %% 3. LoRA
class LoRALinear(nn.Module):
    """y = base(x) + (alpha / r) * x A^T B^T, with the base layer frozen."""

    def __init__(self, base: nn.Linear, r=4, alpha=8):
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad = False                                  # frozen
        self.A = nn.Parameter(torch.randn(r, base.in_features) / math.sqrt(base.in_features))
        self.B = nn.Parameter(torch.zeros(base.out_features, r))     # zero: start exactly at the base model
        self.scale = alpha / r
        self.enabled = True

    def forward(self, x):
        out = self.base(x)
        if self.enabled:
            out = out + (x @ self.A.T @ self.B.T) * self.scale
        return out

    def merged_weight(self):
        return self.base.weight + self.scale * self.B @ self.A


def add_lora(model, r):
    lora_model = copy.deepcopy(model)
    for i, layer in enumerate(lora_model):
        if isinstance(layer, nn.Linear):
            lora_model[i] = LoRALinear(layer, r=r, alpha=2 * r)
    return lora_model


lora = train(add_lora(pretrained, r=4), lr=1e-2)                     # LoRA likes higher learning rates
print(f"{'LoRA rank 4':<28}{n_trainable(lora):>10,}{mse(lora, y_test_B):>12.4f}{mse(lora, y_test_A):>12.4f}")
for layer in lora:
    if isinstance(layer, LoRALinear):
        layer.enabled = False                                         # remove the adapters
print(f"{'LoRA adapters switched off':<28}{0:>10,}{mse(lora, y_test_B):>12.4f}{mse(lora, y_test_A):>12.4f}")
for layer in lora:
    if isinstance(layer, LoRALinear):
        layer.enabled = True
print(f"\nLoRA trains {n_trainable(lora) / total_params:.1%} of the parameters. Full fine-tuning overwrote "
      f"task A (forgetting); switching the adapters off gives back the original model exactly.")
# Do not over-learn from the table: LoRA beating full fine-tuning on task B is a property of this toy
# (the true change is exactly low rank, and LoRA got a higher learning rate). In real projects full
# fine-tuning usually matches or slightly beats LoRA on the target task. LoRA wins on memory, cost,
# storage (adapters are tiny) and the ability to undo or swap adapters.


# %% 4. Merging: fold the adapter into the weights for zero inference overhead
merged = copy.deepcopy(pretrained)
with torch.no_grad():
    for i, layer in enumerate(lora):
        if isinstance(layer, LoRALinear):
            merged[i].weight.copy_(layer.merged_weight())
print(f"merged model matches the adapter model: {torch.allclose(merged(X_test), lora(X_test), atol=1e-5)}")


# %% 5. Which rank is enough? The true change has rank 2.
print("\nrank   trainable   task B MSE")
for r in [1, 2, 4, 16]:
    m = train(add_lora(pretrained, r=r), lr=1e-2)
    print(f"{r:>4}   {n_trainable(m):>9,}   {mse(m, y_test_B):>10.4f}")
# Rank 1 cannot express a rank-2 change. Rank 2 and above can. Real fine-tuning changes are not
# exactly low rank, but close enough that ranks of 8-64 usually work for huge matrices.


# %% 6. Quantization by hand
def quantize(w, bits, per_row):
    """Symmetric absmax quantization: scale so the largest |w| maps to the largest integer."""
    q_max = 2 ** (bits - 1) - 1                                      # 127 for int8, 7 for int4
    absmax = w.abs().amax(dim=1, keepdim=True) if per_row else w.abs().max()
    scale = absmax / q_max
    q = torch.clamp(torch.round(w / scale), -q_max, q_max)          # the stored small integers
    return q * scale                                                  # dequantized back to floats


def model_with_quantized_weights(model, bits, per_row):
    qm = copy.deepcopy(model)
    with torch.no_grad():
        for layer in qm:
            if isinstance(layer, nn.Linear):
                layer.weight.copy_(quantize(layer.weight, bits, per_row))
    return qm


print("\nquantizing the pretrained model's weights (task A output error, lower is better)")
print(f"{'format':<26}{'bytes per weight':>17}{'output MSE vs fp32':>20}")
for bits, per_row in [(8, False), (8, True), (4, False), (4, True)]:
    qm = model_with_quantized_weights(pretrained, bits, per_row)
    label = f"int{bits} {'per-row' if per_row else 'per-tensor'}"
    print(f"{label:<26}{bits / 8:>17}{mse(qm, y_test_A):>20.6f}")
# int4 hurts this tiny model badly. Large models tolerate 4-bit far better: they have more
# redundancy, and real methods use group-wise scales and smarter rounding (GPTQ, AWQ).

# Outliers: one huge weight ruins per-tensor quantization of everything else.
w = pretrained[2].weight.detach().clone()
w_outlier = w.clone()
w_outlier[0, 0] = 40 * w.abs().max()
for name, matrix in [("normal matrix", w), ("with one outlier", w_outlier)]:
    err_tensor = (quantize(matrix, 8, False) - matrix)[1:].pow(2).mean().item()   # error on the OTHER rows
    err_row = (quantize(matrix, 8, True) - matrix)[1:].pow(2).mean().item()
    print(f"int8 {name:<17} error on other rows: per-tensor {err_tensor:.2e}, per-row {err_row:.2e}")
# Per-tensor: the outlier inflates the single scale, so every other weight is rounded coarsely.
# Per-row: only the outlier's own row suffers. Group-wise scales (e.g. every 128 weights) go further.

gb = lambda params, bits: params * bits / 8 / 1e9
print(f"\nmemory for a 70B-parameter model: bf16 {gb(70e9, 16):.0f} GB, int8 {gb(70e9, 8):.0f} GB, "
      f"int4 {gb(70e9, 4):.0f} GB (weights only)")

# Your turn
# 1. Make the task-B change rank 8 instead of 2. Which LoRA rank do you need now?
# 2. Apply LoRA only to the middle layer (index 2). Does it still work? How many parameters?
# 3. Implement group-wise quantization: one scale per group of 32 consecutive weights in each row.
#    Compare int4 group-wise against int4 per-row.
