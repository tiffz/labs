/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  root: 'src',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'terser',
    cssMinify: true,
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        cats: resolve(__dirname, 'src/cats/index.html'),
          zines: resolve(__dirname, 'src/zines/index.html'),
          corp: resolve(__dirname, 'src/corp/index.html'),
          drums: resolve(__dirname, 'src/drums/index.html'),
          story: resolve(__dirname, 'src/story/index.html'),
      },
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom'],
        },
        // Better chunk naming
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash][extname]';
          }
          if (assetInfo.name?.match(/\.(png|jpe?g|svg|gif|webp|avif)$/)) {
            return 'images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
  },
  server: {
    middlewareMode: false,
  },
  plugins: [
    // Debug logging plugin for all micro-apps
    {
      name: 'debug-logger',
      configureServer(server) {
        server.middlewares.use('/__debug_log', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const logData = JSON.parse(body);
                const timestamp = new Date(logData.timestamp).toLocaleTimeString();
                const level = (logData.level || 'info').toUpperCase();
                const app = logData.app || 'APP';
                const line = `\n[${app}-DEBUG ${timestamp}] [${level}] ${logData.message}`;
                 const method = String(level || 'info').toLowerCase();
                 const out: (...args: unknown[]) => void =
                   method === 'error' ? console.error :
                   method === 'warn' ? console.warn :
                   method === 'debug' ? console.debug :
                   method === 'info' ? console.info : console.log;
                out(line);
                if (logData.data) out(logData.data);
              } catch (error) {
                console.log('\n[LABS-DEBUG] Failed to parse log data', error);
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end('{"status":"ok"}');
            });
          } else {
            next();
          }
        });
        // Snapshot receiver (dev only): stores meta JSON and screenshot into a temp folder
        server.middlewares.use('/__debug_snapshot', async (req, res, next) => {
          if (req.method !== 'POST') return next();
          try {
            // Naive multipart parser for small dev payloads
            const chunks: Uint8Array[] = [];
            req.on('data', (c: Uint8Array) => chunks.push(c));
            req.on('end', async () => {
              const boundaryMatch = (req.headers['content-type'] || '').match(/boundary=(.*)$/);
              const boundary = boundaryMatch ? `--${boundaryMatch[1]}` : '';
              const raw = Buffer.concat(chunks);
              const parts = boundary ? raw.toString('binary').split(boundary) : [];

              // Prepare temp folder
              const fs = await import('node:fs');
              const path = await import('node:path');
              // Save under project workspace in a gitignored directory
              const baseDir = path.join(process.cwd(), '.debug-snapshots');
              if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
              const stamp = new Date().toISOString().replace(/[:.]/g, '-');
              const snapshotDir = path.join(baseDir, `snapshot-${stamp}`);
              fs.mkdirSync(snapshotDir);

              let metaSaved = false;
              let screenshotSaved = false;

              for (const part of parts) {
                // Skip preamble/epilogue
                if (!part.includes('Content-Disposition')) continue;
                const [headers, bodySep] = part.split('\r\n\r\n');
                if (!headers || !bodySep) continue;
                // Remove trailing CRLF and boundary markers
                const body = bodySep.replace(/\r\n--\r\n?$/, '');
                const nameMatch = headers.match(/name="([^"]+)"/);
                const filenameMatch = headers.match(/filename="([^"]+)"/);
                const name = nameMatch ? nameMatch[1] : '';

                if (name === 'meta') {
                  const metaPath = path.join(snapshotDir, 'meta.json');
                  fs.writeFileSync(metaPath, Buffer.from(body, 'binary'));
                  metaSaved = true;
                } else if (name === 'screenshot' && filenameMatch) {
                  const filePath = path.join(snapshotDir, filenameMatch[1] || 'screenshot.png');
                  fs.writeFileSync(filePath, Buffer.from(body, 'binary'));
                  screenshotSaved = true;
                }
              }

              const msg = `[LABS-DEBUG] Snapshot saved at ${snapshotDir} (meta: ${metaSaved}, screenshot: ${screenshotSaved})`;
              console.log(`\n${msg}`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, dir: snapshotDir, metaSaved, screenshotSaved }));
            });
          } catch (error) {
            console.log('\n[LABS-DEBUG] Failed to save snapshot', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end('{"ok":false}');
          }
        });
      }
    },
    react(),
    viteStaticCopy({
      targets: [
        { src: '../src/404.html', dest: '.' },
        { src: '../CNAME', dest: '.' },
        { src: '../public/robots.txt', dest: '.' }
      ]
    }),
    compression({
      algorithms: ['gzip'],
    }),
    compression({
      algorithms: ['brotliCompress'],
    }),
    // Bundle analyzer - only in analyze mode
    ...(process.env.ANALYZE ? [visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-cats.svg', 'favicon-zines.svg', 'favicon-corp.svg', 'cat-android.png', 'lightbulb-noto.png'],
      manifest: {
        name: 'Tiff Zhang Labs',
        short_name: 'Labs',
        description: 'A collection of experimental apps and tools by Tiff Zhang',
        theme_color: '#8b5cf6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '32x32',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/404\.html/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './shared/test/setupTests.ts',
    include: ['**/*.test.{js,ts,jsx,tsx}'],
    exclude: ['src/**/e2e/**', 'e2e/**', 'node_modules/**', 'dist/**'],
    testTimeout: 30000, // 30 seconds max per test
    hookTimeout: 30000, // 30 seconds max for setup/teardown
  },
});
