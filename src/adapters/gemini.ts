import type { RawLLMResponse } from './base.js';

export function geminiAdapter(
  client: Record<string, unknown>,
  options: { model?: string } = {},
) {
  return async (systemPrompt: string, _allowedTools: string[], userInput?: string): Promise<RawLLMResponse> => {
    const model = options.model ?? 'gemini-2.0-flash';
    const inputStr = userInput ?? '';

    const getGenerativeModel = client['getGenerativeModel'] as (
      args: unknown,
    ) => Record<string, unknown>;

    const genModel = getGenerativeModel.call(client, {
      model,
      systemInstruction: systemPrompt,
    });

    const generateContent = genModel['generateContent'] as (
      args: unknown,
    ) => Promise<Record<string, unknown>>;

    const result = await generateContent.call(genModel, inputStr);
    const responseObj = result['response'] as Record<string, unknown> | undefined;
    const textFn = responseObj?.['text'] as (() => string) | undefined;
    const rawText = textFn?.call(responseObj) ?? '';

    return { rawText, steps: 1 };
  };
}
