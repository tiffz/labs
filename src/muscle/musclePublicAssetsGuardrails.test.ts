import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MUSCLE_MAIN = path.join(REPO_ROOT, 'src/muscle/main.tsx');
const MANIFEST_PATH = path.join(REPO_ROOT, 'public/muscle/models/manifest.json');

type MuscleManifestRegion = {
  glbUrl?: string;
  meshes?: unknown[];
};

describe('muscle public runtime assets', () => {
  it('ships manifest.json and region GLBs when the muscle app is registered', () => {
    expect(fs.existsSync(MUSCLE_MAIN)).toBe(true);
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as {
      regions?: Record<string, MuscleManifestRegion>;
    };

    expect(Object.keys(manifest.regions ?? {}).length).toBeGreaterThan(0);

    for (const [region, entry] of Object.entries(manifest.regions ?? {})) {
      expect(entry.glbUrl, `${region} missing glbUrl`).toBeTruthy();
      const glbPath = path.join(REPO_ROOT, 'public', entry.glbUrl!.replace(/^\//, ''));
      expect(fs.existsSync(glbPath), `${region} missing file ${entry.glbUrl}`).toBe(true);
    }
  });
});
