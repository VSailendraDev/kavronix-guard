import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';
import { mockAgent } from '../../src/testing/mockAgent.js';

const schema = z.object({ value: z.number() });

const Agent = defineAgent({
  name: 'MockTestAgent',
  outputSchema: schema,
});

describe('mockAgent', () => {
  it('returns alwaysOutput as rawText JSON', async () => {
    const mock = mockAgent(Agent, { alwaysOutput: { value: 42 } });
    const result = await mock.adapter('system', []);
    expect(result.rawText).toBe('{"value":42}');
  });

  it('simulates tool calls', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { value: 1 },
      simulateToolCalls: [{ name: 'search', input: { q: 'test' } }],
    });
    const result = await mock.adapter('system', []);
    expect(result.toolCallsMade).toHaveLength(1);
    expect(result.toolCallsMade?.[0]?.name).toBe('search');
  });

  it('uses custom rawText when provided', async () => {
    const mock = mockAgent(Agent, {
      rawText: '{"value": 99}',
      alwaysOutput: { value: 99 },
    });
    const result = await mock.adapter('system', []);
    expect(result.rawText).toBe('{"value": 99}');
  });
});
