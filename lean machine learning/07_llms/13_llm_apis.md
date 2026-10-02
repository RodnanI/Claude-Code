# Using LLM APIs

Most LLM work in companies starts here: your code sends text to a model hosted by a provider and gets text back. The API surface is small, but using it well (cost, latency, reliability, safety) is a real skill. Examples use Anthropic's Claude API and its Python SDK; the concepts transfer to every provider. Lab: `14_llm_api_lab.py` (works without an API key in dry-run mode).

## What a call looks like

An API call is an HTTPS request with a JSON body. The SDK builds it for you:

```python
import anthropic
client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY from the environment

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1000,
    system="You are a concise assistant for a bike shop.",
    messages=[{"role": "user", "content": "Do you repair e-bikes?"}],
)
for block in response.content:
    if block.type == "text":
        print(block.text)
```

### The request

| Field | Meaning |
|-------|---------|
| `model` | which model. Different models trade capability, speed and price |
| `max_tokens` | hard cap on output length. Hitting it cuts the answer off mid-sentence |
| `system` | instructions and context that frame the whole conversation |
| `messages` | the conversation: alternating `user` and `assistant` turns, starting with `user` |
| `tools` | functions the model may ask you to call (file 18) |
| `output_config` | e.g. `effort` (how much the model thinks), `format` (force JSON matching a schema) |
| `stream` / `.stream()` | receive tokens as they are generated |

About sampling knobs: older models and open models expose `temperature`, `top_p`, `top_k` (lab 11). Many current API models no longer accept them; for example current Claude models reject them and instead offer an **effort** level (`low`, `medium`, `high`, `xhigh`, `max`) that controls how much the model reasons before answering. Read the docs of the exact model you use.

### The response

| Field | Meaning |
|-------|---------|
| `content` | a list of **blocks**: `text`, `thinking` (reasoning), `tool_use` (a requested function call). Check each block's `type` |
| `stop_reason` | why it stopped: `end_turn` (finished), `max_tokens` (cut off!), `tool_use` (wants a tool), `refusal` (declined), `stop_sequence`, `pause_turn` |
| `usage` | `input_tokens`, `output_tokens`, plus cache read/write counts. This is your bill |

**Always check `stop_reason` before trusting `content`.** An answer cut off by `max_tokens` looks fine in a log until someone reads the last line.

## The API is stateless

The model remembers nothing between calls. A "conversation" is you sending the entire history every time:

```python
history = [{"role": "user", "content": "My name is Sam."}]
reply = call(history)
history.append({"role": "assistant", "content": reply})
history.append({"role": "user", "content": "What is my name?"})
reply = call(history)       # works only because the history includes the first exchange
```

Consequences: every turn re-sends (and re-bills) all previous turns, long conversations get expensive and eventually hit the context limit, and "memory" features in products are text being stored and put back into prompts. Long-running apps summarize or trim old turns (some APIs offer server-side compaction for this).

## Streaming

Without streaming, the user stares at nothing until the whole answer is done. With streaming, text appears token by token:

```python
with client.messages.stream(model=..., max_tokens=..., messages=...) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    final = stream.get_final_message()     # full message + usage at the end
```

Two latency numbers matter: **time to first token (TTFT)** and **output tokens per second**. Streaming does not make generation faster; it makes waiting feel shorter and avoids HTTP timeouts on long outputs.

## Tokens, money and choosing a model

Pricing is per million tokens, separately for input and output. Example list prices for Claude models at the time of writing (check the provider's pricing page, prices change):

| Model | Input $/1M tokens | Output $/1M tokens | Typical role |
|-------|------------------|-------------------|--------------|
| Claude Opus 5.5 (`claude-opus-5-5`) | 4.00 | 20.00 | most capable everyday default, complex reasoning, agents, coding |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | 2.00 | 10.00 | strong and faster, high-volume production work |
| Claude Haiku 4.5 (`claude-haiku-4-5`) | 1.00 | 5.00 | simple, fast, cheap tasks: classification, routing, extraction |

Worked example: a feature handles 50,000 requests a day, each with 2,000 input tokens and 300 output tokens.

```
input:  50,000 x 2,000 = 100M tokens/day
output: 50,000 x   300 =  15M tokens/day
on a $2 / $10 model: 100 x $2 + 15 x $10 = $350/day, about $10,500/month
```

How professionals choose:

1. Prototype with a capable model to learn what is possible.
2. Build an evaluation set (file 22).
3. Try cheaper or faster models and lower effort levels against it. Keep the cheapest one that passes the quality bar.
4. Reduce tokens: shorter prompts, fewer retrieved documents, caching, tighter output formats.

Count tokens with the provider's tool (`client.messages.count_tokens(...)`). Never estimate one provider's tokens with another provider's tokenizer.

## Structured outputs

Code needs data, not prose. Ask for JSON that matches a schema, and let the API enforce it:

```python
response = client.messages.create(
    model=..., max_tokens=...,
    messages=[{"role": "user", "content": "Ticket: 'My card was charged twice!'"}],
    output_config={"format": {"type": "json_schema", "schema": {
        "type": "object",
        "properties": {"category": {"type": "string", "enum": ["billing", "bug", "other"]},
                       "urgent": {"type": "boolean"}},
        "required": ["category", "urgent"],
        "additionalProperties": False,
    }}},
)
```

The SDK also offers `client.messages.parse(..., output_format=MyPydanticModel)` that returns a validated object. Even with guaranteed-valid JSON, validate the *content* (is the category plausible?) before acting on it.

## Prompt caching

If many requests share a long identical beginning (a big system prompt, a document, tool definitions), the provider can cache that prefix. Cached input tokens are billed at a small fraction of the normal price (10% or less for cache reads on current Claude models, with a premium of about 25% on the first write) and are processed faster.

Rules: caching matches an **exact prefix**, so put stable content first and anything that changes (the user's question, today's date, IDs) last. Check `usage.cache_read_input_tokens` to confirm it works; a timestamp at the top of your system prompt silently kills every cache hit.

## Batch processing

For work that does not need an answer right now (classifying a million old tickets, nightly summaries), batch APIs accept many requests at once and return results within hours at about half price.

## Reliability

- **Rate limits** (HTTP 429): you sent too many requests or tokens per minute. Retry with **exponential backoff** (wait 1s, 2s, 4s... plus randomness). The official SDKs already retry a couple of times.
- **Server errors and overload** (5xx): retry with backoff.
- **Client errors** (400, 401, 404): your request is wrong; retrying will not help. Fix the code.
- **Timeouts**: long outputs should stream.
- **Refusals**: models can decline requests (`stop_reason: "refusal"`). Handle it explicitly. Some APIs can automatically retry a declined request on a fallback model; the lab enables Anthropic's server-side fallback and explains it.
- **Log request IDs** and token usage for every call. When something goes wrong in production, you will need them.

## Security and privacy

- **Never put API keys in code** or in git. Environment variables locally, a secrets manager in production. Leaked keys get abused within minutes of being pushed to a public repository.
- **Treat model output as untrusted input**: never pass it straight into a shell, SQL query or `eval()`.
- **Prompt injection**: text the model reads (web pages, emails, documents, tool results) can contain instructions that try to hijack it. Keep privileges minimal, require confirmation for consequential actions, keep untrusted content clearly separated (file 15 and 18).
- **Data handling**: know what you are allowed to send to a third-party API (personal data, health data, customer contracts) and the provider's retention terms. Ask your company's security or legal team before sending sensitive data.

## Check yourself

1. A response has `stop_reason == "max_tokens"`. What happened and what do you do?
2. Why does a 30-turn conversation cost far more per turn than the first turn?
3. Your system prompt starts with "Current time: 14:03:22". Why might your cache hit rate be zero?
4. Estimate the monthly cost of 10,000 requests per day, 5,000 input and 500 output tokens each, at $4 / $20 per million tokens.
5. Which errors should you retry, and which should you not?
