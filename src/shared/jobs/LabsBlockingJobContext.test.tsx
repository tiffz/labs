import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LabsBlockingJobProvider,
  labsBlockingJobsActive,
  useLabsBlockingJobs,
  useLabsBlockingJobsVisible,
  type LabsBlockingJobsApi,
  type LabsBlockingJobHandle,
} from './LabsBlockingJobContext';
import { reportBlockingJobItemProgress } from './labsBlockingJobItemProgress';

function CaptureApi(props: { onApi: (api: LabsBlockingJobsApi) => void }) {
  const api = useLabsBlockingJobs();
  props.onApi(api);
  return null;
}

function CaptureVisible(props: { onVisible: (visible: boolean) => void }) {
  const visible = useLabsBlockingJobsVisible();
  props.onVisible(visible);
  return null;
}

function renderProvider() {
  let api: LabsBlockingJobsApi | null = null;
  let visible = false;
  render(
    <LabsBlockingJobProvider>
      <CaptureApi onApi={(a) => (api = a)} />
      <CaptureVisible onVisible={(v) => (visible = v)} />
    </LabsBlockingJobProvider>,
  );
  if (!api) throw new Error('API not captured');
  return { api: api as LabsBlockingJobsApi, getVisible: () => visible };
}

describe('LabsBlockingJobProvider', () => {
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
    const { api } = renderProvider();
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

  it('updates the job label while running', async () => {
    const { api } = renderProvider();
    let resolveFn!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });
    let handle!: ReturnType<typeof api.startBlockingJob>;
    await act(async () => {
      handle = api.startBlockingJob('Starting…');
      void promise.finally(() => handle.end());
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Starting…');
    await act(async () => {
      handle.updateLabel('Refreshing photos…');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Refreshing photos…');
    await act(async () => {
      resolveFn();
    });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('silent jobs do not arm beforeunload or render the snackbar', async () => {
    const { api } = renderProvider();
    const beforeUnloadAddCount = () =>
      addEventSpy.mock.calls.filter((c: unknown[]) => c[0] === 'beforeunload').length;

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

  it('exposes a progress bar while a job runs', async () => {
    const { api } = renderProvider();
    let resolveFn!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });
    await act(async () => {
      void api.withBlockingJob('Refreshing…', async (setProgress) => {
        setProgress(0.42);
        await promise;
      });
      await Promise.resolve();
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await act(async () => {
      resolveFn();
    });
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
  });

  it('shows complete and remaining counts when the label includes item progress', async () => {
    const { api } = renderProvider();
    let handle!: LabsBlockingJobHandle;
    await act(async () => {
      handle = api.startBlockingJob('Importing 50 PDFs…');
      reportBlockingJobItemProgress(handle, { current: 12, total: 50, detail: 'zine.pdf' });
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Importing 12 of 50… zine.pdf');
    expect(screen.getByText('12 of 50 complete · 38 remaining')).toBeInTheDocument();
    await act(async () => {
      handle.end();
    });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('labsBlockingJobsActive reflects in-flight jobs', async () => {
    expect(labsBlockingJobsActive()).toBe(false);
    const { api } = renderProvider();
    let resolveFn!: () => void;
    const promise = new Promise<void>((r) => {
      resolveFn = r;
    });
    await act(async () => {
      void api.withBlockingJob('Working…', () => promise);
      await Promise.resolve();
    });
    expect(labsBlockingJobsActive()).toBe(true);
    await act(async () => {
      resolveFn();
    });
    await waitFor(() => expect(labsBlockingJobsActive()).toBe(false));
  });

  it('useLabsBlockingJobsVisible is true only for non-silent jobs', async () => {
    const { api, getVisible } = renderProvider();
    let resolveSilent!: () => void;
    const silentPromise = new Promise<void>((r) => {
      resolveSilent = r;
    });
    await act(async () => {
      void api.withBlockingJob('Silent sync', () => silentPromise, { silent: true });
      await Promise.resolve();
    });
    expect(getVisible()).toBe(false);
    await act(async () => {
      resolveSilent();
    });
    await waitFor(() => expect(getVisible()).toBe(false));

    let resolveLoud!: () => void;
    const loudPromise = new Promise<void>((r) => {
      resolveLoud = r;
    });
    await act(async () => {
      void api.withBlockingJob('Scanning…', () => loudPromise);
      await Promise.resolve();
    });
    expect(getVisible()).toBe(true);
    await act(async () => {
      resolveLoud();
    });
    await waitFor(() => expect(getVisible()).toBe(false));
  });
});
