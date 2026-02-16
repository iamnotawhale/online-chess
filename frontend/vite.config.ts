import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  publicDir: '../public',
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true
      }
    }
  },
  build: {
    copyPublicDir: true,
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: './index.html',
        'service-worker': './src/service-worker.ts',
      },
      output: {
        manualChunks: undefined,
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      }
    }
  }
})
