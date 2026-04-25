import type { Tether } from './violations.js';
import { ZodSchema } from 'zod';

/**
 * Standalone prompt compiler — useful when you want the system prompt
 * without the full enforce() wrapper.
 */
export function compilePrompt<TSchema extends ZodSchema>(
  contract: Tether<TSchema>,
  overrides?: { additionalInstructions?: string },
): string {
  let prompt = contract.toSystemPrompt();
  if (overrides?.additionalInstructions) {
    prompt += `\n\nADDITIONAL INSTRUCTIONS:\n${overrides.additionalInstructions}`;
  }
  return prompt;
}
