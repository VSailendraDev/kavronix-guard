/**
 * @kavronix/guard — Testing Utilities Demo
 *
 * Tests the built-in testing helpers: mockAgent, contractSuite, assertions.
 */

import { z } from 'zod';
import { defineAgent, enforce } from '@kavronix/guard';
import {
  mockAgent,
  contractSuite,
  assertNoViolations,
  assertViolationType,
  assertOutputShape,
} from '@kavronix/guard/testing';

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

// ─── Agent ───────────────────────────────────────────────────────────────────

const schema = z.object({
  intent: z.enum(['billing', 'technical', 'general']),
  confidence: z.number(),
});

const Agent = defineAgent({
  name: 'TestableAgent',
  scope: { tools: ['lookup', 'classify'] },
  forbidden: { tools: ['delete', 'nuke'] },
  outputSchema: schema,
  onViolation: {
    strategy: 'warn',
    fallbackOutput: { intent: 'general', confidence: 0 },
  },
});

// ─── Tests ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🧪 @kavronix/guard — Testing Utilities Demo\n');

  // ── 1. mockAgent: basic usage ─────────────────────────────────────────────

  await test('mockAgent: creates adapter with alwaysOutput', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.95 },
    });

    const response = await mock.adapter('system prompt', ['lookup']);
    assert(response.rawText === '{"intent":"billing","confidence":0.95}', 'rawText should be JSON');
    assert(response.steps === 1, 'steps should default to 1');
  });

  await test('mockAgent: simulates tool calls', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'technical', confidence: 0.8 },
      simulateToolCalls: [{ name: 'lookup', input: { id: 123 } }],
    });

    const response = await mock.adapter('sys', []);
    assert(response.toolCallsMade!.length === 1, 'should have 1 tool call');
    assert(response.toolCallsMade![0].name === 'lookup', 'tool should be lookup');
  });

  await test('mockAgent: custom rawText', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.5 },
      rawText: '{"intent":"billing","confidence":0.5}',
    });

    const response = await mock.adapter('sys', []);
    assert(response.rawText === '{"intent":"billing","confidence":0.5}', 'should use custom rawText');
  });

  // ── 2. mockAgent + enforce integration ────────────────────────────────────

  await test('mockAgent + enforce: full pipeline', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
    });

    const result = await enforce(Agent, {
      input: 'classify this ticket',
      call: mock.adapter,
    });

    assert(result.data.intent === 'billing', 'output intent should match');
    assert(result.meta.violations.length === 0, 'should have no violations');
  });

  // ── 3. contractSuite: run ─────────────────────────────────────────────────

  await test('contractSuite.run: executes with mock', async () => {
    const suite = contractSuite(Agent);
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'technical', confidence: 0.85 },
    });

    const result = await suite.run({ using: mock });
    assert(result.data.intent === 'technical', 'should return mock output');
    assert(result.data.confidence === 0.85, 'confidence should match');
  });

  // ── 4. contractSuite: assertNeverCalls ────────────────────────────────────

  await test('contractSuite.assertNeverCalls: detects forbidden tools', async () => {
    const suite = contractSuite(Agent);
    // Should pass — delete and nuke are forbidden and should raise violations
    await suite.assertNeverCalls(['delete', 'nuke']);
  });

  // ── 5. contractSuite: assertOutputValid ───────────────────────────────────

  await test('contractSuite.assertOutputValid: validates output shape', async () => {
    const suite = contractSuite(Agent);
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'general', confidence: 0.5 },
    });
    await suite.assertOutputValid({ using: mock });
  });

  // ── 6. Assertion helpers ──────────────────────────────────────────────────

  await test('assertNoViolations: passes for clean result', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
    });

    const result = await enforce(Agent, {
      input: 'test',
      call: mock.adapter,
    });

    assertNoViolations(result);
  });

  await test('assertViolationType: detects forbidden tool violation', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
      simulateToolCalls: [{ name: 'delete', input: {} }],
    });

    const result = await enforce(Agent, {
      input: 'test',
      call: mock.adapter,
    });

    assertViolationType(result, 'FORBIDDEN_TOOL');
  });

  await test('assertOutputShape: validates against schema', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.7 },
    });

    const result = await enforce(Agent, {
      input: 'test',
      call: mock.adapter,
    });

    assertOutputShape(result, schema);
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${'─'.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

main();
