import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every e2e spec runs with external hosts blocked (`e2e/labsTest.ts`).
 *
 * The block only applies to specs that import `test` from `e2e/labsTest`, and only holds while no
 * route handler sends a request on with `route.continue()`. Both are one careless line away, so
 * this checks both. The set of files is derived by walking the tree, so a new spec is enrolled by
 * existing.
 */

const root = resolve(__dirname, '../..');
const SKIP_DIRS = new Set(['node_modules', '.claude', '.git', 'dist', 'test-results', 'playwright-report']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name), out);
    } else if (entry.name.endsWith('.ts')) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const e2eSources = [...walk(join(root, 'e2e')), ...walk(join(root, 'src')).filter((f) => f.includes('/e2e/'))];
const specs = e2eSources.filter((f) => f.endsWith('.spec.ts'));
const rel = (f: string) => relative(root, f);

/** Names imported from `module` by a static `import { … } from 'module'`. */
function namedImports(text: string, module: RegExp): string[] {
  const names: string[] = [];
  for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    if (!module.test(m[2])) continue;
    for (const part of m[1].split(',')) {
      const name = part.trim();
      if (name && !name.startsWith('type ')) names.push(name.split(/\s+as\s+/)[0]);
    }
  }
  return names;
}

describe('e2e network isolation', () => {
  it('finds the specs', () => {
    // A walk that matches nothing would pass every assertion below.
    expect(specs.length).toBeGreaterThan(50);
    expect(specs.some((f) => rel(f).startsWith('src/'))).toBe(true);
  });

  it('every spec takes test from e2e/labsTest, not @playwright/test', () => {
    const offenders = specs.filter((f) => {
      const text = readFileSync(f, 'utf8');
      const fromPlaywright = namedImports(text, /^@playwright\/test$/).includes('test');
      const fromLabs = namedImports(text, /(^|\/)labsTest$/).includes('test');
      return fromPlaywright || !fromLabs;
    });
    expect(
      offenders.map(rel),
      "These specs can reach real services. Import { test, expect } from 'e2e/labsTest' instead.",
    ).toEqual([]);
  });

  it('no e2e route handler uses route.continue()', () => {
    // continue() sends the request to the network and skips the context-level block. fallback()
    // hands it to the next handler, which for a local URL ends in the network anyway.
    const offenders = e2eSources.filter((f) => /\.continue\(/.test(readFileSync(f, 'utf8')) && !f.endsWith('labsTest.ts'));
    expect(offenders.map(rel), 'Use route.fallback() instead of route.continue().').toEqual([]);
  });
});
