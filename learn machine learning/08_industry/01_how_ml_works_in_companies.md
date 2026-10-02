# How Machine Learning Works Inside Companies

Courses teach models, but companies pay for outcomes. Most junior people struggle in the gap between the two, and the good ones stand out by closing it quickly. This file describes what you are about to walk into.

## Roles

| Role | Spends most time on | Typical tools | What a junior is expected to do |
|------|--------------------|---------------|---------------------------------|
| Data analyst | answering business questions with data, dashboards | SQL, spreadsheets, BI tools | correct queries, clear charts |
| Data scientist (product / analytics) | experiments, metrics, causal questions, insight | SQL, Python, statistics, A/B testing | sound analysis, honest conclusions |
| Data scientist (ML) / applied scientist | building and evaluating models for a product problem | Python, pandas, scikit-learn, boosting, PyTorch | clean, leakage-free modeling with a baseline |
| ML engineer | turning models into reliable production systems | Python, Docker, cloud, pipelines, serving | tested code, pipelines that run every day |
| AI engineer | building products on top of LLMs: prompts, RAG, agents, evals | LLM APIs, vector stores, eval tooling | working features with an evaluation set |
| Data engineer | moving and modeling data so others can use it | SQL, Spark, Airflow/Dagster, warehouses | reliable, documented pipelines |
| ML platform / MLOps engineer | the infrastructure everyone else uses | Kubernetes, CI/CD, registries, feature stores | automation, reliability |
| Research scientist / engineer | new methods, training large models | PyTorch, distributed training, papers | experiments, careful ablations |

Titles vary a lot between companies, and in small ones one person does several of these jobs, so learn a little of each. The quickest way to be valuable as a junior is to be the person whose numbers can be trusted, because correctness matters more than cleverness.

## The life of an ML project

1. Problem framing, with a product manager or business owner. Ask what decision the prediction will change and who makes it, what happens today without ML (that is your baseline), what a wrong prediction costs in each direction, and what counts as good enough to ship. Agree on that last point before you start or the goalposts will move. Note the constraints on latency, cost per prediction, explainability, regulation and privacy.
2. Data audit: where the data lives, who owns it, how good it is, whether labels exist, whether you may legally use it, and what is available at prediction time.
3. Baseline: a heuristic, the current process or a simple model. Many projects end here, successfully.
4. Iteration on features, models and evaluation (modules 3 to 7).
5. Design review: a written proposal reviewed by peers and stakeholders.
6. Productionization: pipelines, tests, serving and monitoring (file 02).
7. Online test: shadow mode, then an A/B test on the business metric.
8. Launch, with a short report on the measured impact.
9. Operation: monitoring, retraining, incident response and documentation.
10. Retirement, once the model is no longer worth its maintenance.

Junior people concentrate on step 4, while the people who get promoted attend to all ten.

## Documents

A design doc covers the problem, goals and non-goals, success metrics, data, approach, alternatives considered, risks, evaluation plan, rollout plan and open questions, in one to six pages. Writing one before you build saves weeks. An experiment report says what you tried, the results with uncertainty, what you concluded and what you would do next, and it includes the failures. A model card states what the model is and is not for, its training data, metrics overall and per slice, and its limitations; the module 5 project generates one. A runbook says what to do when the model or pipeline breaks at 3am. A blameless postmortem explains what went wrong, why, and which changes prevent a repeat.

## Talking to stakeholders

Translate metrics into the stakeholder's units, such as money, hours saved, customers retained or risk reduced. "Recall improved 6 points" means nothing to a sales director, while "catches about 120 more fraudulent orders a month, worth roughly 40,000 dollars" does. State uncertainty plainly: "between 3% and 7% fewer cancellations" is honest, and "5.2%" claims precision you do not have. Say no, or "not yet", and give reasons, because a model on unusable data is worse than no model when people trust it. Show examples as well as aggregates, since five concrete predictions with explanations build more trust than a ROC curve. Report bad news early; surprises late do real damage to your reputation.

## Why ML projects fail

The causes below are listed in rough order of frequency.

1. The problem was not worth solving, or nobody acts on the predictions.
2. No usable data or labels, discovered late.
3. The success metric was not tied to anything the business cares about.
4. Offline results were inflated by leakage or a bad split, and production disappointed.
5. No path to production: the model lived in a notebook.
6. The model decayed and nobody noticed.
7. The model was too complex to maintain after its author left.

The algorithm not being good enough is rarely the cause.

## Technical debt in ML

The paper "Hidden Technical Debt in Machine Learning Systems" (Sculley et al., 2015) observed that the model code is a small box inside a large system of data collection, feature extraction, configuration, serving and monitoring. It lists several common debts. Glue code and pipeline jungles are scripts piled on scripts that nobody fully understands. Entanglement, summed up as "changing anything changes everything", means that changing one feature's preprocessing shifts every downstream behavior. Hidden feedback loops arise when the model's predictions influence the data it is later retrained on, as when a recommender only learns about items it already shows. Undeclared consumers are other teams that quietly depend on your model's outputs, so changing them breaks things you did not know about. Configuration debt is hundreds of untested settings.

The remedies are simple designs, tests, documentation, clear ownership and deleting what is no longer needed.

## Data reality

Data has owners, access requests and approval processes, so start those early. Personal data brings legal obligations on privacy, retention and consent, and you should not copy production data to your laptop. Labels are expensive. You can take them from existing business outcomes (did the customer churn?), from human labeling by in-house experts or vendors with clear guidelines and quality checks, from weak or programmatic labeling, or from LLM-assisted labeling with human spot checks. Label noise is normal, so measure agreement between labelers before blaming the model.

## Engineering habits that make you trusted

Keep code in git and have someone else review it, in small pull requests. Use notebooks for exploration and modules with tests for anything reused or deployed. Make results reproducible with pinned environments, fixed seeds, logged configs and versioned data snapshots, so every number you report can be regenerated from a commit and a command. Read the existing code before writing new code, and ask why things are the way they are before changing them.

## Build versus buy

Before building a model, check whether an API already does the job (speech-to-text, OCR, translation, a general LLM), or a vendor product, or an open-source model. Building from scratch is justified when the problem is core to the business, the data is unique, or off-the-shelf options fail your evaluation. Your time is the most expensive resource in the project.

## Workplace vocabulary

| Term | Meaning |
|------|---------|
| stakeholder | anyone affected by or deciding about your work |
| PM / PRD | product manager / product requirements document |
| OKR | objectives and key results: quarterly goals |
| roadmap | planned work for the coming quarters |
| sprint / stand-up | fixed work period (often 2 weeks) / short daily sync |
| launch review | meeting that approves shipping |
| on-call | being responsible for production issues during a period |
| SLA / SLO | service level agreement / objective, for example "99.9% of requests under 200 ms" |
| postmortem | written analysis after an incident |
| north star metric | the one metric the company or team optimizes |
| guardrail metric | a metric that must not get worse while you optimize another |

## Questions

1. A manager asks for "a model that predicts which customers are unhappy". Write the framing questions you would ask.
2. Your model is 4 points better offline but adds 300 ms of latency to checkout. Who decides whether that is acceptable, and with what information?
3. Give an example of a hidden feedback loop in a system you use daily.
4. Translate "precision 0.62 at recall 0.40" into a sentence for a fraud operations manager.
