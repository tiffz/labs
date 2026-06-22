import { describe, expect, it } from 'vitest';
import { compareOriginalsForDashboardQueue, sortOriginalsForDashboardQueue } from './originalsSongDashboardSort';
import { createBlankOriginalSong, type EncoreOriginalSong } from './types';

function songWith(
  patch: Partial<EncoreOriginalSong> & Pick<EncoreOriginalSong, 'id' | 'updatedAt'>,
): EncoreOriginalSong {
  return { ...createBlankOriginalSong(), ...patch };
}

describe('originalsSongDashboardSort', () => {
  it('sorts pending before demo-ready and least complete first', () => {
    const pending = songWith({
      id: 'pending',
      updatedAt: '2026-06-21T12:00:00.000Z',
      lyricsAndChords: '[Verse]\nHello',
    });
    const demoReady = songWith({
      id: 'ready',
      updatedAt: '2026-06-20T12:00:00.000Z',
      lyricsAndChords: '[Verse]\n[C]Hello world',
      brainstormHtml: '<p>notes</p>',
      takes: [
        {
          id: 't1',
          label: 'Demo',
          timestamp: Date.parse('2026-06-20T12:00:00.000Z'),
          source: 'recorded',
        },
      ],
    });
    const barelyStarted = songWith({ id: 'blank', updatedAt: '2026-06-22T12:00:00.000Z' });

    expect(compareOriginalsForDashboardQueue(barelyStarted, pending)).toBeLessThan(0);
    expect(compareOriginalsForDashboardQueue(pending, demoReady)).toBeLessThan(0);

    const sorted = sortOriginalsForDashboardQueue([demoReady, barelyStarted, pending]);
    expect(sorted.map((s) => s.id)).toEqual(['blank', 'pending', 'ready']);
  });

  it('puts oldest demo-ready originals last within the finished group', () => {
    const demoReadyBase = {
      lyricsAndChords: '[Verse]\n[C]Hi there world',
      brainstormHtml: '<p>notes</p>',
      takes: [
        {
          id: 't1',
          label: 'Demo',
          timestamp: Date.parse('2026-06-01T12:00:00.000Z'),
          source: 'recorded' as const,
        },
      ],
    };
    const older = songWith({
      id: 'older',
      updatedAt: '2026-06-01T12:00:00.000Z',
      ...demoReadyBase,
    });
    const newer = songWith({
      id: 'newer',
      updatedAt: '2026-06-15T12:00:00.000Z',
      ...demoReadyBase,
      takes: [
        {
          id: 't2',
          label: 'Demo',
          timestamp: Date.parse('2026-06-15T12:00:00.000Z'),
          source: 'recorded',
        },
      ],
    });

    expect(sortOriginalsForDashboardQueue([older, newer]).map((s) => s.id)).toEqual(['newer', 'older']);
  });
});
