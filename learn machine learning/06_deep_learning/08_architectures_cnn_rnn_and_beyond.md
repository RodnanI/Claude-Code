# Architectures: CNNs, RNNs and Transformers

An architecture is the shape of a network, meaning which layers it has and how they connect. A good one builds useful assumptions into the model, called inductive biases, so the model needs less data. This file maps the path from the MLP to the transformer, and module 7 then takes the transformer apart.

## 1. Convolutional neural networks (CNNs)

Images have two properties an MLP ignores. Locality means nearby pixels matter together, since an edge is a local pattern. Translation invariance means a cat is a cat in the corner or the middle.

A convolution slides a small filter (say 3x3 weights) across the image and takes a dot product at every position. The output is a feature map showing where the pattern appears. The same filter is used everywhere (weight sharing), so a layer has far fewer weights than one connecting every pixel to every neuron. A layer learns many filters at once (16, 64, 512 and so on), each detecting a different pattern, and these are its channels; color images start with 3 (red, green, blue). Stride and pooling, where max pooling keeps the largest value in each small window, shrink the feature maps so deeper layers see larger regions. Early filters find edges, later ones find textures, then parts, then objects.

The milestones are LeNet (1998, digits), AlexNet (2012, the breakthrough on ImageNet), VGG, ResNet (2015, residual connections, 100+ layers) and EfficientNet.

CNNs are still widely used in production vision because they are fast and data-efficient, and also in medical imaging, on-device models and inside other systems. Since about 2020, Vision Transformers (ViT), which cut images into patches and treat the patches like tokens, compete with or beat CNNs at large scale.

## 2. Recurrent neural networks (RNNs)

Text, audio and time series are sequences. An RNN reads one element at a time and keeps a hidden state, a vector that summarizes everything seen so far:

```
h_t = tanh(W_x x_t + W_h h_(t-1) + b)
```

The same weights are reused at every time step. To train, you "unroll" the network through time and backpropagate through all the steps.

RNNs have two problems. Gradients vanish through time, so information from 50 steps ago barely affects them and plain RNNs forget. Computation is sequential, since step t needs step t-1, so the sequence cannot be parallelized and training is slow on GPUs.

LSTMs (1997) and GRUs add learned gates that decide what to keep, forget and output, which lets information last longer. LSTMs powered machine translation, speech recognition and early text generation through the mid 2010s.

Attention was then added to RNN translators in 2014 and 2015, letting the decoder look back at any input word directly. In 2017 the paper "Attention Is All You Need" dropped recurrence entirely. Its architecture, the transformer, underlies every LLM.

## 3. Transformers (preview)

A transformer processes all positions of a sequence in parallel. In each layer every token gathers information from every other token through self-attention, and then an MLP processes each token. Residual connections and layer normalization keep deep stacks trainable.

It won for three reasons. Whole sequences are processed at once, so GPUs are used efficiently, which made training on trillions of tokens feasible. Token 1 and token 1,000 interact in one step instead of through 999 recurrent steps. And bigger models with more data and compute give reliably better results (scaling laws, module 7).

Its weakness is that attention compares every token with every other, so cost grows with the square of the sequence length. Efficient attention, state space models such as Mamba and hybrid architectures are all attempts to fix this.

Module 7 builds attention and a full GPT from scratch.

## 4. Embedding layers

An embedding layer is a lookup table: each discrete item (a word, a token, a user ID, a product ID) gets a learned vector. `nn.Embedding(num_items, dim)` is literally a matrix where row i is the vector for item i. It is mathematically the same as multiplying a one-hot vector by a weight matrix, just faster. Every LLM starts with one.

## 5. Autoencoders

An autoencoder is trained to reconstruct its own input through a narrow bottleneck: an encoder compresses the input to a small vector and a decoder rebuilds it. The bottleneck vector is a learned compression. Autoencoders are used for anomaly detection, since inputs that reconstruct badly are unusual, for denoising, and as the latent space inside image generators.

## 6. Generative models for images

GANs (generative adversarial networks, 2014) pair a generator that makes fake images with a discriminator that tries to spot them, and the two improve by competing. They produced the first photorealistic faces but are hard to train. Diffusion models (from about 2020) learn to remove noise from images step by step. To generate, you start from pure noise and denoise repeatedly, guided by a text prompt. They sit behind Stable Diffusion, DALL-E 2 and later versions, Midjourney and most image and video generators, and often run in the compressed latent space of an autoencoder, which is called latent diffusion.

## 7. Transfer learning

Training a big network from scratch needs huge data and compute, so the usual approach is to take a model pretrained on a large general dataset (ImageNet for images, web text for language). You can use it as a frozen feature extractor, taking its embeddings and training a small model on top, or fine-tune it by continuing training on your task with a small learning rate.

With a few thousand labeled examples, a fine-tuned pretrained model usually beats anything trained from scratch. Hugging Face hosts hundreds of thousands of pretrained models, and at work "build an image classifier" almost always means fine-tuning a pretrained one.

## 8. Multimodal models

Modern models combine modalities: text plus images (vision-language models that read screenshots, charts and photos), audio, video. A common recipe: an image encoder (a ViT) turns the image into a sequence of vectors, which are fed into an LLM as if they were tokens. CLIP (2021) learned a shared embedding space for images and text by training on image-caption pairs, which powers image search and guides image generators.

## 9. Timeline

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

## Questions

1. Why does a convolutional layer need far fewer weights than a fully connected layer on the same image?
2. Name the two main problems of RNNs that transformers solve.
3. What does `nn.Embedding(50000, 768)` contain, and how many parameters is that?
4. You need a classifier for 3,000 labeled product photos. Outline your approach.
