# Calculus and Gradient Descent

Training starts from random weights, measures how wrong the model is (the loss), and nudges every weight in the direction that reduces the loss. Calculus supplies that direction, which is why it appears here.

At work you will almost never differentiate by hand, because libraries do it. What you need is enough intuition to see what training is doing and why it sometimes fails.

Run `04_gradient_descent_lab.py` while reading.

## Derivatives

The derivative of `f(x)` at a point tells you how much f changes, and in which direction, when you nudge x a tiny bit.

```
f'(x) ~ (f(x + h) - f(x)) / h      for a tiny h, like 0.00001
```

- Positive derivative: increasing x increases f.
- Negative derivative: increasing x decreases f.
- Zero derivative: flat. This can be a minimum, a maximum or a plateau.

Example: `f(x) = x^2`. At x = 3 the derivative is 6. Nudge x up by 0.01 and f goes up by about 0.06.

## Common derivatives

| Function | Derivative | Where it shows up |
|----------|-----------|-------------------|
| `c` (constant) | `0` | biases in the loss |
| `x^n` | `n * x^(n-1)` | squared error |
| `e^x` | `e^x` | softmax |
| `ln(x)` | `1 / x` | log loss, cross-entropy |
| `sigmoid(x) = 1 / (1 + e^-x)` | `sigmoid(x) * (1 - sigmoid(x))` | logistic regression, gates |
| `tanh(x)` | `1 - tanh(x)^2` | older neural nets |
| `relu(x) = max(0, x)` | `1 if x > 0 else 0` | almost every modern network |

## Partial derivatives and the gradient

A model has many weights. The loss depends on all of them: `L(w1, w2, ..., wn)`.

The **partial derivative** `dL/dw1` is the sensitivity of the loss to `w1` while holding every other weight fixed.

The **gradient** is the vector of all partial derivatives:

```
grad L = [dL/dw1, dL/dw2, ..., dL/dwn]
```

The gradient points in the direction of steepest increase, so the negative gradient points downhill toward lower loss. An LLM with 70 billion parameters has a gradient of 70 billion numbers, one per parameter, computed at every training step.

## The chain rule

A neural network is a function nested inside other functions. The chain rule says how to differentiate such a nesting:

```
if y = f(g(x)), then dy/dx = f'(g(x)) * g'(x)
```

Rates multiply. If one gear turns 3 times for every turn of a second gear, and the second turns 2 times for each turn of a third, the first turns 6 times per turn of the third.

Worked example: `y = (3x + 1)^2`. Inner `g = 3x + 1`, outer `f = g^2`.

```
dy/dx = 2g * 3 = 6 * (3x + 1)
at x = 1:  6 * 4 = 24
```

Backpropagation is the chain rule applied backwards through a network, from the loss to every weight, reusing intermediate results to stay efficient. Module 6 builds it from scratch in about 100 lines.

## Gradient descent

```
repeat:
    gradient = compute dL/dw for every weight
    w = w - learning_rate * gradient
```

With refinements, this loop trains everything from linear regression to GPT.

### The learning rate

The learning rate is the size of each step, and it is the most important hyperparameter in deep learning.

| Learning rate | What happens |
|---------------|-------------|
| too small | training crawls, wastes compute, may look like it is not learning |
| about right | loss drops quickly and settles |
| too big | loss bounces around or oscillates |
| far too big | loss explodes to infinity or NaN |

The lab shows all four.

### Batch, mini-batch and stochastic

Computing the exact gradient needs the whole dataset, which is slow for big data. So in practice:

Batch gradient descent uses all the data for each gradient, which is accurate but slow per step. Stochastic gradient descent (SGD) uses one random example, which is noisy but fast. Mini-batch gradient descent uses a batch of, say, 32 to 4096 examples and is the standard, though people still call it SGD. The noise from mini-batches often helps the model escape bad regions and generalize better.

Three terms to know: a step (or iteration) is one weight update, the batch size is the number of examples per step, and an epoch is one full pass over the training data. With 10,000 examples and batch size 100, one epoch is 100 steps.

## Loss landscapes

Picture the loss as a landscape over all weights: hills and valleys in millions of dimensions. Training rolls a ball downhill.

Convex problems such as linear and logistic regression have a single valley, and gradient descent finds its bottom. Neural networks are non-convex, with many valleys, plateaus and saddle points. In high dimensions most valleys turn out to be about equally good, so training works better than theory once predicted.

## Why it still matters

When training fails at work, the cause is nearly always in the gradients:

- loss is NaN: the learning rate is too high, or you took the log of zero
- loss does not move: learning rate too low, gradients are zero (dead ReLUs, a detached graph), or a bug feeds the wrong data
- deep network does not train: vanishing or exploding gradients through many layers (fixed by residual connections, normalization and good initialization, see module 6)

Debugging any of these requires the picture described above.

## Questions

1. The derivative of the loss with respect to a weight is -4. Should you increase or decrease the weight? By roughly how much, with learning rate 0.1?
2. Use the chain rule to differentiate `sigmoid(2x)`.
3. Your loss goes 2.3, 1.9, 4.7, 31.0, inf. What do you change first?
4. You have 50,000 examples and use batch size 250. How many steps is 3 epochs?
