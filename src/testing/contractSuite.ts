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
          alwaysOutput: contract.config.onViolation?.fallbackOutput ?? ({} as z.infer<TSchema>),
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
          alwaysOutput: contract.config.onViolation?.fallbackOutput ?? ({} as z.infer<TSchema>),
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
            protocol.config.to.config.onViolation?.fallbackOutput ?? ({} as z.infer<TToSchema>),
        });

      const result = await protocol.execute({
        context: options.context,
        call: async (_ctx, _sp) => {
          return enforce(protocol.config.to, {
            input: _ctx as Record<string, unknown>,
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
