import { ZodSchema, z } from 'zod';
import type {
  Tether,
  TetherConfig,
  ViolationEvent,
} from './violations.js';

export function defineAgent<TSchema extends ZodSchema>(
  config: TetherConfig<TSchema>,
): Tether<TSchema> {
  const name = config.name;
  const version = config.version ?? '1.0.0';
  const description = config.description ?? '';

  function toSystemPrompt(): string {
    const lines: string[] = [];

    lines.push(`You are ${name} v${version}.`);
    if (description) lines.push(`\nROLE: ${description}`);

    if (config.scope) {
      lines.push('\nYOU MAY ONLY:');
      if (config.scope.tools?.length) {
        lines.push(`- Use these tools: ${config.scope.tools.join(', ')}`);
      }
      if (config.scope.topics?.length) {
        lines.push(`- Discuss these topics: ${config.scope.topics.join(', ')}`);
      }
      if (config.scope.maxSteps) {
        lines.push(`- Take at most ${config.scope.maxSteps} reasoning steps`);
      }
      if (config.scope.maxTokensOut) {
        lines.push(`- Produce responses under ${config.scope.maxTokensOut} tokens`);
      }
    }

    if (config.forbidden) {
      lines.push('\nYOU MUST NEVER:');
      if (config.forbidden.tools?.length) {
        lines.push(`- Call these tools: ${config.forbidden.tools.join(', ')}`);
      }
      if (config.forbidden.topics?.length) {
        lines.push(`- Discuss: ${config.forbidden.topics.join(', ')}`);
      }
      if (config.forbidden.outputPatterns?.length) {
        lines.push(
          `- Include content matching: ${config.forbidden.outputPatterns.map((r) => r.source).join(', ')}`,
        );
      }
    }

    if (config.handoffPolicy?.allowed?.length) {
      lines.push(
        `\nYOU MAY ONLY HAND OFF TO: ${config.handoffPolicy.allowed.join(', ')}`,
      );
    }

    // Inject output schema shape as JSON comment
    const shape = describeSchema(config.outputSchema);
    lines.push(`\nYOUR OUTPUT MUST BE VALID JSON MATCHING THIS SHAPE:\n${shape}`);

    if (config.onViolation?.fallbackOutput) {
      lines.push(
        `\nIF YOU ARE UNCERTAIN OR CANNOT COMPLY: return this exact JSON:\n${JSON.stringify(config.onViolation.fallbackOutput, null, 2)}`,
      );
    }

    lines.push(
      '\nALWAYS respond with raw JSON only. No markdown. No explanation. No code blocks.',
    );

    return lines.join('\n');
  }

  function resolvedTools(): string[] {
    return config.scope?.tools ?? [];
  }

  function validate(output: unknown) {
    return config.outputSchema.safeParse(output);
  }

  return {
    name,
    version,
    description,
    config,
    toSystemPrompt,
    resolvedTools,
    validate,
  };
}

// ─── Internal: Describe Zod Schema as readable shape ─────────────────────────
// WARNING: best-effort, non-guaranteed across Zod versions.
// Relies on Zod internal `_def` which is not part of the public API.
// If Zod changes internals, this gracefully degrades to '{ ... }'.

function describeSchema(schema: ZodSchema): string {
  try {
    // best-effort, non-guaranteed — accesses Zod internals
    const def = (schema as unknown as Record<string, unknown>)['_def'] as Record<string, unknown> | undefined;
    if (!def) return '{ ... }';
    return JSON.stringify(zodDefToShape(def), null, 2);
  } catch {
    return '{ ... }';
  }
}

function zodDefToShape(def: Record<string, unknown>): unknown {
  if (!def) return '?';
  const typeName: string = (def['typeName'] as string) ?? '';

  switch (typeName) {
    case 'ZodObject': {
      const shape: Record<string, unknown> = {};
      const shapeFn = def['shape'] as () => Record<string, Record<string, unknown>>;
      for (const [key, val] of Object.entries(shapeFn())) {
        shape[key] = zodDefToShape(val['_def'] as Record<string, unknown>);
      }
      return shape;
    }
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodEnum':
      return (def['values'] as string[]).join(' | ');
    case 'ZodOptional': {
      const innerType = def['innerType'] as Record<string, unknown>;
      return `${zodDefToShape(innerType['_def'] as Record<string, unknown>)} | undefined`;
    }
    case 'ZodArray': {
      const type = def['type'] as Record<string, unknown>;
      return [zodDefToShape(type['_def'] as Record<string, unknown>)];
    }
    case 'ZodLiteral':
      return def['value'];
    default:
      return typeName.replace('Zod', '').toLowerCase() || '?';
  }
}
