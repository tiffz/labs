#!/usr/bin/env node
/**
 * Doc hygiene, two passes over the guidance corpus (docs/, root *.md, src markdown,
 * .cursor/rules, .cursor/skills):
 *   1. Every relative markdown link resolves to a file/directory on disk.
 *   2. Every `npm run <script>` citation exists in package.json scripts.
 * Plus: shared-catalog demo symbols resolve (legacy check).
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'test-results', 'playwright-report', '.git']);

function collectMarkdownFiles() {
  /** Corpus roots: guidance the agent/human workflow actually reads. */
  const out = [];
  const pushIfMd = (full) => {
    if (/\.(md|mdc)$/.test(full)) out.push(full);
  };
  for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (entry.isFile()) pushIfMd(path.join(repoRoot, entry.name));
  }
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
        continue;
      }
      pushIfMd(full);
    }
  };
  for (const root of ['docs', 'src', '.cursor/rules', '.cursor/skills', 'e2e', 'tools', 'workers', '.github']) {
    walk(path.join(repoRoot, root));
  }
  return out;
}

/** Extract relative link targets from markdown, skipping fenced code blocks. */
function extractRelativeLinks(text) {
  const links = [];
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const raw = match[1];
      if (/^(https?:|mailto:|#|data:|vscode:)/i.test(raw)) continue;
      // Site-absolute links (e.g. /ui/, /drums/) target the deployed app, not files.
      if (raw.startsWith('/')) continue;
      const target = raw.split('#')[0].split('?')[0];
      if (!target) continue;
      links.push(decodeURIComponent(target));
    }
  }
  return links;
}

/** Extract `npm run <script>` citations (code blocks included — that's where they live). */
function extractNpmScriptCitations(text) {
  const names = new Set();
  for (const match of text.matchAll(/npm run ([a-z0-9:_.-]+)/g)) {
    names.add(match[1]);
  }
  return [...names];
}

const failures = [];
const markdownFiles = collectMarkdownFiles();
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const knownScripts = new Set(Object.keys(pkg.scripts ?? {}));

// Sub-package docs cite their own package.json scripts — resolve against the nearest one.
function scriptsForDoc(docPath) {
  let dir = path.dirname(docPath);
  while (dir.startsWith(repoRoot)) {
    const pkgPath = path.join(dir, 'package.json');
    if (dir !== repoRoot && fs.existsSync(pkgPath)) {
      try {
        const sub = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return new Set([...knownScripts, ...Object.keys(sub.scripts ?? {})]);
      } catch {
        return knownScripts;
      }
    }
    dir = path.dirname(dir);
  }
  return knownScripts;
}

for (const file of markdownFiles) {
  const rel = path.relative(repoRoot, file);
  const text = fs.readFileSync(file, 'utf8');

  for (const link of extractRelativeLinks(text)) {
    const resolved = path.resolve(path.dirname(file), link);
    if (!fs.existsSync(resolved)) {
      failures.push(`${rel} → ${link} (not found)`);
    }
  }

  const scripts = scriptsForDoc(file);
  for (const name of extractNpmScriptCitations(text)) {
    if (!scripts.has(name)) {
      failures.push(`${rel} cites "npm run ${name}" — not in package.json scripts`);
    }
  }
}

/** demoBySymbol keys must exist as exported components in shared (best-effort). */
function checkSharedCatalogDemos() {
  const configPath = path.join(repoRoot, 'src/ui/sharedCatalog.config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const demoBySymbol = config.demoBySymbol ?? {};
  const missing = [];

  for (const symbol of Object.keys(demoBySymbol)) {
    const found = findExportFile(symbol);
    if (!found) {
      missing.push(`demoBySymbol.${symbol} — no export named ${symbol} under src/shared`);
    }
  }

  return missing;
}

function findExportFile(exportName) {
  const sharedRoot = path.join(repoRoot, 'src/shared');
  const stack = [sharedRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        stack.push(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes('.test.')) continue;
      const text = fs.readFileSync(full, 'utf8');
      const patterns = [
        new RegExp(`export\\s+default\\s+function\\s+${exportName}\\b`),
        new RegExp(`export\\s+default\\s+${exportName}\\b`),
        new RegExp(`export\\s+(?:function|class|const)\\s+${exportName}\\b`),
        new RegExp(`\\bconst\\s+${exportName}\\b`),
        new RegExp(`\\bfunction\\s+${exportName}\\b`),
        new RegExp(`export\\s*\\{[^}]*\\b${exportName}\\b`),
      ];
      if (patterns.some((re) => re.test(text))) return full;
    }
  }
  return null;
}

failures.push(...checkSharedCatalogDemos());

if (failures.length > 0) {
  console.error(`check:doc-links failed (${failures.length}):\n`);
  failures.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log(`check:doc-links: ok (${markdownFiles.length} markdown files crawled)`);
