# Neural Networks from the Ground Up

Deep learning is the technology behind image recognition, speech, translation and LLMs. It sounds mystical. It is not. A neural network is a big function made of simple pieces, trained with the same gradient descent you already used for linear regression. This file explains the pieces. The labs build them.

## 1. A neuron is logistic regression

You already built one:

```
z = w1*x1 + w2*x2 + ... + b      (a weighted sum: a dot product plus a bias)
a = activation(z)                  (a non-linear squashing function)
```

With a sigmoid activation, this single neuron *is* logistic regression. The weights say what the neuron cares about, the bias shifts its threshold, the activation decides how strongly it "fires".

## 2. Why one neuron is not enough

A single neuron draws a straight boundary. Many problems are not straight. The classic example is **XOR**: points at (0,0) and (1,1) are class A, points at (0,1) and (1,0) are class B. No straight line separates them. `02_autograd_from_scratch.py` shows a linear model failing on it and a small network solving it.

The fix: put neurons in **layers**, and feed the outputs of one layer into the next. The first layer computes simple features, the next combines them, and so on.

## 3. Why the activation function is essential

Without a non-linear activation, stacking layers is pointless:

```
layer 2(layer 1(x)) = W2 (W1 x) = (W2 W1) x = W x
```

Two linear layers collapse into one linear layer. The non-linearity between layers is what lets depth create new kinds of functions.

| Activation | Formula | Notes |
|------------|---------|-------|
| sigmoid | `1 / (1 + e^-z)` | squashes to (0, 1). Used for binary outputs and gates. Bad in hidden layers: gradients vanish when saturated |
| tanh | `(e^z - e^-z) / (e^z + e^-z)` | squashes to (-1, 1). Zero-centered. Older networks, RNNs |
| **ReLU** | `max(0, z)` | the default for most hidden layers since about 2012. Cheap, gradients do not vanish for positive inputs. Neurons can "die" (stuck at 0) |
| Leaky ReLU | `max(0.01z, z)` | fixes dying ReLUs |
| **GELU** | smooth ReLU-like curve | standard in transformers (BERT, GPT-2/3) |
| SiLU / Swish | `z * sigmoid(z)` | used in many modern LLMs (inside SwiGLU) |
| softmax | `e^zi / sum e^zj` | output layer for multi-class: turns scores into probabilities |

## 4. The multilayer perceptron (MLP)

The basic network, also called a fully connected or dense network, or a feed-forward network:

```
input x            shape (batch, 2)
h1 = relu(x  @ W1 + b1)    W1: (2, 64)    -> (batch, 64)
h2 = relu(h1 @ W2 + b2)    W2: (64, 64)   -> (batch, 64)
out =     h2 @ W3 + b3     W3: (64, 3)    -> (batch, 3)   logits for 3 classes
```

Vocabulary:

- **Layer**: one matrix multiply plus activation. `nn.Linear` in PyTorch.
- **Hidden layer**: any layer between input and output.
- **Width**: neurons per layer (64 above). **Depth**: number of layers.
- **Hidden units / activations**: the values `h1`, `h2`. The network's internal representation.
- **Logits**: the raw outputs before softmax or sigmoid.

### Counting parameters

A linear layer from `n_in` to `n_out` has `n_in * n_out` weights plus `n_out` biases. The network above: `2*64+64 + 64*64+64 + 64*3+3 = 4,611` parameters. GPT-2 small has 124 million. Large modern LLMs have hundreds of billions. Same arithmetic.

## 5. Output layers and losses: match them correctly

| Task | Output layer | Loss | PyTorch |
|------|--------------|------|---------|
| regression | 1 linear unit (no activation) | mean squared error | `nn.MSELoss` |
| binary classification | 1 unit, sigmoid | binary cross-entropy | `nn.BCEWithLogitsLoss` (takes logits!) |
| multi-class (one label) | K units, softmax | cross-entropy | `nn.CrossEntropyLoss` (takes logits!) |
| multi-label | K units, sigmoid each | binary cross-entropy per label | `nn.BCEWithLogitsLoss` |

Classic beginner bug: applying softmax yourself and then using `nn.CrossEntropyLoss`, which applies log-softmax again internally. Feed it raw logits. The "with logits" versions are also more numerically stable.

## 6. Training: the loop that runs the world

```
for each epoch:
    for each mini-batch (x, y):
        predictions = model(x)              # forward pass
        loss = loss_fn(predictions, y)      # how wrong
        gradients = d loss / d every weight # backward pass (backpropagation)
        weights -= learning_rate * gradients  (or a smarter optimizer, like Adam)
```

Linear regression, the MLP in the lab, and GPT are all trained by this loop. What changes is the model, the data, the loss, the optimizer and the scale.

## 7. Backpropagation, in plain words

The network is a chain of simple operations: multiply, add, ReLU, softmax, log. Each operation knows its own **local derivative** (how its output changes when its input changes).

The **chain rule** says: the gradient of the loss with respect to any value = (gradient of the loss with respect to that value's output) times (local derivative).

So you go **backwards** from the loss:

1. The gradient of the loss with respect to itself is 1.
2. Each operation receives the gradient from above ("upstream gradient"), multiplies by its local derivative, and passes the result down to its inputs.
3. When a value feeds into several operations, its gradients from each are **added up**.

Every weight ends up with its gradient after a single backward sweep, which costs roughly two forward passes. That efficiency is why we can train networks with billions of parameters. Without it, you would need one forward pass per parameter.

**Autograd** (automatic differentiation) is a library that records the operations as you compute the forward pass (building a **computational graph**) and runs this backward sweep for you. PyTorch's autograd is exactly this. `02_autograd_from_scratch.py` builds a tiny version in about 100 lines, and after that PyTorch will never feel like magic again.

## 8. Why depth works: representation learning

Classical ML needs humans to design features. Deep networks **learn their own features**:

- In an image network, early layers learn edges and colors, middle layers learn textures and parts, late layers learn objects.
- In a language model, early layers capture spelling and syntax, later layers capture meaning, facts and relationships.

This is the single biggest reason deep learning won on images, audio and text: the features are learned from data instead of designed by hand.

The **universal approximation theorem** says a network with just one hidden layer can approximate any continuous function, given enough neurons. True but misleading: "enough" can be astronomically many. Depth lets networks represent complicated functions far more efficiently by reusing intermediate features.

## 9. Why GPUs

Training is mostly giant matrix multiplications. A CPU has a few strong cores. A GPU has thousands of simple cores that do many multiply-adds in parallel. For deep learning, GPUs are often 10 to 100 times faster. Big models also need GPU memory to hold weights, gradients, optimizer state and activations, which is why GPU memory size (and price) dominates conversations about LLMs.

## 10. Vocabulary check

You should be able to define each: neuron, weight, bias, activation function, ReLU, logits, softmax, hidden layer, MLP, parameter count, forward pass, loss, backward pass, backpropagation, gradient, computational graph, autograd, optimizer, learning rate, epoch, batch, iteration, representation learning.

## Check yourself

1. Why does a network without activation functions collapse into a linear model?
2. Count the parameters of an MLP with layers 784 -> 256 -> 128 -> 10.
3. You apply softmax to your outputs and then use `nn.CrossEntropyLoss`. What is wrong?
4. In backpropagation, what happens to the gradient of a value that is used in two places?
