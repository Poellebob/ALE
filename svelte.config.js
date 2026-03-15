import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Tauri serves a static bundle — SPA mode with index.html fallback
    adapter: adapter({ fallback: 'index.html' }),
  },
};

export default config;
