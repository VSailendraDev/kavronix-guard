import { ZodSchema, z } from 'zod';
import type { Tether } from '../core/violations.js';
import type { RawLLMResponse } from '../adapters/base.js';

export interface MockAgentOptions<TSchema extends ZodSchema> {
  alwaysOutput?: z.infer<TSchema>;
  sequence?: Array<z.infer<TSchema>>;
  rawText?: string;
  simulateToolCalls?: Array<{ name: string; input: unknown }>;
  simulateSteps?: number;
}

export interface MockAgentInstance {
  callCount: number;
  lastInput: unknown;
  adapter: (systemPrompt: string, allowedTools: string[], userInput?: string) => Promise<RawLLMResponse>;
}

export function mockAgent<TSchema extends ZodSchema>(
  _contract: Tether<TSchema>,
  options: MockAgentOptions<TSchema>,
): MockAgentInstance {
  let callCount = 0;
  let lastInput: unknown = null;
  const sequence = options.sequence ?? [];
  let sequenceIndex = 0;

  const adapter = async (_systemPrompt: string, _allowedTools: string[], userInput?: string): Promise<RawLLMResponse> => {
    callCount++;
    lastInput = userInput;

    let output: unknown;

    if (options.alwaysOutput !== undefined) {
      output = options.alwaysOutput;
    } else if (sequence.length > 0) {
      output = sequence[sequenceIndex % sequence.length];
      sequenceIndex++;
    } else {
      output = {};
    }

    const rawText = options.rawText ?? JSON.stringify(output);

    return {
      rawText,
      toolCallsMade: options.simulateToolCalls ?? [],
      tokenCount: rawText.length,
      steps: options.simulateSteps ?? 1,
    };
  };

  return { callCount, lastInput, adapter };
}
