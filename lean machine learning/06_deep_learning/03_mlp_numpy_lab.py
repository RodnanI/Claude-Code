"""
A neural network in pure NumPy with hand-written backpropagation, in matrix form.

The autograd file worked number by number. Real networks work on whole matrices at once.
This lab classifies a spiral dataset that no straight line can separate:
  1. a linear softmax classifier (fails)
  2. a 2-layer network with ReLU (succeeds)
  3. a gradient check proving the backprop math is right

Based on the classic Stanford CS231n spiral example.

Run it:  python 03_mlp_numpy_lab.py   (about 10 seconds)
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(0)


# %% 1. Spiral data: 3 classes, 100 points each, 2 features
N, K = 100, 3
X = np.zeros((N * K, 2))
y = np.zeros(N * K, dtype=int)
for j in range(K):
    r = np.linspace(0.0, 1.0, N)
    t = np.linspace(j * 4, (j + 1) * 4, N) + rng.normal(0, 0.2, N)
    X[j * N:(j + 1) * N] = np.column_stack([r * np.sin(t), r * np.cos(t)])
    y[j * N:(j + 1) * N] = j
n = len(y)


def softmax(scores):
    scores = scores - scores.max(axis=1, keepdims=True)    # stability trick
    e = np.exp(scores)
    return e / e.sum(axis=1, keepdims=True)


# %% 2. Linear softmax classifier
W = 0.01 * rng.normal(size=(2, K))
b = np.zeros(K)
reg, lr = 1e-3, 1.0
for step in range(300):
    probs = softmax(X @ W + b)                             # (300, 3)
    loss = -np.log(probs[np.arange(n), y]).mean() + 0.5 * reg * np.sum(W * W)
    dscores = probs.copy()
    dscores[np.arange(n), y] -= 1                          # gradient of softmax + cross-entropy: p - onehot
    dscores /= n
    W -= lr * (X.T @ dscores + reg * W)
    b -= lr * dscores.sum(axis=0)
linear_acc = np.mean((X @ W + b).argmax(axis=1) == y)
print(f"linear softmax classifier: loss {loss:.3f}, training accuracy {linear_acc:.1%}")


# %% 3. Two-layer network: forward and backward as one function
def forward_backward(params, X, y, reg):
    W1, b1, W2, b2 = params["W1"], params["b1"], params["W2"], params["b2"]
    n = len(y)
    # ---- forward ----
    z1 = X @ W1 + b1                    # (n, H)
    h = np.maximum(0, z1)               # ReLU
    scores = h @ W2 + b2                # (n, K) logits
    probs = softmax(scores)
    loss = -np.log(probs[np.arange(n), y]).mean() + 0.5 * reg * (np.sum(W1 * W1) + np.sum(W2 * W2))
    # ---- backward: chain rule, layer by layer, from the loss to the input ----
    dscores = probs.copy()
    dscores[np.arange(n), y] -= 1
    dscores /= n                                        # dL/dscores        (n, K)
    grads = {
        "W2": h.T @ dscores + reg * W2,                 # dL/dW2 = h^T @ dscores       (H, K)
        "b2": dscores.sum(axis=0),                      # bias: sum over the batch     (K,)
    }
    dh = dscores @ W2.T                                 # gradient flowing into h      (n, H)
    dz1 = dh * (z1 > 0)                                 # ReLU passes gradient only where it was active
    grads["W1"] = X.T @ dz1 + reg * W1                  # (2, H)
    grads["b1"] = dz1.sum(axis=0)                       # (H,)
    return loss, grads, scores


H = 100
params = {
    "W1": 0.01 * rng.normal(size=(2, H)), "b1": np.zeros(H),
    "W2": 0.01 * rng.normal(size=(H, K)), "b2": np.zeros(K),
}


# %% 4. Gradient check BEFORE training (on a small subset, with float64)
def numerical_grad(params, name, index, X, y, reg, h=1e-5):
    old = params[name][index]
    params[name][index] = old + h
    plus = forward_backward(params, X, y, reg)[0]
    params[name][index] = old - h
    minus = forward_backward(params, X, y, reg)[0]
    params[name][index] = old
    return (plus - minus) / (2 * h)


check_params = {k: v.copy() + 0.1 * rng.normal(size=v.shape) for k, v in params.items()}  # not all-zero biases
Xs, ys = X[::10], y[::10]
_, analytic, _ = forward_backward(check_params, Xs, ys, reg)
print("\ngradient check (relative error, want < 1e-6):")
for name in ["W1", "b1", "W2", "b2"]:
    errors = []
    for _ in range(5):
        index = tuple(rng.integers(0, s) for s in check_params[name].shape)
        num = numerical_grad(check_params, name, index, Xs, ys, reg)
        ana = analytic[name][index]
        errors.append(abs(num - ana) / max(1e-12, abs(num) + abs(ana)))
    print(f"  {name}: max relative error {max(errors):.2e}")
# If you ever write backprop by hand, do this check. A wrong gradient can still make the
# loss go down a little, so "it trains" is not proof that it is correct.


# %% 5. Train the network
for step in range(10_001):
    loss, grads, scores = forward_backward(params, X, y, reg)
    for name in params:
        params[name] -= lr * grads[name]
    if step % 2000 == 0:
        acc = np.mean(scores.argmax(axis=1) == y)
        print(f"step {step:>5}: loss {loss:.4f}  training accuracy {acc:.1%}")
print(f"parameters: {sum(p.size for p in params.values())}")


# %% 6. Decision boundaries
xx, yy = np.meshgrid(np.linspace(-1.2, 1.2, 300), np.linspace(-1.2, 1.2, 300))
grid = np.column_stack([xx.ravel(), yy.ravel()])
linear_regions = (grid @ W + b).argmax(axis=1).reshape(xx.shape)
mlp_regions = forward_backward(params, grid, np.zeros(len(grid), dtype=int), reg)[2].argmax(axis=1).reshape(xx.shape)
colors = np.array(["#c8553d", "#2a9d8f", "#e9c46a"])
fig, axes = plt.subplots(1, 2, figsize=(11, 5))
for ax, regions, title in [(axes[0], linear_regions, f"linear: {linear_acc:.0%}"),
                           (axes[1], mlp_regions, "2-layer network")]:
    ax.contourf(xx, yy, regions, levels=[-0.5, 0.5, 1.5, 2.5], colors=["#f3d3cc", "#cbe8e4", "#f7ecc4"])
    ax.scatter(X[:, 0], X[:, 1], c=colors[y], s=12, edgecolor="#2b2d42", linewidth=0.3)
    ax.set_title(title)
    ax.set_aspect("equal")
fig.tight_layout()
fig.savefig(OUT / "spiral_boundaries.png", dpi=120)
print("saved spiral_boundaries.png")
# The linear model can only cut the plane with straight lines. 100 ReLU units give the network
# 100 "folds" it can bend its boundary along, enough to follow the spirals.

plt.show()

# %% Your turn
# 1. Use 5 hidden units instead of 100. Then 2. Where does it stop working?
# 2. Replace ReLU with tanh. You must change two lines: the forward activation and its
#    derivative in the backward pass (1 - tanh^2).
# 3. Add a second hidden layer. Write its backward pass, then confirm with the gradient check.
