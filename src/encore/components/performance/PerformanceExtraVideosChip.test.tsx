import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EncorePerformance } from '../../types';
import { PerformanceExtraVideosChip } from './PerformanceExtraVideosChip';

vi.mock('../../hooks/useEncoreMediaPlaybackHoverProps', () => ({
  useEncoreMediaPlaybackHoverProps: () => ({
    propsForPerformanceVideo: () => ({ onPlay: vi.fn() }),
  }),
}));

const stackedPerformance: EncorePerformance = {
  id: 'perf-1',
  songId: 'song-1',
  date: '2026-06-01',
  venueTag: 'Club',
  videos: [
    { id: 'v1', videoTargetDriveFileId: 'drive-primary' },
    { id: 'v2', externalVideoUrl: 'https://www.youtube.com/watch?v=abc123' },
  ],
  primaryVideoId: 'v1',
};

describe('PerformanceExtraVideosChip', () => {
  it('renders nothing when the performance has one video', () => {
    const { container } = render(
      <PerformanceExtraVideosChip
        performance={{
          ...stackedPerformance,
          videos: [stackedPerformance.videos![0]!],
          primaryVideoId: 'v1',
        }}
        googleAccessToken="token"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens a browse popover listing every clip when the chip is clicked', () => {
    render(<PerformanceExtraVideosChip performance={stackedPerformance} googleAccessToken="token" />);

    fireEvent.click(screen.getByRole('button', { name: '+1 video' }));

    expect(screen.getByText('2 videos')).toBeInTheDocument();
    expect(screen.getByText('Play or open any clip from this performance.')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Play video|Pause video/)).toHaveLength(2);
    expect(screen.getAllByLabelText('Primary video').length).toBeGreaterThan(0);
  });

  it('calls onSetPrimaryVideo when make-primary is clicked on a non-primary clip', () => {
    const onSetPrimaryVideo = vi.fn();
    render(
      <PerformanceExtraVideosChip
        performance={stackedPerformance}
        googleAccessToken="token"
        onSetPrimaryVideo={onSetPrimaryVideo}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '+1 video' }));
    fireEvent.click(screen.getByLabelText('Make primary video'));

    expect(onSetPrimaryVideo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'perf-1', primaryVideoId: 'v1' }),
      'v2',
    );
  });
});
