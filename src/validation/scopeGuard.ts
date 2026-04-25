import type { ViolationEvent } from '../core/violations.js';

export function checkMaxSteps(
  agentName: string,
  steps: number,
  maxSteps: number | undefined,
): ViolationEvent | null {
  if (maxSteps !== undefined && steps > maxSteps) {
    return {
      type: 'MAX_STEPS_EXCEEDED',
      severity: 'soft',
      agentName,
      message: `Agent exceeded max steps: ${steps} > ${maxSteps}`,
      timestamp: new Date(),
      detail: { steps, maxSteps },
    };
  }
  return null;
}

export function checkMaxTokens(
  agentName: string,
  tokenCount: number,
  maxTokensOut: number | undefined,
): ViolationEvent | null {
  if (maxTokensOut !== undefined && tokenCount > maxTokensOut) {
    return {
      type: 'MAX_TOKENS_EXCEEDED',
      severity: 'soft',
      agentName,
      message: `Agent exceeded max output tokens: ${tokenCount} > ${maxTokensOut}`,
      timestamp: new Date(),
      detail: { tokenCount, maxTokensOut },
    };
  }
  return null;
}
