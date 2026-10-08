import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Keep HMR for source-code changes, but never reload the browser because
      // the JSON database or uploaded proof/profile files changed.
      hmr: false,
      watch: {
        ignored: ['**/data/**', '**/uploads/**'],
      },
    },
  };
});
