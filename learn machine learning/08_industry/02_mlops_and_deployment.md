# MLOps and Deployment

A model that is not in production has produced zero value. **MLOps** is the set of practices that take a model from a notebook to a system that runs every day, can be trusted, can be updated and tells you when it breaks. Labs: `03_model_serving_lab.py`, `04_experiment_tracking_lab.py`, `05_drift_monitoring_lab.py`.

## Reproducibility first

You must be able to answer, months later: "exactly which code, data, config and environment produced this model?"

| Thing | How |
|-------|-----|
| code | git commit hash recorded with every run |
| environment | pinned dependencies (`requirements.txt` with versions, a lock file), Docker images |
| data | immutable snapshots or versioned tables (DVC, lakeFS, warehouse time travel, dated partitions) |
| config | hyperparameters in config files, logged with the run |
| randomness | fixed seeds, recorded |
| results | metrics and artifacts logged to an experiment tracker |

**Experiment tracking** tools (MLflow, Weights & Biases and others) log parameters, metrics, plots and model files for every run so you can compare runs and reproduce the best one. The lab builds a minimal one so you understand what these tools do.

## Pipelines

Manual steps break. Production ML runs as automated **pipelines**:

```
ingest data -> validate data -> build features -> train -> evaluate -> (gate) -> register model -> deploy
```

- **Orchestrators** schedule and run them: Airflow, Dagster, Prefect, Kubeflow Pipelines, cloud equivalents.
- **Data validation** catches problems before they reach the model: schema checks, null rates, value ranges, row counts (tools: Great Expectations, pandera, or plain assertions).
- **Quality gates**: a new model is only promoted if it beats the current one on agreed metrics and slices.

## Feature stores and training-serving skew

**Training-serving skew** is when features are computed differently in training (a batch SQL job) and in production (a real-time service), so the model sees different inputs live than it learned from. It silently destroys performance. Typical causes: different code paths, different time windows, timezone handling, missing-value handling, or data that is only available later.

**Feature stores** (Feast, Tecton, cloud offerings) define each feature once and serve it consistently for training (with point-in-time correctness, module 3) and for real-time prediction.

## Model registry

A **registry** stores model versions with their metadata: metrics, training data version, code version, who approved them, and their stage (staging, production, archived). Deployments reference a registry version, so you always know what is running and can roll back.

## How models are served

| Pattern | How | When |
|---------|-----|------|
| **batch** | a scheduled job scores all records and writes predictions to a table | predictions can be hours old: churn risk lists, nightly recommendations, forecasts |
| **online / real-time** | an API (REST or gRPC) returns a prediction per request | the answer depends on the moment: fraud at checkout, search ranking |
| **streaming** | consume events from a queue (Kafka), score them, emit results | continuous event flows, monitoring |
| **edge / on-device** | the model runs on the phone, browser or device | privacy, offline use, ultra-low latency |

Batch is simpler, cheaper and easier to debug. Choose real-time only when the use case demands it.

Online serving stack, typically: a web framework (FastAPI is the common Python choice) or a model server (BentoML, TorchServe, NVIDIA Triton, KServe, vLLM for LLMs), packaged in a **Docker** container, run on **Kubernetes** or a managed cloud service, behind a load balancer, with autoscaling. You care about **latency** (p50, p95, p99), **throughput**, **error rate** and **cost per prediction**.

## Releasing safely

- **Shadow deployment**: the new model receives real traffic and makes predictions that are logged but not used. Compare with the current model at zero risk.
- **Canary release**: send a small share of traffic (1-5%) to the new model, watch metrics, then ramp up.
- **A/B test**: randomized split of users to measure business impact properly (module 2 statistics).
- **Blue-green**: two full environments; switch traffic at once; switch back instantly if needed.
- **Rollback plan**: always know how to return to the previous version in minutes.
- **Feature flags**: turn model-driven behavior on or off without redeploying.

## Testing ML systems

- Unit tests for feature transformations and data cleaning (the most bug-prone code).
- Data tests on every pipeline run.
- Model tests: minimum performance on a fixed test set, performance on critical slices, invariance tests (changing a name should not change a credit decision), directional tests (higher income should not lower the score, if that is the policy).
- Integration tests: the serving API returns valid predictions for valid input and clean errors for invalid input.
- Load tests before launch.

## Monitoring: models decay

The world changes after you train. Monitor at several layers:

| Layer | Examples | Detects |
|-------|----------|---------|
| system | latency, error rate, throughput, CPU/GPU, cost | outages, slowdowns |
| data quality | nulls, schema changes, out-of-range values, row counts | broken upstream pipelines (the most common real incident) |
| data drift | distribution of each input feature vs training (PSI, KS test) | the population changed |
| prediction drift | distribution of model outputs | something changed, cause unknown yet |
| performance | accuracy, precision, calibration once labels arrive | the model got worse |
| business | conversions, losses, complaints | the thing that actually matters |

Kinds of drift:

- **Data (covariate) drift**: inputs change (new customer segments, a new app version, inflation shifts prices).
- **Concept drift**: the relationship between inputs and the label changes (fraudsters adapt; a pandemic changes buying patterns).
- **Label delay**: true outcomes arrive late (a loan defaults after months), so you monitor proxies and drift in the meantime.

Retraining strategies: on a schedule (weekly, monthly), triggered by drift or performance alerts, or continuous. Every retrain goes through the same evaluation gates. Alerts must be tuned: too sensitive and everyone ignores them; too lax and you find out from customers.

## LLMOps: what changes with LLM applications

- **Prompts are code**: version them, review them, test them.
- **Eval suites run in CI** on every prompt, model or retrieval change (module 7 file 22).
- **Tracing**: log every step of a chain or agent (inputs, outputs, tool calls, latency, tokens) with tools like Langfuse, LangSmith, Arize Phoenix or OpenTelemetry-based tracing.
- **Cost monitoring** per feature and per customer: token usage can explode silently.
- **Guardrails**: input and output checks (PII filters, policy checks, schema validation).
- **Model version pinning**: providers update and retire models; pin versions and re-run evals before switching.
- **Caching** at prompt and response level.

## Maturity levels (where is your team?)

- **Level 0**: manual notebooks, models copied to servers by hand, no monitoring. Common, fragile.
- **Level 1**: automated training pipelines, experiment tracking, a registry, basic monitoring.
- **Level 2**: CI/CD for the pipelines themselves, automated retraining with gates, full monitoring and alerting.

Moving a team from level 0 to level 1 is a very valuable thing a junior engineer can contribute to.

## Check yourself

1. Give two concrete causes of training-serving skew.
2. When would you choose batch scoring over a real-time API? Give an example of each.
3. What is the difference between shadow deployment and a canary release?
4. Labels for your loan model arrive 6 months late. What do you monitor in the meantime?
5. Name four things you would log for every LLM call in production.
