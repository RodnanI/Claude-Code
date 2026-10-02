# How Machine Learning Works Inside Companies

Courses teach models. Companies pay for outcomes. The gap between those two is where most junior people struggle and where good ones stand out quickly. This file is the map of the territory you are about to enter.

## The roles (titles vary wildly between companies)

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

Two blunt observations:

- In small companies one person does several of these. Learn enough of each to be dangerous.
- The fastest way to be valuable as a junior is to be the person whose numbers can be trusted. Correctness beats cleverness.

## The life of an ML project

1. **Problem framing** (with a product manager or business owner)
   - What decision will this prediction change, and who makes it?
   - What happens today without ML? (That is your baseline.)
   - What does a wrong prediction cost, in each direction?
   - What is "good enough" to ship? Agree on it before you start, or the goalposts will move.
   - Constraints: latency, cost per prediction, explainability, regulation, privacy.
2. **Data audit**: where does the data live, who owns it, how good is it, are there labels, can we legally use it, what is available at prediction time?
3. **Baseline**: a heuristic, the current process, or a simple model. Many projects end here, successfully.
4. **Iteration**: features, models, evaluation (modules 3 to 7).
5. **Design review**: a written proposal reviewed by peers and stakeholders.
6. **Productionization**: pipelines, tests, serving, monitoring (file 02).
7. **Online test**: shadow mode, then an A/B test on the business metric.
8. **Launch** and a short report on the measured impact.
9. **Operate**: monitoring, retraining, incident response, documentation.
10. **Retire** it when it is no longer worth its maintenance.

Junior people focus on step 4. The people who get promoted care about all ten.

## Writing it down: the documents you will see

- **Design doc**: problem, goals and non-goals, success metrics, data, approach, alternatives considered, risks, evaluation plan, rollout plan, open questions. One to six pages. Writing one before building saves weeks.
- **Experiment report**: what you tried, results with uncertainty, what you concluded, what you would do next. Include the failures.
- **Model card**: what the model is for and not for, training data, metrics overall and per slice, limitations (module 5 project generates one).
- **Runbook**: what to do when the model or pipeline breaks at 3am.
- **Postmortem** (blameless): what went wrong, why, and what changes prevent it again.

## Talking to stakeholders

- Translate metrics into the stakeholder's units: money, hours saved, customers retained, risk reduced. "Recall improved 6 points" means nothing to a sales director; "catches about 120 more fraudulent orders a month, worth roughly 40,000 dollars" does.
- State uncertainty plainly. "Between 3% and 7% fewer cancellations" is honest; "5.2%" pretends to precision you do not have.
- Say no, or "not yet", with reasons. A model on unusable data is worse than no model, because people will trust it.
- Show examples, not only aggregates. Five concrete predictions with explanations build more trust than a ROC curve.
- Bad news early is a gift. Surprises late are career damage.

## Why ML projects fail (in order of frequency, roughly)

1. The problem was not worth solving, or nobody acts on the predictions.
2. No usable data or labels, discovered late.
3. The success metric was not tied to anything the business cares about.
4. Offline results were inflated by leakage or a bad split, and production disappointed.
5. No path to production: the model lived in a notebook.
6. The model decayed and nobody noticed.
7. The model was too complex to maintain after its author left.

Notice that "the algorithm was not good enough" is rarely the cause.

## Technical debt in ML

A classic paper, "Hidden Technical Debt in Machine Learning Systems" (Sculley et al., 2015), observed that the model code is a tiny box in a large system of data collection, feature extraction, configuration, serving and monitoring. Common debts:

- **Glue code and pipeline jungles**: scripts on scripts that nobody fully understands.
- **Entanglement (CACE: "changing anything changes everything")**: change one feature's preprocessing and every downstream behavior shifts.
- **Hidden feedback loops**: the model's predictions influence the data it is later retrained on (a recommender only learns about items it already shows).
- **Undeclared consumers**: other teams quietly depend on your model's outputs; changing them breaks things you did not know about.
- **Configuration debt**: hundreds of settings, untested.

Fighting it: simple designs, tests, documentation, ownership, and deleting things that are no longer needed.

## Data reality

- Data has owners, access requests and approval processes. Start them early.
- Personal data comes with legal obligations (privacy laws, retention rules, consent). Ask before you copy a production table to your laptop. Actually, do not copy production data to your laptop.
- Labels are expensive. Options: existing business outcomes (did the customer churn?), human labeling (in-house experts or vendors, with clear guidelines and quality checks), weak or programmatic labeling, and LLM-assisted labeling with human spot checks.
- Label noise is normal. Measure agreement between labelers before blaming the model.

## Engineering habits that make you trusted

- Code in git, reviewed by someone else. Small pull requests.
- Notebooks for exploration, modules and tests for anything reused or deployed.
- Reproducible results: pinned environments, fixed seeds, logged configs, versioned data snapshots.
- Every number you report can be regenerated from a commit and a command.
- Read the existing code before writing new code. Ask why things are the way they are before changing them.

## Build versus buy

Before building a model, check: is there an API that does this (speech-to-text, OCR, translation, a general LLM)? A vendor product? An open-source model? Building from scratch is justified when the problem is core to the business, the data is unique, or off-the-shelf options fail your evaluation. Your time is the most expensive resource in the project.

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

## Check yourself

1. A manager asks for "a model that predicts which customers are unhappy". Write the framing questions you would ask.
2. Your model is 4 points better offline but adds 300 ms of latency to checkout. Who decides whether that is acceptable, and with what information?
3. Give an example of a hidden feedback loop in a system you use daily.
4. Translate "precision 0.62 at recall 0.40" into a sentence for a fraud operations manager.
