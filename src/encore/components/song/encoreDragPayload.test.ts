import { describe, expect, it } from 'vitest';
import {
  dataTransferHasPerformanceVideoFile,
  eligibleSlotsForDragDataTransfer,
  isPerformanceVideoFileDrag,
} from './encoreDragPayload';

function mockDataTransfer(files: File[]): DataTransfer {
  return {
    types: ['Files'],
    files: Object.assign(files, { length: files.length }),
    items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
  } as unknown as DataTransfer;
}

describe('encoreDragPayload performance routing', () => {
  it('detects performance video file drags', () => {
    const dt = mockDataTransfer([new File(['x'], 'clip.mp4', { type: 'video/mp4' })]);
    expect(isPerformanceVideoFileDrag(dt)).toBe(true);
    expect(dataTransferHasPerformanceVideoFile(dt)).toBe(true);
  });

  it('excludes performance videos from media-hub slots when performance surface is active', () => {
    const dt = mockDataTransfer([new File(['x'], 'clip.mp4', { type: 'video/mp4' })]);
    const slots = eligibleSlotsForDragDataTransfer(dt, { performanceSurfaceActive: true });
    expect(slots).toBeNull();
  });

  it('still offers takes/listen slots for performance videos on generic surfaces', () => {
    const dt = mockDataTransfer([new File(['x'], 'clip.mp4', { type: 'video/mp4' })]);
    const slots = eligibleSlotsForDragDataTransfer(dt);
    expect(slots?.has('takes')).toBe(true);
    expect(slots?.has('listen')).toBe(true);
  });
});
