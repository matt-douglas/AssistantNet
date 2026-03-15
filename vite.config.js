import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy Ollama API requests to avoid CORS during dev
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
