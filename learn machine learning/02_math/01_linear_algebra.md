# Linear Algebra for Machine Learning

A dataset is a matrix, a model is mostly matrix multiplications, and an LLM represents each word as a vector. You do not need proofs for any of this, only some intuition and the habit of tracking shapes.

Run `02_linear_algebra_lab.py` while reading.

## Scalars, vectors, matrices, tensors

| Name | What it is | Shape example | In ML |
|------|-----------|---------------|-------|
| scalar | one number | `()` | a loss value, a learning rate |
| vector | a list of numbers | `(3,)` | one example's features, one word's embedding |
| matrix | a grid of numbers | `(100, 3)` | a dataset (100 examples, 3 features), a layer's weights |
| tensor | 3 or more dimensions | `(32, 128, 768)` | a batch of 32 sentences, 128 tokens each, 768 numbers per token |

"Tensor" in ML just means "n-dimensional array". PyTorch is named after it.

## Vectors

A house with size 120 m2, 4 bedrooms and age 5 years is the vector `[120, 4, 5]`.

You can picture it as a point in a 3D feature space, where similar houses sit close together; kNN, clustering and embedding search all rely on this view. You can also picture it as an arrow from the origin with a direction and a length, which explains the dot product and cosine similarity.

Adding vectors adds them element by element. Multiplying by a scalar stretches them: `2 * [1, 3] = [2, 6]`.

## The dot product

```
a . b = a1*b1 + a2*b2 + ... + an*bn
[1, 2, 3] . [4, 5, 6] = 4 + 10 + 18 = 32
```

It is used in two ways.

First, as a weighted sum. A linear model predicting house price is a dot product of features with weights:

```
price = 2*size + 10*bedrooms - 1*age + 50  =  [size, bedrooms, age] . [2, 10, -1] + 50
```

The weights say how much each feature matters. A single neuron in a neural network is this same sum followed by a non-linear function.

Second, as a similarity score. The dot product is large when two vectors point the same way, zero when perpendicular, negative when opposite. Geometrically:

```
a . b = |a| * |b| * cos(angle between them)
```

Attention in transformers scores "how relevant is word A to word B" with a dot product. Search engines compare a query embedding to document embeddings with dot products.

## Length, distance and cosine similarity

- Length (L2 norm): `|a| = sqrt(a1^2 + a2^2 + ...)`, which is Pythagoras in many dimensions.
- L1 norm: `|a1| + |a2| + ...`, used in L1 regularization.
- Euclidean distance: `|a - b|`, the straight-line distance between two points.
- Cosine similarity: `(a . b) / (|a| * |b|)`. This is the dot product with the length divided out, so it measures direction only and ranges from -1 to 1.

Text embeddings are usually compared with cosine similarity, since their direction carries meaning and their length mostly does not.

## Matrices

A matrix can be read as a stack of vectors. A dataset with 100 rows and 3 columns is 100 vectors of length 3, and the convention everywhere is that rows are examples and columns are features.

It can also be read as a function on vectors. Multiplying a vector by a matrix rotates, stretches, squashes or projects it, and a neural network layer is a learned transformation of this kind.

## Matrix multiplication

To compute `C = A @ B`, entry `C[i, j]` is the dot product of row `i` of A with column `j` of B.

```
shapes: (n, d) @ (d, k) -> (n, k)
                 ^   ^
             these must match
```

Check this shape rule before every matrix multiply and you will avoid a large share of bugs.

Examples you will see:

| Operation | Shapes | Meaning |
|-----------|--------|---------|
| `X @ w` | (100, 3) @ (3,) -> (100,) | predictions for 100 examples with a linear model |
| `X @ W` | (100, 3) @ (3, 16) -> (100, 16) | a layer turning 3 features into 16 |
| `Q @ K.T` | (T, d) @ (d, T) -> (T, T) | attention scores between every pair of T tokens |

Matrix multiplication is not commutative: `A @ B` is usually not `B @ A`, and the shapes often do not allow it.

It also parallelizes very well, which is why GPUs, with thousands of small cores, speed up deep learning. Most of the compute in training an LLM goes into matrix multiplication.

## Transpose

`A.T` flips rows and columns, so shape `(n, d)` becomes `(d, n)`. It is often needed to make shapes line up, as in `X.T @ errors` when computing gradients.

## Identity and inverse

The identity matrix `I` has ones on the diagonal and zeros elsewhere, and `I @ x = x`, so it does nothing. The inverse `A^-1` undoes `A`, meaning `A^-1 @ A = I`. Only square matrices that do not flatten space have one.

Linear regression has a famous closed-form solution, the **normal equation**:

```
w = (X.T @ X)^-1 @ X.T @ y
```

In practice nobody computes the inverse directly, since it is slow and numerically unstable; use `np.linalg.lstsq` or `np.linalg.solve`. You should still know the formula, because interviewers ask about it.

## Rank and redundant features

If one column of your data is a combination of others (price in euros and price in dollars, or `total = a + b` alongside `a` and `b`), the matrix has lower **rank** than its number of columns. The features carry redundant information. This is called multicollinearity, and it makes linear model coefficients unstable and hard to interpret even when predictions look fine.

## Eigenvectors and eigenvalues (intuition only)

Most matrices have special directions that they stretch without rotating. Those directions are eigenvectors and the stretch factors are eigenvalues:

```
A @ v = lambda * v
```

You meet them in PCA (principal component analysis, module 4): the eigenvectors of a dataset's covariance matrix are the directions in which the data varies most.

## SVD

The singular value decomposition writes any matrix as `A = U @ diag(S) @ V.T`, which is a rotation, a stretch and another rotation. The singular values `S` say how important each direction is. Keeping only the largest few gives the best low-rank approximation of the matrix.

Low rank turns up in several places. PCA is computed with SVD. Recommender systems factor a huge users-by-items matrix into two thin ones. LoRA, a popular cheap way to fine-tune LLMs, assumes the change to a weight matrix is low rank and learns it as a product of two thin matrices; module 7 builds this.

The lab compresses a matrix with SVD so you can see the effect.

## Tensors and batch dimensions

Real code adds dimensions for batches:

| Data | Shape | Dimensions mean |
|------|-------|-----------------|
| tabular batch | (B, F) | examples, features |
| grayscale images | (B, H, W) | batch, height, width |
| color images (PyTorch) | (B, C, H, W) | batch, channels, height, width |
| tokens into an LLM | (B, T) | batch, sequence length (integer token ids) |
| hidden states in an LLM | (B, T, C) | batch, time (position), channels (embedding size) |

With extra leading dimensions, matrix multiplication repeats the 2D product for each batch element. `(B, T, C) @ (C, 4C) -> (B, T, 4C)`.

## Cheat sheet

| Concept | NumPy | One-line meaning |
|---------|-------|------------------|
| dot product | `a @ b` or `np.dot(a, b)` | weighted sum / similarity |
| matrix multiply | `A @ B` | apply a transformation / a layer |
| elementwise multiply | `A * B` | NOT matrix multiply |
| transpose | `A.T` | swap rows and columns |
| length | `np.linalg.norm(a)` | size of a vector |
| cosine similarity | `a @ b / (norm(a) * norm(b))` | direction similarity |
| solve least squares | `np.linalg.lstsq(X, y, rcond=None)` | best linear fit |
| eigen decomposition | `np.linalg.eigh(C)` | directions of a symmetric matrix |
| SVD | `np.linalg.svd(A, full_matrices=False)` | rotate, stretch, rotate |

## Questions

1. What shape does `(64, 10) @ (10, 3)` produce? Can you compute `(10, 3) @ (64, 10)`?
2. Two embedding vectors have cosine similarity 0.98. What does that suggest about the words?
3. Why is a linear model's prediction a dot product?
4. You add a column that equals 2 times another column. What happens to the rank and why is that a problem for a linear model?
