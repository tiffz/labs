import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'public/muscle/models/manifest.json');
const CSV_PATH = path.join(REPO_ROOT, 'tools/muscle-anatomy/z_anatomy_name_map.csv');

const CRITICAL_MUSCLE_MIN_TRIS: Record<string, number> = {
  muscle_gluteus_maximus: 2_000,
  muscle_gluteus_medius: 400,
  muscle_gluteus_minimus: 400,
};

function loadCsvMuscleNodeIds(): Set<string> {
  const ids = new Set<string>();
  for (const line of fs.readFileSync(CSV_PATH, 'utf8').split('\n').slice(1)) {
    const [, nodeId] = line.split(',');
    const trimmed = nodeId?.trim();
    if (trimmed?.startsWith('muscle_')) ids.add(trimmed);
  }
  return ids;
}

function meshIndex(manifest: {
  regions?: Record<string, { meshes?: Array<{ nodeId: string; triangleCount?: number }> }>;
}) {
  const byId = new Map<string, { region: string; triangleCount: number }>();
  for (const [region, entry] of Object.entries(manifest.regions ?? {})) {
    for (const mesh of entry.meshes ?? []) {
      if (!mesh.nodeId) continue;
      const triangleCount = mesh.triangleCount ?? 0;
      const existing = byId.get(mesh.nodeId);
      if (!existing || triangleCount > existing.triangleCount) {
        byId.set(mesh.nodeId, { region, triangleCount });
      }
    }
  }
  return byId;
}

describe('muscle curriculum mesh coverage', () => {
  it('maps every CSV muscle to a manifest mesh with triangle budget', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const index = meshIndex(manifest);

    for (const nodeId of loadCsvMuscleNodeIds()) {
      const entry = index.get(nodeId);
      expect(entry, `missing mesh for ${nodeId}`).toBeTruthy();
      const minTris = CRITICAL_MUSCLE_MIN_TRIS[nodeId] ?? 80;
      expect(entry!.triangleCount, nodeId).toBeGreaterThanOrEqual(minTris);
    }
  });
});
