// Core
export { defineAgent } from './core/defineAgent.js';
export { enforce, TetherViolationError } from './core/enforce.js';
export { handoff } from './core/handoff.js';
export { compilePrompt } from './core/promptCompiler.js';

// Adapters
export { claudeAdapter } from './adapters/claude.js';
export { openaiAdapter } from './adapters/openai.js';
export { geminiAdapter } from './adapters/gemini.js';

// Types (re-exported for consumers)
export type {
  Tether,
  TetherConfig,
  AgentScope,
  AgentForbidden,
  HandoffPolicy,
  HandoffConfig,
  HandoffProtocol,
  EnforceResult,
  ViolationEvent,
  ViolationType,
  ViolationSeverity,
  ViolationStrategy,
  ViolationConfig,
  ExecutionEvent,
  ExecutionEventType,
  MemoryAccess,
  MemoryConfig,
  LLMAdapter,
} from './core/violations.js';

export { VIOLATION_SEVERITY } from './core/violations.js';

// Adapter base types
export type { RawLLMResponse, AdapterCallOptions, AdapterFn } from './adapters/base.js';
