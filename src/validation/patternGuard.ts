import type { ViolationEvent } from '../core/violations.js';

// ReDoS protection: max output length tested against user-supplied regex
const MAX_PATTERN_INPUT_LENGTH = 100_000;

// Detects common ReDoS-vulnerable patterns (nested quantifiers, overlapping groups)
const UNSAFE_REGEX = /(\+|\*|\{[^}]*\})\)(\+|\*|\{[^}]*\})/;

export function isSafeRegex(pattern: RegExp): boolean {
  return !UNSAFE_REGEX.test(pattern.source);
}

export function checkForbiddenPatterns(
  agentName: string,
  output: string,
  patterns: RegExp[] | undefined,
): ViolationEvent | null {
  if (!patterns || patterns.length === 0) return null;

  // Cap input length to mitigate ReDoS on long LLM outputs
  const bounded = output.length > MAX_PATTERN_INPUT_LENGTH
    ? output.slice(0, MAX_PATTERN_INPUT_LENGTH)
    : output;

  for (const pattern of patterns) {
    if (!isSafeRegex(pattern)) {
      return {
        type: 'FORBIDDEN_PATTERN',
        severity: 'hard',
        agentName,
        message: `Skipped unsafe regex pattern (potential ReDoS): ${pattern.source}`,
        timestamp: new Date(),
        detail: { pattern: pattern.source, reason: 'redos_risk' },
      };
    }

    if (pattern.test(bounded)) {
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
