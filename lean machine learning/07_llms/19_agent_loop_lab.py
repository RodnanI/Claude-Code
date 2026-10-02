"""
An agent loop from scratch: an LLM that calls tools until the task is done.
Read 18_agents_and_tool_use.md first.

Tools: a safe calculator, a search over this course's lessons, and a lesson lister.

Two modes, SAME loop code:
  - offline (default without an API key): a scripted stand-in plays the model, so you can
    watch the exact message flow for free
  - live: Claude decides which tools to call

Run it:
  python 19_agent_loop_lab.py
  python 19_agent_loop_lab.py --live "How many lessons are in the deep learning module? Multiply that by 12."
"""

import argparse
import ast
import json
import operator
import os
import re
from pathlib import Path
from types import SimpleNamespace

COURSE_ROOT = Path(__file__).resolve().parent.parent
MODEL = "claude-opus-5-5"
MAX_STEPS = 8


# %% 1. The tools: plain Python functions
OPERATORS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
             ast.Pow: operator.pow, ast.Mod: operator.mod, ast.FloorDiv: operator.floordiv, ast.USub: operator.neg}


def calculator(expression):
    """Evaluate arithmetic safely. NEVER use eval() on model output: it would run any Python code."""
    def walk(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in OPERATORS:
            return OPERATORS[type(node.op)](walk(node.left), walk(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in OPERATORS:
            return OPERATORS[type(node.op)](walk(node.operand))
        raise ValueError(f"unsupported expression element: {type(node).__name__}")
    return str(walk(ast.parse(expression, mode="eval").body))


def search_course(query, max_results=3):
    """Tiny keyword search: lessons ranked by how often the query words appear."""
    words = [w for w in re.findall(r"[a-z]+", query.lower()) if len(w) > 2]
    results = []
    for path in COURSE_ROOT.glob("**/*.md"):
        text = path.read_text(encoding="utf-8")
        score = sum(text.lower().count(w) for w in words)
        if score:
            line = next((l.strip() for l in text.splitlines() if any(w in l.lower() for w in words)), "")
            results.append((score, str(path.relative_to(COURSE_ROOT)), line[:160]))
    results.sort(reverse=True)
    return json.dumps([{"lesson": p, "matches": s, "snippet": l} for s, p, l in results[:max_results]])


def list_lessons(module):
    """List lesson files in a module folder whose name contains `module`, e.g. 'deep_learning'."""
    folders = [d for d in COURSE_ROOT.iterdir() if d.is_dir() and module.lower() in d.name.lower()]
    if not folders:
        raise ValueError(f"no module matching {module!r}. Modules: {sorted(d.name for d in COURSE_ROOT.iterdir() if d.is_dir() and d.name[:2].isdigit())}")
    return json.dumps({f.name: sorted(p.name for p in f.iterdir() if p.suffix in (".md", ".py")) for f in folders})


TOOL_FUNCTIONS = {"calculator": calculator, "search_course": search_course, "list_lessons": list_lessons}

# %% 2. Tool definitions: what the model sees. Descriptions are prompts, write them carefully.
TOOLS = [
    {"name": "calculator",
     "description": "Evaluate an arithmetic expression exactly. Supports + - * / // % ** and parentheses. "
                    "Use it for any calculation instead of doing math in your head.",
     "input_schema": {"type": "object", "properties": {"expression": {"type": "string", "description": "e.g. (3 + 4) * 12"}},
                      "required": ["expression"]}},
    {"name": "search_course",
     "description": "Search the machine learning course lessons by keywords. Returns the best matching lesson "
                    "files with a snippet. Use it to find which lesson covers a topic.",
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "list_lessons",
     "description": "List the lesson files of a course module. The argument is part of the module folder name, "
                    "for example 'deep_learning', 'llms' or 'math'.",
     "input_schema": {"type": "object", "properties": {"module": {"type": "string"}}, "required": ["module"]}},
]


def run_tool(name, tool_input):
    """Execute one tool call. Errors become error RESULTS the model can read, never crashes."""
    try:
        return {"content": TOOL_FUNCTIONS[name](**tool_input), "is_error": False}
    except Exception as e:
        return {"content": f"Error: {e}", "is_error": True}


# %% 3. A scripted stand-in for the model (offline mode)
# It returns objects shaped like the SDK's responses, following a fixed plan. The loop below
# cannot tell the difference, which is the point: the loop is just plumbing around a model.
def block(**fields):
    return SimpleNamespace(**fields)


class ScriptedModel:
    def __init__(self):
        self.step = 0

    def create(self, **request):
        self.step += 1
        if self.step == 1:      # first turn: call two tools in parallel
            return block(stop_reason="tool_use", content=[
                block(type="text", text="I will compute the product and search the course in parallel."),
                block(type="tool_use", id="call_1", name="calculator", input={"expression": "1234 * 5678"}),
                block(type="tool_use", id="call_2", name="search_course", input={"query": "data leakage"}),
            ])
        if self.step == 2:      # second turn: a deliberately bad call, to show error handling
            return block(stop_reason="tool_use", content=[
                block(type="tool_use", id="call_3", name="calculator", input={"expression": "__import__('os').getcwd()"}),
            ])
        results = request["messages"][-3]["content"]           # read the earlier tool results
        product = results[0]["content"]
        lesson = json.loads(results[1]["content"])[0]["lesson"]
        return block(stop_reason="end_turn", content=[block(type="text", text=(
            f"1234 * 5678 = {product}. Data leakage is explained in {lesson}. "
            "(My second calculator call was rejected as unsafe, so I ignored it.)"))])


# %% 4. THE AGENT LOOP (identical for both modes)
def run_agent(task, model_api, extra_params):
    messages = [{"role": "user", "content": task}]
    for step in range(1, MAX_STEPS + 1):
        response = model_api.create(model=MODEL, max_tokens=4096, tools=TOOLS, messages=messages, **extra_params)
        messages.append({"role": "assistant", "content": response.content})
        for b in response.content:
            if b.type == "text" and b.text.strip():
                print(f"[step {step}] model says: {b.text.strip()}")
        if response.stop_reason != "tool_use":
            if response.stop_reason in ("max_tokens", "refusal"):
                print(f"[step {step}] stopped early: {response.stop_reason}")
            return messages
        tool_results = []
        for b in response.content:
            if b.type == "tool_use":
                result = run_tool(b.name, b.input)
                status = "ERROR" if result["is_error"] else "ok"
                print(f"[step {step}] tool {b.name}({json.dumps(b.input)}) -> {status}: {result['content'][:100]}")
                tool_results.append({"type": "tool_result", "tool_use_id": b.id, **result})
        messages.append({"role": "user", "content": tool_results})     # ALL results in ONE message
    print(f"stopped: reached MAX_STEPS={MAX_STEPS}")
    return messages


def show_transcript(messages):
    print("\nthe conversation the model saw, as message roles and block types:")
    for m in messages:
        if isinstance(m["content"], str):
            kinds = ["text"]
        else:
            kinds = [c["type"] if isinstance(c, dict) else c.type for c in m["content"]]
        print(f"  {m['role']:<9} {kinds}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("task", nargs="?", default="What is 1234 * 5678, and which lesson explains data leakage?")
    parser.add_argument("--live", action="store_true", help="use Claude even without ANTHROPIC_API_KEY set")
    args = parser.parse_args()

    has_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
    if has_key or args.live:
        import anthropic
        api = anthropic.Anthropic().beta.messages
        extra = {"output_config": {"effort": "low"},
                 "betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}
        print(f"LIVE mode with {MODEL}\nTASK: {args.task}\n")
        transcript = run_agent(args.task, api, extra)
    else:
        print("OFFLINE mode: a scripted model plays the LLM (set ANTHROPIC_API_KEY for the real thing)")
        print("TASK: What is 1234 * 5678, and which lesson explains data leakage?\n")
        transcript = run_agent("What is 1234 * 5678, and which lesson explains data leakage?", ScriptedModel(), {})
    show_transcript(transcript)

# Your turn
# 1. Add a tool `read_lesson(path)` that returns the first 2,000 characters of a lesson. Restrict it to
#    files inside COURSE_ROOT (a model-supplied path is untrusted: block "../" tricks).
# 2. Add a cost cap: stop the loop when total output tokens exceed a budget (live mode: response.usage).
# 3. In live mode, ask something the tools cannot answer ("What is the weather in Paris?"). Does the
#    model say so, or invent an answer? How would you change the system prompt?
