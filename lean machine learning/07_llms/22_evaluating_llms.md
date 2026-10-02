# Evaluating LLMs and LLM Applications

If you remember one thing from the LLM module: **evaluation is the core skill.** Anyone can write a prompt that works on three examples. The people who get promoted are the ones who can prove a change made things better, catch regressions before users do, and say which model to use with numbers instead of vibes. Lab: `23_eval_harness_lab.py`.

## Three levels of evaluation

| Level | Question | Examples |
|-------|----------|----------|
| model benchmarks | how capable is this model in general? | public leaderboards |
| application evals | does **our system** do **our task** well? | your own test sets, graders, LLM judges |
| online metrics | does it help real users and the business? | A/B tests, resolution rate, user edits, retention |

Benchmarks help you shortlist models. Application evals decide what you ship. Online metrics decide whether it was worth it.

## Public benchmarks (know the names, distrust the numbers)

| Benchmark | Measures |
|-----------|----------|
| MMLU / MMLU-Pro | broad knowledge across academic subjects (multiple choice) |
| GPQA | very hard graduate-level science questions |
| GSM8K, MATH, AIME | grade-school to competition math |
| HumanEval, MBPP | writing small Python functions that pass tests |
| SWE-bench | fixing real GitHub issues in real repositories |
| LMArena (formerly Chatbot Arena) | crowd-sourced head-to-head human preferences, Elo-style ratings |
| needle-in-a-haystack and long-context suites | finding and using information deep in long inputs |
| agent benchmarks (tool use, browsing, terminal tasks) | multi-step task completion |

Why to distrust them:

- **Contamination**: test questions leak into training data, so scores measure memory.
- **Saturation**: top models all score 90%+, so differences become noise.
- **Teaching to the test**: labs optimize for headline benchmarks (Goodhart's law).
- **Not your task**: a model that wins at competition math may be worse at your customer emails.

**Perplexity** (module 7 file 06 and module 2) measures how well a model predicts text. It is essential during pretraining and nearly useless for judging a chat product.

## Building your own evaluation set

1. **Collect real inputs**: production logs, support tickets, user questions, documents. Synthetic examples are a supplement, not a foundation.
2. **Cover the space**: common cases, edge cases (empty input, other languages, very long input), adversarial cases (prompt injections, attempts to get forbidden output), and every bug you ever fixed.
3. **Define what "correct" means** per example: an exact expected answer, a set of required facts, or a rubric.
4. **Tag slices**: category, language, difficulty, customer tier. Averages hide failures.
5. **Start small, grow constantly**: 50-200 well-chosen examples beat 5,000 random ones on day one. Add new failure cases weekly.
6. **Keep a held-out test portion** you do not look at while iterating on prompts, or you will overfit your prompt to your eval (yes, the same overfitting as module 3).
7. **Version it** like code.

## Grading methods, from most to least reliable

### Code-based checks (use whenever possible)

Exact match after normalization, regular expressions, "contains all required items", numeric tolerance, JSON schema validity, running generated code against unit tests, executing generated SQL and comparing results. Fast, cheap, deterministic, no judgment drift.

### LLM-as-judge

For open-ended outputs (summaries, explanations, support replies), a model grades the output against a rubric. Practical rules:

- **Specific rubrics** beat "rate the quality 1-10": list concrete criteria ("mentions the refund window", "under 100 words", "no promises about delivery dates").
- Prefer **binary or small scales** per criterion over one fuzzy overall score.
- **Pairwise comparison** ("which of A and B better follows the rubric?") is often more reliable than absolute scores.
- Known biases: **position bias** (prefers the first or second option; swap order and average), **verbosity bias** (longer looks better), **self-preference** (a model may favor its own style).
- **Calibrate against humans**: have people label 50-100 examples and measure agreement with the judge before trusting it at scale.
- Ask the judge for a short justification; it makes judgments auditable.

### Human evaluation

The ground truth for subjective quality and high-stakes domains. Slow and expensive, so use it to calibrate automated graders, to review samples, and for launch decisions. Write clear guidelines and measure agreement between raters; if humans disagree, your task is underspecified.

## Special cases

- **RAG**: evaluate retrieval (recall@k) separately from generation (correctness, faithfulness to sources, citation accuracy). File 16.
- **Agents**: task success rate on realistic tasks, steps and cost per success, failure-mode analysis from transcripts. File 18.
- **Safety**: harmful request sets, jailbreak attempts, prompt injection tests, privacy leaks, over-refusal tests (refusing harmless requests is also a failure).
- **Classification-like tasks**: use the metrics from module 3 (precision, recall, confusion matrices). An LLM classifier is still a classifier.

## Statistics still apply

- A pass rate on 100 examples has an uncertainty of several percentage points (module 2). "71% vs 74%" on 100 examples is not a result.
- Compare systems **on the same examples** (paired comparison) and look at which examples flipped.
- LLM outputs vary between runs. For important decisions, run several times or use low-variance settings and report the spread.
- Look at **regressions**, not just the average: a new prompt that fixes 10 cases and breaks 8 different ones has a +2 average and a lot of angry users.

## Eval-driven development (the workflow)

1. Write the eval before (or together with) the prompt.
2. Establish a baseline score.
3. Change one thing. Re-run. Read the failures, not just the number.
4. Keep the change only if it improves the target slices without unacceptable regressions.
5. Run the eval automatically on every prompt or model change (continuous integration for prompts).
6. When switching models (new version, cheaper model), the eval tells you within an hour whether it is safe.
7. After launch, mine production for new failures and add them to the eval.

Cost and latency are part of the score. A system that is 1 point better and 3 times more expensive is often worse.

## Check yourself

1. Why is a model's MMLU score weak evidence that it will work for your legal-document summarizer?
2. Design three code-based checks for a system that extracts invoice data into JSON.
3. Your LLM judge prefers system B 60% of the time, but when you swap the order of A and B in the prompt, it prefers A 58% of the time. What is going on?
4. A prompt change raises your pass rate from 82% to 85% on 120 examples. What else do you look at before shipping?
