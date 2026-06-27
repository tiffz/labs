import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

describe('skinEnvelopeRuntimeGeometry', () => {
  it('stays browser-safe (no Node fs/url reader imports)', () => {
    const source = fs.readFileSync(
      path.join(REPO_ROOT, 'src/muscle/components/canvas/skinEnvelopeRuntimeGeometry.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/from ['"].*skinGlbEnvelopeReader/);
    expect(source).not.toMatch(/from ['"]node:fs['"]/);
    expect(source).not.toMatch(/from ['"]node:url['"]/);
  });

  it('SkinEnvelopeLayer renders via mergeSkinEnvelopeParts (audit weld + ear seal path)', () => {
    const source = fs.readFileSync(
      path.join(REPO_ROOT, 'src/muscle/components/canvas/SkinEnvelopeLayer.tsx'),
      'utf8',
    );
    expect(source).toMatch(/mergeSkinEnvelopeParts/);
    expect(source).not.toMatch(/buildAlignedWeldedSkinEnvelopeFromScene/);
    expect(source).not.toMatch(/skinGlbEnvelopeReader/);
    expect(source).not.toMatch(/readAlignedWeldedSkinEnvelope/);
  });
});
