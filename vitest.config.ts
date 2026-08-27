import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@cubpitch/core': new URL('./packages/core/src/index.ts', import.meta.url).pathname,
      '@cubpitch/theme': new URL('./packages/theme/src/index.ts', import.meta.url).pathname,
      '@cubpitch/render': new URL('./packages/render/src/index.ts', import.meta.url).pathname,
      '@cubpitch/export': new URL('./packages/export/src/index.ts', import.meta.url).pathname,
      '@cubpitch/storage': new URL('./packages/storage/src/index.ts', import.meta.url).pathname,
      '@cubpitch/ai': new URL('./packages/ai/src/index.ts', import.meta.url).pathname,
    },
  },
});
