"""
Python practice for ML. Pure Python, no libraries.

Run it:  python 02_python_practice.py
Then change things and run it again. Every section is independent.
"""

# %% 1. Functions that return several values
def summarize(numbers):
    """Return the mean, smallest and largest value of a list."""
    mean = sum(numbers) / len(numbers)
    return mean, min(numbers), max(numbers)   # a tuple


prices = [210, 340, 125, 480, 300]
avg, lowest, highest = summarize(prices)      # unpacking the tuple
print(f"mean={avg:.1f} min={lowest} max={highest}")


# %% 2. Comprehensions
# Min-max scaling squeezes numbers into the range 0..1. You will do this to data constantly.
scaled = [(p - lowest) / (highest - lowest) for p in prices]
print("scaled:", [round(s, 2) for s in scaled])

text = "the cat sat on the mat and the dog sat on the log"
vocab = {word: index for index, word in enumerate(sorted(set(text.split())))}
print("vocab:", vocab)                 # word -> integer id. LLM tokenizers start exactly like this.
encoded = [vocab[w] for w in text.split()]
print("encoded:", encoded)


# %% 3. Counting and sorting (word frequencies)
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1   # .get(key, default) avoids a KeyError

top = sorted(counts.items(), key=lambda pair: pair[1], reverse=True)[:3]
print("most common:", top)

# zip walks two lists side by side
names = ["linear", "tree", "forest"]
scores = [0.81, 0.77, 0.88]
for name, score in zip(names, scores):
    print(f"  {name:<8} {score:.0%}")
best_name, best_score = max(zip(names, scores), key=lambda pair: pair[1])
print("best:", best_name)


# %% 4. Classes: the fit / predict pattern every ML library uses
# Toy dataset: fruit weight in grams -> label
weights = [150, 170, 140, 3000, 4200, 160, 3500, 155]
labels = ["apple", "apple", "apple", "melon", "melon", "apple", "melon", "apple"]


class MajorityClassifier:
    """Always predicts the most common label. The dumbest possible baseline."""

    def fit(self, X, y):
        counts = {}
        for label in y:
            counts[label] = counts.get(label, 0) + 1
        self.majority_ = max(counts, key=counts.get)
        return self

    def predict(self, X):
        return [self.majority_ for _ in X]


class ThresholdClassifier:
    """Learns ONE number: a weight threshold. Above it -> one class, below -> the other.

    This is a real machine learning algorithm (a "decision stump"): it tries
    candidate thresholds and keeps the one that makes the fewest mistakes.
    Decision trees and gradient boosting are built out of thousands of these.
    """

    def fit(self, X, y):
        classes = sorted(set(y))
        best_errors = len(y) + 1
        for threshold in sorted(set(X)):
            for low, high in [(classes[0], classes[1]), (classes[1], classes[0])]:
                predictions = [high if x > threshold else low for x in X]
                errors = sum(p != t for p, t in zip(predictions, y))
                if errors < best_errors:
                    best_errors = errors
                    self.threshold_, self.low_, self.high_ = threshold, low, high
        return self

    def predict(self, X):
        return [self.high_ if x > self.threshold_ else self.low_ for x in X]


def accuracy(y_true, y_pred):
    return sum(t == p for t, p in zip(y_true, y_pred)) / len(y_true)


for model in [MajorityClassifier(), ThresholdClassifier()]:
    model.fit(weights, labels)
    acc = accuracy(labels, model.predict(weights))
    print(f"{type(model).__name__:<20} accuracy={acc:.0%}")

stump = ThresholdClassifier().fit(weights, labels)
print(f"learned threshold: {stump.threshold_} grams")
print("new fruit predictions:", stump.predict([120, 2500, 900]))
# Question for you: is a 900 g fruit really a melon? The model has never seen
# anything between 170 and 3000 grams. It put the line right above the heaviest
# apple, which is an arbitrary choice. Models are only as good as the range of
# data they were trained on.


# %% 5. Generators: hand out data in batches
def batches(items, batch_size):
    for start in range(0, len(items), batch_size):
        yield items[start:start + batch_size]


for i, batch in enumerate(batches(list(range(10)), batch_size=4)):
    print(f"batch {i}: {batch}")


# %% 6. Configs as dicts, saved as JSON
import json
from pathlib import Path

config = {"model": "threshold", "learning_rate": 0.01, "epochs": 20, "features": ["weight"]}
out_dir = Path(__file__).parent / "outputs"
out_dir.mkdir(exist_ok=True)
with open(out_dir / "config.json", "w") as f:
    json.dump(config, f, indent=2)
with open(out_dir / "config.json") as f:
    loaded = json.load(f)
print("loaded config equals original:", loaded == config)


def train(model="threshold", learning_rate=0.1, epochs=1, features=None):
    return f"training {model} lr={learning_rate} epochs={epochs} features={features}"


print(train(**loaded))     # ** unpacks the dict into keyword arguments


# %% 7. Seeds make randomness repeatable
import random

data = list(range(10))
random.seed(42)
first = random.sample(data, 5)
random.seed(42)
second = random.sample(data, 5)
print("same random sample twice:", first, second, first == second)


# %% 8. References versus copies
a = [1, 2, 3]
b = a            # same list
c = a.copy()     # different list
b.append(99)
print("a:", a, "| c (copy):", c)


# %% 9. Timing: why loops are slow for big data
import time

numbers = list(range(1_000_000))
start = time.perf_counter()
total = 0
for n in numbers:
    total += n * n
loop_time = time.perf_counter() - start

start = time.perf_counter()
total2 = sum(n * n for n in numbers)
gen_time = time.perf_counter() - start
print(f"loop: {loop_time * 1000:.0f} ms, generator: {gen_time * 1000:.0f} ms, same={total == total2}")
print("Remember these numbers. The NumPy lab does the same thing far faster.")
