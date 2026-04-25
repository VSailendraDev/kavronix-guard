import type { ViolationEvent } from '../core/violations.js';
import { ZodSchema } from 'zod';

export function checkOutputSchema<TSchema extends ZodSchema>(
  agentName: string,
  output: unknown,
  schema: TSchema,
): ViolationEvent | null {
  const result = schema.safeParse(output);
  if (!result.success) {
    return {
      type: 'OUTPUT_SCHEMA_MISMATCH',
      severity: 'hard',
      agentName,
      message: `Agent output does not match schema: ${result.error.message}`,
      timestamp: new Date(),
      detail: { output, zodError: result.error.flatten() },
    };
  }
  return null;
}

export function parseJsonOutput(raw: string): unknown {
  // Strip markdown code blocks if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from mixed content
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error(`Could not parse LLM output as JSON: ${cleaned.slice(0, 200)}`);
  }
}
