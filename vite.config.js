import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

// Tauri injects this env var in `tauri dev` when using a remote host
// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [sveltekit()],

  // Do not obscure Rust error messages with Vite's own overlay
  clearScreen: false,

  server: {
    // Tauri expects a fixed port — fail loudly if it is taken
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: {
      // Rust rebuilds are handled by Tauri's own watcher
      ignored: ['**/src-tauri/**'],
    },
  },
}));
