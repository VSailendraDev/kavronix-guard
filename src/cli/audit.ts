import { readFileSync, existsSync } from 'fs';

export function auditLog(logFile: string): void {
  if (!existsSync(logFile)) {
    console.error(`Log file not found: ${logFile}`);
    process.exit(1);
  }

  const lines = readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
  const violations: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const parsedViolations = parsed['violations'] as Array<Record<string, unknown>> | undefined;
      if (parsedViolations && parsedViolations.length > 0) {
        violations.push(...parsedViolations);
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
    console.log(`  [${v['type']}] ${v['agentName']}: ${v['message']}`);
  }
  console.log('');
}
