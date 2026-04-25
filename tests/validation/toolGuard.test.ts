import { describe, it, expect } from 'vitest';
import { checkToolAllowed } from '../../src/validation/toolGuard.js';

describe('toolGuard', () => {
  it('returns null when tool is allowed', () => {
    expect(checkToolAllowed('A', 'lookup', ['lookup', 'classify'], [])).toBeNull();
  });

  it('returns violation when tool is forbidden', () => {
    const v = checkToolAllowed('A', 'delete', ['lookup'], ['delete']);
    expect(v?.type).toBe('FORBIDDEN_TOOL');
  });

  it('returns violation when tool is outside scope', () => {
    const v = checkToolAllowed('A', 'send_email', ['lookup'], []);
    expect(v?.type).toBe('FORBIDDEN_TOOL');
  });

  it('allows any tool when no scope defined', () => {
    expect(checkToolAllowed('A', 'anything', undefined, undefined)).toBeNull();
  });
});
