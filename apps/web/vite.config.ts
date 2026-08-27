import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The editor bundles the render package from source rather than its build
 * output. That is the point of the whole arrangement: the slide you drag a
 * field around in is drawn by the same components that print the PDF, so
 * "it looked right in the editor" is evidence about the exported file.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cubpitch/core': new URL('../../packages/core/src/index.ts', import.meta.url).pathname,
      '@cubpitch/theme': new URL('../../packages/theme/src/index.ts', import.meta.url).pathname,
      '@cubpitch/render': new URL('../../packages/render/src/index.ts', import.meta.url).pathname,
    },
  },
  server: {
    port: 5174,
    proxy: { '/api': 'http://localhost:4100' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
