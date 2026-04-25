import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { checkOutputSchema, parseJsonOutput } from '../../src/validation/outputGuard.js';

describe('outputGuard', () => {
  const schema = z.object({ value: z.number() });

  it('returns null for valid output', () => {
    expect(checkOutputSchema('A', { value: 42 }, schema)).toBeNull();
  });

  it('returns violation for invalid output', () => {
    const v = checkOutputSchema('A', { value: 'not a number' }, schema);
    expect(v?.type).toBe('OUTPUT_SCHEMA_MISMATCH');
  });

  it('parses clean JSON', () => {
    expect(parseJsonOutput('{"value": 42}')).toEqual({ value: 42 });
  });

  it('strips markdown code blocks', () => {
    expect(parseJsonOutput('```json\n{"value": 42}\n```')).toEqual({ value: 42 });
  });

  it('extracts JSON from mixed content', () => {
    expect(parseJsonOutput('Here is the result: {"value": 42} done')).toEqual({ value: 42 });
  });

  it('throws on unparseable content', () => {
    expect(() => parseJsonOutput('not json at all')).toThrow();
  });
});
