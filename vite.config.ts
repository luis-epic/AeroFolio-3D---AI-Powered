import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    base: mode === 'production' ? '/AeroFolio-3D---AI-Powered/' : '/'
    plugins: [react(), tailwindcss()],
    // Define global constant replacements
    define: {
      global: 'window',
      'process.env.GEMINI_API_KEY': JSON.stringify(
        env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        env.VITE_GEMINI_API_KEY ||
        process.env.VITE_GEMINI_API_KEY ||
        ""
      ),
      'process.env.API_KEY': JSON.stringify(
        env.API_KEY ||
        process.env.API_KEY ||
        env.VITE_API_KEY || 
        process.env.VITE_API_KEY || 
        process.env.GOOGLE_API_KEY ||
        "" 
      )
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 2500
    }
  }
})
