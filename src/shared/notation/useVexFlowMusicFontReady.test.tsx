import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The hook must never draw notation before the Bravura music font is usable —
// that is the cold-load "detached notehead" flash it exists to prevent. These
// tests pin the readiness contract without a real browser font stack.

const ensureVexFlowFontsLoaded = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('./vexFlowFontExport', () => ({ ensureVexFlowFontsLoaded }));

import { useVexFlowMusicFontReady } from './useVexFlowMusicFontReady';

type FakeFace = { family: string; status: string };

function stubDocumentFonts(faces: FakeFace[] | null): void {
  const value =
    faces === null
      ? undefined
      : {
          ready: Promise.resolve(),
          check: () => true,
          [Symbol.iterator]() {
            return faces[Symbol.iterator]();
          },
        };
  Object.defineProperty(document, 'fonts', { value, configurable: true });
}

afterEach(() => {
  ensureVexFlowFontsLoaded.mockClear();
  Reflect.deleteProperty(document, 'fonts');
});

describe('useVexFlowMusicFontReady', () => {
  it('is ready immediately when a loaded Bravura face is already registered', () => {
    stubDocumentFonts([{ family: 'Bravura', status: 'loaded' }]);
    const { result } = renderHook(() => useVexFlowMusicFontReady());
    expect(result.current).toBe(true);
    expect(ensureVexFlowFontsLoaded).not.toHaveBeenCalled();
  });

  it('is not ready when Bravura is registered but still loading, then flips after the font loads', async () => {
    stubDocumentFonts([{ family: 'Bravura', status: 'loading' }]);
    const { result } = renderHook(() => useVexFlowMusicFontReady());
    expect(result.current).toBe(false);
    expect(ensureVexFlowFontsLoaded).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('treats a check() that would fall back to a system font (no Bravura face) as NOT ready', () => {
    // check() returns true here, but with no registered Bravura face that only
    // means it would render with a fallback — the exact detached-notehead state.
    stubDocumentFonts([{ family: 'Roboto', status: 'loaded' }]);
    const { result } = renderHook(() => useVexFlowMusicFontReady());
    expect(result.current).toBe(false);
    expect(ensureVexFlowFontsLoaded).toHaveBeenCalledTimes(1);
  });

  it('renders immediately where the Font Loading API is unavailable (jsdom / SSR)', () => {
    stubDocumentFonts(null);
    const { result } = renderHook(() => useVexFlowMusicFontReady());
    expect(result.current).toBe(true);
    expect(ensureVexFlowFontsLoaded).not.toHaveBeenCalled();
  });
});
