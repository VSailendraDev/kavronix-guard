import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';
import { contractSuite } from '../../src/testing/contractSuite.js';
import { mockAgent } from '../../src/testing/mockAgent.js';

const schema = z.object({
  intent: z.enum(['billing', 'technical', 'general']),
  confidence: z.number(),
});

const Agent = defineAgent({
  name: 'SuiteTestAgent',
  scope: { tools: ['lookup'] },
  forbidden: { tools: ['delete'] },
  outputSchema: schema,
  onViolation: {
    strategy: 'warn',
    fallbackOutput: { intent: 'general', confidence: 0 },
  },
});

describe('contractSuite', () => {
  it('runs the contract with a mock', async () => {
    const suite = contractSuite(Agent);
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.95 },
    });
    const result = await suite.run({ using: mock });
    expect(result.data.intent).toBe('billing');
  });

  it('assertNeverCalls detects forbidden tool usage', async () => {
    const suite = contractSuite(Agent);
    // This should detect that 'delete' raises a FORBIDDEN_TOOL violation
    await suite.assertNeverCalls(['delete']);
  });

  it('assertOutputValid passes for valid output', async () => {
    const suite = contractSuite(Agent);
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'technical', confidence: 0.8 },
    });
    await suite.assertOutputValid({ using: mock });
  });
});
