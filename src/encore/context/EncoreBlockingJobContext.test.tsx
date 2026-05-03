import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EncoreBlockingJobProvider,
  useEncoreBlockingJobs,
  type EncoreBlockingJobsApi,
} from './EncoreBlockingJobContext';

function CaptureApi(props: { onApi: (api: EncoreBlockingJobsApi) => void }) {
  const api = useEncoreBlockingJobs();
  props.onApi(api);
  return null;
}

function renderProvider() {
  let api: EncoreBlockingJobsApi | null = null;
  render(
    <EncoreBlockingJobProvider>
      <CaptureApi onApi={(a) => (api = a)} />
    </EncoreBlockingJobProvider>,
  );
  if (!api) throw new Error('API not captured');
  return api as EncoreBlockingJobsApi;
}

describe('EncoreBlockingJobProvider', () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventSpy = vi.spyOn(window, 'addEventListener');
    removeEventSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventSpy.mockRestore();
    removeEventSpy.mockRestore();
  });

  it('withBlockingJob resolves with the function result and removes the job afterwards', async () => {
    const api = renderProvider();
    let resolveFn!: (v: number) => void;
    const promise = new Promise<number>((resolve) => {
      resolveFn = resolve;
    });
    let outcome: Promise<number>;
    await act(async () => {
      outcome = api.withBlockingJob('Doing thing', () => promise);
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Doing thing');
    await act(async () => {
      resolveFn(42);
    });
    await expect(outcome!).resolves.toBe(42);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('withBlockingJob propagates rejection but still removes the job', async () => {
    const api = renderProvider();
    let rejectFn!: (e: Error) => void;
    const promise = new Promise<never>((_resolve, reject) => {
      rejectFn = reject;
    });
    let outcome!: Promise<unknown>;
    await act(async () => {
      outcome = api.withBlockingJob('Failing thing', () => promise);
      // attach a no-op catch immediately so the rejection is "handled" before unhandledRejection fires
      outcome.catch(() => undefined);
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Failing thing');
    await act(async () => {
      rejectFn(new Error('boom'));
    });
    await expect(outcome).rejects.toThrow('boom');
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('shows the job label and updates progress for a determinate job', async () => {
    const api = renderProvider();
    let setP!: (p: number | null) => void;
    let resolveFn!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });
    await act(async () => {
      void api.withBlockingJob('Uploading 1 of 3', (p) => {
        setP = p;
        return promise;
      });
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Uploading 1 of 3');
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    await act(async () => {
      setP(0.5);
    });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    await act(async () => {
      resolveFn();
    });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('collapses to "N background tasks" when multiple jobs are running', async () => {
    const api = renderProvider();
    let resolveA!: () => void;
    let resolveB!: () => void;
    const a = new Promise<void>((r) => {
      resolveA = r;
    });
    const b = new Promise<void>((r) => {
      resolveB = r;
    });
    await act(async () => {
      void api.withBlockingJob('A', () => a);
      void api.withBlockingJob('B', () => b);
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('2 background tasks');
    await act(async () => {
      resolveA();
    });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('B'));
    await act(async () => {
      resolveB();
    });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('registers a beforeunload listener only while jobs are non-empty', async () => {
    const api = renderProvider();
    const beforeUnloadAddCount = () =>
      addEventSpy.mock.calls.filter((c) => c[0] === 'beforeunload').length;
    const beforeUnloadRemoveCount = () =>
      removeEventSpy.mock.calls.filter((c) => c[0] === 'beforeunload').length;

    expect(beforeUnloadAddCount()).toBe(0);

    let resolveFn!: () => void;
    const promise = new Promise<void>((r) => {
      resolveFn = r;
    });
    await act(async () => {
      void api.withBlockingJob('Job', () => promise);
      await Promise.resolve();
    });
    expect(beforeUnloadAddCount()).toBeGreaterThanOrEqual(1);
    expect(beforeUnloadRemoveCount()).toBe(0);

    await act(async () => {
      resolveFn();
    });
    await waitFor(() => expect(beforeUnloadRemoveCount()).toBeGreaterThanOrEqual(1));
  });

  it('silent jobs do not arm beforeunload or render the snackbar', async () => {
    const api = renderProvider();
    const beforeUnloadAddCount = () =>
      addEventSpy.mock.calls.filter((c) => c[0] === 'beforeunload').length;

    expect(beforeUnloadAddCount()).toBe(0);

    let resolveFn!: () => void;
    const promise = new Promise<void>((r) => {
      resolveFn = r;
    });
    await act(async () => {
      void api.withBlockingJob('Saving to Drive…', () => promise, { silent: true });
      await Promise.resolve();
    });

    expect(beforeUnloadAddCount()).toBe(0);
    expect(screen.queryByRole('status')).toBeNull();

    await act(async () => {
      resolveFn();
    });
  });

  it('mixing silent + loud jobs shows only the loud one in the snackbar', async () => {
    const api = renderProvider();
    let resolveLoud!: () => void;
    let resolveSilent!: () => void;
    const loud = new Promise<void>((r) => {
      resolveLoud = r;
    });
    const silent = new Promise<void>((r) => {
      resolveSilent = r;
    });
    await act(async () => {
      void api.withBlockingJob('Loud job', () => loud);
      void api.withBlockingJob('Silent job', () => silent, { silent: true });
      await Promise.resolve();
    });
    // Should see only the loud label, NOT "2 background tasks".
    expect(screen.getByRole('status')).toHaveTextContent('Loud job');
    expect(screen.queryByText(/background tasks/)).toBeNull();
    await act(async () => {
      resolveLoud();
      resolveSilent();
    });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('exposes role="status" and aria-live="polite" on the snackbar so screen readers hear updates', async () => {
    const api = renderProvider();
    let resolveFn!: () => void;
    await act(async () => {
      void api.withBlockingJob('Saving', () => new Promise<void>((r) => (resolveFn = r)));
      await Promise.resolve();
    });
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    await act(async () => {
      resolveFn();
    });
  });
});
