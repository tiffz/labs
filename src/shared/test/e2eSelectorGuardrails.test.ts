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

/**
 * Perf-budget guardrail — the dominant e2e-flake root cause per the 2026-07 quality
 * tournament (`heavy-page-ci-flake`): frame-time / ms-latency / load-time budgets
 * asserted as BLOCKING merge gates red-fail on shared-runner hardware variance, not
 * on real regressions. Earlier sessions converted every such assertion to advisory
 * `report*()` helpers (interactionLatency.ts, *ScrollPerf.ts). This locks that in:
 * a new blocking `expect(<perf measure>).toBeLessThan*(…)` fails here, forcing the
 * advisory helper instead. Environment-dominated numbers are measured, never gated.
 */
const BLOCKING_PERF_ASSERTION =
  /expect\([^)]*\b(ms|Ms|frame|Frame|fps|Fps|budget|Budget|latency|Latency|loadTime|LoadTime|lcp|Lcp|duration|Duration)\b[^)]*\)\s*\.\s*toBeLessThan(OrEqual)?\s*\(/;

describe('e2e perf-budget guardrail', () => {
  it('has no BLOCKING perf/frame/latency budget assertions (use advisory report* helpers)', () => {
    const violations: string[] = [];
    for (const file of collectSpecFiles(E2E_ROOT)) {
      const rel = file.replace(`${REPO_ROOT}/`, '');
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (BLOCKING_PERF_ASSERTION.test(line)) {
            violations.push(
              `${rel}:${i + 1} — blocking perf budget assertion. Route through an advisory ` +
                `report*() helper (e2e/helpers/interactionLatency.ts) instead; frame/latency numbers ` +
                `measure the CI runner, not the app.`,
            );
          }
        });
    }
    expect(violations).toEqual([]);
  });
});
