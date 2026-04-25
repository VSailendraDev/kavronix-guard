import { z, ZodSchema } from 'zod';

// ─── Violation Types ──────────────────────────────────────────────────────────

export type ViolationType =
  | 'FORBIDDEN_TOOL'
  | 'FORBIDDEN_TOPIC'
  | 'FORBIDDEN_PATTERN'
  | 'OUTPUT_SCHEMA_MISMATCH'
  | 'MAX_STEPS_EXCEEDED'
  | 'MAX_TOKENS_EXCEEDED'
  | 'TIMEOUT'
  | 'HANDOFF_NOT_ALLOWED'
  | 'HANDOFF_CONTEXT_INVALID'
  | 'HANDOFF_CONDITION_FAILED';

export type ViolationSeverity = 'soft' | 'hard';

export const VIOLATION_SEVERITY: Record<ViolationType, ViolationSeverity> = {
  FORBIDDEN_TOOL: 'hard',
  FORBIDDEN_TOPIC: 'hard',
  FORBIDDEN_PATTERN: 'hard',
  OUTPUT_SCHEMA_MISMATCH: 'hard',
  MAX_STEPS_EXCEEDED: 'soft',
  MAX_TOKENS_EXCEEDED: 'soft',
  TIMEOUT: 'hard',
  HANDOFF_NOT_ALLOWED: 'hard',
  HANDOFF_CONTEXT_INVALID: 'hard',
  HANDOFF_CONDITION_FAILED: 'hard',
};

export interface ViolationEvent {
  type: ViolationType;
  severity: ViolationSeverity;
  agentName: string;
  message: string;
  timestamp: Date;
  detail?: unknown;
}

// ─── Violation Strategies ─────────────────────────────────────────────────────

export type ViolationStrategy = 'throw' | 'warn' | 'fallback' | 'retry';

// ─── Execution Events (logging hooks) ────────────────────────────────────────

export type ExecutionEventType = 'start' | 'adapter_call' | 'violation' | 'retry' | 'end';

export interface ExecutionEvent {
  type: ExecutionEventType;
  agentName: string;
  timestamp: Date;
  detail?: unknown;
}

export interface ViolationConfig<TOutput> {
  strategy: ViolationStrategy;
  maxRetries?: number;
  fallbackOutput?: TOutput;
  notify?: (violation: ViolationEvent) => void;
  onExecution?: (event: ExecutionEvent) => void;
}

// ─── Agent Scope ──────────────────────────────────────────────────────────────

export interface AgentScope {
  tools?: string[];
  topics?: string[];
  maxSteps?: number;
  maxTokensOut?: number;
  timeoutMs?: number;
}

export interface AgentForbidden {
  tools?: string[];
  topics?: string[];
  outputPatterns?: RegExp[];
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export type MemoryAccess = 'none' | 'session' | 'user' | 'global';

export interface MemoryConfig {
  access: MemoryAccess;
  canWrite: boolean;
}

// ─── Handoff Policy ──────────────────────────────────────────────────────────

export interface HandoffPolicy {
  allowed: string[];
  requiresConfidenceAbove?: number;
  mustPassContext?: string[];
}

// ─── Agent Contract Definition ────────────────────────────────────────────────

export interface TetherConfig<TSchema extends ZodSchema> {
  name: string;
  version?: string;
  description?: string;
  scope?: AgentScope;
  forbidden?: AgentForbidden;
  outputSchema: TSchema;
  handoffPolicy?: HandoffPolicy;
  onViolation?: ViolationConfig<z.infer<TSchema>>;
  memory?: MemoryConfig;
}

// ─── Agent Contract (returned by defineAgent) ─────────────────────────────────

export interface Tether<TSchema extends ZodSchema> {
  name: string;
  version: string;
  description: string;
  config: TetherConfig<TSchema>;
  toSystemPrompt(): string;
  resolvedTools(): string[];
  validate(output: unknown): z.SafeParseReturnType<unknown, z.infer<TSchema>>;
}

// ─── Enforce Result ───────────────────────────────────────────────────────────

export interface EnforceResult<TOutput> {
  data: TOutput;
  meta: {
    agentName: string;
    stepsUsed: number;
    violations: ViolationEvent[];
    retriesUsed: number;
    durationMs: number;
    handoffTriggered: boolean;
    handoffTarget?: string;
  };
}

// ─── Handoff ─────────────────────────────────────────────────────────────────

export interface HandoffConfig<
  TFromSchema extends ZodSchema,
  TToSchema extends ZodSchema,
  TContextSchema extends ZodSchema,
> {
  from: Tether<TFromSchema>;
  to: Tether<TToSchema>;
  requiredContext: TContextSchema;
  redact?: string[];
  conditions?: Array<(ctx: z.infer<TContextSchema>) => boolean>;
  audit?: boolean;
}

export interface HandoffProtocol<
  TFromSchema extends ZodSchema,
  TToSchema extends ZodSchema,
  TContextSchema extends ZodSchema,
> {
  config: HandoffConfig<TFromSchema, TToSchema, TContextSchema>;
  execute(options: {
    context: z.infer<TContextSchema>;
    call: (
      ctx: z.infer<TContextSchema>,
      systemPrompt: string,
    ) => Promise<EnforceResult<z.infer<TToSchema>>>;
  }): Promise<EnforceResult<z.infer<TToSchema>>>;
}

// ─── Adapter Interface ────────────────────────────────────────────────────────

export interface LLMAdapter<TRawOutput = unknown> {
  name: string;
  extractText(raw: TRawOutput): string;
  extractToolCalls(raw: TRawOutput): Array<{ name: string; input: unknown }>;
  extractTokenCount(raw: TRawOutput): number;
}
