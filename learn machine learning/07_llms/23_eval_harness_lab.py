"""
An evaluation harness covering test cases, graders, version comparison, regressions and confidence.
Read 22_evaluating_llms.md first.

Two rule-based "systems" (v1 and v2) stand in for two prompt versions so the lab runs offline.
With an API key, a third system calls Claude on the same cases, and an LLM judge grades an
open-ended answer against a rubric.

Run it:
  python 23_eval_harness_lab.py
  python 23_eval_harness_lab.py --live      include the Claude system and the LLM judge
"""

import argparse
import json
import os
import re
from datetime import datetime
from pathlib import Path

import numpy as np

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)
MODEL = "claude-opus-5-5"
rng = np.random.default_rng(0)


# %% 1. Test cases: input, expected result, how to grade, and a slice label
CASES = [
    {"id": "date-1", "task": "date", "input": "The meeting is on March 3, 2026.", "expected": "2026-03-03"},
    {"id": "date-2", "task": "date", "input": "Deadline: 2026-07-14, no extensions.", "expected": "2026-07-14"},
    {"id": "date-3", "task": "date", "input": "We launched on 5 Jan 2025 in Berlin.", "expected": "2025-01-05"},
    {"id": "date-4", "task": "date", "input": "Payment due 12/31/2026.", "expected": "2026-12-31"},
    {"id": "date-5", "task": "date", "input": "No date is mentioned here.", "expected": "none"},
    {"id": "sent-1", "task": "sentiment", "input": "I love this product, it is great!", "expected": "positive"},
    {"id": "sent-2", "task": "sentiment", "input": "Terrible support, never again.", "expected": "negative"},
    {"id": "sent-3", "task": "sentiment", "input": "The package arrived on Tuesday.", "expected": "neutral"},
    {"id": "sent-4", "task": "sentiment", "input": "Not bad at all, honestly.", "expected": "positive"},
    {"id": "sent-5", "task": "sentiment", "input": "I wanted to like it, but it broke after a day.", "expected": "negative"},
    {"id": "math-1", "task": "math", "input": "A pack has 12 eggs. How many eggs are in 7 packs?", "expected": 84},
    {"id": "math-2", "task": "math", "input": "What is 15% of 240?", "expected": 36},
    {"id": "math-3", "task": "math", "input": "A train travels 180 km in 2.5 hours. What is its average speed in km/h?", "expected": 72},
    {"id": "json-1", "task": "json", "input": "Maria is 34 years old.", "expected": {"name": "Maria", "age": 34}},
    {"id": "json-2", "task": "json", "input": "Our newest hire, Kenji, just turned 27.", "expected": {"name": "Kenji", "age": 27}},
]


# %% 2. Graders: deterministic code checks wherever possible
def grade(case, output):
    expected = case["expected"]
    if case["task"] in ("date", "sentiment"):
        return str(output).strip().lower() == str(expected)                  # exact match after normalizing
    if case["task"] == "math":
        try:
            return abs(float(output) - expected) < 1e-6                       # numeric tolerance
        except (TypeError, ValueError):
            return False
    if case["task"] == "json":
        try:
            data = json.loads(output) if isinstance(output, str) else output
        except json.JSONDecodeError:
            return False                                                       # invalid JSON fails
        return isinstance(data, dict) and data.get("name") == expected["name"] and data.get("age") == expected["age"]
    raise ValueError(case["task"])


# %% 3. Two versions of a system (stand-ins for "prompt v1" and "prompt v2")
POSITIVE, NEGATIVE = {"love", "great", "good", "excellent", "like"}, {"terrible", "bad", "broke", "awful", "hate"}


def system_v1(case):
    text = case["input"]
    if case["task"] == "date":
        m = re.search(r"\d{4}-\d{2}-\d{2}", text)
        return m.group(0) if m else "none"
    if case["task"] == "sentiment":
        words = set(re.findall(r"[a-z]+", text.lower()))
        score = len(words & POSITIVE) - len(words & NEGATIVE)
        return "positive" if score > 0 else "negative" if score < 0 else "neutral"
    if case["task"] == "math":
        nums = [float(n) for n in re.findall(r"\d+\.?\d*", text)]
        return nums[0] * nums[1] if len(nums) >= 2 else None
    if case["task"] == "json":
        m = re.match(r"(\w+) is (\d+)", text)
        return json.dumps({"name": m.group(1), "age": int(m.group(2))}) if m else "{}"


def system_v2(case):
    text = case["input"]
    if case["task"] == "date":                                                 # v2: understands several formats
        for pattern, fmt in [(r"\d{4}-\d{2}-\d{2}", "%Y-%m-%d"), (r"[A-Z][a-z]+ \d{1,2}, \d{4}", "%B %d, %Y"),
                             (r"\d{1,2} [A-Z][a-z]{2} \d{4}", "%d %b %Y"), (r"\d{1,2}/\d{1,2}/\d{4}", "%m/%d/%Y")]:
            m = re.search(pattern, text)
            if m:
                return datetime.strptime(m.group(0), fmt).strftime("%Y-%m-%d")
        return "none"
    if case["task"] == "sentiment":                                            # v2: naive negation handling
        words = re.findall(r"[a-z]+", text.lower())
        if "but" in words:
            words = words[words.index("but") + 1:]                            # what comes after "but" wins
        score = len(set(words) & POSITIVE) - len(set(words) & NEGATIVE)
        if {"not", "never", "no"} & set(words):
            score = -score                                                    # flips polarity... always?
        return "positive" if score > 0 else "negative" if score < 0 else "neutral"
    if case["task"] == "math":
        nums = [float(n) for n in re.findall(r"\d+\.?\d*", text)]
        if "%" in text:
            return nums[0] / 100 * nums[1]
        if "speed" in text:
            return nums[0] / nums[1]
        return nums[0] * nums[1]
    if case["task"] == "json":
        name = re.search(r"\b([A-Z][a-z]+)\b(?=[^.]*\b(?:is|turned)\b)", text)
        age = re.search(r"\b(\d{1,3})\b", text)
        return json.dumps({"name": name.group(1) if name else None, "age": int(age.group(1)) if age else None})


# %% 4. The harness
def run(system, name):
    rows = []
    for case in CASES:
        try:
            output = system(case)
        except Exception as e:                       # a crash is a failure, not a reason to stop the eval
            output = f"ERROR: {e}"
        rows.append({"id": case["id"], "task": case["task"], "output": output, "passed": grade(case, output), "system": name})
    return rows


def summarize(rows, label):
    passed = np.array([r["passed"] for r in rows])
    by_task = {}
    for r in rows:
        by_task.setdefault(r["task"], []).append(r["passed"])
    per_task = "  ".join(f"{t}={np.mean(v):.0%}" for t, v in by_task.items())
    print(f"{label:<8} pass rate {passed.mean():.0%} ({passed.sum()}/{len(passed)})   {per_task}")
    return passed


results = {"v1": run(system_v1, "v1"), "v2": run(system_v2, "v2")}
print("RESULTS BY VERSION")
p1 = summarize(results["v1"], "v1")
p2 = summarize(results["v2"], "v2")

print("\nWHAT CHANGED (the most important view)")
for r1, r2 in zip(results["v1"], results["v2"]):
    if r1["passed"] != r2["passed"]:
        kind = "FIXED     " if r2["passed"] else "REGRESSION"
        print(f"  {kind} {r1['id']:<7} v1={str(r1['output'])[:30]!r:<34} v2={str(r2['output'])[:30]!r}")
# v2 is better on average AND broke something. "Terrible support, never again" became positive
# because the negation rule flips every sentence containing "never". Averages hide this.

# Paired bootstrap: how sure are we that v2 beats v1 on cases LIKE these?
diffs = p2.astype(int) - p1.astype(int)
boot = [rng.choice(diffs, size=len(diffs), replace=True).mean() for _ in range(5000)]
low, high = np.percentile(boot, [2.5, 97.5])
print(f"\nv2 - v1 = {diffs.mean():+.0%}, 95% bootstrap interval [{low:+.0%}, {high:+.0%}] with only {len(diffs)} cases")
print("Excludes 0: v2 is better on cases like these." if low > 0 else
      "Includes 0: not proven yet. Add more cases before deciding.")
# Even when it excludes 0, the interval is huge: 15 cases cannot tell +10% from +70%.

with open(OUT / "eval_results.jsonl", "w") as f:
    for rows in results.values():
        for r in rows:
            f.write(json.dumps({**r, "output": str(r["output"])}) + "\n")
print("saved every graded output to outputs/eval_results.jsonl (diff these files between runs)")


# %% 5. Optional: the same eval on Claude, plus an LLM judge
INSTRUCTIONS = {
    "date": "Extract the date mentioned in the text as YYYY-MM-DD. If there is no date, answer none. Answer with the date only.",
    "sentiment": "Classify the sentiment of the text as positive, negative or neutral. Answer with one word.",
    "math": "Solve the problem. Answer with the final number only, no units.",
    "json": 'Return only JSON like {"name": "...", "age": 0} for the person in the text.',
}

JUDGE_PROMPT = """You are grading an answer against a rubric. For each criterion answer true or false.
<rubric>
1. accurate: the explanation of overfitting is correct
2. simple: a 12-year-old could follow it (no jargon left unexplained)
3. example: it includes a concrete everyday example
4. short: 80 words or fewer
</rubric>
<answer>
{answer}
</answer>
Respond with JSON only: {{"accurate": bool, "simple": bool, "example": bool, "short": bool, "reason": "one sentence"}}"""


def claude_system(client):
    def system(case):
        response = client.beta.messages.create(
            model=MODEL, max_tokens=200, output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
            messages=[{"role": "user", "content": f"{INSTRUCTIONS[case['task']]}\n\nText: {case['input']}"}],
        )
        text = "".join(b.text for b in response.content if b.type == "text").strip()
        return text.strip("`").removeprefix("json").strip()       # tolerate code fences around JSON
    return system


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    has_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
    if not (has_key or args.live):
        print("\n(no API key: skipping the Claude system. This is the judge prompt it would use:)\n")
        print(JUDGE_PROMPT.format(answer="<the model's explanation of overfitting>"))
    else:
        import anthropic
        client = anthropic.Anthropic()
        print(f"\nCLAUDE ({MODEL}) on the same cases")
        claude_rows = run(claude_system(client), "claude")
        summarize(claude_rows, "claude")
        for r in claude_rows:
            if not r["passed"]:
                print(f"  failed {r['id']}: {r['output']!r}")
        answer = client.beta.messages.create(
            model=MODEL, max_tokens=300, output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
            messages=[{"role": "user", "content": "Explain overfitting to a 12-year-old in under 80 words."}],
        )
        answer_text = "".join(b.text for b in answer.content if b.type == "text")
        verdict = client.beta.messages.create(
            model=MODEL, max_tokens=300, output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
            messages=[{"role": "user", "content": JUDGE_PROMPT.format(answer=answer_text)}],
        )
        print("\nanswer:", answer_text.strip())
        print("judge: ", "".join(b.text for b in verdict.content if b.type == "text").strip())

# Your turn
# 1. Fix v2's negation bug without breaking sent-4. Rerun: did the regression disappear?
# 2. Add 5 cases from a domain you care about, including 2 tricky ones. Which system fails them?
# 3. Swap the judge's order of criteria or ask it twice. Is it consistent? That is judge reliability.
