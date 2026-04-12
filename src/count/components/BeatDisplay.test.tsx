import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BeatDisplay } from './BeatDisplay';
import type { SubdivisionLevel, VoiceMode } from '../engine/types';

function renderAndGetLabels(props: {
  numerator: number;
  denominator: number;
  beatGrouping?: string;
  subdivisionLevel: SubdivisionLevel;
  voiceMode?: VoiceMode;
}): string[] {
  const { container } = render(
    <BeatDisplay
      currentBeat={null}
      timeSignature={{ numerator: props.numerator, denominator: props.denominator }}
      beatGrouping={props.beatGrouping}
      playing={false}
      perBeatVolumes={Array(32).fill(1.0)}
      onBeatVolumeChange={() => {}}
      subdivisionLevel={props.subdivisionLevel}
      voiceMode={props.voiceMode ?? 'counting'}
    />,
  );
  const cells = container.querySelectorAll('.pulse-beat-label');
  return Array.from(cells).map((el) => el.textContent ?? '');
}

describe('BeatDisplay labels', () => {
  describe('simple /4 time signatures', () => {
    it('4/4 level 1 (quarter note only): 1 2 3 4', () => {
      const labels = renderAndGetLabels({
        numerator: 4, denominator: 4, subdivisionLevel: 1,
      });
      expect(labels).toEqual(['1', '2', '3', '4']);
    });

    it('3/4 level 1 (quarter note only): 1 2 3', () => {
      const labels = renderAndGetLabels({
        numerator: 3, denominator: 4, subdivisionLevel: 1,
      });
      expect(labels).toEqual(['1', '2', '3']);
    });

    it('4/4 level 2: 1 + 2 + 3 + 4 +', () => {
      const labels = renderAndGetLabels({
        numerator: 4, denominator: 4, subdivisionLevel: 2,
      });
      expect(labels).toEqual(['1', '+', '2', '+', '3', '+', '4', '+']);
    });

    it('3/4 level 2: 1 + 2 + 3 +', () => {
      const labels = renderAndGetLabels({
        numerator: 3, denominator: 4, subdivisionLevel: 2,
      });
      expect(labels).toEqual(['1', '+', '2', '+', '3', '+']);
    });

    it('4/4 level 3: 1 + a 2 + a 3 + a 4 + a', () => {
      const labels = renderAndGetLabels({
        numerator: 4, denominator: 4, subdivisionLevel: 3,
      });
      expect(labels).toEqual([
        '1', '+', 'a', '2', '+', 'a', '3', '+', 'a', '4', '+', 'a',
      ]);
    });

    it('4/4 level 4: 1 e + a 2 e + a 3 e + a 4 e + a', () => {
      const labels = renderAndGetLabels({
        numerator: 4, denominator: 4, subdivisionLevel: 4,
      });
      expect(labels).toEqual([
        '1', 'e', '+', 'a', '2', 'e', '+', 'a',
        '3', 'e', '+', 'a', '4', 'e', '+', 'a',
      ]);
    });
  });

  describe('asymmetric /8 time signatures', () => {
    it('5/8 [3+2] level 2: 1 + a 2 +', () => {
      const labels = renderAndGetLabels({
        numerator: 5, denominator: 8, beatGrouping: '3+2', subdivisionLevel: 2,
      });
      expect(labels).toEqual(['1', '+', 'a', '2', '+']);
    });

    it('7/8 [3+2+2] level 2: 1 + a 2 + 3 +', () => {
      const labels = renderAndGetLabels({
        numerator: 7, denominator: 8, beatGrouping: '3+2+2', subdivisionLevel: 2,
      });
      expect(labels).toEqual(['1', '+', 'a', '2', '+', '3', '+']);
    });

    it('5/8 [3+2] level 3 has more boxes than level 2', () => {
      const l2 = renderAndGetLabels({
        numerator: 5, denominator: 8, beatGrouping: '3+2', subdivisionLevel: 2,
      });
      const l3 = renderAndGetLabels({
        numerator: 5, denominator: 8, beatGrouping: '3+2', subdivisionLevel: 3,
      });
      expect(l3.length).toBeGreaterThan(l2.length);
    });

    it('5/8 [3+2] level 3 (÷2): L=6 → 1 e + e + a, L=4 → 2 e + a', () => {
      const labels = renderAndGetLabels({
        numerator: 5, denominator: 8, beatGrouping: '3+2', subdivisionLevel: 3,
      });
      expect(labels).toHaveLength(10);
      expect(labels).toEqual([
        '1', 'e', '+', 'e', '+', 'a',
        '2', 'e', '+', 'a',
      ]);
    });

    it('5/8 [2+3] level 2: 1 + 2 + a', () => {
      const labels = renderAndGetLabels({
        numerator: 5, denominator: 8, beatGrouping: '2+3', subdivisionLevel: 2,
      });
      expect(labels).toEqual(['1', '+', '2', '+', 'a']);
    });

    it('8/8 [3+3+2] level 2: 1 + a 2 + a 3 +', () => {
      const labels = renderAndGetLabels({
        numerator: 8, denominator: 8, beatGrouping: '3+3+2', subdivisionLevel: 2,
      });
      expect(labels).toEqual(['1', '+', 'a', '2', '+', 'a', '3', '+']);
    });
  });

  describe('compound meters (unified with /8 path)', () => {
    it('6/8 level 2 (eighths): 1 + a 2 + a', () => {
      const labels = renderAndGetLabels({
        numerator: 6, denominator: 8, subdivisionLevel: 2,
      });
      expect(labels).toEqual(['1', '+', 'a', '2', '+', 'a']);
    });

    it('9/8 level 2 (eighths): 1 + a 2 + a 3 + a', () => {
      const labels = renderAndGetLabels({
        numerator: 9, denominator: 8, subdivisionLevel: 2,
      });
      expect(labels).toEqual([
        '1', '+', 'a', '2', '+', 'a', '3', '+', 'a',
      ]);
    });

    it('12/8 level 2 (eighths): 1 + a 2 + a 3 + a 4 + a', () => {
      const labels = renderAndGetLabels({
        numerator: 12, denominator: 8, subdivisionLevel: 2,
      });
      expect(labels).toEqual([
        '1', '+', 'a', '2', '+', 'a', '3', '+', 'a', '4', '+', 'a',
      ]);
    });

    it('6/8 level 4 (÷2): L=6 per group → 1 e + e + a 2 e + e + a', () => {
      const labels = renderAndGetLabels({
        numerator: 6, denominator: 8, subdivisionLevel: 4,
      });
      expect(labels).toEqual([
        '1', 'e', '+', 'e', '+', 'a',
        '2', 'e', '+', 'e', '+', 'a',
      ]);
    });

    it('12/8 level 4 (÷2): 24 boxes', () => {
      const labels = renderAndGetLabels({
        numerator: 12, denominator: 8, subdivisionLevel: 4,
      });
      expect(labels).toHaveLength(24);
      expect(labels.slice(0, 6)).toEqual(['1', 'e', '+', 'e', '+', 'a']);
      expect(labels.slice(18, 24)).toEqual(['4', 'e', '+', 'e', '+', 'a']);
    });
  });

  describe('takadimi labels', () => {
    it('4/4 level 2 takadimi: ta di ta di ta di ta di', () => {
      const labels = renderAndGetLabels({
        numerator: 4, denominator: 4, subdivisionLevel: 2, voiceMode: 'takadimi',
      });
      expect(labels).toEqual(['ta', 'di', 'ta', 'di', 'ta', 'di', 'ta', 'di']);
    });

    it('4/4 level 4 takadimi: ta ka di mi repeated', () => {
      const labels = renderAndGetLabels({
        numerator: 4, denominator: 4, subdivisionLevel: 4, voiceMode: 'takadimi',
      });
      expect(labels).toEqual([
        'ta', 'ka', 'di', 'mi', 'ta', 'ka', 'di', 'mi',
        'ta', 'ka', 'di', 'mi', 'ta', 'ka', 'di', 'mi',
      ]);
    });

    it('5/8 [3+2] level 2 takadimi: ta ki da ta di', () => {
      const labels = renderAndGetLabels({
        numerator: 5, denominator: 8, beatGrouping: '3+2', subdivisionLevel: 2, voiceMode: 'takadimi',
      });
      expect(labels).toEqual(['ta', 'ki', 'da', 'ta', 'di']);
    });

    it('6/8 level 2 takadimi: ta ki da ta ki da', () => {
      const labels = renderAndGetLabels({
        numerator: 6, denominator: 8, subdivisionLevel: 2, voiceMode: 'takadimi',
      });
      expect(labels).toEqual(['ta', 'ki', 'da', 'ta', 'ki', 'da']);
    });

    it('4/4 level 3 takadimi: ta ki da repeated', () => {
      const labels = renderAndGetLabels({
        numerator: 4, denominator: 4, subdivisionLevel: 3, voiceMode: 'takadimi',
      });
      expect(labels).toEqual([
        'ta', 'ki', 'da', 'ta', 'ki', 'da',
        'ta', 'ki', 'da', 'ta', 'ki', 'da',
      ]);
    });
  });

  describe('mute/unmute toggle', () => {
    it('renders correct number of beat cells', () => {
      const { container } = render(
        <BeatDisplay
          currentBeat={null}
          timeSignature={{ numerator: 4, denominator: 4 }}
          playing={false}
          perBeatVolumes={[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]}
          onBeatVolumeChange={() => {}}
          subdivisionLevel={2}
          voiceMode="counting"
        />,
      );
      const cells = container.querySelectorAll('.pulse-beat-cell');
      expect(cells.length).toBe(8);
    });

    it('applies is-muted class to muted beats', () => {
      const { container } = render(
        <BeatDisplay
          currentBeat={null}
          timeSignature={{ numerator: 4, denominator: 4 }}
          playing={false}
          perBeatVolumes={[1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0]}
          onBeatVolumeChange={() => {}}
          subdivisionLevel={2}
          voiceMode="counting"
        />,
      );
      const mutedCells = container.querySelectorAll('.pulse-beat-cell.is-muted');
      expect(mutedCells.length).toBe(4);
    });

    it('calls onBeatVolumeChange with 0 when clicking an unmuted beat', () => {
      const onChange = vi.fn();
      const { container } = render(
        <BeatDisplay
          currentBeat={null}
          timeSignature={{ numerator: 4, denominator: 4 }}
          playing={false}
          perBeatVolumes={[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]}
          onBeatVolumeChange={onChange}
          subdivisionLevel={2}
          voiceMode="counting"
        />,
      );
      const cells = container.querySelectorAll('.pulse-beat-cell');
      (cells[0] as HTMLElement).click();
      expect(onChange).toHaveBeenCalledWith(0, 0.0);
    });

    it('calls onBeatVolumeChange with 1 when clicking a muted beat', () => {
      const onChange = vi.fn();
      const { container } = render(
        <BeatDisplay
          currentBeat={null}
          timeSignature={{ numerator: 4, denominator: 4 }}
          playing={false}
          perBeatVolumes={[0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]}
          onBeatVolumeChange={onChange}
          subdivisionLevel={2}
          voiceMode="counting"
        />,
      );
      const cells = container.querySelectorAll('.pulse-beat-cell');
      (cells[0] as HTMLElement).click();
      expect(onChange).toHaveBeenCalledWith(0, 1.0);
    });
  });
});
