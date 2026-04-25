# @kavronix/guard

> Zod validates your data.
> **Kavronix Guard validates your agents.**

![npm](https://img.shields.io/npm/v/@kavronix/guard)
![downloads](https://img.shields.io/npm/dm/@kavronix/guard)
![license](https://img.shields.io/npm/l/@kavronix/guard)

A TypeScript-first **runtime enforcement layer for AI agents**.

Define what agents can do, must never do, and what shape their output must be — then enforce it at runtime with zero trust.

---

## ❌ The Problem

AI agents don’t fail loudly.

They fail silently:

* calling the wrong tools
* returning invalid JSON
* leaking sensitive data
* routing to the wrong agent

By the time you notice — your system is already corrupted.

---

## ✅ The Solution

**@kavronix/guard** introduces a missing layer:

> A **contract enforcement runtime** for AI agents

It guarantees:

* 🔒 Tool access control
* 📜 Strict output validation (Zod)
* 🚫 Forbidden patterns (PII, secrets)
* 🔀 Safe, typed agent handoffs
* ⏱️ Timeout enforcement
* 🔁 Retry / fallback strategies

---

## ⚡ Quick Start

```ts
import { z } from 'zod'
import { defineAgent, enforce } from '@kavronix/guard'

const TriageAgent = defineAgent({
  name: 'TriageAgent',
  description: 'Classifies support tickets',

  scope: {
    tools: ['classifyTicket'],
    maxSteps: 2,
  },

  forbidden: {
    tools: ['deleteUser'],
    outputPatterns: [/password/i],
  },

  outputSchema: z.object({
    intent: z.enum(['billing', 'technical', 'general']),
    confidence: z.number(),
  }),
})

const result = await enforce(TriageAgent, {
  input: 'I was charged twice',
  call: async (systemPrompt, allowedTools, input) => {
    // plug your LLM here
    return {
      rawText: JSON.stringify({
        intent: 'billing',
        confidence: 0.92,
      }),
      steps: 1,
    }
  },
})

console.log(result.data.intent) // billing
```

---

## 🚨 What Happens on Failure?

```ts
simulateToolCalls: [{ name: 'deleteUser' }]
```

```bash
[TetherViolationError] FORBIDDEN_TOOL
```

👉 The agent is stopped before it can break your system.

---

## 🔀 Multi-Agent Handoffs

```ts
import { handoff } from '@kavronix/guard'

const protocol = handoff({
  from: TriageAgent,
  to: BillingAgent,

  requiredContext: z.object({
    intent: z.literal('billing'),
    ticketId: z.string(),
  }),

  redact: ['ticketId'],
  conditions: [(ctx) => ctx.intent === 'billing'],
  audit: true,
})
```

---

## 🛡️ Built for Production

* Hard vs soft violation separation
* Prompt injection protection
* Structured audit events
* Adapter-agnostic (Claude, OpenAI, Gemini)
* Zero runtime dependencies (except Zod)

---

# 📘 Detailed Usage

---

## defineAgent

```ts
const agent = defineAgent({
  name: 'MyAgent',
  version: '1.0.0',
  description: 'Agent description',

  scope: {
    tools: ['lookup'],
    topics: ['billing'],
    maxSteps: 5,
    maxTokensOut: 500,
    timeoutMs: 10000,
  },

  forbidden: {
    tools: ['delete'],
    topics: ['internal'],
    outputPatterns: [/password/i],
  },

  outputSchema: z.object({
    result: z.string(),
  }),

  handoffPolicy: {
    allowed: ['OtherAgent'],
  },

  onViolation: {
    strategy: 'fallback',
    fallbackOutput: { result: 'safe fallback' },
  },

  memory: {
    access: 'session',
    canWrite: true,
  },
})
```

---

## enforce

```ts
const result = await enforce(agent, {
  input: 'user input',
  call: adapter,
})
```

Enforces:

* tool usage
* schema validation
* forbidden patterns
* token / step limits
* timeout handling

---

## Violation Strategies

```ts
onViolation: {
  strategy: 'throw' | 'warn' | 'fallback' | 'retry',
}
```

---

## Adapters

### Claude

```ts
import Anthropic from '@anthropic-ai/sdk'
import { claudeAdapter } from '@kavronix/guard'

const client = new Anthropic()

await enforce(agent, {
  input: 'hello',
  call: claudeAdapter(client),
})
```

---

### OpenAI

```ts
import OpenAI from 'openai'
import { openaiAdapter } from '@kavronix/guard'

const client = new OpenAI()

await enforce(agent, {
  input: 'hello',
  call: openaiAdapter(client),
})
```

---

### Gemini

```ts
import { geminiAdapter } from '@kavronix/guard'

await enforce(agent, {
  input: 'hello',
  call: geminiAdapter(client),
})
```

---

## 🧪 Testing (No LLM Required)

```ts
import { contractSuite, mockAgent } from '@kavronix/guard/testing'

await contractSuite(agent).assertNeverCalls(['deleteUser'])
await contractSuite(agent).assertOutputValid()
```

---

## CLI

```bash
kavronix-guard validate ./agents/**/*.ts
kavronix-guard audit ./logs/run.jsonl
kavronix-guard conflicts ./agents/
```

---

## 🧠 Philosophy

> AI agents should be governed systems, not probabilistic chaos.

---

## 🚀 Why Kavronix Guard

Because prompts are not contracts.

Production systems need guarantees.

---

## 📦 Install

```bash
npm install @kavronix/guard zod
```

---

## 📄 License

MIT © Kavronix