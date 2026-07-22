import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EncorePerformance } from '../../types';
import { PerformanceVideoPlayableThumb } from './PerformanceVideoPlayableThumb';

const performance: EncorePerformance = {
  id: 'perf-1',
  songId: 'song-1',
  date: '2026-06-01',
  venueTag: 'Club',
  externalVideoUrl: 'https://www.youtube.com/watch?v=abc123',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('PerformanceVideoPlayableThumb', () => {
  it('plays when the thumbnail overlay is clicked', () => {
    const onPlay = vi.fn();
    render(
      <PerformanceVideoPlayableThumb
        performance={performance}
        width={72}
        playProps={{ onPlay }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Play video' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('shows pause label when the clip is already playing', () => {
    render(
      <PerformanceVideoPlayableThumb
        performance={performance}
        width={72}
        playProps={{ onPlay: vi.fn(), isPlaying: true }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Pause video' })).toBeInTheDocument();
  });
});
