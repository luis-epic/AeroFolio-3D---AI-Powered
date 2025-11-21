import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    // Define global constant replacements
    define: {
      // This allows the code to access process.env.API_KEY as if it were Node.js.
      // We add || "" to ensure JSON.stringify never receives undefined, which would skip replacement
      // and cause a crash in the browser (ReferenceError: process is not defined).
      'process.env.API_KEY': JSON.stringify(
        env.VITE_API_KEY || 
        process.env.VITE_API_KEY || 
        process.env.API_KEY || 
        process.env.GOOGLE_API_KEY ||
        "" 
      )
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 1600
    }
  }
})