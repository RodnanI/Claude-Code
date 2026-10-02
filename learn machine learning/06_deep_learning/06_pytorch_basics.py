"""
PyTorch basics: tensors, autograd, modules, losses, the training loop, saving.

PyTorch is the dominant deep learning library in research and most LLM work
(Hugging Face, vLLM, nanoGPT and nearly every open model use it). Everything here
corresponds to something you already built by hand:
  tensors   = NumPy arrays that can live on a GPU and track gradients
  autograd  = your Value class, for whole arrays
  nn.Module = your Neuron / Layer / MLP classes

Run it:  python 06_pytorch_basics.py
"""

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
torch.manual_seed(0)


# %% 1. Tensors: NumPy with superpowers
a = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
print("tensor:\n", a, "\nshape:", a.shape, "| dtype:", a.dtype)       # float32 by default
print("random normal:", torch.randn(2, 3).shape, "| zeros:", torch.zeros(3).tolist(), "| arange:", torch.arange(5).tolist())
print("matrix multiply:\n", a @ a)
print("broadcasting:", (a + torch.tensor([10.0, 20.0])).tolist())
print("indexing like NumPy, column 1:", a[:, 1].tolist())
print("reshape:", torch.arange(6).reshape(2, 3).tolist())

from_numpy = torch.from_numpy(np.array([1.0, 2.0]))   # shares memory with the NumPy array
print("from NumPy keeps float64:", from_numpy.dtype, "-> convert with .float():", from_numpy.float().dtype)
# Most PyTorch models use float32. NumPy defaults to float64. Mixing them is a common error.


# %% 2. Devices: CPU, CUDA (NVIDIA GPU) or MPS (Apple Silicon)
if torch.cuda.is_available():
    device = torch.device("cuda")
elif torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")
print("\nusing device:", device)
x_on_device = a.to(device)          # model and data must be on the SAME device or you get an error


# %% 3. Autograd: the same expression as in 02_autograd_from_scratch.py
va = torch.tensor(0.5, requires_grad=True)       # requires_grad=True: track operations on me
vb = torch.tensor(-1.5, requires_grad=True)
vc = torch.tensor(1.0, requires_grad=True)
d = va * vb + vc
L = torch.tanh(d * d) * -2.0 + va
L.backward()                                     # fills .grad of every tensor that requires it
print(f"\ntorch autograd: dL/da={va.grad.item():.6f} dL/db={vb.grad.item():.6f} dL/dc={vc.grad.item():.6f}")
print("(compare with your own Value class output: identical)")

# Gradients ACCUMULATE: calling backward again adds to .grad. That is why loops call zero_grad().
x = torch.tensor(2.0, requires_grad=True)
(x ** 2).backward()
(x ** 2).backward()
print("after two backward calls, d(x^2)/dx at x=2 shows as", x.grad.item(), "instead of 4.0")


# %% 4. Layers: nn.Linear and friends
layer = nn.Linear(in_features=3, out_features=2)
print("\nnn.Linear(3, 2) weight shape:", tuple(layer.weight.shape), "(out, in), bias shape:", tuple(layer.bias.shape))
print("it computes  x @ W.T + b   for a batch x of shape (batch, 3):", layer(torch.randn(5, 3)).shape)


# %% 5. Your own model: subclass nn.Module, define layers in __init__ and the math in forward
class MLP(nn.Module):
    def __init__(self, n_in, n_hidden, n_out):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_in, n_hidden),
            nn.ReLU(),
            nn.Linear(n_hidden, n_hidden),
            nn.ReLU(),
            nn.Linear(n_hidden, n_out),
        )

    def forward(self, x):
        return self.net(x)


model = MLP(1, 64, 1)
print("\n", model)
print("trainable parameters:", sum(p.numel() for p in model.parameters() if p.requires_grad))


# %% 6. Loss functions (they take LOGITS, not probabilities)
logits = torch.tensor([[2.0, 0.5, -1.0]])           # one example, three classes
target = torch.tensor([0])                          # class index, dtype long, shape (batch,)
print("\ncross-entropy:", nn.CrossEntropyLoss()(logits, target).item(),
      "= -log softmax[0] =", -torch.log_softmax(logits, dim=1)[0, 0].item())
print("MSE:", nn.MSELoss()(torch.tensor([2.5]), torch.tensor([3.0])).item())
print("BCE with logits:", nn.BCEWithLogitsLoss()(torch.tensor([1.2]), torch.tensor([1.0])).item())


# %% 7. THE training loop (memorize this shape; you will write it a thousand times)
# Task: learn y = sin(3x) from noisy samples.
X = torch.linspace(-2, 2, 400).unsqueeze(1)          # (400, 1): a column of inputs
y = torch.sin(3 * X) + 0.1 * torch.randn_like(X)
model = MLP(1, 64, 1).to(device)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-2)
loss_fn = nn.MSELoss()
X_dev, y_dev = X.to(device), y.to(device)

print()
for epoch in range(1, 501):
    model.train()                          # training mode (matters for dropout / batchnorm)
    prediction = model(X_dev)              # 1. forward
    loss = loss_fn(prediction, y_dev)      # 2. loss
    optimizer.zero_grad()                  # 3. clear old gradients
    loss.backward()                        # 4. backward: compute new gradients
    optimizer.step()                       # 5. update weights
    if epoch in (1, 50, 100, 250, 500):
        print(f"epoch {epoch:>3}: MSE {loss.item():.4f}")
print("(noise variance is 0.01: that is the floor)")


# %% 8. Inference: eval mode and no_grad
model.eval()
with torch.no_grad():                      # no graph building: faster, less memory
    test_x = torch.tensor([[0.0], [0.5], [1.0]], device=device)
    preds = model(test_x).cpu().squeeze().tolist()
print("\npredictions:", [round(p, 3) for p in preds], "| truth:", [round(float(np.sin(3 * v)), 3) for v in (0.0, 0.5, 1.0)])
# To turn an output that requires grad into NumPy: tensor.detach().cpu().numpy()


# %% 9. Saving and loading: save the state_dict (the weights), not the whole object
path = OUT / "sine_mlp.pt"
torch.save(model.state_dict(), path)
restored = MLP(1, 64, 1)
restored.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
restored.eval()
with torch.no_grad():
    same = torch.allclose(restored(test_x.cpu()), model.cpu()(test_x.cpu()))
print("restored model gives identical predictions:", same)


# %% 10. Errors you WILL see, and what they mean
# "mat1 and mat2 shapes cannot be multiplied (32x10 and 20x64)"
#       -> layer input size does not match data. Print x.shape before the layer.
# "expected scalar type Float but found Double"
#       -> float64 data (from NumPy) into a float32 model. Use .float().
# "Expected all tensors to be on the same device"
#       -> model on GPU, data on CPU (or the reverse). .to(device) both.
# "Can't call numpy() on Tensor that requires grad"
#       -> use .detach().cpu().numpy().
# "0D or 1D target tensor expected, multi-target not supported" (CrossEntropyLoss)
#       -> targets must be class indices of shape (batch,), dtype long, not one-hot.
# Loss not decreasing at all -> forgot optimizer.step(), or zero_grad() after backward().
