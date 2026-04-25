# @kavronix/guard

> **Zod validates your data. Kavronix Guard validates your agents.**

Runtime contract enforcement for AI agents by [Kavronix](https://kavronix.com). Define what your agents can do, must never do, and what shape their output must be — then enforce it at runtime with zero trust.

---

## Install

```bash
npm install @kavronix/guard zod
```

---

## Quick Start

```ts
import { z } from 'zod';
import { defineAgent, enforce } from '@kavronix/guard';

// 1. Define your agent's contract
const TriageAgent = defineAgent({
  name: 'TriageAgent',
  description: 'Classifies incoming support tickets',
  scope: {
    tools: ['classifyTicket', 'lookupUser'],
    topics: ['billing', 'technical', 'general'],
    maxSteps: 3,
    timeoutMs: 10000,
  },
  forbidden: {
    tools: ['deleteUser', 'sendEmail'],
    outputPatterns: [/password/i, /ssn/i],
  },
  outputSchema: z.object({
    intent: z.enum(['billing', 'technical', 'general']),
    confidence: z.number().min(0).max(1),
    summary: z.string(),
  }),
  handoffPolicy: {
    allowed: ['BillingAgent', 'TechAgent'],
  },
  onViolation: {
    strategy: 'fallback',
    fallbackOutput: { intent: 'general', confidence: 0, summary: 'Unable to classify' },
    onExecution: (event) => console.log(`[guard] ${event.type}`, event.detail),
  },
});

// 2. Enforce the contract at runtime
const result = await enforce(TriageAgent, {
  input: 'My invoice is wrong',
  call: async (systemPrompt, allowedTools, userInput) => {
    // Call your LLM here (Claude, OpenAI, Gemini, etc.)
    const response = await yourLLMCall(systemPrompt, allowedTools, userInput);
    return {
      rawText: response.text,
      toolCallsMade: response.toolCalls,
      tokenCount: response.tokens,
      steps: 1,
    };
  },
});

console.log(result.data);       // { intent: 'billing', confidence: 0.95, summary: '...' }
console.log(result.meta);       // { violations: [], stepsUsed: 1, ... }
```

---

## Full API Reference

### `defineAgent<TSchema>(config: TetherConfig<TSchema>): Tether<TSchema>`

Creates an agent contract.

```ts
const agent = defineAgent({
  name: 'MyAgent',
  version: '1.0.0',
  description: 'What this agent does',
  scope: { tools: [...], topics: [...], maxSteps: 5, maxTokensOut: 500, timeoutMs: 10000 },
  forbidden: { tools: [...], topics: [...], outputPatterns: [/regex/] },
  outputSchema: z.object({ ... }),
  handoffPolicy: { allowed: ['OtherAgent'] },
  onViolation: {
    strategy: 'throw' | 'warn' | 'fallback' | 'retry',
    fallbackOutput: {...},
    onExecution: (event) => { /* start, adapter_call, violation, retry, end */ },
  },
  memory: { access: 'session', canWrite: true },
});
```

### `enforce<TSchema>(contract, options): Promise<EnforceResult<T>>`

Runs an LLM call through the contract enforcement pipeline.

- Validates tool calls against scope/forbidden lists
- Checks output against forbidden patterns
- Parses and validates output against the Zod schema
- Enforces `timeoutMs` with `Promise.race`
- Separates **hard** violations (forbidden tool, bad schema, timeout) from **soft** violations (max steps/tokens exceeded)
- Handles violations according to the configured strategy
- Wraps user input to prevent prompt injection

### `handoff(config): HandoffProtocol`

Creates a typed handoff protocol between two agents.

```ts
const protocol = handoff({
  from: TriageAgent,
  to: BillingAgent,
  requiredContext: z.object({ intent: z.string(), ticketId: z.string() }),
  redact: ['ticketId'],
  conditions: [(ctx) => ctx.intent === 'billing'],
  audit: true,
});

const result = await protocol.execute({
  context: { intent: 'billing', ticketId: 'T-123' },
  call: async (ctx, systemPrompt) => { ... },
});
```

### `compilePrompt(contract, overrides?): string`

Generates the system prompt from a contract without running `enforce()`.

### `TetherViolationError`

Error class thrown when `onViolation.strategy === 'throw'`. Contains a `.violation` property with the full `ViolationEvent` (including `severity`).

### `VIOLATION_SEVERITY`

A `Record<ViolationType, ViolationSeverity>` mapping each violation type to `'soft'` or `'hard'`.

---

## Adapters

All adapters return an `AdapterFn` compatible with `enforce()`'s `call` signature.

### Claude (Anthropic)

```ts
import Anthropic from '@anthropic-ai/sdk';
import { claudeAdapter, enforce } from '@kavronix/guard';

const client = new Anthropic();
const adapter = claudeAdapter(client, { model: 'claude-sonnet-4-6' });

const result = await enforce(MyAgent, {
  input: 'Hello',
  call: adapter,
});
```

### OpenAI

```ts
import OpenAI from 'openai';
import { openaiAdapter, enforce } from '@kavronix/guard';

const client = new OpenAI();
const adapter = openaiAdapter(client, { model: 'gpt-4o' });

const result = await enforce(MyAgent, {
  input: 'Hello',
  call: adapter,
});
```

### Google Gemini

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiAdapter, enforce } from '@kavronix/guard';

const client = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const adapter = geminiAdapter(client, { model: 'gemini-2.0-flash' });

const result = await enforce(MyAgent, {
  input: 'Hello',
  call: adapter,
});
```

---

## Testing

`@kavronix/guard` ships built-in testing utilities at `@kavronix/guard/testing`.

### `mockAgent(contract, options)`

Creates a mock LLM adapter for testing without real API calls.

```ts
import { mockAgent } from '@kavronix/guard/testing';

const mock = mockAgent(MyAgent, {
  alwaysOutput: { intent: 'billing', confidence: 0.9 },
  simulateToolCalls: [{ name: 'lookup', input: {} }],
});
```

### `contractSuite(contract)`

Provides pre-built test helpers for common contract assertions.

```ts
import { contractSuite } from '@kavronix/guard/testing';

const suite = contractSuite(MyAgent);

// Run with mock and get result
const result = await suite.run();

// Assert forbidden tools are caught
await suite.assertNeverCalls(['deleteUser', 'sendEmail']);

// Assert output schema is valid
await suite.assertOutputValid();
```

### Assertion Helpers

```ts
import {
  assertNoViolations,
  assertViolationType,
  assertOutputShape,
  assertHandoffTriggered,
} from '@kavronix/guard/testing';

assertNoViolations(result);
assertViolationType(result, 'FORBIDDEN_TOOL');
assertOutputShape(result, mySchema);
assertHandoffTriggered(result, 'BillingAgent');
```

---

## CLI

```bash
# Validate contract files
kavronix-guard validate ./agents/**/*.contract.ts

# Audit a run log for violations
kavronix-guard audit ./logs/run-2026-04-18.jsonl

# Check for conflicts between agent contracts
kavronix-guard conflicts ./agents/
```

---

## Why Kavronix Guard?

Multi-agent systems fail silently. An agent calls a tool it shouldn't. Another leaks PII in its output. A third hands off to an agent it has no business talking to.

**@kavronix/guard** makes these failures loud, typed, and preventable:

- **Compile-time safety** — TypeScript-first, Zod-powered schemas
- **Runtime enforcement** — every LLM call is validated before it reaches your app
- **Severity-aware** — hard violations (forbidden tool, bad schema) vs soft signals (token limits)
- **Timeout enforcement** — kills runaway agent calls with configurable `timeoutMs`
- **Prompt injection protection** — user input is isolated from system instructions
- **Execution hooks** — `onExecution` callback for start/end/retry/violation tracing
- **Zero external deps** — only Zod as a peer dependency
- **Adapter-agnostic** — works with Claude, OpenAI, Gemini, or any LLM
- **Test-friendly** — built-in mocks and contract test suites
- **Audit-ready** — structured violation events for logging and compliance

---

## License

MIT © [Kavronix](https://kavronix.com)
