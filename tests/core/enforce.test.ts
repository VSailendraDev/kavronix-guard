import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';
import { enforce, TetherViolationError } from '../../src/core/enforce.js';
import { mockAgent } from '../../src/testing/mockAgent.js';

const schema = z.object({
  intent: z.enum(['billing', 'technical', 'general']),
  confidence: z.number(),
});

const Agent = defineAgent({
  name: 'EnforceTestAgent',
  scope: { tools: ['lookup'] },
  forbidden: {
    tools: ['delete'],
    outputPatterns: [/secret/i],
  },
  outputSchema: schema,
  onViolation: { strategy: 'throw' },
});

describe('enforce', () => {
  it('returns typed result for valid output', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
    });

    const result = await enforce(Agent, {
      input: 'test',
      call: mock.adapter,
    });

    expect(result.data.intent).toBe('billing');
    expect(result.data.confidence).toBe(0.9);
    expect(result.meta.violations).toHaveLength(0);
  });

  it('throws on forbidden tool call', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
      simulateToolCalls: [{ name: 'delete', input: {} }],
    });

    await expect(
      enforce(Agent, { input: 'test', call: mock.adapter }),
    ).rejects.toThrow(TetherViolationError);
  });

  it('throws on output pattern violation', async () => {
    const mock = mockAgent(Agent, {
      rawText: '{ "intent": "billing", "confidence": 0.9, "data": "secret_key" }',
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
    });

    await expect(
      enforce(Agent, { input: 'test', call: mock.adapter }),
    ).rejects.toThrow(TetherViolationError);
  });

  it('uses fallback on violation with fallback strategy', async () => {
    const AgentWithFallback = defineAgent({
      name: 'FallbackAgent',
      outputSchema: schema,
      onViolation: {
        strategy: 'fallback',
        fallbackOutput: { intent: 'general', confidence: 0 },
      },
    });

    const mock = mockAgent(AgentWithFallback, {
      rawText: 'not json at all',
      alwaysOutput: {} as z.infer<typeof schema>,
    });

    const result = await enforce(AgentWithFallback, {
      input: 'test',
      call: mock.adapter,
    });

    expect(result.data.intent).toBe('general');
    expect(result.data.confidence).toBe(0);
  });

  it('retries on violation with retry strategy', async () => {
    let callCount = 0;
    const schema2 = z.object({ value: z.number() });

    const RetryAgent = defineAgent({
      name: 'RetryAgent',
      outputSchema: schema2,
      onViolation: {
        strategy: 'retry',
        maxRetries: 2,
        fallbackOutput: { value: -1 },
      },
    });

    const result = await enforce(RetryAgent, {
      input: 'test',
      call: async (_sp, _tools, _input) => {
        callCount++;
        if (callCount < 3) return { rawText: 'not json', steps: 1 };
        return { rawText: JSON.stringify({ value: 42 }), steps: 1 };
      },
    });

    expect(callCount).toBe(3);
    expect(result.data.value).toBe(42);
  });

  it('enforces timeout and throws TIMEOUT violation', async () => {
    const TimeoutAgent = defineAgent({
      name: 'TimeoutAgent',
      outputSchema: schema,
      scope: { timeoutMs: 50 },
      onViolation: { strategy: 'throw' },
    });

    await expect(
      enforce(TimeoutAgent, {
        input: 'test',
        call: async () => {
          await new Promise((r) => setTimeout(r, 200));
          return { rawText: '{}', steps: 1 };
        },
      }),
    ).rejects.toThrow('timed out');
  });

  it('violations have severity field', async () => {
    const WarnAgent = defineAgent({
      name: 'WarnAgent',
      outputSchema: schema,
      scope: { maxSteps: 1 },
      onViolation: {
        strategy: 'warn',
        fallbackOutput: { intent: 'general', confidence: 0 },
      },
    });

    const mock = mockAgent(WarnAgent, {
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
      simulateSteps: 5,
    });

    const result = await enforce(WarnAgent, {
      input: 'test',
      call: mock.adapter,
    });

    const stepsViolation = result.meta.violations.find((v) => v.type === 'MAX_STEPS_EXCEEDED');
    expect(stepsViolation).toBeDefined();
    expect(stepsViolation!.severity).toBe('soft');
  });

  it('calls onExecution hook', async () => {
    const events: string[] = [];

    const HookAgent = defineAgent({
      name: 'HookAgent',
      outputSchema: z.object({ ok: z.boolean() }),
      onViolation: {
        strategy: 'warn',
        onExecution: (event) => events.push(event.type),
      },
    });

    const mock = mockAgent(HookAgent, {
      alwaysOutput: { ok: true },
    });

    await enforce(HookAgent, {
      input: 'test',
      call: mock.adapter,
    });

    expect(events).toContain('start');
    expect(events).toContain('adapter_call');
    expect(events).toContain('end');
  });
});
