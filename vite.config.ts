import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    proxy: {
      // /api/auth/* → auth-service:8081/auth/*
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, '/auth'),
      },
      // /api/profile → auth-service:8081/profile
      '/api/profile': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/profile/, '/profile'),
      },
      // /api/* → tree-service:8080/*
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Data fetching & state
          'data-vendor': ['@tanstack/react-query', 'zustand', 'axios'],
          // UI libraries
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          // Graph visualization
          'flow-vendor': ['@xyflow/react'],
          // Forms & validation
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
