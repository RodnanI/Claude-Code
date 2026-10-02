# Responsible AI

This topic covers fairness, explainability, privacy and security, and it is an engineering matter and not only a job for an ethics committee. Models that discriminate, leak data or get manipulated cause lawsuits, regulatory fines, bad press and real harm to people, and engineers who understand these risks get trusted with important systems.

## Fairness

### Where bias comes from

Bias has several sources.

- Historical bias: the data reflects a biased past, so a hiring model trained on past hires learns past preferences.
- Representation bias: some groups are underrepresented and the model is worse for them. Face recognition trained mostly on lighter skin performed worse on darker skin in well-documented audits.
- Measurement bias: the label is a flawed proxy. Using past healthcare spending as a proxy for health need underestimates the need of groups who historically had less access to care, and a widely cited 2019 study found this in a deployed system.
- Aggregation bias: one model is used for groups whose patterns differ.
- Feedback loops: predictions shape future data. Predictive policing sends more patrols to an area, which records more incidents there.

Removing the sensitive attribute (race, gender) does not fix this, because other features such as zip code, name and purchase history act as proxies.

### Measuring it

Always compute your metrics per group. Common fairness criteria are:

| Criterion | Requires | Intuition |
|-----------|----------|-----------|
| demographic parity | equal rate of positive predictions across groups | equal outcomes |
| equal opportunity | equal true positive rate (recall) across groups | qualified people have equal chances |
| equalized odds | equal true positive AND false positive rates | equal error rates |
| calibration within groups | a score of 0.7 means 70% for every group | scores mean the same thing for everyone |

When base rates differ between groups, these criteria cannot all be satisfied at once, which is a proven impossibility result. Choosing which one matters is a value judgment that needs legal, domain and ethics input as well as engineering. Your job is to measure, make the trade-offs visible and document the choice.

Mitigations: better and more representative data, reweighting, group-aware thresholds where legally allowed, constraints during training, and human review of high-stakes decisions.

## Explainability

| Question | Tools |
|----------|-------|
| what does the model rely on overall? (global) | permutation importance, partial dependence plots, SHAP summary plots |
| why this prediction for this person? (local) | SHAP values, LIME, counterfactuals ("you would have been approved with 5,000 more income") |
| can a human follow the whole model? | inherently interpretable models: linear models, small trees, scorecards |

Explanations matter for debugging, where they expose leakage and spurious shortcuts, for trust, and for the law, since many jurisdictions require reasons for credit and other significant automated decisions. For high-stakes decisions on tabular data, check whether an interpretable model is good enough before reaching for a black box with explanations added on.

With LLMs, a model's stated reasons for an answer are generated text and may not reflect what actually drove the output. Treat self-explanations as claims to verify.

## Privacy

Collect and keep only the data you need, for only as long as you need it. Personal data (PII) covers names, emails, phone numbers, addresses, IDs and combinations that identify someone, and you should know where it flows in your pipelines. Anonymization is hard: removing names is not enough, because zip code, birth date and gender together identify most people, and well-known "anonymized" datasets have been re-identified. Large models can memorize and reproduce rare training examples verbatim, including personal data and secrets, and membership inference attacks test whether a specific record was in the training set. Differential privacy gives a mathematical guarantee that adding or removing any one person barely changes the output, by adding calibrated noise to statistics or to gradients during training; some large tech companies and statistical agencies use it. GDPR in the EU and similar laws grant rights of access, correction and erasure and restrict automated decisions with significant effects, and health, finance and children's data carry extra rules, so involve legal and privacy teams early. For LLMs, do not paste confidential data into tools your company has not approved, and know the retention and training terms of every API you use.

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

Model cards record intended use, out-of-scope uses, data, metrics per slice and limitations (module 5 generates one). Datasheets for datasets record how the data was collected, by whom, with what consent and with which known gaps. For consequential decisions, a human should be able to review, override and handle appeals. There should also be an incident process: a way for users and staff to report harms and a team that responds.

## Regulation (orientation, not legal advice)

The EU AI Act sorts AI uses into risk tiers. Some practices are banned, high-risk uses (hiring, credit, education, critical infrastructure, some medical uses and others) face requirements for risk management, data quality, documentation, transparency and human oversight, and general-purpose AI models have their own obligations. The obligations phase in over several years. Other regions have sector rules for finance, health and employment and their own evolving laws. If your model touches people's opportunities, money, health or legal status, assume regulation applies and ask.

## Checklist for models that affect people

1. Who could be harmed, and how? Who is not in the data?
2. Metrics per relevant group, with uncertainty.
3. Check for leakage-like shortcuts through proxies.
4. Can affected people get an explanation and contest a decision?
5. What personal data is used, is it necessary, and how long is it kept?
6. What happens when the model is wrong, and who notices?
7. Is everything documented so someone else can audit it?

## Questions

1. Why does deleting the "gender" column not make a hiring model gender-neutral?
2. Explain the difference between demographic parity and equal opportunity with a loan example.
3. Why is loading a `.joblib` model file from an unknown website a security risk?
4. An LLM explains its decision in fluent detail. Why should you not treat that explanation as the true reason?
