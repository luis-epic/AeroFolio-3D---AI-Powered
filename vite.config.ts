import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Base path: use repo sub-path only for GitHub Pages, root for Vercel and other hosts
  const basePath = env.GITHUB_PAGES === 'true' ? '/AeroFolio-3D---AI-Powered/' : '/';
  
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
          /**
           * Split heavy 3D vendor code out of the entry chunk.
           *
           * Previously everything shipped as one ~1.6MB file, so the browser had
           * to download and parse the entire Three.js stack before painting any
           * UI. Separate chunks let the shell render while the 3D layer streams
           * in, and they cache independently across deploys.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // The Three.js core and `postprocessing` import each other heavily,
            // so the bundler merges them back together to avoid circular chunk
            // dependencies. Naming them separately would be misleading, so the
            // renderer and its effect pipeline share one honest bucket.
            if (
              id.includes('node_modules/three/') ||
              id.includes('postprocessing') ||
              id.includes('three-mesh-bvh')
            ) {
              return 'vendor-three';
            }
            // React Three Fiber, drei, and the loaders/controls layered on top.
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
