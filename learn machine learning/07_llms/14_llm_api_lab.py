"""
Calling an LLM from Python with the Claude Messages API. Read 13_llm_apis.md first.

Sections: a basic call, system prompt + multi-turn, streaming, token counting and cost,
structured JSON output, prompt caching, and error handling.

Run it:
  python 14_llm_api_lab.py          DRY RUN when no API key is set: prints the exact requests
  python 14_llm_api_lab.py --live   force live mode (for example after `ant auth login`)

Live mode needs `pip install anthropic` and an API key from console.anthropic.com in the
ANTHROPIC_API_KEY environment variable. A full live run costs a few cents.
"""

import argparse
import json
import os
from pathlib import Path

COURSE_ROOT = Path(__file__).resolve().parent.parent

# The capable default. Swap in "claude-sonnet-5-5" or "claude-haiku-4-5" to compare speed,
# cost and quality on your own tasks.
MODEL = "claude-opus-5-5"
# Price per million tokens (input, output), from the pricing page at the time of writing.
PRICES = {"claude-opus-5-5": (4.00, 20.00), "claude-sonnet-5-5": (2.00, 10.00), "claude-haiku-4-5": (1.00, 5.00)}
spent = []      # (input_tokens, output_tokens) of every live call, to report the total cost


# %% Helpers
def make_client(force_live):
    has_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
    if not (has_key or force_live):
        print("No ANTHROPIC_API_KEY found: DRY RUN. Each request is printed instead of sent.\n")
        return None
    try:
        import anthropic
    except ImportError:
        raise SystemExit("Install the SDK first: pip install anthropic")
    return anthropic.Anthropic()        # finds the key in the environment (never hardcode keys)


def build_params(messages, system=None, max_tokens=1024, effort="low", output_format=None, **extra):
    """Assemble a request. Model-specific options live here so the sections stay readable."""
    params = {"model": MODEL, "max_tokens": max_tokens, "messages": messages, **extra}
    if system:
        params["system"] = system
    output_config = {}
    if not MODEL.startswith("claude-haiku"):
        # effort: how much the model reasons before answering (low, medium, high, xhigh, max).
        # Low is plenty for these small tasks and keeps the cost down.
        output_config["effort"] = effort
        # Safety net: if the model declines a request (stop_reason "refusal"), the API retries it
        # server-side on a recommended fallback model. A beta feature, so it uses client.beta.
        params["betas"] = ["server-side-fallback-2026-07-01"]
        params["fallbacks"] = "default"
    if output_format:
        output_config["format"] = output_format
    if output_config:
        params["output_config"] = output_config
    return params


def show_request(params):
    def shorten(value):
        if isinstance(value, str) and len(value) > 300:
            return value[:300] + f"... [{len(value) - 300} more characters]"
        if isinstance(value, list):
            return [shorten(v) for v in value]
        if isinstance(value, dict):
            return {k: shorten(v) for k, v in value.items()}
        return value
    print("  request:", json.dumps(shorten(params), indent=2).replace("\n", "\n  "))


def text_of(response):
    return "".join(block.text for block in response.content if block.type == "text")


def report(response):
    """Always look at stop_reason and usage, not just the text."""
    u = response.usage
    price_in, price_out = PRICES.get(response.model, PRICES[MODEL])
    cost = (u.input_tokens * price_in + u.output_tokens * price_out) / 1e6
    spent.append((u.input_tokens, u.output_tokens))
    request_id = getattr(response, "_request_id", None)      # log it: support needs it to debug a call
    print(f"  [stop_reason={response.stop_reason} input={u.input_tokens} output={u.output_tokens} "
          f"tokens, about ${cost:.4f}" + (f", request id {request_id}]" if request_id else "]"))
    if response.stop_reason == "max_tokens":
        print("  WARNING: the answer was cut off. Raise max_tokens.")
    if response.stop_reason == "refusal":
        details = getattr(response, "stop_details", None)
        print(f"  The model declined. Category: {getattr(details, 'category', None)}")


def send(client, params):
    if client is None:
        show_request(params)
        return None
    api = client.beta.messages if "betas" in params else client.messages
    response = api.create(**params)
    print(" ", text_of(response).strip().replace("\n", "\n  "))
    report(response)
    return response


# %% Sections
def basic_call(client):
    print("=== 1. One question, one answer")
    send(client, build_params([{"role": "user", "content": "In two sentences: what is overfitting?"}]))


def multi_turn(client):
    print("\n=== 2. System prompt and a multi-turn conversation")
    system = "You are a patient ML tutor. Answer in at most three sentences. Use one concrete example."
    history = [{"role": "user", "content": "What is a learning rate?"}]
    first = send(client, build_params(history, system=system))
    # The API is stateless: to continue, append the reply and the next question, then resend ALL of it.
    history.append({"role": "assistant", "content": text_of(first) if first else "(the model's first answer)"})
    history.append({"role": "user", "content": "And what happens if I set it 100 times too high?"})
    send(client, build_params(history, system=system))
    print(f"  (the second request carried {len(history)} messages: the whole conversation so far)")


def streaming(client):
    print("\n=== 3. Streaming: text arrives as it is generated")
    params = build_params([{"role": "user", "content": "Write a four-line poem about gradient descent."}])
    if client is None:
        show_request(params)
        return
    api = client.beta.messages if "betas" in params else client.messages
    print("  ", end="")
    with api.stream(**params) as stream:
        for text in stream.text_stream:
            print(text.replace("\n", "\n  "), end="", flush=True)
        final = stream.get_final_message()
    print()
    report(final)


def count_tokens(client):
    print("\n=== 4. Counting tokens before you pay for them")
    system = "You classify customer support tickets into billing, bug, account or other."
    messages = [{"role": "user", "content": "Ticket: I was charged twice for my subscription this month."}]
    if client is None:
        print("  request: client.messages.count_tokens(model=MODEL, system=..., messages=...)")
        n_tokens = 40            # a placeholder so the arithmetic below still runs
    else:
        n_tokens = client.messages.count_tokens(model=MODEL, system=system, messages=messages).input_tokens
    price_in, price_out = PRICES[MODEL]
    per_day = 50_000
    daily = per_day * (n_tokens * price_in + 20 * price_out) / 1e6     # assume ~20 output tokens per label
    print(f"  {n_tokens} input tokens per ticket. At {per_day:,} tickets/day with ~20 output tokens each: "
          f"about ${daily:,.2f}/day on {MODEL}")
    print("  Run the same numbers for a cheaper model before deciding. That is a normal design review question.")


def structured_output(client):
    print("\n=== 5. Structured output: JSON that matches a schema")
    schema = {
        "type": "object",
        "properties": {
            "category": {"type": "string", "enum": ["billing", "bug", "account", "other"]},
            "urgency": {"type": "string", "enum": ["low", "medium", "high"]},
            "summary": {"type": "string"},
        },
        "required": ["category", "urgency", "summary"],
        "additionalProperties": False,
    }
    tickets = [
        "I was charged twice this month and need a refund before my rent is due!!",
        "The export button does nothing in Firefox. Not urgent, I can use Chrome.",
        "How do I change the email address on my account?",
    ]
    for ticket in tickets:
        params = build_params(
            [{"role": "user", "content": f"Classify this support ticket:\n\n{ticket}"}],
            output_format={"type": "json_schema", "schema": schema},
        )
        if client is None:
            show_request(params)
            break
        api = client.beta.messages if "betas" in params else client.messages
        response = api.create(**params)
        if response.stop_reason == "refusal":
            report(response)
            continue
        data = json.loads(text_of(response))          # guaranteed to parse; still validate the VALUES
        print(f"  {data['category']:<8} {data['urgency']:<7} {data['summary']}")
        report(response)


def prompt_caching(client):
    print("\n=== 6. Prompt caching: pay full price for a long prefix only once")
    lessons = sorted(COURSE_ROOT.glob("0[3-5]_*/*.md"))
    reference = "\n\n".join(p.read_text(encoding="utf-8") for p in lessons)[:40_000]
    system = "Answer questions using only the course notes below. Be brief.\n\n<notes>\n" + reference + "\n</notes>"
    for question in ["What is data leakage? One sentence.", "Name two fixes for overfitting. One sentence."]:
        # cache_control marks the request for automatic caching of its longest stable prefix.
        params = build_params([{"role": "user", "content": question}], system=system,
                              cache_control={"type": "ephemeral"})
        if client is None:
            show_request(params)
            print("  (the second request would reuse the cached notes)")
            break
        api = client.beta.messages if "betas" in params else client.messages
        response = api.create(**params)
        u = response.usage
        print(f"  Q: {question}\n  A: {text_of(response).strip()}")
        print(f"  cache write {u.cache_creation_input_tokens} tokens, cache read {u.cache_read_input_tokens} tokens, "
              f"uncached {u.input_tokens} tokens")
        spent.append((u.input_tokens, u.output_tokens))
    print("  Expect a cache WRITE on the first call and a cache READ (much cheaper) on the second.")


def error_handling(client):
    print("\n=== 7. Errors: catch the specific ones first")
    if client is None:
        print("  (live mode only) Retry 429 rate limits and 5xx server errors with backoff (the SDK already\n"
              "  retries twice). Never retry 400/401/404: those are bugs in your request.")
        return
    import anthropic
    try:
        client.messages.create(model="claude-does-not-exist", max_tokens=10,
                               messages=[{"role": "user", "content": "hi"}])
    except anthropic.NotFoundError as e:
        print(f"  NotFoundError (404): {e.message}  -> fix the model name, do not retry")
    except anthropic.RateLimitError:
        print("  RateLimitError (429) -> wait and retry with exponential backoff")
    except anthropic.APIStatusError as e:
        print(f"  APIStatusError {e.status_code}: retry only if >= 500")
    except anthropic.APIConnectionError:
        print("  network problem -> retry later")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="call the API even without ANTHROPIC_API_KEY set")
    args = parser.parse_args()
    client = make_client(args.live)
    for section in [basic_call, multi_turn, streaming, count_tokens, structured_output, prompt_caching, error_handling]:
        section(client)
    if spent:
        price_in, price_out = PRICES[MODEL]
        total = sum(i * price_in + o * price_out for i, o in spent) / 1e6
        print(f"\nTotal for this run: about ${total:.3f} (cache discounts not included)")

# Your turn
# 1. Change MODEL to "claude-haiku-4-5". Compare answers, speed and cost per call.
# 2. Set max_tokens=20 in the basic call. Watch stop_reason become "max_tokens".
# 3. Add a "language" field to the ticket schema and test tickets written in other languages.
# 4. Put the current time at the START of the cached system prompt and rerun section 6. What
#    happens to cache reads, and why?
