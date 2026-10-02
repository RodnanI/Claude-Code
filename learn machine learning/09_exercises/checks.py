"""
Automatic checks for the exercise files. You do not need to edit or read this file.

Each exercise file ends with:
    import checks
    checks.run(globals(), "ml")
which runs every test of that suite against YOUR functions and prints PASS / FAIL / TODO.
"""

import numpy as np

SUITES = {}


def test(suite_name):
    def register(fn):
        SUITES.setdefault(suite_name, []).append(fn)
        return fn
    return register


def close(a, b, tol=1e-6, msg=""):
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    assert a.shape == b.shape, f"shape {a.shape} != expected {b.shape}. {msg}"
    assert np.allclose(a, b, atol=tol, rtol=tol), f"got {np.round(a, 4).tolist()}, expected {np.round(b, 4).tolist()}. {msg}"


def run(ns, suite_name):
    counts = {"PASS": 0, "FAIL": 0, "TODO": 0}
    print(f"checking suite '{suite_name}'")
    for t in SUITES[suite_name]:
        try:
            t(ns)
            status, detail = "PASS", ""
        except NotImplementedError:
            status, detail = "TODO", ""
        except Exception as e:                                   # report, keep going
            status, detail = "FAIL", f"{type(e).__name__}: {e}"
        counts[status] += 1
        print(f"  {status}  {t.__name__.removeprefix('test_')}" + (f"  ->  {detail}" if detail else ""))
    total = sum(counts.values())
    print(f"\n{counts['PASS']}/{total} passing, {counts['FAIL']} failing, {counts['TODO']} not started")
    if counts["PASS"] == total:
        print("All done. Compare your code with the version in solutions/ anyway: there is often a shorter way.")


# ---------------------------------------------------------------- python_numpy
@test("python_numpy")
def test_word_counts(ns):
    got = ns["word_counts"]("The cat. The dog! the END?")
    assert got == {"the": 3, "cat": 1, "dog": 1, "end": 1}, f"got {got}"


@test("python_numpy")
def test_top_k_words(ns):
    got = ns["top_k_words"]({"b": 2, "a": 2, "c": 5, "d": 1}, 3)
    assert got == [("c", 5), ("a", 2), ("b", 2)], f"got {got} (ties: alphabetical)"


@test("python_numpy")
def test_normalize_list(ns):
    close(ns["normalize_list"]([2, 4, 6]), [0.0, 0.5, 1.0])
    close(ns["normalize_list"]([3, 3]), [0.0, 0.0], msg="constant input must give zeros, not a division by zero")


@test("python_numpy")
def test_standardize_columns(ns):
    X = np.array([[1.0, 10.0, 5.0], [2.0, 20.0, 5.0], [3.0, 60.0, 5.0]])
    Z = ns["standardize_columns"](X)
    close(Z.mean(axis=0), [0, 0, 0], msg="each column mean should be 0")
    close(Z[:, :2].std(axis=0), [1, 1], msg="each column std should be 1")
    close(Z[:, 2], [0, 0, 0], msg="a constant column should become zeros")


@test("python_numpy")
def test_train_test_split_indices(ns):
    tr, te = ns["train_test_split_indices"](100, 0.2, seed=1)
    assert len(tr) == 80 and len(te) == 20, f"sizes {len(tr)}, {len(te)}"
    assert sorted(np.concatenate([tr, te]).tolist()) == list(range(100)), "must use every index exactly once"
    tr2, te2 = ns["train_test_split_indices"](100, 0.2, seed=1)
    assert np.array_equal(tr, tr2) and np.array_equal(te, te2), "same seed must give the same split"
    assert not np.array_equal(np.sort(te), np.arange(80, 100)), "indices must be shuffled"


@test("python_numpy")
def test_one_hot(ns):
    close(ns["one_hot"](np.array([0, 2, 1]), 3), [[1, 0, 0], [0, 0, 1], [0, 1, 0]])


@test("python_numpy")
def test_pairwise_distances(ns):
    rng = np.random.default_rng(0)
    A, B = rng.normal(size=(4, 3)), rng.normal(size=(5, 3))
    expected = np.array([[np.linalg.norm(a - b) for b in B] for a in A])
    close(ns["pairwise_distances"](A, B), expected)


@test("python_numpy")
def test_moving_average(ns):
    close(ns["moving_average"](np.array([1.0, 2, 3, 4, 5]), 3), [2, 3, 4])


@test("python_numpy")
def test_row_with_max_sum(ns):
    assert ns["row_with_max_sum"](np.array([[1, 2], [5, -10], [3, 3]])) == 2


@test("python_numpy")
def test_batch_indices(ns):
    got = [list(b) for b in ns["batch_indices"](7, 3)]
    assert got == [[0, 1, 2], [3, 4, 5], [6]], f"got {got}"


# ---------------------------------------------------------------- ml
@test("ml")
def test_mse_mae(ns):
    y, p = np.array([1.0, 2, 3]), np.array([2.0, 2, 5])
    close(ns["mse"](y, p), 5 / 3)
    close(ns["mae"](y, p), 1.0)


@test("ml")
def test_accuracy(ns):
    close(ns["accuracy"](np.array([1, 0, 1, 1]), np.array([1, 1, 1, 0])), 0.5)


@test("ml")
def test_confusion_counts(ns):
    got = ns["confusion_counts"](np.array([1, 1, 0, 0, 1]), np.array([1, 0, 1, 0, 1]))
    assert got == {"tp": 2, "fp": 1, "fn": 1, "tn": 1}, f"got {got}"


@test("ml")
def test_precision_recall_f1(ns):
    p, r, f = ns["precision_recall_f1"](np.array([1, 1, 0, 0, 1]), np.array([1, 0, 1, 0, 1]))
    close([p, r, f], [2 / 3, 2 / 3, 2 / 3])
    p, r, f = ns["precision_recall_f1"](np.array([1, 0]), np.array([0, 0]))
    close([p, r, f], [0, 0, 0], msg="no predicted positives: return 0, do not divide by zero")


@test("ml")
def test_linear_regression_gd(ns):
    rng = np.random.default_rng(0)
    X = rng.normal(size=(300, 2))
    y = X @ np.array([2.0, -3.0]) + 1.0
    w, b = ns["linear_regression_gd"](X, y, lr=0.1, epochs=500)
    close(w, [2, -3], tol=1e-2)
    close(b, 1, tol=1e-2)


@test("ml")
def test_sigmoid_and_log_loss(ns):
    close(ns["sigmoid"](np.array([0.0, 100.0, -100.0])), [0.5, 1.0, 0.0], tol=1e-6)
    close(ns["log_loss"](np.array([1, 0]), np.array([0.9, 0.2])), -(np.log(0.9) + np.log(0.8)) / 2)
    assert np.isfinite(ns["log_loss"](np.array([1]), np.array([0.0]))), "clip probabilities to avoid log(0)"


@test("ml")
def test_knn_predict(ns):
    X_train = np.array([[0, 0], [0, 1], [5, 5], [6, 5], [5, 6]])
    y_train = np.array([0, 0, 1, 1, 1])
    got = ns["knn_predict"](X_train, y_train, np.array([[0.2, 0.3], [5.5, 5.2]]), k=3)
    close(got, [0, 1])


@test("ml")
def test_kmeans_steps(ns):
    X = np.array([[0.0, 0], [0, 1], [10, 10], [10, 11]])
    labels = ns["kmeans_assign"](X, np.array([[0.0, 0.5], [10.0, 10.0]]))
    close(labels, [0, 0, 1, 1])
    close(ns["kmeans_update"](X, labels, 2), [[0, 0.5], [10, 10.5]])


@test("ml")
def test_gini(ns):
    close(ns["gini"](np.array([0, 0, 0])), 0.0)
    close(ns["gini"](np.array([0, 1, 0, 1])), 0.5)


@test("ml")
def test_roc_auc(ns):
    from sklearn.metrics import roc_auc_score
    rng = np.random.default_rng(1)
    y = rng.integers(0, 2, 200)
    s = y + rng.normal(0, 1, 200)
    close(ns["roc_auc"](y, s), roc_auc_score(y, s))


# ---------------------------------------------------------------- deep_learning
@test("deep_learning")
def test_relu(ns):
    x = np.array([-2.0, 0.0, 3.0])
    close(ns["relu"](x), [0, 0, 3])
    close(ns["relu_grad"](x), [0, 0, 1])


@test("deep_learning")
def test_softmax(ns):
    p = ns["softmax"](np.array([[1.0, 2.0, 3.0], [1000.0, 1000.0, 1000.0]]))
    close(p.sum(axis=1), [1, 1])
    close(p[1], [1 / 3] * 3, msg="huge logits must not overflow: subtract the row max")
    close(p[0], np.exp([1, 2, 3]) / np.exp([1, 2, 3]).sum())


@test("deep_learning")
def test_cross_entropy(ns):
    probs = np.array([[0.7, 0.2, 0.1], [0.1, 0.1, 0.8]])
    close(ns["cross_entropy"](probs, np.array([0, 2])), -(np.log(0.7) + np.log(0.8)) / 2)


@test("deep_learning")
def test_softmax_cross_entropy_grad(ns):
    logits = np.array([[1.0, 2.0, 0.5], [0.0, 0.0, 0.0]])
    y = np.array([1, 2])
    p = np.exp(logits - logits.max(axis=1, keepdims=True))
    p /= p.sum(axis=1, keepdims=True)
    expected = p.copy()
    expected[np.arange(2), y] -= 1
    close(ns["softmax_cross_entropy_grad"](logits, y), expected / 2)


@test("deep_learning")
def test_linear_layer(ns):
    rng = np.random.default_rng(0)
    X, W, b = rng.normal(size=(4, 3)), rng.normal(size=(3, 2)), rng.normal(size=2)
    close(ns["linear_forward"](X, W, b), X @ W + b)
    dout = rng.normal(size=(4, 2))
    dX, dW, db = ns["linear_backward"](X, W, dout)
    close(dX, dout @ W.T)
    close(dW, X.T @ dout)
    close(db, dout.sum(axis=0))


@test("deep_learning")
def test_numerical_gradient(ns):
    f = lambda v: np.sum(v ** 3)
    x = np.array([1.0, -2.0, 0.5])
    close(ns["numerical_gradient"](f, x), 3 * x ** 2, tol=1e-4)


@test("deep_learning")
def test_mlp_loss_and_grads(ns):
    rng = np.random.default_rng(0)
    X, y = rng.normal(size=(6, 4)), rng.integers(0, 3, 6)
    params = {"W1": rng.normal(size=(4, 5)), "b1": rng.normal(size=5),
              "W2": rng.normal(size=(5, 3)), "b2": rng.normal(size=3)}
    loss, grads = ns["mlp_loss_and_grads"](X, y, params)
    h = np.maximum(0, X @ params["W1"] + params["b1"])
    s = h @ params["W2"] + params["b2"]
    p = np.exp(s - s.max(axis=1, keepdims=True))
    p /= p.sum(axis=1, keepdims=True)
    close(loss, -np.mean(np.log(p[np.arange(6), y])))
    for name in params:                                   # compare with numerical gradients
        num = np.zeros_like(params[name])
        it = np.nditer(params[name], flags=["multi_index"])
        for _ in it:
            i = it.multi_index
            old = params[name][i]
            params[name][i] = old + 1e-5
            plus = ns["mlp_loss_and_grads"](X, y, params)[0]
            params[name][i] = old - 1e-5
            minus = ns["mlp_loss_and_grads"](X, y, params)[0]
            params[name][i] = old
            num[i] = (plus - minus) / 2e-5
        close(grads[name], num, tol=1e-4, msg=f"gradient of {name} is wrong")


@test("deep_learning")
def test_sgd_momentum_step(ns):
    w, v = ns["sgd_momentum_step"](np.array([1.0]), np.array([0.5]), np.array([0.2]), lr=0.1, beta=0.9)
    close(v, [0.9 * 0.2 + 0.5])
    close(w, [1.0 - 0.1 * (0.9 * 0.2 + 0.5)])


@test("deep_learning")
def test_adam_step(ns):
    w, m, v = ns["adam_step"](np.array([1.0]), np.array([0.5]), np.array([0.0]), np.array([0.0]), t=1,
                              lr=0.1, beta1=0.9, beta2=0.999, eps=1e-8)
    close(m, [0.05])
    close(v, [0.00025])
    close(w, [0.9], tol=1e-6, msg="after bias correction the first Adam step is about lr * sign(grad)")


@test("deep_learning")
def test_count_params(ns):
    assert ns["count_params"]([784, 256, 10]) == 784 * 256 + 256 + 256 * 10 + 10


# ---------------------------------------------------------------- llm
@test("llm")
def test_vocab_encode_decode(ns):
    stoi, itos = ns["build_vocab"]("hello")
    assert stoi == {"e": 0, "h": 1, "l": 2, "o": 3}, f"stoi {stoi}"
    ids = ns["encode"]("hole", stoi)
    assert ids == [1, 3, 2, 0], f"got {ids}"
    assert ns["decode"](ids, itos) == "hole"


@test("llm")
def test_bigram_counts(ns):
    close(ns["bigram_counts"]([0, 1, 0, 1, 1], 2), [[0, 2], [1, 1]])


@test("llm")
def test_temperature(ns):
    logits = np.array([2.0, 1.0, 0.0])
    p1 = ns["apply_temperature"](logits, 1.0)
    close(p1, np.exp(logits) / np.exp(logits).sum())
    assert ns["apply_temperature"](logits, 0.1)[0] > 0.99, "low temperature should be nearly greedy"
    assert ns["apply_temperature"](logits, 100.0).max() < 0.34, "high temperature should be nearly uniform"


@test("llm")
def test_top_k_filter(ns):
    close(ns["top_k_filter"](np.array([0.5, 0.2, 0.2, 0.1]), 1), [1, 0, 0, 0])
    close(ns["top_k_filter"](np.array([0.1, 0.6, 0.3]), 2), [0, 2 / 3, 1 / 3])


@test("llm")
def test_top_p_filter(ns):
    close(ns["top_p_filter"](np.array([0.5, 0.3, 0.15, 0.05]), 0.75), [0.625, 0.375, 0, 0])
    close(ns["top_p_filter"](np.array([0.9, 0.1]), 0.5), [1, 0], msg="always keep at least the top token")


@test("llm")
def test_causal_mask(ns):
    m = ns["causal_mask"](3)
    assert m.dtype == bool and m.tolist() == [[True, False, False], [True, True, False], [True, True, True]], \
        "True means 'allowed to attend'"


@test("llm")
def test_attention(ns):
    rng = np.random.default_rng(0)
    Q, K, V = rng.normal(size=(4, 8)), rng.normal(size=(4, 8)), rng.normal(size=(4, 5))
    s = Q @ K.T / np.sqrt(8)
    s_causal = np.where(np.tril(np.ones((4, 4), dtype=bool)), s, -np.inf)
    for scores, causal in [(s, False), (s_causal, True)]:
        w = np.exp(scores - scores.max(axis=1, keepdims=True))
        w /= w.sum(axis=1, keepdims=True)
        close(ns["attention"](Q, K, V, causal=causal), w @ V, msg=f"causal={causal}")


@test("llm")
def test_cosine_similarity_matrix(ns):
    A = np.array([[1.0, 0.0], [0.0, 2.0], [1.0, 1.0]])
    expected = np.array([[1, 0, 1 / np.sqrt(2)], [0, 1, 1 / np.sqrt(2)], [1 / np.sqrt(2), 1 / np.sqrt(2), 1]])
    close(ns["cosine_similarity_matrix"](A), expected)


@test("llm")
def test_chunk_text(ns):
    text = "abcdefghijklmnopqrstuvwxyz"
    chunks = ns["chunk_text"](text, size=10, overlap=3)
    assert chunks[0] == "abcdefghij" and chunks[1].startswith("hij"), f"got {chunks}"
    assert all(len(c) <= 10 for c in chunks), "chunks must not exceed size"
    assert chunks[-1].endswith("z"), "the end of the text must be covered"
    assert len(chunks) == 4, f"expected 4 chunks, got {len(chunks)}: {chunks}"


@test("llm")
def test_merge_pair(ns):
    assert ns["merge_pair"]([1, 2, 3, 1, 2, 2], (1, 2), 99) == [99, 3, 99, 2]


@test("llm")
def test_perplexity(ns):
    close(ns["perplexity"](np.full(10, 0.25)), 4.0)


@test("llm")
def test_lora_and_kv_cache_math(ns):
    assert ns["lora_param_count"](4096, 4096, 16) == 131072
    assert ns["kv_cache_bytes"](layers=32, kv_heads=8, head_dim=128, seq_len=1000, bytes_per_value=2) == \
        2 * 32 * 8 * 128 * 1000 * 2


if __name__ == "__main__":
    print("Run an exercise file instead, for example: python 02_ml_exercises.py")
    print("suites and number of checks:", {k: len(v) for k, v in SUITES.items()})
