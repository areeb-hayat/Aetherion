import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// @ts-expect-error process is provided by Node at config-load time
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Web Workers are authored as ES modules (import/export inside workers).
  worker: {
    format: 'es',
  },

  // -- Tauri-aware dev server --------------------------------------------
  // Fixed port; fail rather than silently pick another (Tauri expects 1420).
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: {
      // Don't watch the Rust shell — it has its own build watcher.
      ignored: ['**/src-tauri/**'],
    },
    // CRITICAL: SharedArrayBuffer (the simulation world-state buffer) requires
    // the page to be cross-origin isolated. Tauri's webview is isolated by
    // default; the browser dev server needs these headers set explicitly.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Produce modern output (top-level await, ES workers, BigInt, etc.)
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
  },
});
