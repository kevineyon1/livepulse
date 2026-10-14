import { defineConfig } from 'vite';

// base './' → bisa di-hosting di sub-path GitHub Pages (username.github.io/livepulse/)
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  server: { port: 5173 },
});
