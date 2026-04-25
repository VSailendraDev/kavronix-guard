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
@kavronix/guard CLI (v1 — shallow validation: checks imports and basic structure)

Commands:
  validate <pattern>   Validate contract files can be imported (e.g. ./agents/**/*.ts)
  audit <logfile>      Audit a run log for violations (parses JSONL)
  conflicts <dir>      Check for conflicts between agent contracts (basic)

Note: Deep contract analysis (overlapping scopes, semantic conflicts) is planned for v2.

Examples:
  kavronix-guard validate ./agents/**/*.contract.ts
  kavronix-guard audit ./logs/run-2026-04-18.jsonl
  kavronix-guard conflicts ./agents/
      `);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
