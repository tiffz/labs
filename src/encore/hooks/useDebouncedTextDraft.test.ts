// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedTextDraft } from './useDebouncedTextDraft';

describe('useDebouncedTextDraft', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('publishes once after the typing settles, not once per keystroke', () => {
    const publish = vi.fn();
    const { result } = renderHook(() => useDebouncedTextDraft('', publish, { delayMs: 220 }));

    let typed = '';
    for (const ch of 'abcdef') {
      typed += ch;
      act(() => result.current.setDraft(typed));
    }
    expect(publish).not.toHaveBeenCalled();
    expect(result.current.draft).toBe('abcdef');

    act(() => void vi.advanceTimersByTime(220));
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith('abcdef');
  });

  it('flush publishes immediately', () => {
    const publish = vi.fn();
    const { result } = renderHook(() => useDebouncedTextDraft('', publish));
    act(() => result.current.setDraft('Mercy'));
    act(() => result.current.flush());
    expect(publish).toHaveBeenCalledWith('Mercy');
  });

  // The data-safety case. A title typed and then navigated away from inside the debounce
  // window has no other copy — discarding the timer loses it silently.
  it('flushes pending text on unmount by default', () => {
    const publish = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedTextDraft('', publish));
    act(() => result.current.setDraft('Half Written Song'));
    expect(publish).not.toHaveBeenCalled();

    unmount();
    expect(publish).toHaveBeenCalledWith('Half Written Song');
  });

  it('discards pending text on unmount when asked (ephemeral UI state)', () => {
    const publish = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedTextDraft('', publish, { flushOnUnmount: false }),
    );
    act(() => result.current.setDraft('search text'));
    unmount();
    expect(publish).not.toHaveBeenCalled();
  });

  it('accepts a new value pushed from outside (undo, loading another song)', () => {
    const publish = vi.fn();
    const { result, rerender } = renderHook(
      ({ external }) => useDebouncedTextDraft(external, publish),
      { initialProps: { external: 'First' } },
    );
    act(() => result.current.setDraft('typed'));
    rerender({ external: 'Restored By Undo' });
    expect(result.current.draft).toBe('Restored By Undo');

    // The superseded keystrokes must not land after the external change.
    act(() => void vi.advanceTimersByTime(500));
    expect(publish).not.toHaveBeenCalled();
  });

  it('ignores the parent echoing our own published value back', () => {
    const publish = vi.fn();
    const { result, rerender } = renderHook(
      ({ external }) => useDebouncedTextDraft(external, publish),
      { initialProps: { external: '' } },
    );
    act(() => result.current.setDraft('Echo'));
    act(() => void vi.advanceTimersByTime(220));
    expect(publish).toHaveBeenCalledTimes(1);

    rerender({ external: 'Echo' });
    expect(result.current.draft).toBe('Echo');
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
