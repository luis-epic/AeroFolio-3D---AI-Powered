import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Centralized API key resolution (supports multiple variable names)
  const apiKey = env.VITE_API_KEY || 
                 env.VITE_GEMINI_API_KEY || 
                 env.VITE_GOOGLE_API_KEY ||
                 process.env.VITE_API_KEY || 
                 process.env.API_KEY || 
                 process.env.GOOGLE_API_KEY ||
                 process.env.GEMINI_API_KEY ||
                 "";
  
  return {
    plugins: [react()],
    // Define global constant replacements for backward compatibility
    // Note: New code should use import.meta.env.VITE_API_KEY or the config/env.ts helper
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Also expose as VITE_ prefixed for consistency
      'import.meta.env.VITE_API_KEY': JSON.stringify(apiKey),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 1600
    }
  }
})