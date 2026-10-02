"""
Optimizers from scratch: SGD, momentum, RMSProp and Adam racing on a hard function.
Plus the warmup + cosine learning rate schedule used to train LLMs.
Read 04_training_deep_networks.md first.

Test function: the Rosenbrock "banana" f(x, y) = (1 - x)^2 + 100 * (y - x^2)^2.
The minimum is at (1, 1), at the bottom of a long, curved, narrow valley. Finding the
valley is easy. Moving along it is hard, which is a good model of real loss landscapes.

Run it:  python 05_optimizers_lab.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)


def rosenbrock(w):
    x, y = w
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def rosenbrock_grad(w):
    x, y = w
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)])


# %% 1. The optimizers. Each keeps its own state and turns a gradient into a step.
class SGD:
    def __init__(self, lr):
        self.lr = lr

    def step(self, w, g):
        return w - self.lr * g


class Momentum:
    def __init__(self, lr, beta=0.9):
        self.lr, self.beta, self.velocity = lr, beta, 0.0

    def step(self, w, g):
        self.velocity = self.beta * self.velocity + g        # a running sum of past gradients
        return w - self.lr * self.velocity


class RMSProp:
    def __init__(self, lr, rho=0.9, eps=1e-8):
        self.lr, self.rho, self.eps, self.sq = lr, rho, eps, 0.0

    def step(self, w, g):
        self.sq = self.rho * self.sq + (1 - self.rho) * g ** 2   # running average of squared gradients
        return w - self.lr * g / (np.sqrt(self.sq) + self.eps)    # per-parameter step size


class Adam:
    def __init__(self, lr, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr, self.b1, self.b2, self.eps = lr, beta1, beta2, eps
        self.m, self.v, self.t = 0.0, 0.0, 0

    def step(self, w, g):
        self.t += 1
        self.m = self.b1 * self.m + (1 - self.b1) * g             # momentum
        self.v = self.b2 * self.v + (1 - self.b2) * g ** 2        # RMSProp-style scaling
        m_hat = self.m / (1 - self.b1 ** self.t)                  # bias correction (m and v start at 0)
        v_hat = self.v / (1 - self.b2 ** self.t)
        return w - self.lr * m_hat / (np.sqrt(v_hat) + self.eps)


# %% 2. The race
start = np.array([-1.5, 2.0])
steps = 2000
racers = {
    "SGD (lr 0.001)": SGD(0.001),
    "momentum (lr 0.001)": Momentum(0.001),
    "RMSProp (lr 0.01)": RMSProp(0.01),
    "Adam (lr 0.05)": Adam(0.05),
}
paths = {}
print(f"after {steps} steps from {start.tolist()} (minimum is at [1, 1]):")
for name, opt in racers.items():
    w = start.copy()
    path = [w.copy()]
    for _ in range(steps):
        w = opt.step(w, rosenbrock_grad(w))
        path.append(w.copy())
    paths[name] = np.array(path)
    print(f"  {name:<22} loss {rosenbrock(w):.2e}   position {np.round(w, 4).tolist()}")
# Each optimizer got a reasonably tuned learning rate. A fair comparison ALWAYS tunes each one:
# "Adam beat SGD" means nothing if SGD ran with a bad learning rate.

xx, yy = np.meshgrid(np.linspace(-2, 2, 300), np.linspace(-1, 3, 300))
zz = (1 - xx) ** 2 + 100 * (yy - xx ** 2) ** 2
fig, ax = plt.subplots(figsize=(8, 6))
ax.contour(xx, yy, np.log10(zz + 1e-3), levels=30, cmap="copper", linewidths=0.5)
for (name, path), color in zip(paths.items(), ["#2b2d42", "#c8553d", "#8a9a5b", "#2a9d8f"]):
    ax.plot(path[:, 0], path[:, 1], color=color, linewidth=1.5, label=name)
ax.plot(1, 1, marker="*", markersize=16, color="#e9c46a", markeredgecolor="#2b2d42")
ax.legend()
ax.set_title("Optimizers on the Rosenbrock valley")
fig.savefig(OUT / "optimizers_race.png", dpi=120)
print("saved optimizers_race.png")
# Plain SGD reaches the valley floor, then crawls along it: gradients there are tiny.
# Momentum builds up speed along the consistent valley direction.
# Adam rescales each coordinate by its gradient history, so tiny gradients still give useful steps.


# %% 3. The LLM learning rate schedule: linear warmup, then cosine decay
def lr_at(step, max_lr=3e-4, warmup=500, total=10_000, min_lr=3e-5):
    if step < warmup:
        return max_lr * (step + 1) / warmup                   # ramp up from ~0
    progress = (step - warmup) / (total - warmup)             # 0 -> 1 over the rest of training
    return min_lr + 0.5 * (max_lr - min_lr) * (1 + np.cos(np.pi * progress))


schedule = [lr_at(s) for s in range(10_000)]
for s in [0, 250, 500, 2500, 5000, 7500, 9999]:
    print(f"  step {s:>5}: lr {schedule[s]:.2e}")
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(schedule, color="#c8553d")
ax.set(xlabel="step", ylabel="learning rate", title="warmup + cosine decay")
fig.tight_layout()
fig.savefig(OUT / "lr_schedule.png", dpi=120)
print("saved lr_schedule.png")
# You will see exactly this function in the mini GPT (module 7) and in real LLM training code.

plt.show()

# %% Your turn
# 1. Give SGD lr=0.003. What happens? Why can't SGD simply use a bigger learning rate here?
# 2. Set Adam's beta1 to 0 (no momentum). How much worse does it get?
# 3. Add gradient clipping: if np.linalg.norm(g) > 10, rescale g to norm 10. Does it let SGD
#    use a larger learning rate safely?
