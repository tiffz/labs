import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ADR 0031: `lyreflyWorkPhase` is the one place that decides where a work shows. A view that
 * filters on `pipelineStatus` brings back a second, stored answer that can disagree with it.
 * The set is every component and hook, found by walking the folders, so a new file is covered.
 */
const ROOT = join(__dirname, '..');
const VIEW_DIRS = ['components', 'hooks'];

/** Reads that are not placement. Each needs a reason. */
const EXEMPT: Record<string, string> = {
  'components/LyreflyBundleImportDialog.tsx': 'summarises the tracker status in a bundle being imported',
};

function viewFiles(): string[] {
  return VIEW_DIRS.flatMap((dir) =>
    readdirSync(join(ROOT, dir))
      .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
      .map((name) => `${dir}/${name}`),
  );
}

describe('lyreflyWorkPhase guardrail', () => {
  it('finds the views it governs', () => {
    expect(viewFiles().length).toBeGreaterThan(20);
  });

  it('no view reads pipelineStatus to decide where a work shows', () => {
    const offenders = viewFiles().filter(
      (file) => !EXEMPT[file] && /\bpipelineStatus\b/.test(readFileSync(join(ROOT, file), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
