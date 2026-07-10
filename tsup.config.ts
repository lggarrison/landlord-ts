import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/simulation-worker.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  target: 'node22',
  shims: true,
  noExternal: ['fflate'],
});
