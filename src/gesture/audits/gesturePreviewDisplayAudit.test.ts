/**
 * Source audit: preview grids must not display revocable blob URLs (excluded from test:fast).
 * Fast smoke: `gesturePreviewDisplayInvariants.test.ts`
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const gestureRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function readGesture(rel: string): string {
  return readFileSync(join(gestureRoot, rel), 'utf8');
}

describe('gesturePreviewDisplayAudit', () => {
  it('gesturePreviewImageUrl avoids eviction-driven refetch loops', () => {
    const src = readGesture('media/gesturePreviewImageUrl.ts');
    expect(src).not.toContain('subscribeGestureMediaCacheEvictions');
    expect(src).not.toContain('peekCachedGestureMediaUrl');
  });

  it('usePackPreviewUrls syncs display from cache without IDB blob hydrate', () => {
    const src = readGesture('hooks/usePackPreviewUrls.ts');
    expect(src).not.toContain('hydrateGesturePreviewFromIdb');
    expect(src).toContain('subscribeGesturePreviewCacheForIds');
    expect(src).toContain('retainGesturePreviewUrlsForDisplay');
  });

  it('preview display pins are refcounted separately from gestureMediaCache LRU', () => {
    const pinsSrc = readGesture('media/gesturePreviewDisplayPins.ts');
    expect(pinsSrc).toContain('refcount');
    expect(pinsSrc).toContain('revokeObjectURL');
  });

  it('PackPreviewStrip fetches when the tab is active (not gated on near alone)', () => {
    const src = readGesture('components/PackPreviewStrip.tsx');
    expect(src).not.toMatch(/previewFetchEnabled\s*&&\s*near/);
    expect(src).toContain('usePackPreviewUrls(driveFileIds, limit, previewFetchEnabled)');
  });

  it('gesturePreviewImageUrl caps concurrent preview resolves', () => {
    const src = readGesture('media/gesturePreviewImageUrl.ts');
    expect(src).toMatch(/MAX_CONCURRENT_PREVIEW_RESOLVES/);
    expect(src).toContain('acquirePreviewResolveSlot');
  });
});
