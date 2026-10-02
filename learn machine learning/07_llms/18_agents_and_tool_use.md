# Agents and Tool Use

A plain LLM can only produce text. With tool use, it can ask your code to search a database, call an API, run a calculation, read a file or send an email. An agent is an LLM running in a loop: it chooses tools, reads their results and decides what to do next until the task is done. Coding assistants, research assistants and customer-service automations are agents. `19_agent_loop_lab.py` builds the loop, and it runs offline with a scripted stand-in model or live with Claude.

## How tool use works

The model never executes anything. The protocol has four steps:

1. You send the conversation plus tool definitions, each with a name, a description and a JSON schema for the inputs.
2. The model replies with a `tool_use` block, such as "call `get_order_status` with `{"order_id": "A-1042"}`", and the response's `stop_reason` is `tool_use`.
3. Your code runs the function and sends back a `tool_result` block with the output, linked by the tool call's id.
4. The model continues, with another tool call or a final answer.

```python
tools = [{
    "name": "get_order_status",
    "description": "Look up the shipping status of a customer order by its id (format A-1234). "
                   "Returns status, carrier and expected delivery date.",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string", "description": "Order id like A-1042"}},
        "required": ["order_id"],
    },
}]
```

The description is a prompt, so write it as documentation for a new colleague: what the tool does, when to use it, what it returns and its limits.

## The agent loop

```
messages = [user request]
repeat (with a maximum number of steps and a budget):
    response = model(messages, tools)
    append response to messages
    if response.stop_reason != "tool_use": stop, the answer is in response
    for each tool_use block: run the tool, collect a tool_result (or an error result)
    append all tool_results in ONE user message
```

Several details matter. One response can contain several tool calls, so run them all and return the results together in one message. If a tool fails, return a `tool_result` with `is_error: true` and a helpful message ("Order id must look like A-1234"), because the model can often recover; do not crash the loop. Agents can loop forever, so set stop conditions on iterations, cost and time. Handle the other stop reasons explicitly too: `max_tokens` (truncated), `refusal`, and `pause_turn` (long server-side work was paused; resend to continue).

## Workflows versus agents

Not every LLM system should be an agent. In a workflow, your code decides the steps (classify, retrieve, draft, check), which makes it predictable, testable and cheap. In an agent, the model decides the steps, which suits open-ended tasks but costs more, is harder to test and lets errors compound.

Reliability compounds badly. If each step succeeds 95% of the time, a 10-step chain succeeds about 60% of the time (0.95^10). Start with the simplest design that works, which means a single call, then a fixed workflow, and only then an agent. An agent makes sense when the task is open-ended, valuable enough to justify the cost, and its errors can be caught through tests, review or undo.

Common building blocks, from simple to complex:

| Pattern | Description |
|---------|-------------|
| prompt chaining | fixed sequence of LLM calls, each feeding the next |
| routing | a classifier call sends the input to the right specialized prompt or model |
| parallelization | split work into independent calls, or run the same call several times and vote |
| orchestrator-workers | a lead model breaks a task down and delegates subtasks to worker calls (sub-agents) |
| evaluator-optimizer | one call drafts, another critiques against criteria, repeat until good |
| autonomous agent | the open loop above, with tools and a budget |

## Designing good tools

A few well-designed tools beat dozens of overlapping ones, since every definition costs tokens and decision effort. Give tools clear names and descriptions, including when not to use them, and strict input schemas with enums for fixed choices; many APIs can enforce schema-valid arguments (strict tool use). Keep output concise, because a tool that returns 50,000 tokens of raw JSON burns money and attention, so summarize, paginate and filter. Return errors the model can act on. Make tools safe by construction: read-only where possible, idempotent writes, and confirmation for anything irreversible.

## Context management

Every tool call and result is appended to the conversation, so long agent runs fill the context window and get expensive. You can trim or clear old tool results that are no longer needed, summarize older history, give sub-agents a fresh context for reading-heavy subtasks and have them return only conclusions, or store notes and progress in files or a memory tool instead of the conversation.

## MCP: the Model Context Protocol

MCP is an open standard, introduced by Anthropic in 2024 and widely adopted since, for connecting AI applications to tools and data. A service exposes an MCP server (tools, resources, prompts), and any MCP-capable client, such as a chat app, an IDE assistant or your own agent, can use it without custom integration code. You write the integration once and use it from many applications. When someone says they have an MCP server for their ticketing system, agents can be plugged into it directly.

## Security

A chatbot that says something wrong is embarrassing, but an agent that does something wrong, such as deleting data, sending an email or spending money, causes an incident. Give the agent only the tools and permissions the task needs, with scoped API keys, and keep a human in the loop for consequential or irreversible actions. Run model-written code in isolated containers with no secrets and limited network. A web page or email the agent reads can contain instructions (prompt injection through tool results), so treat tool output as untrusted data and never let it silently widen the agent's permissions. Cap steps, tokens and money per task, and record every tool call with its inputs and outputs in an audit log.

## Evaluating agents

Measure the task success rate on realistic tasks with checkable outcomes, such as tests passing, the right record updated or the answer matching. Track cost and latency per completed task and not per call, since a cheaper model that needs three times more steps may cost more. Read the full transcripts of failures: patterns like the wrong tool, bad arguments, giving up early or looping point to fixes in tool design or prompts. Agents are non-deterministic, so report success rates over several runs.

## Questions

1. Who executes a tool call, the model or your code? Why does that matter for security?
2. The model calls two tools in one response. How do you send the results back?
3. An agent's step success rate is 90%. Estimate the success rate of a 7-step task. What does that suggest about design?
4. Your agent can read emails and send emails. Describe an attack and two defenses.
5. When would you choose a fixed workflow over an agent?
