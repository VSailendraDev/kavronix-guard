import { ZodSchema, z } from 'zod';
import type {
  Tether,
  HandoffConfig,
  HandoffProtocol,
  EnforceResult,
  ViolationEvent,
} from './violations.js';
import { TetherViolationError } from './enforce.js';

export function handoff<
  TFromSchema extends ZodSchema,
  TToSchema extends ZodSchema,
  TContextSchema extends ZodSchema,
>(
  config: HandoffConfig<TFromSchema, TToSchema, TContextSchema>,
): HandoffProtocol<TFromSchema, TToSchema, TContextSchema> {

  function redactContext(
    ctx: z.infer<TContextSchema>,
  ): z.infer<TContextSchema> {
    if (!config.redact || config.redact.length === 0) return ctx;
    const copy = { ...(ctx as Record<string, unknown>) };
    for (const key of config.redact) {
      delete copy[key];
    }
    return copy as z.infer<TContextSchema>;
  }

  async function execute(options: {
    context: z.infer<TContextSchema>;
    call: (
      ctx: z.infer<TContextSchema>,
      systemPrompt: string,
    ) => Promise<EnforceResult<z.infer<TToSchema>>>;
  }): Promise<EnforceResult<z.infer<TToSchema>>> {
    const { context, call } = options;

    // ── Validate context schema ───────────────────────────────────────────────
    const contextParse = config.requiredContext.safeParse(context);
    if (!contextParse.success) {
      const violation: ViolationEvent = {
        type: 'HANDOFF_CONTEXT_INVALID',
        severity: 'hard',
        agentName: config.from.name,
        message: `Handoff context from ${config.from.name} to ${config.to.name} is invalid: ${contextParse.error.message}`,
        timestamp: new Date(),
        detail: { zodError: contextParse.error.flatten() },
      };
      throw new TetherViolationError(violation);
    }

    // ── Check handoff is allowed ──────────────────────────────────────────────
    const fromPolicy = config.from.config.handoffPolicy;
    if (fromPolicy && !fromPolicy.allowed.includes(config.to.name)) {
      const violation: ViolationEvent = {
        type: 'HANDOFF_NOT_ALLOWED',
        severity: 'hard',
        agentName: config.from.name,
        message: `${config.from.name} is not allowed to hand off to ${config.to.name}`,
        timestamp: new Date(),
        detail: { allowed: fromPolicy.allowed, attempted: config.to.name },
      };
      throw new TetherViolationError(violation);
    }

    // ── Check conditions ──────────────────────────────────────────────────────
    if (config.conditions) {
      for (const condition of config.conditions) {
        if (!condition(context)) {
          const violation: ViolationEvent = {
            type: 'HANDOFF_CONDITION_FAILED',
            severity: 'hard',
            agentName: config.from.name,
            message: `Handoff condition from ${config.from.name} to ${config.to.name} was not met`,
            timestamp: new Date(),
            detail: { context },
          };
          throw new TetherViolationError(violation);
        }
      }
    }

    // ── Redact sensitive fields ───────────────────────────────────────────────
    const safeContext = redactContext(context);

    // ── Audit log ─────────────────────────────────────────────────────────────
    if (config.audit) {
      console.log(
        `[kavronix-guard] HANDOFF ${config.from.name} → ${config.to.name}`,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          from: config.from.name,
          to: config.to.name,
          contextKeys: Object.keys(safeContext as object),
          redacted: config.redact ?? [],
        }),
      );
    }

    // ── Execute ───────────────────────────────────────────────────────────────
    const systemPrompt = config.to.toSystemPrompt();
    const result = await call(safeContext, systemPrompt);

    // Annotate result with handoff info
    result.meta.handoffTriggered = true;
    result.meta.handoffTarget = config.to.name;

    return result;
  }

  return { config, execute };
}
