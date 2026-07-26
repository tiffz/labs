import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAudioBreadcrumbTrail,
  readAudioBreadcrumbTrail,
  recordAudioBreadcrumb,
  summarizeAudioBreadcrumbTrail,
} from './audioPlaybackBreadcrumb';
import type { AudioDiagnosticsSnapshot } from './audioDiagnostics';

function snap(voices: number, heapMB: number | null): AudioDiagnosticsSnapshot {
  return { voices, buses: 0, sources: 0, callbacks: 0, instruments: 1, schedulers: 1, heapMB };
}

afterEach(() => clearAudioBreadcrumbTrail());

describe('audioPlaybackBreadcrumb', () => {
  it('persists samples to localStorage (survives an in-page state loss)', () => {
    recordAudioBreadcrumb(snap(3, 100));
    recordAudioBreadcrumb(snap(5, 110));
    // Fresh read (no in-memory state) — the trail comes back from localStorage.
    const trail = readAudioBreadcrumbTrail();
    expect(trail).toHaveLength(2);
    expect(trail[0].voices).toBe(3);
    expect(trail[1].heapMB).toBe(110);
  });

  it('bounds the ring so a long session cannot grow unbounded', () => {
    for (let i = 0; i < 400; i += 1) recordAudioBreadcrumb(snap(i, 100 + i));
    const trail = readAudioBreadcrumbTrail();
    expect(trail.length).toBeLessThanOrEqual(240);
    // Keeps the most-recent samples (the ones nearest a crash).
    expect(trail[trail.length - 1].voices).toBe(399);
  });

  it('summarizes the heap-growth leak signature', () => {
    recordAudioBreadcrumb(snap(2, 100));
    recordAudioBreadcrumb(snap(200, 250));
    recordAudioBreadcrumb(snap(400, 500));
    const s = summarizeAudioBreadcrumbTrail();
    expect(s.samples).toBe(3);
    expect(s.heapStartMB).toBe(100);
    expect(s.heapPeakMB).toBe(500);
    expect(s.heapGrowthMB).toBe(400);
    expect(s.voicesPeak).toBe(400);
  });

  it('never throws when localStorage misbehaves (best-effort under OOM)', () => {
    // A malformed value must not crash reads.
    localStorage.setItem('labs:audio-breadcrumb-v1', 'not json');
    expect(() => readAudioBreadcrumbTrail()).not.toThrow();
    expect(readAudioBreadcrumbTrail()).toEqual([]);
    expect(() => recordAudioBreadcrumb(snap(1, 100))).not.toThrow();
  });
});
