import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BASELINE_PATH = path.join(REPO_ROOT, 'tools/muscle-anatomy/skin-boundary-baseline.json');

export type SkinBoundaryBaseline = {
  /** Max boundary edges per skin mesh — regressions mean new open seams or export holes. */
  maxBoundaryEdgesByMesh: Record<string, number>;
};

export function loadSkinBoundaryBaseline(): SkinBoundaryBaseline {
  if (!fs.existsSync(BASELINE_PATH)) {
    return { maxBoundaryEdgesByMesh: {} };
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as SkinBoundaryBaseline;
}

export function saveSkinBoundaryBaseline(baseline: SkinBoundaryBaseline): void {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
}
