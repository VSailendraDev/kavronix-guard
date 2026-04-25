import type { RawLLMResponse } from './base.js';

/**
 * Claude adapter for the Anthropic SDK.
 * 
 * Usage:
 *   import Anthropic from '@anthropic-ai/sdk';
 *   import { claudeAdapter } from 'tether/adapters/claude';
 * 
 *   const client = new Anthropic();
 *   const adapter = claudeAdapter(client, { model: 'claude-sonnet-4-6' });
 * 
 *   await enforce(MyAgent, {
 *     input: userMessage,
 *     call: adapter,
 *   });
 */
export function claudeAdapter(
  client: Record<string, unknown>,
  options: {
    model?: string;
    maxTokens?: number;
  } = {},
) {
  return async (systemPrompt: string, _allowedTools: string[], userInput?: string): Promise<RawLLMResponse> => {
    const model = options.model ?? 'claude-sonnet-4-6';
    const maxTokens = options.maxTokens ?? 1024;

    const inputStr = userInput ?? '';

    const messages = client['messages'] as Record<string, unknown>;
    const createFn = messages['create'] as (args: unknown) => Promise<Record<string, unknown>>;

    const response = await createFn.call(messages, {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: inputStr }],
    });

    const content = response['content'] as Array<Record<string, unknown>> | undefined;

    const rawText =
      content
        ?.filter((b) => b['type'] === 'text')
        ?.map((b) => b['text'] as string)
        ?.join('') ?? '';

    const toolCallsMade = content
      ?.filter((b) => b['type'] === 'tool_use')
      ?.map((b) => ({ name: b['name'] as string, input: b['input'] as unknown })) ?? [];

    const usage = response['usage'] as Record<string, unknown> | undefined;
    const tokenCount = (usage?.['output_tokens'] as number) ?? 0;

    return { rawText, toolCallsMade, tokenCount, steps: 1 };
  };
}
