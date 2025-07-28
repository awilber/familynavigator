import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@familynavigator/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 3011,
    proxy: {
      '/api': {
        target: 'http://localhost:6000',
        changeOrigin: true
      }
    }
  }
})