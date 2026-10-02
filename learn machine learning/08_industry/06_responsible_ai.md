# Responsible AI: Fairness, Explainability, Privacy, Security

This is not a soft topic for the ethics committee. Models that discriminate, leak data or get manipulated cause lawsuits, regulatory fines, headlines and real harm to people. Engineers who understand these risks are the ones trusted with important systems.

## Fairness

### Where bias comes from

- **Historical bias**: the data reflects a biased past. A hiring model trained on past hires learns past preferences.
- **Representation bias**: some groups are underrepresented, so the model is worse for them (face recognition trained mostly on lighter skin performed worse on darker skin in well-documented audits).
- **Measurement bias**: the label is a flawed proxy. Using "past healthcare spending" as a proxy for "health need" underestimates need for groups who historically had less access to care; a widely cited 2019 study found exactly this in a deployed system.
- **Aggregation bias**: one model for groups whose patterns differ.
- **Feedback loops**: predictions shape future data (predictive policing sends more patrols to an area, which records more incidents there).

Removing the sensitive attribute (race, gender) does **not** fix this: other features (zip code, name, purchase history) act as **proxies**.

### Measuring it

Compute your metrics **per group**, always. Common fairness criteria:

| Criterion | Requires | Intuition |
|-----------|----------|-----------|
| demographic parity | equal rate of positive predictions across groups | equal outcomes |
| equal opportunity | equal true positive rate (recall) across groups | qualified people have equal chances |
| equalized odds | equal true positive AND false positive rates | equal error rates |
| calibration within groups | a score of 0.7 means 70% for every group | scores mean the same thing for everyone |

Hard truth: when base rates differ between groups, these criteria **cannot all be satisfied at once** (a proven impossibility result). Choosing which matters is a value judgment that involves legal, domain and ethics input, not only engineering. Your job is to measure, make the trade-offs visible and document the choice.

Mitigations: better and more representative data, reweighting, group-aware thresholds where legally allowed, constraints during training, and human review of high-stakes decisions.

## Explainability

| Question | Tools |
|----------|-------|
| what does the model rely on overall? (global) | permutation importance, partial dependence plots, SHAP summary plots |
| why this prediction for this person? (local) | SHAP values, LIME, counterfactuals ("you would have been approved with 5,000 more income") |
| can a human follow the whole model? | inherently interpretable models: linear models, small trees, scorecards |

Explanations matter for debugging (finding leakage and spurious shortcuts), for trust, and for law: many jurisdictions require giving reasons for credit and other significant automated decisions. For high-stakes decisions on tabular data, consider whether an interpretable model is good enough before reaching for a black box with explanations bolted on.

LLMs add a twist: a model's stated reasons for an answer are generated text and may not reflect what actually drove the output. Treat self-explanations as claims to verify, not as ground truth.

## Privacy

- **Data minimization**: collect and keep only what you need, only as long as you need it.
- **Personal data (PII)**: names, emails, phone numbers, addresses, IDs, and combinations that identify someone. Know where it flows in your pipelines.
- **Anonymization is hard**: removing names is not enough. Combinations like zip code + birth date + gender identify most people. Famous "anonymized" datasets have been re-identified.
- **Models can memorize**: large models can reproduce rare training examples verbatim, including personal data and secrets. **Membership inference** attacks test whether a specific record was in the training set.
- **Differential privacy**: a mathematical guarantee that adding or removing any one person barely changes the output, achieved by adding calibrated noise (to statistics, or to gradients during training). Used by some large tech companies and statistical agencies.
- **Regulation**: GDPR (EU) and similar laws grant rights like access, correction and erasure, and restrict automated decisions with significant effects. Health, finance and children's data have extra rules. Involve your legal and privacy teams early.
- **LLM-specific**: do not paste confidential data into tools that are not approved by your company. Know the data retention and training terms of every API you use.

## Security

| Threat | What it is | Defenses |
|--------|-----------|----------|
| adversarial examples | tiny, crafted input changes that flip a prediction | robust training, input checks, not relying on a single model for security decisions |
| data poisoning | attackers inject bad training data (fake reviews, poisoned web pages) | data provenance, filtering, anomaly detection |
| model extraction | querying an API to copy the model | rate limits, monitoring, terms of service |
| prompt injection | instructions hidden in content an LLM reads | least privilege, separating data from instructions, confirmation for actions (module 7) |
| jailbreaks | prompts that bypass an LLM's safety behavior | layered defenses, output checks, monitoring |
| supply chain | malicious model files or packages; pickle and joblib files can execute code when loaded | trusted sources, `safetensors` format, pinned and scanned dependencies |
| secrets leakage | API keys in code, logs or prompts | secret managers, scanning, never logging credentials |

## Documentation and oversight

- **Model cards**: intended use, out-of-scope uses, data, metrics per slice, limitations (module 5 generates one).
- **Datasheets for datasets**: how data was collected, by whom, consent, known gaps.
- **Human oversight**: for consequential decisions, a human can review, override and handle appeals.
- **Incident process**: a way for users and staff to report harms, and a team that responds.

## Regulation (orientation, not legal advice)

The EU AI Act sorts AI uses into risk tiers: some practices are banned, "high-risk" uses (hiring, credit, education, critical infrastructure, some medical uses and more) face requirements for risk management, data quality, documentation, transparency and human oversight, and general-purpose AI models have their own obligations. Obligations phase in over several years. Other regions have sector rules (finance, health, employment) and their own evolving laws. When your model touches people's opportunities, money, health or legal status, assume regulation applies and ask.

## A practical checklist for any model that affects people

1. Who could be harmed, and how? Who is not in the data?
2. Metrics per relevant group, with uncertainty.
3. Check for leakage-like shortcuts through proxies.
4. Can affected people get an explanation and contest a decision?
5. What personal data is used, is it necessary, and how long is it kept?
6. What happens when the model is wrong, and who notices?
7. Is everything documented so someone else can audit it?

## Check yourself

1. Why does deleting the "gender" column not make a hiring model gender-neutral?
2. Explain the difference between demographic parity and equal opportunity with a loan example.
3. Why is loading a `.joblib` model file from an unknown website a security risk?
4. An LLM explains its decision in fluent detail. Why should you not treat that explanation as the true reason?
