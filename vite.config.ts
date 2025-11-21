import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Removed base: './' as Vercel serves from root by default
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})