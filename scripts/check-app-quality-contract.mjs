#!/usr/bin/env node
/**
 * Enforces new-app quality checklist: registry ↔ filesystem sync, CUJs, shell hardening.
 * See docs/LIGHTHOUSE_AUDIT.md and .cursor/skills/labs-new-micro-app/SKILL.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseRouteRegistry } from './lib/parseRouteRegistry.mjs';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const failures = [];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

/** Top-level micro-apps and nested entries (e.g. drums/universal_tom). */
function listAppEntryPaths() {
  const entries = [{ rel: 'src/index.html', route: '/', appId: 'labs-home' }];

  for (const dirent of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name === 'shared') continue;
    const topHtml = path.join(srcRoot, dirent.name, 'index.html');
    if (fs.existsSync(topHtml)) {
      entries.push({
        rel: `src/${dirent.name}/index.html`,
        route: `/${dirent.name}/`,
        appId: dirent.name,
      });
    }
    const appDir = path.join(srcRoot, dirent.name);
    for (const inner of fs.readdirSync(appDir, { withFileTypes: true })) {
      if (!inner.isDirectory()) continue;
      const nestedHtml = path.join(appDir, inner.name, 'index.html');
      if (fs.existsSync(nestedHtml)) {
        entries.push({
          rel: `src/${dirent.name}/${inner.name}/index.html`,
          route: `/${dirent.name}/${inner.name}/`,
          appId: `${dirent.name}/${inner.name}`,
        });
      }
    }
  }
  return entries;
}

const registry = parseRouteRegistry(root);
const smokeRoutes = new Set(registry.filter((r) => r.smoke).map((r) => r.route));
const allRoutes = new Set(registry.map((r) => r.route));
const appEntries = listAppEntryPaths();
const viteConfig = read('vite.config.ts');

for (const entry of appEntries) {
  const { rel, route, appId } = entry;
  const isHome = route === '/';
  const topApp = appId.split('/')[0];

  if (!allRoutes.has(route)) {
    failures.push(`${rel} (${route}) missing from e2e/routeRegistry.ts`);
  } else if (!smokeRoutes.has(route)) {
    failures.push(`${rel} (${route}) must have smoke: true in routeRegistry.ts`);
  }

  if (!viteConfig.includes(rel.replace(/^src\//, 'src/'))) {
    failures.push(`vite.config.ts must register ${rel}`);
  }

  if (!isHome) {
    for (const doc of [`src/${topApp}/README.md`, `src/${topApp}/CUJs.md`]) {
      if (!exists(doc)) {
        failures.push(`${doc} required for micro-app ${topApp}`);
      }
    }

    const mainPath = `src/${topApp}/main.tsx`;
    if (!exists(mainPath)) {
      failures.push(`${mainPath} required for micro-app ${topApp}`);
    } else {
      const mainText = read(mainPath);
      if (!mainText.includes('LabsErrorBoundary')) {
        failures.push(`${mainPath} must wrap root in LabsErrorBoundary`);
      }
      if (!mainText.includes('installLabsCrashHandlers(')) {
        failures.push(`${mainPath} must call installLabsCrashHandlers()`);
      }
      if (!/<(React\.)?StrictMode\b/.test(mainText)) {
        failures.push(`${mainPath} must wrap root in React.StrictMode`);
      }
      if (!mainText.includes("import '../shared/styles/labsChrome.css'")) {
        failures.push(`${mainPath} must import labsChrome.css`);
      }
      if (!mainText.includes('appSharedThemes.css')) {
        failures.push(`${mainPath} must import appSharedThemes.css`);
      }
    }
  }
}

for (const { route } of registry) {
  if (route === '/') {
    if (!exists('src/index.html')) {
      failures.push('routeRegistry / requires src/index.html');
    }
    continue;
  }
  const normalized = route.endsWith('/') ? route.slice(1, -1) : route.slice(1);
  const htmlPath = `src/${normalized}/index.html`;
  if (!exists(htmlPath)) {
    failures.push(`routeRegistry ${route} has no matching ${htmlPath}`);
  }
}

if (failures.length > 0) {
  console.error('App quality contract check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`App quality contract check passed (${appEntries.length} entries, ${smokeRoutes.size} smoke routes).`);
