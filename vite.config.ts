/// <reference types="vitest" />
import { build as esbuildBuild } from 'esbuild';
import { defineConfig, loadEnv } from 'vite';
import type { Connect, Plugin, PreviewServer, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import { randomBytes } from 'node:crypto';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';
import {
  buildAppBasePathsFromEntryPaths,
  getCanonicalTrailingSlashRedirect,
} from './src/shared/utils/trailingSlashRouting';
import {
  parseDebugLogPostBody,
  printDebugLogEntriesToConsole,
} from './src/shared/debug/debugLogPostBody';

const BUILD_VERSION = `${Date.now()}-${randomBytes(4).toString('hex')}`;

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
  scales: resolve(__dirname, 'src/scales/index.html'),
  melodia: resolve(__dirname, 'src/melodia/index.html'),
  count: resolve(__dirname, 'src/count/index.html'),
  ui: resolve(__dirname, 'src/ui/index.html'),
  agility: resolve(__dirname, 'src/agility/index.html'),
  encore: resolve(__dirname, 'src/encore/index.html'),
} as const;

const SRC_ROOT = resolve(__dirname, 'src');
/** Repo root (directory containing this config). Prefer over process.cwd() for baselines so dev server matches Playwright output even when cwd differs. */
const PROJECT_ROOT = resolve(__dirname);
const E2E_VISUAL_SNAPSHOTS_DIR = resolve(__dirname, 'e2e/visual/apps.visual.spec.ts-snapshots');

const APP_BASE_PATHS = buildAppBasePathsFromEntryPaths(Object.values(MULTI_APP_INPUTS), SRC_ROOT);

const LABS_COOKIE_CONSENT_ENTRY = resolve(
  PROJECT_ROOT,
  'src/shared/legal/labsCookieConsentBrowser.ts',
);
const LABS_COOKIE_CONSENT_OUTFILE = resolve(PROJECT_ROOT, 'public/scripts/labs-cookie-consent.js');

async function rebuildLabsCookieConsentBundle(): Promise<void> {
  await esbuildBuild({
    absWorkingDir: PROJECT_ROOT,
    entryPoints: [LABS_COOKIE_CONSENT_ENTRY],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2018',
    outfile: LABS_COOKIE_CONSENT_OUTFILE,
    legalComments: 'inline',
  });
}

/**
 * Local dev only: same-origin proxy for Drive `files.get` alt=media reads used by guest snapshots.
 * Browser calls to googleapis with HTTP-referrer–restricted keys often fail CORS; the dev server
 * forwards the request and sets Referer from the incoming Host (or `VITE_GOOGLE_DRIVE_DEV_PROXY_REFERER`).
 */
function encoreDrivePublicDevProxyPlugin(): Plugin {
  return {
    name: 'encore-drive-public-dev-proxy',
    configureServer(server: ViteDevServer) {
      if (IS_TEST) return;
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' || !req.url?.startsWith('/__encore/drive-public/')) {
          next();
          return;
        }
        const prefix = '/__encore/drive-public/';
        const q = req.url.indexOf('?');
        const pathPart = q === -1 ? req.url.slice(prefix.length) : req.url.slice(prefix.length, q);
        let fileId: string;
        try {
          fileId = decodeURIComponent(pathPart);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Bad file id');
          return;
        }
        if (!/^[A-Za-z0-9_-]+$/.test(fileId)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Bad file id');
          return;
        }
        // `root` is `src/` — Vite loads `.env*` from `envDir` (defaults to `root`), not the repo root.
        const env = loadEnv(server.config.mode, server.config.envDir, '');
        const apiKey = (env.VITE_GOOGLE_API_KEY as string | undefined)?.trim();
        if (!apiKey) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('VITE_GOOGLE_API_KEY is not set');
          return;
        }
        const port = server.config.server.port ?? 5173;
        const host =
          (typeof req.headers['x-forwarded-host'] === 'string'
            ? req.headers['x-forwarded-host'].split(',')[0]?.trim()
            : undefined) ||
          req.headers.host ||
          `127.0.0.1:${port}`;
        const referer =
          (env.VITE_GOOGLE_DRIVE_DEV_PROXY_REFERER as string | undefined)?.trim() ||
          `http://${host}/encore/`;
        const googleUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(apiKey)}`;
        try {
          const r = await fetch(googleUrl, {
            cache: 'no-store',
            headers: { Referer: referer },
          });
          const buf = Buffer.from(await r.arrayBuffer());
          res.statusCode = r.status;
          const ct = r.headers.get('content-type');
          if (ct) res.setHeader('Content-Type', ct);
          res.setHeader('Cache-Control', 'no-store');
          res.end(buf);
        } catch {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Drive proxy fetch failed');
        }
      });
    },
  };
}

/** Keeps `public/scripts/labs-cookie-consent.js` in sync with TS sources (edit copy in `labsCookieConsentPolicy.ts` only). */
function labsCookieConsentVitePlugin(): Plugin {
  const watchSuffixes = [
    'src/shared/legal/labsCookieConsentPolicy.ts',
    'src/shared/legal/labsCookieConsentBrowser.ts',
  ];

  return {
    name: 'labs-cookie-consent-bundle',
    enforce: 'pre',
    async buildStart() {
      if (IS_TEST) return;
      await rebuildLabsCookieConsentBundle();
    },
    configureServer(server) {
      if (IS_TEST) return;
      server.watcher.on('change', async (file) => {
        const norm = file.replaceAll('\\', '/');
        if (!watchSuffixes.some((suffix) => norm.endsWith(suffix))) return;
        await rebuildLabsCookieConsentBundle();
        server.config.logger.info(
          '\n[labs-cookie-consent] Bundle updated — reload the page to refresh the banner.\n',
        );
      });
    },
  };
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
  const redirectTarget = getCanonicalTrailingSlashRedirect(req.url, APP_BASE_PATHS);
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
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            // React + MUI + Emotion all go in a single vendor chunk. Splitting
            // them caused circular chunk imports (`vendor` -> `mui` -> `vendor`)
            // that manifested in production as `TypeError: e is not a function`
            // during module init, because one side tried to call a binding from
            // the other before it was finalized. MUI + Emotion internally reach
            // back into React APIs, so they must share the same chunk as React.
            if (
              id.includes('react-dom') ||
              id.includes('react/') ||
              id.endsWith('/react') ||
              id.includes('@mui/') ||
              id.includes('@emotion/')
            ) {
              return 'vendor';
            }
            if (id.includes('vexflow')) {
              return 'vexflow';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three';
            }
            // Keep pdf-lib + file-saver out of the zines main chunk so that
            // the initial load does not ship ~200 KB gzip of PDF code. These
            // are only pulled in when the user exports a zine.
            if (id.includes('/pdf-lib/') || id.includes('/file-saver/')) {
              return 'pdf-lib';
            }
          }
          return undefined;
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
    /** Spotify OAuth redirect URIs cannot use `localhost`; default dev URL is loopback. */
    host: '127.0.0.1',
    middlewareMode: false,
  },
  plugins: [
    encoreDrivePublicDevProxyPlugin(),
    labsCookieConsentVitePlugin(),
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
          const regressionRunnerState: {
            active: boolean;
            target: 'visual' | 'visual-update' | 'visual-update-fresh' | 'audio' | 'all' | null;
            startedAt: string | null;
            finishedAt: string | null;
            exitCode: number | null;
            command: string | null;
            log: string[];
          } = {
            active: false,
            target: null,
            startedAt: null,
            finishedAt: null,
            exitCode: null,
            command: null,
            log: [],
          };

          const appendRunnerLog = (line: string) => {
            regressionRunnerState.log.push(line);
            if (regressionRunnerState.log.length > 250) {
              regressionRunnerState.log = regressionRunnerState.log.slice(-250);
            }
          };

          type VisualFailure = {
            id: string;
            testDir: string;
            snapshotName: string;
            appId: string;
            formFactor: string;
            platform: string;
            baselineUrl: string;
            actualUrl: string;
            diffUrl: string;
            baselineAttachmentUrl: string | null;
            baselinePath: string;
            actualPath: string;
            diffPath: string;
            actualGeneratedAt: string | null;
            diffGeneratedAt: string | null;
          };

          const getRegressionPaths = async () => {
            const path = await import('node:path');
            return {
              cwd: PROJECT_ROOT,
              path,
              baselineDir: E2E_VISUAL_SNAPSHOTS_DIR,
              testResultsDir: path.join(PROJECT_ROOT, 'test-results'),
              visualLastRunPath: path.join(PROJECT_ROOT, 'test-results/visual-last-run.json'),
              audioReportPath: path.join(
                PROJECT_ROOT,
                'src/beat/regression/reports/synthetic-audio.latest.json'
              ),
              reportIndexPath: path.join(PROJECT_ROOT, 'playwright-report/index.html'),
              rejectReportDir: path.join(PROJECT_ROOT, '.regression-reports'),
            };
          };

          const parseSnapshotMeta = (snapshotName: string) => {
            const match = snapshotName.match(/^(.*?)-(desktop|mobile)(?:-([a-z0-9_-]+))?\.png$/i);
            return {
              appId: match?.[1] || 'unknown',
              formFactor: match?.[2] || 'unknown',
              platform: match?.[3] || 'default',
            };
          };

          const collectVisualFailures = async (): Promise<VisualFailure[]> => {
            const fs = await import('node:fs');
            const { path, testResultsDir, baselineDir } = await getRegressionPaths();
            if (!fs.existsSync(testResultsDir)) return [];
            const dirs = fs.readdirSync(testResultsDir).filter((name) =>
              name.startsWith('e2e-visual-')
            );

            const failures: VisualFailure[] = [];
            for (const testDir of dirs) {
              const dirPath = path.join(testResultsDir, testDir);
              if (!fs.statSync(dirPath).isDirectory()) continue;
              const files = fs.readdirSync(dirPath);
              const diffFiles = files.filter((name) => name.endsWith('-diff.png'));
              if (diffFiles.length === 0) continue;
              const attachmentDir = path.join(dirPath, 'attachments');
              const attachmentFiles = fs.existsSync(attachmentDir)
                ? fs.readdirSync(attachmentDir)
                : [];

              for (const diffFile of diffFiles) {
                const baseName = diffFile.replace(/-diff\.png$/, '');
                const actualFile = `${baseName}-actual.png`;
                const snapshotName = `${baseName}.png`;
                const baselineAttachment = attachmentFiles.find((file) =>
                  file.startsWith(`baseline-${baseName}-png-`)
                );
                const { appId, formFactor, platform } = parseSnapshotMeta(snapshotName);
                const baselineFsPath = path.join(baselineDir, snapshotName);
                const baselineV = fs.existsSync(baselineFsPath)
                  ? fs.statSync(baselineFsPath).mtimeMs
                  : Date.now();
                const actualFsPath = path.join(dirPath, actualFile);
                const diffFsPath = path.join(dirPath, diffFile);
                const actualGeneratedAt = fs.existsSync(actualFsPath)
                  ? new Date(fs.statSync(actualFsPath).mtimeMs).toISOString()
                  : null;
                const diffGeneratedAt = fs.existsSync(diffFsPath)
                  ? new Date(fs.statSync(diffFsPath).mtimeMs).toISOString()
                  : null;
                failures.push({
                  id: `${testDir}::${snapshotName}`,
                  testDir,
                  snapshotName,
                  appId,
                  formFactor,
                  platform,
                  baselineUrl: `/__regression/baseline?file=${encodeURIComponent(snapshotName)}&v=${baselineV}`,
                  actualUrl: `/__regression/failure-asset?dir=${encodeURIComponent(testDir)}&file=${encodeURIComponent(actualFile)}`,
                  diffUrl: `/__regression/failure-asset?dir=${encodeURIComponent(testDir)}&file=${encodeURIComponent(diffFile)}`,
                  baselineAttachmentUrl: baselineAttachment
                    ? `/__regression/failure-asset?dir=${encodeURIComponent(testDir)}&file=${encodeURIComponent(`attachments/${baselineAttachment}`)}`
                    : null,
                  baselinePath: path.join(baselineDir, snapshotName),
                  actualPath: actualFsPath,
                  diffPath: diffFsPath,
                  actualGeneratedAt,
                  diffGeneratedAt,
                });
              }
            }

            return failures.sort((a, b) => a.snapshotName.localeCompare(b.snapshotName));
          };

          server.middlewares.use('/__debug_log', (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk: Buffer) => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const parsed = JSON.parse(body) as unknown;
                  const entries = parseDebugLogPostBody(parsed);
                  if (entries.length > 0) {
                    printDebugLogEntriesToConsole(entries);
                  }
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

          // Regression inspector endpoints (local dev): expose baseline images and latest run metadata.
          server.middlewares.use('/__regression/summary', async (_req: IncomingMessage, res: ServerResponse) => {
            try {
              const fs = await import('node:fs');
              const { path, baselineDir, visualLastRunPath, audioReportPath, reportIndexPath } =
                await getRegressionPaths();

              const snapshots = fs.existsSync(baselineDir)
                ? fs
                  .readdirSync(baselineDir)
                  .filter((name) => name.endsWith('.png'))
                  .sort((a, b) => a.localeCompare(b))
                  .map((name) => {
                    const fullPath = path.join(baselineDir, name);
                    const stat = fs.statSync(fullPath);
                    const v = stat.mtimeMs;
                    const match = name.match(/^(.*?)-(desktop|mobile)(?:-([a-z0-9_-]+))?\.png$/i);
                    const appId = match?.[1] || 'unknown';
                    const formFactor = match?.[2] || 'unknown';
                    const platform = match?.[3] || 'default';
                    return {
                      name,
                      sizeBytes: stat.size,
                      updatedAt: stat.mtime.toISOString(),
                      url: `/__regression/baseline?file=${encodeURIComponent(name)}&v=${v}`,
                      appId,
                      formFactor,
                      platform,
                    };
                  })
                : [];

              const lastRun = fs.existsSync(visualLastRunPath)
                ? JSON.parse(fs.readFileSync(visualLastRunPath, 'utf-8'))
                : null;

              const audioReport = fs.existsSync(audioReportPath)
                ? JSON.parse(fs.readFileSync(audioReportPath, 'utf-8'))
                : null;

              const payload = {
                generatedAt: new Date().toISOString(),
                visual: {
                  snapshotDir: 'e2e/visual/apps.visual.spec.ts-snapshots',
                  snapshotDirAbsolute: E2E_VISUAL_SNAPSHOTS_DIR,
                  count: snapshots.length,
                  snapshots,
                  lastRun,
                },
                audio: {
                  reportPath: 'src/beat/regression/reports/synthetic-audio.latest.json',
                  available: Boolean(audioReport),
                  mode: audioReport?.mode ?? null,
                  driftCount: Array.isArray(audioReport?.drifts) ? audioReport.drifts.length : 0,
                  driftIds: Array.isArray(audioReport?.drifts) ? audioReport.drifts : [],
                },
                report: {
                  available: fs.existsSync(reportIndexPath),
                  url: '/__regression/report/',
                },
                failures: await collectVisualFailures(),
                runner: regressionRunnerState,
              };

              res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store, must-revalidate',
              });
              res.end(JSON.stringify(payload));
            } catch {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end('{"error":"Failed to load regression summary"}');
            }
          });

          server.middlewares.use('/__regression/run', async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Method not allowed');
              return;
            }

            if (regressionRunnerState.active) {
              res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('A regression refresh is already running');
              return;
            }

            let body = '';
            req.on('data', (chunk: Buffer) => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}') as {
                  target?: 'visual' | 'visual-update' | 'visual-update-fresh' | 'audio' | 'all';
                };
                const target = parsed.target;
                if (
                  !target ||
                  !['visual', 'visual-update', 'visual-update-fresh', 'audio', 'all'].includes(target)
                ) {
                  res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Invalid target');
                  return;
                }

                const npmScriptByTarget: Record<
                  'visual' | 'visual-update' | 'visual-update-fresh' | 'audio' | 'all',
                  string
                > = {
                  visual: 'test:e2e:visual',
                  'visual-update': 'test:e2e:visual:update',
                  'visual-update-fresh': 'test:e2e:visual:update:fresh',
                  audio: 'test:audio:regression',
                  all: 'test:regression',
                };
                const npmScript = npmScriptByTarget[target];
                const command = `npm run ${npmScript}`;
                regressionRunnerState.active = true;
                regressionRunnerState.target = target;
                regressionRunnerState.startedAt = new Date().toISOString();
                regressionRunnerState.finishedAt = null;
                regressionRunnerState.exitCode = null;
                regressionRunnerState.command = command;
                regressionRunnerState.log = [];
                appendRunnerLog(`[start] ${command} (cwd=${PROJECT_ROOT})`);

                const { spawn } = await import('node:child_process');
                const runnerEnv = { ...process.env };
                // Playwright: reuse the dev server on 5173 instead of spawning a second Vite (strictPort).
                delete runnerEnv.CI;

                const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
                const child = spawn(npmExecutable, ['run', npmScript], {
                  cwd: PROJECT_ROOT,
                  env: runnerEnv,
                  // Windows needs shell for npm.cmd; Unix resolves npm from PATH without a shell.
                  shell: process.platform === 'win32',
                  stdio: ['ignore', 'pipe', 'pipe'],
                });

                const finishRun = (code: number | null, label: string) => {
                  if (!regressionRunnerState.active) return;
                  regressionRunnerState.active = false;
                  regressionRunnerState.finishedAt = new Date().toISOString();
                  regressionRunnerState.exitCode = code ?? -1;
                  appendRunnerLog(`[end] ${label} exit=${code ?? -1}`);
                };

                child.stdout.on('data', (chunk: Buffer) => {
                  for (const line of chunk.toString().split('\n')) {
                    if (line.trim()) appendRunnerLog(line);
                  }
                });
                child.stderr.on('data', (chunk: Buffer) => {
                  for (const line of chunk.toString().split('\n')) {
                    if (line.trim()) appendRunnerLog(`[stderr] ${line}`);
                  }
                });
                child.on('error', (err: Error) => {
                  appendRunnerLog(`[spawn error] ${err.message}`);
                  finishRun(-1, 'spawn');
                });
                child.on('close', (code: number | null) => {
                  finishRun(code, 'close');
                });

                res.writeHead(202, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, target, command }));
              } catch {
                regressionRunnerState.active = false;
                regressionRunnerState.finishedAt = new Date().toISOString();
                regressionRunnerState.exitCode = -1;
                appendRunnerLog('[error] Failed to start regression refresh');
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Failed to start regression refresh');
              }
            });
          });

          server.middlewares.use('/__regression/failure-asset', async (req: IncomingMessage, res: ServerResponse) => {
            try {
              const fs = await import('node:fs');
              const { path, testResultsDir } = await getRegressionPaths();
              const requestUrl = new URL(req.url || '/', 'http://localhost');
              const dir = requestUrl.searchParams.get('dir') || '';
              const file = requestUrl.searchParams.get('file') || '';
              if (!/^[A-Za-z0-9._-]+$/.test(dir)) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Invalid dir');
                return;
              }
              if (!/^[A-Za-z0-9._/-]+$/.test(file)) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Invalid file');
                return;
              }
              const safeFile = path.normalize(file).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
              const fullPath = path.join(testResultsDir, dir, safeFile);
              if (!fullPath.startsWith(path.join(testResultsDir, dir)) || !fs.existsSync(fullPath)) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Not found');
                return;
              }
              const ext = path.extname(fullPath).toLowerCase();
              const contentType = ext === '.png' ? 'image/png' : 'application/octet-stream';
              res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0',
              });
              res.end(fs.readFileSync(fullPath));
            } catch {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Failed to load failure asset');
            }
          });

          server.middlewares.use('/__regression/failure/accept', async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Method not allowed');
              return;
            }
            let body = '';
            req.on('data', (chunk: Buffer) => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                const fs = await import('node:fs');
                const payload = JSON.parse(body || '{}') as { id?: string };
                if (!payload.id) {
                  res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Missing id');
                  return;
                }
                const failures = await collectVisualFailures();
                const failure = failures.find((item) => item.id === payload.id);
                if (!failure) {
                  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Failure not found');
                  return;
                }
                if (!fs.existsSync(failure.actualPath)) {
                  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Actual screenshot missing');
                  return;
                }
                fs.copyFileSync(failure.actualPath, failure.baselinePath);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, id: failure.id, baselineUpdated: failure.snapshotName }));
              } catch {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Failed to accept screenshot');
              }
            });
          });

          server.middlewares.use('/__regression/failure/reject', async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Method not allowed');
              return;
            }
            let body = '';
            req.on('data', (chunk: Buffer) => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                const fs = await import('node:fs');
                const payload = JSON.parse(body || '{}') as { id?: string; note?: string };
                if (!payload.id) {
                  res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Missing id');
                  return;
                }
                const failures = await collectVisualFailures();
                const failure = failures.find((item) => item.id === payload.id);
                if (!failure) {
                  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Failure not found');
                  return;
                }
                const { rejectReportDir, path } = await getRegressionPaths();
                if (!fs.existsSync(rejectReportDir)) fs.mkdirSync(rejectReportDir, { recursive: true });
                const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                const reportPath = path.join(rejectReportDir, `rejection-${failure.snapshotName.replace('.png', '')}-${stamp}.md`);
                const note = payload.note?.trim() || 'No extra note provided.';
                const md = [
                  '# Screenshot Rejection Report',
                  '',
                  `Generated: ${new Date().toISOString()}`,
                  `Failure ID: ${failure.id}`,
                  `Snapshot: ${failure.snapshotName}`,
                  '',
                  '## Paths',
                  `- Baseline: ${failure.baselinePath}`,
                  `- Actual: ${failure.actualPath}`,
                  `- Diff: ${failure.diffPath}`,
                  '',
                  '## Reviewer Note',
                  note,
                  '',
                ].join('\n');
                fs.writeFileSync(reportPath, `${md}\n`, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, reportPath }));
              } catch {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Failed to reject screenshot');
              }
            });
          });

          server.middlewares.use('/__regression/failure/report', async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Method not allowed');
              return;
            }
            try {
              const fs = await import('node:fs');
              const failures = await collectVisualFailures();
              const { rejectReportDir, path } = await getRegressionPaths();
              if (!fs.existsSync(rejectReportDir)) fs.mkdirSync(rejectReportDir, { recursive: true });
              const stamp = new Date().toISOString().replace(/[:.]/g, '-');
              const reportPath = path.join(rejectReportDir, `rejection-batch-${stamp}.md`);
              const lines = [
                '# Visual Failure Batch Report',
                '',
                `Generated: ${new Date().toISOString()}`,
                `Failure count: ${failures.length}`,
                '',
              ];
              for (const failure of failures) {
                lines.push(`## ${failure.snapshotName}`);
                lines.push(`- ID: ${failure.id}`);
                lines.push(`- Baseline: ${failure.baselinePath}`);
                lines.push(`- Actual: ${failure.actualPath}`);
                lines.push(`- Diff: ${failure.diffPath}`);
                lines.push('');
              }
              fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ ok: true, reportPath, failureCount: failures.length }));
            } catch {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Failed to generate failure report');
            }
          });

          server.middlewares.use('/__regression/baseline', async (req: IncomingMessage, res: ServerResponse) => {
            try {
              const fs = await import('node:fs');
              const path = await import('node:path');
              const requestUrl = new URL(req.url || '/', 'http://localhost');
              const file = requestUrl.searchParams.get('file') || '';
              if (!/^[A-Za-z0-9._-]+\.png$/.test(file)) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Invalid file name');
                return;
              }
              const baselinePath = path.join(E2E_VISUAL_SNAPSHOTS_DIR, file);
              if (!fs.existsSync(baselinePath)) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Not found');
                return;
              }
              res.writeHead(200, {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0',
              });
              res.end(fs.readFileSync(baselinePath));
            } catch {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Failed to read baseline image');
            }
          });

          server.middlewares.use('/__regression/report', async (req: IncomingMessage, res: ServerResponse) => {
            try {
              const fs = await import('node:fs');
              const path = await import('node:path');
              const reportDir = path.join(PROJECT_ROOT, 'playwright-report');
              if (!fs.existsSync(reportDir)) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Playwright report not found');
                return;
              }

              const requestPath = (req.url || '/').split('?')[0] || '/';
              const targetRelativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
              const normalizedPath = path
                .normalize(targetRelativePath)
                .replace(/^(\.\.[/\\])+/, '')
                .replace(/^[/\\]+/, '');
              const targetPath = path.join(reportDir, normalizedPath);
              if (!targetPath.startsWith(reportDir) || !fs.existsSync(targetPath)) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Not found');
                return;
              }

              const ext = path.extname(targetPath).toLowerCase();
              const contentType = ext === '.html'
                ? 'text/html; charset=utf-8'
                : ext === '.js'
                  ? 'application/javascript; charset=utf-8'
                  : ext === '.css'
                    ? 'text/css; charset=utf-8'
                    : ext === '.json'
                      ? 'application/json; charset=utf-8'
                      : ext === '.png'
                        ? 'image/png'
                        : ext === '.svg'
                          ? 'image/svg+xml'
                          : 'application/octet-stream';
              res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
              res.end(fs.readFileSync(targetPath));
            } catch {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Failed to load Playwright report');
            }
          });
        }
      }] : []),
    react(),
    {
      name: 'fix-production-loading',
      enforce: 'post' as const,
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'build-version.txt',
          source: BUILD_VERSION,
        });
      },
      transformIndexHtml(html: string) {
        let out = html;

        // 1. Remove `crossorigin` from CSS <link> tags — avoids subtle CDN CORS
        //    caching issues on GitHub Pages (Fastly doesn't Vary by Origin).
        out = out.replace(
          /<link rel="stylesheet" crossorigin href="/g,
          '<link rel="stylesheet" href="',
        );

        // 2. Hoist CSS <link> tags above <script>/<link rel="modulepreload"> tags
        //    so the browser discovers stylesheets earlier in the parse.
        //    Also sort so shared base themes load before app-specific CSS (Vite
        //    code-splits shared CSS chunks and appends them last, which causes
        //    the shared defaults to override app overrides at equal specificity).
        const headMatch = out.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        if (headMatch) {
          const headContent = headMatch[1];
          const cssLinks: string[] = [];
          const rest: string[] = [];
          for (const line of headContent.split('\n')) {
            if (/^\s*<link\s[^>]*rel="stylesheet"/.test(line)) {
              cssLinks.push(line);
            } else {
              rest.push(line);
            }
          }
          if (cssLinks.length > 0) {
            // Sort: shared base themes first, then component CSS, then app CSS last.
            cssLinks.sort((a, b) => {
              const rank = (link: string) => {
                if (/appSharedThemes/.test(link)) return 0;    // base theme defaults
                if (/materialIcons|AppSlider|BpmInput|KeyInput|Chord|VexFlow/.test(link)) return 1;
                return 2; // app-specific CSS (overrides everything)
              };
              return rank(a) - rank(b);
            });

            const insertIdx = rest.findIndex(
              (l) => /<script\b/.test(l) || /<link[^>]*rel="modulepreload"/.test(l),
            );
            if (insertIdx > 0) {
              rest.splice(insertIdx, 0, ...cssLinks);
              out = out.replace(headMatch[1], rest.join('\n'));
            }
          }
        }

        // 3. Purge stale service workers left by a previous vite-plugin-pwa deployment.
        out = out.replace(
          '</head>',
          '<script>if("serviceWorker"in navigator)navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(s){s.unregister()})})</script>\n</head>',
        );

        // 3a. Block PWA install prompts. No manifest is shipped, but Chrome can still
        //     fire `beforeinstallprompt` if site heuristics change. Call preventDefault
        //     on both events so the install banner never surfaces.
        out = out.replace(
          '</head>',
          '<script>addEventListener("beforeinstallprompt",function(e){e.preventDefault()});addEventListener("appinstalled",function(e){e.preventDefault()});</script>\n</head>',
        );

        // 4. Stale-HTML detection: if the deployed build-version.txt doesn't match
        //    the version baked into this HTML, the page is stale (CDN/browser cache).
        //    Reload once per session to pick up the fresh HTML.
        const versionScript = `<script>
(function(){
  if(location.hostname==='localhost'||location.hostname==='127.0.0.1')return;
  var V='${BUILD_VERSION}',K='__buildV';
  if(sessionStorage.getItem(K)===V)return;
  fetch('/build-version.txt?_='+Date.now(),{cache:'no-store'})
    .then(function(r){return r.ok?r.text():V})
    .then(function(t){
      t=t.trim();
      sessionStorage.setItem(K,t);
      if(t!==V)location.reload();
    })
    .catch(function(){});
})();
</script>`;
        out = out.replace('</head>', versionScript + '\n</head>');

        return out;
      },
    },
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
      // Fast mode: exclude slow regression/audit/stress tests for rapid development iteration.
      // Match any test whose filename contains "regression", "audit", "stress", or "benchmark"
      // (hyphenated or not) so new slow tests are excluded by convention.
      ...(process.env.FAST_TESTS === 'true' ? [
        '**/*{regression,audit,stress,benchmark}*.test.{ts,tsx}',
        '**/*{Regression,Audit,Stress,Benchmark}*.test.{ts,tsx}',
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/e2e/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/test/**',
        'src/ui/generatedSharedCatalog.ts',
        'e2e/**',
      ],
      // Thresholds intentionally unset for now: CI runs `test:coverage` as a
      // non-blocking signal-only step. Set a real floor once we have a
      // measured baseline from the first coverage artifact.
    },
  },
});
