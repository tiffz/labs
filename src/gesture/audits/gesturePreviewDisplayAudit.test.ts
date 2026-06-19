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

  it('PackPreviewStrip fetches when tab is active and strip is near viewport', () => {
    const src = readGesture('components/PackPreviewStrip.tsx');
    expect(src).toContain('const shouldFetch = previewFetchEnabled && near');
    expect(src).toMatch(/previewFetchEnabled\s*&&\s*near/);
    expect(src).toMatch(/usePackPreviewUrls\(\s*previewIds,\s*limit,\s*shouldFetch,\s*thumbWidth/);
  });

  it('CollectionsCollectionGrid uses native CSS grid (no fixed-row virtualizer)', () => {
    const src = readGesture('components/CollectionsCollectionGrid.tsx');
    expect(src).not.toContain('@tanstack/react-virtual');
    expect(src).not.toContain('useWindowVirtualizer');
    expect(src).toContain('gesture-collection-grid gesture-collection-grid--compact');
  });

  it('collection grid cards avoid layout containment (breaks variable-height grid rows)', () => {
    const css = readFileSync(join(gestureRoot, 'gesture.css'), 'utf8');
    expect(css).not.toMatch(
      /\.gesture-collection-grid--(?:compact|practice)[\s\S]*?contain:\s*layout/,
    );
    expect(css).not.toMatch(
      /\.gesture-collection-grid--(?:compact|practice)[\s\S]*?content-visibility:\s*auto/,
    );
  });

  it('compact manage cards request smaller preview thumbs', () => {
    const src = readGesture('components/PackCollectionCard.tsx');
    expect(src).toContain('GESTURE_COMPACT_PREVIEW_THUMB_WIDTH');
  });

  it('gesturePreviewImageUrl caps concurrent preview resolves', () => {
    const src = readGesture('media/gesturePreviewImageUrl.ts');
    expect(src).toMatch(/MAX_CONCURRENT_PREVIEW_RESOLVES/);
    expect(src).toContain('acquirePreviewResolveSlot');
    expect(src).toContain('gesturePreviewResolveTier');
  });

  it('preview display pins delay revoke after refcount reaches zero', () => {
    const src = readGesture('media/gesturePreviewDisplayPins.ts');
    expect(src).toContain('PIN_REVOKE_DELAY_MS');
    expect(src).toContain('scheduleDelayedRevoke');
  });
});
