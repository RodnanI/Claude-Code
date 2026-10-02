"""
Autograd from scratch: the engine inside PyTorch, in about 100 lines of pure Python.

Every number becomes a Value that remembers how it was computed. Calling .backward() on
the final loss walks the computation backwards with the chain rule and fills in .grad
for every Value that contributed. Then we build neurons and a small network out of
Values and train it.

Inspired by Andrej Karpathy's micrograd (github.com/karpathy/micrograd). After this file,
watch his video "The spelled-out intro to neural networks and backpropagation".

Run it:  python 02_autograd_from_scratch.py
"""

import math
import random


# %% 1. The Value class
class Value:
    def __init__(self, data, children=(), op=""):
        self.data = float(data)
        self.grad = 0.0                   # d(final output) / d(this value). Filled by backward().
        self._backward = lambda: None     # how to pass gradient to the children
        self._prev = set(children)        # the Values this one was computed from
        self._op = op                     # for printing/debugging

    def __repr__(self):
        return f"Value(data={self.data:.4f}, grad={self.grad:.4f})"

    # --- operations: each defines its output AND its local backward rule ---
    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")

        def _backward():                  # d(a+b)/da = 1, d(a+b)/db = 1
            self.grad += out.grad         # += because a value can feed several operations
            other.grad += out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "*")

        def _backward():                  # d(a*b)/da = b, d(a*b)/db = a
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def __pow__(self, k):
        assert isinstance(k, (int, float)), "only constant powers"
        out = Value(self.data ** k, (self,), f"**{k}")

        def _backward():                  # d(a^k)/da = k * a^(k-1)
            self.grad += k * self.data ** (k - 1) * out.grad
        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), "tanh")

        def _backward():                  # d tanh(a)/da = 1 - tanh(a)^2
            self.grad += (1 - t ** 2) * out.grad
        out._backward = _backward
        return out

    def relu(self):
        out = Value(max(0.0, self.data), (self,), "relu")

        def _backward():                  # slope 1 where positive, 0 elsewhere
            self.grad += (1.0 if out.data > 0 else 0.0) * out.grad
        out._backward = _backward
        return out

    def exp(self):
        e = math.exp(self.data)
        out = Value(e, (self,), "exp")

        def _backward():                  # d e^a / da = e^a
            self.grad += e * out.grad
        out._backward = _backward
        return out

    # convenience operators built from the ones above
    def __neg__(self):
        return self * -1

    def __sub__(self, other):
        return self + (-other)

    def __truediv__(self, other):
        return self * (other ** -1 if isinstance(other, Value) else 1.0 / other)

    def __radd__(self, other):           # makes 3 + Value work, and sum() of Values
        return self + other

    def __rmul__(self, other):
        return self * other

    def __rsub__(self, other):
        return Value(other) - self

    # --- the backward pass ---
    def backward(self):
        # 1. Topological order: every Value comes after all the Values it was computed from.
        order, visited = [], set()

        def build(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build(child)
                order.append(v)
        build(self)
        # 2. Seed the output gradient and apply the chain rule from the end to the start.
        self.grad = 1.0
        for v in reversed(order):
            v._backward()


# %% 2. A tiny expression, checked against numerical derivatives
def expression(a_val, b_val, c_val):
    a, b, c = Value(a_val), Value(b_val), Value(c_val)
    e = a * b
    d = e + c
    L = (d * d).tanh() * -2.0 + a           # a appears twice: its gradients will add up
    return L, (a, b, c)


L, (a, b, c) = expression(0.5, -1.5, 1.0)
L.backward()
print("autograd:  ", "dL/da", round(a.grad, 6), "| dL/db", round(b.grad, 6), "| dL/dc", round(c.grad, 6))
h = 1e-6
base = expression(0.5, -1.5, 1.0)[0].data
numeric = [(expression(0.5 + h, -1.5, 1.0)[0].data - base) / h,
           (expression(0.5, -1.5 + h, 1.0)[0].data - base) / h,
           (expression(0.5, -1.5, 1.0 + h)[0].data - base) / h]
print("numerical: ", "dL/da", round(numeric[0], 6), "| dL/db", round(numeric[1], 6), "| dL/dc", round(numeric[2], 6))


# %% 3. Neurons, layers and an MLP built from Values
random.seed(0)


class Neuron:
    def __init__(self, n_inputs, activation="tanh"):
        self.w = [Value(random.uniform(-1, 1)) for _ in range(n_inputs)]
        self.b = Value(0.0)
        self.activation = activation

    def __call__(self, x):
        z = sum((wi * xi for wi, xi in zip(self.w, x)), self.b)     # w . x + b
        if self.activation == "tanh":
            return z.tanh()
        if self.activation == "relu":
            return z.relu()
        return z                                                    # linear

    def parameters(self):
        return self.w + [self.b]


class Layer:
    def __init__(self, n_inputs, n_outputs, activation):
        self.neurons = [Neuron(n_inputs, activation) for _ in range(n_outputs)]

    def __call__(self, x):
        out = [n(x) for n in self.neurons]
        return out[0] if len(out) == 1 else out

    def parameters(self):
        return [p for n in self.neurons for p in n.parameters()]


class MLP:
    def __init__(self, n_inputs, layer_sizes):
        sizes = [n_inputs] + layer_sizes
        self.layers = [Layer(sizes[i], sizes[i + 1], "tanh") for i in range(len(layer_sizes))]

    def __call__(self, x):
        for layer in self.layers:
            x = layer(x)
        return x

    def parameters(self):
        return [p for layer in self.layers for p in layer.parameters()]


# %% 4. XOR: impossible for a linear model, easy for a network
# Four corners, plus jittered copies so there is a little more data. Targets are -1 / +1.
corners = [([0, 0], -1.0), ([1, 1], -1.0), ([0, 1], 1.0), ([1, 0], 1.0)]
data = []
for (x1, x2), target in corners:
    for _ in range(5):
        data.append(([x1 + random.gauss(0, 0.05), x2 + random.gauss(0, 0.05)], target))


def train(model, steps, lr, label):
    params = model.parameters()
    for step in range(steps + 1):
        predictions = [model(x) for x, _ in data]
        loss = sum((p - t) ** 2 for p, (_, t) in zip(predictions, data)) / len(data)   # MSE
        for p in params:
            p.grad = 0.0                   # ZERO the old gradients first (forgetting this is a classic bug)
        loss.backward()
        for p in params:
            p.data -= lr * p.grad          # gradient descent step
        if step % (steps // 4) == 0:
            print(f"  {label} step {step:>4}: loss {loss.data:.4f}")
    return model


print("\nlinear model (one tanh neuron, no hidden layer):")
linear = train(MLP(2, [1]), steps=400, lr=0.1, label="linear")
print("network with a hidden layer of 4 neurons:")
net = train(MLP(2, [4, 1]), steps=400, lr=0.1, label="MLP   ")

print("\npredictions on the four corners (target -1, -1, +1, +1):")
for (x, target) in corners:
    print(f"  input {x}: linear {linear(x).data:+.2f}   MLP {net(x).data:+.2f}   target {target:+.0f}")
print(f"\nthe MLP has {len(net.parameters())} parameters, each one a Value with its own gradient")
# The linear model is stuck around a loss of 1: it cannot bend its boundary. The MLP's hidden
# neurons each learn a line, and the output neuron combines them into an XOR shape.

# %% What PyTorch adds on top of this
# - Tensors: one Value-like object holds a whole array, so operations run as fast C/CUDA
#   kernels instead of millions of Python objects.
# - Hundreds of operations with backward rules already written.
# - GPUs, optimizers, data loaders, mixed precision, distributed training.
# The core idea, a graph of operations with local backward rules, is exactly what you just built.

# %% Your turn
# 1. Remove the "p.grad = 0.0" line. What happens to training and why?
# 2. Add a sigmoid() method to Value (derivative: s * (1 - s)) and check it numerically.
# 3. Change the hidden layer to 2 neurons. Can it still solve XOR? Try different random seeds.
