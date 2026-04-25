# CLAUDE.md — tether

> This file is the complete build specification for the `tether` npm library.
> Read this entire file before writing a single line of code.
> Follow every section in order. Do not skip steps.

---

## What You Are Building

`tether` is a TypeScript-first npm library that acts as a **contract enforcement layer for AI agents**.

It sits between your application and any LLM SDK (Claude, OpenAI, Gemini, etc.) and enforces:
- What tools an agent is allowed to call
- What topics it can discuss
- What shape its output must be
- Who it can hand off control to
- What happens when it violates any of the above

**One-line pitch:** "Zod validates your data. `tether` validates your agents."

---

## Tech Stack

- **Language:** TypeScript (strict mode, no `any`)
- **Runtime:** Node.js 18+
- **Schema validation:** Zod (peer dependency)
- **Build tool:** tsup (bundles ESM + CJS)
- **Test runner:** Vitest
- **Linter:** ESLint + Prettier
- **Package manager:** pnpm
- **Publishing target:** npm public registry

---

## Repo Structure to Create

```
tether/
├── CLAUDE.md                     ← this file
├── README.md                     ← generated at end
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc
├── .npmignore
├── src/
│   ├── index.ts                  ← main export barrel
│   ├── core/
│   │   ├── defineAgent.ts
│   │   ├── enforce.ts
│   │   ├── handoff.ts
│   │   ├── violations.ts
│   │   └── promptCompiler.ts
│   ├── validation/
│   │   ├── toolGuard.ts
│   │   ├── outputGuard.ts
│   │   ├── patternGuard.ts
│   │   └── scopeGuard.ts
│   ├── adapters/
│   │   ├── base.ts
│   │   ├── claude.ts
│   │   ├── openai.ts
│   │   └── gemini.ts
│   ├── testing/
│   │   ├── index.ts
│   │   ├── contractSuite.ts
│   │   ├── mockAgent.ts
│   │   └── assertions.ts
│   └── cli/
│       ├── index.ts
│       ├── validate.ts
│       ├── audit.ts
│       └── conflicts.ts
└── tests/
    ├── core/
    │   ├── defineAgent.test.ts
    │   ├── enforce.test.ts
    │   ├── handoff.test.ts
    │   └── promptCompiler.test.ts
    ├── validation/
    │   ├── toolGuard.test.ts
    │   ├── outputGuard.test.ts
    │   └── patternGuard.test.ts
    └── testing/
        ├── contractSuite.test.ts
        └── mockAgent.test.ts
```

---

## Step 1 — Project Bootstrap

Run these commands in order:

```bash
mkdir tether && cd tether
pnpm init
pnpm add -D typescript tsup vitest @types/node eslint prettier
pnpm add zod    # runtime peer dep — also install as direct for types
```

---

## Step 2 — Configuration Files

### `package.json`

```json
{
  "name": "tether",
  "version": "0.1.0",
  "description": "Zod validates your data. tether validates your agents — runtime contract enforcement for AI agents.",
  "keywords": ["ai", "agents", "llm", "tether", "contract", "validation", "typescript", "zod", "enforcement"],
  "author": "",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./testing": {
      "import": "./dist/testing/index.js",
      "require": "./dist/testing/index.cjs",
      "types": "./dist/testing/index.d.ts"
    },
    "./cli": {
      "import": "./dist/cli/index.js",
      "require": "./dist/cli/index.cjs",
      "types": "./dist/cli/index.d.ts"
    }
  },
  "bin": {
    "tether": "./dist/cli/index.js"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src tests --ext .ts",
    "format": "prettier --write src tests",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build && pnpm test && pnpm typecheck",
    "release": "pnpm prepublishOnly && npm publish --access public"
  },
  "peerDependencies": {
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "zod": "^3.22.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `tsup.config.ts`

```ts
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'testing/index': 'src/testing/index.ts',
      'cli/index': 'src/cli/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    banner: {
      js: '// tether — MIT License',
    },
  },
]);
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/cli/**'],
    },
  },
});
```

### `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 90,
  "tabWidth": 2
}
```

### `.npmignore`

```
src/
tests/
tsup.config.ts
vitest.config.ts
tsconfig.json
.eslintrc.json
.prettierrc
CLAUDE.md
```

---

## Step 3 — Core Types (Build This First)

### `src/core/violations.ts`

This defines every type in the system. Build this before anything else.

```ts
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

export interface ViolationEvent {
  type: ViolationType;
  agentName: string;
  message: string;
  timestamp: Date;
  detail?: unknown;
}

// ─── Violation Strategies ─────────────────────────────────────────────────────

export type ViolationStrategy = 'throw' | 'warn' | 'fallback' | 'retry';

export interface ViolationConfig<TOutput> {
  strategy: ViolationStrategy;
  maxRetries?: number;
  fallbackOutput?: TOutput;
  notify?: (violation: ViolationEvent) => void;
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
```

---

## Step 4 — Core Implementation

### `src/core/defineAgent.ts`

```ts
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

function describeSchema(schema: ZodSchema): string {
  try {
    // Best-effort: show the Zod type name and shape
    const def = (schema as any)._def;
    if (!def) return '{ ... }';
    return JSON.stringify(zodDefToShape(def), null, 2);
  } catch {
    return '{ ... }';
  }
}

function zodDefToShape(def: any): unknown {
  if (!def) return '?';
  const typeName: string = def.typeName ?? '';

  switch (typeName) {
    case 'ZodObject': {
      const shape: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(def.shape())) {
        shape[key] = zodDefToShape((val as any)._def);
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
      return (def.values as string[]).join(' | ');
    case 'ZodOptional':
      return `${zodDefToShape(def.innerType._def)} | undefined`;
    case 'ZodArray':
      return [zodDefToShape(def.type._def)];
    case 'ZodLiteral':
      return def.value;
    default:
      return typeName.replace('Zod', '').toLowerCase() || '?';
  }
}
```

### `src/core/promptCompiler.ts`

```ts
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
```

### `src/validation/toolGuard.ts`

```ts
import type { ViolationEvent } from '../core/violations.js';

export function checkToolAllowed(
  agentName: string,
  toolName: string,
  allowedTools: string[] | undefined,
  forbiddenTools: string[] | undefined,
): ViolationEvent | null {
  // If forbidden list exists and tool is in it
  if (forbiddenTools?.includes(toolName)) {
    return {
      type: 'FORBIDDEN_TOOL',
      agentName,
      message: `Agent attempted to call forbidden tool: "${toolName}"`,
      timestamp: new Date(),
      detail: { toolName, forbiddenTools },
    };
  }

  // If allowed list exists and tool is NOT in it
  if (allowedTools && allowedTools.length > 0 && !allowedTools.includes(toolName)) {
    return {
      type: 'FORBIDDEN_TOOL',
      agentName,
      message: `Agent attempted to call out-of-scope tool: "${toolName}". Allowed: [${allowedTools.join(', ')}]`,
      timestamp: new Date(),
      detail: { toolName, allowedTools },
    };
  }

  return null;
}
```

### `src/validation/outputGuard.ts`

```ts
import type { ViolationEvent } from '../core/violations.js';
import { ZodSchema } from 'zod';

export function checkOutputSchema<TSchema extends ZodSchema>(
  agentName: string,
  output: unknown,
  schema: TSchema,
): ViolationEvent | null {
  const result = schema.safeParse(output);
  if (!result.success) {
    return {
      type: 'OUTPUT_SCHEMA_MISMATCH',
      agentName,
      message: `Agent output does not match schema: ${result.error.message}`,
      timestamp: new Date(),
      detail: { output, zodError: result.error.flatten() },
    };
  }
  return null;
}

export function parseJsonOutput(raw: string): unknown {
  // Strip markdown code blocks if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from mixed content
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error(`Could not parse LLM output as JSON: ${cleaned.slice(0, 200)}`);
  }
}
```

### `src/validation/patternGuard.ts`

```ts
import type { ViolationEvent } from '../core/violations.js';

export function checkForbiddenPatterns(
  agentName: string,
  output: string,
  patterns: RegExp[] | undefined,
): ViolationEvent | null {
  if (!patterns || patterns.length === 0) return null;

  for (const pattern of patterns) {
    if (pattern.test(output)) {
      return {
        type: 'FORBIDDEN_PATTERN',
        agentName,
        message: `Agent output contains forbidden pattern: ${pattern.source}`,
        timestamp: new Date(),
        detail: { pattern: pattern.source },
      };
    }
  }

  return null;
}
```

### `src/validation/scopeGuard.ts`

```ts
import type { ViolationEvent } from '../core/violations.js';

export function checkMaxSteps(
  agentName: string,
  steps: number,
  maxSteps: number | undefined,
): ViolationEvent | null {
  if (maxSteps !== undefined && steps > maxSteps) {
    return {
      type: 'MAX_STEPS_EXCEEDED',
      agentName,
      message: `Agent exceeded max steps: ${steps} > ${maxSteps}`,
      timestamp: new Date(),
      detail: { steps, maxSteps },
    };
  }
  return null;
}

export function checkMaxTokens(
  agentName: string,
  tokenCount: number,
  maxTokensOut: number | undefined,
): ViolationEvent | null {
  if (maxTokensOut !== undefined && tokenCount > maxTokensOut) {
    return {
      type: 'MAX_TOKENS_EXCEEDED',
      agentName,
      message: `Agent exceeded max output tokens: ${tokenCount} > ${maxTokensOut}`,
      timestamp: new Date(),
      detail: { tokenCount, maxTokensOut },
    };
  }
  return null;
}
```

### `src/core/enforce.ts`

This is the main runtime engine. Build this carefully.

```ts
import { ZodSchema, z } from 'zod';
import type {
  Tether,
  EnforceResult,
  ViolationEvent,
  ViolationStrategy,
} from './violations.js';
import { checkToolAllowed } from '../validation/toolGuard.js';
import { checkOutputSchema, parseJsonOutput } from '../validation/outputGuard.js';
import { checkForbiddenPatterns } from '../validation/patternGuard.js';
import { checkMaxSteps, checkMaxTokens } from '../validation/scopeGuard.js';

export interface EnforceOptions<TSchema extends ZodSchema> {
  input: string | Record<string, unknown>;
  call: (
    systemPrompt: string,
    allowedTools: string[],
  ) => Promise<{
    rawText: string;
    toolCallsMade?: Array<{ name: string; input: unknown }>;
    tokenCount?: number;
    steps?: number;
  }>;
}

export async function enforce<TSchema extends ZodSchema>(
  contract: Tether<TSchema>,
  options: EnforceOptions<TSchema>,
): Promise<EnforceResult<z.infer<TSchema>>> {
  const startTime = Date.now();
  const violations: ViolationEvent[] = [];
  const systemPrompt = contract.toSystemPrompt();
  const allowedTools = contract.resolvedTools();
  const { config } = contract;

  let retriesUsed = 0;
  const maxRetries = config.onViolation?.maxRetries ?? 0;
  const strategy: ViolationStrategy = config.onViolation?.strategy ?? 'throw';

  async function attempt(): Promise<EnforceResult<z.infer<TSchema>>> {
    // ── Call the LLM ──────────────────────────────────────────────────────────
    const raw = await options.call(systemPrompt, allowedTools);

    const steps = raw.steps ?? 1;
    const tokenCount = raw.tokenCount ?? 0;

    // ── Guard: max steps ──────────────────────────────────────────────────────
    const stepsViolation = checkMaxSteps(
      contract.name,
      steps,
      config.scope?.maxSteps,
    );
    if (stepsViolation) violations.push(stepsViolation);

    // ── Guard: max tokens ─────────────────────────────────────────────────────
    const tokenViolation = checkMaxTokens(
      contract.name,
      tokenCount,
      config.scope?.maxTokensOut,
    );
    if (tokenViolation) violations.push(tokenViolation);

    // ── Guard: tool calls ─────────────────────────────────────────────────────
    for (const toolCall of raw.toolCallsMade ?? []) {
      const toolViolation = checkToolAllowed(
        contract.name,
        toolCall.name,
        config.scope?.tools,
        config.forbidden?.tools,
      );
      if (toolViolation) violations.push(toolViolation);
    }

    // ── Guard: forbidden output patterns ──────────────────────────────────────
    const patternViolation = checkForbiddenPatterns(
      contract.name,
      raw.rawText,
      config.forbidden?.outputPatterns,
    );
    if (patternViolation) violations.push(patternViolation);

    // ── Parse output ─────────────────────────────────────────────────────────
    let parsed: unknown;
    try {
      parsed = parseJsonOutput(raw.rawText);
    } catch (e) {
      const parseViolation: ViolationEvent = {
        type: 'OUTPUT_SCHEMA_MISMATCH',
        agentName: contract.name,
        message: `Failed to parse LLM output as JSON: ${(e as Error).message}`,
        timestamp: new Date(),
        detail: { rawText: raw.rawText },
      };
      violations.push(parseViolation);
      parsed = null;
    }

    // ── Guard: output schema ──────────────────────────────────────────────────
    const schemaViolation = checkOutputSchema(contract.name, parsed, config.outputSchema);
    if (schemaViolation) violations.push(schemaViolation);

    // ── Handle violations ─────────────────────────────────────────────────────
    const hardViolations = violations.filter(
      (v) =>
        v.type === 'OUTPUT_SCHEMA_MISMATCH' ||
        v.type === 'FORBIDDEN_TOOL' ||
        v.type === 'FORBIDDEN_PATTERN',
    );

    if (hardViolations.length > 0) {
      // Notify
      for (const v of hardViolations) {
        config.onViolation?.notify?.(v);
      }

      if (strategy === 'throw') {
        throw new TetherViolationError(hardViolations[0]!);
      }

      if (strategy === 'retry' && retriesUsed < maxRetries) {
        retriesUsed++;
        return attempt();
      }

      if (strategy === 'fallback' || (strategy === 'retry' && retriesUsed >= maxRetries)) {
        const fallback = config.onViolation?.fallbackOutput;
        if (!fallback) {
          throw new TetherViolationError(hardViolations[0]!);
        }
        return {
          data: fallback as z.infer<TSchema>,
          meta: {
            agentName: contract.name,
            stepsUsed: steps,
            violations,
            retriesUsed,
            durationMs: Date.now() - startTime,
            handoffTriggered: false,
          },
        };
      }

      // strategy === 'warn': log but continue
    }

    return {
      data: parsed as z.infer<TSchema>,
      meta: {
        agentName: contract.name,
        stepsUsed: steps,
        violations,
        retriesUsed,
        durationMs: Date.now() - startTime,
        handoffTriggered: false,
      },
    };
  }

  return attempt();
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class TetherViolationError extends Error {
  public readonly violation: ViolationEvent;

  constructor(violation: ViolationEvent) {
    super(`[${violation.type}] ${violation.message}`);
    this.name = 'TetherViolationError';
    this.violation = violation;
  }
}
```

### `src/core/handoff.ts`

```ts
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
        `[tether] HANDOFF ${config.from.name} → ${config.to.name}`,
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
```

---

## Step 5 — Adapters

### `src/adapters/base.ts`

```ts
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

export type AdapterFn = (options: AdapterCallOptions) => Promise<RawLLMResponse>;
```

### `src/adapters/claude.ts`

```ts
import type { AdapterCallOptions, RawLLMResponse } from './base.js';

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
  client: any,
  options: {
    model?: string;
    maxTokens?: number;
  } = {},
) {
  return async (adapterOptions: AdapterCallOptions): Promise<RawLLMResponse> => {
    const { systemPrompt, input } = adapterOptions;
    const model = options.model ?? 'claude-sonnet-4-6';
    const maxTokens = options.maxTokens ?? 1024;

    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: inputStr }],
    });

    const rawText =
      response.content
        ?.filter((b: any) => b.type === 'text')
        ?.map((b: any) => b.text)
        ?.join('') ?? '';

    const toolCallsMade = response.content
      ?.filter((b: any) => b.type === 'tool_use')
      ?.map((b: any) => ({ name: b.name, input: b.input })) ?? [];

    const tokenCount = response.usage?.output_tokens ?? 0;

    return { rawText, toolCallsMade, tokenCount, steps: 1 };
  };
}
```

### `src/adapters/openai.ts`

```ts
import type { AdapterCallOptions, RawLLMResponse } from './base.js';

export function openaiAdapter(
  client: any,
  options: {
    model?: string;
    maxTokens?: number;
  } = {},
) {
  return async (adapterOptions: AdapterCallOptions): Promise<RawLLMResponse> => {
    const { systemPrompt, input } = adapterOptions;
    const model = options.model ?? 'gpt-4o';
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

    const response = await client.chat.completions.create({
      model,
      max_tokens: options.maxTokens ?? 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputStr },
      ],
    });

    const rawText = response.choices?.[0]?.message?.content ?? '';
    const tokenCount = response.usage?.completion_tokens ?? 0;

    return { rawText, tokenCount, steps: 1 };
  };
}
```

### `src/adapters/gemini.ts`

```ts
import type { AdapterCallOptions, RawLLMResponse } from './base.js';

export function geminiAdapter(
  client: any,
  options: { model?: string } = {},
) {
  return async (adapterOptions: AdapterCallOptions): Promise<RawLLMResponse> => {
    const { systemPrompt, input } = adapterOptions;
    const model = options.model ?? 'gemini-2.0-flash';
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

    const genModel = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
    });

    const result = await genModel.generateContent(inputStr);
    const rawText = result.response?.text() ?? '';

    return { rawText, steps: 1 };
  };
}
```

---

## Step 6 — Testing Utilities

### `src/testing/mockAgent.ts`

```ts
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
  adapter: (options: any) => Promise<RawLLMResponse>;
}

export function mockAgent<TSchema extends ZodSchema>(
  _contract: Tether<TSchema>,
  options: MockAgentOptions<TSchema>,
): MockAgentInstance {
  let callCount = 0;
  let lastInput: unknown = null;
  const sequence = options.sequence ?? [];
  let sequenceIndex = 0;

  const adapter = async (adapterOptions: any): Promise<RawLLMResponse> => {
    callCount++;
    lastInput = adapterOptions.input;

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
```

### `src/testing/assertions.ts`

```ts
import { ZodSchema } from 'zod';
import type { EnforceResult, ViolationEvent, ViolationType } from '../core/violations.js';

export function assertNoViolations<T>(result: EnforceResult<T>): void {
  if (result.meta.violations.length > 0) {
    const msgs = result.meta.violations.map((v) => `  - [${v.type}] ${v.message}`).join('\n');
    throw new Error(`Expected no violations but got:\n${msgs}`);
  }
}

export function assertViolationType<T>(
  result: EnforceResult<T>,
  type: ViolationType,
): ViolationEvent {
  const found = result.meta.violations.find((v) => v.type === type);
  if (!found) {
    throw new Error(
      `Expected violation of type "${type}" but got: [${result.meta.violations.map((v) => v.type).join(', ')}]`,
    );
  }
  return found;
}

export function assertOutputShape<T>(result: EnforceResult<T>, schema: ZodSchema): void {
  const parse = schema.safeParse(result.data);
  if (!parse.success) {
    throw new Error(`Output does not match expected shape: ${parse.error.message}`);
  }
}

export function assertHandoffTriggered<T>(
  result: EnforceResult<T>,
  expectedTarget?: string,
): void {
  if (!result.meta.handoffTriggered) {
    throw new Error('Expected handoff to be triggered but it was not');
  }
  if (expectedTarget && result.meta.handoffTarget !== expectedTarget) {
    throw new Error(
      `Expected handoff to "${expectedTarget}" but got "${result.meta.handoffTarget}"`,
    );
  }
}
```

### `src/testing/contractSuite.ts`

```ts
import { ZodSchema, z } from 'zod';
import type { Tether, HandoffProtocol } from '../core/violations.js';
import { enforce } from '../core/enforce.js';
import { mockAgent, MockAgentOptions } from './mockAgent.js';
import {
  assertNoViolations,
  assertViolationType,
  assertOutputShape,
} from './assertions.js';

export interface ContractSuiteOptions<TSchema extends ZodSchema> {
  input?: string;
  using?: ReturnType<typeof mockAgent>;
}

export function contractSuite<TSchema extends ZodSchema>(
  contract: Tether<TSchema>,
) {
  return {
    /**
     * Run the contract with a mock and return the full result.
     */
    async run(options: ContractSuiteOptions<TSchema> = {}) {
      const mock =
        options.using ??
        mockAgent(contract, {
          alwaysOutput: contract.config.onViolation?.fallbackOutput ?? ({} as any),
        });

      return enforce(contract, {
        input: options.input ?? 'test input',
        call: mock.adapter,
      });
    },

    /**
     * Assert that the agent never calls these tools.
     */
    async assertNeverCalls(tools: string[], options: ContractSuiteOptions<TSchema> = {}) {
      for (const tool of tools) {
        const mock = mockAgent(contract, {
          alwaysOutput: contract.config.onViolation?.fallbackOutput ?? ({} as any),
          simulateToolCalls: [{ name: tool, input: {} }],
        });

        const result = await enforce(contract, {
          input: options.input ?? 'test input',
          call: mock.adapter,
        });

        const violation = result.meta.violations.find(
          (v) => v.type === 'FORBIDDEN_TOOL',
        );
        if (!violation) {
          throw new Error(
            `Expected FORBIDDEN_TOOL violation for tool "${tool}" but none was raised.`,
          );
        }
      }
    },

    /**
     * Assert that valid output always passes schema validation.
     */
    async assertOutputValid(options: ContractSuiteOptions<TSchema> = {}) {
      const result = await this.run(options);
      assertOutputShape(result, contract.config.outputSchema);
    },

    /**
     * Assert a handoff fires when conditions are met.
     */
    async assertHandoffFires<
      TFromSchema extends ZodSchema,
      TToSchema extends ZodSchema,
      TCtxSchema extends ZodSchema,
    >(
      protocol: HandoffProtocol<TFromSchema, TToSchema, TCtxSchema>,
      options: {
        context: z.infer<TCtxSchema>;
        using?: ReturnType<typeof mockAgent>;
      },
    ) {
      const targetMock =
        options.using ??
        mockAgent(protocol.config.to, {
          alwaysOutput:
            protocol.config.to.config.onViolation?.fallbackOutput ?? ({} as any),
        });

      const result = await protocol.execute({
        context: options.context,
        call: async (_ctx, _sp) => {
          return enforce(protocol.config.to, {
            input: _ctx as any,
            call: targetMock.adapter,
          });
        },
      });

      if (!result.meta.handoffTriggered) {
        throw new Error('Expected handoff to fire but it did not');
      }
    },
  };
}
```

### `src/testing/index.ts`

```ts
export { mockAgent } from './mockAgent.js';
export { contractSuite } from './contractSuite.js';
export {
  assertNoViolations,
  assertViolationType,
  assertOutputShape,
  assertHandoffTriggered,
} from './assertions.js';
```

---

## Step 7 — CLI

### `src/cli/validate.ts`

```ts
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';

export async function validateContracts(pattern: string): Promise<void> {
  console.log(`\n[tether] Validating contracts matching: ${pattern}\n`);

  // For now: check files exist and are importable
  const files = resolveGlob(pattern);

  if (files.length === 0) {
    console.warn('⚠️  No contract files found.');
    return;
  }

  let errors = 0;
  for (const file of files) {
    try {
      // Dynamic import to validate the module loads
      await import(path.resolve(file));
      console.log(`✅ ${file}`);
    } catch (e) {
      console.error(`❌ ${file}: ${(e as Error).message}`);
      errors++;
    }
  }

  console.log(`\n${files.length - errors}/${files.length} contracts valid.\n`);
  if (errors > 0) process.exit(1);
}

function resolveGlob(pattern: string): string[] {
  // Simple glob resolution without external deps
  if (!pattern.includes('*')) {
    return existsSync(pattern) ? [pattern] : [];
  }
  const dir = pattern.split('*')[0]?.replace(/\/$/, '') ?? '.';
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith('.ts'))
    .map((f) => path.join(dir, f.name));
}
```

### `src/cli/audit.ts`

```ts
import { readFileSync, existsSync } from 'fs';

export function auditLog(logFile: string): void {
  if (!existsSync(logFile)) {
    console.error(`Log file not found: ${logFile}`);
    process.exit(1);
  }

  const lines = readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
  const violations: any[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.violations && parsed.violations.length > 0) {
        violations.push(...parsed.violations);
      }
    } catch {
      /* skip non-JSON lines */
    }
  }

  if (violations.length === 0) {
    console.log('✅ No violations found in audit log.');
    return;
  }

  console.log(`\n⚠️  Found ${violations.length} violations:\n`);
  for (const v of violations) {
    console.log(`  [${v.type}] ${v.agentName}: ${v.message}`);
  }
  console.log('');
}
```

### `src/cli/conflicts.ts`

```ts
export async function checkConflicts(agentsDir: string): Promise<void> {
  console.log(`\n[tether] Checking for conflicts in: ${agentsDir}\n`);
  console.log('Conflict detection requires importing contract files.');
  console.log('Run: tether validate <pattern> first.\n');
  // Full implementation would dynamically import all contracts
  // and check for overlapping tool names, duplicate agent names, etc.
}
```

### `src/cli/index.ts`

```ts
#!/usr/bin/env node

const [,, command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'validate': {
      const { validateContracts } = await import('./validate.js');
      await validateContracts(args[0] ?? './agents/**/*.ts');
      break;
    }
    case 'audit': {
      const { auditLog } = await import('./audit.js');
      auditLog(args[0] ?? './logs/run.jsonl');
      break;
    }
    case 'conflicts': {
      const { checkConflicts } = await import('./conflicts.js');
      await checkConflicts(args[0] ?? './agents');
      break;
    }
    default: {
      console.log(`
tether CLI

Commands:
  validate <pattern>   Validate contract files (e.g. ./agents/**/*.ts)
  audit <logfile>      Audit a run log for violations
  conflicts <dir>      Check for conflicts between agent contracts

Examples:
  tether validate ./agents/**/*.contract.ts
  tether audit ./logs/run-2026-04-18.jsonl
  tether conflicts ./agents/
      `);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---

## Step 8 — Main Export Barrel

### `src/index.ts`

```ts
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
  ViolationStrategy,
  ViolationConfig,
  MemoryAccess,
  MemoryConfig,
  LLMAdapter,
} from './core/violations.js';
```

---

## Step 9 — Tests

Write all tests in `tests/`. Use Vitest. No real LLM calls — all tests use `mockAgent`.

### `tests/core/defineAgent.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';

const schema = z.object({
  intent: z.enum(['billing', 'technical', 'general']),
  confidence: z.number(),
});

const TestAgent = defineAgent({
  name: 'TestAgent',
  version: '1.0.0',
  description: 'A test agent',
  scope: { tools: ['lookup', 'classify'], maxSteps: 3 },
  forbidden: { tools: ['delete', 'send_email'] },
  outputSchema: schema,
  handoffPolicy: { allowed: ['SupportAgent'] },
});

describe('defineAgent', () => {
  it('sets name and version', () => {
    expect(TestAgent.name).toBe('TestAgent');
    expect(TestAgent.version).toBe('1.0.0');
  });

  it('generates a system prompt containing key sections', () => {
    const prompt = TestAgent.toSystemPrompt();
    expect(prompt).toContain('TestAgent');
    expect(prompt).toContain('YOU MAY ONLY');
    expect(prompt).toContain('YOU MUST NEVER');
    expect(prompt).toContain('delete');
    expect(prompt).toContain('SupportAgent');
  });

  it('resolvedTools returns scope tools', () => {
    expect(TestAgent.resolvedTools()).toEqual(['lookup', 'classify']);
  });

  it('validates correct output', () => {
    const result = TestAgent.validate({ intent: 'billing', confidence: 0.9 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid output', () => {
    const result = TestAgent.validate({ intent: 'unknown' });
    expect(result.success).toBe(false);
  });
});
```

### `tests/core/enforce.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';
import { enforce, TetherViolationError } from '../../src/core/enforce.js';
import { mockAgent } from '../../src/testing/mockAgent.js';

const schema = z.object({
  intent: z.enum(['billing', 'technical', 'general']),
  confidence: z.number(),
});

const Agent = defineAgent({
  name: 'EnforceTestAgent',
  scope: { tools: ['lookup'] },
  forbidden: {
    tools: ['delete'],
    outputPatterns: [/secret/i],
  },
  outputSchema: schema,
  onViolation: { strategy: 'throw' },
});

describe('enforce', () => {
  it('returns typed result for valid output', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
    });

    const result = await enforce(Agent, {
      input: 'test',
      call: mock.adapter,
    });

    expect(result.data.intent).toBe('billing');
    expect(result.data.confidence).toBe(0.9);
    expect(result.meta.violations).toHaveLength(0);
  });

  it('throws on forbidden tool call', async () => {
    const mock = mockAgent(Agent, {
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
      simulateToolCalls: [{ name: 'delete', input: {} }],
    });

    await expect(
      enforce(Agent, { input: 'test', call: mock.adapter }),
    ).rejects.toThrow(TetherViolationError);
  });

  it('throws on output pattern violation', async () => {
    const mock = mockAgent(Agent, {
      rawText: '{ "intent": "billing", "confidence": 0.9, "data": "secret_key" }',
      alwaysOutput: { intent: 'billing', confidence: 0.9 },
    });

    await expect(
      enforce(Agent, { input: 'test', call: mock.adapter }),
    ).rejects.toThrow(TetherViolationError);
  });

  it('uses fallback on violation with fallback strategy', async () => {
    const AgentWithFallback = defineAgent({
      name: 'FallbackAgent',
      outputSchema: schema,
      onViolation: {
        strategy: 'fallback',
        fallbackOutput: { intent: 'general', confidence: 0 },
      },
    });

    const mock = mockAgent(AgentWithFallback, {
      rawText: 'not json at all',
      alwaysOutput: {} as any,
    });

    const result = await enforce(AgentWithFallback, {
      input: 'test',
      call: mock.adapter,
    });

    expect(result.data.intent).toBe('general');
    expect(result.data.confidence).toBe(0);
  });

  it('retries on violation with retry strategy', async () => {
    let callCount = 0;
    const schema2 = z.object({ value: z.number() });

    const RetryAgent = defineAgent({
      name: 'RetryAgent',
      outputSchema: schema2,
      onViolation: {
        strategy: 'retry',
        maxRetries: 2,
        fallbackOutput: { value: -1 },
      },
    });

    const result = await enforce(RetryAgent, {
      input: 'test',
      call: async () => {
        callCount++;
        if (callCount < 3) return { rawText: 'not json', steps: 1 };
        return { rawText: JSON.stringify({ value: 42 }), steps: 1 };
      },
    });

    expect(callCount).toBe(3);
    expect(result.data.value).toBe(42);
  });
});
```

### `tests/core/handoff.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineAgent } from '../../src/core/defineAgent.js';
import { handoff } from '../../src/core/handoff.js';
import { enforce } from '../../src/core/enforce.js';
import { mockAgent } from '../../src/testing/mockAgent.js';
import { TetherViolationError } from '../../src/core/enforce.js';

const fromSchema = z.object({ classified: z.boolean() });
const toSchema = z.object({ resolved: z.boolean() });
const ctxSchema = z.object({ intent: z.string(), ticketId: z.string() });

const FromAgent = defineAgent({
  name: 'FromAgent',
  outputSchema: fromSchema,
  handoffPolicy: { allowed: ['ToAgent'] },
});

const ToAgent = defineAgent({
  name: 'ToAgent',
  outputSchema: toSchema,
  onViolation: { strategy: 'fallback', fallbackOutput: { resolved: false } },
});

const protocol = handoff({
  from: FromAgent,
  to: ToAgent,
  requiredContext: ctxSchema,
  redact: ['ticketId'],
  conditions: [(ctx) => ctx.intent === 'billing'],
  audit: false,
});

describe('handoff', () => {
  it('executes successfully when conditions are met', async () => {
    const mock = mockAgent(ToAgent, { alwaysOutput: { resolved: true } });

    const result = await protocol.execute({
      context: { intent: 'billing', ticketId: 'T123' },
      call: async (ctx, _sp) =>
        enforce(ToAgent, { input: ctx as any, call: mock.adapter }),
    });

    expect(result.meta.handoffTriggered).toBe(true);
    expect(result.meta.handoffTarget).toBe('ToAgent');
    expect(result.data.resolved).toBe(true);
  });

  it('throws when condition is not met', async () => {
    await expect(
      protocol.execute({
        context: { intent: 'technical', ticketId: 'T123' },
        call: async () => { throw new Error('should not reach'); },
      }),
    ).rejects.toThrow(TetherViolationError);
  });

  it('throws on invalid context schema', async () => {
    await expect(
      protocol.execute({
        context: { intent: 'billing' } as any, // missing ticketId
        call: async () => { throw new Error('should not reach'); },
      }),
    ).rejects.toThrow(TetherViolationError);
  });
});
```

### `tests/validation/toolGuard.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { checkToolAllowed } from '../../src/validation/toolGuard.js';

describe('toolGuard', () => {
  it('returns null when tool is allowed', () => {
    expect(checkToolAllowed('A', 'lookup', ['lookup', 'classify'], [])).toBeNull();
  });

  it('returns violation when tool is forbidden', () => {
    const v = checkToolAllowed('A', 'delete', ['lookup'], ['delete']);
    expect(v?.type).toBe('FORBIDDEN_TOOL');
  });

  it('returns violation when tool is outside scope', () => {
    const v = checkToolAllowed('A', 'send_email', ['lookup'], []);
    expect(v?.type).toBe('FORBIDDEN_TOOL');
  });

  it('allows any tool when no scope defined', () => {
    expect(checkToolAllowed('A', 'anything', undefined, undefined)).toBeNull();
  });
});
```

### `tests/validation/patternGuard.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { checkForbiddenPatterns } from '../../src/validation/patternGuard.js';

describe('patternGuard', () => {
  it('returns null when no patterns', () => {
    expect(checkForbiddenPatterns('A', 'hello world', undefined)).toBeNull();
  });

  it('returns violation when pattern matches', () => {
    const v = checkForbiddenPatterns('A', 'my password is 123', [/password/i]);
    expect(v?.type).toBe('FORBIDDEN_PATTERN');
  });

  it('returns null when pattern does not match', () => {
    const v = checkForbiddenPatterns('A', 'billing intent', [/password/i]);
    expect(v).toBeNull();
  });
});
```

---

## Step 10 — README.md

Generate this file at the very end. It must include:

1. **Tagline** — "Zod validates your data. `tether` validates your agents."
2. **Install** — `npm install tether zod`
3. **Quick Start** — a 30-line working example with `defineAgent` + `enforce`
4. **Full API Reference** — every exported function with TypeScript signatures
5. **Adapters** — how to use with Claude, OpenAI, Gemini
6. **Testing** — how to use `contractSuite` and `mockAgent`
7. **CLI** — all three commands with examples
8. **Why tether** — the problem it solves (multi-agent failure rate)
9. **License** — MIT

---

## Step 11 — Build and Verify

Run in this exact order:

```bash
pnpm typecheck     # must pass with zero errors
pnpm test          # all tests must pass
pnpm build         # dist/ must be generated
```

Check that `dist/` contains:
- `index.js` (ESM)
- `index.cjs` (CJS)
- `index.d.ts` (types)
- `testing/index.js`, `testing/index.cjs`, `testing/index.d.ts`
- `cli/index.js`, `cli/index.cjs`, `cli/index.d.ts`

---

## Step 12 — Publish to npm

```bash
# Make sure you're logged in
npm login

# Dry run first
npm publish --dry-run --access public

# If dry run looks good
npm publish --access public
```

---

## Quality Rules — Never Violate These

1. **No `any` types** — use `unknown` and narrow explicitly
2. **No external runtime dependencies** except Zod (peer dep)
3. **Every exported function must have a JSDoc comment** with at least one example
4. **Every guard must produce a typed `ViolationEvent`** — no raw string errors
5. **Adapters must be thin** — they only translate, never add business logic
6. **Testing utilities must work offline** — zero LLM calls in any test
7. **`enforce()` must always return `EnforceResult`** — never throws unless `onViolation.strategy === 'throw'`
8. **`handoff()` must redact before passing context** — redact runs before conditions check
9. **The CLI must work as both a binary and an importable module**
10. **`toSystemPrompt()` must produce valid, strict, unambiguous instructions** — test it manually against at least one real LLM call before publishing

---

## Definition of Done

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (all tests green)
- [ ] `pnpm build` produces valid ESM + CJS + types
- [ ] `tether validate`, `audit`, `conflicts` CLI commands work
- [ ] README.md is complete with working code examples
- [ ] Published to npm at `tether`
- [ ] Manual smoke test: create a real agent with `defineAgent`, call `enforce` with Claude adapter, confirm typed output
