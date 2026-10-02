"""
Exercises: neural networks and optimizers (do these after module 6).

How to work:
  1. Replace each `raise NotImplementedError` with your own code.
  2. Run:  python 03_deep_learning_exercises.py
  3. The checks print PASS / FAIL / TODO for every function. FAIL messages tell you what went wrong.
Stuck for more than 30 minutes on one function? Read its solution in solutions/, close the file,
and write it again from memory. Copying teaches nothing; rewriting does.
"""

import numpy as np


def relu(x):
    """max(0, x), elementwise."""
    raise NotImplementedError  # your code here


def relu_grad(x):
    """Derivative of ReLU at x: 1 where x > 0, else 0 (use 0 at exactly 0)."""
    raise NotImplementedError  # your code here


def softmax(z):
    """Row-wise softmax of a 2D array. Subtract each row's max first so huge values do not overflow."""
    raise NotImplementedError  # your code here


def cross_entropy(probs, y):
    """Mean of -log(probability assigned to the correct class). probs: (n, K), y: (n,) ints."""
    raise NotImplementedError  # your code here


def softmax_cross_entropy_grad(logits, y):
    """Gradient of mean cross-entropy(softmax(logits), y) with respect to the logits: (n, K).
    The famous result: (softmax(logits) - one_hot(y)) / n."""
    raise NotImplementedError  # your code here


def linear_forward(X, W, b):
    """A dense layer: X (n, d_in) @ W (d_in, d_out) + b (d_out,)."""
    raise NotImplementedError  # your code here


def linear_backward(X, W, dout):
    """Given dout = dL/d(output) of shape (n, d_out), return (dX, dW, db).
    Check the shapes: dX like X, dW like W, db like b."""
    raise NotImplementedError  # your code here


def numerical_gradient(f, x, h=1e-5):
    """Central-difference gradient of a scalar function f at the array x (same shape as x).
    Do not leave x modified when you return."""
    raise NotImplementedError  # your code here


def mlp_loss_and_grads(X, y, params):
    """Two-layer network: h = relu(X W1 + b1), scores = h W2 + b2, loss = mean cross-entropy.
    params is a dict with W1, b1, W2, b2. Return (loss, grads) where grads has the same keys.
    Do not modify params. This is the forward and backward pass from module 6, lab 03."""
    raise NotImplementedError  # your code here


def sgd_momentum_step(w, grad, velocity, lr, beta):
    """velocity = beta * velocity + grad, then w = w - lr * velocity. Return (new_w, new_velocity)."""
    raise NotImplementedError  # your code here


def adam_step(w, grad, m, v, t, lr, beta1, beta2, eps):
    """One Adam update at step t (starting at 1), with bias correction. Return (new_w, new_m, new_v)."""
    raise NotImplementedError  # your code here


def count_params(layer_sizes):
    """Number of weights and biases in an MLP with these layer sizes, e.g. [784, 256, 10]."""
    raise NotImplementedError  # your code here


if __name__ == "__main__":
    import checks          # checks.py sits next to this file
    checks.run(globals(), "deep_learning")
