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
