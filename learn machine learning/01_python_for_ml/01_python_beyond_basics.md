# Python Beyond the Basics

You know loops and dictionaries. ML code leans on a handful of further Python features, and this file covers only those. Run `02_python_practice.py` alongside it.

## 1. Functions

```python
def train(data, learning_rate=0.01, epochs=10, verbose=False):
    """Docstring: say what goes in and what comes out."""
    ...
    return weights, losses        # returning two things = returning a tuple

w, losses = train(data, epochs=50)   # keyword arguments: order does not matter
```

Default arguments let libraries offer hundreds of options without forcing you to set them; `RandomForestClassifier()` has around 20 parameters with defaults. Keyword arguments (`epochs=50`) make calls readable, so use them whenever the meaning is not obvious. Returning a tuple and unpacking it, as in `n_rows, n_cols = X.shape`, appears on nearly every page of ML code.

One trap: do not use a mutable default like `def f(history=[])`, because every call shares the same list. Use `history=None` and create the list inside.

## 2. Comprehensions

```python
squares = [x * x for x in range(10)]
evens = [x for x in numbers if x % 2 == 0]
word_lengths = {w: len(w) for w in words}            # dict comprehension
vocab = {ch: i for i, ch in enumerate(sorted(set(text)))}   # you will write this in the LLM labs
```

A comprehension is a loop that builds a collection. Read `[x for x in numbers if x % 2 == 0]` as "for each x in numbers, if x is even, keep x".

## 3. enumerate, zip, sorted, min and max with key

```python
for i, word in enumerate(words):          # index and value together
    ...
for x, y in zip(features, labels):        # walk two lists in lockstep
    ...
ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)   # sort dict by value
best_model = max(results, key=lambda r: r["accuracy"])
```

`lambda kv: kv[1]` is a small unnamed function, and `key=` tells the sort what to compare. You will use this to find the best model or the most likely tokens.

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

## 5. Classes

A model has state (its learned numbers) and behavior (train, predict), and a class holds both.

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

This is the scikit-learn pattern: create, `fit`, `predict`. Every scikit-learn model follows it.

PyTorch adds two more class features. With inheritance, `class MyNet(nn.Module):` says your class is a kind of `nn.Module` and picks up its behavior. With `__call__`, an object can be called like a function, so `output = model(x)` calls `model.__call__(x)`, which calls your `forward` method.

## 6. Modules and imports

```python
import numpy as np                   # the universal alias. Always np.
import pandas as pd                  # always pd
import matplotlib.pyplot as plt      # always plt
from sklearn.linear_model import LogisticRegression
```

Stick to the standard aliases; anything else confuses coworkers.

```python
if __name__ == "__main__":
    main()
```

This runs `main()` only when the file is executed directly and not when it is imported. Every script in this course ends this way.

## 7. Errors and tracebacks

When something breaks, Python prints a traceback. Read it from the bottom up. The last line is the actual error and the lines above show the chain of calls that led to it. The last line that points into your own file is usually where the bug is.

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

Results you cannot reproduce do not count at work.

## 11. *args and **kwargs

Library code uses these all the time.

```python
def log(*args, **kwargs):
    print(args)      # tuple of positional arguments
    print(kwargs)    # dict of keyword arguments

config = {"learning_rate": 0.01, "epochs": 5}
train(data, **config)     # unpack a dict into keyword arguments
```

`**config` passes a config dict straight into a function or model.

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

NumPy has the same trap with views: slicing an array does not copy it, so changing the slice changes the original. The NumPy lab covers this.

## 14. Type hints

```python
def accuracy(y_true: list[int], y_pred: list[int]) -> float:
    ...
```

Python ignores them at runtime. They document inputs and outputs, and editors use them to catch mistakes. You will read plenty of them in library code and can add them sparingly in your own.

## 15. Timing code

```python
import time
start = time.perf_counter()
slow_function()
print(f"took {time.perf_counter() - start:.3f}s")
```

The NumPy lab uses this to show that vectorized code runs about 100 times faster than loops.

## Before moving on

You are ready for NumPy if you can do these without looking anything up: write a function with default arguments that returns two values and unpack them; turn a list-building loop into a comprehension; sort a dict by its values; write a small class with `__init__`, `fit` and `predict`; find the failing line of your own code in a traceback; and print a float to 3 decimals and a percentage to 1.
