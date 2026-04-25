import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';
import { handoff } from '../../src/core/handoff.js';
import { enforce } from '../../src/core/enforce.js';
import { mockAgent } from '../../src/testing/mockAgent.js';
import { TetherViolationError } from '../../src/core/enforce.js';

const fromSchema = z.object({ classified: z.boolean() });
const toSchema = z.object({ resolved: z.boolean() });
const ctxSchema = z.object({ intent: z.string(), ticketId: z.string() });

const FromAgent = defineAgent({
  name: 'FromAgent',
  outputSchema: fromSchema,
  handoffPolicy: { allowed: ['ToAgent'] },
});

const ToAgent = defineAgent({
  name: 'ToAgent',
  outputSchema: toSchema,
  onViolation: { strategy: 'fallback', fallbackOutput: { resolved: false } },
});

const protocol = handoff({
  from: FromAgent,
  to: ToAgent,
  requiredContext: ctxSchema,
  redact: ['ticketId'],
  conditions: [(ctx) => ctx.intent === 'billing'],
  audit: false,
});

describe('handoff', () => {
  it('executes successfully when conditions are met', async () => {
    const mock = mockAgent(ToAgent, { alwaysOutput: { resolved: true } });

    const result = await protocol.execute({
      context: { intent: 'billing', ticketId: 'T123' },
      call: async (ctx, _sp) =>
        enforce(ToAgent, { input: ctx as Record<string, unknown>, call: mock.adapter }),
    });

    expect(result.meta.handoffTriggered).toBe(true);
    expect(result.meta.handoffTarget).toBe('ToAgent');
    expect(result.data.resolved).toBe(true);
  });

  it('throws when condition is not met', async () => {
    await expect(
      protocol.execute({
        context: { intent: 'technical', ticketId: 'T123' },
        call: async () => { throw new Error('should not reach'); },
      }),
    ).rejects.toThrow(TetherViolationError);
  });

  it('throws on invalid context schema', async () => {
    await expect(
      protocol.execute({
        context: { intent: 'billing' } as z.infer<typeof ctxSchema>, // missing ticketId
        call: async () => { throw new Error('should not reach'); },
      }),
    ).rejects.toThrow(TetherViolationError);
  });
});
