import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

/** Apps allowed to use raw MUI Slider for volume (document in DESIGN.md if adding). */
const SLIDER_ALLOWLIST = new Set<string>([
  'shared/components/AppLinearVolumeSlider.tsx',
  'shared/components/PlaybackVolumeRow.tsx',
  'ui/',
  'agility/App.tsx', // grandfathered — migrate to AppLinearVolumeSlider
]);

/** App files allowed Snackbar + blocking-job overlap (grandfathered). */
const SNACKBAR_BLOCKING_JOB_ALLOWLIST = new Set<string>([
  'encore/components/LibraryScreen.tsx',
  'encore/components/practice/PracticeExerciseFocusDialog.tsx',
  'encore/originals/components/OriginalsChartExportMenu.tsx',
]);

const VOLUME_SLIDER_IMPORT =
  /import\s+Slider\s+from\s+['"]@mui\/material\/Slider['"]/;
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

function isAllowlisted(rel: string): boolean {
  const normalized = rel.replaceAll('\\', '/');
  for (const allowed of SLIDER_ALLOWLIST) {
    if (normalized.includes(allowed) || normalized.endsWith(allowed)) return true;
  }
  return false;
}

describe('Shared UX pattern guardrails', () => {
  const files = listComponentTsxFiles();

  it('does not use raw MUI Slider for volume outside allowlist', () => {
    const offenders = files.filter((file) => {
      const rel = path.relative(SRC_ROOT, file);
      if (rel.startsWith(`shared${path.sep}jobs${path.sep}`)) return false;
      if (isAllowlisted(rel)) return false;
      const source = fs.readFileSync(file, 'utf8');
      if (!VOLUME_SLIDER_IMPORT.test(source)) return false;
      return /volume|gain|master/i.test(source);
    });
    expect(
      offenders.map((f) => path.relative(REPO_ROOT, f)),
      'Use AppLinearVolumeSlider — see SHARED_UI_CONVENTIONS.md',
    ).toEqual([]);
  });

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
