import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';
import { compilePrompt } from '../../src/core/promptCompiler.js';

const schema = z.object({ reply: z.string() });

const Agent = defineAgent({
  name: 'PromptTestAgent',
  description: 'A helpful assistant',
  outputSchema: schema,
});

describe('compilePrompt', () => {
  it('returns the system prompt from the contract', () => {
    const prompt = compilePrompt(Agent);
    expect(prompt).toContain('PromptTestAgent');
    expect(prompt).toContain('A helpful assistant');
  });

  it('appends additional instructions when provided', () => {
    const prompt = compilePrompt(Agent, {
      additionalInstructions: 'Always be polite.',
    });
    expect(prompt).toContain('ADDITIONAL INSTRUCTIONS');
    expect(prompt).toContain('Always be polite.');
  });
});
