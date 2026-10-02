"""
Real PyTorch project: classify handwritten digits with an MLP and a CNN.

Dataset: 1,797 grayscale digit images, 8x8 pixels (bundled with scikit-learn, no download).
It is a tiny cousin of MNIST, small enough to train in seconds on a laptop CPU.

You will use: Dataset/DataLoader, train/validation/test splits, the debugging recipe
(check initial loss, overfit one batch), early stopping on validation, AdamW, and a
convolutional network.

Run it:  python 07_pytorch_digits_mlp_cnn.py   (under a minute on CPU)
"""

import copy
import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from sklearn.datasets import load_digits
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, TensorDataset

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
torch.manual_seed(0)


# %% 1. Data
digits = load_digits()
X = (digits.data / 16.0).astype(np.float32)          # pixel values 0..16 -> 0..1, float32 for PyTorch
y = digits.target.astype(np.int64)                   # class indices must be int64 ("long")
X_train, X_tmp, y_train, y_tmp = train_test_split(X, y, test_size=0.3, stratify=y, random_state=0)
X_val, X_test, y_val, y_test = train_test_split(X_tmp, y_tmp, test_size=0.5, stratify=y_tmp, random_state=0)
print(f"train {len(X_train)}, validation {len(X_val)}, test {len(X_test)}")


def loader(X, y, shuffle, batch_size=64):
    dataset = TensorDataset(torch.from_numpy(X), torch.from_numpy(y))
    return DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)


train_loader = loader(X_train, y_train, shuffle=True)        # shuffle training data every epoch
val_loader = loader(X_val, y_val, shuffle=False)
test_loader = loader(X_test, y_test, shuffle=False)


# %% 2. Two models
class MLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(64, 128), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(128, 64), nn.ReLU(),
            nn.Linear(64, 10),                        # 10 logits, one per digit
        )

    def forward(self, x):                             # x: (batch, 64)
        return self.net(x)


class CNN(nn.Module):
    """Convolutions slide small 3x3 filters over the image, so the same pattern detector is
    reused at every position. Far fewer weights per layer than connecting every pixel."""

    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1), nn.ReLU(),    # (B, 1, 8, 8) -> (B, 16, 8, 8)
            nn.Conv2d(16, 32, kernel_size=3, padding=1), nn.ReLU(),   # -> (B, 32, 8, 8)
            nn.MaxPool2d(2),                                          # -> (B, 32, 4, 4)
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),                                             # -> (B, 512)
            nn.Linear(32 * 4 * 4, 64), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(64, 10),
        )

    def forward(self, x):                             # x: (batch, 64)
        x = x.view(-1, 1, 8, 8)                       # back to images: (batch, channels, height, width)
        return self.classifier(self.features(x))


def count_params(model):
    return sum(p.numel() for p in model.parameters())


# %% 3. Debugging recipe step 1: the loss at initialization should be about ln(10) = 2.303
loss_fn = nn.CrossEntropyLoss()
xb, yb = next(iter(train_loader))
with torch.no_grad():
    init_loss = loss_fn(MLP()(xb), yb).item()
print(f"\ninitial loss {init_loss:.3f} vs expected {math.log(10):.3f} (random guessing over 10 classes)")


# %% 4. Debugging recipe step 2: can the model memorize one small batch?
tiny_model = MLP()
tiny_model.eval()                                     # turn off dropout for this check
opt = torch.optim.AdamW(tiny_model.parameters(), lr=1e-2)
x_small, y_small = xb[:16], yb[:16]
for _ in range(200):
    loss = loss_fn(tiny_model(x_small), y_small)
    opt.zero_grad()
    loss.backward()
    opt.step()
print(f"after 200 steps on 16 examples: loss {loss.item():.5f} (near 0 = model and loop are wired correctly)")


# %% 5. Training with validation-based early stopping
def evaluate(model, data_loader):
    model.eval()
    correct, total, loss_sum = 0, 0, 0.0
    with torch.no_grad():
        for xb, yb in data_loader:
            logits = model(xb)
            loss_sum += loss_fn(logits, yb).item() * len(yb)
            correct += (logits.argmax(dim=1) == yb).sum().item()
            total += len(yb)
    return loss_sum / total, correct / total


def train(model, epochs=40, lr=2e-3, patience=8):
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    history = {"train_loss": [], "val_loss": [], "val_acc": []}
    best_loss, best_state, bad_epochs = float("inf"), None, 0
    for epoch in range(epochs):
        model.train()
        running = 0.0
        for xb, yb in train_loader:
            loss = loss_fn(model(xb), yb)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            running += loss.item() * len(yb)
        val_loss, val_acc = evaluate(model, val_loader)
        history["train_loss"].append(running / len(train_loader.dataset))
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)
        if val_loss < best_loss:
            best_loss, best_state, bad_epochs = val_loss, copy.deepcopy(model.state_dict()), 0
        else:
            bad_epochs += 1
            if bad_epochs >= patience:                 # early stopping
                break
    model.load_state_dict(best_state)                  # keep the best checkpoint, not the last
    return history


results = {}
for name, model in [("MLP", MLP()), ("CNN", CNN())]:
    history = train(model)
    test_loss, test_acc = evaluate(model, test_loader)
    results[name] = (model, history)
    best_epoch = int(np.argmin(history["val_loss"])) + 1
    print(f"{name}: {count_params(model):>6,} params, ran {len(history['val_loss'])} epochs, "
          f"best epoch {best_epoch}, test accuracy {test_acc:.1%}")
# Both do well on this easy dataset. On real images (bigger, messier, shifted objects) the
# CNN's built-in assumptions (local patterns, the same detector everywhere) win clearly.


# %% 6. Where does the CNN go wrong?
cnn = results["CNN"][0]
cnn.eval()
with torch.no_grad():
    test_logits = cnn(torch.from_numpy(X_test))
preds = test_logits.argmax(dim=1).numpy()
print("\nconfusion matrix (rows = true digit, columns = predicted):")
print(confusion_matrix(y_test, preds))
wrong = np.where(preds != y_test)[0]
print(f"{len(wrong)} mistakes out of {len(y_test)}")

fig, axes = plt.subplots(1, 3, figsize=(15, 4))
for name, color in [("MLP", "#2a9d8f"), ("CNN", "#c8553d")]:
    h = results[name][1]
    axes[0].plot(h["train_loss"], color=color, label=f"{name} train")
    axes[0].plot(h["val_loss"], color=color, linestyle="--", label=f"{name} val")
    axes[1].plot(h["val_acc"], color=color, label=name)
axes[0].set(title="loss", xlabel="epoch")
axes[0].legend()
axes[1].set(title="validation accuracy", xlabel="epoch")
axes[1].legend()
probs = torch.softmax(test_logits, dim=1).numpy()
if len(wrong):
    i = wrong[0]
    axes[2].imshow(X_test[i].reshape(8, 8), cmap="Greys")
    axes[2].set_title(f"true {y_test[i]}, predicted {preds[i]} ({probs[i, preds[i]]:.0%} sure)")
    axes[2].axis("off")
fig.tight_layout()
fig.savefig(OUT / "digits_training.png", dpi=120)
print("saved digits_training.png")
torch.save(cnn.state_dict(), OUT / "digits_cnn.pt")

plt.show()

# %% Your turn
# 1. Remove the Dropout layers. Does the gap between train and validation loss grow?
# 2. Set lr=1e-1. Then 1e-5. Describe both loss curves.
# 3. Data augmentation: shift each training image by one pixel in a random direction
#    (np.roll on the 8x8 view) every epoch. Does the CNN's test accuracy improve?
