import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LABS_DRIVE_AUTO_PULL_INTERVAL_MS,
  LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS,
  LABS_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS,
  LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS,
} from './labsDrivePortfolioBackupConstants';
import { useLabsDrivePortfolioAutoSync } from './useLabsDrivePortfolioAutoSync';

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useLabsDrivePortfolioAutoSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function baseOptions(overrides: Partial<Parameters<typeof useLabsDrivePortfolioAutoSync>[0]> = {}) {
    return {
      enabled: true,
      allowAutoPush: () => true,
      pullFromDriveAndMerge: vi.fn().mockResolvedValue({}),
      flushDriveWrite: vi.fn().mockResolvedValue(undefined),
      isMergeInProgress: () => false,
      onAutoPullError: vi.fn(),
      onAutoPushError: vi.fn(),
      subscribeLocalChanges: () => () => {},
      ...overrides,
    };
  }

  it('runs one silent auto-pull per enabled session', async () => {
    const pull = vi.fn().mockResolvedValue({});
    const { rerender } = renderHook(
      ({ enabled }) => useLabsDrivePortfolioAutoSync(baseOptions({ enabled, pullFromDriveAndMerge: pull })),
      { initialProps: { enabled: true } },
    );

    await flushPromises();
    expect(pull).toHaveBeenCalledOnce();
    expect(pull).toHaveBeenCalledWith({ silent: true });

    rerender({ enabled: true });
    await flushPromises();
    expect(pull).toHaveBeenCalledOnce();
  });

  it('does not auto-pull when disabled', async () => {
    const pull = vi.fn().mockResolvedValue({});
    renderHook(() => useLabsDrivePortfolioAutoSync(baseOptions({ enabled: false, pullFromDriveAndMerge: pull })));
    await flushPromises();
    expect(pull).not.toHaveBeenCalled();
  });

  it('reports auto-pull failures', async () => {
    const onAutoPullError = vi.fn();
    renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({
          onAutoPullError,
          pullFromDriveAndMerge: vi.fn().mockRejectedValue(new Error('offline')),
        }),
      ),
    );
    await flushPromises();
    expect(onAutoPullError).toHaveBeenCalledOnce();
    expect(onAutoPullError.mock.calls[0]?.[0]).toBe('offline');
  });

  it('calls afterSilentAutoPull with pull result', async () => {
    const afterSilentAutoPull = vi.fn().mockResolvedValue(undefined);
    const pull = vi.fn().mockResolvedValue({ conflictPrompt: true });
    renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({ pullFromDriveAndMerge: pull, afterSilentAutoPull }),
      ),
    );
    await flushPromises();
    expect(afterSilentAutoPull).toHaveBeenCalledWith({ conflictPrompt: true });
  });

  it('debounces auto-push after the first local change notification', async () => {
    let onChange: ((event?: { immediate?: boolean }) => void) | undefined;
    const flush = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({
          flushDriveWrite: flush,
          subscribeLocalChanges: (cb) => {
            onChange = cb;
            return () => {};
          },
        }),
      ),
    );

    await flushPromises();
    expect(onChange).toBeTypeOf('function');

    act(() => onChange?.());
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    expect(flush).not.toHaveBeenCalled();

    act(() => onChange?.());
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    expect(flush).toHaveBeenCalledWith({ silent: true });
  });

  it('auto-pushes on the first local change when immediate is set', async () => {
    let onChange: ((event?: { immediate?: boolean }) => void) | undefined;
    const flush = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({
          flushDriveWrite: flush,
          subscribeLocalChanges: (cb) => {
            onChange = cb;
            return () => {};
          },
        }),
      ),
    );

    await flushPromises();
    act(() => onChange?.({ immediate: true }));
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    expect(flush).toHaveBeenCalledWith({ silent: true });
  });

  it('blocks auto-push while merge is in progress', async () => {
    let onChange: ((event?: { immediate?: boolean }) => void) | undefined;
    const flush = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({
          flushDriveWrite: flush,
          isMergeInProgress: () => true,
          subscribeLocalChanges: (cb) => {
            onChange = cb;
            return () => {};
          },
        }),
      ),
    );

    await flushPromises();
    act(() => onChange?.());
    act(() => onChange?.());
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    expect(flush).not.toHaveBeenCalled();
  });

  it('queues push while gated and flushes after pull unlocks', async () => {
    let onChange: ((event?: { immediate?: boolean }) => void) | undefined;
    let allow = false;
    let resolvePull: (() => void) | undefined;
    const flush = vi.fn().mockResolvedValue(undefined);
    const pull = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePull = () => {
            allow = true;
            resolve();
          };
        }),
    );
    renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({
          allowAutoPush: () => allow,
          flushDriveWrite: flush,
          pullFromDriveAndMerge: pull,
          subscribeLocalChanges: (cb) => {
            onChange = cb;
            return () => {};
          },
        }),
      ),
    );

    // Pull is in flight; edits while still gated should not flush yet.
    await act(async () => {
      await Promise.resolve();
    });
    expect(pull).toHaveBeenCalled();
    act(() => onChange?.({ immediate: true }));
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    expect(flush).not.toHaveBeenCalled();

    await act(async () => {
      resolvePull?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(flush).toHaveBeenCalled();
  });

  it('notifyAutoPushCompleted allows another debounced push', async () => {
    let onChange: ((event?: { immediate?: boolean }) => void) | undefined;
    const flush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({
          flushDriveWrite: flush,
          subscribeLocalChanges: (cb) => {
            onChange = cb;
            return () => {};
          },
        }),
      ),
    );

    await flushPromises();
    act(() => onChange?.());
    act(() => onChange?.());
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    expect(flush).toHaveBeenCalledOnce();

    act(() => result.current.notifyAutoPushCompleted());
    act(() => onChange?.());
    act(() => onChange?.());
    await act(async () => {
      vi.advanceTimersByTime(
        LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS + LABS_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS,
      );
      await Promise.resolve();
    });
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('runs periodic silent pull while enabled and visible', async () => {
    const pull = vi.fn().mockResolvedValue({});
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    renderHook(() => useLabsDrivePortfolioAutoSync(baseOptions({ pullFromDriveAndMerge: pull })));
    await flushPromises();
    expect(pull).toHaveBeenCalledOnce();

    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PULL_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(pull).toHaveBeenCalledTimes(2);
  });

  it('flushes pending debounced push when the tab hides', async () => {
    let onChange: ((event?: { immediate?: boolean }) => void) | undefined;
    const flush = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({
          flushDriveWrite: flush,
          subscribeLocalChanges: (cb) => {
            onChange = cb;
            return () => {};
          },
        }),
      ),
    );

    await flushPromises();
    act(() => onChange?.());
    act(() => onChange?.());
    expect(flush).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flushPromises();
    expect(flush).toHaveBeenCalledWith({ silent: true });
  });

  it('force-pushes after first pull when a persisted needs-push flag survives a tab kill', async () => {
    const persistKey = 'TestApp';
    localStorage.setItem(`labs_drive_needs_push_${persistKey}`, '1');
    try {
      const flush = vi.fn().mockResolvedValue(undefined);
      renderHook(() =>
        useLabsDrivePortfolioAutoSync(baseOptions({ persistKey, flushDriveWrite: flush })),
      );

      await flushPromises();
      expect(flush).toHaveBeenCalledWith({ silent: true });
      // Successful push clears the persisted flag.
      expect(localStorage.getItem(`labs_drive_needs_push_${persistKey}`)).toBeNull();
    } finally {
      localStorage.removeItem(`labs_drive_needs_push_${persistKey}`);
    }
  });

  it('backs off auto-push after a failure and retries once the window passes', async () => {
    let onChange: ((event?: { immediate?: boolean }) => void) | undefined;
    const flush = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const onAutoPushError = vi.fn();
    renderHook(() =>
      useLabsDrivePortfolioAutoSync(
        baseOptions({
          flushDriveWrite: flush,
          onAutoPushError,
          subscribeLocalChanges: (cb) => {
            onChange = cb;
            return () => {};
          },
        }),
      ),
    );
    await flushPromises();

    act(() => onChange?.({ immediate: true }));
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    await flushPromises();
    expect(flush).toHaveBeenCalledOnce();
    expect(onAutoPushError).toHaveBeenCalledOnce();

    // Within the backoff window the retry is skipped.
    act(() => onChange?.({ immediate: true }));
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    await flushPromises();
    expect(flush).toHaveBeenCalledOnce();

    // Past the 30s base backoff the next change flushes again.
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS);
      await Promise.resolve();
    });
    act(() => onChange?.({ immediate: true }));
    await act(async () => {
      vi.advanceTimersByTime(LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
      await Promise.resolve();
    });
    await flushPromises();
    expect(flush).toHaveBeenCalledTimes(2);
  });
});
