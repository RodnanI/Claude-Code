# Linear Algebra for Machine Learning

Linear algebra is the language data and models are written in. A dataset is a matrix. A model is mostly matrix multiplications. An LLM's understanding of a word is a vector. You do not need proofs. You need intuition and the ability to track shapes.

Run `02_linear_algebra_lab.py` while reading.

## Scalars, vectors, matrices, tensors

| Name | What it is | Shape example | In ML |
|------|-----------|---------------|-------|
| scalar | one number | `()` | a loss value, a learning rate |
| vector | a list of numbers | `(3,)` | one example's features, one word's embedding |
| matrix | a grid of numbers | `(100, 3)` | a dataset (100 examples, 3 features), a layer's weights |
| tensor | 3 or more dimensions | `(32, 128, 768)` | a batch of 32 sentences, 128 tokens each, 768 numbers per token |

"Tensor" in ML just means "n-dimensional array". PyTorch is named after it.

## Vectors: two ways to see them

A house with size 120 m2, 4 bedrooms and age 5 years is the vector `[120, 4, 5]`.

1. **As a point** in 3D "feature space". Similar houses are nearby points. kNN, clustering and embedding search all rely on this picture.
2. **As an arrow** from the origin. Arrows have a direction and a length. This picture explains the dot product and cosine similarity.

Adding vectors adds them element by element. Multiplying by a scalar stretches them: `2 * [1, 3] = [2, 6]`.

## The dot product: the most important operation in ML

```
a . b = a1*b1 + a2*b2 + ... + an*bn
[1, 2, 3] . [4, 5, 6] = 4 + 10 + 18 = 32
```

It has two meanings and you must hold both in your head:

**Meaning 1: a weighted sum.** A linear model predicting house price is a dot product of features with weights:

```
price = 2*size + 10*bedrooms - 1*age + 50  =  [size, bedrooms, age] . [2, 10, -1] + 50
```

The weights say how much each feature matters. A single neuron in a neural network is exactly this, followed by a non-linear function.

**Meaning 2: similarity.** The dot product is large when two vectors point the same way, zero when perpendicular, negative when opposite. Geometrically:

```
a . b = |a| * |b| * cos(angle between them)
```

Attention in transformers scores "how relevant is word A to word B" with a dot product. Search engines compare a query embedding to document embeddings with dot products.

## Length, distance and cosine similarity

- **Length (L2 norm)**: `|a| = sqrt(a1^2 + a2^2 + ...)`. Pythagoras in many dimensions.
- **L1 norm**: `|a1| + |a2| + ...`. Shows up in L1 regularization.
- **Euclidean distance**: `|a - b|`, the straight-line distance between two points.
- **Cosine similarity**: `(a . b) / (|a| * |b|)`. The dot product with length removed, so it only measures direction. Ranges from -1 to 1.

Cosine similarity is the default for comparing text embeddings, because the direction carries meaning and the length mostly does not.

## Matrices: also two views

**View 1: a stack of vectors.** A dataset with 100 rows and 3 columns is 100 vectors of length 3. Convention everywhere: **rows are examples, columns are features**.

**View 2: a function that transforms vectors.** Multiplying a vector by a matrix moves it: rotates, stretches, squashes, projects. A neural network layer is a learned transformation of this kind.

## Matrix multiplication

To compute `C = A @ B`, entry `C[i, j]` is the dot product of row `i` of A with column `j` of B.

```
shapes: (n, d) @ (d, k) -> (n, k)
                 ^   ^
             these must match
```

This shape rule will save you hundreds of hours. Before any matrix multiply, say the shapes out loud.

Examples you will see:

| Operation | Shapes | Meaning |
|-----------|--------|---------|
| `X @ w` | (100, 3) @ (3,) -> (100,) | predictions for 100 examples with a linear model |
| `X @ W` | (100, 3) @ (3, 16) -> (100, 16) | a layer turning 3 features into 16 |
| `Q @ K.T` | (T, d) @ (d, T) -> (T, T) | attention scores between every pair of T tokens |

Matrix multiplication is **not commutative**: `A @ B` is usually not `B @ A`, and often the shapes do not even allow it.

Why it matters so much: matrix multiplication is extremely parallel, which is why GPUs (thousands of small cores) make deep learning fast. Most of the compute in training an LLM is matrix multiplication.

## Transpose

`A.T` flips rows and columns: shape `(n, d)` becomes `(d, n)`. You use it constantly to make shapes line up, for example `X.T @ errors` when computing gradients.

## Identity and inverse

- The **identity matrix** `I` has ones on the diagonal and zeros elsewhere. `I @ x = x`. The "do nothing" transformation.
- The **inverse** `A^-1` undoes `A`: `A^-1 @ A = I`. Only square matrices that do not squash space flat have one.

Linear regression has a famous closed-form solution, the **normal equation**:

```
w = (X.T @ X)^-1 @ X.T @ y
```

In practice nobody computes the inverse directly (it is slow and numerically unstable). Use `np.linalg.lstsq` or `np.linalg.solve`. Know the formula exists, because interviewers love it.

## Rank and redundant features

If one column of your data is a combination of others (price in euros and price in dollars, or `total = a + b` alongside `a` and `b`), the matrix has lower **rank** than its number of columns. The features carry redundant information. This is called **multicollinearity**: it makes linear model coefficients unstable and uninterpretable, even when predictions look fine.

## Eigenvectors and eigenvalues (intuition only)

For most matrices, there are special directions that the transformation only stretches without rotating. Those directions are **eigenvectors**, and the stretch factors are **eigenvalues**:

```
A @ v = lambda * v
```

Where you meet them: the eigenvectors of a dataset's covariance matrix are the directions in which the data varies most. That is **PCA** (principal component analysis), covered in module 4.

## SVD: every matrix is rotate, stretch, rotate

The **singular value decomposition** writes any matrix as `A = U @ diag(S) @ V.T`. The singular values `S` say how important each direction is. Keep only the largest few and you get the best possible **low-rank approximation** of the matrix.

Low rank is a big idea in modern ML:

- PCA is computed with SVD.
- Recommender systems factor a huge users-by-items matrix into two thin ones.
- **LoRA**, the most popular way to fine-tune LLMs cheaply, assumes the *change* to a weight matrix is low rank and learns it as the product of two thin matrices. Module 7 builds this.

The lab compresses a matrix with SVD so you can see it.

## Tensors and batch dimensions

Real code adds dimensions for batches:

| Data | Shape | Dimensions mean |
|------|-------|-----------------|
| tabular batch | (B, F) | examples, features |
| grayscale images | (B, H, W) | batch, height, width |
| color images (PyTorch) | (B, C, H, W) | batch, channels, height, width |
| tokens into an LLM | (B, T) | batch, sequence length (integer token ids) |
| hidden states in an LLM | (B, T, C) | batch, time (position), channels (embedding size) |

Matrix multiplication with extra leading dimensions just repeats the 2D multiplication for each batch element. `(B, T, C) @ (C, 4C) -> (B, T, 4C)`.

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

## Check yourself

1. What shape does `(64, 10) @ (10, 3)` produce? Can you compute `(10, 3) @ (64, 10)`?
2. Two embedding vectors have cosine similarity 0.98. What does that suggest about the words?
3. Why is a linear model's prediction a dot product?
4. You add a column that equals 2 times another column. What happens to the rank and why is that a problem for a linear model?
