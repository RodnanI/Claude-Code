# Agents and Tool Use

A plain LLM can only produce text. With **tool use**, it can ask your code to do things: search a database, call an API, run a calculation, read a file, send an email. An **agent** is an LLM running in a loop, choosing tools, reading their results and deciding what to do next until the task is done. Coding assistants, research assistants and customer-service automations are agents. `19_agent_loop_lab.py` builds the loop; it runs offline with a scripted stand-in model or live with Claude.

## How tool use actually works

The model never executes anything. The protocol is:

1. You send the conversation plus **tool definitions**: a name, a description and a JSON schema for the inputs.
2. The model replies with a **tool_use** block: "call `get_order_status` with `{"order_id": "A-1042"}`". The response's `stop_reason` is `tool_use`.
3. **Your code** runs the function and sends back a **tool_result** block with the output, linked by the tool call's id.
4. The model continues: maybe another tool call, maybe a final answer.

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

The description is a prompt. Write it like documentation for a new colleague: what it does, when to use it, what it returns, its limits.

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

Details that matter:

- **Parallel calls**: one response can contain several tool calls. Run them and return all results together in one message.
- **Errors are results**: if a tool fails, return a `tool_result` with `is_error: true` and a helpful message ("Order id must look like A-1234"). The model can often recover. Do not crash the loop.
- **Stop conditions**: max iterations, max cost, max time. Agents can loop.
- **Other stop reasons**: `max_tokens` (truncated), `refusal`, `pause_turn` (long server-side work paused; resend to continue). Handle them explicitly.

## Workflows versus agents

Not every LLM system should be an agent.

- **Workflow**: your code decides the steps (classify, then retrieve, then draft, then check). Predictable, testable, cheap.
- **Agent**: the model decides the steps. Flexible, handles open-ended tasks, but costs more, is harder to test, and errors compound.

Reliability compounds badly: if each step succeeds 95% of the time, a 10-step chain succeeds about 60% of the time (0.95^10). Start with the simplest design that works: a single call, then a fixed workflow, and only then an agent. Build an agent when the task is genuinely open-ended, valuable enough to justify the cost, and errors can be caught (tests, review, undo).

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

- **Few, well-designed tools** beat dozens of overlapping ones. Every tool definition costs tokens and decision effort.
- **Clear names and descriptions**, including when NOT to use the tool.
- **Strict input schemas**, with enums for fixed choices. Many APIs can enforce schema-valid arguments (strict tool use).
- **Return concise, relevant output.** A tool that returns 50,000 tokens of raw JSON burns money and attention. Summarize, paginate, filter.
- **Meaningful errors** the model can act on.
- **Safe by construction**: read-only where possible, idempotent writes, confirmation for anything irreversible.

## Context management

Every tool call and result is appended to the conversation, so long agent runs fill the context window and get expensive. Techniques:

- trim or clear old tool results that are no longer needed
- summarize (compact) older history
- give sub-agents their own fresh context for reading-heavy subtasks and return only conclusions
- store notes and progress in files or a memory tool instead of the conversation

## MCP: the Model Context Protocol

MCP is an open standard (introduced by Anthropic in 2024 and widely adopted since) for connecting AI applications to tools and data. A service exposes an **MCP server** (tools, resources, prompts); any MCP-capable **client** (a chat app, an IDE assistant, your own agent) can use it without custom integration code. Think of it as USB for AI tools: write the integration once, use it from many applications. When you hear "we have an MCP server for our ticketing system", it means agents can be plugged into it directly.

## Security: agents raise the stakes

A chatbot that says something wrong is embarrassing. An agent that does something wrong (deletes data, sends an email, spends money) is an incident.

- **Least privilege**: only the tools and permissions the task needs. Scoped API keys.
- **Human in the loop** for consequential or irreversible actions.
- **Sandboxing**: run model-written code in isolated containers with no secrets and limited network.
- **Prompt injection through tool results**: a web page or email the agent reads can contain instructions. Treat tool output as untrusted data; never let it silently expand the agent's permissions.
- **Budgets and rate limits**: cap steps, tokens and money per task.
- **Audit logs**: record every tool call with inputs and outputs.

## Evaluating agents

- **Task success rate** on a set of realistic tasks with checkable outcomes (tests pass, the right record was updated, the answer matches).
- **Cost and latency per completed task**, not per call. A cheaper model that needs three times more steps may cost more.
- **Trajectory review**: read the full transcripts of failures. Patterns (wrong tool, bad arguments, giving up early, looping) point to fixes in tool design or prompts.
- **Multiple runs**: agents are non-deterministic; report success rates over several runs.

## Check yourself

1. Who executes a tool call, the model or your code? Why does that matter for security?
2. The model calls two tools in one response. How do you send the results back?
3. An agent's step success rate is 90%. Estimate the success rate of a 7-step task. What does that suggest about design?
4. Your agent can read emails and send emails. Describe an attack and two defenses.
5. When would you choose a fixed workflow over an agent?
