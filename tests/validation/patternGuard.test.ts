import { describe, it, expect } from 'vitest';
import { checkForbiddenPatterns, isSafeRegex } from '../../src/validation/patternGuard.js';

describe('patternGuard', () => {
  it('returns null when no patterns', () => {
    expect(checkForbiddenPatterns('A', 'hello world', undefined)).toBeNull();
  });

  it('returns violation when pattern matches', () => {
    const v = checkForbiddenPatterns('A', 'my password is 123', [/password/i]);
    expect(v?.type).toBe('FORBIDDEN_PATTERN');
  });

  it('returns null when pattern does not match', () => {
    const v = checkForbiddenPatterns('A', 'billing intent', [/password/i]);
    expect(v).toBeNull();
  });

  describe('ReDoS protection', () => {
    it('detects unsafe nested-quantifier regex as unsafe', () => {
      expect(isSafeRegex(/(a+)+$/)).toBe(false);
      expect(isSafeRegex(/(a*)*$/)).toBe(false);
      expect(isSafeRegex(/(a{1,5})+/)).toBe(false);
    });

    it('allows safe regex patterns', () => {
      expect(isSafeRegex(/password/i)).toBe(true);
      expect(isSafeRegex(/\b(secret|token)\b/)).toBe(true);
      expect(isSafeRegex(/^[a-z]+$/)).toBe(true);
    });

    it('returns violation with redos_risk detail for unsafe regex', () => {
      const v = checkForbiddenPatterns('A', 'test input', [/(a+)+$/]);
      expect(v).not.toBeNull();
      expect(v?.type).toBe('FORBIDDEN_PATTERN');
      expect((v?.detail as Record<string, unknown>)?.reason).toBe('redos_risk');
    });

    it('caps input length for regex testing', () => {
      const longOutput = 'a'.repeat(200_000);
      const v = checkForbiddenPatterns('A', longOutput, [/a+/]);
      expect(v?.type).toBe('FORBIDDEN_PATTERN');
    });
  });
});
