import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Base path relative so it works on GitHub Pages regardless of repo name
  const basePath = './';
  
  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      // Allow proxied preview hosts (sandboxes, tunnels) to reach the dev server.
      allowedHosts: true,
    },
    // Define global constant replacements.
    // SECURITY: never inline API keys here. Anything placed in `define` is
    // substituted into the public client bundle and is readable by any visitor.
    // Secrets belong in the serverless function under `api/`.
    define: {
      global: 'window',
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Vendor code changes less often than app code, so it caches
          // independently across deploys.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // The Three.js core and `postprocessing` import each other heavily,
            // so they share one chunk instead of creating circular chunks.
            if (
              id.includes('node_modules/three/') ||
              id.includes('postprocessing') ||
              id.includes('three-mesh-bvh')
            ) {
              return 'vendor-three';
            }
            if (
              id.includes('@react-three') ||
              id.includes('three-stdlib') ||
              id.includes('camera-controls') ||
              id.includes('troika')
            ) {
              return 'vendor-r3f';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
          },
        },
      },
    }
  }
})
