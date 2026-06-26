import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const E2E_ROOT = join(REPO_ROOT, 'e2e');

/** Selectors that drift when UI migrates from buttons to native links. */
const BANNED_E2E_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /button\.stanza-library-card/,
    reason: 'Stanza library cards are `<a.stanza-library-card>` — use clickStanzaLibraryCard()',
  },
];

function collectSpecFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...collectSpecFiles(path));
    else if (entry.endsWith('.spec.ts')) out.push(path);
  }
  return out;
}

describe('e2e selector guardrails', () => {
  it('does not use stale Stanza library card button selectors', () => {
    const violations: string[] = [];
    for (const file of collectSpecFiles(E2E_ROOT)) {
      const text = readFileSync(file, 'utf8');
      const rel = file.replace(`${REPO_ROOT}/`, '');
      for (const { pattern, reason } of BANNED_E2E_PATTERNS) {
        if (pattern.test(text)) violations.push(`${rel}: ${reason}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
