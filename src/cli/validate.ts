import { existsSync, readdirSync } from 'fs';
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
