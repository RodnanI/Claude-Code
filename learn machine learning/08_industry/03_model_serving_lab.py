"""
Serving a model: save it with metadata, validate inputs, expose it over HTTP, measure latency,
and also do batch scoring. Read 02_mlops_and_deployment.md first.

Uses only the standard library's http.server so nothing extra is needed. In real projects you
would use FastAPI (or a model server), Docker and a cloud platform, but the moving parts are
exactly these.

Run it:  python 03_model_serving_lab.py   (starts a local server, calls it, shuts it down)
"""

import json
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)


# %% 1. Train and save a model WITH its metadata (the "model registry" entry, in miniature)
data = load_breast_cancer(as_frame=True)
FEATURES = list(data.data.columns[:6])                  # a small feature set keeps the API readable
X, y = data.data[FEATURES], 1 - data.target             # 1 = malignant
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)).fit(X_train, y_train)

version = "1.0.0"
metadata = {
    "name": "tumor-risk", "version": version,
    "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "features": FEATURES,
    "feature_ranges": {f: [float(X_train[f].min()), float(X_train[f].max())] for f in FEATURES},
    "test_roc_auc": round(roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]), 4),
    "threshold": 0.5,
    "sklearn_version": sklearn.__version__,
}
joblib.dump(model, OUT / f"tumor-risk-{version}.joblib")
(OUT / f"tumor-risk-{version}.json").write_text(json.dumps(metadata, indent=2))
print(f"saved model {version}, test ROC AUC {metadata['test_roc_auc']}")


# %% 2. The prediction function: validate, then predict. Never trust inputs.
loaded = joblib.load(OUT / f"tumor-risk-{version}.joblib")


class InvalidInput(ValueError):
    pass


def predict(payload):
    if not isinstance(payload, dict):
        raise InvalidInput("body must be a JSON object")
    missing = [f for f in FEATURES if f not in payload]
    if missing:
        raise InvalidInput(f"missing features: {missing}")
    row = {}
    for f in FEATURES:
        value = payload[f]
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not np.isfinite(value):
            raise InvalidInput(f"{f} must be a finite number, got {value!r}")
        row[f] = float(value)
    warnings = [f for f in FEATURES                        # out of training range: allowed, but flagged
                if not metadata["feature_ranges"][f][0] <= row[f] <= metadata["feature_ranges"][f][1]]
    proba = float(loaded.predict_proba(pd.DataFrame([row]))[0, 1])
    return {"probability_malignant": round(proba, 4), "flag_for_review": proba >= metadata["threshold"],
            "model_version": version, "warnings": [f"{w} outside training range" for w in warnings]}


# %% 3. An HTTP API around it
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):        # keep the console quiet
        pass

    def _reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":                         # load balancers and monitors call this
            self._reply(200, {"status": "ok", "model_version": version})
        else:
            self._reply(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/predict":
            return self._reply(404, {"error": "not found"})
        try:
            payload = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            self._reply(200, predict(payload))
        except (json.JSONDecodeError, InvalidInput) as e:
            self._reply(400, {"error": str(e)})            # client's fault: say exactly what is wrong
        except Exception:
            self._reply(500, {"error": "internal error"})  # our fault: log details, reveal nothing


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)     # port 0 = pick any free port
port = server.server_address[1]
threading.Thread(target=server.serve_forever, daemon=True).start()
print(f"serving on http://127.0.0.1:{port}")


# %% 4. A client calling the API
def call(path, body=None):
    request = urllib.request.Request(f"http://127.0.0.1:{port}{path}",
                                     data=None if body is None else json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


print("\nGET /health ->", call("/health"))
good = X_test.iloc[0].to_dict()
print("POST valid input ->", call("/predict", good))
print("POST missing feature ->", call("/predict", {k: v for k, v in good.items() if k != FEATURES[0]}))
print("POST wrong type ->", call("/predict", {**good, FEATURES[1]: "seventeen"}))
print("POST out-of-range value ->", call("/predict", {**good, FEATURES[0]: 99.0})[1]["warnings"])


# %% 5. Latency: report percentiles, never just the average
latencies = []
for i in range(300):
    start = time.perf_counter()
    call("/predict", X_test.iloc[i % len(X_test)].to_dict())
    latencies.append((time.perf_counter() - start) * 1000)
p50, p95, p99 = np.percentile(latencies, [50, 95, 99])
print(f"\nlatency over 300 requests: p50 {p50:.1f} ms, p95 {p95:.1f} ms, p99 {p99:.1f} ms")
# The p99 is what your slowest users feel. SLOs are usually written on p95 or p99.
server.shutdown()


# %% 6. Batch scoring: the simpler, cheaper alternative when predictions can be hours old
batch = X_test.copy()
batch["probability_malignant"] = loaded.predict_proba(batch[FEATURES])[:, 1].round(4)
batch["model_version"] = version
batch["scored_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
batch.to_csv(OUT / "batch_predictions.csv", index=False)
print(f"\nbatch job scored {len(batch)} rows in one call -> outputs/batch_predictions.csv")
# Store the model version and timestamp with every prediction. When something looks wrong in
# three months, you will need to know which model said what, and when.

# Your turn
# 1. Add a /metadata endpoint returning the model's metadata JSON.
# 2. Add request logging: append each request's inputs, output and latency to a JSONL file.
#    (In production: never log personal data without a reason and a retention policy.)
# 3. Rewrite the server with FastAPI (pip install fastapi uvicorn) and pydantic input models.
#    Notice how much validation code disappears.
