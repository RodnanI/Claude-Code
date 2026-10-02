# MLOps and Deployment

A model that is not in production has produced no value. MLOps is the set of practices that takes a model from a notebook to a system that runs daily, can be trusted, can be updated and reports when it breaks. The labs are `03_model_serving_lab.py`, `04_experiment_tracking_lab.py` and `05_drift_monitoring_lab.py`.

## Reproducibility

Months later you must be able to say exactly which code, data, config and environment produced a given model.

| Thing | How |
|-------|-----|
| code | git commit hash recorded with every run |
| environment | pinned dependencies (`requirements.txt` with versions, a lock file), Docker images |
| data | immutable snapshots or versioned tables (DVC, lakeFS, warehouse time travel, dated partitions) |
| config | hyperparameters in config files, logged with the run |
| randomness | fixed seeds, recorded |
| results | metrics and artifacts logged to an experiment tracker |

Experiment tracking tools (MLflow, Weights & Biases and others) log parameters, metrics, plots and model files for every run so you can compare runs and reproduce the best one. The lab builds a minimal tracker so you can see what these tools do.

## Pipelines

Manual steps break, so production ML runs as automated pipelines:

```
ingest data -> validate data -> build features -> train -> evaluate -> (gate) -> register model -> deploy
```

Orchestrators such as Airflow, Dagster, Prefect, Kubeflow Pipelines and their cloud equivalents schedule and run them. Data validation catches problems before they reach the model, through schema checks, null rates, value ranges and row counts, using Great Expectations, pandera or plain assertions. Quality gates promote a new model only if it beats the current one on agreed metrics and slices.

## Feature stores and training-serving skew

Training-serving skew means features are computed differently in training (a batch SQL job) and in production (a real-time service), so the model sees different inputs live than it learned from. It silently destroys performance. Typical causes are different code paths, different time windows, timezone handling, missing-value handling, or data that only becomes available later.

Feature stores (Feast, Tecton, cloud offerings) define each feature once and serve it consistently for training, with point-in-time correctness (module 3), and for real-time prediction.

## Model registry

A registry stores model versions with their metadata: metrics, training data version, code version, who approved them and their stage (staging, production, archived). Deployments reference a registry version, so you always know what is running and can roll back.

## How models are served

| Pattern | How | When |
|---------|-----|------|
| batch | a scheduled job scores all records and writes predictions to a table | predictions can be hours old: churn risk lists, nightly recommendations, forecasts |
| online / real-time | an API (REST or gRPC) returns a prediction per request | the answer depends on the moment: fraud at checkout, search ranking |
| streaming | consume events from a queue (Kafka), score them, emit results | continuous event flows, monitoring |
| edge / on-device | the model runs on the phone, browser or device | privacy, offline use, ultra-low latency |

Batch is simpler, cheaper and easier to debug. Choose real-time only when the use case demands it.

A typical online serving stack is a web framework (FastAPI is the common Python choice) or a model server (BentoML, TorchServe, NVIDIA Triton, KServe, or vLLM for LLMs), packaged in a Docker container, run on Kubernetes or a managed cloud service behind a load balancer, with autoscaling. The numbers to watch are latency (p50, p95, p99), throughput, error rate and cost per prediction.

## Releasing safely

In a shadow deployment the new model receives real traffic and its predictions are logged but not used, so you can compare it with the current model at no risk. A canary release sends a small share of traffic, 1-5%, to the new model, watches the metrics and then ramps up. An A/B test splits users at random to measure business impact properly (module 2 statistics). Blue-green keeps two full environments, switches traffic at once and can switch back instantly. Whichever you use, know how to return to the previous version within minutes, and consider feature flags to turn model-driven behavior on or off without redeploying.

## Testing ML systems

Write unit tests for feature transformations and data cleaning, which is the most bug-prone code, and run data tests on every pipeline run. Model tests check minimum performance on a fixed test set and on critical slices, invariance (changing a name should not change a credit decision) and direction (higher income should not lower the score, if that is the policy). Integration tests check that the serving API returns valid predictions for valid input and clean errors for invalid input. Run load tests before launch.

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

Data (covariate) drift is a change in the inputs, such as new customer segments, a new app version or inflation shifting prices. Concept drift is a change in the relationship between inputs and the label, as when fraudsters adapt or a pandemic changes buying patterns. Label delay is a separate problem: true outcomes arrive late, since a loan defaults after months, so you monitor proxies and drift in the meantime.

Models can be retrained on a schedule (weekly, monthly), when drift or performance alerts fire, or continuously, and every retrain goes through the same evaluation gates. Tune the alerts: if they are too sensitive everyone ignores them, and if they are too lax you hear about problems from customers.

## LLMOps: what changes with LLM applications

Prompts are code, so version, review and test them. Run eval suites in CI on every prompt, model or retrieval change (file 22 in module 7). Log every step of a chain or agent, including inputs, outputs, tool calls, latency and tokens, with a tool such as Langfuse, LangSmith, Arize Phoenix or OpenTelemetry-based tracing. Monitor cost per feature and per customer, because token usage can grow unnoticed. Add guardrails on inputs and outputs, such as PII filters, policy checks and schema validation. Providers update and retire models, so pin versions and re-run evals before switching. Cache at the prompt and response level.

## Maturity levels

At level 0, work is done in manual notebooks, models are copied to servers by hand and nothing is monitored; this is common and fragile. At level 1 there are automated training pipelines, experiment tracking, a registry and basic monitoring. At level 2 the pipelines themselves have CI/CD, retraining is automated with gates, and monitoring and alerting are complete.

Helping a team move from level 0 to level 1 is a valuable contribution for a junior engineer.

## Questions

1. Give two concrete causes of training-serving skew.
2. When would you choose batch scoring over a real-time API? Give an example of each.
3. What is the difference between shadow deployment and a canary release?
4. Labels for your loan model arrive 6 months late. What do you monitor in the meantime?
5. Name four things you would log for every LLM call in production.
