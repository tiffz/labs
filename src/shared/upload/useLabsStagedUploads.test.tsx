// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LabsStagedUploadPanel } from './LabsStagedUploadPanel';
import {
  canConfirmStagedUploads,
  formatStagedUploadSize,
  resolveStagedUpload,
  stageSources,
  stagedSourceName,
  type LabsStagedUploadInspection,
  type LabsStagedUploadSource,
} from './stagedUploads';
import { useLabsStagedUploads } from './useLabsStagedUploads';

type Plan = { kind: 'test' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const ok = (name: string): LabsStagedUploadInspection<Plan> => ({
  ok: true,
  name,
  mimeType: 'audio/mpeg',
  sizeBytes: 2048,
  outcome: 'Saved on this device',
  plan: { kind: 'test' },
});

const file = (name: string) => new File(['x'], name, { type: 'audio/mpeg' });

describe('staged upload model', () => {
  it('ignores a check that finishes after its item was removed', () => {
    const { items } = stageSources<Plan>([], [{ kind: 'file', file: file('a.mp3') }], () => 'a');
    const afterRemove = items.filter((i) => i.id !== 'a');
    expect(resolveStagedUpload(afterRemove, 'a', ok('a.mp3'))).toEqual([]);
  });

  it('offers confirm only once every item is checked and one can be added', () => {
    const { items } = stageSources<Plan>(
      [],
      [
        { kind: 'file', file: file('a.mp3') },
        { kind: 'link', url: 'https://drive.google.com/file/d/x' },
      ],
      (() => {
        let n = 0;
        return () => `id${n++}`;
      })(),
    );
    expect(canConfirmStagedUploads(items)).toBe(false);
    const oneReady = resolveStagedUpload(items, 'id0', ok('a.mp3'));
    expect(canConfirmStagedUploads(oneReady)).toBe(false); // the link is still checking
    const linkRejected = resolveStagedUpload(oneReady, 'id1', { ok: false, name: 'x', message: 'nope' });
    expect(canConfirmStagedUploads(linkRejected)).toBe(true);
    const allRejected = resolveStagedUpload(items, 'id0', { ok: false, name: 'a', message: 'nope' });
    expect(canConfirmStagedUploads(resolveStagedUpload(allRejected, 'id1', { ok: false, name: 'x', message: 'no' }))).toBe(
      false,
    );
  });

  it('never prints an unknown size as zero', () => {
    expect(formatStagedUploadSize(null)).toBeNull();
    expect(formatStagedUploadSize(0)).toBe('0 B');
    expect(formatStagedUploadSize(1536)).toBe('1.5 KB');
    expect(formatStagedUploadSize(25 * 1024 * 1024)).toBe('25 MB');
  });
});

describe('useLabsStagedUploads', () => {
  it('stages without committing, and commits only the ready items on confirm', async () => {
    const commit = vi.fn(async () => {});
    const inspect = vi.fn(async (source: LabsStagedUploadSource) =>
      source.kind === 'file' ? ok(source.file.name) : ({ ok: false, name: stagedSourceName(source), message: 'Not a file' } as const),
    );
    const { result } = renderHook(() => useLabsStagedUploads<Plan>({ inspect }));

    await act(async () => {
      result.current.stageFiles([file('a.mp3')]);
      result.current.stageLink('https://example.com/x');
    });
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.items.map((i) => i.status)).toEqual(['ready', 'rejected']);

    await act(async () => {
      await result.current.confirm(commit);
    });
    expect(commit).toHaveBeenCalledTimes(1);
    expect((commit.mock.calls[0] as unknown[])[0]).toEqual([expect.objectContaining({ name: 'a.mp3', status: 'ready' })]);
    expect(result.current.items).toEqual([]);
  });

  it('keeps the list when the commit fails, so the user can retry', async () => {
    const { result } = renderHook(() => useLabsStagedUploads<Plan>({ inspect: async () => ok('a.mp3') }));
    await act(async () => result.current.stageFiles([file('a.mp3')]));
    await act(async () => {
      await expect(
        result.current.confirm(async () => {
          throw new Error('offline');
        }),
      ).rejects.toThrow('offline');
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.committing).toBe(false);
  });

  it('turns a check that throws into a rejected row instead of a stuck spinner', async () => {
    const { result } = renderHook(() =>
      useLabsStagedUploads<Plan>({
        inspect: async () => {
          throw new Error('boom');
        },
      }),
    );
    await act(async () => result.current.stageFiles([file('a.mp3')]));
    expect(result.current.items[0]).toMatchObject({ status: 'rejected', message: expect.stringMatching(/Couldn't check/) });
  });

  it('does not resurrect an item removed while it was being checked', async () => {
    const check = deferred<LabsStagedUploadInspection<Plan>>();
    const { result } = renderHook(() => useLabsStagedUploads<Plan>({ inspect: () => check.promise }));
    act(() => result.current.stageFiles([file('a.mp3')]));
    act(() => result.current.remove(result.current.items[0]!.id));
    await act(async () => check.resolve(ok('a.mp3')));
    expect(result.current.items).toEqual([]);
  });
});

describe('LabsStagedUploadPanel', () => {
  function Harness({ inspect, onConfirm }: { inspect: () => Promise<LabsStagedUploadInspection<Plan>>; onConfirm: () => void }) {
    const staged = useLabsStagedUploads<Plan>({ inspect });
    return (
      <>
        <button type="button" onClick={() => staged.stageFiles([file('Demo.mp3')])}>
          stage
        </button>
        <LabsStagedUploadPanel
          staged={staged}
          onConfirm={onConfirm}
          confirmLabel={(n) => (n === 1 ? 'Add take' : `Add ${n} takes`)}
        />
      </>
    );
  }

  it('renders nothing until something is staged', () => {
    render(<Harness inspect={async () => ok('Demo.mp3')} onConfirm={() => {}} />);
    expect(screen.queryByRole('region', { name: 'Ready to add' })).toBeNull();
  });

  it('shows what will happen, and holds the confirm button while checking', async () => {
    const check = deferred<LabsStagedUploadInspection<Plan>>();
    const onConfirm = vi.fn();
    render(<Harness inspect={() => check.promise} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('stage'));

    expect(screen.getByText('Checking…')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Add take' }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => check.resolve(ok('Demo.mp3')));
    expect(screen.getByText('Saved on this device · 2.0 KB')).toBeTruthy();
    const confirm = screen.getByRole('button', { name: 'Add take' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('removes one item, and Cancel clears them all', async () => {
    render(<Harness inspect={async () => ok('Demo.mp3')} onConfirm={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByText('stage'));
      fireEvent.click(screen.getByText('stage'));
    });
    expect(screen.getAllByRole('button', { name: 'Remove Demo.mp3' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove Demo.mp3' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Remove Demo.mp3' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('region', { name: 'Ready to add' })).toBeNull();
  });
});

describe('useLabsStagedUploads partial commits', () => {
  it('removes what was written and keeps what failed, with its reason', async () => {
    const { result } = renderHook(() =>
      useLabsStagedUploads<Plan>({
        inspect: async (source) => ok(stagedSourceName(source)),
      }),
    );
    await act(async () => result.current.stageFiles([file('a.mp3'), file('b.mp3')]));
    const [a] = result.current.items;
    await act(async () => {
      await result.current.confirm(async () => ({ failed: [{ id: a!.id, message: 'Drive is full.' }] }));
    });
    expect(result.current.items).toEqual([
      expect.objectContaining({ name: 'a.mp3', status: 'rejected', message: 'Drive is full.' }),
    ]);
    // A failed item is not ready, so confirming again cannot re-send it by accident.
    expect(result.current.canConfirm).toBe(false);
  });
});

describe('LabsStagedUploadPanel with many items', () => {
  function ManyHarness({ count }: { count: number }) {
    const staged = useLabsStagedUploads<Plan>({
      inspect: async (source) =>
        source.kind === 'file' && source.file.name.endsWith('.txt')
          ? { ok: false, name: source.file.name, message: 'Not a photo' }
          : { ...ok(source.kind === 'file' ? source.file.name : 'x'), sizeBytes: 1024 },
    });
    return (
      <>
        <button
          type="button"
          onClick={() =>
            staged.stageFiles([
              ...Array.from({ length: count }, (_, i) => file(`IMG_${i}.jpg`)),
              new File(['x'], 'notes.txt', { type: 'text/plain' }),
            ])
          }
        >
          stage
        </button>
        <LabsStagedUploadPanel staged={staged} onConfirm={() => {}} confirmLabel={(n) => `Upload ${n} photos`} itemNoun="photo" />
      </>
    );
  }

  it('summarises a large batch on one line, and can show every row', async () => {
    render(<ManyHarness count={12} />);
    await act(async () => fireEvent.click(screen.getByText('stage')));
    expect(screen.getByText("12 photos · 12 KB · 1 can't be added")).toBeTruthy();
    expect(screen.queryByText('IMG_0.jpg')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByText('IMG_0.jpg')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload 12 photos' })).toBeTruthy();
  });

  it('lists rows when the batch is small', async () => {
    render(<ManyHarness count={3} />);
    await act(async () => fireEvent.click(screen.getByText('stage')));
    expect(screen.getByText('IMG_0.jpg')).toBeTruthy();
  });
});
