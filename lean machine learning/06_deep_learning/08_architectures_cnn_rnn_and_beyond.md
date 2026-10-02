# Architectures: CNNs, RNNs and the Road to Transformers

An **architecture** is the shape of a network: which layers, connected how. The right architecture builds useful assumptions into the model (called **inductive biases**), so it needs less data to learn. This file is the map from the MLP to the transformer. Module 7 then takes the transformer apart.

## 1. Convolutional neural networks (CNNs): for grids

Images have two properties an MLP ignores:

- **Locality**: nearby pixels matter together (an edge is a local pattern).
- **Translation invariance**: a cat is a cat in the corner or in the middle.

A **convolution** slides a small filter (say 3x3 weights) across the image and computes a dot product at every position. The output is a **feature map** showing where the pattern appears.

- **Weight sharing**: the same 3x3 filter is used everywhere, so a layer has very few weights compared with connecting every pixel to every neuron.
- **Channels**: a layer learns many filters at once (16, 64, 512...), each detecting a different pattern. Color images start with 3 channels (red, green, blue).
- **Stride** and **pooling** (max pooling takes the largest value in each small window) shrink the feature maps, so deeper layers see bigger regions of the image.
- **Hierarchy**: early filters find edges, later ones find textures, then parts, then objects.

Famous milestones: LeNet (1998, digits), **AlexNet (2012, the deep learning big bang on ImageNet)**, VGG, **ResNet (2015, residual connections, 100+ layers)**, EfficientNet.

Where CNNs are used today: still widely in production vision (fast, data-efficient), medical imaging, on-device models, and inside other systems. Since about 2020, **Vision Transformers (ViT)** compete with or beat CNNs at large scale, by cutting images into patches and treating patches like tokens.

## 2. Recurrent neural networks (RNNs): for sequences (historically)

Text, audio and time series are sequences. An **RNN** reads one element at a time and keeps a **hidden state**, a vector that summarizes everything seen so far:

```
h_t = tanh(W_x x_t + W_h h_(t-1) + b)
```

The same weights are reused at every time step. To train, you "unroll" the network through time and backpropagate through all the steps.

Problems:

- **Vanishing gradients through time**: information from 50 steps ago barely affects the gradient. Plain RNNs forget.
- **Sequential computation**: step t needs step t-1, so you cannot parallelize across the sequence. Training is slow on GPUs.

**LSTMs** (1997) and **GRUs** add learned **gates** that decide what to keep, forget and output, which lets information survive longer. LSTMs powered machine translation, speech recognition and early text generation through the mid 2010s.

Then **attention** arrived (2014-2015, added to RNN translators so the decoder could "look back" at any input word directly), and in 2017 the paper **"Attention Is All You Need"** threw out the recurrence entirely. That architecture, the **transformer**, is what every LLM is built on.

## 3. Transformers (preview)

A transformer processes all positions of a sequence **in parallel**. Each layer lets every token gather information from every other token through **self-attention**, then processes each token with an MLP. Residual connections and layer normalization keep deep stacks trainable.

Why it won:

- **Parallel**: whole sequences are processed at once, so GPUs are used efficiently. This is what made training on trillions of tokens feasible.
- **Direct long-range connections**: token 1 and token 1,000 interact in one step, not through 999 recurrent steps.
- **Scales predictably**: bigger models plus more data plus more compute gives reliably better results (scaling laws, module 7).

Its weakness: attention compares every token with every other, so cost grows with the square of the sequence length. Much current research (efficient attention, state space models such as Mamba, hybrid architectures) attacks this.

Module 7 builds attention and a full GPT from scratch.

## 4. Embeddings layers

An **embedding layer** is a lookup table: each discrete item (a word, a token, a user ID, a product ID) gets a learned vector. `nn.Embedding(num_items, dim)` is literally a matrix where row i is the vector for item i. It is mathematically the same as multiplying a one-hot vector by a weight matrix, just faster. Every LLM starts with one.

## 5. Autoencoders

A network trained to reconstruct its own input through a narrow **bottleneck**: an encoder compresses the input to a small vector, a decoder rebuilds it. The bottleneck vector is a learned compression. Uses: anomaly detection (things that reconstruct badly are unusual), denoising, and as the "latent space" inside image generators.

## 6. Generative models for images

- **GANs** (generative adversarial networks, 2014): a generator makes fake images, a discriminator tries to spot fakes, and they improve by competing. Produced the first photorealistic faces. Hard to train.
- **Diffusion models** (from about 2020): learn to remove noise from images step by step. To generate, start from pure noise and denoise repeatedly, guided by a text prompt. Behind Stable Diffusion, DALL-E 2 and later, Midjourney and most image and video generators. Often run in the compressed latent space of an autoencoder ("latent diffusion").

## 7. Transfer learning: the default way to use deep learning

Training a big network from scratch needs huge data and compute. Instead:

1. Take a model **pretrained** on a huge general dataset (ImageNet for images, web text for language).
2. Either use it as a frozen **feature extractor** (take its embeddings, train a small model on top), or **fine-tune** it: continue training on your task with a small learning rate.

With a few thousand labeled examples, a fine-tuned pretrained model usually crushes anything trained from scratch. Hugging Face hosts hundreds of thousands of pretrained models. At work, "build an image classifier" almost always means "fine-tune a pretrained one".

## 8. Multimodal models

Modern models combine modalities: text plus images (vision-language models that read screenshots, charts and photos), audio, video. A common recipe: an image encoder (a ViT) turns the image into a sequence of vectors, which are fed into an LLM as if they were tokens. CLIP (2021) learned a shared embedding space for images and text by training on image-caption pairs, which powers image search and guides image generators.

## 9. A timeline worth knowing (interviewers like history)

| Year | Milestone |
|------|-----------|
| 1958 | perceptron |
| 1986 | backpropagation popularized |
| 1997 | LSTM |
| 1998 | LeNet CNN reads digits |
| 2012 | AlexNet wins ImageNet: the deep learning era begins |
| 2013 | word2vec embeddings |
| 2014 | GANs; attention for translation; Adam optimizer |
| 2015 | ResNet; batch normalization |
| 2017 | transformer ("Attention Is All You Need") |
| 2018 | BERT and GPT-1: pretrain then fine-tune for language |
| 2020 | GPT-3 shows in-context learning at scale; scaling laws; diffusion models |
| 2022 | ChatGPT: instruction tuning and RLHF go mainstream |
| 2023-2024 | open-weight LLMs, multimodal models, long context, tool use |
| 2024-2026 | reasoning models trained with reinforcement learning, agents that use tools and computers |

## Check yourself

1. Why does a convolutional layer need far fewer weights than a fully connected layer on the same image?
2. Name the two main problems of RNNs that transformers solve.
3. What does `nn.Embedding(50000, 768)` contain, and how many parameters is that?
4. You need a classifier for 3,000 labeled product photos. Outline your approach.
