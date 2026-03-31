import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import ChordScoreRenderer from './ChordScoreRenderer';
import type { ChordProgressionState } from '../types';

const baseState: ChordProgressionState = {
  progression: {
    name: 'Regression',
    progression: ['IV', 'V', 'I', 'V'],
  },
  key: 'D',
  tempo: 120,
  timeSignature: { numerator: 12, denominator: 8 },
  stylingStrategy: 'one-per-beat',
  voicingOptions: {
    useInversions: false,
    useOpenVoicings: false,
    randomizeOctaves: false,
  },
  soundType: 'piano',
  measuresPerChord: 1,
};

describe('ChordScoreRenderer', () => {
  it('avoids standalone flag glyphs in 12/8 one-per-beat rendering', async () => {
    const { container } = render(<ChordScoreRenderer state={baseState} />);

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    // Regression guard: this mode should render beamed groups without orphan flag glyphs.
    const flagLikeNodes = container.querySelectorAll(
      '.vf-flag, [class*="vf-flag"], g.flag, [class*="flag"]'
    );
    expect(flagLikeNodes.length).toBe(0);
  });

  it('renders beam groups for 12/8 one-per-beat patterns', async () => {
    const { container } = render(<ChordScoreRenderer state={baseState} />);

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    const beamNodes = container.querySelectorAll('.vf-beam, [class*="vf-beam"]');
    expect(beamNodes.length).toBeGreaterThan(0);
  });
});

