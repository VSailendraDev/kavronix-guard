import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';

const schema = z.object({
  intent: z.enum(['billing', 'technical', 'general']),
  confidence: z.number(),
});

const TestAgent = defineAgent({
  name: 'TestAgent',
  version: '1.0.0',
  description: 'A test agent',
  scope: { tools: ['lookup', 'classify'], maxSteps: 3 },
  forbidden: { tools: ['delete', 'send_email'] },
  outputSchema: schema,
  handoffPolicy: { allowed: ['SupportAgent'] },
});

describe('defineAgent', () => {
  it('sets name and version', () => {
    expect(TestAgent.name).toBe('TestAgent');
    expect(TestAgent.version).toBe('1.0.0');
  });

  it('generates a system prompt containing key sections', () => {
    const prompt = TestAgent.toSystemPrompt();
    expect(prompt).toContain('TestAgent');
    expect(prompt).toContain('YOU MAY ONLY');
    expect(prompt).toContain('YOU MUST NEVER');
    expect(prompt).toContain('delete');
    expect(prompt).toContain('SupportAgent');
  });

  it('resolvedTools returns scope tools', () => {
    expect(TestAgent.resolvedTools()).toEqual(['lookup', 'classify']);
  });

  it('validates correct output', () => {
    const result = TestAgent.validate({ intent: 'billing', confidence: 0.9 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid output', () => {
    const result = TestAgent.validate({ intent: 'unknown' });
    expect(result.success).toBe(false);
  });
});
