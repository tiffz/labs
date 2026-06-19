import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname);
const regionModelSource = fs.readFileSync(
  path.join(root, 'components/canvas/RegionModel.tsx'),
  'utf8',
);
const glbMeshSource = fs.readFileSync(
  path.join(root, 'components/canvas/GlbAnatomyMesh.tsx'),
  'utf8',
);
const meshFlagsSource = fs.readFileSync(
  path.join(root, 'components/canvas/useAnatomyMeshFlags.ts'),
  'utf8',
);

describe('muscle canvas perf guardrails', () => {
  it('keeps GlbRegionModel free of useMuscleStore subscriptions', () => {
    const glbRegionBlock = regionModelSource.slice(
      regionModelSource.indexOf('function GlbRegionModel'),
      regionModelSource.indexOf('interface RegionModelProps'),
    );
    expect(glbRegionBlock).not.toContain('useMuscleStore');
  });

  it('uses shallow Zustand selector for per-mesh flags', () => {
    expect(meshFlagsSource).toContain('useShallow');
  });

  it('uses shared Lambert material pool for GLB meshes', () => {
    expect(glbMeshSource).toContain('acquireAnatomyMaterial');
  });

  it('accelerates picking with mesh BVH during GLB extraction', () => {
    const extractSource = fs.readFileSync(
      path.join(root, 'components/canvas/extractGlbMeshes.ts'),
      'utf8',
    );
    expect(extractSource).toContain('prepareAnatomyGeometry');
  });
});
