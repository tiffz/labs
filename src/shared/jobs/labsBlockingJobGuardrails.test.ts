import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

const BLOCKING_JOB_IMPORT_RE =
  /from\s+['"][^'"]*LabsBlockingJobContext['"]|useLabsBlockingJobs\s*\(/;
const LINEAR_PROGRESS_IMPORT_RE =
  /import\s+LinearProgress\s+from\s+['"]@mui\/material\/LinearProgress['"]/;

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
      if (entry.isFile() && entry.name.endsWith('.tsx')) {
        out.push(full);
      }
    }
  };
  walk(SRC_ROOT);
  return out.filter((file) => {
    const rel = path.relative(SRC_ROOT, file);
    if (rel.startsWith(`shared${path.sep}jobs${path.sep}`)) return false;
    if (rel.startsWith(`ui${path.sep}`)) return false;
    return true;
  });
}

describe('Labs blocking job guardrails', () => {
  const offenders = listComponentTsxFiles().filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    if (!BLOCKING_JOB_IMPORT_RE.test(source)) return false;
    return LINEAR_PROGRESS_IMPORT_RE.test(source);
  });

  it('does not pair LinearProgress with LabsBlockingJobContext in app components', () => {
    expect(
      offenders.map((f) => path.relative(REPO_ROOT, f)),
      'Use LabsBlockingJobProvider snackbar progress — not duplicate LinearProgress',
    ).toEqual([]);
  });
});
