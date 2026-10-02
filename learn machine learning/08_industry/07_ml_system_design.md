# ML System Design

"Design a system that recommends videos" or "design fraud detection for a payments company" is a standard interview round for ML engineers, and real projects should be planned the same way. There is no single right answer. Interviewers and good tech leads look for structured thinking, sensible trade-offs and awareness of what goes wrong in production.

## A framework

1. Clarify the problem and requirements, and spend real time here.
   - Business goal and how success is measured.
   - Users and scale: requests per second, number of items, data volume.
   - Latency and freshness: real time or batch? How fresh must data be?
   - Constraints: cost, privacy, explainability, regulation, fairness.
2. Frame it as ML.
   - What exactly is predicted? (Classification, ranking, regression, generation.)
   - What is the label, where does it come from, and how delayed is it?
   - Is ML needed at all? What is the non-ML baseline?
3. Data: sources, labeling, volume, quality issues, class imbalance, privacy, point-in-time correctness.
4. Features: user, item and context features, aggregates over time windows, embeddings; how they are computed offline and online consistently.
5. Model: start with a baseline, then a pragmatic choice, with reasons. Multi-stage designs for large-scale ranking.
6. Evaluation: offline metrics tied to the goal, slices, then online A/B test metrics and guardrails.
7. Serving: batch vs online, latency budget, caching, scaling, fallbacks when the model is down.
8. Monitoring and iteration: drift, data quality, feedback loops, retraining, rollback.
9. Risks: fairness, abuse, privacy, failure modes, cold start.

Say the trade-offs out loud. "I would start with gradient boosting because the data is tabular and it is strong and cheap; if we need raw text, I would add embeddings as features" is a better answer than naming the fanciest model.

## Example 1: fraud detection for card payments

- Requirements: decide in under ~100 ms during checkout; fraud is rare (well under 1% of transactions); missing fraud costs money, blocking good customers costs revenue and trust.
- Label: chargebacks and confirmed fraud reports, arriving days to months later (label delay). Some fraud is never labeled.
- Features: transaction (amount, merchant category, time, currency), card and account history (counts and amounts over the last hour, day, month; time since last transaction), device and location (new device? distance from usual location?), merchant risk, velocity features. Computed in real time from a feature store with point-in-time correct training data.
- Model: rules engine for known patterns plus gradient boosted trees on tabular features (fast, accurate, explainable with SHAP). Possibly graph features (shared devices or cards across accounts).
- Decision: score to action with business-tuned thresholds: approve, step-up verification (one-time code), manual review, decline. Thresholds chosen by cost (module 3).
- Evaluation: precision/recall at the operating points, money saved vs customer friction, per-segment results; time-based validation.
- Serving: low-latency API, fallback to rules if the model times out.
- Monitoring: fraud adapts (concept drift); monitor score distributions, approval rates and confirmed fraud rates; retrain frequently; watch the feedback loop (blocked transactions never get labels).

## Example 2: video recommendations (large-scale ranking)

- Requirements: millions of users and items, personalized home feed, latency of a few hundred ms, goal is long-term satisfaction rather than raw clicks.
- Labels: implicit feedback (watch time, completion, likes, skips, "not interested"). Clicks alone reward clickbait.
- Architecture (multi-stage):
  1. Candidate generation: from millions of items to hundreds, cheaply: two-tower embedding model (user tower, item tower, nearest-neighbor search), plus popular, trending and followed-creator sources.
  2. Ranking: a heavier model scores the candidates with rich features (user history, item stats, context like device and time). Often multi-objective: predicted watch time, like probability, dislike probability, combined into one score.
  3. Re-ranking and policies: diversity, freshness, removing already-seen items, business and safety rules.
- Cold start: new users (use context and popular items, ask for interests), new items (content embeddings from title, thumbnail and transcript).
- Evaluation: offline ranking metrics (NDCG, recall@k) only approximate reality; A/B tests on engagement and satisfaction surveys decide.
- Risks: feedback loops and filter bubbles, popularity bias, harmful content amplification.

## Example 3: an LLM support assistant (RAG)

- Requirements: answer customer questions from help-center articles and policies; cite sources; hand off to a human when unsure; latency of a few seconds with streaming; cost per conversation within budget; never leak other customers' data.
- Data: help articles, policy documents, past resolved tickets (anonymized), product catalog. Freshness: articles change weekly.
- Pipeline: ingestion and chunking with metadata (product, region, date, access level) -> hybrid retrieval (BM25 + embeddings) -> reranking -> LLM answer with citations and an explicit "not found" path -> escalation rules.
- Tools: order lookup and account actions through tools with strict permissions; confirmation before anything that changes an account.
- Evaluation: a golden set from real tickets with expected answers and sources; retrieval recall@k; answer correctness and faithfulness (LLM judge calibrated against human review); escalation precision; safety and prompt injection tests. Online: resolution rate, escalation rate, customer satisfaction, cost per resolved ticket.
- Monitoring: unanswered or low-confidence questions (they reveal missing documentation), cost per conversation, latency, user feedback, drift in question topics.
- Risks: hallucinated policies (legal exposure), prompt injection through user messages, PII handling, over-automation of sensitive cases.

## Common mistakes

Candidates often jump to the model before clarifying the goal and the label, ignore label delay, class imbalance or cold start, choose metrics that do not match the business goal, or forget latency and cost. Others omit a baseline, monitoring or a rollback plan, or treat offline metrics as the final word instead of planning an online test.

## Practice prompts

Design each in 30-45 minutes using the framework, out loud or on paper:

1. Search ranking for an online store.
2. Estimated delivery time for a food delivery app.
3. Detecting duplicate product listings.
4. Spam and abuse detection for a messaging platform.
5. An internal coding assistant that answers questions about your company's codebase.
6. Demand forecasting for a grocery chain's inventory.
