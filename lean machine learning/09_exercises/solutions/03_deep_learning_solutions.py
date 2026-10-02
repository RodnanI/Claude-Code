"""
SOLUTIONS for 03_deep_learning_exercises.py. Try the exercises first.
"""

import numpy as np


def relu(x):
    """max(0, x), elementwise."""
    return np.maximum(0, x)


def relu_grad(x):
    """Derivative of ReLU at x: 1 where x > 0, else 0 (use 0 at exactly 0)."""
    return (x > 0).astype(float)


def softmax(z):
    """Row-wise softmax of a 2D array. Subtract each row's max first so huge values do not overflow."""
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def cross_entropy(probs, y):
    """Mean of -log(probability assigned to the correct class). probs: (n, K), y: (n,) ints."""
    return float(-np.mean(np.log(probs[np.arange(len(y)), y])))


def softmax_cross_entropy_grad(logits, y):
    """Gradient of mean cross-entropy(softmax(logits), y) with respect to the logits: (n, K).
    The famous result: (softmax(logits) - one_hot(y)) / n."""
    g = softmax(logits)
    g[np.arange(len(y)), y] -= 1
    return g / len(y)


def linear_forward(X, W, b):
    """A dense layer: X (n, d_in) @ W (d_in, d_out) + b (d_out,)."""
    return X @ W + b


def linear_backward(X, W, dout):
    """Given dout = dL/d(output) of shape (n, d_out), return (dX, dW, db).
    Check the shapes: dX like X, dW like W, db like b."""
    return dout @ W.T, X.T @ dout, dout.sum(axis=0)


def numerical_gradient(f, x, h=1e-5):
    """Central-difference gradient of a scalar function f at the array x (same shape as x).
    Do not leave x modified when you return."""
    grad = np.zeros_like(x, dtype=float)
    for i in range(x.size):
        old = x.flat[i]
        x.flat[i] = old + h
        plus = f(x)
        x.flat[i] = old - h
        minus = f(x)
        x.flat[i] = old
        grad.flat[i] = (plus - minus) / (2 * h)
    return grad


def mlp_loss_and_grads(X, y, params):
    """Two-layer network: h = relu(X W1 + b1), scores = h W2 + b2, loss = mean cross-entropy.
    params is a dict with W1, b1, W2, b2. Return (loss, grads) where grads has the same keys.
    Do not modify params. This is the forward and backward pass from module 6, lab 03."""
    W1, b1, W2, b2 = params["W1"], params["b1"], params["W2"], params["b2"]
    z1 = X @ W1 + b1
    h = np.maximum(0, z1)
    scores = h @ W2 + b2
    loss = cross_entropy(softmax(scores), y)
    dscores = softmax_cross_entropy_grad(scores, y)
    dh, dW2, db2 = linear_backward(h, W2, dscores)
    dz1 = dh * (z1 > 0)
    _, dW1, db1 = linear_backward(X, W1, dz1)
    return loss, {"W1": dW1, "b1": db1, "W2": dW2, "b2": db2}


def sgd_momentum_step(w, grad, velocity, lr, beta):
    """velocity = beta * velocity + grad, then w = w - lr * velocity. Return (new_w, new_velocity)."""
    velocity = beta * velocity + grad
    return w - lr * velocity, velocity


def adam_step(w, grad, m, v, t, lr, beta1, beta2, eps):
    """One Adam update at step t (starting at 1), with bias correction. Return (new_w, new_m, new_v)."""
    m = beta1 * m + (1 - beta1) * grad
    v = beta2 * v + (1 - beta2) * grad ** 2
    m_hat = m / (1 - beta1 ** t)
    v_hat = v / (1 - beta2 ** t)
    return w - lr * m_hat / (np.sqrt(v_hat) + eps), m, v


def count_params(layer_sizes):
    """Number of weights and biases in an MLP with these layer sizes, e.g. [784, 256, 10]."""
    return sum(a * b + b for a, b in zip(layer_sizes, layer_sizes[1:]))


if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import checks
    checks.run(globals(), "deep_learning")
