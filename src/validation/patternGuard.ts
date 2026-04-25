import type { ViolationEvent } from '../core/violations.js';

export function checkForbiddenPatterns(
  agentName: string,
  output: string,
  patterns: RegExp[] | undefined,
): ViolationEvent | null {
  if (!patterns || patterns.length === 0) return null;

  for (const pattern of patterns) {
    if (pattern.test(output)) {
      return {
        type: 'FORBIDDEN_PATTERN',
        severity: 'hard',
        agentName,
        message: `Agent output contains forbidden pattern: ${pattern.source}`,
        timestamp: new Date(),
        detail: { pattern: pattern.source },
      };
    }
  }

  return null;
}
