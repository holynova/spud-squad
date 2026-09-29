import { defineConfig } from 'vite';

export default defineConfig({
  base: '/spud-squad/',
  server: { port: 3000, host: true },
  build: { target: 'es2022' },
});
