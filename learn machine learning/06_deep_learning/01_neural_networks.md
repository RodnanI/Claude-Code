# Neural Networks from the Ground Up

Deep learning powers image recognition, speech, translation and LLMs. A neural network is a large function made of simple pieces, trained with the same gradient descent you used for linear regression. This file explains the pieces and the labs build them.

## 1. A neuron is logistic regression

You already built one:

```
z = w1*x1 + w2*x2 + ... + b      (a weighted sum: a dot product plus a bias)
a = activation(z)                  (a non-linear squashing function)
```

With a sigmoid activation, this single neuron is logistic regression. The weights set what the neuron responds to, the bias shifts its threshold, and the activation sets how strongly it fires.

## 2. Why one neuron is not enough

A single neuron draws a straight boundary, and many problems are not straight. The classic example is XOR: points at (0,0) and (1,1) are class A, points at (0,1) and (1,0) are class B. No straight line separates them. `02_autograd_from_scratch.py` shows a linear model failing on it and a small network solving it.

The fix is to arrange neurons in layers and feed each layer's outputs into the next. The first layer computes simple features, the next combines them, and so on.

## 3. Activation functions

Without a non-linear activation, stacking layers gains nothing:

```
layer 2(layer 1(x)) = W2 (W1 x) = (W2 W1) x = W x
```

Two linear layers collapse into one, so the non-linearity between layers is what lets depth produce new kinds of functions.

| Activation | Formula | Notes |
|------------|---------|-------|
| sigmoid | `1 / (1 + e^-z)` | squashes to (0, 1). Used for binary outputs and gates. Bad in hidden layers: gradients vanish when saturated |
| tanh | `(e^z - e^-z) / (e^z + e^-z)` | squashes to (-1, 1). Zero-centered. Older networks, RNNs |
| ReLU | `max(0, z)` | the default for most hidden layers since about 2012. Cheap, gradients do not vanish for positive inputs. Neurons can "die" (stuck at 0) |
| Leaky ReLU | `max(0.01z, z)` | fixes dying ReLUs |
| GELU | smooth ReLU-like curve | standard in transformers (BERT, GPT-2/3) |
| SiLU / Swish | `z * sigmoid(z)` | used in many modern LLMs (inside SwiGLU) |
| softmax | `e^zi / sum e^zj` | output layer for multi-class: turns scores into probabilities |

## 4. The multilayer perceptron (MLP)

The basic network is also called a fully connected, dense or feed-forward network:

```
input x            shape (batch, 2)
h1 = relu(x  @ W1 + b1)    W1: (2, 64)    -> (batch, 64)
h2 = relu(h1 @ W2 + b2)    W2: (64, 64)   -> (batch, 64)
out =     h2 @ W3 + b3     W3: (64, 3)    -> (batch, 3)   logits for 3 classes
```

A layer is one matrix multiply plus an activation (`nn.Linear` in PyTorch), and a hidden layer is any layer between input and output. Width is the number of neurons per layer (64 above) and depth is the number of layers. The hidden units, or activations, are the values `h1` and `h2`, which form the network's internal representation. Logits are the raw outputs before softmax or sigmoid.

### Counting parameters

A linear layer from `n_in` to `n_out` has `n_in * n_out` weights plus `n_out` biases. The network above: `2*64+64 + 64*64+64 + 64*3+3 = 4,611` parameters. GPT-2 small has 124 million, and large modern LLMs have hundreds of billions, counted the same way.

## 5. Output layers and losses

| Task | Output layer | Loss | PyTorch |
|------|--------------|------|---------|
| regression | 1 linear unit (no activation) | mean squared error | `nn.MSELoss` |
| binary classification | 1 unit, sigmoid | binary cross-entropy | `nn.BCEWithLogitsLoss` (takes logits!) |
| multi-class (one label) | K units, softmax | cross-entropy | `nn.CrossEntropyLoss` (takes logits!) |
| multi-label | K units, sigmoid each | binary cross-entropy per label | `nn.BCEWithLogitsLoss` |

A common beginner bug is applying softmax yourself and then using `nn.CrossEntropyLoss`, which applies log-softmax internally. Give it raw logits. The "with logits" versions are also more numerically stable.

## 6. The training loop

```
for each epoch:
    for each mini-batch (x, y):
        predictions = model(x)              # forward pass
        loss = loss_fn(predictions, y)      # how wrong
        gradients = d loss / d every weight # backward pass (backpropagation)
        weights -= learning_rate * gradients  (or a smarter optimizer, like Adam)
```

Linear regression, the MLP in the lab and GPT are all trained by this loop. Only the model, data, loss, optimizer and scale differ.

## 7. Backpropagation

The network is a chain of simple operations: multiply, add, ReLU, softmax, log. Each knows its own local derivative, meaning how its output changes when its input changes.

The chain rule says the gradient of the loss with respect to any value equals the gradient of the loss with respect to that value's output, times the local derivative. So you work backwards from the loss. The gradient of the loss with respect to itself is 1. Each operation takes the gradient arriving from above (the upstream gradient), multiplies it by its local derivative and passes the result to its inputs. When a value feeds several operations, the gradients from each are added.

One backward sweep gives every weight its gradient and costs roughly two forward passes. Without it, you would need a forward pass for every parameter, and networks with billions of parameters could not be trained.

Autograd (automatic differentiation) is a library that records the operations during the forward pass, building a computational graph, and runs this backward sweep for you. `02_autograd_from_scratch.py` builds a small version in about 100 lines, and PyTorch's autograd works the same way.

## 8. Representation learning

Classical ML needs humans to design features, while deep networks learn their own. In an image network, early layers learn edges and colors, middle layers learn textures and parts, and late layers learn objects. In a language model, early layers capture spelling and syntax and later layers capture meaning, facts and relationships. This is the main reason deep learning won on images, audio and text.

The universal approximation theorem says a network with one hidden layer can approximate any continuous function given enough neurons. That is true, but "enough" can be astronomically many. Depth represents complicated functions far more efficiently by reusing intermediate features.

## 9. Why GPUs

Training is mostly giant matrix multiplications. A CPU has a few strong cores, while a GPU has thousands of simple ones that do many multiply-adds in parallel, which often makes it 10 to 100 times faster for deep learning. Big models also need GPU memory for weights, gradients, optimizer state and activations, which is why memory size and price dominate talk about LLMs.

## 10. Vocabulary

Make sure you can define each of these: neuron, weight, bias, activation function, ReLU, logits, softmax, hidden layer, MLP, parameter count, forward pass, loss, backward pass, backpropagation, gradient, computational graph, autograd, optimizer, learning rate, epoch, batch, iteration, representation learning.

## Questions

1. Why does a network without activation functions collapse into a linear model?
2. Count the parameters of an MLP with layers 784 -> 256 -> 128 -> 10.
3. You apply softmax to your outputs and then use `nn.CrossEntropyLoss`. What is wrong?
4. In backpropagation, what happens to the gradient of a value that is used in two places?
