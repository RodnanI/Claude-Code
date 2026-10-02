# Projects

Courses end, and projects are where you learn to do the job. Each project below has a core version, which you should finish, and stretch goals, from which you can pick. Do at least one classical ML project and one LLM project, from start to finish, with a written report.

Every project needs a clear question and a success metric chosen before modeling, a baseline, and a correct split (think about time and groups) with no leakage. It also needs an honest evaluation with uncertainty and per-slice results, a short README covering the problem, data, approach, results, limitations and how to run it, and code that someone else can run with one command.

Where to get data: Kaggle datasets, the UCI Machine Learning Repository, Hugging Face datasets, government open data portals, public APIs, and your own life (your music history, your city's open data, your sports stats).

## 1. Tabular prediction (classical ML)

Pick a real dataset with a business-like question: hotel booking cancellations, loan defaults, bike-sharing demand, house prices, customer churn.

- Core: the full workflow from `05_practical_ml/03_end_to_end_churn_project.py`, on real data: cleaning, leakage audit, baseline, logistic regression, gradient boosting, threshold or decision chosen with an explicit cost model, permutation importance, model card.
- Stretch: time-based validation; calibration; SHAP explanations; a fairness check across a sensitive attribute; a small API serving the model (module 8 lab 03); a monitoring report on a later time period.

## 2. Forecasting

Daily sales, electricity load, website traffic, or weather-related demand.

- Core: seasonal naive baseline, then gradient boosting with lag and calendar features, evaluated with a rolling time-based split. Report MAE in real units.
- Stretch: prediction intervals; holiday effects; compare with a classical statistical model; a short memo on how a planner should use the forecast.

## 3. Image classification with transfer learning

A few thousand labeled images of something you care about (plant diseases, recycling categories, skin lesions from a public dataset, your own photos).

- Core: fine-tune a small pretrained network in PyTorch; train/validation/test split; confusion matrix; inspect the worst errors.
- Stretch: data augmentation study; Grad-CAM style visualization of what the model looks at; export a small model and run it in a simple web page or on your phone.

## 4. Train your own small language model

Extend `07_llms/10_mini_gpt.py`.

- Core: train on a corpus you choose (a book collection, song lyrics, code, your own writing) with the BPE tokenizer from lab 03 instead of characters. Track train and validation loss; report perplexity; compare model sizes.
- Stretch: implement RoPE instead of learned positions; add a KV cache to generation and measure the speedup; follow Andrej Karpathy's nanoGPT to reproduce GPT-2 small on a rented GPU.

## 5. A RAG assistant over real documents

This is the LLM project most relevant to jobs.

Pick a document set: a product's documentation, a set of public policies, your university's rules, a game's wiki.

- Core: ingestion and chunking with metadata; hybrid retrieval (BM25 + a real embedding model); an LLM answer with citations and an explicit "not found" path; an evaluation set of at least 50 real questions with labeled source chunks; recall@k plus answer correctness and faithfulness.
- Stretch: a reranker; query rewriting; prompt injection tests; cost and latency per answer; a small web interface; an ablation table showing which component helped how much.

## 6. An agent that does a real multi-step task

Examples: a research assistant that searches a document collection and writes a cited summary; a data analyst agent that answers questions by writing and running SQL against a sample database (in a sandbox, read-only).

- Core: tool definitions, the agent loop, step and cost limits, error handling, a set of 20+ tasks with checkable outcomes, success rate over several runs.
- Stretch: compare a fixed workflow against the agent on the same tasks; add human confirmation for risky actions; analyze failure transcripts and fix the top two failure modes.

## 7. Fine-tune a small open model

- Core: pick a narrow task (classifying support tickets, extracting fields from invoices, rewriting text into a fixed style). Build an evaluation set first. Measure a small open model with a good prompt, then fine-tune it with LoRA (Hugging Face `peft` and `trl`) and compare quality, cost and latency.
- Stretch: compare against a large API model; quantize the fine-tuned model and measure the quality drop; distill outputs from a larger model into the small one.

## 8. Deploy and monitor anything

Take any model above and run it like production:

- Core: FastAPI service in Docker, input validation, logging, a health check, a load test with latency percentiles.
- Stretch: deploy to a free cloud tier; a scheduled batch job; drift monitoring with PSI on incoming data; a dashboard; a written runbook.

## Presenting a project

Start with one paragraph on the problem and why it matters. State the headline result in plain words with the baseline beside it. Describe what was hard, such as data issues, leakage you caught or a failed approach, and what you did about it. Cover the limitations and what you would do next, and end with a link to clean code and a README that runs.

Interviewers remember the candidate who says "my first model looked amazing until I found that a feature leaked the label" much longer than the one with the highest accuracy.
