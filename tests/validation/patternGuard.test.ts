import { describe, it, expect } from 'vitest';
import { checkForbiddenPatterns } from '../../src/validation/patternGuard.js';

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
});
