#!/usr/bin/env node
/**
 * Lightweight doc hygiene: verify key agent-doc links resolve to files on disk.
 * Run in CI/presubmit; extend LINK_CHECKS when adding canonical agent paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** [markdown file relative to repo, link path as written in markdown] */
const LINK_CHECKS = [
  ['AGENTS.md', 'src/shared/SHARED_UI_CONVENTIONS.md'],
  ['AGENTS.md', 'src/shared/hooks/PLAYBACK_HOOK_PATTERN.md'],
  ['AGENTS.md', 'docs/USER_COPY_STYLE.md'],
  ['AGENTS.md', 'src/encore/AGENTS.md'],
  ['AGENTS.md', 'src/stanza/AGENTS.md'],
  ['AGENTS.md', 'src/shared/AGENTS.md'],
  ['AGENTS.md', 'src/words/AGENTS.md'],
  ['AGENTS.md', 'src/piano/AGENTS.md'],
  ['AGENTS.md', 'src/chords/AGENTS.md'],
  ['.cursor/rules/README.md', '../../AGENTS.md'],
  ['.cursor/rules/README.md', 'shared-ui-first.mdc'],
  ['.cursor/rules/README.md', 'user-copy.mdc'],
  ['src/shared/SHARED_UI_CONVENTIONS.md', '../encore/UI_PRIMITIVES.md'],
  ['docs/DOCUMENTATION_STRATEGY.md', 'USER_COPY_STYLE.md'],
  ['docs/SOURCE_OF_TRUTH.md', '../AGENTS.md'],
];

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

const failures = [];

for (const [docRel, linkTarget] of LINK_CHECKS) {
  const docPath = path.join(repoRoot, docRel);
  if (!fs.existsSync(docPath)) {
    failures.push(`Missing doc file: ${docRel}`);
    continue;
  }
  const docDir = path.dirname(docPath);
  const resolved = linkTarget.startsWith('docs/') || linkTarget.startsWith('src/')
    ? path.join(repoRoot, linkTarget)
    : path.resolve(docDir, linkTarget);
  if (!fs.existsSync(resolved)) {
    failures.push(`${docRel} → ${linkTarget} (not found)`);
  }
}

failures.push(...checkSharedCatalogDemos());

if (failures.length > 0) {
  console.error('check:doc-links failed:\n');
  failures.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log('check:doc-links: ok');
