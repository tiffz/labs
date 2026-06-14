import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionQueueItem } from '../types';

vi.mock('../media/gestureThumbnailLinkCache', () => ({
  resolveGestureReferenceImageUrl: vi.fn(),
}));

vi.mock('../media/gestureImagePrefetchCache', () => ({
  getCachedGestureImageUrl: vi.fn(),
  preloadGestureImageViaElement: vi.fn(),
  resolveGestureSessionImageSrc: vi.fn(),
  retainGesturePrefetchKeys: vi.fn(),
  dropGesturePrefetchEntry: vi.fn(),
}));

import { resolveGestureReferenceImageUrl } from '../media/gestureThumbnailLinkCache';
import {
  getCachedGestureImageUrl,
  preloadGestureImageViaElement,
  resolveGestureSessionImageSrc,
  retainGesturePrefetchKeys,
} from '../media/gestureImagePrefetchCache';
import {
  clearGestureSessionPhotoDisplayReady,
  markGestureSessionPhotoDisplayReady,
} from '../media/gestureSessionPhotoPipeline';
import { useGestureImagePrefetch } from './useGestureImagePrefetch';

const itemA: SessionQueueItem = { driveFileId: 'a', packId: 'p1', name: 'A.jpg' };
const itemB: SessionQueueItem = { driveFileId: 'b', packId: 'p1', name: 'B.jpg' };
const queue = [itemA, itemB];

function assertReadyImpliesVisibleSrc(state: {
  src: string | null;
  ready: boolean;
}): void {
  if (state.ready) {
    expect(state.src, 'ready must not be true without a visible src').toBeTruthy();
  }
}

describe('useGestureImagePrefetch', () => {
  beforeEach(() => {
    clearGestureSessionPhotoDisplayReady();
    vi.clearAllMocks();
    vi.mocked(getCachedGestureImageUrl).mockReturnValue(null);
    vi.mocked(resolveGestureReferenceImageUrl).mockResolvedValue('https://example.com/thumb.jpg');
    vi.mocked(resolveGestureSessionImageSrc).mockResolvedValue('https://example.com/display.jpg');
    vi.mocked(preloadGestureImageViaElement).mockResolvedValue(undefined);
  });

  afterEach(() => {
    clearGestureSessionPhotoDisplayReady();
  });

  it('shows a display-ready cached photo immediately with ready=true', async () => {
    const cached = 'https://example.com/cached-a.jpg';
    vi.mocked(getCachedGestureImageUrl).mockReturnValue(cached);
    markGestureSessionPhotoDisplayReady('a');

    const { result } = renderHook(() => useGestureImagePrefetch(queue, 0, 'token'));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.src).toBe(cached);
    expect(result.current.error).toBeNull();
    assertReadyImpliesVisibleSrc(result.current);
    expect(preloadGestureImageViaElement).not.toHaveBeenCalled();
  });

  it('does not report ready until preload completes for a fresh photo', async () => {
    let resolvePreload: (() => void) | undefined;
    vi.mocked(preloadGestureImageViaElement).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePreload = resolve;
        }),
    );

    const { result } = renderHook(() => useGestureImagePrefetch(queue, 0, 'token'));

    await waitFor(() =>
      expect(resolveGestureSessionImageSrc).toHaveBeenCalledWith(
        'token',
        'a',
        'https://example.com/thumb.jpg',
        'A.jpg',
      ),
    );

    expect(result.current.ready).toBe(false);
    expect(result.current.src).toBeNull();
    assertReadyImpliesVisibleSrc(result.current);

    resolvePreload?.();
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.src).toBe('https://example.com/display.jpg');
    assertReadyImpliesVisibleSrc(result.current);
  });

  it('reports error and stays not-ready when preload fails', async () => {
    vi.mocked(preloadGestureImageViaElement).mockRejectedValue(new Error('decode failed'));

    const { result } = renderHook(() => useGestureImagePrefetch(queue, 0, 'token'));

    await waitFor(() => expect(result.current.error).toBe('Could not load image.'));
    expect(result.current.ready).toBe(false);
    expect(result.current.src).toBeNull();
    assertReadyImpliesVisibleSrc(result.current);
  });

  it('keeps the photo visible when the queue array is recreated with the same ids', async () => {
    const cached = 'https://example.com/cached-a.jpg';
    vi.mocked(getCachedGestureImageUrl).mockReturnValue(cached);
    markGestureSessionPhotoDisplayReady('a');

    const { result, rerender } = renderHook(
      ({ q, index, token }: { q: SessionQueueItem[]; index: number; token: string | null }) =>
        useGestureImagePrefetch(q, index, token),
      { initialProps: { q: queue, index: 0, token: 'token' } },
    );

    await waitFor(() => expect(result.current.ready).toBe(true));

    rerender({
      q: [{ driveFileId: 'a', packId: 'p1', name: 'A.jpg' }],
      index: 0,
      token: 'token',
    });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.src).toBe(cached);
    assertReadyImpliesVisibleSrc(result.current);
  });

  it('retains previous, current, and next prefetch keys in the session window', async () => {
    renderHook(() => useGestureImagePrefetch(queue, 0, 'token'));

    await waitFor(() =>
      expect(retainGesturePrefetchKeys).toHaveBeenCalledWith(['a', 'b']),
    );
  });

  it('includes the previous photo in the prefetch window when navigating back', async () => {
    renderHook(() => useGestureImagePrefetch(queue, 1, 'token'));

    await waitFor(() =>
      expect(retainGesturePrefetchKeys).toHaveBeenCalledWith(['a', 'b']),
    );
  });

  it('stays display-ready when access token arrives after cache hit', async () => {
    const cached = 'https://example.com/cached-a.jpg';
    vi.mocked(getCachedGestureImageUrl).mockReturnValue(cached);
    markGestureSessionPhotoDisplayReady('a');

    const { result, rerender } = renderHook(
      ({ token }: { token: string | null }) => useGestureImagePrefetch(queue, 0, token),
      { initialProps: { token: null as string | null } },
    );

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.src).toBe(cached);

    rerender({ token: 'fresh-token' });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.src).toBe(cached);
    assertReadyImpliesVisibleSrc(result.current);
  });
});
