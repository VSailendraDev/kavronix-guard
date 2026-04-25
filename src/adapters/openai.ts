import type { RawLLMResponse } from './base.js';

export function openaiAdapter(
  client: Record<string, unknown>,
  options: {
    model?: string;
    maxTokens?: number;
  } = {},
) {
  return async (systemPrompt: string, _allowedTools: string[], userInput?: string): Promise<RawLLMResponse> => {
    const model = options.model ?? 'gpt-4o';
    const inputStr = userInput ?? '';

    const chat = client['chat'] as Record<string, unknown>;
    const completions = chat['completions'] as Record<string, unknown>;
    const createFn = completions['create'] as (args: unknown) => Promise<Record<string, unknown>>;

    const response = await createFn.call(completions, {
      model,
      max_tokens: options.maxTokens ?? 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputStr },
      ],
    });

    const choices = response['choices'] as Array<Record<string, unknown>> | undefined;
    const firstChoice = choices?.[0];
    const message = firstChoice?.['message'] as Record<string, unknown> | undefined;
    const rawText = (message?.['content'] as string) ?? '';

    const usage = response['usage'] as Record<string, unknown> | undefined;
    const tokenCount = (usage?.['completion_tokens'] as number) ?? 0;

    return { rawText, tokenCount, steps: 1 };
  };
}
