import { existsSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 4173
  },
  plugins: [
    react(),
    {
      name: 'emit-app-template-as-index',
      writeBundle() {
        const appHtml = resolve(__dirname, 'dist/app.html');
        const indexHtml = resolve(__dirname, 'dist/index.html');
        if (existsSync(appHtml)) {
          if (existsSync(indexHtml)) rmSync(indexHtml);
          renameSync(appHtml, indexHtml);
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'app.html'),
      output: {
        entryFileNames: 'assets/fhir-test-console.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((name) => name.endsWith('.css'))) {
            return 'assets/fhir-test-console.css';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**']
  }
});
