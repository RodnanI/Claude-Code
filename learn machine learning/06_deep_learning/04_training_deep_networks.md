# Training Deep Networks

The training loop is easy to learn, but getting a deep network to train well takes practice. This file covers the techniques that made deep learning stable enough to train LLMs on trillions of tokens. Run `05_optimizers_lab.py` alongside it.

## 1. Optimizers

| Optimizer | Idea | When |
|-----------|------|------|
| SGD | `w -= lr * grad` | baseline; still used for some vision models, often with momentum |
| SGD + momentum | keep a running average of gradients (a velocity) and step along it. Speeds up along consistent directions, damps zig-zags | classic computer vision training |
| RMSProp | divide each parameter's step by a running average of its squared gradients: big for rarely-moving parameters, small for jumpy ones | older RNN work, RL |
| Adam | momentum + RMSProp + bias correction | the default for almost everything since 2015 |
| AdamW | Adam with weight decay applied correctly (decoupled from the gradient) | the default for transformers and LLMs |

Adam's update for each parameter:

```
m = beta1 * m + (1 - beta1) * grad          # momentum: average gradient (beta1 ~ 0.9)
v = beta2 * v + (1 - beta2) * grad^2        # average squared gradient (beta2 ~ 0.999, LLMs often 0.95)
m_hat, v_hat = m / (1 - beta1^t), v / (1 - beta2^t)   # bias correction for the first steps
w -= lr * m_hat / (sqrt(v_hat) + eps)
```

Memory cost matters at scale: Adam stores two extra numbers (m and v) per parameter. For a 7-billion-parameter model that is 14 billion extra numbers, which is part of why training needs far more GPU memory than inference.

New optimizers (Lion, Sophia, Shampoo, Muon and others) keep appearing, but AdamW remains the safe default. Switching optimizers will not fix a bug.

## 2. Learning rate

If you can tune only one thing, tune the learning rate. Try values spaced by factors of about 3: 1e-2, 3e-3, 1e-3, 3e-4, 1e-4.

For Adam or AdamW, `1e-3` is a typical start for small networks and `3e-4` is a well-known safe default. Use `1e-5` to `1e-4` when fine-tuning pretrained transformers, since big pretrained models need small steps or they forget what they know.

### Schedules

The learning rate usually changes during training:

Warmup starts near zero and increases linearly over the first few hundred or thousand steps. Early gradients are erratic because the weights are random, and warmup avoids an early blow-up. It is standard for transformers. Decay shrinks the learning rate later so the model settles into a minimum; cosine decay is the common shape, and step and linear decay also exist. Warmup followed by cosine decay is the typical LLM schedule, and the lab plots it.

## 3. Batch size

Larger batches give smoother gradient estimates and better hardware use, up to a point. Smaller batches add noise that can help generalization and need less memory. When you raise the batch size you usually raise the learning rate too, roughly linearly for SGD and more gently for Adam. If a big batch does not fit in memory, gradient accumulation runs several small batches, adds up their gradients and then takes one step, which is the same math with less memory.

## 4. Initialization

Weights start random, but the scale matters. Too large and activations explode through the layers; too small and they shrink to nothing. Standard recipes keep the variance of activations roughly constant from layer to layer:

- Xavier/Glorot: variance `1 / fan_in` (or `2 / (fan_in + fan_out)`), for tanh/sigmoid.
- He/Kaiming: variance `2 / fan_in`, for ReLU.

PyTorch layers use sensible defaults. You mainly need to know this exists, for the day you build an unusual architecture or see activations blow up.

## 5. Vanishing and exploding gradients

Backprop multiplies many local derivatives together. Through dozens of layers, the product can shrink toward 0 (**vanishing**: early layers stop learning) or blow up (**exploding**: loss becomes NaN).

The fixes, roughly in historical order, are ReLU instead of sigmoid or tanh in hidden layers, good initialization, normalization layers (next section), residual connections and gradient clipping. A residual connection computes `output = x + layer(x)`, and the `x +` gives gradients a direct path back through the network. That one change made networks of 100+ layers trainable (ResNet, 2015), and every transformer uses it. Gradient clipping scales the gradient down when its norm exceeds a threshold, often 1.0, and is standard in LLM training.

## 6. Normalization layers

These layers keep the scale of activations under control. BatchNorm normalizes each feature across the batch and is common in vision CNNs; it behaves differently in training and evaluation, which causes bugs, so call `model.eval()`. LayerNorm normalizes across the features of each single example, does not depend on the batch and is standard in transformers. RMSNorm is a simpler LayerNorm without mean subtraction and appears in most modern LLMs.

## 7. Regularization for neural networks

Weight decay is L2-like and set through AdamW's `weight_decay`, often 0.01 to 0.1. Dropout randomly zeroes a fraction of activations during training, say 10%, so the network cannot rely on any single path, and it is switched off at evaluation (`model.eval()`). It is common in smaller models, while many large LLMs use little or none because they see each example about once. Early stopping keeps the checkpoint with the best validation loss. Data augmentation uses random crops, flips and color changes for images, noise for audio and paraphrases for text. Label smoothing trains toward 0.9/0.1 instead of 1/0 targets to reduce overconfidence.

## 8. Mixed precision

Training in 32-bit floats is safe but slow and memory-hungry. Modern training uses 16-bit formats (**bf16** on recent GPUs, or fp16 with loss scaling) for most math, keeping a 32-bit copy of weights where precision matters. This is nearly twice as fast and uses half the memory for activations. In PyTorch: `torch.autocast`. LLM inference goes further with 8-bit and 4-bit weights (module 7, quantization).

## 9. Reading loss curves

| What you see | Likely cause | Try |
|--------------|-------------|-----|
| loss flat from the start | learning rate far too low, bug in data/labels, gradients not flowing | raise lr, check labels, check `requires_grad`, check `optimizer.step()` is called |
| loss NaN or explodes | learning rate too high, log(0), bad data | lower lr, gradient clipping, check inputs for NaN/inf |
| training loss falls, validation rises | overfitting | regularize, more data, early stopping |
| both fall slowly and stay high | underfitting, model too small, lr too low | bigger model, higher lr, train longer |
| loss very noisy | batch too small, lr too high | bigger batch, lower lr |
| sudden spikes in a long run | bad batches, instability | clipping, lower lr, skip bad data (LLM teams fight these constantly) |

## 10. Debugging recipe

Andrej Karpathy's "A Recipe for Training Neural Networks" is worth reading in full. Its core steps:

1. Look at your data: examples, labels and their distribution. Most bugs are data bugs.
2. Check the loss at initialization. For K balanced classes the initial cross-entropy should be about `ln(K)`, which is 2.30 for 10 classes. A value of 50 means the initialization or outputs are wrong.
3. Overfit one tiny batch. A correct network can memorize 10 examples to near-zero loss, and if yours cannot there is a bug. Tune nothing until this works.
4. Start simple and add one piece at a time, checking that each helps.
5. Fix the random seed while debugging so results are comparable.
6. Plot loss curves, predictions on examples and the worst errors.
7. Change one thing at a time and keep notes, or use an experiment tracker (module 8).

## 11. Checkpoints and resuming

Save regularly: model weights, optimizer state (Adam's m and v), learning rate scheduler state, step count and random number generator state. Long runs crash, and resuming without the optimizer state gives a different training run.

## Questions

1. Why does Adam need more memory than SGD?
2. What problem does learning rate warmup solve?
3. A 50-layer network without residual connections does not train. Explain why in terms of gradients.
4. Your 10-class classifier starts with a loss of 2.30. Is that good or bad news? What about 14.7?
5. What changes when you call `model.eval()`, and why does it matter for dropout and BatchNorm?
