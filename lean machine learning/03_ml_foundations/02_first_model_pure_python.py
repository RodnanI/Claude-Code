"""
Your first machine learning model, in pure Python. No libraries.

Problem: a delivery company wants to predict delivery time (minutes) from distance (km).
Model:   minutes = w * distance + b      (a straight line with 2 parameters)

We will find w and b three ways:
  1. guessing
  2. brute-force search
  3. gradient descent (the way everything from here to GPT is trained)

Run it:  python 02_first_model_pure_python.py
"""

# %% The data: 12 past deliveries (distance in km, minutes taken)
data = [
    (1.0, 9.5), (2.0, 11.0), (2.5, 13.8), (3.0, 14.1), (4.0, 17.9), (4.5, 18.2),
    (5.0, 21.4), (6.0, 23.0), (7.0, 27.5), (7.5, 27.1), (8.0, 30.2), (9.0, 32.9),
]
distances = [d for d, _ in data]
minutes = [m for _, m in data]


# %% The model and the loss
def predict(distance, w, b):
    return w * distance + b


def mean_squared_error(w, b):
    """Average of (prediction - truth)^2 over all examples. Lower is better.

    Why squared? It is always positive, it punishes big misses much more than small
    ones, and it has a nice smooth derivative. It is the default regression loss.
    """
    total = 0.0
    for d, m in data:
        error = predict(d, w, b) - m
        total += error ** 2
    return total / len(data)


# %% 1. Guessing
for w, b in [(1.0, 0.0), (2.0, 5.0), (3.0, 6.0)]:
    print(f"guess w={w}, b={b}: MSE = {mean_squared_error(w, b):.2f}")
# Each guess is a hypothesis. The loss tells us which is better. That is the core loop of ML.


# %% 2. Brute-force search over a grid
best = (None, None, float("inf"))
checked = 0
for w_step in range(0, 101):            # w from 0.00 to 5.00
    w = w_step * 0.05
    for b_step in range(0, 201):        # b from 0.0 to 20.0
        b = b_step * 0.1
        loss = mean_squared_error(w, b)
        checked += 1
        if loss < best[2]:
            best = (w, b, loss)
print(f"\nbrute force checked {checked:,} combinations -> w={best[0]:.2f}, b={best[1]:.1f}, MSE={best[2]:.3f}")
# This works for 2 parameters. With 10 parameters and 100 values each, that is 100^10 = 10^20
# combinations. GPT-sized models have billions of parameters. Brute force is hopeless.
# We need a way to know which DIRECTION to move each parameter: the gradient.


# %% 3. Gradient descent
# Loss L = (1/n) * sum (w*d + b - m)^2
# Calculus (chain rule) gives:
#   dL/dw = (2/n) * sum (w*d + b - m) * d
#   dL/db = (2/n) * sum (w*d + b - m)
def gradients(w, b):
    n = len(data)
    grad_w = 0.0
    grad_b = 0.0
    for d, m in data:
        error = predict(d, w, b) - m
        grad_w += 2 * error * d / n
        grad_b += 2 * error / n
    return grad_w, grad_b


w, b = 0.0, 0.0                      # start anywhere
learning_rate = 0.01
print()
for step in range(3001):
    grad_w, grad_b = gradients(w, b)
    w -= learning_rate * grad_w      # move against the gradient = downhill
    b -= learning_rate * grad_b
    if step in (0, 10, 100, 500, 1000, 3000):
        print(f"step {step:>4}: w={w:.3f}  b={b:.3f}  MSE={mean_squared_error(w, b):.3f}")
# Notice: w settles fast, b crawls. The slope gets big gradients (distances are large numbers),
# the intercept gets small ones. Scaling features fixes this imbalance (next lab).


# %% 4. The exact answer (simple linear regression has a formula)
mean_d = sum(distances) / len(distances)
mean_m = sum(minutes) / len(minutes)
covariance = sum((d - mean_d) * (m - mean_m) for d, m in data)
variance = sum((d - mean_d) ** 2 for d in distances)
w_exact = covariance / variance
b_exact = mean_m - w_exact * mean_d
print(f"\nexact formula: w={w_exact:.3f}, b={b_exact:.3f}, MSE={mean_squared_error(w_exact, b_exact):.3f}")
print(f"gradient descent got within {abs(w - w_exact):.4f} on w and {abs(b - b_exact):.4f} on b")
# Formulas like this only exist for simple models. Gradient descent works for ANY model
# whose loss you can differentiate. That generality is why it runs the field.


# %% 5. Using the model (inference)
print("\nThe model says: every extra km adds", f"{w_exact:.1f} minutes, plus a fixed {b_exact:.1f} minutes overhead.")
for km in [3.5, 10.0, 50.0]:
    print(f"  {km:>5} km -> {predict(km, w_exact, b_exact):.1f} minutes")
# 50 km is far outside the training data (1 to 9 km). The model happily answers, but a
# 50 km delivery probably involves a highway and a different speed. Predicting outside the
# range of training data is called EXTRAPOLATION and models are bad at it, silently.

# %% Your turn
# 1. Set learning_rate = 0.05. What happens? Try 0.03. Explain using the gradient descent lesson.
# 2. Add a fake outlier (2.0, 90.0) to the data. How much do w and b change? Squared error
#    punishes big misses heavily, so one bad data point can drag the whole line.
# 3. Replace the squared error with absolute error |prediction - truth|. Its gradient is
#    sign(error) instead of 2*error. Is the line less affected by the outlier?
