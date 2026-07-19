import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

// Raw MUI Slider imports are guarded by src/shared/sharedUiReuse.test.ts
// (single allowlist source) — do not duplicate a Slider check here.

/** App files allowed Snackbar for blocking jobs (none — use LabsFeedbackToast). */
const SNACKBAR_BLOCKING_JOB_ALLOWLIST = new Set<string>();

const SNACKBAR_IMPORT = /import\s+Snackbar\s+from\s+['"]@mui\/material\/Snackbar['"]/;

function listComponentTsxFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.tsx')) out.push(full);
    }
  };
  walk(SRC_ROOT);
  return out;
}

describe('Shared UX pattern guardrails', () => {
  const files = listComponentTsxFiles();

  it('does not add app-local Snackbar for blocking jobs (use LabsBlockingJobContext)', () => {
    const offenders = files.filter((file) => {
      const rel = path.relative(SRC_ROOT, file).replaceAll('\\', '/');
      if (SNACKBAR_BLOCKING_JOB_ALLOWLIST.has(rel)) return false;
      if (rel.startsWith('shared/')) return false;
      const source = fs.readFileSync(file, 'utf8');
      if (!SNACKBAR_IMPORT.test(source)) return false;
      return /withBlockingJob|LabsBlockingJob|blockingJob/i.test(source);
    });
    expect(
      offenders.map((f) => path.relative(REPO_ROOT, f)),
      'Use LabsBlockingJobProvider snackbar — see labsBlockingJobGuardrails.test.ts',
    ).toEqual([]);
  });
});
