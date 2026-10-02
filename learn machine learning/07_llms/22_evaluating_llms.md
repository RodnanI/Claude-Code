# Evaluating LLMs and LLM Applications

Evaluation is the most useful skill in the LLM module. Anyone can write a prompt that works on three examples, but the people worth hiring can show that a change improved things, catch regressions before users do, and choose a model using numbers. The lab is `23_eval_harness_lab.py`.

## Three levels of evaluation

| Level | Question | Examples |
|-------|----------|----------|
| model benchmarks | how capable is this model in general? | public leaderboards |
| application evals | does our system do our task well? | your own test sets, graders, LLM judges |
| online metrics | does it help real users and the business? | A/B tests, resolution rate, user edits, retention |

Benchmarks help you shortlist models. Application evals decide what you ship. Online metrics decide whether it was worth it.

## Public benchmarks

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

Treat the numbers with suspicion. Test questions leak into training data (contamination), so scores can measure memory. Top models all score above 90% (saturation), so differences become noise. Labs optimize for headline benchmarks, which is Goodhart's law at work. And a model that wins at competition math may be worse at your customer emails.

Perplexity (file 06 and module 2) measures how well a model predicts text. It is essential during pretraining and nearly useless for judging a chat product.

## Building your own evaluation set

1. Collect real inputs from production logs, support tickets, user questions and documents. Synthetic examples can supplement these but should not be the base.
2. Cover the space: common cases, edge cases (empty input, other languages, very long input), adversarial cases (prompt injections, attempts to get forbidden output) and every bug you ever fixed.
3. Define what correct means for each example: an exact expected answer, a set of required facts, or a rubric.
4. Tag slices such as category, language, difficulty and customer tier, because averages hide failures.
5. Start small and keep growing. On day one, 50-200 well-chosen examples beat 5,000 random ones, and new failure cases should be added weekly.
6. Keep a held-out portion you do not look at while iterating on prompts, or you will overfit your prompt to your eval, which is the same overfitting as in module 3.
7. Version the set like code.

## Grading methods, from most to least reliable

### Code-based checks

Use these whenever possible. They include exact match after normalization, regular expressions, checking that all required items appear, numeric tolerance, JSON schema validity, running generated code against unit tests, and executing generated SQL and comparing results. They are fast, cheap and deterministic, and they do not drift.

### LLM-as-judge

For open-ended outputs such as summaries, explanations and support replies, a model grades the output against a rubric. A specific rubric works better than "rate the quality 1-10", for example criteria like "mentions the refund window", "under 100 words" and "no promises about delivery dates". Use binary or small scales per criterion instead of one fuzzy overall score. Pairwise comparison ("which of A and B better follows the rubric?") is often more reliable than absolute scores. Judges have known biases: position bias, which favors the first or second option, so swap the order and average; verbosity bias, where longer looks better; and self-preference, where a model may favor its own style. Before trusting a judge at scale, have people label 50-100 examples and measure how often the judge agrees with them. Ask the judge for a short justification so its decisions can be audited.

### Human evaluation

Human evaluation is the ground truth for subjective quality and high-stakes domains. It is slow and expensive, so use it to calibrate automated graders, to review samples and for launch decisions. Write clear guidelines and measure agreement between raters, because if humans disagree your task is underspecified.

## Special cases

For RAG, evaluate retrieval (recall@k) separately from generation (correctness, faithfulness to sources, citation accuracy); see file 16. For agents, measure task success rate on realistic tasks, steps and cost per success, and analyze failure modes from transcripts (file 18). For safety, use sets of harmful requests, jailbreak attempts, prompt injection tests, privacy leak checks and over-refusal tests, since refusing harmless requests is also a failure. For classification-like tasks, use the module 3 metrics (precision, recall, confusion matrices), because an LLM classifier is still a classifier.

## Statistics still apply

A pass rate on 100 examples has an uncertainty of several percentage points (module 2), so 71% against 74% on 100 examples is not a result. Compare systems on the same examples (a paired comparison) and look at which examples flipped. LLM outputs vary between runs, so for important decisions run several times or use low-variance settings and report the spread. Look at regressions as well as the average: a new prompt that fixes 10 cases and breaks 8 others has a +2 average and many unhappy users.

## Eval-driven development

1. Write the eval before, or together with, the prompt.
2. Establish a baseline score.
3. Change one thing, re-run, and read the failures and not only the number.
4. Keep the change only if it improves the target slices without unacceptable regressions.
5. Run the eval automatically on every prompt or model change, as continuous integration for prompts.
6. When switching models, whether to a new version or a cheaper one, the eval tells you within an hour whether it is safe.
7. After launch, mine production for new failures and add them to the eval.

Cost and latency belong in the score. A system that is 1 point better and 3 times more expensive is often worse.

## Questions

1. Why is a model's MMLU score weak evidence that it will work for your legal-document summarizer?
2. Design three code-based checks for a system that extracts invoice data into JSON.
3. Your LLM judge prefers system B 60% of the time, but when you swap the order of A and B in the prompt, it prefers A 58% of the time. What is going on?
4. A prompt change raises your pass rate from 82% to 85% on 120 examples. What else do you look at before shipping?
