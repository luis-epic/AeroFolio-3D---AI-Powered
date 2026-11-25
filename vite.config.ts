import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const MAX_GLB_BYTES = 60 * 1024 * 1024;
const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/;

function devGlbImportPlugin(): Plugin {
  const cacheModelsDir = path.resolve('/tmp', 'studio-glb-models');
  const legacyPublicModelsDir = path.resolve(process.cwd(), 'public', 'models');

  return {
    name: 'dev-glb-import',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/models', async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const urlPath = (req.url || '').split('?')[0].replace(/^\/+/, '');
        const safeName = path.basename(urlPath).replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!safeName || safeName !== urlPath || !/\.(glb|gltf)$/i.test(safeName)) {
          return next();
        }
        const cachedPath = path.resolve(cacheModelsDir, safeName);
        if (!cachedPath.startsWith(cacheModelsDir + path.sep)) return next();

        try {
          const stat = await fs.stat(cachedPath);
          if (!stat.isFile()) return next();
          res.statusCode = 200;
          res.setHeader(
            'Content-Type',
            safeName.toLowerCase().endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json'
          );
          res.setHeader('Content-Length', String(stat.size));
          res.setHeader('Cache-Control', 'no-store');
          if (req.method === 'HEAD') {
            return res.end();
          }
          const data = await fs.readFile(cachedPath);
          return res.end(data);
        } catch {
          return next();
        }
      });

      server.middlewares.use('/__dev/local-models', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        try {
          await fs.mkdir(cacheModelsDir, { recursive: true });
          const cacheEntries = await fs.readdir(cacheModelsDir).catch(() => [] as string[]);
          const legacyEntries = await fs.readdir(legacyPublicModelsDir).catch(() => [] as string[]);
          const models = Array.from(
            new Set([...cacheEntries, ...legacyEntries].filter((f) => /\.(glb|gltf)$/i.test(f)))
          );
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ models }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to list models' }));
        }
      });

      server.middlewares.use('/__dev/import-glb', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        const sendJson = (status: number, payload: Record<string, unknown>) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        try {
          const authHeader = req.headers.authorization || '';
          const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
          if (!token) {
            return sendJson(401, { error: 'Missing Google Drive authorization token' });
          }

          const chunks: Buffer[] = [];
          let bodyLen = 0;
          for await (const chunk of req) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            bodyLen += buf.length;
            if (bodyLen > 8192) {
              return sendJson(413, { error: 'Request payload too large' });
            }
            chunks.push(buf);
          }

          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
            fileId?: unknown;
            fileName?: unknown;
          };
          const fileId = typeof parsed.fileId === 'string' ? parsed.fileId.trim() : '';
          const rawName = typeof parsed.fileName === 'string' ? parsed.fileName.trim() : '';

          if (!DRIVE_ID_RE.test(fileId)) {
            return sendJson(400, { error: 'Invalid Google Drive file ID' });
          }

          const baseName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');
          if (!/\.(glb|gltf)$/i.test(baseName)) {
            return sendJson(400, { error: 'Only .glb or .gltf files are allowed' });
          }

          // Verify token validity against Google OAuth endpoint
          const tokenInfoRes = await fetch(
            `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`
          );
          if (!tokenInfoRes.ok) {
            return sendJson(401, { error: 'Invalid or expired Google OAuth token' });
          }

          // Download binary directly from Google Drive using validated fileId
          const driveRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!driveRes.ok) {
            return sendJson(driveRes.status, { error: `Drive download failed (${driveRes.status})` });
          }

          const arrayBuf = await driveRes.arrayBuffer();
          if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > MAX_GLB_BYTES) {
            return sendJson(413, { error: 'Model exceeds maximum supported size (60 MB)' });
          }

          const fileBuf = Buffer.from(arrayBuf);
          if (baseName.toLowerCase().endsWith('.glb')) {
            if (fileBuf.length < 12 || fileBuf.readUInt32LE(0) !== 0x46546c67) {
              return sendJson(400, { error: 'Downloaded file is not a valid binary .glb asset' });
            }
          } else {
            const gltfJson = JSON.parse(fileBuf.toString('utf8')) as { asset?: unknown };
            if (!gltfJson || typeof gltfJson !== 'object' || !gltfJson.asset) {
              return sendJson(400, { error: 'Downloaded file is not a valid .gltf JSON asset' });
            }
          }

          await fs.mkdir(cacheModelsDir, { recursive: true });
          const targetPath = path.resolve(cacheModelsDir, baseName);
          if (!targetPath.startsWith(cacheModelsDir + path.sep)) {
            return sendJson(400, { error: 'Invalid target file path' });
          }

          await fs.writeFile(targetPath, fileBuf);
          return sendJson(200, {
            ok: true,
            fileName: baseName,
            publicPath: `/models/${baseName}`,
            byteSize: fileBuf.byteLength,
          });
        } catch (err) {
          return sendJson(500, {
            error: err instanceof Error ? err.message : 'Failed to import model',
          });
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  // Base path relative so it works on GitHub Pages regardless of repo name
  const basePath = './';

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), devGlbImportPlugin()],
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
            if (id.includes('motion') || id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
          },
        },
      },
    },
  };
});
