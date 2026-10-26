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

  it('names the collection photos are added to', async () => {
    const { hook } = setup();
    await act(async () => hook.result.current.stageAddToCollection('pack-1', 'Hands', [photo('c.jpg')]));
    const { container } = render(hook.result.current.panel);
    expect(container.textContent).toContain('Adds 1 photo to "Hands"');
  });
});
