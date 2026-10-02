# Python Beyond the Basics

You know loops and dictionaries. ML code uses a specific set of extra Python features constantly. This is that set, nothing more. Run `02_python_practice.py` alongside this file.

## 1. Functions, properly

```python
def train(data, learning_rate=0.01, epochs=10, verbose=False):
    """Docstring: say what goes in and what comes out."""
    ...
    return weights, losses        # returning two things = returning a tuple

w, losses = train(data, epochs=50)   # keyword arguments: order does not matter
```

- **Default arguments** are how libraries offer hundreds of options without forcing you to set them. `RandomForestClassifier()` has around 20 parameters with defaults.
- **Keyword arguments** (`epochs=50`) make calls readable. Use them for anything that is not obvious.
- **Return a tuple, unpack it**: `n_rows, n_cols = X.shape` is the same idea. You will see this on every page of ML code.

Gotcha: never use a mutable default like `def f(history=[])`. The same list is shared across calls. Use `history=None` and create the list inside.

## 2. Comprehensions

```python
squares = [x * x for x in range(10)]
evens = [x for x in numbers if x % 2 == 0]
word_lengths = {w: len(w) for w in words}            # dict comprehension
vocab = {ch: i for i, ch in enumerate(sorted(set(text)))}   # you will write this in the LLM labs
```

A comprehension is a loop that builds a collection. Read it right to left: "for each x in numbers, if x is even, keep x".

## 3. enumerate, zip, sorted, min and max with key

```python
for i, word in enumerate(words):          # index and value together
    ...
for x, y in zip(features, labels):        # walk two lists in lockstep
    ...
ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)   # sort dict by value
best_model = max(results, key=lambda r: r["accuracy"])
```

`lambda kv: kv[1]` is a tiny unnamed function. `key=` tells sorting what to compare. You will sort "which model was best" and "which tokens are most likely" all the time.

## 4. Slicing

```python
a = [10, 20, 30, 40, 50]
a[1:3]    # [20, 30]   start included, end excluded
a[:2]     # [10, 20]   first two
a[-2:]    # [40, 50]   last two
a[::-1]   # reversed
a[::2]    # every second element
```

NumPy and PyTorch use the same syntax, extended to many dimensions: `X[:, 0]` is "all rows, column 0".

## 5. Classes: why every model is an object

A model has **state** (its learned numbers) and **behavior** (train, predict). A class bundles both.

```python
class MeanPredictor:
    def __init__(self):
        self.mean_ = None            # learned state. Trailing _ = "set by fit" (scikit-learn convention)

    def fit(self, y):
        self.mean_ = sum(y) / len(y)
        return self                  # returning self allows model.fit(y).predict(...)

    def predict(self, n):
        return [self.mean_] * n

model = MeanPredictor()
model.fit([3, 5, 7])
model.predict(2)    # [5.0, 5.0]
```

That is literally the scikit-learn API: create, `fit`, `predict`. Once you understand this class you understand the shape of every scikit-learn model.

Two more class features you will meet in PyTorch:

- **Inheritance**: `class MyNet(nn.Module):` means "my class is a kind of `nn.Module` and gets all its behavior for free".
- **`__call__`**: lets an object be called like a function. In PyTorch you write `output = model(x)`, which calls `model.__call__(x)`, which calls your `forward` method.

## 6. Modules and imports

```python
import numpy as np                   # the universal alias. Always np.
import pandas as pd                  # always pd
import matplotlib.pyplot as plt      # always plt
from sklearn.linear_model import LogisticRegression
```

Use the standard aliases. Writing `import numpy as numpy_lib` makes coworkers stare.

```python
if __name__ == "__main__":
    main()
```

This means "run `main()` only when this file is run directly, not when it is imported". Every script in this course ends this way. Production code does too.

## 7. Errors and tracebacks

When something breaks, Python prints a traceback. **Read it from the bottom up.** The last line is the actual error. The lines above show the chain of calls that led there. Find the last line that points to *your* file: that is usually where the bug is.

```python
try:
    value = float(text)
except ValueError:
    value = None          # handle bad data instead of crashing
```

Common ML errors and what they usually mean:

| Error | Usual cause |
|-------|-------------|
| `ValueError: shapes (100,3) and (4,) not aligned` | Matrix shapes do not match. Print `.shape` of both |
| `KeyError: 'price'` | Column or dict key misspelled or missing |
| `IndexError` | Off by one, or an empty array |
| `RuntimeError: ... must have the same dtype` (PyTorch) | Mixing float64 and float32 tensors |
| `nan` loss | Learning rate too high, log of zero, or division by zero |

## 8. f-strings: printing numbers nicely

```python
loss = 0.123456
print(f"loss={loss:.4f}")        # loss=0.1235
print(f"{0.9312:.1%}")           # 93.1%
print(f"{1234567:,}")            # 1,234,567  (parameter counts!)
print(f"{'model':<10}|")         # left-align in 10 characters, for tables
print(f"{loss=}")                # loss=0.123456   quick debugging
```

## 9. Files, paths and JSON

```python
from pathlib import Path
import json

here = Path(__file__).parent              # folder this script lives in
data_file = here / "data" / "train.csv"   # build paths with / (works on Windows too)

with open(here / "config.json") as f:     # "with" closes the file for you
    config = json.load(f)                 # JSON file -> dict

with open(here / "results.json", "w") as f:
    json.dump({"accuracy": 0.93}, f, indent=2)
```

JSON is how configs, API requests and API responses look. It maps directly to Python dicts and lists, which you already know.

## 10. Randomness and seeds

ML is full of randomness: random splits, random weight initialization, random sampling. Set a **seed** so you get the same results every run.

```python
import random
random.seed(42)
import numpy as np
rng = np.random.default_rng(42)     # the modern NumPy way
```

Reproducibility is a professional requirement. "It worked on my machine once" is not a result.

## 11. *args and **kwargs

You will read these in library code daily.

```python
def log(*args, **kwargs):
    print(args)      # tuple of positional arguments
    print(kwargs)    # dict of keyword arguments

config = {"learning_rate": 0.01, "epochs": 5}
train(data, **config)     # unpack a dict into keyword arguments
```

`**config` is how people pass a config dict straight into a model. Very common.

## 12. Generators and yield

```python
def batches(data, batch_size):
    for start in range(0, len(data), batch_size):
        yield data[start:start + batch_size]      # hand out one batch, pause, continue later

for batch in batches(list(range(10)), 4):
    print(batch)       # [0,1,2,3] then [4,5,6,7] then [8,9]
```

A generator produces values one at a time instead of building a whole list. PyTorch DataLoaders work this way, and streaming LLM responses arrive this way.

## 13. Copies versus references

```python
a = [1, 2, 3]
b = a          # b is the SAME list, not a copy
b.append(4)
print(a)       # [1, 2, 3, 4]   surprise
c = a.copy()   # a real copy
```

NumPy has the same trap with "views": slicing an array does not copy it. Changing the slice changes the original. Covered in the NumPy lab.

## 14. Type hints (read them, use them lightly)

```python
def accuracy(y_true: list[int], y_pred: list[int]) -> float:
    ...
```

Python ignores them at runtime. They document what goes in and out, and editors use them to catch mistakes. Library code is full of them.

## 15. Timing code

```python
import time
start = time.perf_counter()
slow_function()
print(f"took {time.perf_counter() - start:.3f}s")
```

You will use this to see why NumPy is 100 times faster than loops.

## Checklist before moving on

You are ready for NumPy if you can, without looking:

- write a function with default arguments that returns two values, and unpack them
- turn a loop that builds a list into a comprehension
- sort a dict by its values
- write a small class with `__init__`, `fit` and `predict`
- read a traceback and find the line in your code that failed
- print a float with 3 decimals and a percentage with 1 decimal
