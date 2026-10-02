# Exercises

Reading and running labs builds understanding, while writing the code yourself from an empty function builds skill. These four files contain 50 functions to implement, verified by 42 automatic checks.

| File | Do it after | What you implement |
|------|-------------|--------------------|
| `01_python_numpy_exercises.py` | module 1 | word counts, sorting, scaling, splits, one-hot, vectorized distances, generators |
| `02_ml_exercises.py` | modules 2-4 | metrics, confusion counts, linear regression by gradient descent, log loss, kNN, k-means steps, Gini, ROC AUC |
| `03_deep_learning_exercises.py` | module 6 | ReLU, stable softmax, cross-entropy and its gradient, a linear layer's backward pass, numerical gradients, a full 2-layer network with backprop, momentum and Adam |
| `04_llm_exercises.py` | module 7 | a character tokenizer, bigram counts, temperature, top-k, top-p, causal masks, attention, cosine similarity, chunking, a BPE merge, perplexity, LoRA and KV-cache arithmetic |

## How it works

```bash
cd "learn machine learning/09_exercises"
python 02_ml_exercises.py
```

Every function starts as `raise NotImplementedError`. The checks at the bottom report `TODO` for a function you have not started, `FAIL` with a message saying what was expected, or `PASS`. Implement one function, rerun, and repeat. `checks.py` holds the tests and you never need to edit it.

## Getting the most from them

Do not copy from the labs. You have seen most of these before, so write them from your understanding, and if you must look, close the lab and wait ten minutes before writing. Before writing NumPy code, put the input and output shapes in a comment. If you are stuck for more than 30 minutes, read the solution in `solutions/`, close it, and implement it again from memory the next day. After a file passes, reimplement it without loops or in fewer lines, or explain each function out loud as if in an interview, since several of these are standard interview questions (see `08_industry/08_interview_prep.md`).

## After the exercises

Pick a project from `projects.md`. Projects tie everything together, and they are what you show in interviews.
