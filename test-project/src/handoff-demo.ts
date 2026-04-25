/**
 * @kavronix/guard — Handoff Demo
 *
 * Tests the handoff protocol between two agents.
 */

import { z } from 'zod';
import { defineAgent, enforce, handoff, TetherViolationError } from '@kavronix/guard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${label}:`, e);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ─── Agents ──────────────────────────────────────────────────────────────────

const triageSchema = z.object({
  intent: z.enum(['billing', 'technical']),
  confidence: z.number(),
});

const billingSchema = z.object({
  resolution: z.string(),
  refundAmount: z.number(),
});

const TriageAgent = defineAgent({
  name: 'TriageAgent',
  outputSchema: triageSchema,
  handoffPolicy: { allowed: ['BillingAgent'] },
  onViolation: { strategy: 'warn' },
});

const BillingAgent = defineAgent({
  name: 'BillingAgent',
  outputSchema: billingSchema,
  onViolation: { strategy: 'warn' },
});

const UnauthorizedAgent = defineAgent({
  name: 'UnauthorizedAgent',
  outputSchema: z.object({ data: z.string() }),
  onViolation: { strategy: 'warn' },
});

// ─── Tests ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔀 @kavronix/guard — Handoff Integration Tests\n');

  const contextSchema = z.object({
    intent: z.string(),
    ticketId: z.string(),
    userEmail: z.string(),
  });

  // ── 1. Successful handoff ─────────────────────────────────────────────────

  await test('handoff: successful execution with context', async () => {
    const protocol = handoff({
      from: TriageAgent,
      to: BillingAgent,
      requiredContext: contextSchema,
      redact: ['userEmail'],
      conditions: [(ctx: { intent: string; ticketId: string; userEmail: string }) => ctx.intent === 'billing'],
      audit: true,
    });

    const result = await protocol.execute({
      context: { intent: 'billing', ticketId: 'T-100', userEmail: 'user@test.com' },
      call: async (ctx: Record<string, unknown>, _systemPrompt: string) => {
        // Verify redaction worked
        assert(!('userEmail' in ctx), 'userEmail should be redacted');
        assert(ctx['intent'] === 'billing', 'intent should pass through');

        return enforce(BillingAgent, {
          input: ctx as Record<string, unknown>,
          call: async () => ({
            rawText: JSON.stringify({ resolution: 'Refund issued', refundAmount: 49.99 }),
            steps: 1,
          }),
        });
      },
    });

    assert(result.data.resolution === 'Refund issued', 'resolution should match');
    assert(result.data.refundAmount === 49.99, 'refund should be 49.99');
    assert(result.meta.handoffTriggered === true, 'handoffTriggered should be true');
    assert(result.meta.handoffTarget === 'BillingAgent', 'target should be BillingAgent');
  });

  // ── 2. Handoff blocked by policy ──────────────────────────────────────────

  await test('handoff: blocked when target not in allowed list', async () => {
    const protocol = handoff({
      from: TriageAgent,
      to: UnauthorizedAgent,
      requiredContext: z.object({ data: z.string() }),
    });

    let caught = false;
    try {
      await protocol.execute({
        context: { data: 'test' },
        call: async () => {
          throw new Error('Should not reach here');
        },
      });
    } catch (err) {
      caught = true;
      const e = err as InstanceType<typeof TetherViolationError>;
      assert(e instanceof TetherViolationError, 'should throw TetherViolationError');
      assert(e.violation.type === 'HANDOFF_NOT_ALLOWED', 'should be HANDOFF_NOT_ALLOWED');
    }
    assert(caught, 'should have thrown');
  });

  // ── 3. Handoff blocked by condition ───────────────────────────────────────

  await test('handoff: blocked when condition not met', async () => {
    const protocol = handoff({
      from: TriageAgent,
      to: BillingAgent,
      requiredContext: contextSchema,
      conditions: [(ctx: { intent: string; ticketId: string; userEmail: string }) => ctx.intent === 'billing'],
    });

    let caught = false;
    try {
      await protocol.execute({
        context: { intent: 'technical', ticketId: 'T-200', userEmail: 'x@y.com' },
        call: async () => {
          throw new Error('Should not reach here');
        },
      });
    } catch (err) {
      caught = true;
      const e = err as InstanceType<typeof TetherViolationError>;
      assert(e instanceof TetherViolationError, 'should throw TetherViolationError');
      assert(e.violation.type === 'HANDOFF_CONDITION_FAILED', 'should be HANDOFF_CONDITION_FAILED');
    }
    assert(caught, 'should have thrown');
  });

  // ── 4. Handoff blocked by invalid context ─────────────────────────────────

  await test('handoff: blocked on invalid context schema', async () => {
    const protocol = handoff({
      from: TriageAgent,
      to: BillingAgent,
      requiredContext: contextSchema,
    });

    let caught = false;
    try {
      await protocol.execute({
        context: { intent: 'billing' } as any, // missing ticketId and userEmail
        call: async () => {
          throw new Error('Should not reach here');
        },
      });
    } catch (err) {
      caught = true;
      const e = err as InstanceType<typeof TetherViolationError>;
      assert(e instanceof TetherViolationError, 'should throw TetherViolationError');
      assert(e.violation.type === 'HANDOFF_CONTEXT_INVALID', 'should be HANDOFF_CONTEXT_INVALID');
    }
    assert(caught, 'should have thrown');
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${'─'.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

main();
