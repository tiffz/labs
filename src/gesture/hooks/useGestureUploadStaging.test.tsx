// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGestureUploadStaging } from './useGestureUploadStaging';

type Job = { files: File[]; suggestedFolderName?: string };
const photo = (name: string) => new File([new Uint8Array(1024)], name, { type: 'image/jpeg' });

function setup() {
  const enqueueJobs = vi.fn(async () => {});
  const addToCollectionNow = vi.fn(async () => {});
  const hook = renderHook(() =>
    useGestureUploadStaging<Job>({
      jobName: (job) => job.suggestedFolderName ?? 'New collection',
      enqueueJobs,
      addToCollectionNow,
    }),
  );
  return { hook, enqueueJobs, addToCollectionNow };
}

describe('useGestureUploadStaging', () => {
  it('stages a collection as one ready row and uploads nothing until confirm', async () => {
    // Plans used to be keyed by the file array, which staging copies, so every row read
    // "Pick these photos again." and could not be confirmed.
    const { hook, enqueueJobs } = setup();
    const job = { files: [photo('a.jpg'), photo('b.jpg')], suggestedFolderName: 'Paris trip' };
    await act(async () => hook.result.current.stageNewCollections([job]));
    const { container } = render(hook.result.current.panel);
    expect(container.textContent).toContain('Paris trip');
    expect(container.textContent).toContain('New collection · 2 photos');
    expect(enqueueJobs).not.toHaveBeenCalled();
  });

  it('uploads photos dropped onto a collection at once, with no confirm', async () => {
    const { hook, addToCollectionNow } = setup();
    const files = [photo('c.jpg')];
    await act(async () => hook.result.current.saveAddToCollection('pack-1', 'Hands', files));
    expect(addToCollectionNow).toHaveBeenCalledWith('pack-1', files);
    const { container } = render(hook.result.current.panel);
    expect(container.textContent).toBe('');
  });

  it('uploads a dropped folder as a new collection at once', async () => {
    const { hook, enqueueJobs } = setup();
    const job = { files: [photo('a.jpg')], suggestedFolderName: 'Paris trip' };
    await act(async () => hook.result.current.saveNewCollections([job]));
    expect(enqueueJobs).toHaveBeenCalledWith([job]);
  });
});
