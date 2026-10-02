# Training Deep Networks: What Actually Makes It Work

Knowing the training loop is easy. Getting a deep network to train *well* is a craft. This file covers the tools that turned deep learning from "unstable research toy" into something that trains trillion-token LLMs. Run `05_optimizers_lab.py` alongside.

## 1. Optimizers: smarter steps than plain gradient descent

| Optimizer | Idea | When |
|-----------|------|------|
| SGD | `w -= lr * grad` | baseline; still used for some vision models, often with momentum |
| SGD + momentum | keep a running average of gradients (a velocity) and step along it. Speeds up along consistent directions, damps zig-zags | classic computer vision training |
| RMSProp | divide each parameter's step by a running average of its squared gradients: big for rarely-moving parameters, small for jumpy ones | older RNN work, RL |
| **Adam** | momentum + RMSProp + bias correction | the default for almost everything since 2015 |
| **AdamW** | Adam with weight decay applied correctly (decoupled from the gradient) | the default for transformers and LLMs |

Adam's update for each parameter:

```
m = beta1 * m + (1 - beta1) * grad          # momentum: average gradient (beta1 ~ 0.9)
v = beta2 * v + (1 - beta2) * grad^2        # average squared gradient (beta2 ~ 0.999, LLMs often 0.95)
m_hat, v_hat = m / (1 - beta1^t), v / (1 - beta2^t)   # bias correction for the first steps
w -= lr * m_hat / (sqrt(v_hat) + eps)
```

Memory cost matters at scale: Adam stores two extra numbers (m and v) per parameter. For a 7-billion-parameter model that is 14 billion extra numbers, which is part of why training needs far more GPU memory than inference.

Newer optimizers (Lion, Sophia, Shampoo, Muon and others) keep appearing. AdamW remains the safe default. Do not switch optimizers to fix a bug.

## 2. Learning rate: the hyperparameter that matters most

If you can tune only one thing, tune the learning rate. Try values spaced by factors of about 3: 1e-2, 3e-3, 1e-3, 3e-4, 1e-4.

Typical starting points: Adam/AdamW `1e-3` for small networks, `3e-4` is a famous safe default, `1e-5` to `1e-4` for fine-tuning pretrained transformers (big pretrained models need small steps or they forget what they know).

### Schedules

The learning rate usually changes during training:

- **Warmup**: start near zero and increase linearly over the first few hundred or thousand steps. Early gradients are wild because the weights are random; warmup prevents an early blow-up. Standard for transformers.
- **Decay**: shrink the learning rate later so the model settles into a minimum. Cosine decay is the common shape; step decay and linear decay also exist.
- "Warmup then cosine decay" is the typical LLM schedule. The lab plots it.

## 3. Batch size

- Larger batches give smoother gradient estimates and better hardware use, up to a point.
- Smaller batches add noise that can help generalization, and need less memory.
- When you scale batch size up, you usually scale the learning rate up too (roughly linearly for SGD, more gently for Adam).
- **Gradient accumulation**: if a big batch does not fit in memory, run several small batches, add up their gradients, then take one step. Same math, less memory.

## 4. Initialization

Weights start random, but the scale matters. Too large and activations explode through the layers; too small and they shrink to nothing. Standard recipes keep the variance of activations roughly constant from layer to layer:

- **Xavier/Glorot**: variance `1 / fan_in` (or `2 / (fan_in + fan_out)`), for tanh/sigmoid.
- **He/Kaiming**: variance `2 / fan_in`, for ReLU.

PyTorch layers use sensible defaults. You mostly need to know this exists and why, for when you build unusual architectures or see activations blow up.

## 5. Vanishing and exploding gradients

Backprop multiplies many local derivatives together. Through dozens of layers, the product can shrink toward 0 (**vanishing**: early layers stop learning) or blow up (**exploding**: loss becomes NaN).

Fixes, roughly in historical order:

- ReLU instead of sigmoid/tanh in hidden layers.
- Good initialization.
- **Normalization layers** (next section).
- **Residual connections**: `output = x + layer(x)`. The `x +` gives gradients a direct highway back through the network. This one idea made 100+ layer networks trainable (ResNet, 2015), and every transformer uses it.
- **Gradient clipping**: if the gradient norm exceeds a threshold (often 1.0), scale it down. Standard in LLM training.

## 6. Normalization layers

They keep the scale of activations under control:

- **BatchNorm**: normalizes each feature across the batch. Big in computer vision CNNs. Behaves differently in training and evaluation, which is a source of bugs (call `model.eval()`).
- **LayerNorm**: normalizes across the features of each single example. No dependence on batch. The standard in transformers.
- **RMSNorm**: a simpler LayerNorm (no mean subtraction). Used in most modern LLMs.

## 7. Regularization for neural networks

- **Weight decay** (L2-like): AdamW's `weight_decay`, often 0.01 to 0.1.
- **Dropout**: during training, randomly zero a fraction (say 10%) of activations so the network cannot rely on any single path. Turned off at evaluation time (`model.eval()`). Common in smaller models; many large LLMs use little or none because they see each example roughly once and overfitting is less of an issue.
- **Early stopping**: keep the checkpoint with the best validation loss.
- **Data augmentation**: random crops, flips and color changes for images; noise for audio; paraphrases for text.
- **Label smoothing**: train toward 0.9/0.1 instead of 1/0 targets to reduce overconfidence.

## 8. Mixed precision

Training in 32-bit floats is safe but slow and memory-hungry. Modern training uses 16-bit formats (**bf16** on recent GPUs, or fp16 with loss scaling) for most math, keeping a 32-bit copy of weights where precision matters. Nearly twice as fast and half the memory for activations. In PyTorch: `torch.autocast`. LLM inference goes further with 8-bit and 4-bit weights (module 7, quantization).

## 9. Reading loss curves

| What you see | Likely cause | Try |
|--------------|-------------|-----|
| loss flat from the start | learning rate far too low, bug in data/labels, gradients not flowing | raise lr, check labels, check `requires_grad`, check `optimizer.step()` is called |
| loss NaN or explodes | learning rate too high, log(0), bad data | lower lr, gradient clipping, check inputs for NaN/inf |
| training loss falls, validation rises | overfitting | regularize, more data, early stopping |
| both fall slowly and stay high | underfitting, model too small, lr too low | bigger model, higher lr, train longer |
| loss very noisy | batch too small, lr too high | bigger batch, lower lr |
| sudden spikes in a long run | bad batches, instability | clipping, lower lr, skip bad data (LLM teams fight these constantly) |

## 10. The debugging recipe (do this every time)

Andrej Karpathy's "A Recipe for Training Neural Networks" is worth reading in full. The core:

1. **Look at your data.** Actually look at examples, labels and their distribution. Most bugs are data bugs.
2. **Check the loss at initialization.** For K balanced classes, the initial cross-entropy should be about `ln(K)` (2.30 for 10 classes). If it is 50, your initialization or outputs are wrong.
3. **Overfit one tiny batch.** A correct network can memorize 10 examples to near-zero loss. If it cannot, there is a bug. Do not tune anything until this works.
4. **Start simple**, then add complexity one piece at a time, checking that each piece helps.
5. **Fix the random seed** while debugging so results are comparable.
6. **Visualize**: loss curves, predictions on examples, the worst errors.
7. **Change one thing at a time** and keep notes (or use an experiment tracker, module 8).

## 11. Checkpoints and resuming

Save regularly: model weights, optimizer state (Adam's m and v), learning rate scheduler state, step count and random number generator state. Long runs crash. Resuming without the optimizer state is not the same training run.

## Check yourself

1. Why does Adam need more memory than SGD?
2. What problem does learning rate warmup solve?
3. A 50-layer network without residual connections does not train. Explain why in terms of gradients.
4. Your 10-class classifier starts with a loss of 2.30. Is that good or bad news? What about 14.7?
5. What changes when you call `model.eval()`, and why does it matter for dropout and BatchNorm?
