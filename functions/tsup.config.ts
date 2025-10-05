import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  minify: true,
  target: 'node20',
  platform: 'node',
  shims: false,
  treeshake: true,
  dts: false
});
