import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DrumAccompaniment from './DrumAccompaniment';

describe('DrumAccompaniment playback highlighting', () => {
  it('advances mini notation highlight as currentBeatTime progresses', async () => {
    const view = render(
      <DrumAccompaniment
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying
        currentBeatTime={0}
        currentBeat={0}
        notationValue="D-D-__T-D---T---"
        onNotationValueChange={() => {}}
        hidePatternInput
        audioEnabled={false}
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    await waitFor(() => {
      expect(view.container.querySelector('svg')).toBeInTheDocument();
    });

    const highlightedAtStart = view.container.querySelector('[data-highlighted="true"]');
    expect(highlightedAtStart).toBeInTheDocument();

    view.rerender(
      <DrumAccompaniment
        bpm={80}
        timeSignature={{ numerator: 4, denominator: 4 }}
        isPlaying
        currentBeatTime={0.5}
        currentBeat={0}
        notationValue="D-D-__T-D---T---"
        onNotationValueChange={() => {}}
        hidePatternInput
        audioEnabled={false}
        notationStyle={{ inkColor: '#1a1a1a', highlightColor: '#7c3aed' }}
      />,
    );

    await waitFor(() => {
      const highlighted = view.container.querySelector('[data-highlighted="true"]');
      expect(highlighted).toBeInTheDocument();
      expect(highlighted).not.toBe(highlightedAtStart);
    });
  });
});
