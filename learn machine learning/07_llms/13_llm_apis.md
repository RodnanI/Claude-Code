# Using LLM APIs

Most LLM work in companies starts here: your code sends text to a model hosted by a provider and gets text back. The API is small, but getting cost, latency, reliability and safety right takes skill. The examples use Anthropic's Claude API and its Python SDK, and the ideas carry over to other providers. The lab is `14_llm_api_lab.py`, which runs in dry-run mode without an API key.

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

Older models and open models expose sampling settings such as `temperature`, `top_p` and `top_k` (lab 11). Many current API models no longer accept them. Current Claude models reject them and offer an effort level (`low`, `medium`, `high`, `xhigh`, `max`) that controls how much the model reasons before answering. Check the docs for the exact model you use.

### The response

| Field | Meaning |
|-------|---------|
| `content` | a list of blocks: `text`, `thinking` (reasoning) and `tool_use` (a requested function call). Check each block's `type` |
| `stop_reason` | why it stopped: `end_turn` (finished), `max_tokens` (cut off!), `tool_use` (wants a tool), `refusal` (declined), `stop_sequence`, `pause_turn` |
| `usage` | `input_tokens`, `output_tokens`, plus cache read/write counts. This is your bill |

Check `stop_reason` before trusting `content`. An answer cut off by `max_tokens` looks fine in a log until someone reads the last line.

## The API is stateless

The model remembers nothing between calls. A "conversation" is you sending the entire history every time:

```python
history = [{"role": "user", "content": "My name is Sam."}]
reply = call(history)
history.append({"role": "assistant", "content": reply})
history.append({"role": "user", "content": "What is my name?"})
reply = call(history)       # works only because the history includes the first exchange
```

This means every turn re-sends, and re-bills, all previous turns, so long conversations get expensive and eventually hit the context limit. Memory features in products are stored text put back into prompts. Long-running apps summarize or trim old turns, and some APIs offer server-side compaction for this.

## Streaming

Without streaming, the user stares at nothing until the whole answer is done. With streaming, text appears token by token:

```python
with client.messages.stream(model=..., max_tokens=..., messages=...) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    final = stream.get_final_message()     # full message + usage at the end
```

Two latency numbers matter: time to first token (TTFT) and output tokens per second. Streaming does not speed up generation. It makes the wait feel shorter and avoids HTTP timeouts on long outputs.

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

A usual process for choosing a model is to prototype with a capable one to learn what is possible, build an evaluation set (file 22), then test cheaper or faster models and lower effort levels against it and keep the cheapest that clears the quality bar. After that, reduce tokens with shorter prompts, fewer retrieved documents, caching and tighter output formats.

Count tokens with the provider's own tool (`client.messages.count_tokens(...)`) and not another provider's tokenizer.

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

The SDK also offers `client.messages.parse(..., output_format=MyPydanticModel)`, which returns a validated object. Even when the JSON is guaranteed valid, check the content, for example whether the category is plausible, before acting on it.

## Prompt caching

If many requests share a long identical beginning (a big system prompt, a document, tool definitions), the provider can cache that prefix. Cached input tokens are billed at a small fraction of the normal price (10% or less for cache reads on current Claude models, with a premium of about 25% on the first write) and are processed faster.

Caching matches an exact prefix, so put stable content first and anything that changes (the user's question, today's date, IDs) last. Check `usage.cache_read_input_tokens` to confirm it works, because a timestamp at the top of your system prompt silently kills every cache hit.

## Batch processing

For work that does not need an answer right now (classifying a million old tickets, nightly summaries), batch APIs accept many requests at once and return results within hours at about half price.

## Reliability

Rate limits (HTTP 429) mean you sent too many requests or tokens per minute. Retry with exponential backoff, waiting 1s, 2s, 4s and so on with some randomness; the official SDKs already retry a couple of times. Server errors and overload (5xx) also deserve a retry with backoff. Client errors (400, 401, 404) mean the request is wrong and retrying will not help, so fix the code. Long outputs should stream to avoid timeouts. Models can decline requests (`stop_reason: "refusal"`), and your code should handle that explicitly. Some APIs can retry a declined request on a fallback model, and the lab enables Anthropic's server-side fallback and explains it. Log request IDs and token usage for every call, because you will need them when something goes wrong in production.

## Security and privacy

Keep API keys out of code and git, using environment variables locally and a secrets manager in production; leaked keys get abused within minutes of reaching a public repository. Treat model output as untrusted input, and never pass it straight into a shell, SQL query or `eval()`. Text the model reads (web pages, emails, documents, tool results) can contain instructions that try to hijack it, which is prompt injection, so keep privileges minimal, require confirmation for consequential actions and keep untrusted content clearly separated (files 15 and 18). Know what you may send to a third-party API, such as personal data, health data and customer contracts, and what the provider's retention terms are, and ask your security or legal team before sending anything sensitive.

## Questions

1. A response has `stop_reason == "max_tokens"`. What happened and what do you do?
2. Why does a 30-turn conversation cost far more per turn than the first turn?
3. Your system prompt starts with "Current time: 14:03:22". Why might your cache hit rate be zero?
4. Estimate the monthly cost of 10,000 requests per day, 5,000 input and 500 output tokens each, at $4 / $20 per million tokens.
5. Which errors should you retry, and which should you not?
