export interface RawLLMResponse {
  rawText: string;
  toolCallsMade?: Array<{ name: string; input: unknown }>;
  tokenCount?: number;
  steps?: number;
}

export interface AdapterCallOptions {
  systemPrompt: string;
  allowedTools: string[];
  input: string | Record<string, unknown>;
}

/**
 * Adapter function signature matching enforce()'s call contract.
 * Positional args: (systemPrompt, allowedTools, userInput?)
 */
export type AdapterFn = (
  systemPrompt: string,
  allowedTools: string[],
  userInput?: string,
) => Promise<RawLLMResponse>;
