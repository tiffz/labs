/// <reference types="vitest" />
import { defineConfig } from 'vite';
import type { Connect, PreviewServer, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { dirname, relative, resolve, sep } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

const INCLUDE_BEAT_BENCHMARK =
  process.env.INCLUDE_BEAT_BENCHMARK === 'true' && process.env.FAST_TESTS !== 'true';
const IS_TEST = process.env.VITEST === 'true';
const SKIP_DEPLOY_PLUGINS = IS_TEST;

const MULTI_APP_INPUTS = {
  main: resolve(__dirname, 'src/index.html'),
  cats: resolve(__dirname, 'src/cats/index.html'),
  zines: resolve(__dirname, 'src/zines/index.html'),
  corp: resolve(__dirname, 'src/corp/index.html'),
  drums: resolve(__dirname, 'src/drums/index.html'),
  story: resolve(__dirname, 'src/story/index.html'),
  chords: resolve(__dirname, 'src/chords/index.html'),
  forms: resolve(__dirname, 'src/forms/index.html'),
  beat: resolve(__dirname, 'src/beat/index.html'),
  words: resolve(__dirname, 'src/words/index.html'),
  pitch: resolve(__dirname, 'src/pitch/index.html'),
  universal_tom: resolve(__dirname, 'src/drums/universal_tom/index.html'),
  piano: resolve(__dirname, 'src/piano/index.html'),
  ui: resolve(__dirname, 'src/ui/index.html'),
} as const;

const SRC_ROOT = resolve(__dirname, 'src');

const APP_BASE_PATHS = new Set(
  Object.values(MULTI_APP_INPUTS)
    .map((entryPath) => {
      const relativeDir = relative(SRC_ROOT, dirname(entryPath));
      const normalizedDir = relativeDir.split(sep).join('/');
      return normalizedDir === '' ? '/' : `/${normalizedDir}`;
    })
    .filter((route) => route !== '/')
);

function getCanonicalTrailingSlashRedirect(url?: string): string | null {
  if (!url) return null;
  const [pathname, queryString = ''] = url.split('?');
  if (!pathname || pathname === '/' || pathname.endsWith('/')) return null;
  if (!APP_BASE_PATHS.has(pathname)) return null;
  return `${pathname}/${queryString ? `?${queryString}` : ''}`;
}

function applyTrailingSlashRedirect(
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction
): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }
  const redirectTarget = getCanonicalTrailingSlashRedirect(req.url);
  if (!redirectTarget) {
    next();
    return;
  }
  res.statusCode = 308;
  res.setHeader('Location', redirectTarget);
  res.end();
}

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
      input: MULTI_APP_INPUTS,
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
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'wasm/[name]-[hash][extname]';
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
  optimizeDeps: {
    include: ['jszip', 'midi-json-parser', 'webmscore'],
  },
  server: {
    middlewareMode: false,
  },
  plugins: [
    {
      name: 'canonical-trailing-slash-redirect',
      configureServer(server: ViteDevServer) {
        server.middlewares.use(applyTrailingSlashRedirect);
      },
      configurePreviewServer(server: PreviewServer) {
        server.middlewares.use(applyTrailingSlashRedirect);
      },
    },
    ...(!SKIP_DEPLOY_PLUGINS
      ? [{
        // Debug logging plugin for all micro-apps
        name: 'debug-logger',
        configureServer(server: ViteDevServer) {
          server.middlewares.use('/__debug_log', (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk: Buffer) => {
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
          server.middlewares.use('/__debug_snapshot', async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
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
      }] : []),
    react(),
    ...(!SKIP_DEPLOY_PLUGINS ? [viteStaticCopy({
      targets: [
        { src: '../src/404.html', dest: '.' },
        { src: '../CNAME', dest: '.' },
        { src: '../public/robots.txt', dest: '.' },
        { src: '../public/_headers', dest: '.' },
        // Basic Pitch model for ML-based chord detection
        { src: '../node_modules/@spotify/basic-pitch/model/*', dest: 'assets' },
      ]
    })] : []),
    ...(!SKIP_DEPLOY_PLUGINS ? [compression({
      algorithms: ['gzip'],
    })] : []),
    ...(!SKIP_DEPLOY_PLUGINS ? [compression({
      algorithms: ['brotliCompress'],
    })] : []),
    // Bundle analyzer - only in analyze mode
    ...(!SKIP_DEPLOY_PLUGINS && process.env.ANALYZE ? [visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })] : []),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './shared/test/setupTests.ts',
    include: ['**/*.test.{js,ts,jsx,tsx}'],
    exclude: [
      'src/**/e2e/**',
      'e2e/**',
      'node_modules/**',
      'dist/**',
      // Expensive benchmark test - only run when beat files change (via INCLUDE_BEAT_BENCHMARK env)
      ...(!INCLUDE_BEAT_BENCHMARK ? ['**/bpmDetectionBenchmark.test.ts'] : []),
      // Fast mode: exclude slow regression tests for rapid development iteration
      ...(process.env.FAST_TESTS === 'true' ? [
        '**/*.regression.test.{ts,tsx}',
        '**/HeartSpawningService.test.ts',
      ] : []),
    ],
    testTimeout: 10000, // 10 seconds max per test (reduced from 30s)
    hookTimeout: 5000, // 5 seconds max for setup/teardown (reduced from 30s)
    pool: 'threads', // Use threads for better isolation
    poolOptions: {
      threads: {
        singleThread: false, // Allow parallel execution
        isolate: true, // Isolate each test file
        minThreads: 2, // Start with 2 threads for faster execution
        maxThreads: 6, // Increased from 4 for better parallelism (memory is stable)
      },
    },
    // Limit memory usage per worker
    isolate: true, // Isolate each test file to prevent memory leaks
    // Reduce memory footprint
    maxConcurrency: 6, // Increased from 4 for better parallelism
    // Suppress console errors from VexFlow canvas warnings
    onConsoleLog: (log, type) => {
      // Suppress VexFlow canvas errors (they're expected in JSDOM)
      if (type === 'stderr' && log.includes('HTMLCanvasElement.prototype.getContext')) {
        return false; // Don't print
      }
      if (type === 'stderr' && log.includes('No context for txtCanvas')) {
        return false; // Don't print
      }
      return true; // Print other logs
    },
  },
});
