import { ZodSchema } from 'zod';
import type { EnforceResult, ViolationEvent, ViolationType } from '../core/violations.js';

export function assertNoViolations<T>(result: EnforceResult<T>): void {
  if (result.meta.violations.length > 0) {
    const msgs = result.meta.violations.map((v) => `  - [${v.type}] ${v.message}`).join('\n');
    throw new Error(`Expected no violations but got:\n${msgs}`);
  }
}

export function assertViolationType<T>(
  result: EnforceResult<T>,
  type: ViolationType,
): ViolationEvent {
  const found = result.meta.violations.find((v) => v.type === type);
  if (!found) {
    throw new Error(
      `Expected violation of type "${type}" but got: [${result.meta.violations.map((v) => v.type).join(', ')}]`,
    );
  }
  return found;
}

export function assertOutputShape<T>(result: EnforceResult<T>, schema: ZodSchema): void {
  const parse = schema.safeParse(result.data);
  if (!parse.success) {
    throw new Error(`Output does not match expected shape: ${parse.error.message}`);
  }
}

export function assertHandoffTriggered<T>(
  result: EnforceResult<T>,
  expectedTarget?: string,
): void {
  if (!result.meta.handoffTriggered) {
    throw new Error('Expected handoff to be triggered but it was not');
  }
  if (expectedTarget && result.meta.handoffTarget !== expectedTarget) {
    throw new Error(
      `Expected handoff to "${expectedTarget}" but got "${result.meta.handoffTarget}"`,
    );
  }
}
